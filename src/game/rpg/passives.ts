
import { SPEC_PASSIVES } from './tier2Specs';

/** Efeitos de passiva: os de atributo mais os condicionais. */
export type PassiveEffect = 'maxHp' | 'maxMana' | 'attack' | 'defense' | 'attackSpeed' | 'crit' | 'resistance' | 'magicPower' | 'cooldown' | 'tankResistance' | 'focusMagicDamage' | 'burnOnFireHit' | 'iceBarrier' | 'plasmaCrit' | 'plasmaCritMult' | 'plasmaCooldown';
export interface PassiveDef { name: string; description: string; effects: { effect: PassiveEffect; value: number }[]; }

/** Passivas de cada nó do caminho da classe; somadas em characterStats (via talentBonus) enquanto o nó estiver no `classPath`. */
export const NODE_PASSIVES: Record<string, PassiveDef> = {
  ...(SPEC_PASSIVES as Record<string, PassiveDef>),
  guerreiro: { name: 'Pele de Aço', description: '+10% de defesa; se for o Tanque, +8% de resistência.', effects: [{ effect: 'defense', value: .10 }, { effect: 'tankResistance', value: .08 }] },
  cacador: { name: 'Olho de Águia', description: '+6% de chance de crítico.', effects: [{ effect: 'crit', value: .06 }] },
  guardiao: { name: 'Muralha Viva', description: '+15% de defesa e +10% de vida; se for o Tanque, +10% de resistência.', effects: [{ effect: 'defense', value: .15 }, { effect: 'maxHp', value: .10 }, { effect: 'tankResistance', value: .10 }] },
  ladino: { name: 'Golpe Furtivo', description: '+8% de chance de crítico e +8% de velocidade de ataque.', effects: [{ effect: 'crit', value: .08 }, { effect: 'attackSpeed', value: .08 }] },
  clerigo: { name: 'Fé Inabalável', description: '+12% de mana máxima e +10% de poder mágico (mais cura).', effects: [{ effect: 'maxMana', value: .12 }, { effect: 'magicPower', value: .10 }] },
  bardo: { name: 'Voz Inspiradora', description: '+10% de poder mágico, +10% de mana máxima e 6% de recarga mais rápida.', effects: [{ effect: 'magicPower', value: .10 }, { effect: 'maxMana', value: .10 }, { effect: 'cooldown', value: .06 }] },
  monge: { name: 'Corpo Disciplinado', description: '+12% de velocidade de ataque e +8% de resistência.', effects: [{ effect: 'attackSpeed', value: .12 }, { effect: 'resistance', value: .08 }] },
  bruxo: { name: 'Aura Sombria', description: '+12% de poder mágico e +10% de dano das magias do elemento em foco.', effects: [{ effect: 'magicPower', value: .12 }, { effect: 'focusMagicDamage', value: .10 }] },
  alquimista: { name: 'Mestre de Poções', description: '+10% de ataque e +10% de mana máxima.', effects: [{ effect: 'attack', value: .10 }, { effect: 'maxMana', value: .10 }] },
  mercenario: { name: 'Contrato Pesado', description: '+12% de ataque e +8% de vida.', effects: [{ effect: 'attack', value: .12 }, { effect: 'maxHp', value: .08 }] },
  mestre_runico: { name: 'Runas Gravadas', description: '+8% de ataque, +8% de poder mágico e +8% de defesa.', effects: [{ effect: 'attack', value: .08 }, { effect: 'magicPower', value: .08 }, { effect: 'defense', value: .08 }] },
  ilusionista: { name: 'Mente Aguçada', description: '+12% de poder mágico e 6% de recarga mais rápida.', effects: [{ effect: 'magicPower', value: .12 }, { effect: 'cooldown', value: .06 }] },
  druida: { name: 'Pele de Casca', description: '+10% de vida, +10% de poder mágico e +6% de resistência.', effects: [{ effect: 'maxHp', value: .10 }, { effect: 'magicPower', value: .10 }, { effect: 'resistance', value: .06 }] },
  artilheiro: { name: 'Munição Explosiva', description: '+12% de ataque e +5% de chance de crítico.', effects: [{ effect: 'attack', value: .12 }, { effect: 'crit', value: .05 }] },
  mago: { name: 'Sintonia Elemental', description: '+15% de dano das magias do elemento em foco.', effects: [{ effect: 'focusMagicDamage', value: .15 }] },
};

/** Soma de um efeito de passiva nos nós do caminho. */
export function passiveBonus(classPath: readonly string[], effect: PassiveEffect) {
  let total = 0;
  for (const id of classPath) for (const entry of NODE_PASSIVES[id]?.effects ?? []) if (entry.effect === effect) total += entry.value;
  return total;
}
