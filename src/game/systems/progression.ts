import { CLASSES } from '../data/classes';
import { passiveBonus } from '../rpg/passives';
import { TRIES_PER_SECOND } from '../rpg/curves';
import { runtime } from '../rpg/runtime';
import { spellById } from '../data/spells';
import { CLASS_BY_ID } from '../rpg/classTree';
import { gainExperience as gainProfileExperience, gainTries } from '../rpg/profile';
import { PROFICIENCIES, type ProficiencyId } from '../rpg/proficiencies';
import { itemById } from '../data/items';
import { CHARMS } from '../data/charms';
import { talentTotals, talentValue } from './talentGrid';
import { affinityFor } from '../rpg/affinity';
import type { Character, GameState, SpellDef, Stats } from '../core/types';

export { xpForLevel } from '../rpg/curves';
export const classLabel = (character: Character) => CLASS_BY_ID[character.profile.classId]?.name ?? CLASSES[character.classId].name;
/** XP vai para o perfil RPG; os pontos de talento são derivados do nível (talentPointsAvailable), então nada a creditar aqui. */
export function gainExperience(character: Character, amount: number) {
  gainProfileExperience(character.profile, amount);
}
/** Bônus do talento `t_<proficiência>` (+ `t_focus` no elemento em foco), em pontos percentuais. */
export const triesBonusPct = (character: Character, id: ProficiencyId) => {
  const totals = talentTotals(character);
  return (totals[`t_${id}`] ?? 0) + (id === elementFocus(character) ? totals.t_focus ?? 0 : 0);
};
/** Multiplicador total de tries de uma proficiência: afinidade da classe × (1 + talento). 0 = bloqueada. */
export const trainMultiplier = (character: Character, id: ProficiencyId) => affinityFor(character.profile, id) * (1 + triesBonusPct(character, id) / 100);
/** Soma tries de uma proficiência (sobe de nível sozinho) e devolve quantos níveis subiram. */
export function trainProficiency(character: Character, id: ProficiencyId, tries = 1) {
  const before = character.profile.proficiencies[id].level;
  gainTries(character.profile, id, tries, triesBonusPct(character, id));
  return character.profile.proficiencies[id].level - before;
}
/** A magia pode ser equipada por este personagem: do kit ou universal, do nível certo e, se for de subclasse, com o nó no caminho. */
export const spellAvailable = (character: Character, spell: SpellDef) =>
  (spell.classId === character.classId || !!spell.universal) && spell.level <= character.profile.level && (!spell.node || character.profile.classPath.includes(spell.node));
export const isElement = (id: ProficiencyId) => PROFICIENCIES[id].group === 'elemental';
/**
 * Elemento em foco: o primeiro elemento entre as vagas de treino (`offlineTargets`); senão o elemento da
 * primeira magia elemental equipada. Só ele treina por cast; sem magia dele equipada, nada treina.
 */
export function elementFocus(character: Character): ProficiencyId | undefined {
  const target = character.profile.offlineTargets.find((id): id is ProficiencyId => !!id && isElement(id));
  if (target) return target;
  for (const id of character.spellSlots) { const element = spellById(id)?.element; if (element) return element; }
  return undefined;
}
/** A proficiência está sendo treinada agora (foco de tempo, ou elemento em foco/Magia com magia dele equipada)? */
export const trainingNow = (character: Character, id: ProficiencyId) =>
  character.profile.trainingFocus === id || (focusSpellEquipped(character) && (id === elementFocus(character) || id === 'magic'));
/** O elemento em foco tem uma magia dele equipada? */
export const focusSpellEquipped = (character: Character) => {
  const focus = elementFocus(character);
  return !!focus && character.spellSlots.some(id => spellById(id)?.element === focus);
};
/** Treino por tempo: 1 try a cada 1 / TRIES_PER_SECOND s de combate, na proficiência em foco. */
export function trainByTime(character: Character, dt: number) {
  const profile = character.profile, focus = profile.trainingFocus;
  if (!focus) return;
  profile.trainingAcc = (profile.trainingAcc ?? 0) + dt * TRIES_PER_SECOND * runtime.trainScale;
  const whole = Math.floor(profile.trainingAcc);
  if (whole > 0) { profile.trainingAcc -= whole; trainProficiency(character, focus, whole); }
}
export function characterStats(c: Character, state?: GameState): Stats {
  const def = CLASSES[c.classId]; const level = c.profile.level - 1; const out = { ...def.base };
  for (const key of Object.keys(out) as (keyof Stats)[]) out[key] += (def.growth[key] ?? 0) * level;
  for (const id of Object.values(c.equipment)) {
    const stats = id && itemById(id)?.stats; if (!stats) continue;
    for (const key of Object.keys(stats) as (keyof Stats)[]) out[key] += stats[key] ?? 0;
  }
  const path = c.profile.classPath, totals = talentTotals(c);
  const grid = (code: string) => (totals[code] ?? 0) / 100;
  out.maxHp *= 1 + grid('hp') + passiveBonus(path, 'maxHp');
  out.maxMana *= 1 + grid('mana') + passiveBonus(path, 'maxMana');
  out.attack *= 1 + passiveBonus(path, 'attack');
  out.defense *= 1 + grid('def') + passiveBonus(path, 'defense');
  out.attackSpeed *= 1 + grid('aspd') + passiveBonus(path, 'attackSpeed');
  out.magicPower *= 1 + grid('magic') + passiveBonus(path, 'magicPower');
  out.crit += grid('crit') + passiveBonus(path, 'crit');
  out.resistance += grid('res') + passiveBonus(path, 'resistance');
  if (c.isTank) out.resistance += passiveBonus(path, 'tankResistance');
  if (state?.equippedCharms.includes('stone')) out.resistance += CHARMS.find(x => x.id === 'stone')!.value;
  for (const e of c.effects) { if (e.type === 'buffAttack') out.attack *= 1 + e.value; if (e.type === 'buffDefense') out.defense *= 1 + e.value; }
  out.maxHp = Math.round(out.maxHp); out.maxMana = Math.round(out.maxMana); out.resistance = Math.min(.75, out.resistance); out.crit = Math.min(.75, out.crit);
  return out;
}
/** Efeito do talento como fração (0,08 = +8%); soma todas as grades do caminho. */
export const talentBonus = talentValue;
