import { RUN_CONFIG as R, WAVE_CONFIG } from '../data/balance';
import { CLASSES } from '../data/classes';
import { itemById } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { spellById } from '../data/spells';
import { livingMonsters, livingTeam } from '../systems/combat';
import { characterStats } from '../systems/progression';
import type { Character, GameState, MonsterRuntime, RunState } from '../core/types';
import { BAND, RunPlan, type Encounter, type Pt } from './plan';
import { BOSS_ENRAGE, FOE_ATTACK, foeRole, isRanged } from './foes';
import { dist, fits, lineClear, perp, RADIUS, type Body } from './geom';
import { AI_CONFIG } from '../data/balance';
import { runtime } from '../rpg/runtime';
import { huntScale } from '../data/hunts';
import { monsterKind } from '../systems/waves';
import { physicalDamage } from '../systems/combat';
import { buildFoeInfos, chooseHeroTarget, choosePeelTarget, choosePrimaryTarget, commitDest, incomingByFoe, lockFor, newHeroAi, noticedZones, setState, shouldEvade, type AiConfig, type FoeView, type HeroView, type PartyCtx, type Role, type StrikeZone } from './ai';
import { desiredHeroPosition } from './position';

/**
 * Mundo do corredor: posições em células do mundo (x, y), movimento, colisão e IA de quem anda no mapa. Só lê CONFIGURAÇÃO (nunca ordens ao
 * vivo); o dano fica no GameEngine. Cada unidade ocupa um espaço próprio (círculo), e os monstros corpo a corpo disputam as 8 células em volta de
 * cada herói: quando as vagas do tanque acabam, o excedente vai atrás de quem está na backline (como no Tibia).
 */
export type { Pt };
export { dist, fits, RADIUS };
export type { Body };
export const radiusOf = (m: MonsterRuntime) => MONSTERS[m.defId].boss ? RADIUS.boss : RADIUS.unit;
const NEIGHBORS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Caminho curto (busca em largura em células, 8 direções, sem cortar quina) até a célula do alvo; devolve o centro da primeira célula do caminho. */
export function waypoint(plan: RunPlan, u: Pt, tx: number, ty: number): Pt | null {
  const sx = Math.floor(u.x), sy = Math.floor(u.y), gx = Math.floor(tx), gy = Math.floor(ty);
  const lox = Math.min(sx, gx) - 5, loy = Math.min(sy, gy) - 5, w = Math.abs(sx - gx) + 11, h = Math.abs(sy - gy) + 11;
  if (w > 60 || h > 60) return null;
  const idx = (x: number, y: number) => (x - lox) * h + (y - loy), prev = new Int32Array(w * h).fill(-2);
  const queue: number[] = [idx(sx, sy)]; prev[queue[0]] = -1;
  let best = queue[0], bestDist = Math.hypot(gx - sx, gy - sy);
  for (let qi = 0; qi < queue.length && qi < 900; qi++) {
    const cur = queue[qi], x = Math.floor(cur / h) + lox, y = cur % h + loy, d = Math.hypot(gx - x, gy - y);
    if (d < bestDist) { bestDist = d; best = cur; if (d === 0) break; }
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx, ny = y + dy; if (nx < lox || ny < loy || nx >= lox + w || ny >= loy + h) continue;
      const ni = idx(nx, ny); if (prev[ni] !== -2 || plan.isBlockedCell(nx, ny)) continue;
      if (dx && dy && (plan.isBlockedCell(x + dx, y) || plan.isBlockedCell(x, y + dy))) continue;
      prev[ni] = cur; queue.push(ni);
    }
  }
  const start = idx(sx, sy); if (best === start) return null;
  let cur = best; while (prev[cur] !== start) { cur = prev[cur]; if (cur < 0) return null; }
  return { x: Math.floor(cur / h) + lox + .5, y: cur % h + loy + .5 };
}

/**
 * Anda até (tx, ty) no máximo `step`: em linha reta quando o trecho está livre, senão segue o caminho da busca; depois resolve a colisão com as
 * outras unidades (só recusa quem entra mais fundo no espaço do outro; encostar e se afastar é permitido) e escorrega pelos eixos.
 */
