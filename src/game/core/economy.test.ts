import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import { simulateHunt, mean } from './balanceHarness';
import { GEAR_ITEMS, GEAR_PIECES, GEAR_SETS, gearId, smithPrice } from '../data/gear';
import { HUNTS } from '../data/hunts';
import { MONSTERS } from '../data/monsters';
import { itemById } from '../data/items';
import { smithStock, shopStock } from '../data/shop';
import { pickSupply } from '../systems/supplies';
import { characterStats } from '../systems/progression';
import type { Character } from './types';

afterEach(() => vi.restoreAllMocks());
const callAutoSupply = (e: GameEngine, c: Character) => { const stats = characterStats(c, e.getSnapshot()); (e as unknown as { autoSupply(c: Character, hp: number, mana: number): void }).autoSupply(c, stats.maxHp, stats.maxMana); };

describe('Bloco 3 — economia: loja e poções', () => {
  it('comprar 10 poções debita o ouro certo e recusa acima da capacidade, sem ouro ou bloqueada', () => {
    const e = new GameEngine(partyState()); const st = () => e.getSnapshot(); st().gold = 1000; // emit clona o estado: sempre reler o snapshot
    const before = st().inventory.supply.find(x => x.itemId === 'health_potion')!.quantity;
    expect(e.buy('health_potion', 10)).toBe(true);
    expect(st().gold).toBe(1000 - 10 * 12); expect(st().inventory.supply.find(x => x.itemId === 'health_potion')!.quantity).toBe(before + 10);
    st().inventory.capacity.supply = 30; expect(e.buy('mana_potion', 50)).toBe(false); expect(st().gold).toBe(880);
    st().gold = 5; expect(e.buy('health_potion', 1)).toBe(false);
    st().gold = 9999; expect(e.buy('great_health_potion', 1)).toBe(false); // nível 8+
    st().characters[0].profile.level = 8; expect(e.buy('great_health_potion', 1)).toBe(true);
    expect(e.buy('strong_health_potion', 1)).toBe(false); st().characters[1].profile.level = 18; expect(e.buy('strong_health_potion', 1)).toBe(true);
    expect(e.buy('health_potion', 0)).toBe(false); expect(e.buy('nao_existe', 1)).toBe(false);
  });
  it('as quatro faixas de poção existem com os valores do plano', () => {
    expect(['strong_health_potion', 'strong_mana_potion', 'supreme_health_potion', 'supreme_mana_potion'].map(id => [itemById(id)!.amount, itemById(id)!.value])).toEqual([[420, 70], [340, 78], [800, 140], [650, 150]]);
  });
  it('autoSupply usa a Poção Forte quando o déficit é maior que 190 e a básica quando é pequeno', () => {
    const e = new GameEngine(partyState()); const s = e.getSnapshot(); const c = s.characters[0]; const max = characterStats(c, s).maxHp;
    s.inventory.supply = [{ itemId: 'health_potion', quantity: 5 }, { itemId: 'great_health_potion', quantity: 5 }, { itemId: 'strong_health_potion', quantity: 5 }];
    c.hp = max - 300; c.helper.hpPotionAt = 100; callAutoSupply(e, c);
    expect(s.inventory.supply.find(x => x.itemId === 'strong_health_potion')!.quantity).toBe(4); expect(s.analyzer.suppliesUsed.strong_health_potion).toBe(1);
    c.hp = max - 60; callAutoSupply(e, c);
    expect(s.inventory.supply.find(x => x.itemId === 'health_potion')!.quantity).toBe(4);
    c.hp = max - 150; callAutoSupply(e, c);
    expect(s.inventory.supply.find(x => x.itemId === 'great_health_potion')!.quantity).toBe(4);
  });
  it('pickSupply usa a mais forte quando nenhuma cobre e nada quando o estoque acabou', () => {
    expect(pickSupply([{ itemId: 'health_potion', quantity: 1 }, { itemId: 'great_health_potion', quantity: 1 }], 'health', 999)!.id).toBe('great_health_potion');
    expect(pickSupply([{ itemId: 'health_potion', quantity: 0 }], 'health', 10)).toBeUndefined();
    expect(pickSupply([{ itemId: 'health_potion', quantity: 2 }], 'mana', 10)).toBeUndefined();
  });
  it('o Ferreiro vende o conjunto da hunt anterior, pelo preço round(45 × ℓ^1,6)', () => {
    expect(smithStock('catacumbas')).toEqual([]); expect(smithStock('floresta_sombria')).toEqual([]);
    expect(smithStock('pantano_toxico')).toEqual(GEAR_PIECES.map(p => gearId('floresta_sombria', p)));
    expect(smithPrice(14)).toBe(Math.round(45 * 14 ** 1.6));
    const e = new GameEngine(partyState()); const s = e.getSnapshot(); s.huntId = 'pantano_toxico'; s.gold = 100000;
    const price = itemById(gearId('floresta_sombria', 'armor'))!.price!;
    expect(e.buy(gearId('floresta_sombria', 'armor'), 1)).toBe(true); expect(s.gold).toBe(100000 - price);
    expect(s.inventory.bp.some(x => x.itemId === gearId('floresta_sombria', 'armor'))).toBe(true);
    expect(e.buy(gearId('pantano_toxico', 'armor'), 1)).toBe(false); // o da hunt atual só cai como drop
    expect(shopStock('pantano_toxico', 1).smith).toHaveLength(5);
  });
  it('a venda de um equipamento vale menos que a compra (sem arbitragem)', () => {
    for (const item of GEAR_ITEMS) expect(item.value).toBeLessThan(item.price!);
  });
});

