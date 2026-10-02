import { PLAN_RECIPES, recipeForSeed } from '../../game/art/gear/recipes';
import type { Recipe } from '../../game/art/gear/assemble';
import { partsFor } from '../../game/art/gear/catalog';
import { MATERIALS } from '../../game/art/gear/materials';
import { compatible, type Family, type Rarity } from '../../game/art/gear/parts';
import { mix } from '../../game/run/rng';

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RARITY: Record<string, Rarity> = { common: 'common', uncommon: 'uncommon', rare: 'rare', epic: 'epic', legendary: 'legendary', mythic: 'legendary' };
const hash = (text: string) => mix(...[...text].map(c => c.charCodeAt(0)));

/** Regra: se uma das palavras está entre as duas primeiras do nome, o item é da família; `force` fixa a parte principal (slot → id). */
interface Rule { familia: Family; words: string[]; force?: Record<string, string> }
const WEAPON: Rule[] = [
  { familia: 'adaga', words: ['adaga', 'punhal', 'faca', 'presa'] },
  { familia: 'espada', words: ['espada', 'lamina', 'sabre', 'gladio', 'alfanje', 'montante', 'fendedor', 'tempestade'] },
  { familia: 'machado', words: ['machado'] },
  { familia: 'martelo', words: ['martelo', 'maca', 'mangual'] },
  { familia: 'lanca', words: ['lanca', 'pique', 'alabarda'] },
  { familia: 'foice', words: ['foice', 'ceifador', 'ceifa-garganta'] },
  { familia: 'arco', words: ['arco'] }, { familia: 'besta', words: ['besta'] },
  { familia: 'varinha', words: ['varinha'] },
  { familia: 'cajado', words: ['cajado', 'bastao', 'bordao', 'cetro', 'bo', 'galho'] },
  { familia: 'arma_fogo', words: ['pistola', 'rifle', 'revolver', 'mosquete', 'carabina', 'canhao', 'lancador', 'repetidora'] },
  { familia: 'instrumento', words: ['flauta', 'alaude', 'lira', 'harpa', 'violino', 'bandolim', 'tamborim', 'pandeiro', 'cimbalos', 'tambor', 'sino'], force: {} },
  { familia: 'luvas', words: ['manopla', 'luvas', 'ataduras', 'garras', 'punhos', 'faixas'] },
  { familia: 'pocao', words: ['frasco', 'retorta', 'alambique', 'athanor', 'caldeirao'] },
  { familia: 'orbe', words: ['orbe'] },
];
const OFFHAND: Rule[] = [
  { familia: 'escudo', words: ['escudo', 'broquel', 'egide', 'muralha'] },
  { familia: 'livro', words: ['grimorio', 'tomo', 'livro', 'selo'] },
  { familia: 'totem', words: ['totem'] }, { familia: 'aljava', words: ['aljava'] },
  { familia: 'adaga', words: ['adaga', 'punhal', 'lamina', 'presa'] },
  { familia: 'arma_fogo', words: ['pistola', 'revolver', 'repetidora', 'canhao'] },
  { familia: 'instrumento', words: ['lira', 'tamborim', 'tambor', 'sino', 'pandeiro', 'cimbalos'] },
  { familia: 'pocao', words: ['alambique', 'caldeirao'] },
];
const HEAD: Rule[] = [
  { familia: 'cabeca', words: ['capuz'], force: { shell: 'capuz' } }, { familia: 'cabeca', words: ['chapeu', 'boina'], force: { shell: 'chapeu' } },
  { familia: 'cabeca', words: ['coroa'], force: { shell: 'coroa' } }, { familia: 'cabeca', words: ['tiara', 'halo'], force: { shell: 'tiara' } },
  { familia: 'cabeca', words: ['mascara', 'oculos', 'veu'], force: { shell: 'mascara' } }, { familia: 'cabeca', words: ['mitra'], force: { shell: 'mitra' } },
  { familia: 'cabeca', words: ['faixa', 'bandana'], force: { shell: 'faixa' } }, { familia: 'cabeca', words: ['capacete'], force: { shell: 'capacete' } },
  { familia: 'cabeca', words: ['elmo'], force: { shell: 'elmo' } },
];
const BODY: Rule[] = [
  { familia: 'torso', words: ['cota'], force: { body: 'cota' } }, { familia: 'torso', words: ['couraca', 'armadura', 'peitoral', 'exoesqueleto'], force: { body: 'couraca' } },
  { familia: 'torso', words: ['manto', 'habito', 'vestes', 'mortalha', 'kimono'], force: { body: 'manto' } }, { familia: 'torso', words: ['tunica', 'jaleco'], force: { body: 'tunica' } },
  { familia: 'torso', words: ['gibao', 'casaco', 'casaca', 'couro'], force: { body: 'gibao' } }, { familia: 'torso', words: ['colete', 'avental'], force: { body: 'colete' } },
];
const LEGS: Rule[] = [{ familia: 'pernas', words: ['grevas'], force: { body: 'grevas' } }, { familia: 'pernas', words: ['couraceiras'], force: { body: 'couraceiras' } }];
const BOOTS: Rule[] = [{ familia: 'botas', words: ['sandalias', 'chinelas'], force: { body: 'sandalias' } }, { familia: 'botas', words: ['sabatons'], force: { body: 'sabatons' } }, { familia: 'botas', words: ['sapatos'], force: { body: 'sapatos' } }];
const AMULET: Rule[] = [
  { familia: 'amuleto', words: ['medalhao', 'medalha', 'insignia'], force: { pendant: 'medalhao' } }, { familia: 'amuleto', words: ['olho', 'lente', 'vidro'], force: { pendant: 'olho' } },
  { familia: 'amuleto', words: ['cristal', 'nucleo', 'coracao', 'essencia', 'semente', 'pedra'], force: { pendant: 'cristal' } }, { familia: 'amuleto', words: ['simbolo', 'crucifixo', 'glifo', 'runa', 'talisma', 'reliquia'], force: { pendant: 'cruz' } },
];
const RING: Rule[] = [];
const FIXED: Record<string, { familia: Family; rules: Rule[] }> = {
  helmet: { familia: 'cabeca', rules: HEAD }, armor: { familia: 'torso', rules: BODY }, legs: { familia: 'pernas', rules: LEGS }, boots: { familia: 'botas', rules: BOOTS }, amulet: { familia: 'amuleto', rules: AMULET }, ring: { familia: 'anel', rules: RING },
};
/** Nomes que já têm receita própria no plano (ex.: "Espada Enferrujada" é a enferrujada, "Arco Solar" é o solar). */
const NAMED: [RegExp, string][] = [[/enferrujad/, 'espada_enferrujada'], [/solar/, 'arco_solar'], [/funest/, 'cajado_funesto']];

