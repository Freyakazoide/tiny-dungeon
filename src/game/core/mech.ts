import type { Character, GameState, MonsterRuntime, Stats } from './types';
import { MONSTERS } from '../data/monsters';
import { effectsOf, type Eff } from '../systems/mechanics';
import { livingMonsters, livingTeam } from '../systems/combat';
import { reinforcementIds } from '../systems/waves';

/** O que o motor oferece às mecânicas (evita que mech.ts conheça os detalhes privados do GameEngine). */
export interface MechHost {
  state: GameState;
  stats(c: Character): Stats;
  /** Dano direto ignorando os multiplicadores de mecânica (as mecânicas não disparam mecânicas). */
  rawHit(c: Character, target: MonsterRuntime, damage: number, crit: boolean): void;
  heal(c: Character, amount: number, source?: Character): number;
  shield(c: Character, value: number, seconds: number): void;
  burn(target: MonsterRuntime, stacks: number, source: Character): void;
  addGold(amount: number): void;
  dropGear(def: (typeof MONSTERS)[string]): void;
  emit(fx: { type: 'heal' | 'damage' | 'drop'; target?: string; value?: number; text?: string }): void;
}

interface Timed { n: number; until: number }
interface CharMech {
  stacks: Record<string, Timed>;       // chave por efeito: acúmulos com validade
  buffs: { dmg: number; aspd: number; taken: number; until: number }[];
  counters: Record<string, number>;    // basic, cast, bossHits...
  timers: Record<string, number>;      // periódicos: próxima vez (relógio)
  wave: Record<string, boolean>;       // uma vez por wave
  firstHit: Set<string>;               // monstros já atingidos (primeiro golpe)
  bossHits: Record<string, number>;
  lastDamaged: number; lastKill: number[]; quietCrit: number;
  doubleNext: boolean; invulnUntil: number; killStreak: Timed;
  autoShieldAt: Record<string, number>;
}
const fresh = (): CharMech => ({ stacks: {}, buffs: [], counters: {}, timers: {}, wave: {}, firstHit: new Set(), bossHits: {}, lastDamaged: -99, lastKill: [], quietCrit: 0, doubleNext: false, invulnUntil: -1, killStreak: { n: 0, until: 0 }, autoShieldAt: {} });

export class Mech {
  clock = 0;
  private per = new Map<string, CharMech>();
  constructor(private host: MechHost) {}
  rt(c: Character) { let m = this.per.get(c.id); if (!m) { m = fresh(); this.per.set(c.id, m); } return m; }
  eff(c: Character): Eff[] { return effectsOf(c); }
  private of<K extends Eff['k']>(c: Character, k: K) { return this.eff(c).filter(e => e.k === k) as Extract<Eff, { k: K }>[]; }
  private team() { return livingTeam(this.host.state); }
  private isElite(t: MonsterRuntime) { return !MONSTERS[t.defId].boss && reinforcementIds(this.host.state.huntId).elite === t.defId; }
  private stackN(m: CharMech, key: string) { const s = m.stacks[key]; return s && s.until > this.clock ? s.n : 0; }
  private bumpStack(m: CharMech, key: string, max: number, dur: number) { const n = Math.min(max, this.stackN(m, key) + 1); m.stacks[key] = { n, until: this.clock + dur }; return n; }
  private activeBuffs(m: CharMech) { m.buffs = m.buffs.filter(b => b.until > this.clock); return m.buffs; }

  // ------------------------------------------------------------------------------------------ nova wave
  onWaveStart() {
    for (const c of this.host.state.characters) {
      const m = this.rt(c); m.wave = {}; m.firstHit = new Set(); m.bossHits = {}; m.counters.noDamage = 0;
      for (const e of this.of(c, 'once')) if (e.when === 'start' && e.do === 'shield') this.host.shield(c, this.host.stats(c).maxHp * (e.pct ?? .1), 12);
    }
  }

