import { ART, type ArtData } from './data';
import { HAIR_STYLES, HEADGEAR, NO_CAPE, isHairStyle, isHeadgear } from './styles';

/** Aparência do personagem: `body` é um id de `arte/personagens`; pele/cabelo/armadura/capa são ids de `cores.csv` (capa `nenhuma` = sem capa); `estilo` é o penteado e `topo` o chapéu/elmo (ver styles.ts). */
export interface Look { body: string; pele: string; cabelo: string; armadura: string; capa: string; estilo: string; topo: string }
export const LOOK_REGIONS = ['pele', 'cabelo', 'armadura', 'capa'] as const;
export type LookRegion = (typeof LOOK_REGIONS)[number];
export const DEFAULT_BODY = 'squire';

export const optionsOf = (region: string, data: ArtData = ART) => data.colors[region] ?? [];

/** Cor livre escolhida pelo jogador: o id é o próprio `#rrggbb` (vale em qualquer save, sem depender de `cores.csv`). */
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export interface ColorChoice { id: string; nome: string; cor: string; custom?: boolean }
const STORAGE_KEY = 'td-custom-colors';
const readCustom = (): Record<string, ColorChoice[]> => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; } };
/** Cores acrescentadas pelo jogador a um carrossel (ficam neste navegador; o `look` guarda o hex). */
export const customColors = (region: string): ColorChoice[] => (readCustom()[region] ?? []).filter(c => isHexColor(c.id)).map(c => ({ ...c, custom: true }));
export function addCustomColor(region: string, hex: string, nome = ''): ColorChoice | undefined {
  if (!isHexColor(hex)) return undefined;
  const id = hex.toLowerCase(), all = readCustom(), list = all[region] ?? [];
  const choice: ColorChoice = { id, nome: nome.trim().slice(0, 18) || id, cor: id, custom: true };
  if (!list.some(c => c.id === id) && !optionsOf(region).some(o => o.cor === id)) { all[region] = [...list, choice]; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* sem armazenamento: vale só nesta sessão */ } }
  return choice;
}
export function removeCustomColor(region: string, id: string) {
  const all = readCustom(); all[region] = (all[region] ?? []).filter(c => c.id !== id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* ignora */ }
}
/** Opção de cor por id: do CSV ou um hex livre. */
export const resolveOption = (region: string, id: string, data: ArtData = ART): ColorChoice | undefined =>
  optionsOf(region, data).find(o => o.id === id) ?? (isHexColor(id) ? { id: id.toLowerCase(), nome: id.toLowerCase(), cor: id.toLowerCase(), custom: true } : undefined);
/** Opções do carrossel: CSV, depois as do jogador (e a cor atual se for um hex que não está na lista). */
export function colorChoices(region: string, current?: string, data: ArtData = ART): ColorChoice[] {
  const list: ColorChoice[] = [...optionsOf(region, data), ...customColors(region).filter(c => !optionsOf(region, data).some(o => o.id === c.id))];
  if (current && isHexColor(current) && !list.some(o => o.id === current.toLowerCase())) list.push({ id: current.toLowerCase(), nome: current.toLowerCase(), cor: current.toLowerCase(), custom: true });
  return list;
}
/** Padrão do n-ésimo personagem: avança por listas diferentes para os primeiros serem distintos (penteado e capa também variam). */
export function defaultLookFor(index: number, data: ArtData = ART): Look {
  const pick = (region: LookRegion, step: number) => { const list = optionsOf(region, data); return list.length ? list[(index * step) % list.length].id : ''; };
  return { body: DEFAULT_BODY, pele: pick('pele', 3), cabelo: pick('cabelo', 2), armadura: pick('armadura', 1), capa: index % 3 === 2 ? pick('capa', 1) : NO_CAPE, estilo: HAIR_STYLES[(index * 5) % HAIR_STYLES.length].id, topo: 'nenhum' };
}
/** Completa e corrige: ids de cor desconhecidos caem na primeira opção da região e estilos desconhecidos no padrão (nunca invalida). */
export function normalizeLook(look: Partial<Look> | undefined, index = 0, data: ArtData = ART): Look {
  const base = defaultLookFor(index, data), out: Look = { ...base, body: look?.body && data.sprites.personagens[look.body] ? look.body : DEFAULT_BODY };
  for (const region of LOOK_REGIONS) { const list = optionsOf(region, data), id = look?.[region]; out[region] = id !== undefined ? (isHexColor(id) ? id.toLowerCase() : (list.find(o => o.id === id) ?? list[0])?.id ?? '') : base[region]; }
  out.estilo = isHairStyle(look?.estilo) ? look!.estilo! : base.estilo; out.topo = isHeadgear(look?.topo) ? look!.topo! : base.topo;
  return out;
}
/** Todos os ids existem em `cores.csv`/styles.ts? (usado para recusar entrada inválida, ao contrário da migração). */
export const isValidLook = (look: Partial<Look>, data: ArtData = ART) => (look.body === undefined || !!data.sprites.personagens[look.body]) && LOOK_REGIONS.every(r => look[r] === undefined || isHexColor(look[r]) || optionsOf(r, data).some(o => o.id === look[r]))
  && (look.estilo === undefined || isHairStyle(look.estilo)) && (look.topo === undefined || isHeadgear(look.topo));
export const lookKey = (look: Look) => `${look.body}.${look.pele}.${look.cabelo}.${look.armadura}.${look.capa}.${look.estilo}.${look.topo}`;
export const randomLook = (rng: () => number = Math.random, data: ArtData = ART): Look => {
  const pick = (region: LookRegion) => { const list = optionsOf(region, data); return list[Math.floor(rng() * list.length)]?.id ?? ''; };
  const one = <T,>(list: readonly T[]) => list[Math.floor(rng() * list.length)];
  return { body: DEFAULT_BODY, pele: pick('pele'), cabelo: pick('cabelo'), armadura: pick('armadura'), capa: rng() < .5 ? NO_CAPE : pick('capa'), estilo: one(HAIR_STYLES).id, topo: rng() < .5 ? 'nenhum' : one(HEADGEAR).id };
};
