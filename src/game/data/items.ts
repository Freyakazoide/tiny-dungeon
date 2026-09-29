import type { ItemDef } from '../core/types';

export const ITEMS: ItemDef[] = [
  {id:'health_potion',name:'Poção de Vida',kind:'supply',rarity:'common',value:12,supply:'health',amount:90},
  {id:'mana_potion',name:'Poção de Mana',kind:'supply',rarity:'common',value:14,supply:'mana',amount:75},
  {id:'great_health_potion',name:'Grande Poção de Vida',kind:'supply',rarity:'uncommon',value:32,supply:'health',amount:190},
  {id:'great_mana_potion',name:'Grande Poção de Mana',kind:'supply',rarity:'uncommon',value:36,supply:'mana',amount:155},
  {id:'bone',name:'Osso Antigo',kind:'loot',rarity:'common',value:3}, {id:'ghoul_flesh',name:'Carne de Ghoul',kind:'loot',rarity:'common',value:7},
  {id:'grave_dust',name:'Pó de Tumba',kind:'loot',rarity:'uncommon',value:13}, {id:'royal_bone',name:'Osso Real',kind:'loot',rarity:'rare',value:55},
  {id:'rusty_sword',name:'Espada Enferrujada',kind:'equipment',rarity:'common',value:22,slot:'weapon',classIds:['squire','knight'],trains:'melee',stats:{attack:5}},
  {id:'iron_sword',name:'Espada de Ferro',kind:'equipment',rarity:'uncommon',value:75,slot:'weapon',classIds:['squire','knight'],level:3,trains:'melee',stats:{attack:10,defense:2}},
  {id:'tower_shield',name:'Escudo Torre',kind:'equipment',rarity:'rare',value:160,slot:'offhand',classIds:['squire','knight'],level:5,stats:{defense:13,resistance:.05}},
  {id:'knuckle_wraps',name:'Faixas de Combate',kind:'equipment',rarity:'common',value:25,slot:'weapon',classIds:['squire','monk'],trains:'melee',stats:{attack:4,attackSpeed:.09}},
  {id:'iron_knuckles',name:'Manoplas de Ferro',kind:'equipment',rarity:'rare',value:145,slot:'weapon',classIds:['monk'],level:4,trains:'melee',stats:{attack:11,crit:.04}},
  {id:'oak_bow',name:'Arco de Carvalho',kind:'equipment',rarity:'common',value:28,slot:'weapon',classIds:['squire','paladin'],trains:'ranged',stats:{attack:6}},
  {id:'sun_bow',name:'Arco Solar',kind:'equipment',rarity:'epic',value:310,slot:'weapon',classIds:['paladin'],level:7,trains:'ranged',stats:{attack:17,crit:.08}},
  {id:'apprentice_staff',name:'Cajado de Aprendiz',kind:'equipment',rarity:'common',value:28,slot:'weapon',classIds:['squire','necromancer','druid'],trains:'melee',stats:{magicPower:6,maxMana:15}},
  {id:'arcane_staff',name:'Cajado Funesto',kind:'equipment',rarity:'epic',value:330,slot:'weapon',classIds:['necromancer'],level:7,stats:{magicPower:20,maxMana:35}},
  {id:'nature_totem',name:'Totem da Natureza',kind:'equipment',rarity:'rare',value:175,slot:'offhand',classIds:['druid'],level:4,stats:{magicPower:12,maxMana:20}},
  {id:'leather_helmet',name:'Capuz de Couro',kind:'equipment',rarity:'common',value:24,slot:'helmet',stats:{defense:3,maxHp:8}},
  {id:'bone_crown',name:'Coroa de Ossos',kind:'equipment',rarity:'epic',value:420,slot:'helmet',level:6,stats:{defense:8,maxHp:35,magicPower:8}},
  {id:'leather_armor',name:'Armadura de Couro',kind:'equipment',rarity:'uncommon',value:65,slot:'armor',stats:{defense:7,maxHp:18}},
  {id:'plate_armor',name:'Armadura de Placas',kind:'equipment',rarity:'rare',value:210,slot:'armor',classIds:['squire','knight'],level:5,stats:{defense:16,maxHp:55}},
  {id:'cloth_robe',name:'Manto Rúnico',kind:'equipment',rarity:'rare',value:185,slot:'armor',classIds:['necromancer','druid'],level:4,stats:{defense:6,maxMana:42,magicPower:7}},
  {id:'traveler_legs',name:'Calças do Viajante',kind:'equipment',rarity:'common',value:23,slot:'legs',stats:{defense:3,maxHp:10}},
  {id:'swift_boots',name:'Botas Ligeiras',kind:'equipment',rarity:'uncommon',value:80,slot:'boots',stats:{defense:3,attackSpeed:.07}},
  {id:'bone_amulet',name:'Amuleto de Osso',kind:'equipment',rarity:'rare',value:155,slot:'amulet',stats:{resistance:.08,maxHp:22}},
  {id:'king_ring',name:'Anel do Rei Morto',kind:'equipment',rarity:'legendary',value:850,slot:'ring',level:8,stats:{attack:12,magicPower:12,crit:.06,resistance:.06}},
  {id:'wooden_shield',name:'Escudo de Madeira',kind:'equipment',rarity:'common',value:15,slot:'offhand',stats:{defense:4}},
  {id:'copper_ring',name:'Anel de Cobre',kind:'equipment',rarity:'common',value:30,slot:'ring',stats:{maxHp:10,maxMana:10}}
];
export const itemById = (id: string) => ITEMS.find(i => i.id === id);
