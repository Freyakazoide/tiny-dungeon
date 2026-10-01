import { useEffect, useState } from 'react';
import type { Character, GameState, Stats } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { NAME_LIMIT } from '../game/core/GameEngine';
import { CLASS_BY_ID, COUNTER_TARGETS } from '../game/rpg/classTree';
import { NODE_PASSIVES } from '../game/rpg/passives';
import { COUNTER_IDS } from '../game/rpg/profile';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { formatEta } from '../game/rpg/curves';
import { analyzerMetrics } from '../game/systems/analyzer';
import { COUNTER_NAMES } from '../game/systems/guide';
import { characterStats, classLabel, statBreakdown, xpForLevel, type StatPart } from '../game/systems/progression';
import { talentPointsAvailable } from '../game/systems/talentGrid';
import { compact, pct } from './format';
import { Icon } from './components/Icon';
import { Avatar } from './components/Avatar';
import { nextGates, profIcon } from './RpgPanels';
import { AppearancePicker } from './AppearancePicker';
import type { Look } from '../game/art/look';

const ATTRS: { key: keyof Stats; label: string; icon: string }[] = [
  { key: 'attack', label: 'Ataque', icon: 'stat_attack' }, { key: 'defense', label: 'Defesa', icon: 'stat_defense' },
  { key: 'attackSpeed', label: 'Velocidade', icon: 'stat_speed' }, { key: 'crit', label: 'Crítico', icon: 'stat_crit' },
  { key: 'resistance', label: 'Resistência', icon: 'stat_resistance' }, { key: 'magicPower', label: 'Poder mágico', icon: 'stat_magic' },
  { key: 'maxHp', label: 'HP máximo', icon: 'stat_hp' }, { key: 'maxMana', label: 'Mana máxima', icon: 'stat_mana' },
];
const show = (key: keyof Stats, value: number) => key === 'crit' || key === 'resistance' ? `${Math.round(value * 100)}%` : key === 'attackSpeed' ? `${value.toFixed(2)}/s` : String(Math.round(value));
const partText = (p: StatPart, key: keyof Stats) => p.kind === 'percent' ? `${p.value >= 0 ? '+' : ''}${Math.round(p.value * 1000) / 10}%` : key === 'attackSpeed' ? p.value.toFixed(2) : String(Math.round(p.value * 10) / 10);

/** Um atributo com tooltip de composição (hover e foco de teclado). */
function Attr({ c, state, def }: { c: Character; state: GameState; def: (typeof ATTRS)[number] }) {
  const b = statBreakdown(c, state, def.key);
  const capped = b.cap !== undefined;
  return <div className="ch-attr" tabIndex={0} aria-label={`${def.label}: ${show(def.key, b.total)}${capped ? ' (teto 75%)' : ''}`}>
    <Icon name={def.icon} size={24} /><span>{def.label}</span><b>{show(def.key, b.total)}{capped && <em>teto 75%</em>}</b>
    <div className="pk-tip" role="tooltip"><div className="h">{def.label} · {show(def.key, b.total)}</div>
      {b.parts.map((p, i) => <div key={i} className={`l ${p.kind === 'percent' || i > 0 ? 'g' : ''}`}><span>{p.label}</span><span>{partText(p, def.key)}</span></div>)}
      {capped && <div className="l"><span>Teto</span><span>{Math.round(b.cap! * 100)}%</span></div>}</div>
  </div>;
}

