import type { Material, MaterialKind } from './materials';
import { isRole, type Role } from './roles';

import type { Rarity } from '../../core/types';
export type { Rarity };
export type Family = 'espada' | 'arco' | 'cajado';
/** Categoria do slot: decide de qual lista de materiais a raridade sorteia. */
export type SlotCategory = 'lamina' | 'guarnicao' | 'cabo' | 'gema' | 'corda' | 'efeito';
export type Point = [x: number, y: number];

/**
 * Efeito: parte desenhada por cima de outra (runas, ferrugem, brilho). Alinha o seu `ref` ao anchor `ancora` do slot `slot`.
 * `modo`: `dentro` só pinta onde o alvo tem pixel (runas na lâmina); `fora` só onde está vazio (faíscas); `livre` pinta por cima de tudo.
 */
export type EffectMode = 'dentro' | 'fora' | 'livre';
export interface EffectTarget { slot: string; ancora: string; ref: string; modo: EffectMode }

export interface PartDef {
  id: string; nome: string; familia: Family; slot: string;
  /** Uma string por linha de pixels; `.` é vazio e as demais letras são papéis (`roles.ts`). */
  grid: string[];
  /** Pontos de encaixe (x, y) na própria grade; precisam cair em pixel pintado (exceto `ref` de efeitos). */
  anchors: Record<string, Point>;
  /** Slot de efeito. */
  alvo?: EffectTarget;
  /** Curadoria: só combina com estes materiais (ids) / tipos de material / material emissivo. Sem restrição = qualquer. */
  materiais?: string[]; tipos?: MaterialKind[]; exigeEmissivo?: boolean;
  /** Combinações proibidas com partes de outros slots, no formato `slot/id`. */
  incompativel?: string[];
  /** Menor raridade em que o sorteio usa esta parte (padrão: common). */
  desde?: Rarity;
  /** Parte que é só uma linha entre dois anchors (corda do arco): papéis repetidos ao longo da linha. */
  linha?: string;
}

export interface Join { slot: string; ancora: string; em: string; emAncora: string }
export interface Line { de: string; ate: string; slot: string }
export interface SlotDef { slot: string; nome: string; categoria: SlotCategory; /** espelhado em vertical a partir de outro slot (mesma parte e material) */ espelhaDe?: string; opcional?: boolean }
export interface Template {
  familia: Family; nome: string; slots: SlotDef[];
  /** Slot ancorado na origem; os demais se encaixam por `joins`. */
  raiz: string; joins: Join[];
  /** Linhas entre anchors `slot.ancora` (a corda do arco). */
  linhas?: Line[];
  /** Ordem de desenho, de trás para a frente. */
  ordem: string[];
}

/** Valida a grade e os anchors de uma parte; devolve a mensagem de erro ou `''`. */
export function checkPart(p: PartDef): string {
  const where = `${p.familia}/${p.slot}/${p.id}`;
  if (p.linha !== undefined) return [...p.linha].every(isRole) && p.linha.length ? '' : `${where}: linha com papel inválido`;
  if (!p.grid.length) return `${where}: grade vazia`;
  const w = p.grid[0].length;
  for (const [y, row] of p.grid.entries()) {
    if (row.length !== w) return `${where}: linha ${y} tem ${row.length} colunas (esperado ${w})`;
    for (const ch of row) if (ch !== '.' && !isRole(ch)) return `${where}: caractere "${ch}" não é um papel (linha ${y})`;
  }
  for (const [name, [x, y]] of Object.entries(p.anchors)) {
    if (x < 0 || y < 0 || x >= w || y >= p.grid.length) return `${where}: anchor ${name} fora da grade`;
    const isRef = p.alvo?.ref === name;
    if (!isRef && p.grid[y][x] === '.') return `${where}: anchor ${name} (${x},${y}) cai em pixel vazio`;
  }
  return '';
}

export const roleAt = (p: PartDef, x: number, y: number): Role | null => { const ch = p.grid[y]?.[x]; return ch && isRole(ch) ? ch : null; };

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const rarityRank = (r: Rarity) => RARITY_ORDER.indexOf(r);
export const RARITIES = RARITY_ORDER;

/** A parte aceita este material? (regra de compatibilidade; o sorteio e o estúdio usam o mesmo teste) */
export const compatible = (p: PartDef, m: Material): boolean =>
  (!p.materiais || p.materiais.includes(m.id)) && (!p.tipos || p.tipos.includes(m.tipo)) && (!p.exigeEmissivo || !!m.emissive);
/** Duas partes que a curadoria proíbe juntas (declarado em qualquer um dos lados). */
export const clash = (a: PartDef, b: PartDef): boolean => !!a.incompativel?.includes(`${b.slot}/${b.id}`) || !!b.incompativel?.includes(`${a.slot}/${a.id}`);
