import { AI_CONFIG as C } from '../data/balance';
import { canPeel, isSquishy, shouldRetreat, type AiState, type FoeInfo, type HeroAi, type HeroView, type PartyCtx } from './ai';
import { dist, perp, type Pt } from './geom';

/**
 * Onde cada papel quer estar (função pura). Sempre devolve o ponto desejado e o estado da IA; quem chama (world.ts) ainda aplica leash,
 * zona de roam, limite lógico, esquiva de golpes avisados e armadilhas. A histerese está aqui: dentro da faixa de conforto o herói não se mexe.
 */
export interface PosCtx extends PartyCtx { tank?: HeroView; /** há linha de tiro livre entre dois pontos? */ lineClear?: (a: Pt, b: Pt) => boolean }
export interface Desire { pt: Pt; state: AiState }

const unit = (from: Pt, to: Pt): Pt => { const d = dist(from, to) || 1; return { x: (to.x - from.x) / d, y: (to.y - from.y) / d }; };
const add = (p: Pt, v: Pt, k: number): Pt => ({ x: p.x + v.x * k, y: p.y + v.y * k });
/** Alcance efetivo até um inimigo (o corpo grande de um chefe dá alguns cm a mais). */
const reachTo = (hero: HeroView, f: FoeInfo) => hero.reach + (f.foe.r - .36);
export const nearestFoe = (ctx: PartyCtx, p: Pt): { info: FoeInfo; d: number } | undefined => ctx.infos.reduce<{ info: FoeInfo; d: number } | undefined>((b, i) => { const d = dist(p, i.foe.pt) - i.foe.r + .36; return !b || d < b.d ? { info: i, d } : b; }, undefined);

/** Corpo a corpo (tanque e melee): bate dentro do alcance e só vai atrás se o alvo sair dele; ao ir, para colado (`meleeCloseIn` do alcance). */
function meleeApproach(hero: HeroView, f: FoeInfo, state: AiState): Desire {
  const d = dist(hero.pt, f.foe.pt), er = reachTo(hero, f);
  if (d <= er * C.meleeStay) return { pt: hero.pt, state: state === 'peel' ? 'peel' : 'attack' };
  return { pt: add(f.foe.pt, unit(f.foe.pt, hero.pt), er * C.meleeCloseIn), state: state === 'peel' ? 'peel' : 'engage' };
}
/** Fica entre o invasor e a vítima dele, colado no invasor. */
function interceptPoint(ctx: PartyCtx, hero: HeroView, inv: FoeInfo): Pt {
  const victims = ctx.heroes.filter(h => isSquishy(h) && h.id !== hero.id), v = victims.length ? victims.reduce((b, h) => dist(h.pt, inv.foe.pt) < dist(b.pt, inv.foe.pt) ? h : b) : undefined;
  return v ? add(inv.foe.pt, unit(inv.foe.pt, v.pt), hero.reach * C.meleeCloseIn) : inv.foe.pt;
}

export function tankPosition(ctx: PosCtx, hero: HeroView, target?: FoeInfo): Desire {
  const peel = ctx.focus.peelId ? ctx.infos.find(i => i.foe.uid === ctx.focus.peelId) : undefined;
  if (peel && canPeel(hero, peel)) {
    if (dist(hero.pt, peel.foe.pt) <= reachTo(hero, peel)) return { pt: hero.pt, state: 'peel' };
    return { pt: interceptPoint(ctx, hero, peel), state: 'peel' };
  }
  if (target) return meleeApproach(hero, target, 'attack');
  return homeDesire(ctx, hero);
}
export function meleePosition(ctx: PosCtx, hero: HeroView, target?: FoeInfo): Desire {
  const peel = ctx.focus.peelId ? ctx.infos.find(i => i.foe.uid === ctx.focus.peelId) : undefined;
  if (peel && target?.foe.uid === peel.foe.uid && canPeel(hero, peel)) return meleeApproach(hero, peel, 'peel');
  if (target) return meleeApproach(hero, target, 'attack');
  return homeDesire(ctx, hero);
}
/**
 * Ranged: tem uma distância ideal (`hold`) e uma faixa de conforto sem reposicionar ([hold − bandLo, hold + bandHi] em relação ao alvo). Só se aproxima
 * se o alvo passar da faixa, só recua se algum inimigo chegar perto demais (`dodge`) e, se a linha de tiro estiver bloqueada, dá um passo para o lado.
 */
