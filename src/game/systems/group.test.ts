import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { GameEngine, ROSTER_LIMIT } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { cloneValidatedState } from '../persistence/validation';
import { aggroShares } from './combat';
import { characterStats } from './progression';
import { elementCoverage, groupAlerts, groupPower, rolesOf, suggestFormation } from './group';

const make = () => { const e = new GameEngine(partyState()); const s = () => e.getSnapshot(); return { e, s, ids: s().characters.map(c => c.id) }; };
const kinds = (e: GameEngine) => groupAlerts(e.getSnapshot()).map(a => a.kind);

describe('Fase 12 B — papéis, poder e alertas', () => {
  it('rolesOf', () => {
    const { s } = make(); const [aldric, kael, lyra] = s().characters;
    expect(rolesOf(aldric, s()).slice(0, 2)).toEqual(['Tanque', 'Corpo a corpo']);
    expect(rolesOf(kael, s())[0]).toBe('Dano à distância');
    lyra.spellSlots = ['mage_nova', 'druid_mend']; const r = rolesOf(lyra, s());
    expect(r).toContain('Mago'); expect(r).toContain('Dano em área'); expect(r).toContain('Suporte'); expect(r.length).toBeLessThanOrEqual(3);
  });

  it('groupPower bate com characterStats, aplica ×0,5 ao melee atrás e usa aggroShares', () => {
    const { s } = make(); const st = s(); const team = st.team.map(id => st.characters.find(c => c.id === id)!);
    const p = groupPower(st);
    expect(p.totalHp).toBe(team.reduce((n, c) => n + characterStats(c, st).maxHp, 0));
    const expectedDps = Math.round(team.reduce((n, c) => { const x = characterStats(c, st); return n + x.attack * x.attackSpeed * (c.row === 'back' && c.id === team[2].id ? .5 : 1); }, 0));
    expect(p.dps).toBe(expectedDps);
    expect(p.tankShare).toBe(Math.round(aggroShares(team).get(team[0].id)! * 100));
  });

  it('alertas: ordem, condições e correções', () => {
    const { e, s } = make();
    const a = groupAlerts(s()); expect(a.map(x => x.kind)).toContain('meleeBack');
    const order = { bad: 0, warn: 1, info: 2, ok: 3 }; for (let i = 1; i < a.length; i++) expect(order[a[i].level]).toBeGreaterThanOrEqual(order[a[i - 1].level]);
    expect(kinds(e)).not.toContain('allOk');
    // sem tanque
    e.setTank(s().characters[0].id, false); const noTank = groupAlerts(s()).find(x => x.kind === 'noTank')!;
    expect(noTank.level).toBe('bad'); expect(noTank.fix!.action).toEqual({ type: 'setTank', id: s().characters[0].id });
    // frente vazia
    e.setRow(s().characters[0].id, 'back'); expect(kinds(e)).toContain('emptyFront');
    // reserva e vaga livre
    e.toggleTeam(s().characters[2].id); e.setRow(s().characters[0].id, 'front'); e.setTank(s().characters[0].id, true);
    expect(kinds(e)).toContain('freeSlot'); expect(kinds(e)).not.toContain('meleeBack');
    // caído
    s().characters[1].hp = 0; expect(kinds(e)).toContain('fallen');
  });

  it('formação sem problemas: allOk e sugestão nula; com problema, plano mínimo e aplicável', () => {
    const { e, s } = make(); const lyra = s().characters[2];
    e.toggleTeam(lyra.id); s().inventory.supply = [{ itemId: 'health_potion', quantity: 60 }];
    expect(kinds(e)).toContain('allOk'); expect(suggestFormation(s())).toBeNull();
    e.toggleTeam(lyra.id);
    const plan = suggestFormation(s())!; expect(plan.moves).toEqual([{ id: lyra.id, row: 'front' }]);
    expect(e.applyFormation(plan)).toBe(true);
    expect(kinds(e)).not.toContain('meleeBack'); expect(s().characters.filter(c => c.isTank)).toHaveLength(1);
  });

  it('elementCoverage: Floresta Sombria com Faísca Ígnea cobre fogo', () => {
    const { s } = make(); const lyra = s().characters[2]; lyra.spellSlots = ['basic_fire'];
    const cov = elementCoverage(s(), 'floresta_sombria'); const fire = cov.find(c => c.element === 'fire'), psy = cov.find(c => c.element === 'psychic');
    expect(fire?.coveredBy).toContain(lyra.name); expect(psy?.coveredBy ?? []).toEqual([]);
    expect(elementCoverage(s(), 'nao_existe')).toEqual([]);
  });
});

