import type { Scene } from 'phaser';
import type { FxKind } from '../systems/spellFx';
import type { ArenaPoint } from './movement';

/** Cores por forma: núcleo, miolo claro e brilho de impacto. */
export const FX_PALETTE: Record<FxKind, { core: number; light: number; dark: number }> = {
  slash: { core: 0xe8eef5, light: 0xffffff, dark: 0x8a96a6 }, arrow: { core: 0xc9a468, light: 0xf2e2b5, dark: 0x6b4f2a },
  fire: { core: 0xff7a1f, light: 0xffd35a, dark: 0xb02a0c }, ice: { core: 0x7fd8ff, light: 0xe4f8ff, dark: 0x2f78b8 },
  energy: { core: 0xffe84a, light: 0xffffff, dark: 0x6aa8ff }, earth: { core: 0x8b6a3e, light: 0xc2a06a, dark: 0x4b3a22 },
  poison: { core: 0x6fd13c, light: 0xc7f58a, dark: 0x2f6b1a }, holy: { core: 0xffe9a0, light: 0xffffff, dark: 0xe0b040 },
  death: { core: 0x8a3fc4, light: 0xd9a8ff, dark: 0x2a0f3d }, physical: { core: 0xcfcfd6, light: 0xffffff, dark: 0x6b6b75 },
  psychic: { core: 0xff7ad0, light: 0xffd0f0, dark: 0x9a2f86 },
};

const DEPTH = 12;
const fade = (scene: Scene, targets: object, props: object, duration: number, onComplete?: () => void) =>
  scene.tweens.add({ targets, ...props, duration, onComplete: () => { onComplete?.(); } });

/** Voo do projétil de `a` até `b`; `draw` desenha a forma na origem (0,0) apontando para +x. */
function fly(scene: Scene, a: ArenaPoint, b: ArenaPoint, ms: number, draw: (g: Phaser.GameObjects.Graphics) => void, opts: { arc?: number; spin?: number; trail?: (x: number, y: number) => void; ease?: string; aim?: boolean } = {}, done?: () => void) {
  const g = scene.add.graphics({ x: a.x, y: a.y }).setDepth(DEPTH); draw(g);
  const angle = Math.atan2(b.y - a.y, b.x - a.x); if (opts.aim !== false) g.setRotation(angle);
  const p = { t: 0 };
  scene.tweens.add({ targets: p, t: 1, duration: ms, ease: opts.ease ?? 'Quad.easeIn',
    onUpdate: () => { const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t - Math.sin(p.t * Math.PI) * (opts.arc ?? 0); g.setPosition(x, y); if (opts.spin) g.rotation += opts.spin; opts.trail?.(x, y); },
    onComplete: () => { g.destroy(); done?.(); } });
}

const puff = (scene: Scene, x: number, y: number, color: number, r: number, ms = 320, grow = 2.2) => {
  const c = scene.add.circle(x, y, r, color, .9).setDepth(DEPTH + 1); fade(scene, c, { scale: grow, alpha: 0 }, ms, () => c.destroy());
};
const ring = (scene: Scene, x: number, y: number, color: number, r = 10, ms = 360) => {
  const c = scene.add.circle(x, y, r, color, 0).setStrokeStyle(3, color, 1).setDepth(DEPTH + 1); fade(scene, c, { scale: 3, alpha: 0 }, ms, () => c.destroy());
};
const burst = (scene: Scene, x: number, y: number, color: number, n: number, dist: number, size = 3, ms = 420, rise = 0) => {
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 / n) * i + Math.random() * .5, d = dist * (.6 + Math.random() * .6);
    const s = scene.add.rectangle(x, y, size, size, color).setDepth(DEPTH + 1).setRotation(ang);
    fade(scene, s, { x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d - rise, alpha: 0, scale: .4 }, ms, () => s.destroy());
  }
};
const trailDot = (scene: Scene, x: number, y: number, color: number, r: number, ms = 260) => {
  const c = scene.add.circle(x + (Math.random() - .5) * 6, y + (Math.random() - .5) * 6, r, color, .85).setDepth(DEPTH - 1); fade(scene, c, { alpha: 0, scale: .3, y: y - 6 }, ms, () => c.destroy());
};

/** Corte em crescente no alvo, com faíscas, na direção do golpe. */
function slash(scene: Scene, a: ArenaPoint, b: ArenaPoint) {
  const pal = FX_PALETTE.slash, ang = Math.atan2(b.y - a.y, b.x - a.x);
  const g = scene.add.graphics({ x: b.x, y: b.y }).setDepth(DEPTH).setRotation(ang);
  g.lineStyle(7, pal.dark, .9); g.beginPath(); g.arc(0, 0, 24, -1.1, 1.1); g.strokePath();
  g.lineStyle(4, pal.light, 1); g.beginPath(); g.arc(0, 0, 24, -1, 1); g.strokePath();
  g.setScale(.5); fade(scene, g, { scale: 1.25, alpha: 0 }, 220, () => g.destroy());
  burst(scene, b.x, b.y, pal.light, 5, 22, 3, 260);
}

