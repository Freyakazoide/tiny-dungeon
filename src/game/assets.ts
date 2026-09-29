import type { ClassId } from './core/types';

export const CHARACTER_ANIMATION_FPS = 6;
export const CHARACTER_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export type CharacterDirection = typeof CHARACTER_DIRECTIONS[number];

export interface CharacterSpriteAsset {
  scale: number;
  origin: readonly [number, number];
  frames: Record<CharacterDirection, readonly [string, string]>;
}

const necromancerFrames = Object.fromEntries(CHARACTER_DIRECTIONS.map(direction => [
  direction,
  [`character-necromancer-${direction}-1`, `character-necromancer-${direction}-2`]
])) as unknown as CharacterSpriteAsset['frames'];

export const CHARACTER_SPRITES: Partial<Record<ClassId, CharacterSpriteAsset>> = {
  // Os quadros variam entre 220–252 × 328–351 px. Uma escala única preserva
  // as proporções, e a origem baixa mantém os pés alinhados entre direções.
  necromancer: { scale: .18, origin: [.5, .88], frames: necromancerFrames }
};

export const characterFramePath = (classId: ClassId, direction: CharacterDirection, frame: 1 | 2) =>
  `characters/${classId}/${direction}_${frame}.png`;

export const characterAnimationKey = (classId: ClassId, direction: CharacterDirection) =>
  `character-${classId}-walk-${direction}`;

/** Textura do mapa de uma hunt; se o PNG não existir o Preloader gera um placeholder com a mesma chave. */
export const mapKey = (huntId: string) => `map-${huntId}`;
export const mapPath = (map: string) => `maps/${map}.png`;

export const ASSETS = {
  background: { key:'dungeon-bg', path:'assets/bg.png' },
  characters: {
    knight:null, monk:null, paladin:null, necromancer:CHARACTER_SPRITES.necromancer, druid:null
  },
  monsters: 'shape:circle' as const, // todos os monstros usam um círculo com a cor da definição
  effects: { hit:'shape:flash', heal:'shape:text', drop:'shape:text', stairs:'shape:lines' }
} as const;
