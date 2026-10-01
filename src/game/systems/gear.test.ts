import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../core/GameEngine';
import { partyState } from '../core/testing';
import type { Character, MonsterRuntime } from '../core/types';
import { AFFINITY } from '../rpg/affinity';
import { exportBackup, importBackup } from '../persistence/backup';
import { cloneValidatedState } from '../persistence/validation';
import { CLASS_ITEMS, CLASS_ITEM_BY_ID, ITEM_CONFIG, CLASSIFICATIONS } from '../data/classItems';
import { GEAR_BAG_CAPACITY } from '../data/balance';
import { EFFECTS } from '../data/talentTrees';
import { attrValue, attributeWeights, createInstance, gearBonus, gearBlockReason, gearValue, rollAttributes, rollGearDrop, smithPrice } from './gear';
import { characterStats } from './progression';
import { talentTotals } from './talentGrid';

afterEach(() => vi.restoreAllMocks());

/** RNG determinístico (mulberry32). */
const seeded = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const setup = (target = 'guerreiro') => {
  const e = new GameEngine(partyState()); const c = e.getSnapshot().characters[0]; c.profile.level = 30;
  e.evolve(c.id, target, { force: true });
  return { e, c };
};
const give = (e: GameEngine, id: string, classification: (typeof CLASSIFICATIONS)[number] = 'common') => e.grantGear(id, classification)!;

describe('Fase 7 — atributos aleatórios', () => {
  it('cada classificação sorteia 0/2/3/4/5 atributos distintos, nível 1 a 3, valor = nível × unidade × 0,33', () => {
    const base = CLASS_ITEM_BY_ID.get('guerreiro.espada_longa')!;
    for (const [i, cls] of CLASSIFICATIONS.entries()) {
      const attrs = rollAttributes(base, ITEM_CONFIG.rarityAttrs[cls], seeded(i + 1));
      expect(attrs).toHaveLength([0, 2, 3, 4, 5][i]); expect(new Set(attrs.map(a => a.code)).size).toBe(attrs.length);
      for (const a of attrs) { expect(a.level).toBeGreaterThanOrEqual(1); expect(a.level).toBeLessThanOrEqual(3); expect(attrValue(a.code, a.level)).toBeCloseTo(a.level * EFFECTS[a.code].unitPerRank * .33); }
    }
    expect(attrValue('melee', 3)).toBeCloseTo(3 * 1.5 * .33);
  });

  it('o sorteio nunca escolhe código de peso 0: elemento/tries bloqueados por qualquer classe do item, nem o da passiva do item', () => {
    const rng = seeded(7);
    for (const item of CLASS_ITEMS) {
      const weights = attributeWeights(item);
      for (const w of Object.values(weights)) expect([0, .25, 1, 3]).toContain(w);
      for (const a of rollAttributes(item, 5, rng)) {
        expect(weights[a.code], `${item.id}: ${a.code}`).toBeGreaterThan(0);
        expect((item.effects ?? []).map(e => e.code), item.id).not.toContain(a.code);
        const prof = /^[et]_(\w+)$/.exec(a.code)?.[1];
        if (prof && prof in AFFINITY.guerreiro) for (const cls of item.classes) expect(AFFINITY[cls][prof as 'fire'], `${item.id}: ${a.code} em ${cls}`).toBeGreaterThan(0);
      }
    }
  });

  it('pesos: 3 para o que combina com a classe, 0,25 para ofensa fora dela, 0 para elemento bloqueado', () => {
    const w = attributeWeights(CLASS_ITEM_BY_ID.get('guerreiro.espada_longa')!);
    expect(w.melee).toBe(3); expect(w.e_fire).toBe(0); expect(w.t_fire).toBe(0); expect(w.hp).toBeGreaterThan(0);
    expect(w.magic).toBe(.25);
    const mage = attributeWeights(CLASS_ITEM_BY_ID.get('mago.varinha_de_carvalho')!); // também Bardo e Ilusionista: Bardo bloqueia Fogo
    expect(mage.e_fire).toBe(0); expect(mage.e_psychic).toBeGreaterThan(0);
  });
});

