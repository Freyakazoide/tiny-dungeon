import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine, createCharacter, initialState } from './GameEngine';
import { partyState } from './testing';
import type { Character } from './types';
import { cloneValidatedState } from '../persistence/validation';
import { STARTER_ELEMENTS, STARTER_WEAPONS, type CharacterSpec } from '../data/starter';
import { MONSTERS, WAVES } from '../data/monsters';
import { aggroShares, pickMonsterTarget } from '../systems/combat';
import { equipBlockReason } from '../systems/equipment';
import { nextSteps, requirementRows, treeSplit, UNTRACKED_COUNTERS } from '../systems/guide';
import { CLASS_BY_ID } from '../rpg/classTree';
import { runtime } from '../rpg/runtime';
import { itemById } from '../data/items';
import { CHARACTER_TABS, TABS } from '../../ui/navigation';

afterEach(() => { runtime.trainScale = 1; runtime.xpScale = 1; runtime.monsterHp = 1; runtime.monsterAtk = 1; vi.restoreAllMocks(); });

/** RNG determinístico (mulberry32) para sorteios reproduzíveis. */
const seeded = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const fake = (id: string, row: 'front' | 'back', isTank = false, hp = 100) => ({ id, row, isTank, hp }) as Character;

describe('B — aggro dos monstros', () => {
  it('tanque, frente e trás recebem ~65% / 25% / 10% em 20 mil sorteios', () => {
    const team = [fake('tank', 'front', true), fake('front', 'front'), fake('back', 'back')], rnd = seeded(7), hits: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) { const t = pickMonsterTarget(team, rnd)!; hits[t.id] = (hits[t.id] ?? 0) + 1; }
    expect(hits.tank / 20000).toBeGreaterThan(.62); expect(hits.tank / 20000).toBeLessThan(.68);
    expect(hits.front / 20000).toBeGreaterThan(.22); expect(hits.front / 20000).toBeLessThan(.28);
    expect(hits.back / 20000).toBeGreaterThan(.07); expect(hits.back / 20000).toBeLessThan(.13);
  });
  it('sem ninguém na frente, todos os golpes vão para a linha de trás', () => {
    const team = [fake('a', 'back'), fake('b', 'back')], rnd = seeded(3);
    for (let i = 0; i < 500; i++) expect(['a', 'b']).toContain(pickMonsterTarget(team, rnd)!.id);
  });
  it('tanque morto: redistribui entre os demais sem erro; equipe toda morta devolve undefined', () => {
    const team = [fake('tank', 'front', true, 0), fake('front', 'front'), fake('back', 'back')], rnd = seeded(11), hits: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) { const t = pickMonsterTarget(team, rnd)!; hits[t.id] = (hits[t.id] ?? 0) + 1; }
    expect(hits.tank).toBeUndefined(); expect(hits.front / 5000).toBeGreaterThan(.68); expect(hits.front / 5000).toBeLessThan(.75);
    expect(pickMonsterTarget([fake('x', 'front', true, 0)])).toBeUndefined();
  });
  it('aggroShares estima os mesmos pesos e soma 100%', () => {
    const shares = aggroShares([fake('tank', 'front', true), fake('front', 'front'), fake('back', 'back')]);
    expect(shares.get('tank')).toBeCloseTo(.65); expect(shares.get('front')).toBeCloseTo(.25); expect(shares.get('back')).toBeCloseTo(.10);
    expect([...shares.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it('simulação de 60 s: o tanque leva pelo menos 55% do dano total', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(42));
    const state = partyState(); state.characters.forEach(c => { c.profile.level = 80; });
    const e = new GameEngine(state); e.start(); state.monsters.forEach(m => { m.hp = m.maxHp = 1e12; });
    for (let i = 0; i < 600; i++) e.tick(100);
    const taken = state.characters.map(c => c.profile.counters.damageTaken ?? 0), total = taken.reduce((a, b) => a + b, 0);
    expect(state.characters[0].isTank).toBe(true); expect(total).toBeGreaterThan(0);
    expect(taken[0] / total).toBeGreaterThanOrEqual(.55);
  });
});

