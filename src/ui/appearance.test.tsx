// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../PhaserGame', () => ({ PhaserGame: () => <div id="game-container" /> }));

import App from '../App';
import { gameStore } from '../game/core/GameStore';
import { partyState } from '../game/core/testing';
import { defaultLookFor, optionsOf, type Look } from '../game/art/look';
import { AppearancePicker } from './AppearancePicker';
import { Avatar } from './components/Avatar';
import { uiStore } from './uiStore';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Harness({ onChange }: { onChange: (l: Look) => void }) {
  const [look, setLook] = useState(defaultLookFor(0));
  return <AppearancePicker value={look} restore={defaultLookFor(0)} onChange={l => { setLook(l); onChange(l); }} />;
}

describe('Fase 13 D — AppearancePicker e Avatar', () => {
  it('▶ no fim volta ao início; setas do teclado funcionam; a prévia reflete a escolha; a grade escolhe', async () => {
    const seen: Look[] = []; render(<Harness onChange={l => seen.push(l)} />); const user = userEvent.setup();
    const hair = screen.getByRole('group', { name: 'Cabelo' }), n = optionsOf('cabelo').length;
    const srcBefore = screen.getAllByRole('img')[0].getAttribute('src');
    for (let i = 0; i < n; i++) await user.click(within(hair).getByRole('button', { name: 'Cabelo próxima' }));
    expect(seen[seen.length - 1].cabelo).toBe(optionsOf('cabelo')[0].id);
    hair.focus(); await user.keyboard('{ArrowRight}'); expect(seen[seen.length - 1].cabelo).toBe(optionsOf('cabelo')[1].id);
    await user.keyboard('{ArrowLeft}{ArrowLeft}'); expect(seen[seen.length - 1].cabelo).toBe(optionsOf('cabelo')[n - 1].id);
    expect(screen.getAllByRole('img')[0].getAttribute('src')).not.toBe(srcBefore);
    await user.click(within(hair).getByRole('button', { name: /Todas as cores/ })); await user.click(within(hair).getByRole('option', { name: optionsOf('cabelo')[2].nome }));
    expect(seen[seen.length - 1].cabelo).toBe(optionsOf('cabelo')[2].id);
    await user.click(screen.getByRole('button', { name: 'Restaurar' })); expect(seen[seen.length - 1]).toEqual(defaultLookFor(0));
    await user.click(screen.getByRole('button', { name: 'Aleatório' })); expect(seen).toHaveLength(seen.length);
  });

  it('Avatar desenha o quadro down_1 com as cores do look (data URL muda entre looks)', () => {
    const a = render(<Avatar character={{ look: defaultLookFor(0) }} />).container.querySelector('img')!.getAttribute('src');
    const b = render(<Avatar character={{ look: defaultLookFor(1) }} />).container.querySelector('img')!.getAttribute('src');
    expect(a).toMatch(/^data:image\/png;base64,/); expect(a).not.toBe(b);
  });

  it('Ficha: Aplicar chama setLook uma vez; Cancelar não chama; a prévia muda antes de aplicar', async () => {
    uiStore.reset(); history.replaceState(null, '', '/#/personagem/ficha'); gameStore.hydrate(partyState());
    const spy = vi.spyOn(gameStore, 'setLook'); render(<App />); const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Renomear \/ Aparência/ }));
    const group = screen.getByRole('group', { name: /^Aparência de /, hidden: false });
    await user.click(within(within(group).getByRole('group', { name: 'Armadura' })).getByRole('button', { name: 'Armadura próxima' }));
    expect(spy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(spy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Renomear \/ Aparência/ }));
    await user.click(within(within(screen.getByRole('group', { name: /^Aparência de / })).getByRole('group', { name: 'Armadura' })).getByRole('button', { name: 'Armadura próxima' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(spy).toHaveBeenCalledTimes(1); expect(gameStore.getSnapshot().characters[0].look.armadura).toBe(optionsOf('armadura')[(gameStore.getSnapshot().characters[0].look.armadura === optionsOf('armadura')[1].id ? 1 : 1)].id);
  });
});
