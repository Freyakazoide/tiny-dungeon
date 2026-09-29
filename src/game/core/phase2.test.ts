import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, GameEngine } from './GameEngine';
import { createDevTools } from './devTools';
import { partyState } from './testing';
import { monsterHit } from '../systems/combat';
import { cumulativeTries } from '../rpg/curves';
import { runtime } from '../rpg/runtime';
import { PROFICIENCY_IDS, type ProficiencyId } from '../rpg/proficiencies';
import { spellById } from '../data/spells';

afterEach(() => { runtime.trainScale = 1; runtime.xpScale = 1; vi.restoreAllMocks(); });

/** Squires nível 80 contra monstros que não morrem: combate contínuo. */
function endlessCombat(setup: (e: GameEngine) => void, minutes = 10) {
  vi.spyOn(Math, 'random').mockReturnValue(.99);
  const state = partyState(); state.characters.forEach(c => { c.profile.level = 80; });
  const e = new GameEngine(state); setup(e); e.start();
  state.monsters.forEach(m => { m.hp = m.maxHp = 1e12; });
  for (let i = 0; i < minutes * 600; i++) e.tick(100);
  return e;
}
const total = (c: { profile: { proficiencies: Record<ProficiencyId, { level: number; tries: number }> } }, id: ProficiencyId) =>
  cumulativeTries(id, 10, c.profile.proficiencies[id].level) + c.profile.proficiencies[id].tries;
const cast = (e: GameEngine, c: unknown, id: string) => (e as unknown as { cast(c: unknown, s: unknown): void }).cast(c, spellById(id));

