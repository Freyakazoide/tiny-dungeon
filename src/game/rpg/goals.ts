import { CLASS_NODES, childrenOf, isPlayable, type ClassNode } from './classTree';
import { affinitySummary } from './affinity';
import { PROFICIENCIES, type ProficiencyId } from './proficiencies';
import type { ProficiencyId as P } from './proficiencies';

/** Classe-alvo (Tier 1) que o jogador escolhe ao criar o personagem: o Squire começa encaminhado para ela. */
export const GOAL_NODES: ClassNode[] = CLASS_NODES.filter(n => n.tier === 1);
export const isGoalId = (id: unknown): id is string => typeof id === 'string' && GOAL_NODES.some(n => n.id === id);

/** Proficiência exigida (a "porta") da classe: a que o Squire precisa treinar até 25. */
export const gateSkillOf = (node: ClassNode): ProficiencyId => Object.keys(node.requires.skills ?? {})[0] as ProficiencyId;

/** Arma, linha e elemento iniciais sugeridos para cada objetivo (nenhum é bloqueado pela afinidade da classe). */
export const GOAL_PLAN: Record<string, { weaponId: string; element: P }> = {
  guerreiro: { weaponId: 'rusty_sword', element: 'physical' }, guardiao: { weaponId: 'rusty_sword', element: 'holy' },
  ladino: { weaponId: 'knuckle_wraps', element: 'poison' }, cacador: { weaponId: 'oak_bow', element: 'earth' },
  mago: { weaponId: 'apprentice_staff', element: 'fire' }, clerigo: { weaponId: 'apprentice_staff', element: 'holy' },
  bardo: { weaponId: 'apprentice_staff', element: 'psychic' }, monge: { weaponId: 'knuckle_wraps', element: 'physical' },
  bruxo: { weaponId: 'apprentice_staff', element: 'death' }, alquimista: { weaponId: 'oak_bow', element: 'poison' },
  mercenario: { weaponId: 'rusty_sword', element: 'physical' }, mestre_runico: { weaponId: 'apprentice_staff', element: 'fire' },
  ilusionista: { weaponId: 'apprentice_staff', element: 'psychic' }, druida: { weaponId: 'apprentice_staff', element: 'earth' },
  artilheiro: { weaponId: 'oak_bow', element: 'energy' },
};

/** Anel de treino do Squire para uma proficiência (a porta da classe-alvo). */
export const trainRingId = (prof: ProficiencyId) => `apprentice_ring_${prof}`;
export const TRAIN_RING_BONUS = 15;

/** Vagas de treino offline sugeridas: o elemento inicial e a proficiência da porta (se for elemental, ela é o próprio elemento). */
export function goalOfflineTargets(goalId: string): [ProficiencyId | null, ProficiencyId | null] {
  const gate = gateSkillOf(GOAL_NODES.find(n => n.id === goalId)!), plan = GOAL_PLAN[goalId];
  return PROFICIENCIES[gate].group === 'elemental' ? [gate, null] : [plan.element, gate];
}

export interface GoalSummary { node: ClassNode; gate: ProficiencyId; gateLevel: number; level: number; playable: boolean; subclasses: number; affinity: string; plan: { weaponId: string; element: ProficiencyId } }
export function goalSummary(goalId: string): GoalSummary | undefined {
  const node = GOAL_NODES.find(n => n.id === goalId); if (!node) return undefined;
  const gate = gateSkillOf(node);
  return { node, gate, gateLevel: node.requires.skills![gate]!, level: node.requires.level, playable: isPlayable(node.id), subclasses: childrenOf(node.id).length, affinity: affinitySummary(node.id), plan: GOAL_PLAN[goalId] };
}
