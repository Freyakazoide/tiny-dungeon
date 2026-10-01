import { describe, expect, it } from 'vitest';
import { ARENA, BACK_ROW, BOSS_CELL, CANVAS_H, CANVAS_W, CELL_PX, FRONT_ROW, NEIGHBORS, ROW_COLUMNS, cellAt, cellCenter, cellKey, engagementSlots, entranceCells, formationCells, inArena, isBoxFull, spawnCells, unitAnchor, type Cell } from './geometry';

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
    expect(unitAnchor({ c: 6, r: 0 }, { w: 2, h: 2 })).toEqual({ x: 32 + 6 * 64 + 64, y: 64 + 128 });
  });
  it('formationCells: colunas da tabela, dentro de 0…14, distância ≥ 3', () => {
    for (let front = 0; front <= 4; front++) for (let back = 0; back <= 4; back++) {
      const team = [...Array.from({ length: front }, (_, i) => ({ id: `f${i}`, row: 'front' as const })), ...Array.from({ length: back }, (_, i) => ({ id: `b${i}`, row: 'back' as const }))];
      const cells = formationCells(team);
      for (const [row, n, r] of [['f', front, FRONT_ROW], ['b', back, BACK_ROW]] as const) {
        const cols = Array.from({ length: n }, (_, i) => cells.get(`${row}${i}`)!.c);
        if (n) expect(cols).toEqual(ROW_COLUMNS[n]);
        for (const c of cols) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(14); }
        for (let i = 1; i < cols.length; i++) expect(cols[i] - cols[i - 1]).toBeGreaterThanOrEqual(3);
        for (let i = 0; i < n; i++) expect(cells.get(`${row}${i}`)!.r).toBe(r);
      }
    }
    expect([...entranceCells(['a', 'b']).values()].map(c => c.c)).toEqual([5, 9]);
  });
  it('spawnCells: n células distintas nas linhas 0 a 2, chefe 2×2 sem sobreposição, até 24', () => {
    for (const boss of [false, true]) for (const n of [1, 4, 8, 12, 20, 24]) {
      const cells = spawnCells(n, boss); expect(cells).toHaveLength(n); expect(new Set(cells.map(cellKey)).size).toBe(n);
      for (const cell of cells) { expect(cell.r).toBeLessThanOrEqual(2); expect(inArena(cell)).toBe(true); }
      if (boss) { expect(cells[0]).toEqual(BOSS_CELL); const block = new Set(['6,0', '7,0', '6,1', '7,1']); for (const cell of cells.slice(1)) expect(block.has(cellKey(cell))).toBe(false); }
    }
    const spaced = spawnCells(8); for (const a of spaced) for (const b of spaced) if (a !== b) expect(Math.abs(a.c - b.c) + Math.abs(a.r - b.r)).toBeGreaterThan(1);
  });
  it('engagementSlots e isBoxFull', () => {
    const tank: Cell = { c: 7, r: 4 };
    const slots = engagementSlots(tank, new Set()); expect(slots).toHaveLength(8);
    expect(slots.slice(0, 3).map(cellKey)).toEqual(['7,3', '8,3', '6,3']);
    expect(slots[7]).toEqual({ c: 7, r: 5 });
    expect(engagementSlots(tank, new Set(['7,3', '8,3', '6,3']))).toHaveLength(5);
    const edge: Cell = { c: 0, r: 0 }; expect(engagementSlots(edge, new Set())).toHaveLength(3);
    expect(isBoxFull(tank, new Set())).toBe(false);
    expect(isBoxFull(tank, new Set(NEIGHBORS.map(([dc, dr]) => cellKey({ c: 7 + dc, r: 4 + dr }))))).toBe(true);
    const corner = new Set(['1,0', '0,1', '1,1']); expect(isBoxFull(edge, corner)).toBe(true);
  });
});
