import { describe, expect, it } from 'vitest';
import { AI_CONFIG as C } from '../data/balance';
import { buildFoeInfos, canPeel, chooseHeroTarget, choosePeelTarget, choosePrimaryTarget, commitDest, incomingByFoe, lockFor, newHeroAi, noticedZones, reactDelay, scoreHeroTarget, shouldEvade, shouldRetreat, tankShouldLeave, windupDanger, type AiConfig, type FoeView, type HeroAi, type HeroView, type PartyCtx, type Role, type StrikeZone } from './ai';
import type { FoeRole } from './foes';
import { dist, type Pt } from './geom';
import { desiredHeroPosition, healerPosition, rangedPosition, type PosCtx } from './position';

const AI: Record<Role, AiConfig> = { tank: { hold: 0, leash: 99, retreatAt: 0, dodge: 0 }, melee: { hold: 0, leash: 5, retreatAt: .25, dodge: 0 }, ranged: { hold: 4, leash: 4, retreatAt: .4, dodge: 1.8 }, healer: { hold: 5, leash: 3, retreatAt: .5, dodge: 2.2 } };
const hero = (id: string, role: Role, x: number, y: number, o: Partial<HeroView> = {}): HeroView => ({ id, role, row: role === 'tank' || role === 'melee' ? 'front' : 'back', pt: { x, y }, home: { x, y }, hp: 1000, maxHp: 1000, hpFrac: 1, defense: 10, reach: role === 'ranged' || role === 'healer' ? 5.5 : 1.7, roam: role === 'tank' ? 5 : 5.5, ai: AI[role], projectile: role === 'ranged', aoe: false, ...o });
const foe = (uid: string, role: FoeRole, x: number, y: number, o: Partial<FoeView> = {}): FoeView => ({ uid, defId: 'skeleton', pt: { x, y }, r: .36, role, hp: 500, maxHp: 500, hpFrac: 1, boss: false, elite: false, ambush: false, vulnerable: false, dmg: 60, incoming: 0, ...o });
/** Formação em +x: tanque em (10,5), backline em (7,4) e (7,6); inimigos entram por +x. */
const party = (extra: HeroView[] = []) => [hero('tank', 'tank', 10, 5), hero('bow', 'ranged', 7, 4), hero('heal', 'healer', 7, 6), ...extra];
const ctxOf = (heroes: HeroView[], foes: FoeView[], o: Partial<PosCtx> = {}): PosCtx => ({ heroes, infos: buildFoeInfos(heroes, foes), fwd: { x: 1, y: 0 }, clock: 10, focus: { primaryUntil: 0, peelUntil: 0 }, peelers: 0, ...o });
const withFocus = <T extends PartyCtx>(c: T) => { const pri = choosePrimaryTarget(c); c.focus.primaryId = pri.id; c.focus.primaryUntil = pri.until; const peel = choosePeelTarget(c); c.focus.peelId = peel.id; c.focus.peelUntil = peel.until; return c; };
const target = (c: PartyCtx, h: HeroView, ai: HeroAi = newHeroAi()) => chooseHeroTarget(c, h, ai).id;

