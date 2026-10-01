import { useState } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { CLASS_BY_ID } from '../../game/rpg/classTree';
import { CLASSIFICATIONS, CLASSIFICATION_NAMES, itemsForClass, SLOT_GROUP_NAMES, type Classification } from '../../game/data/classItems';
import { itemById } from '../../game/data/items';
import { BUY_QUANTITIES, shopStock, type ShopEntry } from '../../game/data/shop';
import { GEAR_BAG_CAPACITY } from '../../game/data/balance';
import { gearSlots, gearValue, smithPrice } from '../../game/systems/gear';
import { TRAIN_ITEMS, TRAIN_PIECES, TRAIN_SET_BONUS } from '../../game/data/trainItems';
import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../../game/rpg/proficiencies';
import { gateSkillOf, GOAL_NODES } from '../../game/rpg/goals';
import { Icon } from '../components/Icon';
import { slotNames, statLine } from '../format';
import { gearLines } from '../GearPanel';
import { ItemIcon } from './ItemIcon';
import { ProductCard } from './parts';
import { viewFromGear, viewFromItem } from './itemView';

const tier1Classes = Object.values(CLASS_BY_ID).filter(n => n.tier === 1);
const bestLevel = (state: GameState) => Math.max(0, ...state.team.map(id => state.characters.find(c => c.id === id)?.profile.level ?? 0));

/** Quantas poções cabem e dá para pagar: `Encher` compra esse tanto. */
export const fillQuantity = (state: GameState, entry: ShopEntry) => {
  const used = state.inventory.supply.reduce((n, s) => n + s.quantity, 0);
  return Math.max(0, Math.min(Math.floor(state.gold / entry.price), state.inventory.capacity.supply - used));
};

export function ShopTab({ state }: { state: GameState }) {
  const best = bestLevel(state), stock = shopStock(state.huntId, best);
  return <div>
    <h4 className="pk-sec">Suprimentos <small>liberação de poções pelo maior nível da equipe ({best})</small></h4>
    <div className="it-shop">{stock.potions.map(entry => {
      const item = itemById(entry.itemId)!, view = viewFromItem(item, 1, 'supply'), have = state.inventory.supply.find(s => s.itemId === item.id)?.quantity ?? 0, fill = fillQuantity(state, entry);
      return <ProductCard key={entry.itemId} icon={<ItemIcon view={view} size={48} />} name={item.name} rarity={item.rarity} sub={`Recupera ${item.amount} de ${item.supply === 'health' ? 'vida' : 'mana'} · você tem ${have}`} price={entry.price} locked={!entry.unlocked}
        tag={!entry.unlocked && <span className="pk-tag blq">🔒 Nível {entry.unlockLevel}</span>}>
        {BUY_QUANTITIES.map(q => <button type="button" key={q} className="pk-btn sm" disabled={!entry.unlocked || state.gold < entry.price * q} onClick={() => gameStore.buy(entry.itemId, q)}>×{q}</button>)}
        <button type="button" className="pk-btn sm primary" disabled={!entry.unlocked || fill < 1} title={`Compra ${fill}`} onClick={() => gameStore.buy(entry.itemId, fill)}>Encher</button>
      </ProductCard>;
    })}</div>
    <p className="muted pk-tiny" style={{ marginTop: 12 }}>O Ferreiro vende as peças da hunt anterior e o equipamento Padrão de cada classe.</p>
  </div>;
}

