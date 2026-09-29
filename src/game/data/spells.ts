import type { SpellDef } from '../core/types';

export const SPELLS: SpellDef[] = [
  ['squire_guard','squire','Guard Up',1,8,8,'self',20,'shield',5,'Absorve dano'], ['squire_sweep','squire','Sweeping Strike',2,10,6,'allEnemies',1,'damage',0,'Golpe em área'], ['squire_rally','squire','Rally Cry',4,14,10,'self',.25,'buff',6,'Aumenta ataque'], ['squire_finisher','squire','Finishing Blow',7,18,7,'enemy',2.05,'damage',0,'Golpe pesado'],
  ['knight_guard','knight','Guard Stance',1,8,8,'self',22,'shield',5,'Absorve dano'], ['knight_cleave','knight','Cleave',2,10,5,'allEnemies',1.05,'damage',0,'Golpe em área'], ['knight_taunt','knight','Iron Will',4,14,10,'self',.3,'buff',6,'Aumenta defesa'], ['knight_strike','knight','Execution',7,18,7,'enemy',2.15,'damage',0,'Golpe pesado'],
  ['monk_flurry','monk','Flurry',1,8,4,'enemy',1.55,'damage',0,'Combo veloz'], ['monk_focus','monk','Focus',2,10,8,'self',.25,'buff',6,'Aumenta ataque'], ['monk_sweep','monk','Sweep',4,15,7,'allEnemies',1.1,'damage',0,'Varrida'], ['monk_palm','monk','Iron Palm',7,20,9,'enemy',2.5,'damage',0,'Golpe concentrado'],
  ['paladin_shot','paladin','Piercing Shot',1,9,4,'enemy',1.65,'damage',0,'Disparo perfurante'], ['paladin_volley','paladin','Volley',2,15,7,'allEnemies',1.15,'damage',0,'Chuva de flechas'], ['paladin_light','paladin','Holy Light',4,18,9,'ally',1.25,'heal',0,'Cura um aliado'], ['paladin_aim','paladin','True Aim',7,22,10,'self',.32,'buff',7,'Aumenta ataque'],
  ['necro_bolt','necromancer','Grave Bolt',1,12,3.5,'enemy',1.7,'damage',0,'Raio sepulcral'], ['necro_nova','necromancer','Soul Nova',2,20,7,'allEnemies',1.25,'damage',0,'Explosão de almas'], ['necro_barrier','necromancer','Bone Barrier',4,22,10,'self',38,'shield',6,'Escudo de ossos'], ['necro_meteor','necromancer','Death Meteor',7,34,12,'allEnemies',2.05,'damage',0,'Chuva mortífera'],
  ['druid_mend','druid','Mend',1,11,4,'ally',1.55,'heal',0,'Cura rápida'], ['druid_regrowth','druid','Regrowth',2,17,8,'allAllies',.38,'regen',7,'Regeneração'], ['druid_thorns','druid','Thorns',4,18,9,'allAllies',.22,'buff',6,'Proteção natural'], ['druid_wrath','druid','Wrath',7,25,7,'allEnemies',1.45,'damage',0,'Fúria da natureza']
].map(([id,classId,name,level,mana,cooldown,target,power,kind,duration,description]) => ({ id, classId, name, level, mana, cooldown, target, power, kind, duration, description } as SpellDef));
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
