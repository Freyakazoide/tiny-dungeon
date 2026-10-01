import { describe, expect, it } from 'vitest';
import { AFFINITY } from '../rpg/affinity';
import { CLASS_BY_ID } from '../rpg/classTree';
import { CLASS_ITEMS, TIER1_ITEMS, TIER2_ITEMS, CLASSIFICATIONS, ITEM_CONFIG, ITEM_MECHANICS_IMPLEMENTED, itemsForClass, type SlotGroup } from './classItems';
import { EFFECTS } from './talentTrees';

const groups: SlotGroup[] = ['w1', 'w2', 'off', 'head', 'body', 'legs', 'boots', 'amu', 'ring'];
const tier1 = Object.values(CLASS_BY_ID).filter(n => n.tier === 1).map(n => n.id);

describe('items-tier1.json — integridade dos dados (Fase 7)', () => {
  it('1.215 itens: 675 de Tier 1 (15 × 9 × 5) + 540 de Tier 2 (90 × 6), com ids e nomes únicos', () => {
    expect(CLASS_ITEMS).toHaveLength(1215);
    expect(new Set(CLASS_ITEMS.map(i => i.id)).size).toBe(1215); expect(new Set(CLASS_ITEMS.map(i => i.name)).size).toBe(1215);
    for (const cls of tier1) for (const group of groups) {
      const own = TIER1_ITEMS.filter(i => i.id.startsWith(`${cls}.`) && i.slotGroup === group).sort((a, b) => a.index - b.index);
      expect(own.map(i => i.index), `${cls}/${group}`).toEqual([0, 1, 2, 3, 4]);
      expect(own.map(i => i.quality), `${cls}/${group}`).toEqual(['standard', 'standard', 'superior', 'superior', 'bis']);
    }
  });

  it('todo item tem classes que existem no Tier 1 e o id começa pelo dono; compartilhados batem com a seção 3', () => {
    for (const item of TIER1_ITEMS) { expect(item.classes.length).toBeGreaterThan(0); for (const c of item.classes) expect(tier1, item.id).toContain(c); expect(item.classes).toContain(item.id.split('.')[0]); }
    const shared = Object.fromEntries(TIER1_ITEMS.filter(i => i.classes.length > 1).map(i => [i.id, i.classes.slice(1).sort()]));
    expect(shared).toEqual({
      'guerreiro.espada_longa': ['guardiao', 'mestre_runico'], 'guerreiro.machado_de_batalha': ['mestre_runico'], 'guerreiro.escudo_de_torre': ['guardiao'],
      'guardiao.escudo_bastiao': ['guerreiro'], 'mago.varinha_de_carvalho': ['bardo', 'ilusionista'], 'mago.cajado_arcano': ['druida', 'mestre_runico'],
      'clerigo.livro_de_oracoes': ['bardo'], 'bruxo.adaga_ritual': ['ladino'], 'mercenario.martelo_de_guerra': ['guerreiro'],
    });
    expect(itemsForClass('guerreiro').some(i => i.id === 'mercenario.martelo_de_guerra')).toBe(true);
  });

  it('nenhum bônus fixo cai em proficiência bloqueada de qualquer classe que use o item', () => {
    for (const item of TIER1_ITEMS) for (const prof of Object.keys(item.fixed)) for (const cls of item.classes) expect(AFFINITY[cls][prof as keyof (typeof AFFINITY)[string]], `${item.id}: ${prof} em ${cls}`).toBeGreaterThan(0);
  });

  it('escada de bônus fixo, Arm e passivas por opção (seção 1.4)', () => {
    for (const item of TIER1_ITEMS) {
      const total = Object.values(item.fixed).reduce((a, b) => a + b, 0);
      const ladder = { w1: [2, 2, 3, 5, 6], w2: [3, 3, 4, 6, 7] }[item.slotGroup as 'w1' | 'w2'] ?? [1, 1, 2, 2, 3];
      expect(total, item.id).toBe(ladder[item.index]);
      if (item.index < 2) { expect(item.effects, item.id).toBeUndefined(); expect(item.mechanic, item.id).toBeUndefined(); }
      for (const e of item.effects ?? []) expect(EFFECTS[e.code], `${item.id}: ${e.code}`).toBeDefined();
    }
  });

  it('Arm só em armadura/escudo, crescente ao longo das 5 opções; 2M só em w2; kinds de mão secundária válidos', () => {
    for (const item of TIER1_ITEMS) {
      const wearsArmor = ['helmet', 'armor', 'legs', 'boots'].includes(item.slot) || item.offhandKind === 'shield';
      expect(item.arm !== undefined, item.id).toBe(wearsArmor);
      expect(item.hands, item.id).toBe(item.slotGroup === 'w1' ? 1 : item.slotGroup === 'w2' ? 2 : undefined);
      if (item.slot === 'offhand') expect(['shield', 'focus', 'dual', 'quiver']).toContain(item.offhandKind);
      else expect(item.offhandKind).toBeUndefined();
    }
    for (const cls of tier1) for (const group of ['head', 'body', 'legs', 'boots'] as const) {
      const arms = TIER1_ITEMS.filter(i => i.id.startsWith(`${cls}.`) && i.slotGroup === group).sort((a, b) => a.index - b.index).map(i => i.arm!);
      expect(arms, `${cls}/${group}`).toEqual([...arms].sort((a, b) => a - b));
    }
    expect(new Set(TIER1_ITEMS.filter(i => i.slotGroup === 'off' && i.offhandKind === 'quiver').flatMap(i => i.classes))).toEqual(new Set(['cacador']));
  });

  it('itens com mecânica não têm passiva numérica e ficam "Em breve"; configuração de classificações', () => {
    for (const item of TIER1_ITEMS.filter(i => i.mechanic)) { expect(item.effects, item.id).toBeUndefined(); expect(item.passive).toBe(item.mechanic); }
    expect(ITEM_MECHANICS_IMPLEMENTED.size).toBe(0);
    expect(CLASSIFICATIONS.map(c => ITEM_CONFIG.rarityAttrs[c])).toEqual([0, 2, 3, 4, 5]);
    expect(ITEM_CONFIG).toMatchObject({ itemAttrScale: 0.33, attrLevelCap: 12, rollLevel: [1, 3] });
  });
});

