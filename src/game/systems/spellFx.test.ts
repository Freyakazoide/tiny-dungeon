import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import type { GameFx } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { SPELLS } from '../data/spells';
import { FX_KINDS, basicFx, spellFx } from './spellFx';
import { FX_PALETTE } from '../scenes/effects';

describe('forma dos ataques', () => {
  it('básico: corpo a corpo = corte; arco = flecha', () => { expect(basicFx('melee')).toBe('slash'); expect(basicFx('ranged')).toBe('arrow'); });
  it('toda magia de dano tem uma forma conhecida; elementos usam o próprio elemento', () => {
    for (const s of SPELLS.filter(x => x.kind === 'damage')) expect(FX_KINDS, s.id).toContain(spellFx(s));
    expect(spellFx(SPELLS.find(s => s.id === 'pyro_fireball')!)).toBe('fire'); expect(spellFx(SPELLS.find(s => s.id === 'basic_ice')!)).toBe('ice');
    expect(spellFx(SPELLS.find(s => s.id === 'hunter_volley')!)).toBe('arrow'); expect(spellFx(SPELLS.find(s => s.id === 'knight_cleave')!)).toBe('slash');
  });
  it('todas as formas têm paleta', () => { for (const k of FX_KINDS) expect(FX_PALETTE[k]).toBeTruthy(); });
  it('o motor emite o fx do ataque com o alvo', () => {
    const e = new GameEngine(partyState()); const seen: GameFx[] = []; e.onFx?.(f => seen.push(f));
    e.start?.(); for (let i = 0; i < 400; i++) e.advance?.(.1);
    const atk = seen.filter(f => f.type === 'attack'); expect(atk.length).toBeGreaterThan(0);
    for (const f of atk) { expect(FX_KINDS).toContain(f.fx); expect(f.target).toBeTruthy(); }
  });
});

describe('ataques dos monstros', () => {
  it('todo monstro tem forma de ataque válida e o motor a emite com a origem no monstro', async () => {
    const { MONSTERS } = await import('../data/monsters'); const { monsterFx } = await import('../data/monsterFx');
    for (const id of Object.keys(MONSTERS)) expect(FX_KINDS, id).toContain(monsterFx(id));
    const e = new GameEngine(partyState()); const seen: GameFx[] = []; e.onFx?.(f => seen.push(f)); e.start?.(); for (let i = 0; i < 600; i++) e.advance?.(.1);
    const hits = seen.filter(f => f.type === 'attack' && f.source && !f.source.startsWith('c-') && f.target); expect(hits.length).toBeGreaterThan(0);
  });
});

describe('waves maiores e obstáculos (dados)', () => {
  it('lateWaveBonus: nunca nas 2 primeiras waves nem no chefe; chance cresce com a wave', async () => {
    const { lateWaveBonus } = await import('./waves');
    expect(lateWaveBonus(0, false, () => 0)).toBe(0); expect(lateWaveBonus(1, false, () => 0)).toBe(0); expect(lateWaveBonus(5, true, () => 0)).toBe(0);
    expect(lateWaveBonus(2, false, () => .1)).toBe(1); expect(lateWaveBonus(2, false, () => .13)).toBe(0); expect(lateWaveBonus(4, false, () => .3)).toBe(1);
  });
  it('todo desenho de obstáculo citado pelas hunts existe em arte/obstaculos', async () => {
    const { HUNT_OBSTACLES } = await import('../data/obstacles'); const { ART } = await import('../art/data'); const { HUNTS } = await import('../data/hunts');
    for (const h of HUNTS) expect(HUNT_OBSTACLES[h.id], h.id).toBeTruthy();
    for (const ids of Object.values(HUNT_OBSTACLES)) for (const id of ids) { const g = ART.obstacles[id]; expect(g, id).toBeTruthy(); expect(g.length).toBeLessThanOrEqual(32); expect(g[0].length).toBeLessThanOrEqual(32); }
  });
});
