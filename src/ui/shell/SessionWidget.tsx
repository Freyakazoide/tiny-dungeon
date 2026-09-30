import { useState } from 'react';
import type { GameState } from '../../game/core/types';
import { runtime } from '../../game/rpg/runtime';
import { analyzerMetrics } from '../../game/systems/analyzer';
import { compact, duration } from '../format';

/** Widget "Sessão" no canto do mapa (recolhível): XP/h, ouro/h, DPS e tempo ativo (simulado quando acelerado). */
export function SessionWidget({ state }: { state: GameState }) {
  // recolhido por padrão em telas menores (< 1180 px), para não cobrir o mapa
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1180);
  const m = analyzerMetrics(state.analyzer);
  return <aside className="session" aria-label="Sessão">
    <h4 role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}><span>Sessão</span><span>{open ? '▾' : '▸'}</span></h4>
    {open && <><div className="r"><span>XP/h</span><b>{compact(m.xpPerHour)}</b></div><div className="r"><span>Ouro/h</span><b>{compact(m.goldPerHour)}</b></div>
      <div className="r"><span>DPS</span><b>{Math.round(m.dps)}</b></div><div className="r"><span>Tempo{runtime.huntSpeed > 1 ? ' (sim.)' : ''}</span><b>{duration(m.activeSeconds)}</b></div></>}
  </aside>;
}
