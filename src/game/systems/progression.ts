import { CLASSES } from '../data/classes';
import { itemById } from '../data/items';
import { CHARMS } from '../data/charms';
import { TALENTS } from '../data/talents';
import type { Character, GameState, SkillId, Stats } from '../core/types';

export const xpForLevel = (level: number) => 100 + (level - 1) * 85;
export function gainExperience(character: Character, amount: number) {
  character.xp += amount;
  while (character.xp >= xpForLevel(character.level)) {
    character.xp -= xpForLevel(character.level++);
    character.talentPoints++;
  }
}
export function gainSkill(character: Character, skill: SkillId, amount = 1) {
  const s = character.skills[skill]; s.xp += amount;
  const needed = 20 + s.level * 8;
  if (s.xp >= needed) { s.xp -= needed; s.level++; }
}
export function characterStats(c: Character, state?: GameState): Stats {
  const def = CLASSES[c.classId]; const level = c.level - 1; const out = { ...def.base };
  for (const key of Object.keys(out) as (keyof Stats)[]) out[key] += (def.growth[key] ?? 0) * level;
  for (const id of Object.values(c.equipment)) {
    const stats = id && itemById(id)?.stats; if (!stats) continue;
    for (const key of Object.keys(stats) as (keyof Stats)[]) out[key] += stats[key] ?? 0;
  }
  for (const [id, rank] of Object.entries(c.talents)) {
    const t = TALENTS.find(x=>x.id===id); if (!t || !rank) continue; const mul=t.value*rank;
    if(t.effect==='hp') out.maxHp*=1+mul; else if(t.effect==='mana') out.maxMana*=1+mul;
    else if(t.effect==='attack') out.attack*=1+mul; else if(t.effect==='defense') out.defense*=1+mul; else if(t.effect==='crit') out.crit+=mul;
  }
  if(state?.equippedCharms.includes('stone')) out.resistance += CHARMS.find(x=>x.id==='stone')!.value;
  for(const e of c.effects) { if(e.type==='buffAttack') out.attack*=1+e.value; if(e.type==='buffDefense') out.defense*=1+e.value; }
  out.maxHp=Math.round(out.maxHp); out.maxMana=Math.round(out.maxMana); out.resistance=Math.min(.75,out.resistance);
  return out;
}
export function investTalent(c: Character, talentId: string) {
  const t=TALENTS.find(x=>x.id===talentId && x.classId===c.classId); if(!t || c.talentPoints<1 || (c.talents[t.id]??0)>=t.max) return false;
  if(t.requires && !(c.talents[t.requires]>0)) return false; c.talents[t.id]=(c.talents[t.id]??0)+1; c.talentPoints--; return true;
}