export function moveToward(plan: RunPlan, u: Body, tx: number, ty: number, step: number, others: Body[]) {
  if (Math.hypot(tx - u.pt.x, ty - u.pt.y) > 10) { const k = 10 / Math.hypot(tx - u.pt.x, ty - u.pt.y); tx = u.pt.x + (tx - u.pt.x) * k; ty = u.pt.y + (ty - u.pt.y) * k; }
  const dx = tx - u.pt.x, dy = ty - u.pt.y, dd = Math.hypot(dx, dy);
  if (dd < 1e-6) return;
  const free = (x: number, y: number) => fits(plan, x, y, u.r);
  const clear = (len: number) => { for (let l = Math.min(step, len); l < len + .25; l += .25) { const m = Math.min(l, len); if (!free(u.pt.x + dx / dd * m, u.pt.y + dy / dd * m)) return false; } return true; };
  let mx = dx, my = dy;
  if (!clear(Math.min(dd, 4))) { const wp = waypoint(plan, u.pt, tx, ty); if (!wp) return; mx = wp.x - u.pt.x; my = wp.y - u.pt.y; }
  const md = Math.hypot(mx, my) || 1, k = Math.min(1, step / md);
  const ok = (x: number, y: number) => {
    if (!free(x, y)) return false;
    for (const o of others) { if (o === u) continue; const now = Math.hypot(u.pt.x - o.pt.x, u.pt.y - o.pt.y), next = Math.hypot(x - o.pt.x, y - o.pt.y), min = u.r + o.r - .08; if (next < min && next < now - 1e-6) return false; }
    return true;
  };
  for (const [ax, ay] of [[mx * k, my * k], [mx * k, 0], [0, my * k]]) if ((ax || ay) && ok(u.pt.x + ax, u.pt.y + ay)) { u.pt.x += ax; u.pt.y += ay; return; }
}
/** Folga (células) além do raio de um círculo avisado em que o herói já se considera dentro: um passo de ~.45 não o coloca de volta ao alcance do golpe. */
const SAFE = .9;
/** Ninguém escolhe parar numa armadilha: o ponto vai para a célula livre mais próxima (passar por cima, no caminho, ainda é possível). */
export function avoidTrap(plan: RunPlan, p: Pt): Pt {
  if (!plan.isTrap(p.x, p.y)) return p;
  let best = p, bestD = Infinity;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
    const cx = Math.floor(p.x) + dx, cy = Math.floor(p.y) + dy;
    if (plan.cellKind(cx, cy) !== 1) continue;
    const q = { x: cx + .5, y: cy + .5 }, d = dist(p, q); if (d < bestD) { bestD = d; best = q; }
  }
  return best;
}
/** Saída de um círculo avisado: de 16 pontos logo fora dele, o mais perto de quem está dentro cujo caminho não esbarra em ninguém e cabe no chão. */
function escapePoint(plan: RunPlan, self: Body, w: { x: number; y: number; r: number }, bodies: Body[]): Pt | null {
  const out = w.r + SAFE + .1; let best: Pt | null = null, bestD = Infinity;
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, p = { x: w.x + Math.cos(a) * out, y: w.y + Math.sin(a) * out };
    if (!fits(plan, p.x, p.y, self.r)) continue;
    let free = true;
    for (let t = .25; t <= 1 && free; t += .25) { const q = { x: self.pt.x + (p.x - self.pt.x) * t, y: self.pt.y + (p.y - self.pt.y) * t }; free = bodies.every(o => o === self || dist(q, o.pt) >= o.r + self.r - .05) && fits(plan, q.x, q.y, self.r); }
    const d = dist(self.pt, p); if (free && d < bestD) { bestD = d; best = p; }
  }
  return best;
}
/** Leva o ponto `p` para fora do círculo `w` (r + folga), no sentido de `from` (ou, se coincidem, de lado); tenta ângulos vizinhos até achar chão. */
function pushOut(plan: RunPlan, p: Pt, w: { x: number; y: number; r: number }, from: Pt): Pt {
  const base = dist(from, w) > .05 ? Math.atan2(from.y - w.y, from.x - w.x) : Math.atan2(p.y - w.y, p.x - w.x) + .7;
  for (const rad of [w.r + SAFE + .1, w.r + .5]) for (const da of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
    const q = { x: w.x + Math.cos(base + da) * rad, y: w.y + Math.sin(base + da) * rad }; if (fits(plan, q.x, q.y, RADIUS.unit)) return q;
  }
  return p;
}
/** Empurra para fora quem nasceu ou ficou sobreposto a outra unidade (devagar, só para onde há chão). */
function separate(plan: RunPlan, bodies: Body[], dt: number) {
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j], d = Math.hypot(a.pt.x - b.pt.x, a.pt.y - b.pt.y), min = a.r + b.r - .1;
    if (d >= min) continue;
    const nx = d > 1e-6 ? (a.pt.x - b.pt.x) / d : Math.cos(i), ny = d > 1e-6 ? (a.pt.y - b.pt.y) / d : Math.sin(i), push = Math.min(.12, (min - d) / 2 + .01) * Math.min(1, dt * 12);
    if (fits(plan, a.pt.x + nx * push, a.pt.y + ny * push, a.r)) { a.pt.x += nx * push; a.pt.y += ny * push; }
    if (fits(plan, b.pt.x - nx * push, b.pt.y - ny * push, b.r)) { b.pt.x -= nx * push; b.pt.y -= ny * push; }
  }
}

