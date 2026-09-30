import type { Character, ItemInstance, Slot } from '../core/types';
import { CLASSIFICATIONS, CLASSIFICATION_NAMES, classItem, ITEM_CONFIG, itemsForClass, QUALITIES, QUALITY_NAMES, type Classification, type ClassItemDef, type Quality } from '../data/classItems';
import { BOSS_BIS_MULTIPLIER, CLASSIFICATION_VALUE, CLASSIFICATION_WEIGHTS, QUALITY_VALUE, QUALITY_WEIGHTS, SMITH_MARKUP } from '../data/gearDrops';
import { EFFECTS, TALENT_TREES } from '../data/talentTrees';
import { AFFINITY } from '../rpg/affinity';
import { PROFICIENCY_IDS, type ProficiencyId } from '../rpg/proficiencies';

/** Equipamento de classe (Fase 7): instâncias com classificação e atributos aleatórios sobre um item base do catálogo. */
export type Rng = () => number;
export const GEAR_SLOTS: readonly Slot[] = ['weapon', 'offhand', 'helmet', 'armor', 'legs', 'boots', 'amulet', 'ring'];

/** Valor de um atributo aleatório em pontos percentuais: nível × unidade do catálogo × 0,33. */
export const attrValue = (code: string, level: number) => level * (EFFECTS[code]?.unitPerRank ?? 0) * ITEM_CONFIG.itemAttrScale;
export const instanceName = (instance: ItemInstance) => classItem(instance.baseId)?.name ?? instance.baseId;

/** Códigos de efeito que aparecem na grade de talentos da classe: "combinam" com ela. */
const MATCH: Record<string, Set<string>> = Object.fromEntries(
  Object.values(TALENT_TREES).filter(tree => tree.tier === 1).map(tree => [tree.id, new Set(tree.nodes.flatMap(node => node.effects.map(e => e.code)))]));

/** Código de elemento/tries (e_fire, t_melee…) para uma proficiência que a classe bloqueia. */
const blockedCode = (code: string, classes: readonly string[]) => {
  const prof = /^[et]_(\w+)$/.exec(code)?.[1] as ProficiencyId | undefined;
  return !!prof && (PROFICIENCY_IDS as readonly string[]).includes(prof) && classes.some(cls => (AFFINITY[cls]?.[prof] ?? 1) <= 0);
};

/**
 * Peso de sorteio de cada código para o item: 3 se combina com a classe dona, 1 para utilidade e demais,
 * 0,25 para ofensa que a classe não usa, 0 para elemento/tries bloqueados (por qualquer classe que use o item)
 * e para os códigos que a passiva do próprio item já tem.
 */
export function attributeWeights(base: ClassItemDef): Record<string, number> {
  const owner = MATCH[base.classes[0]] ?? new Set<string>(), own = new Set((base.effects ?? []).map(e => e.code));
  const weights: Record<string, number> = {};
  for (const [code, effect] of Object.entries(EFFECTS)) {
    weights[code] = own.has(code) || blockedCode(code, base.classes) ? 0 : owner.has(code) ? 3 : effect.category === 'offense' ? 0.25 : 1;
  }
  return weights;
}

const randInt = (min: number, max: number, rng: Rng) => min + Math.floor(rng() * (max - min + 1));
/** Sorteia `count` atributos distintos, ponderados; nível inicial de 1 a 3. */
export function rollAttributes(base: ClassItemDef, count: number, rng: Rng = Math.random): ItemInstance['attrs'] {
  const weights = attributeWeights(base), pool = Object.entries(weights).filter(([, w]) => w > 0), attrs: ItemInstance['attrs'] = [];
  for (let i = 0; i < count && pool.length; i++) {
    let roll = rng() * pool.reduce((sum, [, w]) => sum + w, 0), index = pool.length - 1;
    for (let j = 0; j < pool.length; j++) { roll -= pool[j][1]; if (roll < 0) { index = j; break; } }
    const [code] = pool.splice(index, 1)[0];
    attrs.push({ code, level: randInt(ITEM_CONFIG.rollLevel[0], ITEM_CONFIG.rollLevel[1], rng) });
  }
  return attrs;
}

