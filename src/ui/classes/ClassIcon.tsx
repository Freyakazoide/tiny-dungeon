import type { CSSProperties } from 'react';
import type { ClassNode } from '../../game/rpg/classTree';
import type { ProficiencyId } from '../../game/rpg/proficiencies';
import { Icon } from '../components/Icon';
import { profIcon } from '../RpgPanels';
import { TIER2_SPECS } from '../../game/rpg/tier2Specs';

/** PNGs `class_*` presentes em public/assets/ui/icons, sem ".png". Um teste confere com o diretório. */
export const CLASS_ICON_PNGS = new Set<string>(['guerreiro', 'guardiao', 'ladino', 'cacador', 'mago', 'clerigo', 'bardo', 'monge', 'bruxo', 'alquimista', 'mercenario', 'mestre_runico', 'ilusionista', 'druida', 'artilheiro', ...TIER2_SPECS.map(s => s.id)].map(id => `class_${id}`));

const gateSkill = (node: ClassNode) => Object.keys(node.requires.skills ?? {})[0] as ProficiencyId | undefined;

/** `class_<id>` se existir; senão o ícone da proficiência-porta; por último `classes`. Nunca o SVG genérico. */
export function classIconName(node: ClassNode): string {
  const own = `class_${node.id}`;
  if (CLASS_ICON_PNGS.has(own)) return own;
  const skill = gateSkill(node);
  return skill ? profIcon(skill) : 'classes';
}
const gateColor = (node: ClassNode) => { const skill = gateSkill(node); return skill && !['melee', 'ranged', 'defense', 'magic'].includes(skill) ? `var(--el-${skill})` : 'var(--gold-2)'; };

export function ClassIcon({ node, size = 'md' }: { node: ClassNode; size?: 'sm' | 'md' | 'big' }) {
  return <span className={`cl-ibox ${size === 'big' ? 'big' : ''}`} style={{ '--cc': gateColor(node), ...(size === 'sm' ? { width: 40, height: 40 } : {}) } as CSSProperties}><Icon name={classIconName(node)} size={size === 'big' ? 48 : 24} /></span>;
}
