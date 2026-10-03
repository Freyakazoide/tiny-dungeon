import { BOSS_EXTRAS, COMMON_DEPTH_HP_CAP } from '../data/balance';
import { HUNT_BY_ID } from '../data/hunts';
import { MONSTERS } from '../data/monsters';
import { extrasTableFor, limitExtra, reinforcementIds, rollExtra, tierOfExtra, type WaveTier } from '../systems/waves';
import { randInt, rngFor } from './rng';

/**
 * Corredor procedural infinito, com curvas de verdade. O mundo é uma grade de células de 64 px em coordenadas (x, y) (y cresce para baixo).
 * O mapa é uma sequência de chunks de `CHUNK_LEN` células por `BAND` de largura; cada chunk tem um quadro (origem + eixo "ao longo" a + eixo
 * "através" b) e a direção pode ser Oeste (esquerda), Norte (cima) ou Sul (baixo). Entre duas direções diferentes há uma sala de canto de
 * BAND × BAND células que faz parte do primeiro trecho do chunk novo. O caminho nunca se cruza (sempre avança para o oeste entre as subidas
 * e descidas). Cada chunk é função pura de (semente, índice); a grade do mundo só guarda a janela perto do grupo.
 */
export const CHUNK_LEN = 24;
export const BAND = 6;                 // largura do corredor (células)
export const BOSS_EVERY = 10;          // um chunk de chefe a cada N chunks
export type Heading = 'W' | 'N' | 'S';
export type ObstacleKind = 'a' | 'b';
export interface Obstacle { c: number; r: number; kind: ObstacleKind }
export type BossPower = 'weak' | 'normal' | 'strong';
export const BOSS_HP_MUL: Record<BossPower, number> = { weak: .8, normal: 1.1, strong: 1.6 };
export interface Encounter {
  /** progresso (células desde o início do chunk) em que o grupo "ativa" o encontro: os monstros nascem à frente, fora da tela */
  at: number; tier: WaveTier; extra: number; boss: boolean; bossPower?: BossPower;
  /** ids dos monstros, na ordem em que entram (levas): primeiro o núcleo do encontro, depois os reforços */
  monsters: string[];
  /** os últimos `ambush` monstros da lista nascem ATRÁS do grupo (emboscada) e vão direto na backline */
  ambush?: number;
}
/** Quadro de um chunk: ponto do mundo = (ox, oy) + a·c + b·r, com c ao longo e r através (a e b são vetores unitários dos eixos). */
export interface Frame { ox: number; oy: number; ax: number; ay: number; bx: number; by: number }
export interface Trap { c: number; r: number }
export interface Chunk { index: number; start: number; heading: Heading; frame: Frame; turn?: 'R' | 'L'; obstacles: Obstacle[]; /** armadilhas de espinhos: chão andável que fere quem pisa (nunca sobre obstáculo) */ traps: Trap[]; encounter?: Encounter }

export interface RunParams { seed: number; huntId: string }
export const bossIdOf = (huntId: string) => { const waves = (HUNT_BY_ID[huntId] ?? HUNT_BY_ID.catacumbas).waves; return waves[waves.length - 1].monsters.find(id => MONSTERS[id]?.boss) ?? waves[waves.length - 1].monsters[0]; };

const AXES: Record<Heading, { a: [number, number]; b: [number, number] }> = { W: { a: [-1, 0], b: [0, 1] }, N: { a: [0, -1], b: [-1, 0] }, S: { a: [0, 1], b: [1, 0] } };
const headingOf = (ax: number, ay: number): Heading => ax === -1 ? 'W' : ay === -1 ? 'N' : 'S';
/** Ponto do mundo de uma posição local (c ao longo, r através; valores fracionários valem). */
export const toWorld = (f: Frame, c: number, r: number) => ({ x: f.ox + f.ax * c + f.bx * r, y: f.oy + f.ay * c + f.by * r });
const cellKey = (cx: number, cy: number) => (cx + 1048576) * 2097152 + (cy + 1048576);

/** Escala de HP e ataque dos monstros pela profundidade: a run é infinita, então a dificuldade sobe sempre (números provisórios, ajustados no balanceamento). */
export const depthScale = (index: number, kind: 'common' | 'elite' | 'boss' = 'elite') => ({
  // o HP do comum sobe com a profundidade só até um teto (nunca vira esponja); elite e chefe seguem a escala linear
  hp: kind === 'common' ? 1 + COMMON_DEPTH_HP_CAP * (1 - Math.exp(-index * .03 / COMMON_DEPTH_HP_CAP)) : 1 + index * .03,
  atk: 1 + index * .02,
});

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



