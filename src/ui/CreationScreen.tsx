import { useState, type FormEvent } from 'react';
import type { CharacterRow } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { NAME_LIMIT, PARTY_SIZE } from '../game/core/GameEngine';
import { itemById } from '../game/data/items';
import { defaultRow, STARTER_ELEMENTS, STARTER_WEAPONS, type CharacterSpec } from '../game/data/starter';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { GOAL_PLAN } from '../game/rpg/goals';
import { CLASS_BY_ID } from '../game/rpg/classTree';
import { defaultLookFor, type Look } from '../game/art/look';
import { AppearancePicker, LookPreview } from './AppearancePicker';
import { ClassChooser } from './classes/ClassChooser';
import { Icon } from './components/Icon';
import { statLine } from './format';
import { frameDataUrl } from '../game/art/render';

const ROW_NAMES: Record<CharacterRow, string> = { front: 'Frente', back: 'Trás' };
const PLACEHOLDERS = ['Nome do primeiro Squire', 'Nome do segundo Squire', 'Nome do terceiro Squire'];
const SECTIONS = ['Nome e aparência', 'Classe futura', 'Equipamento inicial'] as const;

type Draft = CharacterSpec & { rowTouched: boolean; look: Look; element: NonNullable<CharacterSpec['element']> };
const initialDraft = (index: number): Draft => ({
  name: '', weaponId: STARTER_WEAPONS[index % STARTER_WEAPONS.length].id, row: STARTER_WEAPONS[index % STARTER_WEAPONS.length].row,
  element: STARTER_ELEMENTS[index % STARTER_ELEMENTS.length], look: defaultLookFor(index), rowTouched: false,
});

