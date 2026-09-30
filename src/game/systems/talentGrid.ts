import type { Character } from '../core/types';
import { gearBonus } from './gear';
import { EFFECTS, effectCap, pointsAt, respecGold, rootIdOf, TALENT_NODES, TALENT_TREES, talentNode, type TalentNodeDef } from '../data/talentTrees';

/**
 * Grade de talentos (Fase 6): cada nó do `classPath` abre uma grade; os pontos são um pool único
 * (`pointsAt(nível) − gastos`) e o `Character` só guarda `talentRanks`.
 */
const treesOf = (c: Pick<Character, 'profile'>) => c.profile.classPath.filter(id => id in TALENT_TREES);
export const nodeInPath = (c: Pick<Character, 'profile'>, nodeId: string) => {
  const entry = TALENT_NODES.get(nodeId);
  return !!entry && c.profile.classPath.includes(entry.treeId);
};
export const rankOf = (c: Pick<Character, 'talentRanks'>, nodeId: string) => c.talentRanks[nodeId] ?? 0;

/** Concede a Origem (grátis) de cada grade do caminho. Idempotente. */
export function grantOrigins(c: Character) {
  for (const id of treesOf(c)) c.talentRanks[rootIdOf(id)] = 1;
}

/** Pontos gastos, por grade ou em todas as do caminho. */
export function investedPoints(c: Character, treeId?: string) {
  let total = 0;
  for (const [id, rank] of Object.entries(c.talentRanks)) {
    const entry = TALENT_NODES.get(id);
    if (!entry || !nodeInPath(c, id) || (treeId && entry.treeId !== treeId)) continue;
    total += rank * entry.node.costPerRank;
  }
  return total;
}
export const talentPointsAvailable = (c: Character) => pointsAt(c.profile.level) - investedPoints(c);

/** Soma `rank × perRank` por código (em pontos percentuais), em todas as grades do caminho, mais o equipamento de classe, com os tetos aplicados. */
export function talentTotals(c: Character): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const [id, rank] of Object.entries(c.talentRanks)) {
    if (rank <= 0 || !nodeInPath(c, id)) continue;
    for (const effect of TALENT_NODES.get(id)!.node.effects) totals[effect.code] = (totals[effect.code] ?? 0) + rank * effect.perRank;
  }
  // equipamento de classe (passivas e atributos aleatórios) soma aos mesmos códigos; o teto vale para o total
  for (const [code, value] of Object.entries(gearBonus(c).effects)) totals[code] = (totals[code] ?? 0) + value;
  for (const code of Object.keys(totals)) totals[code] = Math.min(totals[code], effectCap(code));
  return totals;
}
/** Um efeito como fração (`crit: 8` pontos percentuais vira 0,08). */
export const talentValue = (c: Character, code: string) => (talentTotals(c)[code] ?? 0) / 100;

export interface BuyCheck { ok: boolean; reasons: string[]; }

/** Regras de compra (B4): saldo, desbloqueio pelos vizinhos, Majors do Keystone e trava de linha. */
export function canBuy(c: Character, nodeId: string): BuyCheck {
  const entry = TALENT_NODES.get(nodeId);
  if (!entry) return { ok: false, reasons: ['Talento desconhecido.'] };
  const { node, treeId } = entry;
  if (!c.profile.classPath.includes(treeId)) return { ok: false, reasons: ['Esta grade abre ao evoluir.'] };
  if (node.kind === 'root') return { ok: false, reasons: ['A Origem já é sua.'] };
  const rank = rankOf(c, nodeId);
  if (rank >= node.maxRank) return { ok: false, reasons: ['Rank máximo.'] };
  const reasons: string[] = [];
  const available = talentPointsAvailable(c);
  if (available < node.costPerRank) reasons.push(`Precisa de ${node.costPerRank} ${node.costPerRank === 1 ? 'ponto' : 'pontos'} (você tem ${Math.max(0, available)}).`);
  const unlock = node.unlock ?? { parents: 1, parentMinRank: 1 };
  const met = node.parents.filter(p => rankOf(c, p) >= unlock.parentMinRank).length;
  if (met < unlock.parents) reasons.push(`Precisa de ${unlock.parents} ${unlock.parents === 1 ? 'vizinho' : 'vizinhos'} em ${unlock.parentMinRank}+ (tem ${met}).`);
  if (unlock.majorsOwned) {
    const majors = TALENT_TREES[treeId].nodes.filter(n => n.kind === 'major' && rankOf(c, n.id) >= 1).length;
    if (majors < unlock.majorsOwned) reasons.push(`Precisa de ${unlock.majorsOwned} Majors (tem ${majors}).`);
  }
  const invested = investedPoints(c, treeId);
  if (invested < node.rowGate) reasons.push(`Investir mais ${node.rowGate - invested} pts nesta grade.`);
  return { ok: reasons.length === 0, reasons };
}

