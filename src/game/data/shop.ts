import { HUNTS } from './hunts';
import { GEAR_PIECES, GEAR_SETS, gearId } from './gear';
import { itemById } from './items';

/** Poções à venda, com o nível (do personagem de maior nível da party) que libera cada tier. */
export const POTION_STOCK: { itemId: string; unlockLevel: number }[] = [
  { itemId: 'health_potion', unlockLevel: 1 }, { itemId: 'mana_potion', unlockLevel: 1 },
  { itemId: 'great_health_potion', unlockLevel: 8 }, { itemId: 'great_mana_potion', unlockLevel: 8 },
  { itemId: 'strong_health_potion', unlockLevel: 18 }, { itemId: 'strong_mana_potion', unlockLevel: 18 },
  { itemId: 'supreme_health_potion', unlockLevel: 26 }, { itemId: 'supreme_mana_potion', unlockLevel: 26 },
];

/** Quantidades rápidas de compra. */
export const BUY_QUANTITIES = [1, 10, 50] as const;

/** Ferreiro: só o conjunto da hunt anterior à atual (o da atual cai como drop). */
export function smithStock(huntId: string): string[] {
  const index = HUNTS.findIndex(h => h.id === huntId);
  const previous = index > 0 ? HUNTS[index - 1] : undefined;
  return previous && GEAR_SETS.some(s => s.huntId === previous.id) ? GEAR_PIECES.map(piece => gearId(previous.id, piece)) : [];
}

/** Preço de compra: poções custam o `value`; equipamento, o `price` do Ferreiro. */
export const buyPrice = (itemId: string) => { const item = itemById(itemId); return item ? (item.price ?? item.value) : Infinity; };

export interface ShopEntry { itemId: string; price: number; /** nível que libera (poções) */ unlockLevel: number; unlocked: boolean; }
export function shopStock(huntId: string, bestLevel: number) {
  return {
    potions: POTION_STOCK.map(({ itemId, unlockLevel }): ShopEntry => ({ itemId, price: buyPrice(itemId), unlockLevel, unlocked: bestLevel >= unlockLevel })),
    smith: smithStock(huntId).map((itemId): ShopEntry => ({ itemId, price: buyPrice(itemId), unlockLevel: 1, unlocked: true })),
  };
}
