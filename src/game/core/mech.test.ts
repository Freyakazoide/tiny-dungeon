import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { Character } from './types';
import { MECHANIC_EFFECTS, MECHANICS_DONE, effectsOf, mechanicsTestHook, type Eff } from '../systems/mechanics';
import { TALENT_NODES } from '../data/talentTrees';
import { spellById } from '../data/spells';
import { characterStats } from '../systems/progression';
import { addItem } from '../systems/loot';

type Priv = { hit(c: Character, t: unknown, n: number, crit?: boolean, skip?: boolean): void; basicAttack(c: Character): void; kill(t: unknown, c?: Character, crit?: boolean): void; mech: { tick(dt: number): void; clock: number; incoming(c: Character): number; afterDamaged(c: Character, m: unknown, d: number): boolean }; cast(c: Character, s: unknown): void };
const P = (e: GameEngine) => e as unknown as Priv;
let mine: Record<string, Eff[]> = {};
beforeEach(() => { mine = {}; mechanicsTestHook.override = c => mine[c.id]; });
afterEach(() => { mechanicsTestHook.override = undefined; vi.restoreAllMocks(); });

function arena(effects: Eff[], hp = 1e9) {
  const e = new GameEngine(partyState()); const [a, b] = e.getSnapshot().characters; a.profile.level = 30; b.profile.level = 30;
  e.start(); const s = () => e.getSnapshot(); for (const m of s().monsters) { m.hp = m.maxHp = hp; m.cooldown = 1e9; }
  mine[a.id] = effects; a.mana = 1e6; return { e, a, b, s, m: () => s().monsters[0] };
}
const damageOf = (e: GameEngine, c: Character, t: { hp: number }, crit = false) => { const before = t.hp; P(e).hit(c, t, 1000, crit); return before - t.hp; };

describe('catálogo de mecânicas', () => {
  it('cada mecânica implementada vira efeitos para um nó real; comprar o nó liga o efeito no personagem', () => {
    expect(MECHANICS_DONE.size).toBe(346);
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    const nodeId = [...TALENT_NODES.values()].find(({ node }) => node.mechanic?.id === 'berserker.keystone')!.node.id;
    expect(effectsOf(c)).toEqual([]); c.talentRanks[nodeId] = 1;
    expect(effectsOf(c)).toEqual(MECHANIC_EFFECTS.get('berserker.keystone')); expect(effectsOf(c)[0]).toMatchObject({ k: 'once', when: 'fatal' });
    delete c.talentRanks[nodeId]; expect(effectsOf(c)).toEqual([]);
  });
});

