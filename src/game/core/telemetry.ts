import type { MonsterKind } from '../systems/waves';

/**
 * Telemetria de "game feel" da run: o motor alimenta (sem mexer no jogo) e o balance harness lê para medir o ritmo (duração dos encontros, TTK,
 * tempo andando × lutando, trocas de alvo, esquivas, peel, overkill…). Nada disso vai para o save.
 */
export type EncounterKind = 'common' | 'heavy' | 'boss';
export interface Telemetry {
  /** segundos de simulação com algum inimigo vivo / com o grupo andando */
  combatS: number; walkS: number; totalS: number;
  /** duração de cada encontro (do aviso à última morte) e do primeiro dano depois que os monstros nascem */
  encounters: { kind: EncounterKind; seconds: number }[]; firstAttack: number[];
  /** tempo do primeiro dano até a morte, por categoria do monstro */
  ttk: Record<MonsterKind, number[]>;
  switches: number; roam: number; retreat: number; dodge: number; peel: number;
  damage: number; overkill: number; shotsFired: number; shotsLost: number;
  open?: { kind: EncounterKind; t0: number; spawnedAt?: number; hit: boolean };
  firstHit: Map<string, number>;
}
export const newTelemetry = (): Telemetry => ({
  combatS: 0, walkS: 0, totalS: 0, encounters: [], firstAttack: [], ttk: { common: [], elite: [], boss: [] },
  switches: 0, roam: 0, retreat: 0, dodge: 0, peel: 0, damage: 0, overkill: 0, shotsFired: 0, shotsLost: 0, firstHit: new Map(),
});
/** Classe do encontro para a métrica: chefe; "pesado" (elite no meio ou horda de 6+ reforços); o resto é comum. */
export const encounterKind = (enc: { boss: boolean; extra: number }, hasElite: boolean): EncounterKind => enc.boss ? 'boss' : hasElite || enc.extra >= 6 ? 'heavy' : 'common';
