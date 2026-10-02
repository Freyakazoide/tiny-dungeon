import { sym } from './draw';
import type { Family, PartDef, SlotCategory, Template } from './parts';

const P = (familia: Family, slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia, slot, grid, anchors, ...extra });
const slot = (s: string, nome: string, categoria: SlotCategory, opcional = false) => ({ slot: s, nome, categoria, ...(opcional ? { opcional } : {}) });
const SPARKS = ['...p...', '.e...e.', '.......', '..e.e..', '.......'];
const sparks = (f: Family, alvoSlot: string, ancora: string, modo: 'fora' | 'dentro' | 'livre' = 'fora'): PartDef =>
  P(f, 'efeito', 'faiscas', 'Faíscas', SPARKS, { ref: [3, 4] }, { alvo: { slot: alvoSlot, ancora, ref: 'ref', modo }, exigeEmissivo: true, desde: 'epic' });
/** Textura de malha: troca `b` por `s` em xadrez dentro do corpo (da coluna `from` em diante). */
const mesh = (rows: string[], from = 3): string[] => rows.map((r, y) => [...r].map((c, x) => (c === 'b' && x >= from && (x + y) % 2 === 0 ? 's' : c)).join(''));

// ---------- CABEÇA ----------
const shells: PartDef[] = [
  P('cabeca', 'shell', 'elmo', 'Elmo aberto', sym(['..hhhb', '.hhpbb', 'hhpbbb', 'hhbbbb', 'hhbbbb', 'hhbooo', 'hhbooo', 'hhbooo', '.hbooo', '.ss..o']), { crown: [5, 0], front: [5, 3] }, { tipos: ['metal'] }),
  P('cabeca', 'shell', 'capacete', 'Capacete fechado', sym(['..hhhb', '.hhpbb', 'hhpbbb', 'hhbbbb', 'hooooo', 'hhbbbb', 'hhbbbb', 'hhbbbb', '.hbbbb', '.ssbbb']), { crown: [5, 0], front: [5, 3] }, { tipos: ['metal'] }),
  P('cabeca', 'shell', 'capuz', 'Capuz', sym(['.....b', '...hbb', '..hbbb', '.hbbbb', 'hbbbbb', 'hbbooo', 'hbooob', 'hbooob', 'hbbooo', '.sbbbb', '..ssbb']), { crown: [5, 0], front: [5, 4] }, { tipos: ['organico'] }),
  P('cabeca', 'shell', 'chapeu', 'Chapéu pontudo', sym(['......b', '.....hb', '....hbb', '....hbb', '...hbbb', '..hhbbb', 'hhhhhhb', '.ssssss']), { crown: [6, 0], front: [6, 5] }, { tipos: ['organico'] }),
  P('cabeca', 'shell', 'coroa', 'Coroa', sym(['h..hp', 'hb.hb', 'hbbbb', 'hbbeb', 'ssssb']), { crown: [4, 0], front: [4, 3] }, { tipos: ['metal'] }),
  P('cabeca', 'shell', 'tiara', 'Tiara', sym(['.....p', '....hb', 'hhhbbb', '.ssssb']), { crown: [5, 0], front: [5, 2] }, { tipos: ['metal'] }),
  P('cabeca', 'shell', 'mascara', 'Máscara', sym(['.hhhb', 'hhbbb', 'hoobb', 'hbbbb', '.hbbb', '..sbb']), { crown: [4, 0], front: [4, 2] }),
  P('cabeca', 'shell', 'mitra', 'Mitra', sym(['....p', '...hb', '..hbb', '.hbbb', 'hbbeb', 'hbbbb', 'ooooo', 'ssssb']), { crown: [4, 0], front: [4, 4] }, { tipos: ['organico'] }),
  P('cabeca', 'shell', 'faixa', 'Faixa', sym(['hhhhhb', 'hbbbbb', 'sssssb', '....sb']), { crown: [5, 0], front: [5, 1] }, { tipos: ['organico'] }),
];
const crests: PartDef[] = [
  P('cabeca', 'crest', 'pluma', 'Pluma', sym(['..p', '.hb', '.hb', 'hbb', 'hbb', '.sb', '..b']), { base: [2, 6] }, { desde: 'uncommon' }),
  P('cabeca', 'crest', 'chifres', 'Chifres', sym(['h.....', 'hb....', 'hb....', '.hb...', '..hbbb', '...hbb']), { base: [5, 5] }, { desde: 'uncommon' }),
  P('cabeca', 'crest', 'espinhos', 'Espinhos', sym(['..p', '.hb', 'hbb']), { base: [2, 2] }, { desde: 'rare' }),
];
const jewels: PartDef[] = [P('cabeca', 'gem', 'joia', 'Joia', ['.p.', 'hes', '.s.'], { c: [1, 1] }, { tipos: ['cristal', 'magia'], desde: 'rare' })];
const headFx: PartDef[] = [sparks('cabeca', 'shell', 'crown')];

