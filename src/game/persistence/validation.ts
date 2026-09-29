import type { GameState, HuntStatus } from '../core/types';
import { CLASSES } from '../data/classes';
import { ITEMS } from '../data/items';
import { MONSTERS, WAVES } from '../data/monsters';
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
  for(const key of ['offlineTarget','lastTrained','trainingFocus'])if(value[key]!==undefined&&!(PROFICIENCY_IDS as readonly string[]).includes(value[key] as string))return false;
  return value.trainingAcc===undefined||finite(value.trainingAcc);
}

export function validateGameState(value:unknown):value is GameState{
  if(!record(value)||value.version!==1||!statuses.includes(value.status as HuntStatus))return false;
  if(!Array.isArray(value.characters)||!Array.isArray(value.team)||!Array.isArray(value.monsters)||!record(value.inventory))return false;
  if(!finite(value.wave)||Number(value.wave)<0||Number(value.wave)>=WAVES.length||!finite(value.cycle)||!finite(value.gold))return false;
  const characters=value.characters as unknown[];if(characters.length>5)return false;
  const ids=new Set<string>();
  for(const raw of characters){if(!record(raw)||typeof raw.id!=='string'||typeof raw.name!=='string'||typeof raw.classId!=='string'||!(raw.classId in CLASSES)||!validProfile(raw.profile)||!finite(raw.talentPoints)||Number(raw.talentPoints)<0||!record(raw.talents)||!record(raw.equipment)||!Array.isArray(raw.spellSlots)||!record(raw.spellConditions)||!record(raw.cooldowns)||!Array.isArray(raw.effects)||!record(raw.helper))return false;if(ids.has(raw.id))return false;ids.add(raw.id);if((raw.spellSlots as unknown[]).some(id=>typeof id!=='string'||!SPELLS.some(s=>s.id===id)))return false;for(const [talentId,rank] of Object.entries(raw.talents)){const talent=talentById(talentId);if(!talent||talent.classId!==raw.classId||!finite(rank)||Number(rank)<0||!Number.isInteger(rank))return false;}}
  if((value.team as unknown[]).some(id=>typeof id!=='string'||!ids.has(id))||(value.team as unknown[]).length>4)return false;
  for(const raw of value.monsters as unknown[]){if(!record(raw)||typeof raw.uid!=='string'||typeof raw.defId!=='string'||!MONSTERS[raw.defId]||!finite(raw.hp)||!finite(raw.maxHp)||!finite(raw.cooldown)||typeof raw.alive!=='boolean')return false;}
  const inventory=value.inventory as Record<string,unknown>;if(!record(inventory.capacity))return false;
  const knownItems=new Set(ITEMS.map(i=>i.id));for(const key of ['bp','loot','supply'] as const){if(!Array.isArray(inventory[key]))return false;for(const raw of inventory[key] as unknown[]){if(!record(raw)||typeof raw.itemId!=='string'||!knownItems.has(raw.itemId)||!finite(raw.quantity)||Number(raw.quantity)<0)return false;}}
  return record(value.analyzer)&&record(value.analyzer.suppliesUsed)&&record(value.codex)&&Array.isArray(value.history)&&value.history.every(entry=>record(entry)&&record(entry.suppliesUsed))&&Array.isArray(value.equippedCharms)&&Array.isArray(value.unlockedCharms)&&typeof value.autoAdvance==='boolean'&&typeof value.message==='string';
}

export function cloneValidatedState(value:unknown):GameState{
  const migrated=migrateGameState(value);
  if(!validateGameState(migrated))throw new Error('Backup incompatível ou corrompido.');
  return structuredClone(migrated);
}
