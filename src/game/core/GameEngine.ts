import { CLASSES, kitOfNode, kitsOfPath } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { defaultLookFor, isValidLook, normalizeLook, type Look } from '../art/look';
import { DEFAULT_HUNT, HUNT_BY_ID, HUNTS, huntScale, huntWaves } from '../data/hunts';
import { WAVE_CONFIG } from '../data/balance';
import { batchToSpawn, composeExtras, drawFromBag, extrasTableFor, limitExtra, newBag, rollExtra, splitBatches, tierOfExtra, TIER_NAMES, waveRewards } from '../systems/waves';
import { SPELLS, spellById } from '../data/spells';
import { itemById } from '../data/items';
import { CHARMS } from '../data/charms';
import type { Character, CharacterRow, ClassId, GameState, HelperConfig, InventoryStack, ItemInstance, MonsterDef, MonsterRuntime, Slot, SpellCondition } from './types';
import { evolveClass } from '../rpg/evolution';
import { CLASS_BY_ID, isPlayable } from '../rpg/classTree';
import { passiveBonus } from '../rpg/passives';
import { applyOfflineTraining, OFFLINE_CAP_S, referenceRates } from '../rpg/offline';
import { addCounter, COUNTER_IDS, createProfile, OFFLINE_HISTORY_MAX, type CounterId } from '../rpg/profile';
import { TRIES_PER_SECOND } from '../rpg/curves';
import { defaultRow, STARTER_ELEMENTS, STARTER_OFFHAND, STARTER_WEAPONS, type CharacterSpec } from '../data/starter';
import { MANA_REGEN, MELEE_BACK_ROW_DAMAGE, PROFICIENCY_LEVEL_DAMAGE, STATUS } from '../data/balance';
import { createInstance, gearBase, gearBlockReason, gearValue, gearLevels, handsConflict, quiverWith2H, rollGearDrop, smithPrice } from '../systems/gear';
import { classItem, CLASSIFICATIONS, type Classification } from '../data/classItems';
import { GEAR_DROP_CHANCE } from '../data/gearDrops';
import { GEAR_BAG_CAPACITY } from '../data/balance';
import { runtime } from '../rpg/runtime';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, type ProficiencyId } from '../rpg/proficiencies';
import { characterStats, spellAvailable, gainExperience, elementFocus, trainByTime, trainProficiency, triesBonusPct } from '../systems/progression';
import { buyTalent, buyTalentMax, grantOrigins, resetTalents, talentRespecCost, investedPoints, talentValue } from '../systems/talentGrid';
import { rootIdOf } from '../data/talentTrees';
import { isBlocked } from '../rpg/affinity';
import { conditionMet, healAmount, livingMonsters, livingTeam, magicDamage, meleeInBackRow, monsterHit, physicalDamage, pickMonsterTarget, elementAffinity } from '../systems/combat';
import { addItem, randomInt, removeItem, rollLoot } from '../systems/loot';
import { pickSupply } from '../systems/supplies';
import { buyPrice, shopStock } from '../data/shop';
import { FORMATION_PRESETS } from '../systems/group';
import type { FormationPlan } from '../systems/group';
import { createAnalyzer, hasAnalyzerActivity } from '../systems/analyzer';

