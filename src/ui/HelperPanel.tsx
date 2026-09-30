import type { Character, GameState, HelperConfig } from '../game/core/types';
import { gameStore } from '../game/core/GameStore';

const PCT: { key: 'hpPotionAt' | 'manaPotionAt' | 'defensiveAmuletAt' | 'emergencyAt'; label: string; help: string }[] = [
  { key: 'hpPotionAt', label: 'Usar poção de vida abaixo de', help: 'Quando o HP do personagem cai até este %, ele toma a poção mais barata que cobre o déficit.' },
  { key: 'manaPotionAt', label: 'Usar poção de mana abaixo de', help: 'Mesmo critério para a mana.' },
  { key: 'defensiveAmuletAt', label: 'Amuleto defensivo abaixo de', help: 'Reservado para o amuleto defensivo.' },
  { key: 'emergencyAt', label: 'Emergência abaixo de', help: 'Limite de emergência do personagem.' },
];

/** Helper: a automação do personagem (poções e avisos) e o avanço automático da wave, num lugar só. */
export function HelperPanel({ state, character }: { state: GameState; character: Character }) {
  const set = (patch: Partial<HelperConfig>) => gameStore.setHelper(character.id, patch);
  const h = character.helper;
  return <section className="helper-panel">
    <div className="grid g2">
      <div className="card"><h3>Poções de {character.name}</h3>
        <label className="kv"><span>Usar poções automaticamente</span><input type="checkbox" checked={h.autoSupplies} onChange={e => set({ autoSupplies: e.target.checked })} /></label>
        {PCT.map(p => <label className="kv" key={p.key} title={p.help}><span>{p.label}</span><span><input aria-label={p.label} type="number" min={0} max={100} value={h[p.key]} onChange={e => set({ [p.key]: +e.target.value })} style={{ width: 64 }} /> %</span></label>)}
        <p className="muted sm-t">Dica: o custo de poções é o sinal real de dificuldade. Suba os limites em hunts perigosas e desça nas fáceis.</p></div>
      <div className="grid"><div className="card"><h3>Grupo</h3>
        <label className="kv"><span>Avanço automático da wave</span><input type="checkbox" checked={state.autoAdvance} onChange={e => gameStore.setAutoAdvance(e.target.checked)} /></label>
        <label className="kv"><span>Curar aliados</span><input type="checkbox" checked={h.healAllies} onChange={e => set({ healAllies: e.target.checked })} /></label>
        <label className="kv"><span>Sem poções</span><select value={h.outOfSupplies} onChange={e => set({ outOfSupplies: e.target.value as HelperConfig['outOfSupplies'] })}><option value="continue">Continuar caçando</option><option value="end">Encerrar a caçada</option></select></label></div>
      <div className="note">Magias e condições de uso ficam em <b>Personagem › Magias</b>. Avisos de Horda e pausa por poções baixas entram numa próxima fase.</div></div>
    </div></section>;
}
