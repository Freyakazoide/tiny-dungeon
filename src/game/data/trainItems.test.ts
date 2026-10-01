import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { itemById } from './items';
import { shopStock } from './shop';
import { TRAIN_ITEMS, TRAIN_PIECES, TRAIN_SET_BONUS, trainPieceId } from './trainItems';
import { PROFICIENCY_IDS } from '../rpg/proficiencies';
import { triesBonusPct } from '../systems/progression';
import { equipBlockReason } from '../systems/equipment';

describe('equipamento de treino do Aprendiz', () => {
  it('5 peças por proficiência (65 itens), cada uma acelerando só a sua habilidade; o conjunto completo dá +47%', () => {
    expect(TRAIN_ITEMS).toHaveLength(5 * PROFICIENCY_IDS.length); expect(TRAIN_SET_BONUS).toBe(47);
    for (const prof of PROFICIENCY_IDS) for (const piece of TRAIN_PIECES) { const item = itemById(trainPieceId(prof, piece.slot))!; expect(item.slot).toBe(piece.slot); expect(Object.keys(item.trainBonus!)).toEqual([prof]); }
    expect(new Set(TRAIN_ITEMS.map(i => i.name)).size).toBe(TRAIN_ITEMS.length);
  });
  it('está sempre à venda; comprar e equipar as 5 peças soma os bônus; só o Squire/qualquer caminho com kit squire equipa', () => {
    const e = new GameEngine(partyState()); const s = e.getSnapshot(); s.gold = 5000; const c = s.characters[0];
    expect(shopStock(s.huntId, 0).training).toHaveLength(65);
    c.equipment = {};
    for (const piece of TRAIN_PIECES) { const id = trainPieceId('magic', piece.slot); expect(e.buy(id, 1), id).toBe(true); expect(e.equip(c.id, id), id).toBe(true); }
    expect(triesBonusPct(c, 'magic')).toBe(47); expect(triesBonusPct(c, 'melee')).toBe(0);
    expect(equipBlockReason(c, itemById(trainPieceId('fire', 'boots'))!)).toBeUndefined();
  });
});
