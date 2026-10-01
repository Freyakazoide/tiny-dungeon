import type { SpellDef } from '../core/types';

/** Forma visual de um ataque: golpes e flechas, ou um dos 9 elementos. */
export type FxKind = 'slash' | 'arrow' | 'fire' | 'ice' | 'energy' | 'earth' | 'poison' | 'holy' | 'death' | 'physical' | 'psychic';
export const FX_KINDS: readonly FxKind[] = ['slash', 'arrow', 'fire', 'ice', 'energy', 'earth', 'poison', 'holy', 'death', 'physical', 'psychic'];

/** Ataque básico: depende da proficiência da arma (corpo a corpo = corte; à distância = flecha). */
export const basicFx = (skill: string): FxKind => skill === 'ranged' ? 'arrow' : 'slash';

/** Magia de dano: o elemento declarado; sem ele, pelo tipo do kit (arqueiro = flecha, lutador = corte, mago = energia, necromante = morte). */
export function spellFx(spell: Pick<SpellDef, 'id' | 'classId' | 'element'>): FxKind {
  if (spell.element && FX_KINDS.includes(spell.element as FxKind)) return spell.element as FxKind;
  if (spell.classId === 'hunter' || spell.classId === 'paladin' && /shot|volley/.test(spell.id)) return 'arrow';
  if (spell.classId === 'mage' || spell.classId === 'runemaster') return 'energy';
  if (spell.classId === 'gunner') return 'arrow';
  if (spell.classId === 'bard' || spell.classId === 'illusionist') return 'psychic';
  if (spell.classId === 'alchemist') return 'poison';
  if (spell.classId === 'paladin') return 'holy';
  if (spell.classId === 'druid') return 'earth';
  if (spell.classId === 'guardian' || spell.classId === 'monk') return 'physical';
  if (spell.classId === 'necromancer') return 'death';
  return 'slash';
}
