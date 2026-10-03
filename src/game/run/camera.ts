import { CAMERA } from '../data/balance';
import { dist, type Pt } from './geom';

/**
 * Câmera da run (funções puras; a cena só aplica o resultado). Fora de combate ela olha à frente do grupo; em combate ela vai para o centro
 * da ação (heróis vivos + inimigos relevantes), misturado com a âncora para não dar tranco. Uma safe screen area garante que nenhum herói
 * encoste nas bordas da tela, e a suavização filtra os desvios rápidos (dodge) para a câmera não ficar alternando de posição.
 */
export interface View { w: number; h: number }
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number }

const boundsOf = (pts: Pt[]): Bounds | null => {
  if (!pts.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

/** Inimigos que contam para a ação: os que estão a `CAMERA.foeRange` células de algum herói vivo (quem ainda vem de longe não puxa a câmera). */
export const relevantFoes = (heroes: Pt[], foes: Pt[]) => foes.filter(f => heroes.some(h => dist(h, f) <= CAMERA.foeRange));

/** Retângulo ocupado pela ação: heróis vivos e inimigos relevantes (null se não há ninguém). */
export const cameraActionBounds = (heroes: Pt[], foes: Pt[]): Bounds | null => boundsOf([...heroes, ...relevantFoes(heroes, foes)]);

/** Alvo da câmera: `lead` células à frente da âncora fora de combate; em combate, mistura (`CAMERA.actionMix`) com o centro da ação. `combat` vai de 0 a 1. */
export function cameraTarget(i: { anchor: Pt; fwd: Pt; heroes: Pt[]; foes: Pt[]; combat: number }): Pt {
  const lead = { x: i.anchor.x + i.fwd.x * CAMERA.lead, y: i.anchor.y + i.fwd.y * CAMERA.lead };
  const action = cameraActionBounds(i.heroes, i.foes); if (!action || i.combat <= 0) return lead;
  const k = CAMERA.actionMix * Math.min(1, i.combat), hold = { x: i.anchor.x + i.fwd.x * CAMERA.combatLead, y: i.anchor.y + i.fwd.y * CAMERA.combatLead };
  return { x: hold.x + (action.cx - hold.x) * k, y: hold.y + (action.cy - hold.y) * k };
}

/** Faixa em que a câmera pode estar para que todos os `pts` fiquem dentro da área segura (viewport menos a margem); se não cabem, o meio. */
export function safeCenterRange(pts: Pt[], view: View, margin = CAMERA.margin) {
  const b = boundsOf(pts); if (!b) return null;
  const hw = Math.max(0, view.w / 2 - margin), hh = Math.max(0, view.h / 2 - margin);
  const axis = (lo: number, hi: number, half: number, mid: number) => hi - lo > 2 * half ? [mid, mid] : [hi - half, lo + half];
  const [x0, x1] = axis(b.minX, b.maxX, hw, b.cx), [y0, y1] = axis(b.minY, b.maxY, hh, b.cy);
  return { x0, x1, y0, y1 };
}
/** Empurra o centro da câmera só o necessário para os heróis ficarem na área segura. */
export function enforceSafeArea(center: Pt, heroes: Pt[], view: View, margin = CAMERA.margin): Pt {
  const r = safeCenterRange(heroes, view, margin); if (!r) return center;
  return { x: Math.min(r.x1, Math.max(r.x0, center.x)), y: Math.min(r.y1, Math.max(r.y0, center.y)) };
}
/** Retângulo da área segura em volta de `center` (para o debug). */
export const safeArea = (center: Pt, view: View, margin = CAMERA.margin) => ({ x0: center.x - view.w / 2 + margin, x1: center.x + view.w / 2 - margin, y0: center.y - view.h / 2 + margin, y1: center.y + view.h / 2 - margin });
/** Todos os heróis estão dentro da área segura? */
export const heroesSafe = (center: Pt, heroes: Pt[], view: View, margin = CAMERA.margin) => { const a = safeArea(center, view, margin); return heroes.every(p => p.x >= a.x0 && p.x <= a.x1 && p.y >= a.y0 && p.y <= a.y1); };

export interface CameraState { x: number; y: number; fx: number; fy: number; combat: number; init: boolean }
export const newCamera = (): CameraState => ({ x: 0, y: 0, fx: 0, fy: 0, combat: 0, init: false });
const rate = (base: number, speed: number) => base * Math.max(1, Math.min(speed, CAMERA.maxSpeedFactor));
/**
 * Um passo da câmera (`dt` em segundos reais, `speed` = velocidade da simulação ×1/×2/×3): o alvo passa por um filtro lento (tira o tremor de quem
 * desvia), a câmera segue o alvo filtrado e, por fim, a área segura é imposta sobre a posição final (nunca deixa um herói sair da tela).
 */
export function stepCamera(cam: CameraState, i: { anchor: Pt; fwd: Pt; heroes: Pt[]; foes: Pt[]; inCombat: boolean; view: View; dt: number; speed: number }): CameraState {
  const dt = Math.min(.25, Math.max(0, i.dt));
  cam.combat += ((i.inCombat ? 1 : 0) - cam.combat) * (1 - Math.exp(-dt * rate(CAMERA.combatRate, i.speed)));
  const t = cameraTarget({ anchor: i.anchor, fwd: i.fwd, heroes: i.heroes, foes: i.foes, combat: cam.combat });
  if (!cam.init) { cam.fx = cam.x = t.x; cam.fy = cam.y = t.y; cam.init = true; }
  const kf = 1 - Math.exp(-dt * rate(CAMERA.filterRate, i.speed)), kc = 1 - Math.exp(-dt * rate(CAMERA.followRate, i.speed));
  cam.fx += (t.x - cam.fx) * kf; cam.fy += (t.y - cam.fy) * kf;
  cam.x += (cam.fx - cam.x) * kc; cam.y += (cam.fy - cam.y) * kc;
  const safe = enforceSafeArea({ x: cam.x, y: cam.y }, i.heroes, i.view); cam.x = safe.x; cam.y = safe.y;
  return cam;
}
