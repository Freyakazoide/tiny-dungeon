import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { CLASS_BY_ID } from '../../game/rpg/classTree';
import { formatEta } from '../../game/rpg/curves';
import { groupClasses, previewEvolution, requirementRows, type Step } from '../../game/systems/guide';
import { Icon } from '../components/Icon';
import { toastStore } from '../components/ToastHost';
import { statNames, statValue } from '../format';
import { uiStore } from '../uiStore';
import { ClassIcon } from './ClassIcon';
import { AffinityStrip, ConfirmDialog, ReqBars, reqLabel, reqValue, subclassKind } from './parts';
import { NODE_PASSIVES } from '../../game/rpg/passives';
import { pathNames } from '../../game/systems/guide';

type Filter = 'all' | 'ready' | 'playable';
const fmtStat = (key: Parameters<typeof statValue>[0], value: number) => statValue(key, key === 'attackSpeed' || key === 'crit' || key === 'resistance' ? value : Math.round(value));

function ariaFor(s: Step) {
  const state = s.playable ? (s.progress.ready ? 'pronta para evoluir, jogável' : `em progresso, ${s.progress.bottleneck ?? ''}`) : s.progress.ready ? 'requisitos cumpridos, kit em breve' : 'em breve';
  return `${s.node.name}, ${state}`;
}

function PathPanel({ character }: { character: Character }) {
  const tier = CLASS_BY_ID[character.profile.classId].tier;
  const names = pathNames(character);
  const steps = [
    { label: 'Tier 0', name: names[0] ?? 'Squire', state: 'done' },
    { label: 'Tier 1', name: tier >= 1 ? names[1] : tier === 0 ? 'agora' : '', state: tier >= 1 ? 'done' : 'cur' },
    { label: 'Tier 2 · Nv 25', name: tier >= 2 ? names[2] : tier === 1 ? 'escolha sua subclasse' : 'bloqueado', state: tier >= 2 ? 'done' : tier === 1 ? 'cur' : 'lock' },
  ];
  return <div className="ch-path pk-panel" aria-label="Caminho de classe">{steps.map(s => <div key={s.label} className={`ch-step ${s.state}`}><small>{s.label}</small><b>{s.name}</b></div>)}</div>;
}

function Preview({ state, character, step, onEvolve }: { state: GameState; character: Character; step: Step; onEvolve: () => void }) {
  const { node, playable, progress } = step, pv = previewEvolution(state, character, node.id);
  const pending = requirementRows(character, node).filter(r => !r.met);
  const passive = NODE_PASSIVES[node.id];
  const ready = playable && progress.ready;
  return <aside className="cl-prev pk-panel" aria-label={`Prévia: ${node.name}`}>
    <div className="cl-phead"><ClassIcon node={node} size="big" />
      <div><div className="cl-name" style={{ fontSize: 18 }}>{node.name}</div><div className="cl-spec">{node.specialty ?? subclassKind(node)}</div>
        <div className="cl-tags">{playable ? <span className="pk-tag ok">Jogável</span> : <span className="pk-tag" style={{ ['--tc' as string]: '#e0a05c' }}>🔒 Em breve</span>}{progress.ready && <span className="pk-tag up">Requisitos ok</span>}</div></div></div>
    {ready
      ? <button type="button" className="pk-btn primary" onClick={onEvolve}>Evoluir para {node.name}</button>
      : <button type="button" className="pk-btn" disabled>{playable ? 'Faltam requisitos' : 'Kit em breve'}</button>}
    {ready && <div className="cl-warn">⚠ <span>Evoluir é definitivo. Você perde o acesso às outras <b>{pv.lostOptions} classes</b> deste personagem.</span></div>}
    {!playable && <div className="cl-warn">⚠ <span>Esta classe ainda não tem kit (atributos, magias e passiva). A evolução fica bloqueada para ninguém ficar preso numa classe vazia.</span></div>}
    {pending.length > 0 && <div><h4 className="pk-sec">O que falta</h4><div className="cl-todo">{pending.map(row => <div className="r" key={row.key}><span aria-hidden="true">○</span><div>
      {reqLabel(row)} {row.kind === 'level' || row.kind === 'skill' ? row.need : reqValue(row).split('/')[1] ?? row.need} · atual {row.have === null ? 'em breve' : row.kind === 'counter' ? reqValue(row).split('/')[0] : row.have}
      {row.kind === 'skill' && <> · {row.training ? `faltam ~${formatEta(row.eta ?? Infinity)}` : 'parado'}</>}
      <small>Como treinar: {row.howTo}</small></div></div>)}</div></div>}
    {playable && pv.stats.length > 0 && <div><h4 className="pk-sec">O que muda</h4><div className="cl-delta">{pv.stats.map(s => {
      const diff = s.after - s.before, cls = Math.abs(diff) < 1e-9 ? 'eq' : diff > 0 ? 'up' : 'dn';
      return <div key={s.key} className={`cl-drow ${cls}`}><span>{statNames[s.key]}</span><span className="a">{fmtStat(s.key, s.before)}</span><span className="ar">→</span><span className="b">{cls === 'up' ? '▲ ' : cls === 'dn' ? '▼ ' : ''}{fmtStat(s.key, s.after)}</span></div>;
    })}</div></div>}
    {playable && (pv.kitSpells.length > 0 || pv.nodeSpells.length > 0) && <div><h4 className="pk-sec">Magias</h4>
      <div className="cl-spells">{[...pv.kitSpells, ...pv.nodeSpells].map(n => <span key={n} className="pk-chip">{n}</span>)}</div>
      <p className="cl-note">Trocam as do Squire; as elementais equipadas ficam.</p></div>}
    {passive && <div><h4 className="pk-sec">Passiva</h4><div className="cl-passive"><span className="pk-tag ok">Ativa</span><div><b>{passive.name}</b><br /><small className="muted">{passive.description}</small></div></div></div>}
    <div><h4 className="pk-sec">Treino</h4><AffinityStrip affinity={pv.affinity} /></div>
    {pv.talentTree && <div className="cl-passive"><Icon name="stat_xp" size={24} /><span>Abre uma <b>grade de talentos de {pv.talentTree.nodes} nós</b>.{pv.talentTree.freePoints > 0 ? ` Seus ${pv.talentTree.freePoints} pontos livres continuam valendo.` : ''}</span></div>}
  </aside>;
}

