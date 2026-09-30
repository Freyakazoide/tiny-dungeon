import { describe, expect, it } from 'vitest';
import { AFFINITY } from '../rpg/affinity';
import { CLASS_BY_ID, CLASS_NODES } from '../rpg/classTree';
import { PROFICIENCY_IDS } from '../rpg/proficiencies';
import { EFFECTS, effectCap, MECHANICS_IMPLEMENTED, pointsAt, rootIdOf, respecGold, TALENT_NODES, TALENT_TREES, type TalentTreeDef } from './talentTrees';

const trees = Object.values(TALENT_TREES);
const count = (tree: TalentTreeDef, kind: string) => tree.nodes.filter(n => n.kind === kind).length;

describe('talent-trees.json — integridade dos dados (Fase 6)', () => {
  it('62 árvores: 1 Squire + 15 Tier 1 + 46 Tier 2, uma para cada nó da árvore de classes; 2.664 nós com ids únicos', () => {
    expect(trees).toHaveLength(62);
    expect(trees.filter(t => t.tier === 0)).toHaveLength(1); expect(trees.filter(t => t.tier === 1)).toHaveLength(15); expect(trees.filter(t => t.tier === 2)).toHaveLength(46);
    for (const node of CLASS_NODES) { const tree = TALENT_TREES[node.id]; expect(tree, node.id).toBeDefined(); expect(tree.tier).toBe(node.tier); }
    for (const tree of trees) if (tree.tier === 2) expect(TALENT_TREES[CLASS_BY_ID[tree.id].parent!].tier).toBe(1);
    const ids = trees.flatMap(t => t.nodes.map(n => n.id));
    expect(ids).toHaveLength(2664); expect(new Set(ids).size).toBe(2664); expect(TALENT_NODES.size).toBe(2664);
  });

  it('todo nó (exceto a Origem) tem pais em linhas inferiores e a grade inteira é alcançável a partir da Origem', () => {
    for (const tree of trees) {
      const byId = new Map(tree.nodes.map(n => [n.id, n]));
      const reached = new Set<string>([rootIdOf(tree.id)]);
      for (const node of [...tree.nodes].sort((a, b) => a.y - b.y)) {
        if (node.kind === 'root') { expect(node.parents).toEqual([]); expect(node.y).toBe(0); continue; }
        expect(node.parents.length, node.id).toBeGreaterThanOrEqual(1);
        for (const parent of node.parents) { expect(byId.get(parent)!.y, node.id).toBeLessThan(node.y); }
        if (node.parents.some(p => reached.has(p))) reached.add(node.id);
      }
      expect(reached.size, tree.id).toBe(tree.nodes.length);
    }
  });

  it('todo código de efeito existe em `effects`; t_* e e_* nunca apontam para proficiência bloqueada da classe', () => {
    for (const tree of trees) for (const node of tree.nodes) for (const effect of node.effects) {
      expect(EFFECTS[effect.code], `${node.id}: ${effect.code}`).toBeDefined();
      const prof = /^(?:t|e)_(\w+)$/.exec(effect.code)?.[1];
      if (prof && AFFINITY[tree.id] && (PROFICIENCY_IDS as readonly string[]).includes(prof)) expect(AFFINITY[tree.id][prof as keyof (typeof AFFINITY)[string]], `${node.id}: ${effect.code}`).toBeGreaterThan(0);
    }
  });

  it('contagem por tipo e custo total batem com o JSON (T1: 47/10/4/1 = 638 pts · T2: 29/4/2/1 = 416 · T0: 14/1/1 = 84)', () => {
    const shape = { 0: [14, 1, 1, 0, 17, 84], 1: [47, 10, 4, 1, 63, 638], 2: [29, 4, 2, 1, 37, 416] } as const;
    for (const tree of trees) {
      const [minors, notables, majors, keystones, nodes, cost] = shape[tree.tier];
      expect([count(tree, 'minor'), count(tree, 'notable'), count(tree, 'major'), count(tree, 'keystone')], tree.id).toEqual([minors, notables, majors, keystones]);
      expect(tree.nodes).toHaveLength(nodes); expect(tree.nodeCount).toBe(nodes); expect(tree.totalCost).toBe(cost);
      expect(tree.nodes.reduce((sum, n) => sum + n.maxRank * n.costPerRank, 0), tree.id).toBe(cost);
    }
  });

  it('todo Major e Keystone tem mecânica com id estável; nenhuma está implementada ainda (fica "Em breve")', () => {
    const mechanics = trees.flatMap(t => t.nodes.filter(n => n.kind === 'major' || n.kind === 'keystone').map(n => n.mechanic?.id));
    expect(mechanics).toHaveLength(214); expect(mechanics.every(Boolean)).toBe(true); expect(new Set(mechanics).size).toBe(214);
    expect(MECHANICS_IMPLEMENTED.size).toBe(0);
  });

  it('custos e pontos: pointsAt, tetos e respec seguem a fórmula do documento', () => {
    expect([10, 15, 20, 25, 30, 40, 50, 60, 75].map(pointsAt)).toEqual([25, 35, 50, 60, 75, 100, 125, 150, 185]);
    expect([respecGold(40), respecGold(100), respecGold(200)]).toEqual([Math.round(25 * 40 ** 1.6), Math.round(25 * 100 ** 1.6), Math.round(25 * 200 ** 1.6)]);
    expect(effectCap('crit')).toBe(75); expect(effectCap('t_fire')).toBe(150); expect(effectCap('melee')).toBe(Infinity);
  });

  /** Solver do documento (B5): pais mais baratos como pré-requisito + trava de linha + o próprio nó. Exato em T0/T1; em T2 a escolha gulosa dos pais pode errar por 1 (não compartilha ancestrais). */
  it('unlockPoints (primeiro/último Major e Keystone) recalculados por um solver conferem com o JSON', () => {
    const solve = (tree: TalentTreeDef, targetId: string) => {
      const nodes = new Map(tree.nodes.map(n => [n.id, n]));
      const memo = new Map<string, number>();
      const need = (id: string, rank: number, acc: Record<string, number>) => {
        const node = nodes.get(id)!;
        if (node.kind === 'root' || (acc[id] ?? 0) >= rank) return;
        if (!acc[id]) { const u = node.unlock!; for (const o of cheapest(node.parents, u.parentMinRank, u.parents)) need(o, u.parentMinRank, acc); }
        acc[id] = rank;
      };
      const total = (acc: Record<string, number>) => Object.entries(acc).reduce((s, [id, r]) => s + r * nodes.get(id)!.costPerRank, 0);
      const price = (id: string, rank: number) => { const k = `${id}@${rank}`; if (!memo.has(k)) { const acc = {}; need(id, rank, acc); memo.set(k, total(acc)); } return memo.get(k)!; };
      const cheapest = (ids: string[], rank: number, n: number) => [...ids].sort((a, b) => price(a, rank) - price(b, rank)).slice(0, n);
      const target = nodes.get(targetId)!, acc: Record<string, number> = {}, u = target.unlock!;
      for (const p of cheapest(target.parents, u.parentMinRank, u.parents)) need(p, u.parentMinRank, acc);
      if (u.majorsOwned) for (const m of [...tree.nodes.filter(n => n.kind === 'major')].sort((a, b) => price(a.id, 1) - price(b.id, 1)).slice(0, u.majorsOwned)) need(m.id, 1, acc);
      return Math.max(total(acc), target.rowGate) + target.costPerRank;
    };
    for (const tree of trees) {
      const majors = tree.nodes.filter(n => n.kind === 'major').map(n => solve(tree, n.id)), key = tree.nodes.find(n => n.kind === 'keystone');
      const got = { firstMajor: Math.min(...majors), lastMajor: Math.max(...majors), keystone: key ? solve(tree, key.id) : null };
      const slack = tree.tier === 2 ? 1 : 0;
      expect(got.firstMajor - tree.unlockPoints.firstMajor, tree.id).toBeGreaterThanOrEqual(0); expect(got.firstMajor - tree.unlockPoints.firstMajor, tree.id).toBeLessThanOrEqual(slack);
      expect(got.lastMajor - tree.unlockPoints.lastMajor, tree.id).toBeLessThanOrEqual(slack);
      expect(got.keystone, tree.id).toBe(tree.unlockPoints.keystone ?? null);
    }
  });
});