export type { Role, AiConfig };
export const DEFAULT_AI: Record<Role, AiConfig> = {
  tank: { hold: 0, leash: 99, retreatAt: 0, dodge: 0 },
  melee: { hold: 0, leash: 5, retreatAt: .25, dodge: 0 },
  ranged: { hold: 4, leash: 4, retreatAt: .4, dodge: 1.8 },
  healer: { hold: 5, leash: 3, retreatAt: .5, dodge: 2.2 },
};
const weaponSkill = (c: Character) => itemById(c.equipment.weapon ?? '')?.trains ?? CLASSES[c.classId].weaponSkill;
export const isMelee = (c: Character) => { const s = weaponSkill(c); return s === 'melee' || s === 'defense'; };
/** Papel no mapa: tanque marcado, corpo a corpo, curandeiro (tem magia de cura equipada) ou à distância. */
export function heroRole(c: Character): Role {
  if (c.isTank) return 'tank';
  if (isMelee(c)) return 'melee';
  return c.spellSlots.some(id => { const s = spellById(id); return s && (s.kind === 'heal' || s.kind === 'regen'); }) ? 'healer' : 'ranged';
}
/** Raio (células) em volta do ponto de descanso dentro do qual o herói luta, desvia e recua. */
export const roamOf = (role: Role, ai: AiConfig) => role === 'tank' ? 5 : Math.min(7, Math.max(3.5, ai.leash + 1.5));
export const aiOf = (c: Character, role = heroRole(c)): AiConfig => ({ ...DEFAULT_AI[role], ...(c.helper.ai ?? {}) });
/** Alcance do golpe básico (células). */
export const reachOf = (c: Character) => isMelee(c) ? R.meleeReach : R.rangedReach;

export function createRun(state: GameState, seed = Math.floor(Math.random() * 2 ** 31)): RunState {
  const run: RunState = { seed, anchor: 4, pos: {}, lastTrigger: 0, open: false, queue: [], deepest: 4 };
  state.run = run; return run;
}
/** Célula livre mais próxima de `p` (espiral de até 3 células); sem nenhuma, devolve `p`. */
export function freeNear(plan: RunPlan, p: Pt): Pt {
  if (fits(plan, p.x, p.y, RADIUS.unit)) return { ...p };
  for (let k = 1; k <= 3; k++) for (let dx = -k; dx <= k; dx++) for (let dy = -k; dy <= k; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== k) continue;
    const q = { x: Math.floor(p.x) + dx + .5, y: Math.floor(p.y) + dy + .5 };
    if (fits(plan, q.x, q.y, RADIUS.unit)) return q;
  }
  return { ...p };
}
/** Coloca (ou recoloca) a equipe na formação em volta do ponto `run.anchor`: frente na âncora, trás `rear` células atrás, espalhados na largura. */
export function placeParty(state: GameState, plan: RunPlan) {
  const run = state.run!, team = state.team.map(id => state.characters.find(c => c.id === id)).filter(Boolean) as Character[];
  plan.ensure(plan.indexAt(run.anchor));
  const fwd = plan.forwardAt(run.anchor), side = perp(fwd);
  const put = (list: Character[], back: number) => list.forEach((c, i) => {
    const base = plan.pathPoint(run.anchor - back), off = (i - (list.length - 1) / 2) * 1.25;
    run.pos[c.id] = freeNear(plan, { x: base.x + side.x * off, y: base.y + side.y * off });
  });
  put(team.filter(c => c.row === 'front'), 0); put(team.filter(c => c.row === 'back'), R.rear);
}
/** Coloca (ou recoloca) um herói só, no ponto da fila dele em volta da âncora: usado ao reviver. */
export function placeHero(state: GameState, plan: RunPlan, c: Character) {
  const run = state.run!, team = state.team.map(id => state.characters.find(x => x.id === id)).filter(Boolean) as Character[];
  plan.ensure(plan.indexAt(run.anchor));
  const side = perp(plan.forwardAt(run.anchor)), list = team.filter(x => x.row === c.row), base = plan.pathPoint(run.anchor - (c.row === 'back' ? R.rear : 0)), off = (list.indexOf(c) - (list.length - 1) / 2) * 1.25;
  run.pos[c.id] = freeNear(plan, { x: base.x + side.x * off, y: base.y + side.y * off });
}
export const posOf = (run: RunState, c: Character): Pt => run.pos[c.id] ??= { ...{ x: 0, y: 0 } };

/** Monstros ao alcance `reach` de `c`, do mais perto para o mais longe. */
export function foesInReach(state: GameState, c: Character, reach: number): MonsterRuntime[] {
  const run = state.run; if (!run) return livingMonsters(state);
  const me = posOf(run, c);
  return livingMonsters(state).filter(m => m.x !== undefined && dist(me, { x: m.x, y: m.y! }) - radiusOf(m) + RADIUS.unit <= reach).sort((a, b) => dist(me, { x: a.x!, y: a.y! }) - dist(me, { x: b.x!, y: b.y! }));
}
/**
 * Alvos ao alcance na ordem em que o herói deve atacar: o alvo escolhido pela IA primeiro, depois o alvo principal do grupo, depois quem está quase morto,
 * depois o mais perto. Quem dispara projéteis deixa por último o inimigo cujo dano em voo já cobre a vida que resta (reserva de overkill).
 */
