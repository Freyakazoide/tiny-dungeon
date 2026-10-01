import type { ClassId, Stats } from '../core/types';
import type { ProficiencyId } from '../rpg/proficiencies';
import { CLASS_BY_ID } from '../rpg/classTree';

export interface ClassDef { id: ClassId; name: string; color: number; base: Stats; growth: Partial<Stats>; weaponSkill: ProficiencyId; }
export const CLASSES: Record<ClassId, ClassDef> = {
  squire: { id: 'squire', name: 'Squire', color: 0x8f9aa8, weaponSkill: 'melee', base: { maxHp: 230, maxMana: 55, attack: 19, defense: 14, attackSpeed: 0.95, crit: .06, resistance: .09, magicPower: 3 }, growth: { maxHp: 23, maxMana: 3, attack: 2.8, defense: 1.9 } },
  hunter: { id: 'hunter', name: 'Caçador', color: 0x6d8f3a, weaponSkill: 'ranged', base: { maxHp: 190, maxMana: 85, attack: 23, defense: 9, attackSpeed: 1.05, crit: .17, resistance: .07, magicPower: 5 }, growth: { maxHp: 18, attack: 3.2, crit: .003 } },
  mage: { id: 'mage', name: 'Mago', color: 0x4b6fd6, weaponSkill: 'magic', base: { maxHp: 170, maxMana: 200, attack: 10, defense: 7, attackSpeed: .85, crit: .07, resistance: .06, magicPower: 24 }, growth: { maxHp: 14, maxMana: 22, magicPower: 3.8 } },
  knight: { id: 'knight', name: 'Guerreiro', color: 0x4b78a8, weaponSkill: 'melee', base: { maxHp: 260, maxMana: 45, attack: 21, defense: 18, attackSpeed: 0.85, crit: .06, resistance: .12, magicPower: 2 }, growth: { maxHp: 28, attack: 3, defense: 2.4 } },
  monk: { id: 'monk', name: 'Monge', color: 0xb47b45, weaponSkill: 'melee', base: { maxHp: 205, maxMana: 70, attack: 18, defense: 11, attackSpeed: 1.45, crit: .1, resistance: .06, magicPower: 4 }, growth: { maxHp: 20, attack: 2.7, attackSpeed: .018 } },
  paladin: { id: 'paladin', name: 'Clérigo', color: 0xe0d27a, weaponSkill: 'magic', base: { maxHp: 195, maxMana: 185, attack: 11, defense: 11, attackSpeed: .85, crit: .05, resistance: .11, magicPower: 20 }, growth: { maxHp: 18, maxMana: 20, magicPower: 3.3, defense: 1.2 } },
  necromancer: { id: 'necromancer', name: 'Bruxo', color: 0x76519c, weaponSkill: 'magic', base: { maxHp: 145, maxMana: 210, attack: 11, defense: 6, attackSpeed: .8, crit: .09, resistance: .04, magicPower: 26 }, growth: { maxHp: 12, maxMana: 24, magicPower: 4 } },
  druid: { id: 'druid', name: 'Druida', color: 0x579b62, weaponSkill: 'magic', base: { maxHp: 165, maxMana: 190, attack: 10, defense: 8, attackSpeed: .85, crit: .07, resistance: .08, magicPower: 22 }, growth: { maxHp: 15, maxMana: 21, magicPower: 3.5 } },
  guardian: { id: 'guardian', name: 'Guardião', color: 0x5f8fb8, weaponSkill: 'melee', base: { maxHp: 285, maxMana: 50, attack: 16, defense: 21, attackSpeed: .8, crit: .04, resistance: .15, magicPower: 3 }, growth: { maxHp: 31, defense: 2.8, attack: 2.2 } },
  rogue: { id: 'rogue', name: 'Ladino', color: 0x8a5ab0, weaponSkill: 'melee', base: { maxHp: 185, maxMana: 70, attack: 22, defense: 8, attackSpeed: 1.5, crit: .22, resistance: .05, magicPower: 4 }, growth: { maxHp: 17, attack: 3.1, attackSpeed: .02, crit: .004 } },
  bard: { id: 'bard', name: 'Bardo', color: 0xd0904a, weaponSkill: 'magic', base: { maxHp: 175, maxMana: 175, attack: 9, defense: 8, attackSpeed: .9, crit: .06, resistance: .08, magicPower: 18 }, growth: { maxHp: 15, maxMana: 19, magicPower: 3.1 } },
  alchemist: { id: 'alchemist', name: 'Alquimista', color: 0x7cab3c, weaponSkill: 'ranged', base: { maxHp: 180, maxMana: 120, attack: 19, defense: 9, attackSpeed: 1, crit: .08, resistance: .07, magicPower: 12 }, growth: { maxHp: 17, maxMana: 11, attack: 2.6, magicPower: 1.8 } },
  mercenary: { id: 'mercenary', name: 'Mercenário', color: 0xb8593f, weaponSkill: 'melee', base: { maxHp: 245, maxMana: 40, attack: 26, defense: 14, attackSpeed: .75, crit: .09, resistance: .07, magicPower: 2 }, growth: { maxHp: 26, attack: 3.7, defense: 1.9 } },
  runemaster: { id: 'runemaster', name: 'Mestre Rúnico', color: 0x3fa6b0, weaponSkill: 'magic', base: { maxHp: 210, maxMana: 140, attack: 17, defense: 12, attackSpeed: .9, crit: .07, resistance: .1, magicPower: 16 }, growth: { maxHp: 21, maxMana: 13, attack: 2.2, magicPower: 2.4, defense: 1.5 } },
  illusionist: { id: 'illusionist', name: 'Ilusionista', color: 0xc45f9c, weaponSkill: 'magic', base: { maxHp: 165, maxMana: 195, attack: 9, defense: 7, attackSpeed: .85, crit: .07, resistance: .07, magicPower: 23 }, growth: { maxHp: 14, maxMana: 22, magicPower: 3.6 } },
  gunner: { id: 'gunner', name: 'Artilheiro', color: 0xd9a03a, weaponSkill: 'ranged', base: { maxHp: 195, maxMana: 60, attack: 27, defense: 10, attackSpeed: .9, crit: .12, resistance: .06, magicPower: 6 }, growth: { maxHp: 18, attack: 3.6, crit: .003 } },
};

