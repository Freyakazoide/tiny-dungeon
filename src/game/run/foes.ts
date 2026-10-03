/**
 * Funções dos inimigos na arena. O padrão é bater no anel de um herói (`melee`); os demais mudam onde ficam e como atacam:
 * - `runner`: ignora o anel do tanque e vai direto na backline;
 * - `brute`: fica no anel e bate com um golpe de área avisado (dá para sair de perto);
 * - `archer` / `caster`: ficam longe e miram a backline com um círculo avisado no chão (dá para desviar).
 * Todo golpe avisado é um "windup": um círculo que aparece, cresce e só então causa dano a quem ainda estiver dentro.
 */
export type FoeRole = 'melee' | 'runner' | 'brute' | 'archer' | 'caster' | 'boss' | 'slam';

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
  /** chefe enfurecido (fase 2): pancada em área grande em quem está colado nele */
  boss: { windup: .9, r: 1.9, mult: 1.7, range: 0 },
  /** chefe a partir da 1ª fase: golpe de área menor, só quando 2+ heróis estão dentro do círculo */
  slam: { windup: .85, r: 1.6, mult: 1.45, range: 0 },
} as const;
/** Fases do chefe: abaixo destas frações da vida ele invoca ajudantes (1ª e 2ª) e, na 2ª, enfurece (mais rápido e com pancada em área). */
export const BOSS_PHASES = [.66, .33] as const;
export const BOSS_ENRAGE = { speed: 1.4, attack: 1.3, adds: 2 } as const;
export type WindupRole = keyof typeof FOE_ATTACK;
export const hasWindup = (role: FoeRole): role is WindupRole => role in FOE_ATTACK;
/** Atiradores e magos ficam longe: não têm vaga no anel. */
export const isRanged = (role: FoeRole) => role === 'archer' || role === 'caster';

/** Mira de um golpe em área: o ponto (um herói ou o meio entre dois) que pega mais heróis; no empate, a backline e depois o mais perto de `from`. */
export function bestAim(cands: { pt: { x: number; y: number }; back?: boolean }[], r: number, from?: { x: number; y: number }): { pt: { x: number; y: number }; hits: number } | undefined {
  if (!cands.length) return undefined;
  const spots = [...cands.map(c => c.pt), ...cands.flatMap((a, i) => cands.slice(i + 1).map(b => ({ x: (a.pt.x + b.pt.x) / 2, y: (a.pt.y + b.pt.y) / 2 })))];
  let best: { pt: { x: number; y: number }; hits: number; s: number } | undefined;
  for (const p of spots) {
    const inside = cands.filter(c => Math.hypot(c.pt.x - p.x, c.pt.y - p.y) <= r + .1);
    const s = inside.length * 10 + inside.filter(c => c.back).length * 1.5 - (from ? Math.hypot(p.x - from.x, p.y - from.y) * .02 : 0);
    if (!best || s > best.s) best = { pt: p, hits: inside.length, s };
  }
  return best && { pt: best.pt, hits: best.hits };
}
/** Corredor "de verdade": nasceu atrás do grupo (emboscada) ou é do tipo runner, e ainda não desistiu de chegar na backline. */
export const isRunnerNow = (m: { ambush?: boolean; defId: string; gaveUp?: boolean }) => !m.gaveUp && (!!m.ambush || foeRole(m.defId) === 'runner');
