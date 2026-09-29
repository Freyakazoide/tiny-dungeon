import Dexie, { type EntityTable } from 'dexie';
import type { GameState } from '../core/types';
import { cloneValidatedState } from './validation';

interface SaveRecord { id:'main'; version:1; state:GameState; updatedAt:number; }
export class TinyDungeonDatabase extends Dexie {
  saves!:EntityTable<SaveRecord,'id'>;
  constructor(name='tiny-dungeon'){super(name);this.version(1).stores({saves:'id,version,updatedAt'});}
}
export const database=new TinyDungeonDatabase();
export const persistence={
  async save(state:GameState){const copy=cloneValidatedState(state);await database.saves.put({id:'main',version:1,state:copy,updatedAt:Date.now()});},
  async load(){const row=await database.saves.get('main');return row?.version===1?cloneValidatedState(row.state):undefined;},
  async replace(state:GameState){await this.save(state);return cloneValidatedState(state);},
  async clear(){await database.saves.delete('main');}
};
