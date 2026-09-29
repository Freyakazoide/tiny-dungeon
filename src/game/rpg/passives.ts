import type { TalentEffect } from '../core/types';

/** Efeitos de passiva: os de talento mais dois condicionais. */
export type PassiveEffect = TalentEffect | 'tankResistance' | 'focusMagicDamage' | 'burnOnFireHit' | 'iceBarrier' | 'plasmaCrit' | 'plasmaCritMult' | 'plasmaCooldown';
export interface PassiveDef { name: string; description: string; effects: { effect: PassiveEffect; value: number }[]; }

/** Passivas de cada nó do caminho da classe; somadas em characterStats (via talentBonus) enquanto o nó estiver no `classPath`. */
export const NODE_PASSIVES: Record<string, PassiveDef> = {
  guerreiro: { name: 'Pele de Aço', description: '+10% de defesa; se for o Tanque, +8% de resistência.', effects: [{ effect: 'defense', value: .10 }, { effect: 'tankResistance', value: .08 }] },
  cacador: { name: 'Olho de Águia', description: '+6% de chance de crítico.', effects: [{ effect: 'crit', value: .06 }] },
  piromante: { name: 'Pirólise', description: '25% de chance de aplicar 1 stack de Combustão em qualquer acerto de magia de fogo.', effects: [{ effect: 'burnOnFireHit', value: .25 }] },
  criomante: { name: 'Geada Protetora', description: '20% do dano causado por magia de gelo vira barreira temporária (máx. 30% do HP máx.).', effects: [{ effect: 'iceBarrier', value: .20 }] },
  arcanista_de_plasma: { name: 'Plasma Instável', description: 'Magias de fogo e energia: +8% de crítico e crítico ×2,5 (em vez de ×1,65); Raio de Plasma recarrega 20% mais rápido.', effects: [{ effect: 'plasmaCrit', value: .08 }, { effect: 'plasmaCritMult', value: 2.5 }, { effect: 'plasmaCooldown', value: .20 }] },
  mago: { name: 'Sintonia Elemental', description: '+15% de dano das magias do elemento em foco.', effects: [{ effect: 'focusMagicDamage', value: .15 }] },
};

/** Soma de um efeito de passiva nos nós do caminho. */
export function passiveBonus(classPath: readonly string[], effect: PassiveEffect) {
  let total = 0;
  for (const id of classPath) for (const entry of NODE_PASSIVES[id]?.effects ?? []) if (entry.effect === effect) total += entry.value;
  return total;
}
