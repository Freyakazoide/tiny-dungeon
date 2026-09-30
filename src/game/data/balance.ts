/** Números de balanceamento num lugar só, para ajustar sem caçar constantes no código. */

/** Chance relativa de um monstro escolher cada grupo (grupos vazios saem do sorteio e os pesos são renormalizados). */
export const AGGRO = { tank: 0.65, front: 0.25, back: 0.10 } as const;
/** Arma corpo a corpo (trains: melee) na linha de trás está fora de alcance e causa só esta fração do dano. */
export const MELEE_BACK_ROW_DAMAGE = 0.5;
/** Ritmo das proficiências: horas de treino até a porta do Tier 1 (skill 25, 24 h/dia contando o offline) e quanto cada nível depois da porta custa a mais. */
export const TIER1_HOURS = 8;
export const POST_GATE_GROWTH = 1.3;
/** Fração do XP e do ouro da hunt mais avançada que o jogo rende enquanto o jogador está offline. */
export const OFFLINE_HUNT_SHARE = 0.25;
/** Regeneração de mana por segundo: `base + maxMana × perMax`. Ajustada pelo harness para o consumo de poções fechar com o ouro. */
export const MANA_REGEN = { base: 3, perMax: .03 };
/** Afinidade elemental: dano de magia do elemento ×1,30 contra fraqueza, ×0,70 contra resistência. */
export const AFFINITY = { weak: 1.3, resist: 0.7 } as const;
/** Status: Combustão (dano/s por stack = 0,10 × poder mágico, 5 s, até 5 stacks), Congelado e Atordoado. */
export const STATUS = { burnPerStackPerSecond: 0.10, burnSeconds: 5, burnMaxStacks: 5, frozenPhysicalBonus: 0.20 } as const;
/** Multiplicadores globais de HP e ataque dos monstros (o `dev.monsterScale` altera o valor em memória). */
export const MONSTER_SCALE = { hp: 1, atk: 1 };
/** Equipamento de classe (Fase 7): cada ponto de Arm vira esta fração de Defesa; cada nível de proficiência do item vale +1,2% no que ela governa. */
export const ARM_DEFENSE = 0.5;
export const PROFICIENCY_LEVEL_DAMAGE = 0.012;
/** Instâncias de equipamento de classe que cabem na mochila de equipamento (o excedente é vendido na hora). */
export const GEAR_BAG_CAPACITY = 80;
