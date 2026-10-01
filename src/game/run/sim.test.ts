import { describe, expect, it } from 'vitest';
import { RunSim, type HeroSpec } from './sim';

const team = (power = 1): HeroSpec[] => [
  { id: 't', name: 'Tank', role: 'tank', maxHp: 420 * power, dps: 14 * power, range: 1.2 },
  { id: 'm', name: 'Melee', role: 'melee', maxHp: 300 * power, dps: 22 * power, range: 1.2 },
  { id: 'r', name: 'Arqueiro', role: 'ranged', maxHp: 240 * power, dps: 20 * power, range: 5 },
  { id: 'h', name: 'Curandeiro', role: 'healer', maxHp: 230 * power, dps: 0, range: 5, heal: 40 * power },
];
const params = { seed: 2024, huntId: 'catacumbas' };

describe('Run procedural — simulação', () => {
  it('é determinística: mesma semente e equipe dão exatamente o mesmo resultado', () => {
    const a = new RunSim(params, team(3)), b = new RunSim(params, team(3));
    a.run(300); b.run(300);
    expect(JSON.stringify(a.stats)).toBe(JSON.stringify(b.stats));
    expect(a.heroes.map(h => [h.d.toFixed(3), h.y.toFixed(3), h.hp.toFixed(2)])).toEqual(b.heroes.map(h => [h.d.toFixed(3), h.y.toFixed(3), h.hp.toFixed(2)]));
  });

  it('o grupo avança pelo corredor, enfrenta encontros e mata monstros', () => {
    const s = new RunSim(params, team(4)); s.run(600);
    expect(s.stats.distance).toBeGreaterThan(100); expect(s.stats.encounters).toBeGreaterThan(5); expect(s.stats.kills).toBeGreaterThan(20);
  });

  it('nunca passa de maxAlive monstros vivos de uma vez (levas)', () => {
    const s = new RunSim(params, team(6)); s.run(1800);
    expect(s.stats.maxAlive).toBeLessThanOrEqual(8 + 4);
  });

  it('heróis nunca entram em obstáculo nem saem da faixa andável', () => {
    const s = new RunSim(params, team(4)); let bad = 0;
    for (let i = 0; i < 4000; i++) { s.step(.1); for (const h of s.living) if (s.plan.isBlocked(h.d, h.y)) bad++; }
    expect(bad).toBe(0);
  });

  it('uma hora de jogo simulada roda rápido e com memória constante (cabe em segundo plano)', () => {
    const s = new RunSim(params, team(40)), t0 = performance.now();
    s.run(3600);
    expect(performance.now() - t0).toBeLessThan(4000);
    expect((s.plan as unknown as { cache: Map<number, unknown> }).cache.size).toBeLessThan(400);
    expect(s.stats.bossKills).toBeGreaterThan(0);
  });

  it('um grupo fraco sofre baixas e não chega longe; um forte chega bem mais longe', () => {
    const weak = new RunSim(params, team(.05)), strong = new RunSim(params, team(4));
    weak.run(3000); strong.run(3000);
    expect(weak.stats.deaths).toBeGreaterThanOrEqual(2); expect(strong.stats.deaths).toBe(0);
    expect(strong.stats.distance).toBeGreaterThan(weak.stats.distance * 3);
  });
});