describe('Fase 12 B — engine', () => {
  it('swapTeamMember', () => {
    const { e, s, ids } = make(); e.recruit('Zed'); const zed = s().characters[3];
    expect(e.swapTeamMember(ids[0], zed.id)).toBe(true);
    expect(s().team).toEqual([zed.id, ids[1], ids[2]]); expect(zed.row).toBe('front'); expect(zed.isTank).toBe(true); expect(s().characters[0].isTank).toBe(false);
    expect(e.swapTeamMember(ids[1], ids[1])).toBe(false); expect(e.swapTeamMember(ids[1], ids[2])).toBe(false); expect(e.swapTeamMember(ids[1], 'x')).toBe(false);
  });

  it('dismiss: devolve equipamento, recusa sem espaço, último, equipe com caçada rodando; limpa presets e passa o tanque', () => {
    const { e, s, ids } = make(); e.recruit('Zed'); const zed = s().characters[3];
    zed.gear.weapon = { uid: 'g9', baseId: 'guerreiro.espada_longa', classification: 'common', attrs: [] };
    e.saveFormationPreset(0, 'Padrão'); e.toggleTeam(ids[2]); e.swapTeamMember(ids[1], zed.id); e.swapTeamMember(zed.id, ids[1]);
    s().team = [ids[0], ids[1]];
    const bagBefore = s().inventory.bp.length;
    s().gearBag = Array.from({ length: 80 }, (_, i) => ({ uid: `f${i}`, baseId: `filler.${i}`, classification: 'common' as const, attrs: [] }));
    const snap = () => JSON.stringify({ ...s(), message: '' }); const before = snap(); expect(e.dismiss(zed.id)).toBe(false); expect(snap()).toBe(before);
    s().gearBag = [];
    expect(e.dismiss(zed.id)).toBe(true);
    expect(s().characters.some(c => c.id === zed.id)).toBe(false); expect(s().gearBag.map(g => g.uid)).toEqual(['g9']); expect(s().inventory.bp.length).toBeGreaterThanOrEqual(bagBefore);
    expect(s().formationPresets![0]!.team).not.toContain(zed.id);
    // tanque dispensado → novo tanque na frente
    s().characters[0].row = 'front'; s().characters[1].row = 'front'; s().team = [ids[0], ids[1]];
    expect(e.dismiss(ids[0])).toBe(true); expect(s().characters.find(c => c.id === ids[1])!.isTank).toBe(true);
    // caçada rodando
    e.start(); expect(e.dismiss(ids[1])).toBe(false);
    const one = new GameEngine(partyState()); const only = one.getSnapshot(); only.characters = [only.characters[0]]; only.team = [only.characters[0].id];
    expect(one.dismiss(only.characters[0].id)).toBe(false);
  });

  it('recruit com especificação', () => {
    const { e, s } = make();
    expect(e.recruit({ name: 'Arqueira', weaponId: 'oak_bow', element: 'ice' })).toBe(true);
    const c = s().characters[3]; expect(c.equipment.weapon).toBe('oak_bow'); expect(c.row).toBe('back'); expect(c.profile.offlineTargets).toEqual(['ice', null]); expect(s().team).not.toContain(c.id);
    expect(e.recruit({ name: 'arqueira', weaponId: 'oak_bow', element: 'ice' })).toBe(false);
    expect(e.recruit({ name: 'X', weaponId: 'faca', element: 'ice' })).toBe(false);
    expect(e.recruit({ name: 'Y', weaponId: 'oak_bow', element: 'melee' as never })).toBe(false);
    e.recruit('Quinto'); expect(s().characters.length).toBe(ROSTER_LIMIT); expect(e.recruit({ name: 'Sexto', weaponId: 'oak_bow', element: 'ice' })).toBe(false);
  });

  it('presets: salvar, aplicar (ignora ids removidos), limpar e validação do save', () => {
    const { e, s, ids } = make();
    expect(e.saveFormationPreset(0, 'Chefe')).toBe(true); expect(e.saveFormationPreset(3, 'x')).toBe(false); expect(e.saveFormationPreset(1, '   ')).toBe(false);
    e.setRow(ids[0], 'back'); e.setTank(ids[0], false); expect(e.applyFormationPreset(0)).toBe(true);
    expect(s().characters[0].row).toBe('front'); expect(s().characters[0].isTank).toBe(true);
    expect(e.applyFormationPreset(2)).toBe(false);
    s().formationPresets![0]!.team = ['fantasma']; expect(e.applyFormationPreset(0)).toBe(false);
    e.saveFormationPreset(1, 'B'); expect(e.clearFormationPreset(1)).toBe(true); expect(s().formationPresets![1]).toBeNull();
    const ok = JSON.parse(JSON.stringify(s())); expect(() => cloneValidatedState(ok)).not.toThrow();
    const bad = JSON.parse(JSON.stringify(s())); bad.formationPresets = [{ name: 'x'.repeat(30), team: [], rows: {} }]; expect(() => cloneValidatedState(bad)).toThrow();
    const none = JSON.parse(JSON.stringify(s())); delete none.formationPresets; expect(() => cloneValidatedState(none)).not.toThrow();
  });
});
