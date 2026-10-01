import type { Character } from '../core/types';

/** Geometria da arena (Fase 13): o mapa inteiro é o canvas; tudo é medido em células de 2×2 tiles. */
export const ART_SCALE = 2;                          // 1 pixel de arte = 2 pixels de tela
export const TILE_ART = 16;                          // tile = 16×16 px de arte
export const TILE_PX = TILE_ART * ART_SCALE;         // 32
export const CANVAS_W = 1024, CANVAS_H = 640;        // = 32×20 tiles
export const CELL_TILES = 2;                         // uma célula = 2×2 tiles
export const CELL_PX = TILE_PX * CELL_TILES;         // 64
export const ARENA = { x: 32, y: 64, cols: 15, rows: 8 };
export const STAIR_ROW = 0, ENTRANCE_ROW = 7, CENTER_COL = 7;
/** A wave nasce na esquerda e marcha para a direita: os heróis ficam nas colunas da direita (frente mais perto dos monstros). */
export const FRONT_COL = 10, BACK_COL = 13, SPAWN_COLS = 4;
/** Linhas por quantidade de heróis na coluna (dentro de 0…7, com pelo menos 2 células entre vizinhos). */
export const COLUMN_ROWS: Record<number, number[]> = { 1: [3], 2: [2, 5], 3: [1, 3, 6], 4: [0, 2, 4, 6] };
/** Colunas da entrada/escada (linhas 7 e 0), centradas na coluna 7. */
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
const rowsFor = (count: number) => COLUMN_ROWS[Math.min(4, Math.max(1, count))];
/** Células de formação de combate: frente na coluna 10, trás na coluna 13, espalhados na vertical. */
export function formationCells(team: Pick<Character, 'id' | 'row'>[]): Map<string, Cell> {
  const out = new Map<string, Cell>();
  for (const [row, c] of [['front', FRONT_COL], ['back', BACK_COL]] as const) {
    const members = team.filter(m => m.row === row).slice(0, 4);
    if (members.length) rowsFor(members.length).forEach((r, i) => out.set(members[i].id, { c, r }));
  }
  return out;
}
const rowCells = (ids: string[], r: number) => { const out = new Map<string, Cell>(); const list = ids.slice(0, 4); if (list.length) columnsFor(list.length).forEach((c, i) => out.set(list[i], { c, r })); return out; };
export const entranceCells = (ids: string[]) => rowCells(ids, ENTRANCE_ROW);
/** Onde os heróis esperam a escada (linha 0, mesmas colunas). */
export const stairCells = (ids: string[]) => rowCells(ids, STAIR_ROW);

export const BOSS_CELL: Cell = { c: 0, r: 3 };
const bossBlock = () => [{ c: 0, r: 3 }, { c: 1, r: 3 }, { c: 0, r: 4 }, { c: 1, r: 4 }];
const allSpawn: Cell[] = Array.from({ length: SPAWN_COLS }, (_, c) => Array.from({ length: ARENA.rows }, (_, r) => ({ c, r }))).flat();
const centerRow = (ARENA.rows - 1) / 2;
const bySpawn = (a: Cell, b: Cell) => a.c - b.c || Math.abs(a.r - centerRow) - Math.abs(b.r - centerRow) || a.r - b.r;
/**
 * Células de nascimento dos monstros: as colunas da esquerda (0 a 3), da borda para dentro e do meio para as pontas.
 * Com folga de 1 célula entre unidades (xadrez) enquanto couber; passando disso, compacta. Com chefe, o primeiro item é
 * o canto do bloco 2×2 do chefe e os demais ficam fora dele.
 */
export function spawnCells(count: number, boss = false): Cell[] {
  if (count <= 0) return [];
  const blocked = new Set((boss ? bossBlock() : []).map(cellKey));
  const others = count - (boss ? 1 : 0);
  const free = allSpawn.filter(cell => !blocked.has(cellKey(cell)));
  const spaced = free.filter(cell => (cell.c + cell.r) % 2 === 0).sort(bySpawn);
  const pool = spaced.length >= others ? spaced : [...free].sort(bySpawn);
  const picked = pool.slice(0, others);
  return boss ? [BOSS_CELL, ...picked] : picked;
}

