import type { Character, CharacterRow, GameState } from '../core/types';
import { CLASSES, kitOfNode } from '../data/classes';
import { classItem } from '../data/classItems';
import { HUNT_BY_ID } from '../data/hunts';
import { itemById } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { spellById } from '../data/spells';
import type { ProficiencyId } from '../rpg/proficiencies';
import { aggroShares, meleeInBackRow } from './combat';
import { characterStats } from './progression';

export const FORMATION_PRESETS = 3;
export const TEAM_LIMIT = 4;
/** Estoque de poções de vida considerado "confortável" (100% do chip de poções no HUD). */
export const POTION_COMFORT = 60;
const healthPotions = (state: GameState) => state.inventory.supply.reduce((sum, s) => sum + (itemById(s.itemId)?.supply === 'health' ? s.quantity : 0), 0);
/** Nível das poções de vida em % (0 a 100) do estoque confortável. */
export const potionPercent = (state: GameState) => Math.min(100, Math.round(healthPotions(state) / POTION_COMFORT * 100));

export type RoleTag = 'Tanque' | 'Corpo a corpo' | 'Dano à distância' | 'Mago' | 'Dano em área' | 'Suporte';
const MAGE_NODES = ['mago', 'bruxo', 'ilusionista', 'druida'];

const weaponName = (c: Character) => c.gear.weapon ? classItem(c.gear.weapon.baseId)?.name ?? '' : itemById(c.equipment.weapon ?? '')?.name ?? '';
/** O que a arma treina: simples pelo `trains`; de classe pelas proficiências fixas; senão a da classe. */
export function weaponTrains(c: Character): 'melee' | 'ranged' | 'magic' {
  const gear = c.gear.weapon && classItem(c.gear.weapon.baseId);
  if (gear) return gear.fixed.ranged ? 'ranged' : gear.fixed.magic ? 'magic' : 'melee';
  return itemById(c.equipment.weapon ?? '')?.trains ?? (CLASSES[c.classId].weaponSkill === 'magic' ? 'magic' : CLASSES[c.classId].weaponSkill === 'ranged' ? 'ranged' : 'melee');
}
const spellsOf = (c: Character) => c.spellSlots.map(id => spellById(id)).filter((s): s is NonNullable<typeof s> => !!s);
const isMage = (c: Character, state: GameState) => {
  const stats = characterStats(c, state);
  return /cajado|varinha|bastão|cetro/i.test(weaponName(c)) || stats.magicPower >= stats.attack || c.profile.classPath.some(id => MAGE_NODES.includes(id)) || kitOfNode(c.profile.classId) === 'mage';
};

/** Funções do personagem na formação (no máximo 3 tags, nesta ordem). */
export function rolesOf(c: Character, state: GameState): RoleTag[] {
  const spells = spellsOf(c), mage = isMage(c, state), trains = weaponTrains(c), out: RoleTag[] = [];
  if (c.isTank && c.row === 'front') out.push('Tanque');
  if (!mage && trains === 'melee') out.push('Corpo a corpo');
  if (!mage && trains === 'ranged') out.push('Dano à distância');
  if (mage) out.push('Mago');
  if (spells.some(s => s.target === 'allEnemies')) out.push('Dano em área');
  if (spells.some(s => s.kind === 'heal' || s.kind === 'regen' || ((s.kind === 'shield' || s.kind === 'buff') && s.target !== 'self'))) out.push('Suporte');
  return out.slice(0, 3);
}

const teamOf = (state: GameState) => state.team.map(id => state.characters.find(c => c.id === id)).filter((c): c is Character => !!c);

export interface GroupPower { totalHp: number; dps: number; tankDefense: number; tankShare: number }
export function groupPower(state: GameState): GroupPower {
  const team = teamOf(state), tank = team.find(c => c.isTank && c.row === 'front');
  const totalHp = team.reduce((n, c) => n + characterStats(c, state).maxHp, 0);
  const dps = Math.round(team.reduce((n, c) => { const s = characterStats(c, state); return n + s.attack * s.attackSpeed * (meleeInBackRow(c) ? .5 : 1); }, 0));
  return { totalHp, dps, tankDefense: tank ? Math.round(characterStats(tank, state).defense) : 0, tankShare: tank ? Math.round((aggroShares(team).get(tank.id) ?? 0) * 100) : 0 };
}

export type AlertKind = 'meleeBack' | 'noTank' | 'emptyFront' | 'freeSlot' | 'noHeal' | 'fallen' | 'noPotions' | 'allOk';
export type FixAction = { type: 'setRow'; id: string; row: CharacterRow } | { type: 'setTank'; id: string } | { type: 'openReserves' };
export interface GroupAlert { kind: AlertKind; level: 'bad' | 'warn' | 'info' | 'ok'; title: string; detail: string; characterId?: string; fix?: { label: string; action: FixAction } }

const bestTankCandidate = (team: Character[], state: GameState) => team.filter(c => c.row === 'front').sort((a, b) => characterStats(b, state).defense - characterStats(a, state).defense)[0];

