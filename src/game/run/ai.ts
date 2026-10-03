import { AI_CONFIG as C } from '../data/balance';
import type { FoeRole } from './foes';
import { dist, hash01, type Pt } from './geom';

/**
 * IA da party (Utility AI determinística, sem aprendizado). Tudo aqui é função pura sobre "visões" (HeroView, FoeView) montadas pelo mundo:
 * pontuação de alvo por papel, alvo principal do grupo, alvo de peel, memória curta (target lock), perigo de golpes avisados, retirada e esquiva.
 * O mundo (world.ts) só monta as visões, chama estas funções e anda; nada aqui conhece o motor, a grade ou o Phaser.
 */
export type Role = 'tank' | 'melee' | 'ranged' | 'healer';
export interface AiConfig { hold: number; leash: number; retreatAt: number; dodge: number }
export type AiState = 'travel' | 'engage' | 'attack' | 'reposition' | 'evade' | 'retreat' | 'peel' | 'recoverPosition';

/** Memória curta de um herói: o alvo travado, o estado atual e o destino guardado (não se recalcula tudo a cada tick). */
export interface HeroAi {
  state: AiState; stateUntil: number;
  targetId?: string; targetLockUntil: number;
  dest?: Pt; destUntil: number;
  /** quando foi a última decisão completa */
  thinkAt: number;
  /** a última decisão foi limitada pela zona de roam (para contar só a transição) */
  roamHit?: boolean;
  /** golpe avisado do qual está saindo e o ponto de saída escolhido (mantido até sair, sem trocar de lado a cada tick) */
  evadeId?: string;
  /** travado (o destino não anda): onde estava e há quanto tempo, e o destino impossível a ser ignorado por um tempo */
  /** esquiva: onde estava no tick anterior e a saída que não deu para alcançar (para escolher outra) */
  evadeAt?: Pt; badEscape?: Pt;
  stuckRef?: Pt; stuckT?: number; blockedAt?: Pt; blockedUntil?: number;
}
/** Foco do grupo: alvo principal (todos os DPS tendem a ele) e alvo de peel (invasor da backline). */
export interface PartyFocus { primaryId?: string; primaryUntil: number; peelId?: string; peelUntil: number }
export const newHeroAi = (): HeroAi => ({ state: 'travel', stateUntil: 0, targetLockUntil: 0, destUntil: 0, thinkAt: -1 });

export interface HeroView {
  id: string; role: Role; row: 'front' | 'back'; pt: Pt; home: Pt;
  hp: number; maxHp: number; hpFrac: number; defense: number;
  /** alcance do golpe básico (células) */
  reach: number;
  /** quanto pode se afastar do ponto de descanso */
  roam: number;
  ai: AiConfig;
  /** ataque básico é um projétil que viaja (flechas): conta para a reserva de overkill */
  projectile: boolean;
  /** tem magia em área equipada */
  aoe: boolean;
}
export interface FoeView {
  uid: string; defId: string; pt: Pt; /** raio do corpo */ r: number; role: FoeRole; hp: number; maxHp: number; hpFrac: number;
  boss: boolean; elite: boolean; ambush: boolean; vulnerable: boolean;
  /** herói que ele está batendo (vaga do anel) */
  holder?: string;
  /** dano de uma pancada dele num alvo sem armadura (estimativa) */
  dmg: number;
  /** dano de projéteis já em voo que vão acertá-lo (reserva de overkill) */
  incoming: number;
}
export interface FoeInfo {
  foe: FoeView; holderHero?: HeroView;
  /** distância ao herói de trás (healer/ranged) mais perto e ao da frente mais perto */
  nearBack: number; nearFront: number;
  /** atravessou (ou vai atravessar) a frontline e ameaça a backline */
  invader: boolean;
  /** ameaça à backline (para o peel) */
  peelThreat: number;
  /** o dano em voo já cobre a vida que resta */
  covered: boolean;
}
export interface PartyCtx {
  heroes: HeroView[]; infos: FoeInfo[]; fwd: Pt; clock: number;
  focus: PartyFocus;
  /** quantos heróis estão em peel agora */
  peelers: number;
}

