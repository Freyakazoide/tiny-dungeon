import { useEffect, useRef, type ReactNode } from 'react';
import type { Character, GameState } from '../../game/core/types';
import { gameStore } from '../../game/core/GameStore';
import { AnalyzerPanel } from '../AnalyzerPanel';
import { CharacterPanel } from '../CharacterPanel';
import { ClassesPanel } from '../ClassesPanel';
import { GroupPanel } from '../GroupPanel';
import { HelperPanel } from '../HelperPanel';
import { HuntSelector } from '../HuntSelector';
import { ItemsPanel } from '../ItemsPanel';
import { ProgressPanel } from '../ProgressPanel';
import { SYSTEM_TABS, SystemPanel } from '../SystemPanel';
import { WelcomeBack } from '../WelcomeBack';
import { Modal, type ModalSize } from '../components/Modal';
import { Tabs, type TabBadge } from '../components/Tabs';
import { Avatar } from '../components/Avatar';
import { talentPointsAvailable } from '../../game/systems/talentGrid';
import { groupAlerts } from '../../game/systems/group';
import { groupClasses } from '../../game/systems/guide';
import { potionPercent } from '../badges';
import { GEAR_BAG_CAPACITY } from '../../game/data/balance';
import { slotsUsed } from '../../game/systems/loot';
import { gearSlots } from '../../game/systems/gear';
import { GoldChip } from '../items/parts';
import { classLabel } from '../../game/systems/progression';
import { CHARACTER_TABS, type CharacterTab, type ModalId } from '../navigation';
import { takeReturnFocus, uiStore, useUi } from '../uiStore';

export interface ModalCtx { state: GameState; character: Character; tab: string; }
export interface ModalDef {
  title: string; subtitle: string; icon: string; tabs: readonly string[];
  /** mostra o seletor de personagem no cabeçalho */
  who?: boolean; gold?: boolean; bodyClass?: string; tabIcons?: Record<string, string>; tabBadges?: (ctx: ModalCtx) => Record<string, TabBadge | undefined>; size?: (tab: string) => ModalSize; render: (ctx: ModalCtx) => ReactNode;
}

/** Definição de cada menu: abas, tamanho e o painel que o preenche (os painéis são os componentes de sempre, agora dentro de modais). */
export const MODALS: Record<Exclude<ModalId, 'bemvindo'>, ModalDef> = {
  personagem: { title: 'Personagem', subtitle: 'Ficha, proficiências, magias e talentos', icon: 'personagem', who: true, tabs: CHARACTER_TABS,
    tabIcons: { Ficha: 'personagem', 'Proficiências': 'prof_melee', Magias: 'stat_magic', Talentos: 'stat_xp' },
    tabBadges: ({ character }) => { const free = talentPointsAvailable(character), equipped = character.spellSlots.length; return { Magias: { value: equipped, title: `${equipped} magias equipadas` }, ...(free > 0 ? { Talentos: { value: free, gold: true, title: `${free} pontos de talento livres` } } : {}) }; }, size: tab => tab === 'Talentos' ? 'xl' : 'md',
    render: ({ state, character, tab }) => <CharacterPanel state={state} selected={character.id} setSelected={uiStore.select} tab={tab as CharacterTab} /> },
  itens: { title: 'Itens', subtitle: 'Equipamento, mochila e suprimentos', icon: 'itens', who: true, gold: true, tabs: ['Equipamento', 'Mochila', 'Suprimentos'],
    tabIcons: { Equipamento: 'slot_armor', Mochila: 'itens', Suprimentos: 'stat_hp' },
    tabBadges: ({ state }) => { const hp = potionPercent(state); const used = slotsUsed(state.inventory.bp) + slotsUsed(state.inventory.loot) + gearSlots(state.gearBag); return { Mochila: { value: `${used}/${state.inventory.capacity.bp + GEAR_BAG_CAPACITY}`, title: 'Ocupação da mochila' }, ...(hp < 40 ? { Suprimentos: { value: '!', gold: true, title: `Poções de vida em ${hp}% do estoque confortável` } } : {}) }; },
    render: ({ state, character, tab }) => <ItemsPanel state={state} character={character} section={tab === 'Equipamento' ? 'equipment' : tab === 'Mochila' ? 'bag' : 'supplies'} /> },
  comercio: { title: 'Comércio', subtitle: 'Loja, ferreiro e venda', icon: 'comercio', gold: true, tabs: ['Loja', 'Ferreiro', 'Vender'], tabIcons: { Loja: 'stat_hp', Ferreiro: 'slot_weapon', Vender: 'stat_gold' },
    render: ({ state, character, tab }) => <ItemsPanel state={state} character={character} section={tab === 'Loja' ? 'shop' : tab === 'Ferreiro' ? 'smith' : 'sell'} /> },
  classes: { title: 'Classes', subtitle: 'Guia de evolução: o que treinar para o próximo passo', icon: 'classes', who: true, tabs: ['Próximo passo', 'Árvore completa'], size: () => 'xl', bodyClass: 'cl-body', tabIcons: { 'Próximo passo': 'classes', 'Árvore completa': 'hunts' },
    tabBadges: ({ state, character }) => { const n = groupClasses(character).ready.length; void state; return n > 0 ? { 'Próximo passo': { value: n, gold: true, title: `${n} classes prontas para evoluir` } } : {}; },
    render: ({ state, character, tab }) => <ClassesPanel state={state} character={character} section={tab === 'Próximo passo' ? 'next' : 'tree'} /> },
  grupo: { title: 'Grupo', subtitle: 'Formação, tanque e reservas', icon: 'grupo', tabs: ['Formação', 'Reservas'], size: () => 'xl', bodyClass: 'gp-body', tabIcons: { Formação: 'grupo', Reservas: 'personagem' },
    tabBadges: ({ state }) => { const alerts = groupAlerts(state).filter(a => a.kind !== 'allOk'), reserves = state.characters.length - state.team.length; return { ...(alerts.length ? { Formação: { value: alerts.length, gold: alerts.some(a => a.level === 'warn' || a.level === 'bad'), title: `${alerts.length} alertas na formação` } } : {}), ...(reserves > 0 ? { Reservas: { value: reserves, title: `${reserves} fora da equipe` } } : {}) }; },
    render: ({ state, tab }) => <GroupPanel state={state} section={tab === 'Formação' ? 'formation' : 'reserves'} /> },
  hunts: { title: 'Hunts', subtitle: 'Escolha onde caçar', icon: 'hunts', tabs: ['Mapas'], size: () => 'xl', bodyClass: 'hn-body', render: ({ state }) => <HuntSelector state={state} /> },
  analyzer: { title: 'Analyzer', subtitle: 'Métricas da sessão', icon: 'analyzer', tabs: ['Sessão'], render: ({ state }) => <AnalyzerPanel state={state} /> },
  helper: { title: 'Helper', subtitle: 'Automação de poções e avanço', icon: 'helper', who: true, tabs: ['Automação'], render: ({ state, character }) => <HelperPanel state={state} character={character} /> },
  progressao: { title: 'Progressão', subtitle: 'Metas, portas e marcos', icon: 'progressao', who: true, tabs: ['Metas'], render: ({ state, character }) => <ProgressPanel state={state} character={character} /> },
  charms: { title: 'Charms', subtitle: 'Em breve', icon: 'charms', tabs: ['Em breve'], size: () => 'sm',
    render: ({ state }) => <div className="empty-state">Os charms já existem no jogo ({state.charmPoints} pontos · {state.equippedCharms.length}/{state.charmSlots} equipados · {state.unlockedCharms.length} desbloqueados), mas ainda não têm tela.</div> },
  sistema: { title: 'Sistema', subtitle: 'Backup, opções e desenvolvimento', icon: 'sistema', tabs: SYSTEM_TABS, size: () => 'sm', render: ({ tab }) => <SystemPanel tab={tab} /> },
};
export const tabsOf = (id: ModalId): string[] => id === 'bemvindo' ? [] : [...MODALS[id].tabs];

