/** Números de balanceamento num lugar só, para ajustar sem caçar constantes no código. */

/** Chance relativa de um monstro escolher cada grupo (grupos vazios saem do sorteio e os pesos são renormalizados). */
export const AGGRO = { tank: 0.65, front: 0.25, back: 0.10 } as const;
/** Arma corpo a corpo (trains: melee) na linha de trás está fora de alcance e causa só esta fração do dano. */
export const MELEE_BACK_ROW_DAMAGE = 0.5;
/** Regeneração de mana por segundo: `base + maxMana × perMax`. Ajustada pelo harness para o consumo de poções fechar com o ouro. */
export const MANA_REGEN = { base: 3, perMax: .03 };
/** Afinidade elemental: dano de magia do elemento ×1,30 contra fraqueza, ×0,70 contra resistência. */
export const AFFINITY = { weak: 1.3, resist: 0.7 } as const;
/** Status: Combustão (dano/s por stack = 0,10 × poder mágico, 5 s, até 5 stacks), Congelado e Atordoado. */
export const STATUS = { burnPerStackPerSecond: 0.10, burnSeconds: 5, burnMaxStacks: 5, frozenPhysicalBonus: 0.20 } as const;
/** Multiplicadores globais de HP e ataque dos monstros (o `dev.monsterScale` altera o valor em memória). */
export const MONSTER_SCALE = { hp: 1, atk: 1 };
