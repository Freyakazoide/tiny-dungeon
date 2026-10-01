import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine, createCharacter } from './GameEngine';
import { partyState } from './testing';
import type { Character } from './types';
import { MONSTERS } from '../data/monsters';
import { SPELLS, spellById } from '../data/spells';
import { COUNTER_TARGETS, CLASS_BY_ID, childrenOf, isPlayable } from '../rpg/classTree';
import { COUNTER_IDS } from '../rpg/profile';
import { monsterHit } from '../systems/combat';
import { characterStats, spellAvailable } from '../systems/progression';
import { UNTRACKED_COUNTERS } from '../systems/guide';

afterEach(() => vi.restoreAllMocks());

const childrenOfIds = (id: string) => childrenOf(id).map(n => n.id);
const seeded = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const cast = (e: GameEngine, c: Character, id: string) => (e as unknown as { cast(c: unknown, s: unknown): void }).cast(c, spellById(id));
/** Mago (Tier 1) ou especialização na party de teste, com uma caçada rodando contra monstros que não morrem. */
function magePlayer(path: ('mago' | 'elementalista' | 'prismatico' | 'evocador')[] = ['mago']) {
  const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 30;
  for (const node of path) e.evolve(c.id, node, { force: true });
  e.start(); for (const m of e.getSnapshot().monsters) { m.hp = m.maxHp = 1e12; }
  c.mana = 1e9; return { e, c, monsters: () => e.getSnapshot().monsters };
}
const equip = (e: GameEngine, c: Character, spellId: string) => { c.spellSlots[3] = spellId; c.spellConditions[spellId] = { manaAbove: 0 }; void e; };
/** Magia de teste com efeito de estado (Combustão, congelamento…): as especializações novas não carregam esses campos. */
const withSpell = <T,>(spell: Partial<(typeof SPELLS)[number]> & { id: string }, run: () => T): T => {
  SPELLS.push({ classId: 'mage', name: 'x', level: 1, mana: 1, cooldown: 1, target: 'enemy', power: 1, kind: 'damage', description: '', ...spell } as (typeof SPELLS)[number]);
  try { return run(); } finally { SPELLS.pop(); }
};

