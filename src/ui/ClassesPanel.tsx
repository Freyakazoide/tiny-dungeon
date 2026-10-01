import type { Character, GameState } from '../game/core/types';
import { NextTab } from './classes/NextTab';
import { TreeTab } from './classes/TreeTab';

/** Menu Classes: "Próximo passo" (grupos, prévia e confirmação) e "Árvore completa" (15 classes base e subclasses). */
export function ClassesPanel({ state, character, section = 'next' }: { state: GameState; character: Character; section?: 'next' | 'tree' }) {
  return <section className="classes-panel" style={{ height: '100%' }}>
    {section === 'next' ? <NextTab state={state} character={character} /> : <TreeTab character={character} />}
  </section>;
}
