import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { GEAR_BAG_CAPACITY } from '../../game/data/balance';
import { itemById } from '../../game/data/items';
import { compareEquip } from '../../game/systems/equipment';
import { gearValue } from '../../game/systems/gear';
import { Icon } from '../components/Icon';
import { CompareList, EmptyTile, ItemDetail, ItemTile } from './parts';
import { RARITY_ORDER, viewFromGear, viewFromItem, type ItemView } from './itemView';

type Filter = 'all' | 'weapons' | 'armor' | 'acc' | 'loot';
type Sort = 'rarity' | 'value' | 'name';
const FILTERS: [Filter, string, string][] = [['all', 'Todos', 'itens'], ['weapons', 'Armas', 'slot_weapon'], ['armor', 'Armaduras', 'slot_armor'], ['acc', 'Acessórios', 'slot_ring'], ['loot', 'Loot', 'stat_gold']];
const SORTS: [Sort, string][] = [['rarity', 'Raridade'], ['value', 'Valor'], ['name', 'Nome']];
const MIN_TILES = 30;
const matches = (filter: Filter, view: ItemView) => filter === 'all' || (filter === 'loot' ? view.kind === 'loot'
  : view.kind === 'equipment' && (filter === 'weapons' ? view.slot === 'weapon' : filter === 'acc' ? view.slot === 'ring' || view.slot === 'amulet' : !!view.slot && view.slot !== 'weapon' && view.slot !== 'ring' && view.slot !== 'amulet'));

/** Todos os itens da mochila como visões: equipamento simples, loot e instâncias de classe. */
export function bagViews(state: GameState, character: Character): ItemView[] {
  const fresh = new Set(state.freshItems ?? []);
  const views: ItemView[] = [];
  for (const stack of state.inventory.bp) { const item = itemById(stack.itemId); if (item && item.kind !== 'supply') views.push({ ...viewFromItem(item, stack.quantity, 'bp', character), fresh: fresh.has(item.id) }); }
  for (const stack of state.inventory.loot) { const item = itemById(stack.itemId); if (item) views.push(viewFromItem(item, stack.quantity, 'loot')); }
  for (const g of state.gearBag) views.push(viewFromGear(g, character));
  return views;
}
export const freshCount = (state: GameState) => (state.freshItems ?? []).filter(id => state.inventory.bp.some(s => s.itemId === id)).length + state.gearBag.filter(g => g.fresh).length;

function Capacity({ label, used, cap }: { label: string; used: number; cap: number }) {
  const ratio = cap ? used / cap : 0;
  return <div className="it-cap"><small><span>{label}</span><span>{used}/{cap}</span></small>
    <div className="pk-bar thin" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemax={cap} style={{ '--c1': ratio >= 1 ? '#e0615a' : ratio > .8 ? '#e0a05c' : '#62c88a', '--c2': ratio >= 1 ? '#a93832' : ratio > .8 ? '#9b6a20' : '#2f7e52' } as React.CSSProperties}><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div></div>;
}

