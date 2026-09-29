import { describe, expect, it } from 'vitest';
import { createCharacter, GameEngine } from '../core/GameEngine';
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
    const e=new GameEngine(partyState());const mage=e.getSnapshot().characters[0];
    e.evolve(mage.id,'mago',{force:true});
    mage.talents.mage_talent_3=2;
    expect(talentBonus(mage,'magicDamage')).toBeCloseTo(.16);
    expect(talentBonus(mage,'healing')).toBe(0);
  });
  it('talentos valem por histórico: o que o Squire investiu continua valendo depois de evoluir',()=>{
    const e=new GameEngine(partyState());const c=e.getSnapshot().characters[0];
    c.profile.level=10;c.talentPoints=3;investTalent(c,'squire_talent_0');investTalent(c,'squire_talent_0');
    const before=characterStats(c,e.getSnapshot()).maxHp/(1+.14);
    e.evolve(c.id,'guerreiro',{force:true});
    expect(c.classId).toBe('knight');expect(c.talents.squire_talent_0).toBe(2);expect(talentBonus(c,'maxHp')).toBeCloseTo(.14);
    expect(spentTalentPoints(c)).toBe(2);expect(before).toBeGreaterThan(0);
    expect(talentAvailability(c,talentById('knight_talent_0')!).reason).not.toMatch(/outra classe/);
    expect(talentAvailability(c,talentById('mage_talent_0')!).available).toBe(false);
    expect(talentAvailability(c,talentById('mage_talent_0')!).reason).toMatch(/outra classe/);
  });
});
