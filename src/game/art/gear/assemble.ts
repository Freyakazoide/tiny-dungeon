import { rasterize, type PixelGrid, type Raster } from '../render';
import { pngDataUrl } from '../png';
import { materialOf, roleColor, hex, type Material, type Rgb } from './materials';
import { checkPart, type Family, type PartDef, type Point, type Template } from './parts';
import { partOf, TEMPLATES } from './catalog';
import type { Role } from './roles';

export interface SlotPick { parte: string; material: string }
/** Receita: que parte e que material entram em cada slot da família. Item = receita (a raridade só escolhe a receita). */
export interface Recipe { id: string; nome: string; familia: Family; partes: Record<string, SlotPick> }

export interface Cell { role: Role; mat: Material; slot: string }
export interface Layout { width: number; height: number; cells: (Cell | null)[][] }

const flipV = (p: PartDef): PartDef => ({ ...p, grid: [...p.grid].reverse(), anchors: Object.fromEntries(Object.entries(p.anchors).map(([k, [x, y]]) => [k, [x, p.grid.length - 1 - y] as Point])) });
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];

interface Placed { slot: string; def: PartDef; mat: Material; pos: Point }

function line(a: Point, b: Point): Point[] {
  const out: Point[] = []; let [x, y] = a; const dx = Math.abs(b[0] - x), dy = -Math.abs(b[1] - y), sx = x < b[0] ? 1 : -1, sy = y < b[1] ? 1 : -1; let err = dx + dy;
  for (;;) { out.push([x, y]); if (x === b[0] && y === b[1]) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; } }
  return out;
}

/** Junta as partes da receita pelos pontos de encaixe e devolve a grade de papéis + material (ainda sem contorno). */
export function assemble(recipe: Recipe, templates: Record<Family, Template> = TEMPLATES): Layout {
  const tpl = templates[recipe.familia];
  const placed = new Map<string, Placed>();
  const make = (slot: string): Omit<Placed, 'pos'> | undefined => {
    const def = tpl.slots.find(s => s.slot === slot); if (!def) throw new Error(`${recipe.id}: slot desconhecido ${slot}`);
    const src = def.espelhaDe ?? slot, pick = recipe.partes[src];
    if (!pick) { if (def.opcional) return undefined; throw new Error(`${recipe.id}: falta o slot ${src}`); }
    const part = partOf(recipe.familia, src, pick.parte); if (!part) throw new Error(`${recipe.id}: parte ${recipe.familia}/${src}/${pick.parte} não existe`);
    return { slot, def: def.espelhaDe ? flipV(part) : part, mat: materialOf(pick.material) };
  };
  const root = make(tpl.raiz); if (!root) throw new Error(`${recipe.id}: slot raiz ausente`);
  placed.set(tpl.raiz, { ...root, pos: [0, 0] });
  for (let pending = [...tpl.joins], guard = 0; pending.length && guard < 20; guard++) {
    const rest = [];
    for (const j of pending) {
      const parent = placed.get(j.em); if (!parent) { rest.push(j); continue; }
      const piece = make(j.slot); if (!piece) continue;
      const anchorHere = piece.def.anchors[j.ancora], anchorThere = parent.def.anchors[j.emAncora];
      if (!anchorHere || !anchorThere) throw new Error(`${recipe.id}: anchor ${j.slot}.${j.ancora} ou ${j.em}.${j.emAncora} não existe`);
      placed.set(j.slot, { ...piece, pos: sub(add(parent.pos, anchorThere), anchorHere) });
    }
    pending = rest;
  }
  for (const s of tpl.slots) { // partes de linha (corda) não têm posição: a linha usa os anchors das outras partes
    const piece = make(s.slot); if (piece?.def.linha !== undefined) placed.set(s.slot, { ...piece, pos: [0, 0] });
  }
  for (const s of tpl.slots) { // efeitos: alinhados ao alvo que a própria parte declara
    if (placed.has(s.slot)) continue;
    const piece = make(s.slot); if (!piece?.def.alvo) continue;
    const { slot, ancora, ref } = piece.def.alvo, target = placed.get(slot);
    if (!target) continue;
    placed.set(s.slot, { ...piece, pos: sub(add(target.pos, target.def.anchors[ancora]), piece.def.anchors[ref]) });
  }

  // limites
  const strokes = (tpl.linhas ?? []).map(l => {
    const a = placed.get(l.de.split('.')[0]), b = placed.get(l.ate.split('.')[0]), cord = placed.get(l.slot);
    if (!a || !b || !cord?.def.linha) throw new Error(`${recipe.id}: linha ${l.de}→${l.ate} sem corda`);
    const pa = add(a.pos, a.def.anchors[l.de.split('.')[1]]), pb = add(b.pos, b.def.anchors[l.ate.split('.')[1]]);
    return { pts: line(pa, pb), roles: cord.def.linha, mat: cord.mat, slot: l.slot };
  });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const p of placed.values()) if (!p.def.linha) { grow(p.pos[0], p.pos[1]); grow(p.pos[0] + p.def.grid[0].length - 1, p.pos[1] + p.def.grid.length - 1); }
  for (const s of strokes) for (const [x, y] of s.pts) grow(x, y);
  const M = 1, ox = M - x0, oy = M - y0, width = x1 - x0 + 1 + 2 * M, height = y1 - y0 + 1 + 2 * M;
  const cells: (Cell | null)[][] = Array.from({ length: height }, () => Array<Cell | null>(width).fill(null));
  const paint = (x: number, y: number, role: Role, mat: Material, slot: string) => { if (x >= 0 && y >= 0 && x < width && y < height) cells[y][x] = { role, mat, slot }; };

  const order = [...tpl.ordem];
  for (const slot of order) {
    const p = placed.get(slot); if (!p) continue;
    if (p.def.linha) continue;
    const fx = p.def.alvo;
    p.def.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const gx = p.pos[0] + x + ox, gy = p.pos[1] + y + oy;
      if (fx?.modo === 'dentro' && cells[gy]?.[gx]?.slot !== fx.slot) return;
      if (fx?.modo === 'fora' && cells[gy]?.[gx]) return;
      const liquid = p.def.fonteLiquido && recipe.partes[p.def.fonteLiquido] && (ch === 'l' || ch === 'L' || ch === 'd');
      paint(gx, gy, ch as Role, liquid ? materialOf(recipe.partes[p.def.fonteLiquido!].material) : p.mat, slot);
    }));
  }
  // cordas por baixo das demais partes: pintadas antes e depois sobrescritas
  if (strokes.length) {
    const under: (Cell | null)[][] = cells.map(r => [...r]);
    for (const row of cells) row.fill(null);
    for (const s of strokes) s.pts.forEach(([x, y], i) => paint(x + ox, y + oy, s.roles[i % s.roles.length] as Role, s.mat, s.slot));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (under[y][x]) cells[y][x] = under[y][x];
  }
  return { width, height, cells };
}

