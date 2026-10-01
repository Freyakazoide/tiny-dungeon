import { WAVE_CONFIG } from '../data/balance';
import { MONSTERS } from '../data/monsters';
import { BAND, CHUNK_LEN, RunPlan, bossPowerFor, BOSS_HP_MUL, depthScale, type RunParams } from './plan';
import { rngFor, type Rng } from './rng';

/**
 * Simulação do corredor (protótipo do overhaul): heróis e monstros têm posição (d = distância no corredor, y = linha).
 * Tudo é determinístico (RNG semeado) e roda em passos fixos, então serve igual para a tela, para o segundo plano e para testes.
 * A IA dos heróis só lê CONFIGURAÇÃO (distância, papel, quando recuar); nunca recebe ordens ao vivo.
 */
export type Role = 'tank' | 'melee' | 'ranged' | 'healer';
export interface AiConfig {
  /** distância (células) que o herói tenta manter do inimigo mais próximo; 0 = colar */
  hold: number;
  /** quanto pode se afastar do tanque (células) */
  leash: number;
  /** recua quando a vida cai abaixo desta fração (0 = nunca) */
  retreatAt: number;
  /** foge de monstros que chegam a esta distância (0 = nunca) */
  dodge: number;
}
export interface HeroSpec { id: string; name: string; role: Role; maxHp: number; dps: number; range: number; heal?: number; ai?: Partial<AiConfig> }
export const DEFAULT_AI: Record<Role, AiConfig> = {
  tank: { hold: 0, leash: 99, retreatAt: 0, dodge: 0 },
  melee: { hold: 0, leash: 5, retreatAt: .25, dodge: 0 },
  ranged: { hold: 4, leash: 4, retreatAt: .4, dodge: 1.8 },
  healer: { hold: 5, leash: 3, retreatAt: .5, dodge: 2.2 },
};
export interface Hero extends HeroSpec { d: number; y: number; hp: number; alive: boolean; cd: number; ai: AiConfig; aggro: number }
export interface Foe { uid: number; defId: string; d: number; y: number; hp: number; maxHp: number; dps: number; speed: number; cd: number; boss: boolean; power?: string }
export const WALK = 1.4, FOE_SPEED = .9, HERO_SPEED = 2.4, MELEE = 1.1, SPAWN_AHEAD = 14, REAR = 3;

export interface RunStats { distance: number; kills: number; bossKills: number; deaths: number; maxAlive: number; encounters: number }
export class RunSim {
  readonly plan: RunPlan; heroes: Hero[]; foes: Foe[] = []; t = 0; anchor = 4; over = false;
  stats: RunStats = { distance: 0, kills: 0, bossKills: 0, deaths: 0, maxAlive: 0, encounters: 0 };
  private rng: Rng; private uid = 0; private triggered = new Set<number>(); private queue: { chunk: number; ids: string[]; waited: number }[] = [];
  constructor(readonly params: RunParams, specs: HeroSpec[]) {
    this.plan = new RunPlan(params); this.rng = rngFor(params.seed, 77);
    this.plan.precompute(6);
    this.heroes = specs.map((s, i) => ({ ...s, d: this.anchor - (s.role === 'tank' || s.role === 'melee' ? 0 : REAR), y: this.plan.floorAtD(this.anchor) + 3 + i - (specs.length - 1) / 2, hp: s.maxHp, alive: true, cd: 0, ai: { ...DEFAULT_AI[s.role], ...s.ai }, aggro: 0 }));
  }
  get living() { return this.heroes.filter(h => h.alive); }
  get depth() { return this.plan.indexAt(this.anchor); }

