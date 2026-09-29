import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import { HUNTS, HUNT_BY_ID, bossIdOf, huntRisk, huntWaves } from '../data/hunts';
import { MONSTERS } from '../data/monsters';
import { itemById } from '../data/items';
import { cloneValidatedState } from '../persistence/validation';

afterEach(() => vi.restoreAllMocks());

const FILES = ['catacumbas', 'floresta_sombria', 'pantano_toxico', 'minas_esquecidas', 'fortaleza_de_gelo', 'vulcao_ardente', 'templo_profano'];

describe('Bloco 2 — hunts', () => {
  it('são 7 hunts com 3 waves, monstros existentes e arquivos de mapa com o nome exato', () => {
    expect(HUNTS.map(h => h.map)).toEqual(FILES);
    for (const hunt of HUNTS) {
      expect(hunt.waves).toHaveLength(3);
      for (const id of hunt.waves.flatMap(w => w.monsters)) expect(MONSTERS[id], `${hunt.id}: ${id}`).toBeDefined();
      expect(MONSTERS[hunt.waves[2].monsters[0]].boss).toBe(true);
      expect(hunt.waves[0].monsters).toHaveLength(hunt.id === 'catacumbas' ? 3 : 4);
    }
    expect(Object.keys(import.meta.glob('/public/assets/maps/*.png')).some(path => path.endsWith('/catacumbas.png'))).toBe(true);
  });
  it('as hunts novas seguem A A A A · A A B B · Boss A A e os números do plano', () => {
    const w = huntWaves('floresta_sombria');
    expect(w.map(x => x.monsters)).toEqual([['wolf', 'wolf', 'wolf', 'wolf'], ['wolf', 'wolf', 'bandit', 'bandit'], ['spider_queen', 'wolf', 'wolf']]);
    expect([MONSTERS.wolf, MONSTERS.bandit, MONSTERS.spider_queen].map(m => [m.hp, m.attack, m.defense, m.xp])).toEqual([[742, 17, 7, 29], [1404, 25, 9, 68], [6075, 32, 12, 340]]);
    expect(MONSTERS.profane_high_priest).toMatchObject({ hp: 13770, attack: 67, defense: 21, xp: 1301 });
    expect([MONSTERS.skeleton.xp, MONSTERS.ghoul.xp, MONSTERS.bone_king.xp]).toEqual([27, 66, 270]);
    expect(MONSTERS.wolf.gold[0]).toBeLessThan(19); expect(MONSTERS.wolf.gold[1]).toBeGreaterThan(19);
  });
  it('todo drop referencia um item existente', () => {
    for (const m of Object.values(MONSTERS)) for (const entry of m.loot) expect(itemById(entry.itemId), `${m.id}: ${entry.itemId}`).toBeDefined();
  });
  it('selectHunt aceita qualquer hunt, mesmo acima do nível, mas só com a caçada parada e id válido', () => {
    const e = new GameEngine(partyState());
    expect(e.selectHunt('templo_profano')).toBe(true);
    expect(e.getSnapshot()).toMatchObject({ huntId: 'templo_profano', wave: 0, monsters: [], message: 'Hunt: Templo Profano' });
    expect(e.selectHunt('nao_existe')).toBe(false); expect(e.getSnapshot().huntId).toBe('templo_profano');
    e.start(); expect(e.selectHunt('floresta_sombria')).toBe(false); e.end();
    expect(e.selectHunt('floresta_sombria')).toBe(true);
  });
  it('a etiqueta de risco segue os limites do plano', () => {
    const rec = 10;
    expect([1, 2, 7, 8, 9, 12, 13, 20].map(level => huntRisk(level, rec))).toEqual(['Suicida', 'Arriscada', 'Arriscada', 'Adequada', 'Adequada', 'Adequada', 'Tranquila', 'Tranquila']);
    expect([huntRisk(1.99, rec), huntRisk(2, rec), huntRisk(7.99, rec), huntRisk(12.9, rec)]).toEqual(['Suicida', 'Arriscada', 'Arriscada', 'Adequada']);
    const e = new GameEngine(partyState()); expect(e.averageTeamLevel()).toBe(1);
  });
  it('save antigo sem huntId carrega em Catacumbas e a wave é validada contra a hunt do save', () => {
    const legacy = structuredClone(partyState()) as unknown as Record<string, unknown>; delete legacy.huntId;
    expect(cloneValidatedState(legacy).huntId).toBe('catacumbas');
    const bad = partyState(); bad.huntId = 'pantano_toxico'; bad.wave = 3; expect(() => cloneValidatedState(bad)).toThrow(/corrompido/);
    const unknown = partyState(); unknown.huntId = 'x'; expect(() => cloneValidatedState(unknown)).toThrow(/corrompido/);
  });
  it('o texto do boss e o total de waves vêm da hunt', () => {
    expect(MONSTERS[bossIdOf('catacumbas')].name).toBe('REI DOS OSSOS');
    expect(MONSTERS[bossIdOf('vulcao_ardente')].name).toBe('Senhor das Chamas');
    expect(HUNT_BY_ID.pantano_toxico.waves).toHaveLength(3);
  });
  it.each(HUNTS.map(h => h.id))('%s: um ciclo completo roda até o boss sem erro', huntId => {
    vi.spyOn(Math, 'random').mockReturnValue(.5);
    const state = partyState(); state.huntId = huntId; state.characters.forEach(c => { c.profile.level = 80; }); state.inventory.supply = [{ itemId: 'health_potion', quantity: 30 }, { itemId: 'mana_potion', quantity: 30 }];
    const e = new GameEngine(state); e.start();
    for (let i = 0; i < 40000 && e.getSnapshot().cycle < 1; i++) e.advance(100, 1);
    expect(e.getSnapshot().cycle).toBeGreaterThanOrEqual(1);
  });
});
