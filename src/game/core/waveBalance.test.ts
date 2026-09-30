import { describe, expect, it } from 'vitest';
import { GameEngine } from './GameEngine';
import { mean, simulateHunt } from './balanceHarness';
import { partyState } from './testing';
import { HUNTS, HUNT_BY_ID, huntScale } from '../data/hunts';
import { MONSTERS } from '../data/monsters';
import { runtime } from '../rpg/runtime';
import { monsterHit } from '../systems/combat';
import { characterStats } from '../systems/progression';
import { autoSpend } from './talentBuild';
import { investedPoints, talentPointsAvailable } from '../systems/talentGrid';

/** Faixas de aceite B3: harness com talentos, conjunto da hunt e reforços, semente fixa. */
const SEED = 7;
const later = HUNTS.filter(h => h.id !== 'catacumbas');

describe('Waves B — dificuldade por hunt (harness com talentos, itens e reforços)', () => {
  it.each(later.map(h => h.id))('%s cumpre as faixas B3 (40 ciclos)', huntId => {
    const hunt = HUNT_BY_ID[huntId];
    const m = simulateHunt(huntId, { cycles: 40, reference: true, talents: true, extras: true, seed: SEED, scale: 'hunt' });
    expect(m.waveSeconds).toHaveLength(120);
    expect(mean(m.waveSeconds)).toBeGreaterThanOrEqual(20); expect(mean(m.waveSeconds)).toBeLessThanOrEqual(45);
    expect(m.p95).toBeLessThanOrEqual(60); expect(m.maxWaveSeconds).toBeLessThanOrEqual(90);
    expect(m.defeats).toBe(0);
    const potion = m.potionCostTotal / m.goldTotal;
    expect(potion).toBeGreaterThanOrEqual(.10); expect(potion).toBeLessThanOrEqual(.28);
    expect(m.xpPerHour).toBeLessThanOrEqual(hunt.refXpPerHour * 1.25);
    if (m.bigWaves) expect(m.potionPerBigWave).toBeLessThanOrEqual(5);
  }, 120000);

  it('monsterScale por hunt multiplica o HP e o ataque dos monstros da hunt; hunts sem o campo usam 1', () => {
    for (const hunt of HUNTS) expect(huntScale(hunt.id)).toEqual(hunt.monsterScale);
    expect(huntScale('nao_existe')).toEqual({ hp: 1, atk: 1 });
    const hpOf = (huntId: string) => { const state = partyState(); state.huntId = huntId; const e = new GameEngine(state); e.start(); const m = e.getSnapshot().monsters[0]; return { hp: m.maxHp, base: MONSTERS[m.defId].hp }; };
    for (const hunt of HUNTS) { const { hp, base } = hpOf(hunt.id); expect(hp).toBe(Math.round(base * hunt.monsterScale!.hp)); }
    const saved = HUNT_BY_ID.floresta_sombria.monsterScale; delete HUNT_BY_ID.floresta_sombria.monsterScale;
    try { const { hp, base } = hpOf('floresta_sombria'); expect(hp).toBe(base); } finally { HUNT_BY_ID.floresta_sombria.monsterScale = saved; }
    // ataque: o dano de um monstro de mesma definição cresce com a escala da hunt
    const state = partyState(); const target = state.characters[0]; const m = { uid: 't', defId: 'skeleton', hp: 1, maxHp: 1, cooldown: 0, alive: true };
    const hit = (huntId: string) => { state.huntId = huntId; target.hp = 1e9; const before = target.hp; monsterHit(m, target, state); return before - target.hp; };
    const low = hit('catacumbas'), high = hit('templo_profano'); expect(high).toBeGreaterThan(low);
  });

  it('dev.monsterScale continua multiplicando por cima da escala da hunt', () => {
    runtime.monsterHp = 2;
    try { const state = partyState(); state.huntId = 'floresta_sombria'; const e = new GameEngine(state); e.start(); const m = e.getSnapshot().monsters[0]; expect(m.maxHp).toBe(Math.round(MONSTERS[m.defId].hp * 2 * huntScale("floresta_sombria").hp)); } finally { runtime.monsterHp = 1; }
  });

  it('regressão: sem talentos, reforços nem escala, o harness devolve a linha de base antiga (mesmo resultado com a mesma semente)', () => {
    const a = simulateHunt('floresta_sombria', { cycles: 3, seed: 3 }), b = simulateHunt('floresta_sombria', { cycles: 3, seed: 3 });
    expect(a.normalWaveSeconds).toEqual(b.normalWaveSeconds); expect(a.waveExtras.every(x => x === 0)).toBe(true);
  });

  it('autoSpend gasta o saldo de pointsAt(nível) espalhado pela grade e não passa de nenhum limite', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 21; e.evolve(c.id, 'guerreiro', { force: true });
    const bought = autoSpend(c); expect(bought).toBeGreaterThan(20);
    expect(talentPointsAvailable(c)).toBeGreaterThanOrEqual(0); expect(talentPointsAvailable(c)).toBeLessThan(3); // gastou quase tudo (sobra só o que nenhuma compra cobre)
    expect(investedPoints(c, 'guerreiro')).toBeGreaterThan(0);
    const ranks = Object.entries(c.talentRanks).filter(([id]) => !id.endsWith('.root')).map(([, r]) => r);
    expect(Math.max(...ranks)).toBeLessThanOrEqual(3); // espalhado: nenhum nó recebe a maioria dos pontos
    expect(characterStats(c, e.getSnapshot()).maxHp).toBeGreaterThan(0);
  });
});

describe('Waves C — começo do jogo (Catacumbas)', () => {
  it('kit inicial (nível 1, sem talentos) com reforços: poção/ouro entre 15% e 28%, sem derrotas e nenhuma wave acima de +4', () => {
    const m = simulateHunt('catacumbas', { cycles: 40, extras: true, seed: SEED, scale: 'hunt' });
    expect(m.defeats).toBe(0); expect(Math.max(...m.waveExtras)).toBeLessThanOrEqual(4);
    const potion = m.potionCostTotal / m.goldTotal;
    expect(potion).toBeGreaterThanOrEqual(.15); expect(potion).toBeLessThanOrEqual(.28);
  }, 120000);

  it('as Catacumbas têm escala gentil (0,9 / 0,7) e tabela de reforços própria sem hordas', () => {
    expect(HUNT_BY_ID.catacumbas.monsterScale).toEqual({ hp: 0.9, atk: 0.7 });
    expect(Math.max(...HUNT_BY_ID.catacumbas.extrasTable!.map(r => r.extra))).toBe(4);
    expect(HUNT_BY_ID.floresta_sombria.extrasTable).toBeUndefined();
  });
});