// ---------- TORSO (largura 15; centro na coluna 7) ----------
const plate = ['.hhhh.oo', 'hhppbbbb', 'hhpbbbbb', 'hbbbbbbb', 'hbbpbbbb', 'hb.bbbbb', 'hb.bbbbb', 'hb.bbbbb', '.s.bbbbb', '...bbbbb', '...sbbbb', '...sssss'];
const torsoBodies: PartDef[] = [
  P('torso', 'body', 'couraca', 'Couraça', sym(plate), { neck: [7, 0], chest: [7, 4], waist: [7, 9] }, { tipos: ['metal'] }),
  P('torso', 'body', 'cota', 'Cota de malha', sym(mesh(plate)), { neck: [7, 0], chest: [7, 4], waist: [7, 9] }, { tipos: ['metal'] }),
  P('torso', 'body', 'tunica', 'Túnica', sym(['..hhh.oo', '.hhbbbbb', 'hhbbbbbb', 'hbbbbbbb', 'hb.bbbbb', 'hb.bbbbb', 'hb.bbbbb', '.s.bbbbb', '...bbbbb', '...bbbbb', '...bbbbb', '...sssss']), { neck: [7, 0], chest: [7, 3], waist: [7, 8] }, { tipos: ['organico'] }),
  P('torso', 'body', 'manto', 'Manto', sym(['..hhh.oo', '.hhbbbbb', 'hhbbbbbb', 'hbbbbbbb', 'hbbbbbbb', 'hb.bbbbb', 'hb.bbbbb', 'hb.bbbbb', '.hbbbbbb', '.hbbbbbb', 'hbbbbbbb', 'hbbbbbbb', 'hbbbbbbb', 'sssssssb']), { neck: [7, 0], chest: [7, 3], waist: [7, 8] }, { tipos: ['organico'] }),
  P('torso', 'body', 'gibao', 'Gibão', sym(['..hhh.oo', '.hhbbboo', 'hhbbbbbo', 'hbbbbbbo', 'hb.bbbbo', 'hb.bbbbo', 'hb.bbbbo', '.s.bbbbo', '...bbbbb', '...sbbbb', '...sssss']), { neck: [7, 0], chest: [7, 3], waist: [7, 7] }, { tipos: ['organico'] }),
  P('torso', 'body', 'colete', 'Colete', sym(['.....hoo', '...hhbbb', '...hbbbb', '...bbbbb', '...bbbbb', '...bbbbb', '...bbbbb', '...bbbbb', '...sbbbb', '...sssss']), { neck: [7, 0], chest: [7, 3], waist: [7, 6] }),
];
const torsoTrims: PartDef[] = [
  P('torso', 'trim', 'cinto', 'Cinto', ['ooooooooooo', 'hbbbbpbbbbs'], { c: [5, 1], ref: [5, 1] }, { alvo: { slot: 'body', ancora: 'waist', ref: 'ref', modo: 'dentro' } }),
  P('torso', 'trim', 'gola', 'Gola', ['hhhhhhhhh', '.hbbbbbs.'], { c: [4, 0], ref: [4, 0] }, { alvo: { slot: 'body', ancora: 'neck', ref: 'ref', modo: 'dentro' } }),
  P('torso', 'trim', 'cruz', 'Cruz no peito', ['..h..', '..b..', 'hbbbs', '..b..', '..s..'], { c: [2, 2], ref: [2, 2] }, { alvo: { slot: 'body', ancora: 'chest', ref: 'ref', modo: 'dentro' } }),
];
const torsoGems: PartDef[] = [P('torso', 'gem', 'broche', 'Broche', ['.p.', 'hes', '.s.'], { c: [1, 1], ref: [1, 1] }, { alvo: { slot: 'body', ancora: 'chest', ref: 'ref', modo: 'dentro' }, tipos: ['cristal', 'magia'], desde: 'rare' })];
const torsoFx: PartDef[] = [P('torso', 'efeito', 'runas', 'Runas', ['..e.e..', '.e...e.', '.......', '.e...e.', '..e.e..'], { ref: [3, 2] }, { alvo: { slot: 'body', ancora: 'chest', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' })];

// ---------- PERNAS (largura 11) ----------
const legsBodies: PartDef[] = [
  P('pernas', 'body', 'calcas', 'Calças', sym(['hbbbbb', 'hbbbbb', 'hbbbbb', 'hbbbb.', 'hbbb..', 'hbbs..', 'hbbs..', 'hbbs..', 'hoos..', 'ssss..']), { waist: [5, 0] }),
  P('pernas', 'body', 'grevas', 'Grevas', sym(['hbbbbb', 'hbbbbb', 'hbbbbb', 'hbbbb.', 'hppb..', 'hbbb..', 'hbbs..', 'hbbs..', 'hoos..', 'ssss..']), { waist: [5, 0] }, { tipos: ['metal'] }),
  P('pernas', 'body', 'couraceiras', 'Couraceiras', sym(['hbbbbb', 'hbbbbb', 'hbpbbb', 'hbbbbb', '.hbbbb', '.hbbbb', '.sbbbb', '..ssbb']), { waist: [5, 0] }, { tipos: ['metal'] }),
  P('pernas', 'body', 'curta', 'Calção', sym(['hbbbbb', 'hbbbbb', 'hbbbbb', 'hbbbb.', 'hsss..']), { waist: [5, 0] }, { tipos: ['organico'] }),
];
const legsTrims: PartDef[] = [P('pernas', 'trim', 'cinto', 'Cinto', ['ooooooooooo', 'hbbbbpbbbbs'], { c: [5, 0], ref: [5, 0] }, { alvo: { slot: 'body', ancora: 'waist', ref: 'ref', modo: 'dentro' } })];
const legsFx: PartDef[] = [sparks('pernas', 'body', 'waist', 'livre')];

// ---------- BOTAS (par espelhado, 13 de largura) ----------
const bootBodies: PartDef[] = [
  P('botas', 'body', 'botas', 'Botas', sym(['.hbbb..', '.hbbb..', '.hbbb..', '.hbbb..', '.hbbbs.', 'hbbbbb.', 'ssssss.']), { top: [2, 0] }),
  P('botas', 'body', 'sandalias', 'Sandálias', sym(['.hobo..', '.hbbb..', '.hobo..', '.hbbbs.', 'hbbbbb.', 'ssssss.']), { top: [2, 0] }, { tipos: ['organico'] }),
  P('botas', 'body', 'sabatons', 'Sabatons', sym(['.hbbb..', '.hpbb..', '.hbbb..', '.hbbbs.', 'hbpbbb.', 'hbbbbb.', 'ssssss.']), { top: [2, 0] }, { tipos: ['metal'] }),
  P('botas', 'body', 'sapatos', 'Sapatos', sym(['.hbbb..', '.hbbbs.', 'hbbbbb.', 'ssssss.']), { top: [2, 0] }),
];
const bootFx: PartDef[] = [P('botas', 'efeito', 'brilho', 'Brilho', ['e..', '.e.', '...'], { ref: [0, 0] }, { alvo: { slot: 'body', ancora: 'top', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' })];

// ---------- AMULETO ----------
const chains: PartDef[] = [
  P('amuleto', 'chain', 'corrente', 'Corrente', sym(['h......', '.h.....', '.b.....', '..h....', '..b....', '...h...', '...b...', '....h..', '....b..', '.....h.', '......b']), { bottom: [6, 10] }, { tipos: ['metal'] }),
  P('amuleto', 'chain', 'cordao', 'Cordão', sym(['h......', 'h......', '.h.....', '.h.....', '..h....', '..h....', '...hhhb']), { bottom: [6, 6] }, { tipos: ['organico'] }),
  P('amuleto', 'chain', 'gargantilha', 'Gargantilha', sym(['hhhb.', '...hb', '....b']), { bottom: [4, 2] }),
];
const pendants: PartDef[] = [
  P('amuleto', 'pendant', 'medalhao', 'Medalhão', sym(['..hhb', '.hppb', 'hhbbb', 'hbbeb', 'hhbbb', '.sbbb', '..ssb']), { top: [4, 0], center: [4, 3] }),
  P('amuleto', 'pendant', 'cristal', 'Cristal', sym(['..hb', '.hbb', 'hpeb', 'hbeb', '.hbb', '..sb', '...b']), { top: [3, 0], center: [3, 3] }, { tipos: ['cristal', 'magia'] }),
  P('amuleto', 'pendant', 'olho', 'Olho', sym(['..hhb', '.hbbb', 'hbbeo', '.sbbb', '..ssb']), { top: [4, 0], center: [4, 2] }, { tipos: ['cristal', 'magia', 'organico'] }),
  P('amuleto', 'pendant', 'cruz', 'Símbolo', sym(['...hb', '...hb', 'hhhbb', '...bb', '...bb', '...sb']), { top: [4, 0], center: [4, 2] }, { tipos: ['metal'] }),
  P('amuleto', 'pendant', 'presa', 'Presa', sym(['.hhb', '.hbb', '.hbb', '..sb', '...b']), { top: [3, 0], center: [3, 2] }, { tipos: ['organico'] }),
];
const amuletFx: PartDef[] = [sparks('amuleto', 'pendant', 'center')];

// ---------- ANEL (largura 7) ----------
const bands: PartDef[] = [
  P('anel', 'band', 'simples', 'Aro simples', sym(['..hhb', '.hb..', 'hb...', 'hb...', 'hb...', '.sb..', '..ssb']), { top: [4, 0] }, { tipos: ['metal'] }),
  P('anel', 'band', 'grosso', 'Aro grosso', sym(['.hhhb', 'hhbbb', 'hb...', 'hb...', 'hb...', 'sb...', '.sssb']), { top: [4, 0] }, { tipos: ['metal'] }),
  P('anel', 'band', 'trancado', 'Aro trançado', sym(['..hhb', '.hb..', 'ho...', 'hb...', 'ho...', '.sb..', '..ssb']), { top: [4, 0] }, { tipos: ['metal'] }),
];
const stones: PartDef[] = [
  P('anel', 'stone', 'redonda', 'Pedra redonda', ['.hbs.', 'hpebs', '.bes.', '..s..'], { base: [2, 3], center: [2, 1] }, { tipos: ['cristal', 'magia'] }),
  P('anel', 'stone', 'quadrada', 'Pedra quadrada', ['hhbbs', 'hpebs', 'hbebs', 'sssss'], { base: [2, 3], center: [2, 1] }, { tipos: ['cristal', 'magia'] }),
  P('anel', 'stone', 'gota', 'Gota', ['.p.', 'hbs', 'hes', '.s.'], { base: [1, 3], center: [1, 1] }, { tipos: ['cristal', 'magia'] }),
];
const ringFx: PartDef[] = [sparks('anel', 'stone', 'center')];

export const ARMOR_PARTS: PartDef[] = [
  ...shells, ...crests, ...jewels, ...headFx,
  ...torsoBodies, ...torsoTrims, ...torsoGems, ...torsoFx,
  ...legsBodies, ...legsTrims, ...legsFx,
  ...bootBodies, ...bootFx,
  ...chains, ...pendants, ...amuletFx,
  ...bands, ...stones, ...ringFx,
];
export const ARMOR_TEMPLATES: Partial<Record<Family, Template>> = {
  cabeca: { familia: 'cabeca', nome: 'Elmo e chapéu', raiz: 'shell', ordem: ['shell', 'crest', 'gem', 'efeito'], slots: [slot('shell', 'Cabeça', 'corpo'), slot('crest', 'Cimeira', 'guarnicao', true), slot('gem', 'Joia', 'gema', true), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'crest', ancora: 'base', em: 'shell', emAncora: 'crown' }, { slot: 'gem', ancora: 'c', em: 'shell', emAncora: 'front' }] },
  torso: { familia: 'torso', nome: 'Armadura', raiz: 'body', ordem: ['body', 'trim', 'gem', 'efeito'], slots: [slot('body', 'Corpo', 'corpo'), slot('trim', 'Detalhe', 'guarnicao', true), slot('gem', 'Broche', 'gema', true), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [] },
  pernas: { familia: 'pernas', nome: 'Calças', raiz: 'body', ordem: ['body', 'trim', 'efeito'], slots: [slot('body', 'Corpo', 'corpo'), slot('trim', 'Cinto', 'guarnicao', true), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [] },
  botas: { familia: 'botas', nome: 'Botas', raiz: 'body', ordem: ['body', 'efeito'], slots: [slot('body', 'Corpo', 'corpo'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [] },
  amuleto: { familia: 'amuleto', nome: 'Amuleto', raiz: 'chain', ordem: ['chain', 'pendant', 'efeito'], slots: [slot('chain', 'Corrente', 'guarnicao'), slot('pendant', 'Pingente', 'gema'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'pendant', ancora: 'top', em: 'chain', emAncora: 'bottom' }] },
  anel: { familia: 'anel', nome: 'Anel', raiz: 'band', ordem: ['band', 'stone', 'efeito'], slots: [slot('band', 'Aro', 'guarnicao'), slot('stone', 'Pedra', 'gema', true), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'stone', ancora: 'base', em: 'band', emAncora: 'top' }] },
};
