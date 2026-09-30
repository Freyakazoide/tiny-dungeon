import type { GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { useEffect } from 'react';
import { huntWaves } from '../game/data/hunts';
import { runtime } from '../game/rpg/runtime';
import { TIER_NAMES, tierOfExtra } from '../game/systems/waves';

const SPEEDS=[1,2,5,10,25,100];
const setSpeed=(n:number)=>{runtime.huntSpeed=n;gameStore.devScaleChanged();};

/** Só em desenvolvimento: acelera a caçada inteira. Atalhos `[` (reduz) e `]` (aumenta). */
function SpeedControl(){
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;
      const at=SPEEDS.indexOf(runtime.huntSpeed);
      if(event.key==='['&&at>0)setSpeed(SPEEDS[at-1]);
      if(event.key===']'&&at<SPEEDS.length-1)setSpeed(SPEEDS[Math.max(0,at)+1]);
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);
  return <div className="speed-control" role="group" aria-label="Velocidade da caçada (só teste)">{SPEEDS.map(n=><button key={n} className={runtime.huntSpeed===n?'active':''} onClick={()=>setSpeed(n)}>×{n}</button>)}</div>;
}

/** Marca e controles da caçada. Backup e reinício ficam na aba Sistema. */
export function Header({state}:{state:GameState}){
  return <header className="topbar"><div className="brand"><span className="brand-mark">TD</span><div><h1>Tiny Dungeon</h1><small>{state.status.toUpperCase()} · Wave {state.wave+1}/{huntWaves(state.huntId).length} · Ciclo {state.cycle+1}{state.status!=='idle'&&state.waveInfo&&state.waveInfo.extra>0&&<b className={`wave-tier tier-${tierOfExtra(state.waveInfo.extra)}`}> · {TIER_NAMES[tierOfExtra(state.waveInfo.extra)]} ({state.waveInfo.total} inimigos)</b>}</small></div></div><div className="controls">
    {import.meta.env.DEV&&<SpeedControl/>}{runtime.huntSpeed>1&&<span className="dev-badge speed-badge">ACELERADO ×{runtime.huntSpeed} — só teste</span>}{(runtime.trainScale!==1||runtime.xpScale!==1||runtime.monsterHp!==1||runtime.monsterAtk!==1)&&<span className="dev-badge" title="Multiplicadores de teste (window.dev)">DEV ×{runtime.trainScale} treino · ×{runtime.xpScale} XP{(runtime.monsterHp!==1||runtime.monsterAtk!==1)&&` · monstros ×${runtime.monsterHp}/×${runtime.monsterAtk}`}</span>}
    <button className="primary" disabled={state.status!=='idle'} onClick={()=>gameStore.start()}>Iniciar</button><button disabled={state.status==='idle'||state.status==='paused'} onClick={()=>gameStore.pause()}>Pausar</button><button disabled={state.status!=='paused'} onClick={()=>gameStore.resume()}>Continuar</button><button disabled={state.status==='idle'} className="danger" onClick={()=>gameStore.end()}>Encerrar</button>
    <label className="toggle"><input type="checkbox" checked={state.autoAdvance} onChange={event=>gameStore.setAutoAdvance(event.target.checked)}/><span>Avanço automático</span></label>{state.status==='transition'&&!state.autoAdvance&&<button onClick={()=>gameStore.descend()}>Descer agora</button>}
  </div></header>;
}
