import type { GameState, HuntStatus } from '../core/types';
import { CLASSES, kitOfNode } from '../data/classes';
import { ITEMS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { RUN_CONFIG } from '../data/balance';
import { DEFAULT_HUNT, HUNT_BY_ID } from '../data/hunts';
import { normalizeLook } from '../art/look';
import { isGoalId } from '../rpg/goals';
import { SPELLS } from '../data/spells';
import { validTalentRanks } from '../systems/talentGrid';
import { classItem, CLASSIFICATIONS, ITEM_CONFIG, type Classification } from '../data/classItems';
import { GEAR_BAG_CAPACITY } from '../data/balance';
import { classCanUse, handsConflict, GEAR_SLOTS } from '../systems/gear';
import { EFFECTS, rootIdOf, TALENT_TREES } from '../data/talentTrees';
import { CLASS_BY_ID } from '../rpg/classTree';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCY_IDS } from '../rpg/proficiencies';
import { COUNTER_IDS } from '../rpg/profile';

const statuses:HuntStatus[]=['idle','running','paused','transition','recovering'];
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

/** Normaliza saves antigos sem mexer nos dados de progressão. */
export function migrateGameState(value:unknown):unknown{
  const migrated=structuredClone(value);
  if(!record(migrated))return migrated;
  // Fase 3: personagens antigos ganham linha (trás para arco/cajado/classes à distância) e o primeiro da frente vira tanque.
  const characters=Array.isArray(migrated.characters)?migrated.characters.filter(record):[];
  if(characters.some(c=>c.row===undefined||typeof c.isTank!=='boolean')){
    for(const c of characters){
      if(c.row===undefined){const weapon=ITEMS.find(i=>i.id===(record(c.equipment)?c.equipment.weapon:undefined));c.row=weapon?.trains==='ranged'||['paladin','druid','necromancer'].includes(String(c.classId))?'back':'front';}
      if(typeof c.isTank!=='boolean')c.isTank=false;
    }
    const team=Array.isArray(migrated.team)?migrated.team:[];
    if(!characters.some(c=>c.isTank)){const tank=team.map(id=>characters.find(c=>c.id===id)).find(c=>c?.row==='front');if(tank)tank.isTank=true;}
  }
  // Fase 4: o kit acompanha a classe (saves de teste evoluídos ainda estavam com o kit do Squire).
  for(const c of characters)if(record(c.profile)&&typeof c.profile.classId==='string'&&c.profile.classId in CLASS_BY_ID)c.classId=kitOfNode(c.profile.classId);
  // Fase 13: aparência por cores. Sem `look` = padrão pela posição; ids de cor desconhecidos caem na primeira opção, sem invalidar o save; `spriteId` antigo é descartado.
  characters.forEach(c=>{if(c.goal!==undefined&&!isGoalId(c.goal))delete c.goal;});
  characters.forEach((c,index)=>{delete c.spriteId;c.look=normalizeLook(record(c.look)?c.look as Partial<import('../art/look').Look>:undefined,index);});
  if(migrated.huntId===undefined)migrated.huntId=DEFAULT_HUNT;
  if(!record(migrated.huntStats))migrated.huntStats={};
  // Fase 5: offlineTarget (1 vaga) virou offlineTargets (2 vagas) + histórico.
  for(const c of characters)if(record(c.profile)){
    const p=c.profile;
    if(!Array.isArray(p.offlineTargets)){const old=typeof p.offlineTarget==='string'?p.offlineTarget:null;p.offlineTargets=[old,null];if(!Array.isArray(p.offlineHistory))p.offlineHistory=old?[old]:[];}
    delete p.offlineTarget;
    if(!Array.isArray(p.offlineHistory))p.offlineHistory=[];
  }
  // Fase 6: talentos em grade. O modelo antigo (talents + talentPoints) é reembolsado (os pontos agora vêm do nível);
  // ranks que não fecham com as regras de compra voltam a zero talentos (só as Origens), sem invalidar o save.
  for(const c of characters)if(record(c.profile)&&Array.isArray(c.profile.classPath)){
    const path=(c.profile.classPath as unknown[]).filter((id):id is string=>typeof id==='string');
    const origins=()=>Object.fromEntries(path.filter(id=>id in TALENT_TREES).map(id=>[rootIdOf(id),1]));
    const legacy=c.talentRanks===undefined;
    delete c.talents;delete c.talentPoints;
    if(legacy||!validTalentRanks(c.talentRanks,path,finite(c.profile.level)?Number(c.profile.level):1))c.talentRanks=origins();
  }
  // Fase 7: equipamento de classe (instâncias). Saves antigos não têm nenhum.
  if(!Array.isArray(migrated.gearBag))migrated.gearBag=[];
  {const ab=migrated.autoBuy;const ok=record(ab)&&typeof ab.enabled==='boolean'&&finite(ab.reserve)&&finite(ab.refillAt)&&record(ab.targets)&&finite(ab.spent)&&finite(ab.bought)&&Object.values(ab.targets).every(v=>finite(v)&&Number(v)>=0);if(!ok)migrated.autoBuy={enabled:false,reserve:0,refillAt:50,targets:{},spent:0,bought:0};}
  // Run do corredor procedural: opcional; uma run corrompida é descartada (a hunt recomeça do início) em vez de recusar o save inteiro.
  {const r=migrated.run;if(r!==undefined){const ok=record(r)&&finite(r.seed)&&finite(r.anchor)&&finite(r.lastTrigger)&&finite(r.deepest)&&typeof r.open==='boolean'&&record(r.pos)&&Object.values(r.pos).every(p=>record(p)&&finite(p.x)&&finite(p.y))&&Array.isArray(r.queue)&&r.queue.every(q=>record(q)&&finite(q.chunk)&&finite(q.waited)&&Array.isArray(q.ids)&&q.ids.every(id=>typeof id==='string'&&!!MONSTERS[id]));if(!ok)delete migrated.run;else{if(r.floor!==undefined&&!finite(r.floor))delete r.floor;const t=r as {windups?:unknown;shots?:unknown;ai?:unknown;focus?:unknown;clock?:unknown};delete t.windups;delete t.shots;delete t.ai;delete t.focus;delete t.clock;}}
  // Save de uma caçada em waves (sem run): no modo corredor ela é encerrada ao carregar; o resto (progressão, inventário) fica intacto.
  if(RUN_CONFIG.enabled&&migrated.run===undefined&&migrated.status!=='idle'){migrated.status='idle';migrated.monsters=[];migrated.wavePending=[];migrated.transitionMs=0;}}
  if(migrated.pendingHunt!==undefined&&(typeof migrated.pendingHunt!=='string'||!(migrated.pendingHunt in HUNT_BY_ID)))delete migrated.pendingHunt;
  for(const c of characters)if(!record(c.gear))c.gear={};
  if(record(migrated.inventory)&&record(migrated.inventory.capacity)&&finite(migrated.inventory.capacity.supply)&&Number(migrated.inventory.capacity.supply)<200)migrated.inventory.capacity.supply=200;
  const analyzers=[migrated.analyzer,...(Array.isArray(migrated.history)?migrated.history:[])];
  for(const raw of analyzers)if(record(raw)&&!record(raw.suppliesUsed))raw.suppliesUsed={};
  return migrated;
}

