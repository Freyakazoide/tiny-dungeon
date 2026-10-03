import { describe, expect, it } from 'vitest';
import { COMMON_DEPTH_HP_CAP, KIND_HP, RUN_CONFIG, RUN_FLOW, WAVE_CONFIG } from '../data/balance';
import { depthScale } from './plan';
import { aliveHpEquivalent, isMopUp, onlyMopUp, shouldSpawnBatch } from './pressure';

const foe = (frac: number, extra: object = {}) => ({ hp: frac * 100, maxHp: 100, ...extra });
const spawn = (foes: { hp: number; maxHp: number }[], waited: number, room = 8, first = false) => shouldSpawnBatch({ alive: foes.length, hpEq: aliveHpEquivalent(foes), waited, first, room });

describe('fluxo: pressão pelo HP restante, não pela contagem', () => {
  it('quatro inimigos com 5% de vida valem 0,2 monstro', () => {
    expect(aliveHpEquivalent([foe(.05), foe(.05), foe(.05), foe(.05)])).toBeCloseTo(.2, 5);
    expect(aliveHpEquivalent([foe(1), foe(.5)])).toBeCloseTo(1.5, 5);
  });
  it('a próxima leva vem mais cedo quando o HP restante é irrelevante (mesmo com muitos vivos)', () => {
    const weak = Array.from({ length: 7 }, () => foe(.05)), healthy = Array.from({ length: 7 }, () => foe(1));
    expect(spawn(weak, RUN_FLOW.earlyAfter)).toBe(true);
    expect(spawn(healthy, RUN_FLOW.earlyAfter)).toBe(false);
    expect(spawn(healthy, WAVE_CONFIG.intervalS * 2)).toBe(true);   // o tempo sempre acaba vencendo
  });
  it('respeita o limite de entidades e a primeira leva entra sem esperar', () => {
    expect(spawn([foe(.01)], 99, 0)).toBe(false);
    expect(spawn([], 0, 8, true)).toBe(true);
  });
  it('o intervalo base caiu para ~2 s', () => { expect(WAVE_CONFIG.intervalS).toBeLessThanOrEqual(2); });
  it('mop-up: quase mortos, sem chefe nem golpe avisado, deixam o grupo seguir', () => {
    expect(isMopUp(foe(.1))).toBe(true); expect(isMopUp(foe(.5))).toBe(false); expect(isMopUp(foe(.05, { boss: true }))).toBe(false); expect(isMopUp(foe(.05, { winding: true }))).toBe(false);
    expect(onlyMopUp([foe(.1), foe(.05)], 0)).toBe(true); expect(onlyMopUp([foe(.1), foe(.05)], 1)).toBe(false); expect(onlyMopUp([foe(.1), foe(.9)], 0)).toBe(false);
  });
});

describe('números estruturais', () => {
  it('HP por tipo: comum ~72%, elite ~80%, chefe ~90%', () => { expect(KIND_HP).toEqual({ common: .72, elite: .8, boss: .9 }); });
  it('o comum não vira esponja com a profundidade (teto), elite e chefe seguem a escala linear', () => {
    expect(depthScale(1000, 'common').hp).toBeLessThanOrEqual(1 + COMMON_DEPTH_HP_CAP + 1e-9);
    expect(depthScale(10, 'common').hp).toBeLessThan(depthScale(10, 'elite').hp);
    expect(depthScale(60, 'elite').hp).toBeGreaterThan(depthScale(60, 'common').hp);
    expect(depthScale(0, 'common').hp).toBe(1);
  });
  it('XP e ouro por kill têm multiplicadores separados; o XP por kill fica ~75% e o ouro não é cortado junto', () => {
    expect(RUN_CONFIG.xpReward).toBeGreaterThan(.7); expect(RUN_CONFIG.xpReward).toBeLessThan(.85);
    expect(RUN_CONFIG.goldReward).toBeGreaterThan(RUN_CONFIG.xpReward);
  });
});
