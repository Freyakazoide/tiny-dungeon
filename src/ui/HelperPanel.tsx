import type { Character, GameState, HelperConfig } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { itemById } from '../game/data/items';
import { shopStock } from '../game/data/shop';
import { potionPercent } from '../game/systems/group';
import { Icon } from './components/Icon';
import { ItemIcon } from './items/ItemIcon';
import { viewFromItem } from './items/itemView';
import { compact } from './format';
import { uiStore } from './uiStore';

const PCT: { key: 'hpPotionAt' | 'manaPotionAt' | 'defensiveAmuletAt' | 'emergencyAt'; label: string; help: string; icon: string; bar?: 'hp' | 'mp' }[] = [
  { key: 'hpPotionAt', label: 'Usar poção de vida abaixo de', help: 'Quando a vida cai até este %, o personagem toma a poção mais barata que cobre o déficit.', icon: 'stat_hp', bar: 'hp' },
  { key: 'manaPotionAt', label: 'Usar poção de mana abaixo de', help: 'Mesmo critério para a mana.', icon: 'stat_mana', bar: 'mp' },
  { key: 'defensiveAmuletAt', label: 'Amuleto defensivo abaixo de', help: 'Reservado para o amuleto defensivo.', icon: 'slot_amulet' },
  { key: 'emergencyAt', label: 'Emergência abaixo de', help: 'Limite de emergência do personagem.', icon: 'stat_defense' },
];
const RESERVES = [0, 100, 500, 1000, 5000, 10000, 50000];
const REFILLS = [25, 50, 75, 100];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="he-switch"><input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} /><i aria-hidden="true" /><span>{label}</span></label>;
}

/** Compra automática de poções: regras de meta, recompra e reserva de ouro. */
function AutoBuy({ state }: { state: GameState }) {
  const cfg = state.autoBuy ?? { enabled: false, reserve: 0, refillAt: 50, targets: {}, spent: 0, bought: 0 };
  const best = Math.max(0, ...state.team.map(id => state.characters.find(c => c.id === id)?.profile.level ?? 0)), stock = shopStock(state.huntId, best).potions;
  const have = (id: string) => state.inventory.supply.find(s => s.itemId === id)?.quantity ?? 0;
  const missing = stock.reduce((sum, e) => sum + Math.max(0, (cfg.targets[e.itemId] ?? 0) - have(e.itemId)) * e.price, 0);
  return <div className="pk-panel he-card" aria-label="Compra automática">
    <h4 className="pk-sec">Compra automática <small>poções compradas sozinhas, dentro das regras</small></h4>
    <Switch checked={cfg.enabled} onChange={enabled => gameStore.setAutoBuy({ enabled })} label="Comprar poções automaticamente" />
    <div className="he-rules">
      <div className="he-rule"><span className="pk-sec">Reserva de ouro</span><small className="muted">Nunca gasta o ouro abaixo disto: ao chegar nele, a compra para.</small>
        <div className="he-chips" role="group" aria-label="Reserva de ouro">{RESERVES.map(v => <button type="button" key={v} className={`pk-btn sm ${cfg.reserve === v ? 'on' : ''}`} aria-pressed={cfg.reserve === v} onClick={() => gameStore.setAutoBuy({ reserve: v })}>{v ? compact(v) : 'Nenhuma'}</button>)}
          <label className="he-num"><span className="muted">outro</span><input type="number" min={0} aria-label="Reserva de ouro (valor)" value={cfg.reserve} onChange={e => gameStore.setAutoBuy({ reserve: +e.target.value })} /></label></div></div>
      <div className="he-rule"><span className="pk-sec">Recomprar quando o estoque cair abaixo de</span><small className="muted">% da meta. Ao disparar, repõe até a meta.</small>
        <div className="he-chips" role="group" aria-label="Recompra">{REFILLS.map(v => <button type="button" key={v} className={`pk-btn sm ${cfg.refillAt === v ? 'on' : ''}`} aria-pressed={cfg.refillAt === v} onClick={() => gameStore.setAutoBuy({ refillAt: v })}>{v}%</button>)}</div></div>
    </div>
    <div className="he-pots">{stock.map(entry => {
      const item = itemById(entry.itemId)!, target = cfg.targets[entry.itemId] ?? 0, now = have(entry.itemId), ratio = target ? Math.min(1, now / target) : 0;
      return <div key={entry.itemId} className={`he-pot ${entry.unlocked ? '' : 'locked'}`}>
        <ItemIcon view={viewFromItem(item, 1, 'supply')} size={32} />
        <div className="he-pname"><b>{item.name}</b><small className="muted">{entry.price} ouro · {entry.unlocked ? `você tem ${now}` : `🔒 nível ${entry.unlockLevel}`}</small>
          <div className={`pk-bar thin ${item.supply === 'mana' ? 'mp' : 'hp'}`} role="progressbar" aria-label={`Estoque de ${item.name}`} aria-valuenow={now} aria-valuemax={target || 1}><i style={{ width: `${ratio * 100}%` }} /></div></div>
        <label className="he-num"><span className="muted">meta</span><input type="number" min={0} disabled={!entry.unlocked} aria-label={`Meta de ${item.name}`} value={target} onChange={e => gameStore.setAutoBuy({ target: { itemId: entry.itemId, qty: +e.target.value } })} /></label>
        <div className="he-steps">{[-10, 10, 50].map(d => <button type="button" key={d} className="pk-btn sm" disabled={!entry.unlocked} aria-label={`${d > 0 ? 'Aumentar' : 'Diminuir'} meta de ${item.name} em ${Math.abs(d)}`} onClick={() => gameStore.setAutoBuy({ target: { itemId: entry.itemId, qty: Math.max(0, target + d) } })}>{d > 0 ? `+${d}` : d}</button>)}</div>
      </div>;
    })}</div>
    <div className="he-foot"><span>Faltam <b>{missing.toLocaleString('pt-BR')}</b> de ouro para encher as metas</span>
      <span className="muted">Já comprou {cfg.bought} poções ({cfg.spent.toLocaleString('pt-BR')} ouro)</span>
      <button type="button" className="pk-btn sm" disabled={!cfg.enabled} onClick={() => gameStore.runAutoBuy()}>Comprar agora</button></div>
  </div>;
}

