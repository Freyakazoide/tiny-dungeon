import type { Scene } from 'phaser';
import { CHARACTER_ANIMATION_FPS } from '../assets';
import { HUNTS } from '../data/hunts';
import { ART } from './data';
import { ART_SCALE } from './geometry';
import { lookKey, normalizeLook, type Look } from './look';
import { cellRaster, frameRaster, mapRaster, outline, rasterize, rasterToCanvas, toPixels, type Direction } from './render';

/** `Phaser.Textures.FilterMode.NEAREST` (importar o Phaser aqui o carregaria nos testes). */
const FILTER_NEAREST = 1;
export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];
export const MAX_LOOKS = 32;
export const mapTexture = (huntId: string) => `art-map-${huntId}`;
/** Células do corredor (32×32 de arte): 4 pisos, parede, parede com tocha e topo do muro. */
export const CELL_KINDS = ['floor0', 'floor1', 'floor2', 'floor3', 'wall', 'torch', 'top', 'fill'] as const;
export type CellKind = (typeof CELL_KINDS)[number];
export const cellTexture = (huntId: string, kind: CellKind) => `art-cell-${huntId}-${kind}`;
const CELL_TILES: Record<CellKind, [string, string, string, string]> = {
  floor0: ['piso', 'piso', 'piso', 'piso'], floor1: ['piso', 'piso', 'piso', 'piso_rachado'], floor2: ['piso', 'piso_ossos', 'piso', 'piso'], floor3: ['piso_rachado', 'piso', 'piso', 'piso'],
  wall: ['parede', 'parede', 'parede', 'parede'], torch: ['parede', 'parede_tocha', 'parede', 'parede'], top: ['muro_topo', 'muro_topo', 'muro_topo', 'muro_topo'], fill: ['piso', 'piso_rachado', 'piso', 'piso'],
};
/** Lápide de quem caiu na arena: pedra com uma cruz; o contorno vem do motor de arte. */
export const TOMBSTONE_TEXTURE = 'art-tombstone';
const TOMBSTONE = ['....1111....', '..11222211..', '.1122222211.', '.1222332221.', '.1222332221.', '.1223333221.', '.1223333221.', '.1222332221.', '.1222332221.', '.1222222221.', '.1222222221.', '.1111111111.', '333333333333'];
export const tombstoneGrid = (): string[][] => { const w = TOMBSTONE[0].length + 2, pad = Array<string>(w).fill('.'); return [pad, ...TOMBSTONE.map(r => ['.', ...r, '.']), [...pad]]; };
/** Armadilha de espinhos (célula de 32×32 de arte): placa escura com 9 espetos de aço. */
export const TRAP_TEXTURE = 'art-trap';
export function trapGrid(): string[][] {
  const g = Array.from({ length: 32 }, () => Array<string>(32).fill('.'));
  for (let y = 3; y < 29; y++) for (let x = 3; x < 29; x++) g[y][x] = (x + y) % 11 === 0 ? '4' : '3';                     // placa de pedra escura
  const spike = ['..T..', '.tTu.', '.tTuu', 'ttTuu', 'ttuuu'];
  for (const [ox, oy] of [[5, 5], [13, 5], [21, 5], [5, 13], [13, 13], [21, 13], [5, 21], [13, 21], [21, 21]]) spike.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch !== '.') g[oy + ry][ox + rx] = ch; }));
  return g;
}
export const obstacleTexture = (id: string) => `art-o-${id}`;
export const monsterTexture = (monsterArtId: string, dir: Direction, pose: 1 | 2) => `art-m-${monsterArtId}-${dir}-${pose}`;
export const characterTexture = (look: Look, dir: Direction, pose: 1 | 2) => `art-c-${lookKey(look)}-${dir}-${pose}`;
export const characterWalkAnim = (look: Look, dir: Direction) => `art-walk-${lookKey(look)}-${dir}`;

const addCanvas = (scene: Scene, key: string, canvas: HTMLCanvasElement) => {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.addCanvas(key, canvas);
  texture?.setFilter(FILTER_NEAREST);
};

/** Mapas das 7 hunts e todos os monstros com arte (síncrono e barato: poucas centenas de pixels por quadro). */
export function ensureArtTextures(scene: Scene) {
  addCanvas(scene, TRAP_TEXTURE, rasterToCanvas(rasterize(outline(toPixels(trapGrid(), ART.palette)))));
  addCanvas(scene, TOMBSTONE_TEXTURE, rasterToCanvas(rasterize(outline(toPixels(tombstoneGrid(), ART.palette)))));
  for (const [id, grid] of Object.entries(ART.obstacles)) addCanvas(scene, obstacleTexture(id), rasterToCanvas(rasterize(outline(toPixels(grid, ART.palette)))));
  for (const hunt of HUNTS) addCanvas(scene, mapTexture(hunt.id), rasterToCanvas(mapRaster(hunt.id, hunt.color)));
  for (const hunt of HUNTS) for (const kind of CELL_KINDS) addCanvas(scene, cellTexture(hunt.id, kind), rasterToCanvas(cellRaster(hunt.id, hunt.color, CELL_TILES[kind], undefined, kind === 'fill' ? .38 : 1)));
  for (const m of ART.meta.filter(m => m.tipo === 'monstro')) for (const dir of DIRECTIONS) for (const pose of [1, 2] as const)
    addCanvas(scene, monsterTexture(m.id, dir, pose), rasterToCanvas(frameRaster('monstros', m.id, dir, pose)));
}

/** Aparências vivas (LRU): ao passar de MAX_LOOKS remove as mais antigas que não estão em uso. */
const live = new Map<string, Look>();
export function ensureLookTextures(scene: Scene, rawLook: Partial<Look>, inUse: ReadonlySet<string> = new Set()): Look {
  const look = normalizeLook(rawLook), key = lookKey(look);
  if (live.has(key)) { live.delete(key); live.set(key, look); }
  else {
    live.set(key, look);
    for (const dir of DIRECTIONS) {
      for (const pose of [1, 2] as const) addCanvas(scene, characterTexture(look, dir, pose), rasterToCanvas(frameRaster('personagens', look.body, dir, pose, look)));
      const animKey = characterWalkAnim(look, dir);
      if (!scene.anims.exists(animKey)) scene.anims.create({ key: animKey, frames: [1, 2].map(p => ({ key: characterTexture(look, dir, p as 1 | 2) })), frameRate: CHARACTER_ANIMATION_FPS, repeat: -1 });
    }
  }
  for (const [oldKey, oldLook] of live) {
    if (live.size <= MAX_LOOKS) break;
    if (oldKey === key || inUse.has(oldKey)) continue;
    live.delete(oldKey);
    for (const dir of DIRECTIONS) { scene.anims.remove(characterWalkAnim(oldLook, dir)); for (const pose of [1, 2] as const) scene.textures.remove(characterTexture(oldLook, dir, pose)); }
  }
  return look;
}
export const artScale = ART_SCALE;
