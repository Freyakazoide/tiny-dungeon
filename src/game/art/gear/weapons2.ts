import { SWORD_PARTS } from './swords';
import { band, rep, sym } from './draw';
import type { Family, PartDef, Template } from './parts';

const P = (familia: Family, slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia, slot, grid, anchors, ...extra });
const E = (familia: Family, id: string, nome: string, grid: string[], ref: [number, number], alvo: NonNullable<PartDef['alvo']>, extra: Partial<PartDef> = {}): PartDef => P(familia, 'efeito', id, nome, grid, { ref }, { alvo, ...extra });

/** Hastes de 3 colunas (cabo/haste) de comprimento `len`: lisa e trançada. */
const hafts = (f: Family, len: number, slot = 'haft'): PartDef[] => [
  P(f, slot, 'liso', 'Haste lisa', band(len, 'hbs'), { top: [1, 0], bottom: [1, len - 1] }),
  P(f, slot, 'trancado', 'Haste trançada', Array.from({ length: len }, (_, i) => (i % 4 === 3 ? 'ooo' : 'hbs')), { top: [1, 0], bottom: [1, len - 1] }, { tipos: ['organico'] }),
  P(f, slot, 'reforcado', 'Haste reforçada', Array.from({ length: len }, (_, i) => (i % 5 === 4 ? 'obo' : 'hbs')), { top: [1, 0], bottom: [1, len - 1] }),
];
const butts = (f: Family): PartDef[] => [
  P(f, 'butt', 'ponta', 'Ponteira', ['hbs', '.bs', '.s.', '.o.'], { top: [1, 0] }, { tipos: ['metal'] }),
  P(f, 'butt', 'bola', 'Ponteira redonda', ['hbs', 'bbs', '.s.'], { top: [1, 0] }),
];