export function attackOrder(state: GameState, c: Character, reach: number, projectile = false): MonsterRuntime[] {
  const list = foesInReach(state, c, reach), run = state.run; if (!run || list.length < 2) return list;
  const pref = run.ai?.[c.id]?.targetId, primary = run.focus?.primaryId;
  const incoming = projectile ? incomingByFoe(run.shots ?? [], list.map(m => ({ uid: m.uid, pt: { x: m.x!, y: m.y! }, r: radiusOf(m) }))) : undefined;
  const rank = (m: MonsterRuntime, i: number) => (incoming && (incoming.get(m.uid) ?? 0) >= m.hp * .95 ? 100 : 0) + (m.uid === pref ? 0 : m.uid === primary ? 10 : m.hp / m.maxHp <= AI_CONFIG.executeHp ? 20 : 30) + i * .1;
  return list.map((m, i) => ({ m, r: rank(m, i) })).sort((a, b) => a.r - b.r).map(x => x.m);
}
/** Todos os alvos ao alcance já têm dano suficiente a caminho? Então quem atira espera em vez de gastar mais uma flecha. */
export function allCovered(state: GameState, targets: MonsterRuntime[]): boolean {
  const run = state.run; if (!run?.shots?.length || !targets.length) return false;
  const incoming = incomingByFoe(run.shots, targets.map(m => ({ uid: m.uid, pt: { x: m.x!, y: m.y! }, r: radiusOf(m) })));
  return targets.every(m => (incoming.get(m.uid) ?? 0) >= m.hp * .95);
}
/** Heróis que um monstro alcança agora. */
export const heroesInReach = (state: GameState, m: MonsterRuntime, team: Character[]) => {
  const run = state.run; if (!run || m.x === undefined) return team;
  return team.filter(h => dist(posOf(run, h), { x: m.x!, y: m.y! }) <= R.foeReach + (radiusOf(m) - RADIUS.unit));
};

export interface WorldHooks {
  /** um encontro dispara: o motor registra a wave (tier, mensagem, mecânicas de início de wave) */
  trigger(chunk: number, enc: Encounter): void;
  /** nascem monstros: o motor cria os `MonsterRuntime` */
  spawn(chunk: number, ids: string[], at: Pt[], ambush?: boolean): void;
  /** telemetria da IA (trocas de alvo, limites de roam, retiradas, esquivas, peel); o harness usa para medir a sensação da run */
  note?(event: 'switch' | 'roam' | 'retreat' | 'dodge' | 'peel', heroId: string): void;
}

/** Posição da vaga `k` (0 a 7, de 45 em 45°) no anel de raio `R.ringRadius` em volta de um herói. */
export const ringPoint = (h: Pt, k: number): Pt => ({ x: h.x + Math.cos(k * Math.PI / 4) * R.ringRadius, y: h.y + Math.sin(k * Math.PI / 4) * R.ringRadius });
const RING = 8;
/**
 * Grupos de aggro, na ordem em que os monstros ocupam as vagas: 1º os tanques (frente + marcados), 2º o resto da frente, 3º a backline.
 * Sem tanque marcado, a frente é quem recebe primeiro. Só entra no grupo seguinte quando o anel do anterior está cheio.
 */
export function aggroGroups(team: Character[]): Character[][] {
  const tanks = team.filter(c => c.isTank && c.row === 'front'), front = team.filter(c => c.row === 'front' && !tanks.includes(c)), back = team.filter(c => c.row === 'back');
  return [tanks, front, back].filter(g => g.length);
}

/**
 * Vagas de corpo a corpo (estilo Tibia): cada herói tem um anel de 8 vagas. Os monstros ocupam o anel do tanque primeiro (a vaga mais perto
 * do lado de onde vêm), depois o dos outros da frente, e só então o da backline. Quem não cabe em nenhum anel espera em fila logo atrás do
 * anel do tanque (ver `holdPoint`), nunca solto pela tela. Quem já tem vaga a mantém enquanto ela for válida.
 */
