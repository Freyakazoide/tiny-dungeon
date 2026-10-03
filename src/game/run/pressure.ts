import { RUN_FLOW, WAVE_CONFIG } from '../data/balance';

/**
 * Pressão do encontro (funções puras): em vez de contar só os inimigos vivos, soma a fração de vida de cada um (`aliveHpEquivalent`). Quatro monstros com
 * 5% de vida valem 0,2 de um monstro, não 4: não seguram a próxima leva nem o grupo parado por vários segundos.
 */
export interface FoeHp { hp: number; maxHp: number }
/** Soma de hp/maxHp dos vivos: "quantos monstros inteiros" ainda restam. */
export const aliveHpEquivalent = (foes: FoeHp[]) => foes.reduce((s, f) => s + Math.max(0, Math.min(1, f.hp / Math.max(1, f.maxHp))), 0);
export interface Pressure { alive: number; hpEq: number }
export const encounterPressure = (foes: FoeHp[]): Pressure => ({ alive: foes.length, hpEq: aliveHpEquivalent(foes) });

/**
 * A próxima leva entra? Sempre que há vaga (`room`) e: é a primeira; há menos de `below` vivos; o HP restante equivale a poucos monstros (antecipa quando é muito
 * baixo); a multidão está bem machucada e já passou meio intervalo; ou o tempo desde a última leva passou de 2 intervalos. O limite de entidades (`room`) manda em tudo.
 */
export function shouldSpawnBatch(i: { alive: number; hpEq: number; waited: number; first: boolean; room: number }): boolean {
  if (i.room <= 0) return false;
  if (i.first || i.alive < WAVE_CONFIG.below) return true;
  if (i.hpEq <= RUN_FLOW.hpEqLow && i.waited >= RUN_FLOW.earlyAfter) return true;
  if (i.hpEq <= RUN_FLOW.hpEqBelow && i.waited >= WAVE_CONFIG.intervalS * .5) return true;
  return i.waited >= WAVE_CONFIG.intervalS * 2;
}

/** Inimigo "de limpeza": quase morto, não é chefe e não está com golpe avisado em andamento. O grupo pode seguir caminho com só estes por perto. */
export const isMopUp = (f: FoeHp & { boss?: boolean; winding?: boolean; ambush?: boolean }) => !f.boss && !f.winding && !f.ambush && f.hp / Math.max(1, f.maxHp) <= RUN_FLOW.mopUpHp;
/** Só restam inimigos de limpeza (e nenhum golpe avisado no ar)? Então o grupo já pode andar e o próximo encontro pode começar. */
export const onlyMopUp = (foes: (FoeHp & { boss?: boolean; winding?: boolean; ambush?: boolean })[], windups: number) => windups === 0 && foes.every(isMopUp);
