import type { CSSProperties } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { CLASSES } from '../../game/data/classes';
import { PROFICIENCIES } from '../../game/rpg/proficiencies';
import { characterStats, classLabel, elementFocus, xpForLevel } from '../../game/systems/progression';
import { Icon } from '../components/Icon';
import { colorHex, pct } from '../format';
import { uiStore } from '../uiStore';

const focusLabel = (c: Character) => { const f = elementFocus(c) ?? c.profile.trainingFocus; return f ? PROFICIENCIES[f].name : 'sem foco'; };
const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => <div className="mini"><i style={{ width: `${pct(value, max)}%`, background: color }} /></div>;

/** Barra da equipe (embaixo do mapa): um cartão por membro; clicar abre o Personagem já nele. */
export function PartyBar({ state }: { state: GameState }) {
  const team = state.team.map(id => state.characters.find(c => c.id === id)).filter(Boolean) as Character[];
  return <footer className="party" aria-label="Equipe">{team.map(c => {
    const stats = characterStats(c, state), needed = xpForLevel(c.profile.level), down = c.hp <= 0, low = !down && c.hp / stats.maxHp < .25;
    const buffs = c.effects.length;
    return <button key={c.id} type="button" className={`pcard ${down ? 'down' : ''} ${low ? 'low' : ''}`} style={{ '--c': colorHex(CLASSES[c.classId].color) } as CSSProperties}
      title={`HP ${Math.round(c.hp)}/${stats.maxHp} · Mana ${Math.round(c.mana)}/${stats.maxMana} · XP ${Math.round(c.profile.xp)}/${needed}`}
      aria-label={`${c.name}, ${classLabel(c)} nível ${c.profile.level}. Abrir ficha`} onClick={() => uiStore.open('personagem', { who: c.id })}>
      <div className="h"><strong>{c.isTank && <Icon name="badge_tank" size={24} />} {c.name}{down && ' ☠'}{buffs > 0 && <span title="Efeitos ativos"> 🔵</span>}</strong><small>{classLabel(c)} · Nv {c.profile.level}</small></div>
      <Bar value={c.hp} max={stats.maxHp} color="var(--hp)" /><Bar value={c.mana} max={stats.maxMana} color="var(--mana)" /><Bar value={c.profile.xp} max={needed} color="var(--xp)" />
      <div className="foot"><span>HP {Math.round(c.hp)}/{stats.maxHp}</span><span>Foco: {focusLabel(c)} · {c.row === 'front' ? 'Frente' : 'Trás'}</span></div>
    </button>;
  })}</footer>;
}
