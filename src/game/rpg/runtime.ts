/**
 * Multiplicadores de teste (só em memória; voltam a 1 ao recarregar). Só o `dev` de GameStore os altera,
 * e ele só existe em `npm run dev`. Não aceleram o tick de combate, apenas o que se ganha por ele.
 */
import { MONSTER_SCALE, OFFLINE_HUNT_SHARE, POST_GATE_GROWTH, TIER1_HOURS } from '../data/balance';

/** `huntSpeed` acelera a caçada inteira (combate, XP, loot, treino); só o SpeedControl de desenvolvimento o altera. */
/** `tier1Hours` e `postGateGrowth` ajustam o ritmo em playtest sem editar código (dev.paceHours / dev.postGateGrowth). */
export const runtime = { offlineShare: OFFLINE_HUNT_SHARE, tier1Hours: TIER1_HOURS, postGateGrowth: POST_GATE_GROWTH, huntSpeed: 1, trainScale: 1, xpScale: 1, monsterHp: MONSTER_SCALE.hp, monsterAtk: MONSTER_SCALE.atk };
