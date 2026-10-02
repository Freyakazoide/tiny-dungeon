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
  plan.ensure(plan.indexAt(run.anchor));
  const foes = livingMonsters(state).filter(m => m.x !== undefined);
  const tank = team.find(c => c.isTank) ?? team[0], tankAt = posOf(run, tank), fwd = plan.forwardAt(run.anchor), side = perp(fwd);
  const along = (p: Pt) => (p.x - tankAt.x) * fwd.x + (p.y - tankAt.y) * fwd.y;
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
  // 5) equipe: IA configurável
  const stats = new Map(team.map(c => [c.id, characterStats(c, state)]));
  const engaged = living.some(f => dist({ x: f.x!, y: f.y! }, tankAt) < R.engage + 3);
  for (const c of team) {
    const role = heroRole(c), ai = aiOf(c, role), body = heroBody.get(c.id)!, me = body.pt;
    const target = living.reduce<MonsterRuntime | null>((b, f) => !b || dist(me, { x: f.x!, y: f.y! }) < dist(me, { x: b.x!, y: b.y! }) ? f : b, null);
    // posição de descanso pela FILA configurada (a mesma que o aggro usa): frente na linha do tanque, trás `rear` células atrás
    const back = c.row === 'back' ? R.rear : 0, slotAt = plan.pathPoint(run.anchor - back);
    const lane = (team.indexOf(c) - (team.length - 1) / 2) * 1.25;
    const home = { x: slotAt.x + side.x * lane, y: slotAt.y + side.y * lane };
    let tx = home.x, ty = home.y;
    if (target) {
      const tp = { x: target.x!, y: target.y! }, d = dist(me, tp), want = role === 'tank' || role === 'melee' ? R.meleeReach * .75 : Math.max(ai.hold, 1);
      const hurt = ai.retreatAt > 0 && c.hp / stats.get(c.id)!.maxHp < ai.retreatAt;
      if (hurt) { tx = home.x - fwd.x * 2; ty = home.y - fwd.y * 2; } // ferido: recua para trás da formação, nunca para longe dela
      else if (ai.dodge > 0 && d < ai.dodge) { const ux = (me.x - tp.x) / (d || 1), uy = (me.y - tp.y) / (d || 1); tx = me.x + ux * 2.5; ty = me.y + uy * 2.5; }
      else if (d > want || role === 'tank') { const k = Math.max(0, d - want * .8) / (d || 1); tx = me.x + (tp.x - me.x) * k; ty = me.y + (tp.y - me.y) * k; }
      else { tx = me.x; ty = me.y; }
      if (role !== 'tank' && along({ x: tx, y: ty }) > ai.leash) { const over = along({ x: tx, y: ty }) - ai.leash; tx -= fwd.x * over; ty -= fwd.y * over; }
    }
    // todos menos o tanque (que segura a posição) ficam fora dos círculos avisados: se está dentro, vai pela saída livre mais curta; se o ponto de descanso está dentro, ele é empurrado para fora
    if (role !== 'tank') {
      for (const w of run.windups ?? []) {
        if (dist(me, w) < w.r + SAFE) { const out = escapePoint(plan, body, w, bodies); if (out) { tx = out.x; ty = out.y; } }
        else if (dist({ x: tx, y: ty }, w) < w.r + SAFE) { const d = dist({ x: tx, y: ty }, w) || .01; tx = w.x + (tx - w.x) / d * (w.r + SAFE + .1); ty = w.y + (ty - w.y) / d * (w.r + SAFE + .1); }
      }
    }
    // ninguém sai da zona da própria formação: perseguir, desviar e recuar acontecem dentro de `roam` células do ponto de descanso
    const roam = roamOf(role, ai), off = Math.hypot(tx - home.x, ty - home.y);
    if (off > roam) { tx = home.x + (tx - home.x) * roam / off; ty = home.y + (ty - home.y) * roam / off; }
    ({ x: tx, y: ty } = avoidTrap(plan, { x: tx, y: ty }));
    const speed = (engaged ? R.heroSpeed : R.travel) * dt;
    if (dist(me, { x: tx, y: ty }) > .08) moveToward(plan, body, tx, ty, speed, bodies);
  }
  separate(plan, bodies, dt);
  for (const f of living) { const b = foeBody.get(f.uid)!; f.x = b.pt.x; f.y = b.pt.y; }
  void navT; void BAND;
}
