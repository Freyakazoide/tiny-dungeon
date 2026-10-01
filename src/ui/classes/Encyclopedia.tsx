import { useMemo, useState } from 'react';
import type { Character } from '../../game/core/types';
import { CLASS_NODES, CLASS_BY_ID, childrenOf, type ClassNode } from '../../game/rpg/classTree';
import { CLASS_PROFILES } from '../../game/data/classProfiles';
import { ClassIcon } from './ClassIcon';
import { ClassPerks } from './ClassPerks';
import { SpecDetail, staticRequirements } from './SpecBrowser';
import { subclassKind } from './parts';

const bases = CLASS_NODES.filter(n => n.tier === 1);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ROLES = ['Todos', 'Dano', 'Tanque', 'Suporte', 'Controle', 'Híbrido'] as const;

/** Enciclopédia de classes: consulta livre (sem exigir desbloqueio) de toda a trilha, de Aprendiz até as especializações. */
export function Encyclopedia({ character }: { character?: Character }) {
  const [q, setQ] = useState(''), [role, setRole] = useState<(typeof ROLES)[number]>('Todos');
  const [baseId, setBaseId] = useState(character?.profile.classPath[1] ?? bases[0].id), [specId, setSpecId] = useState<string | null>(null);
  const needle = norm(q.trim());
  const rows = useMemo(() => bases.map(base => {
    const kids = childrenOf(base.id), hit = (n: ClassNode) => !needle || norm(`${n.name} ${n.specialty}`).includes(needle);
    const roleOk = role === 'Todos' || CLASS_PROFILES[base.id]?.role === role;
    const matchedKids = kids.filter(hit);
    return { base, kids, matchedKids, show: roleOk && (hit(base) || matchedKids.length > 0) };
  }).filter(r => r.show), [needle, role]);
  const base = CLASS_BY_ID[baseId] ?? bases[0], spec = specId ? CLASS_BY_ID[specId] : undefined;
  const mine = character?.profile.classPath ?? [];
  const pick = (b: string, s: string | null) => { setBaseId(b); setSpecId(s); };
  return <div className="cl-wiki" aria-label="Enciclopédia de classes">
    <div className="cl-wiki-bar">
      <input type="search" className="cl-search" placeholder="Buscar classe ou especialização…" aria-label="Buscar classe ou especialização" value={q} onChange={e => setQ(e.target.value)} />
      <div className="he-chips" role="group" aria-label="Filtrar por papel">{ROLES.map(r => <button type="button" key={r} aria-pressed={role === r} className={`pk-btn sm ${role === r ? 'on' : ''}`} onClick={() => setRole(r)}>{r}</button>)}</div>
    </div>
    <div className="cl-wiki-grid">
      <ol className="cl-trails" aria-label="Trilhas">{rows.map(({ base: b, kids, matchedKids }) => <li key={b.id} className={`pk-panel flat cl-trail ${b.id === baseId ? 'sel' : ''}`}>
        <button type="button" className="cl-trail-head" aria-label={`Abrir ${b.name}`} onClick={() => pick(b.id, null)}>
          <span className="cl-path muted">Aprendiz ›</span><ClassIcon node={b} size="sm" /><b>{b.name}</b><small className="muted">{CLASS_PROFILES[b.id]?.role} · {b.specialty}</small>{mine.includes(b.id) && <span className="pk-tag ok">Seu caminho</span>}</button>
        <div className="cl-trail-specs" role="list">{(needle ? matchedKids : kids).map(k => <button type="button" role="listitem" key={k.id} title={`${k.name} — ${k.specialty}`} aria-label={`${b.name} › ${k.name}`} className={`cl-trail-spec ${k.id === specId ? 'sel' : ''} ${mine.includes(k.id) ? 'here' : ''}`} onClick={() => pick(b.id, k.id)}>
          <ClassIcon node={k} size="sm" /><span>{k.name}</span></button>)}</div>
      </li>)}{!rows.length && <li className="empty-state">Nada encontrado para essa busca.</li>}</ol>
      <div className="cl-wiki-detail">
        <nav className="cl-crumbs muted" aria-label="Trilha">Aprendiz › <b>{base.name}</b>{spec && <> › <b>{spec.name}</b></>}</nav>
        {spec ? <SpecDetail node={spec} character={character} /> : <div className="pk-panel flat"><p className="cl-note">Entrada: {staticRequirements(base).map(r => r.text).join(' + ')}</p><ClassPerks nodeId={base.id} />
          <p className="cl-note">Especializações ({subclassKind(childrenOf(base.id)[0] ?? base)} e mais): escolha uma na lista ao lado para ver requisitos, passiva, magia e mecânica final.</p></div>}
      </div>
    </div>
  </div>;
}
