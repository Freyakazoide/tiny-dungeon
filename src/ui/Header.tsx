import type { ChangeEvent, RefObject } from 'react';
import type { GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';

export function Header({state,onExport,onImport,fileInput,message}:{state:GameState;onExport:()=>void;onImport:(event:ChangeEvent<HTMLInputElement>)=>void;fileInput:RefObject<HTMLInputElement|null>;message:string}){
  return <header className="topbar"><div className="brand"><span className="brand-mark">TD</span><div><h1>Tiny Dungeon</h1><small>{state.status.toUpperCase()} · Wave {state.wave+1}/3 · Ciclo {state.cycle+1}</small></div></div><div className="controls">
    <button className="primary" disabled={state.status!=='idle'} onClick={()=>gameStore.start()}>Iniciar</button><button disabled={state.status==='idle'||state.status==='paused'} onClick={()=>gameStore.pause()}>Pausar</button><button disabled={state.status!=='paused'} onClick={()=>gameStore.resume()}>Continuar</button><button disabled={state.status==='idle'} className="danger" onClick={()=>gameStore.end()}>Encerrar</button>
    <label className="toggle"><input type="checkbox" checked={state.autoAdvance} onChange={event=>gameStore.setAutoAdvance(event.target.checked)}/><span>Avanço automático</span></label>{state.status==='transition'&&!state.autoAdvance&&<button onClick={()=>gameStore.advance()}>Descer agora</button>}
    <button onClick={onExport}>Exportar</button><button onClick={()=>fileInput.current?.click()}>Importar</button><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={onImport}/>{message&&<output>{message}</output>}
  </div></header>;
}
