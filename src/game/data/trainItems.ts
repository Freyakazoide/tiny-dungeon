import type { ItemDef, Slot } from '../core/types';
import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../rpg/proficiencies';
import { TRAIN_RING_BONUS, trainRingId } from '../rpg/goals';

/**
 * Equipamento de treino do Aprendiz: 5 peças por proficiência (anel, amuleto, elmo, armadura e botas) que aceleram só aquela habilidade.
 * O Squire não ganha item de classe (ele se conquista); estas peças são o caminho direcionado para chegar à porta da classe-alvo.
 * Com as 5 peças: +TRAIN_SET_BONUS % de tries na proficiência.
 */
export const TRAIN_PIECES: { slot: Slot; label: string; bonus: number; price: number; stats: ItemDef['stats'] }[] = [
  { slot: 'ring', label: 'Anel', bonus: TRAIN_RING_BONUS, price: 90, stats: undefined },
  { slot: 'amulet', label: 'Amuleto', bonus: 10, price: 180, stats: { maxMana: 10 } },
  { slot: 'helmet', label: 'Capuz', bonus: 8, price: 140, stats: { defense: 2 } },
  { slot: 'armor', label: 'Gibão', bonus: 8, price: 220, stats: { maxHp: 25, defense: 3 } },
  { slot: 'boots', label: 'Botas', bonus: 6, price: 120, stats: { attackSpeed: .02 } },
];
export const TRAIN_SET_BONUS = TRAIN_PIECES.reduce((n, p) => n + p.bonus, 0);
export const trainPieceId = (prof: ProficiencyId, slot: Slot) => slot === 'ring' ? trainRingId(prof) : `apprentice_${slot}_${prof}`;

export const TRAIN_ITEMS: ItemDef[] = PROFICIENCY_IDS.flatMap(id => TRAIN_PIECES.map(piece => ({
  id: trainPieceId(id, piece.slot), name: `${piece.label} do Aprendiz · ${PROFICIENCIES[id].name}`, kind: 'equipment' as const, rarity: piece.slot === 'ring' ? 'common' as const : 'uncommon' as const,
  value: Math.round(piece.price / 3), price: piece.price, slot: piece.slot, classIds: ['squire' as const], trainBonus: { [id]: piece.bonus }, ...(piece.stats ? { stats: piece.stats } : {}),
})));
