import { useMemo, useState } from 'react';
import type { Character, GameState, ItemInstance } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { CLASS_BY_ID } from '../game/rpg/classTree';
import { PROFICIENCIES, type ProficiencyId } from '../game/rpg/proficiencies';
import { classItem, CLASSIFICATION_NAMES, CLASSIFICATIONS, ITEM_MECHANICS_IMPLEMENTED, itemsForClass, QUALITY_NAMES, SLOT_GROUP_NAMES } from '../game/data/classItems';
import { attrValue, gearBase, gearBlockReason, gearValue, handsConflict, smithPrice } from '../game/systems/gear';
import { effectLabel, formatEffectValue } from '../game/systems/talentGrid';

const tier1Classes = Object.values(CLASS_BY_ID).filter(n => n.tier === 1);

/** Linhas de descrição de uma instância: bônus fixo, Arm, passiva, mecânica e atributos aleatórios. */
export function gearLines(instance: ItemInstance) {
  const base = classItem(instance.baseId);
  if (!base) return { fixed: '', passive: '', mechanic: undefined as string | undefined, attrs: [] as string[] };
  const fixed = (Object.entries(base.fixed) as [ProficiencyId, number][]).map(([id, n]) => `+${n} ${PROFICIENCIES[id].name}`).join(', ');
  return {
    fixed: [fixed, base.arm ? `Arm ${base.arm}` : ''].filter(Boolean).join(' · '),
    passive: base.mechanic ? '' : (base.effects ?? []).map(e => `${effectLabel(e.code)} ${formatEffectValue(e.code, e.value)}`).join('; '),
    mechanic: base.mechanic,
    attrs: instance.attrs.map(a => `${effectLabel(a.code)} ${formatEffectValue(a.code, attrValue(a.code, a.level))} (nv. ${a.level})`),
  };
}

export function GearCard({ instance, note }: { instance: ItemInstance; note?: string }) {
  const base = classItem(instance.baseId);
  if (!base) return null;
  const lines = gearLines(instance), soon = lines.mechanic && !ITEM_MECHANICS_IMPLEMENTED.has(lines.mechanic);
  return <div className="gear-card">
    <b className={`rarity-${instance.classification}`}>{base.name} <em>{QUALITY_NAMES[base.quality]} · {CLASSIFICATION_NAMES[instance.classification]}</em></b>
    <small>{SLOT_GROUP_NAMES[base.slotGroup]}{base.offhandKind ? ` (${base.offhandKind})` : ''} · {lines.fixed}</small>
    {lines.passive && <small className="gear-passive">{lines.passive}</small>}
    {lines.mechanic && <small className="gear-mechanic">Mecânica{soon ? ' · Em breve' : ''}: {lines.mechanic}</small>}
    {lines.attrs.map(a => <small className="gear-attr" key={a}>◆ {a}</small>)}
    {note && <small>{note}</small>}
  </div>;
}

/** Trocas possíveis num slot com equipamento de classe (mochila de equipamento), já filtradas por classe. */
export function gearOptions(state: GameState, character: Character, slot: keyof Character['equipment']) {
  return state.gearBag.filter(g => classItem(g.baseId)?.slot === slot && !gearBlockReason(character, g));
}

/** Motivo pelo qual o item não entra agora (classe ou mãos), ou undefined. */
export function gearEquipReason(character: Character, instance: ItemInstance) {
  const base = classItem(instance.baseId);
  const byClass = gearBlockReason(character, instance);
  if (byClass || !base) return byClass;
  if (base.slot === 'offhand') return handsConflict(gearBase(character, 'weapon'), base);
  return undefined;
}

type GearSort = 'quality' | 'value' | 'name';
const RANK = (i: ItemInstance) => CLASSIFICATIONS.indexOf(i.classification);

