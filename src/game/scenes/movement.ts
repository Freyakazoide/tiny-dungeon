import type { CharacterDirection } from '../assets';

export interface ArenaPoint { x:number; y:number; }

/** Direção dominante de um deslocamento (eixo maior vence; parado devolve `fallback`). As posições vêm de art/geometry (células). */
export function dominantDirection(from:ArenaPoint,to:ArenaPoint,fallback:CharacterDirection='up'):CharacterDirection{
  const dx=to.x-from.x,dy=to.y-from.y;
  if(Math.abs(dx)<.5&&Math.abs(dy)<.5)return fallback;
  return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
}

/** Ponto a uma fração `t` (0…1) do comprimento total de uma linha quebrada, e a direção do trecho em que está. */
export function samplePolyline(points:ArenaPoint[],t:number):{point:ArenaPoint;direction:CharacterDirection}{
  if(points.length<2)return {point:points[0]??{x:0,y:0},direction:'down'};
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);
  let left=Math.max(0,Math.min(1,t))*total;
  for(let i=0;i<lengths.length;i++){
    if(left<=lengths[i]||i===lengths.length-1){const k=lengths[i]?Math.min(1,left/lengths[i]):1,a=points[i],b=points[i+1];return {point:{x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k},direction:dominantDirection(a,b,'down')};}
    left-=lengths[i];
  }
  return {point:points[points.length-1],direction:'down'};
}
