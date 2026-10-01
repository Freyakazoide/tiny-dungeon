import { describe, expect, it } from 'vitest';
import { ARENA, BACK_COL, BOSS_CELL, CANVAS_H, CANVAS_W, CELL_PX, COLUMN_ROWS, FRONT_COL, NEIGHBORS, OBSTACLE_LAYOUTS, findPath, obstacleCells, cellAt, cellCenter, cellKey, engagementSlots, entranceCells, formationCells, inArena, isBoxFull, spawnCells, unitAnchor, type Cell } from './geometry';

describe('geometria da arena', () => {
  it('as medidas fecham com o canvas', () => {
    expect(ARENA.cols * CELL_PX).toBe(960); expect(ARENA.rows * CELL_PX).toBe(512);
    expect(ARENA.x + 960 + ARENA.x).toBe(CANVAS_W); expect(ARENA.y + 512 + 64).toBe(CANVAS_H);
  });
  it('cellAt(cellCenter) volta à célula e a âncora fica dentro do canvas', () => {
    for (let c = 0; c < ARENA.cols; c++) for (let r = 0; r < ARENA.rows; r++) {
      const cell = { c, r }; expect(cellAt(cellCenter(cell).x, cellCenter(cell).y)).toEqual(cell);
      const a = unitAnchor(cell); expect(a.x).toBeGreaterThan(0); expect(a.x).toBeLessThan(CANVAS_W); expect(a.y).toBeLessThanOrEqual(CANVAS_H);
    }
    expect(cellAt(0, 0)).toBeNull();
    expect(unitAnchor({ c: 0, r: 3 }, { w: 2, h: 2 })).toEqual({ x: 32 + 64, y: 64 + 3 * 64 + 128 });
  });
  it('formationCells: heróis à direita (frente col. 10, trás col. 13), linhas da tabela, distância ≥ 2', () => {
    for (let front = 0; front <= 4; front++) for (let back = 0; back <= 4; back++) {
      const team = [...Array.from({ length: front }, (_, i) => ({ id: `f${i}`, row: 'front' as const })), ...Array.from({ length: back }, (_, i) => ({ id: `b${i}`, row: 'back' as const }))];
      const cells = formationCells(team);
      for (const [row, n, c] of [['f', front, FRONT_COL], ['b', back, BACK_COL]] as const) {
        const rows = Array.from({ length: n }, (_, i) => cells.get(`${row}${i}`)!.r);
        if (n) expect(rows).toEqual(COLUMN_ROWS[n]);
        for (const r of rows) { expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(7); }
        for (let i = 1; i < rows.length; i++) expect(rows[i] - rows[i - 1]).toBeGreaterThanOrEqual(2);
        for (let i = 0; i < n; i++) expect(cells.get(`${row}${i}`)!.c).toBe(c);
      }
    }
    expect([...entranceCells(['a', 'b']).values()].map(c => c.c)).toEqual([5, 9]);
  });
  it('spawnCells: n células distintas nas colunas 0 a 3 (esquerda), chefe 2×2 sem sobreposição, até 28', () => {
    for (const boss of [false, true]) for (const n of [1, 4, 8, 12, 20, 28]) {
      const cells = spawnCells(n, boss); expect(cells).toHaveLength(n); expect(new Set(cells.map(cellKey)).size).toBe(n);
      for (const cell of cells) { expect(cell.c).toBeLessThanOrEqual(3); expect(inArena(cell)).toBe(true); }
      if (boss) { expect(cells[0]).toEqual(BOSS_CELL); const block = new Set(['0,3', '1,3', '0,4', '1,4']); for (const cell of cells.slice(1)) expect(block.has(cellKey(cell))).toBe(false); }
    }
    const spaced = spawnCells(8); for (const a of spaced) for (const b of spaced) if (a !== b) expect(Math.abs(a.c - b.c) + Math.abs(a.r - b.r)).toBeGreaterThan(1);
  });
  it('engagementSlots (o lado esquerdo, de onde vêm os monstros, primeiro) e isBoxFull', () => {
    const tank: Cell = { c: 10, r: 4 };
    const slots = engagementSlots(tank, new Set()); expect(slots).toHaveLength(8);
    expect(slots[0]).toEqual({ c: 9, r: 4 }); expect(slots.slice(1, 3).map(cellKey).sort()).toEqual(['9,3', '9,5']);
    expect(slots[7]).toEqual({ c: 11, r: 4 });
    expect(engagementSlots(tank, new Set(['9,4', '9,3', '9,5']))).toHaveLength(5);
    const edge: Cell = { c: 0, r: 0 }; expect(engagementSlots(edge, new Set())).toHaveLength(3);
    expect(isBoxFull(tank, new Set())).toBe(false);
    expect(isBoxFull(tank, new Set(NEIGHBORS.map(([dc, dr]) => cellKey({ c: 10 + dc, r: 4 + dr }))))).toBe(true);
    const corner = new Set(['1,0', '0,1', '1,1']); expect(isBoxFull(edge, corner)).toBe(true);
  });
  it('obstáculos: cada wave tem um desenho na faixa do meio, fora do nascimento e da formação, e há caminho dos monstros até todo herói', () => {
    expect(OBSTACLE_LAYOUTS).toHaveLength(6);
    const team = [...[0, 1, 2, 3].map(i => ({ id: `f${i}`, row: 'front' as const })), ...[0, 1, 2, 3].map(i => ({ id: `b${i}`, row: 'back' as const }))];
    const heroes = [...formationCells(team).values()];
    for (let w = 0; w < 6; w++) {
      const cells = obstacleCells(w, w === 5), blocked = new Set(cells.map(cellKey)); expect(new Set(cells.map(cellKey)).size).toBe(cells.length);
      for (const c of cells) { expect(c.c).toBeGreaterThanOrEqual(4); expect(c.c).toBeLessThanOrEqual(8); expect(inArena(c)).toBe(true); }
      expect(obstacleCells(w, true)).toBe(OBSTACLE_LAYOUTS[5]);
      for (const spawn of spawnCells(32)) for (const hero of heroes) { const path = findPath(spawn, { c: hero.c - 1, r: hero.r }, blocked); expect(path.length, `wave ${w}: ${cellKey(spawn)}→${cellKey(hero)}`).toBeGreaterThan(0); for (const p of path) expect(blocked.has(cellKey(p))).toBe(false); }
    }
    expect(findPath({ c: 0, r: 0 }, { c: 2, r: 0 }, new Set())).toHaveLength(3);
    expect(findPath({ c: 0, r: 0 }, { c: 2, r: 0 }, new Set(['1,0', '1,1'])).length).toBeGreaterThan(0);
    expect(findPath({ c: 0, r: 0 }, { c: 2, r: 0 }, new Set(['1,0', '1,1', '0,1', '2,1'])).length).toBe(0);
  });
});

describe('findPath com bloco 2×2 (chefe)', () => {
  it('o chefe contorna o desenho de obstáculos da wave dele até perto de todo herói', () => {
    const blocked = new Set(obstacleCells(5, true).map(cellKey));
    for (const target of [{ c: 8, r: 1 }, { c: 8, r: 3 }, { c: 8, r: 5 }]) {
      const path = findPath(BOSS_CELL, target, blocked, 2); expect(path.length, cellKey(target)).toBeGreaterThan(0);
      for (const p of path) for (const f of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(blocked.has(cellKey({ c: p.c + f[0], r: p.r + f[1] }))).toBe(false);
    }
  });
});
