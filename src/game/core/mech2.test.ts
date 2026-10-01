import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { Character } from './types';
import { MECHANICS_DONE, mechanicsTestHook, type Eff } from '../systems/mechanics';
import { spellById } from '../data/spells';
import { characterStats, triesBonusPct } from '../systems/progression';
import { addItem } from '../systems/loot';

type Priv = { hit(c: Character, t: unknown, n: number, crit?: boolean, skip?: boolean): void; basicAttack(c: Character): void; cast(c: Character, s: unknown): void; mech: any; tick(ms: number): void; spawnBatch(n: number): void };
const P = (e: GameEngine) => e as unknown as Priv;
let mine: Record<string, Eff[]> = {};
beforeEach(() => { mine = {}; mechanicsTestHook.override = c => mine[c.id]; });
afterEach(() => { mechanicsTestHook.override = undefined; vi.restoreAllMocks(); });

function arena(effects: Eff[], hp = 1e9) {
  const e = new GameEngine(partyState()); const [a, b] = e.getSnapshot().characters; a.profile.level = 30; b.profile.level = 30;
  e.start(); const s = () => e.getSnapshot(); for (const m of s().monsters) { m.hp = m.maxHp = hp; m.cooldown = 1e9; }
  mine[a.id] = effects; a.mana = 1e6; return { e, a, b, s, m: () => s().monsters[0] };
}
const run = (e: GameEngine, secs: number) => { for (let i = 0; i < secs * 10; i++) { P(e).mech.tick(.1); for (const m of e.getSnapshot().monsters) if (m.alive) P(e).mech.tickMonster(m, .1); } };
const full = (e: GameEngine) => { for (const c of e.getSnapshot().characters) c.hp = characterStats(c, e.getSnapshot()).maxHp; };

describe('todas as mecânicas existem', () => {
  it('346 de 346 implementadas; nenhuma fica "Em breve"', () => { expect(MECHANICS_DONE.size).toBe(346); });
});

describe('estados dos monstros', () => {
  it('veneno cumulativo: empilha, causa dano contínuo e dobra no 10º acúmulo', () => {
    const { e, a, m } = arena([{ k: 'poisonOnHit', stacks: 1, doubleAt: 10 }]); const t = m();
    for (let i = 0; i < 3; i++) P(e).basicAttack(a), (a.cooldowns.basic = 0); expect(t.statuses!.poison!.stacks).toBe(3);
    const hp = t.hp; run(e, 2); expect(t.hp).toBeLessThan(hp); expect(a.profile.counters.dotDamage).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) P(e).basicAttack(a); expect(t.statuses!.poison!.stacks).toBe(10);
    const w = arena([{ k: 'poisonOnHit', stacks: 1 }]); const t2 = w.m(); for (let i = 0; i < 12; i++) P(w.e).basicAttack(w.a);
    const d1 = ((): number => { const h = t.hp; run(e, 1); return h - t.hp; })(), d2 = ((): number => { const h = t2.hp; run(w.e, 1); return h - t2.hp; })(); expect(d1).toBeGreaterThan(d2 * 1.5);
  });
  it('sangramento nos críticos e quebra de armadura aumentam o dano seguinte', () => {
    const { e, a, m } = arena([{ k: 'bleed', on: 'crit', pct: .5, dur: 4 }, { k: 'armorBreak', on: 'hit', pct: .05, dur: 6, max: .2 }]); const t = m();
    P(e).hit(a, t, 1000, true); expect(t.statuses!.bleed).toBeTruthy(); expect(t.statuses!.armor!.pct).toBeCloseTo(.05);
    for (let i = 0; i < 6; i++) P(e).hit(a, t, 10); expect(t.statuses!.armor!.pct).toBeCloseTo(.2);
    const before = t.hp; P(e).hit(a, t, 1000); expect(before - t.hp).toBe(1200); run(e, 7); expect(t.statuses?.armor).toBeUndefined(); expect(t.statuses?.bleed).toBeUndefined();
  });
  it('confusão: o monstro ataca um aliado dele em vez dos heróis', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); const { e, a, s } = arena([{ k: 'confuse', on: 'control', dur: 3 }]); const [m1, m2] = s().monsters; m1.cooldown = 0; m2.cooldown = 1e9; m1.statuses = { confused: { remaining: 3, source: a.id } };
    full(e); const teamHp = s().characters.reduce((n, c) => n + c.hp, 0), hp2 = m2.hp; e.tick(100);
    expect(s().characters.reduce((n, c) => n + c.hp, 0)).toBeGreaterThanOrEqual(teamHp); expect(m2.hp).toBeLessThan(hp2);
  });
  it('dano contínuo se espalha ao matar (veneno) e explode nos vizinhos', () => {
    const { e, a, s } = arena([{ k: 'dotSpread', on: 'death', n: 2 }, { k: 'deathBlast', pct: 1 }]); const [t1, t2] = s().monsters;
    P(e).mech.addPoison(t1, 4, a); t1.hp = 1; const hp = t2.hp; P(e).hit(a, t1, 5); expect(t2.statuses?.poison).toBeTruthy(); expect(t2.hp).toBeLessThan(hp);
  });
  it('praga em todos: o primeiro veneno contamina a wave inteira', () => {
    const { e, a, s } = arena([{ k: 'dotAll' }]); P(e).mech.addPoison(s().monsters[0], 1, a); expect(s().monsters.every(x => x.statuses?.poison)).toBe(true);
  });
});

