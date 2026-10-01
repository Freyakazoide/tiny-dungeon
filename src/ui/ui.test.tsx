// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfflineReport } from '../game/core/types';

// O Phaser não roda no jsdom: um contêiner no lugar do mapa basta para provar que ele fica montado e visível.
vi.mock('../PhaserGame', () => ({ PhaserGame: () => <div id="game-container" data-testid="map" /> }));

import App from '../App';
import { gameStore } from '../game/core/GameStore';
import { partyState } from '../game/core/testing';
import { talentPointsAvailable, canBuy, rankOf } from '../game/systems/talentGrid';
import { TALENT_TREES } from '../game/data/talentTrees';
import { Icon } from './components/Icon';
import { railBadges, canEvolve } from './badges';
import { RAIL_ITEMS } from './navigation';
import { Hud } from './shell/Hud';
import { toastForFx } from './components/ToastHost';
import { uiStore } from './uiStore';
import { ItemsPanel } from './ItemsPanel';

const fresh = () => { const state = partyState(); gameStore.hydrate(state); return gameStore.getSnapshot(); };
beforeEach(() => { uiStore.reset(); history.replaceState(null, '', '/'); fresh(); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

const rail = () => within(screen.getByRole('navigation', { name: 'Menus do jogo' }));

describe('Fase 8 — trilho e modais', () => {
  it('o trilho renderiza os 10 ícones na ordem de RAIL_ITEMS; clicar abre o modal certo, clicar de novo fecha; o ativo tem aria-pressed', async () => {
    render(<App />); const user = userEvent.setup();
    const buttons = rail().getAllByRole('button');
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(RAIL_ITEMS.map(i => i.title));
    expect(buttons).toHaveLength(10);
    await user.click(rail().getByRole('button', { name: 'Itens' }));
    expect(screen.getByRole('dialog', { name: 'Itens' })).toBeTruthy();
    expect(rail().getByRole('button', { name: 'Itens' }).getAttribute('aria-pressed')).toBe('true');
    expect(rail().getByRole('button', { name: 'Hunts' }).getAttribute('aria-pressed')).toBe('false');
    await user.click(rail().getByRole('button', { name: 'Hunts' }));          // trocar de menu substitui o modal
    expect(screen.getByRole('dialog', { name: 'Hunts' })).toBeTruthy(); expect(screen.queryByRole('dialog', { name: 'Itens' })).toBeNull();
    await user.click(rail().getByRole('button', { name: 'Hunts' }));          // clicar no ativo fecha
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc e clicar no fundo fecham; o foco vai para o modal ao abrir e volta ao ícone ao fechar; Tab não sai do modal', async () => {
    render(<App />); const user = userEvent.setup();
    const button = rail().getByRole('button', { name: 'Personagem' });
    button.focus(); await user.click(button);
    const dialog = screen.getByRole('dialog'); expect(dialog.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 60; i++) { await user.tab(); expect(dialog.contains(document.activeElement), `Tab #${i + 1}`).toBe(true); }
    for (let i = 0; i < 5; i++) { await user.tab({ shift: true }); expect(dialog.contains(document.activeElement)).toBe(true); }
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(button);
    await user.click(button); expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId('veil')); expect(screen.queryByRole('dialog')).toBeNull(); // clique no fundo escurecido
    await user.click(button); await user.click(screen.getByRole('button', { name: 'Fechar' })); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('atalhos (C, I, K…) abrem e fecham os modais e NÃO disparam dentro de input/select/textarea', async () => {
    render(<App />); const user = userEvent.setup();
    await user.keyboard('c'); expect(screen.getByRole('dialog', { name: 'Personagem' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Renomear \/ Aparência/ }));
    const input = screen.getByLabelText('Nome do personagem');
    await user.click(input); await user.keyboard('ik');                       // digitando: nada de trocar de menu
    expect(screen.getByRole('dialog', { name: 'Personagem' })).toBeTruthy();
    await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).toBeNull();
    await user.keyboard('k'); expect(screen.getByRole('dialog', { name: 'Personagem' })).toBeTruthy(); expect(screen.getByRole('tab', { name: /Classes/ }).getAttribute('aria-selected')).toBe('true'); await user.keyboard('k'); expect(screen.queryByRole('dialog')).toBeNull();
    for (const [key, title] of [['i', 'Itens'], ['l', 'Comércio'], ['g', 'Grupo'], ['h', 'Hunts'], ['a', 'Analyzer'], ['p', 'Helper'], ['m', 'Progressão'], ['s', 'Sistema']] as const) {
      await user.keyboard(key); expect(screen.getByRole('dialog', { name: title }), key).toBeTruthy();
      await user.keyboard(key); expect(screen.queryByRole('dialog'), `${key} fecha`).toBeNull();
    }
  });

  it('com um modal aberto o engine continua avançando e o mapa continua montado e visível (nunca display:none)', async () => {
    render(<App />); const user = userEvent.setup();
    await user.keyboard('c');
    act(() => { gameStore.start(); });
    const before = gameStore.getSnapshot().analyzer.activeMs;
    act(() => { for (let i = 0; i < 20; i++) gameStore.tick(100); });
    expect(gameStore.getSnapshot().analyzer.activeMs).toBeGreaterThan(before);
    const map = screen.getByTestId('map');
    for (let el: HTMLElement | null = map; el; el = el.parentElement) expect(getComputedStyle(el).display, el.className).not.toBe('none');
    expect(map.closest('main.arena')).toBeTruthy();
  });

  it('o seletor de personagem troca com ← → e a barra da equipe abre o Personagem no personagem clicado', async () => {
    render(<App />); const user = userEvent.setup();
    const names = gameStore.getSnapshot().characters.map(c => c.name);
    await user.click(screen.getByRole('button', { name: new RegExp(`^${names[1]},`) }));
    const chip = (name: string) => within(screen.getByRole('group', { name: 'Personagem' })).getByRole('button', { name });
    expect(screen.getByRole('dialog', { name: 'Personagem' })).toBeTruthy(); expect(chip(names[1]).getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{ArrowRight}'); expect(chip(names[2]).getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{ArrowRight}'); expect(chip(names[0]).getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{ArrowLeft}'); expect(chip(names[2]).getAttribute('aria-pressed')).toBe('true');
  });

  it('abas com role tablist/tab e setas; deep link #/menu/aba abre no lugar certo', async () => {
    history.replaceState(null, '', '/#/personagem/talentos');
    render(<App />);
    const tablist = screen.getByRole('tablist', { name: /Personagem/ });
    expect(within(tablist).getByRole('tab', { name: 'Talentos' }).getAttribute('aria-selected')).toBe('true');
    const user = userEvent.setup();
    within(tablist).getByRole('tab', { name: 'Talentos' }).focus(); await user.keyboard('{ArrowLeft}');
    expect(within(tablist).getByRole('tab', { name: 'Magias' }).getAttribute('aria-selected')).toBe('true');
    expect(location.hash).toBe('#/personagem/magias');
  });
});

describe('Fase 8 — badges, HUD e relatório offline', () => {
  it('badge do Personagem = pontos de talento livres; vira '!' pulsante quando alguém pode evoluir (Classes agora é aba do Personagem)', () => {
    const state = fresh(), c = state.characters[0];
    expect(railBadges(state, c).personagem?.value).toBe(String(talentPointsAvailable(c))); expect(railBadges(state, c).personagem?.pulse).toBeUndefined();
    c.profile.level = 10; c.profile.proficiencies.melee.level = 25;
    expect(canEvolve(c)).toBe(true);
    const badges = railBadges(state, c); expect(badges.personagem).toMatchObject({ value: '!', tone: 'gold', pulse: true });
    state.inventory.supply = []; expect(railBadges(state, c).helper).toMatchObject({ tone: 'red' });
  });

  it('o HUD mostra o tier da wave, a etiqueta de risco e só tem a DevBar em desenvolvimento', () => {
    const state = fresh(); state.status = 'running'; state.waveInfo = { extra: 6, total: 10, goldStart: 0 };
    const { container, rerender } = render(<Hud state={state} />);
    expect(screen.getByText(/Horda · 10 inimigos/)).toBeTruthy(); expect(screen.getByText(/Nível rec\. 1/)).toBeTruthy(); expect(screen.getByText(/Tranquila|Adequada|Arriscada|Suicida/)).toBeTruthy();
    expect(container.querySelector('.speed')).not.toBeNull();       // vitest roda como DEV
    vi.stubEnv('DEV', false); rerender(<Hud state={{ ...state }} />);
    expect(container.querySelector('.speed')).toBeNull();            // produção: nada de DevBar
  });

  it('o relatório offline abre o modal "Bem-vindo de volta!" uma única vez e "Continuar" limpa offlineReport', async () => {
    const state = fresh(); const report: OfflineReport = { seconds: 7200, hunt: 'Catacumbas', share: .25, gold: 500, huntEnded: true, entries: [{ name: state.characters[0].name, xp: 1200, levelsGained: 2, training: [{ target: 'melee', tries: 900, levelsGained: 1 }] }] };
    state.offlineReport = report; gameStore.hydrate(state);
    render(<App />); const user = userEvent.setup();
    const dialog = screen.getByRole('dialog', { name: 'Bem-vindo de volta!' }); expect(within(dialog).getByText(/\+1\.200/)).toBeTruthy(); expect(within(dialog).getByText(/Catacumbas/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(gameStore.getSnapshot().offlineReport).toBeUndefined();
    await user.keyboard('c'); await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog', { name: 'Bem-vindo de volta!' })).toBeNull();
  });

  it('eventos do engine viram avisos (drop de equipamento, Horda/Invasão e derrota)', () => {
    expect(toastForFx({ type: 'drop', text: 'Equipamento: Espada Longa' })).toEqual({ kind: 'good', text: 'Drop: Espada Longa' });
    expect(toastForFx({ type: 'wave', text: 'Clareira — Horda (9 inimigos)' })?.kind).toBe('warn');
    expect(toastForFx({ type: 'wave', text: 'Clareira Sombria' })).toBeUndefined(); expect(toastForFx({ type: 'recovery' })?.kind).toBe('danger');
  });
});

describe('Fase 8 — itens e ícones', () => {
  it('equipamento simples e de classe aparecem no mesmo slot (o de classe tem prioridade e traz seus atributos)', () => {
    const state = fresh(), c = state.characters[0];
    const { rerender } = render(<ItemsPanel state={state} character={c} section="equipment" />);
    const slot = () => screen.getByRole('button', { name: /^Arma:/ });
    expect(slot().getAttribute('aria-label')).toMatch(/Espada Enferrujada/);
    c.gear.weapon = { uid: 'g1', baseId: 'guerreiro.espada_longa', classification: 'common', attrs: [] }; c.equipment = { ...c.equipment }; delete c.equipment.weapon;
    rerender(<ItemsPanel state={{ ...state }} character={c} section="equipment" />);
    expect(slot().getAttribute('aria-label')).toMatch(/Espada Longa/); expect(slot().getAttribute('aria-label')).not.toMatch(/Espada Enferrujada/);
  });

  it('o Icon cai no SVG genérico quando o PNG não existe, sem erro no console', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<Icon name="nao_existe" size={24} />);
    const img = container.querySelector('img')!; expect(img.getAttribute('src')).toBe('assets/ui/icons/nao_existe.png');
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull(); const svg = container.querySelector('svg')!; expect(svg.getAttribute('data-icon')).toBe('nao_existe');
    expect(errors).not.toHaveBeenCalled();
  });

  it('os 48 PNGs de ícones existem com 96×96 px (cabeçalho do arquivo)', async () => {
    const { readFileSync } = await import('node:fs'); const { join } = await import('node:path');
    const names = ['personagem', 'itens', 'comercio', 'classes', 'grupo', 'hunts', 'analyzer', 'helper', 'progressao', 'charms', 'sistema',
      ...['hp', 'mana', 'xp', 'gold', 'attack', 'defense', 'resistance', 'crit', 'speed', 'magic'].map(n => `stat_${n}`),
      ...['fire', 'ice', 'energy', 'earth', 'poison', 'holy', 'death', 'physical', 'psychic'].map(n => `elem_${n}`),
      ...['melee', 'ranged', 'defense', 'magic'].map(n => `prof_${n}`), ...['helmet', 'armor', 'legs', 'boots', 'weapon', 'offhand', 'amulet', 'ring'].map(n => `slot_${n}`),
      'status_running', 'status_paused', 'status_recovering', 'status_transition', 'badge_tank', 'badge_new'];
    expect(names).toHaveLength(48);
    for (const name of names) {
      const png = readFileSync(join(process.cwd(), 'public/assets/ui/icons', `${name}.png`));
      expect(png.subarray(1, 4).toString(), name).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]], name).toEqual([96, 96, 6]); // largura, altura, RGBA
    }
  });
});

