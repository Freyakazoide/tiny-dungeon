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
  }, 30000);
  it('Oficina de itens: monta a espada por partes, troca o material e a curadoria avisa combinação ruim', async () => {
    render(<StudioApp files={files()} />); const user = userEvent.setup();
    expect(screen.getByText('Oficina de itens (arte por partes)')).toBeTruthy();
    expect(screen.getAllByAltText('Cajado funesto').length).toBeGreaterThan(0); expect(screen.getAllByAltText('Espada lendária').length).toBeGreaterThan(0);
    const before = screen.getAllByAltText('Espada de ferro')[0].getAttribute('src');
    await user.selectOptions(screen.getByLabelText('Lâmina: material'), 'aco_negro');
    expect(screen.getAllByAltText('Espada de ferro')[0].getAttribute('src')).not.toBe(before);
    expect(screen.queryByText(/não combina/)).toBeNull();
    await user.selectOptions(screen.getByLabelText('Efeito mágico: parte'), 'runas');
    expect(screen.getByRole('alert').textContent).toContain('Runas não combina com Ferro');
    await user.selectOptions(screen.getByLabelText('Família'), 'arco');
    expect(screen.getByLabelText('Braço: parte')).toBeTruthy();
  }, 30000);
  it('CSV com chave inexistente mostra o erro (arquivo e linha) e não derruba a página', () => {
    const f = files(); f['/arte/monstros/esqueleto/down_1.csv'] = '.,.,Z\n.,.,.';
    render(<StudioApp files={f} />);
    expect(screen.getByRole('alert').textContent).toContain('arte/monstros/esqueleto/down_1.csv:1');
    expect(screen.getByText('Estúdio de arte')).toBeTruthy();
  });
});
