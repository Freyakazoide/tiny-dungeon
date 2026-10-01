import { CLASS_BY_ID, childrenOf, type ClassNode } from './classTree';
import { PROFICIENCIES, type ProficiencyId } from './proficiencies';
import type { CounterId, ProgressProfile } from './profile';

export interface RequirementCheck { met: boolean; missing: string[]; }

const COUNTER_LABELS: Record<CounterId, string> = {
  crits: 'Críticos', bossCrits: 'Críticos em chefes', damageTaken: 'Dano sofrido', healingDone: 'Cura total',
  buffsApplied: 'Buffs aplicados', dotDamage: 'Dano contínuo total', supportPotionsUsed: 'Poções de suporte usadas',
  bossKills: 'Chefes abatidos', goldEarned: 'Ouro acumulado', controlSpells: 'Feitiços de controle',
};

/** Quantas proficiências elementais já estão no nível `level` ou acima. */
export const elementsAtLevel = (profile: ProgressProfile, level: number) => (Object.keys(PROFICIENCIES) as ProficiencyId[]).filter(id => PROFICIENCIES[id].group === 'elemental' && profile.proficiencies[id].level >= level).length;

export function checkRequirements(profile: ProgressProfile, node: ClassNode): RequirementCheck {
  const missing: string[] = [];
  const { level, skills = {}, counters = {}, elements } = node.requires;
  if (profile.level < level) missing.push(`Nível ${level} (atual ${profile.level})`);
  for (const [id, need] of Object.entries(skills) as [ProficiencyId, number][]) {
    const have = profile.proficiencies[id].level;
    if (have < need) missing.push(`${PROFICIENCIES[id].name} ${need} (atual ${have})`);
  }
  if (elements) { const have = elementsAtLevel(profile, elements.level); if (have < elements.count) missing.push(`${elements.count} elementos no nível ${elements.level} (atual ${have})`); }
  for (const [id, need] of Object.entries(counters) as [CounterId, number][]) {
    const have = profile.counters[id] ?? 0;
    if (have < need) missing.push(`${COUNTER_LABELS[id]} ${need} (atual ${have})`);
  }
  return { met: missing.length === 0, missing };
}

/** Só os filhos do nó atual: é aqui que a exclusividade da árvore acontece. */
export function evolutionOptions(profile: ProgressProfile) {
  return childrenOf(profile.classId).map(node => ({ node, ...checkRequirements(profile, node) }));
}

export type EvolveResult = { ok: true; node: ClassNode } | { ok: false; reason: string };

/** Transição irreversível: valida pai e requisitos, troca a classe e registra no caminho. */
export function evolveClass(profile: ProgressProfile, targetId: string, opts: { force?: boolean } = {}): EvolveResult {
  const node = CLASS_BY_ID[targetId];
  if (!node) return { ok: false, reason: 'Classe desconhecida.' };
  if (node.parent !== profile.classId) return { ok: false, reason: `${node.name} não faz parte do caminho de ${CLASS_BY_ID[profile.classId].name}.` };
  const check = checkRequirements(profile, node);
  if (!check.met && !opts.force) return { ok: false, reason: `Requisitos pendentes: ${check.missing.join('; ')}.` };
  profile.classId = node.id;
  profile.classPath.push(node.id);
  return { ok: true, node };
}
