/**
 * Ajudantes de desenho de partes. As grades são strings; `sym` espelha uma metade (com o centro na última coluna) trocando brilho e sombra,
 * para peças simétricas receberem a luz de cima/esquerda sozinhas.
 */
const SWAP: Record<string, string> = { h: 's', s: 'h' };
/** Metade esquerda (a última coluna é o centro) → peça inteira, com `h`/`s` trocados no lado espelhado. */
export const sym = (rows: string[]): string[] => rows.map(r => r + [...r].slice(0, -1).reverse().map(c => SWAP[c] ?? c).join(''));
export const rep = (row: string, n: number): string[] => Array<string>(n).fill(row);
/** Cola grades lado a lado (mesma altura; a menor é completada com `.` embaixo). */
export const beside = (...grids: string[][]): string[] => {
  const h = Math.max(...grids.map(g => g.length));
  return Array.from({ length: h }, (_, y) => grids.map(g => g[y] ?? '.'.repeat(g[0].length)).join(''));
};
/** Faixa de `n` linhas de `row`. */
export const band = (n: number, row: string) => rep(row, n);
