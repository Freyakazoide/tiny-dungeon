import { SPRITES } from './data/sprites';

export const CHARACTER_ANIMATION_FPS = 6;
export const CHARACTER_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export type CharacterDirection = typeof CHARACTER_DIRECTIONS[number];

export interface CharacterSpriteAsset {
  scale: number;
  origin: readonly [number, number];
  frames: Record<CharacterDirection, readonly [string, string]>;
}

const framesFor = (spriteId: string) => Object.fromEntries(CHARACTER_DIRECTIONS.map(direction => [
  direction,
  [`character-${spriteId}-${direction}-1`, `character-${spriteId}-${direction}-2`]
])) as unknown as CharacterSpriteAsset['frames'];

/** Derivado do registro em data/sprites.ts; a chave é o id do sprite (não mais a classe). */
export const CHARACTER_SPRITES: Record<string, CharacterSpriteAsset> = Object.fromEntries(
  SPRITES.map(sprite => [sprite.id, { scale: sprite.scale, origin: sprite.origin, frames: framesFor(sprite.id) }]),
);

export const characterFramePath = (spriteId: string, direction: CharacterDirection, frame: 1 | 2) =>
  `characters/${spriteId}/${direction}_${frame}.png`;

export const characterAnimationKey = (spriteId: string, direction: CharacterDirection) =>
  `character-${spriteId}-walk-${direction}`;

/** Textura do mapa de uma hunt; se o PNG não existir o Preloader gera um placeholder com a mesma chave. */
export const mapKey = (huntId: string) => `map-${huntId}`;
export const mapPath = (map: string) => `maps/${map}.png`;

export const ASSETS = {
  background: { key:'dungeon-bg', path:'assets/bg.png' },
  monsters: 'shape:circle' as const, // todos os monstros usam um círculo com a cor da definição
  effects: { hit:'shape:flash', heal:'shape:text', drop:'shape:text', stairs:'shape:lines' }
} as const;

/** Todos os 8 quadros do sprite existem como textura? (PNG ausente = falso: cai no bloco colorido.) */
export const spriteTexturesReady = (textures: { exists(key: string): boolean }, asset: CharacterSpriteAsset) =>
  CHARACTER_DIRECTIONS.every(direction => asset.frames[direction].every(key => textures.exists(key)));
/** Os 8 caminhos de arquivo de um sprite (4 direções × 2 quadros), relativos a public/assets. */
export const spriteFilePaths = (spriteId: string) => CHARACTER_DIRECTIONS.flatMap(direction => ([1, 2] as const).map(frame => characterFramePath(spriteId, direction, frame)));
