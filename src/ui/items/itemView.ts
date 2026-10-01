import type { ItemDef, ItemInstance, Slot } from '../../game/core/types';
import { classItem, CLASSIFICATION_NAMES, ITEM_MECHANICS_IMPLEMENTED, QUALITY_NAMES, SLOT_GROUP_NAMES } from '../../game/data/classItems';
import { gearValue, gearEquipReason } from '../../game/systems/gear';
import type { Character } from '../../game/core/types';
import { equipBlockReason } from '../../game/systems/equipment';
import { gearLines } from '../GearPanel';
import { slotNames, statLine } from '../format';

import { PROFICIENCIES } from '../../game/rpg/proficiencies';
/** "+15% de tries em Magia" para itens com `trainBonus`. */
export const trainLine = (item: ItemDef) => Object.entries(item.trainBonus ?? {}).map(([id, pct]) => `+${pct}% de tries em ${PROFICIENCIES[id as keyof typeof PROFICIENCIES].name}`).join(', ');

export type RarityKey = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITY_LABEL: Record<RarityKey, string> = { common: 'Comum', uncommon: 'Incomum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária', mythic: 'Mítica' };
export const RARITY_LETTER: Record<RarityKey, string> = { common: 'C', uncommon: 'I', rare: 'R', epic: 'É', legendary: 'L', mythic: 'M' };
export const RARITY_ORDER: RarityKey[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/** Visão unificada de qualquer item: a UI não precisa saber que existem equipamento simples e de classe. */
export interface ItemView {
  key: string;
  source: 'simple' | 'gear';
  name: string; rarity: RarityKey; rarityLabel: string;
  quality?: string;
  kind: 'equipment' | 'supply' | 'loot';
  slot?: Slot; slotLabel: string; handsLabel?: string;
  base: string;
  attrs: string[];
  mechanic?: { text: string; soon: boolean };
  value: number;
  quantity: number;
  equipped?: boolean; fresh?: boolean;
  reason?: string;
  /** para o ícone */
  supply?: 'health' | 'mana'; offhandKind?: string;
  candidate?: { kind: 'simple'; itemId: string } | { kind: 'gear'; uid: string };
}

export function viewFromItem(item: ItemDef, quantity: number, container: 'bp' | 'loot' | 'supply', character?: Character): ItemView {
  const base = item.kind === 'supply' ? `Recupera ${item.amount} de ${item.supply === 'health' ? 'vida' : 'mana'}` : item.kind === 'loot' ? 'Loot para vender' : [statLine(item.stats), trainLine(item)].filter(Boolean).join(' · ') || 'Sem atributos';
  return {
    key: `${container}:${item.id}`, source: 'simple', name: item.name, rarity: item.rarity, rarityLabel: RARITY_LABEL[item.rarity], kind: item.kind === 'equipment' ? 'equipment' : item.kind === 'supply' ? 'supply' : 'loot',
    slot: item.slot, slotLabel: item.slot ? slotNames[item.slot] : item.kind === 'loot' ? 'Loot' : 'Suprimento', base, attrs: [], value: item.value, quantity,
    reason: character && item.kind === 'equipment' ? equipBlockReason(character, item) : undefined, supply: item.supply,
    candidate: item.kind === 'equipment' ? { kind: 'simple', itemId: item.id } : undefined,
  };
}

export function viewFromGear(instance: ItemInstance, character?: Character): ItemView {
  const def = classItem(instance.baseId), lines = gearLines(instance);
  const mechanic = lines.mechanic ? { text: lines.mechanic, soon: !ITEM_MECHANICS_IMPLEMENTED.has(lines.mechanic) } : undefined;
  return {
    key: `gear:${instance.uid}`, source: 'gear', name: def?.name ?? instance.baseId, rarity: instance.classification, rarityLabel: CLASSIFICATION_NAMES[instance.classification],
    quality: def ? QUALITY_NAMES[def.quality] : undefined, kind: 'equipment', slot: def?.slot,
    slotLabel: def ? SLOT_GROUP_NAMES[def.slotGroup] : '', handsLabel: def?.hands ? `${def.hands} ${def.hands === 1 ? 'mão' : 'mãos'}` : undefined,
    base: [lines.fixed, lines.passive].filter(Boolean).join(' · '), attrs: lines.attrs, mechanic, value: gearValue(instance), quantity: 1, fresh: !!instance.fresh,
    reason: character ? gearEquipReason(character, instance) : undefined, offhandKind: def?.offhandKind, candidate: { kind: 'gear', uid: instance.uid },
  };
}

/** O que o personagem tem equipado num slot, como visão (classe tem prioridade, como no engine). */
export function equippedView(character: Character, slot: Slot, itemOf: (id: string) => ItemDef | undefined): ItemView | undefined {
  const gear = character.gear[slot];
  if (gear) return { ...viewFromGear(gear), equipped: true, fresh: false };
  const item = itemOf(character.equipment[slot] ?? '');
  return item ? { ...viewFromItem(item, 1, 'bp'), equipped: true } : undefined;
}
