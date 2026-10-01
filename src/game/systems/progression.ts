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
import { gearBonus } from './gear';
import { ARM_DEFENSE, PROFICIENCY_LEVEL_DAMAGE } from '../data/balance';
import { affinityFor } from '../rpg/affinity';
import type { Character, GameState, SpellDef, Stats } from '../core/types';

export { xpForLevel } from '../rpg/curves';
export const classLabel = (character: Character) => CLASS_BY_ID[character.profile.classId]?.name ?? CLASSES[character.classId].name;
/** XP vai para o perfil RPG; os pontos de talento são derivados do nível (talentPointsAvailable), então nada a creditar aqui. */
export function gainExperience(character: Character, amount: number) {
  gainProfileExperience(character.profile, amount);
}
/** Bônus de tries: talento `t_<proficiência>` (+ `t_focus` no elemento em foco) e itens com `trainBonus`, em pontos percentuais. */
export const triesBonusPct = (character: Character, id: ProficiencyId) => {
  const totals = talentTotals(character);
  const items = Object.values(character.equipment).reduce((sum, itemId) => sum + (itemId ? itemById(itemId)?.trainBonus?.[id] ?? 0 : 0), 0);
  return (totals[`t_${id}`] ?? 0) + (id === elementFocus(character) ? totals.t_focus ?? 0 : 0) + items;
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
  const path = c.profile.classPath, totals = talentTotals(c), gear = gearBonus(c);
  out.defense += gear.arm * ARM_DEFENSE;
  const grid = (code: string) => (totals[code] ?? 0) / 100;
  out.maxHp *= 1 + grid('hp') + passiveBonus(path, 'maxHp');
  out.maxMana *= 1 + grid('mana') + passiveBonus(path, 'maxMana');
  out.attack *= 1 + passiveBonus(path, 'attack');
  out.defense *= 1 + grid('def') + passiveBonus(path, 'defense') + (gear.levels.defense ?? 0) * PROFICIENCY_LEVEL_DAMAGE;
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

export interface StatPart { label: string; value: number; kind: 'flat' | 'percent' }
export interface StatBreakdown { total: number; parts: StatPart[]; cap?: number }

/**
 * Composição de um atributo (tooltip da Ficha). Repete a ordem de soma de `characterStats`: base, nível, itens e armadura
 * (parcelas planas), talentos/passivas/proficiência (percentuais sobre o acumulado) e buffs. A soma aplicada em ordem é o
 * total (`characterStats(...)[key]`), salvo o teto de `crit`/`resistance`, que aparece em `cap`.
 */
export function statBreakdown(c: Character, state: GameState | undefined, key: keyof Stats): StatBreakdown {
  const def = CLASSES[c.classId], level = c.profile.level - 1, path = c.profile.classPath, totals = talentTotals(c), gear = gearBonus(c);
  const grid = (code: string) => (totals[code] ?? 0) / 100;
  const parts: StatPart[] = [{ label: 'Base da classe', value: def.base[key], kind: 'flat' }];
  const growth = (def.growth[key] ?? 0) * level;
  if (growth) parts.push({ label: `Nível ${c.profile.level}`, value: growth, kind: 'flat' });
  let items = 0;
  for (const id of Object.values(c.equipment)) items += (id && itemById(id)?.stats?.[key]) || 0;
  if (items) parts.push({ label: 'Itens', value: items, kind: 'flat' });
  if (key === 'defense' && gear.arm) parts.push({ label: 'Armadura dos itens', value: gear.arm * ARM_DEFENSE, kind: 'flat' });
  const percent: Partial<Record<keyof Stats, [string, number, number]>> = {
    maxHp: ['hp', passiveBonus(path, 'maxHp'), 0], maxMana: ['mana', passiveBonus(path, 'maxMana'), 0], attack: ['', passiveBonus(path, 'attack'), 0],
    defense: ['def', passiveBonus(path, 'defense'), (gear.levels.defense ?? 0) * PROFICIENCY_LEVEL_DAMAGE],
    attackSpeed: ['aspd', passiveBonus(path, 'attackSpeed'), 0], magicPower: ['magic', passiveBonus(path, 'magicPower'), 0],
  };
  const additive: Partial<Record<keyof Stats, [string, number]>> = { crit: ['crit', passiveBonus(path, 'crit')], resistance: ['res', passiveBonus(path, 'resistance')] };
  let running = parts.reduce((a, p) => a + p.value, 0);
  const pct = percent[key];
  if (pct) {
    const [code, passive, levels] = pct;
    const talent = code ? grid(code) : 0;
    const factor = talent + passive + levels;
    if (talent) parts.push({ label: 'Talentos', value: talent, kind: 'percent' });
    if (passive) parts.push({ label: 'Passivas', value: passive, kind: 'percent' });
    if (levels) parts.push({ label: 'Proficiência dos itens', value: levels, kind: 'percent' });
    running *= 1 + factor;
  }
  const add = additive[key];
  if (add) {
    if (grid(add[0])) parts.push({ label: 'Talentos', value: grid(add[0]), kind: 'percent' });
    if (add[1]) parts.push({ label: 'Passivas', value: add[1], kind: 'percent' });
    running += grid(add[0]) + add[1];
    if (key === 'resistance') {
      if (c.isTank && passiveBonus(path, 'tankResistance')) { parts.push({ label: 'Tanque', value: passiveBonus(path, 'tankResistance'), kind: 'percent' }); running += passiveBonus(path, 'tankResistance'); }
      if (state?.equippedCharms.includes('stone')) { const v = CHARMS.find(x => x.id === 'stone')!.value; parts.push({ label: 'Charm Pedra', value: v, kind: 'percent' }); running += v; }
    }
  }
  for (const e of c.effects) {
    if ((key === 'attack' && e.type === 'buffAttack') || (key === 'defense' && e.type === 'buffDefense')) { parts.push({ label: 'Efeito ativo', value: e.value, kind: 'percent' }); running *= 1 + e.value; }
  }
  void running;
  const total = characterStats(c, state)[key];
  return { total, parts, cap: key === 'crit' || key === 'resistance' ? .75 : undefined };
}
