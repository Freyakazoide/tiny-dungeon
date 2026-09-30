import { useState, type CSSProperties } from 'react';
import type { Character } from '../game/core/types';
import { uiStore } from './uiStore';
import { Icon } from './components/Icon';
import { gameStore } from '../game/core/GameStore';
import { CLASSES } from '../game/data/classes';
import { COUNTER_TARGETS } from '../game/rpg/classTree';
import { evolutionOptions } from '../game/rpg/evolution';
import { elementFocus, focusSpellEquipped, isElement, trainingNow, trainMultiplier } from '../game/systems/progression';
import { affinityCategory, affinityFor } from '../game/rpg/affinity';
import { COUNTER_NAMES } from '../game/systems/guide';
import { etaSeconds, formatEta, TRIES_PER_SECOND, triesForNextLevel } from '../game/rpg/curves';
import { runtime } from '../game/rpg/runtime';
import { offlineSelection } from '../game/rpg/offline';
import { MAX_PROFICIENCY_LEVEL, PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../game/rpg/proficiencies';
import { COUNTER_IDS } from '../game/rpg/profile';
import { compact, pct } from './format';

/** Requisito mínimo (entre as opções de evolução) que ainda falta em cada proficiência, e o do nível do personagem. */
export function nextGates(character: Character) {
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

export const profIcon = (id: ProficiencyId) => PROFICIENCIES[id].group === 'elemental' ? `elem_${id}` : `prof_${id}`;

/** Cartão de uma proficiência: ícone, nível, selos, barra de tries e ETA. */
function ProfTile({ character, id, gates, primary, focus }: { character: Character; id: ProficiencyId; gates: ReturnType<typeof nextGates>; primary: ProficiencyId; focus?: ProficiencyId }) {
  const { profile } = character, rate = TRIES_PER_SECOND * runtime.trainScale;
  const progress = profile.proficiencies[id], needed = triesForNextLevel(id, progress.level), maxed = progress.level >= MAX_PROFICIENCY_LEVEL;
  const affinity = affinityFor(profile, id), multiplier = trainMultiplier(character, id), active = trainingNow(character, id), gate = gates.skills[id];
  return <article className={`ch-ptile pk-panel ${id === focus ? 'foco' : ''}`} style={{ '--pc': `var(--el-${id}, var(--gold-2))` } as CSSProperties} aria-label={PROFICIENCIES[id].name}>
    <Icon name={profIcon(id)} size={48} />
    <div>
      <div className="ch-nm"><strong className="ch-pname">{PROFICIENCIES[id].name}</strong><span className="ch-lv">{progress.level}</span></div>
      <div className="ch-tags">{id === primary && <span className="pk-tag esp">Principal</span>}{id === focus && <span className="pk-tag foco">Foco</span>}{profile.offlineTargets.includes(id) && id !== focus && <span className="pk-tag off">Offline</span>}
        {affinity !== 1 && <span className={`pk-tag ${affinity > 1 ? 'up' : 'afim'}`} title={`Afinidade da classe: ×${affinity}`}>{affinityCategory(affinity)} ×{String(Math.round(multiplier * 100) / 100).replace('.', ',')}</span>}</div>
      <div className="pk-bar thin xp"><i style={{ width: `${maxed ? 100 : pct(progress.tries, needed)}%` }} /></div>
      <div className="ch-eta">{compact(progress.tries)} / {maxed ? 'máx.' : compact(needed)} tries · {maxed ? 'máximo' : active ? `~${formatEta(etaSeconds(id, progress.level, progress.tries, progress.level + 1, rate * multiplier))} p/ o próximo nível` : 'parado'}</div>
      {gate && <div className="ch-eta">Porta do Tier {gate.tier}: {gate.need} · {active ? `faltam ~${formatEta(etaSeconds(id, progress.level, progress.tries, gate.need, rate * multiplier))}` : 'parado'}</div>}
    </div>
  </article>;
}

/** Vaga de treino offline: soquete com o ícone e um popover de escolha (só proficiências treináveis). */
function Socket({ character, slot }: { character: Character; slot: 0 | 1 }) {
  const { profile } = character, [open, setOpen] = useState(false), current = profile.offlineTargets[slot];
  return <div className="ch-socket pk-panel" style={{ position: 'relative' }}>
    <button type="button" className={`ch-socket-box ${current ? '' : 'empty'}`} aria-label={`Vaga offline ${slot + 1}: ${current ? PROFICIENCIES[current].name : 'vazia'}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      {current ? <Icon name={profIcon(current)} size={48} /> : '+'}</button>
    <div><b>Vaga {slot + 1}</b><br /><small className="muted">{current ? PROFICIENCIES[current].name : 'usar as últimas escolhidas'}</small></div>
    {open && <div className="pk-tip" role="dialog" aria-label={`Escolher proficiência da vaga ${slot + 1}`} style={{ left: 0, top: '100%', display: 'block' }}>
      <div className="h">Treinar offline</div>
      <div className="pk-row">
        <button type="button" className="pk-btn sm" onClick={() => { gameStore.setOfflineTarget(character.id, slot, null); setOpen(false); }}>— Últimas</button>
        {PROFICIENCY_IDS.filter(id => affinityFor(profile, id) > 0).map(id => <button type="button" key={id} className="pk-btn sm" onClick={() => { gameStore.setOfflineTarget(character.id, slot, id); setOpen(false); }}><Icon name={profIcon(id)} size={24} />{PROFICIENCIES[id].name}</button>)}
      </div></div>}
  </div>;
}

/** As 13 proficiências: porta de evolução, combate, elementos treináveis (bloqueados numa faixa compacta) e vagas offline. */
export function ProficiencyGrid({ character }: { character: Character }) {
  const { profile } = character, primary = CLASSES[character.classId].weaponSkill;
  const focus = elementFocus(character), focusReady = focusSpellEquipped(character), gates = nextGates(character), closing = offlineSelection(profile);
  const base = PROFICIENCY_IDS.filter(id => PROFICIENCIES[id].group !== 'elemental'), elements = PROFICIENCY_IDS.filter(id => PROFICIENCIES[id].group === 'elemental');
  const trainable = elements.filter(id => affinityFor(profile, id) > 0), blocked = elements.filter(id => affinityFor(profile, id) <= 0);
  const tile = (id: ProficiencyId) => <ProfTile key={id} character={character} id={id} gates={gates} primary={primary} focus={focus} />;
  return <>
    {gates.level && <div className="ch-gate pk-panel"><Icon name="stat_xp" size={48} /><div><b>Porta do Tier {gates.level.tier}</b><br /><small className="muted">personagem nível {gates.level.need} (atual {profile.level})</small></div>
      <div className="pk-bar xp"><i style={{ width: `${pct(profile.level, gates.level.need)}%` }} /><span className="t">{profile.level} / {gates.level.need}</span></div></div>}
    <h4 className="pk-sec">Combate e magia <small>sobem por tempo de combate</small></h4>
    <div className="ch-ptiles">{base.map(tile)}</div>
    <h4 className="pk-sec">Elementos <small>só o elemento em foco sobe por magia</small></h4>
    {trainable.length > 0 && <div className="ch-ptiles">{trainable.map(tile)}</div>}
    {blocked.length > 0 && <div className="blockedbar pk-panel flat" style={{ padding: 10, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span className="pk-tag blq">Bloqueados</span>{blocked.map(id => <span key={id} className="pk-chip"><Icon name={profIcon(id)} size={24} />{PROFICIENCIES[id].name}</span>)}
      <button type="button" className="pk-btn sm" onClick={() => uiStore.open('classes')}>Ver afinidade</button></div>}
    {profile.offlineTargets.some(id => !!id && isElement(id)) && !focusReady && <p className="muted">Sem magia do foco equipada: nada treina.</p>}
    <h4 className="pk-sec">Treino offline <small>2 vagas · até 24 h por retorno, sem loot</small></h4>
    <div className="ch-sockets">{([0, 1] as const).map(slot => <Socket key={slot} character={character} slot={slot} />)}</div>
    <p className="muted pk-tiny">{closing.length ? `Se você fechar agora, treinam: ${closing.map(id => PROFICIENCIES[id].name).join(' e ')}.` : 'Se você fechar agora, nada treina (escolha uma vaga ou treine algo antes).'} A 1ª vaga elemental vira o foco online; o XP e o ouro vêm da hunt mais avançada, a 25%.</p>
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
