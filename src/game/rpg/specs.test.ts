import { describe, expect, it } from 'vitest';
import { CLASS_NODES, childrenOf } from './classTree';
import { NODE_PASSIVES } from './passives';
import { TIER2_SPECS } from './tier2Specs';
import { SPELLS } from '../data/spells';
import { TALENT_TREES } from '../data/talentTrees';
import { kitOfNode } from '../data/classes';

describe('as 90 especializações (15 classes × 6)', () => {
  const specs = CLASS_NODES.filter(n => n.tier === 2);
  it('cada classe base tem 3 puras (1 proficiência, com ou sem contador) e 3 híbridas (2 proficiências ou elementos livres)', () => {
    expect(specs).toHaveLength(90); expect(TIER2_SPECS).toHaveLength(90);
    for (const base of CLASS_NODES.filter(n => n.tier === 1)) {
      const kids = TIER2_SPECS.filter(s => s.parent === base.id);
      expect(kids.filter(s => s.kind === 'P' || s.kind === 'C'), base.id).toHaveLength(3); expect(kids.filter(s => s.kind === 'H' || s.kind === 'E'), base.id).toHaveLength(3);
      expect(new Set(kids.map(s => s.name)).size).toBe(6); expect(childrenOf(base.id)).toHaveLength(6);
    }
    for (const s of TIER2_SPECS) {
      if (s.kind === 'H') expect(Object.keys(s.skills), s.id).toHaveLength(2);
      if (s.kind === 'P' || s.kind === 'C') expect(Object.keys(s.skills), s.id).toHaveLength(1);
      if (s.kind === 'E') expect(s.elements, s.id).toBeTruthy();
    }
  });
  it('toda especialização tem passiva, uma magia própria, uma grade de talentos e o kit do pai', () => {
    for (const n of specs) {
      expect(NODE_PASSIVES[n.id]?.effects.length, n.id).toBeGreaterThan(0); expect(NODE_PASSIVES[n.id].description, n.id).toMatch(/%/);
      const spell = SPELLS.find(s => s.node === n.id); expect(spell, n.id).toBeTruthy(); expect(spell!.classId).toBe(kitOfNode(n.parent!));
      expect(TALENT_TREES[n.id]?.nodes.length, n.id).toBe(37);
      expect(n.specialty, n.id).toBeTruthy();
    }
  });
  it('o Mago não depende de elemento fixo: as híbridas pedem elementos livres, nenhuma exige um elemento específico', () => {
    const mage = TIER2_SPECS.filter(s => s.parent === 'mago');
    expect(mage.map(s => s.id).sort()).toEqual(['destruidor', 'elementalista', 'evocador', 'polimata', 'prismatico', 'ritualista']);
    for (const s of mage) expect(Object.keys(s.skills).every(k => k === 'magic'), s.id).toBe(true);
    expect(mage.filter(s => s.elements)).toHaveLength(3);
  });
});
