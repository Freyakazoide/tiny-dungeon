import { classItem } from '../game/data/classItems';
import { useState } from 'react';
import type { Character, CharacterRow, GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { NAME_LIMIT, ROSTER_LIMIT } from '../game/core/GameEngine';
import { AGGRO } from '../game/data/balance';
import { itemById } from '../game/data/items';
import { aggroShares, meleeInBackRow } from '../game/systems/combat';
import { characterStats, classLabel } from '../game/systems/progression';
import { ProgressBar } from './ProgressBar';

const ROWS: { id: CharacterRow; title: string; hint: string }[] = [
  { id: 'front', title: 'Frente', hint: 'Corpo a corpo. O tanque recebe a maior parte dos golpes.' },
  { id: 'back', title: 'Trás', hint: 'Arcos e magias. Arma corpo a corpo aqui causa só 50% do dano.' },
];

function FormationCard({ character, state, share }: { character: Character; state: GameState; share?: number }) {
  const stats = characterStats(character, state), weapon = itemById(character.equipment.weapon ?? ''), gearWeapon = character.gear.weapon && classItem(character.gear.weapon.baseId);
  const other: CharacterRow = character.row === 'front' ? 'back' : 'front';
  return <article className={`formation-card ${character.isTank ? 'is-tank' : ''} ${character.hp <= 0 ? 'down' : ''}`}>
    <div className="formation-head"><strong>{character.name}</strong>{character.isTank && <em className="tank-seal">Tanque</em>}<small>{classLabel(character)} · Nv. {character.profile.level}</small></div>
    <ProgressBar compact tone="hp" value={character.hp} max={stats.maxHp} label="HP" detail={`${Math.round(character.hp)}/${stats.maxHp}`} />
    <small>Arma: {gearWeapon?.name ?? weapon?.name ?? 'sem arma'}{weapon?.trains ? ` (${weapon.trains === 'melee' ? 'Melee' : 'Ranged'})` : ''}</small>
    {share !== undefined && <small>Aggro estimado: {Math.round(share * 100)}%</small>}
    {meleeInBackRow(character) && <small className="warn">Arma corpo a corpo na linha de trás: 50% do dano.</small>}
    <div className="formation-actions">
      <button onClick={() => gameStore.setRow(character.id, other)}>Ir para {other === 'front' ? 'Frente' : 'Trás'}</button>
      <button className={character.isTank ? 'primary' : ''} disabled={character.row !== 'front'} title={character.row !== 'front' ? 'O tanque precisa estar na frente' : 'Só um tanque por grupo'}
        onClick={() => gameStore.setTank(character.id, !character.isTank)}>{character.isTank ? 'Remover tanque' : 'Tornar tanque'}</button>
    </div>
  </article>;
}

/** Aba Grupo: formação (Frente/Trás), tanque, quem está na equipe e recrutamento. */
export function GroupPanel({ state, section = 'all' }: { state: GameState; section?: 'all' | 'formation' | 'reserves' }) {
  const [recruit, setRecruit] = useState('');
  const team = state.team.map(id => state.characters.find(c => c.id === id)).filter(Boolean) as Character[];
  const shares = aggroShares(team), active = new Set(state.team);
  return <section className="group-panel">
    <div className="section-heading"><div><span className="eyebrow">Formação</span><h2>Grupo</h2></div>
      <span className="section-note">Aggro dos monstros: Tanque {AGGRO.tank * 100}% · demais da frente {AGGRO.front * 100}% · trás {AGGRO.back * 100}% (renormalizado sem os grupos vazios).</span></div>
    {section !== 'reserves' && <div className="formation-rows">{ROWS.map(row => {
      const members = team.filter(c => c.row === row.id);
      return <div className="formation-row" key={row.id}><div className="subsection-heading"><h3>{row.title}</h3><small>{row.hint}</small></div>
        <div className="formation-cards">{members.map(c => <FormationCard key={c.id} character={c} state={state} share={shares.get(c.id)} />)}{!members.length && <p className="empty-state">Ninguém na linha de {row.title.toLowerCase()}.</p>}</div></div>;
    })}</div>}
    {section !== 'formation' && <details className="roster-management" open><summary>Equipe e reservas ({team.length}/4 na equipe · {state.characters.length}/{ROSTER_LIMIT} personagens)</summary>
      {state.characters.map(entry => <label key={entry.id}><span>{entry.name} · {classLabel(entry)} · {entry.row === 'front' ? 'Frente' : 'Trás'}</span>
        <input type="checkbox" checked={active.has(entry.id)} onChange={() => gameStore.toggleTeam(entry.id)} /></label>)}
      {state.characters.length < ROSTER_LIMIT && <form className="recruit-form" onSubmit={event => { event.preventDefault(); if (gameStore.recruit(recruit)) setRecruit(''); }}>
        <input aria-label="Nome do novo Squire" placeholder="Nome do novo Squire" maxLength={NAME_LIMIT} value={recruit} onChange={event => setRecruit(event.target.value)} />
        <button disabled={!recruit.trim()}>Recrutar Squire</button></form>}
    </details>}
  </section>;
}
