import { beforeEach, describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../data/balance';
import { partyState } from './testing';
import { GameEngine } from './GameEngine';

const sim = (e: GameEngine, seconds: number) => { for (let i = 0; i < seconds * 10; i++) e.tick(100); };
beforeEach(() => { RUN_CONFIG.enabled = true; });

describe('Corredor procedural no motor', () => {
  it('start cria a run, posiciona a equipe e o grupo anda sem monstros ao alcance', () => {
    const e = new GameEngine(partyState()); e.start();
    const s0 = e.getSnapshot(); expect(s0.run).toBeDefined(); expect(s0.status).toBe('running'); expect(s0.monsters).toHaveLength(0);
    const a0 = s0.run!.anchor; sim(e, 5);
    const s = e.getSnapshot(); expect(s.run!.anchor).toBeGreaterThan(a0 + 5);
    expect(Object.keys(s.run!.pos)).toHaveLength(3);
    expect(s.analyzer.kills).toEqual({});
  });
  it('depois de andar um pouco aparece um encontro com monstros posicionados à frente e o combate acontece', () => {
    const e = new GameEngine(partyState()); e.start();
    for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 25);
    let spawned = false, kills = 0;
    for (let i = 0; i < 1200 && !spawned; i++) { e.tick(100); spawned = e.getSnapshot().monsters.length > 0; }
    expect(spawned).toBe(true);
    const s = e.getSnapshot(), m = s.monsters[0];
    expect(m.d).toBeGreaterThan(s.run!.anchor); expect(m.y).toBeDefined();
    sim(e, 120); kills = Object.values(e.getSnapshot().analyzer.kills).reduce((a, b) => a + b, 0);
    expect(kills).toBeGreaterThan(2);
  });
  it('ninguém ataca fora do alcance: com o monstro longe, o dano é zero', () => {
    const e = new GameEngine(partyState()); e.start();
    for (let i = 0; i < 1200 && !e.getSnapshot().monsters.length; i++) e.tick(100);
    const s = e.getSnapshot(); expect(s.analyzer.damage).toBe(0);
  });
});