describe('A — armas e foco de treino', () => {
  it('arco equipado: 10 min rendem ~300 tries em Ranged e nada em Melee', () => {
    const e = endlessCombat(engine => { for (const c of engine.getSnapshot().characters) c.equipment.weapon = 'oak_bow'; });
    const c = e.getSnapshot().characters[0];
    expect(total(c, 'ranged')).toBeGreaterThan(270); expect(total(c, 'ranged')).toBeLessThan(330);
    expect(total(c, 'melee')).toBe(0);
  });
  it('o kit inicial vem equipado (arma, escudo, magia e foco), a mochila começa vazia e dá para trocar de arma', () => {
    const e = new GameEngine(partyState()); const [a, b, c] = e.getSnapshot().characters;
    expect(e.getSnapshot().inventory.bp).toHaveLength(0);
    expect([a, b, c].map(x => x.equipment.weapon)).toEqual(['rusty_sword', 'oak_bow', 'apprentice_staff']);
    for (const x of [a, b, c]) expect(x.equipment.offhand).toBe('wooden_shield');
    e.getSnapshot().inventory.bp.push({ itemId: 'knuckle_wraps', quantity: 1 });
    expect(e.equip(a.id, 'knuckle_wraps')).toBe(true);
    expect(a.equipment.weapon).toBe('knuckle_wraps'); expect(e.getSnapshot().inventory.bp.find(s => s.itemId === 'rusty_sword')?.quantity).toBe(1);
  });
  it('cast do elemento em foco rende 2 tries no elemento e em Magia; outro elemento rende 0', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    expect(e.equipSpell(c.id, 0, 'basic_holy')).toBe(true); expect(e.equipSpell(c.id, 1, 'basic_fire')).toBe(true);
    e.setOfflineTarget(c.id, 0, 'holy');
    cast(e, c, 'basic_holy');
    expect(c.profile.proficiencies.holy.tries).toBe(2); expect(c.profile.proficiencies.magic.tries).toBe(2);
    cast(e, c, 'basic_fire');
    expect(c.profile.proficiencies.fire.tries).toBe(0); expect(c.profile.proficiencies.magic.tries).toBe(2);
    expect(c.profile.trainingFocus).toBeUndefined(); // magia elemental não muda o foco da arma
  });
  it('sem foco elemental (nem magia elemental equipada), nenhum elemento treina', () => {
    const e = endlessCombat(engine => { for (const c of engine.getSnapshot().characters) { engine.setOfflineTarget(c.id, 0, undefined); c.spellSlots.forEach((id, slot) => { if (id.startsWith('basic_')) engine.equipSpell(c.id, slot, 'squire_guard'); }); } });
    for (const c of e.getSnapshot().characters) for (const id of PROFICIENCY_IDS.filter(i => !['melee', 'ranged', 'defense'].includes(i))) expect(total(c, id)).toBe(0);
  });
  it('sem alvo definido, o foco é o elemento da primeira magia elemental equipada', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    e.setOfflineTarget(c.id, 0, undefined); e.equipSpell(c.id, 0, 'squire_guard');
    e.equipSpell(c.id, 2, 'basic_ice'); e.equipSpell(c.id, 3, 'basic_fire');
    cast(e, c, 'basic_fire'); expect(c.profile.proficiencies.fire.tries).toBe(0);
    cast(e, c, 'basic_ice'); expect(c.profile.proficiencies.ice.tries).toBe(2);
  });
  it('Defesa rende no máximo 1 try a cada 2 s, mesmo com 5 monstros batendo', () => {
    const state = partyState(); const c = state.characters[0];
    const hit = () => monsterHit({ uid: 't', defId: 'skeleton', hp: 100, maxHp: 100, cooldown: 0, alive: true }, c, state);
    for (let i = 0; i < 5; i++) hit();
    expect(c.profile.proficiencies.defense.tries).toBe(1);
    const e = endlessCombat(() => {}, 2); const d = e.getSnapshot().characters[2]; // com Math.random fixo os monstros sempre miram o último
    expect(total(d, 'defense')).toBeLessThanOrEqual(61); expect(total(d, 'defense')).toBeGreaterThan(0);
  });
  it('equipSpell recusa o 5º slot, magias de outro kit, repetidas, e ids inválidos', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    expect(c.spellSlots).toHaveLength(4);
    expect(e.equipSpell(c.id, 4, 'basic_fire')).toBe(false);
    expect(e.equipSpell(c.id, 0, 'knight_cleave')).toBe(false);
    expect(e.equipSpell(c.id, 0, 'squire_sweep')).toBe(false);
    expect(e.equipSpell(c.id, 0, 'nao_existe')).toBe(false);
    expect(e.equipSpell('outro', 0, 'basic_fire')).toBe(false);
    expect(e.equipSpell(c.id, 1, 'basic_fire')).toBe(false); // já equipada no slot 1
    expect(e.equipSpell(c.id, 1, 'basic_ice')).toBe(true);
    expect(c.spellSlots).toHaveLength(4); expect(c.spellSlots[1]).toBe('basic_ice');
    expect(c.spellConditions.basic_ice).toEqual({ manaAbove: 10 }); expect(c.spellConditions.squire_sweep).toBeUndefined();
    expect(e.unequipSpell(c.id, 1)).toBe(true); expect(c.spellSlots).toHaveLength(3);
    expect(e.equipSpell(c.id, 3, 'basic_ice')).toBe(true); expect(c.spellSlots).toHaveLength(4);
  });
  it('as magias básicas não entram automaticamente no kit de um personagem novo', () => {
    const c = createCharacter('squire', 'Novo');
    expect(c.spellSlots.every(id => !spellById(id)!.universal)).toBe(true);
  });
  it('depois de 2 h offline a caçada volta a idle e o relatório existe', () => {
    const state = partyState(); const e = new GameEngine(state);
    e.setOfflineTarget(state.characters[0].id, 0, 'melee'); e.start(); expect(e.getSnapshot().status).toBe('running');
    e.returnFromOffline(7200);
    const s = e.getSnapshot();
    expect(s.status).toBe('idle'); expect(s.monsters).toHaveLength(0); expect(s.wave).toBe(0);
    expect(s.offlineReport?.seconds).toBe(7200); expect(s.offlineReport?.huntEnded).toBe(true); expect(s.offlineReport?.entries[0].training[0].tries).toBe(3600);
  });
});