describe('B — tanque, linha e penalidade', () => {
  it('marcar um segundo tanque desmarca o primeiro; só na frente', () => {
    const e = new GameEngine(partyState()); const [a, b, c] = e.getSnapshot().characters;
    expect(a.isTank).toBe(true); expect(e.setTank(c.id)).toBe(false); // Lyra está atrás
    e.setRow(b.id, 'front'); expect(e.setTank(b.id)).toBe(true);
    expect(e.getSnapshot().characters.filter(x => x.isTank).map(x => x.name)).toEqual(['Kael']);
    expect(e.setTank(b.id, false)).toBe(true); expect(e.getSnapshot().characters.some(x => x.isTank)).toBe(false);
  });
  it('mandar o tanque para trás remove a marca', () => {
    const e = new GameEngine(partyState()); const a = e.getSnapshot().characters[0];
    e.setRow(a.id, 'back'); expect(a.row).toBe('back'); expect(a.isTank).toBe(false); expect(e.setRow(a.id, 'meio' as never)).toBe(false);
  });
  it('arma corpo a corpo atrás causa 50% do dano; arco não tem redução', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const hitFor = (weapon: string, row: 'front' | 'back') => {
      const state = partyState(); const c = state.characters[0]; c.equipment.weapon = weapon; c.row = row;
      const e = new GameEngine(state); e.start(); const m = state.monsters[0]; m.hp = m.maxHp = 1e9;
      (e as unknown as { basicAttack(c: Character): void }).basicAttack(c); return 1e9 - m.hp;
    };
    const front = hitFor('rusty_sword', 'front'), back = hitFor('rusty_sword', 'back');
    expect(back).toBe(Math.round(front * .5)); expect(front).toBeGreaterThan(0);
    expect(hitFor('oak_bow', 'back')).toBe(hitFor('oak_bow', 'front'));
  });
  it('monstros e waves novos', () => {
    expect([MONSTERS.skeleton, MONSTERS.ghoul, MONSTERS.bone_king].map(m => [m.hp, m.attack, m.defense])).toEqual([[540, 11, 3], [975, 17, 5], [2700, 23, 8]]);
    expect(WAVES.map(w => w.monsters)).toEqual([['skeleton', 'skeleton', 'skeleton'], ['skeleton', 'skeleton', 'ghoul', 'ghoul'], ['bone_king', 'skeleton', 'skeleton']]);
  });
  it('monsterScale multiplica o HP dos monstros que nascem', () => {
    runtime.monsterHp = 2; const e = new GameEngine(partyState()); e.start();
    expect(e.getSnapshot().monsters[0].maxHp).toBe(1080);
  });
  it('saves antigos ganham linha e tanque na migração', () => {
    const state = partyState(); const legacy = structuredClone(state) as unknown as { characters: Record<string, unknown>[] };
    for (const c of legacy.characters) { delete c.row; delete c.isTank; }
    const restored = cloneValidatedState(legacy);
    expect(restored.characters.map(c => c.row)).toEqual(['front', 'back', 'front']); // cajado não treina ranged: frente
    expect(restored.characters.map(c => c.isTank)).toEqual([true, false, false]);
  });
});

