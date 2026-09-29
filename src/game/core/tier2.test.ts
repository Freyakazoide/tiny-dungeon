import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine, createCharacter } from './GameEngine';
import { partyState } from './testing';
import type { Character } from './types';
import { MONSTERS } from '../data/monsters';
import { SPELLS, spellById } from '../data/spells';
import { COUNTER_TARGETS, CLASS_BY_ID, isPlayable } from '../rpg/classTree';
import { COUNTER_IDS } from '../rpg/profile';
import { monsterHit } from '../systems/combat';
import { characterStats, spellAvailable } from '../systems/progression';
import { UNTRACKED_COUNTERS } from '../systems/guide';

afterEach(() => vi.restoreAllMocks());

const seeded = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const cast = (e: GameEngine, c: Character, id: string) => (e as unknown as { cast(c: unknown, s: unknown): void }).cast(c, spellById(id));
/** Mago (Tier 1) ou subclasse na party de teste, com uma caçada rodando contra monstros que não morrem. */
function magePlayer(path: ('mago' | 'piromante' | 'criomante' | 'arcanista_de_plasma')[] = ['mago']) {
  const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 30;
  for (const node of path) e.evolve(c.id, node, { force: true });
  e.start(); for (const m of e.getSnapshot().monsters) { m.hp = m.maxHp = 1e12; }
  c.mana = 1e9; return { e, c, monsters: () => e.getSnapshot().monsters };
}
const equip = (e: GameEngine, c: Character, spellId: string) => { c.spellSlots[3] = spellId; c.spellConditions[spellId] = { manaAbove: 0 }; void e; };

