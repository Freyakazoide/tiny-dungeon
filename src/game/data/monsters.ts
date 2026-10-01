import type { MonsterDef, WaveDef } from '../core/types';
import type { ProficiencyId } from '../rpg/proficiencies';
import { huntLoot } from './gear';

const catacombs: Record<string, MonsterDef> = {
  skeleton: { id:'skeleton', name:'Esqueleto', hp:540, attack:11, defense:3, speed:.65, xp:27, gold:[4,12], color:0xb9ae95, location:'Catacumbas',hunt:'catacumbas',weak:['holy'],resist:['poison','death'], loot:[{itemId:'bone',chance:.72,min:1,max:3},{itemId:'rusty_sword',chance:.07,min:1,max:1},{itemId:'health_potion',chance:.12,min:1,max:1}] },
  ghoul: { id:'ghoul', name:'Ghoul', hp:975, attack:17, defense:5, speed:.8, xp:66, gold:[11,22], color:0x689765, location:'Catacumbas',hunt:'catacumbas',weak:['fire','holy'],resist:['poison'], loot:[{itemId:'ghoul_flesh',chance:.65,min:1,max:2},{itemId:'grave_dust',chance:.28,min:1,max:2},{itemId:'mana_potion',chance:.16,min:1,max:1},{itemId:'leather_armor',chance:.06,min:1,max:1}] },
  bone_king: { id:'bone_king', name:'REI DOS OSSOS', hp:2700, attack:23, defense:8, speed:.65, xp:270, gold:[50,85], color:0xb98740, boss:true, location:'Catacumbas',hunt:'catacumbas',weak:['holy'],resist:['death','poison'], loot:[{itemId:'royal_bone',chance:1,min:1,max:2},{itemId:'bone_crown',chance:.22,min:1,max:1},{itemId:'king_ring',chance:.12,min:1,max:1},{itemId:'great_mana_potion',chance:.3,min:1,max:2}] }
};


type Kind = 'common' | 'elite' | 'boss';
interface Row { id: string; name: string; hp: number; attack: number; defense: number; xp: number; gold: number; color: number; weak?: ProficiencyId[]; resist?: ProficiencyId[]; }
const SPEED: Record<Kind, number> = { common: .9, elite: .78, boss: .65 };
/** Monstro de uma hunt nova (valores do plano, ouro médio com variação de ±30%). */
const mob = (huntId: string, location: string, kind: Kind, row: Row): MonsterDef => ({
  id: row.id, name: row.name, hp: row.hp, attack: row.attack, defense: row.defense, speed: SPEED[kind], xp: row.xp,
  gold: [Math.round(row.gold * .7), Math.round(row.gold * 1.3)], color: row.color, boss: kind === 'boss' ? true : undefined,
  loot: huntLoot(huntId, kind), location, hunt: huntId, weak: row.weak, resist: row.resist,
});
const hunt = (huntId: string, location: string, common: Row, elite: Row, boss: Row): MonsterDef[] => [mob(huntId, location, 'common', common), mob(huntId, location, 'elite', elite), mob(huntId, location, 'boss', boss)];

