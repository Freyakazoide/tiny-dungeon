import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import { HUNT_BY_ID } from '../data/hunts';
import { RUN_CONFIG, WAVE_CONFIG } from '../data/balance';
import { GEAR_SETS, gearId } from '../data/gear';
import { autoSpend } from './talentBuild';
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
  /** Todas as waves (normais e de chefe) na ordem, com o número de reforços de cada uma. */
  waveSeconds: number[]; waveExtras: number[]; p95: number; maxWaveSeconds: number;
  /** Custo médio de poção de uma wave grande (≥ +6 reforços) dividido pela média das waves (0 se não houve wave grande). */
  potionPerBigWave: number; bigWaves: number;
}

export interface HarnessOptions {
  /** Ciclos completos (3 waves): 6 = 12 waves normais + 6 de boss. */
  cycles?: number;
  /** Nível dos personagens (padrão: o recomendado da hunt). */
  level?: number;
  /** Ajustes na party antes de começar (ex.: equipar o conjunto da hunt). */
  setup?: (characters: Character[]) => void;
  /** Liga os reforços aleatórios de wave (WAVE_CONFIG.enabled) durante a simulação. Padrão: desligado (linha de base antiga). */
  extras?: boolean;
  /** Grupo de referência (Guerreiro tanque na frente, Caçador e Mago atrás) com o conjunto da hunt; `talents` gasta pointsAt(nível) com autoSpend. */
  reference?: boolean; talents?: boolean;
  /** Semente do RNG (mulberry32): troca Math.random durante a simulação e restaura no fim. */
  seed?: number;
  /** Escala [HP, ataque] dos monstros da hunt; padrão [1, 1] (linha de base); 'hunt' usa a `monsterScale` do HuntDef. */
  scale?: [number, number] | 'hunt';
}

/** RNG determinístico (mulberry32). */
export const mulberry32 = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const percentile = (values: number[], q: number) => { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]; };

/** Grupo de referência da fase 7: Guerreiro (frente, tanque), Caçador e Mago (atrás), conjunto da hunt equipado e, opcionalmente, talentos gastos. */
export function buildReference(engine: GameEngine, huntId: string, level: number, talents: boolean) {
  const [a, b, c] = engine.getSnapshot().characters;
  for (const [ch, node] of [[a, 'guerreiro'], [b, 'cacador'], [c, 'mago']] as const) { ch.profile.level = level; engine.evolve(ch.id, node, { force: true }); }
  const chars = engine.getSnapshot().characters;
  chars[0].row = 'front'; chars[0].isTank = true; chars[1].row = 'back'; chars[1].isTank = false; chars[2].row = 'back'; chars[2].isTank = false;
  if (GEAR_SETS.some(set => set.huntId === huntId)) {
    const set = (piece: 'melee' | 'ranged' | 'staff' | 'armor' | 'shield') => gearId(huntId, piece);
    chars[0].equipment = { weapon: set('melee'), armor: set('armor'), offhand: set('shield') };
    chars[1].equipment = { weapon: set('ranged'), armor: set('armor'), offhand: set('shield') };
    chars[2].equipment = { weapon: set('staff'), armor: set('armor'), offhand: set('shield') };
  }
  if (talents) for (const ch of chars) autoSpend(ch);
}

const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export const mean = avg;

