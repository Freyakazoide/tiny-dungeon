import { beforeEach, describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../data/balance';
import { dist } from '../run/world';
import type { RunPlan } from '../run/plan';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { MonsterRuntime } from './types';

beforeEach(() => { RUN_CONFIG.enabled = true; });
const mon = (uid: string, x: number, y: number): MonsterRuntime => ({ uid, defId: 'skeleton', hp: 1e9, maxHp: 1e9, cooldown: 99, alive: true, x, y, atkMul: 0 });
/** Só `who` (índice do herói) age; os outros ficam caídos. Os monstros são imortais e inofensivos, nas posições dadas (relativas ao herói). */
const arena = (who: number, rel: [number, number][]) => {
  const e = new GameEngine(partyState()); e.start(); const s = e.getSnapshot();
  s.characters.forEach((c, i) => { c.profile.level = 30; c.hp = i === who ? 99999 : 0; });
  const hero = s.characters[who], me = s.run!.pos[hero.id];
  s.monsters = rel.map(([dx, dy], i) => mon(`m${i}`, me.x + dx, me.y + dy)); s.run!.open = true; hero.cooldowns.basic = 0;
  return { e, s, hero, me };
};
const lost = (s: { monsters: MonsterRuntime[] }) => s.monsters.map(m => m.maxHp - m.hp);
const strike = (e: GameEngine, hero: unknown) => (e as unknown as { basicAttack(c: unknown): void }).basicAttack(hero);

describe('corpo a corpo em arco', () => {
  it('acerta o alvo e os vizinhos dentro do arco com parte do dano, e não quem está atrás nem fora do alcance', () => {
    const { e, s, hero } = arena(0, [[-1, 0], [-.8, .7], [-.8, -.7], [1, 0], [-4, 0]]);
    strike(e, hero); const [primary, side1, side2, behind, far] = lost(s);
    expect(primary).toBeGreaterThan(0); expect(side1).toBeGreaterThan(0); expect(side2).toBeGreaterThan(0);
    expect(side1 / primary).toBeCloseTo(RUN_CONFIG.cleave, 1); expect(behind).toBe(0); expect(far).toBe(0);
  });
  it('no máximo `cleaveMax` vizinhos além do alvo', () => {
    const { e, s, hero } = arena(0, [[-1, 0], [-.8, .5], [-.8, -.5], [-.9, .2], [-.9, -.2]]);
    strike(e, hero); expect(lost(s).filter(v => v > 0)).toHaveLength(1 + RUN_CONFIG.cleaveMax);
  });
  it('só o corpo a corpo faz arco: quem atira não acerta vários de uma vez', () => {
    const { e, s, hero } = arena(1, [[-3, 0], [-3, .6], [-3, -.6]]);
    strike(e, hero); expect(lost(s).reduce((a, b) => a + b, 0)).toBe(0);   // a flecha ainda está no ar
  });
});

describe('flecha que viaja', () => {
  it('o tiro sai como projétil (sem dano instantâneo), voa e acerta; depois some', () => {
    const { e, s, hero } = arena(1, [[-4, 0]]);
    strike(e, hero); expect(s.run!.shots).toHaveLength(1); expect(lost(s)[0]).toBe(0); expect(s.run!.shots![0].hero).toBe(hero.id);
    for (let i = 0; i < 10 && lost(e.getSnapshot())[0] === 0; i++) e.tick(100);
    expect(lost(e.getSnapshot())[0]).toBeGreaterThan(0); expect(e.getSnapshot().run!.shots ?? []).toHaveLength(0);
  });
  it('acerta o primeiro monstro no caminho, não o que foi mirado atrás dele', () => {
    const { e, s, hero } = arena(1, [[-5, 0], [-2.5, 0]]);   // o primeiro da lista é o mais longe (mirado); o do meio intercepta
    s.monsters = [s.monsters[1], s.monsters[0]]; strike(e, hero);
    for (let i = 0; i < 10 && s.run!.shots?.length; i++) e.tick(100);
    const [near, far] = lost(e.getSnapshot()); expect(near).toBeGreaterThan(0); expect(far).toBe(0);
  });
  it('obstáculo ou parede para o tiro: ninguém do outro lado leva dano', () => {
    const { e, s, me } = arena(1, []); const plan = (e as unknown as { plan(): RunPlan }).plan(); s.characters[1].hp = 0; s.characters[0].hp = 99999; s.characters[0].cooldowns.basic = 999;
    let wall = 0; while (!plan.isBlocked(me.x, me.y + wall) && wall < 12) wall += .25;
    expect(wall).toBeLessThan(12); // o corredor tem parede dos dois lados
    s.monsters = [mon('behind', me.x, me.y + wall + 1.5)]; s.run!.shots = [{ id: 's1', hero: s.characters[1].id, x: me.x, y: me.y, vx: 0, vy: 1, left: 20, dmg: 500, crit: false }];
    for (let i = 0; i < 10; i++) e.tick(100);
    expect(e.getSnapshot().monsters.find(m => m.uid === 'behind')!.hp).toBe(1e9); expect(e.getSnapshot().run!.shots ?? []).toHaveLength(0);
  });
  it('o tiro expira no fim do alcance; salvar/carregar descarta os que estão no ar', async () => {
    const { e, s, me } = arena(1, []); s.run!.shots = [{ id: 's1', hero: s.characters[1].id, x: me.x, y: me.y, vx: 1, vy: 0, left: 1, dmg: 1, crit: false }];
    const { migrateGameState } = await import('../persistence/validation');
    expect((migrateGameState(JSON.parse(JSON.stringify(e.getSnapshot()))) as ReturnType<typeof e.getSnapshot>).run!.shots).toBeUndefined();
    for (let i = 0; i < 5; i++) e.tick(100); expect(e.getSnapshot().run!.shots ?? []).toHaveLength(0);
    expect(dist(me, me)).toBe(0);
  });
});
