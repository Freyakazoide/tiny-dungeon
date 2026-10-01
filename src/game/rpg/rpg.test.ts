import { describe, expect, it } from 'vitest';
import { CLASS_NODES, CLASS_BY_ID, childrenOf } from './classTree';
import { baseTries, etaSeconds, formatEta, hoursToReach, remainingTries, triesForNextLevel, xpForLevel } from './curves';
import { checkRequirements, evolutionOptions, evolveClass } from './evolution';
import { OFFLINE_CAP_S, SESSION_GAP_S, applyOfflineTraining, offlineSelection, sessionGapSeconds } from './offline';
import { PROFICIENCY_IDS, START_LEVEL } from './proficiencies';
import { runtime } from './runtime';
import { addCounter, createProfile, gainExperience, gainTries } from './profile';

const ready = (skills: Partial<Record<(typeof PROFICIENCY_IDS)[number], number>>, level = 30) => {
  const p = createProfile();
  p.level = level;
  for (const [id, lv] of Object.entries(skills)) p.proficiencies[id as keyof typeof p.proficiencies].level = lv!;
  return p;
};

describe('curvas da planilha', () => {
  it('XP por nível bate com a planilha', () => {
    expect([1, 2, 3, 10, 30].map(xpForLevel)).toEqual([50, 348, 1084, 31548, 683769]);
  });
  it('tries base de Melee bate com a planilha (níveis 1 a 30)', () => {
    const expected = [11, 12, 13, 15, 16, 18, 19, 21, 24, 26, 29, 31, 35, 38, 42, 46, 51, 56, 61, 67, 74, 81, 90, 98, 108, 119, 131, 144, 159, 174];
    expect(expected.map((_, i) => baseTries('melee', i + 1))).toEqual(expected);
  });
});

describe('ritmo (Tier 1 em ~8 h, depois exponencial)', () => {
  it.each(['melee', 'magic', 'fire', 'holy', 'death'] as const)('%s: 10 -> 25 leva ~8 h', id => {
    const h = hoursToReach(id, START_LEVEL, 25);
    expect(h).toBeGreaterThan(8 * .99); expect(h).toBeLessThan(8 * 1.01);
  });
  it('depois da porta: skill 35 ≈ 3,7 d, 38 ≈ 8 d, 40 ≈ 13,5 d, 50 ≈ 185 d', () => {
    for (const [to, days] of [[35, 3.7], [38, 8.0], [40, 13.5], [45, 50], [50, 185]] as const)
      expect(hoursToReach('fire', 10, to) / 24 / days, `skill ${to}`).toBeGreaterThan(.98), expect(hoursToReach('fire', 10, to) / 24 / days, `skill ${to}`).toBeLessThan(1.02);
  });
  it('skill 30 ainda cabe no primeiro dia (~1 d)', () => { expect(hoursToReach('fire', 10, 30) / 24).toBeGreaterThan(.95); expect(hoursToReach('fire', 10, 30) / 24).toBeLessThan(1.1); });
  it('híbrida (35+35) em sequência ≈ pura (38): paridade de tempo total', () => {
    const hybrid = 2 * hoursToReach('fire', 10, 35), pure = hoursToReach('fire', 10, 38);
    expect(hybrid / pure).toBeGreaterThan(.9); expect(hybrid / pure).toBeLessThan(1.02);
  });
  it('custo crescente e finito de 10 a 100 (sem Infinity/NaN)', () => {
    let previous = 0;
    for (let level = 10; level < 100; level++) { const t = triesForNextLevel('melee', level); expect(Number.isFinite(t)).toBe(true); expect(t).toBeGreaterThan(previous); previous = t; }
  });
  it('continuidade na porta: sair do 25 custa custo(24) × 1,3 e do 26 custa × 1,3²', () => {
    const last = triesForNextLevel('melee', 24);
    expect(Math.abs(triesForNextLevel('melee', 25) - Math.round(last * 1.3))).toBeLessThanOrEqual(1);
    expect(Math.abs(triesForNextLevel('melee', 26) - Math.round(last * 1.3 ** 2))).toBeLessThanOrEqual(1);
  });
  it('tier1Hours e postGateGrowth ajustam o ritmo sem editar código', () => {
    runtime.tier1Hours = 12;
    try { expect(hoursToReach('melee', 10, 25) / 12).toBeGreaterThan(.99); expect(hoursToReach('melee', 10, 25) / 12).toBeLessThan(1.01); } finally { runtime.tier1Hours = 8; }
    const base = hoursToReach('melee', 10, 45); runtime.postGateGrowth = 1.4;
    try { expect(hoursToReach('melee', 10, 45)).toBeGreaterThan(base * 3); } finally { runtime.postGateGrowth = 1.3; }
  });
});

