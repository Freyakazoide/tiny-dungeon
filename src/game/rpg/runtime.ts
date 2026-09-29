/**
 * Multiplicadores de teste (só em memória; voltam a 1 ao recarregar). Só o `dev` de GameStore os altera,
 * e ele só existe em `npm run dev`. Não aceleram o tick de combate, apenas o que se ganha por ele.
 */
import { MONSTER_SCALE } from '../data/balance';

/** `huntSpeed` acelera a caçada inteira (combate, XP, loot, treino); só o SpeedControl de desenvolvimento o altera. */
export const runtime = { huntSpeed: 1, trainScale: 1, xpScale: 1, monsterHp: MONSTER_SCALE.hp, monsterAtk: MONSTER_SCALE.atk };
