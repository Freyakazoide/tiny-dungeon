import type { Character, GameState, MonsterRuntime, Stats } from './types';
import { MONSTERS } from '../data/monsters';
import { effectsOf, type Eff } from '../systems/mechanics';
import { livingMonsters, livingTeam } from '../systems/combat';
import { reinforcementIds } from '../systems/waves';
import { addCounter } from '../rpg/profile';

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
  hasWeapon(c: Character): boolean;
  focus(c: Character): string | undefined;
  elementsAt(c: Character, level: number): number;
  bossTypesKilled(): number;
  hpBonus(c: Character): number;
  lifesteal(c: Character): number;
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
  stealthUntil: number; lastFocus?: string; spreadT: number;
}
const fresh = (): CharMech => ({ stacks: {}, buffs: [], counters: {}, timers: {}, wave: {}, firstHit: new Set(), bossHits: {}, lastDamaged: -99, lastKill: [], quietCrit: 0, doubleNext: false, invulnUntil: -1, killStreak: { n: 0, until: 0 }, autoShieldAt: {}, stealthUntil: -1, spreadT: 0 });

export class Mech {
  clock = 0;
  private per = new Map<string, CharMech>();
  private skel = new Map<string, number>();
  private sched: { at: number; owner: string; uid: string; dmg: number }[] = [];
  private bonusGold = new Set<string>();
  pendingCredit = 0;
  private spreading = false;
  reset() { this.per.clear(); this.skel.clear(); this.sched = []; this.bonusGold.clear(); this.pendingCredit = 0; }
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
      m.counters.waveAt = this.clock; m.counters.dotAll = 0;
      for (const e of this.of(c, 'once')) if (e.when === 'start' && e.do === 'shield') this.host.shield(c, this.host.stats(c).maxHp * (e.pct ?? .1), 12);
    }
    this.pendingCredit = 0; this.sched = []; this.bonusGold.clear();
    for (const c of this.team()) for (const e of this.of(c, 'transmute')) this.transmute(c, e.kind);
  }

  // ------------------------------------------------------------------------------------------ dano causado
  /** Multiplicador e crítico forçado de um golpe de `c` em `t`. */
  outgoing(c: Character, t: MonsterRuntime, ctx: { crit: boolean; basic?: boolean; spell?: boolean; element?: string }): { mult: number; crit: boolean } {
    const m = this.rt(c), boss = !!MONSTERS[t.defId].boss;
    let mult = 1, add = 0, crit = ctx.crit;
    const forceCrit = () => { if (!crit) { crit = true; mult *= 1.65; } };
    for (const e of this.eff(c)) {
      if (e.k === 'dmg') {
        const frac = t.hp / t.maxHp;
        if ((e.vs === 'boss' && boss) || (e.vs === 'bossElite' && (boss || this.isElite(t))) || (e.vs === 'low' && frac < (e.thr ?? .3)) || (e.vs === 'full' && frac >= .999) || (e.vs === 'ctrl' && ((t.statuses?.frozen ?? 0) > 0 || (t.statuses?.stunned ?? 0) > 0)) || (e.vs === 'critBoss' && crit && boss) || (e.vs === 'basic' && ctx.basic) || (e.vs === 'spell' && ctx.spell) || (e.vs === 'crit' && crit) || (e.vs === 'basicArmed' && ctx.basic && this.host.hasWeapon(c)) || (e.vs === 'element' && ctx.spell && ctx.element === e.el)) add += e.pct;
        if (e.vs === 'goldScaled') add += Math.min(.25, Math.floor((c.profile.counters.goldEarned ?? 0) / 1000) * e.pct);
      } else if (e.k === 'lostHp') { const lost = 1 - c.hp / this.host.stats(c).maxHp; add += Math.min(e.max, Math.floor(lost * 100 / e.per) * e.step); }
      else if (e.k === 'firstBoss' && boss && !m.wave.firstBoss) { m.wave.firstBoss = true; mult *= e.mult; }
      else if (e.k === 'firstStrike' && !m.firstHit.has(t.uid)) { m.firstHit.add(t.uid); mult *= e.mult; crit = true; }
      else if (e.k === 'bossForceCrit' && boss && (m.bossHits[t.uid] ?? 0) < e.n) { m.bossHits[t.uid] = (m.bossHits[t.uid] ?? 0) + 1; forceCrit(); }
      else if (e.k === 'streak' && e.dmg) add += this.stackN(m, `s${e.on}${e.per}`) * e.per;
      else if (e.k === 'onCrit' && e.buff?.dmg) add += this.stackN(m, `cb${e.buff.dmg}_${e.buff.aspd ?? 0}`) * e.buff.dmg;
      else if (e.k === 'noHitStreak') add += this.stackN(m, 'nh') * e.dmg;
      else if (e.k === 'elemCount' && ctx.spell) add += e.per * this.host.elementsAt(c, e.level);
      else if (e.k === 'bossKillStack') add += e.per * this.host.bossTypesKilled();
      else if (e.k === 'hpScale') add += Math.floor(this.host.hpBonus(c) / e.per) * e.step;
      else if (e.k === 'heavyHit' && m.counters.heavy) { add += e.dmg; m.counters.heavy = 0; }
      else if (e.k === 'ignoreDef' && !ctx.spell && (!e.crit || crit) && Math.random() < e.chance) { const att = this.host.stats(c).attack, def = MONSTERS[t.defId].defense; mult *= Math.min(3, att / Math.max(1, att - def * .55)); }
      else if (e.k === 'firstSpellCrit' && ctx.spell && !m.wave.firstSpell) { m.wave.firstSpell = true; forceCrit(); }
      else if (e.k === 'dmgPerStack' && boss) add += (t.statuses?.poison?.stacks ?? 0) * e.per;
      else if (e.k === 'armorBreak' && e.on === 'poisoned' && t.statuses?.poison) add += e.pct;
    }
    add += t.statuses?.armor?.pct ?? 0;
    for (const b of this.activeBuffs(m)) add += b.dmg;
    for (const ally of this.team()) {
      for (const e of this.eff(ally)) {
        if (e.k === 'teamDmgFirst' && t === livingMonsters(this.host.state)[0]) add += e.pct;
        if (e.k === 'teamDmgBoss' && boss) add += e.pct;
        if (e.k === 'teamSpellDmg' && ctx.spell) add += e.pct;
      }
    }
    mult *= 1 + add;
    if (m.doubleNext && ctx.spell) { mult *= 2; m.doubleNext = false; }
    return { mult, crit };
  }
  /** Extra do golpe básico por atributo (Mestre Rúnico/Escudeiro). */
  basicExtra(c: Character) { let extra = 0; const st = this.host.stats(c); for (const e of this.of(c, 'basicStat')) extra += (e.stat === 'magicPower' ? st.magicPower : st.defense) * e.pct; return extra; }
  critReady(c: Character) { const e = this.of(c, 'critReady')[0]; if (!e) return false; const m = this.rt(c); if (this.clock - m.quietCrit >= e.every) { m.quietCrit = this.clock; return true; } return false; }
  aspdBonus(c: Character) { const m = this.rt(c); let v = 0; for (const a of this.team()) for (const e of this.of(a, 'teamAspd')) v += e.pct; for (const e of this.of(c, 'streak')) if (e.aspd) v += this.stackN(m, `s${e.on}${e.per}`) * e.per;
    for (const e of this.of(c, 'onCrit')) if (e.buff?.aspd) v += this.stackN(m, `cb${e.buff.dmg ?? 0}_${e.buff.aspd}`) * e.buff.aspd; for (const b of this.activeBuffs(m)) v += b.aspd; if (this.clock < (m.stacks.burst?.until ?? 0)) v += m.stacks.burst.n / 100; return v; }
  affinity(c: Character, element: string | undefined, aff: number) { let v = aff; if (v < 1) for (const e of this.of(c, 'ignoreResist')) if (!e.element || e.element === element) v += (1 - v) * (e.pct ?? 1); return v; }
  manaCostMult(c: Character) { return Math.max(.4, 1 - this.of(c, 'manaCost').reduce((s, e) => s + e.pct, 0)); }

  /** Depois de um golpe: críticos, sequências, execução, estados e roubo de vida. */
  afterHit(c: Character, t: MonsterRuntime, damage: number, crit: boolean, ctx: { basic?: boolean; spell?: boolean; element?: string }) {
    const m = this.rt(c);
    if (ctx.basic) m.counters.nohit = (m.counters.nohit ?? 0) + 1;
    for (const e of this.eff(c)) {
      if (e.k === 'streak' && ((e.on === 'hit' && ctx.basic) || (e.on === 'cast' && ctx.spell))) this.bumpStack(m, `s${e.on}${e.per}`, e.max, e.dur);
      if (e.k === 'noHitStreak' && ctx.basic && m.counters.nohit % e.n === 0) this.bumpStack(m, 'nh', e.max, e.dur);
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
      if (!t.alive) continue;
      if (e.k === 'bleed' && ((e.on === 'crit' && crit) || (e.on === 'hit' && ctx.basic))) this.addBleed(t, damage * e.pct, e.dur, c);
      else if (e.k === 'poisonOnHit' && ctx.basic) this.addPoison(t, e.stacks, c);
      else if (e.k === 'burnOnHit' && ctx.basic && Math.random() < e.chance) this.host.burn(t, 1, c);
      else if (e.k === 'armorBreak' && e.on !== 'poisoned' && e.on !== 'aoe' && (e.on === 'hit' ? (!e.element || e.element === ctx.element) : crit)) this.addArmor(t, e.pct, e.dur, e.max);
      else if (e.k === 'confuse' && e.on === 'crit' && crit && (!e.element || e.element === ctx.element)) this.confuse(t, e.dur, c);
      else if (e.k === 'basicOrb' && ctx.basic) { const extra = Math.max(1, Math.round(damage * e.pct)); this.host.rawHit(c, t, extra, false); this.host.heal(c, extra * e.heal, c); }
      else if (e.k === 'elemLeech' && ctx.spell && ctx.element === e.element && (!e.critOnly || crit)) {
        const target = e.ally ? this.lowestAlly() ?? c : c; if (e.heal) this.host.heal(target, damage * e.heal, c);
        if (e.mana) c.mana = Math.min(this.host.stats(c).maxMana, c.mana + this.host.stats(c).maxMana * e.mana);
      } else if (e.k === 'cursedLeech' && (t.statuses?.poison || t.statuses?.burn || t.statuses?.bleed)) this.host.heal(c, damage * (.03 + this.host.lifesteal(c) * e.pct), c);
      else if (e.k === 'glyph' && ctx.spell) this.sched.push({ at: this.clock + e.delay, owner: c.id, uid: t.uid, dmg: damage * e.pct });
      else if (e.k === 'elemStun' && ctx.spell && ctx.element === e.element && Math.random() < e.chance) this.stun(t, e.dur);
    }
  }
  private lowestAlly() { return this.team().sort((a, b) => a.hp / this.host.stats(a).maxHp - b.hp / this.host.stats(b).maxHp)[0]; }
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
  castCost(c: Character, mana: number, spell?: { id: string; kind: string }) {
    let cost = mana * this.manaCostMult(c);
    if (spell?.kind === 'buff' && this.of(c, 'buffHalfCost').length && c.effects.some(e => e.id.startsWith(spell.id))) cost *= .5;
    return Math.max(0, Math.round(cost));
  }
  /** Magia de dano usada: devolve se foi grátis/sem recarga, repetida ou zerou outra. */
  onCast(c: Character, spellId: string, isDamage: boolean, focus: boolean, aoe = false): { free: boolean; noCd: boolean; again: boolean } {
    const m = this.rt(c); m.counters.cast = (m.counters.cast ?? 0) + 1; let free = false, noCd = false, again = false;
    for (const e of this.eff(c)) {
      if (e.k === 'proc' && e.do === 'freeCast' && Math.random() < e.chance && (e.noCd ? focus : isDamage)) { free = true; noCd = !!e.noCd; }
      else if (e.k === 'proc' && e.do === 'castAgain' && isDamage && Math.random() < e.chance) again = true;
      else if (e.k === 'aoeAgain' && isDamage && aoe && Math.random() < e.chance) again = true;
      else if (e.k === 'onCastBuff') m.buffs.push({ dmg: e.dmg, aspd: 0, taken: 0, until: this.clock + e.dur });
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
    this.afterDeath(t);
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
    for (const e of this.of(c, 'lootGold')) this.host.addGold(Math.round((def.gold[0] + def.gold[1]) / 2 * e.pct));
    for (const e of this.of(c, 'stealth')) m.stealthUntil = this.clock + e.sec;
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
      else if (e.k === 'taken' && (e.below === undefined || frac < e.below) && (!e.tank || target.isTank)) reduce += e.pct;
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
    m.counters.nohit = 0; delete m.stacks.nh; if (dealt > st.maxHp * .1) m.counters.heavy = 1;
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
    this.clock += dt; this.tickExtras(dt);
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
  // ------------------------------------------------------------------------------------------ estados dos monstros
  private stat(t: MonsterRuntime) { return t.statuses ??= {}; }
  dotPower(src: Character) { const st = this.host.stats(src); return Math.max(st.attack * .8, st.magicPower) * (1 + this.of(src, 'dotBoost').reduce((s, e) => s + e.pct, 0)); }
  dotDur(src: Character, base: number) { return base * (1 + this.of(src, 'dotDur').reduce((s, e) => s + e.pct, 0)); }
  addPoison(t: MonsterRuntime, stacks: number, src: Character) {
    const st = this.stat(t), p = st.poison ??= { stacks: 0, remaining: 0, power: 0, source: src.id, acc: 0 };
    p.stacks = Math.min(10, p.stacks + stacks); p.remaining = this.dotDur(src, 6); p.power = this.dotPower(src); p.source = src.id;
    const m = this.rt(src);
    if (!this.spreading && this.of(src, 'dotAll').length && !m.counters.dotAll) { m.counters.dotAll = 1; this.spreading = true; for (const o of livingMonsters(this.host.state)) if (o !== t) this.addPoison(o, 1, src); this.spreading = false; }
  }
  addBleed(t: MonsterRuntime, perSec: number, dur: number, src: Character) { const st = this.stat(t); st.bleed = { remaining: dur, perSec: Math.max(1, perSec), source: src.id, acc: 0 }; }
  addArmor(t: MonsterRuntime, pct: number, dur: number, max?: number) {
    const st = this.stat(t), a = st.armor; if (!a) st.armor = { pct: Math.min(max ?? pct, pct), remaining: dur };
    else { a.pct = max ? Math.min(max, a.pct + pct) : Math.max(a.pct, pct); a.remaining = Math.max(a.remaining, dur); }
  }
  confuse(t: MonsterRuntime, dur: number, src: Character) { this.stat(t).confused = { remaining: dur, source: src.id }; }
  stun(t: MonsterRuntime, dur: number) { const st = this.stat(t); st.stunned = Math.max(st.stunned ?? 0, dur); }
  private charById(id: string) { return this.host.state.characters.find(x => x.id === id); }
  private spread(kind: 'poison' | 'burn', from: MonsterRuntime, n: number) {
    const status = from.statuses?.[kind]; if (!status) return; let left = n;
    for (const o of livingMonsters(this.host.state)) {
      if (o === from || left <= 0) continue; const st = this.stat(o); if (st[kind]) continue;
      st[kind] = { ...status, stacks: Math.max(1, Math.ceil(status.stacks / 2)), remaining: kind === 'poison' ? 6 : 5, acc: 0 } as never; left--;
    }
  }
  /** Dano contínuo (veneno, sangramento), duração dos estados e espalhamento; chamado a cada tick para cada monstro vivo. */
  tickMonster(m: MonsterRuntime, dt: number) {
    const st = m.statuses; if (!st) return;
    if (st.poison) {
      const p = st.poison, src = this.charById(p.source), dbl = src && this.of(src, 'poisonOnHit').some(e => e.doubleAt && p.stacks >= e.doubleAt) ? 2 : 1;
      p.acc += p.stacks * .10 * p.power * dt * dbl; const whole = Math.floor(p.acc); p.acc -= whole;
      if (whole > 0 && src) { addCounter(src.profile, 'dotDamage', whole); this.host.rawHit(src, m, whole, false); }
      if (!m.alive) return;
      if (src && this.of(src, 'dotSpread').some(e => e.on === 'tick')) { const mm = this.rt(src); mm.spreadT += dt; if (mm.spreadT >= 2) { mm.spreadT = 0; this.spread('poison', m, 1); } }
      p.remaining -= dt; if (p.remaining <= 0) { this.onDotEnd(src, m, 'poison'); delete st.poison; }
    }
    if (st.bleed && m.alive) {
      const b = st.bleed, src = this.charById(b.source); b.acc += b.perSec * dt; const whole = Math.floor(b.acc); b.acc -= whole;
      if (whole > 0 && src) { addCounter(src.profile, 'dotDamage', whole); this.host.rawHit(src, m, whole, false); }
      b.remaining -= dt; if (b.remaining <= 0) delete st.bleed;
    }
    if (!m.alive) return;
    if (st.armor) { st.armor.remaining -= dt; if (st.armor.remaining <= 0) delete st.armor; }
    if (st.confused) { st.confused.remaining -= dt; if (st.confused.remaining <= 0) delete st.confused; }
  }
  /** Um dano contínuo acabou: maldições passam para o vizinho. */
  onDotEnd(src: Character | undefined, m: MonsterRuntime, kind: 'poison' | 'burn') { if (src && this.of(src, 'dotSpread').some(e => e.on === 'expire')) this.spread(kind, m, this.of(src, 'dotSpread').find(e => e.on === 'expire')!.n); }
  burnMult(src: Character) { return 1 + this.of(src, 'dotBoost').reduce((s, e) => s + e.pct, 0); }
  /** Morte de um monstro: veneno se espalha ou explode; esqueletos nascem; transmutação paga ouro. */
  private afterDeath(t: MonsterRuntime) {
    const poison = t.statuses?.poison, src = poison && this.charById(poison.source);
    if (poison && src) {
      for (const e of this.of(src, 'dotSpread')) if (e.on === 'death') this.spread('poison', t, e.n);
      for (const e of this.of(src, 'deathBlast')) for (const o of livingMonsters(this.host.state)) this.host.rawHit(src, o, Math.max(1, Math.round(this.host.stats(src).attack * e.pct * Math.max(1, poison.stacks / 3))), false);
    }
    for (const ally of this.team()) for (const e of this.of(ally, 'skeletons')) { const cap = Math.max(...this.of(ally, 'skeletons').map(x => x.max)); this.skel.set(ally.id, Math.min(cap, (this.skel.get(ally.id) ?? 0) + 1)); void e; break; }
    if (this.bonusGold.delete(t.uid)) { const def = MONSTERS[t.defId]; this.host.addGold(Math.round((def.gold[0] + def.gold[1]) / 2)); }
  }
  private transmute(c: Character, kind: 'strong' | 'weak') {
    const list = livingMonsters(this.host.state).filter(m => !MONSTERS[m.defId].boss);
    if (kind === 'strong') { const t = [...livingMonsters(this.host.state)].sort((a, b) => b.maxHp - a.maxHp)[0]; if (t) { t.hp = Math.max(1, Math.round(t.hp * .7)); this.bonusGold.add(t.uid); } }
    else { const t = list.sort((a, b) => a.hp - b.hp)[0]; if (t) { const def = MONSTERS[t.defId]; this.host.addGold(Math.round((def.gold[0] + def.gold[1]) / 2)); this.host.rawHit(c, t, t.hp, false); } }
  }

  // ------------------------------------------------------------------------------------------ depois de uma magia / suporte
  afterSpell(c: Character, ctx: { aoe: boolean; element?: string; controlled: boolean; targets: MonsterRuntime[]; dealt: number }) {
    const live = ctx.targets.filter(t => t.alive);
    for (const e of this.eff(c)) {
      if (e.k === 'aoeStun' && ctx.aoe) for (const t of live) this.stun(t, e.dur);
      if (e.k === 'armorBreak' && e.on === 'aoe' && ctx.aoe) for (const t of live) this.addArmor(t, e.pct, e.dur);
      if (e.k === 'groundFire' && ctx.aoe && ctx.element === 'fire') for (const t of live) this.host.burn(t, 1, c);
      if (e.k === 'pendingHit' && ctx.aoe && ctx.targets.length) this.pendingCredit += ctx.dealt / ctx.targets.length * e.pct;
      if (e.k === 'dotCross' && ctx.element === 'fire') for (const t of live) this.addPoison(t, 1, c);
      if (e.k === 'dotCross' && ctx.element === 'poison') for (const t of live) this.host.burn(t, 1, c);
      if (e.k === 'stunExtra' && ctx.controlled) for (const t of live) if ((t.statuses?.stunned ?? 0) > 0) t.statuses!.stunned! += e.sec;
      if (e.k === 'confuse' && e.on === 'control' && ctx.controlled) for (const t of live) if ((t.statuses?.stunned ?? 0) > 0 || (t.statuses?.frozen ?? 0) > 0) this.confuse(t, e.dur, c);
      if (e.k === 'bossCtrl' && ctx.controlled) for (const t of live) if (MONSTERS[t.defId].boss && t.statuses) { if (t.statuses.frozen) t.statuses.frozen *= .5; if (t.statuses.stunned) t.statuses.stunned *= .5; }
    }
    if (ctx.controlled && live.length === 1) {
      const src = live[0].statuses ?? {}; let extra = 0;
      for (const e of this.of(c, 'ctrlExtra')) if (Math.random() < e.chance) extra = Math.max(extra, e.n);
      for (const o of livingMonsters(this.host.state)) { if (extra <= 0) break; if (o === live[0]) continue; const st = this.stat(o); if (src.frozen) st.frozen = src.frozen; if (src.stunned) st.stunned = src.stunned; extra--; }
    }
  }
  /** Cura aplicada: regeneração, barreira para os aliados quando o alvo é quem tem a mecânica. */
  afterHealApplied(healer: Character, target: Character, applied: number) {
    for (const e of this.of(healer, 'healRegen')) if (applied > 0) { const st = this.host.stats(target); target.effects.push({ id: `mech-hr-${this.clock}-${target.id}`, type: 'regen', value: Math.max(1, Math.round(st.maxHp * e.pct)), remaining: e.dur, source: healer.id }); }
    for (const e of this.of(target, 'healedBarrier')) if (applied > 0) for (const a of this.team()) if (a !== target) this.host.shield(a, applied * e.pct, 8);
  }
  regenMult(c: Character) { return 1 + this.of(c, 'regenMult').reduce((s, e) => s + e.pct, 0) + (this.of(c, 'regenDef').length ? this.host.stats(c).defense / 400 : 0); }
  buffsTeam(c: Character) { return this.of(c, 'buffsTeam').length > 0; }
  shieldDurMult(c: Character) { return 1 + this.of(c, 'shieldDur').reduce((s, e) => s + e.pct, 0); }
  shieldShared(c: Character, value: number) { for (const e of this.of(c, 'shieldShare')) for (const a of this.team()) if (a !== c) this.host.shield(a, value * e.pct, 6); }
  onShieldExpire(c: Character, value: number) { for (const e of this.of(c, 'shieldExpire')) c.mana = Math.min(this.host.stats(c).maxMana, c.mana + value * e.mana); }
  buffCdr(c: Character) { let v = 0; for (const a of this.team()) for (const e of this.of(a, 'buffCdr')) if (c.effects.some(x => x.type === 'buffAttack' || x.type === 'buffDefense')) v += e.pct; for (const a of this.team()) for (const e of this.of(a, 'teamAspd')) v += e.pct * .5; return v; }
  buffMana(c: Character) { for (const e of this.of(c, 'buffMana')) for (const a of this.team()) a.mana = Math.min(this.host.stats(a).maxMana, a.mana + this.host.stats(a).maxMana * e.pct); }
  onPotion(c: Character, kind: 'health' | 'mana', amount: number) {
    for (const e of this.of(c, 'potion')) {
      if (e.share) for (const a of this.team()) if (a !== c) { if (kind === 'health') this.host.heal(a, amount * e.share, c); else a.mana = Math.min(this.host.stats(a).maxMana, a.mana + amount * e.share); }
      if (e.buff) c.effects.push({ id: `mech-potion-${this.clock}`, type: 'buffAttack', value: e.buff, remaining: 20, source: c.id });
    }
  }
  trainFocusPct(c: Character, isFocus: boolean) { return isFocus ? this.of(c, 'trainFocus').reduce((s, e) => s + e.pct, 0) : 0; }

  // ------------------------------------------------------------------------------------------ ataques dos monstros
  untargetable(c: Character) { return this.rt(c).stealthUntil > this.clock; }
  /** O monstro erra o primeiro ataque (por monstro e por wave). */
  monsterMisses(m: MonsterRuntime) {
    const key = `miss-${m.uid}`;
    for (const a of this.team()) { const mm = this.rt(a); for (const e of this.of(a, 'missFirst')) { if (mm.wave[key]) continue; mm.wave[key] = true; if (Math.random() < e.chance) return true; } }
    return false;
  }
  decoyAbsorbs() { for (const a of this.team()) for (const e of this.of(a, 'decoy')) if (Math.random() < e.chance) return true; return false; }
  afterMonsterAttack(m: MonsterRuntime) { if (!m.alive) return; for (const a of this.team()) for (const e of this.of(a, 'teamThorns')) this.host.rawHit(a, m, Math.max(1, Math.round(this.host.stats(a).attack * e.pct)), false); }

  // ------------------------------------------------------------------------------------------ tempo (invocações, buffs de grupo, glifos)
  tickExtras(dt: number) {
    const team = this.team(), alive = livingMonsters(this.host.state);
    for (const s of [...this.sched]) if (this.clock >= s.at) { this.sched.splice(this.sched.indexOf(s), 1); const t = alive.find(x => x.uid === s.uid && x.alive), o = this.charById(s.owner); if (t && o) this.host.rawHit(o, t, Math.max(1, Math.round(s.dmg)), false); }
    for (const c of team) {
      const m = this.rt(c), st = this.host.stats(c), eff = this.eff(c);
      const f = this.host.focus(c);
      if (m.lastFocus !== undefined && f !== m.lastFocus) for (const e of eff) if (e.k === 'focusSwap') m.buffs.push({ dmg: e.dmg, aspd: 0, taken: 0, until: this.clock + e.dur });
      m.lastFocus = f;
      for (const e of eff) {
        if (e.k === 'manaShield' && c.mana >= st.maxMana * .98) { c.mana -= st.maxMana * .03 * dt; this.host.shield(c, st.maxHp * .02 * dt * 3, 4); }
        else if (e.k === 'shareBuffs' && !m.wave.share) {
          const avg = team.reduce((x, a) => x + a.hp / this.host.stats(a).maxHp, 0) / Math.max(1, team.length);
          if (avg < .5) { m.wave.share = true; for (const buff of c.effects.filter(x => x.type === 'buffAttack' || x.type === 'buffDefense')) for (const a of team) if (a !== c) a.effects.push({ ...buff, id: `${buff.id}-share-${a.id}`, remaining: 8 }); }
        } else if (e.k === 'debuffRandom' || (e.k === 'confuse' && e.on === 'periodic')) {
          const every = e.k === 'debuffRandom' ? e.every : e.every ?? 20, key = `d${e.k}${every}`; m.timers[key] ??= this.clock - dt + every;
          if (this.clock >= m.timers[key]) {
            m.timers[key] = this.clock + every;
            if (e.k === 'confuse') for (const t of alive) this.confuse(t, e.dur, c);
            else for (const t of alive) { const roll = Math.floor(Math.random() * 3); if (roll === 0) this.addArmor(t, .15, 8); else if (roll === 1) this.stun(t, 1.5); else this.host.burn(t, 1, c); }
          }
        } else if (e.k === 'summon') {
          const within = !e.window || this.clock - (m.counters.waveAt ?? 0) < e.window; if (!within) continue;
          const key = `sm${e.every}${e.pct}${e.target}`; m.timers[key] ??= this.clock - dt + e.every;
          if (this.clock >= m.timers[key]) {
            m.timers[key] = this.clock + e.every; const dmg = Math.max(1, Math.round(st.attack * e.pct));
            const targets = e.target === 'all' ? alive : e.target === 'strong' ? [...alive].sort((a, b) => b.maxHp - a.maxHp).slice(0, 1) : e.target === 'low' ? alive.filter(t => t.hp / t.maxHp < .3) : alive.slice(0, 1);
            for (const t of targets) this.host.rawHit(c, t, dmg, false);
          }
        }
      }
      const sk = eff.filter((e): e is Extract<Eff, { k: 'skeletons' }> => e.k === 'skeletons');
      if (sk.length) {
        const n = this.skel.get(c.id) ?? 0, pct = Math.max(...sk.map(x => x.pct)); m.timers.skel = (m.timers.skel ?? 0) + dt;
        if (n > 0 && m.timers.skel >= 2) { m.timers.skel = 0; const t = alive[0]; if (t) { const dmg = Math.max(1, Math.round(st.attack * pct * n)); this.host.rawHit(c, t, dmg, false); const heal = eff.filter((e): e is Extract<Eff, { k: 'skeletonHeal' }> => e.k === 'skeletonHeal').reduce((a, e) => a + e.pct, 0); if (heal) this.host.heal(c, dmg * heal, c); } }
      }
      const tr = eff.filter((e): e is Extract<Eff, { k: 'turrets' }> => e.k === 'turrets');
      if (tr.length) {
        const n = Math.max(...tr.map(x => x.n)), pct = Math.max(...tr.map(x => x.pct)), rate = 1 + eff.filter((e): e is Extract<Eff, { k: 'turretRate' }> => e.k === 'turretRate').reduce((a, e) => a + e.pct, 0);
        m.timers.turret = (m.timers.turret ?? 0) + dt;
        if (m.timers.turret >= 2 / rate) { m.timers.turret = 0; const t = alive[0]; if (t) this.host.rawHit(c, t, Math.max(1, Math.round(st.attack * pct * n)), false); }
      }
    }
  }
  /** Dano já aplicado aos monstros da fila de espera (magias de área). */
  takePending() { return this.pendingCredit; }
  reviveClear() { this.skel.clear(); }

  /** Poção que não é consumida. */
  potionSaved(c: Character) { return this.of(c, 'potionSave').some(e => Math.random() < e.chance); }
}