// ---------- MACHADO ----------
const AXE_REF = { slot: 'head', ancora: 'eye', ref: 'ref', modo: 'dentro' } as const;
const withSocket = (cores: string[], extra = 4): string[] => [...cores, ...rep('.........', extra)].map(c => c + 'hbs');
const axeHeads: PartDef[] = [
  P('machado', 'head', 'larga', 'Lâmina larga', withSocket(['..hhhh...', '.hhppbb..', 'hhppbbbb.', 'hhpbbbbbb', 'hhbbbbbbb', 'hhbbbbbbb', 'hhbbbbbbb', 'hhbbbbbss', '.hbbbbsss', '..hbbssss', '...sssss.'], 2), { eye: [10, 12] }),
  P('machado', 'head', 'barba', 'Machado barbado', withSocket(['..hhhh...', '.hhppbb..', 'hhppbbbb.', 'hhpbbbbbb', 'hhbbbbbbb', 'hhbbbbbbb', 'hhbbbbbss', 'hhbbbbsss', '.hbbbssss', '.hbbssss.', '.hbss....', '.ss......'], 1), { eye: [10, 12] }),
  P('machado', 'head', 'dupla', 'Lâmina dupla', sym(['..hhhhb', '.hhppbb', 'hhppbbb', 'hhpbbbb', 'hhbbbbb', 'hhbbbbb', '.hbbbbb', '..sbbbb', '...sbbb', '....hbb', '....hbb']), { eye: [6, 10] }),
];
const axeFx: PartDef[] = [
  E('machado', 'runas', 'Runas', ['.e......', 'e.e.....', '.ee.....', '........', 'e..e....', '.ee.....', '........', '........'], [7, 7], AXE_REF, { exigeEmissivo: true, desde: 'rare' }),
  E('machado', 'ferrugem', 'Ferrugem', ['........', '.s.b....', '........', 'b...s...', '.sb.....', '........', '..b.s...', '........'], [7, 7], AXE_REF, { materiais: ['ferrugem'] }),
  E('machado', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'head', ancora: 'eye', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];
// ---------- MARTELO ----------
const hammerHeads: PartDef[] = [
  P('martelo', 'head', 'marreta', 'Marreta', sym(['hhhhhhb', 'hppppbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'ooooooo', '...hbbb', '...hbbb']), { eye: [6, 8] }),
  P('martelo', 'head', 'pesado', 'Martelo pesado', sym(['hhhhhhhb', 'hpppppbb', 'hhbbbbbb', 'hhbbbbbb', 'hhbbbbbb', 'hhbbbbbb', 'hhbbbbbb', 'sssssssb', '....hbbb', '....hbbb']), { eye: [7, 9] }),
  P('martelo', 'head', 'maca', 'Maça espinhosa', sym(['.....b', '...hhb', '.hhhpb', '.hppbb', 'hhpbbb', 'hhbbbb', 'hhbbbb', '.hbbbb', '..sbbb', '...hbb', '....hb']), { eye: [5, 10] }),
];
const hammerFx: PartDef[] = [
  E('martelo', 'runas', 'Runas', ['.e..e.', '..ee..', '.e..e.', '......', '......', '......', '......', '......'], [3, 7], { slot: 'head', ancora: 'eye', ref: 'ref', modo: 'dentro' }, { exigeEmissivo: true, desde: 'rare' }),
  E('martelo', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'head', ancora: 'eye', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];
// ---------- LANÇA ----------
const spearTips: PartDef[] = [
  P('lanca', 'tip', 'folha', 'Ponta em folha', sym(['..p', '.hb', '.hb', 'hbb', 'hbb', 'hbb', '.hb', '..b']), { tip: [2, 0], base: [2, 7] }),
  P('lanca', 'tip', 'larga', 'Ponta larga', sym(['...p', '..hb', '.hpb', 'hhbb', 'hhbb', '.hbb', '..hb', '...b']), { tip: [3, 0], base: [3, 7] }),
  P('lanca', 'tip', 'fina', 'Ponta fina', sym(['.p', '.b', 'hb', 'hb', 'hb', 'hb', '.b']), { tip: [1, 0], base: [1, 6] }),
  P('lanca', 'tip', 'farpada', 'Ponta farpada', ['..p..', '.hbs.', '.hbs.', 'hhbbs', 'h.bbs'.replace('.', 'h'), 'h.b.s', '..b..', '..b..'].map((r, i) => (i === 5 ? 'h.b.s' : r)), { tip: [2, 0], base: [2, 7] }),
];
const spearFx: PartDef[] = [
  E('lanca', 'veio', 'Veio mágico', ['p', 'e', 'e', 'e', 'e', 'e', '.'], [0, 6], { slot: 'tip', ancora: 'base', ref: 'ref', modo: 'dentro' }, { exigeEmissivo: true, desde: 'rare' }),
  E('lanca', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'tip', ancora: 'tip', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];
// ---------- FOICE ----------
const scytheBlades: PartDef[] = [
  P('foice', 'tip', 'curva', 'Lâmina curva', ['....hhhhhhhhbs', '..hhhhpbbbbhbs', '.hhpbbs....hbs', 'hhpbs......hbs', 'hbs........hbs', 's..........hbs'], { base: [12, 5], tip: [0, 5] }),
  P('foice', 'tip', 'longa', 'Lâmina longa', ['..hhhhhhhhhhhbs', '.hhhhpbbbbbbhbs', 'hhhpbbbssss.hbs', 'hhpbss......hbs', 'hbss........hbs', 'ss..........hbs'], { base: [13, 5], tip: [0, 5] }),
];
const scytheFx: PartDef[] = [
  E('foice', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'tip', ancora: 'tip', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];
// ---------- ADAGA (blades próprias; guarda, cabo e pomo reaproveitam os da espada) ----------
const swordKept = SWORD_PARTS.filter(p => (p.slot === 'guard' && p.id !== 'asas') || (p.slot === 'pommel' && p.id !== 'gema')).map(p => ({ ...p, familia: 'adaga' as Family }));
const daggerBlades: PartDef[] = [
  P('adaga', 'blade', 'faca', 'Faca', ['.h.', 'hbs', ...rep('hbs', 7), 'hbs'], { tip: [1, 0], base: [1, 9] }),
  P('adaga', 'blade', 'punhal', 'Punhal', ['..p..', '.hbs.', '.hbs.', 'hpbbs', ...rep('hhbbs', 4), 'hhbbs'], { tip: [2, 0], base: [2, 8] }),
  P('adaga', 'blade', 'serrilhada', 'Adaga serrilhada', ['..h..', '.hbs.', '.hbs.', 'hhbbs', 'hhbs.', 'hhbbs', 'hhbs.', 'hhbbs', 'hhbs.', 'hhbbs'], { tip: [2, 0], base: [2, 9] }),
  P('adaga', 'blade', 'ondulada', 'Lâmina ondulada', ['.h...', 'hbs..', 'hbs..', '.hbs.', '.hbs.', '..hbs', '..hbs', '.hbs.', '.hbs.', 'hbs..'].map(r => r.padEnd(5, '.')), { tip: [1, 0], base: [2, 9] }),
];
const daggerGrips: PartDef[] = [
  P('adaga', 'grip', 'couro', 'Cabo trançado', ['hbs', 'ooo', 'hbs', 'hbs'], { top: [1, 0], bottom: [1, 3] }, { tipos: ['organico'] }),
  P('adaga', 'grip', 'liso', 'Cabo liso', ['hbs', 'hbs', 'hbs', 'hbs'], { top: [1, 0], bottom: [1, 3] }),
];
const daggerFx: PartDef[] = [
  E('adaga', 'veio', 'Veio mágico', ['p', 'e', 'e', 'e', 'e', '.', '.'], [0, 6], { slot: 'blade', ancora: 'base', ref: 'ref', modo: 'dentro' }, { exigeEmissivo: true, desde: 'rare' }),
  E('adaga', 'ferrugem', 'Ferrugem', ['.....', '.sb..', '.....', '..bs.', '.....', 'sb...', '.....'], [2, 6], { slot: 'blade', ancora: 'base', ref: 'ref', modo: 'dentro' }, { materiais: ['ferrugem'] }),
  E('adaga', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'blade', ancora: 'tip', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];
// ---------- VARINHA ----------
const wandShafts: PartDef[] = [
  P('varinha', 'shaft', 'lisa', 'Varinha lisa', band(10, 'hbs'), { top: [1, 0], bottom: [1, 9] }),
  P('varinha', 'shaft', 'torcida', 'Varinha torcida', ['hbs.', 'hbs.', '.hbs', '.hbs', 'hbs.', 'hbs.', '.hbs', '.hbs', 'hbs.', 'hbs.'], { top: [1, 0], bottom: [1, 9] }),
  P('varinha', 'shaft', 'anelada', 'Varinha anelada', ['hbs', 'hbs', 'hbs', 'ooo', 'hbs', 'hbs', 'hbs', 'ooo', 'hbs', 'hbs'], { top: [1, 0], bottom: [1, 9] }),
];
const wandTips: PartDef[] = [
  P('varinha', 'tip', 'estrela', 'Estrela', ['..p..', '..b..', 'hhbbs', '.bbs.', '..s..'], { base: [2, 4], tip: [2, 0] }, { tipos: ['metal', 'cristal', 'magia'] }),
  P('varinha', 'tip', 'cristal', 'Cristal', ['.p.', 'hbs', 'hes', '.bs', '.s.'], { base: [1, 4], tip: [1, 0] }, { tipos: ['cristal', 'magia'] }),
  P('varinha', 'tip', 'orbe', 'Orbe', ['.hb.', 'hpbs', 'hbes', '.bs.'], { base: [1, 3], tip: [1, 0] }, { tipos: ['cristal', 'magia', 'metal'] }),
];
const wandFx: PartDef[] = [
  E('varinha', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], [3, 4], { slot: 'tip', ancora: 'tip', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'uncommon' }),
];
// ---------- BESTA ----------
const crossLimbs: PartDef[] = [
  P('besta', 'limb', 'curta', 'Arco curto', sym(['hb......', 'hb......', '.hb.....', '.hbb....', '..hbbb..', '....hbbb', '......bb']), { tipL: [0, 0], tipR: [14, 0], grip: [7, 6], center: [7, 5] }),
  P('besta', 'limb', 'larga', 'Arco largo', sym(['hhb......', 'hhb......', '.hhb.....', '..hbb....', '...hbbb..', '.....hbbb', '.......bb']), { tipL: [0, 0], tipR: [16, 0], grip: [8, 6], center: [8, 5] }),
];
const crossStocks: PartDef[] = [
  P('besta', 'stock', 'liso', 'Coronha lisa', band(14, 'hbs'), { top: [1, 0], bottom: [1, 13] }),
  P('besta', 'stock', 'trancada', 'Coronha trançada', Array.from({ length: 14 }, (_, i) => (i % 4 === 3 ? 'ooo' : 'hbs')), { top: [1, 0], bottom: [1, 13] }, { tipos: ['organico'] }),
];
const crossString: PartDef[] = [P('besta', 'corda', 'fio', 'Corda fina', [], {}, { linha: 'h' }), P('besta', 'corda', 'luz', 'Corda de luz', [], {}, { linha: 'ep', exigeEmissivo: true, desde: 'rare' })];
const crossFx: PartDef[] = [
  E('besta', 'faiscas', 'Faíscas', ['.........', '..e...p..', '.........', 'p.......e', '.........'], [4, 4], { slot: 'limb', ancora: 'center', ref: 'ref', modo: 'fora' }, { exigeEmissivo: true, desde: 'epic' }),
];

export const WEAPON2_PARTS: PartDef[] = [
  ...hafts('machado', 14), ...butts('machado'), ...axeHeads, ...axeFx,
  ...hafts('martelo', 14), ...butts('martelo'), ...hammerHeads, ...hammerFx,
  ...hafts('lanca', 22, 'shaft'), ...butts('lanca').map(p => ({ ...p })), ...spearTips, ...spearFx,
  ...hafts('foice', 22, 'shaft'), ...butts('foice'), ...scytheBlades, ...scytheFx,
  ...swordKept, ...daggerBlades, ...daggerGrips, ...daggerFx,
  ...wandShafts, ...wandTips, ...wandFx,
  ...crossLimbs, ...crossStocks, ...crossString, ...crossFx,
];

const slot = (slot: string, nome: string, categoria: Template['slots'][number]['categoria'], opcional = false) => ({ slot, nome, categoria, ...(opcional ? { opcional } : {}) });
const headHaft = (familia: Family, nome: string): Template => ({
  familia, nome, raiz: 'haft', ordem: ['haft', 'butt', 'head', 'efeito'],
  slots: [slot('head', 'Cabeça', 'lamina'), slot('haft', 'Cabo', 'cabo'), slot('butt', 'Ponteira', 'guarnicao', true), slot('efeito', 'Efeito mágico', 'efeito', true)],
  joins: [{ slot: 'head', ancora: 'eye', em: 'haft', emAncora: 'top' }, { slot: 'butt', ancora: 'top', em: 'haft', emAncora: 'bottom' }],
});
const tipShaft = (familia: Family, nome: string): Template => ({
  familia, nome, raiz: 'shaft', ordem: ['shaft', 'butt', 'tip', 'efeito'],
  slots: [slot('tip', 'Ponta', 'lamina'), slot('shaft', 'Haste', 'cabo'), slot('butt', 'Ponteira', 'guarnicao', true), slot('efeito', 'Efeito mágico', 'efeito', true)],
  joins: [{ slot: 'tip', ancora: 'base', em: 'shaft', emAncora: 'top' }, { slot: 'butt', ancora: 'top', em: 'shaft', emAncora: 'bottom' }],
});
export const WEAPON2_TEMPLATES: Partial<Record<Family, Template>> = {
  machado: headHaft('machado', 'Machado'), martelo: headHaft('martelo', 'Martelo'),
  lanca: tipShaft('lanca', 'Lança'), foice: tipShaft('foice', 'Foice'),
  adaga: {
    familia: 'adaga', nome: 'Adaga', raiz: 'guard', ordem: ['blade', 'grip', 'pommel', 'guard', 'efeito'],
    slots: [slot('blade', 'Lâmina', 'lamina'), slot('guard', 'Guarda', 'guarnicao'), slot('grip', 'Cabo', 'cabo'), slot('pommel', 'Pomo', 'guarnicao'), slot('efeito', 'Efeito mágico', 'efeito', true)],
    joins: [{ slot: 'blade', ancora: 'base', em: 'guard', emAncora: 'up' }, { slot: 'grip', ancora: 'top', em: 'guard', emAncora: 'down' }, { slot: 'pommel', ancora: 'top', em: 'grip', emAncora: 'bottom' }],
  },
  varinha: {
    familia: 'varinha', nome: 'Varinha', raiz: 'shaft', ordem: ['shaft', 'tip', 'efeito'],
    slots: [slot('shaft', 'Haste', 'cabo'), slot('tip', 'Ponta', 'gema'), slot('efeito', 'Efeito mágico', 'efeito', true)],
    joins: [{ slot: 'tip', ancora: 'base', em: 'shaft', emAncora: 'top' }],
  },
  besta: {
    familia: 'besta', nome: 'Besta', raiz: 'stock', ordem: ['corda', 'limb', 'stock', 'efeito'],
    slots: [slot('limb', 'Arco', 'lamina'), slot('stock', 'Coronha', 'cabo'), slot('corda', 'Corda', 'corda'), slot('efeito', 'Efeito mágico', 'efeito', true)],
    joins: [{ slot: 'limb', ancora: 'grip', em: 'stock', emAncora: 'top' }], linhas: [{ de: 'limb.tipL', ate: 'limb.tipR', slot: 'corda' }],
  },
};
