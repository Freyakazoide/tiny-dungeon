import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Character, GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { CLASSES } from '../game/data/classes';
import { CLASS_BY_ID } from '../game/rpg/classTree';
import { CATEGORY_NAMES, EFFECTS, TALENT_TREES, type EffectCategory, type TalentNodeDef } from '../game/data/talentTrees';
import { classLabel } from '../game/systems/progression';
import { canBuy, effectLabel, formatEffectValue, investedPoints, nodeInPath, rankOf, talentPointsAvailable, talentRespecCost, talentTotals } from '../game/systems/talentGrid';
import { colorHex } from './format';
import { Icon } from './components/Icon';
import { MECHANICS_DONE } from '../game/systems/mechanics';

/** Cor de cada categoria de efeito (igual à referência: ofensa vermelho, vida verde, defesa azul, especial rosa, utilidade âmbar, treino ciano). */
const CATEGORY_COLORS: Record<EffectCategory, string> = { offense: '#e05a5a', life: '#3fb970', guard: '#4b80e6', special: '#e05ac8', utility: '#d9a63f', train: '#3cc4c4' };
const ROOT_COLOR = '#d9a63f', KEYSTONE_COLOR = '#ff6fd0';
const KIND_NAMES = { root: 'Origem', minor: 'Minor', notable: 'Notable', major: 'Major', keystone: 'Keystone' } as const;
/** Lado do nó quadrado (Fase 9): Minor 40, Notable 48, Major 54, Keystone 62, Origem 40. */
const SIZE = { root: 40, minor: 40, notable: 48, major: 54, keystone: 62 } as const;
const CATEGORY_ICONS: Record<EffectCategory, string> = { offense: 'stat_attack', life: 'stat_hp', guard: 'stat_defense', special: 'stat_crit', utility: 'stat_gold', train: 'stat_xp' };
/** Ícone do efeito: elemento/proficiência quando o código é dela; senão o da categoria. */
export function nodeIcon(node: TalentNodeDef) {
  if (node.kind === 'root') return 'stat_xp';
  const code = node.effects[0]?.code ?? '';
  const base = code.replace(/^(e|t)_/, '');
  if (['melee', 'ranged', 'defense', 'magic'].includes(base)) return `prof_${base}`;
  if (base === 'focus') return 'stat_magic';
  if (/^(e|t)_/.test(code)) return `elem_${base}`;
  return CATEGORY_ICONS[EFFECTS[code]?.category ?? 'utility'];
}
const DX = 66, DY = 68, PAD = 46;

const nodeColor = (node: TalentNodeDef) =>
  node.kind === 'root' ? ROOT_COLOR : node.kind === 'keystone' ? KEYSTONE_COLOR : node.kind === 'major' ? ROOT_COLOR : CATEGORY_COLORS[EFFECTS[node.effects[0]?.code]?.category ?? 'utility'];
const nodeCategory = (node: TalentNodeDef) => (node.kind === 'root' ? 'Origem' : CATEGORY_NAMES[EFFECTS[node.effects[0]?.code]?.category ?? 'utility']);
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Confirmation = { kind: 'buy'; id: string } | { kind: 'respec'; treeId?: string } | null;
interface View { x: number; y: number; k: number; }
const HOME: View = { x: 0, y: 0, k: 1 };

