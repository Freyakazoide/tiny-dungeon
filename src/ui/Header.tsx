import type { GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { runtime } from '../game/rpg/runtime';

/** Marca e controles da caçada. Backup e reinício ficam na aba Sistema. */
export function Header({state}:{state:GameState}){
  return <header className="topbar"><div className="brand"><span className="brand-mark">TD</span><div><h1>Tiny Dungeon</h1><small>{state.status.toUpperCase()} · Wave {state.wave+1}/3 · Ciclo {state.cycle+1}</small></div></div><div className="controls">
    {(runtime.trainScale!==1||runtime.xpScale!==1||runtime.monsterHp!==1||runtime.monsterAtk!==1)&&<span className="dev-badge" title="Multiplicadores de teste (window.dev)">DEV ×{runtime.trainScale} treino · ×{runtime.xpScale} XP{(runtime.monsterHp!==1||runtime.monsterAtk!==1)&&` · monstros ×${runtime.monsterHp}/×${runtime.monsterAtk}`}</span>}
    <button className="primary" disabled={state.status!=='idle'} onClick={()=>gameStore.start()}>Iniciar</button><button disabled={state.status==='idle'||state.status==='paused'} onClick={()=>gameStore.pause()}>Pausar</button><button disabled={state.status!=='paused'} onClick={()=>gameStore.resume()}>Continuar</button><button disabled={state.status==='idle'} className="danger" onClick={()=>gameStore.end()}>Encerrar</button>
    <label className="toggle"><input type="checkbox" checked={state.autoAdvance} onChange={event=>gameStore.setAutoAdvance(event.target.checked)}/><span>Avanço automático</span></label>{state.status==='transition'&&!state.autoAdvance&&<button onClick={()=>gameStore.advance()}>Descer agora</button>}
  </div></header>;
}