/**
 * Kit de combate (atributos, magias, talentos) de um nó da árvore de classes. Enquanto uma classe
 * não tem kit próprio ela herda o do ancestral mais próximo que tenha (Tier 2 herda o do Tier 1).
 */
const KIT_BY_NODE: Record<string, ClassId> = {
  aprendiz: 'squire', guerreiro: 'knight', cacador: 'hunter', mago: 'mage', guardiao: 'guardian', ladino: 'rogue', clerigo: 'paladin', bardo: 'bard', monge: 'monk', bruxo: 'necromancer',
  alquimista: 'alchemist', mercenario: 'mercenary', mestre_runico: 'runemaster', ilusionista: 'illusionist', druida: 'druid', artilheiro: 'gunner',
};
export const kitForNode = (nodeId: string, parentOf: (id: string) => string | null): ClassId => {
  for (let id: string | null = nodeId; id; id = parentOf(id)) if (KIT_BY_NODE[id]) return KIT_BY_NODE[id];
  return 'squire';
};
export const kitOfNode = (nodeId: string): ClassId => kitForNode(nodeId, id => CLASS_BY_ID[id]?.parent ?? null);
/** Kits do caminho percorrido (Squire primeiro): talentos e itens do histórico continuam valendo. */
export const kitsOfPath = (classPath: readonly string[]): ClassId[] => Array.from(new Set(classPath.map(kitOfNode)));
