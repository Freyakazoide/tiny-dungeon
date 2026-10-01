export const CHARACTER_ANIMATION_FPS = 6;
export const CHARACTER_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export type CharacterDirection = typeof CHARACTER_DIRECTIONS[number];

export const ASSETS = {
  monsters: 'shape:circle' as const, // monstros sem arte em CSV usam um círculo com a cor da definição
  effects: { hit:'shape:flash', heal:'shape:text', drop:'shape:text', stairs:'shape:lines' }
} as const;
