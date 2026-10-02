// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { recipeKey } from '../../game/art/gear/assemble';
import { recipeIssues } from '../../game/art/gear/recipes';
import { ITEMS } from '../../game/data/items';
import { ItemIcon } from './ItemIcon';
import { recipeForItem } from './gearIcon';
import { viewFromItem } from './itemView';

afterEach(cleanup);
const weapon = (name: string, rarity = 'common', key = name) => ({ kind: 'equipment', slot: 'weapon', name, rarity, key });

describe('ícones de arma por partes', () => {
  it('espada, arco e cajado viram receitas; outras famílias, escudos, poções e loot seguem como estavam', () => {
    expect(recipeForItem(weapon('Espada Longa'))?.familia).toBe('espada'); expect(recipeForItem(weapon('Arco de Carvalho'))?.familia).toBe('arco'); expect(recipeForItem(weapon('Cajado Arcano'))?.familia).toBe('cajado');
    expect(recipeForItem(weapon('Machado de Batalha'))).toBeUndefined(); expect(recipeForItem({ kind: 'supply', name: 'Poção' })).toBeUndefined();
    expect(recipeForItem({ kind: 'equipment', slot: 'offhand', name: 'Escudo' })).toBeUndefined(); expect(recipeForItem({ kind: 'loot', name: 'Osso' })).toBeUndefined();
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
