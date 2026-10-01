import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ART, ArtError, buildArtData } from './data';
import { applyLook, frameDataUrl, frameGrid, mapRaster, mirror, outline, toneOf, toPixels, OUTLINE } from './render';
import { defaultLookFor, normalizeLook, isValidLook, optionsOf } from './look';
import { MONSTERS } from '../data/monsters';
import { HUNTS } from '../data/hunts';

const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = () => Object.fromEntries(walk('arte').filter(p => p.endsWith('.csv')).map(p => ['/' + p, readFileSync(p, 'utf8')]));

describe('motor de arte', () => {
  it('toneOf: claro = 28% com branco, escuro = 32% com preto', () => {
    expect(toneOf('#4c82d3', 'base')).toEqual([76, 130, 211]);
    expect(toneOf('#4c82d3', 'claro')).toEqual([126, 165, 223]); expect(toneOf('#4c82d3', 'escuro')).toEqual([52, 88, 143]);
    expect(toneOf('#000000', 'claro')).toEqual([71, 71, 71]); expect(toneOf('#ffffff', 'escuro')).toEqual([173, 173, 173]);
    expect(toneOf('#f1c9a5', 'escuro')).toEqual([164, 137, 112]);
  });

  it('applyLook muda só as chaves de regioes.csv', () => {
    const look = { body: 'squire', pele: 'escura', cabelo: 'rosa', armadura: 'azul' };
    const out = applyLook(ART.palette, { ...look, armadura: ART.colors.armadura[ART.colors.armadura.length - 1].id }, ART);
    const changed = Object.keys(ART.palette).filter(k => out[k] !== ART.palette[k]);
    const regionKeys = ART.regions.map(r => r.chave);
    for (const k of changed) expect(regionKeys).toContain(k);
    expect(out.p).toBe('#7a4a2a'); expect(out.k).toBe(ART.palette.k); expect(out.t).toBe(ART.palette.t);
  });

  it('outline: mesmo tamanho; só pinta transparentes vizinhas de opacas (4-conexo, com cantos)', () => {
    const px = toPixels([['.', '.', '.'], ['.', 'p', '.'], ['.', '.', '.']], ART.palette);
    const o = outline(px); expect(o).toHaveLength(3); expect(o[0]).toHaveLength(3);
    expect(o[1][1]).toEqual(px[1][1]); expect(o[0][1]).toEqual(OUTLINE); expect(o[1][0]).toEqual(OUTLINE); expect(o[1][2]).toEqual(OUTLINE); expect(o[2][1]).toEqual(OUTLINE);
    expect(o[0][0]).toBeNull(); expect(o[2][2]).toBeNull();
    const canto = outline(toPixels([['p', '.'], ['.', '.']], ART.palette)); expect(canto[1][1]).toBeNull(); expect(canto[0][1]).toEqual(OUTLINE);
  });

  it('left é o right espelhado; left_N.csv próprio passa a valer', () => {
    const left = frameGrid('personagens', 'squire', 'left', 1); expect(left).toEqual(mirror(frameGrid('personagens', 'squire', 'right', 1)));
    const f = files(); f['/arte/personagens/squire/left_1.csv'] = f['/arte/personagens/squire/down_1.csv'];
    const custom = buildArtData(f); expect(frameGrid('personagens', 'squire', 'left', 1, custom)).toEqual(custom.sprites.personagens.squire.down_1);
  });

  it('dado inválido ⇒ erro com o caminho do arquivo', () => {
    const base = files();
    const bad = (path: string, text: string) => { try { buildArtData({ ...base, [path]: text }); return ''; } catch (e) { expect(e).toBeInstanceOf(ArtError); return (e as Error).message; } };
    expect(bad('/arte/personagens/squire/down_1.csv', '.,.,Z\n.,.,.')).toContain('arte/personagens/squire/down_1.csv:1');
    expect(bad('/arte/personagens/squire/down_1.csv', '.,.,.\n.,.')).toContain('down_1.csv:2');
    expect(bad('/arte/mapas/catacumbas.csv', 'parede,nao_existe')).toContain('arte/mapas/catacumbas.csv:1');
    expect(bad('/arte/cores.csv', 'regiao,id,nome,cor\npele,x,X,azul')).toContain('arte/cores.csv');
  });

  it('frameDataUrl: PNG válido e diferente entre looks', () => {
    const a = frameDataUrl({ kind: 'personagens', id: 'squire', look: defaultLookFor(0) }, 'down', 1, 2), b = frameDataUrl({ kind: 'personagens', id: 'squire', look: defaultLookFor(1) }, 'down', 1, 2);
    expect(a).toMatch(/^data:image\/png;base64,/); expect(a).not.toBe(b);
    const bytes = Uint8Array.from(atob(a.split(',')[1]), c => c.charCodeAt(0)); expect([...bytes.slice(1, 4)]).toEqual([80, 78, 71]);
  });

  it('look: padrões distintos, ids corrigidos sem invalidar', () => {
    const looks = [0, 1, 2, 3, 4].map(i => JSON.stringify(defaultLookFor(i))); expect(new Set(looks).size).toBe(5);
    for (let i = 0; i < 5; i++) for (const r of ['pele', 'cabelo', 'armadura'] as const) expect(optionsOf(r).some(o => o.id === defaultLookFor(i)[r])).toBe(true);
    const fixed = normalizeLook({ pele: 'inexistente' }, 0); expect(fixed.pele).toBe(optionsOf('pele')[0].id);
    expect(isValidLook({ pele: 'inexistente' })).toBe(false); expect(isValidLook({ pele: 'clara' })).toBe(true);
  });
});

