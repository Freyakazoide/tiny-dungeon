// @vitest-environment jsdom
import { useEffect, useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gameStore } from '../game/core/GameStore';
import { partyState } from '../game/core/testing';
import { CLASS_ITEMS } from '../game/data/classItems';
import { BUY_QUANTITIES } from '../game/data/shop';
import { railBadges } from './badges';
import { ItemsPanel, type ItemsSection } from './ItemsPanel';
import { ITEM_ICON_PNGS, itemIconName } from './items/ItemIcon';
import { fillQuantity } from './items/CommerceTabs';

const sword = CLASS_ITEMS.find(i => i.classes.includes('guerreiro') && i.slot === 'weapon' && i.hands !== 2)!;
const setup = () => {
  gameStore.hydrate(partyState()); const c0 = gameStore.getSnapshot().characters[0]; c0.profile.level = 30;
  gameStore.evolve(c0.id, 'guerreiro', { force: true });
  return gameStore.getSnapshot().characters[0].id;
};
const panel = (id: string, section: ItemsSection) => { const s = gameStore.getSnapshot(); return <ItemsPanel state={s} character={s.characters.find(c => c.id === id)!} section={section} />; };
/** Re-renderiza a cada mudança do engine (emit troca a raiz do estado). */
function Live({ id, section }: { id: string; section: ItemsSection }) {
  const [, tick] = useState(0);
  useEffect(() => { gameStore.subscribe(() => tick(n => n + 1)); }, []);
  return panel(id, section);
}
afterEach(cleanup);
beforeEach(() => { setup(); });

