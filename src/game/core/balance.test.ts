import { describe, expect, it } from 'vitest';
import { daysToGate, daysToLevel, mean, simulateHunt } from './balanceHarness';
import { HUNTS } from '../data/hunts';
import { cumulativeTries } from '../rpg/curves';
import { xpForLevel } from '../systems/progression';

/** XP/h alvo por hunt (plano, seção 3.6). */
const XP_PER_HOUR: Record<string, number> = { catacumbas: 24000, floresta_sombria: 28000, pantano_toxico: 35000, minas_esquecidas: 44000, fortaleza_de_gelo: 55000, vulcao_ardente: 69000, templo_profano: 86000 };

describe('Bloco 9 — harness de balanceamento (party de referência, 6 ciclos)', () => {
  it.each(HUNTS.map(h => h.id))('%s cabe nas faixas do plano', huntId => {
    const m = simulateHunt(huntId);
    expect(m.normalWaveSeconds).toHaveLength(12); expect(m.bossWaveSeconds).toHaveLength(6);
    // Faixa do plano sobre a média das waves (cada wave individual varia alguns segundos com o RNG).
    expect(mean(m.normalWaveSeconds)).toBeGreaterThanOrEqual(15); expect(mean(m.normalWaveSeconds)).toBeLessThanOrEqual(35);
    expect(mean(m.bossWaveSeconds)).toBeGreaterThanOrEqual(35); expect(mean(m.bossWaveSeconds)).toBeLessThanOrEqual(90);
    for (const s of m.normalWaveSeconds) expect(s).toBeLessThanOrEqual(40);
    for (const s of m.bossWaveSeconds) { expect(s).toBeGreaterThanOrEqual(30); expect(s).toBeLessThanOrEqual(100); }
    expect(m.defeats).toBe(0);
    expect(m.minHpFraction).toBeGreaterThanOrEqual(.2);
    expect(m.potionCostTotal / m.goldTotal).toBeLessThanOrEqual(.45);
    expect(m.xpPerHour).toBeGreaterThanOrEqual(XP_PER_HOUR[huntId] * .85); expect(m.xpPerHour).toBeLessThanOrEqual(XP_PER_HOUR[huntId] * 1.15);
  }, 30000);
  it('o XP/h cresce de hunt em hunt (senão o jogador farmaria a antiga)', () => {
    const rates = HUNTS.map(h => simulateHunt(h.id, { cycles: 3 }).xpPerHour);
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThan(rates[i - 1]);
  }, 30000);
});

describe('Bloco 9 — simulador de ritmo', () => {
  it('a porta do Tier 1 (Melee 25) leva ~5,5 dias com 24 h/dia de treino', () => {
    expect(daysToGate(cumulativeTries('melee', 10, 25), .5, 8)).toBeCloseTo(5.5, 0); // 8 h online + 16 h offline no mesmo foco
  });
  it('sem foco offline o treino cai para a parte online', () => {
    expect(daysToGate(cumulativeTries('melee', 10, 25), .5, 8, false)).toBeCloseTo(16.5, 0);
  });
  it('o nível 25 chega bem antes das portas de skill do Tier 2 (nível não é o gargalo)', () => {
    let xp = 0; for (let level = 1; level < 25; level++) xp += xpForLevel(level);
    const daysLevel25 = daysToLevel(xp, 55000, 8);
    expect(daysLevel25).toBeLessThan(daysToGate(cumulativeTries('fire', 10, 35), .5, 8));
  });
});