import { AFFINITY as AFF2 } from '../rpg/affinity';

describe('items-tier2.json — 6 itens por especialização', () => {
  it('540 itens: cada especialização tem arma 1M, arma 2M, secundária, armadura, amuleto e anel; ids prefixados pelo dono', () => {
    expect(TIER2_ITEMS).toHaveLength(540);
    for (const node of Object.values(CLASS_BY_ID).filter(n => n.tier === 2)) {
      const own = TIER2_ITEMS.filter(i => i.classes[0] === node.id);
      expect(own.map(i => i.slotGroup).sort(), node.id).toEqual(['amu', 'body', 'off', 'ring', 'w1', 'w2']);
      for (const item of own) { expect(item.id.startsWith(`${node.id}.`)).toBe(true); expect(item.classes).toEqual([node.id]); expect(itemsForClass(node.id)).toContain(item); }
      expect(own.find(i => i.slotGroup === 'w2')!.hands).toBe(2);
    }
  });
  it('bônus de proficiência só nas habilidades que a especialização treina (afinidade > 0) e efeitos com códigos do catálogo', () => {
    for (const item of TIER2_ITEMS) {
      for (const prof of Object.keys(item.fixed)) expect(AFF2[item.classes[0]][prof as keyof (typeof AFF2)[string]], `${item.id}: ${prof}`).toBeGreaterThan(0);
      for (const e of item.effects ?? []) { expect(e.value).toBeGreaterThan(0); expect(item.passive).toContain('+'); }
    }
  });
});
