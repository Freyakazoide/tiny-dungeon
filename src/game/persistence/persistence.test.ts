import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine, initialState } from '../core/GameEngine';
import { partyState } from '../core/testing';
import { exportBackup, importBackup } from './backup';
import { loadMigratedState, TinyDungeonDatabase } from './repository';
import { cloneValidatedState } from './validation';

const databases:TinyDungeonDatabase[]=[];
afterEach(async()=>{for(const database of databases.splice(0))await database.delete();});

describe('persistência',()=>{
  it('salva e restaura o snapshot completo sem compartilhar referências',async()=>{
    const database=new TinyDungeonDatabase(`tiny-dungeon-test-${crypto.randomUUID()}`);databases.push(database);
    const state=partyState();state.gold=417;state.wave=1;state.cycle=9;state.characters[0].profile.xp=73;state.inventory.loot.push({itemId:'bone',quantity:12});
    await database.saves.put({id:'main',version:1,state:cloneValidatedState(state),updatedAt:Date.now()});
    const record=await database.saves.get('main');const restored=cloneValidatedState(record?.state);
    expect(restored.gold).toBe(417);expect(restored.wave).toBe(1);expect(restored.cycle).toBe(9);expect(restored.characters[0].profile.xp).toBe(73);expect(restored.inventory.loot[0].quantity).toBe(12);
    restored.gold=0;expect(state.gold).toBe(417);
  });

  it('exporta e importa backup versionado preservando combate e configurações',()=>{
    const state=partyState();state.status='paused';state.autoAdvance=false;state.monsters=[{uid:'saved-monster',defId:'ghoul',hp:71,maxHp:180,cooldown:.42,alive:true}];state.characters[0].cooldowns.basic=.37;
    const restored=importBackup(exportBackup(state));
    expect(restored.status).toBe('paused');expect(restored.autoAdvance).toBe(false);expect(restored.monsters).toEqual(state.monsters);expect(restored.characters[0].cooldowns.basic).toBe(.37);
  });

  it('migra Analyzer antigo adicionando o controle de supplies consumidos',()=>{
    const legacy=partyState() as unknown as {analyzer:Record<string,unknown>;history:Array<Record<string,unknown>>};delete legacy.analyzer.suppliesUsed;legacy.history=[structuredClone(legacy.analyzer)];
    const restored=cloneValidatedState(legacy);expect(restored.analyzer.suppliesUsed).toEqual({});expect(restored.history[0].suppliesUsed).toEqual({});
  });

  it('preserva pontos disponíveis e ranks de talentos de saves anteriores',()=>{
    const state=partyState();const knight=state.characters.find(character=>character.classId==='squire')!;
    knight.talentPoints=4;knight.talents={squire_talent_0:2,squire_talent_5:1};
    const restored=importBackup(exportBackup(state));const saved=restored.characters.find(character=>character.classId==='squire')!;
    expect(saved.talentPoints).toBe(4);expect(saved.talents).toEqual({squire_talent_0:2,squire_talent_5:1});
  });

  it('retoma uma transição salva sem duplicar XP, ouro ou monstros',()=>{
    const state=partyState();state.status='transition';state.transitionMs=300;state.wave=0;state.analyzer.xp=100;state.analyzer.gold=9;state.gold=9;state.monsters=[{uid:'dead-skeleton',defId:'skeleton',hp:0,maxHp:100,cooldown:.5,alive:false}];
    const engine=new GameEngine(importBackup(exportBackup(state)));for(let i=0;i<4;i++)engine.tick(100);const restored=engine.getSnapshot();
    expect(restored.status).toBe('running');expect(restored.wave).toBe(1);expect(restored.analyzer.xp).toBe(100);expect(restored.gold).toBe(9);expect(restored.monsters).toHaveLength(4);
  });

  it('preserva o perfil RPG: proficiências, contadores, classe e alvo offline',async()=>{
    const state=partyState();const c=state.characters[0];
    c.profile.level=12;c.profile.xp=345;c.profile.proficiencies.melee={level:16,tries:77};c.profile.counters={crits:9,goldEarned:120};c.profile.offlineTarget='fire';c.profile.trainingFocus='melee';c.profile.trainingAcc=.5;
    c.profile.classId='guerreiro';c.profile.classPath=['aprendiz','guerreiro'];c.equipment.weapon='rusty_sword';c.cooldowns.basic=.2;state.offlineReport={seconds:100,entries:[{name:c.name,target:'fire',seconds:100,tries:50,levelsGained:0}]};
    const restored=importBackup(exportBackup(state)).characters[0];
    expect(restored.profile).toEqual(c.profile);expect(restored.equipment.weapon).toBe('rusty_sword');
    const database=new TinyDungeonDatabase(`tiny-dungeon-test-${crypto.randomUUID()}`);databases.push(database);await database.saves.put({id:'main',version:1,state,updatedAt:1});
    const loaded=await loadMigratedState(database);expect(loaded?.characters[0].profile.classId).toBe('guerreiro');expect(loaded?.offlineReport?.entries).toHaveLength(1);
  });

  it('aceita o estado inicial sem personagens e rejeita saves antigos sem perfil RPG',()=>{
    expect(importBackup(exportBackup(initialState())).characters).toHaveLength(0);
    const legacy=structuredClone(partyState()) as unknown as {characters:Array<Record<string,unknown>>};delete legacy.characters[0].profile;Object.assign(legacy.characters[0],{level:3,xp:5,skills:{}});
    expect(()=>cloneValidatedState(legacy)).toThrow(/corrompido/);
    const badClass=partyState();badClass.characters[0].profile.classId='nao_existe';expect(()=>cloneValidatedState(badClass)).toThrow(/corrompido/);
    const badSkill=partyState();(badSkill.characters[0].profile.proficiencies as Record<string,unknown>).melee={level:'x',tries:0};expect(()=>cloneValidatedState(badSkill)).toThrow(/corrompido/);
  });

  it('rejeita JSON, versão, referências e itens inválidos',()=>{
    expect(()=>importBackup('{')).toThrow(/JSON válido/);
    expect(()=>importBackup(JSON.stringify({format:'tiny-dungeon-save',version:2,state:partyState()}))).toThrow(/incompatível/);
    const invalid=partyState();invalid.team=['personagem-inexistente'];expect(()=>importBackup(JSON.stringify({format:'tiny-dungeon-save',version:1,state:invalid}))).toThrow(/corrompido/);
    const badItem=partyState();badItem.inventory.bp=[{itemId:'item-inexistente',quantity:1}];expect(()=>cloneValidatedState(badItem)).toThrow(/corrompido/);
  });
});
