import type { OfflineReport } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';
import { PROFICIENCIES } from '../game/rpg/proficiencies';
import { duration } from './format';
import { uiStore } from './uiStore';

/** Corpo do modal "Bem-vindo de volta!": o relatório offline (tempo fora, hunt de referência, XP, ouro e tries por vaga). */
export function WelcomeBack({ report }: { report: OfflineReport }) {
  const levels = (n: number) => n > 0 ? ` (+${n} ${n === 1 ? 'nível' : 'níveis'})` : '';
  return <div>
    <p className="offline-line">Você ficou fora por <b>{duration(report.seconds)}</b>.{report.huntEnded && ' A caçada foi encerrada: inicie de novo quando quiser.'}</p>
    {report.hunt && <p className="offline-line">A hunt mais avançada (<b>{report.hunt}</b>) rendeu {Math.round((report.share ?? 0) * 100)}% durante esse tempo{report.gold ? ` · +${report.gold.toLocaleString('pt-BR')} ouro` : ''}.</p>}
    <div className="grid">{report.entries.map(entry => <div className="card" key={entry.name}><h3>{entry.name}</h3>
      {entry.xp > 0 && <div className="kv"><span>XP</span><b>+{entry.xp.toLocaleString('pt-BR')}{levels(entry.levelsGained)}</b></div>}
      {entry.training.map(t => <div className="kv" key={t.target}><span>Treino: {PROFICIENCIES[t.target].name}</span><b>+{t.tries.toLocaleString('pt-BR')} tries{levels(t.levelsGained)}</b></div>)}
      {entry.xp <= 0 && !entry.training.length && <span className="muted">Sem ganhos.</span>}</div>)}</div>
    <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}><button className="btn primary" autoFocus onClick={() => { gameStore.dismissOfflineReport(); uiStore.close(); }}>Continuar</button></div>
  </div>;
}
