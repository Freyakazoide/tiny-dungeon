import { ART, type ArtData } from './data';

/** Aparência do personagem: `body` é um id de `arte/personagens`; as demais são ids de `cores.csv`. */
export interface Look { body: string; pele: string; cabelo: string; armadura: string }
export const LOOK_REGIONS = ['pele', 'cabelo', 'armadura'] as const;
export type LookRegion = (typeof LOOK_REGIONS)[number];
export const DEFAULT_BODY = 'squire';

export const optionsOf = (region: string, data: ArtData = ART) => data.colors[region] ?? [];
/** Padrão do n-ésimo personagem: avança por listas diferentes para os primeiros serem distintos. */
export function defaultLookFor(index: number, data: ArtData = ART): Look {
  const pick = (region: LookRegion, step: number) => { const list = optionsOf(region, data); return list.length ? list[(index * step) % list.length].id : ''; };
  return { body: DEFAULT_BODY, pele: pick('pele', 3), cabelo: pick('cabelo', 2), armadura: pick('armadura', 1) };
}
/** Completa e corrige: ids de cor desconhecidos caem na primeira opção da região (nunca invalida). */
export function normalizeLook(look: Partial<Look> | undefined, index = 0, data: ArtData = ART): Look {
  const base = defaultLookFor(index, data), out: Look = { body: look?.body && data.sprites.personagens[look.body] ? look.body : DEFAULT_BODY, pele: base.pele, cabelo: base.cabelo, armadura: base.armadura };
  for (const region of LOOK_REGIONS) { const list = optionsOf(region, data), id = look?.[region]; out[region] = id !== undefined ? (list.find(o => o.id === id) ?? list[0])?.id ?? '' : base[region]; }
  return out;
}
/** Todos os ids existem em `cores.csv`? (usado para recusar entrada inválida, ao contrário da migração). */
export const isValidLook = (look: Partial<Look>, data: ArtData = ART) => (look.body === undefined || !!data.sprites.personagens[look.body]) && LOOK_REGIONS.every(r => look[r] === undefined || optionsOf(r, data).some(o => o.id === look[r]));
export const lookKey = (look: Look) => `${look.body}.${look.pele}.${look.cabelo}.${look.armadura}`;
export const randomLook = (rng: () => number = Math.random, data: ArtData = ART): Look => {
  const pick = (region: LookRegion) => { const list = optionsOf(region, data); return list[Math.floor(rng() * list.length)]?.id ?? ''; };
  return { body: DEFAULT_BODY, pele: pick('pele'), cabelo: pick('cabelo'), armadura: pick('armadura') };
};