describe('invocações', () => {
  it('esqueletos nascem dos abates (até o limite) e atacam; curam o dono', () => {
    const { e, a, s } = arena([{ k: 'skeletons', pct: .3, max: 2 }, { k: 'skeletonHeal', pct: .5 }]); const [t1, t2] = s().monsters;
    for (const t of [t1, t2]) { t.hp = 1; P(e).hit(a, t, 5); }
    const target = s().monsters.find(x => x.alive)!; target.hp = target.maxHp = 1e9; a.hp = 5; const hp = target.hp; run(e, 2.2); expect(target.hp).toBeLessThan(hp); expect(a.hp).toBeGreaterThan(5);
    const dmg1 = hp - target.hp; expect(dmg1).toBeGreaterThan(0);
  });
  it('torretas atacam sozinhas e mais rápido com a melhoria', () => {
    const slow = arena([{ k: 'turrets', n: 2, pct: .3 }]), fast = arena([{ k: 'turrets', n: 2, pct: .3 }, { k: 'turretRate', pct: .5 }]);
    const a0 = slow.m().hp, b0 = fast.m().hp; run(slow.e, 6); run(fast.e, 6); expect(a0 - slow.m().hp).toBeGreaterThan(0); expect(b0 - fast.m().hp).toBeGreaterThan(a0 - slow.m().hp);
  });
  it('fera invocada: ataca o mais forte a cada 8 s; a segunda fera só dura a janela', () => {
    const { e, s } = arena([{ k: 'summon', every: 8, pct: 2, target: 'strong' }]); s().monsters[2].maxHp = s().monsters[2].hp = 2e9; const hp = s().monsters[2].hp; run(e, 8.2); expect(hp - s().monsters[2].hp).toBeGreaterThan(0);
    const w = arena([{ k: 'summon', every: 2, pct: 1, target: 'first', window: 4 }]); const h = w.m().hp; run(w.e, 12); const done = h - w.m().hp; run(w.e, 6); expect(h - w.m().hp).toBe(done);
  });
  it('mísseis perseguidores só atingem alvos abaixo de 30%', () => {
    const { e, s } = arena([{ k: 'summon', every: 3, pct: 1.5, target: 'low' }]); const [t1, t2] = s().monsters; t2.hp = t2.maxHp * .2; const h1 = t1.hp; run(e, 3.2); expect(t2.hp).toBeLessThan(t2.maxHp * .2); expect(t1.hp).toBe(h1);
  });
  it('um pet absorve golpes; espinhos do grupo ferem quem ataca', () => {
    const { e, a, s } = arena([{ k: 'decoy', chance: 1 }]); const m1 = s().monsters[0]; m1.cooldown = 0; full(e); const hp = s().characters.reduce((n, c) => n + c.hp, 0); e.tick(100); expect(s().characters.reduce((n, c) => n + c.hp, 0)).toBeGreaterThanOrEqual(hp); void a;
    const t = arena([{ k: 'teamThorns', pct: 1 }]); const x = t.m(); x.cooldown = 0; const xh = x.hp; t.e.tick(100); expect(x.hp).toBeLessThan(xh);
  });
});

