import type { Character } from '../core/types';
import type { CharacterDirection } from '../assets';

export interface ArenaPoint { x:number; y:number; }

export function dominantDirection(from:ArenaPoint,to:ArenaPoint,fallback:CharacterDirection='up'):CharacterDirection{
  const dx=to.x-from.x,dy=to.y-from.y;
  if(Math.abs(dx)<.5&&Math.abs(dy)<.5)return fallback;
  return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
}

function rowPositions(count:number,y:number,spacing:number):ArenaPoint[]{
  return Array.from({length:count},(_,index)=>({x:512+(index-(count-1)/2)*spacing,y}));
}

export function combatFormation(team:Pick<Character,'id'|'row'>[]):Map<string,ArenaPoint>{
  const melee=team.filter(character=>character.row==='front');
  const ranged=team.filter(character=>character.row==='back');
  const result=new Map<string,ArenaPoint>();
  rowPositions(melee.length,365,118).forEach((point,index)=>result.set(melee[index].id,point));
  rowPositions(ranged.length,468,118).forEach((point,index)=>result.set(ranged[index].id,point));
  return result;
}

export function entranceFormation(team:Pick<Character,'id'>[]):Map<string,ArenaPoint>{
  const result=new Map<string,ArenaPoint>();
  rowPositions(team.length,570,110).forEach((point,index)=>result.set(team[index].id,point));
  return result;
}

export function stairFormation(team:Pick<Character,'id'>[]):Map<string,ArenaPoint>{
  const result=new Map<string,ArenaPoint>();
  rowPositions(team.length,145,54).forEach((point,index)=>result.set(team[index].id,point));
  return result;
}
