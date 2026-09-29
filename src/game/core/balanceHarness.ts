import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import { HUNT_BY_ID } from '../data/hunts';
import { POTION_STOCK } from '../data/shop';
import { characterStats } from '../systems/progression';
import type { Character } from './types';

/** Harness de balanceamento: roda uma hunt inteira no engine, sem tela, e devolve as métricas do plano. */
export interface HuntMetrics {
  huntId: string; level: number;
  normalWaveSeconds: number[]; bossWaveSeconds: number[];
  defeats: number; minHpFraction: number;
  /** Custo de poções (valor de compra) e ouro recebido, por tipo de wave. */
  potionCostNormal: number; potionCostBoss: number; goldNormal: number; goldBoss: number;
  goldTotal: number; potionCostTotal: number;
  xpPerHour: number; simulatedSeconds: number;
}

export interface HarnessOptions {
  /** Ciclos completos (3 waves): 6 = 12 waves normais + 6 de boss. */
  cycles?: number;
  /** Nível dos personagens (padrão: o recomendado da hunt). */
  level?: number;
  /** Ajustes na party antes de começar (ex.: equipar o conjunto da hunt). */
  setup?: (characters: Character[]) => void;
}

const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export const mean = avg;

export function simulateHunt(huntId: string, options: HarnessOptions = {}): HuntMetrics {
  const hunt = HUNT_BY_ID[huntId], level = options.level ?? hunt.recommendedLevel, cycles = options.cycles ?? 6;
  const state = partyState(); state.huntId = huntId; state.characters.forEach(c => { c.profile.level = level; });
  options.setup?.(state.characters);
  // Poções em quantidade ilimitada: o que interessa é o consumo (analyzer.suppliesValue).
  // Poções ilimitadas, mas só os tiers liberados no nível da party (o que interessa é o consumo).
  state.inventory.supply = POTION_STOCK.filter(p => p.unlockLevel <= level).map(p => ({ itemId: p.itemId, quantity: 1e6 }));
  state.inventory.capacity.supply = 1e9;
  const engine = new GameEngine(state);
  for (const c of state.characters) { const s = characterStats(c, state); c.hp = s.maxHp; c.mana = s.maxMana; }
  engine.start();
  const bossWave = hunt.waves.length - 1;
  const normal: number[] = [], boss: number[] = [];
  const cost = { normal: 0, boss: 0 }, gold = { normal: 0, boss: 0 };
  let waveStart = state.analyzer.activeMs, costStart = state.analyzer.suppliesValue, goldStart = state.analyzer.gold, minHp = 1;
  const limit = 60 * 60 * 10 * 6; // teto de segurança: 6 h simuladas
  for (let i = 0; i < limit && engine.getSnapshot().cycle < cycles; i++) {
    const before = engine.getSnapshot().status;
    engine.tick(100);
    const s = engine.getSnapshot();
    for (const c of s.characters) minHp = Math.min(minHp, c.hp / characterStats(c, s).maxHp);
    if (s.status === 'transition' && before === 'running') {
      const seconds = (s.analyzer.activeMs - waveStart) / 1000, isBoss = s.wave === bossWave;
      (isBoss ? boss : normal).push(seconds);
      cost[isBoss ? 'boss' : 'normal'] += s.analyzer.suppliesValue - costStart; gold[isBoss ? 'boss' : 'normal'] += s.analyzer.gold - goldStart;
    }
    if ((s.status === 'running' && before !== 'running') || (s.status === 'recovering' && before === 'running')) { waveStart = s.analyzer.activeMs; costStart = s.analyzer.suppliesValue; goldStart = s.analyzer.gold; }
  }
  const a = engine.getSnapshot().analyzer, hours = a.activeMs / 3_600_000;
  return {
    huntId, level, normalWaveSeconds: normal, bossWaveSeconds: boss, defeats: a.defeats, minHpFraction: minHp,
    potionCostNormal: cost.normal, potionCostBoss: cost.boss, goldNormal: gold.normal, goldBoss: gold.boss,
    goldTotal: a.gold, potionCostTotal: a.suppliesValue, xpPerHour: hours > 0 ? a.xp / hours : 0, simulatedSeconds: a.activeMs / 1000,
  };
}

/** Simulador de ritmo (função pura): dias até acumular `totalTries`, dado o ritmo de treino e as horas ativas por dia. */
export function daysToGate(totalTries: number, triesPerSecond: number, activeHoursPerDay: number, offlineFocus = true) {
  const online = triesPerSecond * 3600 * activeHoursPerDay;
  const offline = offlineFocus ? triesPerSecond * 3600 * Math.max(0, 24 - activeHoursPerDay) : 0;
  return totalTries / (online + offline);
}
/** Dias para chegar ao nível `target` dado o XP/h da hunt e as horas ativas por dia. */
export function daysToLevel(xpNeeded: number, xpPerHour: number, activeHoursPerDay: number) {
  return xpNeeded / (xpPerHour * activeHoursPerDay);
}
