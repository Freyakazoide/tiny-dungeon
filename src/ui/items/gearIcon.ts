import { PLAN_RECIPES, recipeForSeed } from '../../game/art/gear/recipes';
import type { Recipe } from '../../game/art/gear/assemble';
import type { Family, Rarity } from '../../game/art/gear/parts';
import { mix } from '../../game/run/rng';

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Palavras do nome → família de arte. Só as famílias que existem em `art/gear` (espada, arco, cajado). */
const FAMILY_WORDS: [Family, string[]][] = [
  ['espada', ['espada', 'lamina', 'sabre', 'gladio', 'alfanje', 'montante', 'fendedor', 'tempestade']],
  ['arco', ['arco']],
  ['cajado', ['cajado', 'bastao', 'bordao', 'cetro']],
];
/** Nomes que já têm receita própria no plano (ex.: "Espada Enferrujada" é a enferrujada, "Arco Solar" é o solar). */
const NAMED: [RegExp, string][] = [[/enferrujad/, 'espada_enferrujada'], [/solar/, 'arco_solar'], [/funest/, 'cajado_funesto']];
const RARITY: Record<string, Rarity> = { common: 'common', uncommon: 'uncommon', rare: 'rare', epic: 'epic', legendary: 'legendary', mythic: 'legendary' };

const hash = (text: string) => mix(...[...text].map(c => c.charCodeAt(0)));
export interface IconSubject { kind: string; slot?: string; name: string; rarity?: string; key?: string }

/** Receita de arte do item, ou `undefined` se ele não é arma de uma família montada por partes. A mesma peça sempre tem a mesma cara. */
export function recipeForItem(view: IconSubject): Recipe | undefined {
  if (view.kind !== 'equipment' || view.slot !== 'weapon') return undefined;
  const name = norm(view.name), words = name.split(/\s+/).slice(0, 2);
  const family = FAMILY_WORDS.find(([, keys]) => words.some(w => keys.includes(w)))?.[0]; if (!family) return undefined;
  const named = NAMED.find(([re]) => re.test(name)), plan = named && PLAN_RECIPES.find(r => r.id === named[1] && r.familia === family);
  if (plan) return plan;
  // equipamento de classe tem várias peças da mesma base: o `key` (uid) dá a cada uma a sua cara; item simples usa o nome
  return recipeForSeed(family, RARITY[view.rarity ?? 'common'] ?? 'common', hash(view.key?.startsWith('gear:') ? view.key : name));
}
