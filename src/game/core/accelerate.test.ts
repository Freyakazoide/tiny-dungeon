import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine, MAX_SIM_MS_PER_FRAME } from './GameEngine';
import { partyState } from './testing';
import { runtime } from '../rpg/runtime';

afterEach(() => { vi.restoreAllMocks(); runtime.huntSpeed = 1; });

const seeded = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const strongParty = () => { const s = partyState(); s.characters.forEach(c => { c.profile.level = 20; }); return s; };
const kills = (e: GameEngine) => Object.values(e.getSnapshot().analyzer.kills).reduce((a, b) => a + b, 0);

describe('Bloco 1 — acelerar hunt', () => {
  it('advance(16,7 ms, ×10) por 3.600 quadros equivale ao passo normal em tempo simulado e kills', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(5));
    const normal = new GameEngine(strongParty()); normal.start(); for (let i = 0; i < 6000; i++) normal.tick(100);
    vi.spyOn(Math, 'random').mockImplementation(seeded(5));
    const fast = new GameEngine(strongParty()); fast.start(); for (let i = 0; i < 3600; i++) fast.advance(16.7, 10);
    expect(Math.abs(fast.getSnapshot().analyzer.activeMs - normal.getSnapshot().analyzer.activeMs)).toBeLessThan(3000);
    expect(kills(normal)).toBeGreaterThan(30);
    expect(Math.abs(kills(fast) - kills(normal)) / kills(normal)).toBeLessThan(.1);
  });
  it('advance(ms, 1) equivale a tick(ms)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.5);
    const a = new GameEngine(strongParty()), b = new GameEngine(strongParty()); a.start(); b.start();
    for (let i = 0; i < 200; i++) { a.advance(50, 1); b.tick(50); }
    expect(a.getSnapshot().analyzer.activeMs).toBe(b.getSnapshot().analyzer.activeMs);
    expect(a.getSnapshot().monsters.map(m => m.hp)).toEqual(b.getSnapshot().monsters.map(m => m.hp));
  });
  it('com speed = 10 os listeners são notificados 1 vez por advance', () => {
    const e = new GameEngine(strongParty()); e.start(); let calls = 0; e.subscribe(() => { calls++; });
    for (let i = 0; i < 20; i++) e.advance(16.7, 10);
    expect(calls).toBe(20);
  });
  it('advance(1000, 100) simula no máximo 3.000 ms', () => {
    const e = new GameEngine(strongParty()); e.start(); const before = e.getSnapshot().analyzer.activeMs;
    e.advance(1000, 100);
    expect(e.getSnapshot().analyzer.activeMs - before).toBeLessThanOrEqual(MAX_SIM_MS_PER_FRAME);
    expect(MAX_SIM_MS_PER_FRAME).toBe(3000);
  });
  it('não repete uids de monstros nem ids de efeitos em 10 minutos simulados a ×100', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(9));
    const e = new GameEngine(strongParty()); const issued: number[] = [];
    const original = (e as unknown as { nextUid(): number }).nextUid.bind(e);
    vi.spyOn(e as unknown as { nextUid(): number }, 'nextUid').mockImplementation(() => { const id = original(); issued.push(id); return id; });
    e.start(); const seen = new Set<string>(); let duplicates = 0;
    for (let i = 0; i < 360; i++) {
      e.advance(16.7, 100);
      for (const m of e.getSnapshot().monsters) { if (seen.has(m.uid) && !e.getSnapshot().monsters.some(x => x.uid === m.uid && x === m)) duplicates++; seen.add(m.uid); }
      const ids = e.getSnapshot().characters.flatMap(c => c.effects.map(x => x.id)); if (new Set(ids).size !== ids.length) duplicates++;
    }
    expect(issued.length).toBeGreaterThan(10); expect(new Set(issued).size).toBe(issued.length); expect(duplicates).toBe(0);
  });
  it('pausar congela a simulação também em velocidade alta', () => {
    const e = new GameEngine(strongParty()); e.start(); e.advance(500, 10);
    e.pause(); const frozen = JSON.stringify([e.getSnapshot().analyzer.activeMs, e.getSnapshot().monsters.map(m => m.hp)]);
    for (let i = 0; i < 20; i++) e.advance(16.7, 100);
    expect(JSON.stringify([e.getSnapshot().analyzer.activeMs, e.getSnapshot().monsters.map(m => m.hp)])).toBe(frozen);
  });
  it('dev.huntSpeed limita a 1–100 e huntSpeed volta a 1 por padrão', async () => {
    const { createDevTools } = await import('./devTools');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const dev = createDevTools(new GameEngine(partyState()), { setLastSeen: async () => {}, resetSave: async () => {} });
    dev.huntSpeed(1000); expect(runtime.huntSpeed).toBe(100); dev.huntSpeed(-4); expect(runtime.huntSpeed).toBe(1); dev.huntSpeed(10); expect(runtime.huntSpeed).toBe(10);
  });
});
