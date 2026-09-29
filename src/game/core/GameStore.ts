import { GameEngine, initialState } from './GameEngine';
import { persistence } from '../persistence/repository';
import { importBackup } from '../persistence/backup';
import { sessionGapSeconds } from '../rpg/offline';
import { createDevTools } from './devTools';

export const gameStore=new GameEngine();
let dirty=false;let initialized=false;let saveTimer:number|undefined;let saveFrozen=false;

async function flush(){if(!dirty||saveFrozen)return;dirty=false;try{const state=gameStore.getSnapshot();state.lastSavedAt=Date.now();await persistence.save(state);}catch(error){dirty=true;console.error('Falha ao salvar Tiny Dungeon',error);}}

export async function initializeGameStore(){
  if(initialized)return;initialized=true;
  try{const saved=await persistence.load();if(saved){gameStore.hydrate(saved);const gap=sessionGapSeconds(saved.lastSavedAt,Date.now());if(gap>0){gameStore.returnFromOffline(gap);}}}catch(error){console.warn('Save ignorado por ser inválido ou inacessível.',error);}
  gameStore.subscribe(()=>{dirty=true;});
  // Heartbeat: mesmo parado, o save marca "visto por último" a cada 5 s; é dele que sai o gap offline.
  saveTimer=window.setInterval(()=>{dirty=true;void flush();},5000);
  window.addEventListener('pagehide',()=>void flush());
}
export async function importGameBackup(json:string){const state=importBackup(json);await persistence.replace(state);gameStore.hydrate(state);dirty=false;return state;}
/** Apaga o save e volta ao estado inicial (tela de criação). */
export async function resetGame(){await persistence.clear();gameStore.hydrate(initialState());dirty=false;}
export async function saveNow(){dirty=true;await flush();}
export function stopAutosaveForTests(){if(saveTimer!==undefined)window.clearInterval(saveTimer);saveTimer=undefined;}

/**
 * Ferramentas de teste (`window.dev`): só existem em `npm run dev`; o Vite remove o bloco da build.
 * Congelam o autosave quando precisam que o `lastSavedAt` gravado sobreviva até o reload.
 */
if(import.meta.env.DEV&&typeof window!=="undefined"){
  (window as unknown as {dev?:unknown}).dev=createDevTools(gameStore,{
    async setLastSeen(hoursAgo:number){
      saveFrozen=true;if(saveTimer!==undefined){window.clearInterval(saveTimer);saveTimer=undefined;}
      const state=gameStore.getSnapshot();state.lastSavedAt=Date.now()-hoursAgo*3600*1000;await persistence.save(state);
    },
    async resetSave(){saveFrozen=true;if(saveTimer!==undefined){window.clearInterval(saveTimer);saveTimer=undefined;}await persistence.clear();window.location.reload();}
  });
}
