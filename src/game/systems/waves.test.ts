import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { mulberry32 } from '../core/balanceHarness';
import { partyState } from '../core/testing';
import { cloneValidatedState } from '../persistence/validation';
import { BOSS_EXTRAS, EARLY_EXTRAS, WAVE_CONFIG, WAVE_EXTRAS } from '../data/balance';
import { HUNTS, HUNT_BY_ID } from '../data/hunts';
import { runtime } from '../rpg/runtime';
import { MONSTERS } from '../data/monsters';
import { batchToSpawn, composeExtras, drawFromBag, extraMonsters, limitExtra, meanExtra, newBag, reinforcementIds, rollExtra, splitBatches, tierOfExtra, waveRewards, wavePositions } from './waves';

afterEach(() => { WAVE_CONFIG.enabled = false; });

describe('Waves A — reforços aleatórios', () => {
  it('rollExtra: 100.000 sorteios reproduzem a tabela (±0,5 ponto) e a média de 1,72 reforços', () => {
    const rng = mulberry32(2024), counts = new Map<number, number>(); let sum = 0; const n = 100_000;
    for (let i = 0; i < n; i++) { const extra = rollExtra(WAVE_EXTRAS, rng); counts.set(extra, (counts.get(extra) ?? 0) + 1); sum += extra; }
    for (const row of WAVE_EXTRAS) expect(Math.abs((counts.get(row.extra) ?? 0) / n * 100 - row.pct), `+${row.extra}`).toBeLessThan(.5);
    expect(Math.abs(sum / n - 1.72)).toBeLessThan(.05); expect(meanExtra(WAVE_EXTRAS)).toBeCloseTo(1.72, 6);
    expect(WAVE_EXTRAS.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100); expect(BOSS_EXTRAS.reduce((s, r) => s + r.pct, 0)).toBe(100); expect(EARLY_EXTRAS.reduce((s, r) => s + r.pct, 0)).toBe(100);
  });

  it('wave de chefe: reforços só de comuns/elites, no máximo +3, e nunca um chefe extra', () => {
    const rng = mulberry32(5);
    for (const hunt of HUNTS) {
      const { common, elite } = reinforcementIds(hunt.id);
      expect(MONSTERS[common].boss).toBeFalsy(); expect(MONSTERS[elite].boss).toBeFalsy();
      for (let i = 0; i < 300; i++) { const extras = extraMonsters(hunt.id, true, rng); expect(extras.length).toBeLessThanOrEqual(3); for (const id of extras) expect([common, elite]).toContain(id); }
    }
  });

  it('extraMonsters devolve só ids existentes, com ~15% de elites (±3 pontos) e nunca chefe', () => {
    const rng = mulberry32(9);
    for (const hunt of HUNTS.slice(1)) {
      const { common, elite } = reinforcementIds(hunt.id); expect(elite).not.toBe(common);
      const list = composeExtras(hunt.id, 20_000, rng);
      expect(list.every(id => MONSTERS[id] && !MONSTERS[id].boss)).toBe(true);
      expect(Math.abs(list.filter(id => id === elite).length / list.length - .15)).toBeLessThan(.03);
    }
    // Catacumbas: comum = esqueleto, elite = ghoul (W2)
    expect(reinforcementIds('catacumbas')).toEqual({ common: 'skeleton', elite: 'ghoul' });
  });

  it('extrasScale da hunt multiplica o número sorteado; extrasTable sobrepõe a tabela', () => {
    const hunt = HUNT_BY_ID.floresta_sombria; hunt.extrasScale = 2;
    try { const rng = mulberry32(3); for (let i = 0; i < 500; i++) expect(extraMonsters(hunt.id, false, rng).length % 2).toBe(0); } finally { delete hunt.extrasScale; }
    expect(HUNT_BY_ID.catacumbas.extrasTable).toBe(EARLY_EXTRAS);
    const rng = mulberry32(4); for (let i = 0; i < 3000; i++) expect(extraMonsters('catacumbas', false, rng).length).toBeLessThanOrEqual(4);
  });

  it('saco embaralhado: 40 waves seguidas têm a contagem proporcional à tabela; mesma semente, mesma sequência', () => {
    const draw = (seed: number) => { const bag = newBag(), rng = mulberry32(seed); return Array.from({ length: 40 }, () => drawFromBag(bag, WAVE_EXTRAS, 40, rng)); };
    const a = draw(1), b = draw(1), c = draw(2);
    expect(a).toEqual(b); expect(a).not.toEqual(c);
    const count = (list: number[], extra: number) => list.filter(x => x === extra).length;
    for (const row of WAVE_EXTRAS) expect(count(a, row.extra), `+${row.extra}`).toBe(Math.floor(row.pct * 40 / 100 + .5));
    expect(a).toHaveLength(40);
    // a sorte se compensa: nenhum saco tem mais que o esperado + 1 de cada resultado, e os raros chegam nos sacos seguintes (resto fracionário)
    const bag = newBag(), rng = mulberry32(6), long = Array.from({ length: 4000 }, () => drawFromBag(bag, WAVE_EXTRAS, 40, rng));
    for (const row of WAVE_EXTRAS) expect(Math.abs(count(long, row.extra) / 4000 * 100 - row.pct), `+${row.extra}`).toBeLessThan(.6);
  });

  it('válvula: com a equipe a 30% de HP o reforço máximo é +1; sem hordas em sequência, no máximo +2 depois de uma', () => {
    expect(limitExtra(12, { avgHpFraction: .3, lastExtra: 0 })).toBe(1);
    expect(limitExtra(12, { avgHpFraction: .9, lastExtra: 0 })).toBe(12);
    expect(limitExtra(12, { avgHpFraction: .9, lastExtra: 6 })).toBe(2); expect(limitExtra(1, { avgHpFraction: .9, lastExtra: 8 })).toBe(1);
    expect(limitExtra(12, { avgHpFraction: .3, lastExtra: 0 }, { ...WAVE_CONFIG, valve: false })).toBe(12);
  });

  it('tiers, recompensas das grandes e levas', () => {
    expect([0, 1, 2, 3, 5, 6, 11, 12, 16].map(tierOfExtra)).toEqual(['normal', 'light', 'light', 'reinforced', 'reinforced', 'horde', 'horde', 'invasion', 'invasion']);
    expect(waveRewards(3)).toEqual({ gearRolls: 0, goldBonus: 0 }); expect(waveRewards(8)).toEqual({ gearRolls: 1, goldBonus: 0 }); expect(waveRewards(12)).toEqual({ gearRolls: 2, goldBonus: .25 });
    expect(waveRewards(12, { ...WAVE_CONFIG, bigRewards: false })).toEqual({ gearRolls: 0, goldBonus: 0 });
    expect(splitBatches([...Array(8).keys()]).pending).toHaveLength(0); expect(splitBatches([...Array(9).keys()])).toMatchObject({ pending: [8] });
    const s = splitBatches([...Array(16).keys()]); expect(s.initial).toHaveLength(8); expect(s.pending).toHaveLength(8);
    expect(batchToSpawn(5, 8, 0)).toBe(3); // cabem só 3 (teto de 8 vivos)
    expect(batchToSpawn(2, 8, 0)).toBe(4); expect(batchToSpawn(7, 8, 1)).toBe(0); expect(batchToSpawn(7, 8, 7)).toBe(1); expect(batchToSpawn(2, 0, 0)).toBe(0);
  });

  it('layout: com 1 a 24 monstros ficam dentro da arena (x ∈ [130, 894], acima de y = 320) e sem sobreposição', () => {
    for (let n = 1; n <= 24; n++) {
      const pos = wavePositions(n); expect(pos).toHaveLength(n);
      for (const p of pos) { expect(p.x).toBeGreaterThanOrEqual(130); expect(p.x).toBeLessThanOrEqual(894); expect(p.y).toBeLessThan(320); expect(p.y).toBeGreaterThanOrEqual(150); }
      expect(new Set(pos.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)).size).toBe(n);
    }
    expect(wavePositions(4).map(p => p.y)).toEqual([222, 222, 222, 222]); // uma linha: como antes
  });
});