/** Instância de equipamento de classe: item do catálogo, classificação e atributos coerentes (quantidade, códigos, níveis). */
function validInstance(value:unknown){
  if(!record(value)||typeof value.uid!=='string'||!value.uid||typeof value.baseId!=='string'||!classItem(value.baseId))return false;
  if(!(CLASSIFICATIONS as readonly string[]).includes(value.classification as string)||!Array.isArray(value.attrs))return false;
  if(value.attrs.length!==ITEM_CONFIG.rarityAttrs[value.classification as Classification])return false;
  const codes=new Set<string>();
  for(const a of value.attrs){if(!record(a)||typeof a.code!=='string'||!(a.code in EFFECTS)||codes.has(a.code)||!Number.isInteger(a.level)||Number(a.level)<1||Number(a.level)>ITEM_CONFIG.attrLevelCap)return false;codes.add(a.code);}
  return true;
}
/** Equipamento de um personagem: slot certo, classe compatível, sem item antigo no mesmo slot e regra de mãos respeitada. */
function validGear(raw:Record<string,unknown>,seen:Set<string>){
  if(!record(raw.gear)||!record(raw.equipment)||!record(raw.profile))return false;
  const path=(raw.profile as {classPath:string[]});
  for(const [slot,value] of Object.entries(raw.gear)){
    if(!(GEAR_SLOTS as readonly string[]).includes(slot)||!validInstance(value)||seen.has((value as {uid:string}).uid))return false;
    const base=classItem((value as {baseId:string}).baseId)!;
    if(base.slot!==slot||!classCanUse({profile:path} as never,base)||raw.equipment[slot]!==undefined)return false;
    seen.add((value as {uid:string}).uid);
  }
  const gear=raw.gear as Record<string,{baseId:string}>;
  return !handsConflict(gear.weapon&&classItem(gear.weapon.baseId),gear.offhand&&classItem(gear.offhand.baseId));
}

