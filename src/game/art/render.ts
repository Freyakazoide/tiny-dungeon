import { ART, ArtError, type ArtData, type FrameName, type Grid, type Palette } from './data';
import { LOOK_REGIONS, optionsOf, resolveOption, type Look } from './look';
import { pngDataUrl } from './png';

export type Rgb = [number, number, number];
export type Direction = 'down' | 'up' | 'left' | 'right';
export type Tom = 'base' | 'claro' | 'escuro';
export const OUTLINE: Rgb = [10, 12, 16];

export const hexToRgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
export const rgbToHex = ([r, g, b]: Rgb) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
/** Tom de uma cor: `claro` mistura 28% com branco, `escuro` 32% com preto (por canal, arredondado). */
export function toneOf(hex: string, tom: Tom): Rgb {
  const rgb = hexToRgb(hex); if (tom === 'base') return rgb;
  const [target, f] = tom === 'claro' ? [255, .28] : [0, .32];
  return rgb.map(c => Math.round(c + (target - c) * f)) as Rgb;
}

/** Paleta com as três regiões pintadas pelo `look`; só as chaves de `regioes.csv` mudam. */
export function applyLook(palette: Palette, look: Look, data: ArtData = ART): Palette {
  const out: Palette = { ...palette };
  for (const { regiao, chave, tom } of data.regions) {
    if (!(LOOK_REGIONS as readonly string[]).includes(regiao)) continue;
    const option = resolveOption(regiao, look[regiao as keyof Look], data) ?? optionsOf(regiao, data)[0];
    if (option) out[chave] = rgbToHex(toneOf(option.cor, tom));
  }
  return out;
}

export type PixelGrid = (Rgb | null)[][];
export const toPixels = (grid: Grid, palette: Palette): PixelGrid => grid.map(row => row.map(key => { const hex = palette[key]; return hex ? hexToRgb(hex) : null; }));
/** Contorno de 1 px sem aumentar o quadro: célula transparente com vizinho (4-conexo) opaco vira o contorno. */
export function outline(pixels: PixelGrid, color: Rgb = OUTLINE): PixelGrid {
  const h = pixels.length, w = pixels[0]?.length ?? 0;
  return pixels.map((row, y) => row.map((px, x) => px ?? ([[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h && pixels[y + dy][x + dx]) ? color : null)));
}
export const mirror = <T,>(grid: T[][]): T[][] => grid.map(row => [...row].reverse());

export interface Raster { width: number; height: number; data: Uint8ClampedArray }
export function rasterize(pixels: PixelGrid, scale = 1): Raster {
  const h = pixels.length, w = pixels[0]?.length ?? 0, data = new Uint8ClampedArray(w * scale * h * scale * 4);
  for (let y = 0; y < h * scale; y++) for (let x = 0; x < w * scale; x++) {
    const px = pixels[Math.floor(y / scale)][Math.floor(x / scale)], i = (y * w * scale + x) * 4;
    if (px) { data[i] = px[0]; data[i + 1] = px[1]; data[i + 2] = px[2]; data[i + 3] = 255; }
  }
  return { width: w * scale, height: h * scale, data };
}

/** Quadro da grade para uma direção/pose; `left` é o `right` espelhado, salvo se existir `left_N.csv`. */
export function frameGrid(kind: 'personagens' | 'monstros', id: string, dir: Direction, pose: 1 | 2, data: ArtData = ART): Grid {
  const set = data.sprites[kind][id];
  if (!set) throw new ArtError(`arte/${kind}/${id}`, undefined, 'sprite desconhecido');
  const own = set[`${dir}_${pose}` as FrameName];
  if (own) return own;
  if (dir === 'left') { const right = set[`right_${pose}` as FrameName]; if (right) return mirror(right); }
  throw new ArtError(`arte/${kind}/${id}/${dir}_${pose}.csv`, undefined, 'quadro ausente');
}

export function frameRaster(kind: 'personagens' | 'monstros', id: string, dir: Direction, pose: 1 | 2, look?: Look, scale = 1, data: ArtData = ART): Raster {
  const palette = kind === 'personagens' && look ? applyLook(data.palette, look, data) : data.palette;
  return rasterize(outline(toPixels(frameGrid(kind, id, dir, pose, data), palette)), scale);
}

/** Pinta um raster num canvas (só no navegador). */
export function rasterToCanvas(r: Raster): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = r.width; canvas.height = r.height;
  const ctx = canvas.getContext('2d'); if (ctx) { const img = ctx.createImageData(r.width, r.height); img.data.set(r.data); ctx.putImageData(img, 0, 0); }
  return canvas;
}
export const renderFrame = (grid: Grid, palette: Palette): HTMLCanvasElement => rasterToCanvas(rasterize(outline(toPixels(grid, palette))));