describe('Fase 7 — bônus do equipamento', () => {
  it('soma níveis de proficiência, Arm, passiva e atributos aleatórios; a passiva entra em talentTotals com o teto', () => {
    const { e, c } = setup();
    const sword = give(e, 'guerreiro.espada_bastarda_de_aco_negro'), shield = give(e, 'guerreiro.muralha_viva');
    sword.attrs = [{ code: 'melee', level: 3 }]; e.equipGear(c.id, sword.uid); e.equipGear(c.id, shield.uid);
    const bonus = gearBonus(c);
    expect(bonus.levels).toEqual({ melee: 4, defense: 1 + 3 }); expect(bonus.arm).toBe(22);
    expect(bonus.effects).toMatchObject({ aoe: 6, exec: 4, lifesteal: 2.4, hp: 8 }); expect(bonus.effects.melee).toBeCloseTo(3 * 1.5 * .33);
    expect(talentTotals(c).lifesteal).toBeCloseTo(2.4); expect(talentTotals(c).hp).toBeCloseTo(8);
    c.gear.ring = { uid: 'x', baseId: 'guerreiro.anel_de_ferro', classification: 'uncommon', attrs: [{ code: 'lifesteal', level: 12 }, { code: 'hp', level: 1 }] };
    expect(talentTotals(c).lifesteal).toBeCloseTo(2.4 + 12 * .4 * .33); // atributo aleatório soma à passiva do item, no mesmo código
    expect(talentTotals(c).hp).toBeCloseTo(8 + 1 * 2 * .33);
  });

  it('Arm vira Defesa (×0,5) e HP % entra em characterStats; itens de classe não somam ataque nem HP base', () => {
    const { e, c } = setup();
    const before = characterStats(c, e.getSnapshot());
    const armor = give(e, 'guerreiro.couraca_do_invicto'); expect(e.equipGear(c.id, armor.uid)).toBe(true); // arm 26, +3 Def de proficiência, mecânica "Em breve"
    const after = characterStats(c, e.getSnapshot());
    const rawBase = before.defense / 1.10; // 1 + 10% da passiva Pele de Aço
    expect(after.defense).toBeCloseTo((rawBase + 26 * .5) * (1.10 + 3 * .012), 5); // Arm ×0,5 antes do multiplicador; +3 níveis de Defesa × 1,2%
    expect(after.attack).toBe(before.attack); expect(after.maxHp).toBe(before.maxHp);
    const helm = give(e, 'guerreiro.elmo_de_ferro'); e.equipGear(c.id, helm.uid);
    expect(characterStats(c, e.getSnapshot()).defense).toBeGreaterThan(after.defense);
  });

  it('nível de proficiência do item (Melee) aumenta o dano do ataque básico em 1,2% por nível; não conta para portas', () => {
    const { e, c } = setup();
    const target = (): MonsterRuntime => ({ uid: 'm', defId: 'skeleton', hp: 1e7, maxHp: 1e7, cooldown: 0, alive: true });
    const swing = () => { const t = target(); e.getSnapshot().monsters = [t]; c.cooldowns.basic = 0; vi.spyOn(Math, 'random').mockReturnValue(.99); (e as unknown as { basicAttack(c: Character): void }).basicAttack(c); return 1e7 - t.hp; };
    e.getSnapshot().characters.forEach(x => { if (x !== c) x.hp = 0; });
    const base = swing(); const level = c.profile.proficiencies.melee.level;
    const blade = give(e, 'guerreiro.lamina_do_campeao_imortal'); e.equipGear(c.id, blade.uid); // +5 Melee, +1 Físico, +9% chefe, +4% vel.
    expect(swing()).toBeGreaterThan(base); expect(c.profile.proficiencies.melee.level).toBe(level);
  });
});

