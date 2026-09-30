import { xpForLevel, triesForNextLevel } from './curves';
import { affinityFor } from './affinity';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCY_IDS, START_LEVEL, type ProficiencyId } from './proficiencies';

/** Contadores vitalícios usados nos requisitos de algumas subclasses. */
export const COUNTER_IDS = [
  'crits', 'bossCrits', 'damageTaken', 'healingDone', 'buffsApplied', 'dotDamage',
  'supportPotionsUsed', 'bossKills', 'goldEarned', 'controlSpells',
] as const;
export type CounterId = (typeof COUNTER_IDS)[number];

export type OfflineSlots = [ProficiencyId | null, ProficiencyId | null];
export const OFFLINE_HISTORY_MAX = 6;
export interface ProficiencyProgress { level: number; tries: number; }

/**
 * Estado de progressão de um personagem no modelo novo (Squire -> Classe -> Subclasse).
 * Fica separado do `Character` atual para testar sem quebrar o jogo; na fase 2 vira parte dele.
 */
export interface ProgressProfile {
  level: number;
  xp: number;
  classId: string;
  /** Caminho percorrido, do Aprendiz até a classe atual. Nunca encolhe. */
  classPath: string[];
  proficiencies: Record<ProficiencyId, ProficiencyProgress>;
  counters: Partial<Record<CounterId, number>>;
  /** Duas vagas de proficiência que treinam offline (null = não escolhida). */
  offlineTargets: OfflineSlots;
  /** Últimas escolhidas, mais recente primeiro (máx. 6, sem repetir): usadas quando o jogador não escolhe. */
  offlineHistory: ProficiencyId[];
  /** As duas últimas proficiências treinadas de fato (a atual e a anterior, diferentes). */
  lastTrained?: ProficiencyId;
  prevTrained?: ProficiencyId;
  /** Proficiência usada na última ação de combate; recebe o treino por tempo (TRIES_PER_SECOND). */
  trainingFocus?: ProficiencyId;
  /** Fração de try acumulada entre ticks de combate. */
  trainingAcc?: number;
}

export function createProfile(): ProgressProfile {
  const proficiencies = Object.fromEntries(
    PROFICIENCY_IDS.map(id => [id, { level: START_LEVEL, tries: 0 }]),
  ) as Record<ProficiencyId, ProficiencyProgress>;
  return { level: 1, xp: 0, classId: 'aprendiz', classPath: ['aprendiz'], proficiencies, counters: {}, offlineTargets: [null, null], offlineHistory: [] };
}

export function gainExperience(profile: ProgressProfile, amount: number) {
  profile.xp += amount;
  while (profile.xp >= xpForLevel(profile.level)) {
    profile.xp -= xpForLevel(profile.level);
    profile.level++;
  }
}

/**
 * Soma tries e sobe quantos níveis couberem (aceita quantidades grandes, como no offline). As tries valem
 * `amount × afinidade da classe × (1 + bonusPct/100)`; `bonusPct` é o talento `t_<proficiência>`. Afinidade 0
 * (proficiência bloqueada) ignora tudo: o nível congela e nem `lastTrained` muda.
 */
export function gainTries(profile: ProgressProfile, id: ProficiencyId, amount: number, bonusPct = 0) {
  const affinity = affinityFor(profile, id);
  if (affinity <= 0) return;
  amount *= affinity * (1 + bonusPct / 100);
  const progress = profile.proficiencies[id];
  progress.tries += amount;
  if (profile.lastTrained !== id) { profile.prevTrained = profile.lastTrained; profile.lastTrained = id; }
  while (progress.level < MAX_PROFICIENCY_LEVEL && progress.tries >= triesForNextLevel(id, progress.level)) {
    progress.tries -= triesForNextLevel(id, progress.level);
    progress.level++;
  }
}

export function addCounter(profile: ProgressProfile, id: CounterId, amount = 1) {
  profile.counters[id] = (profile.counters[id] ?? 0) + amount;
}
