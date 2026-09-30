import { describe, expect, it } from 'vitest';
import { createCharacter } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { TALENT_TREES } from '../data/talentTrees';
import { canBuy, buyTalent } from './talentGrid';
import { characterStats, statBreakdown } from './progression';
import { SPELLS } from '../data/spells';
import type { Stats } from '../core/types';

const KEYS: (keyof Stats)[] = ['maxHp', 'maxMana', 'attack', 'defense', 'attackSpeed', 'crit', 'resistance', 'magicPower'];
const MULT: (keyof Stats)[] = ['maxHp', 'maxMana', 'attack', 'defense', 'attackSpeed', 'magicPower'];

/** Refaz a conta de characterStats só com as parcelas: planas somam, percentuais multiplicam (ou somam em crit/res). */
function replay(parts: { value: number; kind: 'flat' | 'percent' }[], key: keyof Stats) {
  const flat = parts.filter(p => p.kind === 'flat').reduce((a, p) => a + p.value, 0);
  const percent = parts.filter(p => p.kind === 'percent').reduce((a, p) => a + p.value, 0);
  return MULT.includes(key) ? flat * (1 + percent) : flat + percent;
}

function invest(c: ReturnType<typeof createCharacter>) {
  c.profile.level = 30;
  for (let guard = 0; guard < 400; guard++) {
    const node = c.profile.classPath.flatMap(t => TALENT_TREES[t].nodes).find(n => canBuy(c, n.id).ok);
    if (!node) break; buyTalent(c, node.id);
  }
}

describe('statBreakdown', () => {
  for (const classId of ['squire', 'mage', 'knight'] as const) for (const talents of [false, true]) {
    it(`${classId}${talents ? ' com talentos' : ''}: soma das parcelas = characterStats`, () => {
      const state = partyState(); const c = createCharacter(classId); c.profile.level = 12;
      if (classId === 'knight') c.profile.classPath = ['aprendiz', 'guerreiro'];
      if (talents) invest(c);
      for (const key of KEYS) {
        const b = statBreakdown(c, state, key), total = characterStats(c, state)[key];
        expect(b.total).toBe(total);
        const sum = replay(b.parts, key), expected = key === 'maxHp' || key === 'maxMana' ? Math.round(sum) : Math.min(b.cap ?? Infinity, sum);
        expect(expected, `${classId} ${key}`).toBeCloseTo(total, 6);
        if (key === 'crit' || key === 'resistance') expect(b.cap).toBe(.75); else expect(b.cap).toBeUndefined();
      }
    });
  }
});

describe('nomes de magia em português', () => {
  it('nenhum nome usa palavra da lista antiga', () => {
    const old = /\b(Strike|Cry|Blow|Guard|Cleave|Will|Execution|Flurry|Focus|Sweep|Palm|Shot|Volley|Light|Aim|Bolt|Barrier|Meteor|Mend|Regrowth|Thorns|Wrath)\b/;
    for (const s of Object.values(SPELLS)) expect(s.name, s.id).not.toMatch(old);
  });
});
