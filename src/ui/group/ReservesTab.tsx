import { useEffect, useRef, useState } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { NAME_LIMIT, ROSTER_LIMIT } from '../../game/core/GameEngine';
import { CLASSES } from '../../game/data/classes';
import { classItem } from '../../game/data/classItems';
import { itemById } from '../../game/data/items';
import { STARTER_ELEMENTS, STARTER_WEAPONS } from '../../game/data/starter';
import { defaultLookFor, type Look } from '../../game/art/look';
import { PROFICIENCIES } from '../../game/rpg/proficiencies';
import { characterStats, classLabel, xpForLevel } from '../../game/systems/progression';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { colorHex } from '../format';
import { profIcon } from '../RpgPanels';
import { GoalPicker } from '../GoalPicker';
import { GOAL_PLAN } from '../../game/rpg/goals';
import { AppearancePicker } from '../AppearancePicker';
import { ConfirmDialog } from '../classes/parts';

const bar = (tone: string, value: number, max: number) => <div className={`pk-bar thin ${tone}`}><i style={{ width: `${Math.max(0, Math.min(100, max ? value / max * 100 : 0))}%` }} /></div>;

function RosterCard({ character, state, onDismiss }: { character: Character; state: GameState; onDismiss: (c: Character) => void }) {
  const inTeam = state.team.includes(character.id), full = state.team.length >= 4, stats = characterStats(character, state);
  const [renaming, setRenaming] = useState(false), [name, setName] = useState(character.name), [swap, setSwap] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!swap) return; const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setSwap(false); }; document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click); }, [swap]);
  const weapon = character.gear.weapon ? classItem(character.gear.weapon.baseId)?.name : itemById(character.equipment.weapon ?? '')?.name;
  const rename = () => { if (name.trim()) { gameStore.rename(character.id, name); setRenaming(false); } };
  return <article className={`pk-panel gp-rcard ${inTeam ? 'in' : ''}`} role="listitem" aria-label={`${character.name}, ${classLabel(character)} nível ${character.profile.level}, ${inTeam ? 'na equipe' : 'reserva'}`} style={{ ['--cc' as string]: colorHex(CLASSES[character.classId].color) }}>
    <span className="gp-av"><Avatar character={character} size={32} /></span>
    <div style={{ minWidth: 0 }}>
      {renaming
        ? <div className="pk-row"><input aria-label={`Novo nome de ${character.name}`} value={name} maxLength={NAME_LIMIT} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') { e.stopPropagation(); setRenaming(false); } }} autoFocus /><button type="button" className="pk-btn sm primary" onClick={rename}>Salvar</button></div>
        : <div className="gp-name">{character.name}<span className={`pk-tag ${inTeam ? 'ok' : 'afim'}`}>{inTeam ? 'Na equipe' : 'Reserva'}</span>{character.isTank && <span className="pk-tag esp">★ Tanque</span>}</div>}
      <div className="gp-sub">{classLabel(character)} · Nv {character.profile.level} · {character.row === 'front' ? 'Frente' : 'Trás'} · {weapon ?? 'sem arma'}</div>
      <div className="gp-offl">Treino offline: {([0, 1] as const).map(slot => { const id = character.profile.offlineTargets[slot]; return id ? <span key={slot} className="pk-chip"><Icon name={profIcon(id)} size={24} />{PROFICIENCIES[id].name}</span> : <span key={slot} className="pk-chip muted">vaga livre</span>; })}</div>
    </div>
    <div className="gp-mini" style={{ width: 150 }}>{bar('hp', character.hp, stats.maxHp)}{bar('mp', character.mana, stats.maxMana)}{bar('xp', character.profile.xp, xpForLevel(character.profile.level))}</div>
    <div className="gp-actions" style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch' }} ref={ref}>
      {inTeam
        ? <button type="button" className="pk-btn sm" disabled={state.team.length <= 1} title={state.team.length <= 1 ? 'A equipe precisa de ao menos 1 personagem' : undefined} onClick={() => gameStore.toggleTeam(character.id)}>Tirar da equipe</button>
        : full
          ? <><button type="button" className="pk-btn sm primary" aria-expanded={swap} onClick={() => setSwap(!swap)}>Trocar com…</button>
              {swap && <div className="pk-tip" role="dialog" aria-label={`Trocar ${character.name} com`} style={{ right: 0, top: '100%', display: 'block', width: 200 }}><div className="h">Sai da equipe</div>
                <div className="pk-row" style={{ flexDirection: 'column' }}>{state.team.map(id => { const m = state.characters.find(c => c.id === id)!; return <button type="button" key={id} className="pk-btn sm" onClick={() => { gameStore.swapTeamMember(id, character.id); setSwap(false); }}>{m.name}</button>; })}</div></div>}</>
          : <button type="button" className="pk-btn sm primary" onClick={() => gameStore.toggleTeam(character.id)}>Adicionar à equipe</button>}
      <div className="pk-row"><button type="button" className="pk-btn sm" onClick={() => { setName(character.name); setRenaming(!renaming); }}>Renomear</button>
        <button type="button" className="pk-btn sm" onClick={() => onDismiss(character)} disabled={state.characters.length <= 1}>Dispensar</button></div>
    </div>
  </article>;
}