describe('Fase 9 A — clique nos talentos só seleciona', () => {
  const setup = () => {
    const c = gameStore.getSnapshot().characters[0];
    c.profile.level = 20;
    const id = c.profile.classPath.flatMap(t => TALENT_TREES[t].nodes).find(n => n.kind === 'minor' && canBuy(c, n.id).ok)!.id;
    history.replaceState(null, '', '/#/personagem/talentos');
    render(<App />);
    const node = () => document.querySelector(`[aria-label^="${TALENT_TREES[c.profile.classPath.find(t => TALENT_TREES[t].nodes.some(n => n.id === id))!].nodes.find(n => n.id === id)!.name}, "]`) as SVGElement;
    return { c, id, node };
  };
  it('clique, Shift+clique, Enter e Espaço no nó não compram; o texto de ajuda é o novo', async () => {
    const { c, id, node } = setup(); const user = userEvent.setup(); const before = talentPointsAvailable(c);
    await user.click(node()); fireEvent.click(node(), { shiftKey: true });
    node().focus(); await user.keyboard('{Enter}'); await user.keyboard(' ');
    expect(rankOf(c, id)).toBe(0); expect(talentPointsAvailable(c)).toBe(before);
    expect(screen.queryByText(/Shift/)).toBeNull(); expect(screen.queryByText(/Toque em um nó/)).toBeNull();
  });
  it('"Comprar +1 rank" compra exatamente 1 rank', async () => {
    const { c, id, node } = setup(); const user = userEvent.setup(); const before = talentPointsAvailable(c);
    await user.click(node());
    await user.click(screen.getByRole('button', { name: 'Comprar +1 rank' }));
    expect(rankOf(c, id)).toBe(1); expect(before - talentPointsAvailable(c)).toBeGreaterThan(0);
  });
});