const newMonsters: MonsterDef[] = [
  ...hunt('floresta_sombria', 'Floresta Sombria',
    { id: 'wolf', name: 'Lobo Selvagem', hp: 742, attack: 17, defense: 7, xp: 29, gold: 19, color: 0x8a8f96, weak: ['fire'] },
    { id: 'bandit', name: 'Bandido da Floresta', hp: 1404, attack: 25, defense: 9, xp: 68, gold: 42, color: 0x9c6b4a, weak: ['psychic'] },
    { id: 'spider_queen', name: 'Rainha das Aranhas', hp: 6075, attack: 32, defense: 12, xp: 340, gold: 240, color: 0x5b3f6b, weak: ['fire'], resist: ['poison'] }),
  ...hunt('pantano_toxico', 'Pântano Tóxico',
    { id: 'toxic_toad', name: 'Sapo Venenoso', hp: 1080, attack: 24, defense: 9, xp: 37, gold: 26, color: 0x7faf3a, weak: ['fire'], resist: ['poison'] },
    { id: 'bog_lizard', name: 'Lagarto do Pântano', hp: 1836, attack: 32, defense: 11, xp: 88, gold: 54, color: 0x58803b, weak: ['ice'], resist: ['poison'] },
    { id: 'bog_hydra', name: 'Hidra do Pântano', hp: 7695, attack: 39, defense: 14, xp: 440, gold: 300, color: 0x3f7a4d, weak: ['fire'], resist: ['poison', 'earth'] }),
  ...hunt('minas_esquecidas', 'Minas Esquecidas',
    { id: 'kobold_miner', name: 'Kobold Minerador', hp: 1350, attack: 29, defense: 10, xp: 49, gold: 31, color: 0xb0865a, weak: ['energy'] },
    { id: 'stone_golem', name: 'Golem de Pedra', hp: 2268, attack: 38, defense: 13, xp: 117, gold: 66, color: 0x7b7f86, weak: ['ice'], resist: ['earth'] },
    { id: 'crystal_golem', name: 'Golem de Cristal', hp: 9315, attack: 47, defense: 16, xp: 583, gold: 350, color: 0x7fd4e6, weak: ['physical'], resist: ['energy'] }),
  ...hunt('fortaleza_de_gelo', 'Fortaleza de Gelo',
    { id: 'frost_wolf', name: 'Lobo de Gelo', hp: 1620, attack: 35, defense: 12, xp: 64, gold: 37, color: 0xb8d6ec, weak: ['fire'], resist: ['ice'] },
    { id: 'yeti', name: 'Yeti', hp: 2700, attack: 45, defense: 14, xp: 153, gold: 76, color: 0xe6eef5, weak: ['fire'], resist: ['ice'] },
    { id: 'winter_queen', name: 'Rainha do Inverno', hp: 10935, attack: 54, defense: 18, xp: 766, gold: 410, color: 0x6fa8dc, weak: ['fire', 'holy'], resist: ['ice'] }),
  ...hunt('vulcao_ardente', 'Vulcão Ardente',
    { id: 'salamander', name: 'Salamandra', hp: 1890, attack: 40, defense: 13, xp: 84, gold: 42, color: 0xe2703a, weak: ['ice'], resist: ['fire'] },
    { id: 'lava_golem', name: 'Golem de Lava', hp: 3132, attack: 52, defense: 16, xp: 202, gold: 88, color: 0xc0392b, weak: ['ice'], resist: ['fire'] },
    { id: 'flame_lord', name: 'Senhor das Chamas', hp: 12555, attack: 62, defense: 20, xp: 1008, gold: 470, color: 0xff8c1a, weak: ['ice'], resist: ['fire'] }),
  ...hunt('templo_profano', 'Templo Profano',
    { id: 'dark_cultist', name: 'Cultista Sombrio', hp: 2092, attack: 44, defense: 15, xp: 108, gold: 47, color: 0x6c3a8c, weak: ['holy'], resist: ['death'] },
    { id: 'fallen_angel', name: 'Anjo Caído', hp: 3456, attack: 57, defense: 17, xp: 260, gold: 96, color: 0xb9a6d6, weak: ['energy'], resist: ['holy'] },
    { id: 'profane_high_priest', name: 'Sumo Sacerdote Profano', hp: 13770, attack: 67, defense: 21, xp: 1301, gold: 510, color: 0x4a1f63, weak: ['holy'], resist: ['death'] }),
];

export const MONSTERS: Record<string, MonsterDef> = { ...catacombs, ...Object.fromEntries(newMonsters.map(m => [m.id, m])) };

// Waves originais da Catacumbas (mantido como alias; a fonte de verdade agora é HUNTS em data/hunts.ts).
export const WAVES: WaveDef[] = [
  { name:'Entrada das Catacumbas', monsters:['skeleton','skeleton','skeleton'] },
  { name:'Galeria dos Mortos', monsters:['skeleton','skeleton','skeleton','ghoul'] },
  { name:'Ossuário', monsters:['skeleton','skeleton','skeleton','ghoul','ghoul'] },
  { name:'Corredor das Urnas', monsters:['skeleton','skeleton','skeleton','skeleton','ghoul','ghoul'] },
  { name:'Câmara dos Sepulcros', monsters:['skeleton','skeleton','skeleton','skeleton','ghoul','ghoul','ghoul'] },
  { name:'Tumba do Rei', monsters:['bone_king','skeleton','skeleton','skeleton'] }
];
