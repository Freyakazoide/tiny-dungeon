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

/**
 * Golpes de assinatura dos chefes (só no corredor): cada chefe alterna 2–3 padrões de círculos avisados, além da pancada e do golpe em área comuns.
 *  - nova: um círculo enorme em volta do chefe (quem está colado precisa sair, o corpo a corpo inclusive);
 *  - barrage: até 3 círculos pequenos em heróis diferentes (backline primeiro), um logo depois do outro;
 *  - sweep: uma fileira de 3 círculos saindo do chefe em direção ao grupo, caindo em sequência.
 */
export type Signature = 'nova' | 'barrage' | 'sweep';
export const BOSS_SIGNATURES: Record<string, Signature[]> = {
  bone_king: ['nova', 'sweep'], spider_queen: ['barrage', 'sweep'], bog_hydra: ['barrage', 'nova'], crystal_golem: ['sweep', 'nova'],
  winter_queen: ['barrage', 'nova'], flame_lord: ['sweep', 'barrage'], profane_high_priest: ['barrage', 'nova', 'sweep'],
};
export interface SigCircle { x: number; y: number; r: number; windup: number; mult: number; role: 'boss' | 'slam' }
export const SIGNATURE = { nova: { r: 3.2, windup: 1.1, mult: 1.3 }, barrage: { r: .9, windup: .9, step: .25, mult: 1.1, max: 3 }, sweep: { r: 1.1, windup: .8, step: .22, mult: 1.25, count: 3, gap: 2 } } as const;
/** Ataque de assinatura da vez (alterna a lista do chefe). A cada 3º ataque do chefe, ou a cada 2º na fase enfurecida. */
export const signatureDue = (attackNo: number, phase: number) => phase >= 2 ? attackNo % 2 === 1 : attackNo % 3 === 2;
export const signatureKind = (bossId: string, attackNo: number, phase: number): Signature | undefined => {
  const list = BOSS_SIGNATURES[bossId]; if (!list || !signatureDue(attackNo, phase)) return undefined;
  return list[Math.floor((phase >= 2 ? (attackNo - 1) / 2 : (attackNo - 2) / 3)) % list.length];
};
export function signatureCircles(kind: Signature, boss: { x: number; y: number }, heroes: { pt: { x: number; y: number }; back: boolean }[]): SigCircle[] {
  if (!heroes.length) return [];
  if (kind === 'nova') return [{ x: boss.x, y: boss.y, r: SIGNATURE.nova.r, windup: SIGNATURE.nova.windup, mult: SIGNATURE.nova.mult, role: 'boss' }];
  if (kind === 'barrage') {
    const order = [...heroes].sort((a, b) => Number(b.back) - Number(a.back) || Math.hypot(a.pt.x - boss.x, a.pt.y - boss.y) - Math.hypot(b.pt.x - boss.x, b.pt.y - boss.y));
    return order.slice(0, SIGNATURE.barrage.max).map((h, i) => ({ x: h.pt.x, y: h.pt.y, r: SIGNATURE.barrage.r, windup: SIGNATURE.barrage.windup + i * SIGNATURE.barrage.step, mult: SIGNATURE.barrage.mult, role: 'slam' as const }));
  }
  const cx = heroes.reduce((s, h) => s + h.pt.x, 0) / heroes.length, cy = heroes.reduce((s, h) => s + h.pt.y, 0) / heroes.length, d = Math.hypot(cx - boss.x, cy - boss.y) || 1, ux = (cx - boss.x) / d, uy = (cy - boss.y) / d;
  return Array.from({ length: SIGNATURE.sweep.count }, (_, i) => ({ x: boss.x + ux * SIGNATURE.sweep.gap * (i + 1), y: boss.y + uy * SIGNATURE.sweep.gap * (i + 1), r: SIGNATURE.sweep.r, windup: SIGNATURE.sweep.windup + i * SIGNATURE.sweep.step, mult: SIGNATURE.sweep.mult, role: 'slam' as const }));
}
