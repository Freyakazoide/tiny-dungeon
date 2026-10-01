import { useState } from 'react';
import type { Character } from '../../game/core/types';
import { CLASS_BY_ID, childrenOf, type ClassNode } from '../../game/rpg/classTree';
import { PROFICIENCIES, type ProficiencyId } from '../../game/rpg/proficiencies';
import { NODE_PASSIVES } from '../../game/rpg/passives';
import { COUNTER_NAMES, requirementRows } from '../../game/systems/guide';
import { COUNTER_TARGETS } from '../../game/rpg/classTree';
import { SPELLS } from '../../game/data/spells';
import { TALENT_TREES } from '../../game/data/talentTrees';
import { itemsForClass } from '../../game/data/classItems';
import { compact } from '../format';
import { Icon } from '../components/Icon';
import { spellIcon } from '../SpellsPanel';
import { ClassIcon } from './ClassIcon';
import { reqNeed, subclassKind } from './parts';

/** Requisitos em texto, sem personagem (para ver uma classe antes de poder segui-la). */
export function staticRequirements(node: ClassNode): { key: string; text: string }[] {
  const { level, skills = {}, counters = {}, elements } = node.requires;
  return [{ key: 'level', text: `Nível ${level}` },
    ...Object.entries(skills).map(([id, need]) => ({ key: id, text: `${PROFICIENCIES[id as ProficiencyId].name} ${need}` })),
    ...(elements ? [{ key: 'elements', text: `${elements.count} elementos no nível ${elements.level}` }] : []),
    ...Object.entries(counters).map(([id, need]) => ({ key: id, text: `${COUNTER_NAMES[id as keyof typeof COUNTER_NAMES]} ${compact(need ?? COUNTER_TARGETS[id as keyof typeof COUNTER_TARGETS])}` }))];
}

/** Tudo sobre uma especialização (Tier 2): requisitos, passiva, magia, mecânica final, grade de talentos e itens. Serve para planejar o caminho antes de segui-lo. */
export function SpecDetail({ node, character }: { node: ClassNode; character?: Character }) {
  const passive = NODE_PASSIVES[node.id], spell = SPELLS.find(s => s.node === node.id), tree = TALENT_TREES[node.id];
  const keystone = tree?.nodes.find(n => n.kind === 'keystone'), items = itemsForClass(node.id);
  const parent = node.parent ? CLASS_BY_ID[node.parent] : undefined;
  const reqs = character ? requirementRows(character, node).map(r => ({ key: r.key, text: reqNeed(r), ok: r.met })) : staticRequirements(node).map(r => ({ ...r, ok: false }));
  const mine = !!character?.profile.classPath.includes(node.id);
  return <div className="cl-spec-detail pk-panel flat" aria-label={`Detalhes: ${node.name}`}>
    <div className="cl-phead"><ClassIcon node={node} size="big" />
      <div><div className="cl-name" style={{ fontSize: 17 }}>{node.name}</div><div className="cl-spec">{node.specialty}</div>
        <div className="cl-tags"><span className="pk-tag afim">{subclassKind(node)}</span>{mine ? <span className="pk-tag ok">Seu caminho</span> : <span className="pk-tag blq">🔒 Bloqueada{parent ? ` · exige ${parent.name}` : ''}</span>}</div></div></div>
    <h5 className="cl-sub">Requisitos</h5>
    <div className="cl-chips">{reqs.map(r => <span key={r.key} className={`cl-chip ${r.ok ? 'ok' : ''}`}>{r.text}</span>)}</div>
    {passive && <div className="cl-passive"><Icon name="stat_xp" size={24} /><div><b>{passive.name}</b><br /><small className="muted">{passive.description}</small></div></div>}
    {spell && <div className="cl-ks" title={spell.description}><Icon name={spellIcon(spell)} size={24} /><div><b>{spell.name}</b><small>{spell.description} · {spell.mana} mana · recarga {spell.cooldown}s</small></div></div>}
    {keystone?.mechanic && <div className="cl-passive"><Icon name="stat_crit" size={24} /><div><b>{keystone.name}</b> <small className="muted">· Keystone</small><br /><small className="muted">{keystone.mechanic.text}</small></div></div>}
    <p className="cl-note">{tree ? `Grade de ${tree.nodeCount} talentos (${Object.values(tree.lanes).join(' / ')}) · ` : ''}{items.length} itens de classe próprios (armas, escudo, armadura, amuleto e anel).</p>
  </div>;
}

/** Lista as 6 especializações de uma classe base e o detalhe da escolhida; funciona sem personagem. */
export function SpecBrowser({ base, character }: { base: ClassNode; character?: Character }) {
  const kids = childrenOf(base.id);
  const [picked, setPicked] = useState<string | null>(null);
  const current = kids.find(k => k.id === picked) ?? kids[0];
  const group = (title: string, list: ClassNode[]) => list.length ? <><h4 className="pk-sec">{title} <small>{list.length}</small></h4>
    {list.map(kid => <button type="button" role="option" aria-selected={kid.id === current?.id} key={kid.id} className={`cl-sub cl-subpick ${kid.id === current?.id ? 'sel' : ''} ${character?.profile.classPath.includes(kid.id) ? 'here' : ''}`} onClick={() => setPicked(kid.id)}>
      <ClassIcon node={kid} size="sm" /><span><b>{kid.name}</b><small className="muted">{kid.specialty}</small></span></button>)}</> : null;
  return <div className="cl-specs">
    <div role="listbox" aria-label={`Especializações de ${base.name}`} className="cl-speclist">
      {group('Puras', kids.filter(k => subclassKind(k) === 'Pura'))}{group('Com contador', kids.filter(k => subclassKind(k) === 'Com contador'))}{group('Híbridas', kids.filter(k => subclassKind(k) === 'Híbrida' || subclassKind(k) === 'Elementos livres'))}
    </div>
    {current && <SpecDetail node={current} character={character} />}
  </div>;
}
