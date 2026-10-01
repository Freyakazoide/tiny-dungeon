import { useEffect, useRef, useSyncExternalStore } from 'react';
import { PhaserGame } from './PhaserGame';
import { gameStore } from './game/core/GameStore';
import { PARTY_SIZE } from './game/core/GameEngine';
import { CreationScreen } from './ui/CreationScreen';
import { ToastHost } from './ui/components/ToastHost';
import { ModalHost, tabsOf } from './ui/modals/ModalHost';
import { Hud } from './ui/shell/Hud';
import { IconRail } from './ui/shell/IconRail';
import { PartyBar } from './ui/shell/PartyBar';
import { SessionWidget } from './ui/shell/SessionWidget';
import { handleShortcut, uiStore, useUi } from './ui/uiStore';

function App(){
  const state=useSyncExternalStore(gameStore.subscribe,gameStore.getSnapshot);
  const ui=useUi();
  const created=state.characters.length>=PARTY_SIZE;
  const selected=state.characters.find(c=>c.id===ui.selected)??state.characters.find(c=>c.id===state.team[0])??state.characters[0];
  const team=useRef<string[]>([]);team.current=state.characters.map(c=>c.id);
  const reported=useRef<unknown>(null);

  // Atalhos globais (C, I, K… abrem o menu; Esc fecha; ← → trocam de personagem) e deep link #/menu/aba.
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{handleShortcut(event,team.current);};
    window.addEventListener('keydown',onKey);
    if(created&&location.hash)uiStore.openFromHash(location.hash,tabsOf);
    return()=>window.removeEventListener('keydown',onKey);
  },[created]);
  // Escala da interface e "reduzir movimento" (opções salvas neste navegador).
  useEffect(()=>{
    document.documentElement.style.setProperty('--ui-scale',String(ui.options.scale/100));
    document.documentElement.classList.toggle('reduce-motion',ui.options.reduceMotion);
  },[ui.options.scale,ui.options.reduceMotion]);
  // O relatório offline abre sozinho, uma vez por retorno, num modal (e não empurrando o conteúdo).
  useEffect(()=>{if(state.offlineReport&&reported.current!==state.offlineReport){reported.current=state.offlineReport;uiStore.open('bemvindo');}},[state.offlineReport]);

  if(!created)return <div id="app"><CreationScreen/></div>;
  return <div id="app"><div className="stage">
    <Hud state={state}/>
    <IconRail state={state} selected={selected}/>
    {/* O Phaser dirige o tick do combate: o mapa fica SEMPRE montado e visível (nunca display:none); o modal só o cobre. */}
    <main className="arena" aria-label="Caçada"><PhaserGame/><SessionWidget state={state}/><ToastHost/></main>
    <PartyBar state={state}/>
  </div><ModalHost state={state}/></div>;
}

export default App;