/**
 * Contorno automático pela silhueta final: pixel vazio com vizinho (4-conexo) pintado.
 * Borda de baixo/direita (luz vem de cima e da esquerda) → `deep` do material vizinho; borda de cima/esquerda → `rim` (lateral colorido).
 * Se o pixel toca as duas bordas, o profundo vence.
 */
export function colorize(layout: Layout): PixelGrid {
  const { width, height, cells } = layout;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < width && y < height ? cells[y][x] : null);
  return cells.map((row, y) => row.map((c, x): Rgb | null => {
    if (c) return roleColor(c.mat, c.role);
    let deep: Material | undefined, rim: Material | undefined;
    // vizinho abaixo/à direita ⇒ este pixel é a borda de cima/esquerda (rim); acima/à esquerda ⇒ borda de baixo/direita (deep)
    for (const [dx, dy] of [[0, 1], [1, 0]]) { const n = at(x + dx, y + dy); if (n) rim ??= n.mat; }
    for (const [dx, dy] of [[0, -1], [-1, 0]]) { const n = at(x + dx, y + dy); if (n) deep ??= n.mat; }
    if (deep) return hex(deep.deep);
    if (rim) return hex(rim.rim);
    return null;
  }));
}

export const gearPixels = (recipe: Recipe): PixelGrid => colorize(assemble(recipe));
/** Tamanho final (com a margem do contorno) em pixels de arte. */
export const gearSize = (recipe: Recipe) => { const { width, height } = assemble(recipe); return { w: width, h: height }; };
export const gearRaster = (recipe: Recipe, scale = 1): Raster => rasterize(gearPixels(recipe), scale);

export const recipeKey = (recipe: Recipe): string => {
  const tpl = TEMPLATES[recipe.familia];
  return `${recipe.familia}|${tpl.slots.filter(s => recipe.partes[s.slot]).map(s => `${s.slot}=${recipe.partes[s.slot].parte}:${recipe.partes[s.slot].material}`).join('|')}`;
};
const urlCache = new Map<string, string>();
/** Data URL PNG da receita (cache pela chave visual: família + partes + materiais). */
export function gearDataUrl(recipe: Recipe, scale = 1): string {
  const key = `${recipeKey(recipe)}@${scale}`; let url = urlCache.get(key);
  if (!url) { const r = gearRaster(recipe, scale); url = pngDataUrl(r.width, r.height, r.data); if (urlCache.size > 600) urlCache.clear(); urlCache.set(key, url); }
  return url;
}

/** Todas as partes de um catálogo passam na validação? Devolve as mensagens de erro. */
export const validateParts = (parts: PartDef[]): string[] => parts.map(checkPart).filter(Boolean);