/** Aba Ficha (Fase 9): retrato, vitais, atributos com composição, caminho de classe, próxima meta, passivas e contadores. */
export function CharacterSheet({ state, character }: { state: GameState; character: Character }) {
  const { profile } = character, stats = characterStats(character, state), needed = xpForLevel(profile.level);
  const [name, setName] = useState(character.name), [editing, setEditing] = useState(false), [draftLook, setDraftLook] = useState<Look | null>(null);
  useEffect(() => setName(character.name), [character.id, character.name]);
  useEffect(() => setDraftLook(null), [character.id]);
  const metrics = analyzerMetrics(state.analyzer), perSecond = metrics.xpPerHour / 3600;
  const xpEta = perSecond > 0 ? formatEta((needed - profile.xp) / perSecond) : null;
  const gates = nextGates(character), skills = Object.entries(gates.skills) as [keyof typeof PROFICIENCIES, { need: number; tier: number }][];
  const free = talentPointsAvailable(character), tier = CLASS_BY_ID[profile.classId].tier;
  const steps = [{ id: 'aprendiz', label: 'Tier 0' }, { id: '', label: 'Tier 1' }, { id: '', label: 'Tier 2' }].map((step, i) => {
    const nodeId = profile.classPath.find(id => CLASS_BY_ID[id]?.tier === i);
    return { label: step.label, name: nodeId ? CLASS_BY_ID[nodeId].name : 'Bloqueado', state: i < tier ? 'done' : i === tier ? 'cur' : 'lock' };
  });
  const passives = profile.classPath.filter(id => NODE_PASSIVES[id]);
  return <div className="ch-sheet">
    <div className="ch-col">
      <div className="ch-portrait pk-panel studs">
        <div className="ch-stage"><span className="ch-level"><b>{profile.level}</b><small>NÍVEL</small></span>
          <span className="ch-roles">{character.isTank && <span className="pk-tag esp">Tanque</span>}<span className="pk-tag afim">{character.row === 'front' ? 'Frente' : 'Trás'}</span></span>
          <Avatar character={character} size={150} /></div>
        <div className="ch-name">{character.name}</div>
        <div className="ch-crumbs">{profile.classPath.map((id, i) => <span key={id}>{i > 0 && '› '}{i === profile.classPath.length - 1 ? <b>{CLASS_BY_ID[id].name}</b> : CLASS_BY_ID[id].name}</span>)}</div>
        <div className="pk-bar xp" style={{ width: '100%' }} role="progressbar" aria-label="Experiência" aria-valuenow={Math.round(pct(profile.xp, needed))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct(profile.xp, needed)}%` }} /><span className="t">{compact(profile.xp)} / {compact(needed)} XP</span></div>
        <small className="muted">{xpEta ? `faltam ~${xpEta} para o nível ${profile.level + 1}` : `faltam ${compact(Math.ceil(needed - profile.xp))} XP`}</small>
        <div className="pk-row">
          <button type="button" className="pk-btn sm" aria-expanded={editing} onClick={() => setEditing(!editing)}>✎ Renomear / Aparência</button>
        </div>
        {editing && <div className="ch-edit">
          <div className="pk-row"><input aria-label="Nome do personagem" value={name} maxLength={NAME_LIMIT} onChange={event => setName(event.target.value)} />
            <button type="button" className="pk-btn sm" onClick={() => gameStore.rename(character.id, name)}>Renomear</button></div>
          <div className="creation-sprite"><span>Aparência</span>
            <AppearancePicker value={draftLook ?? character.look} restore={character.look} onChange={setDraftLook} label={`Aparência de ${character.name}`} />
            <div className="pk-row"><button type="button" className="pk-btn sm primary" disabled={!draftLook} onClick={() => { if (draftLook && gameStore.setLook(character.id, draftLook)) setDraftLook(null); }}>Aplicar</button>
              <button type="button" className="pk-btn sm" onClick={() => { setDraftLook(null); setEditing(false); }}>Cancelar</button></div></div>
        </div>}
      </div>
      <div className="ch-vitals pk-panel">
        {([['stat_hp', 'hp', 'HP', character.hp, stats.maxHp], ['stat_mana', 'mp', 'Mana', character.mana, stats.maxMana]] as const).map(([icon, tone, label, value, max]) =>
          <div className="ch-vrow" key={label}><Icon name={icon} size={24} /><div><div className={`pk-bar ${tone}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}><i style={{ width: `${pct(value, max)}%` }} /><span className="t">{Math.round(value)} / {max}</span></div></div></div>)}
      </div>
    </div>
    <div className="ch-col">
      <div className="ch-card pk-panel"><h4 className="pk-sec">Atributos</h4><div className="ch-agrid">{ATTRS.map(def => <Attr key={def.key} c={character} state={state} def={def} />)}</div></div>
      <div className="ch-path pk-panel" aria-label="Caminho de classe">{steps.map(step => <div key={step.label} className={`ch-step ${step.state}`}><small>{step.label}</small><b>{step.name}</b></div>)}</div>
      <div className="ch-goal pk-panel"><h4 className="pk-sec">Próxima meta <small>{classLabel(character)}</small></h4>
        {gates.level && <div className="ch-req"><Icon name="stat_xp" size={24} /><div><div className="ch-top"><span>Nível {gates.level.need} (Tier {gates.level.tier})</span><span>{profile.level}/{gates.level.need}</span></div><div className="pk-bar thin xp"><i style={{ width: `${pct(profile.level, gates.level.need)}%` }} /></div></div></div>}
        {skills.map(([id, g]) => { const cur = profile.proficiencies[id].level; return <div className="ch-req" key={id}><Icon name={profIcon(id)} size={24} /><div><div className="ch-top"><span>{PROFICIENCIES[id].name} {g.need} (Tier {g.tier})</span><span>{cur}/{g.need}</span></div><div className="pk-bar thin ok"><i style={{ width: `${pct(cur, g.need)}%` }} /></div></div></div>; })}
        {!gates.level && !skills.length && <p className="muted">{tier >= 2 ? 'Você está no topo do caminho disponível.' : 'Nenhum requisito pendente: abra Classes para evoluir.'}</p>}
        {free > 0 && <p className="pk-tiny"><span className="pk-tag up">{free} {free === 1 ? 'ponto' : 'pontos'} de talento livres</span></p>}
      </div>
      <div className="ch-card pk-panel"><h4 className="pk-sec">Passivas</h4>
        {passives.map(id => <div className="ch-passive" key={id}><span className="pk-tag ok">Ativa</span><div><b>{NODE_PASSIVES[id].name}</b><br /><small className="muted">{CLASS_BY_ID[id].name}: {NODE_PASSIVES[id].description}</small></div></div>)}
        {!passives.length && <p className="muted">Nenhuma ainda: evolua de classe para ganhar passivas.</p>}
      </div>
      <details className="ch-counters pk-panel"><summary>Contadores <small>progresso vitalício rumo às subclasses</small></summary>
        <div className="ch-ctrs">{COUNTER_IDS.map(id => <div key={id}>{COUNTER_NAMES[id]}<b>{compact(profile.counters[id] ?? 0)} <span className="muted">/ {compact(COUNTER_TARGETS[id])}</span></b></div>)}</div></details>
    </div>
  </div>;
}