/** Quadro do chunk seguinte: reto (continua), à direita (a1 = −b0, b1 = a0) ou à esquerda (a1 = b0, b1 = −a0). */
function nextFrame(f: Frame, next: Heading): { frame: Frame; turn?: 'R' | 'L' } {
  const L = CHUNK_LEN, B = BAND;
  const { a, b } = AXES[next];
  if (a[0] === f.ax && a[1] === f.ay) return { frame: { ox: f.ox + f.ax * L, oy: f.oy + f.ay * L, ax: f.ax, ay: f.ay, bx: f.bx, by: f.by } };
  if (a[0] === -f.bx && a[1] === -f.by) return { turn: 'R', frame: { ox: f.ox + f.ax * L + f.bx * B, oy: f.oy + f.ay * L + f.by * B, ax: -f.bx, ay: -f.by, bx: f.ax, by: f.ay } };
  void b; return { turn: 'L', frame: { ox: f.ox + f.ax * (L + B), oy: f.oy + f.ay * (L + B), ax: f.bx, ay: f.by, bx: -f.ax, by: -f.ay } };
}

function rollObstacles(seed: number, index: number, turn: boolean): Obstacle[] {
  if (index === 0) return [];
  const rng = rngFor(seed, 23, index), L = CHUNK_LEN, B = BAND, guard = turn ? B + 1 : 3, out = new Map<number, Obstacle>();
  // trilha garantida: 2 linhas livres que serpenteiam (no máximo 1 linha por coluna); nenhum obstáculo cai nela
  const lane: number[] = []; let row = randInt(0, B - 2, rng);
  for (let c = 0; c < L; c++) { const r = rng(); row = Math.min(B - 2, Math.max(0, row + (r < .25 ? -1 : r > .75 ? 1 : 0))); lane.push(row); }
  const onLane = (c: number, r: number) => r === lane[c] || r === lane[c] + 1;
  // blocos: grupos de 2 a 6 células coladas (barricadas) que estreitam o corredor e forçam o grupo a se ajeitar
  const clusters = 1 + Math.floor(rng() * 3) + (index > 6 ? 1 : 0);
  for (let k = 0; k < clusters; k++) {
    const size = randInt(2, 6, rng), kind: ObstacleKind = rng() < .5 ? 'a' : 'b';
    let c = randInt(guard, L - 4, rng), r = randInt(0, B - 1, rng);
    for (let n = 0; n < size; n++) {
      if (c >= guard && c <= L - 4 && r >= 0 && r < B && !onLane(c, r)) out.set(c * 8 + r, { c, r, kind });
      const d = rng(); if (d < .25) c++; else if (d < .5) c--; else if (d < .75) r++; else r--;
    }
  }
  return [...out.values()];
}

/** Armadilhas: a partir do 4º trecho, 1 em cada 3 tem 1 ou 2 grupos de 2 a 4 espinhos no meio do chão. Nunca sobre obstáculo, nem na entrada de um canto. */
export const TRAP_FROM = 3;
function rollTraps(seed: number, index: number, turn: boolean, obstacles: Obstacle[]): Trap[] {
  if (index < TRAP_FROM) return [];
  const rng = rngFor(seed, 29, index); if (rng() >= .34) return [];
  const taken = new Set(obstacles.map(o => o.c * 8 + o.r)), out = new Map<number, Trap>(), L = CHUNK_LEN, B = BAND, guard = turn ? B + 2 : 4, groups = 1 + (rng() < .4 ? 1 : 0);
  for (let g = 0; g < groups; g++) {
    let c = randInt(guard, L - 5, rng), r = randInt(0, B - 1, rng); const size = randInt(2, 4, rng);
    for (let n = 0; n < size; n++) {
      if (c >= guard && c <= L - 4 && r >= 0 && r < B && !taken.has(c * 8 + r)) out.set(c * 8 + r, { c, r });
      if (rng() < .5) c++; else r += rng() < .5 ? 1 : -1;
    }
  }
  return [...out.values()];
}

