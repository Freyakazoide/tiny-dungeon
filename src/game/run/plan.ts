import { WAVE_EXTRAS, BOSS_EXTRAS } from '../data/balance';
import { HUNT_BY_ID } from '../data/hunts';
import { MONSTERS } from '../data/monsters';
import { extrasTableFor, limitExtra, reinforcementIds, rollExtra, tierOfExtra, type WaveTier } from '../systems/waves';
import { mix, pick, randInt, rngFor } from './rng';

/**
 * Corredor procedural infinito. Unidades em células (1 célula = 64 px). A distância `d` cresce no sentido em que o grupo anda
 * (na tela, da direita para a esquerda). O mapa é cortado em chunks de `CHUNK_LEN` células; cada chunk é uma função pura de
 * (semente, índice), então pode ser descartado atrás do grupo e regenerado idêntico, e nada precisa ficar guardado.
 */
export const CHUNK_LEN = 24;
export const BAND = 6;                 // largura da faixa andável (linhas)
export const FLOOR_MIN = 0, FLOOR_MAX = 16;  // a faixa sobe e desce por este intervalo (o mapa total tem BAND + FLOOR_MAX linhas)
export const BOSS_EVERY = 10;          // um chunk de chefe a cada N chunks (≈ a cada 4 minutos de caminhada em ritmo normal)
export type ObstacleKind = 'a' | 'b';
export interface Obstacle { c: number; r: number; kind: ObstacleKind }
export type BossPower = 'weak' | 'normal' | 'strong';
export const BOSS_HP_MUL: Record<BossPower, number> = { weak: .8, normal: 1.1, strong: 1.6 };
export interface Encounter {
  /** posição (célula dentro do chunk) em que o grupo "ativa" o encontro: os monstros nascem à frente, fora da tela */
  at: number; tier: WaveTier; extra: number; boss: boolean; bossPower?: BossPower;
  /** ids dos monstros, na ordem em que entram (levas): primeiro o núcleo do encontro, depois os reforços */
  monsters: string[];
}
/** floorStart/floorEnd: linha de cima da faixa no início e no fim do chunk (a faixa faz uma rampa contínua entre as duas). */
export interface Chunk { index: number; start: number; floorStart: number; floorEnd: number; floor: number; obstacles: Obstacle[]; encounter?: Encounter }

export interface RunParams { seed: number; huntId: string }
export const bossIdOf = (huntId: string) => { const waves = (HUNT_BY_ID[huntId] ?? HUNT_BY_ID.catacumbas).waves; return waves[waves.length - 1].monsters.find(id => MONSTERS[id]?.boss) ?? waves[waves.length - 1].monsters[0]; };

/** Altura da faixa ao fim de cada chunk: ruído de valor suave (sem estado, então continua igual ao regenerar). Sobe e desce em ondas longas, com rampas de vários andares. */
export function floorEnd(seed: number, index: number): number {
  if (index < 0) return 8;
  const KNOT = 4, j = Math.floor(index / KNOT), t = index / KNOT - j, k = (n: number) => rngFor(seed, 11, n)();
  const smooth = t * t * (3 - 2 * t), v = k(j) * (1 - smooth) + k(j + 1) * smooth;
  return Math.round(FLOOR_MIN + (index === 0 ? .5 : v) * (FLOOR_MAX - FLOOR_MIN));
}
export const floorAt = floorEnd;
/** Linha de cima da faixa na coluna `c` do chunk (rampa linear entre o início e o fim). */
export const floorInChunk = (chunk: { floorStart: number; floorEnd: number }, c: number) => Math.round(chunk.floorStart + (chunk.floorEnd - chunk.floorStart) * Math.min(1, Math.max(0, (c + .5) / CHUNK_LEN)));
/** Linhas livres de um chunk (índices absolutos do mapa); sempre existe um caminho contínuo de ponta a ponta. */
export const bandRows = (floor: number) => Array.from({ length: BAND }, (_, i) => floor + i);

function rollObstacles(seed: number, index: number, fs: number, fe: number): Obstacle[] {
  const rng = rngFor(seed, 23, index), out: Obstacle[] = [], ch = { floorStart: fs, floorEnd: fe };
  // caminho garantido (em linhas absolutas): serpenteia dentro da faixa, no máximo 1 linha por coluna, e a faixa sobe/desce junto
  let lane = floorInChunk(ch, 0) + randInt(1, BAND - 2, rng);
  const path: number[] = [];
  for (let c = 0; c < CHUNK_LEN; c++) {
    const top = floorInChunk(ch, c), r = rng();
    let next = lane + (r < .2 ? -1 : r > .8 ? 1 : 0);
    next = Math.min(top + BAND - 2, Math.max(top + 1, next));
    if (Math.abs(next - lane) > 1) next = lane + Math.sign(next - lane);
    lane = next; path.push(lane);
  }
  const density = .05 + Math.min(.06, index * .002);
  for (let c = 3; c < CHUNK_LEN - 1; c++) { const top = floorInChunk(ch, c); for (let r = 0; r < BAND; r++) {
    if (Math.abs(top + r - path[c]) <= 1) continue;   // a trilha tem 3 linhas de largura
    if (rng() < density) out.push({ c, r: top + r, kind: rng() < .5 ? 'a' : 'b' });
  } }
  return out;
}

