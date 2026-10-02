import { beforeEach, describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../data/balance';
import { AMBUSH_FROM, CHUNK_LEN, RunPlan, TRAP_FROM } from '../run/plan';
import { avoidTrap, dist, placeParty } from '../run/world';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';

beforeEach(() => { RUN_CONFIG.enabled = true; });
const planOf = (seed: number) => new RunPlan({ seed, huntId: 'catacumbas' });

describe('armadilhas no plano', () => {
  it('só a partir do trecho 4, nunca sobre obstáculo, em ~1 de cada 3 trechos, sempre andáveis, e a semente repete', () => {
    const plan = planOf(7); let withTraps = 0, total = 0;
    for (let i = 0; i < 240; i++) {
      const ch = plan.chunk(i); if (i < TRAP_FROM) expect(ch.traps, `chunk ${i}`).toEqual([]);
      else { total++; if (ch.traps.length) withTraps++; const blocked = new Set(ch.obstacles.map(o => o.c * 8 + o.r)); for (const t of ch.traps) expect(blocked.has(t.c * 8 + t.r), `chunk ${i}`).toBe(false); expect(ch.traps.length).toBeLessThanOrEqual(8); }
    }
    expect(withTraps / total).toBeGreaterThan(.2); expect(withTraps / total).toBeLessThan(.5);
    const all = (p: RunPlan) => JSON.stringify(Array.from({ length: 40 }, (_, i) => p.chunk(i).traps));
    expect(all(planOf(7))).toBe(all(plan)); expect(all(planOf(8))).not.toBe(all(plan));
  });
  it('na grade a armadilha é chão andável (tipo 3), e o resto do chão continua tipo 1', () => {
    const plan = planOf(11); let idx = 3; while (!plan.chunk(idx).traps.length) idx++;
    plan.ensure(idx); const ch = plan.chunk(idx), t = ch.traps[0];
    const f = ch.frame, wx = f.ox + f.ax * (t.c + .5) + f.bx * (t.r + .5), wy = f.oy + f.ay * (t.c + .5) + f.by * (t.r + .5);
    expect(plan.cellKind(Math.floor(wx), Math.floor(wy))).toBe(3); expect(plan.isTrap(wx, wy)).toBe(true); expect(plan.isBlocked(wx, wy)).toBe(false);
  });
  it('quem escolhe um ponto de parada numa armadilha é levado à célula livre mais próxima', () => {
    const plan = planOf(11); let idx = 3; while (!plan.chunk(idx).traps.length) idx++; plan.ensure(idx);
    const ch = plan.chunk(idx), t = ch.traps[0], f = ch.frame, p = { x: f.ox + f.ax * (t.c + .5) + f.bx * (t.r + .5), y: f.oy + f.ay * (t.c + .5) + f.by * (t.r + .5) };
    const q = avoidTrap(plan, p); expect(plan.isTrap(q.x, q.y)).toBe(false); expect(plan.isBlocked(q.x, q.y)).toBe(false); expect(dist(p, q)).toBeLessThan(2.5);
    expect(avoidTrap(plan, { x: 0.3, y: 0.3 })).toEqual({ x: .3, y: .3 });
  });
});

describe('armadilhas no jogo', () => {
  const onTrap = () => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot(), plan = (e as unknown as { plan(): RunPlan }).plan();
    let idx = TRAP_FROM; while (!plan.chunk(idx).traps.length) idx++; plan.ensure(idx);
    const ch = plan.chunk(idx), t = ch.traps[0], f = ch.frame, at = { x: f.ox + f.ax * (t.c + .5) + f.bx * (t.r + .5), y: f.oy + f.ay * (t.c + .5) + f.by * (t.r + .5) };
    return { e, s, at, trap: () => (e as unknown as { tickTraps(): void }).tickTraps() };
  };
  it('o herói que pisa leva ~6% da vida uma vez, de novo só depois de sair e voltar, e nunca morre disso', () => {
    const { e, s, at, trap } = onTrap(), c = s.characters[1], max = Math.round(c.hp / 1);
    s.run!.pos[c.id] = { ...at }; trap(); const first = max - c.hp; expect(first).toBeGreaterThan(0); expect(first / max).toBeCloseTo(RUN_CONFIG.trapHero, 1);
    trap(); expect(max - c.hp).toBe(first);                                     // ficar parado não repete
    s.run!.pos[c.id] = { x: at.x + 4, y: at.y }; trap(); s.run!.pos[c.id] = { ...at }; trap(); expect(max - c.hp).toBeGreaterThan(first);   // sair e entrar fere de novo
    c.hp = 2; s.run!.pos[c.id] = { x: at.x + 4, y: at.y }; trap(); s.run!.pos[c.id] = { ...at }; trap(); expect(c.hp).toBe(1); void e;
  });
  it('monstros também apanham (10%, 3% o chefe) e ficam com ao menos 1 de vida', () => {
    const { s, at, trap } = onTrap(); s.monsters = [{ uid: 'a', defId: 'skeleton', hp: 500, maxHp: 500, cooldown: 99, alive: true, x: at.x, y: at.y, atkMul: 0 }, { uid: 'b', defId: 'bone_king', hp: 1000, maxHp: 1000, cooldown: 99, alive: true, x: at.x, y: at.y, atkMul: 0 }, { uid: 'c', defId: 'skeleton', hp: 3, maxHp: 500, cooldown: 99, alive: true, x: at.x, y: at.y, atkMul: 0 }];
    trap(); expect(s.monsters[0].hp).toBe(450); expect(s.monsters[1].hp).toBe(970); expect(s.monsters[2].hp).toBe(1);
  });
});

