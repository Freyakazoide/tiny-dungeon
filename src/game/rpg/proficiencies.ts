/**
 * Proficiências do jogo (planilha "Proficiências Elementais e Base").
 * Todas começam no nível 10, como no Tibia, e sobem por uso.
 */
export const PROFICIENCY_IDS = [
  'melee', 'ranged', 'defense', 'magic',
  'fire', 'ice', 'energy', 'earth', 'poison', 'holy', 'death', 'physical', 'psychic',
] as const;
export type ProficiencyId = (typeof PROFICIENCY_IDS)[number];
export type ProficiencyGroup = 'combat' | 'magic' | 'elemental';

/** `base`/`mult` são a planilha antiga (só `baseTries` os usa). O ritmo real vem de `effort` em rpg/curves.ts: 1 = padrão, maior = proficiência mais pesada. */
export interface ProficiencyDef { id: ProficiencyId; name: string; group: ProficiencyGroup; base: number; mult: number; effort: number; }

export const START_LEVEL = 10;
export const MAX_PROFICIENCY_LEVEL = 100;

const def = (id: ProficiencyId, name: string, group: ProficiencyGroup, base: number, mult: number): ProficiencyDef => ({ id, name, group, base, mult, effort: 1 });

export const PROFICIENCIES: Record<ProficiencyId, ProficiencyDef> = {
  melee:    def('melee', 'Melee', 'combat', 10, 1.1),
  ranged:   def('ranged', 'Ranged', 'combat', 10, 1.1),
  defense:  def('defense', 'Defesa', 'combat', 10, 1.1),
  magic:    def('magic', 'Magia', 'magic', 20, 1.15),
  fire:     def('fire', 'Fogo', 'elemental', 15, 1.12),
  ice:      def('ice', 'Gelo', 'elemental', 15, 1.12),
  energy:   def('energy', 'Energia', 'elemental', 15, 1.12),
  earth:    def('earth', 'Terra', 'elemental', 15, 1.12),
  poison:   def('poison', 'Veneno', 'elemental', 15, 1.12),
  holy:     def('holy', 'Sagrado', 'elemental', 15, 1.12),
  death:    def('death', 'Morte', 'elemental', 15, 1.12),
  physical: def('physical', 'Físico', 'elemental', 15, 1.12),
  psychic:  def('psychic', 'Psíquico', 'elemental', 15, 1.12),
};
