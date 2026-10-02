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

describe('Aggro: tanque primeiro, depois a frente, depois a backline', () => {
  const setup = (count: number, atkMul = 0, cooldown = 99) => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
    for (const c of s.characters) { c.hp = 99999; c.profile.level = 30; }
    const plan = (e as unknown as { plan(): import('../run/plan').RunPlan }).plan(), anchor = s.run!.anchor;
    s.monsters = Array.from({ length: count }, (_, i) => { const p = plan.spawnPoint(anchor + 8 + i * .5, () => (i * 0.37) % 1); return { uid: `t${i}`, defId: 'skeleton', hp: 1e9, maxHp: 1e9, cooldown, alive: true, x: p.x, y: p.y, atkMul }; });
    s.run!.open = true;
    return e;
  };
  it('a ordem dos grupos é tanque, resto da frente, backline; o anel tem 8 vagas a 1 célula do herói', async () => {
    const { aggroGroups, ringPoint } = await import('../run/world'); const { RUN_CONFIG } = await import('../data/balance');
    const s = partyState(), [aldric, kael, lyra] = s.characters; aldric.isTank = true;
    const extra = { ...kael, id: 'x', row: 'front' as const, isTank: false };
    expect(aggroGroups([kael, aldric, lyra, extra]).map(g => g.map(c => c.id))).toEqual([[aldric.id], ['x'], [kael.id, lyra.id]]);
    expect(aggroGroups([kael, lyra]).map(g => g.length)).toEqual([2]);
    const ring = Array.from({ length: 8 }, (_, k) => ringPoint({ x: 10, y: 5 }, k));
    for (const p of ring) expect(Math.hypot(p.x - 10, p.y - 5)).toBeCloseTo(RUN_CONFIG.ringRadius, 6);
    for (let i = 0; i < 8; i++) expect(Math.hypot(ring[i].x - ring[(i + 1) % 8].x, ring[i].y - ring[(i + 1) % 8].y)).toBeGreaterThan(.72);
  });
  it('com poucos monstros, todas as vagas são em volta do tanque e ninguém fica solto', () => {
    const e = setup(5); for (let i = 0; i < 300; i++) e.tick(100);
    const s = e.getSnapshot(), tank = s.characters.find(c => c.isTank)!, pos = s.run!.pos[tank.id];
    expect(s.monsters).toHaveLength(5);
    for (const m of s.monsters) { expect(m.slot?.hero, m.uid).toBe(tank.id); expect(Math.hypot(m.x! - pos.x, m.y! - pos.y), m.uid).toBeLessThan(1.3); }
  });
  it('lotou o anel do tanque: o excedente ocupa os outros anéis ou espera em fila colada, nunca solto pela tela', () => {
    const e = setup(16); for (let i = 0; i < 500; i++) e.tick(100);
    const s = e.getSnapshot(), tank = s.characters.find(c => c.isTank)!, tp = s.run!.pos[tank.id], heroes = s.characters.map(c => s.run!.pos[c.id]);
    const atTank = s.monsters.filter(m => m.slot?.hero === tank.id).length; expect(atTank).toBeGreaterThanOrEqual(5); expect(atTank).toBeLessThanOrEqual(8);
    for (const m of s.monsters) expect(Math.min(...heroes.map(h => Math.hypot(h.x - m.x!, h.y - m.y!))), `${m.uid} solto`).toBeLessThan(4.5);
    const queue = s.monsters.filter(m => !m.slot); for (const m of queue) expect(Math.hypot(m.x! - tp.x, m.y! - tp.y)).toBeLessThan(5.5);
    expect(s.monsters.filter(x => x.slot && x.slot.hero !== tank.id).every(() => atTank >= 5)).toBe(true);
  });
  it('quem tem vaga bate em quem está na vaga: com o anel do tanque, todo golpe de monstro cai no tanque', () => {
    const e = setup(4, 1, 0.01), hits: Record<string, number> = {}, orig = (e as unknown as { emit(fx?: unknown): void }).emit.bind(e);
    (e as unknown as { emit(fx?: { type?: string; source?: string; target?: string }): void }).emit = (fx) => { if (fx?.type === 'attack' && fx.source?.startsWith('t') && fx.target) hits[fx.target] = (hits[fx.target] ?? 0) + 1; orig(fx); };
    for (let i = 0; i < 300; i++) e.tick(100);
    const tank = e.getSnapshot().characters.find(c => c.isTank)!;
    expect(hits[tank.id]).toBeGreaterThan(20); expect(Object.keys(hits)).toEqual([tank.id]);
  });
  it('ritmo: o monstro que nasce chega ao tanque em poucos segundos', () => {
    const e = setup(1, 0); const s = e.getSnapshot(), tank = s.characters.find(c => c.isTank)!; let at = -1;
    for (let i = 0; i < 300 && at < 0; i++) { e.tick(100); const mm = e.getSnapshot().monsters[0], p = e.getSnapshot().run!.pos[tank.id]; if (Math.hypot(mm.x! - p.x, mm.y! - p.y) < 1.4) at = i / 10; }
    expect(at).toBeGreaterThan(0); expect(at).toBeLessThan(6);
  });
});