function arrow(scene: Scene, a: ArenaPoint, b: ArenaPoint) {
  const pal = FX_PALETTE.arrow;
  fly(scene, a, b, 190, g => { g.lineStyle(3, pal.core, 1); g.lineBetween(-12, 0, 8, 0); g.fillStyle(pal.light, 1); g.fillTriangle(8, -4, 8, 4, 15, 0); g.fillStyle(pal.dark, 1); g.fillTriangle(-12, 0, -17, -4, -14, 0); g.fillTriangle(-12, 0, -17, 4, -14, 0); },
    { ease: 'Linear' }, () => { burst(scene, b.x, b.y, pal.light, 4, 14, 2, 220); });
}

/** Cada elemento tem forma própria: projétil, rastro e impacto. */
const SPELLS: Record<Exclude<FxKind, 'slash' | 'arrow'>, (scene: Scene, a: ArenaPoint, b: ArenaPoint) => void> = {
  fire(scene, a, b) {
    const pal = FX_PALETTE.fire;
    fly(scene, a, b, 300, g => { g.fillStyle(pal.dark, 1); g.fillCircle(0, 0, 10); g.fillStyle(pal.core, 1); g.fillCircle(2, 0, 8); g.fillStyle(pal.light, 1); g.fillCircle(4, 0, 4); g.fillStyle(pal.core, 1); g.fillTriangle(-8, -6, -8, 6, -22, 0); },
      { trail: (x, y) => trailDot(scene, x, y, Math.random() < .5 ? pal.core : pal.light, 5) }, () => { puff(scene, b.x, b.y, pal.core, 14, 380, 2.6); puff(scene, b.x, b.y, pal.light, 8, 300, 2); burst(scene, b.x, b.y, pal.core, 8, 30, 4, 480, 14); });
  },
  ice(scene, a, b) {
    const pal = FX_PALETTE.ice;
    fly(scene, a, b, 260, g => { g.fillStyle(pal.dark, 1); g.fillTriangle(-12, 0, 0, -6, 0, 6); g.fillStyle(pal.core, 1); g.fillTriangle(-2, -7, -2, 7, 16, 0); g.fillStyle(pal.light, 1); g.fillTriangle(0, -3, 0, 3, 10, 0); },
      { trail: (x, y) => { if (Math.random() < .6) trailDot(scene, x, y, pal.light, 3); } }, () => { ring(scene, b.x, b.y, pal.light, 8, 320); burst(scene, b.x, b.y, pal.core, 9, 26, 4, 460); burst(scene, b.x, b.y, pal.light, 5, 16, 2, 380); });
  },
  energy(scene, a, b) {
    const pal = FX_PALETTE.energy, g = scene.add.graphics().setDepth(DEPTH);
    const len = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang), segs = Math.max(4, Math.round(len / 18));
    const pts = Array.from({ length: segs + 1 }, (_, i) => { const t = i / segs, off = i === 0 || i === segs ? 0 : (Math.random() - .5) * 20; return { x: a.x + (b.x - a.x) * t + nx * off, y: a.y + (b.y - a.y) * t + ny * off }; });
    for (const [w, c] of [[8, pal.dark], [4, pal.core], [2, pal.light]] as const) { g.lineStyle(w, c, w === 8 ? .5 : 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => g.lineTo(p.x, p.y)); g.strokePath(); }
    fade(scene, g, { alpha: 0 }, 260, () => g.destroy()); puff(scene, b.x, b.y, pal.light, 10, 240, 2); ring(scene, b.x, b.y, pal.core, 8, 280); burst(scene, b.x, b.y, pal.core, 6, 22, 3, 260);
  },
  earth(scene, a, b) {
    const pal = FX_PALETTE.earth;
    fly(scene, a, b, 380, g => { g.fillStyle(pal.dark, 1); g.fillRect(-8, -8, 16, 16); g.fillStyle(pal.core, 1); g.fillRect(-6, -6, 12, 12); g.fillStyle(pal.light, 1); g.fillRect(-4, -5, 6, 4); },
      { arc: 36, spin: .22, aim: false, ease: 'Linear' }, () => { puff(scene, b.x, b.y + 8, pal.light, 10, 420, 2.4); burst(scene, b.x, b.y + 6, pal.core, 8, 26, 5, 480, -4); burst(scene, b.x, b.y, pal.dark, 5, 18, 4, 420); });
  },
  poison(scene, a, b) {
    const pal = FX_PALETTE.poison;
    fly(scene, a, b, 330, g => { g.fillStyle(pal.dark, 1); g.fillCircle(0, 0, 9); g.fillStyle(pal.core, 1); g.fillCircle(-1, -1, 7); g.fillStyle(pal.light, 1); g.fillCircle(-3, -3, 2.5); },
      { arc: 18, aim: false, trail: (x, y) => { if (Math.random() < .5) trailDot(scene, x, y, pal.core, 3, 380); } }, () => { puff(scene, b.x, b.y, pal.core, 12, 420, 2.5); for (let i = 0; i < 4; i++) trailDot(scene, b.x + (Math.random() - .5) * 24, b.y + (Math.random() - .5) * 16, pal.light, 4, 600); burst(scene, b.x, b.y, pal.core, 7, 22, 4, 460, 8); });
  },
  holy(scene, a, b) {
    const pal = FX_PALETTE.holy;
    fly(scene, a, b, 240, g => { g.fillStyle(pal.dark, .6); g.fillCircle(0, 0, 9); g.fillStyle(pal.core, 1); g.fillCircle(0, 0, 6); g.fillStyle(pal.light, 1); g.fillRect(-10, -1, 20, 2); g.fillRect(-1, -10, 2, 20); },
      { aim: false, spin: .1, trail: (x, y) => { if (Math.random() < .5) trailDot(scene, x, y, pal.light, 2.5); } }, () => {
        const beam = scene.add.rectangle(b.x, b.y - 30, 18, 90, pal.core, .75).setDepth(DEPTH + 1); fade(scene, beam, { scaleX: .2, alpha: 0 }, 380, () => beam.destroy());
        const core = scene.add.rectangle(b.x, b.y - 30, 6, 90, pal.light, 1).setDepth(DEPTH + 2); fade(scene, core, { alpha: 0 }, 300, () => core.destroy()); ring(scene, b.x, b.y + 4, pal.core, 8, 380); burst(scene, b.x, b.y, pal.light, 6, 22, 3, 420, 18);
      });
  },
  death(scene, a, b) {
    const pal = FX_PALETTE.death;
    fly(scene, a, b, 340, g => { g.fillStyle(pal.dark, 1); g.fillCircle(0, 0, 10); g.fillStyle(pal.core, .9); g.fillCircle(1, 0, 7); g.fillStyle(0x000000, 1); g.fillCircle(3, -2, 1.6); g.fillCircle(3, 2, 1.6); g.fillStyle(pal.core, 1); g.fillTriangle(-8, -5, -8, 5, -24, 0); },
      { arc: -12, trail: (x, y) => trailDot(scene, x, y, Math.random() < .5 ? pal.core : pal.dark, 5, 340) }, () => { puff(scene, b.x, b.y, pal.dark, 14, 460, 2.6); puff(scene, b.x, b.y, pal.core, 8, 360, 2); burst(scene, b.x, b.y, pal.light, 6, 20, 3, 520, 24); });
  },
  physical(scene, a, b) {
    const pal = FX_PALETTE.physical;
    fly(scene, a, b, 170, g => { g.fillStyle(pal.core, 1); g.fillRect(-7, -7, 14, 14); g.fillStyle(pal.light, 1); g.fillRect(-4, -4, 8, 8); }, { aim: false, ease: 'Linear' }, () => {
      ring(scene, b.x, b.y, pal.light, 10, 300); ring(scene, b.x, b.y, pal.core, 6, 380); const x = scene.add.graphics({ x: b.x, y: b.y }).setDepth(DEPTH + 1); x.lineStyle(4, pal.light, 1); x.lineBetween(-12, -12, 12, 12); x.lineBetween(12, -12, -12, 12); fade(scene, x, { alpha: 0, scale: 1.4 }, 260, () => x.destroy()); burst(scene, b.x, b.y, pal.core, 6, 22, 3, 300);
    });
  },
  psychic(scene, a, b) {
    const pal = FX_PALETTE.psychic;
    for (let i = 0; i < 3; i++) scene.time.delayedCall(i * 90, () => { ring(scene, a.x + (b.x - a.x) * (i + 1) / 4, a.y + (b.y - a.y) * (i + 1) / 4, pal.light, 6, 300); });
    scene.time.delayedCall(260, () => { ring(scene, b.x, b.y, pal.core, 10, 460); ring(scene, b.x, b.y, pal.light, 5, 380); puff(scene, b.x, b.y, pal.dark, 12, 380, 2.2);
      for (let i = 0; i < 6; i++) { const ang = i * Math.PI / 3, o = scene.add.circle(b.x + Math.cos(ang) * 16, b.y + Math.sin(ang) * 16, 3, pal.core).setDepth(DEPTH + 1); scene.tweens.add({ targets: o, duration: 520, alpha: 0, props: { x: { value: b.x + Math.cos(ang + 2) * 4 }, y: { value: b.y + Math.sin(ang + 2) * 4 } }, onComplete: () => o.destroy() }); } });
  },
};

/** Toca a forma do ataque entre dois pontos da arena. */
export function playAttackFx(scene: Scene, kind: FxKind, from: ArenaPoint, to: ArenaPoint) {
  if (kind === 'slash') slash(scene, from, to);
  else if (kind === 'arrow') arrow(scene, from, to);
  else SPELLS[kind](scene, from, to);
}
