import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import { cloneValidatedState } from '../persistence/validation';
import { referenceHunt, referenceRates, REF_MIN_ACTIVE_MS, OFFLINE_CAP_S } from '../rpg/offline';
import { OFFLINE_HUNT_SHARE } from '../data/balance';
import { HUNTS } from '../data/hunts';
import { runtime } from '../rpg/runtime';
import { elementFocus, xpForLevel } from '../systems/progression';
import type { Character } from './types';

afterEach(() => { vi.restoreAllMocks(); runtime.offlineShare = OFFLINE_HUNT_SHARE; });

const totalXp = (c: Character) => { let n = c.profile.xp; for (let l = 1; l < c.profile.level; l++) n += xpForLevel(l); return n; };
const HOUR = 3_600_000;

describe('Bloco C — offline v2: 25% da hunt mais avançada', () => {
  it('gap de 10 h com Floresta medida em 40 mil XP/h: cada personagem da equipe ganha 100 mil XP e o ouro é 25%', () => {
    const e = new GameEngine(partyState()); const s = e.getSnapshot();
    s.huntStats.floresta_sombria = { activeMs: HOUR, xp: 40000, gold: 27000, bossKills: 1 };
    s.characters.forEach(c => { c.profile.offlineTargets = [null, null]; c.profile.offlineHistory = []; });
    const gold = s.gold; e.applyOffline(10 * 3600);
    const after = e.getSnapshot();
    for (const c of after.characters) expect(totalXp(c)).toBe(100000);
    expect(after.gold - gold).toBe(Math.round(.25 * 27000 * 10));
    expect(after.offlineReport).toMatchObject({ hunt: 'Floresta Sombria', share: .25, gold: 67500, seconds: 36000 });
    expect(after.offlineReport!.entries.every(x => x.xp === 100000 && x.levelsGained > 0)).toBe(true);
    expect(after.characters[0].talentPoints).toBeGreaterThan(0); // níveis renderam pontos de talento, como no combate
  });
  it('a referência é a maior hunt com chefe derrotado; entrar numa hunt sem derrotar o chefe não a torna referência', () => {
    expect(referenceHunt({}).id).toBe('catacumbas');
    expect(referenceHunt({ pantano_toxico: { activeMs: 5 * HOUR, xp: 1e6, gold: 1e6, bossKills: 0 } }).id).toBe('catacumbas');
    expect(referenceHunt({ floresta_sombria: { activeMs: 1, xp: 1, gold: 1, bossKills: 2 }, pantano_toxico: { activeMs: 1, xp: 1, gold: 1, bossKills: 1 }, catacumbas: { activeMs: 1, xp: 1, gold: 1, bossKills: 9 } }).id).toBe('pantano_toxico');
    expect(referenceHunt({ vulcao_ardente: { activeMs: 1, xp: 1, gold: 1, bossKills: 1 }, floresta_sombria: { activeMs: 1, xp: 1, gold: 1, bossKills: 1 } }).id).toBe('vulcao_ardente');
  });
  it('menos de 10 min ativos na hunt: usa a referência estática do HuntDef', () => {
    const stats = { floresta_sombria: { activeMs: REF_MIN_ACTIVE_MS - 1, xp: 999999, gold: 999999, bossKills: 1 } };
    expect(referenceRates(stats)).toMatchObject({ measured: false, xpPerHour: 28000, goldPerHour: 20000 });
    expect(referenceRates({ floresta_sombria: { ...stats.floresta_sombria, activeMs: REF_MIN_ACTIVE_MS } })).toMatchObject({ measured: true });
    expect(HUNTS.map(h => [h.refXpPerHour, h.refGoldPerHour])).toEqual([[24000, 5000], [28000, 20000], [35000, 24000], [44000, 27000], [55000, 30000], [69000, 32000], [86000, 34000]]);
  });
  it('gap de 60 h credita só 24 h (teto)', () => {
    const e = new GameEngine(partyState()); e.applyOffline(60 * 3600);
    expect(e.getSnapshot().offlineReport!.seconds).toBe(OFFLINE_CAP_S);
    expect(totalXp(e.getSnapshot().characters[0])).toBe(Math.round(.25 * 24000 * 24));
  });
  it('não mexe no Analyzer, nas estatísticas de hunt, no loot nem nos contadores', () => {
    const e = new GameEngine(partyState()); const before = JSON.stringify([e.getSnapshot().analyzer, e.getSnapshot().huntStats, e.getSnapshot().inventory, e.getSnapshot().characters.map(c => c.profile.counters)]);
    e.applyOffline(7200);
    const s = e.getSnapshot(); expect(JSON.stringify([s.analyzer, s.huntStats, s.inventory, s.characters.map(c => c.profile.counters)])).toBe(before);
    expect(s.analyzer.xp).toBe(0); expect(Object.keys(s.analyzer.kills)).toHaveLength(0);
  });
  it('só a equipe ganha XP; as duas vagas treinam para todos os personagens', () => {
    const e = new GameEngine(partyState()); e.recruit('Reserva'); const reserve = e.getSnapshot().characters[3]; reserve.profile.offlineTargets = ['melee', 'ice'];
    e.applyOffline(3600);
    expect(totalXp(reserve)).toBe(0); expect(reserve.profile.proficiencies.melee.tries + reserve.profile.proficiencies.melee.level).toBeGreaterThan(10);
    expect(e.getSnapshot().offlineReport!.entries[3].training.map(t => t.target)).toEqual(['melee', 'ice']);
  });
  it('a fração vem de runtime.offlineShare (dev.offlineShare)', () => {
    runtime.offlineShare = .5; const e = new GameEngine(partyState()); e.applyOffline(3600);
    expect(totalXp(e.getSnapshot().characters[0])).toBe(Math.round(.5 * 24000));
  });
});

