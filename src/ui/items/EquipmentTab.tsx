import { useEffect, useMemo, useRef, useState } from 'react';
import type { Character, GameState, Slot, Stats } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { classItem } from '../../game/data/classItems';
import { itemById } from '../../game/data/items';
import { compareEquip } from '../../game/systems/equipment';
import { gearBase, handsConflict } from '../../game/systems/gear';
import { characterStats } from '../../game/systems/progression';
import { statNames, statValue } from '../format';
import { Icon } from '../components/Icon';
import { ItemIcon } from './ItemIcon';
import { DeltaChips, ItemDetail, ItemSlot, rarityStyle } from './parts';
import { equippedView, viewFromGear, viewFromItem, type ItemView } from './itemView';

/** Posição de cada slot no boneco (coluna, linha). */
const DOLL: Record<Slot, [number, number]> = { helmet: [2, 1], weapon: [1, 2], armor: [2, 2], offhand: [3, 2], ring: [1, 3], legs: [2, 3], amulet: [3, 3], boots: [2, 4] };
const SUM_KEYS: (keyof Stats)[] = ['attack', 'defense', 'maxHp', 'maxMana', 'attackSpeed', 'crit', 'resistance', 'magicPower'];

/** Bônus total do equipamento: characterStats com tudo menos characterStats sem nenhuma peça (mesmas agregações, sem fórmula nova). */
export function equipmentBonus(state: GameState, character: Character) {
  const bare: Character = { ...character, equipment: {}, gear: {} };
  const withGear = characterStats(character, state), without = characterStats(bare, state);
  return SUM_KEYS.map(key => ({ key, value: withGear[key] - without[key] })).filter(entry => Math.abs(entry.value) > 1e-9);
}

/** Candidatas (simples da mochila e de classe) para um slot, cada uma com a comparação. */
function candidatesFor(state: GameState, character: Character, slot: Slot) {
  const list: { view: ItemView; cmp: ReturnType<typeof compareEquip> }[] = [];
  for (const stack of state.inventory.bp) { const item = itemById(stack.itemId); if (item?.kind === 'equipment' && item.slot === slot) { const view = viewFromItem(item, stack.quantity, 'bp', character); list.push({ view, cmp: compareEquip(state, character, view.candidate!) }); } }
  for (const g of state.gearBag) if (classItem(g.baseId)?.slot === slot) { const view = viewFromGear(g, character); list.push({ view, cmp: compareEquip(state, character, view.candidate!) }); }
  return list.sort((a, b) => Number(b.cmp.ok) - Number(a.cmp.ok) || (b.cmp.deltas[0]?.diff ?? 0) - (a.cmp.deltas[0]?.diff ?? 0));
}

function SwapPopover({ state, character, slot, onClose }: { state: GameState; character: Character; slot: Slot; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const options = useMemo(() => candidatesFor(state, character, slot), [state, character, slot]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    const click = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) onClose(); };
    window.addEventListener('keydown', key, true); document.addEventListener('mousedown', click);
    return () => { window.removeEventListener('keydown', key, true); document.removeEventListener('mousedown', click); };
  }, [onClose]);
  const pick = (view: ItemView) => { if (view.candidate?.kind === 'gear') gameStore.equipGear(character.id, view.candidate.uid); else if (view.candidate) gameStore.equip(character.id, view.candidate.itemId); onClose(); };
  return <div className="it-swap pk-panel flat" ref={ref} role="dialog" aria-label="Trocar peça">
    {options.length === 0 && <p className="muted">Nada para trocar neste slot.</p>}
    {options.map(({ view, cmp }) => <button type="button" key={view.key} className="it-swaprow" style={{ ...rarityStyle(view.rarity), opacity: cmp.ok ? 1 : .55 }} title={cmp.reason} aria-disabled={!cmp.ok} onClick={() => cmp.ok && pick(view)}>
      <span className="ic"><ItemIcon view={view} size={24} /></span>
      <span><b>{view.name}</b><small>{[view.rarityLabel, view.quality].filter(Boolean).join(' · ')}{cmp.reason ? ` · ${cmp.reason}` : ''}</small></span>
      <DeltaChips deltas={cmp.deltas} muted={!cmp.ok} /></button>)}
  </div>;
}

export function EquipmentTab({ state, character }: { state: GameState; character: Character }) {
  const [slot, setSlot] = useState<Slot>('weapon'), [swap, setSwap] = useState(false);
  useEffect(() => setSwap(false), [slot, character.id]);
  const views = Object.fromEntries((Object.keys(DOLL) as Slot[]).map(s => [s, equippedView(character, s, itemById)])) as Record<Slot, ItemView | undefined>;
  const weapon = gearBase(character, 'weapon'), offhand = gearBase(character, 'offhand'), conflict = handsConflict(weapon, offhand);
  const view = views[slot], bonus = equipmentBonus(state, character);
  const remove = () => { if (character.gear[slot]) gameStore.unequipGear(character.id, slot); else gameStore.unequip(character.id, slot); };
  const swapCount = candidatesFor(state, character, slot).length;
  return <div className="it-equip">
    <div className="it-col">
      <div className="it-doll pk-panel studs" role="group" aria-label="Equipamento">{(Object.keys(DOLL) as Slot[]).map(s =>
        <div key={s} style={{ gridColumn: DOLL[s][0], gridRow: DOLL[s][1] }}><ItemSlot slot={s} view={views[s]} selected={slot === s} warn={s === 'offhand' && !!conflict} onSelect={() => setSlot(s)} /></div>)}</div>
      {weapon && <div className="it-warnbar">{conflict ? `⚠ ${conflict}` : `${weapon.name} ocupa ${weapon.hands ?? 1} ${(weapon.hands ?? 1) === 1 ? 'mão' : 'mãos'}. Armas de 2 mãos bloqueiam a mão secundária.`}</div>}
    </div>
    <div className="it-col">
      {view
        ? <ItemDetail view={view}
            extra={swap && <SwapPopover state={state} character={character} slot={slot} onClose={() => setSwap(false)} />}>
            <button type="button" className="pk-btn" onClick={remove}>Remover</button>
            <button type="button" className="pk-btn" aria-expanded={swap} onClick={() => setSwap(!swap)}>Trocar…</button>
          </ItemDetail>
        : <div className="it-detail pk-panel"><div className="it-dhead"><span className="it-slot empty"><Icon name={`slot_${slot}`} size={48} /></span><div><div className="it-dname">Slot vazio</div><small className="muted">{swapCount ? `${swapCount} peça(s) na mochila servem aqui.` : 'Nada na mochila para este slot.'}</small></div></div>
          <div className="it-actions"><button type="button" className="pk-btn" aria-expanded={swap} onClick={() => setSwap(!swap)}>Equipar…</button></div>
          {swap && <SwapPopover state={state} character={character} slot={slot} onClose={() => setSwap(false)} />}</div>}
      <div className="it-sum pk-panel" aria-label="Bônus do equipamento"><h4 className="pk-sec">Bônus do equipamento</h4>
        <div className="it-sumgrid">{bonus.map(b => <div className="it-line" key={b.key}><span>{statNames[b.key]}</span><b>{b.value > 0 ? '+' : ''}{statValue(b.key, Math.round(b.value * 1000) / 1000)}</b></div>)}
          {!bonus.length && <div className="it-line"><span>Nenhum equipamento</span><b>—</b></div>}</div></div>
    </div>
  </div>;
}
