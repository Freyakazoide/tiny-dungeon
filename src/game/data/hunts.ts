import type { WaveDef } from '../core/types';
import { WAVES as CATACOMBS_WAVES } from './monsters';

export interface HuntDef {
  id: string;
  name: string;
  /** Arquivo em public/assets/maps/<map>.png (sem extensão). Ausente: o jogo gera um placeholder. */
  map: string;
  /** Nível mínimo sugerido (só para aviso: qualquer hunt pode ser escolhida). */
  minLevel: number;
  recommendedLevel: number;
  /** 3 waves; a última é a do boss. */
  waves: WaveDef[];
  /** XP/h e ouro/h de referência (usados no crédito offline enquanto não há medição própria). */
  refXpPerHour: number; refGoldPerHour: number;
  /** Cor do placeholder quando a imagem não existe. */
  color: number;
}

/** W1 = A A A A · W2 = A A B B · W3 = Boss A A (A = comum, B = elite). */
const waves = (names: [string, string, string], common: string, elite: string, boss: string): WaveDef[] => [
  { name: names[0], monsters: [common, common, common, common] },
  { name: names[1], monsters: [common, common, elite, elite] },
  { name: names[2], monsters: [boss, common, common] },
];

export const HUNTS: HuntDef[] = [
  { id: 'catacumbas', refXpPerHour: 24000, refGoldPerHour: 5000, name: 'Catacumbas', map: 'catacumbas', minLevel: 1, recommendedLevel: 1, color: 0x3b3a44, waves: CATACOMBS_WAVES },
  { id: 'floresta_sombria', refXpPerHour: 28000, refGoldPerHour: 20000, name: 'Floresta Sombria', map: 'floresta_sombria', minLevel: 7, recommendedLevel: 8, color: 0x1f3b2a,
    waves: waves(['Clareira Sombria', 'Trilha das Raízes', 'Covil das Teias'], 'wolf', 'bandit', 'spider_queen') },
  { id: 'pantano_toxico', refXpPerHour: 35000, refGoldPerHour: 24000, name: 'Pântano Tóxico', map: 'pantano_toxico', minLevel: 12, recommendedLevel: 13, color: 0x3a5a1e,
    waves: waves(['Margem Borbulhante', 'Ruínas Afundadas', 'Ninho da Hidra'], 'toxic_toad', 'bog_lizard', 'bog_hydra') },
  { id: 'minas_esquecidas', refXpPerHour: 44000, refGoldPerHour: 27000, name: 'Minas Esquecidas', map: 'minas_esquecidas', minLevel: 16, recommendedLevel: 17, color: 0x4a3c2a,
    waves: waves(['Galeria Principal', 'Veios de Cristal', 'Câmara do Golem'], 'kobold_miner', 'stone_golem', 'crystal_golem') },
  { id: 'fortaleza_de_gelo', refXpPerHour: 55000, refGoldPerHour: 30000, name: 'Fortaleza de Gelo', map: 'fortaleza_de_gelo', minLevel: 20, recommendedLevel: 21, color: 0x2c4a66,
    waves: waves(['Pátio Congelado', 'Salão dos Estandartes', 'Trono do Inverno'], 'frost_wolf', 'yeti', 'winter_queen') },
  { id: 'vulcao_ardente', refXpPerHour: 69000, refGoldPerHour: 32000, name: 'Vulcão Ardente', map: 'vulcao_ardente', minLevel: 24, recommendedLevel: 25, color: 0x5a2416,
    waves: waves(['Borda da Cratera', 'Rios de Lava', 'Coração do Vulcão'], 'salamander', 'lava_golem', 'flame_lord') },
  { id: 'templo_profano', refXpPerHour: 86000, refGoldPerHour: 34000, name: 'Templo Profano', map: 'templo_profano', minLevel: 27, recommendedLevel: 28, color: 0x35204a,
    waves: waves(['Nave Corrompida', 'Altares Profanados', 'Santuário do Sumo Sacerdote'], 'dark_cultist', 'fallen_angel', 'profane_high_priest') },
];
export const HUNT_BY_ID: Record<string, HuntDef> = Object.fromEntries(HUNTS.map(h => [h.id, h]));
export const DEFAULT_HUNT = 'catacumbas';
export const huntWaves = (huntId: string) => (HUNT_BY_ID[huntId] ?? HUNT_BY_ID[DEFAULT_HUNT]).waves;
/** Nome do boss (primeiro monstro da última wave) — usado nos banners. */
export const bossIdOf = (huntId: string) => huntWaves(huntId)[huntWaves(huntId).length - 1].monsters[0];

export type HuntRisk = 'Tranquila' | 'Adequada' | 'Arriscada' | 'Suicida';
/** Etiqueta pelo nível médio da party contra o recomendado: sem bloqueio, só aviso. */
export function huntRisk(averageLevel: number, recommendedLevel: number): HuntRisk {
  if (averageLevel < recommendedLevel - 8) return 'Suicida';
  if (averageLevel < recommendedLevel - 2) return 'Arriscada';
  if (averageLevel < recommendedLevel + 3) return 'Adequada';
  return 'Tranquila';
}