describe('Waves A — engine', () => {
  const started = (huntId = 'floresta_sombria', seed = 1) => {
    WAVE_CONFIG.enabled = true;
    const state = partyState(); state.huntId = huntId; const e = new GameEngine(state);
    const rng = mulberry32(seed), original = Math.random; Math.random = rng;
    return { e, restore: () => { Math.random = original; } };
  };

  it('cada wave nasce com o núcleo + reforços; o banner mostra o tier; o núcleo vem primeiro', () => {
    const { e, restore } = started();
    try {
      const seen = new Set<number>(); let bossFirst = true;
      for (let i = 0; i < 60; i++) {
        (e as unknown as { spawnWave(): void }).spawnWave();
        const s = e.getSnapshot(), info = s.waveInfo!, isBoss = s.wave === HUNT_BY_ID.floresta_sombria.waves.length - 1;
        const core = HUNT_BY_ID.floresta_sombria.waves[s.wave].monsters.length;
        expect(info.total).toBe(core + info.extra); expect(s.monsters.length + (s.wavePending?.length ?? 0)).toBe(info.total);
        if (info.extra > 0) expect(s.message).toMatch(/Reforço|Horda|Invasão/); else expect(s.message).not.toMatch(/Reforço|Horda|Invasão/);
        if (isBoss) bossFirst &&= MONSTERS[s.monsters[0].defId].boss === true;
        seen.add(info.extra);
        e.getSnapshot().wave = (s.wave + 1) % 3;
      }
      expect(seen.size).toBeGreaterThan(3); expect(bossFirst).toBe(true);
    } finally { restore(); }
  });

  it('desligado, a wave é o núcleo do HuntDef (comportamento antigo)', () => {
    WAVE_CONFIG.enabled = false; const e = new GameEngine(partyState()); e.start();
    expect(e.getSnapshot().monsters.map(m => m.defId)).toEqual(['skeleton', 'skeleton', 'skeleton']); expect(e.getSnapshot().waveInfo?.extra).toBe(0);
  });

  it('levas: com 16 monstros nunca há mais de 8 vivos e todos aparecem em até 15 s; a wave só termina depois do último', () => {
    const { e, restore } = started(); WAVE_CONFIG.valve = false; runtime.monsterHp = 0.02; // monstros frágeis: a entrada depende só das levas, não da velocidade de abate
    try {
      const priv = e as unknown as { rollWaveExtras(): number; spawnWave(): void };
      priv.rollWaveExtras = () => 16; priv.spawnWave(); e.getSnapshot().status = 'running';
      expect(e.getSnapshot().monsters).toHaveLength(8); expect(e.getSnapshot().wavePending).toHaveLength(12);
      const total = e.getSnapshot().waveInfo!.total; expect(total).toBe(20);
      let peak = 0, fullyIn = -1;
      for (let step = 0; step < 150 && fullyIn < 0; step++) {
        const s = e.getSnapshot(); s.characters.forEach(c => { c.hp = 1e9; }); // ninguém morre: só medimos a entrada
        e.tick(100); const now = e.getSnapshot(); peak = Math.max(peak, now.monsters.filter(m => m.alive).length);
        if (now.monsters.length === total) fullyIn = (step + 1) / 10;
      }
      expect(peak).toBeLessThanOrEqual(8); expect(fullyIn).toBeGreaterThan(0); expect(fullyIn).toBeLessThanOrEqual(15);
    } finally { runtime.monsterHp = 1; restore(); }
  });

  it('Horda dá rolagens extras de equipamento ao ser varrida; Invasão dá +25% de ouro da wave', () => {
    const { e, restore } = started(); WAVE_CONFIG.valve = false;
    try {
      (e as unknown as { rollWaveExtras(): number }).rollWaveExtras = () => 12; (e as unknown as { spawnWave(): void }).spawnWave();
      const s = () => e.getSnapshot(); s().analyzer.gold = 1000; s().waveInfo!.goldStart = 0; const gold = s().gold;
      let rolls = 0; (e as unknown as { dropGear(): void }).dropGear = () => { rolls++; };
      (e as unknown as { completeWave(): void }).completeWave();
      expect(rolls).toBe(2); expect(s().gold - gold).toBe(250);
    } finally { restore(); }
  });

  it('save antigo (sem estado das waves) carrega e a primeira wave cria o saco; o saco é salvo e volta igual', () => {
    const { e, restore } = started();
    try {
      const legacy = structuredClone(e.getSnapshot()) as unknown as Record<string, unknown>; delete legacy.waveBags; delete legacy.wavePending; delete legacy.waveInfo; delete legacy.lastExtra;
      const restored = cloneValidatedState(legacy); expect(restored.waveBags).toBeUndefined();
      const e2 = new GameEngine(restored); (e2 as unknown as { spawnWave(): void }).spawnWave();
      expect(Object.keys(e2.getSnapshot().waveBags ?? {})).toEqual(['floresta_sombria:normal']);
      const again = cloneValidatedState(e2.getSnapshot()); expect(again.waveBags).toEqual(e2.getSnapshot().waveBags);
    } finally { restore(); }
  });
});
