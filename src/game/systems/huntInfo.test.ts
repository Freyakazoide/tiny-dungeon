import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { cloneValidatedState } from '../persistence/validation';
import { HUNT_BY_ID, HUNTS } from '../data/hunts';
import { gearId } from '../data/gear';
import { referenceHunt, REF_MIN_ACTIVE_MS } from '../rpg/offline';
import { huntGearStatus, huntMetrics, huntRiskInfo, offlineHuntId, recommendedHunt, tierChances, waveViews } from './huntInfo';

const make = () => { const e = new GameEngine(partyState()); return { e, s: () => e.getSnapshot() }; };
const level = (s: ReturnType<ReturnType<typeof make>['s']>, n: number) => { for (const c of s.characters) c.profile.level = n; };

describe('Fase 12 D — informações das hunts', () => {
  it('huntMetrics: referência até 10 min; medido depois', () => {
    const { s } = make(); const f = HUNT_BY_ID.floresta_sombria;
    s().huntStats.floresta_sombria = { activeMs: 5 * 60_000, xp: 9999, gold: 1, bossKills: 0 };
    expect(huntMetrics(s(), f)).toMatchObject({ measured: false, xpPerHour: f.refXpPerHour });
    s().huntStats.floresta_sombria = { activeMs: 12 * 60_000, xp: 8200, gold: 4000, bossKills: 2 };
    const m = huntMetrics(s(), f); expect(m.measured).toBe(true); expect(m.xpPerHour).toBeCloseTo(8200 / (12 * 60_000 / 3_600_000)); expect(m.bossKills).toBe(2);
    expect(REF_MIN_ACTIVE_MS).toBe(10 * 60_000);
  });

  it('recommendedHunt', () => {
    const { s } = make(); level(s(), 14);
    s().huntStats.floresta_sombria = { activeMs: 3_600_000, xp: 41000, gold: 1, bossKills: 0 };
    s().huntStats.catacumbas = { activeMs: 3_600_000, xp: 31000, gold: 1, bossKills: 0 };
    expect(recommendedHunt(s())).toBe('floresta_sombria');
    const low = make(); level(low.s(), 1); expect(recommendedHunt(low.s())).toBe('catacumbas');
    const fixed = make(); level(fixed.s(), 1);
    for (const h of HUNTS) h.recommendedLevel += 20;
    try { expect(recommendedHunt(fixed.s())).toBe('catacumbas'); } finally { for (const h of HUNTS) h.recommendedLevel -= 20; }
  });

  it('offlineHuntId é a referenceHunt', () => {
    const { s } = make();
    for (const kills of [[], ['catacumbas'], ['floresta_sombria'], ['floresta_sombria', 'pantano_toxico'], ['templo_profano']]) {
      s().huntStats = Object.fromEntries(kills.map(id => [id, { activeMs: 1, xp: 0, gold: 0, bossKills: 1 }]));
      expect(offlineHuntId(s())).toBe(referenceHunt(s().huntStats).id);
    }
  });

  it('tierChances soma 100; Catacumbas sem horda; extrasScale muda a distribuição', () => {
    for (const h of HUNTS) expect(tierChances(h).reduce((n, t) => n + t.pct, 0)).toBeCloseTo(100, 1);
    const cat = tierChances(HUNT_BY_ID.catacumbas); expect(cat).toHaveLength(5); expect(cat.find(t => t.tier === 'horde')!.pct).toBe(0); expect(cat.find(t => t.tier === 'invasion')!.pct).toBe(0);
    const base = tierChances(HUNT_BY_ID.floresta_sombria), scaled = tierChances({ ...HUNT_BY_ID.floresta_sombria, extrasScale: 2 });
    expect(JSON.stringify(scaled)).not.toBe(JSON.stringify(base));
  });

  it('waveViews e risco', () => {
    const w = waveViews(HUNT_BY_ID.floresta_sombria);
    expect(w).toHaveLength(6); expect(w[0].counts).toEqual([{ monsterId: 'wolf', count: 3 }]); expect(w[1].counts).toEqual([{ monsterId: 'wolf', count: 3 }, { monsterId: 'bandit', count: 1 }]);
    expect(w[5].boss).toBe(true); expect(w[5].counts[0]).toEqual({ monsterId: 'spider_queen', count: 1 });
    const { s } = make(); level(s(), 5); const r = huntRiskInfo(s(), HUNT_BY_ID.floresta_sombria); expect(r.label).toBe('Arriscada'); expect(r.gap).toBe(3); expect(r.ratio).toBeGreaterThan(0);
  });

  it('huntGearStatus', () => {
    const { s } = make(); expect(huntGearStatus(s(), 'catacumbas')).toBeNull();
    const id = gearId('floresta_sombria', 'melee'), id2 = gearId('floresta_sombria', 'armor');
    s().characters[0].equipment.weapon = id; s().inventory.bp.push({ itemId: id2, quantity: 1 });
    const g = huntGearStatus(s(), 'floresta_sombria')!; expect(g.pieces.find(p => p.piece === 'melee')!.status).toBe('equipped'); expect(g.pieces.find(p => p.piece === 'armor')!.status).toBe('bag'); expect(g.pieces.find(p => p.piece === 'shield')!.status).toBe('missing');
  });
});

describe('Fase 12 D — hunt programada', () => {
  it('queueHunt só em caçada; aplica quando a wave volta a 0; selectHunt/end limpam; recarregar mantém; a atual cancela', () => {
    const { e, s } = make();
    expect(e.queueHunt('floresta_sombria')).toBe(false); expect(e.selectHunt('catacumbas')).toBe(true);
    e.start(); expect(e.queueHunt('floresta_sombria')).toBe(true); expect(s().pendingHunt).toBe('floresta_sombria');
    const reloaded = cloneValidatedState(JSON.parse(JSON.stringify(s()))); expect(reloaded.pendingHunt).toBe('floresta_sombria');
    const bad = JSON.parse(JSON.stringify(s())); bad.pendingHunt = 'nada'; expect(cloneValidatedState(bad).pendingHunt).toBeUndefined();
    expect(e.queueHunt('catacumbas')).toBe(true); expect(s().pendingHunt).toBeUndefined();
    e.queueHunt('floresta_sombria');
    s().autoAdvance = false; for (let i = 0; i < 6; i++) { expect(s().huntId).toBe('catacumbas'); s().status = 'transition'; s().transitionMs = 0; e.descend(); }
    expect(s().huntId).toBe('floresta_sombria'); expect(s().wave).toBe(0); expect(s().pendingHunt).toBeUndefined();
    e.queueHunt('pantano_toxico'); e.end(); expect(s().pendingHunt).toBeUndefined();
    e.selectHunt('catacumbas'); e.start(); e.queueHunt('pantano_toxico'); e.end(); e.selectHunt('floresta_sombria'); expect(s().pendingHunt).toBeUndefined();
  });

  it('também aplica depois de uma derrota (recovering)', () => {
    const { e, s } = make(); e.start(); e.queueHunt('floresta_sombria');
    s().status = 'recovering'; s().transitionMs = 0; (e as unknown as { finishTransition(): void }).finishTransition();
    expect(s().huntId).toBe('floresta_sombria'); expect(s().status).toBe('running');
  });

  it('selectHunt continua recusando fora de idle', () => {
    const { e, s } = make(); e.start(); expect(e.selectHunt('floresta_sombria')).toBe(false); expect(s().huntId).toBe('catacumbas');
  });
});