describe('Utility AI: alvo por papel', () => {
  it('o tanque prioriza o runner que vai para a backline em vez do inimigo mais próximo', () => {
    const hs = party(), foes = [foe('skel', 'melee', 11.2, 5, { holder: 'tank' }), foe('wolf', 'runner', 9, 3, { ambush: false })];
    const c = withFocus(ctxOf(hs, foes)); expect(target(c, hs[0])).toBe('wolf');
    expect(dist(hs[0].pt, foes[0].pt)).toBeLessThan(dist(hs[0].pt, foes[1].pt));   // o mais próximo seria o esqueleto
  });
  it('o tanque protege quem apanha: inimigo batendo no curandeiro vale mais que o que está engajado nele', () => {
    const hs = party(), foes = [foe('a', 'melee', 11, 5, { holder: 'tank' }), foe('b', 'melee', 7.8, 6.2, { holder: 'heal' })];
    expect(target(withFocus(ctxOf(hs, foes)), hs[0])).toBe('b');
  });
  it('o tanque ataca o inimigo que ninguém está segurando', () => {
    const hs = party(), foes = [foe('held', 'melee', 11, 5, { holder: 'tank' }), foe('free', 'melee', 11.5, 6.5)];
    expect(target(withFocus(ctxOf(hs, foes)), hs[0])).toBe('free');
  });
  it('o ranged prefere caster e archer a um inimigo comum à mesma distância', () => {
    const hs = party(), foes = [foe('skel', 'melee', 11, 4.5, { holder: 'tank' }), foe('mage', 'caster', 11, 3.5), foe('arch', 'archer', 11, 6)];
    const c = withFocus(ctxOf(hs, foes)), score = (id: string) => scoreHeroTarget(c, hs[1], c.infos.find(i => i.foe.uid === id)!);
    expect(score('mage')).toBeGreaterThan(score('skel')); expect(score('arch')).toBeGreaterThan(score('skel'));
  });
  it('o ranged prefere o runner que chegou à backline', () => {
    const hs = party(), foes = [foe('skel', 'melee', 11, 4.5, { holder: 'tank' }), foe('wolf', 'runner', 8, 4.6, { holder: 'bow' })];
    expect(target(withFocus(ctxOf(hs, foes)), hs[1])).toBe('wolf');
  });
  it('inimigo quase morto vira prioridade de execução (sem ser regra absoluta)', () => {
    const hs = party([hero('mel', 'melee', 10, 6.5)]), foes = [foe('full', 'melee', 11.2, 6, { holder: 'tank' }), foe('low', 'melee', 11.4, 7, { hp: 40, hpFrac: .08, holder: 'mel' })];
    const c = withFocus(ctxOf(hs, foes)); expect(target(c, hs[3])).toBe('low'); expect(target(c, hs[1])).toBe('low');
    // não é absoluto: o curandeiro quase não liga, e um runner perigoso na backline ganha de um quase morto distante
    const c2 = withFocus(ctxOf(hs, [foe('low2', 'melee', 14.5, 5, { hp: 40, hpFrac: .08 }), foe('wolf', 'runner', 7.6, 4.5, { holder: 'bow' })]));
    expect(target(c2, hs[0])).toBe('wolf');
  });
  it('ranged escolhe o alvo alcançável sem correr e evita o que está fora da zona', () => {
    const hs = party(), foes = [foe('near', 'melee', 11, 5, { holder: 'tank' }), foe('far', 'caster', 30, 5)];
    const c = withFocus(ctxOf(hs, foes)); expect(scoreHeroTarget(c, hs[1], c.infos[1])).toBe(-Infinity); expect(target(c, hs[1])).toBe('near');
  });
  it('o melee não persegue um atirador longe demais da formação', () => {
    const hs = party([hero('mel', 'melee', 10, 6.5)]), foes = [foe('arch', 'archer', 22, 6)], c = withFocus(ctxOf(hs, foes));
    expect(scoreHeroTarget(c, hs[3], c.infos[0])).toBe(-Infinity);
  });
  it('overkill: com dano em voo que já cobre a vida, o ranged escolhe outro alvo (o melee não liga)', () => {
    const hs = party([hero('mel', 'melee', 10.5, 6)]), covered = foe('a', 'melee', 11, 5, { hp: 100, incoming: 120, holder: 'tank' }), other = foe('b', 'melee', 11.3, 5.5, { holder: 'tank' });
    const c = withFocus(ctxOf(hs, [covered, other])); expect(c.infos[0].covered).toBe(true);
    expect(target(c, hs[1])).toBe('b');
    expect(scoreHeroTarget(c, hs[3], c.infos[0])).toBeGreaterThan(scoreHeroTarget(c, hs[1], c.infos[0]));
  });
  it('incomingByFoe credita o projétil ao primeiro inimigo do caminho e ignora quem está fora da linha', () => {
    const shots = [{ x: 0, y: 0, vx: 1, vy: 0, left: 8, dmg: 100 }], foes = [{ uid: 'far', pt: { x: 6, y: 0 }, r: .36 }, { uid: 'near', pt: { x: 3, y: .1 }, r: .36 }, { uid: 'side', pt: { x: 3, y: 2 }, r: .36 }, { uid: 'behind', pt: { x: -3, y: 0 }, r: .36 }];
    const m = incomingByFoe(shots, foes); expect(m.get('near')).toBeGreaterThan(80); expect(m.get('far')).toBeUndefined(); expect(m.get('side')).toBeUndefined(); expect(m.get('behind')).toBeUndefined();
    expect(incomingByFoe([{ x: 0, y: 0, vx: 1, vy: 0, left: 1, dmg: 50 }], [{ uid: 'x', pt: { x: 6, y: 0 }, r: .36 }]).size).toBe(0);   // o projétil morre antes de chegar
  });
});