describe('Bloco 7 — offline e sessão', () => {
  it('gap offline sem alvo de treino ainda encerra a caçada e informa no relatório', () => {
    const e = new GameEngine(partyState()); e.getSnapshot().characters.forEach(c => { c.profile.offlineTargets = [null, null]; c.profile.offlineHistory = []; c.profile.lastTrained = undefined; c.profile.prevTrained = undefined; });
    e.start(); e.returnFromOffline(7200);
    expect(e.getSnapshot().status).toBe('idle'); expect(e.getSnapshot().offlineReport).toMatchObject({ huntEnded: true, hunt: 'Catacumbas' }); expect(e.getSnapshot().offlineReport!.entries.every(x => x.training.length === 0)).toBe(true);
  });
  it('sem caçada ativa, sem treino e com a fração offline em 0, não há relatório', () => {
    const e = new GameEngine(partyState()); e.getSnapshot().characters.forEach(c => { c.profile.offlineTargets = [null, null]; c.profile.offlineHistory = []; });
    runtime.offlineShare = 0;
    try { e.returnFromOffline(7200); expect(e.getSnapshot().offlineReport).toBeUndefined(); } finally { runtime.offlineShare = .25; }
  });
});

describe('B — ferramentas de teste', () => {
  const dev = () => {
    const e = new GameEngine(partyState());
    for (const method of ['info', 'error', 'table'] as const) vi.spyOn(console, method).mockImplementation(() => {});
    return { e, d: createDevTools(e, { setLastSeen: async () => {}, resetSave: async () => {} }), id: e.getSnapshot().characters[0].id };
  };
  it('evolve respeita a árvore: ladino depois mago falha, force ignora só os requisitos', () => {
    const { e, d, id } = dev();
    expect(d.evolve(id, 'ladino')).toBe(false);
    expect(d.evolve(id, 'ladino', { force: true })).toBe(true);
    expect(d.evolve(id, 'mago', { force: true })).toBe(false);
    expect(e.getSnapshot().characters[0].profile.classPath).toEqual(['aprendiz', 'ladino']);
  });
  it('comandos alteram o perfil e validam ids', () => {
    const { e, d, id } = dev(); const c = e.getSnapshot().characters[0];
    d.setLevel(id, 25); expect(c.profile.level).toBe(25); expect(c.talentPoints).toBe(24);
    d.setProf(id, 'fire', 35); expect(c.profile.proficiencies.fire).toEqual({ level: 35, tries: 0 });
    d.addTries(id, 'fire', 5000); expect(total(c, 'fire')).toBe(cumulativeTries('fire', 10, 35) + 5000);
    d.addCounter(id, 'crits', 5000); expect(c.profile.counters.crits).toBe(5000);
    d.giveXp(id, 10); expect(c.profile.xp).toBe(10);
    d.setProf(id, 'nada', 5); d.setProf('x', 'fire', 5); d.addCounter(id, 'nada', 1); d.setProf(id, 'fire', 1000);
    expect(c.profile.proficiencies.fire.level).toBe(35);
    expect(d.list().nodes).toHaveLength(62);
  });
  it('timeScale(1000): 1 min de combate rende ~30 mil tries', () => {
    const e = endlessCombat(() => { runtime.trainScale = 1000; }, 1);
    const tries = total(e.getSnapshot().characters[0], 'melee');
    expect(tries).toBeGreaterThan(27000); expect(tries).toBeLessThan(33000);
  });
  it('fastForwardOffline(48) credita só 24 h e encerra a caçada', () => {
    const { e, d, id } = dev(); e.setOfflineTarget(id, 0, 'melee'); e.start();
    d.fastForwardOffline(48);
    expect(e.getSnapshot().offlineReport?.seconds).toBe(86400); expect(e.getSnapshot().status).toBe('idle');
    expect(total(e.getSnapshot().characters[0], 'melee')).toBe(43200);
  });
  it('xpScale multiplica o XP dos monstros', () => {
    runtime.xpScale = 10; vi.spyOn(Math, 'random').mockReturnValue(.99);
    const e = new GameEngine(partyState()); e.start();
    e.getSnapshot().monsters.forEach(m => { m.hp = 1; }); for (let i = 0; i < 100; i++) e.tick(100);
    expect(e.getSnapshot().analyzer.xp).toBeGreaterThanOrEqual(1000);
  });
});
