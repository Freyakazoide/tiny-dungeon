/** Números de balanceamento num lugar só, para ajustar sem caçar constantes no código. */

/** Chance relativa de um monstro escolher cada grupo (grupos vazios saem do sorteio e os pesos são renormalizados). */
export const AGGRO = { tank: 0.65, front: 0.25, back: 0.10 } as const;
/** Arma corpo a corpo (trains: melee) na linha de trás está fora de alcance e causa só esta fração do dano. */
export const MELEE_BACK_ROW_DAMAGE = 0.5;
/** Multiplicadores globais de HP e ataque dos monstros (o `dev.monsterScale` altera o valor em memória). */
export const MONSTER_SCALE = { hp: 1, atk: 1 };
