/** RNG determinístico (mulberry32) e mistura de inteiros: a mesma semente sempre gera o mesmo mapa e as mesmas hordas. */
export type Rng = () => number;
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Mistura vários inteiros numa semente de 32 bits (cada chunk e cada "fluxo" de sorteio tem a sua, independente da ordem de geração). */
export function mix(...values: number[]): number {
  let h = 0x811C9DC5;
  for (const v of values) { h ^= v | 0; h = Math.imul(h, 0x01000193); h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; }
  return h >>> 0;
}
export const rngFor = (seed: number, ...stream: number[]) => mulberry32(mix(seed, ...stream));
export const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];
export const randInt = (lo: number, hi: number, rng: Rng) => lo + Math.floor(rng() * (hi - lo + 1));
