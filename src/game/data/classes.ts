import type { ClassId, Stats } from '../core/types';

export interface ClassDef { id: ClassId; name: string; color: number; base: Stats; growth: Partial<Stats>; weaponSkill: 'fist' | 'sword' | 'distance' | 'magic'; }
export const CLASSES: Record<ClassId, ClassDef> = {
  knight: { id: 'knight', name: 'Knight', color: 0x4b78a8, weaponSkill: 'sword', base: { maxHp: 260, maxMana: 45, attack: 21, defense: 18, attackSpeed: 0.85, crit: .06, resistance: .12, magicPower: 2 }, growth: { maxHp: 28, attack: 3, defense: 2.4 } },
  monk: { id: 'monk', name: 'Monk', color: 0xb47b45, weaponSkill: 'fist', base: { maxHp: 205, maxMana: 70, attack: 18, defense: 11, attackSpeed: 1.45, crit: .1, resistance: .06, magicPower: 4 }, growth: { maxHp: 20, attack: 2.7, attackSpeed: .018 } },
  paladin: { id: 'paladin', name: 'Paladin', color: 0xbaa74b, weaponSkill: 'distance', base: { maxHp: 190, maxMana: 85, attack: 23, defense: 9, attackSpeed: 1.05, crit: .17, resistance: .07, magicPower: 5 }, growth: { maxHp: 18, attack: 3.2, crit: .003 } },
  necromancer: { id: 'necromancer', name: 'Necromancer', color: 0x76519c, weaponSkill: 'magic', base: { maxHp: 145, maxMana: 210, attack: 11, defense: 6, attackSpeed: .8, crit: .09, resistance: .04, magicPower: 26 }, growth: { maxHp: 12, maxMana: 24, magicPower: 4 } },
  druid: { id: 'druid', name: 'Druid', color: 0x579b62, weaponSkill: 'magic', base: { maxHp: 165, maxMana: 190, attack: 10, defense: 8, attackSpeed: .85, crit: .07, resistance: .08, magicPower: 22 }, growth: { maxHp: 15, maxMana: 21, magicPower: 3.5 } }
};
