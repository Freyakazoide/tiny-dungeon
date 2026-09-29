import type { ItemDef, LootEntry, Rarity } from '../core/types';

/** Equipamento por faixa e materiais das hunts novas (gerados por função para não digitar 30+ itens). */

export interface GearSetDef {
  huntId: string;
  /** ℓ: nível do item nas fórmulas. */
  itemLevel: number;
  /** Nível de personagem para usar (= minLevel da hunt). */
  minLevel: number;
  rarity: Rarity;
  names: { melee: string; ranged: string; staff: string; armor: string; shield: string };
  /** Ouro médio do monstro comum da hunt (base do valor de venda dos materiais). */
  commonGold: number;
  materials: { common: [string, string]; elite: [string, string]; trophy: string };
}

export const GEAR_PIECES = ['melee', 'ranged', 'staff', 'armor', 'shield'] as const;
export type GearPiece = (typeof GEAR_PIECES)[number];

export const GEAR_SETS: GearSetDef[] = [
  { huntId: 'floresta_sombria', itemLevel: 9, minLevel: 7, rarity: 'uncommon', commonGold: 19,
    names: { melee: 'Espada do Caçador de Lobos', ranged: 'Arco de Teixo', staff: 'Cajado de Galho Antigo', armor: 'Couraça de Couro Reforçado', shield: 'Escudo de Casca' },
    materials: { common: ['Pele de Lobo', 'Presa de Lobo'], elite: ['Distintivo de Bandido', 'Adaga Quebrada'], trophy: 'Coroa de Teias' } },
  { huntId: 'pantano_toxico', itemLevel: 14, minLevel: 12, rarity: 'uncommon', commonGold: 26,
    names: { melee: 'Espada Corroída', ranged: 'Arco de Junco', staff: 'Cajado de Lodo', armor: 'Armadura de Escamas de Lagarto', shield: 'Escudo de Carapaça' },
    materials: { common: ['Pele Viscosa', 'Pele Viscosa'], elite: ['Escama do Pântano', 'Escama do Pântano'], trophy: 'Dente de Hidra' } },
  { huntId: 'minas_esquecidas', itemLevel: 18, minLevel: 16, rarity: 'rare', commonGold: 31,
    names: { melee: 'Machado de Mineiro', ranged: 'Arco de Cristal Bruto', staff: 'Cajado de Geodo', armor: 'Armadura de Pedra', shield: 'Escudo de Minério' },
    materials: { common: ['Pedaço de Minério', 'Pedaço de Minério'], elite: ['Núcleo de Pedra', 'Núcleo de Pedra'], trophy: 'Cristal Bruto' } },
  { huntId: 'fortaleza_de_gelo', itemLevel: 22, minLevel: 20, rarity: 'rare', commonGold: 37,
    names: { melee: 'Lâmina de Gelo', ranged: 'Arco Glacial', staff: 'Cajado do Inverno', armor: 'Armadura de Pelo Branco', shield: 'Escudo de Geada' },
    materials: { common: ['Pelo Gelado', 'Pelo Gelado'], elite: ['Presa de Yeti', 'Presa de Yeti'], trophy: 'Coração de Gelo' } },
  { huntId: 'vulcao_ardente', itemLevel: 26, minLevel: 24, rarity: 'epic', commonGold: 42,
    names: { melee: 'Espada de Magma', ranged: 'Arco de Brasa', staff: 'Cajado Vulcânico', armor: 'Armadura de Obsidiana', shield: 'Escudo de Escória' },
    materials: { common: ['Escama Ígnea', 'Escama Ígnea'], elite: ['Rocha Derretida', 'Rocha Derretida'], trophy: 'Brasa Eterna' } },
  { huntId: 'templo_profano', itemLevel: 29, minLevel: 27, rarity: 'epic', commonGold: 47,
    names: { melee: 'Espada Profana', ranged: 'Arco do Culto', staff: 'Cajado do Sumo Sacerdote', armor: 'Manto Profano', shield: 'Escudo Consagrado' },
    materials: { common: ['Símbolo Profano', 'Símbolo Profano'], elite: ['Pena Enegrecida', 'Pena Enegrecida'], trophy: 'Cálice Profano' } },
];

