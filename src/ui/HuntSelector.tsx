import { useState, type CSSProperties } from 'react';
import type { GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { HUNTS, type HuntDef } from '../game/data/hunts';
import { MONSTERS } from '../game/data/monsters';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { colorHex } from './format';

/** Miniatura do mapa; se o PNG não existir mostra a cor da hunt. */
function Thumb({ hunt }: { hunt: HuntDef }) {
  const [broken, setBroken] = useState(false);
  return broken
    ? <div className="hunt-thumb hunt-thumb-fallback" style={{ background: colorHex(hunt.color) }} aria-hidden="true" />
    : <img className="hunt-thumb" src={`assets/maps/${hunt.map}.png`} alt="" onError={() => setBroken(true)} />;
}

const affinity = (ids: readonly string[] | undefined) => ids?.length ? ids.map(id => PROFICIENCIES[id as keyof typeof PROFICIENCIES]?.name ?? id).join(', ') : '—';

/** Um cartão por hunt: mapa, nível recomendado, liberada/bloqueada e monstros com fraquezas. */
export function HuntSelector({ state }: { state: GameState }) {
  const idle = state.status === 'idle';
  return <section className="hunt-selector" aria-label="Hunts">{HUNTS.map(hunt => {
    const unlocked = gameStore.huntUnlocked(hunt.id), current = state.huntId === hunt.id;
    const monsterIds = Array.from(new Set(hunt.waves.flatMap(w => w.monsters)));
    return <article key={hunt.id} className={`hunt-card ${current ? 'current' : ''} ${unlocked ? '' : 'locked'}`} style={{ '--hunt-color': colorHex(hunt.color) } as CSSProperties}>
      <Thumb hunt={hunt} />
      <div className="hunt-copy"><strong>{hunt.name}</strong>
        <small>Nível recomendado {hunt.recommendedLevel} · {unlocked ? 'liberada' : `bloqueada (nível ${hunt.minLevel})`}</small>
        <details className="hunt-monsters"><summary>Monstros</summary><ul>{monsterIds.map(id => { const m = MONSTERS[id]; return <li key={id}><b>{m.name}</b>{m.boss && <em>boss</em>}<small>Fraco a: {affinity(m.weak)} · Resiste a: {affinity(m.resist)}</small></li>; })}</ul></details>
      </div>
      <button className={current ? 'primary' : ''} disabled={!idle || !unlocked || current} title={!idle ? 'Encerre a caçada para trocar de hunt' : !unlocked ? `Requer nível ${hunt.minLevel}` : undefined} onClick={() => gameStore.selectHunt(hunt.id)}>{current ? 'Atual' : 'Selecionar'}</button>
    </article>;
  })}</section>;
}