function TalentCanvas({ character, treeId, selectedId, onSelect, query }: {
  character: Character; treeId: string; selectedId: string | null; query: string;
  onSelect: (id: string) => void;
}) {
  const tree = TALENT_TREES[treeId];
  const maxY = Math.max(...tree.nodes.map(n => n.y));
  const width = 6 * DX + PAD * 2, height = maxY * DY + PAD * 2;
  const pos = (node: TalentNodeDef) => ({ cx: PAD + node.x * DX, cy: PAD + (maxY - node.y) * DY });
  const byId = useMemo(() => new Map(tree.nodes.map(n => [n.id, n])), [tree]);
  const [view, setView] = useState<View>(HOME);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, pinch: 0 });
  useEffect(() => setView(HOME), [treeId]);
  // A roda precisa de um listener não passivo para não rolar a página junto com o zoom.
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect(), px = event.clientX - rect.left, py = event.clientY - rect.top;
      setView(v => { const k = Math.min(3, Math.max(.6, v.k * (event.deltaY < 0 ? 1.12 : 1 / 1.12))); const f = k / v.k; return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f }; });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);
  const down = (event: ReactPointerEvent) => { pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); gesture.current = { moved: false, pinch: 0 }; };
  const move = (event: ReactPointerEvent) => {
    const previous = pointers.current.get(event.pointerId); if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (gesture.current.pinch) { const f = distance / gesture.current.pinch; setView(v => ({ ...v, k: Math.min(3, Math.max(.6, v.k * f)) })); }
      gesture.current = { moved: true, pinch: distance }; return;
    }
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    if (Math.abs(dx) + Math.abs(dy) > 0) { if (Math.hypot(dx, dy) > 1) gesture.current.moved = true; setView(v => ({ ...v, x: v.x + dx, y: v.y + dy })); }
  };
  const up = (event: ReactPointerEvent) => { pointers.current.delete(event.pointerId); };
  const highlighted = (node: TalentNodeDef) => !!query && node.effects.some(e => normalize(`${effectLabel(e.code)} ${e.code}`).includes(query));
  const nodeState = (node: TalentNodeDef) => {
    const rank = rankOf(character, node.id);
    return rank >= node.maxRank && node.kind !== 'root' ? 'maxed' : rank > 0 ? 'acquired' : canBuy(character, node.id).ok ? 'available' : 'locked';
  };
  return <svg ref={svgRef} className="tgrid-svg" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Grade de talentos: ${tree.name}`}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
    <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
      {tree.nodes.flatMap(node => node.parents.map(parentId => {
        const parent = byId.get(parentId)!, a = pos(parent), b = pos(node);
        const lit = rankOf(character, node.id) >= 1 && rankOf(character, parentId) >= 1;
        return <line key={`${parentId}>${node.id}`} className={`tgrid-edge ${lit ? 'lit' : ''}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} />;
      }))}
      {tree.nodes.map(node => {
        const { cx, cy } = pos(node), side = SIZE[node.kind], r = side / 2, rank = rankOf(character, node.id), status = nodeState(node), color = nodeColor(node);
        const dimmed = !!query && !highlighted(node);
        const big = node.kind === 'major' || node.kind === 'keystone' || node.kind === 'root';
        return <g key={node.id} className={`tgrid-node ${status} ${node.kind} ${selectedId === node.id ? 'selected' : ''} ${highlighted(node) ? 'match' : ''}`} style={{ '--node-color': color, opacity: dimmed ? .25 : undefined } as CSSProperties}
          role="button" tabIndex={0} aria-label={`${node.name}, ${rank} de ${node.maxRank}`}
          onClick={() => { if (gesture.current.moved) return; onSelect(node.id); }}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); } }}>
          <title>{node.name}</title>
          <rect className="tgrid-ring" x={cx - r} y={cy - r} width={side} height={side} />
          <rect className="tgrid-core" x={cx - r + 4} y={cy - r + 4} width={side - 8} height={side - 8} />
          {(node.kind === 'major' || node.kind === 'keystone') && <rect className="tgrid-frame" x={cx - r - 3} y={cy - r - 3} width={side + 6} height={side + 6} />}
          <image href={`assets/ui/icons/${nodeIcon(node)}.png`} x={cx - (big ? 24 : 12)} y={cy - (big ? 24 : 12)} width={big ? 48 : 24} height={big ? 48 : 24} style={{ imageRendering: 'pixelated' }} />
          {(rank > 0 && node.kind !== 'root' || selectedId === node.id) && node.kind !== 'root' && <g className="tgrid-rankseal"><rect x={cx + r - 14} y={cy + r - 8} width={22} height={13} /><text className="tgrid-rank" x={cx + r - 3} y={cy + r + 2} textAnchor="middle">{rank}/{node.maxRank}</text></g>}
          {node.kind !== 'minor' && node.kind !== 'root' && <text className="tgrid-name" x={cx} y={cy - r - 7} textAnchor="middle">{node.name}</text>}
        </g>;
      })}
    </g>
  </svg>;
}

