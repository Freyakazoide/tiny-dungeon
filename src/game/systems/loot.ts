import { STACK_MAX } from '../data/balance';
import { itemById } from '../data/items';
import type { GameState, InventoryStack, ItemDef, MonsterDef } from '../core/types';

export const randomInt=(min:number,max:number,rng=Math.random)=>Math.floor(rng()*(max-min+1))+min;
export function containerFor(item: ItemDef) { return item.kind==='supply'?'supply':item.kind==='loot'?'loot':'bp' as const; }
/** Espaços ocupados: cada pilha usa ceil(quantidade / STACK_MAX). */
export const slotsUsed=(list:InventoryStack[])=>list.reduce((n,x)=>n+Math.ceil(x.quantity/STACK_MAX),0);
export function addItem(state:GameState,itemId:string,qty:number) {
  const item=itemById(itemId); if(!item) return 0; const container=containerFor(item); const list=state.inventory[container];
  const stack=list.find(x=>x.itemId===itemId);
  // bp e loot: a capacidade é em espaços (itens iguais empilham); suprimentos continuam contando unidades
  const accepted=container==='supply'?Math.max(0,Math.min(qty,state.inventory.capacity[container]-list.reduce((n,x)=>n+x.quantity,0))):Math.max(0,Math.min(qty,(stack?Math.ceil(stack.quantity/STACK_MAX)*STACK_MAX-stack.quantity:0)+(state.inventory.capacity[container]-slotsUsed(list))*STACK_MAX));
  if(!accepted) return 0; if(stack) stack.quantity+=accepted; else list.push({itemId,quantity:accepted});
  if(container==='bp'){const fresh=state.freshItems??(state.freshItems=[]);if(!fresh.includes(itemId))fresh.push(itemId);}
  return accepted;
}
export function removeItem(list:InventoryStack[],itemId:string,qty=1){ const s=list.find(x=>x.itemId===itemId); if(!s||s.quantity<qty)return false; s.quantity-=qty;if(!s.quantity)list.splice(list.indexOf(s),1);return true; }
export function rollLoot(state:GameState,monster:MonsterDef,rng=Math.random,chanceMult=1){
  const found:{itemId:string;quantity:number}[]=[];
  for(const entry of monster.loot) if(rng()<=Math.min(1,entry.chance*chanceMult)){const quantity=addItem(state,entry.itemId,randomInt(entry.min,entry.max,rng));if(quantity){found.push({itemId:entry.itemId,quantity});state.analyzer.loot[entry.itemId]=(state.analyzer.loot[entry.itemId]??0)+quantity;state.analyzer.lootValue+=(itemById(entry.itemId)?.value??0)*quantity;}}
  return found;
}
