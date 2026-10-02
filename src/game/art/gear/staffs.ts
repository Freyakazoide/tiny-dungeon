import type { PartDef } from './parts';

const staff = (slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia: 'cajado', slot, grid, anchors, ...extra });
const rep = (row: string, n: number) => Array<string>(n).fill(row);

const shafts: PartDef[] = [
  staff('shaft', 'liso', 'Haste lisa', rep('hbs', 13), { top: [1, 0], bottom: [1, 12] }),
  staff('shaft', 'anelado', 'Haste anelada', [...rep('hbs', 3), 'ooo', ...rep('hbs', 3), 'ooo', ...rep('hbs', 3), 'ooo', 'hbs'], { top: [1, 0], bottom: [1, 12] }),
  staff('shaft', 'torta', 'Haste torta', ['hbs.', 'hbs.', 'hbs.', '.hbs', '.hbs', '.hbs', '.hbs', 'hbs.', 'hbs.', 'hbs.', 'hbs.', '.hbs', '.hbs'], { top: [1, 0], bottom: [2, 12] }),
];
const butts: PartDef[] = [
  staff('butt', 'ponta', 'Ponteira', ['hbs', '.bs', '.s.', '.o.'], { top: [1, 0] }, { tipos: ['metal'] }),
  staff('butt', 'bola', 'Ponteira redonda', ['hbs', 'bbs', '.s.'], { top: [1, 0] }),
];
/** Engaste: `base` encaixa no topo da haste; `socket` é onde a base da gema assenta. Desenhado por cima da gema (as garras seguram a pedra). */
const cradles: PartDef[] = [
  staff('cradle', 'garras', 'Garras', ['h.....s', 'hb...bs', '.hb.bs.', '..hbs..', '...b...', '...b...'], { base: [3, 5], socket: [3, 3] }, { tipos: ['metal', 'organico'] }),
  staff('cradle', 'coroa', 'Coroa', ['h..h..s', 'hb.hb.s', 'hbbbbbs', '.hbbbs.', '..sbs..', '...s...'], { base: [3, 5], socket: [3, 3] }, { tipos: ['metal'], desde: 'uncommon' }),
  staff('cradle', 'taca', 'Taça', ['hb...bs', 'hbb.bbs', '.hbbbs.', '..sbs..', '...b...'], { base: [3, 4], socket: [3, 2] }, { tipos: ['metal', 'organico'] }),
];
const gems: PartDef[] = [
  staff('gem', 'orbe', 'Orbe', ['.hhb.', 'hpebs', 'hbees', '.bess', '..ss.'], { base: [2, 4], tip: [2, 0] }, { tipos: ['cristal', 'magia'], desde: 'uncommon' }),
  staff('gem', 'cristal', 'Cristal', ['..h..', '.hbs.', 'hhbbs', 'hpebs', 'hbebs', 'hbess', '.bbss', '.bss.', '..s..'], { base: [2, 8], tip: [2, 0] }, { tipos: ['cristal', 'magia'], desde: 'uncommon' }),
  staff('gem', 'cranio', 'Crânio', ['.hhbbs.', 'hhbbbbs', 'hooboos', 'hbbobbs', '.hbbbs.', '..bobs.', '..hshs.'], { base: [3, 6], tip: [3, 0] }, { materiais: ['osso'], desde: 'rare', incompativel: ['cradle/garras', 'cradle/coroa'] }),
];
const effects: PartDef[] = [
  staff('efeito', 'chamas', 'Chamas', ['.s...', '.sb..', '.sbs.', 'sbbbs', 'sbebs', 'sbpbs', '.sbs.', '.....'], { ref: [2, 7] }, { alvo: { slot: 'gem', ancora: 'tip', ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'epic' }),
  staff('efeito', 'faiscas', 'Faíscas', ['...p...', '.e...e.', '.......', '..e.e..', '.......'], { ref: [3, 4] }, { alvo: { slot: 'gem', ancora: 'tip', ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'rare' }),
  staff('efeito', 'veios', 'Veios mágicos', ['.', '.', '.', 'e', '.', '.', 'e', '.', '.', 'e', '.', '.', 'e', '.', '.', 'e', '.', '.'], { ref: [0, 0] }, { alvo: { slot: 'shaft', ancora: 'top', ref: 'ref', modo: 'dentro' }, exigeEmissivo: true, desde: 'rare' }),
];
export const STAFF_PARTS: PartDef[] = [...shafts, ...butts, ...cradles, ...gems, ...effects];
