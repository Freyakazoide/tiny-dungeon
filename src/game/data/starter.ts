import type { CharacterRow } from '../core/types';
import type { Look } from '../art/look';
import { PROFICIENCIES, PROFICIENCY_IDS, type ProficiencyId } from '../rpg/proficiencies';

export interface StarterWeapon { id: string; trains: 'melee' | 'ranged'; row: CharacterRow; note: string; }
/** As 4 armas que se escolhe na criação; as outras 3 não vão para a mochila. */
export const STARTER_WEAPONS: readonly StarterWeapon[] = [
  { id: 'rusty_sword', trains: 'melee', row: 'front', note: 'Corpo a corpo equilibrada.' },
  { id: 'oak_bow', trains: 'ranged', row: 'back', note: 'Ataca de longe, sem penalidade na linha de trás.' },
  { id: 'knuckle_wraps', trains: 'melee', row: 'front', note: 'Corpo a corpo mais rápida.' },
  { id: 'apprentice_staff', trains: 'melee', row: 'back', note: 'Corpo a corpo fraca, com poder mágico e mana.' },
];
export const STARTER_ELEMENTS: readonly ProficiencyId[] = PROFICIENCY_IDS.filter(id => PROFICIENCIES[id].group === 'elemental');
export const STARTER_OFFHAND = 'wooden_shield';

/** Linha sugerida para uma arma: a escolhida na criação, senão pelo que ela treina. */
export const defaultRow = (weaponId: string | undefined, trains?: 'melee' | 'ranged'): CharacterRow =>
  STARTER_WEAPONS.find(w => w.id === weaponId)?.row ?? (trains === 'ranged' ? 'back' : 'front');

export interface CharacterSpec { name: string; weaponId: string; row?: CharacterRow; element?: ProficiencyId; look?: Partial<Look>; }