/** Equipamento de treino do Aprendiz: 5 peças por proficiência; o foco inicial é a porta da classe-alvo do personagem. */
function TrainingShop({ state, character }: { state: GameState; character: Character }) {
  const goalGate = character.goal ? gateSkillOf(GOAL_NODES.find(n => n.id === character.goal)!) : undefined;
  const [picked, setPicked] = useState<ProficiencyId | null>(null);
  const prof = picked ?? goalGate ?? character.profile.trainingFocus ?? 'melee';
  const stock = shopStock(state.huntId, 0).training, pieces = TRAIN_PIECES.map(piece => stock.find(e => e.itemId === TRAIN_ITEMS.find(i => i.slot === piece.slot && i.trainBonus?.[prof])?.id)!).filter(Boolean);
  return <div>
    <h4 className="pk-sec">Equipamento de treino do Aprendiz <small>5 peças = +{TRAIN_SET_BONUS}% de tries na habilidade</small></h4>
    <p className="muted pk-tiny">Itens de classe não se compram: se conquistam. Estas peças só aceleram o treino da habilidade que a sua classe-alvo exige{goalGate ? ` (${PROFICIENCIES[goalGate].name})` : ''}.</p>
    <div className="it-classes" role="group" aria-label="Habilidade a treinar">{PROFICIENCY_IDS.map(id => <button type="button" key={id} className={`pk-btn sm ${id === prof ? 'on' : ''}`} aria-pressed={id === prof} onClick={() => setPicked(id)}>{PROFICIENCIES[id].name}</button>)}</div>
    <div className="it-shop">{pieces.map(entry => { const item = itemById(entry.itemId)!, view = viewFromItem(item, 1, 'bp'), owned = Object.values(character.equipment).includes(item.id) || state.inventory.bp.some(b => b.itemId === item.id);
      return <ProductCard key={entry.itemId} icon={<ItemIcon view={view} size={48} />} name={item.name} rarity={item.rarity} sub={`${item.slot ? slotNames[item.slot] : ''} · +${item.trainBonus?.[prof]}% de tries em ${PROFICIENCIES[prof].name}${item.stats ? ` · ${statLine(item.stats)}` : ''}`} price={entry.price}>
        <button type="button" className="pk-btn sm primary" disabled={state.gold < entry.price || owned} title={owned ? 'Você já tem esta peça.' : undefined} onClick={() => gameStore.buy(entry.itemId, 1)}>{owned ? 'Já tem' : 'Comprar'}</button></ProductCard>; })}</div>
  </div>;
}

export function SmithTab({ state, character }: { state: GameState; character: Character }) {
  const own = tier1Classes.find(n => character.profile.classPath.includes(n.id))?.id;
  const order = [...tier1Classes].sort((a, b) => Number(b.id === own) - Number(a.id === own));
  const [picked, setPicked] = useState<string | null>(null);
  const cls = picked && order.some(n => n.id === picked) ? picked : own ?? order[0].id;
  const stock = shopStock(state.huntId, bestLevel(state)), full = gearSlots(state.gearBag) >= GEAR_BAG_CAPACITY;
  const items = itemsForClass(cls).filter(i => i.quality === 'standard');
  return <div>
    {character.profile.classId === 'aprendiz' && <TrainingShop state={state} character={character} />}
    <h4 className="pk-sec" style={{ marginTop: character.profile.classId === 'aprendiz' ? 14 : 0 }}>Conjunto da hunt anterior</h4>
    {stock.smith.length
      ? <div className="it-shop">{stock.smith.map(entry => { const item = itemById(entry.itemId)!, view = viewFromItem(item, 1, 'bp');
        return <ProductCard key={entry.itemId} icon={<ItemIcon view={view} size={48} />} name={item.name} rarity={item.rarity} sub={`${item.slot ? slotNames[item.slot] : ''} · ${statLine(item.stats)}`} price={entry.price}>
          <button type="button" className="pk-btn sm primary" disabled={state.gold < entry.price} onClick={() => gameStore.buy(entry.itemId, 1)}>Comprar</button></ProductCard>; })}</div>
      : <div className="pk-panel flat muted" style={{ padding: 10 }}>Esta hunt não tem um conjunto anterior à venda.</div>}
    <h4 className="pk-sec" style={{ marginTop: 14 }}>Ferreiro de classe <small>só itens Padrão, sempre Comuns</small></h4>
    <div className="it-classes" role="group" aria-label="Classe">{order.map(n => <button type="button" key={n.id} className={`pk-btn sm ${n.id === cls ? 'on' : ''}`} aria-pressed={n.id === cls} onClick={() => setPicked(n.id)}>{n.id === own ? '★ ' : ''}{n.name}</button>)}</div>
    {!own && <p className="muted pk-tiny">O Squire não equipa itens de classe.</p>}
    <div className="it-shop">{items.map(item => {
      const price = smithPrice(item.id), view = viewFromGear({ uid: '', baseId: item.id, classification: 'common', attrs: [] });
      const reason = state.gold < price ? 'Ouro insuficiente.' : full ? 'Mochila de classe cheia (80/80).' : undefined;
      return <ProductCard key={item.id} icon={<ItemIcon view={view} size={48} />} name={item.name} rarity="common" price={price}
        sub={`${SLOT_GROUP_NAMES[item.slotGroup]} · ${gearLines({ uid: '', baseId: item.id, classification: 'common', attrs: [] }).fixed}`}
        note={<>{item.classes.length > 1 && <small className="muted">também {item.classes.filter(c => c !== cls).map(c => CLASS_BY_ID[c]?.name).join(', ')}</small>}{reason && <div className="it-reason">{reason}</div>}</>}>
        <button type="button" className="pk-btn sm primary" disabled={!!reason} onClick={() => gameStore.buyGear(item.id)}>Comprar</button></ProductCard>;
    })}</div>
  </div>;
}