describe('Bloco 8 — especializações do Mago (por estilo, o elemento é livre)', () => {
  it('as 6 especializações do Mago são jogáveis; as híbridas pedem elementos livres, não um elemento fixo', () => {
    const ids = ['evocador', 'destruidor', 'ritualista', 'elementalista', 'prismatico', 'polimata'];
    expect(ids.map(isPlayable)).toEqual([true, true, true, true, true, true]);
    expect(CLASS_BY_ID.evocador.requires).toEqual({ level: 25, skills: { magic: 38 } });
    expect(CLASS_BY_ID.destruidor.requires).toEqual({ level: 25, skills: { magic: 38 }, counters: { bossCrits: COUNTER_TARGETS.bossCrits } });
    expect(CLASS_BY_ID.elementalista.requires).toEqual({ level: 25, elements: { count: 2, level: 35 } });
    expect(CLASS_BY_ID.prismatico.requires).toEqual({ level: 25, elements: { count: 3, level: 30 } });
    expect(CLASS_BY_ID.polimata.requires).toEqual({ level: 25, elements: { count: 5, level: 25 } });
    expect(childrenOfIds('mago').sort()).toEqual([...ids].sort());
  });
  it('requisito de elementos: conta qualquer combinação (2 elementos a 35 abrem o Elementalista)', () => {
    const { e, c } = magePlayer(); c.profile.level = 25; e.evolve(c.id, 'mago', { force: true });
    c.profile.proficiencies.fire.level = 35; expect(e.evolve(c.id, 'elementalista')).toBe(false);
    c.profile.proficiencies.ice.level = 35; expect(e.evolve(c.id, 'elementalista')).toBe(true); expect(c.profile.classId).toBe('elementalista');
    const other = magePlayer(); other.c.profile.level = 25; other.c.profile.proficiencies.holy.level = 35; other.c.profile.proficiencies.psychic.level = 35;
    expect(other.e.evolve(other.c.id, 'elementalista')).toBe(true);
  });
  it('evoluir soma a magia do nó no slot livre; com os 4 slots cheios ela fica disponível para equipar', () => {
    const { e, c } = magePlayer();
    e.unequipSpell(c.id, 3); expect(c.spellSlots).toHaveLength(3);
    e.evolve(c.id, 'evocador', { force: true });
    expect(c.spellSlots).toHaveLength(4); expect(c.spellSlots[3]).toBe('evocador_spell'); expect(e.getSnapshot().message).toMatch(/Magias novas: Raio Concentrado/);
    expect(spellAvailable(c, spellById('evocador_spell')!)).toBe(true); expect(spellAvailable(c, spellById('destruidor_spell')!)).toBe(false);
    expect(SPELLS.filter(s => s.node).length).toBe(90);
  });

  it('Elementalista: 1.000 acertos de fogo aplicam Combustão em ≈15% e o dano contínuo cresce o contador', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    const { e, c, monsters } = magePlayer(['mago', 'elementalista']); equip(e, c, 'basic_fire');
    let stacked = 0; const target = monsters()[0];
    for (let i = 0; i < 1000; i++) { delete target.statuses; cast(e, c, 'basic_fire'); if ((target as { statuses?: { burn?: unknown } }).statuses?.burn) stacked++; }
    expect(stacked / 1000).toBeGreaterThan(.11); expect(stacked / 1000).toBeLessThan(.19);
    withSpell({ id: 'test_burn', element: 'fire', burnStacks: 2, target: 'allEnemies' }, () => {
      target.statuses = {}; cast(e, c, 'test_burn'); const burn = target.statuses!.burn!; expect(burn.stacks).toBeGreaterThanOrEqual(2);
      const before = c.profile.counters.dotDamage ?? 0, hp = target.hp;
      for (let i = 0; i < 20; i++) e.tick(100);
      expect(c.profile.counters.dotDamage! - before).toBeGreaterThan(0); expect(target.hp).toBeLessThan(hp);
    });
  });
  it('Combustão empilha até 5, renova a duração e termina em 5 s', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c, monsters } = magePlayer(['mago', 'elementalista']); const target = monsters()[0];
    withSpell({ id: 'test_burn', element: 'fire', burnStacks: 2, target: 'allEnemies' }, () => { for (let i = 0; i < 6; i++) cast(e, c, 'test_burn'); });
    expect(target.statuses!.burn!.stacks).toBe(5); expect(target.statuses!.burn!.remaining).toBe(5);
    for (let i = 0; i < 40; i++) e.tick(100); expect(target.statuses!.burn!.remaining).toBeLessThan(1.2);
    for (let i = 0; i < 20; i++) e.tick(100); expect(target.statuses?.burn).toBeUndefined();
  });
  it('congelamento: monstro congelado não ataca por 2 s; +20% de dano físico; conta feitiço de controle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c, monsters } = magePlayer(['mago', 'elementalista']);
    for (const m of monsters()) m.cooldown = 0.05;
    const hpTeam = () => e.getSnapshot().characters.reduce((n, x) => n + x.hp, 0);
    withSpell({ id: 'test_freeze', element: 'ice', freeze: 2, target: 'allEnemies' }, () => cast(e, c, 'test_freeze'));
    expect(monsters().every(m => m.statuses?.frozen === 2)).toBe(true); expect(c.profile.counters.controlSpells).toBe(1);
    const before = hpTeam(); for (let i = 0; i < 19; i++) e.tick(100); expect(hpTeam()).toBeGreaterThanOrEqual(before);
    for (let i = 0; i < 12; i++) e.tick(100); expect(hpTeam()).toBeLessThan(before);
    const attacker = e.getSnapshot().characters[1]; const dmg = () => { const m = monsters()[0]; const hp0 = m.hp; (e as unknown as { basicAttack(c: Character): void }).basicAttack(attacker); return hp0 - m.hp; };
    monsters()[0].statuses = {}; const normal = dmg(); monsters()[0].statuses = { frozen: 2 }; const frozen = dmg();
    expect(frozen / normal).toBeCloseTo(1.2, 1);
  });
  it('Elementalista: 10% do dano de gelo vira barreira, sempre ≤ 30% do HP máx.', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const { e, c } = magePlayer(['mago', 'elementalista']); equip(e, c, 'basic_ice');
    const max = characterStats(c, e.getSnapshot()).maxHp;
    cast(e, c, 'basic_ice'); const first = c.effects.find(x => x.id.startsWith('cryo-barrier'))!; expect(first.value).toBeGreaterThan(0); expect(first.value).toBeLessThanOrEqual(max * .3 + 1e-9);
    let last = first.value; for (let i = 0; i < 400; i++) { cast(e, c, 'basic_ice'); const b = c.effects.find(x => x.id.startsWith('cryo-barrier'))!; expect(b.value).toBeLessThanOrEqual(max * .3 + 1e-9); expect(b.value).toBeGreaterThanOrEqual(last); last = b.value; }
  });
  it('atordoar (stun) também impede o ataque e conta como controle', () => {
    const { e, c, monsters } = magePlayer(['mago', 'elementalista']);
    withSpell({ id: 'test_stun', stun: 1.5 }, () => { for (const m of monsters()) m.cooldown = .05; cast(e, c, 'test_stun'); expect(monsters()[0].statuses!.stunned).toBe(1.5); expect(c.profile.counters.controlSpells).toBe(1); });
  });
  it('as magias de atordoar das especializações (Selador, Ilusionista…) estão marcadas com stun', () => {
    for (const id of ['selador_spell', 'hipnotizador_spell', 'rastreador_spell', 'menestrel_do_caos_spell']) expect(spellById(id)!.stun, id).toBeGreaterThan(0);
  });
  it('Prismático: +8% de crítico em magias de fogo e energia (e só nelas)', () => {
    const rate = (spell: string) => { let crits = 0; vi.spyOn(Math, 'random').mockImplementation(seeded(3)); const { e, c } = magePlayer(['mago', 'prismatico']); equip(e, c, spell);
      for (let i = 0; i < 2000; i++) { const before = c.profile.counters.crits ?? 0; cast(e, c, spell); if ((c.profile.counters.crits ?? 0) > before) crits++; } vi.restoreAllMocks(); return crits / 2000; };
    const fire = rate('basic_fire'), ice = rate('basic_ice'); expect(fire - ice).toBeGreaterThan(.04); expect(fire - ice).toBeLessThan(.16);
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
    e.evolve(a.id, 'mago', { force: true }); e.evolve(a.id, 'elementalista', { force: true }); e.evolve(b.id, 'mago', { force: true }); e.evolve(b.id, 'elementalista', { force: true });
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
    withSpell({ id: 'test_freeze', element: 'ice', freeze: 2, target: 'allEnemies' }, () => cast(e, a, 'test_freeze')); // controle
    withSpell({ id: 'test_burn', element: 'fire', burnStacks: 2, target: 'allEnemies' }, () => cast(e, b, 'test_burn')); for (let i = 0; i < 10; i++) e.tick(100); // dano contínuo
    expect(e.useSupply(d.id, 'health_potion')).toBe(true); // poções de suporte
    (e as unknown as { kill(t: unknown): void }).kill(boss); // chefes abatidos + ouro
    const all = e.getSnapshot().characters, total = (id: (typeof COUNTER_IDS)[number]) => all.reduce((n, x) => n + (x.profile.counters[id] ?? 0), 0);
    for (const id of COUNTER_IDS) expect(total(id) > 0 || UNTRACKED_COUNTERS.includes(id), id).toBe(true);
    expect(Object.keys(COUNTER_TARGETS).sort()).toEqual([...COUNTER_IDS].sort());
  });
});