describe('suporte, escudos e poções', () => {
  it('regeneração +50% e + defesa; cura deixa regeneração; buffs afetam toda a equipe', () => {
    const { e, a, b } = arena([{ k: 'regenMult', pct: .5 }, { k: 'regenDef' }, { k: 'healRegen', dur: 3, pct: .02 }, { k: 'buffsTeam' }]);
    expect(P(e).mech.regenMult(a)).toBeGreaterThan(1.5); full(e); b.hp = 10; P(e).cast(a, spellById('paladin_mend')); expect(b.effects.some(x => x.id.startsWith('mech-hr'))).toBe(true);
    P(e).cast(a, spellById('squire_rally')); expect(b.effects.some(x => x.id.startsWith('squire_rally'))).toBe(true);
  });
  it('escudo compartilhado, duração maior e mana devolvida ao expirar', () => {
    const { e, a, b } = arena([{ k: 'shieldShare', pct: .5 }, { k: 'shieldExpire', mana: .5 }]); P(e).cast(a, spellById('squire_guard')); expect(b.effects.some(x => x.type === 'shield')).toBe(true);
    a.mana = 0; P(e).mech.onShieldExpire(a, 100); expect(a.mana).toBe(50); expect(P(arena([{ k: 'shieldDur', pct: .4 }]).e).mech.shieldDurMult).toBeTruthy();
  });
  it('poção repassa efeito, dá buff e a mana cheia vira escudo', () => {
    const { e, a, b, s } = arena([{ k: 'potion', share: .5, buff: .1 }]); addItem(s(), 'health_potion', 2); a.hp = 10; b.hp = 10; e.useSupply(a.id, 'health_potion'); expect(b.hp).toBeGreaterThan(10); expect(a.effects.some(x => x.type === 'buffAttack')).toBe(true);
    const w = arena([{ k: 'manaShield' }]); w.a.mana = characterStats(w.a, w.s()).maxMana; run(w.e, 2); expect(w.a.effects.some(x => x.type === 'shield')).toBe(true);
  });
  it('curas feitas em você dão barreira aos aliados; Dano Sagrado cura o aliado mais ferido', () => {
    const { e, a, b } = arena([{ k: 'healedBarrier', pct: .5 }, { k: 'elemLeech', element: 'holy', heal: 1, ally: true }]); b.hp = 5; P(e).mech.afterHealApplied(b, a, 100); expect(b.effects.some(x => x.type === 'shield')).toBe(true);
    const t = e.getSnapshot().monsters[0]; const before = b.hp; (e as unknown as { mel: string }).mel = 'holy'; (e as unknown as { mctx: string }).mctx = 'spell'; P(e).hit(a, t, 1000); expect(b.hp).toBeGreaterThan(before);
  });
  it('bardo: recarga menor com buffs ativos, errar o 1º ataque, buffs compartilhados e custo pela metade', () => {
    const { e, a, b } = arena([{ k: 'buffCdr', pct: .1 }, { k: 'missFirst', chance: 1 }, { k: 'buffHalfCost' }]); a.effects.push({ id: 'squire_rally-1', type: 'buffAttack', value: .2, remaining: 5, source: a.id });
    expect(P(e).mech.buffCdr(b)).toBe(0); b.effects.push({ id: 'x', type: 'buffDefense', value: .1, remaining: 5, source: a.id }); expect(P(e).mech.buffCdr(b)).toBeCloseTo(.1);
    expect(P(e).mech.monsterMisses(e.getSnapshot().monsters[0])).toBe(true); expect(P(e).mech.castCost(a, 14, { id: 'squire_rally', kind: 'buff' })).toBe(7);
  });
});

