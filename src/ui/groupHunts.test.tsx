// @vitest-environment jsdom
import { act, cleanup, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../PhaserGame', () => ({ PhaserGame: () => <div id="game-container" /> }));

import App from '../App';
import { gameStore } from '../game/core/GameStore';
import { partyState } from '../game/core/testing';
import { HUNTS } from '../game/data/hunts';
import { offlineHuntId, recommendedHunt } from '../game/systems/huntInfo';
import { railBadges } from './badges';
import { uiStore } from './uiStore';

const open = (modal: string, tab?: string) => { history.replaceState(null, '', `/#/${modal}${tab ? `/${tab}` : ''}`); render(<App />); };
const chars = () => gameStore.getSnapshot().characters;
beforeEach(() => { uiStore.reset(); history.replaceState(null, '', '/'); gameStore.hydrate(partyState()); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Fase 12 — Grupo: Formação', () => {
  it('KPIs e seções; a sugestão só aparece quando há o que sugerir; corrigir um alerta executa a ação e o alerta some', async () => {
    open('grupo'); const user = userEvent.setup();
    expect(screen.getByText('Vida total')).toBeTruthy(); expect(screen.getByText('Análise da formação')).toBeTruthy();
    expect(screen.getByText('Sugerir formação')).toBeTruthy();
    expect(document.querySelector('select, details')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Aplicar sugestão' }));
    expect(screen.queryByText('Sugerir formação')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mover para a frente' })).toBeNull();
  });

  it('arrastar para a outra linha chama setRow uma vez; mesma linha não; o botão ⇄ faz o mesmo', async () => {
    open('grupo'); const user = userEvent.setup(); const spy = vi.spyOn(gameStore, 'setRow');
    const bruno = screen.getByRole('listitem', { name: /^Kael/ }), store = new Map<string, string>();
    const dataTransfer = { setData: (k: string, v: string) => store.set(k, v), getData: (k: string) => store.get(k) ?? '', effectAllowed: '' };
    const frontRow = screen.getByRole('list', { name: 'Linha de frente' }).parentElement!;
    const start = createEvent.dragStart(bruno); Object.defineProperty(start, 'dataTransfer', { value: dataTransfer }); fireEvent(bruno, start);
    const drop = createEvent.drop(frontRow); Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer }); fireEvent(frontRow, drop);
    expect(spy).toHaveBeenCalledTimes(1); expect(chars()[1].row).toBe('front');
    const backRow = screen.getByRole('list', { name: 'Linha de trás' }).parentElement!;
    const drop2 = createEvent.drop(backRow); Object.defineProperty(drop2, 'dataTransfer', { value: { getData: () => chars()[1].id } }); fireEvent(backRow, drop2); // para trás: 1 chamada
    expect(spy).toHaveBeenCalledTimes(2);
    const drop3 = createEvent.drop(backRow); Object.defineProperty(drop3, 'dataTransfer', { value: { getData: () => chars()[1].id } }); fireEvent(backRow, drop3); // mesma linha: nada
    expect(spy).toHaveBeenCalledTimes(2);
    await user.click(within(screen.getByRole('listitem', { name: /^Kael/ })).getByRole('button', { name: /⇄/ }));
    expect(spy).toHaveBeenCalledTimes(3); expect(chars()[1].row).toBe('front');
  });

  it('presets: salvar, aplicar com "Aplicado", sobrescrever pede nome e limpar', async () => {
    open('grupo'); const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Salvar atual' })[0]);
    await user.type(screen.getByLabelText('Nome do preset 1'), 'Farm'); await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(gameStore.getSnapshot().formationPresets![0]!.name).toBe('Farm');
    expect(screen.getByRole('button', { name: 'Aplicado' })).toBeTruthy();
    gameStore.setRow(chars()[0].id, 'back'); gameStore.setTank(chars()[0].id, false);
    await user.click(await screen.findByRole('button', { name: 'Aplicar' })); expect(chars()[0].row).toBe('front');
    await user.click(screen.getByRole('button', { name: 'Sobrescrever' })); expect(screen.getByLabelText('Nome do preset 1')).toBeTruthy(); await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: /Limpar preset/ })); expect(gameStore.getSnapshot().formationPresets![0]).toBeNull();
  });

  it('o ícone do Grupo no trilho conta alertas bad/warn', () => {
    const s = gameStore.getSnapshot(); const badge = railBadges(s, s.characters[0]).grupo;
    expect(badge?.value).toBe('2'); expect(badge?.tone).toBe('gold'); // Lyra melee atrás + poucas poções
    gameStore.setTank(s.characters[0].id, false); expect(railBadges(gameStore.getSnapshot(), s.characters[0]).grupo?.tone).toBe('red');
  });
});

