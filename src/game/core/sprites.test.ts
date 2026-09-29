import { describe, expect, it } from 'vitest';
import { GameEngine, createCharacter } from './GameEngine';
import { partyState } from './testing';
import { cloneValidatedState } from '../persistence/validation';
import { exportBackup, importBackup } from '../persistence/backup';
import { DEFAULT_SPRITE, SPRITES, defaultSpriteFor, isKnownSprite } from '../data/sprites';
import type { CharacterSpec } from '../data/starter';

const spec = (name: string, spriteId?: string): CharacterSpec => ({ name, weaponId: 'rusty_sword', row: 'front', element: 'fire', spriteId });

describe('Bloco D — sprites por personagem', () => {
  it('na criação, três personagens podem ter três sprites diferentes ou o mesmo; sem escolha vale o padrão do registro', () => {
    const e = new GameEngine(); expect(e.createParty([spec('A', 'necromancer'), spec('B', 'block'), spec('C', 'necromancer')])).toBe(true);
    expect(e.getSnapshot().characters.map(c => c.spriteId)).toEqual(['necromancer', 'block', 'necromancer']);
    const d = new GameEngine(); d.createParty([spec('A'), spec('B'), spec('C')]);
    expect(d.getSnapshot().characters.map(c => c.spriteId)).toEqual([0, 1, 2].map(defaultSpriteFor));
    expect(defaultSpriteFor(5)).toBe(SPRITES[5 % SPRITES.length].id);
    const bad = new GameEngine(); expect(bad.createParty([spec('A', 'nao_existe'), spec('B'), spec('C')])).toBe(false); expect(bad.getSnapshot().characters).toHaveLength(0);
  });
  it('setSprite altera só o personagem escolhido, aceita "block" e recusa id desconhecido', () => {
    const e = new GameEngine(partyState()); const [a, b, c] = e.getSnapshot().characters; const before = [b.spriteId, c.spriteId];
    expect(e.setSprite(a.id, 'block')).toBe(true); expect(a.spriteId).toBe('block');
    expect(e.setSprite(a.id, 'necromancer')).toBe(true); expect(a.spriteId).toBe('necromancer');
    expect(e.setSprite(a.id, 'nao_existe')).toBe(false); expect(e.setSprite('outro', 'block')).toBe(false); expect(a.spriteId).toBe('necromancer');
    expect([b.spriteId, c.spriteId]).toEqual(before);
  });
  it('evoluir de classe mantém o sprite', () => {
    const e = new GameEngine(partyState()); const a = e.getSnapshot().characters[0]; e.setSprite(a.id, 'block');
    e.evolve(a.id, 'mago', { force: true }); e.evolve(a.id, 'piromante', { force: true });
    expect(a.classId).toBe('mage'); expect(a.spriteId).toBe('block');
  });
  it('recrutar usa o sprite padrão pela posição; o bloco é o padrão do createCharacter cru', () => {
    const e = new GameEngine(partyState()); e.recruit('Nova'); expect(e.getSnapshot().characters[3].spriteId).toBe(defaultSpriteFor(3));
    expect(createCharacter('squire', 'X').spriteId).toBe(DEFAULT_SPRITE);
  });
  it('save antigo sem spriteId carrega com o padrão; id desconhecido cai em "block" sem invalidar o save', () => {
    const legacy = structuredClone(partyState()) as unknown as { characters: Record<string, unknown>[] };
    for (const c of legacy.characters) delete c.spriteId;
    expect(cloneValidatedState(legacy).characters.map(c => c.spriteId)).toEqual([0, 1, 2].map(defaultSpriteFor));
    const unknown = structuredClone(partyState()) as unknown as { characters: Record<string, unknown>[] }; unknown.characters[1].spriteId = 'sumiu'; unknown.characters[2].spriteId = 42;
    expect(cloneValidatedState(unknown).characters.map(c => c.spriteId).slice(1)).toEqual(['block', 'block']);
  });
  it('o spriteId sobrevive a exportar e importar backup', () => {
    const e = new GameEngine(partyState()); e.setSprite(e.getSnapshot().characters[1].id, 'block'); e.setSprite(e.getSnapshot().characters[2].id, 'necromancer');
    expect(importBackup(exportBackup(e.getSnapshot())).characters.map(c => c.spriteId)).toEqual([e.getSnapshot().characters[0].spriteId, 'block', 'necromancer']);
    expect(isKnownSprite('block')).toBe(true); expect(isKnownSprite('necromancer')).toBe(true); expect(isKnownSprite('x')).toBe(false); expect(isKnownSprite(3)).toBe(false);
  });
});