function NodeDetail({ character, node, gold, confirmation, setConfirmation }: { character: Character; node: TalentNodeDef; gold: number; confirmation: Confirmation; setConfirmation: (value: Confirmation) => void }) {
  const rank = rankOf(character, node.id), check = canBuy(character, node.id), totals = talentTotals(character);
  const color = nodeColor(node), mechanicReady = !!node.mechanic && MECHANICS_DONE.has(node.mechanic.id);
  const confirming = confirmation?.kind === 'buy' && confirmation.id === node.id;
  const needsConfirm = node.kind === 'major' || node.kind === 'keystone';
  const buy = () => { if (needsConfirm && !confirming) setConfirmation({ kind: 'buy', id: node.id }); else { gameStore.invest(character.id, node.id); setConfirmation(null); } };
  void gold;
  return <div className="tgrid-detail ch-detail pk-panel" style={{ '--node-color': color } as CSSProperties} onKeyDown={event => { if (event.key === 'Enter' && event.target === event.currentTarget && check.ok && rank < node.maxRank && node.kind !== 'root') { event.preventDefault(); buy(); } }} tabIndex={-1}>
    <div className="talent-detail-title"><span className="tgrid-badge" aria-hidden="true" /><div><span>{KIND_NAMES[node.kind]} · {nodeCategory(node)}</span><h3>{node.name}</h3><small>{node.kind === 'root' ? 'Concedida ao entrar na classe' : `Rank ${rank} / ${node.maxRank} · ${node.costPerRank} ${node.costPerRank === 1 ? 'ponto' : 'pontos'} por rank`}</small></div></div>
    {node.effects.length > 0 && <dl className="talent-facts">{node.effects.map(effect => <div key={effect.code}><dt>{effectLabel(effect.code)}</dt>
      <dd>{formatEffectValue(effect.code, effect.perRank)} por rank{rank > 0 && <> · <b>{formatEffectValue(effect.code, effect.perRank * rank)}</b> aqui</>} · total {formatEffectValue(effect.code, totals[effect.code] ?? 0)}</dd></div>)}</dl>}
    {node.mechanic && <p className="tgrid-mechanic"><b>Mecânica{mechanicReady ? '' : ' · Em breve'}:</b> {node.mechanic.text}{!mechanicReady && <small> O bônus numérico já vale; a mecânica entra em uma fase futura.</small>}</p>}
    {node.kind !== 'root' && rank < node.maxRank && !check.ok && <ul className="tgrid-missing">{check.reasons.map(reason => <li key={reason}>✖ {reason}</li>)}</ul>}
    {node.kind !== 'root' && rank >= node.maxRank && <p className="talent-status-note success">Rank máximo.</p>}
    {node.kind !== 'root' && rank < node.maxRank && (confirming
      ? <div className="talent-confirm"><p>Investir {node.costPerRank} pontos em <b>{node.name}</b>?</p><div><button onClick={() => setConfirmation(null)}>Cancelar</button><button className="primary" onClick={buy}>Confirmar</button></div></div>
      : <div className="tgrid-actions"><button className="talent-invest pk-btn primary" disabled={!check.ok} onClick={buy}>Comprar +1 rank</button>
        {node.maxRank > 1 && <button disabled={!check.ok} onClick={() => { gameStore.invest(character.id, node.id, true); setConfirmation(null); }}>Comprar tudo o que der</button>}</div>)}
  </div>;
}

