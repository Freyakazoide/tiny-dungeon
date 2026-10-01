import { useEffect, useRef } from 'react';
import type { ClassNode } from '../../game/rpg/classTree';
import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../../game/rpg/proficiencies';
import { requirementRows, type RequirementRow } from '../../game/systems/guide';
import type { Character } from '../../game/core/types';
import { compact } from '../format';
import { Icon } from '../components/Icon';
import { profIcon } from '../RpgPanels';

export const reqValue = (row: RequirementRow) => row.have === null ? 'em breve' : row.kind === 'counter' ? `${compact(row.have)}/${compact(row.need)}` : `${row.have}/${row.need}`;
export const reqLabel = (row: RequirementRow) => row.kind === 'level' ? 'Nível' : row.label;
export const reqNeed = (row: RequirementRow) => `${reqLabel(row)} ${row.kind === 'counter' ? compact(row.need) : row.need}`;

/** Tipo da subclasse: Pura (1 proficiência), Híbrida (2) ou Com contador. */
export const subclassKind = (node: ClassNode) => node.requires.elements ? 'Elementos livres' : node.requires.counters && Object.keys(node.requires.counters).length ? 'Com contador' : Object.keys(node.requires.skills ?? {}).length >= 2 ? 'Híbrida' : 'Pura';

/** Até 3 barras de requisito: nível, proficiências e contadores, nessa ordem. */
export function ReqBars({ character, node }: { character: Character; node: ClassNode }) {
  const rows = requirementRows(character, node).slice(0, 3);
  return <div className="cl-reqs">{rows.map(row => {
    const ratio = row.have === null ? 0 : Math.min(1, row.need ? row.have / row.need : 1);
    return <div key={row.key} className={`cl-req ${row.met ? 'ok' : ''}`}><span>{reqLabel(row)}</span>
      <div className={`pk-bar thin ${row.met ? 'ok' : 'xp'}`}><i style={{ width: `${ratio * 100}%` }} /></div>
      <span className="v">{row.met ? '✔' : reqValue(row)}</span></div>;
  })}</div>;
}

const AFF = (m: number) => m >= 1.5 ? 'esp' : m > 1 ? 'plus' : m === 1 ? 'afim' : m > 0 ? 'fora' : 'blq';
const fmt = (m: number) => `×${String(Math.round(m * 100) / 100).replace('.', ',')}`;
/** Os 13 slots de proficiência com o multiplicador de treino da classe. */
export function AffinityStrip({ affinity }: { affinity: Record<ProficiencyId, number> }) {
  return <div><div className="cl-aff">{PROFICIENCY_IDS.map(id => <span key={id} className={`cl-a ${AFF(affinity[id])}`} title={`${PROFICIENCIES[id].name}: ${affinity[id] <= 0 ? 'bloqueada' : fmt(affinity[id])}`} aria-label={`${PROFICIENCIES[id].name}: ${affinity[id] <= 0 ? 'bloqueada' : fmt(affinity[id])}`}>
    <Icon name={profIcon(id)} size={24} /><span>{affinity[id] <= 0 ? '🔒' : fmt(affinity[id])}</span></span>)}</div>
    <div className="cl-legend" style={{ marginTop: 6 }}>{([['#e5ca91', 'Especialista'], ['#c7c36a', 'Afim+'], ['#9aa3ad', 'Afim'], ['#e0a05c', 'Fora'], ['#d8554f', 'Bloqueada']] as const).map(([color, label]) => <span key={label} style={{ '--ac': color } as React.CSSProperties}><i />{label}</span>)}</div></div>;
}

/** Diálogo de confirmação sobre o modal: foco preso, Esc cancela só ele. */
export function ConfirmDialog({ title, labelledBy, children, confirmLabel, onConfirm, onCancel, error }: { title: string; labelledBy: string; children: React.ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; error?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cancel = ref.current?.querySelector<HTMLElement>('[data-cancel]'); cancel?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); onCancel(); return; }
      if (event.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled)'));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onCancel]);
  return <div className="cl-overlay on"><div className="pk-panel cl-dialog" role="alertdialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref}>
    <h3 id={labelledBy}>{title}</h3>{children}
    {error && <div className="cl-warn" role="alert">⚠ {error}</div>}
    <div className="row"><button type="button" className="pk-btn" data-cancel onClick={onCancel}>Cancelar</button><button type="button" className="pk-btn primary" onClick={onConfirm}>{confirmLabel}</button></div>
  </div></div>;
}
