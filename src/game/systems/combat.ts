import type { Character, GameState, MonsterRuntime, SpellDef } from '../core/types';
import { MONSTERS } from '../data/monsters';
import { addCounter } from '../rpg/profile';
import { runtime } from '../rpg/runtime';
import { characterStats, trainProficiency } from './progression';

export const physicalDamage=(attack:number,defense:number,crit=false)=>Math.max(1,Math.round(attack*(crit?1.65:1)-defense*.55));
export const magicDamage=(power:number,multiplier:number,defense:number)=>Math.max(1,Math.round(power*multiplier-defense*.28));
export const healAmount=(magic:number,multiplier:number)=>Math.max(1,Math.round(magic*multiplier+12));
export function livingMonsters(s:GameState){return s.monsters.filter(m=>m.alive);}
export function livingTeam(s:GameState){return s.team.map(id=>s.characters.find(c=>c.id===id)!).filter(c=>c&&c.hp>0);}
export function conditionMet(c:Character,spell:SpellDef,s:GameState){ const cond=c.spellConditions[spell.id]??{};const stats=characterStats(c,s);if(cond.hpBelow!==undefined&&c.hp/stats.maxHp*100>=cond.hpBelow)return false;if(cond.minEnemies&&livingMonsters(s).length<cond.minEnemies)return false;if(cond.allyInjured&&!livingTeam(s).some(a=>a.hp<characterStats(a,s).maxHp*.82))return false;if(cond.manaAbove!==undefined&&c.mana/stats.maxMana*100<cond.manaAbove)return false;return true; }
export function receiveDamage(c:Character,raw:number,s:GameState){const stats=characterStats(c,s);let dmg=Math.max(1,Math.round(raw*(1-stats.resistance)));const shield=c.effects.find(e=>e.type==='shield');if(shield){const absorbed=Math.min(dmg,shield.value);shield.value-=absorbed;dmg-=absorbed;if(shield.value<=0)c.effects.splice(c.effects.indexOf(shield),1);}c.hp=Math.max(0,c.hp-dmg);s.analyzer.damageTaken+=dmg;addCounter(c.profile,'damageTaken',dmg);return dmg;}
export function monsterHit(m:MonsterRuntime,c:Character,s:GameState){const def=MONSTERS[m.defId];const dealt=receiveDamage(c,physicalDamage(def.attack,characterStats(c,s).defense),s);const prevented=Math.max(0,def.attack-dealt);if(prevented>0&&(c.cooldowns.defenseTrain??0)<=0){trainProficiency(c,'defense',runtime.trainScale);c.cooldowns.defenseTrain=2;}return dealt;}
