import type { ItemDef } from '../core/types';
import { PROFICIENCIES, PROFICIENCY_IDS } from '../rpg/proficiencies';
import { TRAIN_RING_BONUS, trainRingId } from '../rpg/goals';

/** Anéis do Aprendiz: itens de Squire que aceleram o treino de uma proficiência (o jogo não dá itens de classe, eles se conquistam). */
export const TRAIN_ITEMS: ItemDef[] = PROFICIENCY_IDS.map(id => ({
  id: trainRingId(id), name: `Anel do Aprendiz · ${PROFICIENCIES[id].name}`, kind: 'equipment', rarity: 'common', value: 30, slot: 'ring', classIds: ['squire'],
  trainBonus: { [id]: TRAIN_RING_BONUS },
}));
