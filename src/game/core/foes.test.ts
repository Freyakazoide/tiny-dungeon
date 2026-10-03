import { beforeEach, describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../data/balance';
import { MONSTERS } from '../data/monsters';
import { HUNTS } from '../data/hunts';
import { FOE_ATTACK, FOE_ROLE, foeRole, hasWindup, isRanged } from '../run/foes';
import { dist } from '../run/world';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { RunPlan } from '../run/plan';

beforeEach(() => { RUN_CONFIG.enabled = true; });
/** Grupo com tanque na frente e dois atrás, monstros `defId` inofensivos e imortais nascendo à frente (ou fortes, se `atkMul` > 0). */
const setup = (defId: string, count: number, atkMul = 0, cooldown = 99) => {
  const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
  for (const c of s.characters) { c.hp = 99999; c.profile.level = 30; }
  const plan = (e as unknown as { plan(): RunPlan }).plan(), anchor = s.run!.anchor;
  s.monsters = Array.from({ length: count }, (_, i) => { const p = plan.spawnPoint(anchor + 8 + i * .6, () => (i * 0.37) % 1); return { uid: `t${i}`, defId, hp: 1e9, maxHp: 1e9, cooldown, alive: true, x: p.x, y: p.y, atkMul }; });
  s.run!.open = true;
  return e;
};
/** Põe o atirador a ~5,5 células de um herói da backline, do lado de onde ele veio (o tanque fica mais perto, mas a backline tem prioridade). */
const aimAtBack = (e: GameEngine) => {
  const s = e.getSnapshot(), back = s.characters.find(c => c.row === 'back')!, bp = s.run!.pos[back.id], m = s.monsters[0], d = dist(bp, { x: m.x!, y: m.y! });
  m.x = bp.x + (m.x! - bp.x) / d * 5.5; m.y = bp.y + (m.y! - bp.y) / d * 5.5;
};
const sim = (e: GameEngine, secs: number) => { for (let i = 0; i < secs * 10; i++) e.tick(100); };

describe('funções dos inimigos', () => {
  it('a tabela só cita monstros que existem e toda hunt tem inimigos de funções diferentes', () => {
    for (const id of Object.keys(FOE_ROLE)) expect(MONSTERS[id], id).toBeTruthy();
    for (const h of HUNTS) {
      const roles = new Set(Object.values(MONSTERS).filter(m => m.hunt === h.id && !m.boss).map(m => foeRole(m.id)));
      expect(roles.size, h.id).toBeGreaterThanOrEqual(2);
    }
    expect(foeRole('skeleton')).toBe('melee'); expect(foeRole('wolf')).toBe('runner'); expect(isRanged(foeRole('bandit'))).toBe(true); expect(hasWindup(foeRole('ghoul'))).toBe(true); expect(hasWindup(foeRole('wolf'))).toBe(false);
  });
  it('corredor ignora o tanque e vai direto na backline', () => {
    const e = setup('wolf', 3); sim(e, 12);
    const s = e.getSnapshot(), back = s.characters.filter(c => c.row === 'back').map(c => c.id);
    expect(s.monsters.length).toBe(3); for (const m of s.monsters) expect(back, m.uid).toContain(m.slot?.hero);
  });
  it('atirador não tem vaga, fica longe do tanque e mira a backline à distância', () => {
    const e = setup('bandit', 2); sim(e, 15);
    const s = e.getSnapshot(), back = s.characters.filter(c => c.row === 'back');
    for (const m of s.monsters.filter(x => x.uid.startsWith('t'))) {   // só os atiradores do teste (a run pode ter começado um encontro novo)
      expect(m.slot).toBeUndefined();   // o tanque pode alcançar o atirador (ele intercepta); o atirador é que tenta recuar (ver 'archer recua')
      const d = Math.min(...back.map(b => dist({ x: m.x!, y: m.y! }, s.run!.pos[b.id]))); expect(d).toBeGreaterThan(FOE_ATTACK.archer.range * .25); expect(d).toBeLessThan(FOE_ATTACK.archer.range + 1.5);
    }
  });
});

describe('golpes avisados (windup)', () => {
  const firstWindup = (e: GameEngine, secs = 20) => { for (let i = 0; i < secs * 10; i++) { e.tick(100); const w = e.getSnapshot().run!.windups?.[0]; if (w) return structuredClone(w); } return undefined; };
  it('o atirador cria um círculo no chão sobre o alvo, com raio e tempo de aviso', () => {
    const e = setup('bandit', 1, 1, .05); aimAtBack(e); const w = firstWindup(e)!;
    expect(w).toBeTruthy(); expect(w.r).toBe(FOE_ATTACK.archer.r); expect(w.total).toBe(FOE_ATTACK.archer.windup); expect(w.t).toBeGreaterThan(0); expect(w.src).toBe('t0');
    const s = e.getSnapshot(), target = s.characters.find(c => dist(s.run!.pos[c.id], w) < .3); expect(target?.row).toBe('back'); // com a backline ao alcance, é ela que o atirador mira
  });
  it('quem desvia (à distância/curandeiro) sai do círculo avisado e não apanha, golpe após golpe', () => {
    const e = setup('bandit', 1, 1, .05); aimAtBack(e); let backHits = 0, seen = new Set<string>();
    const orig = (e as unknown as { monsterStrike(m: unknown, c: { row: string }, k: number): void }).monsterStrike.bind(e);
    (e as unknown as { monsterStrike(m: unknown, c: unknown, k: number): void }).monsterStrike = (m, c, k) => { if ((c as { row: string }).row === 'back' && (m as { uid: string }).uid === 't0') backHits++; orig(m, c as { row: string }, k); };   // só os golpes do atirador (a run segue andando e encontros novos podem bater de verdade)
    for (let i = 0; i < 400; i++) { e.tick(100); for (const w of e.getSnapshot().run!.windups ?? []) seen.add(w.id); }
    expect(seen.size).toBeGreaterThanOrEqual(3); expect(backHits).toBe(0);
  });
  it('heróis com dodge saem de dentro de um círculo avisado', () => {
    const e = setup('bandit', 1); const s = e.getSnapshot(), run = s.run!, back = s.characters.find(c => c.row === 'back')!;
    run.windups = [{ id: 'w', src: 't0', x: run.pos[back.id].x, y: run.pos[back.id].y, r: 1.2, t: 99, total: 99, mult: 1, role: 'caster' }];
    for (let i = 0; i < 12; i++) e.tick(100);
    expect(dist(run.pos[back.id], run.windups![0])).toBeGreaterThan(1.2 + .3);
  });
  it('atordoar ou matar quem vai bater cancela o golpe, sem dano', () => {
    const e = setup('bandit', 1, 1, .05); aimAtBack(e); const w = firstWindup(e)!, m = e.getSnapshot().monsters[0], victim = e.getSnapshot().characters.find(c => dist(e.getSnapshot().run!.pos[c.id], w) < .3)!;
    e.setHelper(victim.id, { ai: { dodge: 0, retreatAt: 0 } }); const before = victim.hp; m.statuses = { stunned: 5 };
    sim(e, 1.5); expect(e.getSnapshot().run!.windups ?? []).toHaveLength(0); expect(e.getSnapshot().characters.find(c => c.id === victim.id)!.hp).toBe(before);
  });
  it('o brutamonte bate em área no herói da vaga dele (círculo grande, golpe 1,6×)', () => {
    const e = setup('ghoul', 1, 1, .05); const w = firstWindup(e, 30)!, tank = e.getSnapshot().characters.find(c => c.isTank)!;
    expect(w.r).toBe(FOE_ATTACK.brute.r); expect(w.mult).toBe(FOE_ATTACK.brute.mult); expect(dist(e.getSnapshot().run!.pos[tank.id], w)).toBeLessThan(.4);
  });
  it('o golpe avisado acerta todos que ainda estão dentro do círculo quando ele fecha (e só eles)', () => {
    const e = setup('ghoul', 1, 1, .05), struck: string[] = []; let expected: string[] | undefined;
    const s0 = e.getSnapshot(), orig = (e as unknown as { monsterStrike(m: unknown, c: { id: string }, k: number): void }).monsterStrike.bind(e);
    (e as unknown as { monsterStrike(m: unknown, c: unknown, k: number): void }).monsterStrike = (m, c, k) => {
      const run = e.getSnapshot().run!, w = run.windups?.[0];
      if (w && !expected) expected = e.getSnapshot().characters.filter(h => h.hp > 0 && dist(run.pos[h.id], w) <= w.r + .2).map(h => h.id);
      struck.push((c as { id: string }).id); orig(m, c as { id: string }, k);
    };
    const w = firstWindup(e, 30)!; for (const c of s0.characters) s0.run!.pos[c.id] = { x: w.x + (c.id.length % 3) * .15, y: w.y }; // todos dentro do círculo
    // quem desvia sai a tempo; o tanque (que segura a posição) fica e apanha
    for (let i = 0; i < 12 && e.getSnapshot().run!.windups?.some(x => x.id === w.id); i++) e.tick(100);
    expect(struck.length).toBeGreaterThan(0); expect(expected).toBeTruthy(); expect([...new Set(struck)].sort()).toEqual([...expected!].sort());
    expect(struck).toContain(s0.characters.find(c => c.isTank)!.id);
  });
  it('salvar/carregar descarta golpes avisados em andamento', async () => {
    const { migrateGameState } = await import('../persistence/validation'); const e = setup('bandit', 1, 1, .05); firstWindup(e);
    const raw = JSON.parse(JSON.stringify(e.getSnapshot())); expect(raw.run.windups.length).toBeGreaterThan(0);
    expect((migrateGameState(raw) as ReturnType<typeof e.getSnapshot>).run!.windups).toBeUndefined();
  });
});