/** Helper (padrão pixel-kit): automação de poções por personagem, regras do grupo e compra automática. */
export function HelperPanel({ state, character }: { state: GameState; character: Character }) {
  const set = (patch: Partial<HelperConfig>) => gameStore.setHelper(character.id, patch);
  const h = character.helper, stock = potionPercent(state);
  return <section className="helper-panel he-grid">
    <div className="he-col">
      <div className="pk-panel he-card"><h4 className="pk-sec">Poções de {character.name} <small>estoque confortável: {stock}%</small></h4>
        <Switch checked={h.autoSupplies} onChange={autoSupplies => set({ autoSupplies })} label="Usar poções automaticamente" />
        {PCT.map(p => <label className="he-slider" key={p.key} title={p.help}><span className="he-lab"><Icon name={p.icon} size={24} />{p.label}</span>
          <input type="range" min={0} max={100} step={5} aria-label={p.label} value={h[p.key]} onChange={e => set({ [p.key]: +e.target.value })} />
          <b className="he-val">{h[p.key]}%</b></label>)}
        <p className="muted pk-tiny">Dica: o custo de poções é o sinal real de dificuldade. Suba os limites em hunts perigosas e desça nas fáceis.</p></div>
      <div className="pk-panel he-card"><h4 className="pk-sec">Grupo</h4>
        <Switch checked={state.autoAdvance} onChange={v => gameStore.setAutoAdvance(v)} label="Avanço automático da wave" />
        <Switch checked={h.healAllies} onChange={healAllies => set({ healAllies })} label="Curar aliados" />
        <div className="he-rule"><span className="pk-sec">Quando as poções acabarem</span>
          <div className="he-chips" role="radiogroup" aria-label="Sem poções">{([['continue', 'Continuar caçando'], ['end', 'Encerrar a caçada']] as const).map(([v, label]) =>
            <button type="button" role="radio" aria-checked={h.outOfSupplies === v} key={v} className={`pk-btn sm ${h.outOfSupplies === v ? 'on' : ''}`} onClick={() => set({ outOfSupplies: v })}>{label}</button>)}</div></div>
        <button type="button" className="pk-btn sm" onClick={() => uiStore.openClasses('wiki')}>📖 Enciclopédia de classes</button>
        <p className="muted pk-tiny">Magias e condições de uso ficam em <b>Personagem › Magias</b>.</p></div>
    </div>
    <AutoBuy state={state} />
  </section>;
}