  // ------------------------------------------------------------------------------------------ dano causado
  /** Multiplicador e crítico forçado de um golpe de `c` em `t`. */
  outgoing(c: Character, t: MonsterRuntime, ctx: { crit: boolean; basic?: boolean; spell?: boolean }): { mult: number; crit: boolean } {
    const m = this.rt(c), boss = !!MONSTERS[t.defId].boss;
    let mult = 1, add = 0, crit = ctx.crit;
    for (const e of this.eff(c)) {
      if (e.k === 'dmg') {
        const frac = t.hp / t.maxHp;
        if ((e.vs === 'boss' && boss) || (e.vs === 'bossElite' && (boss || this.isElite(t))) || (e.vs === 'low' && frac < (e.thr ?? .3)) || (e.vs === 'full' && frac >= .999) || (e.vs === 'ctrl' && ((t.statuses?.frozen ?? 0) > 0 || (t.statuses?.stunned ?? 0) > 0)) || (e.vs === 'critBoss' && crit && boss) || (e.vs === 'basic' && ctx.basic) || (e.vs === 'spell' && ctx.spell)) add += e.pct;
        if (e.vs === 'goldScaled') add += Math.min(.25, Math.floor((c.profile.counters.goldEarned ?? 0) / 1000) * e.pct);
      } else if (e.k === 'lostHp') { const lost = 1 - c.hp / this.host.stats(c).maxHp; add += Math.min(e.max, Math.floor(lost * 100 / e.per) * e.step); }
      else if (e.k === 'firstBoss' && boss && !m.wave.firstBoss) { m.wave.firstBoss = true; mult *= e.mult; }
      else if (e.k === 'firstStrike' && !m.firstHit.has(t.uid)) { m.firstHit.add(t.uid); mult *= e.mult; crit = true; }
      else if (e.k === 'bossForceCrit' && boss && (m.bossHits[t.uid] ?? 0) < e.n) { m.bossHits[t.uid] = (m.bossHits[t.uid] ?? 0) + 1; crit = true; }
      else if (e.k === 'streak' && e.dmg) add += this.stackN(m, `s${e.on}${e.per}`) * e.per;
      else if (e.k === 'onCrit' && e.buff?.dmg) add += this.stackN(m, `cb${e.buff.dmg}_${e.buff.aspd ?? 0}`) * e.buff.dmg;
    }
    for (const b of this.activeBuffs(m)) add += b.dmg;
    for (const ally of this.team()) {
      if (ally === c) continue;
      for (const e of this.eff(ally)) {
        if (e.k === 'teamDmgFirst' && t === livingMonsters(this.host.state)[0]) add += e.pct;
        if (e.k === 'teamDmgBoss' && boss) add += e.pct;
      }
    }
    for (const e of this.eff(c)) {
      if (e.k === 'teamDmgFirst' && t === livingMonsters(this.host.state)[0]) add += e.pct;
      if (e.k === 'teamDmgBoss' && boss) add += e.pct;
    }
    mult *= 1 + add;
    if (m.doubleNext && ctx.spell) { mult *= 2; m.doubleNext = false; }
    return { mult, crit };
  }
  /** Extra do golpe básico por atributo (Mestre Rúnico/Escudeiro). */
  basicExtra(c: Character) { let extra = 0; const st = this.host.stats(c); for (const e of this.of(c, 'basicStat')) extra += (e.stat === 'magicPower' ? st.magicPower : st.defense) * e.pct; return extra; }
  critReady(c: Character) { const e = this.of(c, 'critReady')[0]; if (!e) return false; const m = this.rt(c); if (this.clock - m.quietCrit >= e.every) { m.quietCrit = this.clock; return true; } return false; }
  aspdBonus(c: Character) { const m = this.rt(c); let v = 0; for (const e of this.of(c, 'streak')) if (e.aspd) v += this.stackN(m, `s${e.on}${e.per}`) * e.per;
    for (const e of this.of(c, 'onCrit')) if (e.buff?.aspd) v += this.stackN(m, `cb${e.buff.dmg ?? 0}_${e.buff.aspd}`) * e.buff.aspd; for (const b of this.activeBuffs(m)) v += b.aspd; if (this.clock < (m.stacks.burst?.until ?? 0)) v += m.stacks.burst.n / 100; return v; }
  ignoreResist(c: Character) { return this.of(c, 'ignoreResist').length > 0; }
  manaCostMult(c: Character) { return Math.max(.4, 1 - this.of(c, 'manaCost').reduce((s, e) => s + e.pct, 0)); }

