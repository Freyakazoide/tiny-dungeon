import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { FLOOR_RAMP, RUN_CONFIG, WAVE_CONFIG, floorScale, floorTier } from '../data/balance';
import { BOSS_EVERY, CHUNK_LEN, FLOOR_CHUNKS, RunPlan, STAIRS_AT } from './plan';
import { mulberry32 } from './rng';

describe('Andares e escada', () => {
  const realRandom = Math.random, realNow = Date.now;
  beforeEach(() => { RUN_CONFIG.enabled = true; WAVE_CONFIG.enabled = true; Math.random = mulberry32(5); Date.now = () => 1791039000000; });
  afterEach(() => { Math.random = realRandom; Date.now = realNow; });

  it('a dificuldade sobe a cada descida até o teto de 6 e depois para', () => {
    expect(FLOOR_RAMP.maxTier).toBe(6);
    let prev = floorScale(0);
    expect(prev).toEqual({ hp: 1, atk: 1, xp: 1, gold: 1 });
    for (let f = 1; f <= 6; f++) { const s = floorScale(f); expect(s.hp).toBeGreaterThan(prev.hp); expect(s.atk).toBeGreaterThan(prev.atk); expect(s.xp).toBeGreaterThan(prev.xp); prev = s; }
    expect(floorScale(7)).toEqual(floorScale(6)); expect(floorScale(40)).toEqual(floorScale(6)); expect(floorTier(99)).toBe(6);
  });

  it('o andar tem 8 chunks, o chefe é o último e o mapa acaba na escada', () => {
    expect(FLOOR_CHUNKS).toBe(8); expect(BOSS_EVERY).toBe(8);
    const plan = new RunPlan({ seed: 9, huntId: 'catacumbas', capped: true });
    plan.ensure(7);
    for (let i = 1; i < FLOOR_CHUNKS - 1; i++) expect(plan.chunk(i).encounter?.boss).toBe(false);
    expect(plan.chunk(FLOOR_CHUNKS - 1).encounter?.boss).toBe(true);
    expect(plan.isBlocked(plan.pathPoint(STAIRS_AT).x, plan.pathPoint(STAIRS_AT).y)).toBe(false);
    const past = plan.pathPoint(FLOOR_CHUNKS * CHUNK_LEN + 5);
    expect(plan.isBlocked(past.x, past.y)).toBe(true);
  });

  it('a escada só funciona depois do chefe: desce com semente nova e monstros mais fortes', () => {
    const e = new GameEngine(partyState()); e.selectHunt('catacumbas');
    for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 12);
    e.start();
    const seed0 = e.getSnapshot().run!.seed; let floor = 0, bossBefore = 0;
    for (let i = 0; i < 6000 && floor === 0; i++) {
      e.tick(100); const s = e.getSnapshot(), r = s.run!;
      expect(r.anchor).toBeLessThanOrEqual(STAIRS_AT + .001);
      if (r.floor) { floor = r.floor; bossBefore = s.analyzer.bosses; }
    }
    expect(floor).toBe(1); expect(bossBefore).toBeGreaterThanOrEqual(1);
    const r = e.getSnapshot().run!; expect(r.seed).not.toBe(seed0); expect(r.anchor).toBeLessThan(30); expect(r.lastTrigger).toBe(0);
  });
});