/** Mapa da hunt (32×20 tiles de 16 px = 512×320): arquivo próprio; senão a sala das Catacumbas com o tileset da hunt; senão tingida pela cor. */
export function mapRaster(huntId: string, huntColor?: number, data: ArtData = ART, tilesetOverride?: string): Raster {
  const own = data.maps[huntId], map = own ?? data.maps.catacumbas;
  if (!map) throw new ArtError('arte/mapas', undefined, `sem mapa para ${huntId}`);
  const tiles = data.tiles[huntId] ?? data.tiles.catacumbas ?? {};
  const swap = tilesetOverride ? data.tilesets[tilesetOverride] : own ? undefined : data.tilesets[huntId];
  const palette: Palette = { ...data.palette, ...(swap ?? {}) };
  const tint = !own && !swap && huntId !== 'catacumbas' && huntColor !== undefined ? hexToRgb(`#${huntColor.toString(16).padStart(6, '0')}`) : undefined;
  const rows = map.length, cols = map[0].length, out = Array.from({ length: rows * 16 }, () => Array<Rgb | null>(cols * 16).fill(null));
  map.forEach((row, ty) => row.forEach((name, tx) => {
    const px = toPixels(tiles[name], palette);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = px[y][x]; out[ty * 16 + y][tx * 16 + x] = c && tint ? c.map((v, i) => Math.round(v * .55 + tint[i] * .45)) as Rgb : c; }
  }));
  return rasterize(out);
}
/** Célula do corredor (2×2 tiles = 32×32 de arte) montada com os tiles `names` (cima-esq, cima-dir, baixo-esq, baixo-dir), com a paleta/tingimento da hunt. */
export function cellRaster(huntId: string, huntColor: number | undefined, names: [string, string, string, string], data: ArtData = ART): Raster {
  const own = data.maps[huntId], tiles = data.tiles[huntId] ?? data.tiles.catacumbas ?? {};
  const swap = own ? undefined : data.tilesets[huntId], palette: Palette = { ...data.palette, ...(swap ?? {}) };
  const tint = !own && !swap && huntId !== 'catacumbas' && huntColor !== undefined ? hexToRgb(`#${huntColor.toString(16).padStart(6, '0')}`) : undefined;
  const out = Array.from({ length: 32 }, () => Array<Rgb | null>(32).fill(null));
  names.forEach((name, i) => {
    const px = toPixels(tiles[name], palette), ox = (i % 2) * 16, oy = Math.floor(i / 2) * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = px[y][x]; out[oy + y][ox + x] = c && tint ? c.map((v, k) => Math.round(v * .55 + tint[k] * .45)) as Rgb : c; }
  });
  return rasterize(out);
}
export const renderMap = (huntId: string, huntColor?: number) => rasterToCanvas(mapRaster(huntId, huntColor));

const urlCache = new Map<string, string>();
export interface SpriteSpec { kind: 'personagens' | 'monstros'; id: string; look?: Look }
/** Data URL PNG de um quadro para a interface (cache por chave). */
export function frameDataUrl(spec: SpriteSpec, dir: Direction, pose: 1 | 2, scale = 1): string {
  const key = `${spec.kind}.${spec.id}.${spec.look ? `${spec.look.pele}.${spec.look.cabelo}.${spec.look.armadura}` : ''}.${dir}.${pose}.${scale}`;
  let url = urlCache.get(key);
  if (!url) { const r = frameRaster(spec.kind, spec.id, dir, pose, spec.look, scale); url = pngDataUrl(r.width, r.height, r.data); if (urlCache.size > 400) urlCache.clear(); urlCache.set(key, url); }
  return url;
}

const mapUrlCache = new Map<string, string>();
/** Miniatura do mapa da hunt (512×320) como data URL PNG, para a interface. */
export function mapDataUrl(huntId: string, huntColor?: number): string {
  let url = mapUrlCache.get(huntId);
  if (!url) { const r = mapRaster(huntId, huntColor); url = pngDataUrl(r.width, r.height, r.data); mapUrlCache.set(huntId, url); }
  return url;
}
