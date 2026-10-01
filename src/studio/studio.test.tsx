// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { StudioApp } from './StudioApp';

const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = () => Object.fromEntries(walk('arte').filter(p => p.endsWith('.csv')).map(p => ['/' + p, readFileSync(p, 'utf8')]));
afterEach(cleanup);

describe('Fase 13 F — Estúdio de arte', () => {
  it('monta com os dados entregues: sprites, tiles e mapas; grade e caixa 3×3 funcionam', async () => {
    render(<StudioApp files={files()} />); const user = userEvent.setup();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByAltText('esqueleto down_1')).toBeTruthy(); expect(screen.getByAltText('tile piso')).toBeTruthy(); expect(screen.getByAltText('mapa catacumbas')).toBeTruthy();
    await user.click(screen.getByLabelText('grade de células')); expect(screen.getByTestId('grid')).toBeTruthy();
    await user.click(screen.getByLabelText('caixa 3×3'));
  });
  it('CSV com chave inexistente mostra o erro (arquivo e linha) e não derruba a página', () => {
    const f = files(); f['/arte/monstros/esqueleto/down_1.csv'] = '.,.,Z\n.,.,.';
    render(<StudioApp files={f} />);
    expect(screen.getByRole('alert').textContent).toContain('arte/monstros/esqueleto/down_1.csv:1');
    expect(screen.getByText('Estúdio de arte')).toBeTruthy();
  });
});
