import { GameEngine } from './GameEngine';
import { persistence } from '../persistence/repository';
import { importBackup } from '../persistence/backup';
import { sessionGapSeconds } from '../rpg/offline';

export const gameStore=new GameEngine();
let dirty=false;let initialized=false;let saveTimer:number|undefined;

async function flush(){if(!dirty)return;dirty=false;try{const state=gameStore.getSnapshot();state.lastSavedAt=Date.now();await persistence.save(state);}catch(error){dirty=true;console.error('Falha ao salvar Tiny Dungeon',error);}}

export async function initializeGameStore(){
  if(initialized)return;initialized=true;
  try{const saved=await persistence.load();if(saved){gameStore.hydrate(saved);gameStore.applyOffline(sessionGapSeconds(saved.lastSavedAt,Date.now()));}}catch(error){console.warn('Save ignorado por ser inválido ou inacessível.',error);}
  gameStore.subscribe(()=>{dirty=true;});
  // Heartbeat: mesmo parado, o save marca "visto por último" a cada 5 s; é dele que sai o gap offline.
  saveTimer=window.setInterval(()=>{dirty=true;void flush();},5000);
  window.addEventListener('pagehide',()=>void flush());
}
export async function importGameBackup(json:string){const state=importBackup(json);await persistence.replace(state);gameStore.hydrate(state);dirty=false;return state;}
export async function saveNow(){dirty=true;await flush();}
export function stopAutosaveForTests(){if(saveTimer!==undefined)window.clearInterval(saveTimer);saveTimer=undefined;}
