import type { Character, GameState } from '../game/core/types';
import { BagTab } from './items/BagTab';
import { ShopTab, SellTab, SmithTab } from './items/CommerceTabs';
import { EquipmentTab } from './items/EquipmentTab';
import { SuppliesTab } from './items/SuppliesTab';

/** Seções dos modais Itens (equipment, bag, supplies) e Comércio (shop, smith, sell): cada uma é um componente em `items/`. */
export type ItemsSection = 'equipment' | 'bag' | 'supplies' | 'shop' | 'smith' | 'sell';

export function ItemsPanel({ state, character, section = 'equipment' }: { state: GameState; character: Character; section?: ItemsSection }) {
  return <section className="items-panel">
    {section === 'equipment' && <EquipmentTab state={state} character={character} />}
    {section === 'bag' && <BagTab state={state} character={character} />}
    {section === 'supplies' && <SuppliesTab state={state} character={character} />}
    {section === 'shop' && <ShopTab state={state} />}
    {section === 'smith' && <SmithTab state={state} character={character} />}
    {section === 'sell' && <SellTab state={state} />}
  </section>;
}