describe('alvo principal e peel', () => {
  it('o alvo principal do grupo é mantido durante a trava e só troca com margem', () => {
    const hs = party(), a = foe('a', 'melee', 11, 5, { holder: 'tank' }), b = foe('b', 'melee', 11.3, 5.6, { holder: 'tank' });
    const c = ctxOf(hs, [a, b]); c.focus.primaryId = 'a'; c.focus.primaryUntil = c.clock + 1;
    expect(choosePrimaryTarget(c).id).toBe('a');
    b.hpFrac = .1; const c2 = ctxOf(hs, [a, b], { focus: { primaryId: 'a', primaryUntil: 99, peelUntil: 0 } }); expect(choosePrimaryTarget(c2).id).toBe('a');   // ainda travado
    const c3 = ctxOf(hs, [a, b], { focus: { primaryId: 'a', primaryUntil: 5, peelUntil: 0 }, clock: 6 }); expect(choosePrimaryTarget(c3).id).toBe('b');   // lock acabou e o novo vale muito mais
  });
  it('o alvo principal tende a caster/quase morto e vai para o próximo se o atual morre', () => {
    const hs = party(), foes = [foe('skel', 'melee', 11, 5, { holder: 'tank' }), foe('mage', 'caster', 12, 3)];
    expect(choosePrimaryTarget(ctxOf(hs, foes)).id).toBe('mage');
    expect(choosePrimaryTarget(ctxOf(hs, [foes[0]], { focus: { primaryId: 'mage', primaryUntil: 99, peelUntil: 0 } })).id).toBe('skel');
  });
  it('peelTarget: invasor da backline sim; inimigo longe e inofensivo não', () => {
    const hs = party(), far = foe('far', 'runner', 30, 5), c = ctxOf(hs, [foe('held', 'melee', 11, 5, { holder: 'tank' }), far]);
    expect(choosePeelTarget(c).id).toBeUndefined();
    const inv = foe('inv', 'melee', 7.9, 4.8, { holder: 'bow' }), c2 = ctxOf(hs, [foe('held', 'melee', 11, 5, { holder: 'tank' }), inv]);
    expect(choosePeelTarget(c2).id).toBe('inv');
  });
  it('runner de pouca vida na backline é o peel de maior ameaça', () => {
    const hs = party(), a = foe('a', 'runner', 7.9, 4.8, { holder: 'bow' }), b = foe('b', 'runner', 7.8, 6.3, { holder: 'heal', hp: 60, hpFrac: .12 });
    expect(choosePeelTarget(ctxOf(hs, [a, b])).id).toBe('b');
  });
  it('quem pode ajudar no peel: tanque sempre, melee perto, ranged só com alcance; curandeiro nunca', () => {
    const mel = hero('mel', 'melee', 9, 5.5), hs = party([mel]), inv = foe('inv', 'runner', 7.9, 4.8, { holder: 'bow' }), c = ctxOf(hs, [inv]), info = c.infos[0];
    expect(info.invader).toBe(true); expect(canPeel(hs[0], info)).toBe(true); expect(canPeel(mel, info)).toBe(true); expect(canPeel(hs[2], info)).toBe(false);
    expect(canPeel(hero('far', 'melee', 20, 5), info)).toBe(false);
  });
  it('peel: o tanque e o melee trocam de alvo na hora (mesmo travados) e o resto do grupo não é obrigado', () => {
    const mel = hero('mel', 'melee', 9, 5.5), hs = party([mel]), keep = foe('keep', 'melee', 11, 5, { holder: 'tank' }), inv = foe('inv', 'runner', 7.9, 4.8, { holder: 'bow' });
    const c = withFocus(ctxOf(hs, [keep, inv])); expect(c.focus.peelId).toBe('inv');
    const ai: HeroAi = { ...newHeroAi(), targetId: 'keep', targetLockUntil: c.clock + 1 };
    for (const h of [hs[0], mel]) { const r = chooseHeroTarget(c, h, { ...ai }); expect(r.id, h.id).toBe('inv'); expect(r.emergency).toBe('peel'); }
    const r = chooseHeroTarget(c, hs[2], { ...ai }); expect(r.id).toBe('keep');   // o curandeiro não larga o que faz
  });
});

