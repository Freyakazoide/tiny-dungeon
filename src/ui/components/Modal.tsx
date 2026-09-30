import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

export type ModalSize = 'sm' | 'md' | 'xl';

const FOCUSABLE = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

/**
 * Janela de menu: role dialog + aria-modal, foco preso (Tab e Shift+Tab circulam), Esc e clique no fundo fecham (quem fecha
 * é o ModalHost, que devolve o foco ao ícone). A caçada continua por trás: o fundo só escurece e desfoca o mapa.
 */
export function Modal({ title, subtitle, icon, iconSize = 24, size = 'md', headerExtra, tabs, footerHint = 'A caçada continua rodando por trás deste menu.', onClose, children }: {
  title: string; subtitle?: string; icon: string; iconSize?: number; size?: ModalSize; headerExtra?: ReactNode; tabs?: ReactNode; footerHint?: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => { dialog.current?.focus(); }, []);
  const trap = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialog.current) return;
    const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.hasAttribute('hidden') && el.tabIndex >= 0);
    if (!items.length) { event.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="veil open" data-testid="veil" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} className={`modal ${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} onKeyDown={trap}>
      <div className="m-head"><span className="ic pk-panel flat"><Icon name={icon} size={iconSize} /></span><div className="m-title"><h2 id="modal-title">{title}</h2>{subtitle && <small>{subtitle}</small>}</div>
        {headerExtra}<button type="button" className="x" aria-label="Fechar" onClick={onClose}>✕</button></div>
      {tabs}
      <div className="m-body">{children}</div>
      <div className="m-foot"><span>{footerHint}</span><span className="grow" /><span><kbd>Esc</kbd> fecha</span></div>
    </section></div>;
}
