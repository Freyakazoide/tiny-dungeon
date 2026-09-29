import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine, initialState } from '../core/GameEngine';
import { exportBackup, importBackup } from './backup';
import { loadMigratedState, TinyDungeonDatabase } from './repository';
import { cloneValidatedState } from './validation';

const databases:TinyDungeonDatabase[]=[];
afterEach(async()=>{for(const database of databases.splice(0))await database.delete();});

describe('persistência',()=>{
  it('salva e restaura o snapshot completo sem compartilhar referências',async()=>{
    const database=new TinyDungeonDatabase(`tiny-dungeon-test-${crypto.randomUUID()}`);databases.push(database);
    const state=initialState();state.gold=417;state.wave=1;state.cycle=9;state.characters[0].xp=73;state.inventory.loot.push({itemId:'bone',quantity:12});
    await database.saves.put({id:'main',version:1,state:cloneValidatedState(state),updatedAt:Date.now()});
    const record=await database.saves.get('main');const restored=cloneValidatedState(record?.state);
    expect(restored.gold).toBe(417);expect(restored.wave).toBe(1);expect(restored.cycle).toBe(9);expect(restored.characters[0].xp).toBe(73);expect(restored.inventory.loot[0].quantity).toBe(12);
    restored.gold=0;expect(state.gold).toBe(417);
  });

  it('exporta e importa backup versionado preservando combate e configurações',()=>{
    const state=initialState();state.status='paused';state.autoAdvance=false;state.monsters=[{uid:'saved-monster',defId:'ghoul',hp:71,maxHp:180,cooldown:.42,alive:true}];state.characters[0].cooldowns.basic=.37;
    const restored=importBackup(exportBackup(state));
    expect(restored.status).toBe('paused');expect(restored.autoAdvance).toBe(false);expect(restored.monsters).toEqual(state.monsters);expect(restored.characters[0].cooldowns.basic).toBe(.37);
  });

  it('retoma uma transição salva sem duplicar XP, ouro ou monstros',()=>{
    const state=initialState();state.status='transition';state.transitionMs=300;state.wave=0;state.analyzer.xp=100;state.analyzer.gold=9;state.gold=9;state.monsters=[{uid:'dead-skeleton',defId:'skeleton',hp:0,maxHp:100,cooldown:.5,alive:false}];
    const engine=new GameEngine(importBackup(exportBackup(state)));for(let i=0;i<4;i++)engine.tick(100);const restored=engine.getSnapshot();
    expect(restored.status).toBe('running');expect(restored.wave).toBe(1);expect(restored.analyzer.xp).toBe(100);expect(restored.gold).toBe(9);expect(restored.monsters).toHaveLength(2);
  });

  it('migra Sorcerer de IndexedDB e backup sem perder progressão ou configurações',async()=>{
    const state=initialState();const character=state.characters.find(c=>c.classId==='necromancer')!;
    character.level=12;character.xp=345;character.equipment.weapon='arcane_staff';character.spellSlots=['necro_meteor','necro_bolt'];character.spellConditions.necro_meteor={minEnemies:2,manaAbove:33};character.cooldowns.necro_meteor=4.2;character.talents.necromancer_talent_5=1;
    const legacy=structuredClone(state) as unknown as {characters:Array<Record<string,unknown>>};const old=legacy.characters.find(c=>c.classId==='necromancer')!;old.classId='sorcerer';old.spellSlots=['sorc_meteor','sorc_bolt'];old.spellConditions={sorc_meteor:{minEnemies:2,manaAbove:33}};old.cooldowns={basic:.2,sorc_meteor:4.2};old.talents={sorcerer_talent_5:1};
    const json=JSON.stringify({format:'tiny-dungeon-save',version:1,exportedAt:new Date().toISOString(),state:legacy});const restored=importBackup(json);const necromancer=restored.characters.find(c=>c.classId==='necromancer')!;
    expect(necromancer.level).toBe(12);expect(necromancer.xp).toBe(345);expect(necromancer.equipment.weapon).toBe('arcane_staff');expect(necromancer.spellSlots).toEqual(['necro_meteor','necro_bolt']);expect(necromancer.spellConditions.necro_meteor).toEqual({minEnemies:2,manaAbove:33});expect(necromancer.cooldowns.necro_meteor).toBe(4.2);expect(necromancer.talents.necromancer_talent_5).toBe(1);
    const database=new TinyDungeonDatabase(`tiny-dungeon-test-${crypto.randomUUID()}`);databases.push(database);await database.saves.put({id:'main',version:1,state:legacy as never,updatedAt:1});const loaded=await loadMigratedState(database);expect(loaded?.characters.some(c=>c.classId==='necromancer')).toBe(true);expect(JSON.stringify((await database.saves.get('main'))?.state)).not.toContain('sorcerer');
  });

  it('rejeita JSON, versão, referências e itens inválidos',()=>{
    expect(()=>importBackup('{')).toThrow(/JSON válido/);
    expect(()=>importBackup(JSON.stringify({format:'tiny-dungeon-save',version:2,state:initialState()}))).toThrow(/incompatível/);
    const invalid=initialState();invalid.team=['personagem-inexistente'];expect(()=>importBackup(JSON.stringify({format:'tiny-dungeon-save',version:1,state:invalid}))).toThrow(/corrompido/);
    const badItem=initialState();badItem.inventory.bp=[{itemId:'item-inexistente',quantity:1}];expect(()=>cloneValidatedState(badItem)).toThrow(/corrompido/);
  });
});