/** Mochila de equipamento de classe + Ferreiro de classe. */
export function GearBag({ state, character }: { state: GameState; character: Character }) {
  const [sort, setSort] = useState<GearSort>('quality');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const own = tier1Classes.find(n => character.profile.classPath.includes(n.id))?.id ?? 'guerreiro';
  const [smithClass, setSmithClass] = useState(own);
  const bag = useMemo(() => {
    const shown = state.gearBag.filter(g => slotFilter === 'all' || classItem(g.baseId)?.slotGroup === slotFilter);
    return [...shown].sort((a, b) => sort === 'name' ? (classItem(a.baseId)?.name ?? '').localeCompare(classItem(b.baseId)?.name ?? '')
      : sort === 'value' ? gearValue(b) - gearValue(a)
      : RANK(b) - RANK(a) || gearValue(b) - gearValue(a));
  }, [state.gearBag, sort, slotFilter]);
  const commons = state.gearBag.filter(g => g.classification === 'common');
  const commonValue = commons.reduce((sum, g) => sum + gearValue(g), 0);
  const smithItems = itemsForClass(smithClass).filter(i => i.quality === 'standard');
  return <>
    <div className="subsection-heading"><h3>Equipamento de classe</h3>
      <div className="bag-controls">
        <label>Slot <select value={slotFilter} onChange={e => setSlotFilter(e.target.value)}><option value="all">Todos</option>{Object.entries(SLOT_GROUP_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Ordenar <select value={sort} onChange={e => setSort(e.target.value as GearSort)}><option value="quality">Classificação</option><option value="value">Valor</option><option value="name">Nome</option></select></label>
      </div></div>
    <p className="gate-level">{state.gearBag.length}/80 na mochila de equipamento. Itens Comuns não têm atributos aleatórios; o Squire não equipa itens de classe.</p>
    <div className="bag-list">{bag.map(instance => {
      const base = classItem(instance.baseId)!, reason = gearEquipReason(character, instance);
      return <article className="bag-row" key={instance.uid}>
        <span className={`item-icon rarity-${instance.classification}`}>{base.slot === 'weapon' ? '⚔' : base.slot === 'offhand' ? '◈' : base.slot === 'helmet' ? '♛' : base.slot === 'ring' ? '◌' : base.slot === 'amulet' ? '✦' : '▣'}</span>
        <div className="bag-row-copy"><GearCard instance={instance} note={`${gearValue(instance)} ouro`} />{reason && <small className="warn">{reason}</small>}</div>
        <div className="bag-row-actions">
          <button className="primary" disabled={!!reason} title={reason} onClick={() => gameStore.equipGear(character.id, instance.uid)}>Equipar em {character.name}</button>
          <button onClick={() => gameStore.sellGear(instance.uid)}>Vender ({gearValue(instance)})</button>
        </div>
      </article>;
    })}{!bag.length && <p className="empty-state">Nenhum equipamento de classe. Eles caem das hunts (chefes largam mais) e o Ferreiro vende os Padrão.</p>}</div>
    <div className="shop-box"><span>{commons.length} Comuns na mochila · valor <b>{commonValue.toLocaleString('pt-BR')} ouro</b></span>
      <button disabled={!commons.length} onClick={() => gameStore.sellGearUpTo('common')}>Vender todos os Comuns</button></div>

    <div className="subsection-heading"><h3>Ferreiro de classe</h3><small>Vende só itens Padrão, sempre Comuns. Superior, BiS e atributos aleatórios só por drop.</small></div>
    <label className="smith-class">Classe <select value={smithClass} onChange={e => setSmithClass(e.target.value)}>{tier1Classes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
    <div className="shop-grid gear-shop">{smithItems.map(item => {
      const price = smithPrice(item.id);
      return <div className="shop-row" key={item.id}>
        <span><b>{item.name}</b><small>{SLOT_GROUP_NAMES[item.slotGroup]} · {gearLines({ uid: '', baseId: item.id, classification: 'common', attrs: [] }).fixed} · {price} ouro{item.classes.length > 1 ? ` · também ${item.classes.filter(c => c !== smithClass).map(c => CLASS_BY_ID[c]?.name).join(', ')}` : ''}</small></span>
        <span className="shop-buttons"><button disabled={state.gold < price || state.gearBag.length >= 80} onClick={() => gameStore.buyGear(item.id)}>Comprar</button></span>
      </div>;
    })}</div>
  </>;
}
