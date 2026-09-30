import { Icon } from '../components/Icon';
import type { ItemView } from './itemView';

/** PNGs de item (`item_*`/`loot_*`) presentes em public/assets/ui/icons, sem ".png". Um teste confere com o diretório. */
export const ITEM_ICON_PNGS = new Set<string>([]);

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FAMILIES: [string, string[]][] = [
  ['item_sword', ['espada', 'lamina', 'sabre', 'gladio', 'alfanje', 'montante', 'fendedor', 'tempestade']],
  ['item_axe', ['machado']], ['item_hammer', ['martelo', 'maca']], ['item_staff', ['cajado', 'bastao', 'bordao', 'cetro']],
  ['item_wand', ['varinha']], ['item_dagger', ['adaga', 'punhal', 'presa']], ['item_bow', ['arco']], ['item_crossbow', ['besta']],
  ['item_spear', ['lanca', 'pique', 'alabarda']], ['item_scythe', ['foice', 'ceifador', 'ceifa-garganta']],
  ['item_firearm', ['pistola', 'rifle', 'canhao', 'lancador']], ['item_instrument', ['flauta', 'lira', 'alaude', 'harpa', 'violino', 'bandolim']],
  ['item_gloves', ['luvas', 'ataduras']], ['item_flask', ['frasco']],
];
const LOOT: [string, string[]][] = [
  ['loot_bone', ['osso', 'cranio', 'dente', 'presa']], ['loot_pelt', ['pele', 'pelo', 'couro']], ['loot_scale', ['escama', 'carapaca', 'casca']],
  ['loot_ore', ['minerio', 'rocha', 'nucleo de pedra']], ['loot_crystal', ['cristal', 'coracao de gelo', 'gema']],
  ['loot_dust', ['po ', 'cinza', 'brasa', 'simbolo', 'pena']], ['loot_trophy', ['coroa de teias', 'dente de hidra', 'calice profano']],
];
const first = (candidates: string[]) => candidates.find(name => ITEM_ICON_PNGS.has(name));

/** Nome do ícone: poção → família da arma/escudo → loot → `slot_<slot>`. Só devolve nomes que existem. */
export function itemIconName(view: Pick<ItemView, 'kind' | 'slot' | 'name'> & { supply?: 'health' | 'mana'; offhandKind?: string }): string {
  const name = norm(view.name) + ' ';
  if (view.kind === 'supply') return view.supply === 'mana' ? 'stat_mana' : 'stat_hp';
  if (view.kind === 'loot') return first([...LOOT.filter(([, words]) => words.some(w => name.includes(w))).map(([id]) => id), 'loot_generic']) ?? 'stat_gold';
  if (view.slot === 'offhand' && view.offhandKind) return first([view.offhandKind === 'shield' ? 'item_shield' : view.offhandKind === 'focus' ? 'item_focus' : view.offhandKind === 'quiver' ? 'item_quiver' : '']) ?? 'slot_offhand';
  if (view.slot === 'weapon' || view.slot === 'offhand') {
    const words = name.split(/\s+/).slice(0, 2);
    const hit = FAMILIES.find(([, keys]) => words.some(word => keys.includes(word)));
    if (hit && ITEM_ICON_PNGS.has(hit[0])) return hit[0];
  }
  return view.slot ? `slot_${view.slot}` : 'stat_gold';
}

/** Ícone do item: sempre um PNG que existe (nunca o SVG genérico). */
export function ItemIcon({ view, size = 48, className }: { view: Parameters<typeof itemIconName>[0]; size?: number; className?: string }) {
  return <Icon name={itemIconName(view)} size={size} className={className} />;
}