export type GameFx = { type:'attack'|'damage'|'heal'|'death'|'drop'|'stairs'|'wave'|'recovery'; source?:string; target?:string; value?:number; text?:string };
const helper=():HelperConfig=>({hpPotionAt:35,manaPotionAt:25,healAllies:true,autoSupplies:true,defensiveAmuletAt:25,emergencyAt:15,outOfSupplies:'continue'});
const defaultCondition=(s:NonNullable<ReturnType<typeof spellById>>):SpellCondition=>s.kind==='heal'||s.kind==='regen'?{allyInjured:true,manaAbove:10}:s.target==='allEnemies'?{minEnemies:2,manaAbove:15}:s.kind==='shield'?{hpBelow:65,manaAbove:10}:{manaAbove:10};
export const SPELL_SLOTS=4;
export const MAX_SIM_MS_PER_FRAME=3000;
let idCounter=0;
export function createCharacter(classId:ClassId,name=CLASSES[classId].name,kit?:{weaponId?:string;row?:CharacterRow;element?:ProficiencyId;look?:Partial<Look>;lookIndex?:number}):Character{
  const base=CLASSES[classId].base;
  const slots=SPELLS.filter(s=>s.classId===classId&&!s.universal&&!s.node).slice(0,4).map(s=>s.id);
  const spellConditions:Record<string,SpellCondition>={};
  if(kit?.element){slots[0]=`basic_${kit.element}`;}
  for(const id of slots)spellConditions[id]=defaultCondition(spellById(id)!);
  return {id:`hero-${Date.now()}-${idCounter++}`,name,classId,profile:createProfile(),hp:base.maxHp,mana:base.maxMana,equipment:classId==='squire'?{weapon:kit?.weaponId??'rusty_sword',offhand:STARTER_OFFHAND}:{},gear:{},row:kit?.row??defaultRow(kit?.weaponId??(classId==='squire'?'rusty_sword':undefined),itemById(kit?.weaponId??'')?.trains),isTank:false,look:normalizeLook(kit?.look,kit?.lookIndex??0),spellSlots:slots,spellConditions,talentRanks:{[rootIdOf('aprendiz')]:1},cooldowns:{basic:0},effects:[],helper:helper()};
}
/** Estado inicial: sem personagens. A tela de criação monta o grupo de 3 Squires. */
export function initialState():GameState{
  return {version:1,status:'idle',autoAdvance:true,huntId:DEFAULT_HUNT,huntStats:{},wave:0,cycle:0,transitionMs:0,characters:[],team:[],monsters:[],gearBag:[],inventory:{bp:[],loot:[],supply:[{itemId:'health_potion',quantity:8},{itemId:'mana_potion',quantity:8}],capacity:{bp:40,loot:60,supply:200}},gold:0,charmPoints:0,charmSlots:1,equippedCharms:[],unlockedCharms:[],codex:{},analyzer:createAnalyzer(),history:[],message:'Crie seus 3 personagens para começar.',lastSavedAt:Date.now()};
}
export const PARTY_SIZE=3,ROSTER_LIMIT=5,NAME_LIMIT=18;
export interface RecruitSpec{name:string;weaponId?:string;element?:ProficiencyId;look?:Partial<Look>;row?:CharacterRow}
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
  /** Sorteia os reforços da wave que vai nascer (saco embaralhado, válvula de HP e "sem hordas em sequência"). */
  private rollWaveExtras(isBoss:boolean):number{
    if(!WAVE_CONFIG.enabled)return 0;
    const hunt=HUNT_BY_ID[this.state.huntId],table=extrasTableFor(hunt,isBoss),key=`${this.state.huntId}:${isBoss?'boss':'normal'}`;
    let drawn:number;
    if(WAVE_CONFIG.bag){const bags=this.state.waveBags??={};drawn=drawFromBag(bags[key]??=newBag(),table,WAVE_CONFIG.bagSize);}
    else drawn=rollExtra(table);
    drawn=Math.round(drawn*(hunt?.extrasScale??1));
    const team=livingTeam(this.state),avg=team.length?team.reduce((s,c)=>s+c.hp/characterStats(c,this.state).maxHp,0)/team.length:1;
    return limitExtra(drawn,{avgHpFraction:avg,lastExtra:this.state.lastExtra??0});
  }
  private makeMonster(defId:string,index:number):MonsterRuntime{const hp=Math.round(MONSTERS[defId].hp*runtime.monsterHp*huntScale(this.state.huntId).hp);return {uid:`${this.state.cycle}-${this.state.wave}-${index}-${this.nextUid()}`,defId,hp,maxHp:hp,cooldown:1/Math.max(.1,MONSTERS[defId].speed),alive:true};}
  private spawnWave(){
    const waves=this.waves(),isBoss=this.state.wave===waves.length-1;
    const extra=this.rollWaveExtras(isBoss),list=[...waves[this.state.wave].monsters,...composeExtras(this.state.huntId,extra)];
    const {initial,pending}=splitBatches(list);
    this.state.monsters=initial.map((defId,i)=>this.makeMonster(defId,i));
    this.state.wavePending=pending;this.state.reinforceS=0;this.state.lastExtra=extra;
    this.state.waveInfo={extra,total:list.length,goldStart:this.state.analyzer.gold};
    const tier=tierOfExtra(extra);
    this.state.message=extra>0?`${waves[this.state.wave].name} — ${TIER_NAMES[tier]} (${list.length} inimigos)`:waves[this.state.wave].name;
    this.emit({type:'wave',text:this.state.message});
  }
  /** Levas: enquanto houver monstros na fila, entram em grupos quando a wave esvazia (ou o tempo de espera passa). */
  private spawnBatch(count:number){
    const pending=this.state.wavePending??[];if(!count||!pending.length)return;
    const ids=pending.splice(0,count),base=this.state.monsters.length;
    this.state.monsters.push(...ids.map((defId,i)=>this.makeMonster(defId,base+i)));this.state.reinforceS=0;
  }
  private tickReinforcements(dt:number){
    if(!this.state.wavePending?.length)return;
    this.state.reinforceS=(this.state.reinforceS??0)+dt;
    if(this.state.reinforceS<WAVE_CONFIG.intervalS)return;
    this.spawnBatch(batchToSpawn(livingMonsters(this.state).length,this.state.wavePending.length,this.state.reinforceS));
  }
  start(){if(this.state.status!=='idle'||!this.state.team.length)return;if(!livingTeam(this.state).length)for(const id of this.state.team){const c=this.state.characters.find(x=>x.id===id);if(c){const stats=characterStats(c,this.state);c.hp=stats.maxHp;c.mana=stats.maxMana;c.effects=[];}}if(!this.state.monsters.length||!livingMonsters(this.state).length)this.spawnWave();this.state.status='running';if(!this.state.analyzer.activeMs)this.state.analyzer.startedAt=Date.now();this.state.message='Hunt iniciada.';this.emit();}
  pause(){if(this.state.status==='idle'||this.state.status==='paused')return;this.pausedFrom=this.state.status;this.state.status='paused';this.state.message='Hunt pausada — cooldowns congelados.';this.emit();}
  resume(){if(this.state.status!=='paused')return;this.state.status=this.pausedFrom;this.state.message='Hunt retomada.';this.emit();}
  end(){if(this.state.status==='idle')return;delete this.state.pendingHunt;this.state.status='idle';this.state.transitionMs=0;this.state.wave=0;this.state.monsters=[];this.state.wavePending=[];this.state.message='Expedição encerrada. Recompensas preservadas.';this.emit();}
  /** Nível médio da equipe (base da etiqueta de risco das hunts). */
  averageTeamLevel(){const levels=this.state.team.map(id=>this.state.characters.find(c=>c.id===id)?.profile.level).filter((l):l is number=>l!==undefined);return levels.length?levels.reduce((a,b)=>a+b,0)/levels.length:0;}
  /** Troca a hunt: qualquer uma vale (sem bloqueio por nível), mas só com a caçada parada. */
  selectHunt(id:string){
    const hunt=HUNT_BY_ID[id];
    if(!hunt||this.state.status!=='idle')return false;
    this.state.huntId=id;delete this.state.pendingHunt;this.state.wave=0;this.state.monsters=[];this.state.transitionMs=0;this.state.message=`Hunt: ${hunt.name}`;this.emit();return true;
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
    this.tickStatuses(dt);if(this.state.status!=='running')return this.emit();this.tickReinforcements(dt);
    for(const c of livingTeam(this.state)){this.updateCharacter(c,dt);if(this.state.status!=='running')break;}
    if(this.state.status==='running')for(const m of livingMonsters(this.state)){if((m.statuses?.frozen??0)>0||(m.statuses?.stunned??0)>0)continue;m.cooldown-=dt;if(m.cooldown<=0){const targets=livingTeam(this.state);if(!targets.length){this.defeat();break;}const target=pickMonsterTarget(targets)!;const dealt=monsterHit(m,target,this.state);this.emit({type:'damage',source:m.uid,target:target.id,value:dealt});const thorns=talentValue(target,'thorns');if(thorns>0&&m.alive)this.hit(target,m,Math.max(1,Math.round(dealt*thorns)));m.cooldown+=1/MONSTERS[m.defId].speed;if(!livingTeam(this.state).length){this.defeat();break;}}}
    this.emit();
  }
  private updateCharacter(c:Character,dt:number){
    const stats=characterStats(c,this.state);c.mana=Math.min(stats.maxMana,c.mana+dt*(MANA_REGEN.base+stats.maxMana*MANA_REGEN.perMax)*(1+talentValue(c,'mregen')));
    for(const key of Object.keys(c.cooldowns))c.cooldowns[key]=Math.max(0,c.cooldowns[key]-dt);
    for(const e of [...c.effects]){e.remaining-=dt;if(e.type==='regen'){e.tick=(e.tick??0)-dt;if(e.tick<=0){const amount=Math.round(e.value);c.hp=Math.min(stats.maxHp,c.hp+amount);this.state.analyzer.healing+=amount;this.creditHealing(e.source,amount);e.tick=1;this.emit({type:'heal',target:c.id,value:amount});}}if(e.remaining<=0)c.effects.splice(c.effects.indexOf(e),1);}
    this.autoSupply(c,stats.maxHp,stats.maxMana);trainByTime(c,dt);if(c.cooldowns.basic>0)return;
    const spell=c.spellSlots.map(spellById).find(s=>s&&s.level<=c.profile.level&&c.mana>=s.mana&&(c.cooldowns[s.id]??0)<=0&&conditionMet(c,s,this.state));
    if(spell){this.cast(c,spell);c.cooldowns[spell.id]=spell.cooldown*(1-this.cooldownTalent(c))*(spell.id==='plasma_beam'?1-passiveBonus(c.profile.classPath,'plasmaCooldown'):1);c.cooldowns.basic=.35;} else this.basicAttack(c);
  }
  private cooldownTalent(c:Character){return Math.min(.5,talentValue(c,'cdr')+passiveBonus(c.profile.classPath,'cooldown'));}
  /** Melhor bônus de talento entre os membros da equipe (ouro, drop e venda são do grupo: não empilham por personagem). */
  private teamBest(code:string){return this.state.team.reduce((best,id)=>{const c=this.state.characters.find(x=>x.id===id);return c?Math.max(best,talentValue(c,code)):best;},0);}
  /** Modificadores de dano dos talentos: chefes, alvos abaixo de 30% de HP, área (2+ alvos) e dano contínuo. */
  private talentDamage(c:Character,target:MonsterRuntime,damage:number,opts:{aoe?:boolean;dot?:boolean}={}){
    let mult=1;
    if(MONSTERS[target.defId].boss)mult+=talentValue(c,'boss');
    if(target.hp/target.maxHp<.3)mult+=talentValue(c,'exec');
    if(opts.aoe)mult+=talentValue(c,'aoe');
    if(opts.dot)mult+=talentValue(c,'dot');
    return damage*mult;
  }
  /** Multiplicador de crítico: base + talento, no máximo ×4,0. */
  private critMultiplier(c:Character,base=1.65){return Math.min(4,base+talentValue(c,'critdmg'));}
  private basicAttack(c:Character){const target=livingMonsters(this.state)[0];if(!target)return;const stats=characterStats(c,this.state);const crit=Math.random()<stats.crit;const weapon=itemById(c.equipment.weapon??'');const skill=weapon?.trains??CLASSES[c.classId].weaponSkill;const skillBonus=1+(c.profile.proficiencies[skill].level+gearLevels(c,skill))*PROFICIENCY_LEVEL_DAMAGE;const styleBonus=skill==='melee'?talentValue(c,'melee'):skill==='ranged'?talentValue(c,'ranged'):0;const raw=Math.round(this.talentDamage(c,target,physicalDamage(stats.attack*skillBonus,MONSTERS[target.defId].defense,crit,this.critMultiplier(c))*(1+styleBonus))*((target.statuses?.frozen??0)>0?1+STATUS.frozenPhysicalBonus:1));const damage=meleeInBackRow(c)?Math.max(1,Math.round(raw*MELEE_BACK_ROW_DAMAGE)):raw;c.profile.trainingFocus=skill;this.hit(c,target,damage,crit);c.cooldowns.basic=1/Math.max(.2,stats.attackSpeed);this.emit({type:'attack',source:c.id,target:target.uid,value:damage,text:crit?'CRÍTICO':''});}
  private cast(c:Character,s:NonNullable<ReturnType<typeof spellById>>){c.mana-=s.mana;this.trainCast(c,s);const stats=characterStats(c,this.state);if(s.kind==='damage'){this.castDamage(c,s,stats.magicPower+stats.attack*.45,stats.crit);this.emit({type:'attack',source:c.id,text:s.name});return;}const allies=s.target==='allAllies'?livingTeam(this.state):s.target==='ally'?[livingTeam(this.state).sort((a,b)=>a.hp/characterStats(a,this.state).maxHp-b.hp/characterStats(b,this.state).maxHp)[0]]:[c];const healingMultiplier=1+talentValue(c,'heal');const buffPower=1+talentValue(c,'buffpow'),buffTime=1+talentValue(c,'buffdur'),shieldPower=1+talentValue(c,'shield');for(const ally of allies.filter(Boolean)){const received=1+talentValue(ally,'healrec');if(s.kind==='heal'){const before=ally.hp;ally.hp=Math.min(characterStats(ally,this.state).maxHp,ally.hp+Math.round(healAmount(stats.magicPower,s.power)*healingMultiplier*received));const amount=ally.hp-before;this.state.analyzer.healing+=amount;addCounter(c.profile,'healingDone',amount);this.emit({type:'heal',source:c.id,target:ally.id,value:amount,text:s.name});}else{addCounter(c.profile,'buffsApplied');ally.effects.push({id:`${s.id}-${this.nextUid()}`,type:s.kind==='regen'?'regen':s.kind==='shield'?'shield':s.power>.25?'buffAttack':'buffDefense',value:s.kind==='regen'?Math.round(healAmount(stats.magicPower,s.power)*healingMultiplier*received):s.kind==='shield'?s.power*shieldPower:s.power*buffPower,remaining:(s.duration??5)*(s.kind==='regen'||s.kind==='shield'?1:buffTime),source:c.id});}}}
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
      let damage=this.talentDamage(c,target,base*(1+(gearLevels(c,'magic')+(element?gearLevels(c,element):0))*PROFICIENCY_LEVEL_DAMAGE)*(1+(element?talentValue(c,`e_${element}`):0))*(1+focus+(element&&element===elementFocus(c)?talentValue(c,'e_focus'):0))*elementAffinity(target.defId,element),{aoe:targets.length>1});
      const crit=critBonus>0&&Math.random()<critStat+critBonus;
      if(crit)damage*=this.critMultiplier(c,passiveBonus(path,'plasmaCritMult')||1.65);
      damage=Math.round(damage);
      const alive=target.alive;this.hit(c,target,damage,crit);dealt+=damage;
      if(!alive||!target.alive){continue;}
      if(s.burnStacks)this.applyBurn(target,s.burnStacks,c);
      if(element==='fire'&&Math.random()<passiveBonus(path,'burnOnFireHit'))this.applyBurn(target,1,c);
      if(s.freeze||s.stun){const st=target.statuses??={};const cc=1+talentValue(c,'ccdur');if(s.freeze)st.frozen=Math.max(st.frozen??0,s.freeze*cc);if(s.stun)st.stunned=Math.max(st.stunned??0,s.stun*cc);controlled=true;}
    }
    if(controlled)addCounter(c.profile,'controlSpells');
    if(element==='ice'&&dealt>0){const share=passiveBonus(path,'iceBarrier');if(share>0)this.addIceBarrier(c,dealt*share*(1+talentValue(c,'shield')));}
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
        if(whole>0&&source){addCounter(source.profile,'dotDamage',whole);this.hit(source,m,Math.max(1,Math.round(this.talentDamage(source,m,whole,{dot:true}))));}
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
  private hit(c:Character,target:GameState['monsters'][number],damage:number,crit=false){if(!target.alive)return;if(crit){addCounter(c.profile,'crits');if(MONSTERS[target.defId].boss)addCounter(c.profile,'bossCrits');}const fury=this.state.equippedCharms.includes('fury')?1.08:1;damage=Math.round(damage*fury);target.hp=Math.max(0,target.hp-damage);this.state.analyzer.damage+=damage;this.state.analyzer.byCharacter[c.id]=(this.state.analyzer.byCharacter[c.id]??0)+damage;this.state.analyzer.byMonster[target.defId]=(this.state.analyzer.byMonster[target.defId]??0)+damage;this.emit({type:'damage',source:c.id,target:target.uid,value:damage});const steal=talentValue(c,'lifesteal');if(steal>0&&c.hp>0){const stats=characterStats(c,this.state),healed=Math.min(stats.maxHp-c.hp,damage*steal);if(healed>0){c.hp+=healed;this.state.analyzer.healing+=healed;}}if(target.hp<=0)this.kill(target);}
  private kill(target:GameState['monsters'][number]){target.alive=false;const def=MONSTERS[target.defId];this.state.analyzer.kills[def.id]=(this.state.analyzer.kills[def.id]??0)+1;if(def.boss)this.state.analyzer.bosses++;const xpMult=this.state.equippedCharms.includes('wisdom')?1.12:1;const xp=Math.round(def.xp*xpMult*runtime.xpScale);this.state.analyzer.xp+=xp;const gold=Math.round(randomInt(def.gold[0],def.gold[1])*(1+this.teamBest('gold')));{const stat=this.huntStat();stat.xp+=xp;stat.gold+=gold;if(def.boss)stat.bossKills++;}for(const c of this.state.team.map(id=>this.state.characters.find(x=>x.id===id)).filter(Boolean) as Character[]){gainExperience(c,Math.round(xp*(1+talentValue(c,'xp'))));addCounter(c.profile,'goldEarned',gold);if(def.boss)addCounter(c.profile,'bossKills');}this.state.gold+=gold;this.state.analyzer.gold+=gold;const drops=rollLoot(this.state,def,Math.random,1+this.teamBest('drop'));this.dropGear(def);const entry=this.state.codex[def.id]??={kills:0,discoveredLoot:[],claimed:[]};entry.kills++;for(const d of drops)if(!entry.discoveredLoot.includes(d.itemId))entry.discoveredLoot.push(d.itemId);this.state.codex[def.id]=entry;this.checkMilestones(entry);this.emit({type:'death',target:target.uid,text:`+${xp} XP · ${gold} ouro`});if(drops.length)this.emit({type:'drop',text:drops.map(d=>`${d.quantity}× ${itemById(d.itemId)?.name}`).join(', ')});if(!livingMonsters(this.state).length){if(this.state.wavePending?.length)this.spawnBatch(Math.min(WAVE_CONFIG.batch,this.state.wavePending.length));else this.completeWave();}}
  private checkMilestones(entry:GameState['codex'][string]){for(const [i,n] of [10,50,200].entries())if(entry.kills>=n&&!entry.claimed.includes(n)){entry.claimed.push(n);this.state.charmPoints+=i+1;for(const charm of CHARMS)if(charm.milestone<=n&&!this.state.unlockedCharms.includes(charm.id))this.state.unlockedCharms.push(charm.id);}}
  /** Wave grande (Horda/Invasão): rolagens extras de equipamento e, na Invasão, ouro extra. Vale só se a wave foi realmente varrida. */
  private waveBonus(){
    const info=this.state.waveInfo;if(!info)return;
    const {gearRolls,goldBonus}=waveRewards(info.extra);
    if(goldBonus>0){const bonus=Math.round((this.state.analyzer.gold-info.goldStart)*goldBonus);if(bonus>0){this.state.gold+=bonus;this.state.analyzer.gold+=bonus;}}
    for(let i=0;i<gearRolls;i++)this.dropGear({boss:true} as MonsterDef);
  }
  private completeWave(){this.waveBonus();this.completeWaveCore();}
  private completeWaveCore(){const boss=this.state.wave===this.waves().length-1;this.state.status='transition';this.state.transitionMs=boss?2000:1000;this.state.message=boss?`Boss derrotado! ${this.state.analyzer.lootValue} de valor em loot.`:'Wave concluída — a escada surgiu.';if(boss){this.state.analyzer.cycles++;this.state.cycle++;}this.emit({type:'stairs',text:this.state.message});}
  private finishTransition(force=false){if(this.state.status==='recovering'){for(const id of this.state.team){const c=this.state.characters.find(x=>x.id===id);if(c){const s=characterStats(c,this.state);c.hp=s.maxHp;c.mana=s.maxMana;c.effects=[];}}this.state.wave=0;this.applyPendingHunt();this.spawnWave();this.state.status='running';return;}if(!this.state.autoAdvance&&!force){this.state.transitionMs=0;return;}this.state.wave=(this.state.wave+1)%this.waves().length;if(this.state.wave===0)this.applyPendingHunt();for(const c of this.state.characters){const s=characterStats(c,this.state);c.hp=Math.min(s.maxHp,c.hp+s.maxHp*.12);c.mana=Math.min(s.maxMana,c.mana+s.maxMana*.18);}this.spawnWave();this.state.status='running';}
  private defeat(){this.state.analyzer.defeats++;this.state.status='recovering';this.state.transitionMs=5000;this.state.message='Equipe derrotada. Recuperação em 5 segundos.';this.emit({type:'recovery',text:this.state.message});}
  private autoSupply(c:Character,maxHp:number,maxMana:number){if(!c.helper.autoSupplies)return;const use=(supply:'health'|'mana')=>{const item=pickSupply(this.state.inventory.supply,supply,supply==='health'?maxHp-c.hp:maxMana-c.mana);if(!item)return false;removeItem(this.state.inventory.supply,item.id);const potency=1+talentValue(c,'potion');if(supply==='health')c.hp=Math.min(maxHp,c.hp+(item.amount??0)*potency);else c.mana=Math.min(maxMana,c.mana+(item.amount??0)*potency);this.trackSupply(item.id,item.value,c);return true;};if(c.hp/maxHp*100<=c.helper.hpPotionAt)use('health');if(c.mana/maxMana*100<=c.helper.manaPotionAt)use('mana');}
  /**
   * Cria o grupo inicial: 3 Squires com nome, arma inicial (Espada, Arco, Faixas ou Cajado), linha e elemento inicial.
   * O escudo de madeira vem equipado; o primeiro da frente vira tanque. Falha sem alterar o estado se algo for inválido.
   */
  createParty(specs:CharacterSpec[]){
    if(this.state.characters.length||!Array.isArray(specs)||specs.length!==PARTY_SIZE)return false;
    const clean=specs.map(spec=>({...spec,name:(spec.name??'').trim().slice(0,NAME_LIMIT)}));
    if(clean.some(spec=>!spec.name||!STARTER_WEAPONS.some(w=>w.id===spec.weaponId)||(spec.row!==undefined&&spec.row!=='front'&&spec.row!=='back')||!spec.element||!STARTER_ELEMENTS.includes(spec.element)||(spec.look!==undefined&&!isValidLook(spec.look))))return false;
    if(new Set(clean.map(spec=>spec.name.toLowerCase())).size!==clean.length)return false;
    const party=clean.map((spec,index)=>createCharacter('squire',spec.name,{weaponId:spec.weaponId,row:spec.row,element:spec.element,look:spec.look,lookIndex:index}));
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
  sellAllLoot(){let total=0;for(const stack of this.state.inventory.loot)total+=(itemById(stack.itemId)?.value??0)*stack.quantity;total=Math.round(total*(1+this.teamBest('sell')));if(!total)return 0;this.state.inventory.loot=[];this.state.gold+=total;this.state.message=`Loot vendido por ${total} ouro.`;this.emit();return total;}
  recruit(input:string|RecruitSpec){
    const spec:RecruitSpec=typeof input==='string'?{name:input}:input;
    const clean=(spec.name??'').trim().slice(0,NAME_LIMIT);
    if(!clean||this.state.characters.length>=ROSTER_LIMIT||this.state.characters.some(c=>c.name.toLowerCase()===clean.toLowerCase()))return false;
    if(typeof input==='string'){this.state.characters.push(createCharacter('squire',clean,{look:defaultLookFor(this.state.characters.length)}));this.emit();return true;}
    if(!STARTER_WEAPONS.some(w=>w.id===spec.weaponId)||!spec.element||!STARTER_ELEMENTS.includes(spec.element)||(spec.row!==undefined&&spec.row!=='front'&&spec.row!=='back')||(spec.look!==undefined&&!isValidLook(spec.look)))return false;
    const c=createCharacter('squire',clean,{weaponId:spec.weaponId,row:spec.row,element:spec.element,look:spec.look,lookIndex:this.state.characters.length});
    c.profile.offlineTargets=[spec.element,null];c.profile.offlineHistory=[spec.element];
    this.state.characters.push(c);this.state.message=`${clean} foi recrutado.`;this.emit();return true;
  }
  /** Troca um membro da equipe por uma reserva na mesma posição; a reserva herda a linha (e o tanque, se a linha for a frente). */
  swapTeamMember(outId:string,inId:string){
    const at=this.state.team.indexOf(outId);
    const out=this.state.characters.find(c=>c.id===outId),into=this.state.characters.find(c=>c.id===inId);
    if(outId===inId||at<0||!out||!into||this.state.team.includes(inId))return false;
    into.row=out.row;const wasTank=out.isTank;out.isTank=false;into.isTank=wasTank&&into.row==='front';
    this.state.team[at]=inId;this.state.message=`${into.name} entrou no lugar de ${out.name}.`;this.emit();return true;
  }
  /** Dispensa definitivamente: devolve o equipamento às mochilas (ou recusa sem mudar nada se faltar espaço). */
  dismiss(id:string){
    const c=this.state.characters.find(x=>x.id===id);
    if(!c||this.state.characters.length<=1)return false;
    const inTeam=this.state.team.includes(id);
    if(inTeam&&this.state.team.length<=1)return false;
    if(inTeam&&this.state.status!=='idle'){this.state.message='Encerre a caçada para dispensar alguém da equipe.';this.emit();return false;}
    const simple=Object.values(c.equipment).filter((x):x is string=>!!x),gear=Object.values(c.gear);
    const probe={...this.state,inventory:structuredClone(this.state.inventory),freshItems:[...(this.state.freshItems??[])]} as GameState;
    const fits=simple.every(itemId=>addItem(probe,itemId,1)===1)&&this.state.gearBag.length+gear.length<=GEAR_BAG_CAPACITY;
    if(!fits){this.state.message='Libere espaço na mochila para guardar o equipamento.';this.emit();return false;}
    for(const itemId of simple)addItem(this.state,itemId,1);
    for(const g of gear){g.fresh=true;this.state.gearBag.push(g);}
    this.state.characters=this.state.characters.filter(x=>x.id!==id);this.state.team=this.state.team.filter(x=>x!==id);
    if(c.isTank&&!this.state.team.some(t=>this.state.characters.find(x=>x.id===t)?.isTank)){const first=this.state.team.map(t=>this.state.characters.find(x=>x.id===t)).find(x=>x?.row==='front');if(first)first.isTank=true;}
    this.state.formationPresets=this.state.formationPresets?.map(p=>p?{...p,team:p.team.filter(x=>x!==id),rows:Object.fromEntries(Object.entries(p.rows).filter(([k])=>k!==id)),tank:p.tank===id?undefined:p.tank}:p);
    this.state.message=`${c.name} foi dispensado.`;this.emit();return true;
  }
  /** Aplica o plano de `suggestFormation` com uma só emissão: linhas primeiro, depois o tanque (nunca dois). */
  applyFormation(plan:FormationPlan){
    const moves=plan.moves.filter(m=>this.state.characters.some(c=>c.id===m.id));if(!moves.length)return false;
    for(const m of moves){const c=this.state.characters.find(x=>x.id===m.id)!;if(m.row==='front'||m.row==='back'){c.row=m.row;if(m.row==='back')c.isTank=false;}}
    for(const m of moves)if(m.tank){const c=this.state.characters.find(x=>x.id===m.id)!;if(c.row!=='front')continue;for(const other of this.state.characters)other.isTank=false;c.isTank=true;}
    this.state.message='Formação ajustada.';this.emit();return true;
  }
  saveFormationPreset(slot:number,name:string){
    const clean=name.trim().slice(0,18);if(!Number.isInteger(slot)||slot<0||slot>=FORMATION_PRESETS||!clean||!this.state.team.length)return false;
    const team=this.state.team.map(id=>this.state.characters.find(c=>c.id===id)).filter((c):c is Character=>!!c);
    const presets=(this.state.formationPresets??[]).slice(0,FORMATION_PRESETS);while(presets.length<FORMATION_PRESETS)presets.push(null);
    presets[slot]={name:clean,team:team.map(c=>c.id),rows:Object.fromEntries(team.map(c=>[c.id,c.row])),tank:team.find(c=>c.isTank)?.id};
    this.state.formationPresets=presets;this.state.message=`Formação '${clean}' salva.`;this.emit();return true;
  }
  applyFormationPreset(slot:number){
    const preset=this.state.formationPresets?.[slot];if(!preset)return false;
    const team=preset.team.filter(id=>this.state.characters.some(c=>c.id===id)).slice(0,4);if(!team.length)return false;
    this.state.team=team;
    for(const id of team){const c=this.state.characters.find(x=>x.id===id)!;const row=preset.rows[id];if(row==='front'||row==='back')c.row=row;}
    for(const c of this.state.characters)c.isTank=false;
    const tank=preset.tank&&team.includes(preset.tank)?this.state.characters.find(c=>c.id===preset.tank):undefined;if(tank&&tank.row==='front')tank.isTank=true;
    this.state.message=`Formação '${preset.name}' aplicada.`;this.emit();return true;
  }
  clearFormationPreset(slot:number){
    if(!this.state.formationPresets?.[slot])return false;
    this.state.formationPresets=this.state.formationPresets.map((p,i)=>i===slot?null:p);this.emit();return true;
  }
  /** Programa a troca de hunt para o fim do ciclo (só com a caçada em andamento); a hunt atual cancela a fila. */
  queueHunt(id:string){
    const hunt=HUNT_BY_ID[id];if(!hunt||(this.state.status!=='running'&&this.state.status!=='transition'))return false;
    if(id===this.state.huntId){return this.cancelQueuedHunt();}
    this.state.pendingHunt=id;this.state.message=`Nova hunt: ${hunt.name}. Começa no próximo ciclo.`;this.emit();return true;
  }
  cancelQueuedHunt(){if(!this.state.pendingHunt)return false;delete this.state.pendingHunt;this.emit();return true;}
  /** Fim do ciclo: troca a hunt programada (chamado quando a wave volta a 0, antes de sortear a wave). */
  private applyPendingHunt(){
    const id=this.state.pendingHunt;if(!id)return;delete this.state.pendingHunt;
    const hunt=HUNT_BY_ID[id];if(!hunt)return;
    this.state.huntId=id;this.state.wave=0;this.state.message=`Nova hunt: ${hunt.name}`;this.fxListeners.forEach(fn=>fn({type:'wave',text:`Nova hunt: ${hunt.name}`}));
  }
  selectAndStart(id:string){if(!this.selectHunt(id))return false;this.start();return true;}
  /** Troca o sprite (cosmético: livre e gratuito). Aceita 'block' ou um id do registro; a evolução de classe não o altera. */
  setLook(id:string,look:Partial<Look>){const c=this.state.characters.find(x=>x.id===id);if(!c||!isValidLook(look))return false;c.look=normalizeLook({...c.look,...look});this.emit();return true;}
  /** Define uma das 2 vagas de treino offline (null/undefined limpa a vaga) e a empurra para o histórico. */
  setOfflineTarget(id:string,slot:0|1,target:ProficiencyId|null|undefined){
    const c=this.state.characters.find(x=>x.id===id);
    if(!c||(slot!==0&&slot!==1)||(target&&!(target in PROFICIENCIES)))return;
    if(target&&isBlocked(c.profile,target)){this.state.message=`${PROFICIENCIES[target].name} é bloqueada para ${CLASS_BY_ID[c.profile.classId].name}.`;this.emit();return;}
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
    grantOrigins(c);this.dropBlockedTargets(c);
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
  /** Depois de evoluir, vagas de treino e histórico em proficiências bloqueadas para a nova classe são descartados. */
  private dropBlockedTargets(c:Character){
    const p=c.profile;
    p.offlineTargets=p.offlineTargets.map(t=>t&&!isBlocked(p,t)?t:null) as typeof p.offlineTargets;
    p.offlineHistory=p.offlineHistory.filter(t=>!isBlocked(p,t));
    if(p.trainingFocus&&isBlocked(p,p.trainingFocus))delete p.trainingFocus;
  }
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
      const training=applyOfflineTraining(c.profile,gapSeconds,id=>triesBonusPct(c,id))?.entries??[];
      return {name:c.name,xp:onTeam.has(c.id)?xp:0,levelsGained:c.profile.level-before,training};
    });
    if(gold>0)this.state.gold+=gold;
    if(!entries.some(e=>e.xp>0||e.training.length)&&gold<=0)return;
    this.state.offlineReport={seconds,hunt:ref.hunt.name,share,gold,entries};this.emit();
  }
  // ---- Ferramentas de teste: só o `dev` de GameStore (apenas em `npm run dev`) chama estes métodos.
  private devCharacter(id:string){const c=this.state.characters.find(x=>x.id===id);if(!c)throw new Error(`Personagem desconhecido: ${id}`);return c;}
  private devProficiency(id:string):ProficiencyId{if(!(id in PROFICIENCIES))throw new Error(`Proficiência desconhecida: ${id}`);return id as ProficiencyId;}
  devSetLevel(id:string,level:number){const c=this.devCharacter(id);if(!Number.isInteger(level)||level<1)throw new Error('Nível inválido.');c.profile.level=level;c.profile.xp=0;this.emit();}
  devGiveXp(id:string,amount:number){gainExperience(this.devCharacter(id),amount);this.emit();}
  devSetProf(id:string,prof:string,level:number){const c=this.devCharacter(id),p=this.devProficiency(prof);if(!Number.isInteger(level)||level<1||level>MAX_PROFICIENCY_LEVEL)throw new Error(`Nível de proficiência inválido (1-${MAX_PROFICIENCY_LEVEL}).`);c.profile.proficiencies[p]={level,tries:0};this.emit();}
  devAddTries(id:string,prof:string,amount:number){trainProficiency(this.devCharacter(id),this.devProficiency(prof),amount);this.emit();}
  devAddCounter(id:string,counter:string,amount:number){const c=this.devCharacter(id);if(!(COUNTER_IDS as readonly string[]).includes(counter))throw new Error(`Contador desconhecido: ${counter}`);addCounter(c.profile,counter as CounterId,amount);this.emit();}
  devScaleChanged(){this.emit();}
  /** Helper: limiares de poção e avisos de um personagem (valores em % de 0 a 100, com validação). */
  setHelper(characterId:string,patch:Partial<HelperConfig>){
    const c=this.state.characters.find(x=>x.id===characterId);if(!c)return false;
    const pct=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(100,Math.round(v))):undefined;
    const next={...c.helper};
    for(const key of ['hpPotionAt','manaPotionAt','defensiveAmuletAt','emergencyAt'] as const)if(patch[key]!==undefined){const v=pct(patch[key]);if(v===undefined)return false;next[key]=v;}
    if(patch.healAllies!==undefined)next.healAllies=!!patch.healAllies;
    if(patch.autoSupplies!==undefined)next.autoSupplies=!!patch.autoSupplies;
    if(patch.outOfSupplies==='continue'||patch.outOfSupplies==='end')next.outOfSupplies=patch.outOfSupplies;
    c.helper=next;this.emit();return true;
  }
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
  equip(characterId:string,itemId:string){const c=this.state.characters.find(x=>x.id===characterId);const item=itemById(itemId);if(!c||!item?.slot||item.kind!=='equipment'||(item.level??1)>c.profile.level||(item.classIds&&!item.classIds.some(id=>kitsOfPath(c.profile.classPath).includes(id))))return false;if(item.slot==='offhand'&&this.offhandBlocked(c))return false;const displaced=c.gear[item.slot];if(displaced&&this.state.gearBag.length>=GEAR_BAG_CAPACITY)return false;if(!removeItem(this.state.inventory.bp,itemId))return false;if(displaced){this.state.gearBag.push(displaced);delete c.gear[item.slot];}const old=c.equipment[item.slot];if(old)addItem(this.state,old,1);c.equipment[item.slot]=itemId;const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);this.emit();return true;}
  /** Arma de 2 mãos de classe equipada (sem Aljava) bloqueia itens antigos na mão secundária. */
  private offhandBlocked(c:Character){const weapon=gearBase(c,'weapon');return !!weapon&&weapon.hands===2;}
  /** Guarda uma instância na mochila de equipamento; sem espaço ela é vendida na hora (devolve false). */
  private stashGear(instance:ItemInstance){if(this.state.gearBag.length<GEAR_BAG_CAPACITY){instance.fresh=true;this.state.gearBag.push(instance);return true;}this.state.gold+=gearValue(instance);this.state.message=`Mochila de equipamento cheia: ${classItem(instance.baseId)?.name} vendido por ${gearValue(instance)} ouro.`;return false;}
  /** Classes sorteáveis nos drops: as jogáveis do Tier 1 e as do caminho da equipe. */
  private gearDropClasses(){const set=new Set<string>(Object.values(CLASS_BY_ID).filter(n=>n.tier===1&&isPlayable(n.id)).map(n=>n.id));for(const id of this.state.team){const c=this.state.characters.find(x=>x.id===id);for(const node of c?.profile.classPath??[])if(CLASS_BY_ID[node]?.tier===1)set.add(node);}return [...set];}
  private dropGear(def:MonsterDef){
    if(Math.random()>=(def.boss?GEAR_DROP_CHANCE.boss:GEAR_DROP_CHANCE.normal))return;
    const instance=rollGearDrop(HUNTS.findIndex(h=>h.id===this.state.huntId),!!def.boss,this.gearDropClasses());
    if(!instance)return;
    const name=classItem(instance.baseId)?.name??instance.baseId;
    this.stashGear(instance);this.emit({type:'drop',text:`Equipamento: ${name}`});
  }
  /** Dá uma instância ao grupo (drop, Ferreiro, dev). */
  grantGear(baseId:string,classification:Classification='common'){const instance=createInstance(baseId,classification);if(!instance||!this.stashGear(instance))return undefined;this.emit();return instance;}
  /** Equipa uma instância da mochila: o item do slot volta para a mochila; arma de 2 mãos devolve também a secundária. */
  equipGear(characterId:string,uid:string){
    const c=this.state.characters.find(x=>x.id===characterId),bag=this.state.gearBag,index=bag.findIndex(g=>g.uid===uid);
    if(!c||index<0)return false;
    const instance=bag[index],base=classItem(instance.baseId);
    if(!base||gearBlockReason(c,instance)){this.state.message=gearBlockReason(c,instance)??'Item desconhecido.';this.emit();return false;}
    const slot=base.slot,back:ItemInstance[]=[],legacyBack:string[]=[];
    const take=(s:typeof slot)=>{const g=c.gear[s];if(g){back.push(g);delete c.gear[s];}const old=c.equipment[s];if(old){legacyBack.push(old);delete c.equipment[s];}};
    const saved={gear:{...c.gear},equipment:{...c.equipment}};
    const revert=()=>{c.gear=saved.gear;c.equipment=saved.equipment;};
    if(slot==='offhand'){const weapon=gearBase(c,'weapon');const reason=handsConflict(weapon,base);if(reason){this.state.message=reason;this.emit();return false;}}
    take(slot);
    if(slot==='weapon'&&base.hands===2){const off=gearBase(c,'offhand');if(c.gear.offhand||c.equipment.offhand){if(!(off&&quiverWith2H(base,off)))take('offhand');}}
    if(bag.length-1+back.length>GEAR_BAG_CAPACITY||!legacyBack.every(id=>addItem(this.state,id,1))){revert();this.state.message='Sem espaço para guardar o item trocado.';this.emit();return false;}
    bag.splice(index,1);bag.push(...back);c.gear[slot]=instance;
    const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);
    this.emit();return true;
  }
  unequipGear(characterId:string,slot:Slot){const c=this.state.characters.find(x=>x.id===characterId);const g=c?.gear[slot];if(!c||!g||this.state.gearBag.length>=GEAR_BAG_CAPACITY)return false;delete c.gear[slot];this.state.gearBag.push(g);const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);this.emit();return true;}
  /** Limpa a marca de "novo" de um item (`bp:<id>` ou `gear:<uid>`). */
  markSeen(key:string){const [kind,id]=[key.slice(0,key.indexOf(':')),key.slice(key.indexOf(':')+1)];if(kind==='gear'){const g=this.state.gearBag.find(x=>x.uid===id);if(!g?.fresh)return;delete g.fresh;}else{const list=this.state.freshItems;if(!list?.includes(id))return;this.state.freshItems=list.filter(x=>x!==id);}this.emit();}
  /** Bônus de venda da equipe (talentos), como fração. */
  sellBonus(){return this.teamBest('sell');}
  sellGear(uid:string){const index=this.state.gearBag.findIndex(g=>g.uid===uid);if(index<0)return 0;const [g]=this.state.gearBag.splice(index,1);const value=Math.round(gearValue(g)*(1+this.teamBest('sell')));this.state.gold+=value;this.emit();return value;}
  /** Vende de uma vez os itens da mochila até a classificação dada (ex.: só os Comuns, sem atributos). */
  sellGearUpTo(maxClassification:Classification){const limit=Math.min(CLASSIFICATIONS.indexOf(maxClassification),CLASSIFICATIONS.indexOf('rare'));let total=0,count=0;this.state.gearBag=this.state.gearBag.filter(g=>{if(CLASSIFICATIONS.indexOf(g.classification)>limit)return true;total+=Math.round(gearValue(g)*(1+this.teamBest('sell')));count++;return false;});this.state.gold+=total;if(count)this.state.message=`${count} equipamentos vendidos por ${total} ouro.`;this.emit();return total;}
  /** Ferreiro de classe: só itens Padrão, sempre Comuns (sem atributos). */
  buyGear(baseId:string){const price=smithPrice(baseId);if(!Number.isFinite(price)||this.state.gold<price||this.state.gearBag.length>=GEAR_BAG_CAPACITY)return false;const instance=createInstance(baseId,'common');if(!instance)return false;instance.fresh=true;this.state.gold-=price;this.state.gearBag.push(instance);this.state.message=`${classItem(baseId)?.name} comprado por ${price} ouro.`;this.emit();return true;}
  unequip(characterId:string,slot:keyof Character['equipment']){const c=this.state.characters.find(x=>x.id===characterId);const old=c?.equipment[slot];if(!c||!old||!addItem(this.state,old,1))return false;delete c.equipment[slot];this.emit();return true;}
  useSupply(characterId:string,itemId:string){const c=this.state.characters.find(x=>x.id===characterId);const item=itemById(itemId);if(!c||!item?.supply||!removeItem(this.state.inventory.supply,itemId))return false;const stats=characterStats(c,this.state);const potency=1+talentValue(c,'potion');if(item.supply==='health')c.hp=Math.min(stats.maxHp,c.hp+(item.amount??0)*potency);else c.mana=Math.min(stats.maxMana,c.mana+(item.amount??0)*potency);this.trackSupply(item.id,item.value,c);this.emit();return true;}
  sell(container:'bp'|'loot'|'supply',itemId:string){const list=this.state.inventory[container] as InventoryStack[];const item=itemById(itemId);if(!item||!removeItem(list,itemId))return false;this.state.gold+=Math.round(item.value*(1+this.teamBest('sell')));this.emit();return true;}
  /** Compra +1 rank (ou, com `max`, tudo o que o saldo e as regras permitirem) num nó de talento. */
  invest(characterId:string,nodeId:string,max=false){const c=this.state.characters.find(x=>x.id===characterId);if(!c)return false;const ok=max?buyTalentMax(c,nodeId)>0:buyTalent(c,nodeId);if(ok)this.emit();return ok;}
  /** Zera uma grade (`treeId`) ou todas, devolve os pontos e cobra o ouro (ralo de economia). Mantém as Origens. */
  respecTalents(characterId:string,treeId?:string){const c=this.state.characters.find(x=>x.id===characterId);if(!c)return false;const invested=investedPoints(c,treeId),cost=talentRespecCost(c,treeId);if(!invested||this.state.gold<cost)return false;this.state.gold-=cost;resetTalents(c,treeId);const stats=characterStats(c,this.state);c.hp=Math.min(c.hp,stats.maxHp);c.mana=Math.min(c.mana,stats.maxMana);this.state.message=`Talentos de ${c.name} redistribuídos por ${cost} ouro.`;this.emit();return true;}
  private trackSupply(itemId:string,value:number,c?:Character){if(c)addCounter(c.profile,'supportPotionsUsed');this.state.analyzer.suppliesValue+=value;this.state.analyzer.suppliesUsed[itemId]=(this.state.analyzer.suppliesUsed[itemId]??0)+1;}
}
