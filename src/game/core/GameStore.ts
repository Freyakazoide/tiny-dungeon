import { GameEngine, initialState } from './GameEngine';
import { persistence } from '../persistence/repository';
import { importBackup } from '../persistence/backup';
import { sessionGapSeconds } from '../rpg/offline';
import { createDevTools } from './devTools';
import { runtime } from '../rpg/runtime';

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
  startBackgroundTicker();
}
/**
 * O navegador para o requestAnimationFrame (e, depois de minutos, quase todos os timers) quando a aba sai da tela, e o Phaser
 * é quem move o motor. Este ticker simula o tempo que ficou para trás sempre que a aba está oculta e ao voltar a ficar visível.
 */
export function backgroundTick(){
  const gap=Date.now()-gameStore.lastAdvanceAt;
  if(gap<250)return 0;
  return gameStore.catchUp(gap,runtime.huntSpeed);
}
let bgTimer:number|undefined;
export function startBackgroundTicker(){
  if(bgTimer!==undefined||typeof document==='undefined')return;
  bgTimer=window.setInterval(()=>{if(document.hidden)backgroundTick();},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)backgroundTick();});
  window.addEventListener('focus',()=>backgroundTick());
}
export function stopBackgroundTicker(){if(bgTimer!==undefined)window.clearInterval(bgTimer);bgTimer=undefined;}
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