  /** Depois de um golpe: críticos, sequências, execução. Devolve true se o alvo morreu por execução. */
  afterHit(c: Character, t: MonsterRuntime, damage: number, crit: boolean, ctx: { basic?: boolean; spell?: boolean }) {
    const m = this.rt(c);
    for (const e of this.eff(c)) {
      if (e.k === 'streak' && ((e.on === 'hit' && ctx.basic) || (e.on === 'cast' && ctx.spell))) this.bumpStack(m, `s${e.on}${e.per}`, e.max, e.dur);
      if (crit) {
        if (e.k === 'streak' && e.on === 'crit') this.bumpStack(m, `s${e.on}${e.per}`, e.max, e.dur);
        if (e.k === 'onCrit') {
          if (e.heal) this.host.heal(c, this.host.stats(c).maxHp * e.heal, c);
          if (e.volley) this.volley(c, t, damage * e.volley, e.volley >= 1 ? 1 : 99);
          if (e.burn && t.alive) this.host.burn(t, 1, c);
          if (e.double && Math.random() < e.double && t.alive) this.host.rawHit(c, t, damage, false);
          if (e.buff) this.bumpStack(m, `cb${e.buff.dmg ?? 0}_${e.buff.aspd ?? 0}`, e.buff.max, e.buff.dur);
        }
      }
      if (e.k === 'execute' && t.alive && t.hp / t.maxHp < e.below && !MONSTERS[t.defId].boss) this.host.rawHit(c, t, t.hp, false);
    }
  }
  /** Salva em todos os inimigos (ou nos `limit` primeiros além do alvo). */
  volley(c: Character, from: MonsterRuntime | undefined, damage: number, limit = 99) {
    let n = 0;
    for (const t of livingMonsters(this.host.state)) { if (t === from) continue; if (n++ >= limit) break; this.host.rawHit(c, t, Math.max(1, Math.round(damage)), false); }
  }
  /** Eventos de golpe básico: repetição, eco, a cada N, cleave. */
  onBasic(c: Character, t: MonsterRuntime, damage: number): { repeat: boolean; haste: boolean } {
    const m = this.rt(c); m.counters.basic = (m.counters.basic ?? 0) + 1; let repeat = false, haste = false;
    for (const e of this.eff(c)) {
      if (e.k === 'echo' && t.alive) this.host.rawHit(c, t, Math.max(1, Math.round(damage * e.pct)), false);
      else if (e.k === 'proc' && e.do === 'repeat' && Math.random() < e.chance) repeat = true;
      else if (e.k === 'proc' && e.do === 'second' && Math.random() < e.chance) this.volley(c, t, damage, 1);
      else if (e.k === 'proc' && e.do === 'volley' && Math.random() < e.chance) this.volley(c, t, damage * (e.pct ?? 1));
      else if (e.k === 'every' && e.on === 'basic' && m.counters.basic % e.n === 0) {
        if (e.do === 'volley') this.volley(c, t, damage * (e.pct ?? 1)); else if (e.do === 'strike' && t.alive) this.host.rawHit(c, t, Math.round(damage * (e.pct ?? 1)), false);
        else if (e.do === 'stun' && t.alive) (t.statuses ??= {}).stunned = Math.max(t.statuses.stunned ?? 0, 1); else if (e.do === 'haste') haste = true;
      }
    }
    return { repeat, haste };
  }
  forceCritNow(c: Character) { const e = this.of(c, 'every').find(x => x.on === 'basic' && x.do === 'crit'); if (!e) return false; const m = this.rt(c); return ((m.counters.basic ?? 0) + 1) % e.n === 0; }

