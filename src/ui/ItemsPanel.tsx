import { useMemo, useState } from 'react';
import type { Character, GameState, ItemDef, Rarity, Slot } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { itemById } from '../game/data/items';
import { BUY_QUANTITIES, shopStock, type ShopEntry } from '../game/data/shop';
import { equipBlockReason } from '../game/systems/equipment';
import { itemIcon, SLOT_IDS, slotNames, statLine } from './format';
import { classItem } from '../game/data/classItems';
import { ClassSmith, GearCard, GearInventory, gearEquipReason, gearOptions } from './GearPanel';
import { analyzerMetrics } from '../game/systems/analyzer';
import { Icon } from './components/Icon';

/** Seções do painel: os modais Itens (equipment, bag, supplies) e Comércio (shop, smith, sell) mostram uma de cada vez; `all` é a página inteira. */
export type ItemsSection = 'all' | 'equipment' | 'bag' | 'supplies' | 'shop' | 'smith' | 'sell';
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
export function ItemsPanel({ state, character, section = 'all' }: { state: GameState; character: Character; section?: ItemsSection }) {
  const [filter, setFilter] = useState<Filter>('all');
  const show = (...names: ItemsSection[]) => section === 'all' || names.includes(section);
  const [sort, setSort] = useState<Sort>('rarity');
  const entries = useMemo(() => {
    const all: Entry[] = (['bp', 'supply', 'loot'] as Container[]).flatMap(container =>
      state.inventory[container].flatMap(stack => { const item = itemById(stack.itemId); return item ? [{ container, itemId: stack.itemId, quantity: stack.quantity, item }] : []; }));
    const shown = all.filter(entry => section === 'supplies' ? entry.item.kind === 'supply' : section === 'bag' ? entry.item.kind !== 'supply' && (filter === 'all' || entry.item.kind === filter) : filter === 'all' || entry.item.kind === filter);
    return shown.sort((a, b) => sort === 'name' ? a.item.name.localeCompare(b.item.name)
      : sort === 'value' ? b.item.value - a.item.value || a.item.name.localeCompare(b.item.name)
      : RARITY_ORDER.indexOf(b.item.rarity) - RARITY_ORDER.indexOf(a.item.rarity) || a.item.name.localeCompare(b.item.name));
  }, [state.inventory, filter, sort, section]);
  const best = Math.max(0, ...state.team.map(id => state.characters.find(c => c.id === id)?.profile.level ?? 0)), stock = shopStock(state.huntId, best);
  const lootStacks = state.inventory.loot, lootValue = lootStacks.reduce((sum, s) => sum + (itemById(s.itemId)?.value ?? 0) * s.quantity, 0);
  const lootCount = lootStacks.reduce((sum, s) => sum + s.quantity, 0);
  const swapOptions = (slot: Slot) => state.inventory.bp.map(s => itemById(s.itemId)).filter((item): item is ItemDef => !!item && item.slot === slot && !equipBlockReason(character, item));

  return <section className="items-panel">
    <div className="section-heading"><div><span className="eyebrow">Itens de {character.name}</span><h2>Equipamento, mochila e loja</h2></div><div className="gold-display">◉ {state.gold.toLocaleString('pt-BR')} ouro</div></div>

    {show('equipment') && <><div className="subsection-heading"><h3>Equipamento</h3><small>Os itens iniciais ficam aqui, nos slots de cada personagem.</small></div>
    <div className="equipment-grid">{SLOT_IDS.map(slot => {
      const gear = character.gear[slot], item = gear ? undefined : itemById(character.equipment[slot] ?? ''), options = swapOptions(slot), gearOpts = gearOptions(state, character, slot);
      return <article className="equipment-cell" key={slot}>
        <span className="slot-name"><Icon name={`slot_${slot}`} size={20} /> {slotNames[slot]}</span>
        {gear ? <GearCard instance={gear} /> : item ? <><b className={`rarity-${item.rarity}`}>{itemIcon(item)} {item.name}</b><small>{statLine(item.stats) || 'Sem atributos'}</small></> : <b className="empty-slot">Vazio</b>}
        <div className="equipment-actions">
          <select aria-label={`Trocar ${slotNames[slot]}`} value="" disabled={!options.length && !gearOpts.length} onChange={event => { const v = event.target.value; if (!v) return; if (v.startsWith('gear:')) gameStore.equipGear(character.id, v.slice(5)); else gameStore.equip(character.id, v); }}>
            <option value="">{options.length || gearOpts.length ? 'Trocar…' : 'Nada para trocar'}</option>
            {gearOpts.map(g => <option key={g.uid} value={`gear:${g.uid}`} disabled={!!gearEquipReason(character, g)}>{classItem(g.baseId)?.name} ({g.classification === 'common' ? 'Comum' : g.classification})</option>)}
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {gear ? <button onClick={() => gameStore.unequipGear(character.id, slot)}>Remover</button> : item && <button onClick={() => gameStore.unequip(character.id, slot)}>Remover</button>}
        </div>
      </article>;
    })}</div>

    <GearInventory state={state} character={character} /></>}

    {show('bag', 'supplies') && <><div className="subsection-heading"><h3>{section === 'supplies' ? 'Suprimentos' : 'Mochila'}</h3>
      <div className="bag-controls">
        {section !== 'supplies' && <div className="segmented" role="tablist" aria-label="Filtro">{FILTERS.filter(([id]) => section === 'all' || id !== 'supply').map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
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
    })}{!entries.length && <p className="empty-state">Nenhum item neste filtro.</p>}</div></>}

    {section === 'supplies' && <div className="card"><h3>Consumo</h3><SuppliesUsage state={state} /></div>}

    {show('shop', 'smith') && <><div className="subsection-heading"><h3>Loja</h3><small>Ouro: {state.gold.toLocaleString('pt-BR')} · liberação de poções pelo maior nível da equipe ({best}).</small></div>
    <div className="shop-grid">
      {show('shop') && <div><h4>Suprimentos</h4>{stock.potions.map(entry => <ShopRow key={entry.itemId} entry={entry} gold={state.gold} quantities={BUY_QUANTITIES} note={entry.unlocked ? undefined : `nível ${entry.unlockLevel}`} />)}</div>}
      {show('smith') && <div><h4>Ferreiro</h4>{stock.smith.length ? stock.smith.map(entry => <ShopRow key={entry.itemId} entry={entry} gold={state.gold} quantities={[1]} />) : <p className="empty-state">O Ferreiro vende o conjunto da hunt anterior; esta hunt não tem uma anterior com conjunto.</p>}</div>}
    </div>
    {show('smith') && <ClassSmith state={state} character={character} />}</>}

    {show('sell') && <><div className="subsection-heading"><h3>Loja rápida</h3></div>
    <div className="shop-box"><span>{lootCount} itens de loot · valor total <b>{lootValue.toLocaleString('pt-BR')} ouro</b></span>
      <button className="primary" disabled={!lootCount} onClick={() => gameStore.sellAllLoot()}>Vender todo o loot</button></div>
    {section === 'sell' && <GearInventory state={state} character={character} />}</>}
  </section>;
}

/** Consumo de poções por hora e quanto tempo o estoque dura (a partir do Analyzer da sessão). */
function SuppliesUsage({ state }: { state: GameState }) {
  const m = analyzerMetrics(state.analyzer), hours = m.activeSeconds / 3600;
  const perHour = hours > 0 ? m.supplies / hours : 0, stock = state.inventory.supply.reduce((sum, s) => sum + s.quantity, 0);
  return <><div className="kv"><span>Poções em estoque</span><b>{stock}</b></div><div className="kv"><span>Consumo por hora</span><b>{perHour ? `~${Math.round(perHour)}` : '—'}</b></div>
    <div className="kv"><span>Dura ainda</span><b>{perHour ? `~${Math.max(0, stock / perHour).toFixed(1)} h` : '—'}</b></div></>;
}
