import { describe, expect, it } from 'vitest';
import { dominantDirection } from './movement';

describe('movimentação visual da arena',()=>{
  it('seleciona as quatro direções e prioriza o eixo dominante em diagonais',()=>{
    expect(dominantDirection({x:0,y:0},{x:0,y:10})).toBe('down');
    expect(dominantDirection({x:0,y:10},{x:0,y:0})).toBe('up');
    expect(dominantDirection({x:0,y:0},{x:-10,y:2})).toBe('left');
    expect(dominantDirection({x:0,y:0},{x:10,y:2})).toBe('right');
    expect(dominantDirection({x:0,y:0},{x:4,y:-10})).toBe('up');
  });
});
