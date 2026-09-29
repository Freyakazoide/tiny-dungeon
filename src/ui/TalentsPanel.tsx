import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Character, GameState, Stats, TalentDef } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { CLASSES } from '../game/data/classes';
import { TALENT_EFFECT_NAMES, talentById, talentsForClass } from '../game/data/talents';
import { characterStats, spentTalentPoints, talentAvailability, talentBonus, talentBonusText, talentRespecCost } from '../game/systems/progression';
import { colorHex, statNames } from './format';

type Confirmation='invest'|'respec'|null;
const percentStats=new Set<keyof Stats>(['crit','resistance']);

function valueText(key:keyof Stats,value:number){
  if(percentStats.has(key))return `${Math.round(value*1000)/10}%`;
  if(key==='attackSpeed')return `${value.toFixed(2)}/s`;
  return String(Math.round(value));
}

function previewCharacter(character:Character,talent:TalentDef){
  const preview:Character={...character,talents:{...character.talents}};
  preview.talents[talent.id]=(preview.talents[talent.id]??0)+1;
  return preview;
}

function TalentNode({character,talent,selected,onSelect}:{character:Character;talent:TalentDef;selected:boolean;onSelect:()=>void}){
  const rank=character.talents[talent.id]??0;
  const availability=talentAvailability(character,talent);
  const status=rank>=talent.max?'maxed':rank>0?'acquired':availability.available?'available':'locked';
  return <button className={`talent-node ${status} ${selected?'selected':''}`} onClick={onSelect} aria-label={`${talent.name}, ${rank} de ${talent.max}`}>
    <span className="talent-icon" aria-hidden="true">{talent.icon}</span>
    <span className="talent-node-copy"><strong>{talent.name}</strong><small>{status==='locked'?availability.reason:talentBonusText(talent)}</small></span>
    <b>{rank}/{talent.max}</b>
  </button>;
}

