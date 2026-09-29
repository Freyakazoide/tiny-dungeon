import { describe, expect, it } from 'vitest';
import { CHARACTER_ANIMATION_FPS, CHARACTER_DIRECTIONS, CHARACTER_SPRITES } from './assets';

describe('sprites de personagens',()=>{
  it('registra duas imagens por direção e mantém a velocidade configurável',()=>{
    const necromancer=CHARACTER_SPRITES.necromancer!;
    expect(CHARACTER_ANIMATION_FPS).toBe(6);
    for(const direction of CHARACTER_DIRECTIONS){
      expect(necromancer.frames[direction]).toHaveLength(2);
      expect(necromancer.frames[direction][0]).toContain(`${direction}-1`);
      expect(necromancer.frames[direction][1]).toContain(`${direction}-2`);
    }
  });
});
