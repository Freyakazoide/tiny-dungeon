/**
 * Funções dos inimigos na arena. O padrão é bater no anel de um herói (`melee`); os demais mudam onde ficam e como atacam:
 * - `runner`: ignora o anel do tanque e vai direto na backline;
 * - `brute`: fica no anel e bate com um golpe de área avisado (dá para sair de perto);
 * - `archer` / `caster`: ficam longe e miram a backline com um círculo avisado no chão (dá para desviar).
 * Todo golpe avisado é um "windup": um círculo que aparece, cresce e só então causa dano a quem ainda estiver dentro.
 */
export type FoeRole = 'melee' | 'runner' | 'brute' | 'archer' | 'caster';

export const FOE_ROLE: Record<string, FoeRole> = {
  skeleton: 'melee', ghoul: 'brute',
  wolf: 'runner', bandit: 'archer',
  toxic_toad: 'caster', bog_lizard: 'brute',
  kobold_miner: 'melee', stone_golem: 'brute',
  frost_wolf: 'runner', yeti: 'brute',
  salamander: 'caster', lava_golem: 'brute',
  dark_cultist: 'caster', fallen_angel: 'archer',
};
export const foeRole = (defId: string): FoeRole => FOE_ROLE[defId] ?? 'melee';

/** `windup`: segundos de aviso; `r`: raio do círculo (células); `mult`: multiplicador do dano; `range`: distância em que ataca (só à distância). */
export const FOE_ATTACK = {
  brute: { windup: .8, r: 1.45, mult: 1.6, range: 0 },
  archer: { windup: .7, r: .75, mult: 1.15, range: 6.5 },
  caster: { windup: 1, r: 1.3, mult: 1, range: 6 },
} as const;
export type WindupRole = keyof typeof FOE_ATTACK;
export const hasWindup = (role: FoeRole): role is WindupRole => role in FOE_ATTACK;
/** Atiradores e magos ficam longe: não têm vaga no anel. */
export const isRanged = (role: FoeRole) => role === 'archer' || role === 'caster';
