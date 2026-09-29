import { GameEngine, initialState } from './GameEngine';
import type { GameState } from './types';

/** Estado de teste: o grupo inicial de 3 Squires já criado, como após a tela de criação. */
export function partyState(names=['Aldric','Kael','Lyra']):GameState{
  const engine=new GameEngine(initialState());
  if(!engine.createParty(names))throw new Error('Grupo de teste inválido.');
  return engine.getSnapshot();
}
