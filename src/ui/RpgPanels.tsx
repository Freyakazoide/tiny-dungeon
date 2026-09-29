import { useState } from 'react';
import type { Character } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { CLASSES } from '../game/data/classes';
import { CLASS_BY_ID, COUNTER_TARGETS } from '../game/rpg/classTree';
import { evolutionOptions } from '../game/rpg/evolution';
import { triesForNextLevel } from '../game/rpg/curves';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../game/rpg/proficiencies';
import { COUNTER_IDS, type CounterId } from '../game/rpg/profile';
import { compact } from './format';
import { ProgressBar } from './ProgressBar';

export const COUNTER_NAMES: Record<CounterId, string> = {
  crits: 'Críticos', bossCrits: 'Críticos em chefes', damageTaken: 'Dano sofrido', healingDone: 'Cura total',
  buffsApplied: 'Buffs aplicados', dotDamage: 'Dano contínuo', supportPotionsUsed: 'Poções usadas',
  bossKills: 'Chefes abatidos', goldEarned: 'Ouro acumulado', controlSpells: 'Feitiços de controle',
};

/** As 13 proficiências (nível 10 inicial, sobem por uso) e o alvo do treino offline. */
export function ProficiencyGrid({ character }: { character: Character }) {
  const { profile } = character, primary = CLASSES[character.classId].weaponSkill;
  return <>
    <div className="subsection-heading"><h3>Proficiências</h3><small>Sobem por uso em combate (1 try a cada 2 s) e no treino offline.</small></div>
    <div className="skill-grid">{PROFICIENCY_IDS.map(id => {
      const progress = profile.proficiencies[id], needed = triesForNextLevel(id, progress.level), maxed = progress.level >= MAX_PROFICIENCY_LEVEL;
      return <article className={`skill-card ${id === primary ? 'primary-skill' : ''}`} key={id}>
        <div><strong>{PROFICIENCIES[id].name}</strong>{id === primary && <em>Principal</em>}{profile.offlineTarget === id && <em>Offline</em>}<b>Lv. {progress.level}</b></div>
        <ProgressBar compact tone="skill" value={maxed ? 1 : progress.tries} max={maxed ? 1 : needed} label={`${compact(progress.tries)} tries`} detail={maxed ? 'máximo' : `${compact(needed)} necessários`} />
      </article>;
    })}</div>
    <label className="offline-target"><span>Treino offline</span>
      <select value={profile.offlineTarget ?? ''} onChange={event => gameStore.setOfflineTarget(character.id, (event.target.value || undefined) as ProficiencyId | undefined)}>
        <option value="">Última proficiência treinada{profile.lastTrained ? ` (${PROFICIENCIES[profile.lastTrained].name})` : ''}</option>
        {PROFICIENCY_IDS.map(id => <option key={id} value={id}>{PROFICIENCIES[id].name}</option>)}
      </select>
      <small>Enquanto o jogo está fechado só as tries desta proficiência são creditadas (até 24 h).</small>
    </label>
  </>;
}

/** Contadores vitalícios usados nos requisitos das subclasses. */
export function CounterList({ character }: { character: Character }) {
  const targets = COUNTER_TARGETS;
  return <>
    <div className="subsection-heading"><h3>Contadores</h3><small>Progresso vitalício rumo às subclasses.</small></div>
    <div className="counter-list">{COUNTER_IDS.map(id => <span key={id}><small>{COUNTER_NAMES[id]}</small><b>{compact(character.profile.counters[id] ?? 0)}</b><em>/ {compact(targets[id])}</em></span>)}</div>
  </>;
}

/** Evolução de classe: só os filhos diretos do nó atual, escolha irreversível com confirmação. */
export function EvolutionPanel({ character }: { character: Character }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const { profile } = character, current = CLASS_BY_ID[profile.classId], options = evolutionOptions(profile);
  return <>
    <div className="subsection-heading"><h3>Evolução de classe</h3><small>{profile.classPath.map(id => CLASS_BY_ID[id].name).join(' → ')}</small></div>
    {!options.length ? <p className="empty-state">{current.name} está no fim do caminho.</p> : <div className="evolution-list">{options.map(({ node, met, missing }) => <article key={node.id} className={`evolution-card ${met ? 'ready' : ''}`}>
      <div><strong>{node.name}</strong>{node.specialty && <small>{node.specialty}</small>}</div>
      {met ? (confirming === node.id
        ? <div className="talent-confirm"><p>Evoluir {character.name} para <b>{node.name}</b>? Não há volta.</p><div><button onClick={() => setConfirming(null)}>Cancelar</button><button className="primary" onClick={() => { gameStore.evolve(character.id, node.id); setConfirming(null); }}>Confirmar</button></div></div>
        : <button className="primary" onClick={() => setConfirming(node.id)}>Evoluir</button>)
        : <ul>{missing.map(text => <li key={text}>{text}</li>)}</ul>}
    </article>)}</div>}
  </>;
}
