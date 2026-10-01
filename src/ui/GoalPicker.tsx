import { itemById } from '../game/data/items';
import { kitOfNode } from '../game/data/classes';
import { GOAL_NODES, goalSummary, trainRingId } from '../game/rpg/goals';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { HOW_TO_PROFICIENCY } from '../game/systems/guide';

interface Props { value: string | undefined; onChange: (goal: string | undefined) => void; label: string; }

/** Escolha da classe futura: explica o caminho Squire → classe e o que treinar. Nenhum item de classe é dado: ele é conquistado. */
export function GoalPicker({ value, onChange, label }: Props) {
  const info = value ? goalSummary(value) : undefined;
  return <div className="goal-picker">
    <div className="goal-chips" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={!value} className={`goal-chip ${!value ? 'on' : ''}`} onClick={() => onChange(undefined)}>Decidir depois</button>
      {GOAL_NODES.map(n => <button type="button" role="radio" aria-checked={value === n.id} key={n.id} className={`goal-chip ${value === n.id ? 'on' : ''}`} onClick={() => onChange(n.id)}>{n.name}</button>)}
    </div>
    {info
      ? <div className="goal-detail" aria-live="polite">
        <b>{info.node.name}</b> <small>{info.node.specialty}</small>
        <p>Você começa como <b>Squire</b>. Ao chegar no <b>nível {info.level}</b> com <b>{PROFICIENCIES[info.gate].name} {info.gateLevel}</b>, pode evoluir para {info.node.name}{info.subclasses ? ` — e depois escolher entre ${info.subclasses} subclasses` : ''}.</p>
        <p><b>Treine:</b> {PROFICIENCIES[info.gate].name} — {HOW_TO_PROFICIENCY[info.gate]}. O Squire recebe o <i>{itemById(trainRingId(info.gate))?.name}</i> (+15% de tries nessa habilidade); a classe e seus itens você conquista jogando.</p>
        <p><small>Afinidades: {info.affinity}. Sugestão: {itemById(info.plan.weaponId)?.name} e elemento {PROFICIENCIES[info.plan.element].name} (já aplicados abaixo; você pode mudar).{kitOfNode(info.node.id) === 'squire' ? ' Kit de combate próprio dessa classe: em breve.' : ''}</small></p>
      </div>
      : <p className="goal-detail"><small>Opcional. Você pode escolher o objetivo depois, no menu Classes.</small></p>}
  </div>;
}
