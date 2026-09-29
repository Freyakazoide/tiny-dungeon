import type { GameState, HuntStatus } from '../core/types';
import { CLASSES } from '../data/classes';
import { ITEMS } from '../data/items';
import { MONSTERS, WAVES } from '../data/monsters';
import { SPELLS } from '../data/spells';

const statuses:HuntStatus[]=['idle','running','paused','transition','recovering'];
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

export function validateGameState(value:unknown):value is GameState{
  if(!record(value)||value.version!==1||!statuses.includes(value.status as HuntStatus))return false;
  if(!Array.isArray(value.characters)||!Array.isArray(value.team)||!Array.isArray(value.monsters)||!record(value.inventory))return false;
  if(!finite(value.wave)||Number(value.wave)<0||Number(value.wave)>=WAVES.length||!finite(value.cycle)||!finite(value.gold))return false;
  const characters=value.characters as unknown[];if(!characters.length||characters.length>5)return false;
  const ids=new Set<string>();
  for(const raw of characters){if(!record(raw)||typeof raw.id!=='string'||typeof raw.name!=='string'||typeof raw.classId!=='string'||!(raw.classId in CLASSES)||!finite(raw.level)||!finite(raw.xp)||!record(raw.skills)||!record(raw.equipment)||!Array.isArray(raw.spellSlots)||!record(raw.spellConditions)||!record(raw.cooldowns)||!Array.isArray(raw.effects)||!record(raw.helper))return false;if(ids.has(raw.id))return false;ids.add(raw.id);if((raw.spellSlots as unknown[]).some(id=>typeof id!=='string'||!SPELLS.some(s=>s.id===id)))return false;}
  if((value.team as unknown[]).some(id=>typeof id!=='string'||!ids.has(id))||(value.team as unknown[]).length>4)return false;
  for(const raw of value.monsters as unknown[]){if(!record(raw)||typeof raw.uid!=='string'||typeof raw.defId!=='string'||!MONSTERS[raw.defId]||!finite(raw.hp)||!finite(raw.maxHp)||!finite(raw.cooldown)||typeof raw.alive!=='boolean')return false;}
  const inventory=value.inventory as Record<string,unknown>;if(!record(inventory.capacity))return false;
  const knownItems=new Set(ITEMS.map(i=>i.id));for(const key of ['bp','loot','supply'] as const){if(!Array.isArray(inventory[key]))return false;for(const raw of inventory[key] as unknown[]){if(!record(raw)||typeof raw.itemId!=='string'||!knownItems.has(raw.itemId)||!finite(raw.quantity)||Number(raw.quantity)<0)return false;}}
  return record(value.analyzer)&&record(value.codex)&&Array.isArray(value.history)&&Array.isArray(value.equippedCharms)&&Array.isArray(value.unlockedCharms)&&typeof value.autoAdvance==='boolean'&&typeof value.message==='string';
}

export function cloneValidatedState(value:unknown):GameState{
  if(!validateGameState(value))throw new Error('Backup incompatível ou corrompido.');
  return structuredClone(value);
}
