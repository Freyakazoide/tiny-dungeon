import { memo, type CSSProperties, type ReactNode } from 'react';
import type { Slot } from '../../game/core/types';
import type { EquipComparison, EquipDelta } from '../../game/systems/equipment';
import { Icon } from '../components/Icon';
import { statNames } from '../format';
import { statValue } from '../format';
import { ItemIcon } from './ItemIcon';
import { RARITY_LETTER, type ItemView, type RarityKey } from './itemView';
import { slotNames } from '../format';

export const rarityStyle = (rarity?: RarityKey) => (rarity ? { '--rc': `var(--r-${rarity})` } : {}) as CSSProperties;

/** Caixa do boneco: 76 px, borda e selo pela raridade; clicar só seleciona. */
export function ItemSlot({ slot, view, selected, warn, onSelect }: { slot: Slot; view?: ItemView; selected: boolean; warn?: boolean; onSelect: () => void }) {
  const label = view ? `${slotNames[slot]}: ${view.name}, ${view.rarityLabel}` : `${slotNames[slot]}: vazio`;
  return <div className="it-slotbox">
    <button type="button" className={`it-slot ${selected ? 'sel' : ''} ${view ? '' : 'empty'}`} style={rarityStyle(view?.rarity)} aria-label={label} aria-pressed={selected} onClick={onSelect}>
      {view ? <ItemIcon view={view} size={48} /> : <Icon name={`slot_${slot}`} size={48} />}
      {view && <span className="it-q">{RARITY_LETTER[view.rarity]}</span>}{warn && <span className="it-warn" aria-hidden="true">⚠</span>}
    </button>
    <span className="it-slotname">{slotNames[slot]}</span>
    <span className="it-itemname" style={rarityStyle(view?.rarity)}>{view?.name ?? 'Vazio'}</span>
  </div>;
}

/** Tile 1:1 da grade da mochila. */
export const ItemTile = memo(function ItemTile({ view, selected, tabIndex, onSelect, onKeyDown, refCb }: { view: ItemView; selected: boolean; tabIndex: number; onSelect: () => void; onKeyDown: (event: React.KeyboardEvent) => void; refCb?: (el: HTMLButtonElement | null) => void }) {
  return <button type="button" role="option" aria-selected={selected} tabIndex={tabIndex} ref={refCb} className={`it-tile ${selected ? 'sel' : ''}`} style={rarityStyle(view.rarity)}
    aria-label={`${view.name}, ${view.rarityLabel}${view.quantity > 1 ? `, quantidade ${view.quantity}` : ''}${view.fresh ? ', novo' : ''}${view.reason ? ', não equipável agora' : ''}`} onClick={onSelect} onKeyDown={onKeyDown}>
    <ItemIcon view={view} size={48} />
    {view.kind === 'equipment' && <span className="it-q">{RARITY_LETTER[view.rarity]}</span>}
    {view.quantity > 1 && <span className="it-qty">{view.quantity}</span>}
    {view.fresh && <span className="it-new" aria-hidden="true" />}
    {view.reason && <span className="it-lock" aria-hidden="true">🔒</span>}
  </button>;
});
export const EmptyTile = () => <div className="it-tile empty" aria-hidden="true" />;

export function DeltaChips({ deltas, muted }: { deltas: EquipDelta[]; muted?: boolean }) {
  if (!deltas.length) return <span className="it-deltas"><span className="it-d">=</span></span>;
  return <span className="it-deltas" style={muted ? { opacity: .55 } : undefined}>{deltas.slice(0, 4).map(d =>
    <span key={d.key} className={`it-d ${d.diff > 0 ? 'up' : 'dn'}`} title={`${statNames[d.key]}: ${statValue(d.key, d.before)} → ${statValue(d.key, d.after)}`}>{d.diff > 0 ? '▲' : '▼'} {statNames[d.key]}</span>)}</span>;
}

/** Linhas `atributo · antes · ▲/▼ depois` (até 6). */
export function CompareList({ comparison }: { comparison: EquipComparison }) {
  const { deltas } = comparison;
  return <div className="it-cmp pk-panel flat" aria-label="Comparação com o equipado">
    {comparison.replaces && <div className="eq">Troca {comparison.replaces}{comparison.removesOffhand ? ' e tira a mão secundária' : ''}</div>}
    {!comparison.replaces && comparison.removesOffhand && <div className="eq">Tira a mão secundária</div>}
    {deltas.length === 0 && <div className="eq">Sem mudança nos atributos.</div>}
    {deltas.slice(0, 6).map(d => <div className="r" key={d.key}><span>{statNames[d.key]}</span><span className="eq">{statValue(d.key, d.before)}</span>
      <span className={d.diff > 0 ? 'up' : 'dn'}>{d.diff > 0 ? '▲' : '▼'} {statValue(d.key, d.after)}</span></div>)}
  </div>;
}

export function GoldChip({ gold, style }: { gold: number; style?: CSSProperties }) {
  return <span className="it-gold" title="Ouro" style={style}><Icon name="stat_gold" size={24} /><b>{gold.toLocaleString('pt-BR')}</b></span>;
}

/** Painel de detalhe: cabeçalho, base, atributos, mecânica, valor e as ações (filhos). */
export function ItemDetail({ view, children, extra }: { view: ItemView; children?: ReactNode; extra?: ReactNode }) {
  return <div className="it-detail pk-panel" style={rarityStyle(view.rarity)} aria-label={`Detalhe: ${view.name}`}>
    <div className="it-dhead"><span className="it-slot"><ItemIcon view={view} size={48} /></span>
      <div><div className="it-dname">{view.name}</div>
        <div className="it-tags"><span className="pk-tag">{view.rarityLabel}</span>{view.quality && <span className="pk-tag esp">{view.quality}</span>}<span className="pk-tag afim">{view.slotLabel}</span>{view.handsLabel && !/mão|mãos/.test(view.slotLabel) && <span className="pk-tag afim">{view.handsLabel}</span>}</div></div></div>
    <div className="it-attrs"><div><b>Base:</b> {view.base}</div>
      {view.attrs.length > 0 && <><h4 className="pk-sec">Atributos aleatórios</h4>{view.attrs.map(a => <div className="a" key={a}>{a}</div>)}</>}</div>
    {view.mechanic && <p className="it-mech"><b>Mecânica{view.mechanic.soon ? ' · ' : ''}</b>{view.mechanic.soon && <span className="pk-tag off">Em breve</span>} {view.mechanic.text}</p>}
    {view.kind !== 'supply' && <div className="it-price"><Icon name="stat_gold" size={24} />{view.value.toLocaleString('pt-BR')} <small className="muted">valor de venda</small></div>}
    {extra}
    {view.reason && <div className="it-reason">⚠ {view.reason}</div>}
    {children && <div className="it-actions">{children}</div>}
  </div>;
}

/** Cartão de loja/ferreiro. */
export function ProductCard({ icon, name, rarity, sub, price, tag, locked, children, note }: { icon: ReactNode; name: string; rarity?: RarityKey; sub: string; price: number; tag?: ReactNode; locked?: boolean; children: ReactNode; note?: ReactNode }) {
  return <div className={`it-prod pk-panel ${locked ? 'locked' : ''}`} style={rarityStyle(rarity)}>
    <span className="it-slot" style={{ width: 48, height: 48 }}>{icon}</span>
    <div><h4>{name}</h4><small className="muted">{sub}</small>
      <div className="it-tags">{tag}</div>
      <div className="it-price"><Icon name="stat_gold" size={24} />{price.toLocaleString('pt-BR')}</div>
      {note}</div>
    <div className="it-buy">{children}</div>
  </div>;
}
