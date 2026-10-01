import type { Character } from '../core/types';

/** Geometria da arena (Fase 13): o mapa inteiro é o canvas; tudo é medido em células de 2×2 tiles. */
export const ART_SCALE = 2;                          // 1 pixel de arte = 2 pixels de tela
export const TILE_ART = 16;                          // tile = 16×16 px de arte
export const TILE_PX = TILE_ART * ART_SCALE;         // 32
export const CANVAS_W = 1024, CANVAS_H = 640;        // = 32×20 tiles
export const CELL_TILES = 2;                         // uma célula = 2×2 tiles
export const CELL_PX = TILE_PX * CELL_TILES;         // 64
export const ARENA = { x: 32, y: 64, cols: 15, rows: 8 };
export const SPAWN_ROWS = [0, 1, 2] as const, FRONT_ROW = 4, BACK_ROW = 6, ENTRANCE_ROW = 7, STAIR_ROW = 0, CENTER_COL = 7;
/** Colunas por quantidade de heróis na linha, centradas na coluna 7 com pelo menos 3 células entre vizinhos. */
export const ROW_COLUMNS: Record<number, number[]> = { 1: [7], 2: [5, 9], 3: [4, 7, 10], 4: [2, 5, 9, 12] };

export type Cell = { c: number; r: number };
export const cellKey = (cell: Cell) => `${cell.c},${cell.r}`;
export const inArena = (cell: Cell) => cell.c >= 0 && cell.c < ARENA.cols && cell.r >= 0 && cell.r < ARENA.rows;
export const cellTopLeft = (cell: Cell) => ({ x: ARENA.x + cell.c * CELL_PX, y: ARENA.y + cell.r * CELL_PX });
export const cellCenter = (cell: Cell) => { const p = cellTopLeft(cell); return { x: p.x + CELL_PX / 2, y: p.y + CELL_PX / 2 }; };
/** Ponto de origem (0,5; 1) de uma unidade: centro-horizontal do bloco e fundo do bloco. */
export const unitAnchor = (cell: Cell, footprint: { w: number; h: number } = { w: 1, h: 1 }) => {
  const p = cellTopLeft(cell); return { x: p.x + footprint.w * CELL_PX / 2, y: p.y + footprint.h * CELL_PX };
};
export const cellAt = (px: number, py: number): Cell | null => {
  const cell = { c: Math.floor((px - ARENA.x) / CELL_PX), r: Math.floor((py - ARENA.y) / CELL_PX) };
  return inArena(cell) ? cell : null;
};

const columnsFor = (count: number) => ROW_COLUMNS[Math.min(4, Math.max(1, count))];
/** Células de formação de combate: frente na linha 4, trás na linha 6. */
export function formationCells(team: Pick<Character, 'id' | 'row'>[]): Map<string, Cell> {
  const out = new Map<string, Cell>();
  for (const [row, r] of [['front', FRONT_ROW], ['back', BACK_ROW]] as const) {
    const members = team.filter(c => c.row === row).slice(0, 4);
    if (members.length) columnsFor(members.length).forEach((c, i) => out.set(members[i].id, { c, r }));
  }
  return out;
}
const rowCells = (ids: string[], r: number) => { const out = new Map<string, Cell>(); const list = ids.slice(0, 4); if (list.length) columnsFor(list.length).forEach((c, i) => out.set(list[i], { c, r })); return out; };
export const entranceCells = (ids: string[]) => rowCells(ids, ENTRANCE_ROW);
/** Onde os heróis esperam a escada (linha 0, mesmas colunas). */
export const stairCells = (ids: string[]) => rowCells(ids, STAIR_ROW);

export const BOSS_CELL: Cell = { c: 6, r: 0 };
const bossBlock = () => [{ c: 6, r: 0 }, { c: 7, r: 0 }, { c: 6, r: 1 }, { c: 7, r: 1 }];
const allSpawn: Cell[] = SPAWN_ROWS.flatMap(r => Array.from({ length: ARENA.cols }, (_, c) => ({ c, r })));
const byCenter = (a: Cell, b: Cell) => Math.abs(a.c - CENTER_COL) - Math.abs(b.c - CENTER_COL) || a.r - b.r || a.c - b.c;
/**
 * Células de nascimento dos monstros (linhas 0 a 2), do centro para fora. Com folga de 1 célula entre unidades
 * (xadrez) enquanto couber; passando disso, compacta usando todas as células livres. Com chefe, o primeiro item é
 * o canto do bloco 2×2 do chefe e os demais ficam fora dele.
 */
export function spawnCells(count: number, boss = false): Cell[] {
  if (count <= 0) return [];
  const blocked = new Set((boss ? bossBlock() : []).map(cellKey));
  const others = count - (boss ? 1 : 0);
  const free = allSpawn.filter(cell => !blocked.has(cellKey(cell)));
  const spaced = free.filter(cell => (cell.c + cell.r) % 2 === 0).sort(byCenter);
  const pool = spaced.length >= others ? spaced : [...free].sort(byCenter);
  const picked = pool.slice(0, others);
  return boss ? [BOSS_CELL, ...picked] : picked;
}

/** 8 vizinhos de uma célula, na ordem de prioridade de quem vem do norte: N, NE, NO, L, O, SE, SO, S. */
export const NEIGHBORS: readonly [number, number][] = [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [0, 1]];
/** Vizinhos livres e dentro da arena, em grupos N · NE/NO · L/O · SE/SO · S (dentro do grupo, o mais próximo de `from` primeiro). */
export function engagementSlots(target: Cell, occupied: ReadonlySet<string>, from: Cell = { c: target.c, r: target.r - 3 }): Cell[] {
  const dist = (n: Cell) => Math.hypot(n.c - from.c, n.r - from.r);
  const group = [0, 1, 1, 2, 2, 3, 3, 4];   // N · NE/NO · L/O · SE/SO · S
  return NEIGHBORS.map(([dc, dr], i) => ({ cell: { c: target.c + dc, r: target.r + dr }, i }))
    .filter(({ cell }) => inArena(cell) && !occupied.has(cellKey(cell)))
    .sort((a, b) => group[a.i] - group[b.i] || dist(a.cell) - dist(b.cell) || a.i - b.i).map(({ cell }) => cell);
}
export const isBoxFull = (target: Cell, occupied: ReadonlySet<string>) => engagementSlots(target, occupied).length === 0;
