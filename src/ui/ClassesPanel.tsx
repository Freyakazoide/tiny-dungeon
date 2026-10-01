import type { Character, GameState } from '../game/core/types';
import { NextTab } from './classes/NextTab';
import { TreeTab } from './classes/TreeTab';
import { Encyclopedia } from './classes/Encyclopedia';
import { uiStore, useUi } from './uiStore';

const SUBS = [['next', 'Próximo passo'], ['tree', 'Árvore completa'], ['wiki', 'Enciclopédia']] as const;

/** Classes, dentro de Personagem: sub-menu "Próximo passo" (grupos, prévia e confirmação) e "Árvore completa" (todas as classes e especializações). */
export function ClassesPanel({ state, character }: { state: GameState; character: Character }) {
  const { sub } = useUi();
  return <section className="classes-panel" style={{ height: '100%' }}>
    <div className="cl-subnav" role="tablist" aria-label="Classes">{SUBS.map(([id, label]) =>
      <button type="button" role="tab" key={id} id={`cl-sub-${id}`} aria-selected={sub === id} className={`pk-btn sm ${sub === id ? 'on' : ''}`} onClick={() => uiStore.setSub(id)}>{label}</button>)}</div>
    {sub === 'next' ? <NextTab state={state} character={character} /> : sub === 'tree' ? <TreeTab character={character} /> : <Encyclopedia character={character} />}
  </section>;
}
