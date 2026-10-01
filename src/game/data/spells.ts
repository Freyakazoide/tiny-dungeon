import type { SpellDef } from '../core/types';

export const SPELLS: SpellDef[] = [
  ['hunter_shot','hunter','Tiro Perfurante',1,9,4,'enemy',1.65,'damage',0,'Disparo perfurante'], ['hunter_volley','hunter','Chuva de Flechas',1,15,7,'allEnemies',1.15,'damage',0,'Chuva de flechas'], ['hunter_aim','hunter','Mira Verdadeira',1,22,10,'self',.32,'buff',7,'Aumenta ataque'], ['hunter_finisher','hunter','Tiro Fatal',1,24,9,'enemy',2.4,'damage',0,'Disparo devastador'],
  ['mage_arc','mage','Raio Arcano',1,10,3.5,'enemy',1.75,'damage',0,'Raio de energia arcana'], ['mage_nova','mage','Nova Arcana',1,20,7,'allEnemies',1.3,'damage',0,'Explosão arcana em área'], ['mage_barrier','mage','Barreira Arcana',1,22,10,'self',36,'shield',6,'Escudo arcano'], ['mage_meteor','mage','Meteoro Arcano',1,34,12,'allEnemies',2.0,'damage',0,'Chuva de meteoros'],
  ['squire_guard','squire','Guarda Alta',1,8,8,'self',20,'shield',5,'Absorve dano'], ['squire_sweep','squire','Golpe Giratório',2,10,6,'allEnemies',1,'damage',0,'Golpe em área'], ['squire_rally','squire','Grito de Guerra',4,14,10,'self',.25,'buff',6,'Aumenta ataque'], ['squire_finisher','squire','Golpe Final',7,18,7,'enemy',2.05,'damage',0,'Golpe pesado'],
  ['knight_guard','knight','Postura de Guarda',1,8,8,'self',22,'shield',5,'Absorve dano'], ['knight_cleave','knight','Talho',2,10,5,'allEnemies',1.05,'damage',0,'Golpe em área'], ['knight_taunt','knight','Vontade de Ferro',4,14,10,'self',.3,'buff',6,'Aumenta defesa'], ['knight_strike','knight','Execução',7,18,7,'enemy',2.15,'damage',0,'Golpe pesado'],
  ['monk_flurry','monk','Saraivada de Golpes',1,8,4,'enemy',1.55,'damage',0,'Combo veloz'], ['monk_focus','monk','Foco Interior',2,10,8,'self',.25,'buff',6,'Aumenta ataque'], ['monk_sweep','monk','Rasteira',4,15,7,'allEnemies',1.1,'damage',0,'Varrida'], ['monk_palm','monk','Palma de Ferro',7,20,9,'enemy',2.5,'damage',0,'Golpe concentrado'],
  ['paladin_mend','paladin','Toque Curativo',1,10,4,'ally',1.35,'heal',0,'Cura rápida de um aliado'], ['paladin_smite','paladin','Punição Sagrada',2,12,5,'enemy',1.6,'damage',0,'Dano sagrado contra um inimigo'], ['paladin_light','paladin','Luz Sagrada',4,18,9,'ally',1.25,'heal',0,'Cura um aliado'], ['paladin_blessing','paladin','Bênção',7,24,10,'allAllies',.22,'buff',7,'Protege todos os aliados'],
  ['necro_bolt','necromancer','Raio Sepulcral',1,12,3.5,'enemy',1.7,'damage',0,'Raio sepulcral'], ['necro_nova','necromancer','Nova de Almas',2,20,7,'allEnemies',1.25,'damage',0,'Explosão de almas'], ['necro_barrier','necromancer','Barreira de Ossos',4,22,10,'self',38,'shield',6,'Escudo de ossos'], ['necro_meteor','necromancer','Meteoro da Morte',7,34,12,'allEnemies',2.05,'damage',0,'Chuva mortífera'],
  ['druid_mend','druid','Remendo',1,11,4,'ally',1.55,'heal',0,'Cura rápida'], ['druid_regrowth','druid','Regeneração',2,17,8,'allAllies',.38,'regen',7,'Regeneração'], ['druid_thorns','druid','Espinhos',4,18,9,'allAllies',.22,'buff',6,'Proteção natural'], ['druid_wrath','druid','Fúria da Natureza',7,25,7,'allEnemies',1.45,'damage',0,'Fúria da natureza'],
  ['guardian_slam','guardian','Pancada de Escudo',1,8,4,'enemy',1.45,'damage',0,'Golpe com o escudo'], ['guardian_bulwark','guardian','Baluarte',2,12,8,'self',48,'shield',6,'Grande barreira pessoal'], ['guardian_resolve','guardian','Resolução',4,14,10,'self',.3,'buff',7,'Aumenta a defesa'], ['guardian_aegis','guardian','Égide',7,26,12,'allAllies',30,'shield',6,'Escuda toda a equipe'],
  ['rogue_flurry','rogue','Lâminas Gêmeas',1,8,3.5,'enemy',1.5,'damage',0,'Dois golpes rápidos'], ['rogue_backstab','rogue','Facada pelas Costas',2,12,6,'enemy',2.3,'damage',0,'Golpe crítico em um alvo'], ['rogue_fan','rogue','Leque de Adagas',4,16,7,'allEnemies',1.1,'damage',0,'Arremessa adagas em todos'], ['rogue_shadow','rogue','Passo Sombrio',7,18,10,'self',.3,'buff',6,'Aumenta o ataque'],
  ['bard_anthem','bard','Hino de Batalha',1,14,9,'allAllies',.28,'buff',8,'Aumenta o ataque da equipe'], ['bard_ward','bard','Canção de Proteção',2,14,9,'allAllies',.22,'buff',8,'Aumenta a defesa da equipe'], ['bard_chord','bard','Acorde Dissonante',4,12,5,'enemy',1.45,'damage',0,'Dano sonoro'], ['bard_rhythm','bard','Ritmo Revigorante',7,22,10,'allAllies',.3,'regen',7,'Regenera toda a equipe'],
  ['alchemist_flask','alchemist','Frasco Ácido',1,9,4,'enemy',1.6,'damage',0,'Arremessa ácido'], ['alchemist_elixir','alchemist','Elixir Restaurador',2,14,7,'ally',1.15,'heal',0,'Cura um aliado'], ['alchemist_cloud','alchemist','Nuvem Tóxica',4,18,8,'allEnemies',1.15,'damage',0,'Veneno em área'], ['alchemist_bomb','alchemist','Bomba Incendiária',7,26,11,'allEnemies',1.7,'damage',0,'Explosão em área'],
  ['mercenary_smash','mercenary','Golpe Brutal',1,8,6,'enemy',2.3,'damage',0,'Golpe pesado'], ['mercenary_cleave','mercenary','Machadada Larga',2,12,6,'allEnemies',1.1,'damage',0,'Golpe em área'], ['mercenary_warcry','mercenary','Grito do Contrato',4,14,10,'self',.3,'buff',7,'Aumenta o ataque'], ['mercenary_execute','mercenary','Execução Cruel',7,20,11,'enemy',2.9,'damage',0,'Golpe devastador'],
  ['runemaster_strike','runemaster','Golpe Rúnico',1,9,4,'enemy',1.7,'damage',0,'Corte imbuído de energia'], ['runemaster_ward','runemaster','Runa de Proteção',2,14,9,'self',34,'shield',6,'Escudo rúnico'], ['runemaster_blast','runemaster','Explosão Rúnica',4,20,8,'allEnemies',1.25,'damage',0,'Detonação de runas'], ['runemaster_empower','runemaster','Runa de Poder',7,18,10,'self',.3,'buff',7,'Aumenta o ataque'],
  ['illusionist_daze','illusionist','Atordoar a Mente',1,12,6,'enemy',1.2,'damage',0,'Dano mental com atordoamento'], ['illusionist_mirror','illusionist','Imagem Espelhada',2,14,9,'self',32,'shield',6,'Um reflexo absorve dano'], ['illusionist_terror','illusionist','Terror Coletivo',4,22,10,'allEnemies',.9,'damage',0,'Atordoa todos os inimigos'], ['illusionist_haze','illusionist','Névoa Hipnótica',7,18,8,'enemy',1.6,'damage',0,'Dano mental forte'],
  ['gunner_heavy','gunner','Disparo Pesado',1,9,5,'enemy',2.0,'damage',0,'Tiro de alto calibre'], ['gunner_barrage','gunner','Rajada',2,15,7,'allEnemies',1.15,'damage',0,'Fogo em área'], ['gunner_overcharge','gunner','Sobrecarga',4,16,10,'self',.3,'buff',7,'Aumenta o ataque'], ['gunner_grenade','gunner','Granada',7,26,11,'allEnemies',1.75,'damage',0,'Explosão em área'],
].map(([id,classId,name,level,mana,cooldown,target,power,kind,duration,description]) => ({ id, classId, name, level, mana, cooldown, target, power, kind, duration, description } as SpellDef));
/** Magias das subclasses do Mago (Tier 2): entram no kit mage, mas só ficam disponíveis com o nó no caminho. */
const NODE_SPELLS: SpellDef[] = [
  { id: 'pyro_fireball', classId: 'mage', node: 'piromante', name: 'Bola de Fogo', level: 1, mana: 16, cooldown: 5, target: 'enemy', power: 1.9, kind: 'damage', element: 'fire', description: 'Bola de fogo de alto dano' },
  { id: 'pyro_inferno', classId: 'mage', node: 'piromante', name: 'Inferno', level: 1, mana: 30, cooldown: 10, target: 'allEnemies', power: 1.2, kind: 'damage', element: 'fire', burnStacks: 2, description: 'Queima todos os inimigos (+2 stacks de Combustão)' },
  { id: 'cryo_shard', classId: 'mage', node: 'criomante', name: 'Estilhaço de Gelo', level: 1, mana: 14, cooldown: 4, target: 'enemy', power: 1.7, kind: 'damage', element: 'ice', description: 'Estilhaço gélido; parte do dano vira barreira' },
  { id: 'cryo_nova', classId: 'mage', node: 'criomante', name: 'Nova Glacial', level: 1, mana: 28, cooldown: 10, target: 'allEnemies', power: 1.0, kind: 'damage', element: 'ice', freeze: 2, description: 'Congela todos os inimigos por 2 s' },
  { id: 'plasma_beam', classId: 'mage', node: 'arcanista_de_plasma', name: 'Raio de Plasma', level: 1, mana: 22, cooldown: 6, target: 'enemy', power: 2.2, kind: 'damage', element: 'energy', description: 'Feixe de plasma (crítico ×2,5, recarga −20%)' },
];
SPELLS.push(...NODE_SPELLS);
/** Elemento e controle das magias de kit (o resto segue a arma/foco). */
const KIT_TWEAKS: Record<string, Partial<SpellDef>> = {
  paladin_smite: { element: 'holy' }, necro_bolt: { element: 'death' }, necro_nova: { element: 'death' }, necro_meteor: { element: 'death' }, druid_wrath: { element: 'earth' },
  rogue_fan: { element: 'physical' }, alchemist_flask: { element: 'poison' }, alchemist_cloud: { element: 'poison' }, alchemist_bomb: { element: 'fire' },
  runemaster_strike: { element: 'energy' }, runemaster_blast: { element: 'fire' }, bard_chord: { element: 'psychic' },
  illusionist_daze: { element: 'psychic', stun: 2 }, illusionist_terror: { element: 'psychic', stun: 1.5 }, illusionist_haze: { element: 'psychic' },
  gunner_grenade: { element: 'energy' }, guardian_slam: { element: 'physical' }, mercenary_cleave: { element: 'physical' }, monk_palm: { element: 'physical' },
};
for (const sp of SPELLS) Object.assign(sp, KIT_TWEAKS[sp.id]);
/** Uma magia de dano por elemento, disponível a qualquer personagem: é o que treina o elemento em foco. */
const BASIC_SPELLS: SpellDef[] = [
  ['fire', 'Faísca Ígnea'],
  ['ice', 'Estilhaço Gélido'],
  ['energy', 'Descarga Elétrica'],
  ['earth', 'Pedrada'],
  ['poison', 'Dardo Venenoso'],
  ['holy', 'Raio Sagrado'],
  ['death', 'Toque Sombrio'],
  ['physical', 'Impacto Cinético'],
  ['psychic', 'Pulso Mental']
].map(([element, name]) => ({ id: `basic_${element}`, classId: 'squire', name, level: 1, mana: 9, cooldown: 4, target: 'enemy', power: 1.5, kind: 'damage', description: `Dano de ${name.toLowerCase()} · treina o elemento em foco`, element, universal: true } as SpellDef));
SPELLS.push(...BASIC_SPELLS);
export const spellById = (id: string) => SPELLS.find(s => s.id === id);
