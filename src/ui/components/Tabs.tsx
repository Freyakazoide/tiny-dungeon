import { useRef, type KeyboardEvent } from 'react';

/** Abas acessíveis: role tablist/tab, aria-selected e setas ← → (Home/End) para navegar; o foco acompanha a aba. */
export function Tabs({ tabs, value, onChange, label = 'Seções' }: { tabs: readonly string[]; value: string; onChange: (tab: string) => void; label?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + last) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? last : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(tabs[next]); refs.current[next]?.focus();
  };
  return <div className="tabs" role="tablist" aria-label={label}>{tabs.map((tab, index) =>
    <button key={tab} ref={el => { refs.current[index] = el; }} type="button" role="tab" id={`tab-${tab}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
      className={tab === value ? 'on' : ''} onClick={() => onChange(tab)} onKeyDown={event => onKey(event, index)}>{tab}</button>)}</div>;
}