/** Monta o modal aberto: deep link, personagem selecionado, pausa opcional, foco devolvido ao ícone e o relatório offline. */
export function ModalHost({ state }: { state: GameState }) {
  const ui = useUi();
  const id = ui.modal;
  const character = state.characters.find(c => c.id === ui.selected) ?? state.characters.find(c => c.id === state.team[0]) ?? state.characters[0];
  const wasOpen = useRef<ModalId | null>(null), pausedByMenu = useRef(false);

  useEffect(() => {
    if (id && !wasOpen.current && ui.options.pauseOnMenu && gameStore.getSnapshot().status === 'running') { gameStore.pause(); pausedByMenu.current = true; }
    if (!id && wasOpen.current) {
      if (pausedByMenu.current) { pausedByMenu.current = false; gameStore.resume(); }
      const target = takeReturnFocus();
      if (target && target.isConnected) target.focus(); else document.querySelector<HTMLElement>(`[data-rail="${wasOpen.current}"]`)?.focus();
      if (wasOpen.current === 'bemvindo') gameStore.dismissOfflineReport();
    }
    wasOpen.current = id;
  }, [id, ui.options.pauseOnMenu]);

  if (!id || !character) return null;
  if (id === 'bemvindo') {
    return state.offlineReport ? <Modal title="Bem-vindo de volta!" subtitle="O que rendeu enquanto você esteve fora" icon="personagem" size="sm" footerHint="" onClose={uiStore.close}><WelcomeBack report={state.offlineReport} /></Modal> : null;
  }
  const def = MODALS[id], tab = ui.tab && def.tabs.includes(ui.tab) ? ui.tab : def.tabs[0];
  const chips = def.who && <div className="who" role="group" aria-label="Personagem">{state.characters.map(c =>
    <button key={c.id} type="button" className={c.id === character.id ? 'on' : ''} aria-pressed={c.id === character.id} aria-label={c.name} onClick={() => uiStore.select(c.id)}><span className="av"><Avatar character={c} /></span><span>{c.name}<small>{classLabel(c)} · Nv {c.profile.level}</small></span></button>)}</div>;
  return <Modal key={id} bodyClass={def.bodyClass} title={def.title} subtitle={def.subtitle} icon={def.icon} size={def.size?.(tab) ?? 'md'} headerExtra={def.who || def.gold ? <>{chips}{def.gold && <GoldChip gold={state.gold} style={{ marginLeft: def.who ? 12 : 'auto' }} />}</> : undefined} onClose={uiStore.close}
    tabs={def.tabs.length > 1 ? <Tabs tabs={def.tabs} value={tab} onChange={uiStore.setTab} label={`Seções de ${def.title}`} icons={def.tabIcons} badges={def.tabBadges?.({ state, character, tab })} /> : undefined}>
    {def.render({ state, character, tab })}
  </Modal>;
}