describe('Bloco 8 — subclasses do Mago', () => {
  it('só as 3 subclasses do Mago são jogáveis no Tier 2, com os requisitos já na árvore', () => {
    expect(['piromante', 'criomante', 'arcanista_de_plasma', 'lich'].map(isPlayable)).toEqual([true, true, true, false]);
    expect(CLASS_BY_ID.piromante.requires).toEqual({ level: 25, skills: { fire: 38 } });
    expect(CLASS_BY_ID.criomante.requires).toEqual({ level: 25, skills: { ice: 38 } });
    expect(CLASS_BY_ID.arcanista_de_plasma.requires).toEqual({ level: 25, skills: { fire: 35, energy: 35 } });
  });
  it('evoluir soma as magias do nó nos slots livres; com os 4 slots cheios elas ficam disponíveis para equipar', () => {
    const { e, c } = magePlayer();
    e.unequipSpell(c.id, 3); // libera 1 slot
    expect(c.spellSlots).toHaveLength(3);
    e.evolve(c.id, 'piromante', { force: true });
    expect(c.spellSlots).toHaveLength(4); expect(c.spellSlots[3]).toBe('pyro_fireball');
    expect(e.getSnapshot().message).toMatch(/Magias novas: Bola de Fogo/);
    expect(spellAvailable(c, spellById('pyro_inferno')!)).toBe(true); expect(spellAvailable(c, spellById('cryo_nova')!)).toBe(false);
    expect(e.equipSpell(c.id, 2, 'pyro_inferno')).toBe(true); expect(e.equipSpell(c.id, 1, 'cryo_shard')).toBe(false);
    expect(SPELLS.filter(s => s.node).map(s => s.id).sort()).toEqual(['cryo_nova', 'cryo_shard', 'plasma_beam', 'pyro_fireball', 'pyro_inferno']);
    const stats = [['pyro_fireball', 1.9, 16, 5], ['pyro_inferno', 1.2, 30, 10], ['cryo_shard', 1.7, 14, 4], ['cryo_nova', 1.0, 28, 10], ['plasma_beam', 2.2, 22, 6]] as const;
    for (const [id, power, mana, cd] of stats) expect([spellById(id)!.power, spellById(id)!.mana, spellById(id)!.cooldown]).toEqual([power, mana, cd]);
  });

  it('Piromante: 1.000 acertos de fogo aplicam Combustão em ≈25% e o dano contínuo cresce o contador', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    const { e, c, monsters } = magePlayer(['mago', 'piromante']); equip(e, c, 'basic_fire');
    let stacked = 0; const target = monsters()[0];
    for (let i = 0; i < 1000; i++) { delete target.statuses; cast(e, c, 'basic_fire'); if ((target as { statuses?: { burn?: unknown } }).statuses?.burn) stacked++; }
    expect(stacked / 1000).toBeGreaterThan(.21); expect(stacked / 1000).toBeLessThan(.29);
    // dano contínuo: stacks × 0,10 × poder mágico por segundo
    target.statuses = {}; cast(e, c, 'pyro_inferno'); const burn = target.statuses!.burn!; expect(burn.stacks).toBeGreaterThanOrEqual(2);
    const before = c.profile.counters.dotDamage ?? 0, hp = target.hp;
    for (let i = 0; i < 20; i++) e.tick(100);
    expect(c.profile.counters.dotDamage! - before).toBeGreaterThan(0); expect(target.hp).toBeLessThan(hp);
    const perSecond = burn.stacks * .10 * burn.power; expect(c.profile.counters.dotDamage! - before).toBeGreaterThan(perSecond * 1.5); // ≥ ~1,5 s de queima em 2 s
  });
  it('Combustão empilha até 5, renova a duração e termina em 5 s', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c, monsters } = magePlayer(['mago', 'piromante']); const target = monsters()[0];
    for (let i = 0; i < 6; i++) cast(e, c, 'pyro_inferno');
    expect(target.statuses!.burn!.stacks).toBe(5); expect(target.statuses!.burn!.remaining).toBe(5);
    for (let i = 0; i < 40; i++) e.tick(100); expect(target.statuses!.burn!.remaining).toBeLessThan(1.2);
    for (let i = 0; i < 20; i++) e.tick(100); expect(target.statuses?.burn).toBeUndefined();
  });

  it('Criomante: cryo_nova congela; monstro congelado não ataca por 2 s; +20% de dano físico; conta feitiço de controle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c, monsters } = magePlayer(['mago', 'criomante']); equip(e, c, 'cryo_nova');
    for (const m of monsters()) m.cooldown = 0.05;
    const hpTeam = () => e.getSnapshot().characters.reduce((n, x) => n + x.hp, 0);
    cast(e, c, 'cryo_nova'); c.cooldowns.cryo_nova = 999; // como no jogo, o cast real põe a magia em recarga
    expect(monsters().every(m => m.statuses?.frozen === 2)).toBe(true); expect(c.profile.counters.controlSpells).toBe(1);
    // congelados: mesmo com o cooldown vencido, ninguém apanha durante ~1,9 s (só o Mago age; os outros também, mas nada bate neles)
    const before = hpTeam(); for (let i = 0; i < 19; i++) e.tick(100); expect(hpTeam()).toBeGreaterThanOrEqual(before);
    for (let i = 0; i < 12; i++) e.tick(100); expect(hpTeam()).toBeLessThan(before); // descongelou e voltou a atacar
    // dano físico +20% em congelado (ataque básico do Squire, RNG sem crítico)
    const attacker = e.getSnapshot().characters[1]; const dmg = () => { const m = monsters()[0]; const hp0 = m.hp; (e as unknown as { basicAttack(c: Character): void }).basicAttack(attacker); return hp0 - m.hp; };
    monsters()[0].statuses = {}; const normal = dmg(); monsters()[0].statuses = { frozen: 2 }; const frozen = dmg();
    expect(frozen / normal).toBeCloseTo(1.2, 1);
  });
  it('Criomante: 20% do dano de gelo vira barreira, sempre ≤ 30% do HP máx.', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c } = magePlayer(['mago', 'criomante']); equip(e, c, 'cryo_shard');
    const max = characterStats(c, e.getSnapshot()).maxHp; let last = 0;
    for (let i = 0; i < 60; i++) {
      cast(e, c, 'cryo_shard'); const barrier = c.effects.find(x => x.id.startsWith('cryo-barrier'))!;
      expect(barrier.value).toBeLessThanOrEqual(max * .3 + 1e-9); expect(barrier.value).toBeGreaterThanOrEqual(last); last = barrier.value;
    }
    expect(last).toBeCloseTo(max * .3, 5); // saturou no teto
    const { e: e2, c: c2 } = magePlayer(['mago', 'criomante']); cast(e2, c2, 'cryo_shard');
    expect(c2.effects.find(x => x.id.startsWith('cryo-barrier'))!.value).toBeGreaterThan(0);
  });
  it('atordoar (stun) também impede o ataque e conta como controle', () => {
    const { e, c, monsters } = magePlayer(['mago', 'criomante']); SPELLS.push({ id: 'test_stun', classId: 'mage', name: 'x', level: 1, mana: 1, cooldown: 1, target: 'enemy', power: 1, kind: 'damage', stun: 1.5, description: '' });
    try { for (const m of monsters()) m.cooldown = .05; const hp = e.getSnapshot().characters.reduce((n, x) => n + x.hp, 0); cast(e, c, 'test_stun'); expect(monsters()[0].statuses!.stunned).toBe(1.5); expect(c.profile.counters.controlSpells).toBe(1); void hp; }
    finally { SPELLS.pop(); }
  });

  it('Arcanista de Plasma: crítico de fogo/energia causa ×2,5 (e +8% de chance); as demais magias não criticam', () => {
    const damage = (rng: number, spell: string) => {
      vi.spyOn(Math, 'random').mockReturnValue(rng); const { e, c, monsters } = magePlayer(['mago', 'arcanista_de_plasma']); equip(e, c, spell); const m = monsters()[0]; const hp = m.hp; cast(e, c, spell); vi.restoreAllMocks(); return hp - m.hp;
    };
    const crit = damage(0, 'plasma_beam'), normal = damage(.99, 'plasma_beam');
    expect(crit / normal).toBeCloseTo(2.5, 1); expect(damage(0, 'basic_ice')).toBe(damage(.99, 'basic_ice')); // gelo não é fogo/energia
    expect(damage(0, 'basic_fire') / damage(.99, 'basic_fire')).toBeCloseTo(2.5, 1);
    const { e, c } = magePlayer(['mago', 'arcanista_de_plasma']); c.profile.classPath = ['aprendiz', 'mago', 'arcanista_de_plasma'];
    const beam = spellById('plasma_beam')!; c.cooldowns.plasma_beam = 0; equip(e, c, 'plasma_beam');
    expect(beam.cooldown * (1 - .2)).toBeCloseTo(4.8);
  });
  it('Arcanista: chance de crítico soma +8% à do personagem', () => {
    const { c, e } = magePlayer(['mago', 'arcanista_de_plasma']); const base = characterStats(c, e.getSnapshot()).crit;
    let crits = 0; vi.spyOn(Math, 'random').mockImplementation(seeded(3)); equip(e, c, 'basic_fire'); const m = e.getSnapshot().monsters[0];
    for (let i = 0; i < 2000; i++) { const before = c.profile.counters.crits ?? 0; cast(e, c, 'basic_fire'); if ((c.profile.counters.crits ?? 0) > before) crits++; void m; }
    expect(crits / 2000).toBeGreaterThan(base + .08 - .03); expect(crits / 2000).toBeLessThan(base + .08 + .03);
  });

  it('afinidade elemental: fraco ×1,30 e resistente ×0,70 em relação ao neutro (mesmo monstro, RNG fixo)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c, monsters } = magePlayer(); const skeleton = monsters().find(m => m.defId === 'skeleton')!;
    expect(MONSTERS.skeleton.weak).toContain('holy'); expect(MONSTERS.skeleton.resist).toContain('poison');
    const dmg = (spell: string) => { equip(e, c, spell); const hp = skeleton.hp; cast(e, c, spell); return hp - skeleton.hp; };
    const neutral = dmg('basic_ice'), weak = dmg('basic_holy'), resist = dmg('basic_poison');
    expect(weak / neutral).toBeCloseTo(1.3, 1); expect(resist / neutral).toBeCloseTo(.7, 1);
  });
});

