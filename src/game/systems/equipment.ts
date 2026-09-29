import type { Character, ItemDef } from '../core/types';
import { CLASSES } from '../data/classes';

/** Motivo pelo qual `character` não pode equipar `item`; undefined quando pode. Espelha as regras de GameEngine.equip. */
export function equipBlockReason(character: Character, item: ItemDef): string | undefined {
  if (item.kind !== 'equipment' || !item.slot) return 'Não é um equipamento.';
  if ((item.level ?? 1) > character.profile.level) return `Requer nível ${item.level} (atual ${character.profile.level}).`;
  if (item.classIds && !item.classIds.includes(character.classId)) return `Restrito a ${item.classIds.map(id => CLASSES[id].name).join(', ')}.`;
  return undefined;
}
