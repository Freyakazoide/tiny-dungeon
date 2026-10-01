import { useState } from 'react';
import type { FormationPreset, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { FORMATION_PRESETS } from '../../game/systems/group';

const summary = (p: FormationPreset, state: GameState) => p.team.map(id => { const c = state.characters.find(x => x.id === id); return c ? `${c.name}${p.tank === id ? ' ★' : ''}` : null; }).filter(Boolean).join(' · ') || '—';
/** A formação atual é igual ao preset (mesma equipe, linhas e tanque)? */
export function presetMatches(p: FormationPreset, state: GameState) {
  const team = state.team.filter(id => state.characters.some(c => c.id === id));
  const ids = p.team.filter(id => state.characters.some(c => c.id === id));
  if (team.length !== ids.length || team.some(id => !ids.includes(id))) return false;
  const tank = state.characters.find(c => c.isTank && state.team.includes(c.id))?.id;
  return ids.every(id => state.characters.find(c => c.id === id)!.row === p.rows[id]) && (p.tank && ids.includes(p.tank) ? p.tank : undefined) === tank;
}

export function PresetList({ state }: { state: GameState }) {
  const [editing, setEditing] = useState<number | null>(null), [name, setName] = useState('');
  const presets = Array.from({ length: FORMATION_PRESETS }, (_, i) => state.formationPresets?.[i] ?? null);
  const save = (slot: number) => { if (gameStore.saveFormationPreset(slot, name)) setEditing(null); };
  return <div className="pk-panel" style={{ padding: 12 }}><h4 className="pk-sec">Presets de formação</h4>
    <div className="gp-presets" role="list">{presets.map((p, slot) => {
      const applied = !!p && presetMatches(p, state);
      return <div key={slot} role="listitem" className={`gp-preset ${applied ? 'on' : ''}`}>
        {editing === slot
          ? <><input aria-label={`Nome do preset ${slot + 1}`} maxLength={18} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(slot); }} autoFocus />
              <button type="button" className="pk-btn sm primary" disabled={!name.trim()} onClick={() => save(slot)}>Salvar</button><button type="button" className="pk-btn sm" onClick={() => setEditing(null)}>Cancelar</button></>
          : p
            ? <><div><b>{p.name}</b><small>{summary(p, state)}</small></div>
                <button type="button" className="pk-btn sm" disabled={applied} onClick={() => gameStore.applyFormationPreset(slot)}>{applied ? 'Aplicado' : 'Aplicar'}</button>
                <span style={{ display: 'flex', gap: 4 }}><button type="button" className="pk-btn sm" onClick={() => { setName(p.name); setEditing(slot); }}>Sobrescrever</button><button type="button" className="pk-btn sm" aria-label={`Limpar preset ${p.name}`} onClick={() => gameStore.clearFormationPreset(slot)}>✕</button></span></>
            : <><div><b className="muted">Vago</b><small>Preset {slot + 1}</small></div><span /><button type="button" className="pk-btn sm" onClick={() => { setName(''); setEditing(slot); }}>Salvar atual</button></>}
      </div>;
    })}</div></div>;
}
