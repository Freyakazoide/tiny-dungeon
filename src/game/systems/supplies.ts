import type { InventoryStack, ItemDef } from '../core/types';
import { itemById } from '../data/items';

/**
 * Poção a usar para um déficit: a mais barata que cobre o déficit inteiro; se nenhuma cobre, a mais forte disponível.
 * Assim déficits pequenos não gastam poção cara e déficits grandes não gastam várias fracas.
 */
export function pickSupply(stacks: InventoryStack[], kind: 'health' | 'mana', deficit: number): ItemDef | undefined {
  const items = stacks.filter(s => s.quantity > 0).map(s => itemById(s.itemId)).filter((item): item is ItemDef => item?.supply === kind);
  if (!items.length) return undefined;
  const covering = items.filter(item => (item.amount ?? 0) >= deficit).sort((a, b) => a.value - b.value)[0];
  return covering ?? items.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];
}
