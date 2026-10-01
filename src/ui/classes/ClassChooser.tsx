import { useState } from 'react';
import { itemById } from '../../game/data/items';
import { CLASS_PROFILES } from '../../game/data/classProfiles';
import { GOAL_NODES, goalSummary, trainRingId } from '../../game/rpg/goals';
import { PROFICIENCIES } from '../../game/rpg/proficiencies';
import { HOW_TO_PROFICIENCY } from '../../game/systems/guide';
import { ClassIcon } from './ClassIcon';
import { ClassPerks } from './ClassPerks';
import { SpecBrowser } from './SpecBrowser';

interface Props { value: string | undefined; onChange: (goal: string | undefined) => void; label: string; }

/**
 * Escolha da classe futura, no padrão novo: navegar por todas as classes e especializações (nada fica escondido por estar bloqueado)
 * e só então marcar uma como objetivo. Visualizar não escolhe; o botão "Seguir esta classe" escolhe.
 */
export function ClassChooser({ value, onChange, label }: Props) {
  const [viewing, setViewing] = useState<string>(value ?? GOAL_NODES[0].id);
  const node = GOAL_NODES.find(n => n.id === viewing) ?? GOAL_NODES[0], info = goalSummary(node.id)!;
  return <div className="cc" aria-label={label}>
    <div className="cc-tiles" role="listbox" aria-label={`${label}: classes`}>
      {GOAL_NODES.map(n => <button type="button" role="option" key={n.id} aria-selected={viewing === n.id} className={`pk-panel cl-tile ${viewing === n.id ? 'sel' : ''} ${value === n.id ? 'mine' : ''}`} onClick={() => setViewing(n.id)}>
        <ClassIcon node={n} /><b>{n.name}</b><small>{CLASS_PROFILES[n.id]?.role}{value === n.id ? ' · objetivo' : ''}</small></button>)}
    </div>
    <div className="cc-detail pk-panel">
      <div className="cl-phead"><ClassIcon node={node} size="big" /><div><div className="cl-name" style={{ fontSize: 18 }}>{node.name}</div><div className="cl-spec">{CLASS_PROFILES[node.id]?.tagline ?? node.specialty}</div>
        <div className="cl-tags"><span className="pk-tag afim">{CLASS_PROFILES[node.id]?.role}</span>{value === node.id && <span className="pk-tag ok">Seu objetivo</span>}</div></div>
        <div className="cc-pick">{value === node.id
          ? <button type="button" className="pk-btn" onClick={() => onChange(undefined)}>Remover objetivo</button>
          : <button type="button" className="pk-btn primary" onClick={() => onChange(node.id)}>Seguir esta classe</button>}</div></div>
      <div className="cc-path"><b>Caminho:</b> você começa como <b>Squire</b> (nível 1) → no <b>nível {info.level}</b> com <b>{PROFICIENCIES[info.gate].name} {info.gateLevel}</b> evolui para <b>{node.name}</b> → no nível 25 escolhe 1 de {info.subclasses} especializações.
        <small className="muted"> Treine {PROFICIENCIES[info.gate].name}: {HOW_TO_PROFICIENCY[info.gate]}. O Squire recebe o {itemById(trainRingId(info.gate))?.name} (+15% de tries); os itens de classe você conquista jogando.</small></div>
      <ClassPerks nodeId={node.id} />
      <h4 className="pk-sec">Especializações do Tier 2 <small>bloqueadas até o nível 25 · veja os detalhes</small></h4>
      <SpecBrowser key={node.id} base={node} />
    </div>
  </div>;
}
