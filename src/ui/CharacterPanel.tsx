import { useEffect, useState, type CSSProperties } from 'react';
import type { GameState } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { NAME_LIMIT } from '../game/core/GameEngine';
import { CLASSES } from '../game/data/classes';
import { CLASS_BY_ID } from '../game/rpg/classTree';
import { NODE_PASSIVES } from '../game/rpg/passives';
import { characterStats, classLabel, xpForLevel } from '../game/systems/progression';
import { colorHex, compact, pct } from './format';
import { CHARACTER_TABS, type CharacterTab } from './navigation';
import { ProgressBar } from './ProgressBar';
import { SpritePicker } from './SpritePicker';
import { CounterList, ProficiencyGrid } from './RpgPanels';
import { SpellsPanel } from './SpellsPanel';
import { TalentsPanel } from './TalentsPanel';
import { talentPointsAvailable } from '../game/systems/talentGrid';

/** Aba Personagem: ficha de um personagem, com abas internas Ficha / Proficiências / Magias / Talentos. */
export function CharacterPanel({ state, selected, setSelected }: { state: GameState; selected: string; setSelected: (id: string) => void }) {
  const character = state.characters.find(entry => entry.id === selected) ?? state.characters[0];
  const [inner, setInner] = useState<CharacterTab>('Ficha');
  const [name, setName] = useState(character.name);
  useEffect(() => setName(character.name), [character.id, character.name]);
  const stats = characterStats(character, state), needed = xpForLevel(character.profile.level);
  return <section className="characters-panel" style={{ '--class-color': colorHex(CLASSES[character.classId].color) } as CSSProperties}>
    <nav className="inner-tabs" aria-label="Seções do personagem">{CHARACTER_TABS.map(tab =>
      <button key={tab} className={inner === tab ? 'active' : ''} onClick={() => setInner(tab)}>{tab}</button>)}</nav>

    {inner === 'Ficha' && <div className="sheet-main">
      <div className="identity-row"><div><span className="class-label">{classLabel(character)}</span><h3>{character.name}</h3>
        <p>Nível {character.profile.level} · {talentPointsAvailable(character)} pontos de talento disponíveis · {character.row === 'front' ? 'Frente' : 'Trás'}{character.isTank ? ' · Tanque' : ''}</p></div>
        <div className="rename-control"><input aria-label="Nome do personagem" value={name} maxLength={NAME_LIMIT} onChange={event => setName(event.target.value)} /><button onClick={() => gameStore.rename(character.id, name)}>Renomear</button></div></div>
      <div className="creation-sprite"><span>Sprite</span><SpritePicker value={character.spriteId} color={colorHex(CLASSES[character.classId].color)} onChange={id => gameStore.setSprite(character.id, id)} label={`Sprite de ${character.name}`} /></div>
      <ProgressBar tone="xp" value={character.profile.xp} max={needed} label={`Experiência ${compact(character.profile.xp)} / ${compact(needed)}`} detail={`${Math.round(pct(character.profile.xp, needed))}% · ${Math.ceil(needed - character.profile.xp)} XP restante`} />
      <div className="attribute-grid">
        <span><small>HP</small><b>{Math.round(character.hp)} / {stats.maxHp}</b></span><span><small>Mana</small><b>{Math.round(character.mana)} / {stats.maxMana}</b></span>
        <span><small>Ataque</small><b>{Math.round(stats.attack)}</b></span><span><small>Defesa</small><b>{Math.round(stats.defense)}</b></span>
        <span><small>Velocidade</small><b>{stats.attackSpeed.toFixed(2)}/s</b></span><span><small>Crítico</small><b>{Math.round(stats.crit * 100)}%</b></span>
        <span><small>Resistência</small><b>{Math.round(stats.resistance * 100)}%</b></span><span><small>Poder mágico</small><b>{Math.round(stats.magicPower)}</b></span>
      </div>
      <div className="subsection-heading"><h3>Passivas</h3></div>
      <ul className="passive-list">{character.profile.classPath.filter(id => NODE_PASSIVES[id]).map(id => <li key={id}><b>{NODE_PASSIVES[id].name}</b><small>{CLASS_BY_ID[id].name}: {NODE_PASSIVES[id].description}</small></li>)}{!character.profile.classPath.some(id => NODE_PASSIVES[id]) && <li><small>Nenhuma ainda: evolua de classe para ganhar passivas.</small></li>}</ul>
      <CounterList character={character} />
    </div>}
    {inner === 'Proficiências' && <ProficiencyGrid character={character} />}
    {inner === 'Magias' && <SpellsPanel state={state} selected={character.id} />}
    {inner === 'Talentos' && <TalentsPanel state={state} selected={character.id} setSelected={setSelected} />}
  </section>;
}