describe('Fase 7 — equipar (seção 1.1/1.2)', () => {
  it('Squire não equipa itens de classe; classe do caminho equipa; classe fora do caminho não', () => {
    const e = new GameEngine(partyState()); const squire = e.getSnapshot().characters[0];
    const sword = give(e, 'guerreiro.espada_longa');
    expect(gearBlockReason(squire, sword)).toMatch(/Restrito/); expect(e.equipGear(squire.id, sword.uid)).toBe(false);
    const { e: e2, c } = setup('guerreiro');
    const long = give(e2, 'guerreiro.espada_longa');
    expect(e2.equipGear(c.id, long.uid)).toBe(true); expect(c.gear.weapon?.baseId).toBe('guerreiro.espada_longa');
    const wand = give(e2, 'mago.varinha_de_carvalho'); expect(e2.equipGear(c.id, wand.uid)).toBe(false);
  });

  it('itens compartilhados servem às outras classes e a qualquer subclasse do Tier 1', () => {
    const { e, c } = setup('mago'); e.evolve(c.id, 'evocador', { force: true });
    const wand = give(e, 'mago.varinha_de_carvalho'); expect(e.equipGear(c.id, wand.uid)).toBe(true); // Evocador herda os itens do Mago
    const guard = setup('guerreiro'); const shield = give(guard.e, 'guardiao.escudo_bastiao'); expect(guard.e.equipGear(guard.c.id, shield.uid)).toBe(true);
  });

  it('arma de 2 mãos devolve a mão secundária à mochila e bloqueia outra; só a Aljava convive com a arma 2M do Caçador', () => {
    const { e, c } = setup('guerreiro');
    const shield = give(e, 'guerreiro.escudo_de_torre'), axe = give(e, 'guerreiro.machado_de_batalha');
    expect(e.equipGear(c.id, shield.uid)).toBe(true); expect(e.equipGear(c.id, axe.uid)).toBe(true);
    expect(c.gear.offhand).toBeUndefined(); expect(e.getSnapshot().gearBag.map(g => g.uid)).toContain(shield.uid);
    expect(e.equipGear(c.id, shield.uid)).toBe(false); expect(e.getSnapshot().message).toMatch(/2 mãos/);
    // item antigo (escudo de madeira) na mão secundária também é devolvido à mochila comum
    const { e: e2, c: c2 } = setup('guerreiro'); c2.equipment.offhand = 'wooden_shield';
    const axe2 = give(e2, 'guerreiro.machado_de_batalha'); expect(e2.equipGear(c2.id, axe2.uid)).toBe(true);
    expect(c2.equipment.offhand).toBeUndefined(); expect(e2.getSnapshot().inventory.bp.some(s => s.itemId === 'wooden_shield')).toBe(true);
    // Caçador: arma 2M + Aljava ok; arma 2M do Caçador não aceita foco
    const h = setup('cacador'); const twoH = CLASS_ITEMS.find(i => i.classes[0] === 'cacador' && i.slotGroup === 'w2' && i.index === 0)!, quiver = CLASS_ITEMS.find(i => i.offhandKind === 'quiver' && i.index === 0)!;
    const bow = give(h.e, twoH.id), q = give(h.e, quiver.id);
    expect(h.e.equipGear(h.c.id, q.uid)).toBe(true); expect(h.e.equipGear(h.c.id, bow.uid)).toBe(true); expect(h.c.gear.offhand?.baseId).toBe(quiver.id);
  });

  it('arma gêmea (dual) só com arma de 1 mão; trocar devolve o item anterior à mochila', () => {
    const { e, c } = setup('ladino');
    const twoH = CLASS_ITEMS.find(i => i.classes[0] === 'ladino' && i.slotGroup === 'w2' && i.index === 0)!, dagger = CLASS_ITEMS.find(i => i.classes[0] === 'ladino' && i.slotGroup === 'w1' && i.index === 0)!, dual = CLASS_ITEMS.find(i => i.offhandKind === 'dual' && i.classes[0] === 'ladino')!;
    const a = give(e, twoH.id), d = give(e, dual.id), w1 = give(e, dagger.id);
    expect(e.equipGear(c.id, a.uid)).toBe(true); expect(e.equipGear(c.id, d.uid)).toBe(false);
    expect(e.equipGear(c.id, w1.uid)).toBe(true); expect(e.getSnapshot().gearBag.map(g => g.uid)).toContain(a.uid);
    expect(e.equipGear(c.id, d.uid)).toBe(true);
    expect(e.unequipGear(c.id, 'offhand')).toBe(true); expect(c.gear.offhand).toBeUndefined();
  });

  it('equipar um item antigo num slot com equipamento de classe devolve o de classe à mochila; item antigo na secundária é barrado por arma 2M', () => {
    const { e, c } = setup('guerreiro');
    const helm = give(e, 'guerreiro.elmo_de_ferro'); e.equipGear(c.id, helm.uid);
    e.getSnapshot().inventory.bp.push({ itemId: 'leather_helmet', quantity: 1 });
    expect(e.equip(c.id, 'leather_helmet')).toBe(true); expect(c.gear.helmet).toBeUndefined(); expect(e.getSnapshot().gearBag.map(g => g.uid)).toContain(helm.uid);
    const axe = give(e, 'guerreiro.machado_de_batalha'); e.equipGear(c.id, axe.uid);
    e.getSnapshot().inventory.bp.push({ itemId: 'wooden_shield', quantity: 1 });
    expect(e.equip(c.id, 'wooden_shield')).toBe(false);
  });
});

