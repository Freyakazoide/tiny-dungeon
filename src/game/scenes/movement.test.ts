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

describe('samplePolyline', () => {
  it('percorre a linha quebrada pelo comprimento e devolve a direção do trecho', async () => {
    const { samplePolyline } = await import('./movement');
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(samplePolyline(pts, 0).point).toEqual({ x: 0, y: 0 }); expect(samplePolyline(pts, 1).point).toEqual({ x: 100, y: 100 });
    expect(samplePolyline(pts, .25)).toEqual({ point: { x: 50, y: 0 }, direction: 'right' }); expect(samplePolyline(pts, .75).direction).toBe('down');
    expect(samplePolyline([{ x: 5, y: 5 }], .5).point).toEqual({ x: 5, y: 5 });
  });
});

describe('stableDirection (quem está parado não vira de lado a cada frame)', () => {
  const o = { x: 0, y: 0 };
  it('mantém o eixo atual com alvo quase na diagonal e só troca quando o outro eixo domina (1,4×)', async () => {
    const { stableDirection } = await import('./movement');
    expect(stableDirection(o, { x: 5, y: 5.5 }, 'right')).toBe('right');
    expect(stableDirection(o, { x: 5, y: 5.5 }, 'down')).toBe('down');
    expect(stableDirection(o, { x: 5, y: 9 }, 'right')).toBe('down');
    expect(stableDirection(o, { x: 9, y: 5 }, 'down')).toBe('right');
  });
  it('alvo colado (menos de meia célula) não muda nada', async () => {
    const { stableDirection } = await import('./movement');
    expect(stableDirection(o, { x: .2, y: -.3 }, 'left')).toBe('left');
  });
});
