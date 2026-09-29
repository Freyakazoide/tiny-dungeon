import { useMemo, useState } from 'react';
import type { Character, GameState, ItemDef, Rarity, Slot } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { itemById } from '../game/data/items';
import { BUY_QUANTITIES, shopStock, type ShopEntry } from '../game/data/shop';
import { equipBlockReason } from '../game/systems/equipment';
import { itemIcon, SLOT_IDS, slotNames, statLine } from './format';

type Filter = 'all' | 'equipment' | 'supply' | 'loot';
type Sort = 'rarity' | 'value' | 'name';
type Container = 'bp' | 'loot' | 'supply';
interface Entry { container: Container; itemId: string; quantity: number; item: ItemDef; }

const FILTERS: [Filter, string][] = [['all', 'Todos'], ['equipment', 'Equipamento'], ['supply', 'Suprimentos'], ['loot', 'Loot']];
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function ShopRow({ entry, gold, quantities, note }: { entry: ShopEntry; gold: number; quantities: readonly number[]; note?: string }) {
  const item = itemById(entry.itemId)!;
  return <div className={`shop-row ${entry.unlocked ? '' : 'locked'}`}>
    <span><b className={`rarity-${item.rarity}`}>{item.name}</b><small>{item.kind === 'supply' ? `${item.amount} ${item.supply === 'health' ? 'vida' : 'mana'}` : `${item.slot ? slotNames[item.slot] : ''} · ${statLine(item.stats)}`} · {entry.price} ouro{note ? ` · ${note}` : ''}</small></span>
    <span className="shop-buttons">{quantities.map(q => <button key={q} disabled={!entry.unlocked || gold < entry.price * q} onClick={() => gameStore.buy(entry.itemId, q)}>×{q}</button>)}</span>
  </div>;
}

