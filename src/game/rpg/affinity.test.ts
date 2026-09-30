import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { CLASS_NODES } from './classTree';
import { affinityCategory, affinityFor, AFFINITY, affinitySummary } from './affinity';
import { cumulativeTries, etaSeconds, hoursToReach } from './curves';
import { applyOfflineTraining, offlineSelection } from './offline';
import { createProfile, gainTries, type ProgressProfile } from './profile';
import { PROFICIENCY_IDS } from './proficiencies';
import { trainMultiplier, trainProficiency } from '../systems/progression';

const as = (classId: string, path: string[]): ProgressProfile => ({ ...createProfile(), classId, classPath: ['aprendiz', ...path, ...(path.length ? [] : [])] });
const guerreiro = () => as('guerreiro', ['guerreiro']);

describe('Fase 6 A — afinidade de treino por classe', () => {
  it('Squire treina tudo ×1,0; o multiplicador vale só depois de evoluir', () => {
    const p = createProfile();
    for (const id of PROFICIENCY_IDS) expect(affinityFor(p, id)).toBe(1);
    gainTries(p, 'melee', 6); expect(p.proficiencies.melee.tries).toBe(6);
  });

  it('Bardo em Morte é bloqueada: gainTries não muda nada e o nível congela (nem lastTrained muda)', () => {
    const p = as('bardo', ['bardo']); p.proficiencies.death.level = 20; p.lastTrained = 'magic';
    gainTries(p, 'death', 1e9);
    expect(p.proficiencies.death).toEqual({ level: 20, tries: 0 }); expect(p.lastTrained).toBe('magic');
  });

  it('Guerreiro em Melee rende 1,5× as tries do Squire; Ranged (Fora) rende 0,4×', () => {
    const w = guerreiro(), s = createProfile();
    gainTries(w, 'melee', 6); gainTries(s, 'melee', 6);
    expect(w.proficiencies.melee.tries).toBeCloseTo(s.proficiencies.melee.tries * 1.5);
    gainTries(w, 'ranged', 5); expect(w.proficiencies.ranged.tries).toBeCloseTo(2);
  });

  it('Piromante em Fogo rende ×1,5 (Mago ×1,25 + 0,25 da porta) e não há requisito Fora nem Bloqueado', () => {
    expect(AFFINITY.mago.fire).toBe(1.25); expect(AFFINITY.piromante.fire).toBe(1.5);
    const p = as('piromante', ['mago', 'piromante']); gainTries(p, 'fire', 4); expect(p.proficiencies.fire.tries).toBeCloseTo(6);
    for (const node of CLASS_NODES.filter(n => n.tier === 2)) for (const id of Object.keys(node.requires.skills ?? {})) expect(AFFINITY[node.id][id as keyof (typeof AFFINITY)[string]], `${node.id}: ${id}`).toBeGreaterThanOrEqual(1);
    for (const node of CLASS_NODES.filter(n => n.tier === 1)) for (const id of Object.keys(node.requires.skills ?? {})) expect(AFFINITY[node.id][id as keyof (typeof AFFINITY)[string]], `${node.id}: ${id}`).toBeGreaterThanOrEqual(1);
  });

  it('Tier 2 soma +0,25 só nas proficiências da porta, com teto ×1,75', () => {
    const gates = (id: string) => Object.keys(CLASS_NODES.find(n => n.id === id)!.requires.skills ?? {});
    for (const node of CLASS_NODES.filter(n => n.tier === 2)) {
      const parent = AFFINITY[node.parent!]; const own = AFFINITY[node.id];
      for (const prof of PROFICIENCY_IDS) {
        const expected = gates(node.id).includes(prof) ? Math.min(1.75, parent[prof] + .25) : parent[prof];
        expect(own[prof], `${node.id}/${prof}`).toBeCloseTo(expected);
        expect(own[prof]).toBeLessThanOrEqual(1.75);
      }
    }
  });

  it('o tempo de Melee 25→38 do Guerreiro é ~1/1,5 do base (mesmas tries, ritmo 1,5×)', () => {
    const base = hoursToReach('melee', 25, 38), w = guerreiro();
    w.proficiencies.melee = { level: 25, tries: 0 };
    gainTries(w, 'melee', cumulativeTries('melee', 25, 38) / 1.5);
    expect(w.proficiencies.melee.level).toBe(38); expect(base / 1.5).toBeCloseTo(hoursToReach('melee', 25, 38) / 1.5);
  });

  it('as vagas offline ignoram proficiências bloqueadas e caem no histórico e nas últimas treinadas não bloqueadas', () => {
    const p = as('bardo', ['bardo']);
    p.offlineTargets = ['death', 'fire']; p.offlineHistory = ['ice', 'magic', 'psychic']; p.lastTrained = 'poison';
    expect(offlineSelection(p)).toEqual(['magic', 'psychic']); // Bardo bloqueia Morte, Fogo, Gelo e Veneno
    const out = applyOfflineTraining(p, 10, () => 0)!;
    expect(out.entries.map(e => e.target)).toEqual(['magic', 'psychic']);
    expect(p.proficiencies.death.tries).toBe(0);
    // Magia é Especialista do Bardo (×1,5): 10 s × 0,5 try/s × 1,5; Psíquico é Afim+ (×1,25)
    expect(p.proficiencies.magic.tries).toBeCloseTo(7.5); expect(p.proficiencies.psychic.tries).toBeCloseTo(6.25);
  });

  it('o talento t_* soma à afinidade (× afinidade × (1 + x/100)) e o bônus offline chega em applyOfflineTraining', () => {
    const p = guerreiro(); p.offlineTargets = ['melee', null];
    applyOfflineTraining(p, 10, () => 10); // 5 tries × 1,5 × 1,1
    expect(p.proficiencies.melee.tries).toBeCloseTo(5 * 1.5 * 1.1);
  });

  it('linha do cartão de classe e categorias', () => {
    expect(affinitySummary('guerreiro')).toMatch(/^Especialista em Melee \(×1,5\) · Bloqueia Fogo, Gelo/);
    expect(affinitySummary('piromante')).toMatch(/Especialista em Magia \(×1,5\), Fogo \(×1,5\)/);
    expect(affinitySummary('aprendiz')).toBe('');
    expect([1.5, 1.75, 1.25, 1, .4, 0].map(affinityCategory)).toEqual(['Especialista', 'Especialista', 'Afim+', 'Afim', 'Fora', 'Bloqueada']);
  });
});