const WEAPON_NOTE = { melee: 'Melee · frente', ranged: 'Ranged · trás' } as const;

function RecruitPanel({ state }: { state: GameState }) {
  const [name, setName] = useState(''), [weaponId, setWeaponId] = useState<string>(STARTER_WEAPONS[0].id), [element, setElement] = useState(STARTER_ELEMENTS[0]), [look, setLook] = useState<Look>(() => defaultLookFor(state.characters.length)), [goal, setGoal] = useState<string>();
  const clean = name.trim(), full = state.characters.length >= ROSTER_LIMIT, dup = state.characters.some(c => c.name.toLowerCase() === clean.toLowerCase());
  const reason = full ? `Elenco cheio (${ROSTER_LIMIT}/${ROSTER_LIMIT}).` : !clean ? 'Escolha um nome.' : dup ? 'Já existe um personagem com esse nome.' : undefined;
  return <aside className="pk-panel gp-recruit" aria-label="Recrutar"><h4 className="pk-sec">Recrutar Squire <small>{state.characters.length}/{ROSTER_LIMIT}</small></h4>
    <label className="gp-field">Nome<input type="text" aria-label="Nome do novo Squire" maxLength={NAME_LIMIT} value={name} onChange={e => setName(e.target.value)} /></label>
    <div className="gp-field">Classe futura<GoalPicker label="Classe futura do novo Squire" value={goal} onChange={g => { setGoal(g); if (g) { setWeaponId(GOAL_PLAN[g].weaponId); setElement(GOAL_PLAN[g].element); } }} /></div>
    <div className="gp-field">Arma inicial<div className="gp-weapons">{STARTER_WEAPONS.map(w => { const item = itemById(w.id); return <button type="button" key={w.id} className={`pk-btn gp-weapon ${weaponId === w.id ? 'on' : ''}`} aria-pressed={weaponId === w.id} onClick={() => setWeaponId(w.id)}>
      <span className="b"><Icon name={w.trains === 'ranged' ? 'prof_ranged' : 'slot_weapon'} size={24} /></span><span><b>{item?.name ?? w.id}</b><br />{WEAPON_NOTE[w.trains]}</span></button>; })}</div></div>
    <div className="gp-field">Elemento inicial<div className="gp-elems">{STARTER_ELEMENTS.map(el => <button type="button" key={el} className={`pk-btn gp-elem ${element === el ? 'on' : ''}`} aria-pressed={element === el} aria-label={PROFICIENCIES[el].name} title={PROFICIENCIES[el].name} onClick={() => setElement(el)}><Icon name={`elem_${el}`} size={24} /></button>)}</div></div>
    <div className="gp-field">Aparência<AppearancePicker value={look} onChange={setLook} restore={defaultLookFor(state.characters.length)} label="Aparência do novo Squire" /></div>
    <p className="muted pk-tiny">Começa no nível 1 como Squire e entra como reserva.</p>
    {reason && <div className="gp-warnline">⚠ {reason}</div>}
    <button type="button" className="pk-btn primary" disabled={!!reason} onClick={() => { if (gameStore.recruit({ name: clean, weaponId, element, look, goal })) { setGoal(undefined); setName(''); } }}>Recrutar Squire</button>
  </aside>;
}

export function ReservesTab({ state }: { state: GameState }) {
  const [dismissing, setDismissing] = useState<Character | null>(null), [error, setError] = useState<string>();
  const close = () => { setDismissing(null); setError(undefined); };
  const confirm = () => {
    if (!dismissing) return;
    if (gameStore.dismiss(dismissing.id)) close(); else setError(gameStore.getSnapshot().message || 'Não foi possível dispensar.');
  };
  const ordered = [...state.characters].sort((a, b) => Number(state.team.includes(b.id)) - Number(state.team.includes(a.id)));
  return <div className="gp-pane on" style={{ position: 'relative' }}><div className="gp-layout">
    <div className="gp-main">
      <div className="gp-cap"><h4 className="pk-sec" style={{ margin: 0 }}>Personagens</h4><span className="pk-tag ok">Equipe {state.team.length}/4</span><span className="pk-tag afim">Personagens {state.characters.length}/{ROSTER_LIMIT}</span></div>
      <div className="gp-roster" role="list">{ordered.map(c => <RosterCard key={c.id} character={c} state={state} onDismiss={x => { setError(undefined); setDismissing(x); }} />)}
        {state.characters.length < ROSTER_LIMIT && <div className="gp-empty">Vaga livre de personagem ({state.characters.length} de {ROSTER_LIMIT})</div>}</div>
    </div>
    <div className="gp-side"><RecruitPanel state={state} /></div>
    {dismissing && <ConfirmDialog title={`Dispensar ${dismissing.name}?`} labelledBy="dismiss-title" confirmLabel="Confirmar" error={error} onCancel={close} onConfirm={confirm}>
      <ul><li>{dismissing.name} sai do jogo <b>para sempre</b>.</li><li>O equipamento volta para as mochilas, se houver espaço.</li><li>Talentos, nível e treino <b>não são recuperados</b>.</li></ul></ConfirmDialog>}
  </div></div>;
}
