import { describe, expect, it } from 'vitest';
import { createCharacter } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { monsterHit } from './combat';
import { gainExperience, trainByTime, trainProficiency, xpForLevel } from './progression';
import { triesForNextLevel } from '../rpg/curves';
describe('progressão',()=>{
  it('preserva XP excedente em múltiplos níveis de personagem',()=>{
    const character=createCharacter('squire');
    const amount=xpForLevel(1)+xpForLevel(2)+37;
    gainExperience(character,amount);
    expect(character.profile.level).toBe(3);expect(character.profile.xp).toBe(37);expect(character.talentPoints).toBe(2);
  });
  it('preserva tries excedentes em múltiplos níveis de proficiência',()=>{
    const character=createCharacter('squire');
    const amount=triesForNextLevel('melee',10)+triesForNextLevel('melee',11)+19;
    expect(trainProficiency(character,'melee',amount)).toBe(2);
    expect(character.profile.proficiencies.melee.level).toBe(12);expect(character.profile.proficiencies.melee.tries).toBe(19);
  });
  it('treino por tempo rende 1 try a cada 2 s na proficiência em foco',()=>{
    const character=createCharacter('squire');character.profile.trainingFocus='ice';
    for(let i=0;i<10;i++)trainByTime(character,.1);
    expect(character.profile.proficiencies.ice.tries).toBe(0);
    for(let i=0;i<10;i++)trainByTime(character,.1);
    expect(character.profile.proficiencies.ice.tries).toBe(1);
    character.profile.trainingFocus=undefined;trainByTime(character,10);expect(character.profile.proficiencies.ice.tries).toBe(1);
  });
  it('treina Defesa somente quando um ataque tem defesa efetiva',()=>{
    const state=partyState();const squire=state.characters[0];
    const before=squire.profile.proficiencies.defense.tries;
    monsterHit({uid:'test',defId:'skeleton',hp:100,maxHp:100,cooldown:0,alive:true},squire,state);
    expect(squire.profile.proficiencies.defense.tries).toBeGreaterThan(before);
  });
});