export function TalentsPanel({state,selected,setSelected}:{state:GameState;selected:string;setSelected:(id:string)=>void}){
  const character=state.characters.find(entry=>entry.id===selected)??state.characters[0];
  const talents=talentsForClass(character.classId);
  const [selectedTalentId,setSelectedTalentId]=useState(talents[0].id);
  const [confirmation,setConfirmation]=useState<Confirmation>(null);
  useEffect(()=>{setSelectedTalentId(talentsForClass(character.classId)[0].id);setConfirmation(null);},[character.id,character.classId]);
  const selectedCandidate=talentById(selectedTalentId);
  const selectedTalent=selectedCandidate?.classId===character.classId?selectedCandidate:talents[0];
  const availability=talentAvailability(character,selectedTalent);
  const rank=character.talents[selectedTalent.id]??0;
  const spent=spentTalentPoints(character),respecCost=talentRespecCost(character);
  const currentStats=characterStats(character,state);
  const nextStats=useMemo(()=>characterStats(previewCharacter(character,selectedTalent),state),[character,selectedTalent,state]);
  const changedStats=(Object.keys(currentStats) as (keyof Stats)[]).filter(key=>Math.abs(nextStats[key]-currentStats[key])>.0001);
  const currentEffect=talentBonus(character,selectedTalent.effect);
  const nextEffect=currentEffect+selectedTalent.value;
  const classDef=CLASSES[character.classId];
  const requirements=selectedTalent.requires??[];
  return <section className="talents-panel" style={{'--class-color':colorHex(classDef.color)} as CSSProperties}>
    <div className="section-heading"><div><span className="eyebrow">Especialização</span><h2>Árvore de talentos</h2></div><div className="talent-currency"><span>Pontos disponíveis</span><b>✦ {character.talentPoints}</b></div></div>
    <div className="talent-character-tabs" role="list" aria-label="Personagens">{state.characters.map(entry=><button key={entry.id} className={entry.id===character.id?'active':''} onClick={()=>setSelected(entry.id)}><span style={{background:colorHex(CLASSES[entry.classId].color)}}>{entry.name.slice(0,1)}</span><b>{entry.name}</b><small>{CLASSES[entry.classId].name} · Nv. {entry.level}</small><em>✦ {entry.talentPoints}</em></button>)}</div>
    <div className="talent-workspace">
      <div className="talent-tree-card">
        <div className="talent-tree-heading"><div><span className="class-label">{classDef.name}</span><h3>Caminhos de especialização</h3></div><small>Escolha um caminho; não é necessário adquirir todos os talentos.</small></div>
        <div className="talent-tree">{([1,2,3] as const).map(tier=><div className={`talent-tier tier-${tier}`} key={tier}><div className="tier-label"><b>Nível {tier}</b><small>{tier===1?'Fundamentos':tier===2?'Especialização':'Maestria'}</small></div><div className="tier-nodes">{talents.filter(talent=>talent.tier===tier).sort((a,b)=>a.column-b.column).map(talent=><TalentNode key={talent.id} character={character} talent={talent} selected={selectedTalent.id===talent.id} onSelect={()=>{setSelectedTalentId(talent.id);setConfirmation(null);}}/>)}</div></div>)}</div>
        <div className="talent-legend"><span><i className="available"/>Disponível</span><span><i className="acquired"/>Adquirido</span><span><i className="maxed"/>Completo</span><span><i className="locked"/>Bloqueado</span></div>
      </div>
      <aside className="talent-detail-card">
        <div className="talent-detail-title"><span className="talent-icon">{selectedTalent.icon}</span><div><span>{TALENT_EFFECT_NAMES[selectedTalent.effect]}</span><h3>{selectedTalent.name}</h3><small>Nível {rank} / {selectedTalent.max}</small></div></div>
        <p>{selectedTalent.description}</p>
        <dl className="talent-facts"><div><dt>Bônus por nível</dt><dd>{talentBonusText(selectedTalent)}</dd></div><div><dt>Nível necessário</dt><dd>{selectedTalent.requiredLevel}</dd></div><div><dt>Pré-requisitos</dt><dd>{requirements.length?requirements.map(requirement=>{const required=talentById(requirement.talentId);return `${required?.name??requirement.talentId} ${(character.talents[requirement.talentId]??0)}/${requirement.rank}`;}).join(', '):'Nenhum'}</dd></div></dl>
        <div className="talent-comparison"><h4>Próximo nível</h4>{rank>=selectedTalent.max?<p className="talent-status-note success">Talento completamente evoluído.</p>:changedStats.length?changedStats.map(key=><div key={key}><span>{statNames[key]}</span><b>{valueText(key,currentStats[key])}</b><i>→</i><strong>{valueText(key,nextStats[key])}</strong></div>):<div><span>{TALENT_EFFECT_NAMES[selectedTalent.effect]}</span><b>{Math.round(currentEffect*1000)/10}%</b><i>→</i><strong>{Math.round(nextEffect*1000)/10}%</strong></div>}</div>
        {!availability.available&&rank<selectedTalent.max&&<p className="talent-status-note">{availability.reason}</p>}
        {confirmation==='invest'?<div className="talent-confirm"><p>Investir 1 ponto em <b>{selectedTalent.name}</b>?</p><div><button onClick={()=>setConfirmation(null)}>Cancelar</button><button className="primary" onClick={()=>{gameStore.invest(character.id,selectedTalent.id);setConfirmation(null);}}>Confirmar</button></div></div>:<button className="talent-invest" disabled={!availability.available} onClick={()=>setConfirmation('invest')}>Investir 1 ponto</button>}
        <div className="respec-box"><div><span>Redistribuição</span><b>{spent} {spent===1?'ponto investido':'pontos investidos'}</b><small>Custo: {respecCost} ouro · Saldo: {state.gold}</small></div>{confirmation==='respec'?<div className="talent-confirm"><p>Devolver {spent} pontos e pagar <b>{respecCost} ouro</b>?</p>{state.gold<respecCost&&<small>Ouro insuficiente para redistribuir.</small>}<div><button onClick={()=>setConfirmation(null)}>Cancelar</button><button className="danger" disabled={state.gold<respecCost} onClick={()=>{gameStore.respecTalents(character.id);setConfirmation(null);}}>Redistribuir</button></div></div>:<button disabled={!spent} onClick={()=>setConfirmation('respec')}>Redistribuir talentos</button>}</div>
      </aside>
    </div>
  </section>;
}