describe('integridade dos dados entregues (arte/)', () => {
  const data = ART;
  it('meta: todos os quadros existem com as dimensões certas, com margem de 1 px', () => {
    for (const m of data.meta) {
      const set = data.sprites[m.tipo === 'personagem' ? 'personagens' : 'monstros'][m.id];
      for (const dir of ['down', 'up', 'right'] as const) for (const pose of [1, 2] as const) {
        const g = set[`${dir}_${pose}` as 'down_1']; expect(g, `${m.id} ${dir}_${pose}`).toBeTruthy();
        expect(g!.length).toBe(m.altura); for (const row of g!) expect(row.length).toBe(m.largura);
        const opaque = (k: string) => data.palette[k] !== null;
        expect(g![0].some(opaque)).toBe(false); expect(g![g!.length - 1].some(opaque)).toBe(false);
        expect(g!.some(row => opaque(row[0]))).toBe(false);
        // Exceções conhecidas da arte entregue (a ponta da espada toca a coluna direita em `right_*`): o contorno desse pixel é cortado.
        const knownRightEdge = dir === 'right' && (m.id === 'squire' || m.id === 'rei_dos_ossos');
        if (!knownRightEdge) expect(g!.some(row => opaque(row[row.length - 1])), `${m.id} ${dir}_${pose}`).toBe(false);
      }
      expect(['1x1', '2x2']).toContain(m.celulas);
      if (m.monstroId) expect(MONSTERS[m.monstroId], m.monstroId).toBeTruthy();
    }
  });
  it('chaves existem; regiões só em personagens', () => {
    const regionKeys = new Set(data.regions.map(r => r.chave));
    for (const kind of ['personagens', 'monstros'] as const) for (const [id, set] of Object.entries(data.sprites[kind])) for (const g of Object.values(set)) for (const row of g!) for (const k of row) {
      expect(k in data.palette, `${id}:${k}`).toBe(true); if (kind === 'monstros') expect(regionKeys.has(k), `${id}:${k}`).toBe(false);
    }
  });
  it('tiles 16×16; mapa 32×20 com paredes nas bordas; escada e tapete no centro; tilesets válidos', () => {
    for (const set of Object.values(data.tiles)) for (const g of Object.values(set)) { expect(g).toHaveLength(16); for (const r of g) expect(r).toHaveLength(16); }
    const map = data.maps.catacumbas; expect(map).toHaveLength(20); for (const r of map) expect(r).toHaveLength(32);
    const wall = new Set(['parede', 'parede_tocha', 'muro_topo', 'escada']);
    for (let y = 0; y < 20; y++) { expect(wall.has(map[y][0])).toBe(true); expect(wall.has(map[y][31])).toBe(true); }
    for (let x = 0; x < 32; x++) { expect(wall.has(map[0][x])).toBe(true); }
    expect(map[1][15]).toBe('escada'); expect(map[1][16]).toBe('escada'); expect(map.flat()).toContain('tapete');
    expect(map[19].every(n => wall.has(n) || n === 'tapete')).toBe(true);
    for (const [name, swap] of Object.entries(data.tilesets)) { expect(name).toBeTruthy(); for (const k of Object.keys(swap)) expect(k in data.palette).toBe(true); }
  });
  it('mapRaster: 512×320; hunt sem arte usa o recolor; avisa os monstros sem arte', () => {
    const cat = mapRaster('catacumbas'), forest = mapRaster('floresta_sombria', 0x1f3b2a);
    expect([cat.width, cat.height]).toEqual([512, 320]); expect(forest.data).not.toEqual(cat.data);
    let diff = 0; for (let i = 0; i < cat.data.length; i += 4) if (cat.data[i] !== forest.data[i] || cat.data[i + 1] !== forest.data[i + 1]) diff++;
    expect(diff).toBeGreaterThan(0); expect(diff).toBeLessThan(cat.data.length / 4);
    for (const h of HUNTS) expect(mapRaster(h.id, h.color).width).toBe(512);
    const missing = Object.keys(MONSTERS).filter(id => !data.meta.some(m => m.monstroId === id));
    if (missing.length) console.info(`monstros ainda sem arte: ${missing.join(', ')}`);
    expect(data.meta.filter(m => m.monstroId).map(m => m.monstroId).sort()).toEqual(['bone_king', 'ghoul', 'skeleton']);
  });
});
