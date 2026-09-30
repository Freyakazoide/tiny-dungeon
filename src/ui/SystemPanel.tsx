import { useRef, useState, type ChangeEvent } from 'react';
import { gameStore, importGameBackup, resetGame, saveNow } from '../game/core/GameStore';
import { exportBackup } from '../game/persistence/backup';
import { runtime } from '../game/rpg/runtime';
import { uiStore, useUi } from './uiStore';

/** Abas do modal Sistema; "Dev" só existe em `npm run dev`. */
export const SYSTEM_TABS: readonly string[] = import.meta.env.DEV ? ['Backup', 'Opções', 'Dev'] : ['Backup', 'Opções'];

function Backup() {
  const [message, setMessage] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const download = async () => {
    await saveNow();
    const url = URL.createObjectURL(new Blob([exportBackup(gameStore.getSnapshot())], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `tiny-dungeon-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Backup exportado.');
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0]; event.target.value = ''; if (!f) return;
    try { const restored = await importGameBackup(await f.text()); uiStore.select(restored.team[0] ?? restored.characters[0]?.id ?? ''); setMessage('Backup validado e restaurado.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível importar o backup.'); }
  };
  const [typed, setTyped] = useState(''), [confirm, setConfirm] = useState(false);
  return <>
    <div className="system-block"><h3>Backup</h3><p>Exporta ou restaura todo o progresso em um arquivo JSON.</p>
      <div className="system-actions"><button onClick={() => void download()}>Exportar backup</button><button onClick={() => file.current?.click()}>Importar backup</button><input ref={file} hidden type="file" accept="application/json,.json" onChange={e => void upload(e)} /></div>
      {message && <output>{message}</output>}</div>
    <div className="system-block"><h3>Reiniciar jogo</h3><p>Apaga o save e volta à criação dos 3 personagens. Exporte um backup antes se quiser guardar o progresso.</p>
      {confirm
        ? <div className="talent-confirm"><p>Para apagar todo o progresso, digite <b>REINICIAR</b>:</p><input aria-label="Confirmação" value={typed} onChange={e => setTyped(e.target.value)} />
          <div><button onClick={() => { setConfirm(false); setTyped(''); }}>Cancelar</button><button className="danger" disabled={typed !== 'REINICIAR'} onClick={() => { void resetGame(); uiStore.close(); }}>Apagar e recomeçar</button></div></div>
        : <button className="danger" onClick={() => setConfirm(true)}>Reiniciar jogo…</button>}</div>
  </>;
}

function Options() {
  const { options } = useUi();
  return <div className="system-block"><h3>Opções</h3>
    <label className="kv"><span>Reduzir movimento</span><input type="checkbox" checked={options.reduceMotion} onChange={e => uiStore.setOption('reduceMotion', e.target.checked)} /></label>
    <label className="kv"><span>Pausar a caçada ao abrir menus</span><input type="checkbox" checked={options.pauseOnMenu} onChange={e => uiStore.setOption('pauseOnMenu', e.target.checked)} /></label>
    <label className="kv"><span>Escala da interface</span><select value={options.scale} onChange={e => uiStore.setOption('scale', +e.target.value as 90 | 100 | 115)}><option value={90}>90%</option><option value={100}>100%</option><option value={115}>115%</option></select></label>
    <p className="muted sm-t">As opções ficam salvas neste navegador. O movimento também é reduzido automaticamente se o sistema pedir (prefers-reduced-motion).</p></div>;
}

function Dev() {
  return <div className="system-block"><h3>Desenvolvimento</h3>
    <p>Console do navegador: <code>dev.list()</code>, <code>dev.timeScale(1000)</code>, <code>dev.xpScale(n)</code>, <code>dev.monsterScale(hp, atk)</code>, <code>dev.setLevel(id, n)</code>, <code>dev.setProf(id, 'melee', 25)</code>, <code>dev.addTries(id, 'fire', n)</code>, <code>dev.addCounter(id, 'crits', n)</code>, <code>dev.evolve(id, 'guerreiro', {'{ force: true }'})</code>, <code>dev.giveGear(id, 'mythic')</code>, <code>dev.fastForwardOffline(h)</code>.</p>
    <small>Multiplicadores atuais: treino ×{runtime.trainScale} · XP ×{runtime.xpScale} · monstros HP ×{runtime.monsterHp} / ataque ×{runtime.monsterAtk}</small></div>;
}

export function SystemPanel({ tab }: { tab: string }) {
  return <section className="system-panel">{tab === 'Opções' ? <Options /> : tab === 'Dev' && import.meta.env.DEV ? <Dev /> : <Backup />}</section>;
}
