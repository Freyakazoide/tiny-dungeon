import Dexie, { type EntityTable } from 'dexie';
import type { GameState } from '../core/types';

interface SaveRecord { id:'main'; version:1; state:GameState; updatedAt:number; }
class TinyDungeonDatabase extends Dexie {
  saves!:EntityTable<SaveRecord,'id'>;
  constructor(){super('tiny-dungeon');this.version(1).stores({saves:'id,version,updatedAt'});}
}
export const database=new TinyDungeonDatabase();
export const persistence={
  async save(state:GameState){await database.saves.put({id:'main',version:1,state:structuredClone(state),updatedAt:Date.now()});},
  async load(){const row=await database.saves.get('main');return row?.version===1?row.state:undefined;},
  async clear(){await database.saves.delete('main');}
};
