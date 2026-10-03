import { beforeEach, describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../data/balance';
import { dist, trackStuck } from '../run/world';
import { newHeroAi } from '../run/ai';
import { AI_CONFIG, RUN_FLOW } from '../data/balance';
import { mulberry32 } from '../run/rng';
import { simulateRun } from './balanceHarness';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { RunPlan } from '../run/plan';

beforeEach(() => { RUN_CONFIG.enabled = true; });
/** Um monstro inofensivo e imortal `id` a `gap` células de um herói da backline(testa só o movimento dele). */
const lone = (id: string, gap: number, seed = 5) => {
  const orig = Math.random; Math.random = mulberry32(seed);
  try {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
    for (const c of s.characters) { c.hp = 99999; c.profile.level = 30; }
    const plan = (e as unknown as { plan(): RunPlan }).plan(), back = s.characters.find(c => c.row === 'back')!, bp = s.run!.pos[back.id], p = plan.spawnPoint(s.run!.anchor + 8, () => .5);
    s.monsters = [{ uid: 't0', defId: id, hp: 1e9, maxHp: 1e9, cooldown: 99, alive: true, x: p.x, y: p.y, atkMul: 0 }]; s.run!.open = true;
    const m = s.monsters[0], d = dist(bp, p) || 1; m.x = bp.x + (p.x - bp.x) / d * gap; m.y = bp.y + (p.y - bp.y) / d * gap;
    return { e, m };
  } finally { Math.random = orig; }
};

describe('inimigos por papel', () => {
  /** Quanto o monstro se afastou de onde começou (os heróis o alcançam e ficam no alcance de ataque, então a distância a eles não mostra o recuo). */
  const retreated = (id: string, gap: number, secs: number) => { const { e, m } = lone(id, gap), x0 = m.x!, y0 = m.y!; for (let i = 0; i < secs * 10; i++) e.tick(100); return Math.hypot(m.x! - x0, m.y! - y0); };
  it('o atirador recua em passos curtos quando alguém chega perto demais', () => { expect(retreated('bandit', 1.4, 4)).toBeGreaterThan(1.5); });
  it('o caster também sai de perto em vez de ficar colado no grupo', () => { expect(retreated('toxic_toad', 1.6, 5)).toBeGreaterThan(1.5); });
  it('o monstro corpo a corpo não recua', () => { expect(retreated('skeleton', 1.4, 4)).toBeLessThan(1.5); });
});

describe('harness de game feel', () => {
  it('simulateRun devolve as métricas de ritmo coerentes (encontros, TTK, IA, overkill)', () => {
    const r = simulateRun('catacumbas', { minutes: 6, seed: 3 }), f = r.feel;
    expect(r.kills).toBeGreaterThan(40); expect(r.defeats).toBeLessThanOrEqual(1);
    expect(f.combatShare).toBeGreaterThan(.2); expect(f.combatShare).toBeLessThanOrEqual(1.001);
    expect(f.commonS).toBeGreaterThan(3); expect(f.commonS).toBeLessThan(40);
    expect(f.ttkCommonS).toBeGreaterThan(1); expect(f.ttkCommonS).toBeLessThan(30);
    expect(f.firstAttackS).toBeLessThan(3);          // os heróis começam a bater logo depois que os inimigos nascem
    expect(f.overkillShare).toBeLessThan(.2);        // o dano não é desperdiçado em alvos já cobertos
    expect(f.switchesPerMin).toBeLessThan(120);      // o lock evita trocar de alvo a cada instante
    expect(f.shotLossShare).toBeLessThan(.3);
  }, 120000);
});

/** Quantas viradas bruscas de direção (> 120°) cada herói faz na pior janela de 10 s: tremer no lugar aparece como dezenas. */
const worstReversals = (e: GameEngine, secs: number) => {
  const last: Record<string, { x: number; y: number }> = {}, prev: Record<string, { x: number; y: number; m: number } | undefined> = {}, at: Record<string, number[]> = {};
  for (let i = 0; i < secs * 10; i++) {
    e.tick(100); const s = e.getSnapshot();
    for (const c of s.characters) {
      if (c.hp <= 0) continue; const p = s.run!.pos[c.id], l = last[c.id]; last[c.id] = { x: p.x, y: p.y }; if (!l) continue;
      const d = { x: p.x - l.x, y: p.y - l.y, m: Math.hypot(p.x - l.x, p.y - l.y) };
      if (d.m <= .01) { prev[c.id] = undefined; continue; }
      const q = prev[c.id]; if (q && d.x * q.x + d.y * q.y < -.5 * d.m * q.m) (at[c.id] ??= []).push(i);
      prev[c.id] = d;
    }
  }
  return Math.max(0, ...Object.values(at).flatMap(a => a.map(t => a.filter(u => u >= t && u < t + 100).length)));
};

describe('movimento sem tremer', () => {
  it('vários golpes avisados sobrepostos: o herói escolhe uma saída fora de todos os círculos e não vai e volta entre eles', () => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot(), run = s.run!, back = s.characters.find(c => c.row === 'back')!, p = run.pos[back.id];
    s.monsters = [{ uid: 'a', defId: 'bandit', hp: 1e9, maxHp: 1e9, cooldown: 99, alive: true, x: p.x + 9, y: p.y, atkMul: 0 }];
    run.windups = [[-.9, .3], [.9, -.3], [0, 1.2]].map(([dx, dy], i) => ({ id: `w${i}`, src: 'a', x: p.x + dx, y: p.y + dy, r: 1.3, t: 99, total: 99, mult: 1, role: 'caster' as const }));
    const moves: number[] = []; let last = { ...p }, lastDir = 0, flips = 0;
    for (let i = 0; i < 40; i++) { e.tick(100); const q = run.pos[back.id], d = Math.hypot(q.x - last.x, q.y - last.y); if (d > .01) { const a = Math.atan2(q.y - last.y, q.x - last.x); if (moves.length && Math.cos(a - lastDir) < -.5) flips++; lastDir = a; } moves.push(d); last = { ...q }; }
    expect(flips).toBeLessThanOrEqual(1);
    for (const w of run.windups!) expect(dist(run.pos[back.id], w)).toBeGreaterThan(w.r);
  });
  it('travado sem sair do lugar, o herói larga o destino impossível em vez de tremer contra ele', () => {
    const ai = newHeroAi(), at = { x: 0, y: 0 }, dest = { x: 5, y: 0 };
    ai.dest = { ...dest }; let clock = 0;
    for (let i = 0; i < 20; i++) { clock += .1; trackStuck(ai, { x: (i % 2) * .05, y: 0 }, ai.dest, clock, .1); }
    expect(ai.blockedAt).toEqual(dest); expect(ai.blockedUntil!).toBeGreaterThan(clock);
    expect(Math.hypot(ai.dest.x - at.x, ai.dest.y - at.y)).toBeLessThan(.2);
    expect(AI_CONFIG.stuckAfter).toBeLessThan(1.5);
  });
  it('em runs de 5 minutos com formação mista, ninguém balança no lugar (poucas viradas bruscas por janela de 10 s)', () => {
    for (const [hunt, lv, seed] of [['catacumbas', 5, 2], ['vulcao_ardente', 25, 2], ['floresta_sombria', 10, 1]] as const) {
      const orig = Math.random, now = Date.now; Math.random = mulberry32(seed); Date.now = () => 1791039000000;   // os ids dos heróis vêm da hora: fixa para o teste não variar
      try {
        const e = new GameEngine(partyState()); e.selectHunt(hunt); const ch = e.getSnapshot().characters;
        for (const c of ch) e.devSetLevel(c.id, lv); e.setRow(ch[1].id, 'front'); e.setRow(ch[2].id, 'back'); e.start();
        expect(worstReversals(e, 300), `${hunt}/${seed}`).toBeLessThanOrEqual(8);
      } finally { Math.random = orig; Date.now = now; }
    }
  }, 120000);
});

