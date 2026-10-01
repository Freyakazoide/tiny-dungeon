import { RUN_CONFIG as R, WAVE_CONFIG } from '../data/balance';
import { CLASSES } from '../data/classes';
import { itemById } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { spellById } from '../data/spells';
import { livingMonsters, livingTeam } from '../systems/combat';
import { characterStats } from '../systems/progression';
import type { Character, GameState, MonsterRuntime, RunState } from '../core/types';
import { BAND, RunPlan, type Encounter } from './plan';

/** Mundo do corredor: posições, movimento e IA de quem anda no mapa. Só lê CONFIGURAÇÃO (nunca ordens ao vivo); o combate em si continua no GameEngine. */
export interface Pt { d: number; y: number }
/** Distância entre duas unidades: a linha pesa menos que a coluna (o corredor é largo e baixo). */
export const dist = (a: Pt, b: Pt) => Math.hypot(a.d - b.d, (a.y - b.y) * .8);

/** Caminho curto (busca em largura em células, 8 direções, sem cortar quina) até a célula do alvo; devolve o centro da primeira célula do caminho. */
export function waypoint(plan: RunPlan, u: Pt, tx: number, ty: number): [number, number] | null {
  const sx = Math.floor(u.d), sy = Math.floor(u.y), gx0 = Math.floor(tx), gy0 = Math.floor(ty);
  const lo = Math.min(sx, gx0) - 4, hi = Math.max(sx, gx0) + 4, key = (x: number, y: number) => (x - lo) * 40 + y;
  const prev = new Map<number, number>([[key(sx, sy), -1]]); const queue: [number, number][] = [[sx, sy]];
  let best: [number, number] = [sx, sy], bestDist = Math.hypot(gx0 - sx, gy0 - sy);
  for (let qi = 0; qi < queue.length && qi < 600; qi++) {
    const [x, y] = queue[qi], d = Math.hypot(gx0 - x, gy0 - y);
    if (d < bestDist) { bestDist = d; best = [x, y]; if (d === 0) break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < lo || nx > hi || ny < 0 || ny > 36 || prev.has(key(nx, ny)) || plan.isBlocked(nx + .5, ny + .5)) continue;
      if (dx && dy && (plan.isBlocked(x + dx + .5, y + .5) || plan.isBlocked(x + .5, y + dy + .5))) continue;
      prev.set(key(nx, ny), key(x, y)); queue.push([nx, ny]);
    }
  }
  let cur = key(best[0], best[1]), step = best;
  if (cur === key(sx, sy)) return null;
  while (true) { const p = prev.get(cur)!; if (p === key(sx, sy)) break; cur = p; step = [Math.floor(cur / 40) + lo, cur % 40]; }
  return [step[0] + .5, step[1] + .5];
}
/** Anda até (tx, ty) no máximo `step`; em linha reta quando o trecho está livre, senão segue o caminho da busca. */
export function moveToward(plan: RunPlan, u: Pt, tx: number, ty: number, step: number) {
  if (Math.abs(tx - u.d) > 10) tx = u.d + Math.sign(tx - u.d) * 10;   // metas longas viram etapas de 10 células (a busca tem janela curta)
  const dx = tx - u.d, dy = ty - u.y, dd = Math.hypot(dx, dy);
  if (dd < 1e-6) return;
  const free = (d: number, y: number) => !plan.isBlocked(d, y);
  const clear = (len: number) => { if (!free(u.d + dx * Math.min(1, step / dd), u.y + dy * Math.min(1, step / dd))) return false; for (let l = Math.min(step, len); l < len + .25; l += .25) { const m = Math.min(l, len); if (!free(u.d + dx / dd * m, u.y + dy / dd * m)) return false; } return true; };
  const k = Math.min(1, step / dd);
  if (clear(Math.min(dd, 6))) { u.d += dx * k; u.y += dy * k; return; }
  const w = waypoint(plan, u, tx, ty); if (!w) return;
  const wx = w[0] - u.d, wy = w[1] - u.y, wd = Math.hypot(wx, wy) || 1, kk = Math.min(1, step / wd);
  const nd = u.d + wx * kk, ny = u.y + wy * kk;
  if (free(nd, ny)) { u.d = nd; u.y = ny; }
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
/** Coloca (ou recoloca) a equipe na formação em volta do ponto `run.anchor`: frente na âncora, trás 3 células atrás, espalhados na faixa. */
export function placeParty(state: GameState, plan: RunPlan) {
  const run = state.run!, team = state.team.map(id => state.characters.find(c => c.id === id)).filter(Boolean) as Character[];
  const top = plan.floorAtD(run.anchor), front = team.filter(c => c.row === 'front'), back = team.filter(c => c.row === 'back');
  const lane = (list: Character[], i: number) => top + BAND / 2 + (i - (list.length - 1) / 2) * 1.4;
  front.forEach((c, i) => { run.pos[c.id] = { d: run.anchor, y: lane(front, i) }; });
  back.forEach((c, i) => { run.pos[c.id] = { d: run.anchor - R.rear, y: lane(back, i) }; });
}
export const posOf = (run: RunState, c: Character): Pt => run.pos[c.id] ??= { d: run.anchor - R.rear, y: 3 };

/** Monstros ao alcance `reach` de `c`, do mais perto para o mais longe. */
export function foesInReach(state: GameState, c: Character, reach: number): MonsterRuntime[] {
  const run = state.run; if (!run) return livingMonsters(state);
  const me = posOf(run, c);
  return livingMonsters(state).filter(m => m.d !== undefined && dist(me, { d: m.d, y: m.y ?? me.y }) <= reach).sort((a, b) => dist(me, { d: a.d!, y: a.y! }) - dist(me, { d: b.d!, y: b.y! }));
}
/** Heróis que um monstro alcança agora. */
export const heroesInReach = (state: GameState, m: MonsterRuntime, team: Character[]) => {
  const run = state.run; if (!run || m.d === undefined) return team;
  return team.filter(h => dist(posOf(run, h), { d: m.d!, y: m.y! }) <= R.foeReach);
};

export interface WorldHooks {
  /** um encontro dispara: o motor registra a wave (tier, mensagem, mecânicas de início de wave) */
  trigger(chunk: number, enc: Encounter): void;
  /** nascem monstros: o motor cria os `MonsterRuntime` */
  spawn(chunk: number, ids: string[], at: Pt[]): void;
}

/** Um passo do mundo: encontros, levas, movimento dos monstros e da equipe (a IA) e avanço do grupo. O dano fica por conta do motor. */
export function stepRun(state: GameState, plan: RunPlan, dt: number, hooks: WorldHooks) {
  const run = state.run!, team = livingTeam(state);
  if (!team.length) return;
  const foes = livingMonsters(state).filter(m => m.d !== undefined);
  const tank = team.find(c => c.isTank) ?? team[0], tankAt = posOf(run, tank);
  // 1) o grupo só anda quando todos estão perto da formação e não há inimigo por perto
  if (team.every(c => posOf(run, c).d >= run.anchor - R.rear - 2.5) && !foes.some(f => f.d! - tankAt.d < R.engage)) { run.anchor += R.walk * dt; run.deepest = Math.max(run.deepest, run.anchor); }
  // 2) encontros do chunk em que o grupo está
  const idx = plan.indexAt(run.anchor), chunk = plan.chunk(idx), enc = chunk.encounter;
  if (enc && run.lastTrigger < idx && run.anchor >= chunk.start + enc.at) { run.lastTrigger = idx; run.open = true; run.queue.push({ chunk: idx, ids: [...enc.monsters], waited: 0 }); hooks.trigger(idx, enc); }
  // 3) levas: mesmos números das waves (WAVE_CONFIG): só `maxAlive` de uma vez, o resto entra em grupos
  for (const q of run.queue) {
    q.waited += dt;
    const alive = livingMonsters(state).length, room = WAVE_CONFIG.maxAlive - alive, first = q.waited <= dt;
    if (room > 0 && (first || alive < WAVE_CONFIG.below || q.waited >= WAVE_CONFIG.intervalS * 2)) {
      const ids = q.ids.splice(0, Math.min(first ? WAVE_CONFIG.maxAlive : WAVE_CONFIG.batch, room));
      const at = ids.map(() => { const d = run.anchor + R.spawnAhead + Math.random() * 5; return { d, y: plan.floorAtD(d) + .5 + Math.random() * (BAND - 1) }; });
      hooks.spawn(q.chunk, ids, at); q.waited = .001;
    }
  }
  run.queue = run.queue.filter(q => q.ids.length);
  // 4) monstros andam até o herói mais perto (o tanque conta como mais perto até 6 células)
  const living = livingMonsters(state);
  for (const f of living) {
    if (f.d === undefined || (f.statuses?.frozen ?? 0) > 0 || (f.statuses?.stunned ?? 0) > 0) continue;
    const me = { d: f.d, y: f.y ?? 3 };
    const prey = team.reduce((b, h) => dist(me, posOf(run, h)) < dist(me, posOf(run, b)) ? h : b, team[0]);
    const close = dist(me, tankAt) < 6 ? tank : prey, target = posOf(run, close);
    if (dist(me, target) > R.foeReach * .8) { moveToward(plan, me, target.d, target.y, R.foeSpeed * (MONSTERS[f.defId].speed > 1 ? 1 : .9) * dt); f.d = me.d; f.y = me.y; }
  }
  // 5) equipe: IA configurável (tanque lidera, corpo a corpo cola, à distância mantém espaço e foge de quem chega, curandeiro fica atrás)
  const stats = new Map(team.map(c => [c.id, characterStats(c, state)]));
  for (const c of team) {
    const role = heroRole(c), ai = aiOf(c, role), me = posOf(run, c);
    const target = living.reduce<MonsterRuntime | null>((b, f) => f.d === undefined ? b : !b || dist(me, { d: f.d, y: f.y! }) < dist(me, { d: b.d!, y: b.y! }) ? f : b, null);
    const slot = role === 'tank' || role === 'melee' ? run.anchor : run.anchor - R.rear;
    let tx = slot, ty = me.y;
    if (target) {
      const tp = { d: target.d!, y: target.y! }, d = dist(me, tp), want = role === 'tank' || role === 'melee' ? Math.min(R.meleeReach * .8, R.meleeReach - .3) : Math.max(ai.hold, 1);
      const hurt = ai.retreatAt > 0 && c.hp / stats.get(c.id)!.maxHp < ai.retreatAt;
      if (hurt || (ai.dodge > 0 && d < ai.dodge)) { tx = Math.max(tankAt.d - ai.leash, me.d - 2); ty = me.y + (me.y > tp.y ? 1 : -1); }
      else if (d > want || role === 'tank') { tx = tp.d - want * .8; ty = tp.y; }
      else { tx = me.d; ty = me.y; }
      if (role !== 'tank') tx = Math.min(tx, tankAt.d + ai.leash);
    } else { const idxInTeam = team.indexOf(c); ty = plan.floorAtD(run.anchor) + BAND / 2 + (idxInTeam - (team.length - 1) / 2) * 1.2; }
    moveToward(plan, me, tx, ty, R.heroSpeed * dt);
  }
}
