import type { PartDef } from './parts';

const bow = (slot: string, id: string, nome: string, grid: string[], anchors: PartDef['anchors'], extra: Partial<PartDef> = {}): PartDef => ({ id, nome, familia: 'arco', slot, grid, anchors, ...extra });

/** Braço curvo gerado por deslocamentos (da ponta para o punho): cada linha é uma faixa `hbs` (2 px nas pontas) deslocada para a direita. */
function limb(id: string, nome: string, offsets: number[], extra: Partial<PartDef> = {}): PartDef {
  const w = Math.max(...offsets) + 3;
  const grid = offsets.map((o, y) => { const band = y < 2 ? 'hb' : 'hbs'; return '.'.repeat(o) + band + '.'.repeat(w - o - band.length); });
  return bow('limb', id, nome, grid, { tip: [offsets[0] + 1, 0], grip: [offsets[offsets.length - 1] + 1, offsets.length - 1] }, extra);
}
const limbs: PartDef[] = [
  limb('curvo', 'Braço curvo', [6, 5, 4, 3, 3, 2, 2, 1, 1, 0, 0, 0]),
  limb('longo', 'Braço de arco longo', [3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
  limb('recurvo', 'Braço recurvo', [2, 3, 4, 4, 3, 2, 1, 1, 0, 0, 0, 0]),
];
const grips: PartDef[] = [
  bow('grip', 'couro', 'Punho trançado', ['hbs', 'hbs', 'ooo', 'hbs', 'hbs', 'ooo', 'hbs'], { top: [1, 0], bottom: [1, 6], center: [1, 3] }, { tipos: ['organico'] }),
  bow('grip', 'liso', 'Punho liso', ['hbs', 'hbs', 'hbs', 'hbs', 'hbs', 'hbs'], { top: [1, 0], bottom: [1, 5], center: [1, 3] }),
  bow('grip', 'ornado', 'Punho ornado', ['hbs', 'hbs', 'hes', 'hps', 'hes', 'hbs', 'hbs'], { top: [1, 0], bottom: [1, 6], center: [1, 3] }, { tipos: ['cristal', 'magia'], desde: 'rare' }),
];
/** A corda é só uma linha entre as pontas; os papéis se repetem ao longo dela. */
const strings: PartDef[] = [
  bow('corda', 'fio', 'Corda fina', [], {}, { linha: 'h' }),
  bow('corda', 'trancada', 'Corda trançada', [], {}, { linha: 'hb' }),
  bow('corda', 'luz', 'Corda de luz', [], {}, { linha: 'ep', exigeEmissivo: true, desde: 'rare' }),
];
const effects: PartDef[] = [
  bow('efeito', 'raios', 'Raios', ['.e.......', 'epe...e..', '.e...epe.', '......e..', '.........', '..e......', '.epe..e..', '..e..epe.', '......e..'], { ref: [4, 4] }, { alvo: { slot: 'grip', ancora: 'center', ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'rare' }),
  bow('efeito', 'faiscas', 'Faíscas', ['.........', '...e...p.', '.........', 'p.......e', '.........', '.e.....p.', '.........', '...p..e..', '.........'], { ref: [4, 4] }, { alvo: { slot: 'grip', ancora: 'center', ref: 'ref', modo: 'fora' }, exigeEmissivo: true, desde: 'epic' }),
];
export const BOW_PARTS: PartDef[] = [...limbs, ...grips, ...strings, ...effects];
