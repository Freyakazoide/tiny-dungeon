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
    expect(m.x).toBeDefined(); expect(m.y).toBeDefined(); const lead = Object.values(s.run!.pos)[0]; expect(Math.hypot(m.x! - lead.x, m.y! - lead.y)).toBeGreaterThan(5);
    sim(e, 120); kills = Object.values(e.getSnapshot().analyzer.kills).reduce((a, b) => a + b, 0);
    expect(kills).toBeGreaterThan(2);
  });
  it('ninguém ataca fora do alcance: com o monstro longe, o dano é zero', () => {
    const e = new GameEngine(partyState()); e.start();
    for (let i = 0; i < 1200 && !e.getSnapshot().monsters.length; i++) e.tick(100);
    const s = e.getSnapshot(); expect(s.analyzer.damage).toBe(0);
  });
});

describe('Corredor: ritmo e regras', () => {
  it('o ritmo de XP e ouro fica perto da referência das hunts (grupo de referência, 10 min simulados)', async () => {
    const { simulateRun } = await import('./balanceHarness'); const { HUNT_BY_ID } = await import('../data/hunts');
    for (const id of ['catacumbas', 'vulcao_ardente']) {
      const m = simulateRun(id, { minutes: 10 }), ref = HUNT_BY_ID[id];
      expect(m.xpPerHour / ref.refXpPerHour, `${id} xp`).toBeGreaterThan(.6); expect(m.xpPerHour / ref.refXpPerHour, `${id} xp`).toBeLessThan(1.4);
      expect(m.goldPerHour / ref.refGoldPerHour, `${id} ouro`).toBeGreaterThan(.6); expect(m.goldPerHour / ref.refGoldPerHour, `${id} ouro`).toBeLessThan(1.6);
      expect(m.kills).toBeGreaterThan(40);
    }
  }, 120000);
  it('cair é recuperável: a equipe se levanta e a run continua do início do trecho', () => {
    const e = new GameEngine(partyState()); e.start();
    let fell = false;
    for (let i = 0; i < 6000 && !fell; i++) { e.tick(100); if (e.getSnapshot().monsters.some(m => m.alive)) for (const c of e.getSnapshot().characters) c.hp = 0; e.tick(100); fell = e.getSnapshot().status === 'recovering'; }
    expect(fell).toBe(true); expect(e.getSnapshot().analyzer.defeats).toBe(1);
    for (let i = 0; i < 80 && e.getSnapshot().status !== 'running'; i++) e.tick(100);
    const s = e.getSnapshot(); expect(s.status).toBe('running'); expect(s.monsters).toHaveLength(0); expect(s.characters.every(c => c.hp > 1)).toBe(true);
  });
  it('end() encerra a run e start() começa outra (semente nova)', () => {
    const e = new GameEngine(partyState()); e.start(); const seed = e.getSnapshot().run!.seed; sim(e, 3); e.end();
    expect(e.getSnapshot().run).toBeUndefined(); expect(e.getSnapshot().status).toBe('idle');
    e.start(); expect(e.getSnapshot().run).toBeDefined(); expect(e.getSnapshot().run!.anchor).toBeLessThan(10); void seed;
  });
  it('save com run: sobrevive a salvar/carregar (validação) e uma run corrompida é descartada', async () => {
    const { validateGameState, migrateGameState } = await import('../persistence/validation');
    const e = new GameEngine(partyState()); e.start(); sim(e, 8);
    const raw = JSON.parse(JSON.stringify(e.getSnapshot()));
    const ok = migrateGameState(raw) as ReturnType<typeof e.getSnapshot>; expect(validateGameState(ok)).toBe(true); expect(ok.run).toBeDefined();
    const bad = JSON.parse(JSON.stringify(e.getSnapshot())); bad.run.anchor = 'x';
    const fixed = migrateGameState(bad) as ReturnType<typeof e.getSnapshot>; expect(fixed.run).toBeUndefined(); expect(fixed.status).toBe('idle');
  });
});

