import { GameEngine, initialState } from './GameEngine';
import type { CharacterSpec } from '../data/starter';
import type { GameState } from './types';

/** Grupo padrão de teste: Espada/Frente (tanque), Arco/Trás e Cajado/Trás, com Fogo, Gelo e Sagrado em foco. */
export const DEFAULT_SPECS: CharacterSpec[] = [
  { name: 'Aldric', weaponId: 'rusty_sword', row: 'front', element: 'fire' },
  { name: 'Kael', weaponId: 'oak_bow', row: 'back', element: 'ice' },
  { name: 'Lyra', weaponId: 'apprentice_staff', row: 'back', element: 'holy' },
];

/** Estado de teste: o grupo inicial de 3 Squires já criado, como após a tela de criação. */
export function partyState(names?: string[]): GameState {
  const engine = new GameEngine(initialState());
  const specs = DEFAULT_SPECS.map((spec, index) => ({ ...spec, name: names?.[index] ?? spec.name }));
  if (!engine.createParty(specs)) throw new Error('Grupo de teste inválido.');
  return engine.getSnapshot();
}
