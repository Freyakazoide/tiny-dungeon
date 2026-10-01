import type { CounterId } from './profile';
import type { ProficiencyId } from './proficiencies';
import { TIER2_SPECS, type SpecRow } from './tier2Specs';

export interface Requirement {
  level: number;
  skills?: Partial<Record<ProficiencyId, number>>;
  counters?: Partial<Record<CounterId, number>>;
  /** Pelo menos `count` proficiências elementais no nível `level` (qualquer combinação: o Mago escolhe os elementos). */
  elements?: { count: number; level: number };
}
export interface ClassNode {
  id: string; name: string; tier: 0 | 1 | 2; parent: string | null;
  specialty?: string; requires: Requirement;
}

/** PLACEHOLDERS: calibrar com os números reais do Analyzer depois que o ritmo estiver fechado. */
export const COUNTER_TARGETS: Record<CounterId, number> = {
  crits: 5000, bossCrits: 500, damageTaken: 250_000, healingDone: 100_000, buffsApplied: 3000,
  dotDamage: 250_000, supportPotionsUsed: 500, bossKills: 50, goldEarned: 250_000, controlSpells: 2000,
};

const T1_LEVEL = 10;
const T2_LEVEL = 25;

const tier1 = (id: string, name: string, specialty: string, skill: ProficiencyId): ClassNode =>
  ({ id, name, tier: 1, parent: 'aprendiz', specialty, requires: { level: T1_LEVEL, skills: { [skill]: 25 } } });

/** Nó de Tier 2 a partir da linha da tabela: pura = 1 skill 38 (+ contador); com contador = skill 35 + contador; híbrida = 2 skills 35/35; elementos = N elementos livres. */
const spec = (row: SpecRow): ClassNode => {
  const skills = Object.fromEntries(Object.entries(row.skills)) as Requirement['skills'];
  const requires: Requirement = { level: T2_LEVEL, ...(Object.keys(skills ?? {}).length ? { skills } : {}), ...(row.counter ? { counters: { [row.counter]: COUNTER_TARGETS[row.counter] } } : {}), ...(row.elements ? { elements: row.elements } : {}) };
  return { id: row.id, name: row.name, tier: 2, parent: row.parent, specialty: row.tagline, requires };
};

export const CLASS_NODES: ClassNode[] = [
  { id: 'aprendiz', name: 'Squire', tier: 0, parent: null, requires: { level: 1 } },

  // ---------- Tier 1 (15 classes base) ----------
  tier1('guerreiro', 'Guerreiro', 'Dano físico corpo a corpo', 'melee'),
  tier1('guardiao', 'Guardião', 'Tanque e defesa', 'defense'),
  tier1('ladino', 'Ladino', 'Dano físico rápido', 'melee'),
  tier1('cacador', 'Caçador', 'Dano físico à distância', 'ranged'),
  tier1('mago', 'Mago', 'Dano mágico em área', 'magic'),
  tier1('clerigo', 'Clérigo', 'Cura e suporte', 'holy'),
  tier1('bardo', 'Bardo', 'Suporte e buffs', 'magic'),
  tier1('monge', 'Monge', 'Dano físico desarmado', 'physical'),
  tier1('bruxo', 'Bruxo', 'Dano mágico contínuo', 'death'),
  tier1('alquimista', 'Alquimista', 'Poções e dano por veneno', 'poison'),
  tier1('mercenario', 'Mercenário', 'Dano físico pesado', 'melee'),
  tier1('mestre_runico', 'Mestre Rúnico', 'Magia e combate híbrido', 'magic'),
  tier1('ilusionista', 'Ilusionista', 'Controle de grupo', 'psychic'),
  tier1('druida', 'Druida', 'Magia da natureza e cura', 'earth'),
  tier1('artilheiro', 'Artilheiro', 'Dano físico explosivo', 'ranged'),

  // ---------- Tier 2: 90 especializações (15 classes × 6), geradas de tools/classes/specs.py
  ...TIER2_SPECS.map(spec),
];

/**
 * Só os nós com kit pronto são jogáveis; o resto aparece como "Em breve" e não deixa evoluir (a evolução é
 * irreversível: ninguém deve ficar preso numa classe vazia). Para liberar, cadastre o kit e inclua o id aqui.
 */
export const PLAYABLE_NODES: ReadonlySet<string> = new Set(['aprendiz', ...CLASS_NODES.filter(n => n.tier <= 2).map(n => n.id)]);
export const isPlayable = (id: string) => PLAYABLE_NODES.has(id);

export const CLASS_BY_ID: Record<string, ClassNode> = Object.fromEntries(CLASS_NODES.map(n => [n.id, n]));
export const childrenOf = (id: string) => CLASS_NODES.filter(n => n.parent === id);
