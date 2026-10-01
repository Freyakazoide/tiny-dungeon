import { RUN_CONFIG as R, WAVE_CONFIG } from '../data/balance';
import { CLASSES } from '../data/classes';
import { itemById } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { spellById } from '../data/spells';
import { aggroShares, livingMonsters, livingTeam } from '../systems/combat';
import { characterStats } from '../systems/progression';
import type { Character, GameState, MonsterRuntime, RunState } from '../core/types';
import { BAND, RunPlan, type Encounter, type Pt } from './plan';

/**
 * Mundo do corredor: posições em células do mundo (x, y), movimento, colisão e IA de quem anda no mapa. Só lê CONFIGURAÇÃO (nunca ordens ao
 * vivo); o dano fica no GameEngine. Cada unidade ocupa um espaço próprio (círculo), e os monstros corpo a corpo disputam as 8 células em volta de
 * cada herói: quando as vagas do tanque acabam, o excedente vai atrás de quem está na backline (como no Tibia).
 */
export type { Pt };
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const RADIUS = { unit: .36, boss: .95 };
export const radiusOf = (m: MonsterRuntime) => MONSTERS[m.defId].boss ? RADIUS.boss : RADIUS.unit;
const NEIGHBORS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** O círculo de raio `r` em (x, y) cabe no chão (4 pontos do contorno)? */
export const fits = (plan: RunPlan, x: number, y: number, r: number) => { const k = r * .8; return !plan.isBlocked(x - k, y - k) && !plan.isBlocked(x + k, y - k) && !plan.isBlocked(x - k, y + k) && !plan.isBlocked(x + k, y + k); };

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

export interface Body { pt: Pt; r: number }
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

export type Role = 'tank' | 'melee' | 'ranged' | 'healer';
export interface AiConfig { hold: number; leash: number; retreatAt: number; dodge: number }
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
const perp = (f: Pt): Pt => ({ x: -f.y, y: f.x });
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
export const posOf = (run: RunState, c: Character): Pt => run.pos[c.id] ??= { ...{ x: 0, y: 0 } };

/** Monstros ao alcance `reach` de `c`, do mais perto para o mais longe. */
export function foesInReach(state: GameState, c: Character, reach: number): MonsterRuntime[] {
  const run = state.run; if (!run) return livingMonsters(state);
  const me = posOf(run, c);
  return livingMonsters(state).filter(m => m.x !== undefined && dist(me, { x: m.x, y: m.y! }) - radiusOf(m) + RADIUS.unit <= reach).sort((a, b) => dist(me, { x: a.x!, y: a.y! }) - dist(me, { x: b.x!, y: b.y! }));
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
  spawn(chunk: number, ids: string[], at: Pt[]): void;
}

/** Atribui a cada monstro (corpo a corpo) uma das 8 células em volta de um herói; quando as vagas de um herói acabam, vai para o próximo. */
function assignSlots(plan: RunPlan, foes: MonsterRuntime[], team: Character[], run: RunState) {
  const cellOf = (p: Pt) => `${Math.floor(p.x)},${Math.floor(p.y)}`;
  const taken = new Set(team.map(h => cellOf(posOf(run, h))));
  const shares = aggroShares(team), counts = new Map(team.map(h => [h.id, 0]));
  const valid = (m: MonsterRuntime) => {
    const s = m.slot; if (!s || MONSTERS[m.defId].boss) return false;
    const h = team.find(x => x.id === s.hero); if (!h || plan.isBlockedCell(Math.floor(s.x), Math.floor(s.y))) return false;
    return Math.max(Math.abs(Math.floor(s.x) - Math.floor(posOf(run, h).x)), Math.abs(Math.floor(s.y) - Math.floor(posOf(run, h).y))) <= 1;
  };
  const pending: MonsterRuntime[] = [];
  for (const m of foes) {
    if (MONSTERS[m.defId].boss) { delete m.slot; continue; }
    if (valid(m) && !taken.has(cellOf(m.slot!))) { taken.add(cellOf(m.slot!)); counts.set(m.slot!.hero, (counts.get(m.slot!.hero) ?? 0) + 1); } else { delete m.slot; pending.push(m); }
  }
  const nearest = (m: MonsterRuntime) => Math.min(...team.map(h => dist(posOf(run, h), { x: m.x!, y: m.y! })));
  pending.sort((a, b) => nearest(a) - nearest(b));
  for (const m of pending) {
    const me = { x: m.x!, y: m.y! };
    const order = [...team].sort((a, b) => (counts.get(a.id)! / (shares.get(a.id) || .01)) - (counts.get(b.id)! / (shares.get(b.id) || .01)) || dist(posOf(run, a), me) - dist(posOf(run, b), me));
    for (const h of order) {
      const hp = posOf(run, h), hx = Math.floor(hp.x), hy = Math.floor(hp.y);
      const cells = NEIGHBORS.map(([dx, dy]) => ({ cx: hx + dx, cy: hy + dy })).filter(c => !plan.isBlockedCell(c.cx, c.cy) && !taken.has(`${c.cx},${c.cy}`) && (c.cx === hx || c.cy === hy || (!plan.isBlockedCell(c.cx, hy) && !plan.isBlockedCell(hx, c.cy))));
      if (!cells.length) continue;
      cells.sort((a, b) => Math.hypot(a.cx + .5 - me.x, a.cy + .5 - me.y) - Math.hypot(b.cx + .5 - me.x, b.cy + .5 - me.y));
      m.slot = { x: cells[0].cx + .5, y: cells[0].cy + .5, hero: h.id }; taken.add(`${cells[0].cx},${cells[0].cy}`); counts.set(h.id, counts.get(h.id)! + 1); break;
    }
  }
}

