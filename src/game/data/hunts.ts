import type { WaveDef } from '../core/types';
import { WAVES as CATACOMBS_WAVES } from './monsters';
import { EARLY_EXTRAS, type ExtraRow } from './balance';

export interface HuntDef {
  id: string;
  name: string;
  /** Nome do mapa em `arte/mapas/<map>.csv`; sem arquivo próprio, usa a sala das Catacumbas recolorida (`arte/tilesets.csv`). */
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
  /** Multiplicadores de HP e ataque dos monstros desta hunt (por cima do `runtime`). Padrão 1. */
  monsterScale?: { hp: number; atk: number };
  /** Tabela de reforços das waves normais (sobrepõe WAVE_EXTRAS) e multiplicador do número sorteado. */
  extrasTable?: ExtraRow[];
  extrasScale?: number;
  /** Multiplicador de XP e ouro no corredor (ajuste fino do ritmo da hunt). Padrão 1. */
  rewardScale?: number;
}

/** 5 waves + chefe: W1 3A · W2 3A 1B · W3 3A 2B · W4 4A 2B · W5 4A 3B · Boss + 3A (A = comum, B = elite). */
const waves = (names: [string, string, string, string, string, string], common: string, elite: string, boss: string): WaveDef[] => {
  const mix = (a: number, b: number) => [...Array(a).fill(common), ...Array(b).fill(elite)] as string[];
  return [
    { name: names[0], monsters: mix(3, 0) }, { name: names[1], monsters: mix(3, 1) }, { name: names[2], monsters: mix(3, 2) },
    { name: names[3], monsters: mix(4, 2) }, { name: names[4], monsters: mix(4, 3) }, { name: names[5], monsters: [boss, ...mix(3, 0)] },
  ];
};

export const HUNTS: HuntDef[] = [
  { id: 'catacumbas', refXpPerHour: 24000, refGoldPerHour: 5000, name: 'Catacumbas', map: 'catacumbas', minLevel: 1, recommendedLevel: 1, color: 0x3b3a44, rewardScale: .5, waves: CATACOMBS_WAVES },
  { id: 'floresta_sombria', refXpPerHour: 28000, refGoldPerHour: 20000, name: 'Floresta Sombria', map: 'floresta_sombria', minLevel: 7, recommendedLevel: 8, color: 0x1f3b2a,
    waves: waves(['Clareira Sombria', 'Trilha das Raízes', 'Bosque Retorcido', 'Toca dos Lobos', 'Fronteira das Teias', 'Covil das Teias'], 'wolf', 'bandit', 'spider_queen') },
  { id: 'pantano_toxico', refXpPerHour: 35000, refGoldPerHour: 24000, name: 'Pântano Tóxico', map: 'pantano_toxico', minLevel: 12, recommendedLevel: 13, color: 0x3a5a1e,
    waves: waves(['Margem Borbulhante', 'Ruínas Afundadas', 'Lodaçal Fétido', 'Ilha das Raízes', 'Poço de Névoa', 'Ninho da Hidra'], 'toxic_toad', 'bog_lizard', 'bog_hydra') },
  { id: 'minas_esquecidas', refXpPerHour: 44000, refGoldPerHour: 27000, name: 'Minas Esquecidas', map: 'minas_esquecidas', minLevel: 16, recommendedLevel: 17, color: 0x4a3c2a,
    waves: waves(['Galeria Principal', 'Túnel Desabado', 'Veios de Cristal', 'Forja Abandonada', 'Salão das Colunas', 'Câmara do Golem'], 'kobold_miner', 'stone_golem', 'crystal_golem') },
  { id: 'fortaleza_de_gelo', refXpPerHour: 55000, refGoldPerHour: 30000, name: 'Fortaleza de Gelo', map: 'fortaleza_de_gelo', minLevel: 20, recommendedLevel: 21, color: 0x2c4a66,
    waves: waves(['Pátio Congelado', 'Ponte de Gelo', 'Salão dos Estandartes', 'Armaria Gelada', 'Corredor das Estátuas', 'Trono do Inverno'], 'frost_wolf', 'yeti', 'winter_queen') },
  { id: 'vulcao_ardente', refXpPerHour: 69000, refGoldPerHour: 32000, name: 'Vulcão Ardente', map: 'vulcao_ardente', minLevel: 24, recommendedLevel: 25, color: 0x5a2416,
    waves: waves(['Borda da Cratera', 'Passagem de Cinzas', 'Rios de Lava', 'Câmara de Obsidiana', 'Fornalha Viva', 'Coração do Vulcão'], 'salamander', 'lava_golem', 'flame_lord') },
  { id: 'templo_profano', refXpPerHour: 86000, refGoldPerHour: 34000, name: 'Templo Profano', map: 'templo_profano', minLevel: 27, recommendedLevel: 28, color: 0x35204a,
    waves: waves(['Nave Corrompida', 'Claustro Sombrio', 'Altares Profanados', 'Cripta dos Votos', 'Escadaria Negra', 'Santuário do Sumo Sacerdote'], 'dark_cultist', 'fallen_angel', 'profane_high_priest') },
];
/**
 * Dificuldade por hunt (Fase 7, bloco B2): HP × e ataque × dos monstros. Começo gentil nas Catacumbas; o resto foi calibrado no harness
 * (Guerreiro/Caçador/Mago com o conjunto da hunt e talentos gastos, reforços ligados, semente fixa) para XP/h ≈ 1,2× o alvo e custo de poção
 * de 15% a 25% do ouro. Atenção ao "joelho": acima de ~1,5 de ataque o custo de poção dispara. Ajuste em passos de 0,05 a 0,1 e rode o harness.
 */
const MONSTER_SCALES: Record<string, { hp: number; atk: number }> = {
  catacumbas: { hp: 0.85, atk: 0.6 }, floresta_sombria: { hp: 1.65, atk: 1.1 }, pantano_toxico: { hp: 1.6, atk: 1.4 },
  minas_esquecidas: { hp: 1.62, atk: 1.4 }, fortaleza_de_gelo: { hp: 1.72, atk: 1.35 }, vulcao_ardente: { hp: 1.78, atk: 1.4 }, templo_profano: { hp: 1.9, atk: 1.25 },
};
for (const hunt of HUNTS) hunt.monsterScale = MONSTER_SCALES[hunt.id];
/** Primeira hora: reforços curtos (sem hordas nem invasões); os completos começam na Floresta Sombria. */
HUNTS[0].extrasTable = EARLY_EXTRAS;
export const HUNT_BY_ID: Record<string, HuntDef> = Object.fromEntries(HUNTS.map(h => [h.id, h]));
/** Multiplicadores de HP e ataque da hunt (1 se não houver). */
export const huntScale = (huntId: string) => HUNT_BY_ID[huntId]?.monsterScale ?? { hp: 1, atk: 1 };
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
