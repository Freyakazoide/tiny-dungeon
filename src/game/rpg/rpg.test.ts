import { describe, expect, it } from 'vitest';
import { CLASS_NODES, CLASS_BY_ID, childrenOf } from './classTree';
import { baseTries, etaSeconds, formatEta, hoursToReach, remainingTries, xpForLevel } from './curves';
import { checkRequirements, evolutionOptions, evolveClass } from './evolution';
import { OFFLINE_CAP_S, SESSION_GAP_S, applyOfflineTraining, sessionGapSeconds } from './offline';
import { PROFICIENCY_IDS, START_LEVEL } from './proficiencies';
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

describe('ritmo (5,5 dias até a skill 25, 24 h/dia)', () => {
  it.each(['melee', 'magic', 'fire', 'holy', 'death'] as const)('%s: 10 -> 25 leva ~132 h', id => {
    const h = hoursToReach(id, START_LEVEL, 25);
    expect(h).toBeGreaterThan(130); expect(h).toBeLessThan(134);
  });
  it('elemental 35 e 40 ficam perto de 19,7 e 35,6 dias', () => {
    expect(hoursToReach('fire', 10, 35) / 24).toBeCloseTo(19.7, 0);
    expect(hoursToReach('fire', 10, 40) / 24).toBeCloseTo(35.6, 0);
  });
  it('híbrida (35+35) custa quase o mesmo que pura (40)', () => {
    const hybrid = 2 * hoursToReach('fire', 10, 35), pure = hoursToReach('fire', 10, 40);
    expect(hybrid / pure).toBeGreaterThan(0.95); expect(hybrid / pure).toBeLessThan(1.15);
  });
});

describe('estrutura da árvore', () => {
  it('tem 1 Aprendiz, 15 classes base e 46 subclasses (62 nós)', () => {
    expect(CLASS_NODES.filter(n => n.tier === 0)).toHaveLength(1);
    expect(CLASS_NODES.filter(n => n.tier === 1)).toHaveLength(15);
    expect(CLASS_NODES.filter(n => n.tier === 2)).toHaveLength(46);
    expect(CLASS_NODES).toHaveLength(62);
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
  it('depois de virar Ladino, só existem as subclasses do Ladino', () => {
    const p = ready({ melee: 25, magic: 40, fire: 40 }, 30);
    evolveClass(p, 'ladino');
    expect(evolutionOptions(p).map(o => o.node.id).sort()).toEqual(['assassino', 'mestre_das_sombras']);
    expect(evolveClass(p, 'mago').ok).toBe(false);
    expect(evolveClass(p, 'piromante').ok).toBe(false);
    expect(evolveClass(p, 'aprendiz').ok).toBe(false);
  });
  it('o progresso feito antes da classe é preservado', () => {
    const p = ready({ melee: 25 }, 10);
    gainTries(p, 'fire', 1234);
    evolveClass(p, 'guerreiro');
    expect(p.proficiencies.fire.tries).toBe(1234);
    expect(p.proficiencies.melee.level).toBe(25);
  });
  it('híbrida exige as duas proficiências em 35 e nível 25', () => {
    const p = ready({ magic: 25 }, 10);
    evolveClass(p, 'mago');
    p.level = 25; p.proficiencies.fire.level = 35;
    expect(evolveClass(p, 'arcanista_de_plasma').ok).toBe(false);
    p.proficiencies.energy.level = 35;
    expect(evolveClass(p, 'arcanista_de_plasma')).toMatchObject({ ok: true });
  });
  it('pura exige 40 e a mensagem diz o que falta', () => {
    const p = ready({ magic: 25, fire: 39 }, 10);
    evolveClass(p, 'mago');
    p.level = 25;
    const check = checkRequirements(p, CLASS_BY_ID.piromante);
    expect(check.met).toBe(false);
    expect(check.missing).toEqual(['Fogo 40 (atual 39)']);
  });
  it('subclasse com contador só libera depois de atingir o contador', () => {
    const p = ready({ melee: 40 }, 25);
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

describe('treino offline', () => {
  it('menos de 60 s não conta como offline', () => {
    expect(sessionGapSeconds(1000, 1000 + SESSION_GAP_S * 1000)).toBe(0);
    expect(sessionGapSeconds(0, 3_600_000)).toBe(3600);
  });
  it('credita só tries na proficiência escolhida', () => {
    const p = createProfile(); p.offlineTarget = 'holy';
    const r = applyOfflineTraining(p, 3600)!;
    expect(r.tries).toBe(1800); expect(r.target).toBe('holy');
    expect(p.proficiencies.holy.level).toBe(10); // 1.800 tries ainda não completam o nível 10 -> 11
    expect(p.xp).toBe(0); expect(p.level).toBe(1); expect(p.counters).toEqual({});
    expect(p.proficiencies.melee).toEqual({ level: 10, tries: 0 });
  });
  it('sem alvo usa a última treinada; sem nenhuma, não faz nada', () => {
    const p = createProfile();
    expect(applyOfflineTraining(p, 3600)).toBeNull();
    gainTries(p, 'death', 10);
    expect(applyOfflineTraining(p, 3600)!.target).toBe('death');
  });
  it('respeita o teto de 24 h por retorno', () => {
    const p = createProfile(); p.offlineTarget = 'melee';
    expect(applyOfflineTraining(p, OFFLINE_CAP_S * 5)!.seconds).toBe(OFFLINE_CAP_S);
  });
  it('24 h offline em Holy rendem cerca de 1/5,5 do caminho até a skill 25', () => {
    const p = createProfile(); p.offlineTarget = 'holy';
    for (let day = 0; day < 6; day++) applyOfflineTraining(p, 86400);
    expect(p.proficiencies.holy.level).toBeGreaterThanOrEqual(25);
    const q = createProfile(); q.offlineTarget = 'holy';
    for (let day = 0; day < 5; day++) applyOfflineTraining(q, 86400);
    expect(q.proficiencies.holy.level).toBeLessThan(25);
  });
});

describe('ETA e portas novas', () => {
  it.each(['melee', 'magic', 'fire', 'holy', 'death'] as const)('%s: etaSeconds 10 -> 25 ≈ 132 h (±1%%)', id => {
    const h = etaSeconds(id, 10, 0, 25) / 3600;
    expect(h).toBeGreaterThan(132 * 0.99); expect(h).toBeLessThan(132 * 1.01);
  });
  it('primeiro nível ≈ 4 h em combate e < 4 h em magia e elementos', () => {
    expect(etaSeconds('melee', 10, 0, 11) / 3600).toBeCloseTo(4.2, 0);
    expect(etaSeconds('magic', 10, 0, 11) / 3600).toBeCloseTo(2.8, 0);
    expect(etaSeconds('fire', 10, 0, 11) / 3600).toBeCloseTo(3.5, 0);
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
    expect(formatEta(Infinity)).toBe('—');
  });
  it('as portas da árvore usam 25 / 35 / 35 / 40', () => {
    expect(CLASS_BY_ID.guerreiro.requires.skills).toEqual({ melee: 25 });
    expect(CLASS_BY_ID.arcanista_de_plasma.requires.skills).toEqual({ fire: 35, energy: 35 });
    expect(CLASS_BY_ID.sumo_sacerdote.requires.skills).toEqual({ holy: 35 });
    expect(CLASS_BY_ID.piromante.requires.skills).toEqual({ fire: 40 });
  });
});
