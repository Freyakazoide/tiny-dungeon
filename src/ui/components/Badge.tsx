import type { ReactNode } from 'react';

/** Círculo no canto de um botão: `gold` = algo bom (pontos livres, pode evoluir), `red` = precisa de atenção; `pulse` só para "pode evoluir". */
export function Badge({ tone = 'red', pulse = false, title, children }: { tone?: 'gold' | 'red'; pulse?: boolean; title?: string; children: ReactNode }) {
  return <span className={`badge ${tone} ${pulse ? 'pulse' : ''}`} title={title}>{children}</span>;
}

/** Selo compacto de estado (HUD, hunts). */
export function Chip({ tone, title, className = '', children }: { tone?: 'ok' | 'warn' | 'danger'; title?: string; className?: string; children: ReactNode }) {
  return <span className={`chip ${tone ?? ''} ${className}`} title={title}>{children}</span>;
}