let uidCounter = 0;
export const newGearUid = () => `gear-${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
export function createInstance(baseId: string, classification: Classification = 'common', rng: Rng = Math.random, uid = newGearUid()): ItemInstance | undefined {
  const base = classItem(baseId);
  if (!base) return undefined;
  return { uid, baseId, classification, attrs: rollAttributes(base, ITEM_CONFIG.rarityAttrs[classification], rng) };
}

const SLOT_FACTOR = { w1: 1.2, w2: 1.5 } as const;
/** Valor de venda de uma instância. */
export function gearValue(instance: ItemInstance): number {
  const base = classItem(instance.baseId);
  if (!base) return 0;
  return Math.round(QUALITY_VALUE[base.quality] * (SLOT_FACTOR[base.slotGroup as 'w1' | 'w2'] ?? 1) * CLASSIFICATION_VALUE[instance.classification]);
}
/** Preço do Ferreiro: só itens Padrão, sempre Comuns. */
export const smithPrice = (baseId: string) => { const base = classItem(baseId); return base?.quality === 'standard' ? gearValue({ uid: '', baseId, classification: 'common', attrs: [] }) * SMITH_MARKUP : Infinity; };

/** Soma do que o equipamento de classe dá ao personagem: níveis de proficiência, Arm e efeitos em pontos percentuais. */
export interface GearBonus { levels: Partial<Record<ProficiencyId, number>>; arm: number; effects: Record<string, number>; }
export function gearBonus(c: Pick<Character, 'gear'>): GearBonus {
  const out: GearBonus = { levels: {}, arm: 0, effects: {} };
  for (const instance of Object.values(c.gear ?? {})) {
    const base = classItem(instance.baseId);
    if (!base) continue;
    for (const [id, n] of Object.entries(base.fixed) as [ProficiencyId, number][]) out.levels[id] = (out.levels[id] ?? 0) + n;
    out.arm += base.arm ?? 0;
    for (const e of base.effects ?? []) out.effects[e.code] = (out.effects[e.code] ?? 0) + e.value;
    for (const a of instance.attrs) out.effects[a.code] = (out.effects[a.code] ?? 0) + attrValue(a.code, a.level);
  }
  return out;
}
/** Níveis de proficiência que o equipamento soma (não contam para as portas de evolução). */
export const gearLevels = (c: Pick<Character, 'gear'>, id: ProficiencyId) => gearBonus(c).levels[id] ?? 0;

export const gearBase = (c: Pick<Character, 'gear'>, slot: Slot) => { const inst = c.gear?.[slot]; return inst ? classItem(inst.baseId) : undefined; };

/** O item cabe no personagem: qualquer classe do item no `classPath` (Squire nunca equipa itens de classe). */
export const classCanUse = (c: Pick<Character, 'profile'>, base: ClassItemDef) => base.classes.some(cls => c.profile.classPath.includes(cls));

/** A Aljava é a exceção que convive com as armas de 2 mãos do Caçador. */
export const quiverWith2H = (weapon: ClassItemDef | undefined, offhand: ClassItemDef | undefined) =>
  !!weapon && !!offhand && offhand.offhandKind === 'quiver' && weapon.classes.includes('cacador');

/** Regra de mãos: arma de 2 mãos bloqueia a secundária (exceto Aljava com arma do Caçador); `dual` só com arma de 1 mão. */
export function handsConflict(weapon: ClassItemDef | undefined, offhand: ClassItemDef | undefined): string | undefined {
  if (!weapon || !offhand || weapon.hands !== 2) return undefined;
  if (quiverWith2H(weapon, offhand)) return undefined;
  return offhand.offhandKind === 'dual' ? 'A arma gêmea só combina com arma de 1 mão.' : 'Arma de 2 mãos bloqueia a mão secundária.';
}

/** Por que `c` não pode equipar a instância (undefined = pode). Só considera a classe: as mãos são resolvidas no engine. */
export function gearBlockReason(c: Pick<Character, 'profile'>, instance: ItemInstance): string | undefined {
  const base = classItem(instance.baseId);
  if (!base) return 'Item desconhecido.';
  if (!classCanUse(c, base)) return 'Restrito a ' + base.classes.map(id => id.replace(/_/g, ' ')).join(', ') + '.';
  return undefined;
}

export const describeInstance = (instance: ItemInstance) => {
  const base = classItem(instance.baseId);
  return base ? `${base.name} (${QUALITY_NAMES[base.quality]} · ${CLASSIFICATION_NAMES[instance.classification]})` : instance.baseId;
};
export const classificationRank = (c: Classification) => CLASSIFICATIONS.indexOf(c);

/** Sorteio de um item de classe para um monstro: classe (do pool), qualidade (pela hunt), item e classificação. */
export function rollGearDrop(huntIndex: number, boss: boolean, classPool: readonly string[], rng: Rng = Math.random): ItemInstance | undefined {
  if (!classPool.length) return undefined;
  const pick = <T,>(entries: [T, number][]) => {
    let roll = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [value, weight] of entries) { roll -= weight; if (roll < 0) return value; }
    return entries[entries.length - 1][0];
  };
  const cls = classPool[Math.floor(rng() * classPool.length)];
  const weights = QUALITY_WEIGHTS[Math.max(0, Math.min(QUALITY_WEIGHTS.length - 1, huntIndex))];
  const quality = pick(QUALITIES.map(q => [q, q === 'bis' && boss ? weights.bis * BOSS_BIS_MULTIPLIER : weights[q]] as [Quality, number]));
  const pool = itemsForClass(cls).filter(item => item.quality === quality);
  if (!pool.length) return undefined;
  const base = pool[Math.floor(rng() * pool.length)];
  const table = CLASSIFICATION_WEIGHTS[boss ? 'boss' : 'normal'];
  const classification = pick(CLASSIFICATIONS.map(c => [c, table[c]] as [Classification, number]));
  return createInstance(base.id, classification, rng);
}
