/** Menus do jogo: cada item do trilho abre um modal. A ordem aqui é a ordem no trilho (Sistema fica embaixo, separado). */
export const MODAL_IDS = ['personagem', 'itens', 'comercio', 'grupo', 'hunts', 'analyzer', 'helper', 'progressao', 'charms', 'sistema'] as const;
export type ModalId = (typeof MODAL_IDS)[number] | 'bemvindo';

export interface RailItem { id: (typeof MODAL_IDS)[number]; title: string; key: string | null; /** fica no fim do trilho, separado */ bottom?: boolean; }
export const RAIL_ITEMS: readonly RailItem[] = [
  { id: 'personagem', title: 'Personagem', key: 'C' },
  { id: 'itens', title: 'Itens', key: 'I' },
  { id: 'comercio', title: 'Comércio', key: 'L' },
  { id: 'grupo', title: 'Grupo', key: 'G' },
  { id: 'hunts', title: 'Hunts', key: 'H' },
  { id: 'analyzer', title: 'Analyzer', key: 'A' },
  { id: 'helper', title: 'Helper', key: 'P' },
  { id: 'progressao', title: 'Progressão', key: 'M' },
  { id: 'charms', title: 'Charms', key: null },
  { id: 'sistema', title: 'Sistema', key: 'S', bottom: true },
];

/** Abas internas de Personagem; Magias e Talentos vivem só aqui. */
export const CHARACTER_TABS = ['Ficha', 'Proficiências', 'Magias', 'Talentos', 'Classes'] as const;
export type CharacterTab = (typeof CHARACTER_TABS)[number];
