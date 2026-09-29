import type { CSSProperties } from 'react';
import type { Character, GameState } from '../game/core/types';
import { CLASSES } from '../game/data/classes';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { characterStats, classLabel, elementFocus, xpForLevel } from '../game/systems/progression';
import { colorHex } from './format';
import { ProgressBar } from './ProgressBar';

/** Selo do foco de treino: o elemento em foco, senão a proficiência da última ação. */
const focusLabel = (character: Character) => {
  const focus = elementFocus(character) ?? character.profile.trainingFocus;
  return focus ? PROFICIENCIES[focus].name : 'sem foco';
};

/** Painel lateral: só HP, Mana, XP e o foco de treino. Formação e tanque ficam na aba Grupo. */
export function TeamPanel({ state, selected, setSelected }: { state: GameState; selected: string; setSelected: (id: string) => void }) {
  const team = state.team.map(id => state.characters.find(character => character.id === id)).filter(Boolean) as Character[];
  return <aside className="team-panel stone-panel"><div className="panel-title"><div><span className="eyebrow">Grupo ativo</span><h2>Equipe</h2></div><span className="team-count">{team.length}/4</span></div>
    <div className="team-list">{team.map(character => {
      const stats = characterStats(character, state), needed = xpForLevel(character.profile.level);
      return <button key={character.id} className={`team-card ${selected === character.id ? 'selected' : ''}`} style={{ '--class-color': colorHex(CLASSES[character.classId].color) } as CSSProperties} onClick={() => setSelected(character.id)}>
        <div className="team-card-head"><span className="class-gem" /><strong>{character.name}</strong><small>{classLabel(character)} · Nv. {character.profile.level}</small><em className="focus-seal" title="Foco de treino">Foco: {focusLabel(character)}</em></div>
        <ProgressBar compact tone="hp" value={character.hp} max={stats.maxHp} label="HP" detail={`${Math.round(character.hp)}/${stats.maxHp}`} />
        <ProgressBar compact tone="mana" value={character.mana} max={stats.maxMana} label="Mana" detail={`${Math.round(character.mana)}/${stats.maxMana}`} />
        <ProgressBar compact tone="xp" value={character.profile.xp} max={needed} label="XP" detail={`${Math.round(character.profile.xp)}/${needed}`} />
      </button>;
    })}</div>
  </aside>;
}
