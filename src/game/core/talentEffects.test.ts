import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { partyState } from './testing';
import type { Character, MonsterRuntime } from './types';
import { MONSTERS } from '../data/monsters';
import { buyTalent, talentValue } from '../systems/talentGrid';
import { characterStats } from '../systems/progression';

afterEach(() => vi.restoreAllMocks());

const setup = () => {
  const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 90;
  e.evolve(c.id, 'guerreiro', { force: true });
  return { e, state: e.getSnapshot(), c }; // o emit troca a raiz do estado: pegue o snapshot depois de evoluir
};
/** Compra em ordem de linha, ignorando a trava de pontos (o teste foca no efeito, não na compra). */
const give = (c: Character, ranks: Record<string, number>) => { Object.assign(c.talentRanks, ranks); };
const monster = (defId: string, hp = 100, maxHp = 100): MonsterRuntime => ({ uid: 'm', defId, hp, maxHp, cooldown: 0, alive: true });

describe('Fase 6 B — efeitos numéricos no combate', () => {
  it('melee aumenta o ataque básico corpo a corpo; boss só vale contra chefe; exec só abaixo de 30% de HP', () => {
    const { e, state, c } = setup();
    state.characters.forEach(x => { if (x !== c) x.hp = 0; });
    const swing = (target: MonsterRuntime) => { e.getSnapshot().monsters = [target]; c.cooldowns.basic = 0; vi.spyOn(Math, 'random').mockReturnValue(.99); const before = target.hp; (e as unknown as { basicAttack(c: Character): void }).basicAttack(c); return before - target.hp; };
    const base = swing(monster('skeleton', 1e6, 1e6));
    give(c, { 'guerreiro.r1c2': 10 }); // melee +15%
    const withMelee = swing(monster('skeleton', 1e6, 1e6));
    expect(withMelee).toBeGreaterThan(base);
    give(c, { 'guerreiro.r3c2': 10 }); // boss +15%
    const bossId = Object.values(MONSTERS).find(m => m.boss)!.id, normalId = 'skeleton';
    expect(talentValue(c, 'boss')).toBeCloseTo(.15);
    const boss = swing(monster(bossId, 1e6, 1e6)), boss0 = (() => { give(c, { 'guerreiro.r3c2': 0 }); const d = swing(monster(bossId, 1e6, 1e6)); give(c, { 'guerreiro.r3c2': 10 }); return d; })();
    expect(boss).toBeGreaterThan(boss0);
    expect(swing(monster(normalId, 1e6, 1e6))).toBe(withMelee); // sem bônus contra comuns
    give(c, { 'guerreiro.r4c1': 10 }); // exec +20%
    const low = swing(monster(normalId, 2e5, 1e6)); // 20% de HP
    expect(low).toBeGreaterThan(withMelee);
  });

  it('crítico usa 1,65 + dano crítico (teto ×4,0)', () => {
    const { e, c } = setup();
    const mult = () => (e as unknown as { critMultiplier(c: Character): number }).critMultiplier(c);
    expect(mult()).toBeCloseTo(1.65);
    give(c, { 'guerreiro.r3c0': 10 }); expect(mult()).toBeCloseTo(1.95); // critdmg 3 × 10 = 30 pts
    give(c, { 'guerreiro.r3c0': 10, 'guerreiro.r1c2': 0 });
    c.talentRanks['guerreiro.r3c0'] = 1000; expect(mult()).toBe(4);
  });

  it('espinhos devolvem parte do dano ao monstro atacante', () => {
    const { e, state, c } = setup();
    state.characters.forEach(x => { if (x !== c) x.hp = 0; }); state.team = [c.id]; c.helper.autoSupplies = false;
    give(c, { 'guerreiro.r3c6': 10 }); // thorns 1,5 × 10 = 15%
    expect(talentValue(c, 'thorns')).toBeCloseTo(.15);
    e.start(); const live = e.getSnapshot(); const m = monster('skeleton', 1e6, 1e6); live.monsters = [m]; c.cooldowns.basic = 99;
    c.hp = characterStats(c, live).maxHp; const hpBefore = c.hp; e.tick(100);
    const taken = hpBefore - c.hp; expect(taken).toBeGreaterThan(0);
    expect(1e6 - m.hp).toBeGreaterThan(0); // espinhos: o monstro perdeu HP sem ninguém atacar
  });

  it('poção potencializada (talento potion) cura mais', () => {
    const { e, state, c } = setup();
    give(c, { 'guerreiro.r4c4': 10 }); // potion 3 × 10 = 30%
    expect(talentValue(c, 'potion')).toBeCloseTo(.30);
    c.hp = 10; state.inventory.supply.push({ itemId: 'health_potion', quantity: 1 });
    const before = c.hp; expect(e.useSupply(c.id, 'health_potion')).toBe(true);
    const healed = c.hp - before;
    expect(healed).toBeGreaterThan(0);
    give(c, { 'guerreiro.r4c4': 0 });
    c.hp = 10; state.inventory.supply.push({ itemId: 'health_potion', quantity: 1 }); e.useSupply(c.id, 'health_potion');
    expect(healed).toBeGreaterThan(c.hp - 10);
  });

  it('ouro, xp e drop são do talento do grupo: xp por personagem; ouro/drop/venda usam o melhor da equipe', () => {
    const { e, state, c } = setup();
    const other = state.characters[1];
    expect(buyTalent(other, 'squire.r1c3')).toBe(true); // só para ter ranks; os bônus vêm dos ranks abaixo
    other.talentRanks['squire.r2c3'] = 3; // xp +3,75 × 3 = 11,25%
    expect(talentValue(other, 'xp')).toBeCloseTo(.1125); expect(talentValue(c, 'xp')).toBe(0);
    const team = e as unknown as { teamBest(code: string): number };
    expect(team.teamBest('xp')).toBeCloseTo(.1125);
    expect(team.teamBest('gold')).toBe(0);
  });
});