function assignSlots(plan: RunPlan, foes: MonsterRuntime[], team: Character[], run: RunState) {
  const groups = aggroGroups(team), pos = (h: Character) => posOf(run, h);
  const roleOf = (m: MonsterRuntime) => m.ambush ? 'runner' : foeRole(m.defId);
  const usable = foes.filter(m => !MONSTERS[m.defId].boss && !isRanged(roleOf(m)));
  for (const m of foes) if (MONSTERS[m.defId].boss || isRanged(roleOf(m))) delete m.slot;
  const claimed = new Set<string>(), key = (id: string, k: number) => `${id}#${k}`;
  const open = (h: Character, k: number) => {
    if (claimed.has(key(h.id, k))) return false;
    const p = ringPoint(pos(h), k);
    if (!fits(plan, p.x, p.y, RADIUS.unit)) return false;
    return !team.some(o => o !== h && dist(p, pos(o)) < RADIUS.unit * 1.6);
  };
  const left = new Set(usable);
  const take = (m: MonsterRuntime, h: Character, k: number) => { claimed.add(key(h.id, k)); const p = ringPoint(pos(h), k); m.slot = { x: p.x, y: p.y, hero: h.id, k }; left.delete(m); };
  /** Um passo: os `who` ocupam, grupo a grupo na ordem dada, as vagas livres (quem já tem vaga no grupo a mantém; depois, a vaga mais perto). */
  const pass = (who: (m: MonsterRuntime) => boolean, order: Character[][]) => {
    for (const group of order) {
      for (const m of [...left].filter(who)) { const s = m.slot, h = s && group.find(x => x.id === s.hero); if (s && h && s.k !== undefined && open(h, s.k)) take(m, h, s.k); }
      const near = (m: MonsterRuntime) => Math.min(...group.map(h => dist(pos(h), { x: m.x!, y: m.y! })));
      for (const m of [...left].filter(who).sort((a, b) => near(a) - near(b))) {
        let best: { h: Character; k: number; d: number } | undefined;
        for (const h of group) for (let k = 0; k < RING; k++) {
          if (!open(h, k)) continue;
          const p = ringPoint(pos(h), k), d = dist(p, { x: m.x!, y: m.y! });
          if (!best || d < best.d - 1e-6) best = { h, k, d };
        }
        if (!best) break; // anel cheio: o resto desce para o próximo grupo
        take(m, best.h, best.k);
      }
    }
  };
  pass(m => roleOf(m) === 'runner', [...groups].reverse()); // corredores vão direto na backline
  pass(() => true, groups);
  for (const m of left) delete m.slot;
}
/**
 * Quem chega pelo lado errado do anel não empurra os vizinhos: contorna por uma pista externa (raio do anel + 1) até ficar a uma
 * fatia (≤ 23°) da própria vaga, e só então entra nela.
 */
function orbitTarget(m: MonsterRuntime, slot: NonNullable<MonsterRuntime['slot']>, team: Character[], run: RunState): Pt {
  const h = team.find(c => c.id === slot.hero); if (!h || slot.k === undefined) return slot;
  const c = posOf(run, h), here = Math.atan2(m.y! - c.y, m.x! - c.x), want = slot.k * Math.PI / 4;
  let diff = want - here; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= .4 || dist(c, { x: m.x!, y: m.y! }) > R.ringRadius + 3) return slot;
  const a = here + Math.sign(diff) * .8, r = R.ringRadius + 1;
  return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
}
/** Atirador/mago: fica a ~85% do alcance do alvo (de preferência da backline), do lado de onde veio; se o alvo chegar perto demais, recua. */
export function shootPoint(m: MonsterRuntime, team: Character[], run: RunState): Pt {
  const cfg = FOE_ATTACK[foeRole(m.defId) as 'archer' | 'caster'], back = team.filter(h => h.row === 'back'), pool = back.length ? back : team;
  const prey = pool.reduce((b, h) => dist(posOf(run, h), { x: m.x!, y: m.y! }) < dist(posOf(run, b), { x: m.x!, y: m.y! }) ? h : b, pool[0]), p = posOf(run, prey);
  const dx = m.x! - p.x, dy = m.y! - p.y, d = Math.hypot(dx, dy) || 1, want = cfg.range * .85;
  return Math.abs(d - want) < .6 ? { x: m.x!, y: m.y! } : { x: p.x + dx / d * want, y: p.y + dy / d * want };
}
/** Onde espera quem ficou sem vaga: numa fila de raio crescente em volta do primeiro grupo de aggro, do lado de onde o monstro vem. */
export function holdPoint(m: MonsterRuntime, team: Character[], run: RunState, rank: number): Pt {
  const center = posOf(run, aggroGroups(team)[0][0]), dx = m.x! - center.x, dy = m.y! - center.y, d = Math.hypot(dx, dy) || 1;
  const r = R.ringRadius + 1.1 + Math.floor(rank / 5) * .85;
  return { x: center.x + dx / d * r, y: center.y + dy / d * r };
}