/** Perfil RPG (Squire -> classe -> subclasse): todas as proficiências presentes e numéricas. */
function validProfile(value:unknown){
  if(!record(value)||!finite(value.level)||Number(value.level)<1||!finite(value.xp)||Number(value.xp)<0)return false;
  if(typeof value.classId!=='string'||!(value.classId in CLASS_BY_ID))return false;
  if(!Array.isArray(value.classPath)||!value.classPath.length||value.classPath[value.classPath.length-1]!==value.classId||value.classPath.some(id=>typeof id!=='string'||!(id in CLASS_BY_ID)))return false;
  if(!record(value.proficiencies)||!record(value.counters))return false;
  for(const id of PROFICIENCY_IDS){const p=value.proficiencies[id];if(!record(p)||!finite(p.level)||Number(p.level)<1||Number(p.level)>MAX_PROFICIENCY_LEVEL||!finite(p.tries)||Number(p.tries)<0)return false;}
  if(Object.entries(value.counters).some(([id,n])=>!(COUNTER_IDS as readonly string[]).includes(id)||!finite(n)))return false;
  if(!Array.isArray(value.offlineTargets)||value.offlineTargets.length!==2||value.offlineTargets.some(id=>id!==null&&!(PROFICIENCY_IDS as readonly string[]).includes(id as string)))return false;
  if(!Array.isArray(value.offlineHistory)||value.offlineHistory.length>6||value.offlineHistory.some(id=>!(PROFICIENCY_IDS as readonly string[]).includes(id as string)))return false;
  for(const key of ['lastTrained','prevTrained','trainingFocus'])if(value[key]!==undefined&&!(PROFICIENCY_IDS as readonly string[]).includes(value[key] as string))return false;
  return value.trainingAcc===undefined||finite(value.trainingAcc);
}

