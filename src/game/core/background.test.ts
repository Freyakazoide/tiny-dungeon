// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { backgroundTick, gameStore } from './GameStore';
import { partyState } from './testing';

afterEach(() => vi.useRealTimers());

describe('jogo continua com a aba oculta', () => {
  it('o tempo que passou sem quadros é simulado de uma vez (kills e tempo ativo crescem)', () => {
    vi.useFakeTimers(); gameStore.hydrate(partyState()); gameStore.start();
    const before = gameStore.getSnapshot().analyzer.activeMs;
    vi.advanceTimersByTime(30_000);                       // 30 s sem nenhum advance (aba oculta)
    const simulated = backgroundTick();
    expect(simulated).toBeGreaterThanOrEqual(29_000);
    const after = gameStore.getSnapshot().analyzer;
    expect(after.activeMs).toBeGreaterThan(before + 20_000); expect(Object.keys(after.kills).length + after.damage).toBeGreaterThan(0);
  });
  it('parado ou com poucos ms de diferença não simula nada', () => {
    gameStore.hydrate(partyState()); expect(backgroundTick()).toBe(0);
    gameStore.start(); gameStore.advance(16, 1); expect(backgroundTick()).toBe(0);
  });
  it('caçada pausada não avança em segundo plano', () => {
    vi.useFakeTimers(); gameStore.hydrate(partyState()); gameStore.start(); gameStore.pause?.();
    const before = gameStore.getSnapshot().analyzer.activeMs; vi.advanceTimersByTime(20_000); backgroundTick(); expect(gameStore.getSnapshot().analyzer.activeMs).toBe(before);
  });
});
