import { useState } from 'react';
import type { Character } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { CLASS_BY_ID, childrenOf, type ClassNode } from '../game/rpg/classTree';
import { formatEta } from '../game/rpg/curves';
import { nextSteps, pathNames, requirementRows, treeSplit, type RequirementRow } from '../game/systems/guide';
import { compact } from './format';

function RequirementLine({ row }: { row: RequirementRow }) {
  const progress = row.have === null ? 'em breve' : `${compact(row.have)} / ${compact(row.need)}`;
  return <li className={row.met ? 'met' : row.untracked ? 'untracked' : ''}>
    <span className="req-mark" aria-hidden="true">{row.met ? '✓' : row.untracked ? '…' : '○'}</span>
    <div><b>{row.label} {row.kind === 'skill' || row.kind === 'level' ? `${row.need}` : compact(row.need)}</b>
      <small>{row.kind === 'counter' ? progress : `atual ${row.have}`}
        {row.kind === 'skill' && !row.met && <> · {row.training ? `faltam ~${formatEta(row.eta ?? Infinity)}` : 'parado'}</>}</small>
      {!row.met && <small className="how-to">Como treinar: {row.howTo}</small>}</div>
  </li>;
}

function StepCard({ character, node, rows, ready }: { character: Character; node: ClassNode; rows: RequirementRow[]; ready: boolean }) {
  const [confirming, setConfirming] = useState(false);
  return <article className={`evolution-card ${ready ? 'ready' : ''}`}>
    <div><strong>{node.name}</strong>{node.specialty && <small>{node.specialty}</small>}</div>
    <ul className="req-list">{rows.map(row => <RequirementLine key={row.key} row={row} />)}</ul>
    {ready && (confirming
      ? <div className="talent-confirm"><p>Evoluir {character.name} para <b>{node.name}</b>? Não há volta.</p><div><button onClick={() => setConfirming(false)}>Cancelar</button><button className="primary" onClick={() => { gameStore.evolve(character.id, node.id); setConfirming(false); }}>Confirmar</button></div></div>
      : <button className="primary" onClick={() => setConfirming(true)}>Evoluir</button>)}
  </article>;
}

function TreeNode({ character, node, muted }: { character: Character; node: ClassNode; muted?: boolean }) {
  const kids = childrenOf(node.id), taken = character.profile.classPath.includes(node.id);
  return <details className={`tree-node ${muted ? 'muted' : ''} ${taken ? 'taken' : ''}`}>
    <summary><b>{node.name}</b>{node.specialty && <small> · {node.specialty}</small>}{taken && <em>seu caminho</em>}</summary>
    <ul className="tree-kids">{node.tier === 1 && requirementRows(character, node).map(row => <li key={row.key}><small>{row.label} {row.need}</small></li>)}
      {kids.map(kid => <li key={kid.id} className={character.profile.classPath.includes(kid.id) ? 'taken' : ''}><b>{kid.name}</b>
        <small>{requirementRows(character, kid).map(r => `${r.label} ${r.kind === 'counter' ? compact(r.need) : r.need}${r.untracked ? ' (em breve)' : ''}`).join(' · ')}</small></li>)}</ul>
  </details>;
}

/** Aba Classes: guia "o que treinar" para o próximo tier, com checklist, ETA e a árvore completa. */
export function ClassesPanel({ character }: { character: Character }) {
  const steps = nextSteps(character), { active, discarded } = treeSplit(character), current = CLASS_BY_ID[character.profile.classId];
  return <section className="classes-panel">
    <div className="section-heading"><div><span className="eyebrow">Guia de evolução</span><h2>Classes de {character.name}</h2></div></div>
    <p className="class-path">Caminho atual: <b>{pathNames(character).join(' → ')}</b></p>

    <div className="subsection-heading"><h3>Próximo passo</h3><small>{steps.length ? 'Evoluir é irreversível: as outras opções viram caminhos descartados.' : ''}</small></div>
    {steps.length
      ? <div className="evolution-list">{steps.map(step => <StepCard key={step.node.id} character={character} {...step} />)}</div>
      : <p className="empty-state">{current.name} está no fim do caminho.</p>}

    <div className="subsection-heading"><h3>Árvore completa</h3><small>{active.length} {active.length === 1 ? 'classe base aberta' : 'classes base'}</small></div>
    <div className="tree">{active.map(node => <TreeNode key={node.id} character={character} node={node} />)}</div>

    {discarded.length > 0 && <>
      <div className="subsection-heading"><h3>Caminhos descartados</h3><small>Somente leitura.</small></div>
      <div className="tree muted-tree">{discarded.map(node => <TreeNode key={node.id} character={character} node={node} muted />)}</div>
    </>}
  </section>;
}