describe('estrutura da árvore', () => {
  it('tem 1 Aprendiz, 15 classes base e 90 especializações (106 nós)', () => {
    expect(CLASS_NODES.filter(n => n.tier === 0)).toHaveLength(1);
    expect(CLASS_NODES.filter(n => n.tier === 1)).toHaveLength(15);
    expect(CLASS_NODES.filter(n => n.tier === 2)).toHaveLength(90);
    expect(CLASS_NODES).toHaveLength(106);
    for (const base of CLASS_NODES.filter(n => n.tier === 1)) expect(childrenOf(base.id), base.id).toHaveLength(6);   // 3 puras + 3 híbridas
  });
  it('ids únicos e pais coerentes (Aprendiz -> Tier 1 -> Tier 2)', () => {
    expect(new Set(CLASS_NODES.map(n => n.id)).size).toBe(CLASS_NODES.length);
    for (const n of CLASS_NODES) {
      if (n.tier === 0) expect(n.parent).toBeNull();
      if (n.tier === 1) expect(n.parent).toBe('aprendiz');
      if (n.tier === 2) expect(CLASS_BY_ID[n.parent!].tier).toBe(1);
    }
  });
  it('toda classe base tem ao menos 2 subclasses; Tier 2 não tem filhos', () => {
    for (const n of CLASS_NODES.filter(n => n.tier === 1)) expect(childrenOf(n.id).length).toBeGreaterThanOrEqual(2);
    for (const n of CLASS_NODES.filter(n => n.tier === 2)) expect(childrenOf(n.id)).toHaveLength(0);
  });
  it('nenhum requisito de Tier 2 é idêntico a outro da mesma classe', () => {
    for (const parent of CLASS_NODES.filter(n => n.tier === 1)) {
      const keys = childrenOf(parent.id).map(n => JSON.stringify(n.requires));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('exclusividade e evolução', () => {
  it('o Aprendiz vê as 15 classes base, sem requisitos cumpridos no início', () => {
    const p = createProfile();
    const options = evolutionOptions(p);
    expect(options).toHaveLength(15);
    expect(options.every(o => !o.met)).toBe(true);
  });
  it('bloqueia com skill 24 e libera com skill 25 + nível 10', () => {
    const p = ready({ melee: 24 }, 10);
    expect(evolveClass(p, 'ladino').ok).toBe(false);
    p.proficiencies.melee.level = 25;
    expect(evolveClass(p, 'ladino')).toMatchObject({ ok: true });
    expect(p.classId).toBe('ladino');
    expect(p.classPath).toEqual(['aprendiz', 'ladino']);
  });
  it('depois de virar Ladino, só existem as 6 especializações do Ladino', () => {
    const p = ready({ melee: 25, magic: 38, fire: 38 }, 30);
    evolveClass(p, 'ladino');
    expect(evolutionOptions(p).map(o => o.node.id).sort()).toEqual(['assassino', 'bailarino_de_laminas', 'duelista', 'envenenador', 'mestre_das_sombras', 'saqueador']);
    expect(evolveClass(p, 'mago').ok).toBe(false);
    expect(evolveClass(p, 'evocador').ok).toBe(false);
    expect(evolveClass(p, 'aprendiz').ok).toBe(false);
  });
  it('o progresso feito antes da classe é preservado', () => {
    const p = ready({ melee: 25 }, 10);
    gainTries(p, 'fire', 5);
    evolveClass(p, 'guerreiro');
    expect(p.proficiencies.fire.tries).toBe(5);
    expect(p.proficiencies.melee.level).toBe(25);
  });
  it('híbrida exige as duas proficiências em 35 e nível 25', () => {
    const p = ready({ melee: 25 }, 10);
    evolveClass(p, 'guerreiro');
    p.level = 25; p.proficiencies.melee.level = 35;
    expect(evolveClass(p, 'legionario').ok).toBe(false);
    p.proficiencies.defense.level = 35;
    expect(evolveClass(p, 'legionario')).toMatchObject({ ok: true });
  });
  it('pura exige 38 e a mensagem diz o que falta', () => {
    const p = ready({ magic: 25 }, 10);
    evolveClass(p, 'mago');
    p.level = 25; p.proficiencies.magic.level = 37;
    const check = checkRequirements(p, CLASS_BY_ID.evocador);
    expect(check.met).toBe(false);
    expect(check.missing).toEqual(['Magia 38 (atual 37)']);
  });
  it('subclasse com contador só libera depois de atingir o contador', () => {
    const p = ready({ melee: 38 }, 25);
    evolveClass(p, 'guerreiro');
    expect(evolveClass(p, 'gladiador').ok).toBe(false);
    addCounter(p, 'crits', 5000);
    expect(evolveClass(p, 'gladiador')).toMatchObject({ ok: true });
  });
});

describe('progressão', () => {
  it('preserva sobra de XP em múltiplos níveis', () => {
    const p = createProfile();
    gainExperience(p, xpForLevel(1) + xpForLevel(2) + 37);
    expect(p.level).toBe(3); expect(p.xp).toBe(37);
  });
  it('todas as proficiências começam no nível 10', () => {
    const p = createProfile();
    expect(PROFICIENCY_IDS.every(id => p.proficiencies[id].level === 10)).toBe(true);
  });
});

describe('treino offline (2 vagas)', () => {
  it('menos de 60 s não conta como offline', () => {
    expect(sessionGapSeconds(1000, 1000 + SESSION_GAP_S * 1000)).toBe(0);
    expect(sessionGapSeconds(0, 3_600_000)).toBe(3600);
  });
  it('duas vagas distintas recebem seconds × 0,5 tries cada; vagas iguais contam uma vez; só tries', () => {
    const p = createProfile(); p.offlineTargets = ['holy', 'melee'];
    const r = applyOfflineTraining(p, 3600)!;
    expect(r.entries.map(e => [e.target, e.tries])).toEqual([['holy', 1800], ['melee', 1800]]);
    expect(p.proficiencies.holy.level).toBeGreaterThan(12); expect(p.proficiencies.melee.level).toBeGreaterThan(12);
    expect(p.xp).toBe(0); expect(p.level).toBe(1); expect(p.counters).toEqual({}); expect(p.proficiencies.fire).toEqual({ level: 10, tries: 0 });
    const same = createProfile(); same.offlineTargets = ['fire', 'fire'];
    expect(applyOfflineTraining(same, 3600)!.entries).toHaveLength(1);
  });
  it('sem vagas: o histórico (fire, melee, ice) treina fire e melee', () => {
    const p = createProfile(); p.offlineHistory = ['fire', 'melee', 'ice'];
    expect(offlineSelection(p)).toEqual(['fire', 'melee']);
    expect(applyOfflineTraining(p, 3600)!.entries.map(e => e.target)).toEqual(['fire', 'melee']);
  });
  it('uma vaga escolhida e uma do histórico; sem repetir', () => {
    const p = createProfile(); p.offlineTargets = [null, 'ice']; p.offlineHistory = ['ice', 'fire', 'melee'];
    expect(offlineSelection(p)).toEqual(['ice', 'fire']);
  });
  it('sem vagas nem histórico: treinam lastTrained e prevTrained; sem nenhuma, nada', () => {
    const p = createProfile();
    expect(applyOfflineTraining(p, 3600)).toBeNull();
    gainTries(p, 'death', 1); gainTries(p, 'death', 1); gainTries(p, 'melee', 1);
    expect(p.lastTrained).toBe('melee'); expect(p.prevTrained).toBe('death');
    expect(offlineSelection(p)).toEqual(['melee', 'death']);
  });
  it('respeita o teto de 24 h por retorno', () => {
    const p = createProfile(); p.offlineTargets = ['melee', null];
    expect(applyOfflineTraining(p, OFFLINE_CAP_S * 5)!.seconds).toBe(OFFLINE_CAP_S);
  });
  it('24 h offline em Holy levam da skill 10 à porta do Tier 1 e além (a porta são 8 h)', () => {
    const p = createProfile(); p.offlineTargets = ['holy', null];
    applyOfflineTraining(p, 86400);
    expect(p.proficiencies.holy.level).toBeGreaterThanOrEqual(29); expect(p.proficiencies.holy.level).toBeLessThan(31);
  });
});

describe('ETA e portas novas', () => {
  it.each(['melee', 'magic', 'fire', 'holy', 'death'] as const)('%s: etaSeconds 10 -> 25 ≈ 8 h (±1%%)', id => {
    const h = etaSeconds(id, 10, 0, 25) / 3600;
    expect(h).toBeGreaterThan(8 * 0.99); expect(h).toBeLessThan(8 * 1.01);
  });
  it('curva: 12 tries no 10 -> 11, 290 no 14 -> 15, ~1.160 no 19 -> 20 e 2.613 no 24 -> 25', () => {
    expect(triesForNextLevel('melee', 10)).toBe(12); expect(triesForNextLevel('melee', 14)).toBe(290);
    expect(Math.abs(triesForNextLevel('melee', 19) - 1160)).toBeLessThanOrEqual(2); expect(triesForNextLevel('melee', 24)).toBe(2613);
    expect(Math.abs(triesForNextLevel('melee', 25) - Math.round(2613 * 1.3))).toBeLessThanOrEqual(1);
  });
  it('o primeiro nível sai em ~23 s e o último da porta em ~1,45 h para todas as proficiências', () => {
    for (const id of PROFICIENCY_IDS) { expect(triesForNextLevel(id, 10) * 2).toBeLessThan(30); expect(triesForNextLevel(id, 24) * 2 / 3600).toBeCloseTo(1.45, 1); }
  });
  it('todas as 13 proficiências: porta 25 em 8 h, skill 35 em 3,7 d, 38 em 8 d, 40 em 13,5 d e 50 em ~185 d (±2%)', () => {
    for (const id of PROFICIENCY_IDS) for (const [to, days] of [[25, 8 / 24], [35, 3.7], [38, 8.0], [40, 13.5], [50, 185]] as const) {
      const ratio = hoursToReach(id, 10, to) / 24 / days; expect(ratio, `${id} ${to}`).toBeGreaterThan(.98); expect(ratio, `${id} ${to}`).toBeLessThan(1.02);
    }
  });
  it('remainingTries desconta o que já foi treinado e zera ao atingir o alvo', () => {
    expect(remainingTries('melee', 25, 0, 25)).toBe(0);
    expect(remainingTries('melee', 24, 10, 25)).toBe(remainingTries('melee', 24, 0, 25) - 10);
    expect(etaSeconds('melee', 10, 0, 25, 1)).toBe(remainingTries('melee', 10, 0, 25));
  });
  it('formatEta escolhe dias, horas ou minutos', () => {
    expect(formatEta(5 * 86400 + 3 * 3600)).toBe('5d 3h');
    expect(formatEta(3 * 3600 + 20 * 60)).toBe('3h 20min');
    expect(formatEta(10)).toBe('1min');
    expect(formatEta(Infinity)).toBe('—'); expect(formatEta(90 * 86400)).toBe('3meses'); expect(formatEta(59 * 86400)).toBe('59d 0h');
  });
  it('as portas da árvore usam 25 / 35 / 35 / 38', () => {
    expect(CLASS_BY_ID.guerreiro.requires.skills).toEqual({ melee: 25 });
    expect(CLASS_BY_ID.legionario.requires.skills).toEqual({ melee: 35, defense: 35 });
    expect(CLASS_BY_ID.sumo_sacerdote.requires.skills).toEqual({ holy: 35 });
    expect(CLASS_BY_ID.evocador.requires.skills).toEqual({ magic: 38 });
  });
});
