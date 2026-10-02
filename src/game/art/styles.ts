import type { Grid } from './data';

/**
 * Variedade de personagem por camadas, sem desenhar quadros novos: o corpo é o `squire` e cada penteado, chapéu/elmo e capa
 * é um conjunto de remendos (letras da paleta) posicionados em relação ao topo do cabelo, que se move com a pose.
 * `over` pinta por cima de tudo; `under` só onde está vazio (atrás do corpo). `.` não mexe.
 */
export interface StyleOption { id: string; nome: string }
export type FrameDir = 'down' | 'up' | 'right';
interface Patch { x: number; y: number; rows: string[]; mode: 'over' | 'under' }
type PerDir = Partial<Record<FrameDir, Patch[]>>;

export const HAIR_STYLES: readonly StyleOption[] = [
  { id: 'curto', nome: 'Curto' }, { id: 'longo', nome: 'Longo' }, { id: 'volumoso', nome: 'Volumoso' },
  { id: 'coque', nome: 'Coque' }, { id: 'moicano', nome: 'Moicano' }, { id: 'raspado', nome: 'Raspado' },
];
export const HEADGEAR: readonly StyleOption[] = [
  { id: 'nenhum', nome: 'Sem nada' }, { id: 'bandana', nome: 'Bandana' }, { id: 'capuz', nome: 'Capuz' },
  { id: 'elmo', nome: 'Elmo com crista' }, { id: 'chapeu_mago', nome: 'Chapéu pontudo' }, { id: 'coroa', nome: 'Coroa' },
];
export const NO_CAPE = 'nenhuma';
export const isHairStyle = (id: unknown): id is string => HAIR_STYLES.some(s => s.id === id);
export const isHeadgear = (id: unknown): id is string => HEADGEAR.some(s => s.id === id);

/** Cobrem o cabelo: o penteado só mostra o que passa por baixo (cabelo longo, volume lateral). */
const COVERS = new Set(['capuz', 'elmo', 'chapeu_mago']);

const patch = (x: number, y: number, rows: string[], mode: Patch['mode'] = 'over'): Patch => ({ x, y, rows, mode });

const LONGO: PerDir = {
  down: [patch(6, 8, ['Aa', 'Aa', 'Aa', 'Aa', 'Aa']), patch(16, 8, ['aA', 'aA', 'aA', 'aA', 'aA'])],
  up: [patch(7, 8, ['aaaaaaaaaa', 'aaAaaaaAaa', 'aaaaaaaaaa', 'aaAaaaaAaa', 'aaaaaaaaaa', '.aaaaaaaa.'])],
  right: [patch(8, 8, ['Aaa', 'Aaa', 'Aaa', 'Aaa'])],
};
const MOICANO: PerDir = {
  down: [patch(10, -3, ['.aa.', 'aAaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa'])],
  up: [patch(10, -3, ['.aa.', 'aAaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa', 'aaaa'])],
  right: [patch(9, -3, ['..aaa.', '.aAaaa', 'aaaaaaa', 'aaaaaaa'], 'over')],
};
const COQUE: PerDir = {
  down: [patch(10, -3, ['.aa.', 'aAaa', 'aaaa'])],
  up: [patch(10, -3, ['.aa.', 'aAaa', 'aaaa'])],
  right: [patch(5, 0, ['.aa.', 'aAaa', 'aaaa', '.aa.'])],
};
const HAIR: Record<string, PerDir> = { longo: LONGO, moicano: MOICANO, coque: COQUE };

const HEAD: Record<string, PerDir> = {
  elmo: {
    down: [patch(11, -2, ['rr', 'rr']), patch(10, -1, ['rrrr']), patch(8, 0, ['TTTTTTTT']), patch(11, 4, ['uu', 'uu', 'uu'])],
    up: [patch(11, -2, ['rr', 'rr']), patch(10, -1, ['rrrr']), patch(8, 0, ['TTTTTTTT'])],
    right: [patch(11, -2, ['rr']), patch(10, -1, ['rrrr']), patch(9, 0, ['TTTTTTT'])],
  },
  chapeu_mago: {
    down: [patch(11, -3, ['cc', 'bb', 'bb']), patch(10, -1, ['bBbb']), patch(5, 2, ['BBBBBBBBBBBBBB', '.cccccccccccc.'])],
    up: [patch(11, -3, ['cc', 'bb', 'bb']), patch(10, -1, ['bbbb']), patch(5, 2, ['BBBBBBBBBBBBBB', '.cccccccccccc.'])],
    right: [patch(11, -3, ['cc', 'bb', 'bb']), patch(10, -1, ['bBbb']), patch(6, 2, ['BBBBBBBBBBBBB', '.cccccccccc..'])],
  },
  coroa: {
    down: [patch(11, -3, ['yy']), patch(8, -2, ['y..oo..y']), patch(8, -1, ['oooooooo']), patch(8, 0, ['OOOOOOOO'])],
    up: [patch(11, -3, ['yy']), patch(8, -2, ['y..oo..y']), patch(8, -1, ['oooooooo']), patch(8, 0, ['OOOOOOOO'])],
    right: [patch(12, -3, ['yy']), patch(9, -2, ['y..oo.y']), patch(9, -1, ['ooooooo']), patch(9, 0, ['OOOOOOO'])],
  },
  bandana: {
    down: [patch(6, 3, ['rrrrrrrrrrrr'])],
    up: [patch(6, 3, ['rrrrrrrrrrrr']), patch(18, 3, ['xx', '.x', '.x'])],
    right: [patch(7, 3, ['rrrrrrrrrrr']), patch(5, 3, ['xxx', 'x..', 'x..'])],
  },
};