describe('Fase 7 — mochila, venda, Ferreiro e drops', () => {
  it('vender dá o valor; vender Comuns em lote; comprar só Padrão no Ferreiro, sempre Comum', () => {
    const { e } = setup(); const s = () => e.getSnapshot(); // o emit troca a raiz do estado: sempre pegue o snapshot atual
    const common = give(e, 'guerreiro.espada_longa'), rare = give(e, 'guerreiro.sabre_do_comandante', 'rare');
    expect(gearValue(rare)).toBeGreaterThan(gearValue(common)); expect(rare.attrs).toHaveLength(3);
    s().gold = 0; expect(e.sellGear(common.uid)).toBe(gearValue(common)); expect(s().gold).toBe(gearValue(common));
    const c2 = give(e, 'guerreiro.gladio_de_legionario'), c3 = give(e, 'guerreiro.machado_de_batalha');
    e.sellGearUpTo('common'); expect(e.getSnapshot().gearBag.map(g => g.uid)).toEqual([rare.uid]); expect(c2.uid).not.toBe(c3.uid);
    e.getSnapshot().gold = 10000;
    expect(smithPrice('guerreiro.sabre_do_comandante')).toBe(Infinity); expect(e.buyGear('guerreiro.sabre_do_comandante')).toBe(false);
    const price = smithPrice('guerreiro.espada_longa'); expect(price).toBe(gearValue({ uid: '', baseId: 'guerreiro.espada_longa', classification: 'common', attrs: [] }) * 6);
    expect(e.buyGear('guerreiro.espada_longa')).toBe(true); expect(e.getSnapshot().gold).toBe(10000 - price);
    expect(e.getSnapshot().gearBag.slice(-1)[0]).toMatchObject({ baseId: 'guerreiro.espada_longa', classification: 'common', attrs: [] });
    e.getSnapshot().gold = 0; expect(e.buyGear('guerreiro.espada_longa')).toBe(false);
  });

  it('mochila cheia: o item novo é vendido na hora, sem perder ouro nem estourar a capacidade', () => {
    const { e } = setup();
    for (let i = 0; i < GEAR_BAG_CAPACITY; i++) expect(give(e, 'guerreiro.espada_longa')).toBeDefined();
    e.getSnapshot().gold = 0; expect(e.grantGear('guerreiro.gladio_de_legionario')).toBeUndefined();
    expect(e.getSnapshot().gearBag).toHaveLength(GEAR_BAG_CAPACITY); expect(e.getSnapshot().gold).toBeGreaterThan(0);
    expect(e.buyGear('guerreiro.espada_longa')).toBe(false);
  });

  it('rollGearDrop: pool de classes, qualidade sobe com a hunt, chefe tem mais atributos e mais BiS', () => {
    const rng = seeded(42);
    const sample = (hunt: number, boss: boolean) => Array.from({ length: 4000 }, () => rollGearDrop(hunt, boss, ['guerreiro', 'mago'], rng)!);
    for (const drop of sample(0, false).slice(0, 200)) expect(classItemsOf(drop.baseId).some(c => ['guerreiro', 'mago'].includes(c))).toBe(true);
    const share = (drops: ReturnType<typeof sample>, f: (d: (typeof drops)[number]) => boolean) => drops.filter(f).length / drops.length;
    const bis = (d: { baseId: string }) => CLASS_ITEM_BY_ID.get(d.baseId)!.quality === 'bis';
    expect(share(sample(0, false), bis)).toBeLessThan(.03); expect(share(sample(6, false), bis)).toBeGreaterThan(.33);
    expect(share(sample(3, true), bis)).toBeGreaterThan(share(sample(3, false), bis));
    const attrs = (drops: ReturnType<typeof sample>) => drops.reduce((n, d) => n + d.attrs.length, 0) / drops.length;
    expect(attrs(sample(3, true))).toBeGreaterThan(attrs(sample(3, false)) + .5);
    expect(rollGearDrop(0, false, [], rng)).toBeUndefined();
  });

  it('um monstro pode largar equipamento de classe (mockando o sorteio) e o drop respeita as classes do grupo', () => {
    const { e, c } = setup('guerreiro'); e.getSnapshot().team = [c.id];
    vi.spyOn(Math, 'random').mockReturnValue(0); // chance 1,2% -> cai; classe = primeira do pool
    (e as unknown as { dropGear(def: { boss?: boolean }): void }).dropGear({ boss: false });
    expect(e.getSnapshot().gearBag).toHaveLength(1);
    const pool = (e as unknown as { gearDropClasses(): string[] }).gearDropClasses();
    expect(pool).toEqual(expect.arrayContaining(['guerreiro', 'cacador', 'mago']));
  });
});