describe('C — criação com kit inicial', () => {
  const spec = (name: string, weaponId: string, row: 'front' | 'back' | undefined, element: CharacterSpec['element']): CharacterSpec => ({ name, weaponId, row, element });
  it.each(STARTER_WEAPONS.map(w => w.id))('cria com %s: arma, escudo, magia no slot 1 e foco', weaponId => {
    for (const element of STARTER_ELEMENTS) {
      const e = new GameEngine();
      expect(e.createParty([spec('A', weaponId, undefined, element), spec('B', 'rusty_sword', 'back', 'fire'), spec('C', 'oak_bow', 'front', 'ice')])).toBe(true);
      const [a, b, c] = e.getSnapshot().characters;
      expect(a.equipment).toEqual({ weapon: weaponId, offhand: 'wooden_shield' });
      expect(a.spellSlots[0]).toBe(`basic_${element}`); expect(a.spellConditions[`basic_${element}`]).toBeDefined(); expect(a.profile.offlineTargets).toEqual([element, null]);
      expect(a.row).toBe(STARTER_WEAPONS.find(w => w.id === weaponId)!.row); // padrão pela arma
      expect(b.row).toBe('back'); expect(c.row).toBe('front'); // escolha explícita vence
      expect(e.getSnapshot().inventory.bp).toHaveLength(0);
      expect(a.spellSlots).toHaveLength(4);
    }
  });
  it('o primeiro personagem da frente vira tanque; sem ninguém na frente, não há tanque', () => {
    const e = new GameEngine();
    e.createParty([spec('A', 'oak_bow', undefined, 'fire'), spec('B', 'rusty_sword', undefined, 'ice'), spec('C', 'knuckle_wraps', undefined, 'holy')]);
    expect(e.getSnapshot().characters.map(c => c.isTank)).toEqual([false, true, false]);
    const back = new GameEngine();
    back.createParty([spec('A', 'oak_bow', 'back', 'fire'), spec('B', 'rusty_sword', 'back', 'ice'), spec('C', 'apprentice_staff', 'back', 'holy')]);
    expect(back.getSnapshot().characters.some(c => c.isTank)).toBe(false);
  });
  it('recusa nomes repetidos, arma/linha/elemento inválidos sem alterar o estado', () => {
    const e = new GameEngine(); const before = JSON.stringify(e.getSnapshot());
    const ok = [spec('A', 'oak_bow', 'back', 'fire'), spec('B', 'rusty_sword', 'front', 'ice'), spec('C', 'oak_bow', 'back', 'holy')];
    expect(e.createParty([ok[0], { ...ok[1], name: 'a' }, ok[2]])).toBe(false);
    expect(e.createParty([ok[0], { ...ok[1], weaponId: 'iron_sword' }, ok[2]])).toBe(false);
    expect(e.createParty([ok[0], { ...ok[1], weaponId: 'nao_existe' }, ok[2]])).toBe(false);
    expect(e.createParty([ok[0], { ...ok[1], row: 'meio' as never }, ok[2]])).toBe(false);
    expect(e.createParty([ok[0], { ...ok[1], element: 'melee' as never }, ok[2]])).toBe(false);
    expect(e.createParty([ok[0], { ...ok[1], element: undefined }, ok[2]])).toBe(false);
    expect(JSON.stringify(e.getSnapshot())).toBe(before);
    expect(e.createParty(ok)).toBe(true);
  });
  it('o grupo padrão de teste é Espada/Frente, Arco/Trás e Cajado/Trás', () => {
    expect(partyState().characters.map(c => [c.equipment.weapon, c.row])).toEqual([['rusty_sword', 'front'], ['oak_bow', 'back'], ['apprentice_staff', 'back']]);
  });
  it('initialState começa com mochila vazia e createCharacter cru continua funcionando', () => {
    expect(initialState().inventory.bp).toEqual([]);
    const c = createCharacter('squire', 'X'); expect(c.row).toBe('front'); expect(c.equipment.offhand).toBe('wooden_shield');
  });
});

