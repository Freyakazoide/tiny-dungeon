import type { Character, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { itemById } from '../../game/data/items';
import { analyzerMetrics } from '../../game/systems/analyzer';
import { Icon } from '../components/Icon';
import { uiStore } from '../uiStore';
import { ItemIcon } from './ItemIcon';
import { viewFromItem } from './itemView';

const lastsClass = (hours: number) => hours < 1 ? 'danger' : hours < 4 ? 'warn' : '';

/** Poções da mochila com o estoque, o ritmo de uso da sessão e quanto tempo duram. */
export function SuppliesTab({ state, character }: { state: GameState; character: Character }) {
  const m = analyzerMetrics(state.analyzer), hours = m.activeSeconds / 3600, cap = state.inventory.capacity.supply;
  const total = state.inventory.supply.reduce((n, s) => n + s.quantity, 0);
  const perHourTotal = hours > 0 ? m.supplies / hours : 0;
  return <div>
    <div className="it-supp">{state.inventory.supply.map(stack => {
      const item = itemById(stack.itemId); if (!item) return null;
      const view = viewFromItem(item, stack.quantity, 'supply'), mana = item.supply === 'mana';
      const used = state.analyzer.suppliesUsed[item.id] ?? 0, rate = hours > 0 ? used / hours : 0, lasts = rate > 0 ? stack.quantity / rate : Infinity;
      return <div className="it-pot pk-panel" key={item.id}>
        <span className="it-slot" style={{ position: 'relative' }}><ItemIcon view={view} size={48} /><span className="it-qty">{stack.quantity}</span></span>
        <div><h4>{item.name}</h4><small>Recupera {item.amount} · {item.value} ouro</small>
          <div className={`pk-bar thin ${mana ? 'mp' : 'hp'}`} style={{ margin: '6px 0' }} role="progressbar" aria-label={`Estoque de ${item.name}`} aria-valuenow={stack.quantity} aria-valuemax={cap}><i style={{ width: `${Math.min(100, stack.quantity / cap * 100)}%` }} /></div>
          <small className="muted">{stack.quantity} / {cap}{rate > 0 && <> · ~{Math.round(rate)}/h · dura <b className={lastsClass(lasts)} style={{ color: lastsClass(lasts) === 'danger' ? 'var(--danger)' : lastsClass(lasts) === 'warn' ? 'var(--warn)' : undefined }}>~{lasts < 10 ? lasts.toFixed(1) : Math.round(lasts)} h</b></>}</small>
          <div className="it-actions" style={{ marginTop: 6 }}><button type="button" className="pk-btn sm" onClick={() => gameStore.useSupply(character.id, item.id)}>Usar em {character.name}</button></div></div>
      </div>;
    })}{!state.inventory.supply.length && <p className="empty-state">Sem poções. Compre na Loja (Comércio).</p>}</div>
    <div className="pk-panel" style={{ padding: 12, marginTop: 12 }}><h4 className="pk-sec">Consumo da sessão</h4>
      <div className="it-sumgrid">
        <div className="it-line"><span>Poções em estoque</span><b>{total}</b></div>
        <div className="it-line"><span>Consumo por hora</span><b>{perHourTotal ? `~${Math.round(perHourTotal)}` : '—'}</b></div>
        <div className="it-line"><span>Custo por hora</span><b>{hours > 0 ? `${Math.round(state.analyzer.suppliesValue / hours).toLocaleString('pt-BR')} ouro` : '—'}</b></div>
        <div className="it-line"><span>Dura ainda</span><b>{perHourTotal ? `~${Math.max(0, total / perHourTotal).toFixed(1)} h` : '—'}</b></div>
      </div>
      <div className="it-actions" style={{ marginTop: 8 }}><button type="button" className="pk-btn sm" onClick={() => uiStore.open('helper')}><Icon name="helper" size={24} />Abrir Helper →</button><span className="muted pk-tiny">As regras de uso automático ficam no Helper.</span></div>
    </div>
  </div>;
}
