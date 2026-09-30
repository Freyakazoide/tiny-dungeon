import type { Character, GameState, ItemDef, Slot, Stats } from '../core/types';
import { CLASSES, kitsOfPath } from '../data/classes';
import { classItem } from '../data/classItems';
import { itemById } from '../data/items';
import { gearBase, gearEquipReason, quiverWith2H } from './gear';
import { characterStats } from './progression';

/** Motivo pelo qual `character` não pode equipar `item`; undefined quando pode. Espelha as regras de GameEngine.equip. */
export function equipBlockReason(character: Character, item: ItemDef): string | undefined {
  if (item.kind !== 'equipment' || !item.slot) return 'Não é um equipamento.';
  if ((item.level ?? 1) > character.profile.level) return `Requer nível ${item.level} (atual ${character.profile.level}).`;
  const kits = kitsOfPath(character.profile.classPath);
  if (item.classIds && !item.classIds.some(id => kits.includes(id))) return `Restrito a ${item.classIds.map(id => CLASSES[id].name).join(', ')}.`;
  return undefined;
}

export type EquipCandidate = { kind: 'simple'; itemId: string } | { kind: 'gear'; uid: string };
export interface EquipDelta { key: keyof Stats; before: number; after: number; diff: number }
export interface EquipComparison {
  ok: boolean; reason?: string;
  slot: Slot; replaces?: string;
  removesOffhand?: boolean;
  deltas: EquipDelta[];
}
const STAT_KEYS: (keyof Stats)[] = ['maxHp', 'maxMana', 'attack', 'defense', 'attackSpeed', 'crit', 'resistance', 'magicPower'];

/**
 * Compara o personagem antes e depois de equipar a candidata, com a mesma regra de troca de `equip`/`equipGear`
 * (mesmo slot; arma de 2 mãos tira a secundária, exceto Aljava do Caçador). Pura: só clona `equipment` e `gear`.
 * Candidata bloqueada devolve `ok = false` com o motivo, mas ainda traz os deltas que teria.
 */
export function compareEquip(state: GameState, character: Character, candidate: EquipCandidate): EquipComparison {
  const clone: Character = { ...character, equipment: { ...character.equipment }, gear: { ...character.gear } };
  let slot: Slot = 'weapon', reason: string | undefined, removesOffhand = false;
  if (candidate.kind === 'simple') {
    const item = itemById(candidate.itemId);
    if (!item?.slot) return { ok: false, reason: 'Item desconhecido.', slot, deltas: [] };
    slot = item.slot; reason = equipBlockReason(character, item);
    if (!reason && slot === 'offhand' && gearBase(character, 'weapon')?.hands === 2) reason = 'Arma de 2 mãos bloqueia a mão secundária.';
    delete clone.gear[slot]; clone.equipment[slot] = item.id;
  } else {
    const instance = state.gearBag.find(g => g.uid === candidate.uid), base = instance && classItem(instance.baseId);
    if (!instance || !base) return { ok: false, reason: 'Item desconhecido.', slot, deltas: [] };
    slot = base.slot; reason = gearEquipReason(character, instance);
    delete clone.equipment[slot]; clone.gear[slot] = instance;
    if (slot === 'weapon' && base.hands === 2 && (clone.gear.offhand || clone.equipment.offhand)) {
      const off = gearBase(clone, 'offhand');
      if (!(off && quiverWith2H(base, off))) { delete clone.gear.offhand; delete clone.equipment.offhand; removesOffhand = true; }
    }
  }
  const replacedGear = character.gear[slot], replacedItem = character.equipment[slot];
  const replaces = replacedGear ? classItem(replacedGear.baseId)?.name : replacedItem ? itemById(replacedItem)?.name : undefined;
  const before = characterStats(character, state), after = characterStats(clone, state);
  const deltas = STAT_KEYS.map(key => ({ key, before: before[key], after: after[key], diff: after[key] - before[key] }))
    .filter(d => Math.abs(d.diff) > 1e-9)
    .sort((a, b) => Math.abs(b.diff) / (Math.abs(b.before) || 1) - Math.abs(a.diff) / (Math.abs(a.before) || 1));
  return { ok: !reason, reason, slot, replaces, removesOffhand, deltas };
}