export const isSquishy = (h: HeroView) => h.role === 'healer' || h.role === 'ranged';
export const isRunnerLike = (f: FoeView) => f.ambush || f.role === 'runner';
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Dano em voo (flechas) que vai acertar cada inimigo: cada projétil é creditado ao primeiro que ele toca no caminho (como no motor). */
export function incomingByFoe(shots: { x: number; y: number; vx: number; vy: number; left: number; dmg: number }[], foes: { uid: string; pt: Pt; r: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of shots) {
    let hit: { uid: string; along: number } | undefined;
    for (const f of foes) {
      const dx = f.pt.x - s.x, dy = f.pt.y - s.y, along = dx * s.vx + dy * s.vy, side = Math.abs(dx * s.vy - dy * s.vx), reach = f.r + .25;
      if (along < -reach || along > s.left + reach || side > reach) continue;
      if (!hit || along < hit.along) hit = { uid: f.uid, along };
    }
    if (hit) out.set(hit.uid, (out.get(hit.uid) ?? 0) + s.dmg * .92);
  }
  return out;
}
/** Dano que já está a caminho de um inimigo (flechas em voo). */
export const incomingDamageForTarget = (incoming: Map<string, number>, uid: string) => incoming.get(uid) ?? 0;

/** Monta as informações derivadas de cada inimigo (invasor, distâncias, cobertura de overkill) uma vez por decisão. */
export function buildFoeInfos(heroes: HeroView[], foes: FoeView[]): FoeInfo[] {
  const byId = new Map(heroes.map(h => [h.id, h])), back = heroes.filter(isSquishy), front = heroes.filter(h => !isSquishy(h));
  return foes.map(foe => {
    const holderHero = foe.holder ? byId.get(foe.holder) : undefined;
    const nearBack = back.length ? Math.min(...back.map(h => dist(h.pt, foe.pt))) : 99, nearFront = front.length ? Math.min(...front.map(h => dist(h.pt, foe.pt))) : 99;
    const ranged = foe.role === 'archer' || foe.role === 'caster';
    const invader = !ranged && (!!holderHero && isSquishy(holderHero) || (isRunnerLike(foe) && nearBack <= C.peelNear) || (nearBack + .5 < nearFront && nearBack <= 3.5));
    // ameaça: dano da pancada, quanto a vítima já está machucada, runner de pouca vida na backline cai rápido (vale a pena terminar)
    const victim = holderHero && isSquishy(holderHero) ? holderHero : back.length ? back.reduce((b, h) => dist(h.pt, foe.pt) < dist(b.pt, foe.pt) ? h : b) : undefined;
    const weight = (1 + foe.dmg / Math.max(1, victim?.maxHp ?? 1000) * 6) * (1 + (1 - (victim?.hpFrac ?? 1)) * 1.4) * (holderHero && isSquishy(holderHero) ? 1.5 : 1) * (isRunnerLike(foe) ? 1.25 : 1) * (1 + (foe.hpFrac < .35 ? .5 : 0));
    const peelThreat = invader ? weight * 1.6 / (1 + Math.max(0, nearBack - 1) * .12) : 0;
    return { foe, holderHero, nearBack, nearFront, invader, peelThreat, covered: foe.incoming >= foe.hp * .95 };
  });
}

/** Pesos por papel da Utility AI (os números são o ponto de partida; o harness e os testes de comportamento calibram). */
const W = {
  tank: { distCost: .25, homeCost: .3, exec: .7, low: .25, primary: .5, peel: 3, sticky: .9, boss: 1.1, near: .08 },
  melee: { distCost: .4, homeCost: .55, exec: 2.4, low: .8, primary: 2.2, peel: 2.4, sticky: .9, boss: .7, near: .14 },
  ranged: { distCost: .3, homeCost: .45, exec: 2.3, low: .75, primary: 1.8, peel: 2, sticky: 1, boss: .7, near: .1 },
  healer: { distCost: .5, homeCost: .8, exec: 1, low: .4, primary: .6, peel: .5, sticky: 1, boss: .3, near: .2 },
} as const;

/**
 * Pontuação de um inimigo para um herói (maior = melhor); -Infinity = fora de questão (quebraria a formação). A prioridade depende do papel:
 * o tanque protege e intercepta, o melee termina e ajuda no peel, o ranged escolhe quem pode atingir sem correr e evita overkill, o curandeiro mal ataca.
 */
