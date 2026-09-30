import raw from './talent-trees.json';

/** Dados da Fase 6 (grades de talentos + afinidade de treino), tipados por cima do JSON. Não gere à mão: mude o JSON. */
export type EffectCategory = 'offense' | 'special' | 'utility' | 'life' | 'guard' | 'train';
export type TalentKind = 'root' | 'minor' | 'notable' | 'major' | 'keystone';
export interface EffectDef { label: string; unitPerRank: number; category: EffectCategory; engine: 'novo' | 'existe'; }
export interface TalentNodeDef {
  id: string; name: string; kind: TalentKind; x: number; y: number; lane: string;
  maxRank: number; costPerRank: number; rowGate: number;
  effects: { code: string; perRank: number }[]; parents: string[];
  unlock?: { parents: number; parentMinRank: number; majorsOwned?: number };
  mechanic?: { id: string; text: string };
}
export interface TalentTreeDef {
  /** Id do nó da árvore de classes (`aprendiz` para a grade do Squire, que o JSON chama de `squire`). */
  id: string; tier: 0 | 1 | 2; name: string; lanes: Record<string, string>; gates: Record<string, number>;
  totalCost: number; nodeCount: number; nodes: TalentNodeDef[];
  unlockPoints: Record<string, number>; unlockLevels: Record<string, number>;
}
interface TalentTreesFile {
  version: number;
  config: { pointsPerLevel: number; milestoneEvery: number; milestoneBonus: number; notableMult: number };
  effects: Record<string, EffectDef>;
  affinity: { tier1: Record<string, Record<string, number>>; tier2: Record<string, Record<string, number>> };
  trees: Record<string, Omit<TalentTreeDef, 'id'>>;
}

const file = raw as unknown as TalentTreesFile;
export const TALENT_CONFIG = file.config;
export const EFFECTS: Record<string, EffectDef> = file.effects;
export const AFFINITY_DATA = file.affinity;

/** O JSON chama a raiz de `squire`; a árvore de classes, de `aprendiz`. */
export const treeIdOfNode = (nodeId: string) => (nodeId === 'aprendiz' ? 'squire' : nodeId);
export const nodeIdOfTree = (treeId: string) => (treeId === 'squire' ? 'aprendiz' : treeId);

/** Grades por id do nó da árvore de classes. */
export const TALENT_TREES: Record<string, TalentTreeDef> = Object.fromEntries(
  Object.entries(file.trees).map(([treeId, tree]) => [nodeIdOfTree(treeId), { ...tree, id: nodeIdOfTree(treeId) }]),
);
export const rootIdOf = (classNodeId: string) => `${treeIdOfNode(classNodeId)}.root`;

/** Todo nó de talento por id, com a grade (id do nó de classe) a que pertence. */
export const TALENT_NODES = new Map<string, { node: TalentNodeDef; treeId: string }>();
for (const tree of Object.values(TALENT_TREES)) for (const node of tree.nodes) TALENT_NODES.set(node.id, { node, treeId: tree.id });
export const talentNode = (id: string) => TALENT_NODES.get(id)?.node;

/** Pontos de talento por nível: 2 por nível + 5 a cada 10 níveis. */
export const pointsAt = (level: number) =>
  TALENT_CONFIG.pointsPerLevel * level + TALENT_CONFIG.milestoneBonus * Math.floor(level / TALENT_CONFIG.milestoneEvery);

/** Respec: ouro = round(25 × investidos^1,6). */
export const respecGold = (invested: number) => Math.round(25 * invested ** 1.6);

/** Tetos dos efeitos (em pontos percentuais, somando todas as grades). Os `t_*` valem +150%. */
export const EFFECT_CAPS: Record<string, number> = { crit: 75, aspd: 100, cdr: 50, res: 60, mregen: 300, thorns: 100, aggro_up: 100, aggro_down: 80, lifesteal: 25 };
export const effectCap = (code: string) => EFFECT_CAPS[code] ?? (code.startsWith('t_') ? 150 : Infinity);

export const CATEGORY_NAMES: Record<EffectCategory, string> = { offense: 'Ofensa', life: 'Vida', guard: 'Defesa', special: 'Especial', utility: 'Utilidade', train: 'Treino' };

/** Mecânicas de Major/Keystone com código próprio no engine (B9). Enquanto vazio, a UI mostra "Em breve". */
export const MECHANICS_IMPLEMENTED = new Set<string>();
