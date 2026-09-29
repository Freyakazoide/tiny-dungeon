import type { Character } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { CLASSES } from '../game/data/classes';
import { COUNTER_TARGETS } from '../game/rpg/classTree';
import { evolutionOptions } from '../game/rpg/evolution';
import { elementFocus, focusSpellEquipped, isElement, trainingNow } from '../game/systems/progression';
import { COUNTER_NAMES } from '../game/systems/guide';
import { etaSeconds, formatEta, TRIES_PER_SECOND, triesForNextLevel } from '../game/rpg/curves';
import { runtime } from '../game/rpg/runtime';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../game/rpg/proficiencies';
import { COUNTER_IDS } from '../game/rpg/profile';
import { compact } from './format';
import { ProgressBar } from './ProgressBar';

/** Requisito mínimo (entre as opções de evolução) que ainda falta em cada proficiência, e o do nível do personagem. */
function nextGates(character: Character) {
  const skills: Partial<Record<ProficiencyId, { need: number; tier: number }>> = {};
  let level: { need: number; tier: number } | undefined;
  for (const { node } of evolutionOptions(character.profile)) {
    for (const [id, need] of Object.entries(node.requires.skills ?? {}) as [ProficiencyId, number][]) {
      if (character.profile.proficiencies[id].level >= need) continue;
      const current = skills[id];
      if (!current || need < current.need) skills[id] = { need, tier: node.tier };
    }
    if (character.profile.level < node.requires.level && (!level || node.requires.level < level.need)) level = { need: node.requires.level, tier: node.tier };
  }
  return { skills, level };
}

/** As 13 proficiências (nível 10 inicial, sobem por uso), o foco de treino e quanto falta para cada porta. */
export function ProficiencyGrid({ character }: { character: Character }) {
  const { profile } = character, primary = CLASSES[character.classId].weaponSkill;
  const focus = elementFocus(character), focusReady = focusSpellEquipped(character), gates = nextGates(character);
  const rate = TRIES_PER_SECOND * runtime.trainScale;
    const training = (id: ProficiencyId) => trainingNow(character, id);
  return <>
    <div className="subsection-heading"><h3>Proficiências</h3><small>Arma e defesa sobem por tempo de combate; só o elemento em foco sobe por magia. Todas sobem offline no foco escolhido.</small></div>
    <div className="skill-grid">{PROFICIENCY_IDS.map(id => {
      const progress = profile.proficiencies[id], needed = triesForNextLevel(id, progress.level), maxed = progress.level >= MAX_PROFICIENCY_LEVEL;
      const active = training(id), gate = gates.skills[id];
      return <article className={`skill-card ${id === primary ? 'primary-skill' : ''}`} key={id}>
        <div><strong>{PROFICIENCIES[id].name}</strong>{id === primary && <em>Principal</em>}{id === focus && <em>Foco</em>}{profile.offlineTarget === id && id !== focus && <em>Offline</em>}<b>Lv. {progress.level}</b></div>
        <ProgressBar compact tone="skill" value={maxed ? 1 : progress.tries} max={maxed ? 1 : needed} label={`${compact(progress.tries)} tries`} detail={maxed ? 'máximo' : `${compact(needed)} necessários`} />
        {!maxed && <small className="eta">{active ? `faltam ~${formatEta(etaSeconds(id, progress.level, progress.tries, progress.level + 1, rate))} pro próximo nível` : 'parado'}</small>}
        {gate && <small className="gate">Porta do Tier {gate.tier}: {PROFICIENCIES[id].name} {gate.need} · {active ? `faltam ~${formatEta(etaSeconds(id, progress.level, progress.tries, gate.need, rate))}` : 'parado'}</small>}
      </article>;
    })}</div>
    {gates.level && <p className="gate-level">Porta do Tier {gates.level.tier}: personagem nível {gates.level.need} (atual {profile.level}).</p>}
    {profile.offlineTarget && isElement(profile.offlineTarget) && !focusReady && <p className="gate-level">Sem magia do foco equipada: nada treina.</p>}
    <label className="offline-target"><span>Foco de treino</span>
      <select value={profile.offlineTarget ?? ''} onChange={event => gameStore.setOfflineTarget(character.id, (event.target.value || undefined) as ProficiencyId | undefined)}>
        <option value="">Automático (elemento da primeira magia equipada / última treinada){profile.lastTrained ? ` — ${PROFICIENCIES[profile.lastTrained].name}` : ''}</option>
        {PROFICIENCY_IDS.map(id => <option key={id} value={id}>{PROFICIENCIES[id].name}</option>)}
      </select>
      <small>Vale online (elemento) e offline (qualquer proficiência, até 24 h de tries, sem XP nem loot).</small>
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
