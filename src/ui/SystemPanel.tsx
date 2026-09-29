import { useState, type ChangeEvent, type RefObject } from 'react';
import { resetGame } from '../game/core/GameStore';
import { runtime } from '../game/rpg/runtime';

/** Aba Sistema: backup, reinício do jogo e (só em desenvolvimento) o painel de ferramentas de teste. */
export function SystemPanel({ onExport, onImport, fileInput, message }: { onExport: () => void; onImport: (event: ChangeEvent<HTMLInputElement>) => void; fileInput: RefObject<HTMLInputElement | null>; message: string }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return <section className="system-panel">
    <div className="section-heading"><div><span className="eyebrow">Dados do jogo</span><h2>Sistema</h2></div></div>
    <div className="system-block"><h3>Backup</h3><p>Exporta ou restaura todo o progresso em um arquivo JSON.</p>
      <div className="system-actions"><button onClick={onExport}>Exportar backup</button><button onClick={() => fileInput.current?.click()}>Importar backup</button><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={onImport} /></div>
      {message && <output>{message}</output>}</div>
    <div className="system-block"><h3>Reiniciar jogo</h3><p>Apaga o save e volta à criação dos 3 personagens. Exporte um backup antes se quiser guardar o progresso.</p>
      {confirmReset
        ? <div className="talent-confirm"><p>Apagar todo o progresso?</p><div><button onClick={() => setConfirmReset(false)}>Cancelar</button><button className="danger" onClick={() => { void resetGame(); setConfirmReset(false); }}>Apagar e recomeçar</button></div></div>
        : <button className="danger" onClick={() => setConfirmReset(true)}>Reiniciar jogo…</button>}</div>
    {import.meta.env.DEV && <div className="system-block"><h3>Desenvolvimento</h3>
      <p>Console do navegador: <code>dev.list()</code>, <code>dev.timeScale(1000)</code>, <code>dev.xpScale(n)</code>, <code>dev.monsterScale(hp, atk)</code>, <code>dev.setLevel(id, n)</code>, <code>dev.setProf(id, 'melee', 25)</code>, <code>dev.addTries(id, 'fire', n)</code>, <code>dev.addCounter(id, 'crits', n)</code>, <code>dev.evolve(id, 'guerreiro', {'{ force: true }'})</code>, <code>dev.fastForwardOffline(h)</code>, <code>dev.setLastSeen(h)</code>, <code>dev.resetSave()</code>.</p>
      <small>Multiplicadores atuais: treino ×{runtime.trainScale} · XP ×{runtime.xpScale} · monstros HP ×{runtime.monsterHp} / ataque ×{runtime.monsterAtk}</small></div>}
  </section>;
}