const LOOT: [string[], string, string[]][] = [
  [['cranio', 'coroa de teias', 'calice profano', 'dente de hidra'], 'cranio', ['osso', 'ouro']], [['osso', 'ossos'], 'osso', ['osso']], [['dente', 'presa', 'garra'], 'presa', ['osso']],
  [['pele', 'pelo', 'couro', 'pelagem'], 'pelagem', ['pele']], [['escama', 'carapaca', 'casca'], 'escama', ['escama']],
  [['minerio', 'rocha', 'nucleo de pedra'], 'minerio', ['pedra', 'cobre', 'prata', 'ouro']], [['cristal', 'coracao de gelo', 'gema'], 'cristal', ['cristal_arcano', 'safira', 'esmeralda', 'rubi']],
  [['po ', 'cinza', 'brasa', 'simbolo', 'pena'], 'saquinho', ['linho', 'pano_azul', 'pano_negro', 'veludo_vermelho']],
];
const TIER_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 4 };

export interface IconSubject { kind: string; slot?: string; name: string; rarity?: string; key?: string; offhandKind?: string; supply?: 'health' | 'mana' }

const recipe = (id: string, nome: string, familia: Family, partes: Recipe['partes']): Recipe => ({ id, nome, familia, partes });
function potion(view: IconSubject): Recipe {
  const name = norm(view.name), tier = TIER_ORDER[view.rarity ?? 'common'] ?? 0, mana = view.supply === 'mana' || /mana/.test(name);
  const vessel = /suprema/.test(name) ? 'estreito' : /forte/.test(name) ? 'grande' : /grande/.test(name) ? 'medio' : 'pequeno';
  return recipe(`pocao_${vessel}_${mana ? 'mana' : 'vida'}`, view.name, 'pocao', {
    vessel: { parte: vessel, material: 'vidro' }, liquido: { parte: 'puro', material: mana ? 'pocao_mana' : 'pocao_vida' },
    cork: tier >= 2 ? { parte: 'tampa', material: tier >= 3 ? 'ouro' : 'prata' } : { parte: 'rolha', material: 'madeira' },
    ...(tier >= 3 ? { efeito: { parte: 'faiscas', material: mana ? 'pocao_mana' : 'pocao_vida' } } : {}),
  });
}
function loot(view: IconSubject): Recipe {
  const name = norm(view.name) + ' ', tier = TIER_ORDER[view.rarity ?? 'common'] ?? 0;
  const [, part, mats] = LOOT.find(([words]) => words.some(w => name.includes(w))) ?? [[], 'saquinho', ['linho']];
  const material = mats[part === 'minerio' ? Math.min(tier, mats.length - 1) : hash(name) % mats.length];
  return recipe(`espolio_${part}_${material}`, view.name, 'espolio', { item: { parte: part, material }, ...(tier >= 3 && MATERIALS[material]?.emissive ? { efeito: { parte: 'brilho', material } } : {}) });
}