export function buyTalent(c: Character, nodeId: string) {
  if (!canBuy(c, nodeId).ok) return false;
  c.talentRanks[nodeId] = rankOf(c, nodeId) + 1;
  return true;
}
/** Compra o quanto o saldo e as regras permitirem (Shift+clique); devolve os ranks comprados. */
export function buyTalentMax(c: Character, nodeId: string) {
  let bought = 0;
  while (buyTalent(c, nodeId)) bought++;
  return bought;
}

/** Custo em ouro de zerar uma grade (ou todas). */
export const talentRespecCost = (c: Character, treeId?: string) => respecGold(investedPoints(c, treeId));
/** Devolve os pontos da grade (ou de todas) e mantém as Origens; o custo em ouro é cobrado por quem chama. */
export function resetTalents(c: Character, treeId?: string) {
  const refunded = investedPoints(c, treeId);
  for (const id of Object.keys(c.talentRanks)) {
    const entry = TALENT_NODES.get(id);
    if (!entry || (treeId && entry.treeId !== treeId) || entry.node.kind === 'root') continue;
    delete c.talentRanks[id];
  }
  grantOrigins(c);
  return refunded;
}

/**
 * Reproduz as compras em ordem topológica (linha crescente) e confere B4 + saldo. Um `talentRanks` que não
 * fecha volta a zero talentos (só as Origens); nunca invalida o save inteiro.
 */
export function validTalentRanks(value: unknown, classPath: readonly string[], level: number): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const ranks = value as Record<string, unknown>;
  const owned: Record<string, number> = {};
  const nodes: TalentNodeDef[] = [];
  for (const [id, rank] of Object.entries(ranks)) {
    const entry = TALENT_NODES.get(id);
    if (!entry || !classPath.includes(entry.treeId) || typeof rank !== 'number' || !Number.isInteger(rank) || rank < 0 || rank > entry.node.maxRank) return false;
    if (rank > 0) nodes.push(entry.node);
  }
  for (const treeId of classPath) if (treeId in TALENT_TREES && ranks[rootIdOf(treeId)] !== 1) return false;
  nodes.sort((a, b) => a.y - b.y || (a.id < b.id ? -1 : 1));
  const investedByTree: Record<string, number> = {};
  let spent = 0;
  for (const node of nodes) {
    if (node.kind === 'root') { owned[node.id] = 1; continue; }
    const treeId = TALENT_NODES.get(node.id)!.treeId;
    const unlock = node.unlock ?? { parents: 1, parentMinRank: 1 };
    const rank = ranks[node.id] as number;
    if (node.parents.filter(p => (owned[p] ?? 0) >= unlock.parentMinRank).length < unlock.parents) return false;
    if (unlock.majorsOwned && TALENT_TREES[treeId].nodes.filter(n => n.kind === 'major' && (owned[n.id] ?? 0) >= 1).length < unlock.majorsOwned) return false;
    if ((investedByTree[treeId] ?? 0) < node.rowGate) return false;
    owned[node.id] = rank;
    const cost = rank * node.costPerRank;
    investedByTree[treeId] = (investedByTree[treeId] ?? 0) + cost;
    spent += cost;
  }
  return spent <= pointsAt(level);
}

/** Nome e valor de um efeito para exibir ("+1,5% Dano corpo a corpo"). */
export const effectLabel = (code: string) => EFFECTS[code]?.label ?? code;
export const formatEffectValue = (code: string, value: number) => {
  const shown = Math.round(value * 100) / 100;
  return `${code === 'cdr' ? '−' : shown >= 0 ? '+' : ''}${String(shown).replace('.', ',')}%`;
};
export { talentNode };
