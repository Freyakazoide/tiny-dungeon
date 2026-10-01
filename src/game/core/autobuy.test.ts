import { describe, expect, it } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import { cloneValidatedState } from '../persistence/validation';

const make = () => { const e = new GameEngine(partyState()); const s0 = e.getSnapshot(); s0.inventory.supply = []; s0.gold = 1000; return { e, s: new Proxy({} as ReturnType<GameEngine['getSnapshot']>, { get: (_t, k) => (e.getSnapshot() as never)[k] }) }; };
const have = (s: ReturnType<GameEngine['getSnapshot']>, id: string) => s.inventory.supply.find(x => x.itemId === id)?.quantity ?? 0;

describe('Helper › compra automática', () => {
  it('desligada não compra; ligada repõe até a meta', () => {
    const { e, s } = make(); e.setAutoBuy({ target: { itemId: 'health_potion', qty: 10 } }); expect(e.runAutoBuy()).toEqual([]); expect(have(s, 'health_potion')).toBe(0);
    e.setAutoBuy({ enabled: true }); const bought = e.runAutoBuy(); expect(bought).toHaveLength(1); expect(have(s, 'health_potion')).toBe(10); expect(s.autoBuy!.bought).toBe(10); expect(s.autoBuy!.spent).toBe(s.autoBuy!.spent); expect(s.gold).toBeLessThan(1000);
  });
  it('respeita a reserva de ouro: para quando o ouro chegaria abaixo dela', () => {
    const { e, s } = make(); const price = 1000 - (e.runAutoBuy(), 0); void price;
    e.setAutoBuy({ enabled: true, target: { itemId: 'health_potion', qty: 100 }, reserve: 900 }); e.runAutoBuy(); expect(s.gold).toBeGreaterThanOrEqual(900); expect(have(s, 'health_potion')).toBeGreaterThan(0); expect(have(s, 'health_potion')).toBeLessThan(100);
    const g = s.gold; e.runAutoBuy(); expect(s.gold).toBe(g);   // já no limite da reserva
  });
  it('só recompra quando o estoque cai abaixo do % configurado; poção bloqueada por nível não é comprada', () => {
    const { e, s } = make(); e.setAutoBuy({ enabled: true, refillAt: 50, target: { itemId: 'health_potion', qty: 20 } }); s.inventory.supply.splice(0, 9e9, { itemId: 'health_potion', quantity: 12 }); e.runAutoBuy(); expect(have(s, 'health_potion')).toBe(12);
    s.inventory.supply.splice(0, 9e9, { itemId: 'health_potion', quantity: 9 }); e.runAutoBuy(); expect(have(s, 'health_potion')).toBe(20);
    e.setAutoBuy({ target: { itemId: 'supreme_health_potion', qty: 5 } }); e.getSnapshot().gold = 1e6; e.runAutoBuy(); expect(have(s, 'supreme_health_potion')).toBe(0);
  });
  it('valida entradas; roda sozinha durante a caçada e sobrevive ao save', () => {
    const { e, s } = make(); expect(e.setAutoBuy({ reserve: NaN })).toBe(false); expect(e.setAutoBuy({ target: { itemId: 'rusty_sword', qty: 5 } })).toBe(false);
    e.setAutoBuy({ enabled: true, target: { itemId: 'mana_potion', qty: 6 } }); e.start(); for (let i = 0; i < 40; i++) e.tick(100); expect(have(s, 'mana_potion')).toBe(6);
    const loaded = cloneValidatedState(JSON.parse(JSON.stringify(e.getSnapshot()))); expect(loaded.autoBuy).toMatchObject({ enabled: true, targets: { mana_potion: 6 } });
    const old = JSON.parse(JSON.stringify(e.getSnapshot())); delete old.autoBuy; expect(cloneValidatedState(old).autoBuy).toMatchObject({ enabled: false, targets: {} });
  });
});
