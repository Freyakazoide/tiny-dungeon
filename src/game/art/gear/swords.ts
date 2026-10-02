import type { PartDef } from './parts';

const sword = (slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia: 'espada', slot, grid, anchors, ...extra });

/** Lâminas: anchors `tip` (ponta) e `base` (última linha, centro: onde entra na guarda). Luz vem de cima/esquerda. */
/** Corpo de lâmina: `n` linhas de `row`, com o brilho especular (`streak`) em faixas curtas de 2 linhas, de 6 em 6. */
const body = (n: number, row: string, streak: string): string[] => Array.from({ length: n }, (_, i) => (i % 6 < 2 ? streak : row));
const blades: PartDef[] = [
  sword('blade', 'reta', 'Lâmina reta', ['..h..', '.hbs.', '.hbs.', ...body(21, 'hhbbs', 'hpbbs')], { tip: [2, 0], base: [2, 23] }),
  sword('blade', 'larga', 'Lâmina larga', ['...h...', '..hbs..', '.hhbss.', ...body(17, 'hhbbbss', 'hhpbbss')].map(r => r.replace('bbbss', 'bobss')), { tip: [3, 0], base: [3, 19] }),
  sword('blade', 'estoque', 'Estoque', ['.h.', 'hbs', 'hbs', ...body(21, 'hbs', 'pbs')], { tip: [1, 0], base: [1, 23] }),
  sword('blade', 'serrilhada', 'Lâmina serrilhada', ['..h..', '.hbs.', '.hbs.', 'hpbbs', 'hpbbs', ...Array.from({ length: 19 }, (_, i) => (i % 2 ? 'hhbs.' : 'hhbbs'))], { tip: [2, 0], base: [2, 23] }),
  sword('blade', 'lascada', 'Lâmina lascada', ['..h..', '.hbs.', '.hbs.', 'hpbbs', 'hpbb.', 'hhbbs', 'hhbbs', 'hpbbs', '.pbbs', 'hhbbs', 'hhbbs', 'hhbs.', 'hhbbs', 'hpbbs', '.pbbs', 'hhbbs', 'hhbbs', 'hhbs.', 'hhbbs', 'hhbbs', '.hbbs', 'hhbbs', 'hhbbs', 'hhbbs'], { tip: [2, 0], base: [2, 23] }),
];

/** Guardas: `up` (onde a lâmina entra) e `down` (onde o cabo começa). */
const guards: PartDef[] = [
  sword('guard', 'simples', 'Guarda simples', ['hhbbbbbss', '.sssssss.'], { up: [4, 0], down: [4, 1] }),
  sword('guard', 'cruzeta', 'Cruzeta curva', ['h.........s', 'hbbbbbbbbbs', '.hsbbbbbss.', '...sssss...'], { up: [5, 1], down: [5, 3] }),
  sword('guard', 'asas', 'Guarda alada', ['hh..hbs..ss', 'hbbbbbbbbbs', '.hbbbbbbbs.', '..sbbbbbs..', '...sssss...'], { up: [5, 0], down: [5, 4] }, { desde: 'uncommon' }),
  sword('guard', 'disco', 'Guarda em disco', ['..hbbbs..', '.hbbbbbs.', '.sssssss.'], { up: [4, 0], down: [4, 2] }),
];

/** Cabos: `top` e `bottom` no centro. */
const grips: PartDef[] = [
  sword('grip', 'couro', 'Cabo trançado', ['hbs', 'hbs', 'ooo', 'hbs', 'hbs', 'ooo', 'hbs'], { top: [1, 0], bottom: [1, 6] }, { tipos: ['organico'] }),
  sword('grip', 'liso', 'Cabo liso', ['hbs', 'hbs', 'hbs', 'hbs', 'hbs', 'hbs'], { top: [1, 0], bottom: [1, 5] }),
  sword('grip', 'longo', 'Cabo de duas mãos', ['hbs', 'hbs', 'ooo', 'hbs', 'hbs', 'ooo', 'hbs', 'hbs', 'ooo', 'hbs'], { top: [1, 0], bottom: [1, 9] }, { tipos: ['organico'] }),
];

/** Pomos: `top` no centro de cima. */
const pommels: PartDef[] = [
  sword('pommel', 'redondo', 'Pomo redondo', ['.hbs.', 'hbbbs', '.sss.'], { top: [2, 0] }),
  sword('pommel', 'disco', 'Pomo em disco', ['hbbbs', '.sss.'], { top: [2, 0] }),
  sword('pommel', 'gema', 'Pomo de gema', ['.hbs.', 'hpebs', '.bes.', '..s..'], { top: [2, 0] }, { tipos: ['cristal', 'magia'], desde: 'rare' }),
];

/** Efeitos sobre a lâmina: `ref` na base do efeito, alinhado ao `base` (ou `tip`) da lâmina. */
const E = (id: string, nome: string, grid: string[], ref: [number, number], alvo: PartDef['alvo'], extra: Partial<PartDef> = {}): PartDef =>
  sword('efeito', id, nome, grid, { ref }, { alvo, ...extra });
const effects: PartDef[] = [
  E('runas', 'Runas', ['.e.', 'e.e', '.e.', '...', 'ee.', '.e.', '.ee', '...', 'e.e', '.e.', 'e.e', '...', '...', '...'], [1, 13], { slot: 'blade', ancora: 'base', ref: 'ref', modo: 'dentro' }, { exigeEmissivo: true, desde: 'rare' }),
  E('veio', 'Veio mágico', ['p', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', '.', '.', '.'], [0, 13], { slot: 'blade', ancora: 'base', ref: 'ref', modo: 'dentro' }, { exigeEmissivo: true, desde: 'rare' }),
  E('ferrugem', 'Ferrugem', ['.....', '..s..', '.sb..', '.....', '.....', '.s.bs', '...ss', '.....', '.....', 'ssb..', '..s..', '.....', '....b', '.....', '.bs..', '.....', '.....', 'sb...', '.....', '...s.', '.....', '.....', '.....', '.....'], [2, 23], { slot: 'blade', ancora: 'base', ref: 'ref', modo: 'dentro' }, { materiais: ['ferrugem'] }),
  E('faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'blade', ancora: 'tip', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];

export const SWORD_PARTS: PartDef[] = [...blades, ...guards, ...grips, ...pommels, ...effects];
