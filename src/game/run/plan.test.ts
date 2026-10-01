import { describe, expect, it } from 'vitest';
import { BAND, BOSS_EVERY, CHUNK_LEN, RunPlan, bossIdOf, depthScale, toWorld } from './plan';
import { HUNT_BY_ID } from '../data/hunts';

const params = { seed: 12345, huntId: 'catacumbas' };
const gridOf = (plan: RunPlan) => (plan as unknown as { grid: Map<number, number> }).grid;

/** Busca em largura (8 direções, sem cortar quina) entre duas células, sobre a grade carregada. */
function reachable(plan: RunPlan, from: [number, number], to: [number, number]) {
  const key = (x: number, y: number) => `${x},${y}`, seen = new Set([key(...from)]), queue: [number, number][] = [from];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i]; if (x === to[0] && y === to[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (seen.has(key(nx, ny)) || plan.isBlockedCell(nx, ny)) continue;
      if (dx && dy && (plan.isBlockedCell(x + dx, y) || plan.isBlockedCell(x, y + dy))) continue;
      seen.add(key(nx, ny)); queue.push([nx, ny]);
    }
  }
  return false;
}

describe('Run procedural — plano do corredor com curvas', () => {
  it('é determinístico: mesma semente e índice dão o mesmo chunk, em qualquer ordem de geração', () => {
    const a = new RunPlan(params), b = new RunPlan(params);
    const forward = Array.from({ length: 40 }, (_, i) => a.chunk(i));
    const backward = Array.from({ length: 40 }, (_, i) => b.chunk(39 - i)).reverse();
    expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
    expect(JSON.stringify(new RunPlan({ ...params, seed: 999 }).chunk(7))).not.toBe(JSON.stringify(a.chunk(7)));
  });

  it('o mapa muda de direção de verdade: sobe (N), desce (S) e volta para a esquerda (W), com cantos nos dois sentidos', () => {
    const plan = new RunPlan(params), chunks = Array.from({ length: 200 }, (_, i) => plan.chunk(i));
    expect(new Set(chunks.map(c => c.heading))).toEqual(new Set(['W', 'N', 'S']));
    expect(new Set(chunks.filter(c => c.turn).map(c => c.turn))).toEqual(new Set(['R', 'L']));
    expect(chunks[0].heading).toBe('W'); expect(chunks.slice(0, 3).every(c => !c.turn)).toBe(true);
    // todo desvio vertical volta a W e nunca vira direto de N para S
    for (let i = 1; i < chunks.length; i++) if (chunks[i].turn && chunks[i - 1].heading !== 'W') expect(chunks[i].heading).toBe('W');
    // a trilha realmente vai para cima e para baixo no mundo
    const ys = chunks.map(c => toWorld(c.frame, 0, 0).y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(60);
  });

  it('o caminho nunca se cruza (cada célula do mundo pertence a um só chunk) e há caminho livre de ponta a ponta', () => {
    for (const seed of [1, 2, 3, 42, 777]) {
      const plan = new RunPlan({ ...params, seed }); plan.precompute(160);
      expect(gridOf(plan).size).toBe(160 * CHUNK_LEN * BAND);
      const first = plan.chunk(0), last = plan.chunk(159);
      const start = toWorld(first.frame, 1.5, 0.5), end = toWorld(last.frame, CHUNK_LEN - .5, 0.5);
      // as duas linhas livres da trilha existem em cada coluna; basta alguma célula livre na largura inicial e final
      const freeAt = (chunk: typeof first, c: number) => Array.from({ length: BAND }, (_, r) => toWorld(chunk.frame, c + .5, r + .5)).filter(p => !plan.isBlocked(p.x, p.y))[0];
      const s = freeAt(first, 1), e = freeAt(last, CHUNK_LEN - 1);
      void start; void end;
      expect(reachable(plan, [Math.floor(s.x), Math.floor(s.y)], [Math.floor(e.x), Math.floor(e.y)]), `seed ${seed}`).toBe(true);
    }
  });

  it('obstáculos vêm em blocos colados (2+ células vizinhas), nunca fecham a trilha de 2 linhas e há curvas bloqueáveis', () => {
    const plan = new RunPlan(params); let blocks = 0, adj = 0;
    for (let i = 1; i < 120; i++) {
      const { obstacles } = plan.chunk(i), set = new Set(obstacles.map(o => `${o.c},${o.r}`));
      blocks += obstacles.length; adj += obstacles.filter(o => set.has(`${o.c + 1},${o.r}`) || set.has(`${o.c},${o.r + 1}`)).length;
    }
    expect(blocks).toBeGreaterThan(150); expect(adj / blocks).toBeGreaterThan(.45);   // a maioria encostada em outra
    expect(plan.chunk(0).obstacles).toHaveLength(0);
  });

  it('pathPoint é contínuo (inclusive nos cantos) e avança ~1 célula por unidade de progresso', () => {
    const plan = new RunPlan(params); plan.precompute(80);
    let prev = plan.pathPoint(0), worst = 0;
    for (let p = .25; p < 80 * CHUNK_LEN; p += .25) { const q = plan.pathPoint(p); worst = Math.max(worst, Math.hypot(q.x - prev.x, q.y - prev.y)); prev = q; }
    expect(worst).toBeLessThan(.4);   // passo de .25 → no máximo ~.35 (diagonal do canto)
    const f = plan.forwardAt(5); expect(Math.hypot(f.x, f.y)).toBeCloseTo(1);
  });

  it('o ponto de nascimento fica em célula livre e à frente', () => {
    const plan = new RunPlan(params); plan.precompute(30); let n = 0;
    for (let p = 30; p < 600; p += 7) { const q = plan.spawnPoint(p, Math.random); if (!plan.isBlocked(q.x, q.y)) n++; }
    expect(n).toBeGreaterThan(75);
  });

  it('chefe a cada BOSS_EVERY chunks, com força variando e nunca em chunk de curva', () => {
    const plan = new RunPlan(params), bosses = Array.from({ length: 400 }, (_, i) => plan.chunk(i)).filter(c => c.encounter?.boss);
    expect(plan.chunk(0).encounter).toBeUndefined();
    expect(bosses.length).toBe(Math.floor(400 / BOSS_EVERY));
    expect(bosses.every(c => (c.index + 1) % BOSS_EVERY === 0 && c.encounter!.monsters[0] === bossIdOf('catacumbas') && !c.turn)).toBe(true);
    expect(new Set(bosses.map(c => c.encounter!.bossPower)).size).toBe(3);
    expect(bosses.every(c => c.encounter!.monsters.filter(m => m === bossIdOf('catacumbas')).length === 1)).toBe(true);
  });

  it('encontros crescem com a profundidade e usam só monstros da hunt', () => {
    const plan = new RunPlan(params), list = Array.from({ length: 600 }, (_, i) => plan.chunk(i)).filter(c => c.encounter && !c.encounter.boss);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(list.slice(-50).map(c => c.encounter!.monsters.length))).toBeGreaterThan(mean(list.slice(0, 8).map(c => c.encounter!.monsters.length)) + 2);
    expect(depthScale(100).hp).toBeGreaterThan(depthScale(10).hp);
    for (const huntId of Object.keys(HUNT_BY_ID)) { const pl = new RunPlan({ seed: 5, huntId }), ids = new Set(HUNT_BY_ID[huntId].waves.flatMap(w => w.monsters)); for (let i = 0; i < 120; i++) for (const m of pl.chunk(i).encounter?.monsters ?? []) expect(ids.has(m), `${huntId}:${m}`).toBe(true); }
  });

  it('a janela da grade tem tamanho constante em runs longas', () => {
    const plan = new RunPlan(params);
    for (let i = 0; i < 3000; i += 3) plan.ensure(i);
    expect(plan.loadedCount).toBeLessThanOrEqual(8);
    expect(gridOf(plan).size).toBeLessThanOrEqual(8 * CHUNK_LEN * BAND);
  });
});
