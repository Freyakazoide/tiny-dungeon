import type { Character, GameState } from '../game/core/types';
import { isPlayable } from '../game/rpg/classTree';
import { evolutionOptions } from '../game/rpg/evolution';
import { itemById } from '../game/data/items';
import { freshCount } from './items/BagTab';
import { talentPointsAvailable } from '../game/systems/talentGrid';

/** Estoque de poções de vida considerado "confortável" (100% do chip de poções no HUD). */
export const POTION_COMFORT = 60;
const healthPotions = (state: GameState) => state.inventory.supply.reduce((sum, s) => sum + (itemById(s.itemId)?.supply === 'health' ? s.quantity : 0), 0);
/** Nível das poções de vida em % (0 a 100) do estoque confortável. */
export const potionPercent = (state: GameState) => Math.min(100, Math.round(healthPotions(state) / POTION_COMFORT * 100));
export const potionTone = (percent: number): 'danger' | 'warn' | undefined => percent < 15 ? 'danger' : percent < 40 ? 'warn' : undefined;

/** Alguém da equipe pode evoluir agora (requisitos cumpridos e a classe tem kit pronto)? */
export const canEvolve = (character: Character) => evolutionOptions(character.profile).some(option => option.met && isPlayable(option.node.id));
export const evolvers = (state: GameState) => state.characters.filter(c => state.team.includes(c.id) && canEvolve(c));

export interface RailBadge { value: string; tone: 'gold' | 'red'; pulse?: boolean; why: string; }
/** Badges do trilho: `gold` = algo bom, `red` = precisa de atenção; pulso só em "pode evoluir". */
export function railBadges(state: GameState, selected: Character | undefined): Partial<Record<string, RailBadge>> {
  const out: Partial<Record<string, RailBadge>> = {};
  const points = selected ? talentPointsAvailable(selected) : 0;
  if (points > 0) out.personagem = { value: String(points), tone: 'gold', why: `${points} ${points === 1 ? 'ponto de talento livre' : 'pontos de talento livres'}` };
  const fresh = freshCount(state);
  if (fresh > 0) out.itens = { value: String(fresh), tone: 'gold', why: `${fresh} ${fresh === 1 ? 'item novo' : 'itens novos'}` };
  const ready = evolvers(state);
  if (ready.length) out.classes = { value: '!', tone: 'gold', pulse: true, why: `Pronto para evoluir: ${ready.map(c => c.name).join(', ')}` };
  const potions = potionPercent(state);
  if (potions < 15 && state.characters.length) out.helper = { value: '!', tone: 'red', why: `Poções acabando (${potions}% do estoque confortável)` };
  return out;
}
