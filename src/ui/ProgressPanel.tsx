import type { Character, GameState } from '../game/core/types';
import { HUNTS } from '../game/data/hunts';
import { nextSteps } from '../game/systems/guide';
import { formatEta } from '../game/rpg/curves';
import { talentPointsAvailable } from '../game/systems/talentGrid';
import { compact } from './format';
import { uiStore } from './uiStore';
import { gameStore } from '../game/core/GameStore';
import { GoalPicker } from './GoalPicker';
import { goalSummary } from '../game/rpg/goals';
import { CLASS_BY_ID, childrenOf } from '../game/rpg/classTree';
import { requirementRows } from '../game/systems/guide';
import { ClassPerks } from './classes/ClassPerks';

const rowText = (row: ReturnType<typeof requirementRows>[number]) => `${row.label} ${row.kind === 'counter' ? compact(row.need) : row.need}`;

/** Caminho do personagem: Squire → classe-alvo → subclasses, com os requisitos de cada degrau. */
function PathCard({ character }: { character: Character }) {
  const goal = character.goal ? goalSummary(character.goal) : undefined, isSquire = character.profile.classId === 'aprendiz';
  const subs = goal ? childrenOf(goal.node.id) : [];
  return <div className="card"><h3>Caminho de classe</h3>
    <p className="muted">Todo personagem começa como <b>Squire</b>. Tier 1: nível 10 + 25 na habilidade-porta. Tier 2: nível 25 + 38 numa habilidade (pura), 35+35 em duas (híbrida) ou 35 + um contador de façanhas. Itens de classe não são dados: são conquistados.</p>
    {goal && <p><b>{CLASS_BY_ID.aprendiz.name} → {goal.node.name}</b>{isSquire ? '' : character.profile.classPath.includes(goal.node.id) ? ' (alcançada)' : ' (outro caminho)'}</p>}
    {goal && subs.map(n => <div className="req" key={n.id}><span className="t"><b>{n.name}</b></span><span className="s">{requirementRows(character, n).map(rowText).join(' · ')}</span></div>)}
    {goal && <ClassPerks nodeId={goal.node.id} />}
    {isSquire && <><h4>Objetivo</h4><GoalPicker label={`Objetivo de ${character.name}`} value={character.goal} onChange={g => gameStore.setGoal(character.id, g ?? null)} /></>}
  </div>;
}

/** Progressão: metas e portas do personagem, talentos livres e o avanço por hunt (chefes derrotados, XP/h e ouro/h medidos). */
export function ProgressPanel({ state, character }: { state: GameState; character: Character }) {
  const steps = nextSteps(character), points = talentPointsAvailable(character);
  return <section className="progress-panel">
    <div className="grid g2">
      <PathCard character={character} />
      <div className="card"><h3>Metas de {character.name}</h3>
        {steps.length ? steps.map(step => <div key={step.node.id}><b>{step.node.name}</b>{step.rows.map(row => <div className="req" key={row.key}>
          <span className="t">{row.label} {row.kind === 'counter' ? compact(row.need) : row.need}</span>
          <span className={`s ${row.met ? 'ok' : 'no'}`}>{row.met ? 'pronto' : row.have === null ? 'em breve' : row.kind === 'counter' ? `${compact(row.have)}/${compact(row.need)}` : `${row.have}/${row.need}${row.eta ? ` · ~${formatEta(row.eta)}` : ''}`}</span></div>)}</div>)
          : <p className="empty-state">{character.name} chegou ao fim do caminho.</p>}
        <button className="btn" onClick={() => uiStore.openClasses()}>Ver guia de classes →</button></div>
      <div className="card"><h3>Talentos</h3><div className="req"><span className="t">Pontos livres</span><span className={`s ${points ? 'ok' : ''}`}>{points}</span></div>
        <button className="btn" onClick={() => uiStore.open('personagem', { tab: 'Talentos' })}>Abrir a grade de talentos →</button></div>
    </div>
    <div className="subsection-heading"><h3>Hunts</h3><small>Medido pelo seu jogo: XP/h, ouro/h e chefes derrotados em cada uma.</small></div>
    <div className="grid g3">{HUNTS.map(hunt => { const stat = state.huntStats[hunt.id], hours = stat ? stat.activeMs / 3_600_000 : 0;
      return <div className="card" key={hunt.id}><h3>{hunt.name}</h3>
        <div className="kv"><span>Chefes derrotados</span><b>{stat?.bossKills ?? 0}</b></div>
        <div className="kv"><span>XP/h</span><b>{hours > 0.05 ? compact(stat.xp / hours) : '—'}</b></div>
        <div className="kv"><span>Ouro/h</span><b>{hours > 0.05 ? compact(stat.gold / hours) : '—'}</b></div></div>; })}</div>
  </section>;
}