describe('Fase 9 B — ícones em múltiplos de 24', () => {
  it('avisa em DEV quando o tamanho não é múltiplo de 24 e fica quieto quando é', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Icon name="x" size={24} />); render(<Icon name="x" size={48} />); expect(warn).not.toHaveBeenCalled();
    render(<Icon name="x" size={30} />); expect(warn).toHaveBeenCalledTimes(1); warn.mockRestore();
  });
  it('nenhum uso de <Icon size=…> no código usa tamanho fora de 24·n', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`grep -rhoE "<Icon [^>]*size=\\\\{[0-9]+\\\\}" src --include=*.tsx --exclude=ui.test.tsx || true`).toString();
    for (const m of out.matchAll(/size=\{(\d+)\}/g)) expect(Number(m[1]) % 24).toBe(0);
  });
});

describe('Fase 9 C — menu Personagem', () => {
  const open = (tab: string) => { history.replaceState(null, '', `/#/personagem/${tab}`); render(<App />); };
  it('Ficha: atributos com tooltip de composição, crit com teto 75%', () => {
    open('ficha');
    expect(screen.getAllByRole('tooltip').length).toBe(8);
    expect(screen.getByLabelText(/^Crítico: .*teto 75%/)).toBeTruthy();
  });
  it('Proficiências: Squire/Mago treinam elementos; Guerreiro os joga na faixa de bloqueados e oferece "Ver afinidade"', async () => {
    const c = gameStore.getSnapshot().characters[0];
    c.profile.classId = 'guerreiro'; c.profile.classPath = ['aprendiz', 'guerreiro'];
    open('proficiencias'); const user = userEvent.setup();
    expect(document.querySelector('.blockedbar')).toBeTruthy();
    expect(screen.queryByLabelText('Fogo')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ver afinidade' }));
    expect(screen.getByRole('dialog', { name: 'Personagem' })).toBeTruthy();
  });
  it('Magias: nomes em português; condições abrem em popover', async () => {
    open('magias'); const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: /Condições/ })[0]);
    expect(screen.getByRole('dialog', { name: /Condições de/ })).toBeTruthy();
  });
  it('Talentos: nós são rect + image e a aba tem role=tab com aria-selected', () => {
    open('talentos');
    const node = document.querySelector('.tgrid-node')!;
    expect(node.querySelector('rect')).toBeTruthy(); expect(node.querySelector('image')).toBeTruthy();
    expect(document.querySelector('.tgrid-node.major .tgrid-frame')).toBeTruthy();
    for (const tab of screen.getAllByRole('tab')) expect(tab.getAttribute('aria-selected')).toBeTruthy();
  });
});
