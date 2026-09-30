import { useSyncExternalStore } from 'react';
import { MODAL_IDS, RAIL_ITEMS, type ModalId } from './navigation';

/**
 * Estado de interface (qual modal, qual aba, qual personagem, opções), separado do `gameStore`: nada aqui entra no save.
 * Só as opções persistem (localStorage, com try/catch: pode estar bloqueado).
 */
export interface UiOptions { reduceMotion: boolean; pauseOnMenu: boolean; scale: 90 | 100 | 115; }
export interface UiState { modal: ModalId | null; tab: string | null; selected: string | null; options: UiOptions; }

const OPTIONS_KEY = 'tiny-dungeon-ui';
const DEFAULT_OPTIONS: UiOptions = { reduceMotion: false, pauseOnMenu: false, scale: 100 };

function loadOptions(): UiOptions {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(OPTIONS_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return { reduceMotion: !!parsed.reduceMotion, pauseOnMenu: !!parsed.pauseOnMenu, scale: [90, 100, 115].includes(parsed.scale) ? parsed.scale : 100 };
  } catch { return { ...DEFAULT_OPTIONS }; }
}

let state: UiState = { modal: null, tab: null, selected: null, options: loadOptions() };
const listeners = new Set<() => void>();
const set = (patch: Partial<UiState>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };

/** Elemento que tinha o foco antes de abrir o modal: o foco volta para ele ao fechar. */
let returnFocus: HTMLElement | null = null;
export const takeReturnFocus = () => { const el = returnFocus; returnFocus = null; return el; };

export const slug = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const writeHash = () => {
  if (typeof history === 'undefined' || typeof location === 'undefined') return;
  try { history.replaceState(null, '', state.modal && state.modal !== 'bemvindo' ? `#/${state.modal}${state.tab ? `/${slug(state.tab)}` : ''}` : location.pathname + location.search); } catch { /* ambiente sem history */ }
};

export const uiStore = {
  getState: () => state,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  /** Abre (ou troca) o modal; `tab` escolhe a aba, `who` o personagem. */
  open(id: ModalId, opts: { tab?: string; who?: string } = {}) {
    if (!state.modal && typeof document !== 'undefined') returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    set({ modal: id, tab: opts.tab ?? null, ...(opts.who ? { selected: opts.who } : {}) });
    writeHash();
  },
  close() { if (!state.modal) return; set({ modal: null, tab: null }); writeHash(); },
  toggle(id: ModalId) { if (state.modal === id) uiStore.close(); else uiStore.open(id); },
  setTab(tab: string) { set({ tab }); writeHash(); },
  select(id: string) { set({ selected: id }); },
  setOption<K extends keyof UiOptions>(key: K, value: UiOptions[K]) {
    set({ options: { ...state.options, [key]: value } });
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(state.options)); } catch { /* sem armazenamento */ }
  },
  /** Lê `#/modal/aba` (deep link) e abre; devolve true se abriu. */
  openFromHash(hash: string, tabs: (id: ModalId) => string[] = () => []) {
    const [, id, tab] = /^#\/([a-z]+)(?:\/([a-z0-9-]+))?/.exec(hash) ?? [];
    if (!id || !(MODAL_IDS as readonly string[]).includes(id)) return false;
    const match = tab ? tabs(id as ModalId).find(name => slug(name) === tab) : undefined;
    uiStore.open(id as ModalId, match ? { tab: match } : {});
    return true;
  },
  /** Reinicia o estado (testes). */
  reset() { state = { modal: null, tab: null, selected: null, options: { ...DEFAULT_OPTIONS } }; listeners.forEach(fn => fn()); },
};
export const useUi = () => useSyncExternalStore(uiStore.subscribe, uiStore.getState);

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);
/**
 * Atalhos globais: a tecla do trilho abre/fecha o modal, Esc fecha, ← → trocam de personagem. Não disparam dentro de
 * input/select/textarea nem com Ctrl/Meta/Alt. `characterIds` são os personagens que o modal aberto pode alternar.
 */
export function handleShortcut(event: KeyboardEvent, characterIds: string[] = []): boolean {
  if (event.key === 'Escape') { if (state.modal) { uiStore.close(); return true; } return false; }
  if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return false;
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && state.modal && characterIds.length > 1 && !(event.target instanceof HTMLElement && event.target.closest('[role=tablist]'))) {
    const at = Math.max(0, characterIds.indexOf(state.selected ?? characterIds[0]));
    uiStore.select(characterIds[(at + (event.key === 'ArrowRight' ? 1 : -1) + characterIds.length) % characterIds.length]);
    return true;
  }
  const item = RAIL_ITEMS.find(entry => entry.key && entry.key.toLowerCase() === event.key.toLowerCase());
  if (!item) return false;
  event.preventDefault(); uiStore.toggle(item.id); return true;
}