export function groupAlerts(state: GameState): GroupAlert[] {
  const team = teamOf(state), alerts: GroupAlert[] = [];
  const front = team.filter(c => c.row === 'front');
  for (const c of team.filter(meleeInBackRow)) alerts.push({ kind: 'meleeBack', level: 'warn', title: `${c.name}: corpo a corpo atrás`, detail: 'Arma corpo a corpo na linha de trás causa só 50% do dano.', characterId: c.id, fix: { label: 'Mover para a frente', action: { type: 'setRow', id: c.id, row: 'front' } } });
  if (team.length >= 2 && !front.length) alerts.push({ kind: 'emptyFront', level: 'bad', title: 'Linha de frente vazia', detail: 'Sem ninguém na frente, os monstros batem direto na linha de trás.' });
  else if (front.length && !team.some(c => c.isTank)) {
    const pick = bestTankCandidate(team, state);
    alerts.push({ kind: 'noTank', level: 'bad', title: 'Sem tanque', detail: 'Ninguém na frente está marcado como tanque: o aggro se espalha.', characterId: pick.id, fix: { label: `Tornar ${pick.name} tanque`, action: { type: 'setTank', id: pick.id } } });
  }
  for (const c of team.filter(c => c.hp <= 0)) alerts.push({ kind: 'fallen', level: 'bad', title: `${c.name} caiu`, detail: 'Personagem derrotado não luta até a recuperação.', characterId: c.id });
  if (state.characters.length && potionPercent(state) < 15) alerts.push({ kind: 'noPotions', level: 'warn', title: 'Poucas poções de vida', detail: `Estoque em ${potionPercent(state)}% do confortável.` });
  if (team.length < TEAM_LIMIT && state.characters.length > team.length) alerts.push({ kind: 'freeSlot', level: 'info', title: 'Vaga livre na equipe', detail: `A equipe tem ${team.length}/${TEAM_LIMIT}. Há personagens na reserva.`, fix: { label: 'Ver reservas', action: { type: 'openReserves' } } });
  if (team.length && !team.some(c => spellsOf(c).some(s => s.kind === 'heal' || s.kind === 'regen'))) alerts.push({ kind: 'noHeal', level: 'info', title: 'Sem magia de cura', detail: 'Nenhum membro tem cura equipada; dependa de poções.' });
  const order = { bad: 0, warn: 1, info: 2, ok: 3 } as const;
  alerts.sort((a, b) => order[a.level] - order[b.level]);
  if (!alerts.some(a => a.level === 'bad' || a.level === 'warn')) alerts.push({ kind: 'allOk', level: 'ok', title: 'Formação equilibrada', detail: 'Nada a corrigir agora.' });
  return alerts;
}

export interface FormationPlan { moves: { id: string; row?: CharacterRow; tank?: boolean }[]; reason: string[] }
/** Sugestão curta (até 3 movimentos). `null` quando não há meleeBack, noTank nem emptyFront. */
export function suggestFormation(state: GameState): FormationPlan | null {
  const kinds = new Set(groupAlerts(state).map(a => a.kind));
  if (!kinds.has('meleeBack') && !kinds.has('noTank') && !kinds.has('emptyFront')) return null;
  const team = teamOf(state), rows = new Map(team.map(c => [c.id, c.row])), moves: FormationPlan['moves'] = [], reason: string[] = [];
  const room = () => moves.length < 3;
  for (const c of team.filter(meleeInBackRow)) if (room()) { rows.set(c.id, 'front'); moves.push({ id: c.id, row: 'front' }); reason.push(`${c.name} usa arma corpo a corpo: na frente causa 100% do dano.`); }
  const defense = (c: Character) => characterStats(c, state).defense;
  if (team.length >= 2 && ![...rows.values()].includes('front') && room()) {
    const pick = [...team].sort((a, b) => defense(b) - defense(a))[0]; rows.set(pick.id, 'front'); moves.push({ id: pick.id, row: 'front' }); reason.push(`${pick.name} tem a maior defesa: vai para a frente.`);
  }
  const frontNow = team.filter(c => rows.get(c.id) === 'front');
  if (frontNow.length && !team.some(c => c.isTank && rows.get(c.id) === 'front') && room()) {
    const pick = [...frontNow].sort((a, b) => defense(b) * characterStats(b, state).maxHp - defense(a) * characterStats(a, state).maxHp)[0];
    moves.push({ id: pick.id, tank: true }); reason.push(`${pick.name} vira o tanque (maior defesa × vida).`);
  }
  const hasTank = team.some(c => (c.isTank && rows.get(c.id) === 'front')) || moves.some(m => m.tank);
  if (hasTank) for (const c of team) if (room() && rows.get(c.id) === 'front' && !c.isTank && !moves.some(m => m.tank && m.id === c.id) && !moves.some(m => m.id === c.id) && weaponTrains(c) !== 'melee') {
    rows.set(c.id, 'back'); moves.push({ id: c.id, row: 'back' }); reason.push(`${c.name} ataca de longe: atrás perde nada e fica protegido.`);
  }
  return moves.length ? { moves, reason } : null;
}

export interface ElementCover { element: ProficiencyId; monsters: string[]; coveredBy: string[] }
/** Fraquezas dos monstros da hunt × magias elementais equipadas na equipe. */
export function elementCoverage(state: GameState, huntId: string): ElementCover[] {
  const hunt = HUNT_BY_ID[huntId]; if (!hunt) return [];
  const ids = Array.from(new Set(hunt.waves.flatMap(w => w.monsters))), map = new Map<ProficiencyId, string[]>();
  for (const id of ids) for (const el of MONSTERS[id]?.weak ?? []) map.set(el, [...(map.get(el) ?? []), MONSTERS[id].name]);
  const team = teamOf(state);
  return [...map.entries()].map(([element, monsters]) => ({ element, monsters, coveredBy: team.filter(c => spellsOf(c).some(s => s.element === element)).map(c => c.name) }))
    .sort((a, b) => b.monsters.length - a.monsters.length);
}