/** Escala de HP e ataque dos monstros pela profundidade: a run é infinita, então a dificuldade sobe sempre (números provisórios, ajustados no balanceamento). */
export const depthScale = (index: number) => ({ hp: 1 + index * .03, atk: 1 + index * .02 });

/** Quantos monstros-núcleo tem um encontro, por profundidade (índice do chunk). */
const baseCount = (index: number) => 3 + Math.min(5, Math.floor(index / 6));

/** Sorteio bruto de reforços do chunk (puro); a regra "sem hordas em sequência" olha o sorteio do chunk anterior. */
function rawExtra(params: RunParams, index: number, boss: boolean): number {
  if (index < 0) return 0;
  const hunt = HUNT_BY_ID[params.huntId], rng = rngFor(params.seed, 31, index);
  const scale = (hunt?.extrasScale ?? 1) * (1 + Math.min(.6, index * .012));
  const lateBonus = !boss && index >= 2 && rng() < Math.min(.6, .06 * index) ? 1 : 0;
  return Math.round(rollExtra(boss ? BOSS_EXTRAS : extrasTableFor(hunt, false), rng) * scale) + lateBonus;
}

export function bossPowerFor(seed: number, index: number): BossPower {
  const rng = rngFor(seed, 41, index), depth = Math.min(.35, index / 200), r = rng();
  return r < .3 - depth ? 'weak' : r < .8 - depth ? 'normal' : 'strong';
}

export function generateChunk(params: RunParams, index: number): Chunk {
  const { seed, huntId } = params, fs = floorEnd(seed, index - 1), fe = floorEnd(seed, index), floor = fs;
  const isBossChunk = index > 0 && (index + 1) % BOSS_EVERY === 0, rng = rngFor(seed, 51, index);
  const chunk: Chunk = { index, start: index * CHUNK_LEN, floorStart: fs, floorEnd: fe, floor, obstacles: index === 0 ? [] : rollObstacles(seed, index, fs, fe) };   // a entrada é livre
  if (index === 0) return chunk;                  // o primeiro chunk é só a entrada: ninguém ataca antes de a run começar
  const { common, elite } = reinforcementIds(huntId);
  const extra = limitExtra(rawExtra(params, index, isBossChunk), { avgHpFraction: 1, lastExtra: rawExtra(params, index - 1, false) });
  const monsters: string[] = [];
  const bossPower = isBossChunk ? bossPowerFor(seed, index) : undefined;
  if (isBossChunk) monsters.push(bossIdOf(huntId));
  const core = isBossChunk ? 3 : baseCount(index);
  for (let i = 0; i < core; i++) monsters.push(i === 0 && !isBossChunk && index > 8 && rng() < .5 ? elite : common);
  for (let i = 0; i < extra; i++) monsters.push(rng() < .15 ? elite : common);
  // na caminhada normal a ordem é: comuns primeiro, elites no meio (já sorteado acima); o chefe entra primeiro
  chunk.encounter = { at: randInt(6, CHUNK_LEN - 8, rng), tier: tierOfExtra(extra), extra, boss: isBossChunk, bossPower, monsters };
  return chunk;
}

/** Janela de chunks em memória: só o que está perto do grupo; o resto é descartado e regenerado sob demanda. */
export class RunPlan {
  private cache = new Map<number, Chunk>();
  constructor(readonly params: RunParams) {}
  chunk(index: number): Chunk { let c = this.cache.get(index); if (!c) { c = generateChunk(this.params, Math.max(0, index)); this.cache.set(index, c); } return c; }
  /** Garante os chunks de `from` a `to` e descarta os que ficaram bem para trás. */
  window(from: number, to: number): Chunk[] {
    for (const key of this.cache.keys()) if (key < from - 2 || key > to + 2) this.cache.delete(key);
    return Array.from({ length: to - from + 1 }, (_, i) => this.chunk(from + i));
  }
  indexAt(d: number) { return Math.max(0, Math.floor(d / CHUNK_LEN)); }
  /** Pré-calcula `count` chunks à frente (a "run" montada antes de a primeira wave começar). */
  precompute(count: number) { for (let i = 0; i < count; i++) this.chunk(i); }
  /** Linha de cima da faixa na posição `d`. */
  floorAtD(d: number) { const chunk = this.chunk(this.indexAt(d)); return floorInChunk(chunk, Math.floor(d - chunk.start)); }
  isBlocked(d: number, row: number): boolean {
    const chunk = this.chunk(this.indexAt(d)), c = Math.floor(d - chunk.start);
    const top = floorInChunk(chunk, c);
    if (row < top || row >= top + BAND) return true;
    return chunk.obstacles.some(o => o.c === c && o.r === Math.floor(row));
  }
}
export { WAVE_EXTRAS, mix, pick };
