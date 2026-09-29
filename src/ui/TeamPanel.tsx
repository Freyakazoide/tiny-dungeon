import type { CSSProperties } from 'react';
import type { GameState } from '../game/core/types';
import { CLASSES } from '../game/data/classes';
import { classLabel, xpForLevel } from '../game/systems/progression';
import { characterStats } from '../game/systems/progression';
import { analyzerMetrics } from '../game/systems/analyzer';
import { colorHex, compact, duration } from './format';
import { ProgressBar } from './ProgressBar';

export function TeamPanel({state,selected,setSelected,onAnalyzer}:{state:GameState;selected:string;setSelected:(id:string)=>void;onAnalyzer:()=>void}){
  const team=state.team.map(id=>state.characters.find(character=>character.id===id)).filter(Boolean) as GameState['characters'];const metrics=analyzerMetrics(state.analyzer);
  return <aside className="team-panel stone-panel"><div className="panel-title"><div><span className="eyebrow">Grupo ativo</span><h2>Equipe</h2></div><span className="team-count">{team.length}/4</span></div>
    <div className="team-list">{team.map(character=>{const stats=characterStats(character,state);const classDef=CLASSES[character.classId];return <button key={character.id} className={`team-card ${selected===character.id?'selected':''}`} style={{'--class-color':colorHex(classDef.color)} as CSSProperties} onClick={()=>setSelected(character.id)}><div className="team-card-head"><span className="class-gem"/><strong>{character.name}</strong><small>{classLabel(character)} · Nv. {character.profile.level}</small></div><ProgressBar compact tone="hp" value={character.hp} max={stats.maxHp} label="HP" detail={`${Math.round(character.hp)}/${stats.maxHp}`}/><ProgressBar compact tone="mana" value={character.mana} max={stats.maxMana} label="Mana" detail={`${Math.round(character.mana)}/${stats.maxMana}`}/><ProgressBar compact tone="xp" value={character.profile.xp} max={xpForLevel(character.profile.level)} label="XP" detail={`${Math.round(character.profile.xp)}/${xpForLevel(character.profile.level)}`}/></button>})}</div>
    <button className="analyzer-compact" onClick={onAnalyzer}><span className="eyebrow">Hunt Analyzer</span><div><b>{duration(metrics.activeSeconds)}</b><small>tempo ativo</small></div><div><b>{compact(metrics.dps)}</b><small>DPS</small></div><div><b>{compact(metrics.xpPerHour)}</b><small>XP/h</small></div><div className={metrics.estimatedProfit>=0?'positive':'negative'}><b>{compact(metrics.estimatedProfit)}</b><small>lucro est.</small></div></button>
  </aside>;
}
