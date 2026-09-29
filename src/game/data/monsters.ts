import type { MonsterDef, WaveDef } from '../core/types';

export const MONSTERS: Record<string, MonsterDef> = {
  skeleton: { id:'skeleton', name:'Esqueleto', hp:180, attack:15, defense:3, speed:.65, xp:50, gold:[3,8], color:0xb9ae95, location:'Entrada das Catacumbas', loot:[{itemId:'bone',chance:.72,min:1,max:3},{itemId:'rusty_sword',chance:.07,min:1,max:1},{itemId:'health_potion',chance:.12,min:1,max:1}] },
  ghoul: { id:'ghoul', name:'Ghoul', hp:325, attack:24, defense:5, speed:.8, xp:120, gold:[8,15], color:0x689765, location:'Galeria dos Mortos', loot:[{itemId:'ghoul_flesh',chance:.65,min:1,max:2},{itemId:'grave_dust',chance:.28,min:1,max:2},{itemId:'mana_potion',chance:.16,min:1,max:1},{itemId:'leather_armor',chance:.06,min:1,max:1}] },
  bone_king: { id:'bone_king', name:'REI DOS OSSOS', hp:540, attack:33, defense:8, speed:.65, xp:500, gold:[35,60], color:0xb98740, boss:true, location:'Tumba do Rei', loot:[{itemId:'royal_bone',chance:1,min:1,max:2},{itemId:'bone_crown',chance:.22,min:1,max:1},{itemId:'king_ring',chance:.12,min:1,max:1},{itemId:'great_mana_potion',chance:.3,min:1,max:2}] }
};

// As três waves originais foram preservadas.
export const WAVES: WaveDef[] = [
  { name:'Entrada das Catacumbas', monsters:['skeleton','skeleton','skeleton'] },
  { name:'Galeria dos Mortos', monsters:['skeleton','skeleton','ghoul','ghoul'] },
  { name:'Tumba do Rei', monsters:['bone_king','skeleton','skeleton'] }
];
