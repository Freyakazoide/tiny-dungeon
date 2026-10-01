import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { cloneValidatedState } from '../persistence/validation';
import { itemById } from '../data/items';
import { STARTER_ELEMENTS, STARTER_WEAPONS } from '../data/starter';
import { AFFINITY } from './affinity';
import { GOAL_NODES, GOAL_PLAN, gateSkillOf, goalOfflineTargets, goalSummary, trainRingId } from './goals';
import { triesBonusPct, trainMultiplier } from '../systems/progression';

describe('objetivo de classe', () => {
  it('as 15 classes têm plano: arma e elemento válidos e nunca bloqueados pela afinidade', () => {
    expect(GOAL_NODES).toHaveLength(15);
    for (const n of GOAL_NODES) {
      const plan = GOAL_PLAN[n.id]; expect(plan, n.id).toBeTruthy();
      expect(STARTER_WEAPONS.some(w => w.id === plan.weaponId)).toBe(true); expect(STARTER_ELEMENTS).toContain(plan.element);
      expect(AFFINITY[n.id][plan.element], `${n.id} ${plan.element}`).toBeGreaterThan(0);
      expect(AFFINITY[n.id][gateSkillOf(n)], `${n.id} porta`).toBeGreaterThanOrEqual(1);
      expect(itemById(trainRingId(gateSkillOf(n)))?.trainBonus?.[gateSkillOf(n)]).toBe(15);
      expect(goalSummary(n.id)!.gateLevel).toBe(25);
    }
  });
  it('createParty com objetivo equipa o Anel do Aprendiz da porta, aponta o treino offline e acelera as tries', () => {
    const e = new GameEngine(); const specs = ['mago', 'guerreiro', 'bruxo'].map((goal, i) => ({ name: `P${i}`, goal, weaponId: GOAL_PLAN[goal].weaponId, element: GOAL_PLAN[goal].element }));
    expect(e.createParty(specs)).toBe(true);
    const [mage, war, lock] = e.getSnapshot().characters;
    expect(mage.goal).toBe('mago'); expect(mage.equipment.ring).toBe('apprentice_ring_magic'); expect(mage.profile.offlineTargets).toEqual(['fire', 'magic']);
    expect(war.equipment.ring).toBe('apprentice_ring_melee'); expect(lock.profile.offlineTargets).toEqual(['death', null]); expect(goalOfflineTargets('bruxo')).toEqual(['death', null]);
    expect(triesBonusPct(mage, 'magic')).toBe(15); expect(triesBonusPct(mage, 'melee')).toBe(0); expect(trainMultiplier(mage, 'magic')).toBeCloseTo(1.15);
    const bad = new GameEngine(); expect(bad.createParty([{ ...specs[0], goal: 'inexistente' }, specs[1], specs[2]])).toBe(false);
  });
  it('setGoal troca o anel e o treino; só enquanto Squire; goal inválido no save é descartado', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0];
    expect(e.setGoal(c.id, 'cacador')).toBe(true); expect(c.equipment.ring).toBe('apprentice_ring_ranged'); expect(c.profile.offlineTargets[1]).toBe('ranged');
    expect(e.setGoal(c.id, 'mago')).toBe(true); expect(c.equipment.ring).toBe('apprentice_ring_magic'); expect(e.setGoal(c.id, 'x')).toBe(false);
    expect(e.setGoal(c.id, null)).toBe(true); expect(c.goal).toBeUndefined(); expect(c.equipment.ring).toBeUndefined();
    e.setGoal(c.id, 'mago'); const raw = JSON.parse(JSON.stringify(e.getSnapshot())); raw.characters[0].goal = 'lixo';
    expect(cloneValidatedState(raw).characters[0].goal).toBeUndefined();
    e.evolve(c.id, 'mago', { force: true }); expect(e.setGoal(c.id, 'guerreiro')).toBe(false);
    const loaded = cloneValidatedState(JSON.parse(JSON.stringify(e.getSnapshot()))); expect(loaded.characters[0].equipment.ring).toBe('apprentice_ring_magic');
  });
});
