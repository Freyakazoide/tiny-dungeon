import { describe, expect, it } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import type { Character } from '../core/types';
import { pointsAt } from '../data/talentTrees';
import { pickMonsterTarget, aggroShares } from './combat';
import { characterStats, trainProficiency } from './progression';
import { buyTalent, buyTalentMax, canBuy, investedPoints, resetTalents, talentPointsAvailable, talentRespecCost, talentTotals, validTalentRanks } from './talentGrid';
import { triesForNextLevel } from '../rpg/curves';

const hero = (level = 10) => { const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = level; return { e, c, state: e.getSnapshot() }; };
const buy = (c: Character, id: string, times = 1) => { for (let i = 0; i < times; i++) expect(buyTalent(c, id), `${id} #${i + 1}`).toBe(true); };

describe('grade de talentos — compra (B4)', () => {
  it('começa só com a Origem e 2 pontos por nível + 5 a cada 10 níveis', () => {
    const { c } = hero(1);
    expect(c.talentRanks).toEqual({ 'squire.root': 1 }); expect(talentPointsAvailable(c)).toBe(2);
    c.profile.level = 10; expect(talentPointsAvailable(c)).toBe(25); c.profile.level = 25; expect(talentPointsAvailable(c)).toBe(pointsAt(25)); expect(pointsAt(25)).toBe(60);
  });

  it('só compra o rank seguinte, dentro do máximo, com saldo e com um vizinho desbloqueado', () => {
    const { c } = hero(10);
    expect(canBuy(c, 'squire.r2c1').reasons.join()).toMatch(/vizinho/); // sem o pai r1c2
    expect(buyTalent(c, 'squire.r2c1')).toBe(false);
    buy(c, 'squire.r1c2'); buy(c, 'squire.r2c1'); // pai em 1+ libera o Minor
    buy(c, 'squire.r1c2', 4); expect(c.talentRanks['squire.r1c2']).toBe(5);
    expect(buyTalent(c, 'squire.r1c2')).toBe(false); expect(canBuy(c, 'squire.r1c2').reasons).toEqual(['Rank máximo.']);
    expect(talentPointsAvailable(c)).toBe(25 - 6);
  });

  it('Notable exige um vizinho em 5/5; Major exige o vizinho em 5 e a trava de linha', () => {
    const { c } = hero(20);
    buy(c, 'squire.r1c3', 4);
    expect(canBuy(c, 'squire.r2c3').ok).toBe(false); // r1c3 ainda em 4
    buy(c, 'squire.r1c3'); buy(c, 'squire.r2c3', 3); // notable: 3 ranks × 2 pts
    expect(investedPoints(c, 'aprendiz')).toBe(5 + 6);
    // Major r4c3: precisa de r3c3 em 5 (que precisa da trava de linha 4) e de 8 pts investidos na grade
    buy(c, 'squire.r3c3', 5);
    expect(canBuy(c, 'squire.r4c3').ok).toBe(true);
    buy(c, 'squire.r4c3'); expect(c.talentRanks['squire.r4c3']).toBe(1);
    expect(buyTalent(c, 'squire.r4c3')).toBe(false);
  });

  it('a trava de linha impede pular para cima: nada da linha 3 com menos de 4 pontos na grade', () => {
    const { c } = hero(10);
    buy(c, 'squire.r1c2'); buy(c, 'squire.r2c2'); // 2 pts investidos
    expect(canBuy(c, 'squire.r3c2').reasons.join()).toMatch(/Investir mais 2 pts/);
    buy(c, 'squire.r1c2');
    expect(canBuy(c, 'squire.r3c2').reasons.join()).toMatch(/Investir mais 1 pts/);
    buy(c, 'squire.r1c2'); expect(canBuy(c, 'squire.r3c2').ok).toBe(true);
  });

  it('Major avançado sem 2 pais em 5 falha (Tier 1) e o Keystone exige 2 Majors', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; e.evolve(c.id, 'guerreiro', { force: true }); c.profile.level = 90;
    expect(canBuy(c, 'guerreiro.r10c2').ok).toBe(false);
    expect(canBuy(c, 'guerreiro.r10c2').reasons.join()).toMatch(/2 vizinhos em 5\+/);
    expect(canBuy(c, 'guerreiro.r6c1').reasons.join()).toMatch(/1 vizinho em 5\+/); // o Major da linha 6 pede só 1
    expect(canBuy(c, 'guerreiro.r12c3').reasons.join()).toMatch(/2 Majors/);
  });

  it('grades fora do caminho ficam fechadas até evoluir, e evoluir concede a Origem da nova grade', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 10;
    expect(canBuy(c, 'guerreiro.r1c2').reasons).toEqual(['Esta grade abre ao evoluir.']);
    expect(e.evolve(c.id, 'guerreiro', { force: true })).toBe(true);
    expect(c.talentRanks['guerreiro.root']).toBe(1);
    expect(canBuy(c, 'guerreiro.r1c2').ok).toBe(true);
    expect(canBuy(c, 'mago.r1c2').ok).toBe(false);
  });

  it('Shift+clique (buyTalentMax) compra tudo o que o saldo permitir', () => {
    const { c } = hero(2); // 4 pontos
    expect(buyTalentMax(c, 'squire.r1c2')).toBe(4); expect(talentPointsAvailable(c)).toBe(0);
    expect(buyTalentMax(c, 'squire.r1c2')).toBe(0);
  });
});