export function TalentsPanel({ state, selected, setSelected }: { state: GameState; selected: string; setSelected: (id: string) => void }) {
  const character = state.characters.find(entry => entry.id === selected) ?? state.characters[0];
  const path = character.profile.classPath.filter(id => id in TALENT_TREES);
  const [pick, setPick] = useState(character.profile.classId);
  const treeId = path.includes(pick) ? pick : character.profile.classId;
  const tree = TALENT_TREES[treeId];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [search, setSearch] = useState('');
  useEffect(() => { setPick(character.profile.classId); }, [character.id, character.profile.classId]);
  useEffect(() => { setSelectedId(null); setConfirmation(null); }, [character.id, treeId]);
  const query = normalize(search.trim());
  const available = talentPointsAvailable(character), spent = investedPoints(character), treeSpent = investedPoints(character, treeId);
  const totals = talentTotals(character);
  const selectedNode = selectedId ? tree.nodes.find(n => n.id === selectedId) : undefined;
  const classDef = CLASSES[character.classId];
  const bonuses = Object.entries(totals).sort(([a], [b]) => (EFFECTS[a]?.category ?? '').localeCompare(EFFECTS[b]?.category ?? '') || a.localeCompare(b));
  const futureTiers = ([1, 2] as const).filter(t => !path.some(id => TALENT_TREES[id].tier === t));
  const respecScope = confirmation?.kind === 'respec' ? confirmation.treeId : undefined;
  const respecInvested = investedPoints(character, respecScope), respecCost = talentRespecCost(character, respecScope);
  return <section className="talents-panel" style={{ '--class-color': colorHex(classDef.color) } as CSSProperties}>
    <div className="section-heading"><div><span className="eyebrow">Especialização</span><h2>Grade de talentos</h2></div><div className="talent-currency"><span>Pontos disponíveis</span><b>✦ {available}</b><small>{spent} gastos</small></div></div>
    <div className="talent-character-tabs" role="list" aria-label="Personagens">{state.characters.map(entry => <button key={entry.id} className={entry.id === character.id ? 'active' : ''} onClick={() => setSelected(entry.id)}><span style={{ background: colorHex(CLASSES[entry.classId].color) }}>{entry.name.slice(0, 1)}</span><b>{entry.name}</b><small>{classLabel(entry)} · Nv. {entry.profile.level}</small><em>✦ {talentPointsAvailable(entry)}</em></button>)}</div>
    <div className="ch-tbar">
      <div className="kit-chips" role="tablist" aria-label="Grades do caminho" style={{ display: 'flex', gap: 4 }}>
        {path.map(id => <button key={id} role="tab" aria-selected={id === treeId} className={`ch-treetab ${id === treeId ? 'on' : ''}`} onClick={() => setPick(id)}><Icon name={id === 'squire' ? 'stat_xp' : 'classes'} size={24} />{CLASS_BY_ID[id].name} <span className="n">{investedPoints(character, id)}/{TALENT_TREES[id].totalCost}</span></button>)}
        {futureTiers.map(t => <button key={t} role="tab" aria-selected={false} disabled className="ch-treetab locked">Tier {t} · abre ao evoluir</button>)}
      </div>
      <div className="ch-points" title="Pontos de talento livres"><Icon name="stat_xp" size={24} /><span>PONTOS</span><b>{available}</b><small className="muted">{spent} gastos</small></div>
      <input className="ch-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar efeito (ex.: crítico, fogo, tries)" aria-label="Buscar talento por efeito" />
    </div>
    <div className="tgrid-tools"><span className="tgrid-lanes">{Object.entries(tree.lanes).map(([lane, name]) => <em key={lane}>{lane === 'A' ? '◀' : '▶'} {name}</em>)}</span></div>
    <div className="talent-workspace">
      <div className="talent-tree-card pk-panel flat">
        <div className="talent-tree-heading"><div><span className="class-label">{tree.name} · Tier {tree.tier}</span><h3>{tree.nodeCount} nós · {treeSpent}/{tree.totalCost} pontos</h3></div><small>Arraste para mover, role ou use pinça para dar zoom. São escolhas: não dá para completar tudo.</small></div>
        <TalentCanvas character={character} treeId={treeId} selectedId={selectedId} query={query} onSelect={id => { setSelectedId(id); if (confirmation?.kind === 'buy' && confirmation.id !== id) setConfirmation(null); }} />
        <div className="talent-legend">{(Object.keys(CATEGORY_COLORS) as EffectCategory[]).map(cat => <span key={cat}><i style={{ background: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }} />{CATEGORY_NAMES[cat]}</span>)}<span><i className="ring-gold" />Major</span><span><i className="ring-pink" />Keystone</span></div>
      </div>
      <aside className="talent-detail-card pk-panel flat">
        {selectedNode && nodeInPath(character, selectedNode.id)
          ? <NodeDetail character={character} node={selectedNode} gold={state.gold} confirmation={confirmation} setConfirmation={setConfirmation} />
          : <p className="tgrid-hint">Clique em um nó para ver o efeito, o custo e o que falta. Compre pelo botão <b>Comprar</b> no painel ao lado.</p>}
        <div className="tgrid-bonuses"><h4>Bônus ativos</h4>{bonuses.length
          ? <ul>{bonuses.map(([code, value]) => <li key={code} style={{ '--node-color': CATEGORY_COLORS[EFFECTS[code]?.category ?? 'utility'] } as CSSProperties}><span>{effectLabel(code)}</span><b>{formatEffectValue(code, value)}</b></li>)}</ul>
          : <small>Nenhum ainda.</small>}</div>
        <div className="respec-box"><div><span>Redistribuição</span><b>{spent} {spent === 1 ? 'ponto investido' : 'pontos investidos'}</b><small>Custo: 25 × pontos^1,6 em ouro · Saldo: {state.gold}</small></div>
          {confirmation?.kind === 'respec'
            ? <div className="talent-confirm"><p>Devolver {respecInvested} pontos de {respecScope ? tree.name : 'todas as grades'} e pagar <b>{respecCost} ouro</b>? As Origens ficam.</p>{state.gold < respecCost && <small>Ouro insuficiente para redistribuir.</small>}<div><button onClick={() => setConfirmation(null)}>Cancelar</button><button className="danger" disabled={state.gold < respecCost || !respecInvested} onClick={() => { gameStore.respecTalents(character.id, respecScope); setConfirmation(null); }}>Redistribuir</button></div></div>
            : <div className="tgrid-actions"><button disabled={!treeSpent} onClick={() => setConfirmation({ kind: 'respec', treeId })}>Zerar esta grade ({talentRespecCost(character, treeId)} ouro)</button><button disabled={!spent} onClick={() => setConfirmation({ kind: 'respec' })}>Zerar tudo ({talentRespecCost(character)} ouro)</button></div>}
        </div>
      </aside>
    </div>
  </section>;
}
