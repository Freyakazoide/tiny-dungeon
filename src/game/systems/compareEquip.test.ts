import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { CLASS_ITEMS, CLASSIFICATIONS } from '../data/classItems';
import { compareEquip, equipBlockReason, type EquipCandidate } from './equipment';
import { gearEquipReason } from './gear';
import { characterStats } from './progression';
import { addItem } from './loot';
import { itemById } from '../data/items';

const setup = () => {
  const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 30;
  e.evolve(c.id, 'guerreiro', { force: true });
  return { e, c: e.getSnapshot().characters[0] };
};
const gw = CLASS_ITEMS.filter(i => i.classes.includes('guerreiro'));
const two = gw.find(i => i.slot === 'weapon' && i.hands === 2)!, one = gw.filter(i => i.slot === 'weapon' && i.hands !== 2), shield = gw.find(i => i.slot === 'offhand' && i.offhandKind === 'shield')!;
const armor = gw.filter(i => i.slot === 'armor');

describe('compareEquip', () => {
  it('é puro: o estado não muda', () => {
    const { e, c } = setup(); const uid = e.grantGear(one[0].id, 'rare')!.uid; const before = JSON.stringify(e.getSnapshot());
    compareEquip(e.getSnapshot(), c, { kind: 'gear', uid }); compareEquip(e.getSnapshot(), c, { kind: 'simple', itemId: 'iron_sword' });
    expect(JSON.stringify(e.getSnapshot())).toBe(before);
  });

  it('consistência: os deltas batem com a diferença real depois da ação do engine (20 combinações)', () => {
    let checked = 0;
    const cases: ((e: GameEngine) => { candidate: EquipCandidate; run: () => boolean })[] = [];
    for (const w of one.slice(0, 4)) for (const cls of ['common', 'legendary'] as const) cases.push(e => { const uid = e.grantGear(w.id, cls)!.uid; return { candidate: { kind: 'gear', uid }, run: () => e.equipGear(e.getSnapshot().characters[0].id, uid) }; });
    for (const a of armor.slice(0, 3)) cases.push(e => { const uid = e.grantGear(a.id, 'rare')!.uid; return { candidate: { kind: 'gear', uid }, run: () => e.equipGear(e.getSnapshot().characters[0].id, uid) }; });
    cases.push(e => { const uid = e.grantGear(two.id, 'rare')!.uid; return { candidate: { kind: 'gear', uid }, run: () => e.equipGear(e.getSnapshot().characters[0].id, uid) }; });
    cases.push(e => { const uid = e.grantGear(shield.id, 'rare')!.uid; return { candidate: { kind: 'gear', uid }, run: () => e.equipGear(e.getSnapshot().characters[0].id, uid) }; });
    cases.push(e => ({ candidate: { kind: 'simple', itemId: 'iron_sword' }, run: () => { addItem(e.getSnapshot(), 'iron_sword', 1); return e.equip(e.getSnapshot().characters[0].id, 'iron_sword'); } }));
    for (const variant of [0, 1]) for (const make of cases) {
      const { e } = setup(); const id = e.getSnapshot().characters[0].id;
      if (variant) { const s = e.grantGear(shield.id, 'common')!.uid; e.equipGear(id, s); }
      const { candidate, run } = make(e);
      const snap = e.getSnapshot(), c = snap.characters[0], cmp = compareEquip(snap, c, candidate), before = characterStats(c, snap);
      if (!cmp.ok) continue;
      expect(run()).toBe(true);
      const s2 = e.getSnapshot(), after = characterStats(s2.characters[0], s2);
      for (const d of cmp.deltas) expect(after[d.key] - before[d.key], `${d.key}`).toBeCloseTo(d.diff, 6);
      for (const key of Object.keys(before) as (keyof typeof before)[]) if (!cmp.deltas.some(d => d.key === key)) expect(after[key]).toBeCloseTo(before[key], 6);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(14);
  });

  it('arma de 2 mãos com escudo: removesOffhand e defesa cai', () => {
    const { e } = setup(); const id = e.getSnapshot().characters[0].id;
    e.equipGear(id, e.grantGear(shield.id, 'rare')!.uid);
    const uid = e.grantGear(two.id, 'rare')!.uid, snap = e.getSnapshot(), cmp = compareEquip(snap, snap.characters[0], { kind: 'gear', uid });
    expect(cmp.removesOffhand).toBe(true); expect(cmp.deltas.find(d => d.key === 'defense')!.diff).toBeLessThan(0);
  });

  it('peça bloqueada: ok=false, motivo igual ao das regras, deltas presentes', () => {
    const { e } = setup(); const sq = new GameEngine(partyState()); const sc = sq.getSnapshot().characters[0];
    const uid = sq.grantGear(one[0].id, 'common')!.uid, snap = sq.getSnapshot(), cmp = compareEquip(snap, sc, { kind: 'gear', uid });
    expect(cmp.ok).toBe(false); expect(cmp.reason).toBe(gearEquipReason(sc, snap.gearBag[0]));
    const item = itemById('iron_knuckles')!; const cs = compareEquip(snap, sc, { kind: 'simple', itemId: item.id });
    expect(cs.ok).toBe(false); expect(cs.reason).toBe(equipBlockReason(sc, item)); expect(cs.deltas.length).toBeGreaterThan(0);
    void e;
  });

  it('mesma peça: sem deltas', () => {
    const { e } = setup(); const id = e.getSnapshot().characters[0].id;
    const uid = e.grantGear(one[0].id, 'rare')!.uid; e.equipGear(id, uid);
    const snap = e.getSnapshot(), c = snap.characters[0], inst = c.gear.weapon!;
    snap.gearBag.push({ ...inst, uid: 'x' });
    expect(compareEquip(snap, c, { kind: 'gear', uid: 'x' }).deltas).toEqual([]);
    snap.gearBag.pop(); void CLASSIFICATIONS;
  });
});

describe('trava do lote', () => {
  it("sellGearUpTo('legendary'/'mythic') nunca vende Lendárias nem Míticas", () => {
    const { e } = setup();
    for (const cls of CLASSIFICATIONS) e.grantGear(one[0].id, cls);
    e.sellGearUpTo('mythic'); e.sellGearUpTo('legendary');
    expect(e.getSnapshot().gearBag.map(g => g.classification).sort()).toEqual(['legendary', 'mythic']);
  });
});
