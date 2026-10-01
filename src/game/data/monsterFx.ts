import type { FxKind } from '../systems/spellFx';

/** Forma do ataque de cada monstro (o que sai dele em direção ao herói). Sem entrada: corte. */
export const MONSTER_FX: Record<string, FxKind> = {
  skeleton: 'slash', ghoul: 'slash', bone_king: 'death',
  wolf: 'slash', bandit: 'slash', spider_queen: 'poison',
  toxic_toad: 'poison', bog_lizard: 'slash', bog_hydra: 'poison',
  kobold_miner: 'slash', stone_golem: 'physical', crystal_golem: 'energy',
  frost_wolf: 'slash', yeti: 'physical', winter_queen: 'ice',
  salamander: 'fire', lava_golem: 'physical', flame_lord: 'fire',
  dark_cultist: 'death', fallen_angel: 'holy', profane_high_priest: 'psychic',
};
export const monsterFx = (defId: string): FxKind => MONSTER_FX[defId] ?? 'slash';
