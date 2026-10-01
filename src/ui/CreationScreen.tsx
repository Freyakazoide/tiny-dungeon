import { useState, type FormEvent } from 'react';
import type { CharacterRow } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { NAME_LIMIT, PARTY_SIZE } from '../game/core/GameEngine';
import { itemById } from '../game/data/items';
import { defaultRow, STARTER_ELEMENTS, STARTER_WEAPONS, type CharacterSpec } from '../game/data/starter';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { defaultLookFor } from '../game/art/look';
import { AppearancePicker } from './AppearancePicker';
import { GoalPicker } from './GoalPicker';
import { GOAL_PLAN } from '../game/rpg/goals';
import { statLine } from './format';

const PLACEHOLDERS = ['Nome do primeiro Squire', 'Nome do segundo Squire', 'Nome do terceiro Squire'];
const ROW_NAMES: Record<CharacterRow, string> = { front: 'Frente', back: 'Trás' };

interface Draft extends CharacterSpec { rowTouched: boolean; }
const initialDraft = (index: number): Draft => ({
  name: '', weaponId: STARTER_WEAPONS[index % STARTER_WEAPONS.length].id, row: STARTER_WEAPONS[index % STARTER_WEAPONS.length].row,
  element: STARTER_ELEMENTS[index % STARTER_ELEMENTS.length], look: defaultLookFor(index), rowTouched: false,
});

/** Primeira tela do jogo: para cada um dos 3 Squires, nome, arma inicial, linha de combate e elemento inicial. */
export function CreationScreen() {
  const [drafts, setDrafts] = useState<Draft[]>(() => Array.from({ length: PARTY_SIZE }, (_, index) => initialDraft(index)));
  const update = (index: number, patch: Partial<Draft>) => setDrafts(current => current.map((draft, at) => at === index ? { ...draft, ...patch } : draft));
  const names = drafts.map(draft => draft.name.trim());
  const duplicated = names.every(Boolean) && new Set(names.map(name => name.toLowerCase())).size !== names.length;
  const ready = names.every(Boolean) && !duplicated;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) gameStore.createParty(drafts.map(({ rowTouched: _touched, ...spec }) => spec));
  };
  return <div className="creation-screen"><form className="creation-card creation-wide stone-panel" onSubmit={submit}>
    <span className="brand-mark">TD</span>
    <span className="eyebrow">Bem-vindo a Tiny Dungeon</span>
    <h1>Crie seus 3 personagens</h1>
    <p>Todos começam como <b>Squire</b>, nível 1, com Escudo de Madeira. Escolha o nome, a arma inicial, a posição e o elemento que cada um vai treinar. As armas não escolhidas ficam para trás.</p>
    <div className="creation-slots">{drafts.map((draft, index) => <fieldset key={index} className="creation-slot creation-slot-wide">
      <legend>Personagem {index + 1}</legend>
      <label className="creation-name"><span className="portrait-placeholder">{draft.name.trim().slice(0, 1) || index + 1}</span>
        <input autoFocus={index === 0} value={draft.name} maxLength={NAME_LIMIT} placeholder={PLACEHOLDERS[index]} aria-label={`Nome do personagem ${index + 1}`}
          onChange={event => update(index, { name: event.target.value })} />
      </label>
      <div className="creation-sprite"><span>Aparência</span><AppearancePicker value={draft.look as import('../game/art/look').Look} restore={defaultLookFor(index)} onChange={look => update(index, { look })} label={`Aparência do personagem ${index + 1}`} /></div>
      <div className="creation-sprite"><span>Classe futura</span><GoalPicker label={`Classe futura do personagem ${index + 1}`} value={draft.goal} onChange={goal => {
        const plan = goal ? GOAL_PLAN[goal] : undefined, w = plan && STARTER_WEAPONS.find(x => x.id === plan.weaponId);
        update(index, { goal, ...(plan && w ? { weaponId: plan.weaponId, element: plan.element, ...(draft.rowTouched ? {} : { row: defaultRow(plan.weaponId, w.trains) }) } : {}) });
      }} /></div>
      <div className="weapon-options" role="radiogroup" aria-label={`Arma inicial do personagem ${index + 1}`}>{STARTER_WEAPONS.map(weapon => {
        const item = itemById(weapon.id)!, active = draft.weaponId === weapon.id;
        return <button type="button" role="radio" aria-checked={active} key={weapon.id} className={`weapon-card ${active ? 'selected' : ''}`}
          onClick={() => update(index, { weaponId: weapon.id, ...(draft.rowTouched ? {} : { row: defaultRow(weapon.id, weapon.trains) }) })}>
          <strong>{item.name}</strong>
          <small>Treina {PROFICIENCIES[weapon.trains].name} · linha sugerida: {ROW_NAMES[weapon.row]}</small>
          <small>{statLine(item.stats)}</small>
          <small>{weapon.note}</small>
        </button>;
      })}</div>
      <div className="creation-choices">
        <div className="segmented" role="radiogroup" aria-label={`Posição do personagem ${index + 1}`}>{(['front', 'back'] as const).map(row =>
          <button type="button" role="radio" aria-checked={draft.row === row} key={row} className={draft.row === row ? 'active' : ''} onClick={() => update(index, { row, rowTouched: true })}>{ROW_NAMES[row]}</button>)}</div>
        <label className="creation-element"><span>Elemento inicial</span>
          <select value={draft.element} onChange={event => update(index, { element: event.target.value as Draft['element'] })}>
            {STARTER_ELEMENTS.map(id => <option key={id} value={id}>{PROFICIENCIES[id].name}</option>)}
          </select>
        </label>
      </div>
      {draft.row === 'back' && itemById(draft.weaponId)?.trains === 'melee' && <small className="warn">Arma corpo a corpo na linha de trás causa só 50% do dano.</small>}
    </fieldset>)}</div>
    {duplicated && <p className="creation-error">Cada personagem precisa de um nome diferente.</p>}
    <button className="primary" disabled={!ready}>Começar aventura</button>
  </form></div>;
}