const navT = new WeakMap<object, number>();
/** Um passo do mundo: encontros, levas, movimento dos monstros e da equipe (a IA, com colisão) e avanço do grupo. O dano fica por conta do motor. */
export function stepRun(state: GameState, plan: RunPlan, dt: number, hooks: WorldHooks) {
  const run = state.run!, team = livingTeam(state);
  if (!team.length) return;
  run.clock = (run.clock ?? 0) + dt;
  plan.ensure(plan.indexAt(run.anchor));
  const foes = livingMonsters(state).filter(m => m.x !== undefined);
  const tank = team.find(c => c.isTank) ?? team[0], tankAt = posOf(run, tank), fwd = plan.forwardAt(run.anchor), side = perp(fwd);
  const here = plan.pathPoint(run.anchor);
  // 1) o grupo só anda quando todos estão perto da âncora e não há inimigo por perto
  if (team.every(c => dist(posOf(run, c), here) <= R.rear + 4) && !foes.some(f => f.ambush || dist({ x: f.x!, y: f.y! }, tankAt) < R.engage)) { run.anchor += R.walk * dt; run.deepest = Math.max(run.deepest, run.anchor); }
  // 2) encontros do chunk em que o grupo está
  const idx = plan.indexAt(run.anchor), chunk = plan.chunk(idx), enc = chunk.encounter;
  if (enc && run.lastTrigger < idx && run.anchor >= chunk.start + enc.at) { run.lastTrigger = idx; run.open = true; const behind = enc.ambush ? enc.monsters.slice(-enc.ambush) : undefined;
    run.queue.push({ chunk: idx, ids: enc.ambush ? enc.monsters.slice(0, -enc.ambush) : [...enc.monsters], waited: 0 }); hooks.trigger(idx, enc);
    if (behind) hooks.spawn(idx, behind, behind.map(() => plan.spawnPoint(Math.max(1, run.anchor - R.rear - 4 - Math.random() * 3), Math.random)), true);
  }
  // 3) levas: mesmos números das waves (WAVE_CONFIG)
  for (const q of run.queue) {
    q.waited += dt;
    const alive = livingMonsters(state).length, room = WAVE_CONFIG.maxAlive - alive, first = q.waited <= dt;
    if (room > 0 && (first || alive < WAVE_CONFIG.below || q.waited >= WAVE_CONFIG.intervalS * 2)) {
      const ids = q.ids.splice(0, Math.min(first ? WAVE_CONFIG.maxAlive : WAVE_CONFIG.batch, room));
      const at = ids.map(() => plan.spawnPoint(run.anchor + R.spawnAhead + Math.random() * 5, Math.random));
      hooks.spawn(q.chunk, ids, at); q.waited = .001;
    }
  }
  run.queue = run.queue.filter(q => q.ids.length);
  const living = livingMonsters(state).filter(m => m.x !== undefined);
  // 4) corpos: todos os vivos, para a colisão
  const heroBody = new Map(team.map(c => [c.id, { pt: posOf(run, c), r: RADIUS.unit } as Body]));
  const foeBody = new Map(living.map(m => [m.uid, { pt: { x: m.x!, y: m.y! }, r: radiusOf(m) } as Body]));
  const bodies = [...heroBody.values(), ...foeBody.values()];
  assignSlots(plan, living, team, run);
  const waiting = living.filter(m => !m.slot && !MONSTERS[m.defId].boss && !isRanged(foeRole(m.defId))).sort((a, b) => dist({ x: a.x!, y: a.y! }, tankAt) - dist({ x: b.x!, y: b.y! }, tankAt));
  for (const f of living) {
    const body = foeBody.get(f.uid)!;
    if ((f.statuses?.frozen ?? 0) > 0 || (f.statuses?.stunned ?? 0) > 0) continue;
    const boss = !!MONSTERS[f.defId].boss, speed = R.foeSpeed * (boss ? .75 : MONSTERS[f.defId].speed > 1 ? 1 : .85) * ((f.phase ?? 0) >= 2 ? BOSS_ENRAGE.speed : 1) * dt;
    let target: Pt, stop = 0;
    if (f.slot) target = orbitTarget(f, f.slot, team, run);
    else if (boss) { target = tankAt; stop = 1.9; }
    else if (isRanged(foeRole(f.defId))) { target = shootPoint(f, team, run); stop = .1; }
    else { target = holdPoint(f, team, run, waiting.indexOf(f)); stop = .1; }
    if (dist(body.pt, target) > .12 + stop) moveToward(plan, body, target.x, target.y, speed, bodies);
    f.x = body.pt.x; f.y = body.pt.y;
  }
  // 5) equipe: Utility AI (alvo por pontuação, alvo principal e de peel, memória curta, histerese)
  stepHeroes(state, plan, dt, hooks, { team, living, bodies, heroBody, tankAt, fwd, side, here });
  separate(plan, bodies, dt);
  for (const f of living) { const b = foeBody.get(f.uid)!; f.x = b.pt.x; f.y = b.pt.y; }
  void navT; void BAND;
}