describe('emboscada', () => {
  it('no plano: a partir do 3º trecho, só em encontros comuns, com 2 a 3 monstros e ~1 em 4', () => {
    const plan = planOf(5); let eligible = 0, ambushes = 0;
    for (let i = 0; i < 300; i++) {
      const enc = plan.chunk(i).encounter; if (!enc) continue; if (i < AMBUSH_FROM || enc.boss) { expect(enc.ambush, `chunk ${i}`).toBeUndefined(); continue; }
      if (enc.monsters.length >= 4) eligible++;
      if (enc.ambush) { ambushes++; expect(enc.ambush).toBeGreaterThanOrEqual(2); expect(enc.ambush).toBeLessThanOrEqual(3); expect(enc.monsters.length).toBeGreaterThan(enc.ambush); }
    }
    expect(ambushes / eligible).toBeGreaterThan(.12); expect(ambushes / eligible).toBeLessThan(.4);
  });
  it('no jogo: os emboscadores nascem atrás do grupo, o grupo para para lutar e eles vão na backline', () => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot(), plan = (e as unknown as { plan(): RunPlan }).plan();
    for (const c of s.characters) { c.profile.level = 30; c.hp = 99999; }
    let idx = AMBUSH_FROM; while (!plan.chunk(idx).encounter?.ambush) idx++;
    const enc = plan.chunk(idx).encounter!, ch = plan.chunk(idx);
    s.run!.anchor = ch.start + enc.at - .05; s.run!.lastTrigger = idx - 1; plan.ensure(idx); placeParty(s, plan);
    const fx: string[] = []; e.onFx(f => { if (f.type === 'wave' && f.text) fx.push(f.text); });
    e.tick(100); e.tick(100);
    const amb = e.getSnapshot().monsters.filter(m => m.ambush); expect(amb).toHaveLength(enc.ambush!); expect(fx.join()).toContain('EMBOSCADA');
    const run = e.getSnapshot().run!, fwd = plan.forwardAt(run.anchor), tank = e.getSnapshot().characters.find(c => c.isTank)!, tp = run.pos[tank.id];
    const back = e.getSnapshot().characters.filter(c => c.row === 'back').map(c => c.id); e.tick(100);
    for (const m of e.getSnapshot().monsters.filter(x => x.ambush && x.alive)) expect(back, m.uid).toContain(m.slot?.hero);
    for (const m of amb) expect((m.x! - tp.x) * fwd.x + (m.y! - tp.y) * fwd.y, 'atrás do tanque').toBeLessThan(0);
    for (let i = 0; i < 60; i++) {   // enquanto algum emboscador vive, o grupo não anda (para não fugir deles)
      const live = e.getSnapshot().monsters.some(m => m.ambush && m.alive), before = e.getSnapshot().run!.anchor; e.tick(100);
      if (live) expect(e.getSnapshot().run!.anchor, `tick ${i}`).toBe(before);
    }
    expect(CHUNK_LEN).toBeGreaterThan(0);
  });
});