/** Aba Itens: equipamento do personagem, mochila com filtro/ordem e loja rápida, tudo na mesma tela. */
export function ItemsPanel({ state, character }: { state: GameState; character: Character }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('rarity');
  const entries = useMemo(() => {
    const all: Entry[] = (['bp', 'supply', 'loot'] as Container[]).flatMap(container =>
      state.inventory[container].flatMap(stack => { const item = itemById(stack.itemId); return item ? [{ container, itemId: stack.itemId, quantity: stack.quantity, item }] : []; }));
    const shown = all.filter(entry => filter === 'all' || entry.item.kind === filter);
    return shown.sort((a, b) => sort === 'name' ? a.item.name.localeCompare(b.item.name)
      : sort === 'value' ? b.item.value - a.item.value || a.item.name.localeCompare(b.item.name)
      : RARITY_ORDER.indexOf(b.item.rarity) - RARITY_ORDER.indexOf(a.item.rarity) || a.item.name.localeCompare(b.item.name));
  }, [state.inventory, filter, sort]);
  const best = Math.max(0, ...state.team.map(id => state.characters.find(c => c.id === id)?.profile.level ?? 0)), stock = shopStock(state.huntId, best);
  const lootStacks = state.inventory.loot, lootValue = lootStacks.reduce((sum, s) => sum + (itemById(s.itemId)?.value ?? 0) * s.quantity, 0);
  const lootCount = lootStacks.reduce((sum, s) => sum + s.quantity, 0);
  const swapOptions = (slot: Slot) => state.inventory.bp.map(s => itemById(s.itemId)).filter((item): item is ItemDef => !!item && item.slot === slot && !equipBlockReason(character, item));

  return <section className="items-panel">
    <div className="section-heading"><div><span className="eyebrow">Itens de {character.name}</span><h2>Equipamento, mochila e loja</h2></div><div className="gold-display">◉ {state.gold.toLocaleString('pt-BR')} ouro</div></div>

    <div className="subsection-heading"><h3>Equipamento</h3><small>Os itens iniciais ficam aqui, nos slots de cada personagem.</small></div>
    <div className="equipment-grid">{SLOT_IDS.map(slot => {
      const item = itemById(character.equipment[slot] ?? ''), options = swapOptions(slot);
      return <article className="equipment-cell" key={slot}>
        <span className="slot-name">{slotNames[slot]}</span>
        {item ? <><b className={`rarity-${item.rarity}`}>{itemIcon(item)} {item.name}</b><small>{statLine(item.stats) || 'Sem atributos'}</small></> : <b className="empty-slot">Vazio</b>}
        <div className="equipment-actions">
          <select aria-label={`Trocar ${slotNames[slot]}`} value="" disabled={!options.length} onChange={event => event.target.value && gameStore.equip(character.id, event.target.value)}>
            <option value="">{options.length ? 'Trocar…' : 'Nada para trocar'}</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {item && <button onClick={() => gameStore.unequip(character.id, slot)}>Remover</button>}
        </div>
      </article>;
    })}</div>

    <div className="subsection-heading"><h3>Mochila</h3>
      <div className="bag-controls">
        <div className="segmented" role="tablist" aria-label="Filtro">{FILTERS.map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
        <label>Ordenar <select value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="rarity">Raridade</option><option value="value">Valor</option><option value="name">Nome</option></select></label>
      </div>
    </div>
    <div className="bag-list">{entries.map(entry => {
      const { item } = entry, reason = item.kind === 'equipment' ? equipBlockReason(character, item) : undefined;
      return <article className="bag-row" key={`${entry.container}-${entry.itemId}`}>
        <span className={`item-icon rarity-${item.rarity}`}>{itemIcon(item)}</span>
        <div className="bag-row-copy"><b className={`rarity-${item.rarity}`}>{item.name} <em>×{entry.quantity}</em></b>
          <small>{item.kind === 'equipment' ? `${item.slot ? slotNames[item.slot] : ''} · ${statLine(item.stats)}` : item.kind === 'supply' ? `Recupera ${item.amount} de ${item.supply === 'health' ? 'vida' : 'mana'}` : 'Loot para vender'} · {item.value} ouro</small>
          {reason && <small className="warn">{reason}</small>}</div>
        <div className="bag-row-actions">
          {item.kind === 'equipment' && <button className="primary" disabled={!!reason} title={reason} onClick={() => gameStore.equip(character.id, item.id)}>Equipar em {character.name}</button>}
          {item.kind === 'supply' && <button onClick={() => gameStore.useSupply(character.id, item.id)}>Usar em {character.name}</button>}
          <button onClick={() => gameStore.sell(entry.container, item.id)}>Vender 1</button>
        </div>
      </article>;
    })}{!entries.length && <p className="empty-state">Nenhum item neste filtro.</p>}</div>

    <div className="subsection-heading"><h3>Loja</h3><small>Ouro: {state.gold.toLocaleString('pt-BR')} · liberação de poções pelo maior nível da equipe ({best}).</small></div>
    <div className="shop-grid">
      <div><h4>Suprimentos</h4>{stock.potions.map(entry => <ShopRow key={entry.itemId} entry={entry} gold={state.gold} quantities={BUY_QUANTITIES} note={entry.unlocked ? undefined : `nível ${entry.unlockLevel}`} />)}</div>
      <div><h4>Ferreiro</h4>{stock.smith.length ? stock.smith.map(entry => <ShopRow key={entry.itemId} entry={entry} gold={state.gold} quantities={[1]} />) : <p className="empty-state">O Ferreiro vende o conjunto da hunt anterior; esta hunt não tem uma anterior com conjunto.</p>}</div>
    </div>

    <div className="subsection-heading"><h3>Loja rápida</h3></div>
    <div className="shop-box"><span>{lootCount} itens de loot · valor total <b>{lootValue.toLocaleString('pt-BR')} ouro</b></span>
      <button className="primary" disabled={!lootCount} onClick={() => gameStore.sellAllLoot()}>Vender todo o loot</button></div>
  </section>;
}