describe('Fase 12 — Grupo: Reservas', () => {
  const withReserve = () => { gameStore.recruit({ name: 'Zed', weaponId: 'oak_bow', element: 'ice' }); };
  it('equipe cheia: "Trocar com…" chama swapTeamMember com os ids certos; dispensar só após Confirmar; renomear salva', async () => {
    gameStore.recruit('Quarto'); gameStore.toggleTeam(chars()[3].id); withReserve(); open('grupo', 'reservas'); const user = userEvent.setup();
    const swap = vi.spyOn(gameStore, 'swapTeamMember'), dismiss = vi.spyOn(gameStore, 'dismiss');
    const card = screen.getByRole('listitem', { name: /^Zed/ });
    await user.click(within(card).getByRole('button', { name: 'Trocar com…' }));
    await user.click(within(screen.getByRole('dialog', { name: /Trocar Zed com/ })).getByRole('button', { name: chars()[1].name }));
    expect(swap).toHaveBeenCalledWith(chars()[1].id, chars()[4].id);
    await user.click(within(screen.getByRole('listitem', { name: /^Zed/ })).getByRole('button', { name: 'Dispensar' }));
    expect(dismiss).not.toHaveBeenCalled(); expect(screen.getByRole('alertdialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(dismiss).not.toHaveBeenCalled();
    await user.click(within(screen.getAllByRole('listitem').find(x => x.getAttribute('aria-label')?.startsWith(chars()[1].name))!).getByRole('button', { name: 'Renomear' }));
    const input = screen.getByLabelText(new RegExp(`Novo nome de ${chars()[1].name}`)); await user.clear(input); await user.type(input, 'Novo{Enter}');
    expect(chars()[1].name).toBe('Novo');
  });

  it('dispensar confirma e remove; recusa mostra a mensagem no diálogo', async () => {
    withReserve(); open('grupo', 'reservas'); const user = userEvent.setup();
    await user.click(within(screen.getByRole('listitem', { name: /^Zed/ })).getByRole('button', { name: 'Dispensar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(chars().some(c => c.name === 'Zed')).toBe(false);
  });

  it('recrutar: nome vazio ou repetido mostra o motivo e não chama recruit; elenco cheio também', async () => {
    open('grupo', 'reservas'); const user = userEvent.setup(); const spy = vi.spyOn(gameStore, 'recruit');
    const btn = () => screen.getByRole('button', { name: 'Recrutar Squire' }) as HTMLButtonElement;
    expect(btn().disabled).toBe(true); expect(screen.getByText(/Escolha um nome/)).toBeTruthy();
    await user.type(screen.getByLabelText('Nome do novo Squire'), chars()[0].name.toUpperCase()); expect(btn().disabled).toBe(true); expect(screen.getByText(/Já existe/)).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Nome do novo Squire')); await user.type(screen.getByLabelText('Nome do novo Squire'), 'Nova');
    await user.click(btn()); expect(spy).toHaveBeenCalledTimes(1); expect(chars().some(c => c.name === 'Nova')).toBe(true);
  });
});

describe('Fase 12 — Hunts', () => {
  it('uma coluna com as 7 hunts, ordenáveis; selecionar não troca; selos Atual / Melhor XP/h / Offline 25%', async () => {
    open('hunts'); const user = userEvent.setup(); const spy = vi.spyOn(gameStore, 'selectHunt');
    const list = screen.getByRole('listbox', { name: 'Mapas' }); expect(within(list).getAllByRole('option')).toHaveLength(HUNTS.length);
    await user.click(within(list).getByRole('option', { name: /^Floresta Sombria/ }));
    expect(spy).not.toHaveBeenCalled(); expect(screen.getByRole('complementary', { name: /Detalhe: Floresta Sombria/ })).toBeTruthy();
    const s = gameStore.getSnapshot();
    expect(list.querySelectorAll('.pk-tag')).toBeTruthy();
    expect(within(within(list).getByRole('option', { name: /^Catacumbas/ })).getByText('Atual')).toBeTruthy();
    const bestName = HUNTS.find(h => h.id === recommendedHunt(s))!.name, offName = HUNTS.find(h => h.id === offlineHuntId(s))!.name;
    expect(within(within(list).getByRole('option', { name: new RegExp(`^${bestName}`) })).getByText('★ Melhor XP/h')).toBeTruthy();
    expect(within(within(list).getByRole('option', { name: new RegExp(`^${offName}`) })).getByText('Offline 25%')).toBeTruthy();
    expect(list.querySelectorAll('.pk-tag.off')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'XP/h' }));
    expect(within(list).getAllByRole('option')[0].getAttribute('aria-label')).toMatch(/^Templo Profano/);
    expect(within(list).getAllByText(/ref\./).length).toBeGreaterThan(0); expect(within(list).getAllByText('sem chefe derrotado').length).toBe(HUNTS.length);
  });

  it('ações: parada/outra hunt = Selecionar e Selecionar e iniciar; rodando = fila ou Encerrar e trocar', async () => {
    open('hunts'); const user = userEvent.setup();
    await user.click(screen.getByRole('option', { name: /^Floresta Sombria/ }));
    // rodando? o estado de teste está idle
    const select = vi.spyOn(gameStore, 'selectHunt'), start = vi.spyOn(gameStore, 'start'), queue = vi.spyOn(gameStore, 'queueHunt'), end = vi.spyOn(gameStore, 'end');
    await user.click(screen.getByRole('button', { name: 'Selecionar e iniciar' }));
    expect(select).toHaveBeenCalledTimes(1); expect(start).toHaveBeenCalledTimes(1); expect(gameStore.getSnapshot().huntId).toBe('floresta_sombria');
    await user.click(screen.getByRole('option', { name: /^Catacumbas/ }));
    expect(screen.getByRole('button', { name: 'Trocar no fim do ciclo' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Trocar no fim do ciclo' })); expect(queue).toHaveBeenCalledWith('catacumbas');
    expect(screen.getAllByText(/Próxima: Catacumbas/).length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(gameStore.getSnapshot().pendingHunt).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Encerrar e trocar' })); expect(end).toHaveBeenCalled(); expect(gameStore.getSnapshot().huntId).toBe('catacumbas');
    expect(screen.getByRole('button', { name: 'Hunt atual' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Iniciar caçada' })).toBeTruthy();
  });

  it('hunt Suicida: nada executa sem confirmar; Cancelar não muda nada', async () => {
    open('hunts'); const user = userEvent.setup(); const select = vi.spyOn(gameStore, 'selectHunt');
    await user.click(screen.getByRole('option', { name: /^Templo Profano/ }));
    expect(document.querySelector('.hn-warn.bad')?.textContent).toMatch(/níveis/);
    await user.click(screen.getByRole('button', { name: 'Selecionar' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy(); expect(select).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(select).not.toHaveBeenCalled(); expect(gameStore.getSnapshot().huntId).toBe('catacumbas');
    await user.click(screen.getByRole('button', { name: 'Selecionar' })); await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(gameStore.getSnapshot().huntId).toBe('templo_profano');
  });

  it('detalhe da Catacumbas mostra Horda e Invasão em 0%; mapa sem imagem não quebra', async () => {
    open('hunts');
    expect(screen.getByRole('img', { name: /Reforço leve .*Horda 0%.*Invasão 0%/ })).toBeTruthy();
    for (const img of Array.from(document.querySelectorAll('img.hn-thumb'))) act(() => { fireEvent.error(img); });
    expect(document.querySelectorAll('.hn-thumb.ph').length).toBeGreaterThan(0);
  });
});
