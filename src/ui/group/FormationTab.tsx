import { useState, type DragEvent, type KeyboardEvent } from 'react';
import type { Character, CharacterRow, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { HUNT_BY_ID } from '../../game/data/hunts';
import { classItem } from '../../game/data/classItems';
import { itemById } from '../../game/data/items';
import { PROFICIENCIES } from '../../game/rpg/proficiencies';
import { aggroShares, meleeInBackRow } from '../../game/systems/combat';
import { elementCoverage, groupAlerts, groupPower, rolesOf, suggestFormation, type FixAction, type GroupAlert } from '../../game/systems/group';
import { characterStats, classLabel, elementFocus } from '../../game/systems/progression';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { colorHex, compact } from '../format';
import { CLASSES } from '../../game/data/classes';
import { uiStore } from '../uiStore';
import { PresetList } from './PresetList';

export const runFix = (action: FixAction) => {
  if (action.type === 'setRow') gameStore.setRow(action.id, action.row);
  else if (action.type === 'setTank') gameStore.setTank(action.id, true);
  else uiStore.setTab('Reservas');
};

const ROWS: { id: CharacterRow; title: string; hint: string }[] = [
  { id: 'front', title: 'Frente', hint: 'corpo a corpo · o tanque recebe a maior parte dos golpes' },
  { id: 'back', title: 'Trás', hint: 'arcos e magias · corpo a corpo aqui causa 50%' },
];
const ICON = { ok: '✔', warn: '⚠', bad: '✖', info: 'ℹ' } as const;

function MemberCard({ character, state, share, onMove }: { character: Character; state: GameState; share: number; onMove: (c: Character, row: CharacterRow) => void }) {
  const stats = characterStats(character, state), other: CharacterRow = character.row === 'front' ? 'back' : 'front';
  const gear = character.gear.weapon && classItem(character.gear.weapon.baseId), weapon = itemById(character.equipment.weapon ?? '');
  const focus = elementFocus(character), roles = rolesOf(character, state);
  const key = (event: KeyboardEvent) => { if (event.key === 'ArrowUp' && character.row !== 'front') { event.preventDefault(); onMove(character, 'front'); } else if (event.key === 'ArrowDown' && character.row !== 'back') { event.preventDefault(); onMove(character, 'back'); } };
  const label = `${character.name}, ${classLabel(character)} nível ${character.profile.level}${character.isTank ? ', tanque' : ''}, ${character.row === 'front' ? 'na frente' : 'atrás'}`;
  return <article className={`pk-panel gp-card ${character.hp <= 0 ? 'down' : ''}`} role="listitem" aria-label={label} tabIndex={0} draggable onKeyDown={key}
    style={{ ['--cc' as string]: colorHex(CLASSES[character.classId].color) }}
    onDragStart={(event: DragEvent) => { event.dataTransfer.setData('text/plain', character.id); event.dataTransfer.effectAllowed = 'move'; }}>
    <div className="gp-top"><span className="gp-av"><Avatar character={character} size={32} /></span>
      <div style={{ minWidth: 0 }}><div className="gp-name">{character.isTank && '★ '}{character.name}</div><div className="gp-sub">{classLabel(character)} · Nv {character.profile.level}</div></div>
      <span className="pk-tag afim">{character.row === 'front' ? 'Frente' : 'Trás'}</span></div>
    <div className="gp-roles">{roles.map(r => <span key={r} className={`pk-tag ${r === 'Tanque' ? 'esp' : 'afim'}`}>{r}</span>)}</div>
    <div className="gp-mini">
      <div className="pk-bar hp" role="progressbar" aria-label="HP" aria-valuenow={Math.round(character.hp)} aria-valuemax={stats.maxHp}><i style={{ width: `${Math.max(0, Math.min(100, character.hp / stats.maxHp * 100))}%` }} /><span className="t">{Math.round(character.hp)} / {stats.maxHp}</span></div>
      <div className="pk-bar mp" role="progressbar" aria-label="Mana" aria-valuenow={Math.round(character.mana)} aria-valuemax={stats.maxMana}><i style={{ width: `${Math.max(0, Math.min(100, character.mana / stats.maxMana * 100))}%` }} /><span className="t">{Math.round(character.mana)} / {stats.maxMana}</span></div></div>
    <div className="gp-line"><span className="pk-chip"><Icon name={weapon?.trains === 'ranged' ? 'prof_ranged' : 'slot_weapon'} size={24} />{gear?.name ?? weapon?.name ?? 'sem arma'}</span>{focus && <span className="pk-chip">Foco {PROFICIENCIES[focus].name}</span>}</div>
    <div className="gp-aggro"><span>Aggro</span><div className="pk-bar thin"><i style={{ width: `${share}%` }} /></div><b>{share}%</b></div>
    {meleeInBackRow(character) && <div className="gp-warnline">⚠ Corpo a corpo atrás: 50% do dano.</div>}
    <div className="gp-actions compact">
      <button type="button" className="pk-btn" onClick={() => onMove(character, other)}>⇄ {other === 'front' ? 'Frente' : 'Trás'}</button>
      <button type="button" className={`pk-btn ${character.isTank ? 'primary' : ''}`} disabled={character.row !== 'front'} title={character.row !== 'front' ? 'O tanque precisa estar na frente' : 'Só um tanque por grupo'} onClick={() => gameStore.setTank(character.id, !character.isTank)}>★ Tanque</button>
      <button type="button" className="pk-btn" aria-label={`Tirar ${character.name} da equipe`} title="Tirar da equipe" disabled={state.team.length <= 1} onClick={() => gameStore.toggleTeam(character.id)}>✕</button>
    </div>
  </article>;
}

export function Alerts({ alerts }: { alerts: GroupAlert[] }) {
  return <div className="gp-alerts" role="list">{alerts.map((a, i) => <div key={`${a.kind}${i}`} className={`gp-alert ${a.level}`} role="listitem"><span className="i" aria-hidden="true">{ICON[a.level]}</span>
    <div><b>{a.title}</b><small>{a.detail}</small></div>{a.fix && <button type="button" className="pk-btn sm" onClick={() => runFix(a.fix!.action)}>{a.fix.label}</button>}</div>)}</div>;
}

export function FormationTab({ state }: { state: GameState }) {
  const team = state.team.map(id => state.characters.find(c => c.id === id)).filter((c): c is Character => !!c);
  const shares = aggroShares(team), power = groupPower(state), alerts = groupAlerts(state), plan = suggestFormation(state);
  const [ignored, setIgnored] = useState<string | null>(null), [announce, setAnnounce] = useState('');
  const hunt = HUNT_BY_ID[state.huntId], cover = elementCoverage(state, state.huntId);
  const move = (c: Character, row: CharacterRow) => { if (c.row === row) return; if (gameStore.setRow(c.id, row)) setAnnounce(`${c.name} movido para ${row === 'front' ? 'a frente' : 'trás'}`); };
  const drop = (row: CharacterRow) => (event: DragEvent) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'), c = team.find(x => x.id === id); if (c) move(c, row); };
  const planKey = plan ? JSON.stringify(plan.moves) : null;
  const kpi = (label: string, value: string, note: string) => <div className="pk-panel gp-kpi"><small>{label}</small><b>{value}</b><em>{note}</em></div>;
  const names = (id: string) => state.characters.find(c => c.id === id)?.name ?? id;
  const real = alerts.filter(a => a.kind !== 'allOk');
  return <div className="gp-pane on"><div className="gp-layout">
    <div className="gp-main">
      <div className="gp-kpis">{kpi('Vida total', power.totalHp ? compact(power.totalHp) : '—', 'soma da equipe')}{kpi('Dano estimado', power.dps ? `${power.dps}/s` : '—', 'considera penalidade de linha')}{kpi('Defesa do tanque', power.tankDefense ? String(power.tankDefense) : '—', power.tankDefense ? 'na linha de frente' : 'sem tanque')}{kpi('Aggro no tanque', power.tankShare ? `${power.tankShare}%` : '—', 'se cair: espalha')}</div>
      <div className="pk-panel gp-board">{ROWS.map(row => {
        const members = team.filter(c => c.row === row.id), share = Math.round(members.reduce((n, c) => n + (shares.get(c.id) ?? 0), 0) * 100);
        return <div className="gp-row" key={row.id} onDragOver={e => e.preventDefault()} onDrop={drop(row.id)}>
          <div className="gp-rowhead"><h3>{row.title}</h3><small>{row.hint}</small><span className="gp-share">recebe {share}% dos golpes</span></div>
          <div className="gp-slots" role="list" aria-label={`Linha de ${row.title.toLowerCase()}`}>
            {members.map(c => <MemberCard key={c.id} character={c} state={state} share={Math.round((shares.get(c.id) ?? 0) * 100)} onMove={move} />)}
            {!members.length && <div className="gp-empty">Ninguém na linha de {row.title.toLowerCase()}. Arraste um cartão para cá.</div>}
            {row.id === 'back' && team.length < 4 && state.characters.length > team.length && <div className="gp-empty">Vaga livre<button type="button" className="pk-btn sm" onClick={() => uiStore.setTab('Reservas')}>+ Adicionar da reserva</button></div>}
          </div></div>;
      })}</div>
      <div aria-live="polite" className="muted pk-tiny" style={{ minHeight: 14 }}>{announce}</div>
    </div>
    <div className="gp-side">
      <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Análise da formação <small>{real.length ? `${real.length} alertas` : 'tudo certo'}</small></h4><Alerts alerts={alerts} /></div>
      <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Cobertura elemental <small>{hunt?.name}</small></h4>
        {cover.length === 0 ? <p className="muted">Sem fraquezas conhecidas.</p> : <div className="gp-cover">{cover.map(c => <div className="gp-crow" key={c.element}><Icon name={`elem_${c.element}`} size={24} />
          <div><b>{PROFICIENCIES[c.element].name}</b> · fraqueza de {c.monsters.join(', ')}<br /><small className="muted">{c.coveredBy.length ? `coberto por ${c.coveredBy.join(', ')}` : `nenhum membro tem magia de ${PROFICIENCIES[c.element].name}`}</small></div>
          <span className={`pk-tag ${c.coveredBy.length ? 'ok' : 'blq'}`}>{c.coveredBy.length ? 'Coberta' : 'Sem cobertura'}</span></div>)}</div>}</div>
      {plan && planKey !== ignored && <div className="pk-panel gp-suggest"><h4 className="pk-sec">Sugerir formação</h4>
        <div className="gp-diff">{plan.moves.map((m, i) => <div className="r" key={i}><span>{names(m.id)}</span><span className="a">{m.row ? (m.row === 'front' ? 'Trás' : 'Frente') : 'Sem tanque'}</span><span>→</span><span className="b">{m.row ? (m.row === 'front' ? 'Frente' : 'Trás') : '★ Tanque'}</span></div>)}</div>
        <small className="muted">{plan.reason.join(' ')}</small>
        <div className="gp-actions"><button type="button" className="pk-btn primary" onClick={() => gameStore.applyFormation(plan)}>Aplicar sugestão</button><button type="button" className="pk-btn" onClick={() => setIgnored(planKey)}>Ignorar</button></div></div>}
      <PresetList state={state} />
    </div>
  </div></div>;
}
