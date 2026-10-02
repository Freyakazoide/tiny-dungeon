// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { assemble, recipeKey } from '../../game/art/gear/assemble';
import { recipeIssues } from '../../game/art/gear/recipes';
import { ITEMS } from '../../game/data/items';
import { ItemIcon } from './ItemIcon';
import { recipeForItem } from './gearIcon';
import { viewFromItem } from './itemView';
import tier1 from '../../game/data/items-tier1.json';
import tier2 from '../../game/data/items-tier2.json';

afterEach(cleanup);
const weapon = (name: string, rarity = 'common', key = name) => ({ kind: 'equipment', slot: 'weapon', name, rarity, key });

describe('ícones de arma por partes', () => {
  it('toda arma, mão secundária, armadura, joia, poção e loot do jogo vira uma receita válida (sem item sem arte)', () => {
    let n = 0;
    for (const item of ITEMS) {
      const view = viewFromItem(item, 1, 'bp'), r = recipeForItem(view); n++;
      expect(r, item.name).toBeTruthy(); expect(recipeIssues(r!), item.name).toEqual([]); expect(assemble(r!).width, item.name).toBeGreaterThan(2);
    }
    expect(n).toBeGreaterThan(30);
  });
  it('as 1.215 bases de equipamento de classe (tier 1 e 2) também têm arte, em famílias coerentes com o slot', () => {
    const bases = [...(tier1 as unknown as { items: unknown[] }).items, ...(tier2 as unknown as { items: unknown[] }).items] as { name: string; slot: string; offhandKind?: string }[];
    expect(bases.length).toBeGreaterThan(1000);
    const bySlot: Record<string, string> = { helmet: 'cabeca', armor: 'torso', legs: 'pernas', boots: 'botas', amulet: 'amuleto', ring: 'anel' }, seen = new Set<string>();
    for (const b of bases) {
      const r = recipeForItem({ kind: 'equipment', slot: b.slot, name: b.name, rarity: 'rare', offhandKind: b.offhandKind });
      expect(r, `${b.slot}: ${b.name}`).toBeTruthy(); expect(recipeIssues(r!), b.name).toEqual([]); seen.add(r!.familia);
      if (bySlot[b.slot]) expect(r!.familia, b.name).toBe(bySlot[b.slot]);
    }
    expect(seen.size).toBeGreaterThanOrEqual(20);   // quase todas as famílias aparecem no catálogo real
  });
  it('as famílias certas: nome decide a arte (espada, arco, cajado, machado, escudo, livro, elmo, anel…)', () => {
    const fam = (name: string, slot: string, extra: Record<string, unknown> = {}) => recipeForItem({ kind: 'equipment', slot, name, rarity: 'common', ...extra })?.familia;
    expect(fam('Espada Longa', 'weapon')).toBe('espada'); expect(fam('Arco de Carvalho', 'weapon')).toBe('arco'); expect(fam('Cajado Arcano', 'weapon')).toBe('cajado');
    expect(fam('Machado de Batalha', 'weapon')).toBe('machado'); expect(fam('Martelo de Guerra', 'weapon')).toBe('martelo'); expect(fam('Lança Curta', 'weapon')).toBe('lanca');
    expect(fam('Adaga Fina', 'weapon')).toBe('adaga'); expect(fam('Varinha de Salgueiro', 'weapon')).toBe('varinha'); expect(fam('Besta Pesada', 'weapon')).toBe('besta'); expect(fam('Foice Cega', 'weapon')).toBe('foice');
    expect(fam('Pistola Velha', 'weapon')).toBe('arma_fogo'); expect(fam('Flauta de Osso', 'weapon')).toBe('instrumento'); expect(fam('Manoplas de Ferro', 'weapon')).toBe('luvas');
    expect(fam('Escudo de Madeira', 'offhand', { offhandKind: 'shield' })).toBe('escudo'); expect(fam('Grimório Antigo', 'offhand', { offhandKind: 'focus' })).toBe('livro'); expect(fam('Aljava de Couro', 'offhand', { offhandKind: 'quiver' })).toBe('aljava');
    expect(fam('Totem da Natureza', 'offhand')).toBe('totem'); expect(fam('Foco de Cristal', 'offhand', { offhandKind: 'focus' })).toBe('orbe');
    expect(fam('Capuz de Couro', 'helmet')).toBe('cabeca'); expect(fam('Armadura de Placas', 'armor')).toBe('torso'); expect(fam('Calças do Viajante', 'legs')).toBe('pernas'); expect(fam('Botas Ligeiras', 'boots')).toBe('botas');
    expect(fam('Amuleto de Osso', 'amulet')).toBe('amuleto'); expect(fam('Anel de Cobre', 'ring')).toBe('anel');
  });
  it('o nome escolhe a parte principal: capuz é capuz, coroa é coroa, cota é malha; poção tem o líquido e o tamanho certos', () => {
    const part = (name: string, slot: string, s: string) => recipeForItem({ kind: 'equipment', slot, name, rarity: 'rare' })?.partes[s].parte;
    expect(part('Capuz de Couro', 'helmet', 'shell')).toBe('capuz'); expect(part('Coroa de Ossos', 'helmet', 'shell')).toBe('coroa'); expect(part('Cota de Malha', 'armor', 'body')).toBe('cota'); expect(part('Botas de Sandália', 'boots', 'body')).toBe('botas');
    const potion = (name: string, supply: 'health' | 'mana', rarity: string) => recipeForItem({ kind: 'supply', name, supply, rarity })!;
    expect(potion('Poção de Vida', 'health', 'common').partes.liquido.material).toBe('pocao_vida'); expect(potion('Poção de Mana', 'mana', 'common').partes.liquido.material).toBe('pocao_mana');
    expect(potion('Poção Forte de Vida', 'health', 'rare').partes.vessel.parte).toBe('grande'); expect(potion('Poção Suprema de Mana', 'mana', 'epic').partes.efeito).toBeTruthy();
    expect(new Set(['Poção de Vida', 'Grande Poção de Vida', 'Poção Forte de Vida', 'Poção Suprema de Vida'].map(n => recipeKey(potion(n, 'health', 'common')))).size).toBe(4);
  });
  it('loot: osso, pele, escama, minério e cristal têm cada um a sua arte e o seu material', () => {
    const l = (name: string, rarity = 'common') => recipeForItem({ kind: 'loot', name, rarity })!;
    expect(l('Osso Antigo').partes.item).toEqual({ parte: 'osso', material: 'osso' }); expect(l('Pele de Lobo').partes.item.parte).toBe('pelagem'); expect(l('Escama de Lagarto').partes.item.parte).toBe('escama');
    expect(l('Minério Bruto').partes.item.parte).toBe('minerio'); expect(l('Cristal Frio').partes.item.parte).toBe('cristal'); expect(l('Pó de Tumba').partes.item.parte).toBe('saquinho');
    for (const n of ['Osso Antigo', 'Pele de Lobo', 'Escama de Lagarto', 'Minério Bruto', 'Cristal Frio', 'Pó de Tumba']) expect(recipeIssues(l(n)), n).toEqual([]);
  });
  it('nomes do plano usam a receita do plano; a mesma peça sempre tem a mesma cara e todas as receitas são válidas', () => {
    expect(recipeForItem(weapon('Espada Enferrujada'))?.id).toBe('espada_enferrujada'); expect(recipeForItem(weapon('Arco Solar'))?.id).toBe('arco_solar'); expect(recipeForItem(weapon('Cajado Funesto'))?.id).toBe('cajado_funesto');
    for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']) for (const name of ['Espada Longa', 'Arco Curto', 'Cajado de Pedra']) {
      const a = recipeForItem(weapon(name, rarity))!, b = recipeForItem(weapon(name, rarity))!;
      expect(recipeKey(a)).toBe(recipeKey(b)); expect(recipeIssues(a)).toEqual([]);
    }
  });
  it('peças de classe com a mesma base e uids diferentes ganham caras diferentes (variedade)', () => {
    const faces = new Set(Array.from({ length: 30 }, (_, i) => recipeKey(recipeForItem(weapon('Montante', 'legendary', `gear:uid-${i}`))!)));
    expect(faces.size).toBeGreaterThan(10);
  });
  it('as armas do jogo que são espada/arco/cajado mostram o ícone montado (PNG quadrado de 48 px); as demais mantêm o ícone antigo', () => {
    const weapons = Object.values(ITEMS).filter(i => i.kind === 'equipment' && i.slot === 'weapon');
    expect(weapons.length).toBeGreaterThan(0);
    let withGear = 0;
    for (const item of weapons) {
      const { container, unmount } = render(<ItemIcon view={viewFromItem(item, 1, 'bp')} size={48} />); const img = container.querySelector('img')!;
      if (recipeForItem(viewFromItem(item, 1, 'bp'))) { withGear++; expect(img.getAttribute('data-gear')).toBeTruthy(); expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/); } else expect(img.getAttribute('data-gear')).toBeNull();
      unmount();
    }
    expect(withGear).toBeGreaterThan(0);
  });
});
