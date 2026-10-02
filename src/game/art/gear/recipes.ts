import { mulberry32, pick, type Rng } from '../../run/rng';
import type { Recipe, SlotPick } from './assemble';
import { FAMILIES, partsFor, TEMPLATES } from './catalog';
import { MATERIALS, materialOf } from './materials';
import { clash, compatible, rarityRank, type Family, type PartDef, type Rarity, type SlotCategory } from './parts';

const r = (id: string, nome: string, familia: Family, partes: Record<string, [string, string]>): Recipe =>
  ({ id, nome, familia, partes: Object.fromEntries(Object.entries(partes).map(([slot, [parte, material]]) => [slot, { parte, material }])) });

/** As quatro armas que provam o sistema (itens do plano). */
export const PLAN_RECIPES: Recipe[] = [
  r('espada_enferrujada', 'Espada enferrujada', 'espada', { blade: ['lascada', 'ferro_enferrujado'], guard: ['simples', 'ferro_enferrujado'], grip: ['couro', 'couro'], pommel: ['disco', 'ferro_enferrujado'], efeito: ['ferrugem', 'ferrugem'] }),
  r('espada_de_ferro', 'Espada de ferro', 'espada', { blade: ['reta', 'ferro'], guard: ['simples', 'ferro'], grip: ['couro', 'couro'], pommel: ['redondo', 'ferro'] }),
  r('arco_solar', 'Arco solar', 'arco', { limb: ['curvo', 'ouro'], grip: ['ornado', 'luz_solar'], corda: ['luz', 'luz_solar'], efeito: ['raios', 'luz_solar'] }),
  r('cajado_funesto', 'Cajado funesto', 'cajado', { shaft: ['torta', 'madeira_negra'], butt: ['ponta', 'aco_negro'], cradle: ['taca', 'aco_negro'], gem: ['cranio', 'osso'], efeito: ['chamas', 'essencia_funesta'] }),
];

/** Escada de raridade da espada: a mesma lâmina muda de material, guarda, cabo e efeito. */
export const SWORD_LADDER: Recipe[] = [
  r('espada_comum', 'Espada comum', 'espada', { blade: ['reta', 'ferro'], guard: ['simples', 'ferro'], grip: ['couro', 'couro'], pommel: ['redondo', 'ferro'] }),
  r('espada_incomum', 'Espada incomum', 'espada', { blade: ['reta', 'prata'], guard: ['cruzeta', 'bronze'], grip: ['couro', 'couro_vermelho'], pommel: ['redondo', 'bronze'] }),
  r('espada_rara', 'Espada rara', 'espada', { blade: ['larga', 'prata'], guard: ['asas', 'ouro'], grip: ['couro', 'couro_vermelho'], pommel: ['gema', 'cristal_arcano'], efeito: ['veio', 'cristal_arcano'] }),
  r('espada_epica', 'Espada épica', 'espada', { blade: ['larga', 'aco_negro'], guard: ['asas', 'prata'], grip: ['longo', 'couro_vermelho'], pommel: ['gema', 'luz_solar'], efeito: ['runas', 'luz_solar'] }),
  r('espada_lendaria', 'Espada lendária', 'espada', { blade: ['larga', 'aco_negro'], guard: ['asas', 'ouro'], grip: ['longo', 'couro_vermelho'], pommel: ['gema', 'cristal_arcano'], efeito: ['runas', 'cristal_arcano'] }),
];

/** Materiais por raridade e categoria de slot. `efeito.chance` é a chance de a arma ter efeito mágico. */
interface Pool { lamina: string[]; guarnicao: string[]; cabo: string[]; gema: string[]; corda: string[]; efeito: { chance: number; materiais: string[] } }
const EMISSIVE = ['cristal_arcano', 'luz_solar', 'essencia_funesta'];
export const POOLS: Record<Rarity, Pool> = {
  common: { lamina: ['ferro', 'ferro_enferrujado', 'bronze'], guarnicao: ['ferro', 'bronze', 'madeira'], cabo: ['couro', 'madeira'], gema: [], corda: ['couro', 'osso'], efeito: { chance: .15, materiais: ['ferrugem'] } },
  uncommon: { lamina: ['ferro', 'prata', 'bronze'], guarnicao: ['bronze', 'prata', 'ferro'], cabo: ['couro', 'couro_vermelho', 'madeira'], gema: ['cristal_arcano'], corda: ['couro', 'osso', 'prata'], efeito: { chance: 0, materiais: [] } },
  rare: { lamina: ['prata', 'aco_negro', 'ferro'], guarnicao: ['ouro', 'prata', 'bronze'], cabo: ['couro_vermelho', 'couro', 'madeira_negra'], gema: ['cristal_arcano', 'luz_solar'], corda: ['prata', 'ouro'], efeito: { chance: .5, materiais: ['cristal_arcano'] } },
  epic: { lamina: ['aco_negro', 'prata'], guarnicao: ['ouro', 'prata', 'aco_negro'], cabo: ['couro_vermelho', 'madeira_negra', 'osso'], gema: EMISSIVE, corda: ['prata', ...EMISSIVE], efeito: { chance: .85, materiais: EMISSIVE } },
  legendary: { lamina: ['aco_negro', 'prata'], guarnicao: ['ouro'], cabo: ['couro_vermelho', 'madeira_negra'], gema: EMISSIVE, corda: EMISSIVE, efeito: { chance: 1, materiais: EMISSIVE } },
};