/** 8 vizinhos de uma célula, na ordem de prioridade de quem vem da esquerda: O, NO, SO, N, S, NE, SE, L. */
export const NEIGHBORS: readonly [number, number][] = [[-1, 0], [-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1], [1, 0]];
/** Vizinhos livres e dentro da arena, em grupos O · NO/SO · N/S · NE/SE · L (dentro do grupo, o mais próximo de `from` primeiro). */
export function engagementSlots(target: Cell, occupied: ReadonlySet<string>, from: Cell = { c: target.c - 3, r: target.r }): Cell[] {
  const dist = (n: Cell) => Math.hypot(n.c - from.c, n.r - from.r);
  const group = [0, 1, 1, 2, 2, 3, 3, 4];
  return NEIGHBORS.map(([dc, dr], i) => ({ cell: { c: target.c + dc, r: target.r + dr }, i }))
    .filter(({ cell }) => inArena(cell) && !occupied.has(cellKey(cell)))
    .sort((a, b) => group[a.i] - group[b.i] || dist(a.cell) - dist(b.cell) || a.i - b.i).map(({ cell }) => cell);
}
export const isBoxFull = (target: Cell, occupied: ReadonlySet<string>) => engagementSlots(target, occupied).length === 0;

/** Obstáculos: poucos blocos na faixa do meio (colunas 4 a 8), um desenho por wave; sempre deixam um corredor livre. */
export const OBSTACLE_LAYOUTS: Cell[][] = [
  [{ c: 5, r: 2 }, { c: 5, r: 5 }],
  [{ c: 4, r: 1 }, { c: 6, r: 3 }, { c: 4, r: 6 }],
  [{ c: 5, r: 3 }, { c: 5, r: 4 }, { c: 7, r: 1 }, { c: 7, r: 6 }],
  [{ c: 4, r: 2 }, { c: 6, r: 2 }, { c: 6, r: 5 }, { c: 4, r: 5 }, { c: 8, r: 3 }],
  [{ c: 5, r: 1 }, { c: 5, r: 2 }, { c: 7, r: 4 }, { c: 7, r: 5 }, { c: 4, r: 6 }],
  [{ c: 4, r: 3 }, { c: 4, r: 4 }, { c: 7, r: 2 }, { c: 7, r: 5 }, { c: 8, r: 0 }, { c: 8, r: 7 }],
];
/** Obstáculos da wave `wave` (0-based; a última wave de qualquer hunt usa o desenho do chefe, o 6º). */
export const obstacleCells = (wave: number, isBoss = false): Cell[] => OBSTACLE_LAYOUTS[isBoss ? OBSTACLE_LAYOUTS.length - 1 : wave % (OBSTACLE_LAYOUTS.length - 1)];

/** Menor caminho (8 vizinhos, sem cortar quina de obstáculo) entre duas células, ignorando `blocked`; vazio se não houver. `size` 2 = bloco 2×2 (a célula é o canto de cima à esquerda). */
export function findPath(from: Cell, to: Cell, blocked: ReadonlySet<string>, size = 1): Cell[] {
  const foot = (c: Cell) => Array.from({ length: size * size }, (_, i) => ({ c: c.c + i % size, r: c.r + Math.floor(i / size) }));
  const free = (c: Cell) => foot(c).every(f => inArena(f) && !blocked.has(cellKey(f)));
  if (cellKey(from) === cellKey(to)) return [from];
  const prev = new Map<string, Cell | null>([[cellKey(from), null]]), queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const n = { c: cur.c + dc, r: cur.r + dr }, key = cellKey(n);
      if (prev.has(key) || (key !== cellKey(to) && !free(n)) || !foot(n).every(inArena)) continue;
      if (dc && dr && (!free({ c: cur.c + dc, r: cur.r }) || !free({ c: cur.c, r: cur.r + dr }))) continue;
      prev.set(key, cur); if (key === cellKey(to)) { const out: Cell[] = []; for (let c: Cell | null = n; c; c = prev.get(cellKey(c)) ?? null) out.unshift(c); return out; }
      queue.push(n);
    }
  }
  return [];
}
