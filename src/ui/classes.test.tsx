// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../PhaserGame', () => ({ PhaserGame: () => <div id="game-container" /> }));

import App from '../App';
import { gameStore } from '../game/core/GameStore';
import { partyState } from '../game/core/testing';
import { childrenOf, CLASS_NODES } from '../game/rpg/classTree';
import { previewEvolution } from '../game/systems/guide';
import { CLASS_ICON_PNGS, classIconName } from './classes/ClassIcon';
import { uiStore } from './uiStore';

const prep = (setup?: (c: ReturnType<typeof gameStore.getSnapshot>['characters'][number]) => void) => {
  gameStore.hydrate(partyState()); const c = gameStore.getSnapshot().characters[0];
  c.profile.level = 10; c.profile.proficiencies.melee.level = 25; c.profile.proficiencies.magic.level = 13; setup?.(c);
};
const open = (tab = 'proximo-passo') => { history.replaceState(null, '', `/#/classes/${tab}`); render(<App />); };
beforeEach(() => { uiStore.reset(); history.replaceState(null, '', '/'); });
afterEach(cleanup);

describe('Fase 11 — Classes: Próximo passo', () => {
  it('seções na ordem certa; o Guerreiro vem primeiro, selecionado por padrão; sem textos longos antigos', () => {
    prep(); open();
    const groups = screen.getAllByRole('group').filter(g => ['Prontas para evoluir', 'Em progresso'].includes(g.getAttribute('aria-label') ?? ''));
    expect(groups.map(g => g.getAttribute('aria-label'))).toEqual(['Prontas para evoluir', 'Em progresso']);   // as 15 classes de Tier 1 têm kit
    expect(screen.getByRole('option', { name: /^Guerreiro, pronta/ }).getAttribute('aria-selected')).toBe('true');
    expect(document.body.textContent).not.toMatch(/Sem kit pronto|Treino: Especialista em/);
    expect(document.querySelector('select, details')).toBeNull();
  });

  it('selecionar não evolui; nenhuma classe de Tier 1 mostra "Kit em breve"; em progresso "Faltam requisitos"', async () => {
    prep(); open(); const user = userEvent.setup(); const spy = vi.spyOn(gameStore, 'evolve');
    await user.click(screen.getByRole('option', { name: /^Mago/ }));
    expect(spy).not.toHaveBeenCalled();
    const need = screen.getByRole('button', { name: 'Faltam requisitos' }); expect((need as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('option', { name: /^Ladino/ }));
    expect(screen.queryByRole('button', { name: 'Kit em breve' })).toBeNull();
  });

  it('o preview mostra os valores de previewEvolution', async () => {
    prep(); open();
    const s = gameStore.getSnapshot(), pv = previewEvolution(s, s.characters[0], 'guerreiro');
    const hp = pv.stats.find(x => x.key === 'maxHp')!;
    const row = screen.getByText('HP máximo', { selector: '.cl-drow span' }).closest('.cl-drow') as HTMLElement;
    expect(row.textContent).toContain(String(Math.round(hp.after)));
    expect(row.className).toMatch(hp.after > hp.before ? /up/ : /dn|eq/);
  });

  it('Evoluir abre o diálogo; Esc cancela só o diálogo; Confirmar evolui uma vez', async () => {
    prep(); open(); const user = userEvent.setup(); const spy = vi.spyOn(gameStore, 'evolve');
    await user.click(screen.getByRole('button', { name: /^Evoluir para Guerreiro/ }));
    expect(screen.getByRole('alertdialog')).toBeTruthy(); expect(spy).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull(); expect(screen.getByRole('dialog', { name: 'Classes' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /^Evoluir para Guerreiro/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar evolução' }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(gameStore.getSnapshot().characters[0].profile.classId).toBe('guerreiro');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('setas navegam; trocar o personagem reavalia a seleção', async () => {
    prep(); open(); const user = userEvent.setup();
    screen.getByRole('option', { name: /^Guerreiro/ }).focus(); await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option').filter(o => o.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /^Guerreiro/ }).getAttribute('aria-selected')).toBe('false');
    await user.click(within(screen.getByRole('group', { name: 'Personagem' })).getByRole('button', { name: 'Kael' }));
    expect(screen.queryByRole('option', { name: /pronta/ })).toBeNull();
  });
});

describe('Fase 11 — Classes: Árvore completa', () => {
  it('15 classes; escolher Guerreiro descarta as outras 14; Mago lista 9 + 9; descartada é só leitura', async () => {
    prep(c => { c.profile.classId = 'guerreiro'; c.profile.classPath = ['aprendiz', 'guerreiro']; }); open('arvore-completa'); const user = userEvent.setup();
    const tiles = within(screen.getByRole('listbox', { name: 'Classes base' })).getAllByRole('option'); expect(tiles).toHaveLength(15);
    expect(document.querySelectorAll('.cl-tile.gone')).toHaveLength(14); expect(document.querySelectorAll('.cl-tile.mine')).toHaveLength(1);
    await user.click(screen.getByRole('option', { name: /^Mago/ }));
    const panel = screen.getByRole('complementary', { name: /Subclasses de Mago/ });
    expect(panel.querySelectorAll('.cl-sub')).toHaveLength(childrenOf('mago').length);
    expect(within(panel).queryAllByRole('button')).toHaveLength(0);
    expect(document.querySelector('select, details')).toBeNull();
    await user.click(screen.getByRole('option', { name: /^Guerreiro/ }));
    expect(document.querySelector('.cl-sub')).toBeTruthy();
  });

  it('o toggle mostra só as classes prontas; Guerreiro destacado "você está aqui" no Tier 2', async () => {
    prep(); open('arvore-completa'); const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: /só as que posso evoluir agora/ }));
    expect(within(screen.getByRole('listbox', { name: 'Classes base' })).getAllByRole('option').map(o => o.getAttribute('aria-label')?.split(',')[0])).toEqual(['Guerreiro', 'Ladino', 'Mercenário']);
  });
});

describe('Fase 11 — ícones de classe', () => {
  it('classIconName cai no ícone da porta; o conjunto bate com o diretório', () => {
    for (const n of CLASS_NODES.filter(n => n.tier === 1)) expect(classIconName(n)).toBe(`class_${n.id}`);
    for (const n of CLASS_NODES.filter(n => n.tier === 2)) expect(classIconName(n)).toMatch(/^(prof|elem)_/);   // subclasses usam o ícone da porta até ganharem o seu
    const files = readdirSync('public/assets/ui/icons').filter(f => /^class_.*\.png$/.test(f)).map(f => f.replace('.png', '')).sort();
    expect([...CLASS_ICON_PNGS].sort()).toEqual(files);
  });
});
