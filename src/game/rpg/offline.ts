import { HUNTS, type HuntDef } from '../data/hunts';
import { TRIES_PER_SECOND } from './curves';
import { runtime } from './runtime';
import type { ProficiencyId } from './proficiencies';
import { gainTries, type ProgressProfile } from './profile';
import { isBlocked } from './affinity';

/** Sem heartbeat por mais que isso = a sessão anterior terminou (um F5 não conta como offline). */
export const SESSION_GAP_S = 60;
/** Teto de crédito por retorno. */
export const OFFLINE_CAP_S = 24 * 3600;
/** Eficiência do treino offline em relação ao online (cada vaga treina no ritmo cheio). */
export const OFFLINE_RATE = 1;
/** Menos que isso de tempo ativo numa hunt: usa a referência estática da hunt em vez da taxa medida. */
export const REF_MIN_ACTIVE_MS = 10 * 60 * 1000;
/** Fração do XP/ouro da hunt de referência (o valor vivo fica em runtime.offlineShare; ver dev.offlineShare). */
export { OFFLINE_HUNT_SHARE } from '../data/balance';

/** Segundos offline entre o último heartbeat e agora; 0 se a sessão ainda era contínua. */
export const sessionGapSeconds = (lastSeenAt: number, now: number) => {
  const gap = (now - lastSeenAt) / 1000;
  return gap > SESSION_GAP_S ? gap : 0;
};

/** Até 2 proficiências distintas e não bloqueadas para a classe: as vagas escolhidas, depois o histórico, depois as últimas treinadas. */
export function offlineSelection(profile: ProgressProfile): ProficiencyId[] {
  const chosen: ProficiencyId[] = [];
  const add = (id: ProficiencyId | null | undefined) => { if (id && chosen.length < 2 && !chosen.includes(id) && !isBlocked(profile, id)) chosen.push(id); };
  profile.offlineTargets.forEach(add);
  profile.offlineHistory.forEach(add);
  add(profile.lastTrained); add(profile.prevTrained);
  return chosen;
}

export interface OfflineResult { target: ProficiencyId; tries: number; levelsGained: number; }
export interface OfflineOutcome { seconds: number; entries: OfflineResult[]; }

/** Credita SOMENTE tries (nada de XP, ouro, loot ou contadores), no ritmo cheio, em cada proficiência escolhida. */
export function applyOfflineTraining(profile: ProgressProfile, gapSeconds: number, bonusPct: (id: ProficiencyId) => number = () => 0): OfflineOutcome | null {
  if (gapSeconds <= 0) return null;
  const targets = offlineSelection(profile);
  if (!targets.length) return null;
  const seconds = Math.min(gapSeconds, OFFLINE_CAP_S);
  const tries = Math.floor(seconds * TRIES_PER_SECOND * OFFLINE_RATE * runtime.trainScale);
  const entries = targets.map(target => {
    const before = profile.proficiencies[target].level;
    gainTries(profile, target, tries, bonusPct(target));
    return { target, tries, levelsGained: profile.proficiencies[target].level - before };
  });
  return { seconds, entries };
}

export interface HuntStat { activeMs: number; xp: number; gold: number; bossKills: number; }
export type HuntStats = Record<string, HuntStat>;

/** Hunt de referência: a de maior índice em HUNTS em que o grupo já derrotou o boss (padrão: a primeira). */
export function referenceHunt(stats: HuntStats): HuntDef {
  for (let i = HUNTS.length - 1; i > 0; i--) if ((stats[HUNTS[i].id]?.bossKills ?? 0) >= 1) return HUNTS[i];
  return HUNTS[0];
}

/** XP e ouro por hora da hunt de referência: medidos quando há tempo ativo suficiente, senão a referência estática. */
export function referenceRates(stats: HuntStats) {
  const hunt = referenceHunt(stats), stat = stats[hunt.id];
  if (stat && stat.activeMs >= REF_MIN_ACTIVE_MS) { const hours = stat.activeMs / 3_600_000; return { hunt, xpPerHour: stat.xp / hours, goldPerHour: stat.gold / hours, measured: true }; }
  return { hunt, xpPerHour: hunt.refXpPerHour, goldPerHour: hunt.refGoldPerHour, measured: false };
}