  private spawn(chunk: number, ids: string[]) {
    const c = this.plan.chunk(chunk), enc = c.encounter, { hp, atk } = depthScale(chunk);
    for (const id of ids) {
      const def = MONSTERS[id], boss = !!def.boss, power = boss ? bossPowerFor(this.params.seed, chunk) : undefined;
      const maxHp = Math.round(def.hp * hp * (boss && power ? BOSS_HP_MUL[power] : 1) * 0.05);   // 0,05: escala provisória do protótipo (HP real dos heróis é fictício aqui)
      const d = this.anchor + SPAWN_AHEAD + this.rng() * 5, y = this.plan.floorAtD(d) + .5 + this.rng() * (BAND - 1);
      this.foes.push({ uid: ++this.uid, defId: id, d, y, hp: maxHp, maxHp, dps: Math.max(1, def.attack * atk * .08), speed: FOE_SPEED * (def.speed > 1 ? 1 : .9), cd: 0, boss, power });
    }
    void enc;
  }
  private tryTrigger() {
    const idx = this.depth, c = this.plan.chunk(idx), e = c.encounter;
    if (e && !this.triggered.has(idx) && this.anchor >= c.start + e.at) { this.triggered.add(idx); this.stats.encounters++; this.queue.push({ chunk: idx, ids: [...e.monsters], waited: 0 }); }
  }
  private feedQueue(dt: number) {
    for (const q of this.queue) {
      q.waited += dt;
      if (q.chunk === this.depth && this.queue.indexOf(q) >= 0 && q.ids.length === 0) continue;
      const alive = this.foes.length, room = WAVE_CONFIG.maxAlive - alive;
      const first = q.waited <= dt;
      if (room > 0 && (first || alive < WAVE_CONFIG.below || q.waited >= WAVE_CONFIG.intervalS * 2)) { this.spawn(q.chunk, q.ids.splice(0, Math.min(first ? WAVE_CONFIG.maxAlive : WAVE_CONFIG.batch, room))); q.waited = 0.001; }
    }
    this.queue = this.queue.filter(q => q.ids.length);
  }

