import { describe, expect, it } from 'vitest';
import { GameEngine, createCharacter } from './GameEngine';
import { partyState } from './testing';
import { cloneValidatedState } from '../persistence/validation';
import { exportBackup, importBackup } from '../persistence/backup';
import { ART } from '../art/data';
import { defaultLookFor, optionsOf } from '../art/look';
import type { CharacterSpec } from '../data/starter';

const spec = (name: string, look?: CharacterSpec['look']): CharacterSpec => ({ name, weaponId: 'rusty_sword', row: 'front', element: 'fire', look });

describe('Fase 13 D — look por personagem', () => {
  it('padrões 0..4 são diferentes e usam ids de cores.csv', () => {
    expect(new Set([0, 1, 2, 3, 4].map(i => JSON.stringify(defaultLookFor(i)))).size).toBe(5);
    expect(ART.colors.pele.length).toBeGreaterThan(0);
  });
  it('createParty/recruit completam look parcial pelo padrão; id inválido é recusado', () => {
    const e = new GameEngine(); expect(e.createParty([spec('A', { cabelo: 'rosa' }), spec('B'), spec('C')])).toBe(true);
    const [a, b] = e.getSnapshot().characters; expect(a.look).toEqual({ ...defaultLookFor(0), cabelo: 'rosa' }); expect(b.look).toEqual(defaultLookFor(1));
    const bad = new GameEngine(); expect(bad.createParty([spec('A', { pele: 'inexistente' }), spec('B'), spec('C')])).toBe(false); expect(bad.getSnapshot().characters).toHaveLength(0);
    expect(e.recruit({ name: 'Zed', weaponId: 'oak_bow', element: 'ice', look: { armadura: optionsOf('armadura')[3].id } })).toBe(true);
    expect(e.getSnapshot().characters[3].look.armadura).toBe(optionsOf('armadura')[3].id);
    expect(e.recruit({ name: 'Bad', weaponId: 'oak_bow', element: 'ice', look: { pele: 'x' } })).toBe(false);
    e.recruit('Texto'); expect(e.getSnapshot().characters[4].look).toEqual(defaultLookFor(4));
  });
  it('setLook valida, grava só no personagem escolhido; evoluir mantém o look', () => {
    const e = new GameEngine(partyState()); const [a, b] = e.getSnapshot().characters; const before = JSON.stringify(b.look);
    expect(e.setLook(a.id, { cabelo: 'azul' })).toBe(true); expect(a.look.cabelo).toBe('azul'); expect(e.setLook(a.id, { cabelo: 'nao_existe' })).toBe(false); expect(e.setLook('x', { cabelo: 'azul' })).toBe(false);
    expect(JSON.stringify(b.look)).toBe(before);
    e.evolve(a.id, 'mago', { force: true }); expect(a.look.cabelo).toBe('azul'); expect(createCharacter('squire', 'X').look.body).toBe('squire');
  });
  it('migração: save com spriteId e sem look recebe look válido; cor removida cai na primeira opção sem invalidar', () => {
    const legacy = structuredClone(partyState()) as unknown as { characters: Record<string, unknown>[] };
    for (const c of legacy.characters) { delete c.look; c.spriteId = 'necromancer'; }
    const loaded = cloneValidatedState(legacy);
    expect(loaded.characters.map(c => c.look)).toEqual([0, 1, 2].map(i => defaultLookFor(i))); expect((loaded.characters[0] as unknown as Record<string, unknown>).spriteId).toBeUndefined();
    const stale = structuredClone(partyState()) as unknown as { characters: { look: Record<string, string> }[] };
    stale.characters[1].look.pele = 'cor_removida'; stale.characters[2].look.armadura = 'sumiu';
    const fixed = cloneValidatedState(stale); expect(fixed.characters[1].look.pele).toBe(optionsOf('pele')[0].id); expect(fixed.characters[2].look.armadura).toBe(optionsOf('armadura')[0].id);
    const broken = structuredClone(partyState()) as unknown as { characters: Record<string, unknown>[] }; broken.characters[0].look = 'x';
    expect(cloneValidatedState(broken).characters[0].look.body).toBe('squire');
  });
  it('o look sobrevive a exportar e importar backup', () => {
    const e = new GameEngine(partyState()); e.setLook(e.getSnapshot().characters[1].id, { pele: 'escura' });
    expect(importBackup(exportBackup(e.getSnapshot())).characters[1].look.pele).toBe('escura');
  });
});