describe('IA configurável (Helper)', () => {
  it('setHelper guarda e limita a IA; vazio restaura o padrão do papel e a IA muda o comportamento', async () => {
    const { heroRole, aiOf, DEFAULT_AI } = await import('../run/world');
    const e = new GameEngine(partyState()); const bow = e.getSnapshot().characters[1];
    expect(heroRole(bow)).toBe('ranged'); expect(aiOf(bow).hold).toBe(DEFAULT_AI.ranged.hold);
    expect(e.setHelper(bow.id, { ai: { hold: 99, dodge: -3 } })).toBe(true);
    expect(aiOf(e.getSnapshot().characters[1]).hold).toBe(8); expect(aiOf(e.getSnapshot().characters[1]).dodge).toBe(0);
    expect(e.setHelper(bow.id, { ai: undefined })).toBe(true); expect(e.getSnapshot().characters[1].helper.ai).toBeUndefined();
    expect(e.setHelper(bow.id, { ai: { hold: NaN } })).toBe(false);
  });
  it('quem mantém distância fica mais longe do inimigo do que quem cola (hold alto × 0)', () => {
    const gap = (hold: number) => {
      const e = new GameEngine(partyState()); const bow = e.getSnapshot().characters[1]; e.setHelper(bow.id, { ai: { hold, dodge: 0, retreatAt: 0 } });
      for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 25);
      e.start(); let sum = 0, n = 0;
      for (let i = 0; i < 4000 && n < 80; i++) {
        e.tick(100); const s = e.getSnapshot(), me = s.run!.pos[bow.id], near = s.monsters.filter(x => x.alive && x.x !== undefined).map(x => Math.hypot(me.x - x.x!, me.y - x.y!)).sort((a, b) => a - b)[0];
        if (near !== undefined && near < 9) { sum += near; n++; }
      }
      return sum / Math.max(1, n);
    };
    expect(gap(6)).toBeGreaterThan(gap(0) + .5);
  });
});

describe('Colisão e vagas ao redor do herói (estilo Tibia)', () => {
  const setup = (count: number) => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
    for (const c of s.characters) { c.hp = 99999; c.profile.level = 30; }
    // 12 monstros fortes e inofensivos nascem espalhados à frente do grupo
    const plan = (e as unknown as { plan(): import('../run/plan').RunPlan }).plan(), anchor = s.run!.anchor;
    s.monsters = Array.from({ length: count }, (_, i) => { const p = plan.spawnPoint(anchor + 9 + i * .5, () => (i * 0.37) % 1); return { uid: `t${i}`, defId: 'skeleton', hp: 1e9, maxHp: 1e9, cooldown: 99, alive: true, x: p.x, y: p.y, atkMul: 0 }; });
    s.run!.open = true;
    return e;
  };
  it('as unidades não se sobrepõem e as vagas em volta de um herói são no máximo 8', () => {
    const e = setup(12);
    for (let i = 0; i < 400; i++) e.tick(100);
    const s = e.getSnapshot(), pts = [...s.characters.map(c => ({ id: c.id, ...s.run!.pos[c.id], r: .36 })), ...s.monsters.map(m => ({ id: m.uid, x: m.x!, y: m.y!, r: .36 }))];
    let worst = 9; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) worst = Math.min(worst, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
    expect(worst).toBeGreaterThan(.45);   // nunca um em cima do outro
    for (const c of s.characters) expect(s.monsters.filter(m => m.slot?.hero === c.id).length).toBeLessThanOrEqual(8);
  });
  it('quando o tanque lota, o excedente vai atrás de quem está na backline', () => {
    const e = setup(12); for (let i = 0; i < 600; i++) e.tick(100);
    const s = e.getSnapshot(), tank = s.characters.find(c => c.isTank)!, byHero = (id: string) => s.monsters.filter(m => m.slot?.hero === id).length;
    expect(byHero(tank.id)).toBeGreaterThanOrEqual(5);
    expect(s.characters.filter(c => c.id !== tank.id).reduce((n, c) => n + byHero(c.id), 0)).toBeGreaterThan(0);
  });
});