const CAPE: PerDir = {
  down: [patch(9, 8, ['&ZZZZ%', '.&ZZ%.'])],
  up: [patch(8, 8, ['%ZZZZZZ%', '%Z&ZZZZ%', '%Z&ZZZZ%', '%Z&ZZZZ%', '%ZZ&ZZZ%', '%ZZ&ZZZ%', '%ZZ&ZZZ%', '%ZZZZZZ%', '%ZZZZZZ%', '%ZZZZZZ%', '%ZZZZZZ%', '%%%%%%%%'])],
  right: [patch(6, 9, ['Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'ZZ', 'ZZ', 'ZZ', 'ZZ', 'ZZ', '&ZZ'], 'under'), patch(4, 14, ['Z', 'Z', 'Z', 'Z'], 'under')],
};

const HAIR_CHARS = new Set(['a', 'A']);
const HEADGEAR_RECOLOR: Record<string, Record<string, string>> = {
  capuz: { a: 'b', A: 'c' }, elmo: { a: 't', A: 'u' }, chapeu_mago: { a: 'b', A: 'c' },
};

export interface StyleLook { estilo: string; topo: string; capa: string }

/** Aplica penteado, chapéu/elmo e capa a um quadro do corpo (`down`, `up` ou `right`; `left` é o `right` espelhado depois). */
export function styleGrid(grid: Grid, dir: FrameDir, look: StyleLook): Grid {
  const out = grid.map(row => [...row]), w = out[0]?.length ?? 0, h = out.length;
  let top = -1;
  for (let y = 0; y < h && top < 0; y++) if (out[y].some(c => HAIR_CHARS.has(c))) top = y;
  if (top < 0) return out;
  const put = (x: number, y: number, ch: string, mode: Patch['mode']) => {
    if (ch === '.' || x < 0 || y < 0 || x >= w || y >= h) return;
    if (mode === 'under' && out[y][x] !== '.') return;
    out[y][x] = ch;
  };
  const apply = (patches: Patch[] | undefined) => patches?.forEach(p => p.rows.forEach((row, ry) => [...row].forEach((ch, rx) => put(p.x + rx, top + p.y + ry, ch, p.mode))));
  const recolor = (map: Record<string, string>) => out.forEach(row => row.forEach((c, x) => { if (map[c]) row[x] = map[c]; }));
  const covers = COVERS.has(look.topo);

  if (HEADGEAR_RECOLOR[look.topo]) recolor(HEADGEAR_RECOLOR[look.topo]);
  if (look.estilo === 'raspado') recolor({ a: 'p', A: 'P' });
  if (look.estilo === 'volumoso' && !covers) { // dilata o cabelo 2 px na região da cabeça, só sobre o vazio
    for (let pass = 0; pass < 2; pass++) {
      const add: [number, number][] = [];
      for (let y = Math.max(0, top - 2); y <= top + 7; y++) for (let x = 0; x < w; x++) if (out[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => HAIR_CHARS.has(out[y + dy]?.[x + dx] ?? '.'))) add.push([x, y]);
      for (const [x, y] of add) out[y][x] = 'a';
    }
  }
  if (HAIR[look.estilo] && (look.estilo === 'longo' || !covers)) {
    if (look.estilo === 'moicano') recolor({ a: 'p', A: 'P' }); // o moicano raspa as laterais antes da crista
    apply(HAIR[look.estilo][dir]);
  }
  apply(HEAD[look.topo]?.[dir]);
  if (look.capa !== NO_CAPE) apply(CAPE[dir]);
  return out;
}
