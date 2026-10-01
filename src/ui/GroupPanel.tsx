import type { GameState } from '../game/core/types';
import { FormationTab } from './group/FormationTab';
import { ReservesTab } from './group/ReservesTab';

/** Menu Grupo: Formação (KPIs, quadro Frente/Trás, análise, cobertura, presets) e Reservas (elenco, recrutar, dispensar). */
export function GroupPanel({ state, section = 'formation' }: { state: GameState; section?: 'formation' | 'reserves' }) {
  return <section className="group-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    {section === 'reserves' ? <ReservesTab state={state} /> : <FormationTab state={state} />}
  </section>;
}
