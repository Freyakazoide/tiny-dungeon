import type { GameState, HuntStatus } from '../core/types';
import { CLASSES, kitOfNode, kitsOfPath } from '../data/classes';
import { ITEMS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { DEFAULT_HUNT, HUNT_BY_ID } from '../data/hunts';
import { DEFAULT_SPRITE, defaultSpriteFor, isKnownSprite } from '../data/sprites';
import { SPELLS } from '../data/spells';
import { talentById } from '../data/talents';
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
  // Fase 5: sprite escolhível. Sem sprite = padrão pela posição; id desconhecido cai no bloco, sem invalidar o save.
  characters.forEach((c,index)=>{if(c.spriteId===undefined)c.spriteId=defaultSpriteFor(index);else if(!isKnownSprite(c.spriteId))c.spriteId=DEFAULT_SPRITE;});
  if(migrated.huntId===undefined)migrated.huntId=DEFAULT_HUNT;
  if(!record(migrated.huntStats))migrated.huntStats={};
  // Fase 5: offlineTarget (1 vaga) virou offlineTargets (2 vagas) + histórico.
  for(const c of characters)if(record(c.profile)){
    const p=c.profile;
    if(!Array.isArray(p.offlineTargets)){const old=typeof p.offlineTarget==='string'?p.offlineTarget:null;p.offlineTargets=[old,null];if(!Array.isArray(p.offlineHistory))p.offlineHistory=old?[old]:[];}
    delete p.offlineTarget;
    if(!Array.isArray(p.offlineHistory))p.offlineHistory=[];
  }
  if(record(migrated.inventory)&&record(migrated.inventory.capacity)&&finite(migrated.inventory.capacity.supply)&&Number(migrated.inventory.capacity.supply)<200)migrated.inventory.capacity.supply=200;
  const analyzers=[migrated.analyzer,...(Array.isArray(migrated.history)?migrated.history:[])];
  for(const raw of analyzers)if(record(raw)&&!record(raw.suppliesUsed))raw.suppliesUsed={};
  return migrated;
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
  for(const raw of characters){if(!record(raw)||typeof raw.id!=='string'||typeof raw.name!=='string'||typeof raw.classId!=='string'||!(raw.classId in CLASSES)||!validProfile(raw.profile)||raw.classId!==kitOfNode((raw.profile as {classId:string}).classId)||(raw.row!=='front'&&raw.row!=='back')||typeof raw.isTank!=='boolean'||typeof raw.spriteId!=='string'||!finite(raw.talentPoints)||Number(raw.talentPoints)<0||!record(raw.talents)||!record(raw.equipment)||!Array.isArray(raw.spellSlots)||!record(raw.spellConditions)||!record(raw.cooldowns)||!Array.isArray(raw.effects)||!record(raw.helper))return false;if(ids.has(raw.id))return false;ids.add(raw.id);if((raw.spellSlots as unknown[]).some(id=>typeof id!=='string'||!SPELLS.some(s=>s.id===id)))return false;for(const [talentId,rank] of Object.entries(raw.talents)){const talent=talentById(talentId);if(!talent||!kitsOfPath(((raw.profile as Record<string,unknown>).classPath as string[])).includes(talent.classId)||!finite(rank)||Number(rank)<0||!Number.isInteger(rank))return false;}}
  if((value.team as unknown[]).some(id=>typeof id!=='string'||!ids.has(id))||(value.team as unknown[]).length>4)return false;
  for(const raw of value.monsters as unknown[]){if(!record(raw)||typeof raw.uid!=='string'||typeof raw.defId!=='string'||!MONSTERS[raw.defId]||!finite(raw.hp)||!finite(raw.maxHp)||!finite(raw.cooldown)||typeof raw.alive!=='boolean')return false;}
  const inventory=value.inventory as Record<string,unknown>;if(!record(inventory.capacity))return false;
  const knownItems=new Set(ITEMS.map(i=>i.id));for(const key of ['bp','loot','supply'] as const){if(!Array.isArray(inventory[key]))return false;for(const raw of inventory[key] as unknown[]){if(!record(raw)||typeof raw.itemId!=='string'||!knownItems.has(raw.itemId)||!finite(raw.quantity)||Number(raw.quantity)<0)return false;}}
  if(!record(value.huntStats))return false;
  return record(value.analyzer)&&record(value.analyzer.suppliesUsed)&&record(value.codex)&&Array.isArray(value.history)&&value.history.every(entry=>record(entry)&&record(entry.suppliesUsed))&&Array.isArray(value.equippedCharms)&&Array.isArray(value.unlockedCharms)&&typeof value.autoAdvance==='boolean'&&typeof value.message==='string';
}

export function cloneValidatedState(value:unknown):GameState{
  const migrated=migrateGameState(value);
  if(!validateGameState(migrated))throw new Error('Backup incompatível ou corrompido.');
  return structuredClone(migrated);
}
