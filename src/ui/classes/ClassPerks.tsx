import type { CSSProperties } from 'react';
import { CLASSES, kitOfNode } from '../../game/data/classes';
import { CLASS_PROFILES } from '../../game/data/classProfiles';
import { SPELLS } from '../../game/data/spells';
import { NODE_PASSIVES } from '../../game/rpg/passives';
import { CLASS_BY_ID, childrenOf, isPlayable } from '../../game/rpg/classTree';
import { PROFICIENCIES } from '../../game/rpg/proficiencies';
import { Icon } from '../components/Icon';
import { spellIcon } from '../SpellsPanel';
import { subclassKind } from './parts';

const KIT_STATS = [['stat_hp', 'Vida', 'maxHp', 400], ['stat_attack', 'Ataque', 'attack', 40], ['stat_defense', 'Defesa', 'defense', 30], ['stat_magic', 'Magia', 'magicPower', 40], ['stat_speed', 'Velocidade', 'attackSpeed', 2], ['stat_crit', 'Crítico', 'crit', .4]] as const;
const KIND_LABEL = { damage: 'Dano', heal: 'Cura', regen: 'Regeneração', shield: 'Escudo', buff: 'Buff' } as const;
const ROLE_COLOR: Record<string, string> = { Dano: '#d8554f', Tanque: '#5f8fb8', Suporte: '#7cc08a', Controle: '#c45f9c', Híbrido: '#e0a05c' };

/** "O que você conquista seguindo esta classe": papel, atributos do kit, magias, passiva, ganhos e subclasses, tudo com ícones. */
export function ClassPerks({ nodeId }: { nodeId: string }) {
  const node = CLASS_BY_ID[nodeId], profile = CLASS_PROFILES[nodeId];
  if (!node || !profile) return null;
  const kit = kitOfNode(nodeId), def = CLASSES[kit], passive = NODE_PASSIVES[nodeId];
  const spells = SPELLS.filter(s => s.classId === kit && !s.universal && !s.node);
  const subs = childrenOf(nodeId);
  return <section className="cl-perks" aria-label={`O que ${node.name} conquista`} style={{ '--rc': ROLE_COLOR[profile.role] } as CSSProperties}>
    <h4 className="pk-sec">O que você conquista</h4>
    <p className="cl-tagline"><span className="pk-tag" style={{ ['--tc' as string]: ROLE_COLOR[profile.role] }}>{profile.role}</span> {profile.tagline}</p>
    <ul className="cl-play">{profile.playstyle.map(t => <li key={t}>{t}</li>)}</ul>
    <div className="cl-kstats" aria-label="Atributos do kit">{KIT_STATS.map(([icon, label, key, max]) => {
      const v = def.base[key] ?? 0; return <div key={key} className="cl-kst" title={`${label}: ${key === 'attackSpeed' ? v.toFixed(2) : key === 'crit' ? `${Math.round(v * 100)}%` : Math.round(v)}`}>
        <Icon name={icon} size={24} /><span className="pk-bar thin"><i style={{ width: `${Math.min(100, v / max * 100)}%` }} /></span></div>;
    })}</div>
    <h5 className="cl-sub">Magias do kit</h5>
    <div className="cl-kspells">{spells.map(s => <div key={s.id} className="cl-ks" title={s.description}><Icon name={spellIcon(s)} size={24} /><div><b>{s.name}</b><small>{KIND_LABEL[s.kind]}{s.element ? ` · ${PROFICIENCIES[s.element].name}` : ''} · {s.mana} mana</small></div></div>)}</div>
    {passive && <div className="cl-passive"><Icon name="stat_xp" size={24} /><div><b>{passive.name}</b><br /><small className="muted">{passive.description}</small></div></div>}
    <h5 className="cl-sub">Ganhos ao seguir o caminho</h5>
    <ul className="cl-rew">{profile.rewards.slice(0, 2).map(r => <li key={r.text}><Icon name={r.icon} size={24} /><span>{r.text}</span></li>)}
      {subs.length > 0 && <li><Icon name={profile.rewards[2]?.icon ?? 'classes'} size={24} /><span>6 especializações: {subs.map(x => x.name).join(', ')}</span></li>}</ul>
    {subs.length > 0 && <><h5 className="cl-sub">Especializações ({subs.length})</h5>
      <div className="cl-subs">{subs.map(s => <span key={s.id} className="pk-chip" title={subclassKind(s)}>{s.name}{isPlayable(s.id) ? '' : ' 🔒'}</span>)}</div></>}
  </section>;
}
