import { CLASSES, kitsOfPath } from '../data/classes';
import { passiveBonus } from '../rpg/passives';
import type { ClassId } from '../core/types';
import { TRIES_PER_SECOND } from '../rpg/curves';
import { runtime } from '../rpg/runtime';
import { spellById } from '../data/spells';
import { CLASS_BY_ID } from '../rpg/classTree';
import { gainExperience as gainProfileExperience, gainTries } from '../rpg/profile';
import { PROFICIENCIES, type ProficiencyId } from '../rpg/proficiencies';
import { itemById } from '../data/items';
import { CHARMS } from '../data/charms';
import { TALENT_CONFIG, TALENT_EFFECT_NAMES, TALENTS, talentById } from '../data/talents';
import type { Character, GameState, SpellDef, Stats, TalentDef, TalentEffect } from '../core/types';

export { xpForLevel } from '../rpg/curves';
export const classLabel = (character: Character) => CLASS_BY_ID[character.profile.classId]?.name ?? CLASSES[character.classId].name;
/** XP vai para o perfil RPG; cada nível ganho rende um ponto de talento. */
export function gainExperience(character: Character, amount: number) {
  const before = character.profile.level;
  gainProfileExperience(character.profile, amount);
  character.talentPoints += character.profile.level - before;
}
/** Soma tries de uma proficiência (sobe de nível sozinho) e devolve quantos níveis subiram. */
export function trainProficiency(character: Character, id: ProficiencyId, tries = 1) {
  const before = character.profile.proficiencies[id].level;
  gainTries(character.profile, id, tries);
  return character.profile.proficiencies[id].level - before;
}
/** A magia pode ser equipada por este personagem: do kit ou universal, do nível certo e, se for de subclasse, com o nó no caminho. */
export const spellAvailable = (character: Character, spell: SpellDef) =>
  (spell.classId === character.classId || !!spell.universal) && spell.level <= character.profile.level && (!spell.node || character.profile.classPath.includes(spell.node));
export const isElement = (id: ProficiencyId) => PROFICIENCIES[id].group === 'elemental';
/**
 * Elemento em foco: o alvo escolhido (`offlineTarget`) quando é um elemento; senão o elemento da primeira
 * magia elemental equipada. Só ele treina por cast; sem magia dele equipada, nada treina.
 */
export function elementFocus(character: Character): ProficiencyId | undefined {
  const target = character.profile.offlineTarget;
  if (target && isElement(target)) return target;
  for (const id of character.spellSlots) { const element = spellById(id)?.element; if (element) return element; }
  return undefined;
}
/** A proficiência está sendo treinada agora (foco de tempo, ou elemento em foco/Magia com magia dele equipada)? */
export const trainingNow = (character: Character, id: ProficiencyId) =>
  character.profile.trainingFocus === id || (focusSpellEquipped(character) && (id === elementFocus(character) || id === 'magic'));
/** O elemento em foco tem uma magia dele equipada? */
export const focusSpellEquipped = (character: Character) => {
  const focus = elementFocus(character);
  return !!focus && character.spellSlots.some(id => spellById(id)?.element === focus);
};
/** Treino por tempo: 1 try a cada 1 / TRIES_PER_SECOND s de combate, na proficiência em foco. */
export function trainByTime(character: Character, dt: number) {
  const profile = character.profile, focus = profile.trainingFocus;
  if (!focus) return;
  profile.trainingAcc = (profile.trainingAcc ?? 0) + dt * TRIES_PER_SECOND * runtime.trainScale;
  const whole = Math.floor(profile.trainingAcc);
  if (whole > 0) { profile.trainingAcc -= whole; trainProficiency(character, focus, whole); }
}
/** Talentos valem por histórico: os de qualquer kit do caminho (o que o Squire investiu continua valendo). */
const inPath = (character: Character, classId: string) => kitsOfPath(character.profile.classPath).includes(classId as ClassId);
export function talentBonus(character:Character,effect:TalentEffect){return TALENTS.filter(talent=>inPath(character,talent.classId)&&talent.effect===effect).reduce((total,talent)=>total+(character.talents[talent.id]??0)*talent.value,0)+passiveBonus(character.profile.classPath,effect);}
export function characterStats(c: Character, state?: GameState): Stats {
  const def = CLASSES[c.classId]; const level = c.profile.level - 1; const out = { ...def.base };
  for (const key of Object.keys(out) as (keyof Stats)[]) out[key] += (def.growth[key] ?? 0) * level;
  for (const id of Object.values(c.equipment)) {
    const stats = id && itemById(id)?.stats; if (!stats) continue;
    for (const key of Object.keys(stats) as (keyof Stats)[]) out[key] += stats[key] ?? 0;
  }
  for(const key of ['maxHp','maxMana','attack','defense','attackSpeed','magicPower'] as const)out[key]*=1+talentBonus(c,key);
  out.crit+=talentBonus(c,'crit');out.resistance+=talentBonus(c,'resistance');if(c.isTank)out.resistance+=passiveBonus(c.profile.classPath,'tankResistance');
  if(state?.equippedCharms.includes('stone')) out.resistance += CHARMS.find(x=>x.id==='stone')!.value;
  for(const e of c.effects) { if(e.type==='buffAttack') out.attack*=1+e.value; if(e.type==='buffDefense') out.defense*=1+e.value; }
  out.maxHp=Math.round(out.maxHp); out.maxMana=Math.round(out.maxMana); out.resistance=Math.min(.75,out.resistance);out.crit=Math.min(.85,out.crit);
  return out;
}
export function talentAvailability(c:Character,talent:TalentDef){
  const rank=c.talents[talent.id]??0;
  if(!inPath(c,talent.classId))return {available:false,reason:'Talento de outra classe.'};
  if(rank>=talent.max)return {available:false,reason:'Talento completamente evoluído.'};
  if(c.profile.level<talent.requiredLevel)return {available:false,reason:`Requer nível ${talent.requiredLevel}.`};
  for(const requirement of talent.requires??[]){const current=c.talents[requirement.talentId]??0;if(current<requirement.rank){const required=talentById(requirement.talentId);return {available:false,reason:`Requer ${required?.name??requirement.talentId} ${current}/${requirement.rank}.`};}}
  if(c.talentPoints<1)return {available:false,reason:'Nenhum ponto de talento disponível.'};
  return {available:true,reason:'Disponível para investimento.'};
}
export function investTalent(c: Character, talentId: string) {
  const talent=talentById(talentId);if(!talent||!talentAvailability(c,talent).available)return false;c.talents[talent.id]=(c.talents[talent.id]??0)+1;c.talentPoints--;return true;
}
export const spentTalentPoints=(character:Character)=>Object.entries(character.talents).reduce((total,[id,rank])=>total+(inPath(character,talentById(id)?.classId??'')?rank:0),0);
export const talentRespecCost=(character:Character)=>spentTalentPoints(character)*TALENT_CONFIG.respecGoldPerPoint;
export const talentBonusText=(talent:TalentDef,rank=1)=>{const value=talent.value*rank;const percent=Math.round(value*1000)/10;return `${talent.effect==='cooldown'?'−':'+'}${percent}% ${TALENT_EFFECT_NAMES[talent.effect]}`;};
