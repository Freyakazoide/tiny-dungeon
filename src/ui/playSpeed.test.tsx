// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { runtime } from '../game/rpg/runtime';
import { PlaySpeed } from './shell/Hud';

afterEach(() => { cleanup(); runtime.huntSpeed = 1; localStorage.clear(); });
describe('velocidade do jogo (jogador)', () => {
  it('×1, ×2 e ×3 mudam a velocidade da caçada e ficam salvos no navegador', async () => {
    const user = userEvent.setup(); render(<PlaySpeed />);
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['×1', '×2', '×3']); expect(screen.getByRole('button', { name: '×1' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: '×3' })); expect(runtime.huntSpeed).toBe(3); expect(localStorage.getItem('td-speed')).toBe('3'); expect(screen.getByRole('button', { name: '×3' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: '×1' })); expect(runtime.huntSpeed).toBe(1);
  });
  it('lembra a escolha ao abrir de novo', () => {
    localStorage.setItem('td-speed', '2'); render(<PlaySpeed />); expect(runtime.huntSpeed).toBe(2);
  });
});