describe('D — itens, loja e guia de classes', () => {
  it('vender todo o loot soma o valor certo e esvazia a bolsa', () => {
    const e = new GameEngine(partyState()); const s = e.getSnapshot(); s.inventory.loot = [{ itemId: 'bone', quantity: 4 }, { itemId: 'royal_bone', quantity: 2 }];
    const gold = s.gold; expect(e.sellAllLoot()).toBe(4 * itemById('bone')!.value + 2 * itemById('royal_bone')!.value);
    expect(e.getSnapshot().gold).toBe(gold + 4 * 3 + 2 * 55); expect(e.getSnapshot().inventory.loot).toEqual([]); expect(e.sellAllLoot()).toBe(0);
  });
  it('equipBlockReason explica nível, classe e itens que não são equipamento', () => {
    const c = createCharacter('squire', 'X');
    expect(equipBlockReason(c, itemById('iron_sword')!)).toMatch(/nível 3/);
    c.profile.level = 10; expect(equipBlockReason(c, itemById('arcane_staff')!)).toMatch(/Necromancer/);
    expect(equipBlockReason(c, itemById('bone')!)).toMatch(/equipamento/);
    expect(equipBlockReason(c, itemById('rusty_sword')!)).toBeUndefined();
  });
  it('a navegação tem 6 abas; Magias e Talentos só existem dentro de Personagem', () => {
    expect([...TABS]).toEqual(['Caçada', 'Grupo', 'Personagem', 'Itens', 'Classes', 'Sistema']);
    expect((TABS as readonly string[]).includes('Magias') || (TABS as readonly string[]).includes('Talentos')).toBe(false);
    expect([...CHARACTER_TABS]).toEqual(['Ficha', 'Proficiências', 'Magias', 'Talentos']);
  });
  it('o Squire vê as 15 classes base ordenadas pela proficiência, com checklist e ETA', () => {
    const c = new GameEngine(partyState()).getSnapshot().characters[0]; const steps = nextSteps(c);
    expect(steps).toHaveLength(15); expect(steps.every(s => !s.ready && s.rows.length >= 2 && s.rows[0].key === 'level')).toBe(true);
    const guerreiro = steps.find(s => s.node.id === 'guerreiro')!;
    const melee = guerreiro.rows.find(r => r.key === 'melee')!;
    expect(melee).toMatchObject({ have: 10, need: 25, met: false, training: false, eta: null }); // sem foco de tempo ainda: parado
    c.profile.trainingFocus = 'melee';
    const trained = requirementRows(c, CLASS_BY_ID.guerreiro).find(r => r.key === 'melee')!;
    expect(trained.training).toBe(true); expect(trained.eta! / 3600).toBeGreaterThan(7.9); expect(trained.eta! / 3600).toBeLessThan(8.1);
    const order = steps.map(s => Object.keys(s.node.requires.skills ?? {})[0]);
    expect(order.indexOf('melee')).toBeLessThan(order.indexOf('magic'));
  });
  it('depois de virar Ladino só as 2 subclasses aparecem e as outras 14 classes base são descartadas', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    expect(e.evolve(c.id, 'ladino', { force: true })).toBe(true);
    expect(nextSteps(c).map(s => s.node.id).sort()).toEqual(['assassino', 'mestre_das_sombras']);
    const { active, discarded } = treeSplit(c);
    expect(active.map(n => n.id)).toEqual(['ladino']); expect(discarded).toHaveLength(14); expect(discarded.some(n => n.id === 'ladino')).toBe(false);
  });
  it('todos os contadores são alimentados pelo combate: nenhum requisito fica em "em breve" nem mostra progresso falso', () => {
    expect([...UNTRACKED_COUNTERS]).toEqual([]);
    const c = createCharacter('squire', 'X'); c.profile.counters.dotDamage = 1234; c.profile.counters.controlSpells = 77;
    const dot = requirementRows(c, CLASS_BY_ID.epidemiologista).find(r => r.key === 'dotDamage')!;
    const control = requirementRows(c, CLASS_BY_ID.hipnotizador).find(r => r.key === 'controlSpells')!;
    expect(dot).toMatchObject({ untracked: false, have: 1234, met: false }); expect(control).toMatchObject({ untracked: false, have: 77, met: false });
    const crits = requirementRows(c, CLASS_BY_ID.gladiador).find(r => r.key === 'crits')!;
    expect(crits.untracked).toBe(false); expect(crits.have).toBe(0);
  });
});