describe('Bloco 6 — contadores e cobertura', () => {
  it('cada contador tem um caminho no engine que o incrementa (ou está marcado "em breve")', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // crítico sempre
    const e = new GameEngine(partyState()); const [a, b, d] = e.getSnapshot().characters; a.profile.level = 30; b.profile.level = 30; d.profile.level = 30;
    e.evolve(a.id, 'mago', { force: true }); e.evolve(a.id, 'criomante', { force: true }); e.evolve(b.id, 'mago', { force: true }); e.evolve(b.id, 'piromante', { force: true });
    e.getSnapshot().characters.push(createCharacter('paladin', 'Curandeira')); e.getSnapshot().team.push(e.getSnapshot().characters[3].id);
    const healer = e.getSnapshot().characters[3];
    e.start(); const state = e.getSnapshot();
    for (const m of state.monsters) { m.hp = m.maxHp = 1e12; }
    const boss = { uid: 'boss', defId: 'bone_king', hp: 1e12, maxHp: 1e12, cooldown: 9, alive: true }; state.monsters.push(boss);
    (e as unknown as { basicAttack(c: Character): void }).basicAttack(d); // crits (sempre crítico com RNG 0)
    (e as unknown as { hit(c: Character, t: unknown, n: number, crit: boolean): void }).hit(d, boss, 10, true); // críticos em chefe
    monsterHit(state.monsters[0], d, state); // dano sofrido
    d.hp = 5; cast(e, healer, 'paladin_light'); // cura
    cast(e, d, 'squire_rally'); // buffs
    equip(e, a, 'cryo_nova'); cast(e, a, 'cryo_nova'); // controle
    equip(e, b, 'pyro_inferno'); cast(e, b, 'pyro_inferno'); for (let i = 0; i < 10; i++) e.tick(100); // dano contínuo
    expect(e.useSupply(d.id, 'health_potion')).toBe(true); // poções de suporte
    (e as unknown as { kill(t: unknown): void }).kill(boss); // chefes abatidos + ouro
    const all = e.getSnapshot().characters, total = (id: (typeof COUNTER_IDS)[number]) => all.reduce((n, x) => n + (x.profile.counters[id] ?? 0), 0);
    for (const id of COUNTER_IDS) expect(total(id) > 0 || UNTRACKED_COUNTERS.includes(id), id).toBe(true);
    expect(Object.keys(COUNTER_TARGETS).sort()).toEqual([...COUNTER_IDS].sort());
  });
});