describe('Fase 10 — Itens', () => {
  it('o boneco tem os 8 slots; "Vazio" tem aria-label; clicar em slot só seleciona', async () => {
    const id = gameStore.getSnapshot().characters[0].id; render(<Live id={id} section="equipment" />); const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Amuleto: vazio' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^(Capacete|Armadura|Calças|Botas|Arma|Mão secundária|Amuleto|Anel):/ })).toHaveLength(8);
    const before = JSON.stringify(gameStore.getSnapshot().characters[0].equipment);
    await user.click(screen.getByRole('button', { name: /^Mão secundária:/ }));
    expect(JSON.stringify(gameStore.getSnapshot().characters[0].equipment)).toBe(before);
    expect(screen.getByRole('button', { name: /^Mão secundária:/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('Trocar… lista candidatas dos dois sistemas com deltas; clicar equipa', async () => {
    const id = gameStore.getSnapshot().characters[0].id; gameStore.grantGear(sword.id, 'rare'); render(<Live id={id} section="equipment" />); const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Trocar…' }));
    const dialog = screen.getByRole('dialog', { name: 'Trocar peça' });
    const rows = within(dialog).getAllByRole('button'); expect(rows.length).toBeGreaterThanOrEqual(1);
    await user.click(rows[0]);
    expect(gameStore.getSnapshot().characters[0].gear.weapon).toBeTruthy();
  });

  it('mochila: soma simples + classe; clicar seleciona sem equipar; Equipar exige o botão; "novo" some ao selecionar', async () => {
    const id = gameStore.getSnapshot().characters[0].id; gameStore.grantGear(sword.id, 'common');
    expect(railBadges(gameStore.getSnapshot(), gameStore.getSnapshot().characters[0]).itens?.value).toBeTruthy();
    render(<Live id={id} section="bag" />); const user = userEvent.setup();
    const tiles = screen.getAllByRole('option'); expect(tiles.length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector('.it-new')).toBeTruthy();
    await user.click(tiles[0]);
    expect(gameStore.getSnapshot().characters[0].gear.weapon).toBeUndefined();
    expect(document.querySelector('.it-new')).toBeNull();
    expect(railBadges(gameStore.getSnapshot(), gameStore.getSnapshot().characters[0]).itens).toBeUndefined();
    await user.click(screen.getByRole('button', { name: /^Equipar em/ }));
    expect(gameStore.getSnapshot().characters[0].gear.weapon).toBeTruthy();
  });

  it('mochila: filtros e setas do teclado; suprimentos não aparecem; capacidades como barras', async () => {
    const id = gameStore.getSnapshot().characters[0].id; gameStore.grantGear(sword.id, 'common'); gameStore.grantGear(sword.id, 'rare');
    render(<Live id={id} section="bag" />); const user = userEvent.setup();
    expect(screen.queryByText(/Poção de Vida/)).toBeNull();
    expect(screen.getAllByRole('progressbar').length).toBe(2);
    const tiles = screen.getAllByRole('option'); tiles[0].focus(); await user.keyboard('{ArrowRight}');
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Loot' })); expect(screen.queryAllByRole('option').length).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Armas' })); expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(2);
  });

  it('nenhuma tela de itens ou comércio usa select nativo', () => {
    const id = gameStore.getSnapshot().characters[0].id;
    for (const section of ['equipment', 'bag', 'supplies', 'shop', 'smith', 'sell'] as const) { const { container, unmount } = render(panel(id, section)); expect(container.querySelector('select'), section).toBeNull(); unmount(); }
  });

  it('itemIconName cai em slot_* quando não há PNG; o conjunto bate com o diretório', () => {
    expect(itemIconName({ kind: 'equipment', slot: 'weapon', name: 'Sabre do Comandante' })).toBe('slot_weapon');
    expect(itemIconName({ kind: 'equipment', slot: 'offhand', name: 'Escudo de Torre', offhandKind: 'shield' })).toBe('slot_offhand');
    const files = readdirSync('public/assets/ui/icons').filter(f => /^(item|loot)_.*\.png$/.test(f)).map(f => f.replace('.png', '')).sort();
    expect([...ITEM_ICON_PNGS].sort()).toEqual(files);
  });
});

describe('Fase 10 — Comércio', () => {
  it('Encher compra min(ouro/preço, capacidade − estoque)', async () => {
    const id = gameStore.getSnapshot().characters[0].id; const s = gameStore.getSnapshot(); s.gold = 100000;
    render(<Live id={id} section="shop" />); const user = userEvent.setup();
    const card = screen.getByRole('heading', { name: 'Poção de Vida' }).closest('.it-prod') as HTMLElement;
    const before = gameStore.getSnapshot().inventory.supply.reduce((n, x) => n + x.quantity, 0);
    await user.click(within(card).getByRole('button', { name: 'Encher' }));
    const after = gameStore.getSnapshot(); const used = after.inventory.supply.reduce((n, x) => n + x.quantity, 0);
    expect(used).toBeLessThanOrEqual(after.inventory.capacity.supply); expect(used).toBeGreaterThan(before);
    expect(BUY_QUANTITIES.length).toBe(3);
    expect(fillQuantity({ ...after, gold: 5 }, { itemId: 'health_potion', price: 12, unlockLevel: 1, unlocked: true })).toBe(0);
  });

  it('produto bloqueado por nível: botões desabilitados e tag de nível', () => {
    const id = gameStore.getSnapshot().characters[0].id; gameStore.getSnapshot().characters.forEach(c => { c.profile.level = 1; }); gameStore.getSnapshot().gold = 99999;
    render(panel(id, 'shop'));
    const card = screen.getByRole('heading', { name: 'Grande Poção de Vida' }).closest('.it-prod') as HTMLElement;
    expect(within(card).getByText(/Nível 8/)).toBeTruthy();
    for (const b of within(card).getAllByRole('button')) expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it('Ferreiro: classe do personagem primeiro (★); Comprar debita e põe uma instância Comum', async () => {
    const id = gameStore.getSnapshot().characters[0].id; gameStore.getSnapshot().gold = 100000;
    render(<Live id={id} section="smith" />); const user = userEvent.setup();
    const first = within(screen.getByRole('group', { name: 'Classe' })).getAllByRole('button')[0]; expect(first.textContent).toBe('★ Guerreiro');
    const gold = gameStore.getSnapshot().gold, n = gameStore.getSnapshot().gearBag.length;
    await user.click(screen.getAllByRole('button', { name: 'Comprar' })[0]);
    const after = gameStore.getSnapshot(); expect(after.gearBag.length).toBe(n + 1); expect(after.gold).toBeLessThan(gold); expect(after.gearBag[after.gearBag.length - 1].classification).toBe('common');
  });

  it('Vender: lote pede confirmação com contagem e total; sem botão para Lendários/Míticos', async () => {
    const id = gameStore.getSnapshot().characters[0].id; gameStore.grantGear(sword.id, 'common'); gameStore.grantGear(sword.id, 'legendary');
    render(<Live id={id} section="sell" />); const user = userEvent.setup();
    expect(screen.queryByRole('button', { name: /Lend|Míticos|Lendário/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Vender Comuns' }));
    expect(screen.getByRole('dialog', { name: 'Confirmar venda em lote' }).textContent).toMatch(/1 itens por/);
    expect(gameStore.getSnapshot().gearBag).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(gameStore.getSnapshot().gearBag.map(g => g.classification)).toEqual(['legendary']);
  });
});
