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
/** Itens iguais (e da mesma raridade) dividem 1 espaço da mochila até este tanto. */
export const STACK_MAX = 99;

/** Waves com reforços aleatórios (Fase 7): a wave do HuntDef é o núcleo; a cada nascimento somam-se `extra` monstros. */
export interface ExtraRow { extra: number; pct: number; }
/** Tabela "X% de vir X a mais" das waves normais (média de reforços 1,72). */
export const WAVE_EXTRAS: ExtraRow[] = [
  { extra: 0, pct: 41 }, { extra: 1, pct: 20 }, { extra: 2, pct: 14 }, { extra: 3, pct: 9 }, { extra: 4, pct: 6 },
  { extra: 5, pct: 4 }, { extra: 6, pct: 2.5 }, { extra: 8, pct: 1.75 }, { extra: 12, pct: 1 }, { extra: 16, pct: 0.75 },
];
/** Waves de chefe: chefe nunca é duplicado; reforços só de comuns e elites. */
export const BOSS_EXTRAS: ExtraRow[] = [{ extra: 0, pct: 60 }, { extra: 1, pct: 25 }, { extra: 2, pct: 10 }, { extra: 3, pct: 5 }];
/** Catacumbas (primeira hora): sem hordas nem invasões. */
export const EARLY_EXTRAS: ExtraRow[] = [{ extra: 0, pct: 50 }, { extra: 1, pct: 25 }, { extra: 2, pct: 15 }, { extra: 3, pct: 7 }, { extra: 4, pct: 3 }];
/** Fração de elites entre os reforços (o resto é o comum da hunt). */
export const ELITE_SHARE = 0.15;
/** Interruptores e números do sistema de waves; mude aqui (ou em memória nos testes) sem mexer na lógica. */
export const WAVE_CONFIG = {
  /** Liga os reforços aleatórios (os testes de engine antigos rodam com false, ver vitest.setup.ts). */
  enabled: true,
  /** Saco embaralhado: a sorte se compensa a cada `bagSize` waves da hunt. */
  bag: true, bagSize: 40,
  /** Válvula: com HP médio da equipe abaixo de `valveHp` no início da wave, reforços limitados a +1. */
  valve: true, valveHp: 0.35,
  /** Depois de uma wave com `hordeAt`+ reforços, a próxima tem no máximo +2. */
  noHordeChain: true, hordeAt: 6,
  /** Horda (6 a 11) e Invasão (12+) rendem rolagens extras de drop de equipamento (na chance de chefe) e ouro extra. */
  bigRewards: true, hordeRolls: 1, invasionRolls: 2, invasionGold: 0.25,
  /** Levas: com `minTotal`+ monstros nascem só `maxAlive` de uma vez; o resto entra em grupos de `batch` quando houver menos de `below` vivos, a cada `intervalS`. */
  batches: true, minTotal: 9, maxAlive: 8, batch: 4, below: 6, intervalS: 3,
};

/** Modo "corredor" (overhaul): o grupo anda por um mapa procedural infinito e luta por alcance. Os testes de engine antigos rodam com `enabled: false` (ver test-setup.ts). */
export const RUN_CONFIG = {
  enabled: true,
  /** células por segundo: caminhada do grupo, monstros e heróis em combate */
  walk: 8, foeSpeed: 2.3, heroSpeed: 4.5, travel: 11,
  /** raio (células) do anel de 8 vagas em volta de cada herói, onde os monstros corpo a corpo ficam batendo */
  ringRadius: 1,
  /** quem caiu levanta ao fim do encontro com esta fração da vida, enfraquecido (-dano) até o fim do encontro seguinte */
  reviveHp: .35, reviveWeak: .2,
  /** corpo a corpo: o golpe é um arco à frente do herói (±`cleaveArc` rad) que também acerta até `cleaveMax` vizinhos com `cleave` do dano. Flecha: voa `shotSpeed` células/s e acerta o 1º monstro no caminho */
  cleave: .5, cleaveMax: 2, cleaveArc: 1.3, shotSpeed: 22,
  /** dano de uma armadilha de espinhos (fração da vida máxima) em herói, monstro comum e chefe */
  trapHero: .06, trapFoe: .1, trapBoss: .03,
  /** alcances em células: golpe de monstro, arma corpo a corpo, arma à distância e magia ofensiva */
  foeReach: 1.55, meleeReach: 1.7, rangedReach: 5.5, spellReach: 6.5,
  /** monstros nascem tantas células à frente do grupo (fora da tela) */
  spawnAhead: 9, rear: 3,
  /** o grupo para de andar quando há inimigo a menos de tantas células à frente */
  engage: 4,
  /** XP e ouro por kill no corredor (depois da escala por profundidade); calibrado para ficar perto do ritmo de referência das hunts */
  reward: 1.05,
};

/** Câmera da run (em células e por segundo): ver `run/camera.ts`. */
export const CAMERA = {
  /** margem da safe screen area: heróis ficam a pelo menos isto das bordas visíveis */
  margin: 1.35,
  /** células à frente da âncora que a câmera olha fora de combate / como ponto de partida em combate */
  lead: 3, combatLead: 1.5,
  /** inimigos a até tantas células de um herói entram no cálculo do centro da ação */
  foeRange: 8,
  /** quanto do caminho até o centro da ação a câmera percorre em combate (o resto fica na âncora) */
  actionMix: .75,
  /** taxas de suavização (1/s, multiplicadas pela velocidade da simulação até `maxSpeedFactor`) */
  filterRate: 2.6, followRate: 5, combatRate: 2.2, maxSpeedFactor: 4,
};