const LIMITS: [Classification, string][] = [['common', 'Vender Comuns'], ['uncommon', 'Até Incomuns'], ['rare', 'Até Raras']];

export function SellTab({ state }: { state: GameState }) {
  const [confirm, setConfirm] = useState<Classification | null>(null);
  const bonus = gameStore.sellBonus();
  const lootCount = state.inventory.loot.reduce((n, s) => n + s.quantity, 0);
  const lootBase = state.inventory.loot.reduce((n, s) => n + (itemById(s.itemId)?.value ?? 0) * s.quantity, 0), lootTotal = Math.round(lootBase * (1 + bonus));
  const upTo = (limit: Classification) => { const max = CLASSIFICATIONS.indexOf(limit); const list = state.gearBag.filter(g => CLASSIFICATIONS.indexOf(g.classification) <= max); return { count: list.length, total: list.reduce((n, g) => n + Math.round(gearValue(g) * (1 + bonus)), 0) }; };
  const counts = CLASSIFICATIONS.map(c => [c, state.gearBag.filter(g => g.classification === c).length] as const);
  const pending = confirm ? upTo(confirm) : null;
  return <div>
    <div className="it-sellbox">
      <div className="pk-panel"><h4 className="pk-sec">Loot</h4>
        <div className="it-total"><Icon name="stat_gold" size={24} />{lootTotal.toLocaleString('pt-BR')}</div>
        <div className="muted">{lootCount} itens de loot{bonus > 0 && <> · <span style={{ color: 'var(--ok)' }}>+{Math.round(bonus * 100)}% de bônus de venda</span></>}</div>
        <button type="button" className="pk-btn primary" disabled={!lootCount} onClick={() => gameStore.sellAllLoot()}>Vender todo o loot</button></div>
      <div className="pk-panel"><h4 className="pk-sec">Equipamento de classe</h4>
        <div className="pk-row">{counts.map(([c, n]) => <span key={c} className="pk-chip">{CLASSIFICATION_NAMES[c]}: {n}</span>)}</div>
        <div className="pk-row">{LIMITS.map(([limit, label]) => <button type="button" key={limit} className="pk-btn sm" disabled={!upTo(limit).count} onClick={() => setConfirm(limit)}>{label}</button>)}</div>
        {pending && confirm && <div className="pk-tip" role="dialog" aria-label="Confirmar venda em lote" style={{ position: 'static', display: 'block', width: 'auto' }}>
          <div className="h">Confirmar venda</div>{pending.count} itens por {pending.total.toLocaleString('pt-BR')} ouro.
          <div className="it-actions" style={{ marginTop: 6 }}><button type="button" className="pk-btn sm primary" onClick={() => { gameStore.sellGearUpTo(confirm); setConfirm(null); }}>Confirmar</button><button type="button" className="pk-btn sm" onClick={() => setConfirm(null)}>Cancelar</button></div></div>}
      </div>
    </div>
    <p className="muted pk-tiny" style={{ marginTop: 12 }}>Itens equipados e itens Lendários e Míticos nunca entram na venda em lote.</p>
  </div>;
}
