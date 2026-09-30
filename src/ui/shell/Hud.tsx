import { useEffect, useState } from 'react';
import type { GameState, HuntStatus } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { HUNT_BY_ID, huntRisk, huntWaves } from '../../game/data/hunts';
import { runtime } from '../../game/rpg/runtime';
import { TIER_NAMES, tierOfExtra } from '../../game/systems/waves';
import { Chip } from '../components/Badge';
import { Icon } from '../components/Icon';
import { potionPercent, potionTone } from '../badges';

const SPEEDS = [1, 5, 25, 100];
const setSpeed = (n: number) => { runtime.huntSpeed = n; gameStore.devScaleChanged(); };

/** Só em desenvolvimento: acelera a caçada e mostra os multiplicadores de teste. Atalhos `[` e `]`. Fora do DEV nada disto é montado. */
export function DevBar() {
  const [, tick] = useState(0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      const at = SPEEDS.indexOf(runtime.huntSpeed);
      if (event.key === '[' && at > 0) { setSpeed(SPEEDS[at - 1]); tick(n => n + 1); }
      if (event.key === ']' && at < SPEEDS.length - 1) { setSpeed(SPEEDS[Math.max(0, at) + 1]); tick(n => n + 1); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const scaled = runtime.trainScale !== 1 || runtime.xpScale !== 1 || runtime.monsterHp !== 1 || runtime.monsterAtk !== 1;
  return <>
    <div className="speed" role="group" aria-label="Velocidade da caçada (só teste)">{SPEEDS.map(n => <button key={n} type="button" className={runtime.huntSpeed === n ? 'on' : ''} onClick={() => { setSpeed(n); tick(x => x + 1); }}>×{n}</button>)}</div>
    {runtime.huntSpeed > 1 && <span className="dev-badge">ACELERADO ×{runtime.huntSpeed} — só teste</span>}
    {scaled && <span className="dev-badge" title="Multiplicadores de teste (window.dev)">DEV ×{runtime.trainScale} treino · ×{runtime.xpScale} XP{(runtime.monsterHp !== 1 || runtime.monsterAtk !== 1) && ` · monstros ×${runtime.monsterHp}/×${runtime.monsterAtk}`}</span>}
  </>;
}

const STATUS: Record<HuntStatus, { label: string; icon: string; tone?: 'ok' | 'warn' | 'danger' }> = {
  running: { label: 'Em caçada', icon: 'status_running', tone: 'ok' }, paused: { label: 'Pausada', icon: 'status_paused', tone: 'warn' },
  transition: { label: 'Transição', icon: 'status_transition' }, recovering: { label: 'Recuperando', icon: 'status_recovering', tone: 'danger' },
  idle: { label: 'Parada', icon: 'status_paused' },
};

/** Progresso da wave (0 a 1): monstros derrotados sobre o total (contando os que ainda vão entrar nas levas). */
export function waveProgress(state: GameState) {
  const total = state.waveInfo?.total ?? state.monsters.length;
  if (!total || state.status === 'idle') return 0;
  if (state.status === 'transition') return 1;
  const left = state.monsters.filter(m => m.alive).length + (state.wavePending?.length ?? 0);
  return Math.max(0, Math.min(1, (total - left) / total));
}

/** Topo: marca, hunt e risco, wave com o tier, estado, ouro, poções e os controles da caçada (velocidade só em DEV). */
export function Hud({ state }: { state: GameState }) {
  const hunt = HUNT_BY_ID[state.huntId], risk = huntRisk(gameStore.averageTeamLevel(), hunt.recommendedLevel);
  const info = state.waveInfo, tier = info && info.extra > 0 && state.status !== 'idle' ? tierOfExtra(info.extra) : undefined;
  const status = STATUS[state.status], potions = potionPercent(state);
  return <header className="hud">
    <div className="brand"><b>TD</b><span>Tiny Dungeon</span></div>
    <div className="hunt-title"><strong>{hunt.name}</strong><small>Nível rec. {hunt.recommendedLevel} · <span className={`risk-${risk.toLowerCase()}`}>{risk}</span> · ciclo {state.cycle + 1}</small></div>
    <div className="wave"><div className="wave-top"><span>Wave {state.wave + 1}/{huntWaves(state.huntId).length}</span><span>{tier && info ? `${TIER_NAMES[tier]} · ${info.total} inimigos` : ''}</span></div>
      <div className="bar" role="progressbar" aria-label="Progresso da wave" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(waveProgress(state) * 100)}><i style={{ width: `${waveProgress(state) * 100}%` }} /></div></div>
    <Chip tone={status.tone} className="hide-s"><Icon name={status.icon} size={24} /> {status.label}</Chip>
    <Chip className="hide-s" title="Ouro"><Icon name="stat_gold" size={24} /> <b>{state.gold.toLocaleString('pt-BR')}</b></Chip>
    <Chip tone={potionTone(potions)} className="hide-s" title="Estoque de poções de vida"><Icon name="stat_hp" size={24} /> Poções: {potions}%</Chip>
    <span className="grow" />
    {import.meta.env.DEV && <DevBar />}
    <button type="button" className="btn primary"
      onClick={() => state.status === 'idle' ? gameStore.start() : state.status === 'paused' ? gameStore.resume() : gameStore.pause()}>
      {state.status === 'idle' ? '▶ Iniciar' : state.status === 'paused' ? '▶ Continuar' : '⏸ Pausar'}</button>
    <button type="button" className="btn ghost" disabled={state.status === 'idle'} onClick={() => gameStore.end()}>⏹ Encerrar</button>
  </header>;
}
