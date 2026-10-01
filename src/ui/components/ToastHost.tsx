import { useEffect, useSyncExternalStore } from 'react';
import { gameStore } from '../../game/core/GameStore';
import type { GameFx } from '../../game/core/GameEngine';

/** Avisos curtos no canto do mapa: no máximo 4 visíveis, 5 s cada. Vêm de eventos do engine (GameFx), não de consulta em loop. */
export type ToastKind = 'info' | 'good' | 'warn' | 'danger';
export interface Toast { id: number; kind: ToastKind; text: string; }
export const TOAST_MAX = 4, TOAST_MS = 5000;

let toasts: Toast[] = [], nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
export const toastStore = {
  get: () => toasts,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  push(kind: ToastKind, text: string) {
    const toast = { id: nextId++, kind, text };
    toasts = [...toasts, toast].slice(-TOAST_MAX); emit();
    setTimeout(() => toastStore.dismiss(toast.id), TOAST_MS);
  },
  dismiss(id: number) { toasts = toasts.filter(t => t.id !== id); emit(); },
  clear() { toasts = []; emit(); },
};

/** Traduz um evento do engine em aviso (ou nada). */
export function toastForFx(fx: GameFx): { kind: ToastKind; text: string } | undefined {
  if (fx.type === 'drop' && fx.text?.startsWith('Equipamento:')) return { kind: 'good', text: `Drop: ${fx.text.replace('Equipamento: ', '')}` };
  if (fx.type === 'wave' && fx.text?.startsWith('Nova hunt:')) return { kind: 'info', text: fx.text };
  if (fx.type === 'wave' && fx.text && /Horda|Invasão/.test(fx.text)) return { kind: 'warn', text: fx.text };
  if (fx.type === 'recovery') return { kind: 'danger', text: 'Equipe derrotada. Recuperação em 5 segundos.' };
  return undefined;
}

export function ToastHost() {
  const list = useSyncExternalStore(toastStore.subscribe, toastStore.get);
  useEffect(() => { const off = gameStore.onFx(fx => { const t = toastForFx(fx); if (t) toastStore.push(t.kind, t.text); }); return () => { off(); }; }, []);
  return <div className="toasts" role="status" aria-live="polite">{list.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div>;
}