export function rangedPosition(ctx: PosCtx, hero: HeroView, target?: FoeInfo): Desire {
  const near = nearestFoe(ctx, hero.pt), hold = Math.max(1, hero.ai.hold);
  if (near && hero.ai.dodge > 0 && near.d < hero.ai.dodge) return { pt: add(hero.pt, unit(near.info.foe.pt, hero.pt), hero.ai.dodge + 1.4 - near.d), state: 'reposition' };
  if (!target) return homeDesire(ctx, hero);
  const d = dist(hero.pt, target.foe.pt);
  if (d > Math.min(hold + C.bandHi, hero.reach - .3)) {
    // o ponto de aproximação não pode cair na zona de recuo (`dodge`) de outro inimigo: senão ele chega, recua, chega de novo… (tremendo). Se nenhum serve, espera.
    const dir = unit(target.foe.pt, hero.pt), base = Math.min(hold, hero.reach - .8);
    for (let k = 0; k <= 4; k++) {
      const pt = add(target.foe.pt, dir, Math.min(hero.reach - .5, base + k * .4)), n = nearestFoe(ctx, pt);
      if (!n || hero.ai.dodge <= 0 || n.d >= hero.ai.dodge + .5) return { pt, state: 'engage' };
    }
    return { pt: hero.pt, state: 'attack' };
  }
  if (d <= hero.reach && ctx.lineClear && !ctx.lineClear(hero.pt, target.foe.pt)) {
    const side = perp(unit(hero.pt, target.foe.pt));
    for (const k of [1.6, -1.6, 3.2, -3.2]) { const p = add(hero.pt, side, k); if (ctx.lineClear(p, target.foe.pt)) return { pt: p, state: 'reposition' }; }
  }
  return { pt: hero.pt, state: 'attack' };
}
/**
 * Curandeiro: a posição vem da party, não de um inimigo. Referência = mistura do tanque, do centro dos aliados e do aliado mais ferido, um pouco
 * atrás; se alguma ameaça chega a menos de `healSafe` ele se afasta, sem passar de `healRange` do mais ferido. Dentro do conforto, fica parado.
 */
export function healerPosition(ctx: PosCtx, hero: HeroView): Desire {
  const allies = ctx.heroes.filter(h => h.id !== hero.id);
  if (!allies.length) return homeDesire(ctx, hero);
  const cx = allies.reduce((s, h) => s + h.pt.x, 0) / allies.length, cy = allies.reduce((s, h) => s + h.pt.y, 0) / allies.length;
  const tank = ctx.tank && ctx.tank.id !== hero.id ? ctx.tank.pt : { x: cx, y: cy }, low = allies.reduce((b, h) => h.hpFrac < b.hpFrac ? h : b, allies[0]);
  let want: Pt = { x: tank.x * .35 + cx * .35 + low.pt.x * .3, y: tank.y * .35 + cy * .35 + low.pt.y * .3 };
  want = add(want, ctx.fwd, -C.healBack);
  const near = nearestFoe(ctx, want);
  if (near && near.d < C.healSafe) want = add(near.info.foe.pt, unit(near.info.foe.pt, want), C.healSafe + .6);
  if (dist(want, low.pt) > C.healRange) want = add(low.pt, unit(low.pt, want), C.healRange);
  const nearMe = nearestFoe(ctx, hero.pt), safe = !nearMe || nearMe.d >= C.healSafe;
  if (safe && dist(hero.pt, want) <= C.healComfort && dist(hero.pt, low.pt) <= C.healRange + .6) return { pt: hero.pt, state: ctx.infos.length ? 'attack' : 'travel' };
  return { pt: want, state: safe ? (ctx.infos.length ? 'reposition' : 'travel') : 'retreat' };
}
/** Sem alvo: volta ao ponto de descanso da formação. */
export function homeDesire(ctx: PartyCtx, hero: HeroView): Desire {
  if (dist(hero.pt, hero.home) <= .55) return { pt: hero.pt, state: ctx.infos.length ? 'attack' : 'travel' };
  return { pt: hero.home, state: ctx.infos.length ? 'recoverPosition' : 'travel' };
}
/** Ponto de retirada: para trás da formação, nunca para longe dela. */
export const retreatPoint = (hero: HeroView, fwd: Pt): Pt => add(hero.home, fwd, -2);

/** Decisão de posição de um herói: retirada (com histerese) tem prioridade; depois cada papel. */
export function desiredHeroPosition(ctx: PosCtx, hero: HeroView, ai: HeroAi, target?: FoeInfo): Desire {
  if (hero.role !== 'tank' && ctx.infos.length && shouldRetreat(hero, ai.state)) return { pt: retreatPoint(hero, ctx.fwd), state: 'retreat' };
  switch (hero.role) {
    case 'tank': return tankPosition(ctx, hero, target);
    case 'melee': return meleePosition(ctx, hero, target);
    case 'ranged': return rangedPosition(ctx, hero, target);
    case 'healer': return healerPosition(ctx, hero);
  }
}