export function NextTab({ state, character }: { state: GameState; character: Character }) {
  const groups = groupClasses(character), [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null), [confirming, setConfirming] = useState(false), [error, setError] = useState<string>();
  const evolveBtn = useRef<HTMLElement | null>(null), refs = useRef(new Map<string, HTMLElement | null>());
  const all = [...groups.ready, ...groups.progress, ...groups.readySoon, ...groups.soon];
  const defaultId = (groups.ready[0] ?? groups.progress[0] ?? groups.readySoon[0] ?? groups.soon[0])?.node.id ?? null;
  const [lastChar, setLastChar] = useState(character.id);
  useEffect(() => { if (lastChar !== character.id) { setLastChar(character.id); setSelected(null); setConfirming(false); } }, [character.id, lastChar]);
  const current = all.find(s => s.node.id === selected) ?? all.find(s => s.node.id === defaultId);
  const keep = (s: Step) => filter === 'all' || (filter === 'ready' ? s.progress.ready : s.playable);
  const visible = (list: Step[]) => list.filter(keep);
  const flat = [...visible(groups.ready), ...visible(groups.progress), ...visible(groups.readySoon), ...visible(groups.soon)];
  const tabbable = current && flat.some(s => s.node.id === current.node.id) ? current.node.id : flat[0]?.node.id;
  const onKey = (index: number) => (event: KeyboardEvent) => {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? flat.length - 1 : step ? Math.max(0, Math.min(flat.length - 1, index + step)) : -1;
    if (target < 0) return;
    event.preventDefault(); const next = flat[target]; setSelected(next.node.id); refs.current.get(next.node.id)?.focus();
  };
  const tier = CLASS_BY_ID[character.profile.classId].tier;
  if (tier >= 2 || !all.length) {
    return <div><PathPanel character={character} />
      <div className="pk-panel" style={{ padding: 14, marginTop: 12 }}><h4 className="pk-sec">Fim do caminho</h4>
        <p>{pathNames(character).join(' → ')}</p>
        {NODE_PASSIVES[character.profile.classId] && <div className="cl-passive"><span className="pk-tag ok">Ativa</span><div><b>{NODE_PASSIVES[character.profile.classId].name}</b><br /><small className="muted">{NODE_PASSIVES[character.profile.classId].description}</small></div></div>}
        <div style={{ margin: '10px 0' }}><AffinityStrip affinity={previewEvolution(state, character, character.profile.classId).affinity} /></div>
        <button type="button" className="pk-btn" onClick={() => uiStore.setTab('Árvore completa')}>Ver árvore completa</button></div></div>;
  }
  const ready = groups.ready.length + groups.readySoon.length, playable = groups.ready.length + groups.progress.length;
  const card = (s: Step, index: number, mini: boolean) => {
    const sel = current?.node.id === s.node.id;
    const common = { role: 'option' as const, 'aria-selected': sel, 'aria-label': ariaFor(s), tabIndex: s.node.id === tabbable ? 0 : -1, ref: (el: HTMLElement | null) => { refs.current.set(s.node.id, el); }, onClick: () => setSelected(s.node.id), onKeyDown: onKey(index) };
    if (mini) {
      const row = s.progress.bottleneck ? requirementRows(character, s.node).find(r => r.label === s.progress.bottleneck) : undefined;
      return <button type="button" key={s.node.id} {...common} className={`pk-panel flat cl-mini ${sel ? 'sel' : ''}`}><ClassIcon node={s.node} size="sm" />
        <div><div className="cl-name">{s.node.name}</div><div className="cl-spec">{s.node.specialty ?? subclassKind(s.node)}</div></div>
        <div className="cl-bar"><div className={`pk-bar thin ${s.progress.ready ? 'ok' : 'xp'}`}><i style={{ width: `${s.progress.ratio * 100}%` }} /></div><small className="muted pk-tiny">{s.progress.ready ? 'requisitos ok' : row ? `${reqLabel(row)} ${reqValue(row)}` : ''}</small></div>
        <span className="pk-tag" style={{ ['--tc' as string]: '#e0a05c' }}>🔒 Em breve</span></button>;
    }
    return <button type="button" key={s.node.id} {...common} className={`pk-panel cl-card ${sel ? 'sel' : ''} ${s.progress.ready ? 'ready' : ''}`}>
      <ClassIcon node={s.node} />
      <div style={{ minWidth: 0 }}><div className="cl-name">{s.node.name}</div><div className="cl-spec">{s.node.specialty ?? subclassKind(s.node)}</div>
        {s.node.tier === 2 && <div className="cl-tags"><span className="pk-tag afim">{subclassKind(s.node)}</span></div>}
        <ReqBars character={character} node={s.node} /></div>
      {s.progress.ready && <span className="pk-tag ok cl-badge">Pronta</span>}
    </button>;
  };
  let idx = 0;
  const group = (title: string, note: string, list: Step[], mini: boolean, grid: boolean) => list.length ? <div className="cl-group" role="group" aria-label={title}>
    <h4 className="pk-sec">{title} <small>{note}</small></h4>
    {grid ? <div className="cl-grid">{list.map(s => card(s, idx++, false))}</div> : <div className="cl-minis">{list.map(s => card(s, idx++, mini))}</div>}</div> : null;
  const confirm = () => {
    setError(undefined);
    if (!current) return;
    const name = character.name, target = current.node.name;
    if (gameStore.evolve(character.id, current.node.id)) { setConfirming(false); setSelected(null); toastStore.push('good', gameStore.getSnapshot().message || `${name} evoluiu para ${target}`); }
    else setError(gameStore.getSnapshot().message || 'Não foi possível evoluir.');
  };
  const pv = current ? previewEvolution(state, character, current.node.id) : undefined;
  return <div id="p-next" className="cl-pane on" style={{ position: 'relative' }}>
    <div className="cl-top"><PathPanel character={character} /><div className="cl-lock">🔒 <span>Evoluir é definitivo. As outras classes viram caminhos descartados.</span></div></div>
    <div className="cl-layout">
      <div className="cl-left">
        <div className="cl-filters" role="group" aria-label="Filtro">{([['all', 'Todas', all.length], ['ready', 'Prontas', ready], ['playable', 'Jogáveis', playable]] as const).map(([id, label, n]) =>
          <button type="button" key={id} className={`pk-btn sm ${filter === id ? 'on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<span className="n">{n}</span></button>)}</div>
        <div role="listbox" aria-label="Classes">
          {group('Prontas para evoluir', 'requisitos cumpridos', visible(groups.ready), false, true)}
          {group('Em progresso', 'ordenadas pelo que falta menos', visible(groups.progress), false, true)}
          {group('Requisitos cumpridos, kit em breve', 'a evolução fica bloqueada até existir o kit', visible(groups.readySoon), true, false)}
          {group('Em breve', `${visible(groups.soon).length} classes sem kit`, visible(groups.soon), true, false)}
        </div>
        {!flat.length && <p className="empty-state">Nenhuma classe neste filtro.</p>}
      </div>
      {current && <Preview state={state} character={character} step={current} onEvolve={() => { evolveBtn.current = document.activeElement as HTMLElement; setConfirming(true); }} />}
    </div>
    {confirming && current && pv && <ConfirmDialog title={`Evoluir ${character.name} para ${current.node.name}?`} labelledBy="evolve-title" confirmLabel="Confirmar evolução" error={error}
      onCancel={() => { setConfirming(false); setError(undefined); setTimeout(() => evolveBtn.current?.focus(), 0); }} onConfirm={confirm}>
      <ul>
        {pv.stats.length > 0 && <li>{pv.stats.filter(s => ['maxHp', 'attack', 'defense'].includes(s.key)).map(s => `${statNames[s.key]} ${Math.round(s.before)} → ${Math.round(s.after)}`).join(', ')}</li>}
        {(pv.kitSpells.length > 0 || pv.nodeSpells.length > 0) && <li>Magias: {[...pv.kitSpells, ...pv.nodeSpells].join(', ')}</li>}
        {pv.talentTree && <li>Abre a grade de talentos ({pv.talentTree.nodes} nós).</li>}
        <li><b>Não há volta:</b> as outras {pv.lostOptions} classes ficam bloqueadas para sempre neste personagem.</li>
      </ul></ConfirmDialog>}
  </div>;
}
