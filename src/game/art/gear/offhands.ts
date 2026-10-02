import { band, rep, sym } from './draw';
import type { Family, PartDef, SlotCategory, Template } from './parts';

const P = (familia: Family, slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia, slot, grid, anchors, ...extra });
const FX_SPARKS = ['...p...', '.e...e.', '.......', '..e.e..', '.......'];
const sparks = (f: Family, slot: string, ancora: string): PartDef =>
  P(f, 'efeito', 'faiscas', 'Faíscas', FX_SPARKS, { ref: [3, 4] }, { alvo: { slot, ancora, ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'epic' });
const slot = (s: string, nome: string, categoria: SlotCategory, opcional = false) => ({ slot: s, nome, categoria, ...(opcional ? { opcional } : {}) });

/** Emblemas de 5×5 (âncora `center` no meio) usados em escudo e livro. */
const emblems = (f: Family): PartDef[] => [
  P(f, 'emblem', 'cruz', 'Cruz', ['..h..', '..b..', 'hbbbs', '..b..', '..s..'], { center: [2, 2] }),
  P(f, 'emblem', 'boss', 'Bojo', ['.hbs.', 'hpbbs', 'hbbbs', 'hbbss', '.sss.'], { center: [2, 2] }),
  P(f, 'emblem', 'estrela', 'Estrela', ['..h..', '.hbs.', 'hbbbs', '.bbs.', '.b.s.'], { center: [2, 2] }),
  P(f, 'emblem', 'gema', 'Gema', ['.hbs.', 'hpebs', 'hbebs', '.bes.', '..s..'], { center: [2, 2] }, { tipos: ['cristal', 'magia'], desde: 'uncommon' }),
];
const RUNES = ['..e.e..', '.e...e.', '.......', '.e...e.', '..e.e..'];

// ---------- ESCUDO ----------
const shieldBodies: PartDef[] = [
  P('escudo', 'body', 'redondo', 'Escudo redondo', sym(['..hhhhb', '.hhppbb', 'hhpbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', '.hbbbbb', '.ssbbbb', '..sssbb', '....sss']), { center: [6, 6] }),
  P('escudo', 'body', 'brasao', 'Escudo brasão', sym(['hhhhhb', 'hppbbb', 'hhbbbb', 'hhbbbb', 'hhbbbb', 'hhbbbb', '.hbbbb', '.hbbbb', '..sbbb', '..sbbb', '...sbb', '....sb', '.....b']), { center: [5, 5] }),
  P('escudo', 'body', 'torre', 'Escudo torre', sym(['hhhhhhb', 'hpppbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'hhbbbbb', 'sssssss']), { center: [6, 5] }),
  P('escudo', 'body', 'broquel', 'Broquel', sym(['..hhb', '.hppb', 'hhbbb', 'hhbbb', 'hhbbb', '.sbbb', '..ssb']), { center: [4, 3] }),
];
const shieldFx: PartDef[] = [
  P('escudo', 'efeito', 'runas', 'Runas', RUNES, { ref: [3, 2] }, { alvo: { slot: 'body', ancora: 'center', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' }),
  sparks('escudo', 'body', 'center'),
];
// ---------- LIVRO ----------
const cover = (deco: 'liso' | 'cinta' | 'moldura'): string[] => {
  const rows = ['hhhhhhhhhhhb', 'hpppbbbbbbbb', ...rep('hobbbbbbbbbs', 11), 'hbbbbbbbbbbs', 'ssssssssssss'];
  if (deco === 'cinta') [6, 7].forEach(y => (rows[y] = 'hooooooooooo'));
  if (deco === 'moldura') { rows[2] = 'hobbbbbbbbbs'.replace(/b/g, 'o'); rows[12] = rows[2]; for (let y = 3; y < 12; y++) rows[y] = 'hoo' + 'bbbbbb' + 'oos'; }
  return rows;
};
const bookCovers: PartDef[] = [
  P('livro', 'cover', 'liso', 'Capa lisa', cover('liso'), { center: [5, 7], pg: [11, 1] }),
  P('livro', 'cover', 'cinta', 'Capa com cinta', cover('cinta'), { center: [5, 7], pg: [11, 1] }),
  P('livro', 'cover', 'moldura', 'Capa emoldurada', cover('moldura'), { center: [5, 7], pg: [11, 1] }),
];
const bookPages: PartDef[] = [P('livro', 'pages', 'paginas', 'Páginas', [...rep('hb', 13)], { a: [0, 0] }, { tipos: ['organico'] })];
const bookFx: PartDef[] = [
  P('livro', 'efeito', 'runas', 'Runas', RUNES, { ref: [3, 2] }, { alvo: { slot: 'cover', ancora: 'center', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' }),
  sparks('livro', 'cover', 'center'),
];
// ---------- ORBE ----------
const orbStands: PartDef[] = [
  P('orbe', 'stand', 'garras', 'Garras', sym(['h....', 'hb...', 'hb...', '.hb..', '..hbb', '....b', '....b']), { socket: [4, 4], base: [4, 6] }),
  P('orbe', 'stand', 'pedestal', 'Pedestal', sym(['..hbb', '..hbb', '...sb', '.hbbb', 'hbbbb', 'sssss']), { socket: [4, 0], base: [4, 5] }),
];
const orbGems: PartDef[] = [
  P('orbe', 'gem', 'esfera', 'Esfera', sym(['..hhb', '.hppb', 'hhpbb', 'hbbbb', 'hbeeb', 'hbbeb', '.sbbb', '..sbb', '....s']), { base: [4, 8], tip: [4, 0] }, { tipos: ['cristal', 'magia', 'metal'] }),
  P('orbe', 'gem', 'cristal', 'Cristal', sym(['...p', '..hb', '.hbb', 'hhbb', 'hpeb', 'hbeb', 'hbeb', '.hbb', '..sb', '...b']), { base: [3, 9], tip: [3, 0] }, { tipos: ['cristal', 'magia'] }),
  P('orbe', 'gem', 'olho', 'Olho', sym(['..hhb', '.hbbb', 'hbbeo', '.sbbb', '..ssb']), { base: [4, 4], tip: [4, 0] }, { tipos: ['cristal', 'magia', 'organico'] }),
];
const orbFx: PartDef[] = [sparks('orbe', 'gem', 'tip')];
// ---------- TOTEM ----------
const totemHeads: PartDef[] = [
  P('totem', 'head', 'mascara', 'Máscara', sym(['..hhb', '.hppb', 'hhbbb', 'hoobb', 'hobbo', 'hbbbb', 'hoooo', '.sbbb']), { base: [4, 7], tip: [4, 0] }),
  P('totem', 'head', 'cranio', 'Crânio', sym(['..hhb', '.hhbb', 'hhbbb', 'hoobb', 'hoobb', '.hbob', '.hbbb', '..sbs']), { base: [4, 7], tip: [4, 0] }, { tipos: ['organico'] }),
  P('totem', 'head', 'sol', 'Sol', sym(['h..hb', '.hhbb', '.hpbb', 'hbbbb', '.sbbb', '.ssbb', 's..sb']), { base: [4, 6], tip: [4, 0] }),
];
const totemPoles: PartDef[] = [
  P('totem', 'pole', 'liso', 'Haste lisa', band(14, 'hbs'), { top: [1, 0], bottom: [1, 13] }),
  P('totem', 'pole', 'entalhado', 'Haste entalhada', Array.from({ length: 14 }, (_, i) => (i % 4 === 3 ? 'ooo' : i % 4 === 1 ? 'hos' : 'hbs')), { top: [1, 0], bottom: [1, 13] }),
];
const totemFx: PartDef[] = [
  P('totem', 'efeito', 'veios', 'Veios mágicos', ['.', '.', 'e', '.', '.', 'e', '.', '.', 'e', '.', '.', 'e', '.', '.'], { ref: [0, 0] }, { alvo: { slot: 'pole', ancora: 'top', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' }),
  sparks('totem', 'head', 'tip'),
];
// ---------- ALJAVA ----------
const quiverBodies: PartDef[] = [
  P('aljava', 'body', 'couro', 'Aljava de couro', sym(['hhhb', 'hbbb', 'hbbb', 'oooo', 'hbbb', 'hbbb', 'hbbb', 'oooo', 'hbbb', 'hbbb', 'hbbb', '.sbb', '.sbb', '..sb']), { mouth: [3, 0] }, { tipos: ['organico'] }),
  P('aljava', 'body', 'ornada', 'Aljava ornada', sym(['pppb', 'hbbb', 'hbbb', 'hpbb', 'hbbb', 'hbbb', 'hpbb', 'hbbb', 'hbbb', 'hpbb', 'hbbb', '.sbb', '.sbb', '..sb']), { mouth: [3, 0] }),
  P('aljava', 'body', 'curta', 'Aljava curta', sym(['hhhb', 'hbbb', 'hbbb', 'oooo', 'hbbb', 'hbbb', '.sbb', '..sb']), { mouth: [3, 0] }, { tipos: ['organico'] }),
];
const quiverArrows: PartDef[] = [
  P('aljava', 'arrows', 'tres', 'Três flechas', ['.p.p.p.', '.b.b.b.', '.b.b.b.', '.b.b.b.', '.o.o.o.', '.b.b.b.'], { base: [3, 5] }),
  P('aljava', 'arrows', 'cinco', 'Cinco flechas', ['p.p.p.p.p', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'o.o.o.o.o', 'b.b.b.b.b'], { base: [4, 5] }),
  P('aljava', 'arrows', 'magicas', 'Flechas mágicas', ['.e.e.e.', '.b.b.b.', '.b.b.b.', '.b.b.b.', '.o.o.o.', '.b.b.b.'], { base: [3, 5] }, { exigeEmissivo: true, desde: 'rare' }),
];
const quiverFx: PartDef[] = [sparks('aljava', 'arrows', 'base')];

export const OFFHAND_PARTS: PartDef[] = [
  ...shieldBodies, ...emblems('escudo'), ...shieldFx,
  ...bookCovers, ...bookPages, ...emblems('livro'), ...bookFx,
  ...orbStands, ...orbGems, ...orbFx,
  ...totemHeads, ...totemPoles, ...totemFx,
  ...quiverBodies, ...quiverArrows, ...quiverFx,
];
export const OFFHAND_TEMPLATES: Partial<Record<Family, Template>> = {
  escudo: { familia: 'escudo', nome: 'Escudo', raiz: 'body', ordem: ['body', 'emblem', 'efeito'], slots: [slot('body', 'Corpo', 'lamina'), slot('emblem', 'Emblema', 'guarnicao', true), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'emblem', ancora: 'center', em: 'body', emAncora: 'center' }] },
  livro: { familia: 'livro', nome: 'Livro', raiz: 'cover', ordem: ['cover', 'pages', 'emblem', 'efeito'], slots: [slot('cover', 'Capa', 'cabo'), slot('pages', 'Páginas', 'cabo'), slot('emblem', 'Emblema', 'guarnicao', true), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'pages', ancora: 'a', em: 'cover', emAncora: 'pg' }, { slot: 'emblem', ancora: 'center', em: 'cover', emAncora: 'center' }] },
  orbe: { familia: 'orbe', nome: 'Orbe', raiz: 'stand', ordem: ['gem', 'stand', 'efeito'], slots: [slot('stand', 'Suporte', 'guarnicao'), slot('gem', 'Esfera', 'gema'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'gem', ancora: 'base', em: 'stand', emAncora: 'socket' }] },
  totem: { familia: 'totem', nome: 'Totem', raiz: 'pole', ordem: ['pole', 'head', 'efeito'], slots: [slot('pole', 'Haste', 'cabo'), slot('head', 'Cabeça', 'lamina'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'head', ancora: 'base', em: 'pole', emAncora: 'top' }] },
  aljava: { familia: 'aljava', nome: 'Aljava', raiz: 'body', ordem: ['arrows', 'body', 'efeito'], slots: [slot('body', 'Corpo', 'cabo'), slot('arrows', 'Flechas', 'lamina'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'arrows', ancora: 'base', em: 'body', emAncora: 'mouth' }] },
};