export function BagTab({ state, character }: { state: GameState; character: Character }) {
  const [filter, setFilter] = useState<Filter>('all'), [sort, setSort] = useState<Sort>('rarity');
  const [selected, setSelected] = useState<string | null>(null), [confirm, setConfirm] = useState(false);
  const grid = useRef<HTMLDivElement>(null), refs = useRef(new Map<string, HTMLButtonElement | null>());
  const all = bagViews(state, character);
  const shown = useMemo(() => all.filter(v => matches(filter, v)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
    : sort === 'value' ? b.value - a.value || a.name.localeCompare(b.name)
    : RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.value - a.value || a.name.localeCompare(b.name)), [all, filter, sort]);
  const view = shown.find(v => v.key === selected);
  useEffect(() => setConfirm(false), [selected]);
  const select = (v: ItemView) => { setSelected(v.key); if (v.fresh) gameStore.markSeen(v.key); };
  const bonus = state.characters.length ? gameStore.sellBonus() : 0;
  const sale = (v: ItemView) => Math.round(v.value * (1 + bonus));
  const cols = () => Math.max(1, (grid.current ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length : 5));
  const onKey = (index: number) => (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? cols() : event.key === 'ArrowUp' ? -cols() : 0;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? shown.length - 1 : step ? Math.max(0, Math.min(shown.length - 1, index + step)) : -1;
    if (target < 0) return;
    event.preventDefault(); const next = shown[target]; select(next); refs.current.get(next.key)?.focus();
  };
  const tabbable = view?.key ?? shown[0]?.key;
  const usedBp = state.inventory.bp.reduce((n, s) => n + s.quantity, 0) + state.inventory.loot.reduce((n, s) => n + s.quantity, 0);
  const commons = state.gearBag.filter(g => g.classification === 'common'), commonValue = commons.reduce((n, g) => n + gearValue(g), 0);
  const cmp = view?.candidate ? compareEquip(state, character, view.candidate) : undefined;
  const legendary = view?.source === 'gear' && (view.rarity === 'legendary' || view.rarity === 'mythic');
  const sellOne = (v: ItemView) => {
    if (v.source === 'gear') gameStore.sellGear(v.key.slice(5)); else gameStore.sell(v.key.startsWith('loot:') ? 'loot' : 'bp', v.key.slice(v.key.indexOf(':') + 1));
    setSelected(null);
  };
  const tiles = Math.max(MIN_TILES, Math.ceil(shown.length / 5) * 5);
  return <div>
    <div className="it-bagtop">
      <div className="it-filters" role="group" aria-label="Filtro">{FILTERS.map(([id, label, icon]) => <button type="button" key={id} className={`pk-btn ${filter === id ? 'on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}><Icon name={icon} size={24} />{label}</button>)}</div>
      <div className="it-caps"><Capacity label="Mochila" used={usedBp} cap={state.inventory.capacity.bp} /><Capacity label="Equip. de classe" used={state.gearBag.length} cap={GEAR_BAG_CAPACITY} /></div>
    </div>
    <div className="it-bag">
      <div>
        <div className="it-grid" ref={grid} role="listbox" aria-label="Itens da mochila">
          {shown.map((v, i) => <ItemTile key={v.key} view={v} selected={v.key === selected} tabIndex={v.key === tabbable ? 0 : -1} onSelect={() => select(v)} onKeyDown={onKey(i)} refCb={el => { refs.current.set(v.key, el); }} />)}
          {Array.from({ length: Math.max(0, tiles - shown.length) }, (_, i) => <EmptyTile key={`e${i}`} />)}
        </div>
        <div className="it-bulk pk-panel flat"><div className="it-seg" role="group" aria-label="Ordenar">{SORTS.map(([id, label]) => <button type="button" key={id} className={`pk-btn sm ${sort === id ? 'on' : ''}`} aria-pressed={sort === id} onClick={() => setSort(id)}>{label}</button>)}</div>
          <span style={{ flexBasis: '100%' }}>{commons.length} Comuns · {commonValue.toLocaleString('pt-BR')} ouro</span>
          <button type="button" className="pk-btn sm" style={{ whiteSpace: 'nowrap' }} disabled={!commons.length} onClick={() => gameStore.sellGearUpTo('common')}>Vender todos os Comuns</button></div>
      </div>
      {view
        ? <ItemDetail view={view} extra={cmp && view.kind === 'equipment' ? <CompareList comparison={cmp} /> : undefined}>
            {view.kind === 'equipment' && <button type="button" className="pk-btn primary" disabled={!!view.reason} title={view.reason} onClick={() => { if (view.candidate?.kind === 'gear') gameStore.equipGear(character.id, view.candidate.uid); else if (view.candidate) gameStore.equip(character.id, view.candidate.itemId); setSelected(null); }}>Equipar em {character.name}</button>}
            {view.kind === 'equipment' && (legendary && !confirm
              ? <button type="button" className="pk-btn" onClick={() => setConfirm(true)}>Vender ({sale(view)})</button>
              : legendary ? <button type="button" className="pk-btn" style={{ borderColor: 'var(--danger)' }} onClick={() => sellOne(view)}>Confirmar venda de {view.rarityLabel}</button>
              : <button type="button" className="pk-btn" onClick={() => sellOne(view)}>Vender ({sale(view)})</button>)}
            {view.kind === 'loot' && <><button type="button" className="pk-btn" onClick={() => gameStore.sell('loot', view.key.slice(5))}>Vender 1</button>
              <button type="button" className="pk-btn" onClick={() => { for (let i = 0; i < view.quantity; i++) gameStore.sell('loot', view.key.slice(5)); setSelected(null); }}>Vender todos ({view.quantity})</button></>}
          </ItemDetail>
        : <div className="it-detail pk-panel"><p className="muted">Selecione um item para ver o detalhe e compará-lo com o equipado. Clicar não equipa.</p></div>}
    </div>
  </div>;
}