describe('dano causado', () => {
  it('alvo abaixo de 30%: +25%; chefe: bônus só em chefe; HP cheio: +20%', () => {
    const { e, a, m } = arena([{ k: 'dmg', vs: 'low', thr: .3, pct: .25 }, { k: 'dmg', vs: 'full', pct: .2 }]);
    const t = m(); const full = damageOf(e, a, t); expect(full).toBeGreaterThan(1100); expect(full).toBeLessThanOrEqual(1200);   // HP cheio no 1º golpe
    t.hp = t.maxHp * .2; const low = damageOf(e, a, t); expect(low).toBe(1250);
  });
  it('primeiro golpe em cada monstro é crítico ×2; o segundo é normal', () => {
    const { e, a, m } = arena([{ k: 'firstStrike', mult: 2 }]); const t = m();
    expect(damageOf(e, a, t)).toBe(2000); expect(damageOf(e, a, t)).toBe(1000); expect(a.profile.counters.crits).toBe(1);
  });
  it('+1% por 2% de HP perdido, até +50%', () => {
    const { e, a, m } = arena([{ k: 'lostHp', per: 2, step: .01, max: .5 }]); const max = characterStats(a, e.getSnapshot()).maxHp;
    a.hp = max * .5; const half = damageOf(e, a, m()); expect(half).toBeGreaterThanOrEqual(1250); expect(half).toBeLessThan(1280); a.hp = 1; expect(damageOf(e, a, m())).toBe(1490);   // 49 degraus de 2%
  });
  it('sequência de abates acumula dano e some depois do prazo', () => {
    const { e, a, s } = arena([{ k: 'streak', on: 'kill', dmg: 1, per: .05, max: 10, dur: 8 }]); const [t1, t2] = s().monsters;
    for (const t of [t1, t2]) { t.hp = 1; P(e).hit(a, t, 5); }
    const t4 = s().monsters.find(x => x.alive)!; expect(damageOf(e, a, t4)).toBe(1100); P(e).mech.tick(9); expect(damageOf(e, a, t4)).toBe(1000);
  });
  it('a cada 5º golpe básico é crítico garantido; echo (torreta) soma dano extra; volley atinge todos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, a, s } = arena([{ k: 'every', n: 5, on: 'basic', do: 'crit' }]);
    for (let i = 0; i < 10; i++) { a.cooldowns.basic = 0; P(e).basicAttack(a); } expect(a.profile.counters.crits).toBe(2);
    const w = arena([{ k: 'echo', pct: .5 }]); const t = w.m(); const before = t.hp; vi.spyOn(Math, 'random').mockReturnValue(.99); P(w.e).basicAttack(w.a); const withEcho = before - t.hp;
    const base = arena([]); const t0 = base.m(); const b0 = t0.hp; P(base.e).basicAttack(base.a); expect(withEcho).toBeGreaterThan((b0 - t0.hp) * 1.4); void s;
    const v = arena([{ k: 'every', n: 1, on: 'basic', do: 'volley', pct: 1 }]); const hp0 = v.s().monsters.map(x => x.hp); P(v.e).basicAttack(v.a); v.s().monsters.forEach((x, i) => expect(x.hp, `alvo ${i}`).toBeLessThan(hp0[i]));
  });
  it('periódico: a cada N s uma salva em todos os inimigos', () => {
    const { e, a, s } = arena([{ k: 'periodic', every: 8, do: 'volley', pct: 1 }]); const hp0 = s().monsters.map(x => x.hp);
    P(e).mech.tick(7.9); expect(s().monsters.every((x, i) => x.hp === hp0[i])).toBe(true); P(e).mech.tick(.2); expect(s().monsters.every((x, i) => x.hp < hp0[i])).toBe(true); void a;
  });
  it('execução: abate alvo comum abaixo de 15%, mas não chefe', () => {
    const { e, a, m } = arena([{ k: 'execute', below: .15 }]); const t = m(); t.hp = t.maxHp * .14 + 5; P(e).hit(a, t, 3); expect(t.alive).toBe(false);
  });
});

