import { describe, expect, it } from 'vitest';
import { assemble, colorize, gearDataUrl, gearRaster, recipeKey, validateParts, type Layout, type Recipe } from './assemble';
import { FAMILIES, PARTS, partsFor, TEMPLATES } from './catalog';
import { MATERIALS, hex, luma, materialOf, roleColor } from './materials';
import { compatible, RARITIES, rarityRank, type Family } from './parts';
import { PLAN_RECIPES, POOLS, recipeForRarity, recipeForSeed, recipeIssues, SWORD_LADDER } from './recipes';
import { ROLE_KEYS } from './roles';

const iron = PLAN_RECIPES[1];
const cells = (l: Layout, slot: string) => l.cells.flatMap((row, y) => row.map((c, x) => (c?.slot === slot ? [x, y] as const : null))).filter((p): p is readonly [number, number] => !!p);
const mask = (l: Layout) => l.cells.map(r => r.map(c => (c ? 1 : 0)).join('')).join('/');
const withMaterial = (r: Recipe, slot: string, material: string): Recipe => ({ ...r, partes: { ...r.partes, [slot]: { ...r.partes[slot], material } } });

describe('partes e papéis', () => {
  it('toda parte tem grade retangular, só papéis válidos e anchors em pixel pintado', () => {
    expect(validateParts(PARTS)).toEqual([]);
    expect(new Set(PARTS.map(p => `${p.familia}/${p.slot}/${p.id}`)).size).toBe(PARTS.length);
  });
  it('todo slot dos gabaritos tem partes, e os efeitos apontam para slots que existem', () => {
    for (const f of FAMILIES) for (const s of TEMPLATES[f].slots) if (!s.espelhaDe) expect(partsFor(f, s.slot).length, `${f}/${s.slot}`).toBeGreaterThan(0);
    for (const p of PARTS.filter(p => p.alvo)) { const t = TEMPLATES[p.familia].slots.find(s => s.slot === p.alvo!.slot); expect(t, `${p.id} → ${p.alvo!.slot}`).toBeTruthy(); }
  });
  it('os papéis das partes são só os da tabela', () => {
    const used = new Set(PARTS.flatMap(p => p.grid.join('').split('')).filter(c => c !== '.'));
    for (const c of used) expect(ROLE_KEYS as readonly string[]).toContain(c);
  });
});

describe('materiais', () => {
  it('rampa em ordem de luminância: contorno profundo < sombra < base < brilho ≤ specular; o lateral fica entre o profundo e o brilho', () => {
    for (const m of Object.values(MATERIALS)) {
      const L = (h: string) => luma(hex(h));
      expect(L(m.deep), m.id).toBeLessThan(L(m.shadow)); expect(L(m.shadow), m.id).toBeLessThan(L(m.base));
      expect(L(m.base), m.id).toBeLessThan(L(m.highlight)); expect(L(m.highlight), m.id).toBeLessThanOrEqual(L(m.specular));
      expect(L(m.rim), m.id).toBeGreaterThan(L(m.deep)); expect(L(m.rim), m.id).toBeLessThan(L(m.highlight));
      if (m.emissive) expect(L(m.emissive), m.id).toBeGreaterThan(L(m.base));
    }
  });
  it('specular é propriedade do material: forte = specular, nenhum = brilho, médio no meio', () => {
    const forte = materialOf('ferro'), nenhum = materialOf('couro'), medio = materialOf('bronze');
    expect(roleColor(forte, 'p')).toEqual(hex(forte.specular)); expect(roleColor(nenhum, 'p')).toEqual(hex(nenhum.highlight));
    const [a, b, m] = [luma(hex(medio.highlight)), luma(hex(medio.specular)), luma(roleColor(medio, 'p'))]; expect(m).toBeGreaterThan(a); expect(m).toBeLessThan(b);
  });
  it('emissivo: material sem emissão cai no brilho', () => {
    expect(roleColor(materialOf('ferro'), 'e')).toEqual(hex(materialOf('ferro').highlight));
    expect(roleColor(materialOf('cristal_arcano'), 'e')).toEqual(hex('#e0b8ff'));
  });
  it('hue shifting do ouro: sombra puxa para o vermelho/laranja, brilho para o amarelo', () => {
    const o = materialOf('ouro'), [sr, sg] = hex(o.shadow), [hr, hg] = hex(o.highlight);
    expect(sg / sr).toBeLessThan(hg / hr); // mais verde (amarelo) quanto mais claro
  });
});