  // ------------------------------------------------------------------------------------------ magias
  castCost(c: Character, mana: number) { return Math.max(0, Math.round(mana * this.manaCostMult(c))); }
  /** Magia de dano usada: devolve se foi grátis/sem recarga, repetida ou zerou outra. */
  onCast(c: Character, spellId: string, isDamage: boolean, focus: boolean): { free: boolean; noCd: boolean; again: boolean } {
    const m = this.rt(c); m.counters.cast = (m.counters.cast ?? 0) + 1; let free = false, noCd = false, again = false;
    for (const e of this.eff(c)) {
      if (e.k === 'proc' && e.do === 'freeCast' && Math.random() < e.chance && (e.noCd ? focus : isDamage)) { free = true; noCd = !!e.noCd; }
      else if (e.k === 'proc' && e.do === 'castAgain' && isDamage && Math.random() < e.chance) again = true;
      else if (e.k === 'proc' && e.do === 'castReset' && Math.random() < e.chance) { const other = c.spellSlots.filter(id => id !== spellId && (c.cooldowns[id] ?? 0) > 0)[0]; if (other) c.cooldowns[other] = 0; }
      else if (e.k === 'every' && e.on === 'cast' && m.counters.cast % e.n === 0 && e.do === 'doubleNext') m.doubleNext = true;
    }
    return { free, noCd, again };
  }
  buffDuration(c: Character, base: number) { return base * (1 + this.of(c, 'buffs').reduce((s, e) => s + (e.durMult ?? 0), 0)); }
  onBuffCast(c: Character) { const heal = this.of(c, 'buffs').reduce((s, e) => s + (e.heal ?? 0), 0); if (heal > 0) for (const a of this.team()) this.host.heal(a, this.host.stats(a).maxHp * heal, c); }
  onControl(c: Character) { const pct = this.of(c, 'ctrlMana').reduce((s, e) => s + e.pct, 0); if (pct > 0) c.mana = Math.min(this.host.stats(c).maxMana, c.mana + this.host.stats(c).maxMana * pct); }

  // ------------------------------------------------------------------------------------------ cura
  healMult(c: Character, area: boolean) { return 1 + (area ? this.of(c, 'heals').reduce((s, e) => s + (e.areaMult ?? 0), 0) : 0); }
  /** Excedente de cura vira escudo; cura de alvo único também cura o 2º mais ferido. */
  afterHeal(healer: Character, target: Character, wanted: number, applied: number, single: boolean) {
    for (const e of this.of(healer, 'heals')) {
      if (e.overflowShield && wanted > applied) this.host.shield(target, Math.min(this.host.stats(target).maxHp * (e.overflowShield >= 1 ? .3 : e.overflowShield), wanted - applied), 8);
      if (e.splash && single) { const second = this.team().filter(a => a !== target).sort((a, b) => a.hp / this.host.stats(a).maxHp - b.hp / this.host.stats(b).maxHp)[0]; if (second) this.host.heal(second, wanted * e.splash, healer); }
    }
  }

