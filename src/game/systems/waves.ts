import { BOSS_EXTRAS, ELITE_SHARE, WAVE_CONFIG, WAVE_EXTRAS, type ExtraRow } from '../data/balance';
import { HUNT_BY_ID, type HuntDef } from '../data/hunts';
import { MONSTERS } from '../data/monsters';

/** Waves com reforços aleatórios (Fase 7): módulo puro, com RNG injetável para testes determinísticos. */
export type Rng = () => number;
export { WAVE_EXTRAS, BOSS_EXTRAS, ELITE_SHARE };
export type { ExtraRow };

/** Sorteio ponderado pela coluna `pct` (as chances não precisam somar 100). */
export function rollExtra(table: ExtraRow[], rng: Rng = Math.random): number {
  const total = table.reduce((sum, row) => sum + row.pct, 0);
  let roll = rng() * total;
  for (const row of table) { roll -= row.pct; if (roll < 0) return row.extra; }
  return table[table.length - 1].extra;
}
export const meanExtra = (table: ExtraRow[]) => table.reduce((s, r) => s + r.extra * r.pct, 0) / table.reduce((s, r) => s + r.pct, 0);

/** Tabela de uma wave: a de chefe é sempre a global; a normal pode ser sobreposta por `HuntDef.extrasTable`. */
export const extrasTableFor = (hunt: Pick<HuntDef, 'extrasTable'> | undefined, isBossWave: boolean): ExtraRow[] =>
  isBossWave ? BOSS_EXTRAS : hunt?.extrasTable ?? WAVE_EXTRAS;

/** Nome do tier para a UI: 0 Wave normal · 1–2 Reforço leve · 3–5 Reforço · 6–11 Horda · 12+ Invasão. */
export type WaveTier = 'normal' | 'light' | 'reinforced' | 'horde' | 'invasion';
export const tierOfExtra = (extra: number): WaveTier => extra <= 0 ? 'normal' : extra <= 2 ? 'light' : extra <= 5 ? 'reinforced' : extra <= 11 ? 'horde' : 'invasion';
export const TIER_NAMES: Record<WaveTier, string> = { normal: 'Wave normal', light: 'Reforço leve', reinforced: 'Reforço', horde: 'Horda', invasion: 'Invasão' };

/** Ids do comum e do elite da hunt: comum = 1º monstro da W1; elite = 1º não-chefe diferente do comum na W2. */
export function reinforcementIds(huntId: string): { common: string; elite: string } {
  const waves = (HUNT_BY_ID[huntId] ?? HUNT_BY_ID.catacumbas).waves, common = waves[0].monsters[0];
  const elite = (waves[1]?.monsters ?? []).find(id => id !== common && !MONSTERS[id]?.boss) ?? common;
  return { common, elite };
}

/** `count` reforços: 85% o comum da hunt, 15% o elite; nunca chefe. */
export function composeExtras(huntId: string, count: number, rng: Rng = Math.random): string[] {
  const { common, elite } = reinforcementIds(huntId);
  return Array.from({ length: Math.max(0, count) }, () => rng() < ELITE_SHARE ? elite : common);
}
/** Sorteia o número de reforços da tabela (com `extrasScale` da hunt) e devolve os ids. */
export function extraMonsters(huntId: string, isBossWave: boolean, rng: Rng = Math.random): string[] {
  const hunt = HUNT_BY_ID[huntId];
  const count = Math.round(rollExtra(extrasTableFor(hunt, isBossWave), rng) * (hunt?.extrasScale ?? 1));
  return composeExtras(huntId, count, rng);
}

/** Saco embaralhado: sequência de `size` resultados proporcional à tabela; o resto fracionário passa para o saco seguinte (`carry`), então até a Invasão de 0,75% aparece na proporção certa. */
export interface WaveBag { bag: number[]; carry: Record<number, number>; }
export const newBag = (): WaveBag => ({ bag: [], carry: {} });
export function refillBag(state: WaveBag, table: ExtraRow[], size: number, rng: Rng) {
  const total = table.reduce((s, r) => s + r.pct, 0), fresh: number[] = [];
  for (const row of table) {
    const carry = (state.carry[row.extra] ?? 0.5) + row.pct / total * size, whole = Math.floor(carry);
    state.carry[row.extra] = carry - whole;
    for (let i = 0; i < whole; i++) fresh.push(row.extra);
  }
  for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  state.bag = fresh;
}
export function drawFromBag(state: WaveBag, table: ExtraRow[], size: number, rng: Rng = Math.random): number {
  if (!state.bag.length) refillBag(state, table, size, rng);
  return state.bag.pop() ?? rollExtra(table, rng);
}

/** Válvula (HP médio baixo → no máximo +1) e "sem hordas em sequência" (depois de uma horda, no máximo +2). */
export function limitExtra(extra: number, ctx: { avgHpFraction: number; lastExtra: number }, cfg = WAVE_CONFIG): number {
  let limited = extra;
  if (cfg.valve && ctx.avgHpFraction < cfg.valveHp) limited = Math.min(limited, 1);
  if (cfg.noHordeChain && ctx.lastExtra >= cfg.hordeAt) limited = Math.min(limited, 2);
  return limited;
}

/** Recompensas de uma wave grande: rolagens extras de drop de equipamento e bônus de ouro. */
export function waveRewards(extra: number, cfg = WAVE_CONFIG) {
  if (!cfg.bigRewards) return { gearRolls: 0, goldBonus: 0 };
  const tier = tierOfExtra(extra);
  return tier === 'invasion' ? { gearRolls: cfg.invasionRolls, goldBonus: cfg.invasionGold } : tier === 'horde' ? { gearRolls: cfg.hordeRolls, goldBonus: 0 } : { gearRolls: 0, goldBonus: 0 };
}

/** Levas: com `minTotal`+ monstros só `maxAlive` nascem juntos; o resto espera. */
export function splitBatches<T>(list: T[], cfg = WAVE_CONFIG): { initial: T[]; pending: T[] } {
  if (!cfg.batches || list.length < cfg.minTotal) return { initial: list, pending: [] };
  return { initial: list.slice(0, cfg.maxAlive), pending: list.slice(cfg.maxAlive) };
}
/** Quantos entram agora: grupos de `batch` com menos de `below` vivos (ou, esperando o dobro do intervalo, com espaço abaixo do teto). */
export function batchToSpawn(alive: number, pending: number, waitedS: number, cfg = WAVE_CONFIG): number {
  if (!pending) return 0;
  const room = cfg.maxAlive - alive;
  if (room <= 0) return 0;
  if (alive < cfg.below || waitedS >= cfg.intervalS * 2) return Math.min(cfg.batch, pending, room);
  return 0;
}

/** Posições dos monstros na arena (900 px): linhas de até 6, passo vertical de 48 px em torno de y = 222, espaçamento min(150, 780 / colunas). */
export function wavePositions(total: number): { x: number; y: number }[] {
  const cols = Math.max(1, Math.min(total, 6)), spacing = Math.min(150, 780 / cols), rows = Math.min(4, Math.ceil(total / 6));
  return Array.from({ length: total }, (_, i) => {
    const row = Math.min(3, Math.floor(i / 6)), inRow = Math.min(6, total - row * 6), col = i - row * 6;
    return { x: 512 + (col - (inRow - 1) / 2) * spacing, y: 222 + (row - (rows - 1) / 2) * 48 };
  });
}
