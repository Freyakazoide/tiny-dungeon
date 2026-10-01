import type { CharacterDirection } from '../assets';

export interface ArenaPoint { x:number; y:number; }

/** Direção dominante de um deslocamento (eixo maior vence; parado devolve `fallback`). As posições vêm de art/geometry (células). */
export function dominantDirection(from:ArenaPoint,to:ArenaPoint,fallback:CharacterDirection='up'):CharacterDirection{
  const dx=to.x-from.x,dy=to.y-from.y;
  if(Math.abs(dx)<.5&&Math.abs(dy)<.5)return fallback;
  return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
}
