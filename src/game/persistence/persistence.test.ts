import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine, initialState } from '../core/GameEngine';
import { exportBackup, importBackup } from './backup';
import { TinyDungeonDatabase } from './repository';
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

  it('rejeita JSON, versão, referências e itens inválidos',()=>{
    expect(()=>importBackup('{')).toThrow(/JSON válido/);
    expect(()=>importBackup(JSON.stringify({format:'tiny-dungeon-save',version:2,state:initialState()}))).toThrow(/incompatível/);
    const invalid=initialState();invalid.team=['personagem-inexistente'];expect(()=>importBackup(JSON.stringify({format:'tiny-dungeon-save',version:1,state:invalid}))).toThrow(/corrompido/);
    const badItem=initialState();badItem.inventory.bp=[{itemId:'item-inexistente',quantity:1}];expect(()=>cloneValidatedState(badItem)).toThrow(/corrompido/);
  });
});