const navT = new WeakMap<object, number>();
/** Um passo do mundo: encontros, levas, movimento dos monstros e da equipe (a IA, com colisão) e avanço do grupo. O dano fica por conta do motor. */
export function stepRun(state: GameState, plan: RunPlan, dt: number, hooks: WorldHooks) {
  const run = state.run!, team = livingTeam(state);
  if (!team.length) return;
  plan.ensure(plan.indexAt(run.anchor));
  const foes = livingMonsters(state).filter(m => m.x !== undefined);
  const tank = team.find(c => c.isTank) ?? team[0], tankAt = posOf(run, tank), fwd = plan.forwardAt(run.anchor), side = perp(fwd);
  const along = (p: Pt) => (p.x - tankAt.x) * fwd.x + (p.y - tankAt.y) * fwd.y;
  const here = plan.pathPoint(run.anchor);
  // 1) o grupo só anda quando todos estão perto da âncora e não há inimigo por perto
  if (team.every(c => dist(posOf(run, c), here) <= R.rear + 4) && !foes.some(f => dist({ x: f.x!, y: f.y! }, tankAt) < R.engage)) { run.anchor += R.walk * dt; run.deepest = Math.max(run.deepest, run.anchor); }
  // 2) encontros do chunk em que o grupo está
  const idx = plan.indexAt(run.anchor), chunk = plan.chunk(idx), enc = chunk.encounter;
  if (enc && run.lastTrigger < idx && run.anchor >= chunk.start + enc.at) { run.lastTrigger = idx; run.open = true; run.queue.push({ chunk: idx, ids: [...enc.monsters], waited: 0 }); hooks.trigger(idx, enc); }
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
  for (const f of living) {
    const body = foeBody.get(f.uid)!;
    if ((f.statuses?.frozen ?? 0) > 0 || (f.statuses?.stunned ?? 0) > 0) continue;
    const boss = !!MONSTERS[f.defId].boss, speed = R.foeSpeed * (MONSTERS[f.defId].speed > 1 ? 1 : .9) * dt;
    let target: Pt, stop = 0;
    if (f.slot) target = f.slot;
    else if (boss) { target = tankAt; stop = 1.9; }
    else { const prey = team.reduce((b, h) => dist(body.pt, posOf(run, h)) < dist(body.pt, posOf(run, b)) ? h : b, team[0]); target = posOf(run, prey); stop = 2.1; }
    if (dist(body.pt, target) > .12 + stop) moveToward(plan, body, target.x, target.y, speed, bodies);
    f.x = body.pt.x; f.y = body.pt.y;
  }
  // 5) equipe: IA configurável
  const stats = new Map(team.map(c => [c.id, characterStats(c, state)]));
  const engaged = living.some(f => dist({ x: f.x!, y: f.y! }, tankAt) < R.engage + 3);
  for (const c of team) {
    const role = heroRole(c), ai = aiOf(c, role), body = heroBody.get(c.id)!, me = body.pt;
    const target = living.reduce<MonsterRuntime | null>((b, f) => !b || dist(me, { x: f.x!, y: f.y! }) < dist(me, { x: b.x!, y: b.y! }) ? f : b, null);
    const back = role === 'tank' || role === 'melee' ? 0 : R.rear, slotAt = plan.pathPoint(run.anchor - back);
    const lane = (team.indexOf(c) - (team.length - 1) / 2) * 1.25;
    let tx = slotAt.x + side.x * lane, ty = slotAt.y + side.y * lane;
    if (target) {
      const tp = { x: target.x!, y: target.y! }, d = dist(me, tp), want = role === 'tank' || role === 'melee' ? R.meleeReach * .75 : Math.max(ai.hold, 1);
      const hurt = ai.retreatAt > 0 && c.hp / stats.get(c.id)!.maxHp < ai.retreatAt;
      if (hurt || (ai.dodge > 0 && d < ai.dodge)) { const ux = (me.x - tp.x) / (d || 1), uy = (me.y - tp.y) / (d || 1); tx = me.x + ux * 2.5; ty = me.y + uy * 2.5; }
      else if (d > want || role === 'tank') { const k = Math.max(0, d - want * .8) / (d || 1); tx = me.x + (tp.x - me.x) * k; ty = me.y + (tp.y - me.y) * k; }
      else { tx = me.x; ty = me.y; }
      if (role !== 'tank' && along({ x: tx, y: ty }) > ai.leash) { const over = along({ x: tx, y: ty }) - ai.leash; tx -= fwd.x * over; ty -= fwd.y * over; }
    }
    const speed = (engaged ? R.heroSpeed : R.travel) * dt;
    if (dist(me, { x: tx, y: ty }) > .08) moveToward(plan, body, tx, ty, speed, bodies);
  }
  separate(plan, bodies, dt);
  for (const f of living) { const b = foeBody.get(f.uid)!; f.x = b.pt.x; f.y = b.pt.y; }
  void navT; void BAND;
}
