import { useState } from 'react';
import type { Character } from '../../game/core/types';
import { CLASS_NODES, CLASS_BY_ID, childrenOf, isPlayable, type ClassNode } from '../../game/rpg/classTree';
import { groupClasses, requirementRows } from '../../game/systems/guide';
import { ClassIcon } from './ClassIcon';
import { reqNeed } from './parts';
import { ClassPerks } from './ClassPerks';
import { SpecBrowser } from './SpecBrowser';

const bases = CLASS_NODES.filter(n => n.tier === 1);

function SubclassPanel({ character, node, mine, gone }: { character: Character; node: ClassNode; mine: boolean; gone: boolean }) {
  const entry = requirementRows(character, node).map(reqNeed).join(' + ');
  return <aside className="cl-subs pk-panel" aria-label={`Subclasses de ${node.name}`}>
    <div className="cl-phead"><ClassIcon node={node} size="big" /><div><div className="cl-name" style={{ fontSize: 18 }}>{node.name}</div><div className="cl-spec">{node.specialty}</div><div className="cl-spec">Entrada: {entry}</div>
      <div className="cl-tags">{mine && <span className="pk-tag ok">Seu caminho</span>}{gone && <span className="pk-tag blq">Descartada · só leitura</span>}</div></div></div>
    <ClassPerks nodeId={node.id} />
    <h4 className="pk-sec">Especializações <small>{childrenOf(node.id).length}</small></h4>
    <SpecBrowser key={node.id} base={node} character={character} />
    <p className="cl-note">Todas exigem nível 25. Você pode ver tudo, mesmo o que ainda está bloqueado, para planejar o caminho.</p>
  </aside>;
}

export function TreeTab({ character }: { character: Character }) {
  const chosen = character.profile.classPath[1];
  const [selected, setSelected] = useState<string>(chosen ?? bases[0].id), [onlyReady, setOnlyReady] = useState(false);
  const groups = character.profile.classId === 'aprendiz' ? groupClasses(character) : undefined;
  const readyIds = new Set(groups ? groups.ready.map(s => s.node.id) : []);
  const shown = onlyReady ? bases.filter(n => readyIds.has(n.id)) : bases;
  const node = CLASS_BY_ID[selected] ?? bases[0];
  return <div id="p-tree" className="cl-pane on" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div className="cl-head2"><h4 className="pk-sec" style={{ margin: 0 }}>Classes base <small>{bases.length}</small></h4>
      <label className="cl-toggle"><input type="checkbox" checked={onlyReady} onChange={e => setOnlyReady(e.target.checked)} />só as que posso evoluir agora</label></div>
    <div className="cl-tree">
      <div>
        <div className="cl-tiles" role="listbox" aria-label="Classes base">{shown.map(n => {
          const mine = chosen === n.id, gone = !!chosen && !mine;
          return <button type="button" key={n.id} role="option" aria-selected={selected === n.id} aria-label={`${n.name}${mine ? ', seu caminho' : gone ? ', descartada' : ''}${isPlayable(n.id) ? ', kit pronto' : ', kit em breve'}`}
            className={`pk-panel cl-tile ${selected === n.id ? 'sel' : ''} ${mine ? 'mine' : ''} ${gone ? 'gone' : ''}`} onClick={() => setSelected(n.id)}>
            {readyIds.has(n.id) && <span className="pk-tag ok">Pronta</span>}
            <ClassIcon node={n} /><b>{n.name}</b><small>{isPlayable(n.id) ? 'kit pronto' : '🔒 em breve'}</small></button>;
        })}</div>
        {!shown.length && <p className="empty-state">Nenhuma classe pronta ainda.</p>}
        <div className="cl-legend" style={{ marginTop: 10 }}><span style={{ '--ac': '#4fae73' } as React.CSSProperties}><i />seu caminho</span><span style={{ '--ac': '#6a727d' } as React.CSSProperties}><i />descartada (só leitura)</span><span style={{ '--ac': '#d4a93c' } as React.CSSProperties}><i />selecionada</span><span style={{ '--ac': '#e0a05c' } as React.CSSProperties}><i />kit em breve</span></div>
      </div>
      <SubclassPanel character={character} node={node} mine={chosen === node.id} gone={!!chosen && chosen !== node.id} />
    </div>
  </div>;
}
