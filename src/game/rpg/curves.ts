import { runtime } from './runtime';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, type ProficiencyId } from './proficiencies';

/** Ritmo de referência: 1 try a cada 2 s de combate (online) ou de treino (offline). */
export const TRIES_PER_SECOND = 0.5;

/**
 * Até a porta do Tier 1 (skill 25) o custo para sair do nível L >= 10, com j = L - 9, é A * effort * j^p (lei de
 * potência). A é calibrado para a porta levar `runtime.tier1Hours` (8 h, 24 h/dia contando o offline): o primeiro
 * nível sai em segundos e o último custa ~1,5 h. Depois da porta cada nível custa `postGateGrowth`× o anterior
 * (exponencial): é a "parede" das subclasses de Tier 2. PACE_POWER muda a forma da parte inicial.
 */
export const PACE_POWER = 2;
/** Porta do Tier 1 e quantos níveis há de 10 até ela. */
export const GATE_SKILL = 25;
const GATE_LEVELS = GATE_SKILL - 10;
const sumPow = (p: number, n: number) => { let s = 0; for (let j = 1; j <= n; j++) s += j ** p; return s; };
export const paceA = () => (runtime.tier1Hours * 3600 * TRIES_PER_SECOND) / sumPow(PACE_POWER, GATE_LEVELS);

/** XP para sair do nível L (planilha: 50 * L^2,8; L=1 -> 50, L=30 -> 683 769). */
export const xpForLevel = (level: number) => Math.round(50 * level ** 2.8);

/** Tries da planilha antiga (referência; não entra mais no ritmo): nível 1 -> 11, nível 30 -> 174 para Melee. */
export const baseTries = (id: ProficiencyId, level: number) => {
  const p = PROFICIENCIES[id];
  return Math.round(p.base * p.mult ** level);
};

/** Tries reais para sair do nível `level` da proficiência (potência até a porta, exponencial depois). */
export const triesForNextLevel = (id: ProficiencyId, level: number) => {
  const effort = PROFICIENCIES[id].effort;
  if (level < GATE_SKILL) {
    const j = Math.max(1, level - 9);
    return Math.max(1, Math.round(paceA() * effort * j ** PACE_POWER));
  }
  const lastGateLevel = paceA() * GATE_LEVELS ** PACE_POWER; // custo de sair do nível 24
  return Math.max(1, Math.round(lastGateLevel * effort * runtime.postGateGrowth ** (level - (GATE_SKILL - 1))));
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
  if (d >= 60) return `${Math.floor(d / 30)}meses`;
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${Math.max(1, m)}min`;
}
