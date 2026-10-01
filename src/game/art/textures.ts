import type { Scene } from 'phaser';
import { CHARACTER_ANIMATION_FPS } from '../assets';
import { HUNTS } from '../data/hunts';
import { ART } from './data';
import { ART_SCALE } from './geometry';
import { lookKey, normalizeLook, type Look } from './look';
import { frameRaster, mapRaster, outline, rasterize, rasterToCanvas, toPixels, type Direction } from './render';

/** `Phaser.Textures.FilterMode.NEAREST` (importar o Phaser aqui o carregaria nos testes). */
const FILTER_NEAREST = 1;
export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];
export const MAX_LOOKS = 32;
export const mapTexture = (huntId: string) => `art-map-${huntId}`;
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
  for (const [id, grid] of Object.entries(ART.obstacles)) addCanvas(scene, obstacleTexture(id), rasterToCanvas(rasterize(outline(toPixels(grid, ART.palette)))));
  for (const hunt of HUNTS) addCanvas(scene, mapTexture(hunt.id), rasterToCanvas(mapRaster(hunt.id, hunt.color)));
  for (const m of ART.meta.filter(m => m.tipo === 'monstro')) for (const dir of DIRECTIONS) for (const pose of [1, 2] as const)
    addCanvas(scene, monsterTexture(m.id, dir, pose), rasterToCanvas(frameRaster('monstros', m.id, dir, pose)));
}

/** Aparências vivas (LRU): ao passar de MAX_LOOKS remove as mais antigas que não estão em uso. */
const live = new Map<string, Look>();
export function ensureLookTextures(scene: Scene, rawLook: Look, inUse: ReadonlySet<string> = new Set()): Look {
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