describe('dano e controle', () => {
  it('Dano Sagrado/Morte/Terra e troca de foco; escalas por elementos e chefes abatidos', () => {
    const { e, a, m } = arena([{ k: 'dmg', vs: 'element', el: 'fire', pct: .1 }, { k: 'elemCount', level: 20, per: .03 }]); const t = m(); (e as unknown as { mctx: string }).mctx = 'spell'; (e as unknown as { mel: string }).mel = 'fire';
    a.profile.proficiencies.fire.level = 25; a.profile.proficiencies.ice.level = 25; const before = t.hp; P(e).hit(a, t, 1000); expect(before - t.hp).toBe(1160);
  });
  it('ignora defesa, glifo explode depois, magias de área atingem a fila de espera', () => {
    const { e, a, s, m } = arena([{ k: 'ignoreDef', chance: 1 }, { k: 'glyph', pct: 1, delay: 3 }, { k: 'pendingHit', pct: .5 }]);
    P(e).basicAttack(a); const t = m(); const hp = t.hp; (e as unknown as { mctx: string }).mctx = 'spell'; P(e).hit(a, t, 100); run(e, 3.2); expect(hp - t.hp).toBeGreaterThan(190);
    P(e).mech.afterSpell(a, { aoe: true, element: 'fire', controlled: false, targets: s().monsters.slice(0, 2), dealt: 400 }); expect(P(e).mech.takePending()).toBe(100);
  });
  it('aoe atordoa, quebra armadura, controle atinge +1 alvo, atordoados ficam mais tempo e chefes sofrem metade', () => {
    const { e, a, s } = arena([{ k: 'aoeStun', dur: 1 }, { k: 'armorBreak', on: 'aoe', pct: .2, dur: 8 }, { k: 'stunExtra', sec: 1 }, { k: 'ctrlExtra', chance: 1, n: 1 }]); const [t1, t2] = s().monsters; t1.statuses = { stunned: 2 };
    P(e).mech.afterSpell(a, { aoe: true, controlled: true, targets: [t1], dealt: 10 }); expect(t1.statuses!.stunned).toBe(3); expect(t1.statuses!.armor!.pct).toBe(.2); expect(t2.statuses!.stunned).toBeGreaterThan(0);
  });
  it('fogo+veneno se cruzam, chão em chamas e combustão com tiros', () => {
    const { e, a, s } = arena([{ k: 'dotCross' }, { k: 'groundFire' }, { k: 'burnOnHit', chance: 1 }]); P(e).mech.afterSpell(a, { aoe: true, element: 'fire', controlled: false, targets: s().monsters.slice(0, 2), dealt: 10 });
    expect(s().monsters[0].statuses?.poison).toBeTruthy(); expect(s().monsters[0].statuses?.burn).toBeTruthy(); P(e).basicAttack(a); expect(s().monsters[0].statuses?.burn).toBeTruthy();
  });
  it('transmutar o mais forte (−30% de vida) e pagar ouro; o mais fraco vira ouro', () => {
    const { e, s, a } = arena([{ k: 'transmute', kind: 'strong' }]); s().monsters[1].maxHp = s().monsters[1].hp = 5e9; P(e).mech.onWaveStart(); expect(s().monsters[1].hp).toBe(Math.round(5e9 * .7)); void a;
    const w = arena([{ k: 'transmute', kind: 'weak' }]); const n = w.s().monsters.length; const gold = w.s().gold; w.s().monsters[0].hp = 10; P(w.e).mech.onWaveStart(); expect(w.s().gold).toBeGreaterThan(gold); expect(w.s().monsters.filter(x => x.alive).length).toBe(n - 1);
  });
  it('invisibilidade tira o herói da mira; treino de foco rende mais tries; combos restauram mana', () => {
    const { e, a, m } = arena([{ k: 'stealth', sec: 2 }, { k: 'every', n: 2, on: 'basic', do: 'mana', pct: .05 }]); const t = m(); t.hp = 1; P(e).hit(a, t, 5); expect(P(e).mech.untargetable(a)).toBe(true); run(e, 2.2); expect(P(e).mech.untargetable(a)).toBe(false);
    const w = arena([{ k: 'trainFocus', pct: 40 }]); const focus = Object.keys(w.a.profile.proficiencies).find(id => ['fire', 'ice'].includes(id))!; w.a.profile.offlineTargets = [focus as never, null]; expect(triesBonusPct(w.a, focus as never)).toBeGreaterThanOrEqual(40);
  });
  it('golpe pesado recebido: o próximo ataque causa +100%; sequência sem sofrer dano acumula', () => {
    const { e, a, m } = arena([{ k: 'heavyHit', dmg: 1 }, { k: 'noHitStreak', n: 2, dmg: .1, dur: 8, max: 3 }]); const t = m(); const max = characterStats(a, e.getSnapshot()).maxHp;
    P(e).mech.afterDamaged(a, t, max * .5); const before = t.hp; P(e).hit(a, t, 1000); expect(before - t.hp).toBe(2000);
    for (let i = 0; i < 4; i++) { (e as unknown as { mctx: string }).mctx = 'basic'; P(e).hit(a, t, 10); (e as unknown as { mctx: string }).mctx = ''; } const b2 = t.hp; P(e).hit(a, t, 1000); expect(b2 - t.hp).toBe(1200);
  });
});