/** Estado do mundo que o passo da equipe usa. */
interface StepEnv { team: Character[]; living: MonsterRuntime[]; bodies: Body[]; heroBody: Map<string, Body>; tankAt: Pt; fwd: Pt; side: Pt; here: Pt }
const weaponIsRanged = (c: Character) => weaponSkill(c) === 'ranged';
const hasAoe = (c: Character) => c.spellSlots.some(id => { const sp = spellById(id); return !!sp && sp.kind === 'damage' && sp.target === 'allEnemies' && sp.level <= c.profile.level; });
/** Dano bruto de uma pancada do monstro (antes da armadura do alvo). */
const foeRaw = (state: GameState, m: MonsterRuntime) => MONSTERS[m.defId].attack * (m.atkMul ?? 1) * runtime.monsterAtk * huntScale(state.huntId).atk;
const roleOfFoe = (m: MonsterRuntime): FoeView['role'] => m.ambush ? 'runner' : MONSTERS[m.defId].boss && (m.phase ?? 0) >= 2 ? 'boss' : foeRole(m.defId);

/** Monta as visões (heróis e inimigos) e o contexto do grupo: alvo principal e peel já atualizados com suas travas. */
export function buildPartyCtx(state: GameState, plan: RunPlan, env: Pick<StepEnv, 'team' | 'living' | 'fwd' | 'side'>, extra?: { stats?: Map<string, ReturnType<typeof characterStats>> }): { ctx: PartyCtx; views: Map<string, HeroView>; foeById: Map<string, MonsterRuntime>; homeOf: (c: Character) => Pt } {
  const run = state.run!, { team, living, fwd, side } = env;
  const homeOf = (c: Character): Pt => { const back = c.row === 'back' ? R.rear : 0, at = plan.pathPoint(run.anchor - back), lane = (team.indexOf(c) - (team.length - 1) / 2) * 1.25; return { x: at.x + side.x * lane, y: at.y + side.y * lane }; };
  const views = new Map<string, HeroView>();
  for (const c of team) {
    const role = heroRole(c), ai = aiOf(c, role), st = extra?.stats?.get(c.id) ?? characterStats(c, state), maxHp = st.maxHp;
    views.set(c.id, { id: c.id, role, row: c.row, pt: posOf(run, c), home: homeOf(c), hp: c.hp, maxHp, hpFrac: c.hp / maxHp, defense: st.defense, reach: reachOf(c), roam: roamOf(role, ai), ai, projectile: weaponIsRanged(c), aoe: hasAoe(c) });
  }
  const incoming = incomingByFoe(run.shots ?? [], living.map(m => ({ uid: m.uid, pt: { x: m.x!, y: m.y! }, r: radiusOf(m) })));
  const foeViews: FoeView[] = living.map(m => ({
    uid: m.uid, defId: m.defId, pt: { x: m.x!, y: m.y! }, r: radiusOf(m), role: roleOfFoe(m), hp: m.hp, maxHp: m.maxHp, hpFrac: m.hp / m.maxHp,
    boss: !!MONSTERS[m.defId].boss, elite: monsterKind(m.defId) === 'elite', ambush: !!m.ambush, vulnerable: (m.statuses?.frozen ?? 0) > 0 || (m.statuses?.stunned ?? 0) > 0,
    holder: m.slot?.hero, dmg: foeRaw(state, m), incoming: incoming.get(m.uid) ?? 0,
  }));
  const heroes = [...views.values()], infos = buildFoeInfos(heroes, foeViews), focus = run.focus ??= { primaryUntil: 0, peelUntil: 0 };
  const ctx: PartyCtx = { heroes, infos, fwd, clock: run.clock ?? 0, focus, peelers: heroes.filter(h => run.ai?.[h.id]?.state === 'peel').length };
  const pri = choosePrimaryTarget(ctx); focus.primaryId = pri.id; focus.primaryUntil = pri.until;
  const peel = choosePeelTarget(ctx); focus.peelId = peel.id; focus.peelUntil = peel.until;
  return { ctx, views, foeById: new Map(living.map(m => [m.uid, m])), homeOf };
}

/** Golpes avisados em cima do herói, com o dano que cada um tiraria dele (armadura incluída) e há quanto tempo foram avisados. */
function strikeZones(state: GameState, hero: HeroView, foeById: Map<string, MonsterRuntime>): StrikeZone[] {
  return (state.run!.windups ?? []).map(w => { const m = foeById.get(w.src); return { x: w.x, y: w.y, r: w.r, dmg: physicalDamage(m ? foeRaw(state, m) : 0, hero.defense) * w.mult, boss: w.role === 'boss', age: w.total - w.t }; });
}

/**
 * Passo da equipe. Cada herói decide a cada `thinkEvery` (escalonado): alvo (Utility AI com trava), posição desejada pelo papel (com histerese) e
 * destino guardado; entre as decisões só anda. Golpes avisados são percebidos com atraso individual; o tanque pesa o risco antes de sair.
 */
