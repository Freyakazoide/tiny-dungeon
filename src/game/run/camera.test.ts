import { describe, expect, it } from 'vitest';
import { CAMERA } from '../data/balance';
import { cameraActionBounds, cameraTarget, enforceSafeArea, heroesSafe, newCamera, relevantFoes, stepCamera, type View } from './camera';
import type { Pt } from './geom';

const view: View = { w: 20, h: 11.25 };
const run = (opts: { seconds: number; speed: number; heroes: (t: number) => Pt[]; foes?: (t: number) => Pt[]; anchor: (t: number) => Pt; fwd?: Pt }) => {
  const cam = newCamera(), fps = 60, bad: number[] = []; const xs: number[] = [];
  for (let f = 0; f < opts.seconds * fps; f++) {
    const t = f / fps * opts.speed, heroes = opts.heroes(t), foes = opts.foes?.(t) ?? [];
    stepCamera(cam, { anchor: opts.anchor(t), fwd: opts.fwd ?? { x: 1, y: 0 }, heroes, foes, inCombat: relevantFoes(heroes, foes).length > 0, view, dt: 1 / fps, speed: opts.speed });
    if (!heroesSafe({ x: cam.x, y: cam.y }, heroes, view, CAMERA.margin - 1e-6)) bad.push(f); xs.push(cam.x);
  }
  return { cam, bad, xs };
};

describe('câmera: ação e safe screen area', () => {
  it('em combate o centro vem dos heróis vivos e dos inimigos próximos (inimigo longe não puxa)', () => {
    const heroes = [{ x: 10, y: 5 }, { x: 8, y: 6 }], near = { x: 14, y: 5 }, far = { x: 40, y: 5 };
    expect(relevantFoes(heroes, [near, far])).toEqual([near]);
    const b = cameraActionBounds(heroes, [near, far])!; expect(b.minX).toBe(8); expect(b.maxX).toBe(14); expect(b.cx).toBe(11);
    expect(cameraActionBounds([], [near])).toBeNull();
  });
  it('fora de combate olha à frente da âncora; em combate mistura com o centro da ação', () => {
    const anchor = { x: 50, y: 5 }, fwd = { x: -1, y: 0 }, heroes = [{ x: 52, y: 5 }, { x: 53, y: 6 }];
    const walk = cameraTarget({ anchor, fwd, heroes, foes: [], combat: 0 }); expect(walk.x).toBe(50 - CAMERA.lead);   // à frente = para o oeste aqui
    const fight = cameraTarget({ anchor, fwd, heroes, foes: [{ x: 44, y: 5 }], combat: 1 }), action = cameraActionBounds(heroes, [{ x: 44, y: 5 }])!;
    expect(fight.x).toBeGreaterThan(Math.min(walk.x, action.cx) - 3); expect(fight.x).toBeLessThan(Math.max(50, action.cx) + 1);
    expect(Math.abs(fight.x - action.cx)).toBeLessThan(Math.abs(50 - action.cx));   // mais perto da ação do que da âncora
  });
  it('a área segura é imposta: nenhum herói fica a menos de ~1,3 célula da borda', () => {
    const heroes = [{ x: 20, y: 5 }, { x: 28, y: 7 }, { x: 24, y: 4 }], c = enforceSafeArea({ x: 40, y: 20 }, heroes, view);
    expect(heroesSafe(c, heroes, view)).toBe(true);
    expect(enforceSafeArea({ x: 24, y: 5.5 }, heroes, view)).toEqual({ x: 24, y: 5.5 });   // já seguro: não mexe
  });
  for (const speed of [1, 2, 3]) {
    it(`×${speed}: caminhando em linha reta o grupo nunca sai da área segura`, () => {
      const at = (t: number): Pt => ({ x: 100 - 10 * t, y: 5 }), r = run({ seconds: 8 / speed, speed, anchor: at, fwd: { x: -1, y: 0 }, heroes: t => [at(t), { x: at(t).x + 3, y: 5 }, { x: at(t).x + 1.5, y: 6.2 }] });
      expect(r.bad).toEqual([]);
    });
    it(`×${speed}: desviando para frente e para trás (dodge) a câmera não balança junto e ninguém sai da área segura`, () => {
      const wob = (t: number) => Math.sin(t * 9) * 2.4, base = { x: 60, y: 5 };
      const r = run({ seconds: 6 / speed, speed, anchor: () => base, heroes: t => [{ x: base.x, y: 5 }, { x: base.x + 3 + wob(t), y: 4 }, { x: base.x + 4 - wob(t), y: 6 }], foes: () => [{ x: base.x - 3, y: 5 }] });
      expect(r.bad).toEqual([]);
      const tail = r.xs.slice(Math.floor(r.xs.length / 2)), swing = Math.max(...tail) - Math.min(...tail); expect(swing).toBeLessThan(1.4);   // os heróis balançam ±2,4; a câmera, bem menos
    });
    it(`×${speed}: um herói que se afasta muito arrasta a câmera, mas continua dentro da área segura`, () => {
      const r = run({ seconds: 6 / speed, speed, anchor: () => ({ x: 60, y: 5 }), heroes: t => [{ x: 60, y: 5 }, { x: 60 + Math.min(7.5, t * 2), y: 5 }] });
      expect(r.bad).toEqual([]);
    });
  }
});