describe('memória curta: target lock', () => {
  const setup = () => {
    const hs = party(), a = foe('a', 'melee', 11, 5, { holder: 'tank' }), b = foe('b', 'caster', 11, 3.8);
    return { hs, a, b };
  };
  it('mantém o alvo durante o lock (~0,8–1,2 s) mesmo que outro pontue mais', () => {
    const { hs, a, b } = setup(), c = withFocus(ctxOf(hs, [a, b])), ai: HeroAi = { ...newHeroAi(), targetId: 'a', targetLockUntil: c.clock + .9 };
    expect(scoreHeroTarget(c, hs[1], c.infos[1])).toBeGreaterThan(scoreHeroTarget(c, hs[1], c.infos[0]) + C.switchMargin);
    expect(chooseHeroTarget(c, hs[1], ai)).toMatchObject({ id: 'a', switched: false });
    expect(chooseHeroTarget({ ...c, clock: c.clock + 1 }, hs[1], ai)).toMatchObject({ id: 'b', switched: true });   // vencido o lock, troca
    for (const id of ['x', 'y', 'z', 'w']) for (const f of ['a', 'b']) { const l = lockFor(id, f); expect(l).toBeGreaterThanOrEqual(C.lockMin); expect(l).toBeLessThanOrEqual(C.lockMax); }
  });
  it('depois do lock só troca se o novo valer a margem (sem jitter por diferença pequena)', () => {
    const hs = party(), a = foe('a', 'melee', 11, 5, { holder: 'tank' }), b = foe('b', 'melee', 11.05, 5, { holder: 'tank' }), c = ctxOf(hs, [a, b], { clock: 50 });
    const ai: HeroAi = { ...newHeroAi(), targetId: 'b', targetLockUntil: 0 }; expect(chooseHeroTarget(c, hs[1], ai)).toMatchObject({ id: 'b', switched: false });
  });
  it('emergência quebra o lock: alvo morreu ou ficou inalcançável', () => {
    const { hs, a, b } = setup(), ai: HeroAi = { ...newHeroAi(), targetId: 'a', targetLockUntil: 999 };
    const dead = withFocus(ctxOf(hs, [b])); expect(chooseHeroTarget(dead, hs[1], ai)).toMatchObject({ id: 'b', switched: true, emergency: 'dead' });
    const gone = withFocus(ctxOf(hs, [foe('a', 'melee', 40, 5), b])); expect(chooseHeroTarget(gone, hs[1], ai)).toMatchObject({ id: 'b', emergency: 'unreachable' });
    expect(a.uid).toBe('a');
  });
  it('sem inimigos o alvo é limpo', () => {
    const hs = party(); expect(chooseHeroTarget(ctxOf(hs, []), hs[1], { ...newHeroAi(), targetId: 'a', targetLockUntil: 9 })).toMatchObject({ id: undefined, switched: true });
  });
});

