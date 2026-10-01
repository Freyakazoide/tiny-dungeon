import { describe, expect, it } from 'vitest';
import { daysToGate, daysToLevel, mean, simulateHunt } from './balanceHarness';
import { HUNTS } from '../data/hunts';
import { cumulativeTries } from '../rpg/curves';
import { xpForLevel } from '../systems/progression';

/** XP/h alvo por hunt (plano, seção 3.6). */
const XP_PER_HOUR: Record<string, number> = { catacumbas: 24000, floresta_sombria: 28000, pantano_toxico: 35000, minas_esquecidas: 44000, fortaleza_de_gelo: 55000, vulcao_ardente: 69000, templo_profano: 86000 };

describe('Bloco 9 — harness de balanceamento (party de referência, 6 ciclos)', () => {
  it.each(HUNTS.map(h => h.id))('%s cabe nas faixas do plano', huntId => {
    const m = simulateHunt(huntId, { seed: 5 }); // semente fixa: a linha de base deixa de ser intermitente
    expect(m.normalWaveSeconds).toHaveLength(30); expect(m.bossWaveSeconds).toHaveLength(6);
    // Faixa do plano sobre a média das waves (cada wave individual varia alguns segundos com o RNG).
    expect(mean(m.normalWaveSeconds)).toBeGreaterThanOrEqual(15); expect(mean(m.normalWaveSeconds)).toBeLessThanOrEqual(40);
    expect(mean(m.bossWaveSeconds)).toBeGreaterThanOrEqual(35); expect(mean(m.bossWaveSeconds)).toBeLessThanOrEqual(90);
    for (const s of m.normalWaveSeconds) expect(s).toBeLessThanOrEqual(60);   // a 5ª wave (7 monstros) é a mais longa
    for (const s of m.bossWaveSeconds) { expect(s).toBeGreaterThanOrEqual(30); expect(s).toBeLessThanOrEqual(100); }
    expect(m.defeats).toBe(0);
    expect(m.minHpFraction).toBeGreaterThanOrEqual(.2);
    expect(m.potionCostTotal / m.goldTotal).toBeLessThanOrEqual(.45);
    expect(m.xpPerHour).toBeGreaterThanOrEqual(XP_PER_HOUR[huntId] * .85); expect(m.xpPerHour).toBeLessThanOrEqual(XP_PER_HOUR[huntId] * 1.15);
  }, 30000);
  it('o XP/h cresce de hunt em hunt (senão o jogador farmaria a antiga)', () => {
    const rates = HUNTS.map(h => simulateHunt(h.id, { cycles: 3, seed: 5 }).xpPerHour);
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThan(rates[i - 1]);
  }, 30000);
});

describe('Bloco 9 — simulador de ritmo', () => {
  it('a porta do Tier 1 (Melee 25) leva 8 h com 24 h/dia de treino (8 h online + 16 h offline no mesmo foco)', () => {
    expect(daysToGate(cumulativeTries('melee', 10, 25), .5, 8) * 24).toBeCloseTo(8, 0);
  });
  it('sem foco offline o treino cai para a parte online: 8 h de jogo por dia levam ~1 dia', () => {
    expect(daysToGate(cumulativeTries('melee', 10, 25), .5, 8, false)).toBeCloseTo(1, 1);
  });
  it('nível 25 (~55 mil XP/h, 8 h/dia) leva dias, na mesma faixa da skill 35 (3,7 d): se travar o Tier 2, baixe T2_LEVEL para 20', () => {
    let xp = 0; for (let level = 1; level < 25; level++) xp += xpForLevel(level);
    const daysLevel25 = daysToLevel(xp, 55000, 8), gate35 = daysToGate(cumulativeTries('fire', 10, 35), .5, 8);
    expect(daysLevel25).toBeGreaterThan(3); expect(daysLevel25).toBeLessThan(8); expect(gate35).toBeCloseTo(3.7, 0);
  });
});
