import { CLASSES } from '../data/classes';
import { itemById } from '../data/items';
import { CHARMS } from '../data/charms';
import { TALENT_CONFIG, TALENT_EFFECT_NAMES, TALENTS, talentById } from '../data/talents';
import type { Character, GameState, SkillId, Stats, TalentDef, TalentEffect } from '../core/types';

export const xpForLevel = (level: number) => 100 + (level - 1) * 85;
export const xpForSkillLevel = (level: number) => 20 + level * 8;
export function gainExperience(character: Character, amount: number) {
  character.xp += amount;
  while (character.xp >= xpForLevel(character.level)) {
    character.xp -= xpForLevel(character.level);
    character.level++;
    character.talentPoints++;
  }
}
export function gainSkill(character: Character, skill: SkillId, amount = 1) {
  const progress = character.skills[skill];
  progress.xp += amount;
  while(progress.xp >= xpForSkillLevel(progress.level)){
    progress.xp -= xpForSkillLevel(progress.level);
    progress.level++;
  }
}
export function talentBonus(character:Character,effect:TalentEffect){return TALENTS.filter(talent=>talent.classId===character.classId&&talent.effect===effect).reduce((total,talent)=>total+(character.talents[talent.id]??0)*talent.value,0);}
export function characterStats(c: Character, state?: GameState): Stats {
  const def = CLASSES[c.classId]; const level = c.level - 1; const out = { ...def.base };
  for (const key of Object.keys(out) as (keyof Stats)[]) out[key] += (def.growth[key] ?? 0) * level;
  for (const id of Object.values(c.equipment)) {
    const stats = id && itemById(id)?.stats; if (!stats) continue;
    for (const key of Object.keys(stats) as (keyof Stats)[]) out[key] += stats[key] ?? 0;
  }
  for(const key of ['maxHp','maxMana','attack','defense','attackSpeed','magicPower'] as const)out[key]*=1+talentBonus(c,key);
  out.crit+=talentBonus(c,'crit');out.resistance+=talentBonus(c,'resistance');
  if(state?.equippedCharms.includes('stone')) out.resistance += CHARMS.find(x=>x.id==='stone')!.value;
  for(const e of c.effects) { if(e.type==='buffAttack') out.attack*=1+e.value; if(e.type==='buffDefense') out.defense*=1+e.value; }
  out.maxHp=Math.round(out.maxHp); out.maxMana=Math.round(out.maxMana); out.resistance=Math.min(.75,out.resistance);out.crit=Math.min(.85,out.crit);
  return out;
}
export function talentAvailability(c:Character,talent:TalentDef){
  const rank=c.talents[talent.id]??0;
  if(talent.classId!==c.classId)return {available:false,reason:'Talento de outra classe.'};
  if(rank>=talent.max)return {available:false,reason:'Talento completamente evoluído.'};
  if(c.level<talent.requiredLevel)return {available:false,reason:`Requer nível ${talent.requiredLevel}.`};
  for(const requirement of talent.requires??[]){const current=c.talents[requirement.talentId]??0;if(current<requirement.rank){const required=talentById(requirement.talentId);return {available:false,reason:`Requer ${required?.name??requirement.talentId} ${current}/${requirement.rank}.`};}}
  if(c.talentPoints<1)return {available:false,reason:'Nenhum ponto de talento disponível.'};
  return {available:true,reason:'Disponível para investimento.'};
}
export function investTalent(c: Character, talentId: string) {
  const talent=talentById(talentId);if(!talent||!talentAvailability(c,talent).available)return false;c.talents[talent.id]=(c.talents[talent.id]??0)+1;c.talentPoints--;return true;
}
export const spentTalentPoints=(character:Character)=>Object.entries(character.talents).reduce((total,[id,rank])=>total+(talentById(id)?.classId===character.classId?rank:0),0);
export const talentRespecCost=(character:Character)=>spentTalentPoints(character)*TALENT_CONFIG.respecGoldPerPoint;
export const talentBonusText=(talent:TalentDef,rank=1)=>{const value=talent.value*rank;const percent=Math.round(value*1000)/10;return `${talent.effect==='cooldown'?'−':'+'}${percent}% ${TALENT_EFFECT_NAMES[talent.effect]}`;};