export const AMBUSH_FROM = 2, AMBUSH_CHANCE = .25;
export function generateChunk(params: RunParams, index: number, frame: Frame, heading: Heading, turn?: 'R' | 'L'): Chunk {
  const { seed, huntId } = params;
  const isBossChunk = index > 0 && (index + 1) % BOSS_EVERY === 0, rng = rngFor(seed, 51, index);
  const obstacles = rollObstacles(seed, index, !!turn), chunk: Chunk = { index, start: index * CHUNK_LEN, heading, frame, turn, obstacles, traps: rollTraps(seed, index, !!turn, obstacles) };
  if (index === 0) return chunk;                  // o primeiro chunk é só a entrada: ninguém ataca antes de a run começar
  const { common, elite } = reinforcementIds(huntId);
  const extra = limitExtra(rawExtra(params, index, isBossChunk), { avgHpFraction: 1, lastExtra: rawExtra(params, index - 1, false) });
  const monsters: string[] = [];
  const bossPower = isBossChunk ? bossPowerFor(seed, index) : undefined;
  if (isBossChunk) monsters.push(bossIdOf(huntId));
  const core = isBossChunk ? 3 : baseCount(index);
  for (let i = 0; i < core; i++) monsters.push(i === 0 && !isBossChunk && index > 8 && rng() < .5 ? elite : common);
  for (let i = 0; i < extra; i++) monsters.push(rng() < .15 ? elite : common);
  // emboscada: a partir do 3º trecho, 1 encontro comum em 4 manda 2 ou 3 monstros pelas costas do grupo
  const ambush = !isBossChunk && index >= AMBUSH_FROM && monsters.length >= 4 && rng() < AMBUSH_CHANCE ? Math.min(3, 2 + (rng() < .4 ? 1 : 0)) : 0;
  chunk.encounter = { at: randInt(turn ? BAND + 3 : 6, CHUNK_LEN - 8, rng), tier: tierOfExtra(extra), extra, boss: isBossChunk, bossPower, monsters, ...(ambush ? { ambush } : {}) };
  return chunk;
}

export type Pt = { x: number; y: number };
/**
 * O plano da run: quadros e direções (função pura da semente, calculados em sequência e guardados), chunks e a grade de células andáveis
 * da janela perto do grupo. `isBlocked(x, y)` consulta a grade em coordenadas de mundo.
 */
