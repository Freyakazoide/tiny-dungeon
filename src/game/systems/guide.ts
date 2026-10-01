import type { Character, GameState, Stats } from '../core/types';
import { CLASS_BY_ID, CLASS_NODES, childrenOf, isPlayable, type ClassNode } from '../rpg/classTree';
import { kitOfNode } from '../data/classes';
import { SPELLS } from '../data/spells';
import { TALENT_TREES } from '../data/talentTrees';
import { AFFINITY } from '../rpg/affinity';
import { NODE_PASSIVES } from '../rpg/passives';
import { TRIES_PER_SECOND, etaSeconds } from '../rpg/curves';
import { elementsAtLevel, evolutionOptions } from '../rpg/evolution';
import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../rpg/proficiencies';
import { COUNTER_IDS, type CounterId } from '../rpg/profile';
import { runtime } from '../rpg/runtime';
import { characterStats, spellAvailable, trainingNow, trainMultiplier } from './progression';
import { talentPointsAvailable } from './talentGrid';

export const COUNTER_NAMES: Record<CounterId, string> = {
  crits: 'Críticos', bossCrits: 'Críticos em chefes', damageTaken: 'Dano sofrido', healingDone: 'Cura total',
  buffsApplied: 'Buffs aplicados', dotDamage: 'Dano contínuo', supportPotionsUsed: 'Poções de suporte usadas',
  bossKills: 'Chefes abatidos', goldEarned: 'Ouro acumulado', controlSpells: 'Feitiços de controle',
};

/** Contadores que o combate ainda não alimenta: mostram "em breve" e nunca progresso falso. Combustão alimenta dotDamage e os controles alimentam controlSpells. */
export const UNTRACKED_COUNTERS: readonly CounterId[] = [];

const ELEMENT_HOW = 'equipe a magia do elemento e coloque-o como foco de treino';
export const HOW_TO_PROFICIENCY: Record<ProficiencyId, string> = {
  melee: 'equipe uma arma corpo a corpo e combata',
  ranged: 'equipe um arco e combata',
  defense: 'equipe escudo e apanhe na linha da frente',
  magic: 'conjure magias do elemento em foco',
  fire: ELEMENT_HOW, ice: ELEMENT_HOW, energy: ELEMENT_HOW, earth: ELEMENT_HOW, poison: ELEMENT_HOW,
  holy: ELEMENT_HOW, death: ELEMENT_HOW, physical: ELEMENT_HOW, psychic: ELEMENT_HOW,
};
export const HOW_TO_COUNTER = 'contador já contabilizado em combate';
export const HOW_TO_UNTRACKED = 'em breve: ainda não é contabilizado';

export interface RequirementRow {
  key: string; kind: 'level' | 'skill' | 'counter' | 'elements'; label: string;
  /** Valor atual; null quando o contador ainda não é contabilizado (não mostrar progresso). */
  have: number | null; need: number; met: boolean; howTo: string; untracked: boolean;
  /** Só para proficiências: treinando agora? e quantos segundos faltam (null = parado / sem estimativa). */
  training?: boolean; eta?: number | null;
}

/** Checklist de requisitos de um nó para o personagem, com ETA pela taxa atual de treino. */
export function requirementRows(character: Character, node: ClassNode): RequirementRow[] {
  const { profile } = character, { level, skills = {}, counters = {}, elements } = node.requires;
  const rate = TRIES_PER_SECOND * runtime.trainScale;
  const rows: RequirementRow[] = [{ key: 'level', kind: 'level', label: 'Nível do personagem', have: profile.level, need: level, met: profile.level >= level, howTo: 'ganhe XP em combate', untracked: false }];
  for (const [id, need] of Object.entries(skills) as [ProficiencyId, number][]) {
    const p = profile.proficiencies[id], met = p.level >= need, training = trainingNow(character, id);
    rows.push({ key: id, kind: 'skill', label: PROFICIENCIES[id].name, have: p.level, need, met, howTo: HOW_TO_PROFICIENCY[id], untracked: false, training, eta: met || !training || !trainMultiplier(character, id) ? null : etaSeconds(id, p.level, p.tries, need, rate * trainMultiplier(character, id)) });
  }
  if (elements) { const have = elementsAtLevel(profile, elements.level); rows.push({ key: 'elements', kind: 'elements', label: `Elementos no nível ${elements.level}`, have, need: elements.count, met: have >= elements.count, howTo: 'treine magias de elementos diferentes; qualquer combinação vale', untracked: false }); }
  for (const [id, need] of Object.entries(counters) as [CounterId, number][]) {
    const untracked = UNTRACKED_COUNTERS.includes(id), have = profile.counters[id] ?? 0;
    rows.push({ key: id, kind: 'counter', label: COUNTER_NAMES[id], have: untracked ? null : have, need, met: !untracked && have >= need, howTo: untracked ? HOW_TO_UNTRACKED : HOW_TO_COUNTER, untracked });
  }
  return rows;
}

const skillOrder = (node: ClassNode) => Math.min(...Object.keys(node.requires.skills ?? {}).map(id => PROFICIENCY_IDS.indexOf(id as ProficiencyId)), 99);

/** Próximo passo: filhos diretos do nó atual, ordenados pela proficiência exigida, cada um com seu checklist. */
export function nextSteps(character: Character) {
  const met = new Map(evolutionOptions(character.profile).map(o => [o.node.id, o.met]));
  return childrenOf(character.profile.classId)
    .sort((a, b) => skillOrder(a) - skillOrder(b) || a.name.localeCompare(b.name))
    .map(node => ({ node, rows: requirementRows(character, node), ready: met.get(node.id) ?? false }));
}