describe('Fase 7 — save', () => {
  it('exporta/importa mochila e equipamento; saves antigos migram sem itens de classe', () => {
    const { e, c } = setup(); const sword = give(e, 'guerreiro.sabre_do_comandante', 'legendary'); e.equipGear(c.id, sword.uid); give(e, 'guerreiro.escudo_de_torre', 'rare');
    const restored = importBackup(exportBackup(e.getSnapshot()));
    expect(restored.characters[0].gear.weapon).toEqual(sword); expect(restored.gearBag).toHaveLength(1);
    const legacy = structuredClone(e.getSnapshot()) as unknown as Record<string, unknown> & { characters: Record<string, unknown>[] };
    delete legacy.gearBag; for (const ch of legacy.characters) delete ch.gear;
    const migrated = cloneValidatedState(legacy); expect(migrated.gearBag).toEqual([]); expect(migrated.characters.every(ch => Object.keys(ch.gear).length === 0)).toBe(true);
  });

  it('rejeita instâncias incoerentes: atributos a mais/de menos, código ou nível inválido, slot errado, classe fora do caminho, 2M com escudo, item antigo no mesmo slot', () => {
    const { e } = setup(); const s = e.getSnapshot();
    const bad = (mutate: (state: typeof s) => void) => { const copy = structuredClone(s); mutate(copy); expect(() => cloneValidatedState(copy)).toThrow(/corrompido/); };
    const rare = give(e, 'guerreiro.sabre_do_comandante', 'rare');
    bad(x => { x.gearBag = [{ ...rare, attrs: rare.attrs.slice(0, 2) }]; });
    bad(x => { x.gearBag = [{ ...rare, attrs: rare.attrs.map(a => ({ ...a, level: 13 })) }]; });
    bad(x => { x.gearBag = [{ ...rare, attrs: rare.attrs.map(a => ({ ...a, code: 'nope' })) }]; });
    bad(x => { x.gearBag = [{ ...rare, attrs: [rare.attrs[0], rare.attrs[0], rare.attrs[1]] }]; });
    bad(x => { x.gearBag = [{ ...rare, baseId: 'nao.existe' }]; });
    bad(x => { x.gearBag = [rare, rare]; }); // uid repetido
    bad(x => { x.characters[0].gear = { ring: { ...rare } }; }); // slot errado
    const wand = createInstance('mago.varinha_de_carvalho')!; bad(x => { x.characters[0].gear = { weapon: wand }; }); // classe fora do caminho
    const axe = createInstance('guerreiro.machado_de_batalha')!, shield = createInstance('guerreiro.escudo_de_torre')!;
    bad(x => { x.characters[0].gear = { weapon: axe, offhand: shield }; });
    bad(x => { x.characters[0].gear = { weapon: createInstance('guerreiro.espada_longa')! }; x.characters[0].equipment.weapon = 'rusty_sword'; });
  });
});

const classItemsOf = (id: string) => CLASS_ITEM_BY_ID.get(id)!.classes;
