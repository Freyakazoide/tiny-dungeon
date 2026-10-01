import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { CLASS_BY_ID, childrenOf } from '../rpg/classTree';
import { evolutionOptions } from '../rpg/evolution';
import { characterStats } from './progression';
import { classProgress, groupClasses, previewEvolution, UNTRACKED_COUNTERS } from './guide';

const make = () => { const e = new GameEngine(partyState()); return { e, id: e.getSnapshot().characters[0].id }; };
const ch = (e: GameEngine, id: string) => e.getSnapshot().characters.find(c => c.id === id)!;

describe('classProgress / groupClasses', () => {
  it('Guerreiro pronto com nível 10 e Melee 25; Melee 24 vira 24/25 com gargalo Melee; consistente com evolutionOptions', () => {
    const { e, id } = make(); const c = ch(e, id); c.profile.level = 10; c.profile.proficiencies.melee.level = 25;
    expect(classProgress(c, CLASS_BY_ID.guerreiro).ready).toBe(true);
    for (const o of evolutionOptions(c.profile)) expect(classProgress(c, o.node).ready, o.node.id).toBe(o.met);
    c.profile.proficiencies.melee.level = 24;
    const p = classProgress(c, CLASS_BY_ID.guerreiro); expect(p.ready).toBe(false); expect(p.ratio).toBeCloseTo(24 / 25); expect(p.bottleneck).toBe('Melee');
  });

  it('contador não contabilizado nunca é pronta', () => {
    const { e, id } = make(); const c = ch(e, id); c.profile.level = 30; c.profile.classId = 'guerreiro'; c.profile.classPath = ['aprendiz', 'guerreiro'];
    const counted = childrenOf('guerreiro').find(n => n.requires.counters);
    if (!counted || !UNTRACKED_COUNTERS.length) { expect(UNTRACKED_COUNTERS).toEqual([]); return; }
    expect(classProgress(c, counted).untracked).toBe(true);
  });

  it('seções: prontas, em progresso (ratio decrescente); as 15 classes de Tier 1 têm kit', () => {
    const { e, id } = make(); const c = ch(e, id); c.profile.level = 10; c.profile.proficiencies.melee.level = 25; c.profile.proficiencies.magic.level = 13;
    const g = groupClasses(c);
    expect(g.ready.map(s => s.node.id).sort()).toEqual(['guerreiro', 'ladino', 'mercenario']);   // Melee 25 abre as três
    expect(g.ready.length + g.progress.length + g.readySoon.length + g.soon.length).toBe(15);
    for (const s of g.progress) expect(s.playable).toBe(true);
    for (const s of [...g.readySoon, ...g.soon]) expect(s.playable).toBe(false);
    const ratios = g.progress.map(s => s.progress.ratio); expect([...ratios].sort((a, b) => b - a)).toEqual(ratios);
    const names = g.readySoon.map(s => s.node.name); expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it('Tier 2: subclasses sem kit caem em soon/readySoon', () => {
    const { e, id } = make(); const c = ch(e, id); c.profile.level = 25; c.profile.classId = 'guerreiro'; c.profile.classPath = ['aprendiz', 'guerreiro']; c.profile.proficiencies.melee.level = 38;
    const g = groupClasses(c); expect(g.ready).toEqual([]); expect(g.progress).toEqual([]);
    expect(g.soon.length + g.readySoon.length).toBe(childrenOf('guerreiro').length);
  });
});

describe('previewEvolution', () => {
  it('é pura e bate com characterStats depois de evolve (Tier 1 e Tier 2)', () => {
    for (const target of ['guerreiro', 'cacador', 'mago']) {
      const { e, id } = make(); const c = ch(e, id); c.profile.level = 30;
      const state = e.getSnapshot(), before = JSON.stringify(state);
      const preview = previewEvolution(state, c, target);
      expect(JSON.stringify(e.getSnapshot())).toBe(before);
      expect(preview.lostOptions).toBe(14);
      e.evolve(id, target, { force: true });
      const after = characterStats(ch(e, id), e.getSnapshot());
      for (const s of preview.stats) expect(after[s.key], `${target} ${s.key}`).toBeCloseTo(s.after, 6);
      expect(preview.kitSpells.length).toBeGreaterThan(0);
    }
    const { e, id } = make(); const c = ch(e, id); c.profile.level = 30; e.evolve(id, 'guerreiro', { force: true });
    for (const t2 of childrenOf('guerreiro')) {
      const pv = previewEvolution(e.getSnapshot(), ch(e, id), t2.id); expect(pv.lostOptions).toBe(childrenOf('guerreiro').length - 1);
      const fresh = new GameEngine(JSON.parse(JSON.stringify(e.getSnapshot()))); fresh.evolve(id, t2.id, { force: true });
      const after = characterStats(ch(fresh, id), fresh.getSnapshot());
      for (const s of pv.stats) expect(after[s.key], `${t2.id} ${s.key}`).toBeCloseTo(s.after, 6);
    }
  });
  it('sem kit (Tier 2 ainda não liberado): sem atributos nem magias, só afinidade', () => {
    const { e, id } = make(); const pv = previewEvolution(e.getSnapshot(), ch(e, id), 'gladiador');
    expect(pv.playable).toBe(false); expect(pv.stats).toEqual([]); expect(pv.kitSpells).toEqual([]); expect(Object.keys(pv.affinity)).toHaveLength(13);
  });
});