  // ------------------------------------------------------------------------------------------ abates
  onKill(c: Character | undefined, t: MonsterRuntime, crit: boolean) {
    if (!c) return;
    const m = this.rt(c), def = MONSTERS[t.defId], stats = this.host.stats(c);
    for (const e of this.eff(c)) {
      if (e.k === 'streak' && e.on === 'kill') this.bumpStack(m, `s${e.on}${e.per}`, e.max, e.dur);
      if (e.k === 'killBurst') { m.lastKill = [...m.lastKill.filter(x => this.clock - x < e.window), this.clock]; if (m.lastKill.length >= e.n) { m.lastKill = []; m.stacks.burst = { n: e.aspd * 100, until: this.clock + e.dur }; } }
      if (e.k !== 'onKill') continue;
      if (e.critOnly && !crit) continue;
      if (e.heal) this.host.heal(c, stats.maxHp * e.heal, c);
      if (e.mana) c.mana = Math.min(stats.maxMana, c.mana + stats.maxMana * e.mana);
      if (e.cd) for (const id of Object.keys(c.cooldowns)) if (id !== 'basic') c.cooldowns[id] = Math.max(0, c.cooldowns[id] * (1 - e.cd));
      if (e.bossBuff && def.boss) m.buffs.push({ dmg: e.bossBuff.dmg, aspd: 0, taken: 0, until: this.clock + e.bossBuff.dur });
      if (e.bossGold && def.boss) { const common = MONSTERS[reinforcementIds(this.host.state.huntId).common]; this.host.addGold(Math.round(e.bossGold * (common.gold[0] + common.gold[1]) / 2)); }
      if (e.goldMult) { const n = this.bumpStack(m, 'goldkill', 10, 10); this.host.addGold(Math.round(((def.gold[0] + def.gold[1]) / 2) * e.goldMult * n)); }
    }
    for (const e of this.of(c, 'goldDouble')) if (Math.random() < e.chance) this.host.addGold(Math.round((def.gold[0] + def.gold[1]) / 2));
    if (def.boss) {
      for (const ally of this.team()) {
        for (const e of this.eff(ally)) {
          if (e.k === 'bossGold') this.host.addGold(Math.round(((def.gold[0] + def.gold[1]) / 2) * (e.mult - 1)));
          if (e.k === 'bossDrop' && Math.random() < e.chance) this.host.dropGear({ ...def, boss: true });
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------ dano recebido
  /** Multiplicador do dano que `target` vai sofrer, ou 0 se desviou; `fatal` = chance de o golpe matar para a trava de sobrevivência. */
  incoming(target: Character): number {
    const m = this.rt(target), st = this.host.stats(target); let reduce = 0;
    if (m.invulnUntil > this.clock) return 0;
    const frac = target.hp / st.maxHp;
    for (const e of this.eff(target)) {
      if (e.k === 'dodge') { const quiet = e.quiet && this.clock - m.lastDamaged >= e.quiet; if ((e.chance && Math.random() < e.chance) || quiet) { if (quiet) m.lastDamaged = this.clock; return 0; } }
      else if (e.k === 'taken' && (e.below === undefined || frac < e.below)) reduce += e.pct;
      else if (e.k === 'takenStack') reduce += this.stackN(m, `ts${e.per}`) * e.per;
    }
    for (const b of this.activeBuffs(m)) reduce += b.taken;
    for (const ally of this.team()) {
      for (const e of this.eff(ally)) {
        if (e.k !== 'teamTaken') continue;
        if (e.below !== undefined && frac >= e.below) continue;
        if (e.row === 'back' && target.row !== 'back') continue;
        if (e.row === 'same' && ally.row !== target.row) continue;
        reduce += e.pct;
      }
    }
    if (this.of(target, 'once').some(e => e.when === 'firstHit') && !m.wave.absorbed) { m.wave.absorbed = true; return 0; }
    return Math.max(0, 1 - Math.min(.85, reduce));
  }
  /** Depois de sofrer dano: acúmulos, reflexo, gatilhos de HP baixo. Devolve true se evitou a morte. */
  afterDamaged(target: Character, attacker: MonsterRuntime, dealt: number): boolean {
    const m = this.rt(target), st = this.host.stats(target); m.lastDamaged = this.clock; let saved = false;
    for (const e of this.eff(target)) {
      if (e.k === 'takenStack') this.bumpStack(m, `ts${e.per}`, Math.round(e.max / e.per), e.dur);
      if (e.k === 'reflect' && e.chance > 0 && attacker.alive && Math.random() < e.chance) {
        const back = Math.round(dealt * e.pct); if (back > 0) { this.host.rawHit(target, attacker, back, false); const heal = this.of(target, 'reflect').reduce((s, r) => s + (r.heal ?? 0), 0); if (heal > 0) this.host.heal(target, back * heal, target); }
      }
    }
    if (target.hp <= 0) {
      for (const e of this.of(target, 'once')) if (e.when === 'fatal' && !m.wave.fatal) { m.wave.fatal = true; target.hp = Math.max(1, Math.round(st.maxHp * (e.pct ?? 0))); saved = true; break; }
    }
    if (target.hp > 0) {
      const frac = target.hp / st.maxHp;
      for (const e of this.of(target, 'once')) {
        if (e.when !== 'lowhp' || frac >= (e.below ?? .3) || m.wave[`low${e.do}${e.pct}`]) continue;
        m.wave[`low${e.do}${e.pct}`] = true;
        if (e.do === 'shield') this.host.shield(target, st.maxHp * (e.pct ?? .2), 12);
        else if (e.do === 'invuln') m.invulnUntil = this.clock + (e.dur ?? 3);
        else if (e.do === 'buff') m.buffs.push({ dmg: e.dmg ?? 0, aspd: 0, taken: 0, until: this.clock + (e.dur ?? 8) });
        else if (e.do === 'takenBuff') m.buffs.push({ dmg: 0, aspd: 0, taken: e.pct ?? .5, until: this.clock + (e.dur ?? 5) });
        else if (e.do === 'regen') target.effects.push({ id: `mechregen-${this.clock}`, type: 'regen', value: Math.round(st.maxHp * (e.pct ?? .03)), remaining: e.dur ?? 5, source: target.id });
        else if (e.do === 'volley') for (const t of livingMonsters(this.host.state)) this.host.rawHit(target, t, Math.max(1, Math.round(st.attack * (e.dmg ?? 2))), false);
      }
    }
    return saved;
  }

  // ------------------------------------------------------------------------------------------ tempo
  tick(dt: number) {
    this.clock += dt;
    const team = this.team();
    for (const c of team) {
      const m = this.rt(c), st = this.host.stats(c), frac = c.hp / st.maxHp;
      for (const e of this.eff(c)) {
        if (e.k === 'quietRegen' && this.clock - m.lastDamaged >= e.after) this.host.heal(c, st.maxHp * e.hp * dt, c);
        else if (e.k === 'lowRegen' && frac < e.below) this.host.heal(c, st.maxHp * e.hp * dt, c);
        else if (e.k === 'periodic') {
          const key = `p${e.do}${e.every}${e.pct ?? 0}`; m.timers[key] ??= this.clock - dt + e.every;
          if (this.clock >= m.timers[key]) {
            m.timers[key] = this.clock + e.every;
            if (e.do === 'volley') for (const t of livingMonsters(this.host.state)) this.host.rawHit(c, t, Math.max(1, Math.round(st.attack * (e.pct ?? 1))), false);
            else if (e.do === 'gold') this.host.addGold(Math.round((e.pct ?? 20) * ((MONSTERS[reinforcementIds(this.host.state.huntId).common].gold[0] + MONSTERS[reinforcementIds(this.host.state.huntId).common].gold[1]) / 2)));
            else if (e.do === 'selfBuff') m.buffs.push({ dmg: e.dmg ?? 0, aspd: e.aspd ?? 0, taken: e.taken ?? 0, until: this.clock + (e.dur ?? 6) });
            else if (e.do === 'teamBuff') for (const a of team) this.rt(a).buffs.push({ dmg: e.dmg ?? 0, aspd: e.aspd ?? 0, taken: 0, until: this.clock + (e.dur ?? 6) });
            else if (e.do === 'regenTeam') for (const a of team) this.host.heal(a, this.host.stats(a).maxHp * (e.pct ?? .01), c);
          }
        } else if (e.k === 'heals' && e.autoShield) {
          for (const a of team) { const f = a.hp / this.host.stats(a).maxHp; const last = m.autoShieldAt[a.id] ?? -99; if (f < e.autoShield.below && this.clock - last >= e.autoShield.cd) { m.autoShieldAt[a.id] = this.clock; this.host.shield(a, this.host.stats(a).maxHp * e.autoShield.pct, 8); } }
        } else if (e.k === 'once') {
          if (e.when === 'noMana' && c.mana < 1 && !m.wave.nomana) { m.wave.nomana = true; c.mana = Math.min(st.maxMana, c.mana + st.maxMana * (e.pct ?? .3)); }
          if (e.when === 'avgLow' && !m.wave[`avg${e.do}${e.pct}`]) {
            const avg = team.reduce((s, a) => s + a.hp / this.host.stats(a).maxHp, 0) / Math.max(1, team.length), dead = this.host.state.characters.filter(x => this.host.state.team.includes(x.id) && x.hp <= 0);
            if (e.do === 'revive' && dead.length) { m.wave[`avg${e.do}${e.pct}`] = true; const d = dead[0]; d.hp = Math.round(this.host.stats(d).maxHp * (e.pct ?? .4)); this.host.emit({ type: 'heal', target: d.id, value: d.hp }); }
            else if (e.do === 'teamHeal' && avg < .5) { m.wave[`avg${e.do}${e.pct}`] = true; for (const a of team) this.host.heal(a, this.host.stats(a).maxHp * (e.pct ?? .25), c); }
          }
        }
      }
    }
  }
  /** Poção que não é consumida. */
  potionSaved(c: Character) { return this.of(c, 'potionSave').some(e => Math.random() < e.chance); }
}
