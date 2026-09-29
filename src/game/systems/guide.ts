import type { Character } from '../core/types';
import { CLASS_BY_ID, CLASS_NODES, childrenOf, type ClassNode } from '../rpg/classTree';
import { TRIES_PER_SECOND, etaSeconds } from '../rpg/curves';
import { evolutionOptions } from '../rpg/evolution';
import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../rpg/proficiencies';
import { COUNTER_IDS, type CounterId } from '../rpg/profile';
import { runtime } from '../rpg/runtime';
import { trainingNow } from './progression';

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
  key: string; kind: 'level' | 'skill' | 'counter'; label: string;
  /** Valor atual; null quando o contador ainda não é contabilizado (não mostrar progresso). */
  have: number | null; need: number; met: boolean; howTo: string; untracked: boolean;
  /** Só para proficiências: treinando agora? e quantos segundos faltam (null = parado / sem estimativa). */
  training?: boolean; eta?: number | null;
}

/** Checklist de requisitos de um nó para o personagem, com ETA pela taxa atual de treino. */
export function requirementRows(character: Character, node: ClassNode): RequirementRow[] {
  const { profile } = character, { level, skills = {}, counters = {} } = node.requires;
  const rate = TRIES_PER_SECOND * runtime.trainScale;
  const rows: RequirementRow[] = [{ key: 'level', kind: 'level', label: 'Nível do personagem', have: profile.level, need: level, met: profile.level >= level, howTo: 'ganhe XP em combate', untracked: false }];
  for (const [id, need] of Object.entries(skills) as [ProficiencyId, number][]) {
    const p = profile.proficiencies[id], met = p.level >= need, training = trainingNow(character, id);
    rows.push({ key: id, kind: 'skill', label: PROFICIENCIES[id].name, have: p.level, need, met, howTo: HOW_TO_PROFICIENCY[id], untracked: false, training, eta: met || !training ? null : etaSeconds(id, p.level, p.tries, need, rate) });
  }
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