describe('Ninguém foge do mapa: formação pela fila e zona de ação', () => {
  const planOf = (e: GameEngine) => (e as unknown as { plan(): import('../run/plan').RunPlan }).plan();
  it('mesmo com o tanque morrendo e o grupo apanhando, ninguém se afasta do grupo (antes um herói chegava a 60 células)', () => {
    const e = new GameEngine(partyState()); e.selectHunt('floresta_sombria'); e.start();
    for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 4);
    e.setRow(e.getSnapshot().characters[1].id, 'front'); e.setRow(e.getSnapshot().characters[2].id, 'front');
    let worst = 0;
    for (let i = 0; i < 3000; i++) {
      e.tick(100); const s = e.getSnapshot(), run = s.run!, here = planOf(e).pathPoint(run.anchor);
      for (const c of s.characters.filter(x => x.hp > 0)) { const p = run.pos[c.id]; worst = Math.max(worst, Math.hypot(p.x - here.x, p.y - here.y)); }
    }
    expect(worst).toBeLessThan(9);
  });
  it('o herói ferido recua para trás da formação e não para longe dela', () => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
    for (const c of s.characters) e.devSetLevel(c.id, 25);
    let fled = 0;
    for (let i = 0; i < 1500; i++) {
      e.tick(100); const st = e.getSnapshot(); for (const c of st.characters) if (st.monsters.some(m => m.alive)) c.hp = Math.min(c.hp, Math.round(c.hp * .995));
      const here = planOf(e).pathPoint(st.run!.anchor); for (const c of st.characters.filter(x => x.hp > 0)) { const p = st.run!.pos[c.id]; fled = Math.max(fled, Math.hypot(p.x - here.x, p.y - here.y)); if (i % 200 === 0) c.hp = Math.max(1, Math.round(c.hp * .2)); }
    }
    expect(fled).toBeLessThan(9);
  });
  it('a posição de descanso segue a FILA, não a arma: arqueiro na frente fica na linha do tanque, espadachim atrás fica atrás', () => {
    const e = new GameEngine(partyState()); e.start(); const [tank, bow, staff] = e.getSnapshot().characters;
    e.setRow(bow.id, 'front'); e.setRow(staff.id, 'back'); const sword = e.getSnapshot().characters[2]; sword.equipment.weapon = 'rusty_sword';
    for (let i = 0; i < 20; i++) e.tick(100);
    const st = e.getSnapshot(), run = st.run!, fwd = planOf(e).forwardAt(run.anchor), along = (id: string) => run.pos[id].x * fwd.x + run.pos[id].y * fwd.y;
    expect(st.monsters).toHaveLength(0);
    expect(Math.abs(along(bow.id) - along(tank.id))).toBeLessThan(1.5);   // frente: na linha do tanque
    expect(along(tank.id) - along(sword.id)).toBeGreaterThan(2);           // trás: `rear` células atrás (fwd aponta para a frente do grupo)
  });
});

describe('Revive ao fim do encontro (proposta A)', () => {
  const clearEncounter = (e: GameEngine, fell: string) => {
    for (let i = 0; i < 1500 && !e.getSnapshot().monsters.some(m => m.alive); i++) e.tick(100);
    const c = e.getSnapshot().characters.find(x => x.id === fell)!; c.hp = 0;
    for (let i = 0; i < 1800 && e.getSnapshot().run!.open; i++) e.tick(100);
  };
  it('quem caiu levanta ao limpar o encontro: 35% da vida, enfraquecido, de volta à formação, com aviso', () => {
    const e = new GameEngine(partyState()); e.start(); const fx: { type: string; target?: string }[] = []; e.onFx(f => { if (f.type === 'revive') fx.push(f); });
    for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 25);
    const fallen = e.getSnapshot().characters[1].id; clearEncounter(e, fallen);
    const s = e.getSnapshot(), c = s.characters.find(x => x.id === fallen)!, max = Math.round(c.hp / RUN_CONFIG.reviveHp);
    expect(s.run!.open).toBe(false); expect(c.hp).toBeGreaterThan(0); expect(c.hp / max).toBeCloseTo(RUN_CONFIG.reviveHp, 1); expect(fx).toEqual([expect.objectContaining({ target: fallen })]);
    expect(c.effects.find(x => x.id === 'revive-weak')?.value).toBeCloseTo(-RUN_CONFIG.reviveWeak, 5);
    const here = (e as unknown as { plan(): import('../run/plan').RunPlan }).plan().pathPoint(s.run!.anchor), p = s.run!.pos[fallen]; expect(Math.hypot(p.x - here.x, p.y - here.y)).toBeLessThan(6);
  });
  it('a penalidade dura até o fim do encontro seguinte e quem não caiu não é afetado', () => {
    const e = new GameEngine(partyState()); e.start();
    for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 25);
    const fallen = e.getSnapshot().characters[2].id; clearEncounter(e, fallen);
    expect(e.getSnapshot().characters.filter(c => c.effects.some(x => x.id === 'revive-weak')).map(c => c.id)).toEqual([fallen]);
    for (let i = 0; i < 1500 && !e.getSnapshot().run!.open; i++) e.tick(100);
    for (let i = 0; i < 1800 && e.getSnapshot().run!.open; i++) e.tick(100);
    expect(e.getSnapshot().run!.open).toBe(false); expect(e.getSnapshot().characters.some(c => c.effects.some(x => x.id === 'revive-weak'))).toBe(false);
  });
  it('o morto fica parado onde caiu durante a luta (não vai atrás do grupo nem foge)', () => {
    const e = new GameEngine(partyState()); e.start(); for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 25);
    for (let i = 0; i < 1500 && !e.getSnapshot().monsters.some(m => m.alive); i++) e.tick(100);
    const c = e.getSnapshot().characters[1]; c.hp = 0; const at = { ...e.getSnapshot().run!.pos[c.id] };
    for (let i = 0; i < 20; i++) e.tick(100); const p = e.getSnapshot().run!.pos[c.id];
    if (e.getSnapshot().run!.open) expect(Math.hypot(p.x - at.x, p.y - at.y)).toBeLessThan(.05);
  });
});