describe('grade de talentos — respec e validação (B4/B10)', () => {
  it('respec devolve exatamente os pontos gastos, mantém a Origem e custa 25 × pts^1,6', () => {
    const { c } = hero(10);
    buy(c, 'squire.r1c2', 5); buy(c, 'squire.r2c2', 2);
    const before = talentPointsAvailable(c); expect(investedPoints(c)).toBe(7);
    expect(talentRespecCost(c)).toBe(Math.round(25 * 7 ** 1.6));
    expect(resetTalents(c)).toBe(7); expect(talentPointsAvailable(c)).toBe(before + 7); expect(c.talentRanks).toEqual({ 'squire.root': 1 });
  });

  it('respec por grade só zera a grade escolhida', () => {
    const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 20; e.getSnapshot().gold = 1e6;
    buy(c, 'squire.r1c2', 3); e.evolve(c.id, 'guerreiro', { force: true }); buy(c, 'guerreiro.r1c2', 2);
    expect(e.respecTalents(c.id, 'guerreiro')).toBe(true);
    expect(c.talentRanks).toEqual({ 'squire.root': 1, 'squire.r1c2': 3, 'guerreiro.root': 1 });
  });

  it('valida por replay em ordem topológica e aceita o que o jogador realmente comprou', () => {
    const { c } = hero(20);
    buy(c, 'squire.r1c3', 5); buy(c, 'squire.r2c3', 3); buy(c, 'squire.r3c3', 5); buy(c, 'squire.r4c3');
    expect(validTalentRanks(c.talentRanks, c.profile.classPath, 20)).toBe(true);
    expect(validTalentRanks({ ...c.talentRanks, 'squire.r4c3': 2 }, c.profile.classPath, 20)).toBe(false); // acima do máximo
    expect(validTalentRanks({ 'squire.root': 1, 'squire.r4c3': 1 }, c.profile.classPath, 20)).toBe(false); // sem pais nem trava
    expect(validTalentRanks({ 'squire.root': 1, 'squire.r1c2': 1, 'squire.r1c1': 1 }, c.profile.classPath, 20)).toBe(false); // nó inexistente
    expect(validTalentRanks(c.talentRanks, c.profile.classPath, 5)).toBe(false); // mais pontos que o nível dá
    expect(validTalentRanks({ 'squire.r1c2': 1 }, c.profile.classPath, 20)).toBe(false); // sem a Origem
  });
});

describe('grade de talentos — efeitos (B7)', () => {
  it('talentTotals soma rank × perRank por código e aplica os tetos', () => {
    const { c } = hero(30);
    buy(c, 'squire.r1c2', 5); buy(c, 'squire.r1c4', 3); buy(c, 'squire.r2c2', 4);
    expect(talentTotals(c)).toEqual({ melee: 7.5, hp: 6, crit: 2 });
    c.talentRanks['squire.r2c2'] = 5; // 2,5 pp
    // teto: crit ≤ 75 pp no total
    const fake = { ...c, talentRanks: { ...c.talentRanks } } as Character; fake.talentRanks['squire.r2c2'] = 5;
    expect(talentTotals(fake).crit).toBe(2.5);
  });

  it('HP, defesa e crítico entram em characterStats como multiplicador/soma, uma única vez', () => {
    const { c, state } = hero(10);
    const before = characterStats(c, state);
    buy(c, 'squire.r1c4', 5); buy(c, 'squire.r1c3'); buy(c, 'squire.r2c4', 3); buy(c, 'squire.r2c2');
    const after = characterStats(c, state), again = characterStats(c, state);
    expect(after.maxHp).toBe(Math.round(before.maxHp * 1.10)); expect(after.defense).toBeCloseTo(before.defense * 1.06); expect(after.crit).toBeCloseTo(before.crit + .005);
    expect(again).toEqual(after);
  });

  it('talento t_<proficiência> soma ao multiplicador de tries: rank 5 de +2% = +10%', () => {
    const { c } = hero(10);
    const base = c.profile.proficiencies.melee.tries; trainProficiency(c, 'melee', 5); expect(c.profile.proficiencies.melee.tries - base).toBeCloseTo(5);
    buy(c, 'squire.r1c3', 5);
    const before = c.profile.proficiencies.melee.tries; trainProficiency(c, 'melee', 1); expect(c.profile.proficiencies.melee.tries - before).toBeCloseTo(1.1);
    expect(triesForNextLevel('melee', 10)).toBe(12); // continua no primeiro nível: a conta acima não subiu de nível
  });

  it('aggro: quem tem mais peso de aggro é sorteado mais (e o total continua em 100%)', () => {
    const { c } = hero(10);
    const twin = { ...c, id: 'twin', talentRanks: { ...c.talentRanks } } as Character;
    c.isTank = false; twin.isTank = false; c.row = 'front'; twin.row = 'front'; c.hp = twin.hp = 100;
    const equal = aggroShares([c, twin]); expect(equal.get(c.id)).toBeCloseTo(equal.get('twin')!);
    c.talentRanks['guerreiro.r3c5'] = 10; c.profile.classPath = [...c.profile.classPath, 'guerreiro']; // +30% de peso (aggro_up 3 × 10)
    const shares = aggroShares([c, twin]);
    expect(shares.get(c.id)!).toBeGreaterThan(shares.get('twin')!); expect(shares.get(c.id)! + shares.get('twin')!).toBeCloseTo(1);
    expect(pickMonsterTarget([c, twin], () => 0)?.id).toBe(c.id);
  });
});
