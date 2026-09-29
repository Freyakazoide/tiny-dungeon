import { useEffect, useState, type CSSProperties } from 'react';
import type { Character, GameState } from '../game/core/types';
import { NAME_LIMIT, ROSTER_LIMIT } from '../game/core/GameEngine';
import { gameStore } from '../game/core/GameStore';
import { CLASSES } from '../game/data/classes';
import { itemById } from '../game/data/items';
import { characterStats, classLabel, xpForLevel } from '../game/systems/progression';
import { colorHex, compact, pct, SLOT_IDS, slotNames } from './format';
import { ProgressBar } from './ProgressBar';
import { CounterList, EvolutionPanel, ProficiencyGrid } from './RpgPanels';

function CharacterSummary({character,state,selected,onSelect}:{character:Character;state:GameState;selected:boolean;onSelect:()=>void}){
  const stats=characterStats(character,state),classDef=CLASSES[character.classId],needed=xpForLevel(character.profile.level);
  return <button className={`character-summary ${selected?'selected':''}`} style={{'--class-color':colorHex(classDef.color)} as CSSProperties} onClick={onSelect}><div className="portrait-placeholder">{character.name.slice(0,1)}</div><div className="summary-copy"><div><strong>{character.name}</strong><small>{classLabel(character)} · Nível {character.profile.level}</small></div><ProgressBar compact tone="hp" value={character.hp} max={stats.maxHp} label="HP" detail={`${Math.round(character.hp)}/${stats.maxHp}`}/><ProgressBar compact tone="mana" value={character.mana} max={stats.maxMana} label="Mana" detail={`${Math.round(character.mana)}/${stats.maxMana}`}/><ProgressBar compact tone="xp" value={character.profile.xp} max={needed} label="XP" detail={`${Math.ceil(needed-character.profile.xp)} restante`}/></div><span className="talent-badge" title="Pontos de talento disponíveis">✦ {character.talentPoints}</span></button>;
}

export function CharactersPanel({state,selected,setSelected}:{state:GameState;selected:string;setSelected:(id:string)=>void}){
  const character=state.characters.find(entry=>entry.id===selected)??state.characters[0];const [name,setName]=useState(character.name);const [recruit,setRecruit]=useState('');useEffect(()=>setName(character.name),[character.id,character.name]);
  const stats=characterStats(character,state),classDef=CLASSES[character.classId],levelNeeded=xpForLevel(character.profile.level),active=new Set(state.team);
  return <section className="characters-panel"><div className="section-heading"><div><span className="eyebrow">Progressão</span><h2>Fichas de personagens</h2></div><span className="section-note">Selecione uma ficha para ver skills e equipamentos</span></div>
    <div className="character-roster">{state.team.map(id=>state.characters.find(entry=>entry.id===id)).filter(Boolean).map(entry=><CharacterSummary key={entry!.id} character={entry!} state={state} selected={entry!.id===character.id} onSelect={()=>setSelected(entry!.id)}/>)}</div>
    <div className="character-sheet" style={{'--class-color':colorHex(classDef.color)} as CSSProperties}><div className="sheet-main"><div className="identity-row"><div><span className="class-label">{classLabel(character)}</span><h3>{character.name}</h3><p>Nível {character.profile.level} · {character.talentPoints} pontos de talento disponíveis</p></div><div className="rename-control"><input aria-label="Nome do personagem" value={name} maxLength={NAME_LIMIT} onChange={event=>setName(event.target.value)}/><button onClick={()=>gameStore.rename(character.id,name)}>Renomear</button></div></div>
      <ProgressBar tone="xp" value={character.profile.xp} max={levelNeeded} label={`Experiência ${compact(character.profile.xp)} / ${compact(levelNeeded)}`} detail={`${Math.round(pct(character.profile.xp,levelNeeded))}% · ${Math.ceil(levelNeeded-character.profile.xp)} XP restante`}/>
      <div className="attribute-grid"><span><small>HP</small><b>{Math.round(character.hp)} / {stats.maxHp}</b></span><span><small>Mana</small><b>{Math.round(character.mana)} / {stats.maxMana}</b></span><span><small>Ataque</small><b>{Math.round(stats.attack)}</b></span><span><small>Defesa</small><b>{Math.round(stats.defense)}</b></span><span><small>Velocidade</small><b>{stats.attackSpeed.toFixed(2)}/s</b></span><span><small>Crítico</small><b>{Math.round(stats.crit*100)}%</b></span><span><small>Resistência</small><b>{Math.round(stats.resistance*100)}%</b></span><span><small>Poder mágico</small><b>{Math.round(stats.magicPower)}</b></span></div>
      <ProficiencyGrid character={character}/><CounterList character={character}/><EvolutionPanel character={character}/>
    </div><aside className="sheet-side"><div className="subsection-heading"><h3>Equipamentos</h3><small>Slots atuais</small></div><div className="equipment-list">{SLOT_IDS.map(slot=>{const item=itemById(character.equipment[slot]??'');return <div className="equipment-slot" key={slot}><span>{slotNames[slot]}</span><b className={item?`rarity-${item.rarity}`:''}>{item?.name??'Vazio'}</b>{item&&<button onClick={()=>gameStore.unequip(character.id,slot)}>Remover</button>}</div>})}</div></aside></div>
    <details className="roster-management"><summary>Gerenciar equipe e personagens</summary>{state.characters.map(entry=><label key={entry.id}><span>{entry.name} · {classLabel(entry)}</span><input type="checkbox" checked={active.has(entry.id)} onChange={()=>gameStore.toggleTeam(entry.id)}/></label>)}{state.characters.length<ROSTER_LIMIT&&<form className="recruit-form" onSubmit={event=>{event.preventDefault();if(gameStore.recruit(recruit))setRecruit('');}}><input aria-label="Nome do novo Squire" placeholder="Nome do novo Squire" maxLength={NAME_LIMIT} value={recruit} onChange={event=>setRecruit(event.target.value)}/><button disabled={!recruit.trim()}>Recrutar Squire</button></form>}</details>
  </section>;
}