export function validateGameState(value:unknown):value is GameState{
  if(!record(value)||value.version!==1||!statuses.includes(value.status as HuntStatus))return false;
  if(!Array.isArray(value.characters)||!Array.isArray(value.team)||!Array.isArray(value.monsters)||!record(value.inventory))return false;
  if(!finite(value.wave)||Number(value.wave)<0||typeof value.huntId!=='string'||!HUNT_BY_ID[value.huntId]||Number(value.wave)>=HUNT_BY_ID[value.huntId].waves.length||!finite(value.cycle)||!finite(value.gold))return false;
  const characters=value.characters as unknown[];if(characters.length>5)return false;
  const ids=new Set<string>();
  for(const raw of characters){if(!record(raw)||typeof raw.id!=='string'||typeof raw.name!=='string'||typeof raw.classId!=='string'||!(raw.classId in CLASSES)||!validProfile(raw.profile)||raw.classId!==kitOfNode((raw.profile as {classId:string}).classId)||(raw.row!=='front'&&raw.row!=='back')||typeof raw.isTank!=='boolean'||!record(raw.look)||!record(raw.talentRanks)||!record(raw.equipment)||!Array.isArray(raw.spellSlots)||!record(raw.spellConditions)||!record(raw.cooldowns)||!Array.isArray(raw.effects)||!record(raw.helper))return false;if(ids.has(raw.id))return false;ids.add(raw.id);if((raw.spellSlots as unknown[]).some(id=>typeof id!=='string'||!SPELLS.some(s=>s.id===id)))return false;}
  if((value.team as unknown[]).some(id=>typeof id!=='string'||!ids.has(id))||(value.team as unknown[]).length>4)return false;
  for(const raw of value.monsters as unknown[]){if(!record(raw)||typeof raw.uid!=='string'||typeof raw.defId!=='string'||!MONSTERS[raw.defId]||!finite(raw.hp)||!finite(raw.maxHp)||!finite(raw.cooldown)||typeof raw.alive!=='boolean')return false;}
  const inventory=value.inventory as Record<string,unknown>;if(!record(inventory.capacity))return false;
  const knownItems=new Set(ITEMS.map(i=>i.id));for(const key of ['bp','loot','supply'] as const){if(!Array.isArray(inventory[key]))return false;for(const raw of inventory[key] as unknown[]){if(!record(raw)||typeof raw.itemId!=='string'||!knownItems.has(raw.itemId)||!finite(raw.quantity)||Number(raw.quantity)<0)return false;}}
  if(!record(value.huntStats))return false;
  // Waves com reforços (Fase 7): estado opcional; saves antigos não têm.
  if(value.waveBags!==undefined&&(!record(value.waveBags)||Object.values(value.waveBags).some(b=>!record(b)||!Array.isArray(b.bag)||b.bag.some(n=>!finite(n))||!record(b.carry))))return false;
  if(value.wavePending!==undefined&&(!Array.isArray(value.wavePending)||value.wavePending.some(id=>typeof id!=='string'||!MONSTERS[id])))return false;
  if(value.lastExtra!==undefined&&!finite(value.lastExtra))return false;
  if(value.reinforceS!==undefined&&!finite(value.reinforceS))return false;
  if(value.waveInfo!==undefined&&(!record(value.waveInfo)||!finite(value.waveInfo.extra)||!finite(value.waveInfo.total)||!finite(value.waveInfo.goldStart)))return false;
  if(value.formationPresets!==undefined){const p=value.formationPresets;if(!Array.isArray(p)||p.length>3||!p.every(e=>e===null||(record(e)&&typeof e.name==='string'&&e.name.length<=18&&Array.isArray(e.team)&&e.team.length<=4&&e.team.every(x=>typeof x==='string')&&record(e.rows)&&(e.tank===undefined||typeof e.tank==='string'))))return false;}
  {const seen=new Set<string>();if(!Array.isArray(value.gearBag)||value.gearBag.length>GEAR_BAG_CAPACITY*99)return false;for(const g of value.gearBag){if(!validInstance(g)||seen.has((g as {uid:string}).uid))return false;seen.add((g as {uid:string}).uid);}for(const raw of characters)if(!validGear(raw as Record<string,unknown>,seen))return false;}
  return record(value.analyzer)&&record(value.analyzer.suppliesUsed)&&record(value.codex)&&Array.isArray(value.history)&&value.history.every(entry=>record(entry)&&record(entry.suppliesUsed))&&Array.isArray(value.equippedCharms)&&Array.isArray(value.unlockedCharms)&&typeof value.autoAdvance==='boolean'&&typeof value.message==='string';
}

export function cloneValidatedState(value:unknown):GameState{
  const migrated=migrateGameState(value);
  if(!validateGameState(migrated))throw new Error('Backup incompatível ou corrompido.');
  return structuredClone(migrated);
}
