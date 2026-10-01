// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { GoalPicker } from './GoalPicker';
import { ProgressPanel } from './ProgressPanel';
import { gameStore } from '../game/core/GameStore';
import { partyState } from '../game/core/testing';

afterEach(cleanup);

describe('objetivo de classe — UI', () => {
  it('GoalPicker lista 15 classes + "Decidir depois" e explica requisito, treino e anel', async () => {
    const calls: (string | undefined)[] = []; const user = userEvent.setup();
    const { rerender } = render(<GoalPicker label="x" value={undefined} onChange={g => calls.push(g)} />);
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio')).toHaveLength(16);
    await user.click(screen.getByRole('radio', { name: 'Mago' })); expect(calls).toEqual(['mago']);
    rerender(<GoalPicker label="x" value="mago" onChange={() => {}} />);
    const text = document.body.textContent!;
    expect(text).toContain('nível 10'); expect(text).toContain('Anel do Aprendiz'); expect(text).toContain('+15%');
  });
  it('Progressão: Squire escolhe o objetivo e o engine aplica anel e meta', async () => {
    gameStore.hydrate(partyState()); const user = userEvent.setup();
    const state = gameStore.getSnapshot(); const c = state.characters[0];
    render(<ProgressPanel state={state} character={c} />);
    await user.click(screen.getByRole('radio', { name: 'Mago' }));
    const after = gameStore.getSnapshot().characters[0];
    expect(after.goal).toBe('mago'); expect(after.equipment.ring).toBe('apprentice_ring_magic');
  });
});

import { CLASS_PROFILES } from '../game/data/classProfiles';
import { ClassPerks } from './classes/ClassPerks';
import { GOAL_NODES } from '../game/rpg/goals';

describe('O que você conquista (ClassPerks)', () => {
  it('as 15 classes base têm perfil e mostram papel, 4 magias, passiva, ganhos e especializações', () => {
    for (const n of GOAL_NODES) {
      expect(CLASS_PROFILES[n.id], n.id).toBeTruthy(); expect(CLASS_PROFILES[n.id].playstyle).toHaveLength(3); expect(CLASS_PROFILES[n.id].rewards.length).toBeGreaterThanOrEqual(3);
      const { container, unmount } = render(<ClassPerks nodeId={n.id} />);
      expect(container.querySelectorAll('.cl-ks')).toHaveLength(4); expect(container.querySelector('.cl-passive')).toBeTruthy();
      expect(container.querySelectorAll('.cl-rew li').length).toBeGreaterThanOrEqual(3); expect(container.textContent).toContain(CLASS_PROFILES[n.id].tagline); unmount();
    }
  });
});
