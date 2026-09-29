import { describe, expect, it } from 'vitest';
import { CHARACTER_ANIMATION_FPS, CHARACTER_DIRECTIONS, CHARACTER_SPRITES, characterAnimationKey, characterFramePath, spriteFilePaths, spriteTexturesReady } from './assets';
import { SPRITES } from './data/sprites';

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

describe('sprites escolhíveis (registro)',()=>{
  it('cada SpriteDef gera 8 caminhos (4 direções × 2 quadros) e chaves de animação únicas',()=>{
    expect(SPRITES.length).toBeGreaterThan(0);
    const animationKeys=new Set<string>(),frameKeys=new Set<string>();
    for(const sprite of SPRITES){
      const paths=spriteFilePaths(sprite.id);
      expect(paths).toHaveLength(8);expect(new Set(paths).size).toBe(8);
      for(const path of paths)expect(path).toMatch(new RegExp(`^characters/${sprite.id}/(down|up|left|right)_[12]\.png$`));
      const asset=CHARACTER_SPRITES[sprite.id];expect(asset).toMatchObject({scale:sprite.scale,origin:sprite.origin});
      for(const direction of CHARACTER_DIRECTIONS){animationKeys.add(characterAnimationKey(sprite.id,direction));for(const key of asset.frames[direction])frameKeys.add(key);}
    }
    expect(animationKeys.size).toBe(SPRITES.length*4);expect(frameKeys.size).toBe(SPRITES.length*8);
  });
  it('a chave do registro é o id do sprite e não uma classe',()=>{
    expect(Object.keys(CHARACTER_SPRITES)).toEqual(SPRITES.map(s=>s.id));
    expect(CHARACTER_SPRITES.squire).toBeUndefined();expect(CHARACTER_SPRITES.necromancer).toBeDefined();
    expect(characterFramePath('archer','left',2)).toBe('characters/archer/left_2.png');
  });
  it('PNG ausente: spriteTexturesReady é falso e o herói cai no bloco, sem exceção',()=>{
    const asset=CHARACTER_SPRITES.necromancer;
    const all=new Set(CHARACTER_DIRECTIONS.flatMap(d=>asset.frames[d]));
    expect(spriteTexturesReady({exists:key=>all.has(key)},asset)).toBe(true);
    all.delete(asset.frames.up[1]);
    expect(spriteTexturesReady({exists:key=>all.has(key)},asset)).toBe(false);
    expect(spriteTexturesReady({exists:()=>false},asset)).toBe(false);
  });
});
