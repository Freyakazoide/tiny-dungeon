import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { HUNTS, huntScale, type HuntDef } from '../game/data/hunts';
import { MONSTERS } from '../game/data/monsters';
import { PROFICIENCIES, type ProficiencyId } from '../game/rpg/proficiencies';
import { runtime } from '../game/rpg/runtime';
import { elementCoverage } from '../game/systems/group';
import { huntGearStatus, huntMetrics, huntRiskInfo, offlineHuntId, recommendedHunt, tierChances, waveViews } from '../game/systems/huntInfo';
import { TIER_NAMES, tierOfExtra } from '../game/systems/waves';
import { duration } from './format';
import { colorHex, compact } from './format';
import { Icon } from './components/Icon';
import { ConfirmDialog } from './classes/parts';

type Sort = 'level' | 'xp' | 'gold';
type Action = 'select' | 'selectStart' | 'queue' | 'endSwap';
const SORTS: [Sort, string][] = [['level', 'Nível'], ['xp', 'XP/h'], ['gold', 'Ouro/h']];
const TIER_COLORS = ['#6a727d', '#71cf8c', '#e0a05c', '#e5593a', '#bd83ec'];

/** Mapa da hunt; sem arquivo (ou erro de carga) vira o placeholder de cor. */
function Map({ hunt, className, children }: { hunt: HuntDef; className: string; children?: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  return broken ? <div className={className + ' ph'} style={{ '--hc': colorHex(hunt.color), background: colorHex(hunt.color) } as CSSProperties} aria-hidden="true">{children}</div>
    : <img className={className} src={`assets/maps/${hunt.map}.png`} alt="" onError={() => setBroken(true)} />;
}
const riskClass = (label: string) => `hn-r-${label.toLowerCase()}`;
const hours = (ms: number) => ms >= 3_600_000 ? `${(ms / 3_600_000).toFixed(1).replace('.', ',')} h` : duration(ms / 1000);

function Gauge({ ratio, wide }: { ratio: number; wide?: boolean }) {
  return <div className="hn-gauge" style={wide ? { width: '100%' } : undefined}><i style={{ width: `${ratio * 100}%`, background: 'var(--rc)' }} /></div>;
}

function Detail({ state, hunt, onAction }: { state: GameState; hunt: HuntDef; onAction: (a: Action) => void }) {
  const risk = huntRiskInfo(state, hunt), metrics = huntMetrics(state, hunt), gear = huntGearStatus(state, hunt.id), cover = elementCoverage(state, hunt.id);
  const scale = huntScale(hunt.id), current = state.huntId === hunt.id, idle = state.status === 'idle';
  const monsters = Array.from(new Set(hunt.waves.flatMap(w => w.monsters))).map(id => MONSTERS[id]).filter(Boolean);
  const covered = (el: ProficiencyId) => cover.find(c => c.element === el)?.coveredBy.length;
  const withWeak = monsters.filter(m => m.weak?.length), coveredCount = withWeak.filter(m => m.weak!.some(el => covered(el))).length;
  const chances = tierChances(hunt), waves = waveViews(hunt);
  const color = (id: string) => colorHex(MONSTERS[id]?.color ?? 0x7a3f3a);
  return <aside className={`hn-right ${riskClass(risk.label)}`} aria-label={`Detalhe: ${hunt.name}`}>
    <div className="pk-panel hn-hero"><Map hunt={hunt} className="" /><div className="cap"><h3>{hunt.name}</h3><span className="hn-pill">{risk.label}</span></div></div>
    {(risk.label === 'Arriscada' || risk.label === 'Suicida') && <div className={`hn-warn ${risk.label === 'Suicida' ? 'bad' : ''}`}>⚠ <span>O grupo (nível {Math.round(risk.average * 10) / 10}) está <b>{Math.ceil(risk.gap)} níveis</b> abaixo do recomendado ({risk.recommended}). {risk.label === 'Suicida' ? 'O grupo provavelmente será derrotado.' : 'Espere gastar mais poções.'}</span></div>}
    <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Seu desempenho</h4>
      <div className="hn-stats">
        <div className={`hn-stat ${metrics.measured ? '' : 'ref'}`}>XP por hora<b>{compact(Math.round(metrics.xpPerHour))}<em>{metrics.measured ? 'medido' : 'ref.'}</em></b></div>
        <div className={`hn-stat ${metrics.measured ? '' : 'ref'}`}>Ouro por hora<b>{compact(Math.round(metrics.goldPerHour))}<em>{metrics.measured ? 'medido' : 'ref.'}</em></b></div>
        <div className="hn-stat">Chefes derrotados<b>{metrics.bossKills}</b></div><div className="hn-stat">Tempo nesta hunt<b>{metrics.activeMs ? hours(metrics.activeMs) : '—'}</b></div></div>
      {!metrics.measured && <small className="hn-note">referência do jogo (sem dados seus ainda)</small>}
      <div className="hn-meter" style={{ marginTop: 8 }}><div className="l"><span>Nível do grupo × recomendado</span><span>{Math.round(risk.average * 10) / 10} / {risk.recommended}</span></div><Gauge ratio={risk.ratio} wide /></div></div>
    <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Ondas</h4>
      <div className="hn-waves">{waves.map(w => <div className="hn-wave" key={w.name}><b>{w.name}</b><div className="hn-mons">{w.counts.map(c => <span key={c.monsterId} className={`hn-m ${MONSTERS[c.monsterId]?.boss ? 'boss' : ''}`} title={`${c.count}× ${MONSTERS[c.monsterId]?.name}`} aria-label={`${c.count} ${MONSTERS[c.monsterId]?.name}`} style={{ '--mc': color(c.monsterId) } as CSSProperties}>{c.count}</span>)}</div></div>)}</div>
      <h4 className="pk-sec" style={{ marginTop: 10 }}>Reforço nas waves normais</h4>
      <div className="hn-tiers" role="img" aria-label={chances.map(t => `${t.label} ${t.pct}%`).join(', ')}>{chances.map((t, i) => <i key={t.tier} style={{ width: `${t.pct}%`, background: TIER_COLORS[i] }} />)}</div>
      <div className="hn-tl">{chances.map((t, i) => <span key={t.tier}><i style={{ background: TIER_COLORS[i] }} />{t.label} {Math.round(t.pct)}%</span>)}</div></div>
    <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Monstros <small>{coveredCount} de {monsters.length} com fraqueza que seu grupo cobre</small></h4>
      <div className="hn-waves">{monsters.map(m => <div className="hn-mon" key={m.id}><span className={`hn-m ${m.boss ? 'boss' : ''}`} style={{ '--mc': colorHex(m.color) } as CSSProperties} aria-hidden="true" />
        <div><b>{m.name}{m.boss && <span className="pk-tag esp" style={{ marginLeft: 6 }}>chefe</span>}</b><small className="muted">HP {compact(Math.round(m.hp * runtime.monsterHp * scale.hp))} · ATQ {Math.round(m.attack * runtime.monsterAtk * scale.atk)} · XP {m.xp}</small></div>
        <span>{(m.weak ?? []).map(el => <span key={el} className={`hn-el ${covered(el) ? 'ok' : ''}`} title={`Fraco a ${PROFICIENCIES[el].name}${covered(el) ? ' (coberto)' : ''}`}><Icon name={`elem_${el}`} size={24} /></span>)}{(m.resist ?? []).map(el => <span key={el} className="hn-el res" title={`Resiste a ${PROFICIENCIES[el].name}`}><Icon name={`elem_${el}`} size={24} /></span>)}</span></div>)}</div>
      <small className="hn-note">Ícone verde = seu grupo tem magia desse elemento · cinza = resistência.</small></div>
    <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Equipamento da hunt</h4>
      {gear ? <div className="hn-set">{gear.pieces.map(p => <div className="hn-piece" key={p.piece}><Icon name={p.icon} size={24} /><span>{p.name}</span><span className={`pk-tag ${p.status === 'equipped' ? 'ok' : p.status === 'bag' ? 'esp' : 'afim'}`}>{p.status === 'equipped' ? 'equipado' : p.status === 'bag' ? 'na mochila' : 'não tem'}</span></div>)}<small className="hn-note">Nível mínimo para usar: {gear.minLevel}.</small></div> : <p className="muted">Hunt inicial: sem conjunto próprio.</p>}</div>
    <div className="pk-panel hn-actions">
      {idle
        ? current
          ? <div className="row"><button type="button" className="pk-btn" disabled>Hunt atual</button><button type="button" className="pk-btn primary" onClick={() => gameStore.start()}>Iniciar caçada</button></div>
          : <div className="row"><button type="button" className="pk-btn" onClick={() => onAction('select')}>Selecionar</button><button type="button" className="pk-btn primary" onClick={() => onAction('selectStart')}>Selecionar e iniciar</button></div>
        : current
          ? <><span className="hn-note">Você está caçando aqui agora.</span><div className="row"><button type="button" className="pk-btn" disabled>Hunt atual</button></div></>
          : <><span className="hn-note">A caçada está em andamento. Troque no fim do ciclo ou encerre agora.</span><div className="row"><button type="button" className="pk-btn primary" onClick={() => onAction('queue')}>Trocar no fim do ciclo</button><button type="button" className="pk-btn" onClick={() => onAction('endSwap')}>Encerrar e trocar</button></div></>}
    </div>
  </aside>;
}

/** Menu Hunts: lista em uma coluna (ordenável), detalhe com desempenho, ondas, monstros e ações. Nenhuma é bloqueada por nível. */
export function HuntSelector({ state }: { state: GameState }) {
  const [sort, setSort] = useState<Sort>('level'), [selected, setSelected] = useState(state.huntId), [confirm, setConfirm] = useState<Action | null>(null);
  const refs = useRef(new window.Map<string, HTMLButtonElement | null>());
  useEffect(() => { setSelected(state.huntId); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const best = recommendedHunt(state), offline = offlineHuntId(state);
  const ordered = [...HUNTS].sort((a, b) => sort === 'xp' ? huntMetrics(state, b).xpPerHour - huntMetrics(state, a).xpPerHour : sort === 'gold' ? huntMetrics(state, b).goldPerHour - huntMetrics(state, a).goldPerHour : a.recommendedLevel - b.recommendedLevel);
  const hunt = HUNTS.find(h => h.id === selected) ?? HUNTS[0], risk = huntRiskInfo(state, hunt);
  const running = state.status !== 'idle', pending = state.pendingHunt ? HUNTS.find(h => h.id === state.pendingHunt) : undefined, current = HUNTS.find(h => h.id === state.huntId)!;
  const tier = state.waveInfo ? TIER_NAMES[tierOfExtra(state.waveInfo.extra)] : undefined;
  const run = (action: Action) => {
    if (action === 'select') gameStore.selectHunt(hunt.id);
    else if (action === 'selectStart') gameStore.selectAndStart(hunt.id);
    else if (action === 'queue') gameStore.queueHunt(hunt.id);
    else { gameStore.end(); gameStore.selectHunt(hunt.id); }
  };
  const request = (action: Action) => risk.label === 'Suicida' ? setConfirm(action) : run(action);
  const onKey = (index: number) => (event: KeyboardEvent) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0, target = event.key === 'Home' ? 0 : event.key === 'End' ? ordered.length - 1 : step ? Math.max(0, Math.min(ordered.length - 1, index + step)) : -1;
    if (target < 0) return; event.preventDefault(); setSelected(ordered[target].id); refs.current.get(ordered[target].id)?.focus();
  };
  return <section className="hunt-selector hn-layout" aria-label="Hunts" style={{ flex: 1 }}>
    <div className="hn-left">
      <div className="pk-panel hn-now"><span className={running ? 'pk-tag ok' : 'pk-tag afim'}>{running ? '● Em caçada' : '■ Parada'}</span>
        <div><b className="pk-serif">{current.name}</b><br /><small className="muted">ciclo {state.cycle + 1} · wave {state.wave + 1}/{current.waves.length}{tier ? ` · ${tier}` : ''}</small></div>
        {pending ? <span className="hn-queue">⏭ Próxima: {pending.name}<button type="button" className="pk-btn sm" onClick={() => gameStore.cancelQueuedHunt()}>Cancelar</button></span> : <span />}</div>
      <div className="hn-tools"><h4 className="pk-sec" style={{ margin: 0, flex: 1 }}>Mapas <small>{HUNTS.length} hunts · nenhuma é bloqueada por nível</small></h4>
        <div className="hn-sort" role="group" aria-label="Ordenar">{SORTS.map(([id, label]) => <button type="button" key={id} className={`pk-btn ${sort === id ? 'on' : ''}`} aria-pressed={sort === id} onClick={() => setSort(id)}>{label}</button>)}</div></div>
      <div className="hn-list" role="listbox" aria-label="Mapas">{ordered.map((h, i) => {
        const r = huntRiskInfo(state, h), m = huntMetrics(state, h), cur = state.huntId === h.id;
        const mons = Array.from(new Set(h.waves.flatMap(w => w.monsters))).slice(0, 3).map(id => MONSTERS[id]?.name).join(', ');
        return <button type="button" key={h.id} role="option" aria-selected={selected === h.id} tabIndex={selected === h.id ? 0 : -1} ref={el => { refs.current.set(h.id, el); }} onClick={() => setSelected(h.id)} onKeyDown={onKey(i)}
          aria-label={`${h.name}, nível ${h.recommendedLevel}, risco ${r.label}${cur ? ', hunt atual' : ''}`} className={`pk-panel hn-card ${riskClass(r.label)} ${selected === h.id ? 'sel' : ''} ${cur ? 'cur' : ''}`}>
          <Map hunt={h} className="hn-thumb" />
          <div style={{ minWidth: 0 }}><div className="hn-name">{h.name}{cur && <span className="pk-tag ok">Atual</span>}{best === h.id && <span className="pk-tag esp">★ Melhor XP/h</span>}{offline === h.id && <span className="pk-tag off">Offline 25%</span>}</div>
            <div className="hn-sub">Nível recomendado {h.recommendedLevel} · {mons}</div>
            <div className="hn-chips"><span className="pk-chip">XP/h {compact(Math.round(m.xpPerHour))}{!m.measured && <span className="muted">&nbsp;ref.</span>}</span><span className="pk-chip">Ouro/h {compact(Math.round(m.goldPerHour))}{!m.measured && <span className="muted">&nbsp;ref.</span>}</span><span className="pk-chip">{m.bossKills ? `Chefes ${m.bossKills}` : 'sem chefe derrotado'}</span></div></div>
          <div className="hn-risk"><span className="hn-pill">{r.label}</span><Gauge ratio={r.ratio} /><small className="muted pk-tiny">grupo {Math.round(r.average * 10) / 10} / {r.recommended}</small></div>
        </button>;
      })}</div>
    </div>
    <Detail state={state} hunt={hunt} onAction={request} />
    {confirm && <ConfirmDialog title="Hunt Suicida" labelledBy="hunt-title" confirmLabel="Continuar" onCancel={() => setConfirm(null)} onConfirm={() => { run(confirm); setConfirm(null); }}>
      <p>O grupo provavelmente será derrotado em <b>{hunt.name}</b>. Continuar?</p></ConfirmDialog>}
  </section>;
}