describe('menos círculos ao mesmo tempo', () => {
  it('um bando de atiradores e magos nunca tem mais que o limite de golpes avisados no ar, e eles começam espaçados', () => {
    const orig = Math.random; Math.random = mulberry32(9);
    try {
      const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot(), run = s.run!;
      for (const c of s.characters) { c.hp = 99999; c.profile.level = 30; }
      const back = s.characters.find(c => c.row === 'back')!, p = run.pos[back.id];
      s.monsters = ['bandit', 'bandit', 'toxic_toad', 'toxic_toad', 'bandit', 'toxic_toad'].map((defId, i) => ({ uid: `r${i}`, defId, hp: 1e9, maxHp: 1e9, cooldown: .05, alive: true, x: p.x + 5 + (i % 3) * .8, y: p.y + (i - 2.5) * .9, atkMul: .01 }));
      run.open = true; const seen = new Set<string>(), starts: number[] = []; let peak = 0;
      for (let i = 0; i < 300; i++) {
        e.tick(100); const w = run.windups ?? []; peak = Math.max(peak, w.filter(x => x.role === 'archer' || x.role === 'caster').length);
        for (const x of w) if (!seen.has(x.id)) { seen.add(x.id); starts.push(i); }
      }
      expect(seen.size).toBeGreaterThanOrEqual(3); expect(peak).toBeLessThanOrEqual(RUN_FLOW.maxRangedWindups);
      for (let i = 1; i < starts.length; i++) if (starts[i] - starts[i - 1] > 0) expect((starts[i] - starts[i - 1]) / 10).toBeGreaterThanOrEqual(RUN_FLOW.windupSpacing - .11);
    } finally { Math.random = orig; }
  });
});

