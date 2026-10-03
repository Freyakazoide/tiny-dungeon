import type { RunPlan, Pt } from './plan';

/** Geometria básica do corredor (sem dependências do mundo), usada por world, IA, câmera e testes. */
export type { Pt };
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const RADIUS = { unit: .36, boss: .95 };
export const perp = (f: Pt): Pt => ({ x: -f.y, y: f.x });
export interface Body { pt: Pt; r: number }

/** O círculo de raio `r` em (x, y) cabe no chão (4 pontos do contorno)? */
export const fits = (plan: RunPlan, x: number, y: number, r: number) => { const k = r * .8; return !plan.isBlocked(x - k, y - k) && !plan.isBlocked(x + k, y - k) && !plan.isBlocked(x - k, y + k) && !plan.isBlocked(x + k, y + k); };

/** Há linha de tiro livre (nenhuma célula bloqueada no meio) entre `a` e `b`? */
export function lineClear(plan: RunPlan, a: Pt, b: Pt, step = .4): boolean {
  const d = dist(a, b); if (d < step) return true;
  for (let l = step; l < d; l += step) if (plan.isBlocked(a.x + (b.x - a.x) * l / d, a.y + (b.y - a.y) * l / d)) return false;
  return true;
}
/** Distância do ponto `p` ao segmento a→b. */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy; if (l2 < 1e-9) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)); return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
}
/** Hash estável (0 a 1) de um texto: pequenas diferenças de reação entre personagens sem sorteio (a simulação continua determinística). */
export function hash01(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; }