export function scoreHeroTarget(ctx: PartyCtx, hero: HeroView, info: FoeInfo, curId?: string): number {
  const f = info.foe, w = W[hero.role], d = dist(hero.pt, f.pt), far = Math.max(0, dist(hero.home, f.pt) - hero.reach);
  const peelHelp = ctx.focus.peelId === f.uid;
  // o melee/ranged/curandeiro nunca vai atrás de quem fica longe demais da própria zona (exceto o invasor, que vem até a backline)
  if (hero.role !== 'tank' && far > hero.roam + 1.5 && !(peelHelp && info.nearBack < 4)) return -Infinity;
  let s = -w.distCost * Math.max(0, d - hero.reach) - w.homeCost * far - w.near * d;
  if (f.hpFrac <= C.executeHp) s += w.exec * (1 - .4 * f.hpFrac / C.executeHp); else s += w.low * (1 - f.hpFrac);
  if (f.uid === ctx.focus.primaryId) s += w.primary;
  if (peelHelp) s += w.peel;
  if (f.uid === curId) s += w.sticky;
  if (f.boss) s += w.boss; else if (f.elite) s += w.boss * .4;
  const holder = info.holderHero, onFront = !!holder && !isSquishy(holder);
  switch (hero.role) {
    case 'tank':
      if (isRunnerLike(f) && info.nearBack <= 7) s += 3.2;
      if (holder?.role === 'healer') s += 3; else if (holder && isSquishy(holder)) s += 2.2;
      if (!holder && !info.foe.ambush) s += 3;                 // ninguém segurando
      if (holder?.id === hero.id) s += 1.2;                      // já engajado em mim
      s += 1.4 * clamp01(1 - info.nearFront / 6);                // perto da frontline
      break;
    case 'melee':
      if (onFront) s += 1.6;
      if (f.vulnerable) s += .9;
      if (info.invader) s += ctx.peelers === 0 ? 2.4 : .8;      // perigoso na backline e ninguém fazendo peel
      if (f.role === 'archer' || f.role === 'caster') s -= .6;   // melee não persegue atirador longe da formação
      break;
    case 'ranged':
      if (f.role === 'caster') s += 2.1; else if (f.role === 'archer') s += 1.7;
      if (isRunnerLike(f) && info.nearBack <= 2.5) s += 2.4;     // runner que chegou na backline
      if (d <= hero.reach - .3) s += 1.2;                        // dá para atacar sem se reposicionar
      if (hero.aoe) s += .45 * ctx.infos.filter(o => o !== info && dist(o.foe.pt, f.pt) <= 2.2).length;
      if (hero.projectile && info.covered) s -= 8;               // a flecha em voo já mata: escolhe outro
      break;
    case 'healer': if (hero.projectile && info.covered) s -= 8; break;
  }
  return s;
}

/** Atraso (s) de reação do herói a um golpe avisado: pequenas diferenças entre personagens, sempre as mesmas. */
export const reactDelay = (heroId: string) => C.reactMin + (C.reactMax - C.reactMin) * hash01(`react:${heroId}`);
/** Duração do travamento de alvo desta escolha (estável por herói+alvo). */
export const lockFor = (heroId: string, foeId: string) => C.lockMin + (C.lockMax - C.lockMin) * hash01(`lock:${heroId}:${foeId}`);

export interface TargetChoice { id?: string; switched: boolean; emergency?: 'dead' | 'unreachable' | 'peel' | 'free' }
/** O herói deve ajudar no peel agora? (tanque sempre; melee se o invasor está perto da zona dele; ranged se dá para atirar sem se reposicionar muito) */
export function canPeel(hero: HeroView, info: FoeInfo): boolean {
  if (!info.invader) return false;
  const d = dist(hero.pt, info.foe.pt);
  if (hero.role === 'tank') return dist(hero.home, info.foe.pt) <= hero.roam + hero.reach + 3;
  if (hero.role === 'melee') return d <= hero.roam + hero.reach + 1.5 && (info.peelThreat >= C.peelMin * 1.3 || info.foe.hpFrac < .5);
  if (hero.role === 'ranged') return d <= hero.reach + 1 && (info.peelThreat >= C.peelMin * 1.5 || info.foe.hpFrac < .35);
  return false;
}
/**
 * Escolhe o alvo de um herói. Mantém o alvo travado por ~0,8–1,2 s e só troca antes numa emergência (alvo morreu ou ficou inalcançável,
 * peel pedido para quem pode ajudar); depois do lock só troca se o novo valer `switchMargin` a mais, para não ficar alternando.
 */
