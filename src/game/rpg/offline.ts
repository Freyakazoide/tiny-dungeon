import { TRIES_PER_SECOND } from './curves';
import type { ProficiencyId } from './proficiencies';
import { gainTries, type ProgressProfile } from './profile';

/** Sem heartbeat por mais que isso = a sessão anterior terminou (um F5 não conta como offline). */
export const SESSION_GAP_S = 60;
/** Teto de crédito por retorno. */
export const OFFLINE_CAP_S = 24 * 3600;
/** Eficiência do treino offline em relação ao online. */
export const OFFLINE_RATE = 1;

/** Segundos offline entre o último heartbeat e agora; 0 se a sessão ainda era contínua. */
export const sessionGapSeconds = (lastSeenAt: number, now: number) => {
  const gap = (now - lastSeenAt) / 1000;
  return gap > SESSION_GAP_S ? gap : 0;
};

export interface OfflineResult { target: ProficiencyId; seconds: number; tries: number; levelsGained: number; }

/** Credita SOMENTE tries (nada de XP, ouro, loot ou contadores) na proficiência-alvo. */
export function applyOfflineTraining(profile: ProgressProfile, gapSeconds: number): OfflineResult | null {
  if (gapSeconds <= 0) return null;
  const target = profile.offlineTarget ?? profile.lastTrained;
  if (!target) return null;
  const seconds = Math.min(gapSeconds, OFFLINE_CAP_S);
  const tries = Math.floor(seconds * TRIES_PER_SECOND * OFFLINE_RATE);
  const before = profile.proficiencies[target].level;
  gainTries(profile, target, tries);
  return { target, seconds, tries, levelsGained: profile.proficiencies[target].level - before };
}
