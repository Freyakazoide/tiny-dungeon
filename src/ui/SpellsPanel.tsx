import { useState } from 'react';
import type { GameState, SpellCondition, SpellDef } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { SPELLS, spellById } from '../game/data/spells';
import { SPELL_SLOTS } from '../game/core/GameEngine';
import { elementFocus, spellAvailable } from '../game/systems/progression';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { Icon } from './components/Icon';

const TARGETS: Record<SpellDef['target'], string> = { enemy: 'Um inimigo', allEnemies: 'Todos os inimigos', self: 'Si mesmo', ally: 'Um aliado', allAllies: 'Todos os aliados' };
const KIND_ICON: Record<SpellDef['kind'], string> = { damage: 'stat_attack', heal: 'stat_hp', regen: 'stat_hp', shield: 'stat_defense', buff: 'stat_speed' };
/** Ícone do elemento quando a magia tem um; senão o do efeito (dano, cura, escudo…). */
export const spellIcon = (spell: SpellDef) => spell.element ? `elem_${spell.element}` : KIND_ICON[spell.kind];

function conditionChips(condition: SpellCondition) {
  const chips: string[] = [];
  if (condition.hpBelow !== undefined) chips.push(`HP < ${condition.hpBelow}%`);
  if (condition.minEnemies !== undefined) chips.push(`Inimigos ≥ ${condition.minEnemies}`);
  if (condition.manaAbove !== undefined) chips.push(`Mana > ${condition.manaAbove}%`);
  if (condition.allyInjured) chips.push('Aliado ferido');
  return chips;
}

/** Rotação de magias (Fase 9): uma linha por slot, com ícone, chips, condições em popover e setas de ordem. */
export function SpellsPanel({ state, selected }: { state: GameState; selected: string }) {
  const character = state.characters.find(entry => entry.id === selected) ?? state.characters[0];
  const [openCond, setOpenCond] = useState<string | null>(null), [adding, setAdding] = useState(false);
  const focus = elementFocus(character);
  const available = SPELLS.filter(spell => spellAvailable(character, spell) && !character.spellSlots.includes(spell.id));
  const setCond = (id: string, patch: Partial<SpellCondition>) => gameStore.setSpellCondition(character.id, id, patch);
  const num = (id: string, key: 'hpBelow' | 'minEnemies' | 'manaAbove', label: string, min: number, max: number, value?: number) =>
    <label>{label}<input type="number" min={min} max={max} value={value ?? ''} onChange={event => setCond(id, { [key]: event.target.value === '' ? undefined : +event.target.value })} /></label>;
  return <section>
    <h4 className="pk-sec">Rotação de {character.name} <small>A primeira magia liberada e válida é executada · máx. {SPELL_SLOTS}.</small></h4>
    <div className="ch-spells">{character.spellSlots.map((id, index) => {
      const spell = spellById(id)!, condition = character.spellConditions[id] ?? {}, locked = spell.level > character.profile.level, chips = conditionChips(condition);
      return <article className={`ch-spell pk-panel ${locked ? 'lock' : ''}`} key={id} aria-label={`Magia ${index + 1}: ${spell.name}`}>
        <span className="ch-slotn">{index + 1}</span>
        <Icon name={spellIcon(spell)} size={48} />
        <div style={{ minWidth: 0 }}>
          <div className="ch-nm">{spell.name}</div>
          <div className="ch-meta">
            <span className="pk-chip"><Icon name="stat_mana" size={24} />{spell.mana} mana</span><span className="pk-chip">⏱ {spell.cooldown} s</span>
            {spell.element && <span className="pk-chip">{PROFICIENCIES[spell.element].name}</span>}<span className="pk-chip">{TARGETS[spell.target]}</span>
            {spell.element && spell.element === focus && <span className="pk-tag foco">Treina o foco</span>}
            {locked && <span className="pk-tag blq">🔒 Nível {spell.level}</span>}
          </div>
          <small className="muted">{spell.description}</small>
        </div>
        <div className="ch-cond" style={{ position: 'relative' }}>
          {chips.map(chip => <span className="pk-chip" key={chip}>{chip}</span>)}
          <button type="button" className="pk-btn sm" aria-expanded={openCond === id} onClick={() => setOpenCond(openCond === id ? null : id)}>⚙ Condições</button>
          {openCond === id && <div className="pk-tip" role="dialog" aria-label={`Condições de ${spell.name}`} style={{ right: 0, top: '100%', display: 'grid', gap: 6 }}>
            <div className="h">Condições de uso</div>
            {num(id, 'hpBelow', 'HP abaixo %', 0, 100, condition.hpBelow)}{num(id, 'minEnemies', 'Inimigos mín.', 1, 4, condition.minEnemies)}{num(id, 'manaAbove', 'Mana acima %', 0, 100, condition.manaAbove)}
            <label><input type="checkbox" checked={!!condition.allyInjured} onChange={event => setCond(id, { allyInjured: event.target.checked })} /> aliado ferido</label>
          </div>}
        </div>
        <div className="ch-arrows">
          <button type="button" className="pk-btn" aria-label={`Subir ${spell.name}`} disabled={!index} onClick={() => gameStore.reorderSpell(character.id, index, index - 1)}>↑</button>
          <button type="button" className="pk-btn" aria-label={`Descer ${spell.name}`} disabled={index === character.spellSlots.length - 1} onClick={() => gameStore.reorderSpell(character.id, index, index + 1)}>↓</button>
          <button type="button" className="pk-btn" aria-label={`Remover ${spell.name}`} title="Remover magia" onClick={() => gameStore.unequipSpell(character.id, index)}>✕</button>
        </div>
      </article>;
    })}</div>
    {character.spellSlots.length < SPELL_SLOTS && <div className="ch-addspell" style={{ position: 'relative' }}>
      <button type="button" className="pk-btn primary" aria-expanded={adding} disabled={!available.length} onClick={() => setAdding(!adding)}>+ Equipar magia</button>
      <span>9 magias básicas por elemento · as do seu kit · as de subclasse</span>
      {adding && <div className="pk-tip" role="dialog" aria-label="Escolher magia" style={{ left: 0, top: '100%', display: 'block', width: 300 }}><div className="h">Magias disponíveis</div>
        <div className="pk-row">{available.map(spell => <button type="button" key={spell.id} className="pk-btn sm" onClick={() => { gameStore.equipSpell(character.id, character.spellSlots.length, spell.id); setAdding(false); }}><Icon name={spellIcon(spell)} size={24} />{spell.name}{spell.element ? ` · ${PROFICIENCIES[spell.element].name}` : ''}</button>)}</div></div>}
    </div>}
  </section>;
}
