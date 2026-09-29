import { CLASSES, kitOfNode, kitsOfPath } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { DEFAULT_SPRITE, defaultSpriteFor, isKnownSprite } from '../data/sprites';
import { DEFAULT_HUNT, HUNT_BY_ID, huntWaves } from '../data/hunts';
import { SPELLS, spellById } from '../data/spells';
import { itemById } from '../data/items';
import { CHARMS } from '../data/charms';
import type { Character, CharacterRow, ClassId, GameState, HelperConfig, InventoryStack, MonsterRuntime, SpellCondition } from './types';
import { evolveClass } from '../rpg/evolution';
import { CLASS_BY_ID, isPlayable } from '../rpg/classTree';
import { passiveBonus } from '../rpg/passives';
import { applyOfflineTraining, OFFLINE_CAP_S, referenceRates } from '../rpg/offline';
import { addCounter, COUNTER_IDS, createProfile, OFFLINE_HISTORY_MAX, type CounterId } from '../rpg/profile';
import { TRIES_PER_SECOND } from '../rpg/curves';
import { defaultRow, STARTER_ELEMENTS, STARTER_OFFHAND, STARTER_WEAPONS, type CharacterSpec } from '../data/starter';
import { MANA_REGEN, MELEE_BACK_ROW_DAMAGE, STATUS } from '../data/balance';
import { runtime } from '../rpg/runtime';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, type ProficiencyId } from '../rpg/proficiencies';
import { characterStats, spellAvailable, gainExperience, investTalent, spentTalentPoints, talentBonus, talentRespecCost, elementFocus, trainByTime, trainProficiency } from '../systems/progression';
import { conditionMet, healAmount, livingMonsters, livingTeam, magicDamage, meleeInBackRow, monsterHit, physicalDamage, pickMonsterTarget, elementAffinity } from '../systems/combat';
import { addItem, randomInt, removeItem, rollLoot } from '../systems/loot';
import { pickSupply } from '../systems/supplies';
import { buyPrice, shopStock } from '../data/shop';
import { createAnalyzer, hasAnalyzerActivity } from '../systems/analyzer';

