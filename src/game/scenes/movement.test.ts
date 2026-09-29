import { describe, expect, it } from 'vitest';
import { combatFormation, dominantDirection } from './movement';

describe('movimentação visual da arena',()=>{
  it('seleciona as quatro direções e prioriza o eixo dominante em diagonais',()=>{
    expect(dominantDirection({x:0,y:0},{x:0,y:10})).toBe('down');
    expect(dominantDirection({x:0,y:10},{x:0,y:0})).toBe('up');
    expect(dominantDirection({x:0,y:0},{x:-10,y:2})).toBe('left');
    expect(dominantDirection({x:0,y:0},{x:10,y:2})).toBe('right');
    expect(dominantDirection({x:0,y:0},{x:4,y:-10})).toBe('up');
  });

  it('posiciona por linha: frente em y 365 e trás em y 468',()=>{
    const formation=combatFormation([{id:'a',row:'front'},{id:'b',row:'front'},{id:'c',row:'back'},{id:'d',row:'back'}]);
    expect(formation.get('a')?.y).toBe(365);expect(formation.get('b')?.y).toBe(365);
    expect(formation.get('c')?.y).toBe(468);expect(formation.get('d')?.y).toBe(468);
    expect(formation.get('a')!.y).toBeLessThan(formation.get('c')!.y);
  });
});
