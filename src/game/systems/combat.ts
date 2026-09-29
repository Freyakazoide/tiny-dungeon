import type { Character, GameState, MonsterRuntime, SpellDef } from '../core/types';
import { MONSTERS } from '../data/monsters';
import { AFFINITY, AGGRO } from '../data/balance';
import type { ProficiencyId } from '../rpg/proficiencies';
import { CLASSES } from '../data/classes';
import { itemById } from '../data/items';
import { addCounter } from '../rpg/profile';
import { runtime } from '../rpg/runtime';
import { characterStats, trainProficiency } from './progression';

export const physicalDamage=(attack:number,defense:number,crit=false)=>Math.max(1,Math.round(attack*(crit?1.65:1)-defense*.55));
export const magicDamage=(power:number,multiplier:number,defense:number)=>Math.max(1,Math.round(power*multiplier-defense*.28));
export const healAmount=(magic:number,multiplier:number)=>Math.max(1,Math.round(magic*multiplier+12));
export function livingMonsters(s:GameState){return s.monsters.filter(m=>m.alive);}
export function livingTeam(s:GameState){return s.team.map(id=>s.characters.find(c=>c.id===id)!).filter(c=>c&&c.hp>0);}
export function conditionMet(c:Character,spell:SpellDef,s:GameState){ const cond=c.spellConditions[spell.id]??{};const stats=characterStats(c,s);if(cond.hpBelow!==undefined&&c.hp/stats.maxHp*100>=cond.hpBelow)return false;if(cond.minEnemies&&livingMonsters(s).length<cond.minEnemies)return false;if(cond.allyInjured&&!livingTeam(s).some(a=>a.hp<characterStats(a,s).maxHp*.82))return false;if(cond.manaAbove!==undefined&&c.mana/stats.maxMana*100<cond.manaAbove)return false;return true; }
/** Multiplicador de dano de uma magia elemental contra um monstro (1 se neutro ou sem elemento). */
export const elementAffinity = (defId: string, element?: ProficiencyId) => {
  if (!element) return 1;
  const def = MONSTERS[defId];
  return def.weak?.includes(element) ? AFFINITY.weak : def.resist?.includes(element) ? AFFINITY.resist : 1;
};
/** Sorteia o alvo de um golpe: tanque na frente, demais da frente e trás, com pesos renormalizados sem os grupos vazios. */
export function pickMonsterTarget(team: Character[], rnd = Math.random): Character | undefined {
  const alive = team.filter(c => c.hp > 0);
  const tank = alive.filter(c => c.isTank && c.row === 'front');
  const front = alive.filter(c => c.row === 'front' && !tank.includes(c));
  const back = alive.filter(c => c.row === 'back');
  const groups = ([[tank, AGGRO.tank], [front, AGGRO.front], [back, AGGRO.back]] as const).filter(([g]) => g.length);
  if (!groups.length) return undefined;
  const total = groups.reduce((s, [, w]) => s + w, 0);
  let roll = rnd() * total;
  for (const [g, w] of groups) { if ((roll -= w) <= 0) return g[Math.min(g.length - 1, Math.floor(rnd() * g.length))]; }
  const last = groups[groups.length - 1][0];
  return last[last.length - 1];
}
/** Parte estimada (0-1) dos golpes que cada personagem vivo recebe, com os mesmos grupos e pesos do sorteio. */
export function aggroShares(team: Character[]): Map<string, number> {
  const alive = team.filter(c => c.hp > 0);
  const tank = alive.filter(c => c.isTank && c.row === 'front');
  const front = alive.filter(c => c.row === 'front' && !tank.includes(c));
  const back = alive.filter(c => c.row === 'back');
  const groups = ([[tank, AGGRO.tank], [front, AGGRO.front], [back, AGGRO.back]] as const).filter(([g]) => g.length);
  const total = groups.reduce((s, [, w]) => s + w, 0);
  return new Map(groups.flatMap(([g, w]) => g.map(c => [c.id, w / total / g.length] as const)));
}
/** Arma corpo a corpo na linha de trás (fora de alcance): a UI avisa e o ataque básico sofre a penalidade. */
export const meleeInBackRow = (c: Character) => c.row === 'back' && (itemById(c.equipment.weapon ?? '')?.trains ?? CLASSES[c.classId].weaponSkill) === 'melee';
export function receiveDamage(c:Character,raw:number,s:GameState){const stats=characterStats(c,s);let dmg=Math.max(1,Math.round(raw*(1-stats.resistance)));const shield=c.effects.find(e=>e.type==='shield');if(shield){const absorbed=Math.min(dmg,shield.value);shield.value-=absorbed;dmg-=absorbed;if(shield.value<=0)c.effects.splice(c.effects.indexOf(shield),1);}c.hp=Math.max(0,c.hp-dmg);s.analyzer.damageTaken+=dmg;addCounter(c.profile,'damageTaken',dmg);return dmg;}
export function monsterHit(m:MonsterRuntime,c:Character,s:GameState){const def=MONSTERS[m.defId];const dealt=receiveDamage(c,physicalDamage(def.attack*runtime.monsterAtk,characterStats(c,s).defense),s);const prevented=Math.max(0,def.attack*runtime.monsterAtk-dealt);if(prevented>0&&(c.cooldowns.defenseTrain??0)<=0){trainProficiency(c,'defense',runtime.trainScale);c.cooldowns.defenseTrain=2;}return dealt;}
