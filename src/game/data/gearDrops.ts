import type { Classification, Quality } from './classItems';

/**
 * Drops e preços dos itens de classe (a pendência "chances de drop" do documento da Fase 7). Tudo aqui é ajustável:
 * o sorteio escolhe a classe (entre as jogáveis e as do grupo), a qualidade pela hunt, a classificação (atributos) e o item.
 */
/** Chance de um monstro largar 1 item de classe: comum e chefe. */
export const GEAR_DROP_CHANCE = { normal: 0.012, boss: 0.2 } as const;

/** Pesos de qualidade por índice da hunt em HUNTS (0 = Catacumbas … 6 = Templo Profano). Chefe: BiS ×2. */
export const QUALITY_WEIGHTS: readonly Record<Quality, number>[] = [
  { standard: 85, superior: 14, bis: 1 }, { standard: 70, superior: 27, bis: 3 }, { standard: 55, superior: 38, bis: 7 },
  { standard: 40, superior: 45, bis: 15 }, { standard: 30, superior: 48, bis: 22 }, { standard: 20, superior: 50, bis: 30 },
  { standard: 12, superior: 48, bis: 40 },
];
export const BOSS_BIS_MULTIPLIER = 2;

/** Pesos de classificação (quantos atributos aleatórios): comuns e de chefe. */
export const CLASSIFICATION_WEIGHTS: { normal: Record<Classification, number>; boss: Record<Classification, number> } = {
  normal: { common: 62, uncommon: 25, rare: 9, legendary: 3.5, mythic: 0.5 },
  boss: { common: 35, uncommon: 35, rare: 20, legendary: 8, mythic: 2 },
};

/** Valor de venda: base por qualidade × fator do slot × multiplicador da classificação. Ferreiro: preço = valor × SMITH_MARKUP. */
export const QUALITY_VALUE: Record<Quality, number> = { standard: 30, superior: 110, bis: 320 };
export const CLASSIFICATION_VALUE: Record<Classification, number> = { common: 1, uncommon: 1.5, rare: 2.2, legendary: 3.5, mythic: 6 };
export const SMITH_MARKUP = 6;
