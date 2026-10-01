import type { CSSProperties } from 'react';
import type { GameState } from '../game/core/types';
import { CLASSES } from '../game/data/classes';
import { colorHex } from './format';
import { type CharacterTab } from './navigation';
import { CharacterSheet } from './CharacterSheet';
import { ProficiencyGrid } from './RpgPanels';
import { SpellsPanel } from './SpellsPanel';
import { TalentsPanel } from './TalentsPanel';
import { ClassesPanel } from './ClassesPanel';

/** Menu Personagem: abas Ficha / Proficiências / Magias / Talentos (o cabeçalho e as abas vêm do Modal). */
export function CharacterPanel({ state, selected, setSelected, tab }: { state: GameState; selected: string; setSelected: (id: string) => void; tab: CharacterTab }) {
  const character = state.characters.find(entry => entry.id === selected) ?? state.characters[0];
  return <section className="characters-panel" style={{ '--class-color': colorHex(CLASSES[character.classId].color) } as CSSProperties}>
    {tab === 'Ficha' && <CharacterSheet state={state} character={character} />}
    {tab === 'Proficiências' && <ProficiencyGrid character={character} />}
    {tab === 'Magias' && <SpellsPanel state={state} selected={character.id} />}
    {tab === 'Talentos' && <TalentsPanel state={state} selected={character.id} setSelected={setSelected} />}
    {tab === 'Classes' && <ClassesPanel state={state} character={character} />}
  </section>;
}
