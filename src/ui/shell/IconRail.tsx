import { useState } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { railBadges } from '../badges';
import { RAIL_ITEMS } from '../navigation';
import { uiStore, useUi } from '../uiStore';

/** Trilho de ícones à esquerda (barra inferior no mobile): clicar abre o modal, clicar de novo fecha; o ativo tem aria-pressed. */
export function IconRail({ state, selected }: { state: GameState; selected: Character | undefined }) {
  const ui = useUi(), badges = railBadges(state, selected);
  const [tipTop, setTipTop] = useState(0);
  return <nav className="rail" aria-label="Menus do jogo">{RAIL_ITEMS.map(item => {
    const badge = badges[item.id];
    return <div key={item.id} style={{ display: 'contents' }}>
      {item.bottom && <div className="sp" />}
      <button type="button" className="rail-btn" data-rail={item.id} aria-label={item.title} aria-pressed={ui.modal === item.id}
        onMouseEnter={event => setTipTop(event.currentTarget.getBoundingClientRect().top)} onFocus={event => setTipTop(event.currentTarget.getBoundingClientRect().top)}
        onClick={() => uiStore.toggle(item.id)}>
        <Icon name={item.id} size={48} /><small>{item.title.slice(0, 6)}</small>
        {badge && <Badge tone={badge.tone} pulse={badge.pulse} title={badge.why}>{badge.value}</Badge>}
        <span className="tip" style={{ top: tipTop + 26 }}>{item.title}{item.key && <kbd>{item.key}</kbd>}</span>
      </button></div>;
  })}</nav>;
}
