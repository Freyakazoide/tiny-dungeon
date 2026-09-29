import { describe, expect, it } from 'vitest';
import { createCharacter } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { talentById } from '../data/talents';
import { characterStats, investTalent, spentTalentPoints, talentAvailability, talentBonus } from './progression';

describe('talentos',()=>{
  it('exige nível e pré-requisitos sem obrigar o caminho paralelo',()=>{
    const knight=createCharacter('squire');
    expect(talentAvailability(knight,talentById('squire_talent_0')!).reason).toBe('Requer nível 2.');
    knight.profile.level=10;knight.talentPoints=8;
    const blade=talentById('squire_talent_2')!;
    expect(talentAvailability(knight,blade).reason).toMatch(/Resistência/);
    expect(investTalent(knight,'squire_talent_1')).toBe(true);
    expect(talentAvailability(knight,blade).available).toBe(false);
    expect(investTalent(knight,'squire_talent_0')).toBe(true);
    expect(talentAvailability(knight,blade).available).toBe(true);
  });

  it('respeita o limite de níveis e consome um ponto por investimento',()=>{
    const monk=createCharacter('squire');
    monk.profile.level=10;monk.talentPoints=4;
    expect(investTalent(monk,'squire_talent_0')).toBe(true);
    expect(investTalent(monk,'squire_talent_0')).toBe(true);
    expect(investTalent(monk,'squire_talent_0')).toBe(true);
    expect(investTalent(monk,'squire_talent_0')).toBe(false);
    expect(monk.talents.squire_talent_0).toBe(3);
    expect(monk.talentPoints).toBe(1);
    expect(spentTalentPoints(monk)).toBe(3);
  });

  it('aplica bônus derivados uma única vez ao recalcular atributos',()=>{
    const state=partyState();
    const knight=state.characters.find(character=>character.classId==='squire')!;
    knight.profile.level=10;knight.talentPoints=3;
    const before=characterStats(knight,state);
    investTalent(knight,'squire_talent_0');
    investTalent(knight,'squire_talent_0');
    const first=characterStats(knight,state),second=characterStats(knight,state);
    expect(first.maxHp).toBe(Math.round(before.maxHp*1.14));
    expect(second).toEqual(first);
    expect(knight.hp).toBeLessThanOrEqual(first.maxHp);
  });

  it('expõe efeitos de combate especializados sem gravá-los nos atributos-base',()=>{
    const druid=createCharacter('druid');
    druid.talents.druid_talent_2=2;
    expect(talentBonus(druid,'healing')).toBeCloseTo(.2);
    expect(talentBonus(druid,'magicDamage')).toBe(0);
  });
});
