import type { Family, PartDef, Template } from './parts';
import { SWORD_PARTS } from './swords';
import { BOW_PARTS } from './bows';
import { STAFF_PARTS } from './staffs';
import { WEAPON2_PARTS, WEAPON2_TEMPLATES } from './weapons2';
import { OFFHAND_PARTS, OFFHAND_TEMPLATES } from './offhands';
import { ARMOR_PARTS, ARMOR_TEMPLATES } from './armors';
import { MISC_PARTS, MISC_TEMPLATES } from './misc';

export const PARTS: PartDef[] = [...SWORD_PARTS, ...BOW_PARTS, ...STAFF_PARTS, ...WEAPON2_PARTS, ...OFFHAND_PARTS, ...ARMOR_PARTS, ...MISC_PARTS];
/** Famílias na ordem em que o Estúdio as lista (as que têm gabarito). */
export const FAMILIES: Family[] = ['espada', 'arco', 'cajado', 'machado', 'martelo', 'lanca', 'adaga', 'varinha', 'besta', 'foice', 'escudo', 'livro', 'orbe', 'totem', 'aljava', 'cabeca', 'torso', 'pernas', 'botas', 'amuleto', 'anel', 'arma_fogo', 'instrumento', 'luvas', 'pocao', 'espolio'];

export const partsFor = (familia: Family, slot: string): PartDef[] => PARTS.filter(p => p.familia === familia && p.slot === slot);
export const partOf = (familia: Family, slot: string, id: string): PartDef | undefined => PARTS.find(p => p.familia === familia && p.slot === slot && p.id === id);

/** Gabaritos: que slots a família tem e como se encaixam (anchors de uma parte no anchor de outra). */
export const TEMPLATES = {
  ...WEAPON2_TEMPLATES, ...OFFHAND_TEMPLATES, ...ARMOR_TEMPLATES, ...MISC_TEMPLATES,
  espada: {
    familia: 'espada', nome: 'Espada', raiz: 'guard', ordem: ['blade', 'grip', 'pommel', 'guard', 'efeito'],
    slots: [
      { slot: 'blade', nome: 'Lâmina', categoria: 'lamina' }, { slot: 'guard', nome: 'Guarda', categoria: 'guarnicao' },
      { slot: 'grip', nome: 'Cabo', categoria: 'cabo' }, { slot: 'pommel', nome: 'Pomo', categoria: 'guarnicao' },
      { slot: 'efeito', nome: 'Efeito mágico', categoria: 'efeito', opcional: true },
    ],
    joins: [
      { slot: 'blade', ancora: 'base', em: 'guard', emAncora: 'up' },
      { slot: 'grip', ancora: 'top', em: 'guard', emAncora: 'down' },
      { slot: 'pommel', ancora: 'top', em: 'grip', emAncora: 'bottom' },
    ],
  },
  arco: {
    familia: 'arco', nome: 'Arco', raiz: 'grip', ordem: ['corda', 'limb', 'limb2', 'grip', 'efeito'],
    slots: [
      { slot: 'limb', nome: 'Braço', categoria: 'lamina' }, { slot: 'limb2', nome: 'Braço de baixo', categoria: 'lamina', espelhaDe: 'limb' },
      { slot: 'grip', nome: 'Punho', categoria: 'cabo' }, { slot: 'corda', nome: 'Corda', categoria: 'corda' },
      { slot: 'efeito', nome: 'Efeito mágico', categoria: 'efeito', opcional: true },
    ],
    joins: [
      { slot: 'limb', ancora: 'grip', em: 'grip', emAncora: 'top' },
      { slot: 'limb2', ancora: 'grip', em: 'grip', emAncora: 'bottom' },
    ],
    linhas: [{ de: 'limb.tip', ate: 'limb2.tip', slot: 'corda' }],
  },
  cajado: {
    familia: 'cajado', nome: 'Cajado', raiz: 'shaft', ordem: ['shaft', 'butt', 'gem', 'cradle', 'efeito'],
    slots: [
      { slot: 'shaft', nome: 'Haste', categoria: 'cabo' }, { slot: 'butt', nome: 'Ponteira', categoria: 'guarnicao' },
      { slot: 'cradle', nome: 'Engaste', categoria: 'guarnicao' }, { slot: 'gem', nome: 'Gema', categoria: 'gema', opcional: true },
      { slot: 'efeito', nome: 'Efeito mágico', categoria: 'efeito', opcional: true },
    ],
    joins: [
      { slot: 'butt', ancora: 'top', em: 'shaft', emAncora: 'bottom' },
      { slot: 'cradle', ancora: 'base', em: 'shaft', emAncora: 'top' },
      { slot: 'gem', ancora: 'base', em: 'cradle', emAncora: 'socket' },
    ],
  },
} as Record<Family, Template>;

/** Nome de cada família para o Estúdio. */
export const FAMILY_NAMES: Record<Family, string> = {
  espada: 'Espada', arco: 'Arco', cajado: 'Cajado', machado: 'Machado', martelo: 'Martelo', lanca: 'Lança', adaga: 'Adaga', varinha: 'Varinha', besta: 'Besta', foice: 'Foice',
  arma_fogo: 'Arma de fogo', instrumento: 'Instrumento', luvas: 'Luvas', escudo: 'Escudo', livro: 'Livro', orbe: 'Orbe', totem: 'Totem', aljava: 'Aljava',
  cabeca: 'Elmo e chapéu', torso: 'Armadura', pernas: 'Calças', botas: 'Botas', amuleto: 'Amuleto', anel: 'Anel', pocao: 'Poção', espolio: 'Espólio',
};