export type GameFx = { type:'attack'|'damage'|'heal'|'death'|'drop'|'stairs'|'wave'|'recovery'; source?:string; target?:string; value?:number; text?:string };
const helper=():HelperConfig=>({hpPotionAt:35,manaPotionAt:25,healAllies:true,autoSupplies:true,defensiveAmuletAt:25,emergencyAt:15,outOfSupplies:'continue'});
const defaultCondition=(s:NonNullable<ReturnType<typeof spellById>>):SpellCondition=>s.kind==='heal'||s.kind==='regen'?{allyInjured:true,manaAbove:10}:s.target==='allEnemies'?{minEnemies:2,manaAbove:15}:s.kind==='shield'?{hpBelow:65,manaAbove:10}:{manaAbove:10};
export const SPELL_SLOTS=4;
export const MAX_SIM_MS_PER_FRAME=3000;
let idCounter=0;
export function createCharacter(classId:ClassId,name=CLASSES[classId].name,kit?:{weaponId?:string;row?:CharacterRow;element?:ProficiencyId;spriteId?:string}):Character{
  const base=CLASSES[classId].base;
  const slots=SPELLS.filter(s=>s.classId===classId&&!s.universal&&!s.node).slice(0,4).map(s=>s.id);
  const spellConditions:Record<string,SpellCondition>={};
  if(kit?.element){slots[0]=`basic_${kit.element}`;}
  for(const id of slots)spellConditions[id]=defaultCondition(spellById(id)!);
  return {id:`hero-${Date.now()}-${idCounter++}`,name,classId,profile:createProfile(),talentPoints:0,hp:base.maxHp,mana:base.maxMana,equipment:classId==='squire'?{weapon:kit?.weaponId??'rusty_sword',offhand:STARTER_OFFHAND}:{},row:kit?.row??defaultRow(kit?.weaponId??(classId==='squire'?'rusty_sword':undefined),itemById(kit?.weaponId??'')?.trains),isTank:false,spriteId:isKnownSprite(kit?.spriteId)?kit!.spriteId!:DEFAULT_SPRITE,spellSlots:slots,spellConditions,talents:{},cooldowns:{basic:0},effects:[],helper:helper()};
}
/** Estado inicial: sem personagens. A tela de criação monta o grupo de 3 Squires. */
export function initialState():GameState{
  return {version:1,status:'idle',autoAdvance:true,huntId:DEFAULT_HUNT,huntStats:{},wave:0,cycle:0,transitionMs:0,characters:[],team:[],monsters:[],inventory:{bp:[],loot:[],supply:[{itemId:'health_potion',quantity:8},{itemId:'mana_potion',quantity:8}],capacity:{bp:40,loot:60,supply:200}},gold:0,charmPoints:0,charmSlots:1,equippedCharms:[],unlockedCharms:[],codex:{},analyzer:createAnalyzer(),history:[],message:'Crie seus 3 personagens para começar.',lastSavedAt:Date.now()};
}
export const PARTY_SIZE=3,ROSTER_LIMIT=5,NAME_LIMIT=18;
export class GameEngine {
  private state:GameState; private listeners=new Set<()=>void>(); private fxListeners=new Set<(fx:GameFx)=>void>(); private pausedFrom:GameState['status']='running';
  constructor(state=initialState()){this.state=state;}
  getSnapshot=()=>this.state;
  hydrate(next:GameState){this.state=next;this.pausedFrom=next.status==='paused'?'running':next.status;this.emit();}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>this.listeners.delete(fn);};
  onFx=(fn:(fx:GameFx)=>void)=>{this.fxListeners.add(fn);return()=>this.fxListeners.delete(fn);};
  /** Sub-passos acelerados de `advance` não notificam a UI: só o último emit, uma vez por quadro. */
  private quiet=false;
  private uidCounter=Date.now();
  /** Ids únicos mesmo com vários eventos no mesmo milissegundo (sub-passos do modo acelerado). */
  private nextUid(){return ++this.uidCounter;}
  private emit(fx?:GameFx){if(this.quiet)return;this.state={...this.state};this.listeners.forEach(fn=>fn());if(fx)this.fxListeners.forEach(fn=>fn(fx));}
  /** Estatística da hunt atual (cria a entrada se faltar). */
  private huntStat(){return this.state.huntStats[this.state.huntId]??={activeMs:0,xp:0,gold:0,bossKills:0};}
  private waves(){return huntWaves(this.state.huntId);}
  private spawnWave(){const waves=this.waves();this.state.monsters=waves[this.state.wave].monsters.map((defId,i)=>({uid:`${this.state.cycle}-${this.state.wave}-${i}-${this.nextUid()}`,defId,hp:Math.round(MONSTERS[defId].hp*runtime.monsterHp),maxHp:Math.round(MONSTERS[defId].hp*runtime.monsterHp),cooldown:1/Math.max(.1,MONSTERS[defId].speed),alive:true}));this.state.message=waves[this.state.wave].name;this.emit({type:'wave',text:this.state.message});}
  start(){if(this.state.status!=='idle'||!this.state.team.length)return;if(!livingTeam(this.state).length)for(const id of this.state.team){const c=this.state.characters.find(x=>x.id===id);if(c){const stats=characterStats(c,this.state);c.hp=stats.maxHp;c.mana=stats.maxMana;c.effects=[];}}if(!this.state.monsters.length||!livingMonsters(this.state).length)this.spawnWave();this.state.status='running';if(!this.state.analyzer.activeMs)this.state.analyzer.startedAt=Date.now();this.state.message='Hunt iniciada.';this.emit();}
  pause(){if(this.state.status==='idle'||this.state.status==='paused')return;this.pausedFrom=this.state.status;this.state.status='paused';this.state.message='Hunt pausada — cooldowns congelados.';this.emit();}
  resume(){if(this.state.status!=='paused')return;this.state.status=this.pausedFrom;this.state.message='Hunt retomada.';this.emit();}
  end(){if(this.state.status==='idle')return;this.state.status='idle';this.state.transitionMs=0;this.state.wave=0;this.state.monsters=[];this.state.message='Expedição encerrada. Recompensas preservadas.';this.emit();}
  /** Nível médio da equipe (base da etiqueta de risco das hunts). */
  averageTeamLevel(){const levels=this.state.team.map(id=>this.state.characters.find(c=>c.id===id)?.profile.level).filter((l):l is number=>l!==undefined);return levels.length?levels.reduce((a,b)=>a+b,0)/levels.length:0;}
  /** Troca a hunt: qualquer uma vale (sem bloqueio por nível), mas só com a caçada parada. */
  selectHunt(id:string){
    const hunt=HUNT_BY_ID[id];
    if(!hunt||this.state.status!=='idle')return false;
    this.state.huntId=id;this.state.wave=0;this.state.monsters=[];this.state.transitionMs=0;this.state.message=`Hunt: ${hunt.name}`;this.emit();return true;
  }
  setAutoAdvance(value:boolean){this.state.autoAdvance=value;this.emit();}
  resetAnalyzer(){if(hasAnalyzerActivity(this.state.analyzer)){this.state.history.push(structuredClone(this.state.analyzer));this.state.history=this.state.history.slice(-20);}this.state.analyzer=createAnalyzer();this.state.message='Hunt Analyzer reiniciado. Progressão e inventário preservados.';this.emit();}
  descend(){if(this.state.status==='transition'&&!this.state.autoAdvance){this.state.transitionMs=0;this.finishTransition(true);}}
  /** Avança `ms` de tempo real a `speed`x em sub-passos de até 100 ms (teto de simulação por quadro); UI e efeitos notificados uma vez no fim. */
  advance(ms:number,speed=1){
    if(!(speed>1)){this.tick(ms);return;}
    let remaining=Math.min(ms*speed,MAX_SIM_MS_PER_FRAME);
    this.quiet=true;
    try{while(remaining>0){const step=Math.min(100,remaining);this.tick(step);remaining-=step;}}finally{this.quiet=false;}
    this.emit();
  }
  tick(ms:number){
    if(this.state.status==='idle'||this.state.status==='paused')return;const dt=Math.min(ms,100)/1000;
    if(this.state.status==='transition'||this.state.status==='recovering'){this.state.transitionMs-=ms;if(this.state.transitionMs<=0)this.finishTransition();this.emit();return;}
    this.state.analyzer.activeMs+=ms;this.huntStat().activeMs+=ms;
    this.tickStatuses(dt);if(this.state.status!=='running')return this.emit();
    for(const c of livingTeam(this.state)){this.updateCharacter(c,dt);if(this.state.status!=='running')break;}
    if(this.state.status==='running')for(const m of livingMonsters(this.state)){if((m.statuses?.frozen??0)>0||(m.statuses?.stunned??0)>0)continue;m.cooldown-=dt;if(m.cooldown<=0){const targets=livingTeam(this.state);if(!targets.length){this.defeat();break;}const target=pickMonsterTarget(targets)!;const dealt=monsterHit(m,target,this.state);this.emit({type:'damage',source:m.uid,target:target.id,value:dealt});m.cooldown+=1/MONSTERS[m.defId].speed;if(!livingTeam(this.state).length){this.defeat();break;}}}
    this.emit();
  }
  private updateCharacter(c:Character,dt:number){
    const stats=characterStats(c,this.state);c.mana=Math.min(stats.maxMana,c.mana+dt*(MANA_REGEN.base+stats.maxMana*MANA_REGEN.perMax));
    for(const key of Object.keys(c.cooldowns))c.cooldowns[key]=Math.max(0,c.cooldowns[key]-dt);
    for(const e of [...c.effects]){e.remaining-=dt;if(e.type==='regen'){e.tick=(e.tick??0)-dt;if(e.tick<=0){const amount=Math.round(e.value);c.hp=Math.min(stats.maxHp,c.hp+amount);this.state.analyzer.healing+=amount;this.creditHealing(e.source,amount);e.tick=1;this.emit({type:'heal',target:c.id,value:amount});}}if(e.remaining<=0)c.effects.splice(c.effects.indexOf(e),1);}
    this.autoSupply(c,stats.maxHp,stats.maxMana);trainByTime(c,dt);if(c.cooldowns.basic>0)return;
    const spell=c.spellSlots.map(spellById).find(s=>s&&s.level<=c.profile.level&&c.mana>=s.mana&&(c.cooldowns[s.id]??0)<=0&&conditionMet(c,s,this.state));
    if(spell){this.cast(c,spell);c.cooldowns[spell.id]=spell.cooldown*(1-this.cooldownTalent(c))*(spell.id==='plasma_beam'?1-passiveBonus(c.profile.classPath,'plasmaCooldown'):1);c.cooldowns.basic=.35;} else this.basicAttack(c);
  }
  private cooldownTalent(c:Character){return Math.min(.5,talentBonus(c,'cooldown'));}
  private basicAttack(c:Character){const target=livingMonsters(this.state)[0];if(!target)return;const stats=characterStats(c,this.state);const crit=Math.random()<stats.crit;const weapon=itemById(c.equipment.weapon??'');const skill=weapon?.trains??CLASSES[c.classId].weaponSkill;const skillBonus=1+c.profile.proficiencies[skill].level*.012;const raw=Math.round(physicalDamage(stats.attack*skillBonus,MONSTERS[target.defId].defense,crit)*((target.statuses?.frozen??0)>0?1+STATUS.frozenPhysicalBonus:1));const damage=meleeInBackRow(c)?Math.max(1,Math.round(raw*MELEE_BACK_ROW_DAMAGE)):raw;c.profile.trainingFocus=skill;this.hit(c,target,damage,crit);c.cooldowns.basic=1/Math.max(.2,stats.attackSpeed);this.emit({type:'attack',source:c.id,target:target.uid,value:damage,text:crit?'CRÍTICO':''});}
  private cast(c:Character,s:NonNullable<ReturnType<typeof spellById>>){c.mana-=s.mana;this.trainCast(c,s);const stats=characterStats(c,this.state);if(s.kind==='damage'){this.castDamage(c,s,stats.magicPower+stats.attack*.45,stats.crit);this.emit({type:'attack',source:c.id,text:s.name});return;}const allies=s.target==='allAllies'?livingTeam(this.state):s.target==='ally'?[livingTeam(this.state).sort((a,b)=>a.hp/characterStats(a,this.state).maxHp-b.hp/characterStats(b,this.state).maxHp)[0]]:[c];const healingMultiplier=1+talentBonus(c,'healing');for(const ally of allies.filter(Boolean)){if(s.kind==='heal'){const before=ally.hp;ally.hp=Math.min(characterStats(ally,this.state).maxHp,ally.hp+Math.round(healAmount(stats.magicPower,s.power)*healingMultiplier));const amount=ally.hp-before;this.state.analyzer.healing+=amount;addCounter(c.profile,'healingDone',amount);this.emit({type:'heal',source:c.id,target:ally.id,value:amount,text:s.name});}else{addCounter(c.profile,'buffsApplied');ally.effects.push({id:`${s.id}-${this.nextUid()}`,type:s.kind==='regen'?'regen':s.kind==='shield'?'shield':s.power>.25?'buffAttack':'buffDefense',value:s.kind==='regen'?Math.round(healAmount(stats.magicPower,s.power)*healingMultiplier):s.kind==='shield'?s.power:s.power,remaining:s.duration??5,source:c.id});}}}
  /** Dano de magia: talentos, foco, afinidade elemental, crítico do Arcanista, status (Combustão/Congelado/Atordoado) e barreira do Criomante. */
  private castDamage(c:Character,s:NonNullable<ReturnType<typeof spellById>>,power:number,critStat:number){
    const path=c.profile.classPath,element=s.element;
    const targets=s.target==='allEnemies'?livingMonsters(this.state):livingMonsters(this.state).slice(0,1);
    const focus=element&&element===elementFocus(c)?passiveBonus(path,'focusMagicDamage'):0;
    const critBonus=element==='fire'||element==='energy'?passiveBonus(path,'plasmaCrit'):0;
    let dealt=0,controlled=false;
    for(const target of targets){
      if(!target.alive)continue;
      const base=magicDamage(power,s.power,MONSTERS[target.defId].defense);
      let damage=base*(1+talentBonus(c,'magicDamage'))*(1+focus)*elementAffinity(target.defId,element);
      const crit=critBonus>0&&Math.random()<critStat+critBonus;
      if(crit)damage*=passiveBonus(path,'plasmaCritMult')||1.65;
      damage=Math.round(damage);
      const alive=target.alive;this.hit(c,target,damage,crit);dealt+=damage;
      if(!alive||!target.alive){continue;}
      if(s.burnStacks)this.applyBurn(target,s.burnStacks,c);
      if(element==='fire'&&Math.random()<passiveBonus(path,'burnOnFireHit'))this.applyBurn(target,1,c);
      if(s.freeze||s.stun){const st=target.statuses??={};if(s.freeze)st.frozen=Math.max(st.frozen??0,s.freeze);if(s.stun)st.stunned=Math.max(st.stunned??0,s.stun);controlled=true;}
    }
    if(controlled)addCounter(c.profile,'controlSpells');
    if(element==='ice'&&dealt>0){const share=passiveBonus(path,'iceBarrier');if(share>0)this.addIceBarrier(c,dealt*share);}
  }
  /** Combustão: empilha até 5, renova a duração e guarda o poder mágico e quem aplicou (o dano contínuo é creditado a ele). */
  private applyBurn(target:MonsterRuntime,stacks:number,source:Character){
    const st=target.statuses??={};const burn=st.burn??={stacks:0,remaining:0,power:0,source:source.id,acc:0};
    burn.stacks=Math.min(STATUS.burnMaxStacks,burn.stacks+stacks);burn.remaining=STATUS.burnSeconds;burn.power=characterStats(source,this.state).magicPower;burn.source=source.id;
  }
  /** Barreira temporária do Criomante: soma ao escudo `cryo-barrier` sem passar de 30% do HP máx. */
  private addIceBarrier(c:Character,amount:number){
    const cap=characterStats(c,this.state).maxHp*.30;
    let barrier=c.effects.find(e=>e.id.startsWith('cryo-barrier'));
    if(!barrier){barrier={id:`cryo-barrier-${this.nextUid()}`,type:'shield',value:0,remaining:8,source:c.id};c.effects.push(barrier);}
    barrier.value=Math.min(cap,barrier.value+amount);barrier.remaining=8;
  }
  /** Avança Combustão (dano contínuo por stack), Congelado e Atordoado dos monstros vivos, com o mesmo dt do combate. */
  private tickStatuses(dt:number){
    for(const m of livingMonsters(this.state)){
      const st=m.statuses;if(!st)continue;
      if(st.burn){
        const burn=st.burn;burn.acc+=burn.stacks*STATUS.burnPerStackPerSecond*burn.power*dt;
        const whole=Math.floor(burn.acc);burn.acc-=whole;
        const source=this.state.characters.find(x=>x.id===burn.source);
        if(whole>0&&source){addCounter(source.profile,'dotDamage',whole);this.hit(source,m,whole);}
        burn.remaining-=dt;if(burn.remaining<=0)delete st.burn;
      }
      if(st.frozen!==undefined){st.frozen-=dt;if(st.frozen<=0)delete st.frozen;}
      if(st.stunned!==undefined){st.stunned-=dt;if(st.stunned<=0)delete st.stunned;}
      if(this.state.status!=='running')return;
    }
  }
  /** Magia elemental treina o elemento e Magia por cast, só se for o elemento em foco. As demais só definem o foco de tempo (o try vem de trainByTime). */
  private trainCast(c:Character,s:NonNullable<ReturnType<typeof spellById>>){
    if(s.element){if(s.element===elementFocus(c)){const tries=s.cooldown*TRIES_PER_SECOND*runtime.trainScale;trainProficiency(c,s.element,tries);trainProficiency(c,'magic',tries);}return;}
    c.profile.trainingFocus=this.spellProficiency(c,s);
  }
  private spellProficiency(c:Character,s:NonNullable<ReturnType<typeof spellById>>):ProficiencyId{const weapon=itemById(c.equipment.weapon??'')?.trains??CLASSES[c.classId].weaponSkill;if(s.kind==='heal'||s.kind==='regen'||weapon==='magic')return 'magic';return s.kind==='shield'?'defense':weapon;}
  private creditHealing(sourceId:string|undefined,amount:number){const healer=this.state.characters.find(x=>x.id===sourceId);if(healer)addCounter(healer.profile,'healingDone',amount);}
  private hit(c:Character,target:GameState['monsters'][number],damage:number,crit=false){if(!target.alive)return;if(crit){addCounter(c.profile,'crits');if(MONSTERS[target.defId].boss)addCounter(c.profile,'bossCrits');}const fury=this.state.equippedCharms.includes('fury')?1.08:1;damage=Math.round(damage*fury);target.hp=Math.max(0,target.hp-damage);this.state.analyzer.damage+=damage;this.state.analyzer.byCharacter[c.id]=(this.state.analyzer.byCharacter[c.id]??0)+damage;this.state.analyzer.byMonster[target.defId]=(this.state.analyzer.byMonster[target.defId]??0)+damage;this.emit({type:'damage',source:c.id,target:target.uid,value:damage});if(target.hp<=0)this.kill(target);}
  private kill(target:GameState['monsters'][number]){target.alive=false;const def=MONSTERS[target.defId];this.state.analyzer.kills[def.id]=(this.state.analyzer.kills[def.id]??0)+1;if(def.boss)this.state.analyzer.bosses++;const xpMult=this.state.equippedCharms.includes('wisdom')?1.12:1;const xp=Math.round(def.xp*xpMult*runtime.xpScale);this.state.analyzer.xp+=xp;const gold=randomInt(def.gold[0],def.gold[1]);{const stat=this.huntStat();stat.xp+=xp;stat.gold+=gold;if(def.boss)stat.bossKills++;}for(const c of this.state.team.map(id=>this.state.characters.find(x=>x.id===id)).filter(Boolean) as Character[]){gainExperience(c,xp);addCounter(c.profile,'goldEarned',gold);if(def.boss)addCounter(c.profile,'bossKills');}this.state.gold+=gold;this.state.analyzer.gold+=gold;const drops=rollLoot(this.state,def);const entry=this.state.codex[def.id]??={kills:0,discoveredLoot:[],claimed:[]};entry.kills++;for(const d of drops)if(!entry.discoveredLoot.includes(d.itemId))entry.discoveredLoot.push(d.itemId);this.state.codex[def.id]=entry;this.checkMilestones(entry);this.emit({type:'death',target:target.uid,text:`+${xp} XP · ${gold} ouro`});if(drops.length)this.emit({type:'drop',text:drops.map(d=>`${d.quantity}× ${itemById(d.itemId)?.name}`).join(', ')});if(!livingMonsters(this.state).length)this.completeWave();}
  private checkMilestones(entry:GameState['codex'][string]){for(const [i,n] of [10,50,200].entries())if(entry.kills>=n&&!entry.claimed.includes(n)){entry.claimed.push(n);this.state.charmPoints+=i+1;for(const charm of CHARMS)if(charm.milestone<=n&&!this.state.unlockedCharms.includes(charm.id))this.state.unlockedCharms.push(charm.id);}}
  private completeWave(){const boss=this.state.wave===this.waves().length-1;this.state.status='transition';this.state.transitionMs=boss?2000:1000;this.state.message=boss?`Boss derrotado! ${this.state.analyzer.lootValue} de valor em loot.`:'Wave concluída — a escada surgiu.';if(boss){this.state.analyzer.cycles++;this.state.cycle++;}this.emit({type:'stairs',text:this.state.message});}
  private finishTransition(force=false){if(this.state.status==='recovering'){for(const id of this.state.team){const c=this.state.characters.find(x=>x.id===id);if(c){const s=characterStats(c,this.state);c.hp=s.maxHp;c.mana=s.maxMana;c.effects=[];}}this.state.wave=0;this.spawnWave();this.state.status='running';return;}if(!this.state.autoAdvance&&!force){this.state.transitionMs=0;return;}this.state.wave=(this.state.wave+1)%this.waves().length;for(const c of this.state.characters){const s=characterStats(c,this.state);c.hp=Math.min(s.maxHp,c.hp+s.maxHp*.12);c.mana=Math.min(s.maxMana,c.mana+s.maxMana*.18);}this.spawnWave();this.state.status='running';}
  private defeat(){this.state.analyzer.defeats++;this.state.status='recovering';this.state.transitionMs=5000;this.state.message='Equipe derrotada. Recuperação em 5 segundos.';this.emit({type:'recovery',text:this.state.message});}
  private autoSupply(c:Character,maxHp:number,maxMana:number){if(!c.helper.autoSupplies)return;const use=(supply:'health'|'mana')=>{const item=pickSupply(this.state.inventory.supply,supply,supply==='health'?maxHp-c.hp:maxMana-c.mana);if(!item)return false;removeItem(this.state.inventory.supply,item.id);if(supply==='health')c.hp=Math.min(maxHp,c.hp+(item.amount??0));else c.mana=Math.min(maxMana,c.mana+(item.amount??0));this.trackSupply(item.id,item.value,c);return true;};if(c.hp/maxHp*100<=c.helper.hpPotionAt)use('health');if(c.mana/maxMana*100<=c.helper.manaPotionAt)use('mana');}
  /**
   * Cria o grupo inicial: 3 Squires com nome, arma inicial (Espada, Arco, Faixas ou Cajado), linha e elemento inicial.
   * O escudo de madeira vem equipado; o primeiro da frente vira tanque. Falha sem alterar o estado se algo for inválido.
   */
  createParty(specs:CharacterSpec[]){
    if(this.state.characters.length||!Array.isArray(specs)||specs.length!==PARTY_SIZE)return false;
    const clean=specs.map(spec=>({...spec,name:(spec.name??'').trim().slice(0,NAME_LIMIT)}));
    if(clean.some(spec=>!spec.name||!STARTER_WEAPONS.some(w=>w.id===spec.weaponId)||(spec.row!==undefined&&spec.row!=='front'&&spec.row!=='back')||!spec.element||!STARTER_ELEMENTS.includes(spec.element)||(spec.spriteId!==undefined&&!isKnownSprite(spec.spriteId))))return false;
    if(new Set(clean.map(spec=>spec.name.toLowerCase())).size!==clean.length)return false;
    const party=clean.map((spec,index)=>createCharacter('squire',spec.name,{weaponId:spec.weaponId,row:spec.row,element:spec.element,spriteId:spec.spriteId??defaultSpriteFor(index)}));
    for(const c of party){const element=clean[party.indexOf(c)].element!;c.profile.offlineTargets=[element,null];c.profile.offlineHistory=[element];}
    const tank=party.find(c=>c.row==='front');if(tank)tank.isTank=true;
    this.state.characters=party;this.state.team=party.map(c=>c.id);this.state.message='Grupo criado. Inicie a hunt quando estiver pronto.';this.emit();return true;
  }
  setRow(id:string,row:CharacterRow){const c=this.state.characters.find(x=>x.id===id);if(!c||(row!=='front'&&row!=='back'))return false;c.row=row;if(row==='back')c.isTank=false;this.emit();return true;}
  /** Marca (ou desmarca) o tanque: só um por grupo e só na linha da frente. */
  setTank(id:string,on=true){const c=this.state.characters.find(x=>x.id===id);if(!c||(on&&c.row!=='front'))return false;for(const other of this.state.characters)other.isTank=false;c.isTank=on;this.emit();return true;}
  /** Compra `qty` unidades de um item à venda (poção liberada ou peça do Ferreiro): tudo ou nada. */
  buy(itemId:string,qty:number){
    const item=itemById(itemId);
    if(!item||!Number.isInteger(qty)||qty<1)return false;
    const best=Math.max(0,...this.state.team.map(id=>this.state.characters.find(c=>c.id===id)?.profile.level??0));
    const stock=shopStock(this.state.huntId,best),entry=[...stock.potions,...stock.smith].find(e=>e.itemId===itemId);
    if(!entry||!entry.unlocked)return false;
    const cost=buyPrice(itemId)*qty;
    if(this.state.gold<cost)return false;
    const container=item.kind==='supply'?'supply':item.kind==='loot'?'loot':'bp';
    const used=this.state.inventory[container].reduce((n,s)=>n+s.quantity,0);
    if(used+qty>this.state.inventory.capacity[container])return false;
    this.state.gold-=cost;addItem(this.state,itemId,qty);
    this.state.message=`Comprou ${qty}× ${item.name} por ${cost} ouro.`;this.emit();return true;
  }
  /** Vende todo o loot da bolsa de uma vez e devolve o valor recebido. */
  sellAllLoot(){let total=0;for(const stack of this.state.inventory.loot)total+=(itemById(stack.itemId)?.value??0)*stack.quantity;if(!total)return 0;this.state.inventory.loot=[];this.state.gold+=total;this.state.message=`Loot vendido por ${total} ouro.`;this.emit();return total;}
  recruit(name:string){const clean=name.trim().slice(0,NAME_LIMIT);if(!clean||this.state.characters.length>=ROSTER_LIMIT||this.state.characters.some(c=>c.name.toLowerCase()===clean.toLowerCase()))return false;this.state.characters.push(createCharacter('squire',clean,{spriteId:defaultSpriteFor(this.state.characters.length)}));this.emit();return true;}
  /** Troca o sprite (cosmético: livre e gratuito). Aceita 'block' ou um id do registro; a evolução de classe não o altera. */
  setSprite(id:string,spriteId:string){const c=this.state.characters.find(x=>x.id===id);if(!c||!isKnownSprite(spriteId))return false;c.spriteId=spriteId;this.emit();return true;}
  /** Define uma das 2 vagas de treino offline (null/undefined limpa a vaga) e a empurra para o histórico. */
  setOfflineTarget(id:string,slot:0|1,target:ProficiencyId|null|undefined){
    const c=this.state.characters.find(x=>x.id===id);
    if(!c||(slot!==0&&slot!==1)||(target&&!(target in PROFICIENCIES)))return;
    c.profile.offlineTargets[slot]=target??null;
    if(target)c.profile.offlineHistory=[target,...c.profile.offlineHistory.filter(t=>t!==target)].slice(0,OFFLINE_HISTORY_MAX);
    this.emit();
  }
  /** Evolui a classe: só nós jogáveis (kit pronto), salvo `force`; o kit, os atributos e as magias acompanham a nova classe. */
  evolve(id:string,targetId:string,opts:{force?:boolean}={}){
    const c=this.state.characters.find(x=>x.id===id);if(!c)return false;
    const node=CLASS_BY_ID[targetId];
    if(node&&!isPlayable(targetId)&&!opts.force){this.state.message=`${node.name}: em breve. Esta classe ainda não tem kit e não pode ser escolhida.`;this.emit();return false;}
    const result=evolveClass(c.profile,targetId,opts);
    if(!result.ok){this.state.message=result.reason;this.emit();return false;}
    const swapped=this.applyKit(c,kitOfNode(result.node.id));
    const added=this.addNodeSpells(c,result.node.id);
    this.state.message=`${c.name} evoluiu para ${result.node.name}.${swapped.length?` Magias trocadas: ${swapped.join(', ')}.`:''}${added.length?` Magias novas: ${added.join(', ')}.`:''}`;this.emit();return true;
  }
  /** Tier 2 soma as magias do nó nos slots livres (se não houver, elas ficam disponíveis para equipar). */
  private addNodeSpells(c:Character,nodeId:string):string[]{
    const added:string[]=[];
    for(const sp of SPELLS.filter(x=>x.node===nodeId&&spellAvailable(c,x))){
      if(c.spellSlots.length>=SPELL_SLOTS)break;
      c.spellSlots.push(sp.id);c.spellConditions[sp.id]=defaultCondition(sp);added.push(sp.name);
    }
    return added;
  }
  /** Troca o kit do personagem: atributos (com HP/Mana clampados) e magias do kit antigo pelas do novo; a magia elemental equipada tem prioridade de 1 slot. */
  private applyKit(c:Character,kit:ClassId):string[]{
    if(kit===c.classId)return [];
    const kept=c.spellSlots.filter(sid=>spellById(sid)?.universal).slice(0,1);
    const fresh=SPELLS.filter(sp=>sp.classId===kit&&!sp.universal&&!sp.node).map(sp=>sp.id);
    const slots=[...kept,...fresh].slice(0,SPELL_SLOTS);
    const conditions:Record<string,SpellCondition>={};
    for(const sid of slots)conditions[sid]=c.spellConditions[sid]??defaultCondition(spellById(sid)!);
    for(const sid of c.spellSlots)if(!slots.includes(sid))delete c.cooldowns[sid];
    c.classId=kit;c.spellSlots=slots;c.spellConditions=conditions;
    const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);
    return slots.filter(sid=>!kept.includes(sid)).map(sid=>spellById(sid)!.name);
  }
  /** Credita o treino offline (só tries) a todos os personagens e guarda o relatório para a UI. */
  /** Volta de uma sessão offline: credita o treino e encerra a caçada que estava salva. */
  returnFromOffline(gapSeconds:number){
    const wasActive=this.state.status!=='idle';
    this.applyOffline(gapSeconds);this.end();
    if(wasActive){const report=this.state.offlineReport??={seconds:Math.min(gapSeconds,OFFLINE_CAP_S),entries:[]};report.huntEnded=true;this.emit();}
  }
  /**
   * Credita o retorno de uma sessão offline (até 24 h): 25% do XP e do ouro da hunt de referência (sem loot, sem
   * contadores e sem tocar no Analyzer ou nas estatísticas de hunt) e as tries das vagas de treino de cada personagem.
   */
  applyOffline(gapSeconds:number){
    if(!(gapSeconds>0))return;
    const seconds=Math.min(gapSeconds,OFFLINE_CAP_S),hours=seconds/3600,share=runtime.offlineShare;
    const ref=referenceRates(this.state.huntStats);
    const xp=Math.round(share*ref.xpPerHour*hours),gold=Math.round(share*ref.goldPerHour*hours);
    const onTeam=new Set(this.state.team);
    const entries=this.state.characters.map(c=>{
      const before=c.profile.level;
      if(onTeam.has(c.id)&&xp>0)gainExperience(c,xp);
      const training=applyOfflineTraining(c.profile,gapSeconds)?.entries??[];
      return {name:c.name,xp:onTeam.has(c.id)?xp:0,levelsGained:c.profile.level-before,training};
    });
    if(gold>0)this.state.gold+=gold;
    if(!entries.some(e=>e.xp>0||e.training.length)&&gold<=0)return;
    this.state.offlineReport={seconds,hunt:ref.hunt.name,share,gold,entries};this.emit();
  }
  // ---- Ferramentas de teste: só o `dev` de GameStore (apenas em `npm run dev`) chama estes métodos.
  private devCharacter(id:string){const c=this.state.characters.find(x=>x.id===id);if(!c)throw new Error(`Personagem desconhecido: ${id}`);return c;}
  private devProficiency(id:string):ProficiencyId{if(!(id in PROFICIENCIES))throw new Error(`Proficiência desconhecida: ${id}`);return id as ProficiencyId;}
  devSetLevel(id:string,level:number){const c=this.devCharacter(id);if(!Number.isInteger(level)||level<1)throw new Error('Nível inválido.');c.talentPoints+=Math.max(0,level-c.profile.level);c.profile.level=level;c.profile.xp=0;this.emit();}
  devGiveXp(id:string,amount:number){gainExperience(this.devCharacter(id),amount);this.emit();}
  devSetProf(id:string,prof:string,level:number){const c=this.devCharacter(id),p=this.devProficiency(prof);if(!Number.isInteger(level)||level<1||level>MAX_PROFICIENCY_LEVEL)throw new Error(`Nível de proficiência inválido (1-${MAX_PROFICIENCY_LEVEL}).`);c.profile.proficiencies[p]={level,tries:0};this.emit();}
  devAddTries(id:string,prof:string,amount:number){trainProficiency(this.devCharacter(id),this.devProficiency(prof),amount);this.emit();}
  devAddCounter(id:string,counter:string,amount:number){const c=this.devCharacter(id);if(!(COUNTER_IDS as readonly string[]).includes(counter))throw new Error(`Contador desconhecido: ${counter}`);addCounter(c.profile,counter as CounterId,amount);this.emit();}
  devScaleChanged(){this.emit();}
  dismissOfflineReport(){if(this.state.offlineReport){delete this.state.offlineReport;this.emit();}}
  equipSpell(id:string,slot:number,spellId:string){
    const c=this.state.characters.find(x=>x.id===id),s=spellById(spellId);
    if(!c||!s||!Number.isInteger(slot)||slot<0||slot>=SPELL_SLOTS||slot>c.spellSlots.length)return false;
    if(!spellAvailable(c,s)||c.spellSlots.includes(spellId))return false;
    const old=c.spellSlots[slot];c.spellSlots[slot]=spellId;
    if(old){delete c.spellConditions[old];}
    c.spellConditions[spellId]={...defaultCondition(s)};this.emit();return true;
  }
  unequipSpell(id:string,slot:number){const c=this.state.characters.find(x=>x.id===id);if(!c||!c.spellSlots[slot])return false;const [old]=c.spellSlots.splice(slot,1);delete c.spellConditions[old];this.emit();return true;}
  toggleTeam(id:string){const at=this.state.team.indexOf(id);if(at>=0)this.state.team.splice(at,1);else if(this.state.team.length<4)this.state.team.push(id);else return false;this.emit();return true;}
  rename(id:string,name:string){const c=this.state.characters.find(x=>x.id===id);if(c&&name.trim()){c.name=name.trim();this.emit();}}
  reorderSpell(id:string,from:number,to:number){const c=this.state.characters.find(x=>x.id===id);if(!c||to<0||to>=c.spellSlots.length)return;const [s]=c.spellSlots.splice(from,1);c.spellSlots.splice(to,0,s);this.emit();}
  setSpellCondition(id:string,spellId:string,patch:Partial<SpellCondition>){const c=this.state.characters.find(x=>x.id===id);if(c){c.spellConditions[spellId]={...c.spellConditions[spellId],...patch};this.emit();}}
  equip(characterId:string,itemId:string){const c=this.state.characters.find(x=>x.id===characterId);const item=itemById(itemId);if(!c||!item?.slot||item.kind!=='equipment'||(item.level??1)>c.profile.level||(item.classIds&&!item.classIds.some(id=>kitsOfPath(c.profile.classPath).includes(id))))return false;if(!removeItem(this.state.inventory.bp,itemId))return false;const old=c.equipment[item.slot];if(old)addItem(this.state,old,1);c.equipment[item.slot]=itemId;const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);this.emit();return true;}
  unequip(characterId:string,slot:keyof Character['equipment']){const c=this.state.characters.find(x=>x.id===characterId);const old=c?.equipment[slot];if(!c||!old||!addItem(this.state,old,1))return false;delete c.equipment[slot];this.emit();return true;}
  useSupply(characterId:string,itemId:string){const c=this.state.characters.find(x=>x.id===characterId);const item=itemById(itemId);if(!c||!item?.supply||!removeItem(this.state.inventory.supply,itemId))return false;const stats=characterStats(c,this.state);if(item.supply==='health')c.hp=Math.min(stats.maxHp,c.hp+(item.amount??0));else c.mana=Math.min(stats.maxMana,c.mana+(item.amount??0));this.trackSupply(item.id,item.value,c);this.emit();return true;}
  sell(container:'bp'|'loot'|'supply',itemId:string){const list=this.state.inventory[container] as InventoryStack[];const item=itemById(itemId);if(!item||!removeItem(list,itemId))return false;this.state.gold+=item.value;this.emit();return true;}
  invest(characterId:string,talentId:string){const c=this.state.characters.find(x=>x.id===characterId);if(c&&investTalent(c,talentId)){this.emit();return true;}return false;}
  respecTalents(characterId:string){const c=this.state.characters.find(x=>x.id===characterId);if(!c)return false;const refunded=spentTalentPoints(c),cost=talentRespecCost(c);if(!refunded||this.state.gold<cost)return false;this.state.gold-=cost;c.talentPoints+=refunded;c.talents={};const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);this.state.message=`Talentos de ${c.name} redistribuídos por ${cost} ouro.`;this.emit();return true;}
  private trackSupply(itemId:string,value:number,c?:Character){if(c)addCounter(c.profile,'supportPotionsUsed');this.state.analyzer.suppliesValue+=value;this.state.analyzer.suppliesUsed[itemId]=(this.state.analyzer.suppliesUsed[itemId]??0)+1;}
}