describe('posição por papel e histerese', () => {
  it('ranged: não se reposiciona entre 3,5 e 4,8 do alvo; aproxima só se passar; recua só se chegar perto demais', () => {
    const t = foe('t', 'melee', 0, 0, { holder: 'tank' });
    for (const d of [3.5, 4, 4.5, 4.8]) { const h = hero('bow', 'ranged', d, 0), c = ctxOf([h, hero('tank', 'tank', 6, 0)], [t]); const w = desiredHeroPosition(c, h, newHeroAi(), c.infos[0]); expect(w.pt, `d=${d}`).toEqual(h.pt); expect(w.state).toBe('attack'); }
    const far = hero('bow', 'ranged', 5.4, 0), c1 = ctxOf([far], [t]), w1 = desiredHeroPosition(c1, far, newHeroAi(), c1.infos[0]); expect(w1.state).toBe('engage'); expect(w1.pt.x).toBeLessThan(5.4); expect(w1.pt.x).toBeGreaterThan(3);
    const close = hero('bow', 'ranged', 1.5, 0), c2 = ctxOf([close], [t]), w2 = desiredHeroPosition(c2, close, newHeroAi(), c2.infos[0]); expect(w2.state).toBe('reposition'); expect(w2.pt.x).toBeGreaterThan(close.pt.x + 1);
    const mid = hero('bow', 'ranged', 2.6, 0), c3 = ctxOf([mid], [t]); expect(desiredHeroPosition(c3, mid, newHeroAi(), c3.infos[0]).pt).toEqual(mid.pt);   // zona de conforto inferior: não mexe
  });
  it('ranged: sem oscilar — andando atrás do destino guardado, as viradas de direção ficam em ~zero', () => {
    const t = foe('t', 'melee', 0, 0, { holder: 'tank' }); let h = hero('bow', 'ranged', 8.5, .4), turns = 0, last = 0; const ai = newHeroAi();
    for (let i = 0; i < 300; i++) {
      const now = i * .1, c = ctxOf([h, hero('tank', 'tank', 6, 0)], [t], { clock: now }), want = desiredHeroPosition(c, h, ai, c.infos[0]), dest = commitDest(ai, want.pt, now);
      const d = dist(h.pt, dest); if (d > .08) { const step = Math.min(d, .5), nx = h.pt.x + (dest.x - h.pt.x) / d * step; const dir = Math.sign(nx - h.pt.x); if (dir && last && dir !== last) turns++; if (dir) last = dir; h = { ...h, pt: { x: nx, y: h.pt.y + (dest.y - h.pt.y) / d * step } }; }
    }
    expect(turns).toBeLessThanOrEqual(1); expect(dist(h.pt, t.pt)).toBeGreaterThan(3.4); expect(dist(h.pt, t.pt)).toBeLessThan(4.9);
  });
  it('ranged: com a linha de tiro bloqueada dá um passo para o lado', () => {
    const h = hero('bow', 'ranged', 4, 0), t = foe('t', 'melee', 0, 0), c = { ...ctxOf([h], [t]), lineClear: (a: Pt, b: Pt) => !(Math.abs(a.y) < 1 && Math.abs(b.y) < 1 && a.x > 1 && b.x < 1) };
    const w = rangedPosition(c, h, c.infos[0]); expect(w.state).toBe('reposition'); expect(Math.abs(w.pt.y)).toBeGreaterThan(1);
  });
  it('curandeiro: a posição vem dos aliados (tanque, centro, mais ferido), não do inimigo', () => {
    const heal = hero('heal', 'healer', 5, 5), tank = hero('tank', 'tank', 10, 5), bow = hero('bow', 'ranged', 8, 4);
    const base = healerPosition(ctxOf([heal, tank, bow], [foe('f', 'melee', 14, 5)], { tank }), heal);
    const moved = healerPosition(ctxOf([heal, tank, bow], [foe('f', 'melee', 14, 9)], { tank }), heal);   // outro inimigo, mesma distância de ameaça: mesma referência
    expect(moved.pt.x).toBeCloseTo(base.pt.x, 3);
    const shifted = healerPosition(ctxOf([heal, { ...tank, pt: { x: 16, y: 5 } }, { ...bow, pt: { x: 14, y: 4 } }], [foe('f', 'melee', 24, 5)], { tank: { ...tank, pt: { x: 16, y: 5 } } }), heal);
    expect(shifted.pt.x).toBeGreaterThan(base.pt.x + 3);   // os aliados andaram: ela acompanha
    const hurt = { ...bow, hpFrac: .2 }, toward = healerPosition(ctxOf([heal, tank, hurt], [], { tank }), heal);
    expect(toward.pt.y).toBeLessThan(5);                      // vai para o lado do aliado mais ferido (y = 4)
  });
  it('curandeiro: fica fora do alcance das ameaças e dentro do alcance de cura; parado quando confortável', () => {
    const heal = hero('heal', 'healer', 8, 5), tank = hero('tank', 'tank', 11, 5), ctxA = ctxOf([heal, tank], [foe('f', 'melee', 9.5, 5)], { tank });
    const w = healerPosition(ctxA, heal); expect(w.state).toBe('retreat'); expect(dist(w.pt, { x: 9.5, y: 5 })).toBeGreaterThanOrEqual(C.healSafe - .01);
    const calm = hero('heal', 'healer', 8.4, 5), cc = ctxOf([calm, tank], [foe('f', 'melee', 14, 5)], { tank }); const w2 = healerPosition(cc, calm);
    expect(dist(w2.pt, calm.pt)).toBeLessThan(2);
  });
  it('retirada tem histerese: entra abaixo do limiar e só sai acima do limiar + folga', () => {
    const r = hero('bow', 'ranged', 7, 4, { hpFrac: .35 }); expect(shouldRetreat(r, 'attack')).toBe(true);
    expect(shouldRetreat({ ...r, hpFrac: .45 }, 'attack')).toBe(false); expect(shouldRetreat({ ...r, hpFrac: .45 }, 'retreat')).toBe(true); expect(shouldRetreat({ ...r, hpFrac: .55 }, 'retreat')).toBe(false);
    expect(shouldRetreat(hero('t', 'tank', 1, 1, { hpFrac: .05 }), 'attack')).toBe(false);   // o tanque (retreatAt 0) nunca foge
  });
  it('destino guardado: mudança pequena não troca o destino, mudança grande (ou vencimento) troca', () => {
    const ai = newHeroAi(), a = commitDest(ai, { x: 5, y: 5 }, 0); expect(a).toEqual({ x: 5, y: 5 });
    expect(commitDest(ai, { x: 5.3, y: 5 }, .1)).toEqual({ x: 5, y: 5 }); expect(commitDest(ai, { x: 7, y: 5 }, .1)).toEqual({ x: 7, y: 5 });
    expect(commitDest(ai, { x: 7.3, y: 5 }, C.destHold + .2)).toEqual({ x: 7.3, y: 5 });
  });
});

