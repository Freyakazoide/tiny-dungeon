import type { ItemInstance } from '../game/core/types';
import { PROFICIENCIES, type ProficiencyId } from '../game/rpg/proficiencies';
import { classItem } from '../game/data/classItems';
import { attrValue } from '../game/systems/gear';
import { effectLabel, formatEffectValue } from '../game/systems/talentGrid';

/** Linhas de descrição de uma instância: bônus fixo, Arm, passiva, mecânica e atributos aleatórios. */
export function gearLines(instance: ItemInstance) {
  const base = classItem(instance.baseId);
  if (!base) return { fixed: '', passive: '', mechanic: undefined as string | undefined, attrs: [] as string[] };
  const fixed = (Object.entries(base.fixed) as [ProficiencyId, number][]).map(([id, n]) => `+${n} ${PROFICIENCIES[id].name}`).join(', ');
  return {
    fixed: [fixed, base.arm ? `Arm ${base.arm}` : ''].filter(Boolean).join(' · '),
    passive: base.mechanic ? '' : (base.effects ?? []).map(e => `${effectLabel(e.code)} ${formatEffectValue(e.code, e.value)}`).join('; '),
    mechanic: base.mechanic,
    attrs: instance.attrs.map(a => `${effectLabel(a.code)} ${formatEffectValue(a.code, attrValue(a.code, a.level))} (nv. ${a.level})`),
  };
}

