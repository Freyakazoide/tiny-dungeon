import { describe, expect, it } from 'vitest';
import { createCharacter, initialState } from '../core/GameEngine';
import { monsterHit } from './combat';
import { gainExperience, gainSkill, xpForLevel, xpForSkillLevel } from './progression';

describe('progressão',()=>{
  it('preserva XP excedente em múltiplos níveis de personagem',()=>{
    const character=createCharacter('knight');
    const amount=xpForLevel(1)+xpForLevel(2)+37;
    gainExperience(character,amount);
    expect(character.level).toBe(3);expect(character.xp).toBe(37);expect(character.talentPoints).toBe(2);
  });

  it('preserva XP excedente em múltiplos níveis de skill',()=>{
    const character=createCharacter('monk');
    const amount=xpForSkillLevel(10)+xpForSkillLevel(11)+19;
    gainSkill(character,'fist',amount);
    expect(character.skills.fist.level).toBe(12);expect(character.skills.fist.xp).toBe(19);
  });

  it('evolui Shielding somente quando um ataque tem defesa efetiva',()=>{
    const state=initialState();const knight=state.characters.find(character=>character.classId==='knight')!;
    const before=knight.skills.shielding.xp;
    monsterHit({uid:'test',defId:'skeleton',hp:100,maxHp:100,cooldown:0,alive:true},knight,state);
    expect(knight.skills.shielding.xp).toBeGreaterThan(before);
  });
});