function stepHeroes(state: GameState, plan: RunPlan, dt: number, hooks: WorldHooks, env: StepEnv) {
  const run = state.run!, { team, bodies, heroBody, fwd, here } = env, clock = run.clock ?? 0, ais = run.ai ??= {};
  const stats = new Map(team.map(c => [c.id, characterStats(c, state)]));
  const { ctx, views, foeById } = buildPartyCtx(state, plan, env, { stats });
  const tank = ctx.heroes.find(h => h.role === 'tank');
  const pctx = { ...ctx, tank, lineClear: (a: Pt, b: Pt) => lineClear(plan, a, b) };
  const along = (p: Pt, o: Pt) => (p.x - o.x) * fwd.x + (p.y - o.y) * fwd.y;
  const engaged = ctx.infos.some(i => dist(i.foe.pt, env.tankAt) < R.engage + 3);
  for (const id of Object.keys(ais)) if (!views.has(id)) delete ais[id];
  for (const c of team) {
    const view = views.get(c.id)!, body = heroBody.get(c.id)!, me = body.pt, ai = ais[c.id] ??= newHeroAi();
    const zones = noticedZones(c.id, strikeZones(state, view, foeById)), evade = shouldEvade(view, zones);
    const targetGone = !!ai.targetId && !foeById.has(ai.targetId);
    const jitter = AI_CONFIG.thinkEvery * (.8 + .4 * (team.indexOf(c) % 3) / 2);
    if (clock - ai.thinkAt >= jitter || !ai.dest || targetGone || evade) {
      ai.thinkAt = clock;
      const choice = chooseHeroTarget(ctx, view, ai);
      if (choice.id !== ai.targetId) { if (ai.targetId && choice.id) hooks.note?.('switch', c.id); ai.targetId = choice.id; ai.targetLockUntil = choice.id ? clock + lockFor(c.id, choice.id) : 0; }
      const target = ai.targetId ? ctx.infos.find(i => i.foe.uid === ai.targetId) : undefined;
      const want = desiredHeroPosition(pctx, view, ai, target);
      let { x: tx, y: ty } = want.pt, state2 = want.state;
      const home = view.home;
      // leash: quem não é tanque não passa da frente configurada em relação ao tanque
      if (view.role !== 'tank' && along({ x: tx, y: ty }, env.tankAt) > view.ai.leash) { const over = along({ x: tx, y: ty }, env.tankAt) - view.ai.leash; tx -= fwd.x * over; ty -= fwd.y * over; }
      // zona de roam em volta do ponto de descanso e limite lógico em volta da formação (a câmera acompanha, mas ninguém abusa)
      const off = Math.hypot(tx - home.x, ty - home.y); let clipped = false;
      if (off > view.roam) { tx = home.x + (tx - home.x) * view.roam / off; ty = home.y + (ty - home.y) * view.roam / off; clipped = true; }
      const far = Math.hypot(tx - here.x, ty - here.y);
      if (far > AI_CONFIG.maxFromAnchor) { tx = here.x + (tx - here.x) * AI_CONFIG.maxFromAnchor / far; ty = here.y + (ty - here.y) * AI_CONFIG.maxFromAnchor / far; clipped = true; }
      if (clipped && !ai.roamHit) hooks.note?.('roam', c.id); ai.roamHit = clipped;
      // todos menos o tanque (que decide pelo risco) ficam fora dos círculos avisados já percebidos (por último: a segurança vale mais que a zona)
      if (view.role !== 'tank') for (const w of zones) if (dist({ x: tx, y: ty }, w) < w.r + SAFE) { const q = pushOut(plan, { x: tx, y: ty }, w, me); tx = q.x; ty = q.y; }
      ({ x: tx, y: ty } = avoidTrap(plan, { x: tx, y: ty }));
      const hold = state2 === 'retreat' ? AI_CONFIG.retreatHold : state2 === 'reposition' ? AI_CONFIG.repositionHold : 0;
      if (state2 === 'attack' && target && ai.targetId === ctx.focus.peelId && view.role !== 'healer') state2 = 'peel';
      const was = ai.state;
      if (setState(ai, state2, clock, hold) && ai.state !== was) { if (ai.state === 'retreat') hooks.note?.('retreat', c.id); if (ai.state === 'peel') hooks.note?.('peel', c.id); }
      commitDest(ai, { x: tx, y: ty }, clock, state2 === 'retreat' || state2 === 'peel');
    }
    // esquiva: quem percebeu um golpe em cima de si sai pela saída livre mais curta (a cada tick, não espera a próxima decisão)
    let dest = ai.dest!;
    if (evade) {
      const w = zones.find(z => dist(me, z) <= z.r + .2)!, out = escapePoint(plan, body, w, bodies) ?? pushOut(plan, me, w, me);
      if (out) { dest = commitDest(ai, avoidTrap(plan, out), clock, true); if (setState(ai, 'evade', clock, AI_CONFIG.evadeHold)) hooks.note?.('dodge', c.id); }
    } else if (ai.state === 'evade' && clock >= ai.stateUntil) { ai.state = 'recoverPosition'; ai.thinkAt = -1; }
    const speed = (engaged ? R.heroSpeed : R.travel) * dt;
    if (dist(me, dest) > .08) moveToward(plan, body, dest.x, dest.y, speed, bodies);
  }
}
