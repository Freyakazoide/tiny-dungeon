import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine, createCharacter } from './GameEngine';
import { partyState } from './testing';
import type { Character } from './types';
import { CLASSES, kitOfNode, kitsOfPath } from '../data/classes';
import { SPELLS, spellById } from '../data/spells';
import { MONSTERS } from '../data/monsters';
import { CLASS_NODES, isPlayable } from '../rpg/classTree';
import { NODE_PASSIVES, passiveBonus } from '../rpg/passives';
import { exportBackup, importBackup } from '../persistence/backup';
import { characterStats, talentBonus } from '../systems/progression';
import { equipBlockReason } from '../systems/equipment';

afterEach(() => vi.restoreAllMocks());
const fresh = () => { const e = new GameEngine(partyState()); const [a, b, c] = e.getSnapshot().characters; return { e, a, b, c }; };
const cast = (e: GameEngine, c: Character, id: string) => (e as unknown as { cast(c: unknown, s: unknown): void }).cast(c, spellById(id));

describe('Bloco 5 — kits de Tier 1', () => {
  it('evoluir para Guerreiro troca o kit para knight, mantém talentos do Squire e recalcula atributos', () => {
    const { e, a } = fresh(); a.profile.level = 10; a.profile.proficiencies.melee.level = 25; a.talentPoints = 2; a.talents.squire_talent_0 = 1;
    const before = characterStats(a, e.getSnapshot());
    expect(e.evolve(a.id, 'guerreiro')).toBe(true);
    expect(a.classId).toBe('knight'); expect(a.profile.classId).toBe('guerreiro'); expect(a.talents.squire_talent_0).toBe(1);
    const after = characterStats(a, e.getSnapshot());
    expect(after.maxHp).not.toBe(before.maxHp); expect(a.hp).toBeLessThanOrEqual(after.maxHp); expect(a.mana).toBeLessThanOrEqual(after.maxMana);
    expect(e.getSnapshot().message).toMatch(/evoluiu para Guerreiro/);
  });
  it('atributos base dos kits batem com a tabela do plano', () => {
    expect(CLASSES.knight.base).toMatchObject({ maxHp: 260, maxMana: 45, attack: 21, defense: 18, attackSpeed: .85, crit: .06, resistance: .12, magicPower: 2 });
    expect(CLASSES.hunter.base).toMatchObject({ maxHp: 190, maxMana: 85, attack: 23, defense: 9, attackSpeed: 1.05, crit: .17, resistance: .07, magicPower: 5 });
    expect(CLASSES.hunter.growth).toMatchObject({ maxHp: 18, attack: 3.2, crit: .003 });
    expect(CLASSES.mage.base).toMatchObject({ maxHp: 170, maxMana: 200, attack: 10, defense: 7, attackSpeed: .85, crit: .07, resistance: .06, magicPower: 24 });
    expect(CLASSES.mage.growth).toMatchObject({ maxHp: 14, maxMana: 22, magicPower: 3.8 });
    expect([CLASSES.knight.weaponSkill, CLASSES.hunter.weaponSkill, CLASSES.mage.weaponSkill]).toEqual(['melee', 'ranged', 'magic']);
  });
  it('só Guerreiro, Caçador e Mago são jogáveis: as outras 12 classes base ficam "Em breve"', () => {
    const tier1 = CLASS_NODES.filter(n => n.tier === 1);
    expect(tier1.filter(n => isPlayable(n.id)).map(n => n.id).sort()).toEqual(['cacador', 'guerreiro', 'mago']);
    expect(tier1.filter(n => !isPlayable(n.id))).toHaveLength(12);
  });
  it('classe sem kit: evolve falha com "Em breve"; com force funciona', () => {
    const { e, a } = fresh(); a.profile.level = 10; a.profile.proficiencies.magic.level = 25;
    expect(e.evolve(a.id, 'bardo')).toBe(false); expect(e.getSnapshot().message).toMatch(/em breve/i); expect(a.profile.classId).toBe('aprendiz');
    expect(e.evolve(a.id, 'bardo', { force: true })).toBe(true); expect(a.profile.classId).toBe('bardo'); expect(a.classId).toBe('squire'); // sem kit próprio: herda o do Squire
  });
  it('a troca de magias mantém 1 magia elemental e completa com as do novo kit; sem elemento vêm as 4 do kit', () => {
    const { e, a, b } = fresh();
    e.evolve(a.id, 'mago', { force: true });
    expect(a.spellSlots).toEqual(['basic_fire', 'mage_arc', 'mage_nova', 'mage_barrier']);
    expect(e.getSnapshot().message).toMatch(/Magias trocadas: Raio Arcano, Nova Arcana, Barreira Arcana/);
    e.equipSpell(b.id, 0, 'squire_guard'); e.evolve(b.id, 'cacador', { force: true });
    expect(b.spellSlots).toEqual(['hunter_shot', 'hunter_volley', 'hunter_aim', 'hunter_finisher']);
    for (const id of a.spellSlots) expect(a.spellConditions[id]).toBeDefined();
    expect(a.spellSlots.every(id => spellById(id)!.classId === 'mage' || spellById(id)!.universal)).toBe(true);
  });
  it('as magias novas existem com os números do plano (nível 1)', () => {
    const row = (id: string) => { const s = spellById(id)!; return [s.target, s.power, s.mana, s.cooldown, s.level]; };
    expect(row('hunter_shot')).toEqual(['enemy', 1.65, 9, 4, 1]); expect(row('hunter_volley')).toEqual(['allEnemies', 1.15, 15, 7, 1]);
    expect(row('hunter_aim')).toEqual(['self', .32, 22, 10, 1]); expect(row('hunter_finisher')).toEqual(['enemy', 2.4, 24, 9, 1]);
    expect(row('mage_arc')).toEqual(['enemy', 1.75, 10, 3.5, 1]); expect(row('mage_nova')).toEqual(['allEnemies', 1.3, 20, 7, 1]);
    expect(row('mage_barrier')).toEqual(['self', 36, 22, 10, 1]); expect(row('mage_meteor')).toEqual(['allEnemies', 2, 34, 12, 1]);
    expect(SPELLS.filter(s => s.classId === 'hunter')).toHaveLength(4); expect(SPELLS.filter(s => s.classId === 'mage' && !s.node)).toHaveLength(4);
  });
  it('passivas: Guerreiro +10% defesa e +8% resistência só se for Tanque; Caçador +6% crítico', () => {
    const { e, a, b } = fresh();
    const baseDef = characterStats(a, e.getSnapshot()).defense, baseRes = characterStats(a, e.getSnapshot()).resistance;
    e.evolve(a.id, 'guerreiro', { force: true });
    const knightBase = { ...CLASSES.knight.base }; expect(knightBase.defense).toBe(18);
    const s = characterStats(a, e.getSnapshot()); expect(a.isTank).toBe(true);
    expect(passiveBonus(a.profile.classPath, 'defense')).toBeCloseTo(.10); expect(passiveBonus(a.profile.classPath, 'tankResistance')).toBeCloseTo(.08);
    a.isTank = false; const notTank = characterStats(a, e.getSnapshot()); a.isTank = true;
    expect(s.resistance - notTank.resistance).toBeCloseTo(.08); expect(baseDef).toBeGreaterThan(0); expect(baseRes).toBeGreaterThan(0);
    const critBefore = characterStats(b, e.getSnapshot()).crit; e.evolve(b.id, 'cacador', { force: true });
    expect(talentBonus(b, 'crit')).toBeCloseTo(.06); expect(characterStats(b, e.getSnapshot()).crit).toBeCloseTo(CLASSES.hunter.base.crit + .06); expect(critBefore).toBeGreaterThan(0);
    expect(Object.keys(NODE_PASSIVES)).toEqual(expect.arrayContaining(['guerreiro', 'cacador', 'mago']));
  });
  it('a passiva do Mago só age em magia do elemento em foco (foco fogo: basic_fire +15%, basic_ice neutra)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const damage = (spellId: string) => {
      const { e, a } = fresh(); e.evolve(a.id, 'mago', { force: true });
      e.equipSpell(a.id, 3, 'basic_ice'); e.setOfflineTarget(a.id, 0, 'fire');
      e.start(); const m = e.getSnapshot().monsters[0]; m.hp = m.maxHp = 1e9;
      cast(e, a, spellId); return 1e9 - m.hp;
    };
    const focused = damage('basic_fire'), neutral = damage('basic_ice');
    expect(neutral).toBeGreaterThan(0); expect(focused / neutral).toBeCloseTo(1.15, 1);
  });
  it('Caçador e Mago equipam as armas iniciais do Squire (histórico do caminho)', () => {
    const { e, a, b } = fresh(); e.evolve(a.id, 'cacador', { force: true }); e.evolve(b.id, 'mago', { force: true });
    e.getSnapshot().inventory.bp.push({ itemId: 'oak_bow', quantity: 1 }, { itemId: 'apprentice_staff', quantity: 1 }, { itemId: 'knuckle_wraps', quantity: 1 });
    expect(equipBlockReason(a, { ...{ id: 'x', name: 'x', kind: 'equipment', rarity: 'common', value: 1, slot: 'weapon' }, classIds: ['squire'] })).toBeUndefined();
    expect(e.equip(a.id, 'oak_bow')).toBe(true); expect(e.equip(b.id, 'apprentice_staff')).toBe(true); expect(e.equip(b.id, 'knuckle_wraps')).toBe(true);
    expect(kitsOfPath(a.profile.classPath)).toEqual(['squire', 'hunter']);
  });
  it('save de personagem evoluído exporta/importa e valida (classPath + kit coerentes); kit incoerente é rejeitado', () => {
    const { e, a } = fresh(); e.evolve(a.id, 'mago', { force: true }); a.talentPoints = 5; a.profile.level = 10; a.talents.mage_talent_0 = 1; a.talents.squire_talent_0 = 1;
    const restored = importBackup(exportBackup(e.getSnapshot())).characters[0];
    expect(restored.classId).toBe('mage'); expect(restored.profile.classPath).toEqual(['aprendiz', 'mago']); expect(restored.talents).toEqual({ mage_talent_0: 1, squire_talent_0: 1 });
    const bad = JSON.parse(exportBackup(e.getSnapshot())); bad.state.characters[0].classId = 'squire';
    // a migração conserta o kit a partir da classe (saves de teste evoluídos antes do kit existir)
    expect(importBackup(JSON.stringify(bad)).characters[0].classId).toBe('mage');
    const foreign = JSON.parse(exportBackup(e.getSnapshot())); foreign.state.characters[1].talents = { mage_talent_0: 1 };
    expect(() => importBackup(JSON.stringify(foreign))).toThrow(/corrompido/);
  });
  it('kitOfNode: Tier 2 herda o kit do Tier 1 e classes sem kit herdam o do Squire', () => {
    expect([kitOfNode('mago'), kitOfNode('piromante'), kitOfNode('arcanista_de_plasma'), kitOfNode('gladiador'), kitOfNode('bardo'), kitOfNode('aprendiz')]).toEqual(['mage', 'mage', 'mage', 'knight', 'squire', 'squire']);
  });
  it('respec devolve os pontos de todos os kits do caminho', () => {
    const { e, a } = fresh(); e.evolve(a.id, 'guerreiro', { force: true }); a.talents = { squire_talent_0: 2, knight_talent_0: 1 }; a.talentPoints = 0; e.getSnapshot().gold = 10000;
    expect(e.respecTalents(a.id)).toBe(true); expect(a.talentPoints).toBe(3); expect(a.talents).toEqual({});
    expect(MONSTERS.skeleton).toBeDefined(); expect(createCharacter('mage', 'X').classId).toBe('mage');
  });
});