describe('montagem', () => {
  it('espada de ferro: lâmina em cima, guarda no meio, cabo e pomo embaixo, todos sobre o mesmo eixo', () => {
    const l = assemble(iron), ys = (slot: string) => cells(l, slot).map(([, y]) => y);
    expect(Math.max(...ys('blade'))).toBeLessThanOrEqual(Math.min(...ys('guard')));
    expect(Math.min(...ys('grip'))).toBeGreaterThan(Math.min(...ys('guard')));
    expect(Math.min(...ys('pommel'))).toBeGreaterThanOrEqual(Math.max(...ys('grip')));
    const axis = (slot: string) => { const xs = cells(l, slot).map(([x]) => x); return (Math.min(...xs) + Math.max(...xs)) / 2; };
    for (const s of ['guard', 'grip', 'pommel']) expect(axis(s)).toBe(axis('blade'));
  });
  it('as partes se encaixam sem buraco: entre lâmina, guarda, cabo e pomo não sobra linha vazia', () => {
    for (const r of [...PLAN_RECIPES, ...SWORD_LADDER].filter(r => r.familia === 'espada')) {
      const l = assemble(r);
      for (let y = 1; y < l.height - 1; y++) expect(l.cells[y].some(Boolean), `${r.id} linha ${y}`).toBe(true);
    }
  });
  it('trocar o material muda as cores e não a silhueta', () => {
    const black = withMaterial(iron, 'blade', 'aco_negro');
    expect(mask(assemble(black))).toBe(mask(assemble(iron)));
    expect(gearDataUrl(black)).not.toBe(gearDataUrl(iron));
  });
  it('contorno automático: embaixo/direita é o profundo do material, em cima/esquerda é o lateral colorido', () => {
    const l = assemble(iron), px = colorize(l), m = materialOf('ferro');
    const blade = cells(l, 'blade'), top = blade.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(px[top[1] - 1][top[0]]).toEqual(hex(m.rim)); // acima da ponta
    const left = blade.filter(([, y]) => y === top[1] + 6).reduce((a, b) => (b[0] < a[0] ? b : a));
    expect(px[left[1]][left[0] - 1]).toEqual(hex(m.rim)); // à esquerda da lâmina
    const right = blade.filter(([, y]) => y === top[1] + 6).reduce((a, b) => (b[0] > a[0] ? b : a));
    expect(px[right[1]][right[0] + 1]).toEqual(hex(m.deep)); // à direita da lâmina
    const pommel = cells(l, 'pommel'), bottom = pommel.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(px[bottom[1] + 1][bottom[0]]).toEqual(hex(m.deep)); // abaixo do pomo
    for (const row of [l.cells[0], l.cells[l.height - 1]]) for (const c of row) expect(c).toBeNull(); // a margem de 1 px é só do contorno
    for (const row of l.cells) { expect(row[0]).toBeNull(); expect(row[l.width - 1]).toBeNull(); }
    expect(px[0].some(Boolean)).toBe(true); // …e o contorno da ponta cai nela
  });
  it('o contorno usa o material do vizinho: lâmina negra tem contorno negro, guarda de ouro tem contorno de ouro', () => {
    const r = withMaterial(withMaterial(iron, 'blade', 'aco_negro'), 'guard', 'ouro'), l = assemble(r), px = colorize(l);
    const [bx, by] = cells(l, 'blade').reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(px[by - 1][bx]).toEqual(hex(materialOf('aco_negro').rim));
    const guard = cells(l, 'guard'), [gx, gy] = guard.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(px[gy + 1][gx]).toEqual(hex(materialOf('ouro').deep));
  });
  it('specular só brilha em metal/cristal: a mesma peça com couro não tem o ponto branco', () => {
    const forte = gearRaster(withMaterial(iron, 'blade', 'ferro')), fosco = gearRaster(withMaterial(iron, 'blade', 'couro'));
    const white = (r: { data: Uint8ClampedArray }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i] > 235 && r.data[i + 1] > 235 && r.data[i + 2] > 235) n++; return n; };
    expect(white(forte)).toBeGreaterThan(0); expect(white(fosco)).toBe(0);
  });
  it('efeito `dentro` (runas) só pinta onde a lâmina já tinha pixel; `fora` (faíscas) só onde estava vazio', () => {
    const base = assemble({ ...iron, partes: { ...iron.partes, blade: { parte: 'larga', material: 'aco_negro' } } });
    const runas = assemble({ ...iron, partes: { ...iron.partes, blade: { parte: 'larga', material: 'aco_negro' }, efeito: { parte: 'runas', material: 'cristal_arcano' } } });
    const fx = cells(runas, 'efeito'); expect(fx.length).toBeGreaterThan(8);
    for (const [x, y] of fx) expect(base.cells[y][x]?.slot).toBe('blade');
    const sparks = { ...iron, partes: { ...iron.partes, efeito: { parte: 'faiscas', material: 'luz_solar' } } }, withSparks = assemble(sparks), without = assemble(iron);
    const sp = cells(withSparks, 'efeito'); expect(sp.length).toBeGreaterThan(2);
    const gOff = cells(withSparks, 'guard')[0][1] - cells(without, 'guard')[0][1]; // a imagem cresce para cima: compara pela coordenada da guarda
    for (const [x, y] of sp) expect(without.cells[y - gOff]?.[x]?.slot).toBeUndefined();
  });
  it('arco: braço de baixo é o de cima espelhado, e a corda é uma linha reta entre as pontas por baixo dos braços', () => {
    const bow = PLAN_RECIPES[2], l = assemble(bow), grip = cells(l, 'grip'), midY = (Math.min(...grip.map(([, y]) => y)) + Math.max(...grip.map(([, y]) => y))) / 2;
    const up = cells(l, 'limb'), down = cells(l, 'limb2'); expect(up.length).toBe(down.length);
    for (const [x, y] of up) expect(down.some(([dx, dy]) => dx === x && Math.abs(dy - (2 * midY - y)) <= 1)).toBe(true);
    const cord = cells(l, 'corda'); expect(new Set(cord.map(([x]) => x)).size).toBe(1); expect(cord.length).toBeGreaterThan(10);
    for (const c of l.cells.flat()) if (c && c.slot === 'corda') expect(c.mat.id).toBe('luz_solar');
  });
  it('cajado sem gema (comum) monta só o engaste; efeito que depende da gema some junto', () => {
    const bare: Recipe = { id: 'x', nome: 'x', familia: 'cajado', partes: { shaft: { parte: 'liso', material: 'madeira' }, butt: { parte: 'bola', material: 'madeira' }, cradle: { parte: 'garras', material: 'madeira' }, efeito: { parte: 'chamas', material: 'luz_solar' } } };
    const l = assemble(bare); expect(cells(l, 'gem')).toEqual([]); expect(cells(l, 'efeito')).toEqual([]); expect(cells(l, 'cradle').length).toBeGreaterThan(0);
  });
  it('receita incompleta ou com parte inexistente dá erro claro', () => {
    expect(() => assemble({ ...iron, partes: { ...iron.partes, blade: undefined as never } })).toThrow(/falta o slot blade/);
    expect(() => assemble({ ...iron, partes: { ...iron.partes, blade: { parte: 'nao_existe', material: 'ferro' } } })).toThrow(/não existe/);
    expect(() => materialOf('latao')).toThrow(/desconhecido/);
  });
  it('todas as combinações de partes de cada família montam (cada uma com o primeiro material compatível)', () => {
    const slotsOf = (f: Family) => TEMPLATES[f].slots.filter(s => !s.espelhaDe);
    const fits = (f: Family, slot: string, id: string) => { const part = partsFor(f, slot).find(p => p.id === id)!; return Object.values(MATERIALS).find(m => compatible(part, m))!.id; };
    let total = 0;
    for (const f of FAMILIES) {
      const slots = slotsOf(f), options = slots.map(s => [...partsFor(f, s.slot).map(p => p.id), ...(s.opcional ? [''] : [])]);
      const walk = (i: number, partes: Recipe['partes']) => {
        if (i === slots.length) { const r: Recipe = { id: 't', nome: 't', familia: f, partes }; if (recipeIssues(r).some(x => x.includes('não combina com ') && !x.includes('com '))) return; const l = assemble(r); expect(l.width).toBeGreaterThan(2); total++; return; }
        for (const id of options[i]) walk(i + 1, id ? { ...partes, [slots[i].slot]: { parte: id, material: fits(f, slots[i].slot, id) } } : partes);
      };
      walk(0, {});
    }
    expect(total).toBeGreaterThan(1000);
  });
});

