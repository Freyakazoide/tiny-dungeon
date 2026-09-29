import type { ClassId, Stats } from '../core/types';
import type { ProficiencyId } from '../rpg/proficiencies';
import { CLASS_BY_ID } from '../rpg/classTree';

export interface ClassDef { id: ClassId; name: string; color: number; base: Stats; growth: Partial<Stats>; weaponSkill: ProficiencyId; }
export const CLASSES: Record<ClassId, ClassDef> = {
  squire: { id: 'squire', name: 'Squire', color: 0x8f9aa8, weaponSkill: 'melee', base: { maxHp: 230, maxMana: 55, attack: 19, defense: 14, attackSpeed: 0.95, crit: .06, resistance: .09, magicPower: 3 }, growth: { maxHp: 23, maxMana: 3, attack: 2.8, defense: 1.9 } },
  hunter: { id: 'hunter', name: 'Caçador', color: 0x6d8f3a, weaponSkill: 'ranged', base: { maxHp: 190, maxMana: 85, attack: 23, defense: 9, attackSpeed: 1.05, crit: .17, resistance: .07, magicPower: 5 }, growth: { maxHp: 18, attack: 3.2, crit: .003 } },
  mage: { id: 'mage', name: 'Mago', color: 0x4b6fd6, weaponSkill: 'magic', base: { maxHp: 170, maxMana: 200, attack: 10, defense: 7, attackSpeed: .85, crit: .07, resistance: .06, magicPower: 24 }, growth: { maxHp: 14, maxMana: 22, magicPower: 3.8 } },
  knight: { id: 'knight', name: 'Knight', color: 0x4b78a8, weaponSkill: 'melee', base: { maxHp: 260, maxMana: 45, attack: 21, defense: 18, attackSpeed: 0.85, crit: .06, resistance: .12, magicPower: 2 }, growth: { maxHp: 28, attack: 3, defense: 2.4 } },
  monk: { id: 'monk', name: 'Monk', color: 0xb47b45, weaponSkill: 'melee', base: { maxHp: 205, maxMana: 70, attack: 18, defense: 11, attackSpeed: 1.45, crit: .1, resistance: .06, magicPower: 4 }, growth: { maxHp: 20, attack: 2.7, attackSpeed: .018 } },
  paladin: { id: 'paladin', name: 'Paladin', color: 0xbaa74b, weaponSkill: 'ranged', base: { maxHp: 190, maxMana: 85, attack: 23, defense: 9, attackSpeed: 1.05, crit: .17, resistance: .07, magicPower: 5 }, growth: { maxHp: 18, attack: 3.2, crit: .003 } },
  necromancer: { id: 'necromancer', name: 'Necromancer', color: 0x76519c, weaponSkill: 'magic', base: { maxHp: 145, maxMana: 210, attack: 11, defense: 6, attackSpeed: .8, crit: .09, resistance: .04, magicPower: 26 }, growth: { maxHp: 12, maxMana: 24, magicPower: 4 } },
  druid: { id: 'druid', name: 'Druid', color: 0x579b62, weaponSkill: 'magic', base: { maxHp: 165, maxMana: 190, attack: 10, defense: 8, attackSpeed: .85, crit: .07, resistance: .08, magicPower: 22 }, growth: { maxHp: 15, maxMana: 21, magicPower: 3.5 } }
};

/**
 * Kit de combate (atributos, magias, talentos) de um nó da árvore de classes. Enquanto uma classe
 * não tem kit próprio ela herda o do ancestral mais próximo que tenha (Tier 2 herda o do Tier 1).
 */
const KIT_BY_NODE: Record<string, ClassId> = { aprendiz: 'squire', guerreiro: 'knight', cacador: 'hunter', mago: 'mage' };
export const kitForNode = (nodeId: string, parentOf: (id: string) => string | null): ClassId => {
  for (let id: string | null = nodeId; id; id = parentOf(id)) if (KIT_BY_NODE[id]) return KIT_BY_NODE[id];
  return 'squire';
};
export const kitOfNode = (nodeId: string): ClassId => kitForNode(nodeId, id => CLASS_BY_ID[id]?.parent ?? null);
/** Kits do caminho percorrido (Squire primeiro): talentos e itens do histórico continuam valendo. */
export const kitsOfPath = (classPath: readonly string[]): ClassId[] => Array.from(new Set(classPath.map(kitOfNode)));
