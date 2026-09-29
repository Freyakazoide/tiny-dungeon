import type { CSSProperties } from 'react';
import type { GameState } from '../game/core/types';
import { CLASSES } from '../game/data/classes';
import { classLabel } from '../game/systems/progression';
import { colorHex } from './format';

/** Seletor fixo de personagem: vale para as abas Personagem, Itens e Classes. */
export function CharacterPicker({ state, selected, setSelected }: { state: GameState; selected: string; setSelected: (id: string) => void }) {
  return <div className="character-picker" role="tablist" aria-label="Personagem selecionado">{state.characters.map(entry =>
    <button key={entry.id} role="tab" aria-selected={entry.id === selected} className={entry.id === selected ? 'active' : ''} style={{ '--class-color': colorHex(CLASSES[entry.classId].color) } as CSSProperties} onClick={() => setSelected(entry.id)}>
      <span className="picker-initial">{entry.name.slice(0, 1)}</span><b>{entry.name}</b><small>{classLabel(entry)} · Nv. {entry.profile.level}{state.team.includes(entry.id) ? '' : ' · reserva'}</small>
    </button>)}</div>;
}
