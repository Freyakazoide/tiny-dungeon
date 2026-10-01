import { describe, expect, it } from 'vitest';
import { BOSS_EVERY, BAND, CHUNK_LEN, RunPlan, bossIdOf, depthScale, generateChunk } from './plan';
import { HUNT_BY_ID } from '../data/hunts';

const params = { seed: 12345, huntId: 'catacumbas' };

describe('Run procedural — plano do corredor', () => {
  it('é determinístico: mesma semente e índice dão o mesmo chunk, em qualquer ordem de geração', () => {
    const a = new RunPlan(params), b = new RunPlan(params);
    const forward = Array.from({ length: 30 }, (_, i) => a.chunk(i));
    const backward = Array.from({ length: 30 }, (_, i) => b.chunk(29 - i)).reverse();
    expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
    expect(JSON.stringify(generateChunk({ ...params, seed: 999 }, 7))).not.toBe(JSON.stringify(generateChunk(params, 7)));
  });

  it('a faixa sobe e desce de verdade: rampas de vários andares, dentro dos limites, contínua entre chunks', () => {
    const plan = new RunPlan(params), tops: number[] = [];
    for (let i = 0; i < 300; i++) { const c = plan.chunk(i); expect(c.floorStart).toBe(i ? plan.chunk(i - 1).floorEnd : c.floorStart); tops.push(c.floorEnd); expect(c.floorEnd).toBeGreaterThanOrEqual(0); expect(c.floorEnd).toBeLessThanOrEqual(16); }
    expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThanOrEqual(10);                       // amplitude grande
    expect(Math.max(...tops.slice(1).map((v, i) => Math.abs(v - tops[i])))).toBeGreaterThanOrEqual(3);   // rampas de pelo menos 3 andares
    let slope = 0; for (let d = 0; d < 300 * CHUNK_LEN - 1; d++) slope = Math.max(slope, Math.abs(plan.floorAtD(d + 1) - plan.floorAtD(d)));
    expect(slope).toBeLessThanOrEqual(1);                                                          // nunca um degrau de 2 linhas entre colunas
  });

  it('sempre existe um caminho livre de ponta a ponta (busca em largura sobre 200 chunks)', () => {
    for (const seed of [1, 2, 3, 42, 777]) {
      const plan = new RunPlan({ ...params, seed }), total = CHUNK_LEN * 200;
      let frontier = new Set<number>(Array.from({ length: BAND }, (_, i) => plan.chunk(0).floor + i).filter(r => !plan.isBlocked(0.5, r)));
      expect(frontier.size).toBeGreaterThan(0);
      for (let c = 1; c < total; c++) {
        const next = new Set<number>();
        for (const r of frontier) for (const dr of [-1, 0, 1]) { const nr = r + dr; if (!plan.isBlocked(c + .5, nr) && !plan.isBlocked(c - .5 + .001, r)) next.add(nr); }
        // andar em diagonal exige a célula de passagem livre nas duas colunas
        frontier = new Set([...next].filter(r => !plan.isBlocked(c + .5, r)));
        expect(frontier.size, `seed ${seed} coluna ${c}`).toBeGreaterThan(0);
        if (c % 400 === 0) plan.window(plan.indexAt(c) - 1, plan.indexAt(c) + 2);   // descarta e regenera: continua igual
      }
    }
  });

  it('chefe a cada BOSS_EVERY chunks, com força variando; chunk 0 é só a entrada', () => {
    const plan = new RunPlan(params), bosses = Array.from({ length: 400 }, (_, i) => plan.chunk(i)).filter(c => c.encounter?.boss);
    expect(plan.chunk(0).encounter).toBeUndefined();
    expect(bosses.length).toBe(Math.floor(400 / BOSS_EVERY));
    expect(bosses.every(c => (c.index + 1) % BOSS_EVERY === 0 && c.encounter!.monsters[0] === bossIdOf('catacumbas'))).toBe(true);
    expect(new Set(bosses.map(c => c.encounter!.bossPower)).size).toBe(3);
    // chefe nunca duplicado
    expect(bosses.every(c => c.encounter!.monsters.filter(m => m === bossIdOf('catacumbas')).length === 1)).toBe(true);
  });

  it('encontros crescem com a profundidade e as hordas seguem a tabela (raras, nunca em sequência)', () => {
    const plan = new RunPlan(params), list = Array.from({ length: 600 }, (_, i) => plan.chunk(i)).filter(c => c.encounter && !c.encounter.boss);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const early = list.slice(0, 8).map(c => c.encounter!.monsters.length), late = list.slice(-50).map(c => c.encounter!.monsters.length);
    expect(mean(late)).toBeGreaterThan(mean(early) + 2);
    expect(depthScale(100).hp).toBeGreaterThan(depthScale(10).hp);
    expect(Math.min(...list.map(c => c.encounter!.monsters.length))).toBeGreaterThanOrEqual(3);
    const tiers = list.map(c => c.encounter!.tier);
    expect(tiers.filter(t => t === 'normal' || t === 'light').length / tiers.length).toBeGreaterThan(.35);
    for (let i = 1; i < list.length; i++) if (list[i - 1].index === list[i].index - 1 && list[i - 1].encounter!.extra >= 6) expect(list[i].encounter!.extra).toBeLessThanOrEqual(Math.round(2 * 1.72) + 1);
  });

  it('usa só monstros da hunt escolhida', () => {
    for (const huntId of Object.keys(HUNT_BY_ID)) {
      const plan = new RunPlan({ seed: 5, huntId }), ids = new Set(HUNT_BY_ID[huntId].waves.flatMap(w => w.monsters));
      for (let i = 0; i < 120; i++) for (const m of plan.chunk(i).encounter?.monsters ?? []) expect(ids.has(m), `${huntId}:${m}`).toBe(true);
    }
  });

  it('a janela descarta chunks antigos (memória constante em runs longas)', () => {
    const plan = new RunPlan(params);
    for (let i = 0; i < 5000; i += 3) plan.window(i, i + 4);
    expect((plan as unknown as { cache: Map<number, unknown> }).cache.size).toBeLessThan(12);
  });
});