/** Troca a parte principal por `id`, ajustando o material se a combinação for proibida. */
function force(r: Recipe, slotName: string, id: string): Recipe {
  const part = partsFor(r.familia, slotName).find(p => p.id === id), cur = r.partes[slotName]; if (!part || !cur) return r;
  const material = compatible(part, MATERIALS[cur.material]) ? cur.material : Object.values(MATERIALS).find(m => compatible(part, m) && m.tipo === MATERIALS[cur.material].tipo)?.id ?? Object.values(MATERIALS).find(m => compatible(part, m))!.id;
  return { ...r, partes: { ...r.partes, [slotName]: { parte: id, material } } };
}

/** Receita de arte do item (todo equipamento, poção e loot), ou `undefined` se o nome não se encaixa. A mesma peça sempre tem a mesma cara. */
export function recipeForItem(view: IconSubject): Recipe | undefined {
  if (view.kind === 'supply') return potion(view);
  if (view.kind === 'loot') return loot(view);
  if (view.kind !== 'equipment' || !view.slot) return undefined;
  const name = norm(view.name), words = name.split(/\s+/).slice(0, 2).flatMap(w => (w.length > 3 && w.endsWith('s') ? [w, w.slice(0, -1)] : [w])), rarity = RARITY[view.rarity ?? 'common'] ?? 'common';
  let familia: Family | undefined, rules: Rule[] = [], forced: Record<string, string> | undefined;
  if (view.slot === 'weapon' || view.slot === 'offhand') {
    const table = view.slot === 'weapon' ? WEAPON : OFFHAND, hit = table.find(r => r.words.some(w => words.includes(w)));
    familia = hit?.familia ?? (view.slot === 'offhand' ? (view.offhandKind === 'shield' ? 'escudo' : view.offhandKind === 'quiver' ? 'aljava' : view.offhandKind === 'dual' ? 'adaga' : 'orbe') : undefined);
  } else { const fx = FIXED[view.slot]; familia = fx?.familia; rules = fx?.rules ?? []; const hit = rules.find(r => r.words.some(w => words.includes(w))); forced = hit?.force; }
  if (!familia) return undefined;
  const named = view.slot === 'weapon' ? NAMED.find(([re]) => re.test(name)) : undefined, plan = named && PLAN_RECIPES.find(r => r.id === named[1] && r.familia === familia);
  if (plan) return plan;
  let r = recipeForSeed(familia, rarity, hash(view.key?.startsWith('gear:') ? view.key : name));
  for (const [s, id] of Object.entries(forced ?? {})) r = force(r, s, id);
  if (familia === 'instrumento') { const part = ({ flauta: 'flauta', alaude: 'alaude', violino: 'alaude', bandolim: 'alaude', lira: 'lira', harpa: 'lira', tambor: 'tambor', tamborim: 'tambor', pandeiro: 'tambor', cimbalos: 'sino', sino: 'sino' } as Record<string, string>)[words.find(w => w in { flauta: 1, alaude: 1, violino: 1, bandolim: 1, lira: 1, harpa: 1, tambor: 1, tamborim: 1, pandeiro: 1, cimbalos: 1, sino: 1 }) ?? 'lira']; r = force(r, 'body', part ?? 'lira'); }
  return r;
}
