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

import { addItem, slotsUsed } from '../systems/loot';
import { gearSlots, groupGear } from '../systems/gear';
import { createInstance } from '../systems/gear';

describe('itens iguais empilham (1 espaço)', () => {
  it('20 espadas iguais ocupam 1 espaço; raridades diferentes ficam em pilhas separadas', () => {
    const e = new GameEngine(partyState()); const s = e.getSnapshot(); s.inventory.bp = [];
    expect(addItem(s, 'rusty_sword', 20)).toBe(20); expect(slotsUsed(s.inventory.bp)).toBe(1); expect(addItem(s, 'iron_sword', 5)).toBe(5); expect(slotsUsed(s.inventory.bp)).toBe(2);
    s.inventory.capacity.bp = 2; expect(addItem(s, 'rusty_sword', 10)).toBe(10);   // cabe na pilha existente
    expect(addItem(s, 'oak_bow', 1)).toBe(0);                                      // sem espaço novo
    expect(addItem(s, 'rusty_sword', 100)).toBe(99 - 30 + 0 > 0 ? 69 : 0);        // enche o resto da pilha de 99... e mais uma pilha não cabe
  });
  it('equipamento de classe: mesmo item e raridade = 1 espaço; comum e incomum separam', () => {
    const bag = [createInstance('guerreiro.espada_longa', 'common')!, createInstance('guerreiro.espada_longa', 'common')!, createInstance('guerreiro.espada_longa', 'uncommon')!, createInstance('guerreiro.espada_longa', 'uncommon')!, createInstance('guerreiro.espada_longa', 'uncommon')!];
    expect(groupGear(bag).map(g => g.items.length).sort()).toEqual([2, 3]); expect(gearSlots(bag)).toBe(2);
  });
});
