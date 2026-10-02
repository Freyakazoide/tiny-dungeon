import type { Role } from './roles';

export type MaterialKind = 'metal' | 'cristal' | 'organico' | 'magia';
/** Quanto o papel `p` (specular) aparece: forte = quase branco; médio = meio caminho do brilho; nenhum = igual ao brilho. */
export type Shine = 'forte' | 'medio' | 'nenhum';
export const SHINE_FACTOR: Record<Shine, number> = { forte: 1, medio: .5, nenhum: 0 };

/**
 * Rampa de cor de um material. Hue shifting dentro da rampa: sombras puxam para o frio/escuro, brilhos para o quente/claro
 * (ouro: marrom-avermelhado → laranja → dourado → amarelo → quase branco).
 * `deep` é o contorno profundo (borda de baixo/direita); `rim` é o contorno lateral colorido (borda de cima/esquerda).
 */
export interface Material {
  id: string; nome: string; tipo: MaterialKind; brilho: Shine;
  deep: string; rim: string; shadow: string; base: string; highlight: string; specular: string;
  /** Cor do papel `e`; sem ela o `e` cai no brilho (material que não emite luz). */
  emissive?: string;
}

const mat = (id: string, nome: string, tipo: MaterialKind, brilho: Shine, deep: string, rim: string, shadow: string, base: string, highlight: string, specular: string, emissive?: string): Material =>
  ({ id, nome, tipo, brilho, deep, rim, shadow, base, highlight, specular, emissive });

export const MATERIALS: Record<string, Material> = Object.fromEntries([
  //   id                 nome                tipo       brilho   deep       rim        shadow     base       highlight  specular   emissive
  mat('ferro',            'Ferro',            'metal',   'forte', '#1b2130', '#4f6a8e', '#55607a', '#8693a8', '#bcc9d9', '#f4f9ff'),
  mat('ferro_enferrujado','Ferro enferrujado','metal',   'nenhum','#201c22', '#6a4a40', '#47434c', '#7b7479', '#a8a09c', '#c8c0b8'),
  mat('aco_negro',        'Aço negro',        'metal',   'forte', '#06070d', '#3b4575', '#1f2335', '#353c58', '#5c6890', '#cfd9ff'),
  mat('prata',            'Prata',            'metal',   'forte', '#1d2536', '#6a8fc4', '#6f7e9c', '#b4c2d8', '#e6eef8', '#ffffff'),
  mat('ouro',             'Ouro',             'metal',   'forte', '#3a1a10', '#b5521c', '#b8642a', '#e8a93a', '#ffd95e', '#fff8cf'),
  mat('bronze',           'Bronze',           'metal',   'medio', '#2e160e', '#9a4a22', '#8a4a2a', '#c07a3a', '#e8a85a', '#ffe0a8'),
  mat('couro',            'Couro',            'organico','nenhum','#1f130d', '#7a4a2a', '#5a3820', '#8a5a34', '#b07a48', '#c89260'),
  mat('couro_vermelho',   'Couro vermelho',   'organico','nenhum','#260a10', '#9a2230', '#6e1620', '#a52a32', '#d44c48', '#e8706a'),
  mat('madeira',          'Madeira',          'organico','nenhum','#1d1209', '#7a5430', '#5a3a1e', '#8a6034', '#b08448', '#c89c60'),
  mat('madeira_negra',    'Madeira negra',    'organico','nenhum','#0b0a12', '#4a3a60', '#241e32', '#3c3250', '#5e4e74', '#74648c'),
  mat('osso',             'Osso',             'organico','medio', '#2a2420', '#9a8a6c', '#9a8e78', '#cfc4a8', '#efe8d0', '#fffaec'),
  mat('cristal_arcano',   'Cristal arcano',   'cristal', 'forte', '#190c3a', '#6a3ad0', '#4a2a9a', '#8a56e8', '#c196ff', '#f6ecff', '#e0b8ff'),
  mat('luz_solar',        'Luz solar',        'magia',   'forte', '#4a1a0a', '#e0661c', '#e8841e', '#ffb62e', '#ffe066', '#fffbd0', '#fff6a8'),
  mat('essencia_funesta', 'Essência funesta', 'magia',   'forte', '#04180f', '#1f8a4a', '#14683a', '#2fb45a', '#7aea8a', '#e8ffe4', '#b8ff8a'),
  mat('ferrugem',         'Ferrugem',         'organico','nenhum','#2a120c', '#8a3a1c', '#6a3220', '#a85a2c', '#d08a44', '#e0a060'),
].map(m => [m.id, m]));

export const materialIds = (): string[] => Object.keys(MATERIALS);
export const materialOf = (id: string): Material => {
  const m = MATERIALS[id]; if (!m) throw new Error(`material desconhecido: ${id}`); return m;
};

export type Rgb = [number, number, number];
export const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as Rgb;
export const luma = ([r, g, b]: Rgb) => .2126 * r + .7152 * g + .0722 * b;

/** Cor de um papel num material. */
export function roleColor(m: Material, role: Role): Rgb {
  switch (role) {
    case 'o': return hex(m.deep);
    case 's': return hex(m.shadow);
    case 'b': return hex(m.base);
    case 'h': return hex(m.highlight);
    case 'p': return mix(hex(m.highlight), hex(m.specular), SHINE_FACTOR[m.brilho]);
    case 'e': return hex(m.emissive ?? m.highlight);
  }
}