describe('abates, cura e custo', () => {
  it('onKill cura, restaura mana e reduz recargas; só crítico quando pedido', () => {
    const { e, a, m } = arena([{ k: 'onKill', heal: .05, mana: .1, cd: 1 }]); a.hp = 10; a.mana = 0; a.cooldowns.x = 9; a.cooldowns.basic = 3;
    const t = m(); t.hp = 1; P(e).hit(a, t, 5); expect(a.hp).toBeGreaterThan(10); expect(a.mana).toBeGreaterThan(0); expect(a.cooldowns.x).toBe(0); expect(a.cooldowns.basic).toBe(3);
    const w = arena([{ k: 'onKill', cd: 1, critOnly: true }]); w.a.cooldowns.x = 9; const t2 = w.m(); t2.hp = 1; P(w.e).hit(w.a, t2, 5, false); expect(w.a.cooldowns.x).toBe(9);
  });
  it('custo de mana −10% e poção que não é consumida', () => {
    const { e, a } = arena([{ k: 'manaCost', pct: .1 }]); a.mana = 1000; P(e).cast(a, spellById('basic_fire')); expect(1000 - a.mana).toBe(Math.round(9 * .9));
    const w = arena([{ k: 'potionSave', chance: 1 }]); addItem(w.s(), 'health_potion', 3); const have = () => w.s().inventory.supply.find(x => x.itemId === 'health_potion')!.quantity, start = have(); w.a.hp = 1; expect(w.e.useSupply(w.a.id, 'health_potion')).toBe(true);
    expect(have()).toBe(start);   // não consumiu
    mine[w.a.id] = []; expect(w.e.useSupply(w.a.id, 'health_potion')).toBe(true); expect(have()).toBe(start - 1);
  });
  it('curas excedentes viram escudo', () => {
    const { e, a, b } = arena([{ k: 'heals', overflowShield: .2 }]); b.hp = b.hp; const full = b.hp; const spell = { ...spellById('paladin_light')!, power: 50 };
    P(e).cast(a, spell); expect(b.hp).toBe(full); void b;
  });
  it('ouro: bônus em chefes e chance de ouro em dobro', () => {
    const { e, a, s } = arena([{ k: 'goldDouble', chance: 1 }]); const before = s().gold; const t = s().monsters[0]; t.hp = 1; P(e).hit(a, t, 5); expect(s().gold - before).toBeGreaterThan(2);
  });
});

describe('dano recebido', () => {
  it('abaixo de 40% de HP: −15%; time: aliados abaixo de 30% recebem −20%; empilha sem passar do teto', () => {
    const { e, a, b } = arena([{ k: 'taken', pct: .15, below: .4 }]); a.hp = characterStats(a, e.getSnapshot()).maxHp; expect(P(e).mech.incoming(a)).toBe(1); a.hp = 1; expect(P(e).mech.incoming(a)).toBeCloseTo(.85);
    const w = arena([{ k: 'teamTaken', pct: .2, below: .3 }]); w.b.hp = 1; expect(P(w.e).mech.incoming(w.b)).toBeCloseTo(.8); w.a.hp = characterStats(w.a, w.e.getSnapshot()).maxHp; expect(P(w.e).mech.incoming(w.a)).toBe(1); void b;
    const s = arena([{ k: 'taken', pct: .5 }, { k: 'teamTaken', pct: .5 }, { k: 'taken', pct: .5 }]); expect(P(s.e).mech.incoming(s.a)).toBeCloseTo(.15);
  });
  it('desvio total, invulnerabilidade e sobrevivência a um golpe fatal (uma vez por wave)', () => {
    const d = arena([{ k: 'dodge', chance: 1 }]); expect(P(d.e).mech.incoming(d.a)).toBe(0);
    const f = arena([{ k: 'once', when: 'fatal', do: 'surviveFatal', pct: .2 }]); f.a.hp = 0; expect(P(f.e).mech.afterDamaged(f.a, f.m(), 50)).toBe(true); expect(f.a.hp).toBeGreaterThan(1);
    f.a.hp = 0; expect(P(f.e).mech.afterDamaged(f.a, f.m(), 50)).toBe(false);   // já gastou nesta wave
    const i = arena([{ k: 'once', when: 'lowhp', below: .4, do: 'invuln', dur: 3 }]); i.a.hp = 1; P(i.e).mech.afterDamaged(i.a, i.m(), 1); expect(P(i.e).mech.incoming(i.a)).toBe(0); P(i.e).mech.tick(3.1); expect(P(i.e).mech.incoming(i.a)).toBe(1);
  });
  it('reflexo devolve parte do dano e acúmulo reduz o próximo golpe', () => {
    const { e, a, m } = arena([{ k: 'reflect', chance: 1, pct: .5 }, { k: 'takenStack', per: .03, max: .15, dur: 6 }]); const t = m(); const hp = t.hp;
    P(e).mech.afterDamaged(a, t, 200); expect(hp - t.hp).toBeGreaterThanOrEqual(100); expect(P(e).mech.incoming(a)).toBeCloseTo(.97);
  });
});