/** A parte bate com alguma já escolhida (regra `incompativel`, nos dois sentidos)? */
const clashes = (part: PartDef, familia: Family, chosen: Record<string, SlotPick>) =>
  Object.entries(chosen).some(([slot, p]) => { const other = partsFor(familia, slot).find(x => x.id === p.parte); return !!other && clash(part, other); });
const allowed = (part: PartDef, rarity: Rarity) => rarityRank(part.desde ?? 'common') <= rarityRank(rarity);
function pickMaterial(part: PartDef, category: SlotCategory, rarity: Rarity, rng: Rng): string | undefined {
  const pool = category === 'efeito' ? POOLS[rarity].efeito.materiais : POOLS[rarity][category];
  const ok = pool.filter(id => compatible(part, materialOf(id)));
  return ok.length ? pick(ok, rng) : undefined;
}

/**
 * Raridade vira receita: sorteia, por slot, uma parte liberada para a raridade e um material do conjunto dela que seja compatível.
 * Determinístico para o mesmo `rng`. Slots opcionais (efeito, gema) podem ficar vazios.
 */
export function recipeForRarity(familia: Family, rarity: Rarity, rng: Rng = Math.random, nome = ''): Recipe {
  const partes: Record<string, SlotPick> = {};
  for (const s of TEMPLATES[familia].slots) {
    if (s.espelhaDe) continue;
    if (s.categoria === 'efeito' && rng() >= POOLS[rarity].efeito.chance) continue;
    const parts = partsFor(familia, s.slot).filter(p => allowed(p, rarity));
    for (let tries = 0; tries < 8 && parts.length; tries++) {
      const part = pick(parts, rng); if (clashes(part, familia, partes)) continue;
      const material = pickMaterial(part, s.categoria, rarity, rng);
      if (material) { partes[s.slot] = { parte: part.id, material }; break; }
    }
    if (!partes[s.slot] && !s.opcional) { // sem combinação válida no conjunto da raridade: cai no ferro/madeira, que servem em quase tudo
      const part = parts.find(p => compatible(p, MATERIALS.ferro)) ?? parts[0];
      partes[s.slot] = { parte: part.id, material: compatible(part, MATERIALS.ferro) ? 'ferro' : 'madeira' };
    }
  }
  return { id: `${familia}_${rarity}`, nome: nome || `${TEMPLATES[familia].nome} ${rarity}`, familia, partes };
}
/** Receita estável para uma semente (o mesmo item sempre com a mesma cara). */
export const recipeForSeed = (familia: Family, rarity: Rarity, seed: number): Recipe => recipeForRarity(familia, rarity, mulberry32(seed));

/** Problemas da receita: slot sem parte, parte desconhecida ou combinação que a curadoria proíbe. */
export function recipeIssues(recipe: Recipe): string[] {
  const out: string[] = [];
  for (const s of TEMPLATES[recipe.familia].slots) {
    if (s.espelhaDe) continue;
    const p = recipe.partes[s.slot];
    if (!p) { if (!s.opcional) out.push(`falta ${s.nome}`); continue; }
    const part = partsFor(recipe.familia, s.slot).find(x => x.id === p.parte), material = MATERIALS[p.material];
    if (!part) out.push(`${s.nome}: parte "${p.parte}" não existe`);
    else if (!material) out.push(`${s.nome}: material "${p.material}" não existe`);
    else if (!compatible(part, material)) out.push(`${s.nome}: ${part.nome} não combina com ${material.nome}`);
  }
  const chosen = Object.entries(recipe.partes).flatMap(([slot, p]) => partsFor(recipe.familia, slot).filter(x => x.id === p.parte));
  for (const [i, a] of chosen.entries()) for (const b of chosen.slice(i + 1)) if (clash(a, b)) out.push(`${a.nome} não combina com ${b.nome}`);
  return out;
}
export const ALL_FAMILIES = FAMILIES;
