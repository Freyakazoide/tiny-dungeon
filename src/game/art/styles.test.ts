import { describe, expect, it } from 'vitest';
import { ART } from './data';
import { defaultLookFor, isValidLook, lookKey, normalizeLook, optionsOf, randomLook } from './look';
import { frameGrid, mirror, styledFrameGrid, type Direction } from './render';
import { HAIR_STYLES, HEADGEAR, NO_CAPE } from './styles';
import { mulberry32 } from '../run/rng';

const opaque = (k: string) => ART.palette[k] !== null;
const DIRS: Direction[] = ['down', 'up', 'left', 'right'];
const capes = optionsOf('capa').map(o => o.id);

describe('variedade de personagem', () => {
  it('toda combinação de penteado × cabeça × capa mantém o tamanho, só usa chaves da paleta e deixa a margem do contorno livre', () => {
    for (const estilo of HAIR_STYLES.map(s => s.id)) for (const topo of HEADGEAR.map(s => s.id)) for (const capa of [NO_CAPE, 'vermelha']) {
      const look = normalizeLook({ estilo, topo, capa });
      for (const dir of DIRS) for (const pose of [1, 2] as const) {
        const g = styledFrameGrid('squire', dir, pose, look), base = frameGrid('personagens', 'squire', dir, pose), tag = `${estilo}/${topo}/${capa} ${dir}_${pose}`;
        expect(g.length, tag).toBe(base.length); for (const row of g) { expect(row.length, tag).toBe(base[0].length); for (const k of row) expect(k in ART.palette, `${tag}:${k}`).toBe(true); }
        expect(g[0].some(opaque), tag).toBe(false); expect(g[g.length - 1].some(opaque), tag).toBe(false); if (dir === 'down' || dir === 'up') expect(g.some(r => opaque(r[0])), tag).toBe(false); // a ponta da espada de perfil já toca a borda (exceção da arte entregue)
      }
    }
  }, 30000);
  it('cada penteado, chapéu/elmo e capa muda o desenho em relação ao padrão (nenhuma opção é de enfeite)', () => {
    const plain = (dir: Direction) => JSON.stringify(styledFrameGrid('squire', dir, 1, normalizeLook({ estilo: 'curto', topo: 'nenhum', capa: NO_CAPE })));
    for (const s of HAIR_STYLES.filter(s => s.id !== 'curto')) expect(DIRS.some(d => JSON.stringify(styledFrameGrid('squire', d, 1, normalizeLook({ estilo: s.id }))) !== plain(d)), s.id).toBe(true);
    for (const t of HEADGEAR.filter(s => s.id !== 'nenhum')) expect(DIRS.some(d => JSON.stringify(styledFrameGrid('squire', d, 1, normalizeLook({ estilo: 'curto', topo: t.id }))) !== plain(d)), t.id).toBe(true);
    expect(DIRS.some(d => JSON.stringify(styledFrameGrid('squire', d, 1, normalizeLook({ estilo: 'curto', capa: 'azul' }))) !== plain(d))).toBe(true);
    for (const d of DIRS) expect(JSON.stringify(styledFrameGrid('squire', d, 1, normalizeLook({ estilo: 'curto', topo: 'nenhum', capa: NO_CAPE })))).toBe(JSON.stringify(frameGrid('personagens', 'squire', d, 1)));
  });
  it('o capuz, o elmo e o chapéu escondem o cabelo; o penteado raspado tira o cabelo', () => {
    const hair = (look: Partial<ReturnType<typeof normalizeLook>>) => styledFrameGrid('squire', 'down', 1, normalizeLook(look)).flat().filter(k => k === 'a' || k === 'A').length;
    expect(hair({ estilo: 'curto' })).toBeGreaterThan(20); expect(hair({ estilo: 'raspado' })).toBe(0);
    for (const topo of ['capuz', 'elmo', 'chapeu_mago']) expect(hair({ estilo: 'curto', topo })).toBe(0);
    expect(hair({ estilo: 'longo', topo: 'elmo' })).toBeGreaterThan(0); // o cabelo comprido sai por baixo do elmo
  });
  it('esquerda é a direita estilizada e espelhada; a pose 2 acompanha o balanço da cabeça', () => {
    const look = normalizeLook({ estilo: 'coque', topo: 'coroa', capa: 'roxa' });
    expect(styledFrameGrid('squire', 'left', 1, look)).toEqual(mirror(styledFrameGrid('squire', 'right', 1, look)));
    const top = (g: string[][]) => g.findIndex(r => r.some(opaque));
    expect(top(styledFrameGrid('squire', 'down', 2, look))).toBeLessThan(top(styledFrameGrid('squire', 'down', 1, look)));
  });
  it('normalizeLook completa save antigo sem os campos novos; estilo desconhecido cai no padrão; isValidLook recusa', () => {
    const old = { body: 'squire', pele: 'clara', cabelo: 'preto', armadura: 'azul' };
    expect(normalizeLook(old, 3)).toEqual({ ...defaultLookFor(3), ...old });
    expect(normalizeLook({ ...old, estilo: 'x', topo: 'y', capa: 'z' }, 0)).toEqual({ ...defaultLookFor(0), ...old });
    expect(isValidLook({ estilo: 'longo', topo: 'coroa', capa: 'azul' })).toBe(true);
    expect(isValidLook({ estilo: 'x' })).toBe(false); expect(isValidLook({ topo: 'x' })).toBe(false); expect(isValidLook({ capa: 'x' })).toBe(false);
  });
  it('os primeiros personagens já saem diferentes (penteado e capa variam), e o aleatório gera só looks válidos e variados', () => {
    expect(new Set([0, 1, 2, 3, 4, 5].map(i => defaultLookFor(i).estilo)).size).toBe(6);
    expect([0, 1, 2].some(i => defaultLookFor(i).capa !== NO_CAPE)).toBe(true);
    const rng = mulberry32(3), looks = Array.from({ length: 200 }, () => randomLook(rng));
    for (const l of looks) expect(isValidLook(l)).toBe(true);
    expect(new Set(looks.map(l => l.estilo)).size).toBe(HAIR_STYLES.length); expect(new Set(looks.map(l => l.topo)).size).toBe(HEADGEAR.length); expect(new Set(looks.map(lookKey)).size).toBeGreaterThan(190);
    expect(capes.length).toBeGreaterThan(5);
  });
});
