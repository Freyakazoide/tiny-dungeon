import { band, rep, sym } from './draw';
import type { Family, PartDef, SlotCategory, Template } from './parts';

const P = (familia: Family, slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia, slot, grid, anchors, ...extra });
const slot = (s: string, nome: string, categoria: SlotCategory, opcional = false) => ({ slot: s, nome, categoria, ...(opcional ? { opcional } : {}) });
const SPARKS = ['...p...', '.e...e.', '.......', '..e.e..', '.......'];
const sparks = (f: Family, alvoSlot: string, ancora: string): PartDef =>
  P(f, 'efeito', 'faiscas', 'Faíscas', SPARKS, { ref: [3, 4] }, { alvo: { slot: alvoSlot, ancora, ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'epic' });
const NOTES = ['e..e.', '.e.e.', '.....', 'e...e', '.....'];

// ---------- POÇÃO: frasco de vidro + rolha + líquido (papéis l/L/d com o material do slot `liquido`) ----------
const flask = (id: string, nome: string, rows: string[], mouth: [number, number]): PartDef => P('pocao', 'vessel', id, nome, rows, { mouth }, { materiais: ['vidro'], fonteLiquido: 'liquido' });
const vessels: PartDef[] = [
  flask('pequeno', 'Frasco pequeno', sym(['...hb', '...hb', '..hbb', '.hbbb', 'hbbbb', 'hLLLL', 'hLlll', 'hLlll', 'hllll', '.oddd', '..ooo']), [4, 0]),
  flask('medio', 'Frasco médio', sym(['....hb', '....hb', '...hbb', '..hbbb', '.hbbbb', 'hbbbbb', 'hbbbbb', 'hLLLLL', 'hLllll', 'hLllll', 'hllllll'.slice(0, 6), 'hldddd', '.odddd', '..oooo']), [5, 0]),
  flask('grande', 'Frasco grande', sym(['.....hb', '.....hb', '....hbb', '...hbbb', '..hbbbb', '.hbbbbb', 'hbbbbbb', 'hbbbbbb', 'hLLLLLL', 'hLlllll', 'hLlllll', 'hlllllll'.slice(0, 7), 'hlddddd', '.odddddd'.slice(0, 7), '..oooooo'.slice(0, 7)]), [6, 0]),
  flask('estreito', 'Tubo', sym(['..hb', '..hb', '..hb', '..hb', '.hbb', '.hLL', '.hLl', '.hLl', '.hll', '.hld', '..od', '...o']), [3, 0]),
];
const corks: PartDef[] = [
  P('pocao', 'cork', 'rolha', 'Rolha', ['hbs', 'bbs'], { base: [1, 1] }, { tipos: ['organico'] }),
  P('pocao', 'cork', 'tampa', 'Tampa de metal', ['hbbbs', 'hbbbs', '.sss.'], { base: [2, 2] }, { tipos: ['metal'], desde: 'uncommon' }),
];
const liquidSlot: PartDef[] = [P('pocao', 'liquido', 'puro', 'Líquido', ['b'], {})];
const potionFx: PartDef[] = [sparks('pocao', 'vessel', 'mouth')];

// ---------- ESPÓLIO (loot de monstro) ----------
const loot = (id: string, nome: string, grid: string[], extra: Partial<PartDef> = {}): PartDef => P('espolio', 'item', id, nome, grid, { c: [Math.floor(grid[0].length / 2), Math.floor(grid.length / 2)] }, extra);
const lootParts: PartDef[] = [
  loot('osso', 'Osso', sym(['hh....', 'hbhbbb', 'hbbbbb', '.hbbbb', 'hb....', 'hh....']), { materiais: ['osso', 'pedra', 'cobre'] }),
  loot('presa', 'Presa', sym(['.hhb', '.hbb', '.hbb', '..sb', '..sb', '...b']), { materiais: ['osso', 'ouro', 'prata'] }),
  loot('pelagem', 'Pelagem', sym(['hbbbbb', 'hbbbbb', 'hbhbbb', 'hbbbbb', 'hbbbbb', 'sbsbsb', 's.s.s.']), { materiais: ['pele', 'linho', 'pano_negro', 'cobre'] }),
  loot('escama', 'Escama', sym(['..hhb', '.hbbb', 'hbbpb', 'hbbbb', 'hbbbb', '.sbbb', '..ssb', '...sb']), { materiais: ['escama', 'ferro', 'cobre'] }),
  loot('minerio', 'Minério', sym(['..h..b', '.hhbbb', 'hhpbbb', 'hbbbbb', 'hbbbbb', '.sbbbb', '..ssbb']), { materiais: ['pedra', 'ferro', 'cobre', 'ouro', 'prata'] }),
  loot('cristal', 'Cristal', sym(['...p', '..hb', '.hbb', 'hpeb', 'hbeb', 'hbbb', '.sbb', '..sb']), { tipos: ['cristal', 'magia'] }),
  loot('saquinho', 'Saquinho de pó', sym(['..hhb', '...hb', '..hbb', '.hbbb', 'hbbbb', 'hbpbb', 'hbbbb', '.sbbb', '..ssb']), { materiais: ['linho', 'pele', 'pano_azul', 'pano_negro', 'veludo_vermelho'] }),
  loot('cranio', 'Crânio', sym(['..hhb', '.hhbb', 'hhbbb', 'hoobb', 'hoobb', '.hbob', '.hbbb', '..sbs']), { materiais: ['osso', 'ouro'] }),
];
const lootFx: PartDef[] = [P('espolio', 'efeito', 'brilho', 'Brilho', SPARKS, { ref: [3, 4] }, { alvo: { slot: 'item', ancora: 'c', ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'epic' })];

// ---------- ARMA DE FOGO ----------
const barrels: PartDef[] = [
  P('arma_fogo', 'barrel', 'curto', 'Cano curto', ['.p.', 'hbs', 'hbs', 'hbs', 'hbs', 'ooo', 'hbs', 'hbs'], { tip: [1, 0], base: [1, 7] }, { tipos: ['metal'] }),
  P('arma_fogo', 'barrel', 'longo', 'Cano longo', ['.p.', 'hbs', 'hbs', 'hbs', 'hbs', 'hbs', 'hbs', 'ooo', 'hbs', 'hbs', 'hbs', 'hbs', 'ooo', 'hbs'], { tip: [1, 0], base: [1, 13] }, { tipos: ['metal'] }),
  P('arma_fogo', 'barrel', 'canhao', 'Boca larga', ['.hbs.', 'hhbss', 'hbbbs', 'hbbbs', 'hbbbs', 'ooooo', 'hbbbs', 'hbbbs', 'hbbbs', 'sbbbs'], { tip: [2, 0], base: [2, 9] }, { tipos: ['metal'] }),
];
const gunStocks: PartDef[] = [
  P('arma_fogo', 'stock', 'cabo', 'Cabo', ['hbs', 'hbs', 'hbs', 'hbs', '.bs', '.s.'], { top: [1, 0] }, { tipos: ['organico'] }),
  P('arma_fogo', 'stock', 'coronha', 'Coronha', ['hbs', 'hbs', 'hbs', 'hbs', 'hbs', 'hbs', 'hbs', '.bs', '.ss'], { top: [1, 0] }, { tipos: ['organico'] }),
];
const gunFx: PartDef[] = [sparks('arma_fogo', 'barrel', 'tip')];

// ---------- INSTRUMENTO ----------
const instruments: PartDef[] = [
  P('instrumento', 'body', 'flauta', 'Flauta', Array.from({ length: 20 }, (_, i) => (i === 0 ? 'hbs' : i % 3 === 0 ? 'hos' : 'hbs')), { top: [1, 0] }),
  P('instrumento', 'body', 'alaude', 'Alaúde', sym(['...pb', '...hb', '...hb', '...hb', '...hb', '...hb', '..hhb', '.hbbb', 'hbbbb', 'hbboo', 'hbbbb', '.sbbb', '..ssb']), { top: [4, 0] }),
  P('instrumento', 'body', 'lira', 'Lira', sym(['hp..h', 'hb..h', 'hb..h', 'hb..h', '.hb.h', '..hhb', '...hb']), { top: [4, 0] }),
  P('instrumento', 'body', 'tambor', 'Tambor', sym(['..hhb', '.hppb', 'hbbbb', 'hobob', 'hbbbb', 'hobob', '.sbbb', '..ssb']), { top: [4, 0] }),
  P('instrumento', 'body', 'sino', 'Sino', sym(['...hb', '..hbb', '.hbbb', '.hbbb', 'hbbbb', 'hbbbb', 'ssssb', '...pb']), { top: [4, 0] }),
];
const instFx: PartDef[] = [P('instrumento', 'efeito', 'notas', 'Notas', NOTES, { ref: [2, 4] }, { alvo: { slot: 'body', ancora: 'top', ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'rare' })];

// ---------- LUVAS (par espelhado) ----------
const gloves: PartDef[] = [
  P('luvas', 'body', 'luvas', 'Luvas', sym(['.hbbb..', 'hbbbbb.', 'hbbbbb.', 'hbbbbb.', '.hbbb..', '.sooo..', '.hbbb..', '.sbbs..']), { top: [2, 0] }, { tipos: ['organico'] }),
  P('luvas', 'body', 'manopla', 'Manopla', sym(['.hppb..', 'hbbbbb.', 'hbpbbb.', 'hbbbbb.', '.hbbb..', 'hhbbbs.', 'hbbbbs.', 'sssss..']), { top: [2, 0] }, { tipos: ['metal'] }),
  P('luvas', 'body', 'garras', 'Garras', sym(['p.p.p..', 'hbbbbb.', 'hbbbbb.', 'hbbbbb.', '.hbbb..', '.sooo..', '.hbbb..']), { top: [2, 1] }),
  P('luvas', 'body', 'ataduras', 'Ataduras', sym(['.hbbb..', 'hobbbb.', 'hbobbb.', 'hbbobb.', '.hbbob.', '.hbbbo.', '.sbbbs.']), { top: [2, 0] }, { tipos: ['organico'] }),
];
const gloveFx: PartDef[] = [P('luvas', 'efeito', 'brilho', 'Brilho', ['e..', '.e.', '...'], { ref: [0, 0] }, { alvo: { slot: 'body', ancora: 'top', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' })];

export const MISC_PARTS: PartDef[] = [
  ...vessels, ...corks, ...liquidSlot, ...potionFx,
  ...lootParts, ...lootFx,
  ...barrels, ...gunStocks, ...gunFx,
  ...instruments, ...instFx,
  ...gloves, ...gloveFx,
];
export const MISC_TEMPLATES: Partial<Record<Family, Template>> = {
  pocao: { familia: 'pocao', nome: 'Poção', raiz: 'vessel', ordem: ['vessel', 'cork', 'efeito'], slots: [slot('vessel', 'Frasco', 'vidro'), slot('cork', 'Tampa', 'cabo'), slot('liquido', 'Líquido', 'liquido'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'cork', ancora: 'base', em: 'vessel', emAncora: 'mouth' }] },
  espolio: { familia: 'espolio', nome: 'Espólio', raiz: 'item', ordem: ['item', 'efeito'], slots: [slot('item', 'Item', 'espolio'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [] },
  arma_fogo: { familia: 'arma_fogo', nome: 'Arma de fogo', raiz: 'stock', ordem: ['stock', 'barrel', 'efeito'], slots: [slot('barrel', 'Cano', 'lamina'), slot('stock', 'Cabo', 'cabo'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [{ slot: 'barrel', ancora: 'base', em: 'stock', emAncora: 'top' }] },
  instrumento: { familia: 'instrumento', nome: 'Instrumento', raiz: 'body', ordem: ['body', 'efeito'], slots: [slot('body', 'Corpo', 'corpo'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [] },
  luvas: { familia: 'luvas', nome: 'Luvas', raiz: 'body', ordem: ['body', 'efeito'], slots: [slot('body', 'Corpo', 'corpo'), slot('efeito', 'Efeito mágico', 'efeito', true)], joins: [] },
};
// `band` e `rep` ficam exportados por draw.ts; referência para o linter de imports não usados
void band; void rep;