describe('Bloco 4 — equipamento por faixa', () => {
  it('são 30 itens, com nível = minLevel da hunt e o trains correto', () => {
    expect(GEAR_ITEMS).toHaveLength(30); expect(GEAR_SETS).toHaveLength(6);
    for (const set of GEAR_SETS) {
      const hunt = HUNTS.find(h => h.id === set.huntId)!; const l = set.itemLevel;
      const [melee, ranged, staff, armor, shield] = GEAR_PIECES.map(p => itemById(gearId(set.huntId, p))!);
      for (const item of [melee, ranged, staff, armor, shield]) { expect(item.level).toBe(hunt.minLevel); expect(item.classIds).toBeUndefined(); expect(item.rarity).toBe(set.rarity); }
      expect([melee.slot, melee.trains, ranged.slot, ranged.trains, staff.trains, armor.slot, shield.slot]).toEqual(['weapon', 'melee', 'weapon', 'ranged', 'melee', 'armor', 'offhand']);
      expect(melee.stats).toEqual({ attack: Math.round(3 + 1.5 * l) }); expect(ranged.stats).toEqual({ attack: Math.round(4 + 1.5 * l) });
      expect(staff.stats).toEqual({ attack: Math.round(1 + .5 * l), magicPower: Math.round(2 + 1.2 * l), maxMana: Math.round(10 + 3 * l) });
      expect(armor.stats).toEqual({ defense: Math.round(2 + .7 * l), maxHp: Math.round(6 + 3.5 * l) }); expect(shield.stats).toEqual({ defense: Math.round(2 + .9 * l), resistance: .05 });
    }
    expect(GEAR_SETS.map(s => s.rarity)).toEqual(['uncommon', 'uncommon', 'rare', 'rare', 'epic', 'epic']);
  });
  it('equip recusa peça de nível acima do personagem e aceita qualquer arma para o Squire', () => {
    const e = new GameEngine(partyState()); const s = e.getSnapshot(); const c = s.characters[0];
    s.inventory.bp.push(...GEAR_PIECES.map(p => ({ itemId: gearId('floresta_sombria', p), quantity: 1 })));
    for (const p of GEAR_PIECES) expect(e.equip(c.id, gearId('floresta_sombria', p))).toBe(false);
    c.profile.level = 7;
    for (const p of GEAR_PIECES) expect(e.equip(c.id, gearId('floresta_sombria', p)), p).toBe(true);
  });
  it('drops: comum 1,5%, elite 4% e boss 30% de uma peça do conjunto; troféu do boss em 100%', () => {
    const gearChance = (id: string) => MONSTERS[id].loot.filter(l => l.itemId.startsWith('gear_')).reduce((n, l) => n + l.chance, 0);
    expect(gearChance('wolf')).toBeCloseTo(.015); expect(gearChance('bandit')).toBeCloseTo(.04); expect(gearChance('spider_queen')).toBeCloseTo(.30);
    expect(MONSTERS.spider_queen.loot.find(l => l.itemId === 'coroa_de_teias')).toMatchObject({ chance: 1, min: 1, max: 2 });
    expect(MONSTERS.wolf.loot.filter(l => !l.itemId.startsWith('gear_')).map(l => [l.itemId, l.chance])).toEqual([['pele_de_lobo', .55], ['presa_de_lobo', .30]]);
    expect(MONSTERS.bandit.loot.filter(l => !l.itemId.startsWith('gear_')).map(l => [l.itemId, l.chance])).toEqual([['distintivo_de_bandido', .45], ['adaga_quebrada', .20]]);
  });
  it('valores de venda dos materiais: comum 0,4×, elite 1,2× e troféu 8× o ouro do comum', () => {
    expect([itemById('pele_de_lobo')!.value, itemById('distintivo_de_bandido')!.value, itemById('coroa_de_teias')!.value]).toEqual([Math.round(.4 * 19), Math.round(1.2 * 19), 8 * 19]);
    expect(itemById('cálice_profano'.normalize('NFD').replace(/[̀-ͯ]/g, ''))!.value).toBe(8 * 47);
  });
});

describe('Bloco 4 — o harness com o conjunto da hunt equipado', () => {
  it.each(GEAR_SETS.map(s => s.huntId))('%s continua dentro das faixas com o conjunto equipado', huntId => {
    const m = simulateHunt(huntId, { seed: 5, setup: chars => {
      const set = (piece: (typeof GEAR_PIECES)[number]) => gearId(huntId, piece);
      chars[0].equipment = { weapon: set('melee'), armor: set('armor'), offhand: set('shield') };
      chars[1].equipment = { weapon: set('ranged'), armor: set('armor'), offhand: set('shield') };
      chars[2].equipment = { weapon: set('staff'), armor: set('armor'), offhand: set('shield') };
    } });
    expect(mean(m.normalWaveSeconds)).toBeGreaterThanOrEqual(15); expect(mean(m.normalWaveSeconds)).toBeLessThanOrEqual(35);
    expect(mean(m.bossWaveSeconds)).toBeGreaterThanOrEqual(35); expect(mean(m.bossWaveSeconds)).toBeLessThanOrEqual(90);
    expect(m.defeats).toBe(0); expect(m.minHpFraction).toBeGreaterThanOrEqual(.2);
    expect(m.goldTotal).toBeGreaterThanOrEqual(2 * m.potionCostTotal); // ouro líquido positivo e ≥ 2× o custo de poções
  }, 30000);
});
