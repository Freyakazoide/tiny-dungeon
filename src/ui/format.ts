import type { ItemDef, Slot, Stats } from '../game/core/types';

export const SLOT_IDS:Slot[]=['helmet','armor','legs','boots','weapon','offhand','amulet','ring'];
export const slotNames:Record<Slot,string>={helmet:'Capacete',armor:'Armadura',legs:'Calças',boots:'Botas',weapon:'Arma',offhand:'Mão secundária',amulet:'Amuleto',ring:'Anel'};
export const statNames:Record<keyof Stats,string>={maxHp:'HP máximo',maxMana:'Mana máxima',attack:'Ataque',defense:'Defesa',attackSpeed:'Velocidade',crit:'Crítico',resistance:'Resistência',magicPower:'Poder mágico'};

export const pct=(value:number,total:number)=>Math.max(0,Math.min(100,total>0?value/total*100:0));
export const compact=(value:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:value<10?1:0,notation:value>=10_000?'compact':'standard'}).format(value);
export const duration=(seconds:number)=>{const total=Math.max(0,Math.floor(seconds));const hours=Math.floor(total/3600);const minutes=Math.floor(total%3600/60);const secs=total%60;return hours?`${hours}h ${String(minutes).padStart(2,'0')}m`:`${minutes}m ${String(secs).padStart(2,'0')}s`;};
export const colorHex=(value:number)=>`#${value.toString(16).padStart(6,'0')}`;
export const itemIcon=(item:ItemDef)=>item.supply==='health'?'♥':item.supply==='mana'?'✦':item.kind==='loot'?'◆':item.slot==='weapon'?'⚔':item.slot==='offhand'?'◈':item.slot==='helmet'?'♛':item.slot==='armor'?'▣':item.slot==='boots'?'◒':item.slot==='ring'?'○':item.slot==='amulet'?'◇':'▰';
export const itemDescription=(item:ItemDef)=>item.kind==='supply'?`Consumível que recupera ${item.amount} pontos de ${item.supply==='health'?'vida':'mana'}.`:item.kind==='loot'?'Material encontrado nas catacumbas. Seu valor representa a venda estimada.':`Equipamento de ${item.slot?slotNames[item.slot].toLowerCase():'aventura'} que fortalece os atributos do personagem.`;
