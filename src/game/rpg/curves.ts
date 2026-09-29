import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, type ProficiencyGroup, type ProficiencyId } from './proficiencies';

/** Ritmo de referência: 1 try a cada 2 s de combate (online) ou de treino (offline). */
export const TRIES_PER_SECOND = 0.5;

/**
 * Multiplicador de ritmo por grupo, calibrado pra skill 25 levar ~132 h (5,5 dias com 24 h/dia
 * contando o offline) partindo do nível 10. Se mudar TRIES_PER_SECOND, recalibre:
 * K = horas_alvo * TRIES_PER_SECOND * 3600 / soma(base * mult^L, L = 10..porta-1)
 */
export const PACE_K: Record<ProficiencyGroup, number> = { combat: 288, magic: 62, elemental: 137 };

/** XP para sair do nível L (planilha: 50 * L^2,8; L=1 -> 50, L=30 -> 683 769). */
export const xpForLevel = (level: number) => Math.round(50 * level ** 2.8);

/** Tries da planilha, sem ritmo (K = 1): nível 1 -> 11, nível 30 -> 174 para Melee. */
export const baseTries = (id: ProficiencyId, level: number) => {
  const p = PROFICIENCIES[id];
  return Math.round(p.base * p.mult ** level);
};

/** Tries reais para sair do nível `level` da proficiência. */
export const triesForNextLevel = (id: ProficiencyId, level: number) => {
  const p = PROFICIENCIES[id];
  return Math.max(1, Math.round(PACE_K[p.group] * p.base * p.mult ** level));
};

/** Tries acumuladas para ir do nível `from` ao nível `to`. */
export const cumulativeTries = (id: ProficiencyId, from: number, to: number) => {
  let total = 0;
  for (let level = from; level < Math.min(to, MAX_PROFICIENCY_LEVEL); level++) total += triesForNextLevel(id, level);
  return total;
};

export const hoursToReach = (id: ProficiencyId, from: number, to: number) =>
  cumulativeTries(id, from, to) / (TRIES_PER_SECOND * 3600);

/** Tries que faltam para ir de (nível, tries) até o nível `target`. */
export const remainingTries = (id: ProficiencyId, level: number, tries: number, target: number) =>
  level >= target ? 0 : triesForNextLevel(id, level) - tries + cumulativeTries(id, level + 1, target);

export const etaSeconds = (id: ProficiencyId, level: number, tries: number, target: number, perSecond = TRIES_PER_SECOND) =>
  remainingTries(id, level, tries, target) / perSecond;

export function formatEta(seconds: number) {
  if (!Number.isFinite(seconds)) return '—';
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${Math.max(1, m)}min`;
}