export function chooseHeroTarget(ctx: PartyCtx, hero: HeroView, ai: HeroAi): TargetChoice {
  const scored = ctx.infos.map(i => ({ i, s: scoreHeroTarget(ctx, hero, i, ai.targetId) })).filter(x => x.s > -Infinity);
  const cur = ai.targetId ? ctx.infos.find(i => i.foe.uid === ai.targetId) : undefined, curScore = cur ? scoreHeroTarget(ctx, hero, cur, ai.targetId) : -Infinity;
  const best = scored.reduce<{ i: FoeInfo; s: number } | undefined>((b, x) => !b || x.s > b.s ? x : b, undefined);
  const peel = ctx.focus.peelId ? ctx.infos.find(i => i.foe.uid === ctx.focus.peelId) : undefined;
  if (!best) return { id: undefined, switched: !!ai.targetId, emergency: ai.targetId ? (cur ? 'unreachable' : 'dead') : undefined };
  if (!cur) return { id: best.i.foe.uid, switched: !!ai.targetId, emergency: ai.targetId ? 'dead' : 'free' };
  if (curScore === -Infinity) return { id: best.i.foe.uid, switched: true, emergency: 'unreachable' };
  if (peel && peel.foe.uid !== cur.foe.uid && canPeel(hero, peel) && !(cur.invader && ai.targetId === ctx.focus.peelId)) return { id: peel.foe.uid, switched: true, emergency: 'peel' };
  if (ctx.clock < ai.targetLockUntil) return { id: cur.foe.uid, switched: false };
  if (best.i.foe.uid !== cur.foe.uid && best.s >= curScore + C.switchMargin) return { id: best.i.foe.uid, switched: true };
  return { id: cur.foe.uid, switched: false };
}

/** Pontuação do inimigo como alvo principal do grupo: execução, atiradores/magos, quem ameaça a backline, quem já está engajado com a frente. */
export function primaryScore(ctx: PartyCtx, info: FoeInfo, curId?: string): number {
  const f = info.foe; let s = 0;
  if (f.hpFrac <= C.executeHp) s += 2.2 * (1 - .4 * f.hpFrac / C.executeHp); else s += .8 * (1 - f.hpFrac);
  if (f.role === 'caster') s += 1.4; else if (f.role === 'archer') s += 1.1; else if (isRunnerLike(f)) s += .6;
  if (f.boss) s += 1; else if (f.elite) s += .4;
  if (info.invader) s += 1.5;
  if (info.holderHero && !isSquishy(info.holderHero)) s += 1;
  s += 1.1 * clamp01(1 - info.nearFront / 7) - .25 * Math.max(0, info.nearFront - 3);
  if (info.covered && ctx.heroes.some(h => h.projectile)) s -= 3;
  if (f.uid === curId) s += .8;
  return s;
}
/** Alvo principal da party: o inimigo mais valioso do ponto de vista do grupo; mantido por `primaryLock` e só troca por margem (ou se morreu). */
export function choosePrimaryTarget(ctx: PartyCtx): { id?: string; until: number } {
  const f = ctx.focus, cur = f.primaryId ? ctx.infos.find(i => i.foe.uid === f.primaryId) : undefined;
  const best = ctx.infos.reduce<{ i: FoeInfo; s: number } | undefined>((b, i) => { const s = primaryScore(ctx, i, f.primaryId); return !b || s > b.s ? { i, s } : b; }, undefined);
  if (!best) return { id: undefined, until: 0 };
  if (!cur) return { id: best.i.foe.uid, until: ctx.clock + C.primaryLock };
  if (ctx.clock < f.primaryUntil) return { id: cur.foe.uid, until: f.primaryUntil };
  if (best.i !== cur && best.s >= primaryScore(ctx, cur, f.primaryId) + C.primarySwitch) return { id: best.i.foe.uid, until: ctx.clock + C.primaryLock };
  return { id: cur.foe.uid, until: ctx.clock + C.primaryLock * .5 };
}
/** Alvo de peel: o invasor que mais ameaça a backline (acima de `peelMin`); mantido por `peelLock`. Inimigo longe e inofensivo não conta. */
export function choosePeelTarget(ctx: PartyCtx): { id?: string; until: number } {
  const f = ctx.focus, ranked = ctx.infos.filter(i => i.invader && i.peelThreat >= C.peelMin).sort((a, b) => b.peelThreat - a.peelThreat);
  if (!ranked.length) return { id: undefined, until: 0 };
  const cur = f.peelId ? ranked.find(i => i.foe.uid === f.peelId) : undefined;
  if (cur && ctx.clock < f.peelUntil) return { id: cur.foe.uid, until: f.peelUntil };
  const top = ranked[0];
  if (cur && top !== cur && top.peelThreat < cur.peelThreat * 1.3) return { id: cur.foe.uid, until: ctx.clock + C.peelLock };
  return { id: top.foe.uid, until: ctx.clock + C.peelLock };
}

