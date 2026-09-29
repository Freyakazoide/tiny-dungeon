import type { CounterId } from './profile';
import type { ProficiencyId } from './proficiencies';

export interface Requirement {
  level: number;
  skills?: Partial<Record<ProficiencyId, number>>;
  counters?: Partial<Record<CounterId, number>>;
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

const pure = (id: string, name: string, parent: string, skill: ProficiencyId, counter?: CounterId): ClassNode =>
  ({ id, name, tier: 2, parent, requires: { level: T2_LEVEL, skills: { [skill]: 40 }, ...(counter && { counters: { [counter]: COUNTER_TARGETS[counter] } }) } });

const hybrid = (id: string, name: string, parent: string, a: ProficiencyId, b: ProficiencyId): ClassNode =>
  ({ id, name, tier: 2, parent, requires: { level: T2_LEVEL, skills: { [a]: 35, [b]: 35 } } });

/** Subclasse com uma proficiência em 25 mais um contador vitalício. */
const counted = (id: string, name: string, parent: string, skill: ProficiencyId, counter: CounterId): ClassNode =>
  ({ id, name, tier: 2, parent, requires: { level: T2_LEVEL, skills: { [skill]: 35 }, counters: { [counter]: COUNTER_TARGETS[counter] } } });

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

  // ---------- Tier 2: Mago (9 puras + 9 híbridas) ----------
  pure('piromante', 'Piromante', 'mago', 'fire'),
  pure('criomante', 'Criomante', 'mago', 'ice'),
  pure('eletromante', 'Eletromante', 'mago', 'energy'),
  pure('geomante', 'Geomante', 'mago', 'earth'),
  pure('miasmante', 'Miasmante', 'mago', 'poison'),
  pure('teurgo', 'Teurgo', 'mago', 'holy'),
  pure('lich', 'Lich', 'mago', 'death'),
  pure('cinetico', 'Cinético', 'mago', 'physical'),
  pure('psionista', 'Psionista', 'mago', 'psychic'),
  hybrid('infernalista', 'Infernalista', 'mago', 'fire', 'death'),
  hybrid('tempestuoso', 'Tempestuoso', 'mago', 'energy', 'earth'),
  hybrid('glaciomante_de_impacto', 'Glaciomante de Impacto', 'mago', 'ice', 'physical'),
  hybrid('flagelo_miasmatico', 'Flagelo Miasmático', 'mago', 'death', 'poison'),
  hybrid('inquisidor_mental', 'Inquisidor Mental', 'mago', 'holy', 'psychic'),
  hybrid('bio_geomante', 'Bio-Geomante', 'mago', 'earth', 'poison'),
  hybrid('arcanista_de_plasma', 'Arcanista de Plasma', 'mago', 'fire', 'energy'),
  hybrid('singularista', 'Singularista', 'mago', 'physical', 'energy'),
  hybrid('dominador_sombrio', 'Dominador Sombrio', 'mago', 'psychic', 'death'),

  // ---------- Tier 2: demais classes (2 cada) ----------
  pure('gladiador', 'Gladiador', 'guerreiro', 'melee', 'crits'),
  pure('berserker', 'Berserker', 'guerreiro', 'melee', 'damageTaken'),
  hybrid('paladino', 'Paladino', 'guardiao', 'defense', 'holy'),
  hybrid('cavaleiro_negro', 'Cavaleiro Negro', 'guardiao', 'defense', 'death'),
  pure('assassino', 'Assassino', 'ladino', 'melee', 'bossCrits'),
  hybrid('mestre_das_sombras', 'Mestre das Sombras', 'ladino', 'melee', 'death'),
  pure('atirador_de_elite', 'Atirador de Elite', 'cacador', 'ranged'),
  hybrid('mestre_das_feras', 'Mestre das Feras', 'cacador', 'ranged', 'earth'),

  counted('sumo_sacerdote', 'Sumo Sacerdote', 'clerigo', 'holy', 'healingDone'),
  hybrid('inquisidor', 'Inquisidor', 'clerigo', 'holy', 'magic'),
  counted('maestro', 'Maestro', 'bardo', 'magic', 'buffsApplied'),
  hybrid('menestrel_do_caos', 'Menestrel do Caos', 'bardo', 'magic', 'psychic'),
  hybrid('mestre_do_chi', 'Mestre do Chi', 'monge', 'physical', 'magic'),
  hybrid('punho_de_ferro', 'Punho de Ferro', 'monge', 'physical', 'defense'),
  pure('necromante', 'Necromante', 'bruxo', 'death'),
  counted('epidemiologista', 'Epidemiologista', 'bruxo', 'poison', 'dotDamage'),
  hybrid('mestre_bombardeiro', 'Mestre Bombardeiro', 'alquimista', 'ranged', 'fire'),
  counted('transmutador', 'Transmutador', 'alquimista', 'poison', 'supportPotionsUsed'),
  counted('cacador_de_recompensas', 'Caçador de Recompensas', 'mercenario', 'melee', 'bossKills'),
  counted('corsario', 'Corsário', 'mercenario', 'melee', 'goldEarned'),
  hybrid('forjador_de_laminas', 'Forjador de Lâminas', 'mestre_runico', 'magic', 'melee'),
  hybrid('guardiao_das_runas', 'Guardião das Runas', 'mestre_runico', 'magic', 'defense'),
  hybrid('mestre_dos_espelhos', 'Mestre dos Espelhos', 'ilusionista', 'psychic', 'magic'),
  counted('hipnotizador', 'Hipnotizador', 'ilusionista', 'psychic', 'controlSpells'),
  hybrid('forma_feral', 'Forma Feral', 'druida', 'earth', 'melee'),
  hybrid('guardiao_da_natureza', 'Guardião da Natureza', 'druida', 'earth', 'magic'),
  hybrid('engenheiro_de_torretas', 'Engenheiro de Torretas', 'artilheiro', 'ranged', 'energy'),
  hybrid('exotraje', 'Exotraje', 'artilheiro', 'ranged', 'defense'),
];

/**
 * Só os nós com kit pronto são jogáveis; o resto aparece como "Em breve" e não deixa evoluir (a evolução é
 * irreversível: ninguém deve ficar preso numa classe vazia). Para liberar, cadastre o kit e inclua o id aqui.
 */
export const PLAYABLE_NODES: ReadonlySet<string> = new Set(['aprendiz', 'guerreiro', 'cacador', 'mago', 'piromante', 'criomante', 'arcanista_de_plasma']);
export const isPlayable = (id: string) => PLAYABLE_NODES.has(id);

export const CLASS_BY_ID: Record<string, ClassNode> = Object.fromEntries(CLASS_NODES.map(n => [n.id, n]));
export const childrenOf = (id: string) => CLASS_NODES.filter(n => n.parent === id);
