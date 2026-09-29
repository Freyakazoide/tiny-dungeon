import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { PhaserGame } from './PhaserGame';
import { gameStore, importGameBackup, saveNow } from './game/core/GameStore';
import { PARTY_SIZE } from './game/core/GameEngine';
import { PROFICIENCIES } from './game/rpg/proficiencies';
import { exportBackup } from './game/persistence/backup';
import { AnalyzerPanel } from './ui/AnalyzerPanel';
import { CharacterPanel } from './ui/CharacterPanel';
import { CharacterPicker } from './ui/CharacterPicker';
import { ClassesPanel } from './ui/ClassesPanel';
import { CreationScreen } from './ui/CreationScreen';
import { duration } from './ui/format';
import { GroupPanel } from './ui/GroupPanel';
import { HuntSelector } from './ui/HuntSelector';
import { Header } from './ui/Header';
import { ItemsPanel } from './ui/ItemsPanel';
import { TABS, TABS_WITH_CHARACTER, type Tab } from './ui/navigation';
import { SystemPanel } from './ui/SystemPanel';
import { TeamPanel } from './ui/TeamPanel';

function App(){
  const state=useSyncExternalStore(gameStore.subscribe,gameStore.getSnapshot);
  const [tab,setTab]=useState<Tab>('Caçada');
  const [pick,setSelected]=useState(state.team[0]??state.characters[0]?.id??'');
  const selected=state.characters.some(c=>c.id===pick)?pick:(state.team[0]??state.characters[0]?.id??'');
  const [backupMessage,setBackupMessage]=useState('');
  const fileInput=useRef<HTMLInputElement>(null);
  const downloadBackup=async()=>{await saveNow();const blob=new Blob([exportBackup(gameStore.getSnapshot())],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`tiny-dungeon-${new Date().toISOString().slice(0,10)}.json`;document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setBackupMessage('Backup exportado.');};
  const uploadBackup=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const restored=await importGameBackup(await file.text());setSelected(restored.team[0]??restored.characters[0]?.id??'');setBackupMessage('Backup validado e restaurado.');}catch(error){setBackupMessage(error instanceof Error?error.message:'Não foi possível importar o backup.');}};
  if(state.characters.length<PARTY_SIZE)return <div id="app"><CreationScreen/></div>;
  const character=state.characters.find(c=>c.id===selected)??state.characters[0];
  const report=state.offlineReport;
  return <div id="app"><Header state={state}/>
    {report&&<aside className="offline-report stone-panel"><div><b>Bem-vindo de volta!</b> Você ficou fora por {duration(report.seconds)}.{report.huntEnded&&' A caçada foi encerrada.'}
      {report.hunt&&<p>A hunt mais avançada (<b>{report.hunt}</b>) rendeu {Math.round((report.share??0)*100)}% durante esse tempo{report.gold?` · +${report.gold.toLocaleString('pt-BR')} ouro`:''}.</p>}
      <ul>{report.huntEnded&&<li>Hunt encerrada: inicie de novo quando quiser.</li>}{report.entries.map(entry=><li key={entry.name}><b>{entry.name}</b>{entry.xp>0&&`: +${entry.xp.toLocaleString('pt-BR')} XP${entry.levelsGained>0?` (+${entry.levelsGained} ${entry.levelsGained===1?'nível':'níveis'})`:''}`}{entry.training.map(t=><span key={t.target} className="offline-slot-line"> · +{t.tries.toLocaleString('pt-BR')} tries em {PROFICIENCIES[t.target].name}{t.levelsGained>0&&` (+${t.levelsGained} ${t.levelsGained===1?'nível':'níveis'})`}</span>)}</li>)}</ul></div><button onClick={()=>gameStore.dismissOfflineReport()}>Ok</button></aside>}
    <main className="app-shell"><div className="game-column">
      {/* O Phaser dirige o tick do combate: o mapa fica sempre montado e só é escondido fora da aba Caçada. */}
      <div className="map-frame" style={tab==='Caçada'?undefined:{display:'none'}}><PhaserGame/></div>
      <nav className="main-tabs" aria-label="Seções do jogo">{TABS.map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name}</button>)}</nav>
      {TABS_WITH_CHARACTER.includes(tab)&&<CharacterPicker state={state} selected={character.id} setSelected={setSelected}/>}
      <div className="tab-content stone-panel">
        {tab==='Caçada'&&<><HuntSelector state={state}/><AnalyzerPanel state={state}/></>}
        {tab==='Grupo'&&<GroupPanel state={state}/>}
        {tab==='Personagem'&&<CharacterPanel state={state} selected={character.id} setSelected={setSelected}/>}
        {tab==='Itens'&&<ItemsPanel state={state} character={character}/>}
        {tab==='Classes'&&<ClassesPanel character={character}/>}
        {tab==='Sistema'&&<SystemPanel onExport={()=>void downloadBackup()} onImport={event=>void uploadBackup(event)} fileInput={fileInput} message={backupMessage}/>}
      </div></div>
    <TeamPanel state={state} selected={character.id} setSelected={id=>{setSelected(id);if(!TABS_WITH_CHARACTER.includes(tab))setTab('Personagem');}}/></main></div>;
}

export default App;
