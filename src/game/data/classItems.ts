import raw from './items-tier1.json';
import raw2 from './items-tier2.json';
import type { Slot } from '../core/types';
import type { ProficiencyId } from '../rpg/proficiencies';

/** Catálogo de itens de classe Tier 1 (Fase 7): 675 itens base, 15 classes × 9 slots × 5 opções. Não gere à mão: mude o JSON. */
export type Quality = 'standard' | 'superior' | 'bis';
export type Classification = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export type SlotGroup = 'w1' | 'w2' | 'off' | 'head' | 'body' | 'legs' | 'boots' | 'amu' | 'ring';
export type OffhandKind = 'shield' | 'focus' | 'dual' | 'quiver';
export type ArmorCategory = 'heavy' | 'medium' | 'light';

export interface ClassItemDef {
  id: string; name: string; slot: Slot; slotGroup: SlotGroup; index: number; quality: Quality;
  /** Ids de classe (nós da árvore) que podem equipar: vale se qualquer um estiver no `classPath`. */
  classes: string[];
  /** Bônus fixo: +N níveis de proficiência. */
  fixed: Partial<Record<ProficiencyId, number>>;
  hands?: 1 | 2; offhandKind?: OffhandKind; armorCategory?: ArmorCategory; arm?: number;
  /** Passiva numérica (códigos do catálogo de talentos, em pontos percentuais). */
  effects?: { code: string; value: number }[];
  /** Regra especial com nome próprio (sem bônus numérico): entra em fase futura, a UI mostra "Em breve". */
  mechanic?: string;
  passive: string;
}
interface ClassItemsFile {
  version: number;
  config: { itemAttrScale: number; attrLevelCap: number; rollLevel: [number, number]; rarityAttrs: Record<Classification, number> };
  items: ClassItemDef[];
}

const file = raw as unknown as ClassItemsFile;
export const ITEM_CONFIG = file.config;
/** Tier 1 (675, 15 classes × 9 slots × 5) + Tier 2 (540, 90 especializações × 6), gerado por tools/items/gen_tier2_items.py. */
export const TIER1_ITEMS: readonly ClassItemDef[] = file.items;
export const TIER2_ITEMS: readonly ClassItemDef[] = (raw2 as unknown as { items: ClassItemDef[] }).items;
export const CLASS_ITEMS: readonly ClassItemDef[] = [...TIER1_ITEMS, ...TIER2_ITEMS];
export const CLASS_ITEM_BY_ID: ReadonlyMap<string, ClassItemDef> = new Map(CLASS_ITEMS.map(item => [item.id, item]));
export const classItem = (id: string) => CLASS_ITEM_BY_ID.get(id);
/** Itens que um nó de classe pode usar (o dono e os compartilhados). */
export const itemsForClass = (classNodeId: string) => CLASS_ITEMS.filter(item => item.classes.includes(classNodeId));

export const CLASSIFICATIONS: readonly Classification[] = ['common', 'uncommon', 'rare', 'legendary', 'mythic'];
export const CLASSIFICATION_NAMES: Record<Classification, string> = { common: 'Comum', uncommon: 'Incomum', rare: 'Rara', legendary: 'Lendária', mythic: 'Mítica' };
export const QUALITY_NAMES: Record<Quality, string> = { standard: 'Padrão', superior: 'Superior', bis: 'BiS' };
export const QUALITIES: readonly Quality[] = ['standard', 'superior', 'bis'];
export const SLOT_GROUP_NAMES: Record<SlotGroup, string> = { w1: 'Arma 1 mão', w2: 'Arma 2 mãos', off: 'Mão secundária', head: 'Elmo', body: 'Armadura', legs: 'Calças', boots: 'Botas', amu: 'Amuleto', ring: 'Anel' };

/** `mechanic` dos itens com código próprio no engine. Enquanto vazio, a UI mostra "Em breve". */
export const ITEM_MECHANICS_IMPLEMENTED = new Set<string>();
