/** Abas de topo: cada uma com um único propósito. */
export const TABS = ['Caçada', 'Grupo', 'Personagem', 'Itens', 'Classes', 'Sistema'] as const;
export type Tab = (typeof TABS)[number];
/** Abas internas de Personagem; Magias e Talentos vivem só aqui. */
export const CHARACTER_TABS = ['Ficha', 'Proficiências', 'Magias', 'Talentos'] as const;
export type CharacterTab = (typeof CHARACTER_TABS)[number];
/** Abas em que o seletor fixo de personagem vale. */
export const TABS_WITH_CHARACTER: readonly Tab[] = ['Personagem', 'Itens', 'Classes'];