describe('Bloco C — vagas, histórico e estatísticas', () => {
  it('setOfflineTarget grava a vaga, empurra para o histórico sem duplicar e corta em 6', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.offlineHistory = [];
    for (const id of ['melee', 'fire', 'ice', 'holy', 'death', 'psychic', 'earth', 'melee'] as const) e.setOfflineTarget(c.id, 1, id);
    expect(c.profile.offlineTargets[1]).toBe('melee'); expect(c.profile.offlineHistory).toEqual(['melee', 'earth', 'psychic', 'death', 'holy', 'ice']);
    e.setOfflineTarget(c.id, 1, null); expect(c.profile.offlineTargets[1]).toBeNull(); expect(c.profile.offlineHistory[0]).toBe('melee');
    e.setOfflineTarget(c.id, 2 as never, 'fire'); e.setOfflineTarget(c.id, 0, 'nao' as never); expect(c.profile.offlineTargets[0]).toBe('fire'); // vaga inválida e proficiência inválida ignoradas
  });
  it('o foco elemental online é o primeiro elemento entre as vagas; senão a magia elemental equipada', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    e.setOfflineTarget(c.id, 0, 'melee'); e.setOfflineTarget(c.id, 1, 'ice'); expect(elementFocus(c)).toBe('ice');
    e.setOfflineTarget(c.id, 0, 'holy'); expect(elementFocus(c)).toBe('holy');
    c.profile.offlineTargets = ['melee', 'ranged']; expect(elementFocus(c)).toBe('fire'); // basic_fire equipada na criação
  });
  it('a caçada acumula huntStats da hunt atual: tempo ativo, XP por personagem, ouro e chefes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.5);
    const state = partyState(); state.huntId = 'floresta_sombria'; state.characters.forEach(c => { c.profile.level = 60; });
    const e = new GameEngine(state); e.start();
    for (let i = 0; i < 40000 && e.getSnapshot().cycle < 1; i++) e.tick(100);
    const stat = e.getSnapshot().huntStats.floresta_sombria, a = e.getSnapshot().analyzer;
    expect(stat.bossKills).toBe(1); expect(stat.activeMs).toBe(a.activeMs); expect(stat.xp).toBe(a.xp); expect(stat.gold).toBe(a.gold); expect(e.getSnapshot().huntStats.catacumbas).toBeUndefined();
  });
  it('save antigo (offlineTarget) migra para offlineTargets = [alvo, null] e ganha huntStats vazio', () => {
    const legacy = structuredClone(partyState()) as unknown as { huntStats?: unknown; characters: { profile: Record<string, unknown> }[] };
    delete legacy.huntStats; const p = legacy.characters[0].profile; delete p.offlineTargets; delete p.offlineHistory; p.offlineTarget = 'fire';
    const restored = cloneValidatedState(legacy);
    expect(restored.characters[0].profile.offlineTargets).toEqual(['fire', null]); expect(restored.characters[0].profile.offlineHistory).toEqual(['fire']);
    expect('offlineTarget' in restored.characters[0].profile).toBe(false); expect(restored.huntStats).toEqual({});
    const noTarget = structuredClone(partyState()) as unknown as { characters: { profile: Record<string, unknown> }[] };
    const q = noTarget.characters[1].profile; delete q.offlineTargets; delete q.offlineHistory;
    expect(cloneValidatedState(noTarget).characters[1].profile.offlineTargets).toEqual([null, null]);
    const bad = partyState(); bad.characters[0].profile.offlineTargets = ['nada' as never, null]; expect(() => cloneValidatedState(bad)).toThrow(/corrompido/);
  });
});