export interface StrikeZone { x: number; y: number; r: number; dmg: number; boss: boolean; /** segundos desde que o golpe foi avisado */ age: number }
/**
 * Perigo de ficar onde está: fração da vida ATUAL do herói que os golpes avisados em cima dele tirariam (soma dos que o cobrem).
 * `count` = quantos golpes o cobrem; `boss` = algum é pancada de chefe.
 */
export function windupDanger(hero: { pt: Pt; hp: number }, zones: StrikeZone[], pad = .2): { ratio: number; count: number; boss: boolean } {
  let dmg = 0, count = 0, boss = false;
  for (const z of zones) if (dist(hero.pt, z) <= z.r + pad) { dmg += z.dmg; count++; boss ||= z.boss; }
  return { ratio: dmg / Math.max(1, hero.hp), count, boss };
}
/** O tanque segura a posição dentro de golpes avisados leves; sai quando o risco é alto (letal, vida baixa, vários sobrepostos, AoE forte de chefe). */
export function tankShouldLeave(hero: { pt: Pt; hp: number; maxHp: number }, zones: StrikeZone[]): boolean {
  const d = windupDanger(hero, zones); if (!d.count) return false;
  const low = hero.hp / hero.maxHp < C.tankLowHp;
  return d.ratio >= C.tankLeaveLethal || (low && d.ratio >= C.tankLeaveLow) || (d.count >= 2 && d.ratio >= C.tankLeaveStacked) || (d.boss && d.ratio >= C.tankLeaveBoss);
}
/** Deve esquivar de golpes avisados? Todo mundo menos o tanque, que decide pelo risco (`tankShouldLeave`). */
export function shouldEvade(hero: { role: Role; pt: Pt; hp: number; maxHp: number }, zones: StrikeZone[], pad = .2): boolean {
  if (!zones.some(z => dist(hero.pt, z) <= z.r + pad)) return false;
  return hero.role === 'tank' ? tankShouldLeave(hero, zones) : true;
}
/** Para antes de atravessar um círculo avisado: devolve o ponto até onde dá para ir de `from` em direção a `to` sem tocar a margem de nenhum círculo. */
export function stopBeforeZones(from: Pt, to: Pt, zones: { x: number; y: number; r: number }[], margin = .5): Pt {
  let t = 1; const dx = to.x - from.x, dy = to.y - from.y, len2 = dx * dx + dy * dy; if (len2 < 1e-9) return to;
  for (const z of zones) {
    const R = z.r + margin, fx = from.x - z.x, fy = from.y - z.y; if (fx * fx + fy * fy <= R * R) continue;   // já dentro da margem: a esquiva cuida
    const b = fx * dx + fy * dy, c = fx * fx + fy * fy - R * R, disc = b * b - len2 * c; if (disc < 0) continue;
    const t0 = (-b - Math.sqrt(disc)) / len2; if (t0 > 0 && t0 < t) t = Math.max(0, t0 - .03);
  }
  return t >= 1 ? to : { x: from.x + dx * t, y: from.y + dy * t };
}
/** Golpes que o herói já percebeu (cada um reage com atraso próprio: ninguém prevê o que ainda não foi telegrafado e ninguém reage no mesmo frame). */
export const noticedZones = (heroId: string, zones: StrikeZone[]) => { const delay = reactDelay(heroId); return zones.filter(z => z.age >= delay); };

/** Retirada: entra abaixo de `retreatAt`; já em retirada, só sai quando a vida passa de `retreatAt + retreatExit` (histerese). */
export function shouldRetreat(hero: { hpFrac: number; ai: AiConfig }, state: AiState): boolean {
  if (hero.ai.retreatAt <= 0) return false;
  return hero.hpFrac < hero.ai.retreatAt + (state === 'retreat' ? C.retreatExit : 0);
}

/** O destino guardado muda só se o novo for bem diferente do atual (ou se o guardado venceu): evita andar poucos pixels para lá e para cá. */
export function commitDest(ai: HeroAi, want: Pt, now: number, force = false): Pt {
  if (!ai.dest || force || now >= ai.destUntil || dist(want, ai.dest) > C.destEps) { ai.dest = { ...want }; ai.destUntil = now + C.destHold; }
  return ai.dest;
}
export function setState(ai: HeroAi, state: AiState, now: number, hold = 0): boolean {
  if (ai.state === state) { ai.stateUntil = Math.max(ai.stateUntil, now + hold); return false; }
  if (now < ai.stateUntil && ai.state !== 'travel' && state !== 'evade' && state !== 'retreat') return false;
  ai.state = state; ai.stateUntil = now + hold; return true;
}
