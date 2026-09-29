import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, type ProficiencyId } from './proficiencies';

/** Ritmo de referência: 1 try a cada 2 s de combate (online) ou de treino (offline). */
export const TRIES_PER_SECOND = 0.5;

/**
 * Custo (em tries) para sair do nível L >= 10, com j = L - 9: A * effort * j^p (lei de potência, a mesma família
 * da curva de XP). A é calibrado para a porta do Tier 1 (skill 25) levar ~132 h (5,5 dias, 24 h/dia contando o
 * offline): os primeiros níveis saem em minutos e o último custa ~1 dia. Mexer em PACE_POWER muda a forma:
 * 2,5 deixa o 1º nível ~2 min (Tier 2 ~60 dias); 1,5 faz o contrário.
 */
export const PACE_POWER = 2;
const GATE_LEVELS = 15; // níveis 10 -> 25
const sumPow = (p: number, n: number) => { let s = 0; for (let j = 1; j <= n; j++) s += j ** p; return s; };
export const PACE_A = (132 * 3600 * TRIES_PER_SECOND) / sumPow(PACE_POWER, GATE_LEVELS);

/** XP para sair do nível L (planilha: 50 * L^2,8; L=1 -> 50, L=30 -> 683 769). */
export const xpForLevel = (level: number) => Math.round(50 * level ** 2.8);

/** Tries da planilha antiga (referência; não entra mais no ritmo): nível 1 -> 11, nível 30 -> 174 para Melee. */
export const baseTries = (id: ProficiencyId, level: number) => {
  const p = PROFICIENCIES[id];
  return Math.round(p.base * p.mult ** level);
};

/** Tries reais para sair do nível `level` da proficiência. */
export const triesForNextLevel = (id: ProficiencyId, level: number) => {
  const j = Math.max(1, level - 9);
  return Math.max(1, Math.round(PACE_A * PROFICIENCIES[id].effort * j ** PACE_POWER));
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