export class RunPlan {
  private frames: Frame[] = []; private heads: Heading[] = []; private turns: (('R' | 'L') | undefined)[] = [];
  private cache = new Map<number, Chunk>();
  /** célula → 1 (chão), 2 (obstáculo sobre chão) ou 3 (chão com armadilha) */
  private grid = new Map<number, number>();
  private loaded = new Set<number>();
  constructor(readonly params: RunParams) {
    this.frames.push({ ox: 0, oy: 0, ax: -1, ay: 0, bx: 0, by: 1 }); this.heads.push('W'); this.turns.push(undefined);
  }
  private extend(index: number) {
    while (this.frames.length <= index) {
      const i = this.frames.length, prevH = this.heads[i - 1], rng = rngFor(this.params.seed, 71, i);
      let run = 1; for (let k = i - 2; k >= 0 && this.heads[k] === prevH; k--) run++;
      const minRun = prevH === 'W' ? 3 : 2, boss = (i + 1) % BOSS_EVERY === 0 || i < 3;
      let next: Heading = prevH;
      if (!boss && run >= minRun && (rng() < .4 || (prevH !== 'W' && run >= 4))) next = prevH === 'W' ? (rng() < .5 ? 'N' : 'S') : 'W';
      const { frame, turn } = nextFrame(this.frames[i - 1], next);
      this.frames.push(frame); this.heads.push(headingOf(frame.ax, frame.ay)); this.turns.push(turn);
    }
  }
  chunk(index: number): Chunk {
    index = Math.max(0, index);
    let c = this.cache.get(index);
    if (!c) { this.extend(index); c = generateChunk(this.params, index, this.frames[index], this.heads[index], this.turns[index]); this.cache.set(index, c); }
    return c;
  }
  private load(index: number) {
    if (this.loaded.has(index)) return; this.loaded.add(index);
    const chunk = this.chunk(index), blocked = new Set(chunk.obstacles.map(o => o.c * 8 + o.r)), traps = new Set(chunk.traps.map(t => t.c * 8 + t.r));
    for (let c = 0; c < CHUNK_LEN; c++) for (let r = 0; r < BAND; r++) {
      const p = toWorld(chunk.frame, c + .5, r + .5);
      this.grid.set(cellKey(Math.floor(p.x), Math.floor(p.y)), blocked.has(c * 8 + r) ? 2 : traps.has(c * 8 + r) ? 3 : 1);
    }
  }
  private unload(index: number) {
    if (!this.loaded.delete(index)) return;
    const chunk = this.chunk(index);
    for (let c = 0; c < CHUNK_LEN; c++) for (let r = 0; r < BAND; r++) { const p = toWorld(chunk.frame, c + .5, r + .5); this.grid.delete(cellKey(Math.floor(p.x), Math.floor(p.y))); }
  }
  /** Mantém na grade os chunks de `center − 2` a `center + 5` e solta o resto (memória constante em runs longas). */
  ensure(center: number) {
    const lo = Math.max(0, center - 2), hi = center + 5;
    for (const i of [...this.loaded]) if (i < lo || i > hi) this.unload(i);
    for (let i = lo; i <= hi; i++) this.load(i);
    for (const key of this.cache.keys()) if (key < lo - 3 || key > hi) this.cache.delete(key);
  }
  /** Pré-carrega `count` chunks a partir do 0. */
  precompute(count: number) { for (let i = 0; i < count; i++) this.load(i); }
  get loadedCount() { return this.loaded.size; }
  /** Célula (inteira) andável? Obstáculos e paredes são bloqueados. */
  isBlockedCell(cx: number, cy: number) { const k = this.grid.get(cellKey(cx, cy)); return k !== 1 && k !== 3; }
  isBlocked(x: number, y: number) { return this.isBlockedCell(Math.floor(x), Math.floor(y)); }
  /** Existe chão (mesmo com obstáculo) na célula? Usado para desenhar. */
  cellKind(cx: number, cy: number): 0 | 1 | 2 | 3 { return (this.grid.get(cellKey(cx, cy)) ?? 0) as 0 | 1 | 2 | 3; }
  /** A célula tem armadilha de espinhos? */
  isTrap(x: number, y: number) { return this.grid.get(cellKey(Math.floor(x), Math.floor(y))) === 3; }
  indexAt(progress: number) { return Math.max(0, Math.floor(progress / CHUNK_LEN)); }

  /** Ponto da linha central do caminho no progresso `p` (células desde a entrada). Nos cantos a linha passa pelo centro da sala. */
  pathPoint(p: number): Pt {
    const i = this.indexAt(p), chunk = this.chunk(i), c = Math.max(0, p - chunk.start), mid = BAND / 2;
    if (chunk.turn && c < BAND) {
      const prev = this.chunk(i - 1), e = toWorld(prev.frame, CHUNK_LEN, mid), m = toWorld(chunk.frame, mid, mid), x = toWorld(chunk.frame, BAND, mid);
      return c < mid ? { x: e.x + (m.x - e.x) * c / mid, y: e.y + (m.y - e.y) * c / mid } : { x: m.x + (x.x - m.x) * (c - mid) / mid, y: m.y + (x.y - m.y) * (c - mid) / mid };
    }
    return toWorld(chunk.frame, c, mid);
  }
  /** Direção (vetor unitário) do caminho no progresso `p`. */
  forwardAt(p: number): Pt {
    const i = this.indexAt(p), chunk = this.chunk(i), c = p - chunk.start;
    if (chunk.turn && c < BAND / 2) { const prev = this.chunk(i - 1).frame; return { x: prev.ax, y: prev.ay }; }
    return { x: chunk.frame.ax, y: chunk.frame.ay };
  }
  /** Ponto de nascimento à frente do progresso `p`: uma célula livre sorteada na largura do corredor (ou, no canto, na sala). */
  spawnPoint(p: number, rng: () => number): Pt {
    const i = this.indexAt(p), chunk = this.chunk(i), c = Math.max(0, Math.min(CHUNK_LEN - 1, Math.floor(p - chunk.start)));
    for (let t = 0; t < 12; t++) {
      const w = toWorld(chunk.frame, c + .5, Math.floor(rng() * BAND) + .5);
      if (!this.isBlocked(w.x, w.y)) return w;
    }
    return this.pathPoint(p);
  }
}