describe('chefe com fases', () => {
  const boss = () => {
    const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot(), plan = (e as unknown as { plan(): RunPlan }).plan();
    for (const c of s.characters) { c.profile.level = 30; c.hp = 99999; }
    const tank = s.characters.find(c => c.isTank)!, tp = s.run!.pos[tank.id], fwd = plan.forwardAt(s.run!.anchor);
    s.monsters = [{ uid: 'boss', defId: 'bone_king', hp: 1e9, maxHp: 1e9, cooldown: .05, alive: true, x: tp.x + fwd.x * 1.6, y: tp.y + fwd.y * 1.6, atkMul: 1 }]; s.run!.open = true;
    return { e, s, m: s.monsters[0] };
  };
  it('abaixo de 66% invoca 2 ajudantes (uma vez); abaixo de 33% enfurece e invoca mais 2', () => {
    const { e, s, m } = boss(); const msgs: string[] = []; e.onFx(f => { if (f.type === 'wave' && f.text) msgs.push(f.text); });
    e.tick(100); expect(s.monsters).toHaveLength(1); expect(m.phase ?? 0).toBe(0);
    m.hp = m.maxHp * .6; e.tick(100); expect(m.phase).toBe(1); expect(e.getSnapshot().monsters).toHaveLength(3); expect(msgs.join()).toContain('invoca ajudantes');
    for (let i = 0; i < 5; i++) e.tick(100); expect(e.getSnapshot().monsters.filter(x => x.defId === 'skeleton')).toHaveLength(2);   // não repete
    m.hp = m.maxHp * .3; e.tick(100); expect(m.phase).toBe(2); expect(e.getSnapshot().monsters.filter(x => x.defId === 'skeleton').length).toBeGreaterThanOrEqual(4); expect(msgs.join()).toContain('enfurece');
  });
  it('enfurecido, o chefe bate mais rápido e faz pancada em área avisada; antes disso não', () => {
    const { e, s, m } = boss(); let seen = false;
    for (let i = 0; i < 30; i++) { e.tick(100); if (s.run!.windups?.some(w => w.role === 'boss')) seen = true; }
    expect(seen).toBe(false);
    m.hp = m.maxHp * .3; for (let i = 0; i < 60 && !seen; i++) { e.tick(100); if (e.getSnapshot().run!.windups?.some(w => w.role === 'boss')) seen = true; }
    expect(seen).toBe(true);
  });
  it('o grupo ainda limpa o encontro quando mata o chefe e os ajudantes', () => {
    const e = new GameEngine(partyState()); e.start(); for (const c of e.getSnapshot().characters) e.devSetLevel(c.id, 40);
    const plan = (e as unknown as { plan(): RunPlan }).plan(); let idx = 0; while (!plan.chunk(idx).encounter?.boss) idx++;
    const s = e.getSnapshot(), ch = plan.chunk(idx); s.run!.anchor = ch.start + ch.encounter!.at - .05; s.run!.lastTrigger = idx - 1; plan.ensure(idx); placeParty(s, plan);
    for (let i = 0; i < 3000 && !(s.run!.lastTrigger === idx && !e.getSnapshot().run!.open); i++) { e.tick(100); for (const c of e.getSnapshot().characters) if (c.hp < 1000) c.hp = 99999; }
    expect(e.getSnapshot().run!.open).toBe(false); expect(e.getSnapshot().monsters.filter(x => x.alive)).toHaveLength(0);
  }, 60000);
});
