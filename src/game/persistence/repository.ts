import Dexie, { type EntityTable } from 'dexie';
import type { GameState } from '../core/types';
import { cloneValidatedState } from './validation';

interface SaveRecord { id:'main'; version:1; state:GameState; updatedAt:number; }
export class TinyDungeonDatabase extends Dexie {
  saves!:EntityTable<SaveRecord,'id'>;
  constructor(name='tiny-dungeon'){super(name);this.version(1).stores({saves:'id,version,updatedAt'});}
}
export const database=new TinyDungeonDatabase();
export async function loadMigratedState(source:TinyDungeonDatabase){
  const row=await source.saves.get('main');
  if(row?.version!==1)return undefined;
  const migrated=cloneValidatedState(row.state);
  if(JSON.stringify(migrated)!==JSON.stringify(row.state))await source.saves.put({...row,state:migrated,updatedAt:Date.now()});
  return migrated;
}
export const persistence={
  async save(state:GameState){const copy=cloneValidatedState(state);await database.saves.put({id:'main',version:1,state:copy,updatedAt:Date.now()});},
  async load(){return loadMigratedState(database);},
  async replace(state:GameState){await this.save(state);return cloneValidatedState(state);},
  async clear(){await database.saves.delete('main');}
};
