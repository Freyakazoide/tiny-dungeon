import type { GameState } from '../core/types';
import { GEAR_PIECES, GEAR_SETS, gearId, type GearPiece } from '../data/gear';
import { HUNTS, huntRisk, type HuntDef, type HuntRisk } from '../data/hunts';
import { WAVE_EXTRAS } from '../data/balance';
import { itemById } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { referenceHunt, REF_MIN_ACTIVE_MS } from '../rpg/offline';
import { TIER_NAMES, tierOfExtra, type WaveTier } from './waves';

const averageLevel = (state: GameState) => {
  const levels = state.team.map(id => state.characters.find(c => c.id === id)?.profile.level).filter((l): l is number => l !== undefined);
  return levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
};

export interface HuntRiskInfo { label: HuntRisk; average: number; recommended: number; gap: number; ratio: number }
export function huntRiskInfo(state: GameState, hunt: HuntDef): HuntRiskInfo {
  const average = averageLevel(state), recommended = hunt.recommendedLevel;
  return { label: huntRisk(average, recommended), average, recommended, gap: Math.max(0, recommended - average), ratio: Math.max(0, Math.min(1, average / (recommended + 3))) };
}

export interface HuntMetrics { xpPerHour: number; goldPerHour: number; measured: boolean; bossKills: number; activeMs: number }
export function huntMetrics(state: GameState, hunt: HuntDef): HuntMetrics {
  const stat = state.huntStats[hunt.id], activeMs = stat?.activeMs ?? 0, bossKills = stat?.bossKills ?? 0;
  if (stat && activeMs >= REF_MIN_ACTIVE_MS) { const hours = activeMs / 3_600_000; return { xpPerHour: stat.xp / hours, goldPerHour: stat.gold / hours, measured: true, bossKills, activeMs }; }
  return { xpPerHour: hunt.refXpPerHour, goldPerHour: hunt.refGoldPerHour, measured: false, bossKills, activeMs };
}

/** Melhor XP/h entre as hunts Tranquila ou Adequada; sem nenhuma, a de menor nível recomendado. */
export function recommendedHunt(state: GameState): string {
  const ok = HUNTS.filter(h => { const label = huntRiskInfo(state, h).label; return label === 'Tranquila' || label === 'Adequada'; });
  if (!ok.length) return [...HUNTS].sort((a, b) => a.recommendedLevel - b.recommendedLevel)[0].id;
  return [...ok].sort((a, b) => huntMetrics(state, b).xpPerHour - huntMetrics(state, a).xpPerHour || b.recommendedLevel - a.recommendedLevel)[0].id;
}
/** A hunt de referência do crédito offline (a mesma de `applyOffline`). */
export const offlineHuntId = (state: GameState): string => referenceHunt(state.huntStats).id;

export interface WaveView { name: string; counts: { monsterId: string; count: number }[]; boss: boolean }
export function waveViews(hunt: HuntDef): WaveView[] {
  return hunt.waves.map(wave => {
    const counts: WaveView['counts'] = [];
    for (const id of wave.monsters) { const at = counts.find(c => c.monsterId === id); if (at) at.count++; else counts.push({ monsterId: id, count: 1 }); }
    return { name: wave.name, counts, boss: wave.monsters.some(id => MONSTERS[id]?.boss) };
  });
}

export interface TierChance { tier: WaveTier; label: string; pct: number }
export function tierChances(hunt: HuntDef): TierChance[] {
  const table = hunt.extrasTable ?? WAVE_EXTRAS, scale = hunt.extrasScale ?? 1, total = table.reduce((n, r) => n + r.pct, 0) || 1;
  const sums: Record<WaveTier, number> = { normal: 0, light: 0, reinforced: 0, horde: 0, invasion: 0 };
  for (const row of table) sums[tierOfExtra(Math.round(row.extra * scale))] += row.pct;
  return (Object.keys(sums) as WaveTier[]).map(tier => ({ tier, label: TIER_NAMES[tier], pct: Math.round(sums[tier] / total * 10000) / 100 }));
}

const PIECE_SLOT: Record<GearPiece, string> = { melee: 'weapon', ranged: 'weapon', staff: 'weapon', armor: 'armor', shield: 'offhand' };
export interface GearPieceStatus { piece: GearPiece; name: string; icon: string; status: 'equipped' | 'bag' | 'missing' }
export function huntGearStatus(state: GameState, huntId: string): { minLevel: number; pieces: GearPieceStatus[] } | null {
  const set = GEAR_SETS.find(s => s.huntId === huntId); if (!set) return null;
  return { minLevel: set.minLevel, pieces: GEAR_PIECES.map(piece => {
    const id = gearId(huntId, piece), slot = PIECE_SLOT[piece];
    const equipped = state.characters.some(c => c.equipment[slot as 'weapon'] === id), bag = state.inventory.bp.some(s => s.itemId === id);
    return { piece, name: itemById(id)?.name ?? id, icon: `slot_${slot}`, status: equipped ? 'equipped' : bag ? 'bag' : 'missing' };
  }) };
}