describe('raridade vira receita', () => {
  it('as quatro armas do plano e a escada da espada são válidas e todas diferentes', () => {
    for (const r of [...PLAN_RECIPES, ...SWORD_LADDER]) expect(recipeIssues(r), r.id).toEqual([]);
    expect(new Set(SWORD_LADDER.map(recipeKey)).size).toBe(SWORD_LADDER.length);
    const [rusty, ferro, , funesto] = PLAN_RECIPES; expect(recipeKey(rusty)).not.toBe(recipeKey(ferro)); expect(funesto.familia).toBe('cajado');
  });
  it('lendária usa lâmina negra/dourada, guarda dourada, cabo vermelho e runas emissivas; comum usa ferro, guarda simples e couro', () => {
    const [comum, , , , lendaria] = SWORD_LADDER;
    expect(comum.partes.blade.material).toBe('ferro'); expect(comum.partes.guard.parte).toBe('simples'); expect(comum.partes.grip.material).toBe('couro'); expect(comum.partes.efeito).toBeUndefined();
    expect(lendaria.partes.blade.material).toBe('aco_negro'); expect(lendaria.partes.guard.material).toBe('ouro'); expect(lendaria.partes.grip.material).toBe('couro_vermelho');
    expect(lendaria.partes.efeito).toEqual({ parte: 'runas', material: 'cristal_arcano' });
  });
  it('o sorteio é determinístico e só gera combinações válidas, em toda família e raridade', () => {
    for (const f of FAMILIES) for (const rar of RARITIES) for (let seed = 1; seed <= 60; seed++) {
      const a = recipeForSeed(f, rar, seed), b = recipeForSeed(f, rar, seed);
      expect(recipeKey(a)).toBe(recipeKey(b));
      expect(recipeIssues(a), `${f}/${rar}/${seed}`).toEqual([]);
      for (const [slot, p] of Object.entries(a.partes)) { const part = partsFor(f, slot).find(x => x.id === p.parte)!; expect(rarityRank(part.desde ?? 'common'), `${f}/${slot}/${p.parte} em ${rar}`).toBeLessThanOrEqual(rarityRank(rar)); }
      expect(assemble(a).width).toBeGreaterThan(2);
    }
  });
  it('lendária sempre tem efeito mágico emissivo; comum nunca tem efeito emissivo; a variedade cresce com a raridade', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const lend = recipeForSeed('espada', 'legendary', seed); expect(lend.partes.efeito, `seed ${seed}`).toBeTruthy(); expect(MATERIALS[lend.partes.efeito.material].emissive).toBeTruthy();
      const com = recipeForSeed('espada', 'common', seed); if (com.partes.efeito) expect(com.partes.efeito.material).toBe('ferrugem');
    }
    const distinct = (rar: 'common' | 'legendary') => new Set(Array.from({ length: 200 }, (_, i) => recipeKey(recipeForSeed('espada', rar, i + 1)))).size;
    expect(distinct('common')).toBeGreaterThan(20); expect(distinct('legendary')).toBeGreaterThan(60);
  });
  it('os conjuntos de materiais da raridade só citam materiais que existem', () => {
    for (const rar of RARITIES) { const p = POOLS[rar]; for (const id of [...p.lamina, ...p.guarnicao, ...p.cabo, ...p.gema, ...p.corda, ...p.efeito.materiais]) expect(MATERIALS[id], `${rar}/${id}`).toBeTruthy(); }
  });
  it('curadoria acusa combinação proibida: runas em material que não emite luz; crânio com garras', () => {
    expect(recipeIssues({ ...iron, partes: { ...iron.partes, efeito: { parte: 'runas', material: 'ferro' } } }).join()).toContain('não combina');
    const skull = PLAN_RECIPES[3]; expect(recipeIssues({ ...skull, partes: { ...skull.partes, cradle: { parte: 'garras', material: 'aco_negro' } } }).join()).toContain('Garras');
    expect(recipeForRarity('cajado', 'legendary', () => .5).familia).toBe('cajado');
  });
});

describe('PNG e cache', () => {
  it('gera PNG válido, em cache pela chave visual, com escala', () => {
    const url = gearDataUrl(iron); expect(url.startsWith('data:image/png;base64,')).toBe(true);
    expect(gearDataUrl(iron)).toBe(url); expect(gearDataUrl(iron, 3)).not.toBe(url);
    const r1 = gearRaster(iron), r3 = gearRaster(iron, 3); expect(r3.width).toBe(r1.width * 3); expect(r3.height).toBe(r1.height * 3);
  });
  it('a chave visual muda com parte, material e efeito', () => {
    const k = recipeKey(iron); expect(recipeKey(withMaterial(iron, 'grip', 'couro_vermelho'))).not.toBe(k);
    expect(recipeKey({ ...iron, partes: { ...iron.partes, blade: { parte: 'larga', material: 'ferro' } } })).not.toBe(k);
    expect(recipeKey({ ...iron, id: 'outro', nome: 'Outro' })).toBe(k);
  });
});
