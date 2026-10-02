/**
 * Papéis de pixel. Uma parte (lâmina, guarda, cabo…) guarda só PAPÉIS; a cor vem do material da receita.
 * O contorno externo não é desenhado: é calculado pela silhueta final (ver assemble.ts).
 */
export type Role = 'o' | 's' | 'b' | 'h' | 'p' | 'e' | 'l' | 'L' | 'd';
export const ROLE_KEYS: readonly Role[] = ['o', 's', 'b', 'h', 'p', 'e', 'l', 'L', 'd'];

export const ROLES: Record<Role, { nome: string; uso: string }> = {
  o: { nome: 'linha interna', uso: 'traço escuro dentro da peça (fresta, junção, sulco); usa o contorno profundo do material' },
  s: { nome: 'sombra', uso: 'lado oposto à luz (baixo e direita)' },
  b: { nome: 'base', uso: 'cor principal do material' },
  h: { nome: 'brilho', uso: 'lado da luz (cima e esquerda)' },
  p: { nome: 'specular', uso: 'ponto de luz forte; só aparece em material com brilho forte ou médio' },
  e: { nome: 'emissivo', uso: 'runas e brilho mágico; usa a cor emissiva do material' },
  l: { nome: 'líquido', uso: 'conteúdo (poção): base do material do slot de líquido da receita' },
  L: { nome: 'líquido claro', uso: 'superfície e brilho do líquido' },
  d: { nome: 'líquido escuro', uso: 'fundo e sombra do líquido' },
};

/** Papéis do contorno automático (calculado, nunca desenhado na parte). */
export const OUTLINE_ROLES = {
  profundo: 'borda de baixo e da direita (sombra): cor `deep` do material',
  lateral: 'borda de cima e da esquerda (luz): cor `rim` do material, mais clara e colorida',
} as const;

export const isRole = (ch: string): ch is Role => (ROLE_KEYS as readonly string[]).includes(ch);
