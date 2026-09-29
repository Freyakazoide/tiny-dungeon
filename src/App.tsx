import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { PhaserGame } from './PhaserGame';
import { gameStore, importGameBackup, saveNow } from './game/core/GameStore';
import { exportBackup } from './game/persistence/backup';
import { AnalyzerPanel } from './ui/AnalyzerPanel';
import { CharactersPanel } from './ui/CharactersPanel';
import { Header } from './ui/Header';
import { InventoryPanel } from './ui/InventoryPanel';
import { SpellsPanel } from './ui/SpellsPanel';
import { TalentsPanel } from './ui/TalentsPanel';
import { TeamPanel } from './ui/TeamPanel';

type Tab='Analyzer'|'Personagens'|'Talentos'|'Magias'|'Inventário';
const tabs:Tab[]=['Analyzer','Personagens','Talentos','Magias','Inventário'];

function App(){
  const state=useSyncExternalStore(gameStore.subscribe,gameStore.getSnapshot);const [tab,setTab]=useState<Tab>('Analyzer');const [selected,setSelected]=useState(state.team[0]??state.characters[0].id);const [backupMessage,setBackupMessage]=useState('');const fileInput=useRef<HTMLInputElement>(null);
  const downloadBackup=async()=>{await saveNow();const blob=new Blob([exportBackup(gameStore.getSnapshot())],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`tiny-dungeon-${new Date().toISOString().slice(0,10)}.json`;document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setBackupMessage('Backup exportado.');};
  const uploadBackup=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const restored=await importGameBackup(await file.text());setSelected(restored.team[0]??restored.characters[0].id);setBackupMessage('Backup validado e restaurado.');}catch(error){setBackupMessage(error instanceof Error?error.message:'Não foi possível importar o backup.');}};
  return <div id="app"><Header state={state} onExport={()=>void downloadBackup()} onImport={event=>void uploadBackup(event)} fileInput={fileInput} message={backupMessage}/><main className="app-shell"><div className="game-column"><div className="map-frame"><PhaserGame/></div><nav className="main-tabs" aria-label="Seções do jogo">{tabs.map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name==='Analyzer'?'Hunt Analyzer':name}</button>)}</nav><div className="tab-content stone-panel">{tab==='Analyzer'&&<AnalyzerPanel state={state}/>} {tab==='Personagens'&&<CharactersPanel state={state} selected={selected} setSelected={setSelected}/>} {tab==='Talentos'&&<TalentsPanel state={state} selected={selected} setSelected={setSelected}/>} {tab==='Magias'&&<SpellsPanel state={state} selected={selected}/>} {tab==='Inventário'&&<InventoryPanel state={state} selectedCharacter={selected}/>}</div></div><TeamPanel state={state} selected={selected} setSelected={id=>{setSelected(id);setTab('Personagens')}} onAnalyzer={()=>setTab('Analyzer')}/></main></div>;
}

export default App;
