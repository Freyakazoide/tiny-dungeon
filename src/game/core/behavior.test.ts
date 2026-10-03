import { beforeEach, describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../data/balance';
import { dist } from '../run/world';
import { mulberry32 } from '../run/rng';
import { simulateRun } from './balanceHarness';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { RunPlan } from '../run/plan';

beforeEach(() => { RUN_CONFIG.enabled = true; });
/** Um monstro inofensivo e imortal `id` a `gap` células de um herói da backline(testa só o movimento dele). */
const lone = (id: string, gap: number, seed = 5) => {
  const orig = Math.random; Math.random = mulberry32(seed);
  try {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
    for (const c of s.characters) { c.hp = 99999; c.profile.level = 30; }
    const plan = (e as unknown as { plan(): RunPlan }).plan(), back = s.characters.find(c => c.row === 'back')!, bp = s.run!.pos[back.id], p = plan.spawnPoint(s.run!.anchor + 8, () => .5);
    s.monsters = [{ uid: 't0', defId: id, hp: 1e9, maxHp: 1e9, cooldown: 99, alive: true, x: p.x, y: p.y, atkMul: 0 }]; s.run!.open = true;
    const m = s.monsters[0], d = dist(bp, p) || 1; m.x = bp.x + (p.x - bp.x) / d * gap; m.y = bp.y + (p.y - bp.y) / d * gap;
    return { e, m };
  } finally { Math.random = orig; }
};

describe('inimigos por papel', () => {
  /** Quanto o monstro se afastou de onde começou (os heróis o alcançam e ficam no alcance de ataque, então a distância a eles não mostra o recuo). */
  const retreated = (id: string, gap: number, secs: number) => { const { e, m } = lone(id, gap), x0 = m.x!, y0 = m.y!; for (let i = 0; i < secs * 10; i++) e.tick(100); return Math.hypot(m.x! - x0, m.y! - y0); };
  it('o atirador recua em passos curtos quando alguém chega perto demais', () => { expect(retreated('bandit', 1.4, 4)).toBeGreaterThan(1.5); });
  it('o caster também sai de perto em vez de ficar colado no grupo', () => { expect(retreated('toxic_toad', 1.6, 5)).toBeGreaterThan(1.5); });
  it('o monstro corpo a corpo não recua', () => { expect(retreated('skeleton', 1.4, 4)).toBeLessThan(1.5); });
});

describe('harness de game feel', () => {
  it('simulateRun devolve as métricas de ritmo coerentes (encontros, TTK, IA, overkill)', () => {
    const r = simulateRun('catacumbas', { minutes: 6, seed: 3 }), f = r.feel;
    expect(r.kills).toBeGreaterThan(40); expect(r.defeats).toBeLessThanOrEqual(1);
    expect(f.combatShare).toBeGreaterThan(.2); expect(f.combatShare).toBeLessThanOrEqual(1.001);
    expect(f.commonS).toBeGreaterThan(3); expect(f.commonS).toBeLessThan(40);
    expect(f.ttkCommonS).toBeGreaterThan(1); expect(f.ttkCommonS).toBeLessThan(30);
    expect(f.firstAttackS).toBeLessThan(3);          // os heróis começam a bater logo depois que os inimigos nascem
    expect(f.overkillShare).toBeLessThan(.2);        // o dano não é desperdiçado em alvos já cobertos
    expect(f.switchesPerMin).toBeLessThan(120);      // o lock evita trocar de alvo a cada instante
    expect(f.shotLossShare).toBeLessThan(.3);
  }, 120000);
});