export const slug = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export const gearId = (huntId: string, piece: GearPiece) => `gear_${huntId}_${piece}`;
/** Preço no Ferreiro: round(45 × ℓ^1,6). A venda do item vale só uma fração, para não haver arbitragem. */
export const smithPrice = (itemLevel: number) => Math.round(45 * itemLevel ** 1.6);
const SELL_FRACTION = .3;

/** As 5 peças de um conjunto pelas fórmulas do plano. */
export function gearSet(def: GearSetDef): ItemDef[] {
  const l = def.itemLevel, price = smithPrice(l);
  const base = { kind: 'equipment' as const, rarity: def.rarity, level: def.minLevel, price, value: Math.round(price * SELL_FRACTION) };
  return [
    { ...base, id: gearId(def.huntId, 'melee'), name: def.names.melee, slot: 'weapon', trains: 'melee', stats: { attack: Math.round(3 + 1.5 * l) } },
    { ...base, id: gearId(def.huntId, 'ranged'), name: def.names.ranged, slot: 'weapon', trains: 'ranged', stats: { attack: Math.round(4 + 1.5 * l) } },
    { ...base, id: gearId(def.huntId, 'staff'), name: def.names.staff, slot: 'weapon', trains: 'melee', stats: { attack: Math.round(1 + .5 * l), magicPower: Math.round(2 + 1.2 * l), maxMana: Math.round(10 + 3 * l) } },
    { ...base, id: gearId(def.huntId, 'armor'), name: def.names.armor, slot: 'armor', stats: { defense: Math.round(2 + .7 * l), maxHp: Math.round(6 + 3.5 * l) } },
    { ...base, id: gearId(def.huntId, 'shield'), name: def.names.shield, slot: 'offhand', stats: { defense: Math.round(2 + .9 * l), resistance: .05 } },
  ];
}

/** Materiais e troféu de venda; valores a partir do ouro do comum da hunt. */
export function materialItems(def: GearSetDef): ItemDef[] {
  const items: ItemDef[] = [];
  const add = (name: string, rarity: Rarity, value: number) => { if (!items.some(i => i.id === slug(name))) items.push({ id: slug(name), name, kind: 'loot', rarity, value }); };
  def.materials.common.forEach(name => add(name, 'common', Math.round(.4 * def.commonGold)));
  def.materials.elite.forEach(name => add(name, 'uncommon', Math.round(1.2 * def.commonGold)));
  add(def.materials.trophy, 'rare', 8 * def.commonGold);
  return items;
}

export const GEAR_ITEMS: ItemDef[] = GEAR_SETS.flatMap(gearSet);
export const MATERIAL_ITEMS: ItemDef[] = GEAR_SETS.flatMap(materialItems);

const GEAR_DROP = { common: .015, elite: .04, boss: .30 } as const;
const gearDrops = (huntId: string, kind: keyof typeof GEAR_DROP): LootEntry[] =>
  GEAR_PIECES.map(piece => ({ itemId: gearId(huntId, piece), chance: GEAR_DROP[kind] / GEAR_PIECES.length, min: 1, max: 1 }));

/** Tabela de loot de um monstro de hunt nova: materiais (55/30% comum, 45/20% elite), troféu do boss e peças do conjunto. */
export function huntLoot(huntId: string, kind: 'common' | 'elite' | 'boss'): LootEntry[] {
  const def = GEAR_SETS.find(s => s.huntId === huntId)!;
  const entry = (name: string, chance: number, max = 1): LootEntry => ({ itemId: slug(name), chance, min: 1, max });
  if (kind === 'common') return [entry(def.materials.common[0], .55), ...(def.materials.common[1] !== def.materials.common[0] ? [entry(def.materials.common[1], .30)] : []), ...gearDrops(huntId, 'common')];
  if (kind === 'elite') return [entry(def.materials.elite[0], .45), ...(def.materials.elite[1] !== def.materials.elite[0] ? [entry(def.materials.elite[1], .20)] : []), ...gearDrops(huntId, 'elite')];
  return [entry(def.materials.trophy, 1, 2), ...gearDrops(huntId, 'boss')];
}
