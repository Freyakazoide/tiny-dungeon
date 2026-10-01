/** Todos os CSV de `arte/` como texto. Salvar um CSV recarrega este módulo e avisa quem assina (sem recarregar a página). */
const RAW = import.meta.glob('/arte/**/*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
type Listener = (files: Record<string, string>) => void;
const listeners: Set<Listener> = import.meta.hot?.data.listeners ?? new Set<Listener>();
if (import.meta.hot) { import.meta.hot.data.listeners = listeners; import.meta.hot.accept(); }
export const currentFiles = () => RAW;
export const subscribe = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
listeners.forEach(fn => fn(RAW));
