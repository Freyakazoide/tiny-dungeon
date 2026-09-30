import { useState, type CSSProperties } from 'react';

/** Base dos PNGs (pixel art 96×96): public/assets/ui/icons/<nome>.png. Relativo à página, para funcionar em qualquer subcaminho. */
export const ICON_PATH = 'assets/ui/icons';

/**
 * Ícone da interface: tenta o PNG e, se o arquivo não existir (ou não carregar), cai num SVG genérico sem quebrar
 * nem poluir o console. Decorativo por padrão; passe `label` para ele virar uma imagem com nome acessível.
 */
export function Icon({ name, size = 28, label, className = '' }: { name: string; size?: number; label?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const style: CSSProperties = { width: size, height: size };
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  if (failed === name) {
    return <svg className={`icon icon-fallback ${className}`} style={style} viewBox="0 0 24 24" data-icon={name} {...a11y}>
      <path d="M12 2.5 21 8v8l-9 5.5L3 16V8z" fill="#241c0f" stroke="#9a7a3f" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 7v6M12 16v1" stroke="#e5ca91" strokeWidth="2" strokeLinecap="round" />
    </svg>;
  }
  return <img className={`icon ${className}`} style={style} src={`${ICON_PATH}/${name}.png`} alt={label ?? ''} data-icon={name} draggable={false} onError={() => setFailed(name)} {...(label ? {} : { 'aria-hidden': true })} />;
}