export function simulateHunt(huntId: string, options: HarnessOptions = {}): HuntMetrics {
  const hunt = HUNT_BY_ID[huntId], level = options.level ?? hunt.recommendedLevel, cycles = options.cycles ?? 6;
  const restore: (() => void)[] = [];
  // O que o harness muda (escala da hunt, reforços, Math.random) é restaurado no fim, mesmo se a simulação falhar.
  const scale = options.scale === 'hunt' ? hunt.monsterScale ?? { hp: 1, atk: 1 } : { hp: options.scale?.[0] ?? 1, atk: options.scale?.[1] ?? 1 };
  const previousScale = hunt.monsterScale; hunt.monsterScale = scale; restore.push(() => { hunt.monsterScale = previousScale; });
  const previousEnabled = WAVE_CONFIG.enabled; WAVE_CONFIG.enabled = !!options.extras; restore.push(() => { WAVE_CONFIG.enabled = previousEnabled; });
  if (options.seed !== undefined) { const original = Math.random; Math.random = mulberry32(options.seed); restore.push(() => { Math.random = original; }); }
  try {
    const state0 = partyState(); state0.huntId = huntId; state0.characters.forEach(c => { c.profile.level = level; });
    let engine = new GameEngine(state0);
    if (options.reference) buildReference(engine, huntId, level, !!options.talents);
    options.setup?.(engine.getSnapshot().characters);
    const state = engine.getSnapshot();
    // Poções em quantidade ilimitada, mas só os tiers liberados no nível da party (o que interessa é o consumo).
    state.inventory.supply = POTION_STOCK.filter(p => p.unlockLevel <= level).map(p => ({ itemId: p.itemId, quantity: 1e6 }));
    state.inventory.capacity.supply = 1e9;
    engine = new GameEngine(state);
    for (const c of state.characters) { const s = characterStats(c, state); c.hp = s.maxHp; c.mana = s.maxMana; }
    engine.start();
    const bossWave = hunt.waves.length - 1;
    const normal: number[] = [], boss: number[] = [], all: number[] = [], extras: number[] = [], costs: number[] = [];
    const cost = { normal: 0, boss: 0 }, gold = { normal: 0, boss: 0 };
    let waveStart = engine.getSnapshot().analyzer.activeMs, costStart = engine.getSnapshot().analyzer.suppliesValue, goldStart = engine.getSnapshot().analyzer.gold, minHp = 1;
    const limit = 60 * 60 * 10 * 6; // teto de segurança: 6 h simuladas
    for (let i = 0; i < limit && engine.getSnapshot().cycle < cycles; i++) {
      const before = engine.getSnapshot().status;
      engine.tick(100);
      const s = engine.getSnapshot();
      for (const c of s.characters) minHp = Math.min(minHp, c.hp / characterStats(c, s).maxHp);
      if (s.status === 'transition' && before === 'running') {
        const seconds = (s.analyzer.activeMs - waveStart) / 1000, isBoss = s.wave === bossWave, spent = s.analyzer.suppliesValue - costStart;
        (isBoss ? boss : normal).push(seconds); all.push(seconds); extras.push(s.waveInfo?.extra ?? 0); costs.push(spent);
        cost[isBoss ? 'boss' : 'normal'] += spent; gold[isBoss ? 'boss' : 'normal'] += s.analyzer.gold - goldStart;
      }
      if ((s.status === 'running' && before !== 'running') || (s.status === 'recovering' && before === 'running')) { const a = s.analyzer; waveStart = a.activeMs; costStart = a.suppliesValue; goldStart = a.gold; }
    }
    const a = engine.getSnapshot().analyzer, hours = a.activeMs / 3_600_000;
    const bigCosts = costs.filter((_, i) => extras[i] >= 6), meanCost = avg(costs);
    return {
      huntId, level, normalWaveSeconds: normal, bossWaveSeconds: boss, defeats: a.defeats, minHpFraction: minHp,
      potionCostNormal: cost.normal, potionCostBoss: cost.boss, goldNormal: gold.normal, goldBoss: gold.boss,
      goldTotal: a.gold, potionCostTotal: a.suppliesValue, xpPerHour: hours > 0 ? a.xp / hours : 0, simulatedSeconds: a.activeMs / 1000,
      waveSeconds: all, waveExtras: extras, p95: percentile(all, .95), maxWaveSeconds: Math.max(0, ...all),
      potionPerBigWave: bigCosts.length && meanCost > 0 ? avg(bigCosts) / meanCost : 0, bigWaves: bigCosts.length,
    };
  } finally { for (const undo of restore.reverse()) undo(); }
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

export interface RunMetrics { huntId: string; level: number; minutes: number; distance: number; kills: number; bossKills: number; defeats: number; xpPerHour: number; goldPerHour: number; potionCostPerHour: number; minHpFraction: number; deepestChunk: number; encounters: number }
/** Harness do corredor: roda `minutes` de jogo simulado com o grupo de referência e mede o ritmo (XP/h, ouro/h, poções, quedas, chefes). */
export function simulateRun(huntId: string, options: { minutes?: number; level?: number; seed?: number; talents?: boolean } = {}): RunMetrics {
  const hunt = HUNT_BY_ID[huntId], level = options.level ?? hunt.recommendedLevel, minutes = options.minutes ?? 30;
  const restore: (() => void)[] = [];
  const previousRun = RUN_CONFIG.enabled; RUN_CONFIG.enabled = true; restore.push(() => { RUN_CONFIG.enabled = previousRun; });
  const previousWaves = WAVE_CONFIG.enabled; WAVE_CONFIG.enabled = true; restore.push(() => { WAVE_CONFIG.enabled = previousWaves; });
  const original = Math.random; Math.random = mulberry32(options.seed ?? 1); restore.push(() => { Math.random = original; });
  try {
    const state0 = partyState(); state0.huntId = huntId; state0.characters.forEach(c => { c.profile.level = level; });
    let engine = new GameEngine(state0);
    buildReference(engine, huntId, level, options.talents ?? true);
    const state = engine.getSnapshot();
    state.inventory.supply = POTION_STOCK.filter(p => p.unlockLevel <= level).map(p => ({ itemId: p.itemId, quantity: 1e6 }));
    state.inventory.capacity.supply = 1e9;
    engine = new GameEngine(state);
    for (const c of state.characters) { const s = characterStats(c, state); c.hp = s.maxHp; c.mana = s.maxMana; }
    engine.start();
    let minHp = 1, deepest = 0;
    for (let i = 0; i < minutes * 600; i++) {
      engine.tick(100);
      if (i % 5) continue;
      const s = engine.getSnapshot(); deepest = Math.max(deepest, Math.floor((s.run?.anchor ?? 0) / 24));
      for (const c of s.characters) minHp = Math.min(minHp, c.hp / characterStats(c, s).maxHp);
    }
    const s = engine.getSnapshot(), a = s.analyzer, hours = a.activeMs / 3_600_000;
    return { huntId, level, minutes, distance: Math.round(s.run?.deepest ?? 0), kills: Object.values(a.kills).reduce((x, y) => x + y, 0), bossKills: a.bosses, defeats: a.defeats, xpPerHour: hours ? a.xp / hours : 0, goldPerHour: hours ? a.gold / hours : 0, potionCostPerHour: hours ? a.suppliesValue / hours : 0, minHpFraction: minHp, deepestChunk: deepest, encounters: Math.max(0, (s.run?.lastTrigger ?? 0)) };
  } finally { for (const undo of restore.reverse()) undo(); }
}