describe('chefes: golpes de assinatura', () => {
  it('cada chefe tem padrões próprios, que entram a cada 3º ataque (2º na fase enfurecida) e alternam', async () => {
    const { BOSS_SIGNATURES, signatureKind, signatureCircles, SIGNATURE } = await import('../run/foes');
    const { MONSTERS } = await import('../data/monsters');
    for (const m of Object.values(MONSTERS).filter(x => x.boss)) expect(BOSS_SIGNATURES[m.id], m.id).toBeTruthy();
    expect([0, 1, 2, 3, 4, 5, 8].map(n => signatureKind('bone_king', n, 0))).toEqual([undefined, undefined, 'nova', undefined, undefined, 'sweep', 'nova']);
    expect([0, 1, 2, 3].map(n => signatureKind('bone_king', n, 2))).toEqual([undefined, 'nova', undefined, 'sweep']);
    const heroes = [{ pt: { x: 3, y: 0 }, back: false }, { pt: { x: 6, y: 1 }, back: true }, { pt: { x: 6, y: -1 }, back: true }, { pt: { x: 5, y: 3 }, back: true }];
    const nova = signatureCircles('nova', { x: 0, y: 0 }, heroes); expect(nova).toHaveLength(1); expect(nova[0]).toMatchObject({ x: 0, y: 0, r: SIGNATURE.nova.r });
    const barrage = signatureCircles('barrage', { x: 0, y: 0 }, heroes); expect(barrage).toHaveLength(SIGNATURE.barrage.max);
    expect(barrage.every((c, i) => i === 0 || c.windup > barrage[i - 1].windup)).toBe(true); expect(new Set(barrage.map(c => `${c.x},${c.y}`)).size).toBe(3);   // alvos diferentes, backline primeiro
    expect(barrage.every(c => heroes.find(h => h.pt.x === c.x && h.pt.y === c.y)!.back)).toBe(true);
    const sweep = signatureCircles('sweep', { x: 0, y: 0 }, heroes); expect(sweep).toHaveLength(SIGNATURE.sweep.count); expect(sweep[2].x).toBeGreaterThan(sweep[0].x);
    expect(signatureCircles('nova', { x: 0, y: 0 }, [])).toEqual([]);
  });
  it('no motor, o chefe lança círculos de assinatura (vários ao mesmo tempo ou um enorme) entre os golpes normais', () => {
    const orig = Math.random; Math.random = mulberry32(4);
    try {
      const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot(), run = s.run!;
      for (const c of s.characters) { c.hp = 999999; c.profile.level = 30; }
      const tank = s.characters.find(c => c.isTank)!, tp = run.pos[tank.id];
      s.monsters = [{ uid: 'b0', defId: 'bone_king', hp: 1e9, maxHp: 1e9, cooldown: .05, alive: true, x: tp.x + 1.6, y: tp.y, atkMul: .01 }]; run.open = true;
      let nova = false, multi = 0;
      for (let i = 0; i < 900; i++) { e.tick(100); const w = run.windups ?? []; if (w.some(x => x.r >= 3)) nova = true; multi = Math.max(multi, w.length); }
      expect(nova || multi >= 2).toBe(true);
    } finally { Math.random = orig; }
  });
});

describe('coesão do grupo', () => {
  it('quem esquiva sem parar não vai se afastando do grupo (antes chegava a 40 células da formação em hunts com magos)', () => {
    for (const [hunt, lv, seed] of [['vulcao_ardente', 25, 2], ['vulcao_ardente', 25, 3], ['templo_profano', 28, 1]] as const) {
      const orig = Math.random, now = Date.now; Math.random = mulberry32(seed); Date.now = () => 1791039000000;
      try {
        const e = new GameEngine(partyState()); e.selectHunt(hunt); e.start(); for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, lv);
        const plan = (e as unknown as { plan(): RunPlan }).plan(); let worst = 0;
        for (let i = 0; i < 3000; i++) {
          e.tick(100); const s = e.getSnapshot(), run = s.run!, here = plan.pathPoint(run.anchor);
          for (const c of s.characters.filter(x => x.hp > 0)) worst = Math.max(worst, dist(run.pos[c.id], here));
        }
        expect(worst, `${hunt}/${seed}`).toBeLessThan(14);
      } finally { Math.random = orig; Date.now = now; }
    }
  }, 120000);
});

describe('ritmo calibrado por hunt', () => {
  it('encontro comum de 5 a 8 s e XP/h na referência (grupo de referência, 3 hunts)', async () => {
    const { HUNT_BY_ID } = await import('../data/hunts');
    for (const id of ['catacumbas', 'floresta_sombria', 'vulcao_ardente']) {
      const r = simulateRun(id, { minutes: 15, seed: 1 }), ref = HUNT_BY_ID[id];
      expect(r.feel.commonS, `${id} comum`).toBeGreaterThan(4.5); expect(r.feel.commonS, `${id} comum`).toBeLessThan(9);
      expect(r.xpPerHour / ref.refXpPerHour, `${id} xp`).toBeGreaterThan(.8); expect(r.xpPerHour / ref.refXpPerHour, `${id} xp`).toBeLessThan(1.3);
      expect(r.goldPerHour / ref.refGoldPerHour, `${id} ouro`).toBeLessThan(1.6); expect(r.defeats, id).toBeLessThanOrEqual(1);
    }
  }, 300000);
});
