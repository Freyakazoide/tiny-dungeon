// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from 'phaser';
import { HUNTS } from '../data/hunts';
import { ART } from './data';
import { cellKey, formationCells, inArena, spawnCells, entranceCells, BOSS_CELL } from './geometry';
import { defaultLookFor, lookKey } from './look';
import { MAX_LOOKS, characterTexture, characterWalkAnim, ensureArtTextures, ensureLookTextures, mapTexture, monsterTexture } from './textures';

/** Cena falsa: só o que `textures.ts` usa (texturas, animações). */
function fakeScene() {
  const textures = new Set<string>(), anims = new Set<string>();
  return { scene: { textures: { exists: (k: string) => textures.has(k), addCanvas: (k: string) => { textures.add(k); return { setFilter: () => {} }; }, remove: (k: string) => textures.delete(k) },
    anims: { exists: (k: string) => anims.has(k), create: (c: { key: string }) => anims.add(c.key), remove: (k: string) => anims.delete(k) } } as unknown as Scene, textures, anims };
}
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: () => {} })) as never;
});

describe('Fase 13 C — texturas', () => {
  it('ensureArtTextures cria os mapas das 7 hunts e os quadros dos 3 monstros com arte', () => {
    const { scene, textures } = fakeScene(); ensureArtTextures(scene);
    for (const h of HUNTS) expect(textures.has(mapTexture(h.id))).toBe(true);
    for (const id of ['esqueleto', 'ghoul', 'rei_dos_ossos']) for (const dir of ['down', 'up', 'left', 'right'] as const) for (const p of [1, 2] as const) expect(textures.has(monsterTexture(id, dir, p)), `${id} ${dir} ${p}`).toBe(true);
  });
  it('cada aparência tem 8 quadros e 4 animações; trocar o look cria os novos sem recriar o resto; LRU de 32', () => {
    const { scene, textures, anims } = fakeScene();
    const a = ensureLookTextures(scene, defaultLookFor(0)); expect([...textures].filter(k => k.startsWith('art-c-'))).toHaveLength(8); expect(anims.size).toBe(4);
    for (const d of ['down', 'up', 'left', 'right'] as const) expect(anims.has(characterWalkAnim(a, d))).toBe(true);
    const b = ensureLookTextures(scene, { ...a, cabelo: 'azul' }); expect(lookKey(b)).not.toBe(lookKey(a)); expect(textures.has(characterTexture(a, 'down', 1))).toBe(true); expect(textures.has(characterTexture(b, 'down', 1))).toBe(true);
    const inUse = new Set([lookKey(a)]);
    for (let i = 0; i < MAX_LOOKS + 6; i++) ensureLookTextures(scene, { body: 'squire', pele: ART.colors.pele[i % 8].id, cabelo: ART.colors.cabelo[i % 10].id, armadura: ART.colors.armadura[(i * 3) % ART.colors.armadura.length].id }, inUse);
    expect(textures.has(characterTexture(a, 'down', 1))).toBe(true);
    expect([...textures].filter(k => k.startsWith('art-c-')).length).toBeLessThanOrEqual((MAX_LOOKS + 1) * 8);
  });
});

describe('Fase 13 C — posições (sem células repetidas)', () => {
  it('heróis e até 24 monstros (com e sem chefe) ficam na arena e nunca dividem célula', () => {
    const team = [{ id: 'a', row: 'front' as const }, { id: 'b', row: 'front' as const }, { id: 'c', row: 'back' as const }, { id: 'd', row: 'back' as const }];
    const hero = [...formationCells(team).values(), ...entranceCells(team.map(t => t.id)).values()];
    for (const boss of [false, true]) for (const n of [3, 12, 24]) {
      const mons = spawnCells(n, boss), used = new Set<string>(), block = boss ? ['6,0', '7,0', '6,1', '7,1'] : [];
      for (const cell of [...hero.slice(0, 4), ...mons]) { expect(inArena(cell)).toBe(true); }
      for (const cell of mons) { expect(used.has(cellKey(cell))).toBe(false); used.add(cellKey(cell)); }
      if (boss) { for (const cell of mons.slice(1)) expect(block).not.toContain(cellKey(cell)); expect(mons[0]).toEqual(BOSS_CELL); }
      for (const cell of mons) expect(cell.r).toBeLessThanOrEqual(2);
    }
    const front = [...formationCells(team).entries()]; expect(new Set(front.map(([, c]) => cellKey(c))).size).toBe(front.length);
  });
});
