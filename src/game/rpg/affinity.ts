import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from './proficiencies';
import type { ProgressProfile } from './profile';
import { AFFINITY_DATA } from '../data/talentTrees';

/**
 * Afinidade de treino (Fase 6): multiplica as tries por proficiência conforme a classe atual.
 * Squire ×1,0; Tier 1 e Tier 2 vêm de talent-trees.json (Especialista ×1,5, Afim+ ×1,25, Afim ×1,0, Fora ×0,4,
 * Bloqueada ×0; a subclasse já traz o +0,25 nas proficiências da porta).
 */
export const AFFINITY: Record<string, Record<ProficiencyId, number>> = { ...AFFINITY_DATA.tier1, ...AFFINITY_DATA.tier2 } as Record<string, Record<ProficiencyId, number>>;

export const affinityOfNode = (classNodeId: string, id: ProficiencyId) => AFFINITY[classNodeId]?.[id] ?? 1;
export const affinityFor = (profile: Pick<ProgressProfile, 'classId'>, id: ProficiencyId) => affinityOfNode(profile.classId, id);
export const isBlocked = (profile: Pick<ProgressProfile, 'classId'>, id: ProficiencyId) => affinityFor(profile, id) <= 0;

/** Rótulo de cada faixa de afinidade (multiplicador de tries). */
export const affinityCategory = (multiplier: number) =>
  multiplier <= 0 ? 'Bloqueada' : multiplier >= 1.5 ? 'Especialista' : multiplier > 1 ? 'Afim+' : multiplier === 1 ? 'Afim' : 'Fora';

/** "Especialista em Melee (×1,5) · Afim+ … · Bloqueia Fogo, Gelo…": a linha do cartão de classe (Afim e Fora ficam de fora). */
export function affinitySummary(classNodeId: string): string {
  const table = AFFINITY[classNodeId];
  if (!table) return '';
  const names = (test: (m: number) => boolean) => PROFICIENCY_IDS.filter(id => test(table[id])).map(id => PROFICIENCIES[id].name);
  const fmt = (m: number) => `×${String(m).replace('.', ',')}`;
  const parts: string[] = [];
  const expert = PROFICIENCY_IDS.filter(id => table[id] >= 1.5);
  if (expert.length) parts.push(`Especialista em ${expert.map(id => `${PROFICIENCIES[id].name} (${fmt(table[id])})`).join(', ')}`);
  const plus = PROFICIENCY_IDS.filter(id => table[id] > 1 && table[id] < 1.5);
  if (plus.length) parts.push(`Afim+ ${plus.map(id => `${PROFICIENCIES[id].name} (${fmt(table[id])})`).join(', ')}`);
  const blocked = names(m => m <= 0);
  if (blocked.length) parts.push(`Bloqueia ${blocked.join(', ')}`);
  return parts.join(' · ');
}
