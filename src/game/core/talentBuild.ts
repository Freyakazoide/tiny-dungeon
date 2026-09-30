import type { Character } from './types';
import { TALENT_TREES } from '../data/talentTrees';
import { buyTalent, grantOrigins } from '../systems/talentGrid';

/**
 * Gasto automático de pontos de talento para o harness de balanceamento: percorre os nós por linha e coluna
 * (`y`, depois `x`), comprando 1 rank por passada em cada nó liberado, e repete até o saldo ou as regras acabarem.
 * Assim os pontos ficam espalhados (como um jogador comum), não concentrados num nó só. A grade da classe vem
 * antes da do Squire. O personagem já deve estar na classe (`evolve`); as Origens são garantidas aqui.
 */
export function autoSpend(character: Character): number {
  grantOrigins(character);
  const order = [...character.profile.classPath].reverse().filter(id => id in TALENT_TREES);
  const nodes = order.flatMap(id => [...TALENT_TREES[id].nodes].sort((a, b) => a.y - b.y || a.x - b.x));
  let bought = 0, progress = true;
  while (progress) {
    progress = false;
    for (const node of nodes) if (buyTalent(character, node.id)) { bought++; progress = true; }
  }
  return bought;
}