describe('golpes avisados: tanque pesa o risco; reação com atraso', () => {
  const zone = (dmg: number, o: Partial<StrikeZone> = {}): StrikeZone => ({ x: 5, y: 5, r: 1.4, dmg, boss: false, age: 1, ...o });
  const tank = { pt: { x: 5, y: 5 }, hp: 1000, maxHp: 1000 };
  it('segura a posição com golpe leve e vida confortável; sai se for letal, vida baixa, vários ou AoE forte de chefe', () => {
    expect(tankShouldLeave(tank, [zone(150)])).toBe(false);
    expect(tankShouldLeave(tank, [zone(550)])).toBe(true);
    expect(tankShouldLeave({ ...tank, hp: 300 }, [zone(90)])).toBe(true);
    expect(tankShouldLeave(tank, [zone(200), zone(200)])).toBe(true);
    expect(tankShouldLeave(tank, [zone(320, { boss: true })])).toBe(true); expect(tankShouldLeave(tank, [zone(320)])).toBe(false);
    expect(tankShouldLeave(tank, [zone(900, { x: 20 })])).toBe(false);   // golpe longe não importa
    expect(windupDanger(tank, [zone(250), zone(250)])).toMatchObject({ count: 2, ratio: .5 });
  });
  it('quem não é tanque sai de qualquer golpe; o tanque, só pelo risco', () => {
    const z = [zone(100)], ranged = { role: 'ranged' as Role, ...tank }, t = { role: 'tank' as Role, ...tank };
    expect(shouldEvade(ranged, z)).toBe(true); expect(shouldEvade(t, z)).toBe(false); expect(shouldEvade(t, [zone(700)])).toBe(true);
    expect(shouldEvade(ranged, [zone(100, { x: 30 })])).toBe(false);
  });
  it('cada herói percebe o golpe com um atraso próprio (estável, dentro da faixa) e não prevê o que ainda não foi avisado', () => {
    const ids = ['aldric', 'kael', 'lyra', 'x1', 'x2', 'x3'], delays = ids.map(reactDelay);
    for (const d of delays) { expect(d).toBeGreaterThanOrEqual(C.reactMin); expect(d).toBeLessThanOrEqual(C.reactMax); }
    expect(new Set(delays.map(d => d.toFixed(3))).size).toBeGreaterThan(3); expect(reactDelay('kael')).toBe(reactDelay('kael'));
    expect(noticedZones('kael', [zone(10, { age: 0 })])).toHaveLength(0); expect(noticedZones('kael', [zone(10, { age: C.reactMax + .01 })])).toHaveLength(1);
  });
});