/** Primeira tela do jogo (padrão pixel-kit): um passo por personagem, com nome, aparência, classe futura (tudo visível) e equipamento inicial. */
export function CreationScreen() {
  const [drafts, setDrafts] = useState<Draft[]>(() => Array.from({ length: PARTY_SIZE }, (_, index) => initialDraft(index)));
  const [active, setActive] = useState(0), [section, setSection] = useState<(typeof SECTIONS)[number]>(SECTIONS[0]);
  const update = (index: number, patch: Partial<Draft>) => setDrafts(current => current.map((draft, at) => at === index ? { ...draft, ...patch } : draft));
  const names = drafts.map(draft => draft.name.trim());
  const duplicated = names.every(Boolean) && new Set(names.map(name => name.toLowerCase())).size !== names.length;
  const ready = names.every(Boolean) && !duplicated;
  const draft = drafts[active], index = active;
  const submit = (event: FormEvent) => { event.preventDefault(); if (ready) gameStore.createParty(drafts.map(({ rowTouched: _touched, ...spec }) => spec)); };
  const pickGoal = (goal: string | undefined) => {
    const plan = goal ? GOAL_PLAN[goal] : undefined, w = plan && STARTER_WEAPONS.find(x => x.id === plan.weaponId);
    update(index, { goal, ...(plan && w ? { weaponId: plan.weaponId, element: plan.element, ...(draft.rowTouched ? {} : { row: defaultRow(plan.weaponId, w.trains) }) } : {}) });
  };
  const first = names.findIndex(n => !n);
  return <div className="cr-screen"><form className="cr-wrap" onSubmit={submit}>
    <header className="cr-head pk-panel">
      <span className="brand-mark">TD</span>
      <div><span className="eyebrow">Bem-vindo a Tiny Dungeon</span><h1>Monte sua equipe</h1>
        <p>Três Squires, nível 1, com Escudo de Madeira. Para cada um escolha o nome, a aparência, a classe que quer seguir (veja todas, inclusive as especializações bloqueadas) e o equipamento inicial.</p></div>
    </header>
    <div className="cr-body">
      <nav className="cr-steps" aria-label="Personagens">{drafts.map((d, i) => {
        const goal = d.goal ? CLASS_BY_ID[d.goal]?.name : undefined, done = !!d.name.trim();
        return <button type="button" key={i} className={`pk-panel cr-step ${i === active ? 'sel' : ''}`} aria-current={i === active ? 'step' : undefined} onClick={() => setActive(i)}>
          <img alt="" src={frameDataUrl({ kind: 'personagens', id: d.look.body, look: d.look }, 'down', 1, 3)} />
          <span><b>{d.name.trim() || `Personagem ${i + 1}`}</b><small>{goal ? `Objetivo: ${goal}` : 'Classe: decidir depois'}</small></span>
          <span className={`pk-tag ${done ? 'ok' : ''}`}>{done ? '✓' : '…'}</span></button>;
      })}</nav>
      <main className="cr-main pk-panel">
        <div className="cr-tabs" role="tablist" aria-label={`Etapas do personagem ${index + 1}`}>{SECTIONS.map(s => <button type="button" role="tab" key={s} aria-selected={section === s} className={`pk-btn sm ${section === s ? 'on' : ''}`} onClick={() => setSection(s)}>{s}</button>)}</div>
        {section === 'Nome e aparência' && <div className="cr-sec">
          <label className="cr-field"><span className="pk-sec">Nome</span>
            <input autoFocus={index === 0} className="cr-input" value={draft.name} maxLength={NAME_LIMIT} placeholder={PLACEHOLDERS[index]} aria-label={`Nome do personagem ${index + 1}`} onChange={event => update(index, { name: event.target.value })} />
            <small className="muted">Até {NAME_LIMIT} letras. Cada personagem precisa de um nome diferente.</small></label>
          <div className="cr-field"><span className="pk-sec">Aparência</span>
            <AppearancePicker value={draft.look} restore={defaultLookFor(index)} onChange={look => update(index, { look })} label={`Aparência do personagem ${index + 1}`} /></div>
        </div>}
        {section === 'Classe futura' && <div className="cr-sec"><ClassChooser label={`Classe futura do personagem ${index + 1}`} value={draft.goal} onChange={pickGoal} /></div>}
        {section === 'Equipamento inicial' && <div className="cr-sec">
          <div className="cr-field"><span className="pk-sec">Arma inicial</span>
            <div className="cr-weapons" role="radiogroup" aria-label={`Arma inicial do personagem ${index + 1}`}>{STARTER_WEAPONS.map(weapon => {
              const item = itemById(weapon.id)!, active = draft.weaponId === weapon.id;
              return <button type="button" role="radio" aria-checked={active} key={weapon.id} className={`pk-panel cr-weapon ${active ? 'sel' : ''}`} onClick={() => update(index, { weaponId: weapon.id, ...(draft.rowTouched ? {} : { row: defaultRow(weapon.id, weapon.trains) }) })}>
                <Icon name={weapon.trains === 'ranged' ? 'prof_ranged' : 'slot_weapon'} size={24} /><span><b>{item.name}</b><small>Treina {PROFICIENCIES[weapon.trains].name} · sugerida: {ROW_NAMES[weapon.row]}</small><small>{statLine(item.stats)}</small></span></button>;
            })}</div></div>
          <div className="cr-field"><span className="pk-sec">Posição em combate</span>
            <div className="cr-seg" role="radiogroup" aria-label={`Posição do personagem ${index + 1}`}>{(['front', 'back'] as const).map(row =>
              <button type="button" role="radio" aria-checked={draft.row === row} key={row} className={`pk-btn ${draft.row === row ? 'on' : ''}`} onClick={() => update(index, { row, rowTouched: true })}>{ROW_NAMES[row]}</button>)}</div>
            {draft.row === 'back' && itemById(draft.weaponId)?.trains === 'melee' && <small className="warn">Arma corpo a corpo na linha de trás causa só 50% do dano.</small>}</div>
          <div className="cr-field"><span className="pk-sec">Elemento inicial</span>
            <div className="cr-elems" role="radiogroup" aria-label={`Elemento do personagem ${index + 1}`}>{STARTER_ELEMENTS.map(id => <button type="button" role="radio" key={id} aria-checked={draft.element === id} aria-label={PROFICIENCIES[id].name} title={PROFICIENCIES[id].name} className={`pk-btn ${draft.element === id ? 'on' : ''}`} onClick={() => update(index, { element: id })}><Icon name={`elem_${id}`} size={24} /></button>)}</div>
            <small className="muted">Elemento inicial: {PROFICIENCIES[draft.element].name}.</small></div>
          <LookPreview look={draft.look} />
        </div>}
      </main>
    </div>
    <footer className="cr-foot pk-panel">
      <div className="cr-nav">
        <button type="button" className="pk-btn" disabled={active === 0} onClick={() => setActive(active - 1)}>← Anterior</button>
        <button type="button" className="pk-btn" disabled={active === PARTY_SIZE - 1} onClick={() => setActive(active + 1)}>Próximo →</button></div>
      <div className="cr-msg">{duplicated ? <span className="creation-error">Cada personagem precisa de um nome diferente.</span> : first >= 0 ? <span className="muted">Falta dar nome ao personagem {first + 1}.</span> : <span className="muted">Tudo pronto.</span>}</div>
      <button className="pk-btn primary cr-go" disabled={!ready}>Começar aventura</button>
    </footer>
  </form></div>;
}