/** Árvore completa: classes base ainda abertas e caminhos descartados (todas as outras classes base, só leitura). */
export function treeSplit(character: Character) {
  const chosen = character.profile.classPath[1];
  const bases = CLASS_NODES.filter(n => n.tier === 1);
  return {
    active: chosen ? bases.filter(n => n.id === chosen) : bases,
    discarded: chosen ? bases.filter(n => n.id !== chosen) : [],
  };
}

export const pathNames = (character: Character) => character.profile.classPath.map(id => CLASS_BY_ID[id].name);
export { COUNTER_IDS };

/** Progresso rumo a um nó: o pior requisito (gargalo), nunca a média. Contador não contabilizado conta 0 e nunca vira "pronta". */
export interface ClassProgress { ratio: number; ready: boolean; bottleneck?: string; untracked: boolean }
export function classProgress(character: Character, node: ClassNode): ClassProgress {
  let ratio = 1, bottleneck: string | undefined, untracked = false;
  for (const row of requirementRows(character, node)) {
    const r = row.untracked || row.have === null ? 0 : Math.min(1, row.need > 0 ? row.have / row.need : 1);
    if (row.untracked) untracked = true;
    if (r < ratio || (r === ratio && r < 1 && !bottleneck)) { ratio = r; bottleneck = row.label; }
  }
  return { ratio, ready: ratio >= 1 && !untracked, bottleneck: ratio < 1 ? bottleneck : undefined, untracked };
}

export type Step = ReturnType<typeof nextSteps>[number] & { progress: ClassProgress; playable: boolean };
export interface ClassGroups { ready: Step[]; progress: Step[]; readySoon: Step[]; soon: Step[] }
/** Divide os próximos passos em prontas (jogáveis), em progresso, prontas sem kit e em breve. */
export function groupClasses(character: Character): ClassGroups {
  const steps: Step[] = nextSteps(character).map(step => ({ ...step, progress: classProgress(character, step.node), playable: isPlayable(step.node.id) }));
  const byRatio = (a: Step, b: Step) => b.progress.ratio - a.progress.ratio || a.node.name.localeCompare(b.node.name);
  return {
    ready: steps.filter(s => s.playable && s.progress.ready).sort(byRatio),
    progress: steps.filter(s => s.playable && !s.progress.ready).sort(byRatio),
    readySoon: steps.filter(s => !s.playable && s.progress.ready).sort(byRatio),
    soon: steps.filter(s => !s.playable && !s.progress.ready).sort(byRatio),
  };
}

export interface EvolutionPreview {
  node: ClassNode; playable: boolean; ready: boolean;
  stats: { key: keyof Stats; before: number; after: number }[];
  kitSpells: string[]; nodeSpells: string[];
  passive?: { name: string; description: string };
  affinity: Record<ProficiencyId, number>;
  talentTree?: { name: string; nodes: number; freePoints: number };
  lostOptions: number;
}
const PREVIEW_KEYS: (keyof Stats)[] = ['maxHp', 'maxMana', 'attack', 'defense', 'attackSpeed', 'crit', 'resistance', 'magicPower'];

/**
 * O que a evolução muda, sem tocar no estado: clona o personagem, aplica a mesma troca de identidade de `evolve`
 * (kit, classId e classPath) e compara `characterStats`. Magias: as do kit que entram e, no Tier 2, as do nó nos slots livres.
 */
export function previewEvolution(state: GameState, character: Character, nodeId: string): EvolutionPreview {
  const node = CLASS_BY_ID[nodeId], playable = isPlayable(nodeId);
  const affinity = Object.fromEntries(PROFICIENCY_IDS.map(id => [id, AFFINITY[nodeId]?.[id] ?? 1])) as Record<ProficiencyId, number>;
  const tree = TALENT_TREES[nodeId === 'aprendiz' ? 'squire' : nodeId];
  const base = {
    node, playable, ready: classProgress(character, node).ready, affinity, passive: NODE_PASSIVES[nodeId] ? { name: NODE_PASSIVES[nodeId].name, description: NODE_PASSIVES[nodeId].description } : undefined,
    talentTree: tree ? { name: tree.name, nodes: tree.nodeCount, freePoints: Math.max(0, talentPointsAvailable(character)) } : undefined,
    lostOptions: node.parent ? childrenOf(node.parent).length - 1 : 0,
  };
  if (!playable) return { ...base, stats: [], kitSpells: [], nodeSpells: [] };
  const clone = structuredClone(character);
  const kit = kitOfNode(nodeId), before = characterStats(character, state);
  clone.profile.classId = nodeId; clone.profile.classPath = [...clone.profile.classPath, nodeId];
  let kitSpells: string[] = [], slots = clone.spellSlots.length;
  if (kit !== clone.classId) {
    const kept = clone.spellSlots.filter(sid => SPELLS.find(sp => sp.id === sid)?.universal).slice(0, 1);
    const fresh = SPELLS.filter(sp => sp.classId === kit && !sp.universal && !sp.node);
    kitSpells = fresh.slice(0, Math.max(0, 4 - kept.length)).map(sp => sp.name); slots = Math.min(4, kept.length + fresh.length);
    clone.classId = kit;
  }
  const nodeSpells = SPELLS.filter(sp => sp.node === nodeId && spellAvailable(clone, sp)).slice(0, Math.max(0, 4 - slots)).map(sp => sp.name);
  const after = characterStats(clone, state);
  return { ...base, stats: PREVIEW_KEYS.map(key => ({ key, before: before[key], after: after[key] })), kitSpells, nodeSpells };
}