describe('Fase 6 A — engine', () => {
  const setup = () => { const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 30; return { e, c }; };

  it('evoluir descarta vagas e histórico bloqueados para a nova classe e reconhece o multiplicador efetivo', () => {
    const { e, c } = setup(); c.profile.proficiencies.melee.level = 25;
    c.profile.offlineTargets = ['fire', 'melee']; c.profile.offlineHistory = ['fire', 'ice', 'melee'];
    expect(e.evolve(c.id, 'guerreiro')).toBe(true);
    expect(c.profile.offlineTargets).toEqual([null, 'melee']); expect(c.profile.offlineHistory).toEqual(['melee']);
    expect(trainMultiplier(c, 'melee')).toBe(1.5); expect(trainMultiplier(c, 'fire')).toBe(0);
  });

  it('setOfflineTarget recusa proficiência bloqueada', () => {
    const { e, c } = setup(); e.evolve(c.id, 'guerreiro', { force: true });
    e.setOfflineTarget(c.id, 0, 'death'); expect(c.profile.offlineTargets[0]).not.toBe('death');
    e.setOfflineTarget(c.id, 0, 'melee'); expect(c.profile.offlineTargets[0]).toBe('melee');
  });

  it('trainProficiency aplica afinidade e bônus de talento e o ETA usa o multiplicador', () => {
    const { e, c } = setup(); e.evolve(c.id, 'guerreiro', { force: true });
    c.profile.proficiencies.melee = { level: 25, tries: 0 };
    trainProficiency(c, 'melee', 10); expect(c.profile.proficiencies.melee.tries).toBeCloseTo(15);
    trainProficiency(c, 'fire', 1e6); expect(c.profile.proficiencies.fire).toEqual({ level: 10, tries: 0 });
    expect(etaSeconds('melee', 25, 0, 26, .5 * 1.5)).toBeCloseTo(etaSeconds('melee', 25, 0, 26, .5) / 1.5);
  });
});