  private free(d: number, y: number) { return !this.plan.isBlocked(d, y); }
  /** Caminho curto (busca em largura em células, 8 direções, sem cortar quina) até a célula do alvo; devolve o primeiro passo. Janela pequena: barato. */
  private waypoint(u: { d: number; y: number }, tx: number, ty: number): [number, number] | null {
    const sx = Math.floor(u.d), sy = Math.floor(u.y), gx0 = Math.floor(tx), gy0 = Math.floor(ty);
    const lo = Math.min(sx, gx0) - 4, hi = Math.max(sx, gx0) + 4, key = (x: number, y: number) => (x - lo) * 40 + y;
    const prev = new Map<number, number>([[key(sx, sy), -1]]); const queue: [number, number][] = [[sx, sy]];
    let best: [number, number] = [sx, sy], bestDist = Math.hypot(gx0 - sx, gy0 - sy);
    for (let qi = 0; qi < queue.length && qi < 600; qi++) {
      const [x, y] = queue[qi], dist = Math.hypot(gx0 - x, gy0 - y);
      if (dist < bestDist) { bestDist = dist; best = [x, y]; if (dist === 0) break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < lo || nx > hi || ny < 0 || ny > 36 || prev.has(key(nx, ny)) || this.plan.isBlocked(nx + .5, ny + .5)) continue;
        if (dx && dy && (this.plan.isBlocked(x + dx + .5, y + .5) || this.plan.isBlocked(x + .5, y + dy + .5))) continue;
        prev.set(key(nx, ny), key(x, y)); queue.push([nx, ny]);
      }
    }
    let cur = key(best[0], best[1]), step = best;
    if (cur === key(sx, sy)) return null;
    while (true) { const p = prev.get(cur)!; if (p === key(sx, sy)) break; cur = p; step = [Math.floor(cur / 40) + lo, cur % 40]; }
    return [step[0] + .5, step[1] + .5];
  }
  /** Anda até (tx, ty) no máximo `step`; em linha reta quando o trecho está livre, senão segue o caminho da busca. */
  private moveToward(u: { d: number; y: number }, tx: number, ty: number, step: number) {
    if (Math.abs(tx - u.d) > 10) tx = u.d + Math.sign(tx - u.d) * 10;   // metas longas viram etapas de 10 células (a busca tem janela curta)
    const dx = tx - u.d, dy = ty - u.y, dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return;
    const clear = (len: number) => { if (!this.free(u.d + dx * Math.min(1, step / dist), u.y + dy * Math.min(1, step / dist))) return false; for (let l = Math.min(step, len); l < len + .25; l += .25) { const m = Math.min(l, len); if (!this.free(u.d + dx / dist * m, u.y + dy / dist * m)) return false; } return true; };
    const k = Math.min(1, step / dist);
    if (clear(Math.min(dist, 6))) { u.d += dx * k; u.y += dy * k; return; }
    const w = this.waypoint(u, tx, ty); if (!w) return;
    const wx = w[0] - u.d, wy = w[1] - u.y, wd = Math.hypot(wx, wy) || 1, kk = Math.min(1, step / wd);
    const nd = u.d + wx * kk, ny = u.y + wy * kk;
    if (this.free(nd, ny)) { u.d = nd; u.y = ny; }
  }

  step(dt: number) {
    if (this.over) return;
    this.t += dt;
    const heroes = this.living, tank = heroes.find(h => h.role === 'tank') ?? heroes[0];
    if (!heroes.length) { this.over = true; return; }
    const front = this.foes.reduce((m, f) => Math.min(m, f.d), Infinity);
    // o grupo só avança quando não há inimigo perto o bastante para lutar
    if (heroes.every(h => h.d >= this.anchor - REAR - 2.5) && !this.foes.some(f => f.d - tank.d < 9)) { this.anchor += WALK * dt; this.stats.distance = this.anchor; }
    void front;
    this.tryTrigger(); this.feedQueue(dt);
    this.stats.maxAlive = Math.max(this.stats.maxAlive, this.foes.length);
    // heróis
    for (const h of heroes) {
      h.cd -= dt;
      const target = this.foes.reduce<Foe | null>((best, f) => !best || Math.abs(f.d - h.d) + Math.abs(f.y - h.y) * .5 < Math.abs(best.d - h.d) + Math.abs(best.y - h.y) * .5 ? f : best, null);
      const slot = h.role === 'tank' || h.role === 'melee' ? this.anchor : this.anchor - REAR;
      let tx = slot, ty = h.y;
      if (target) {
        const dist = Math.hypot(target.d - h.d, (target.y - h.y) * .8), want = h.role === 'tank' || h.role === 'melee' ? MELEE * .9 : Math.max(h.ai.hold, 1);
        const hurt = h.ai.retreatAt > 0 && h.hp / h.maxHp < h.ai.retreatAt;
        if (hurt || (h.ai.dodge > 0 && dist < h.ai.dodge)) { tx = Math.max(tank.d - h.ai.leash, h.d - 2); ty = h.y + (h.y > (target.y) ? 1 : -1); }
        else if (dist > want || h.role === 'tank') { tx = target.d - want * .8; ty = target.y; }
        else { tx = h.d; ty = h.y; }
        if (h.role !== 'tank') tx = Math.min(tx, tank.d + h.ai.leash);
      } else ty = 3 + heroes.indexOf(h) - (heroes.length - 1) / 2 + this.plan.floorAtD(this.anchor) - 2 + 1.5;
      this.moveToward(h, tx, ty, HERO_SPEED * dt);
      if (h.role === 'healer' && h.heal) {
        if (h.cd <= 0) { const hurtAlly = heroes.filter(a => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (hurtAlly) { hurtAlly.hp = Math.min(hurtAlly.maxHp, hurtAlly.hp + h.heal); h.cd = 1.5; } }
      } else if (target && h.cd <= 0 && Math.hypot(target.d - h.d, (target.y - h.y) * .8) <= h.range) { target.hp -= h.dps * 1.0; h.cd = 1.0; if (target.hp <= 0) this.killFoe(target); }
    }
    // monstros
    for (const f of this.foes) {
      f.cd -= dt;
      const targets = this.living; if (!targets.length) break;
      const prey = targets.reduce((b, h) => (h.role === 'tank' ? 12 : 0) + Math.hypot(h.d - f.d, (h.y - f.y) * .8) < (b.role === 'tank' ? 12 : 0) + Math.hypot(b.d - f.d, (b.y - f.y) * .8) ? h : b, targets[0]);
      const tank = targets.find(h => h.role === 'tank'), close = tank && Math.hypot(tank.d - f.d, (tank.y - f.y) * .8) < 6 ? tank : prey;
      const dist = Math.hypot(close.d - f.d, (close.y - f.y) * .8);
      if (dist > MELEE) this.moveToward(f, close.d, close.y, f.speed * dt);
      else if (f.cd <= 0) { close.hp -= f.dps; f.cd = 1.2; if (close.hp <= 0) { close.alive = false; this.stats.deaths++; } }
    }
    this.foes = this.foes.filter(f => f.hp > 0);
    for (const h of this.heroes) if (h.alive) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .004 * dt);   // regeneração leve entre lutas
    if (!this.living.length) this.over = true;
  }
  private killFoe(f: Foe) { f.hp = 0; this.stats.kills++; if (f.boss) this.stats.bossKills++; }
  /** Simula `seconds` de jogo em passos de 0,1 s. */
  run(seconds: number, dt = .1) { for (let t = 0; t < seconds && !this.over; t += dt) this.step(dt); return this.stats; }
}
export { CHUNK_LEN };
