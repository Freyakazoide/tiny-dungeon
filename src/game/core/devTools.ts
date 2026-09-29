import type { GameEngine } from './GameEngine';
import { CLASS_NODES } from '../rpg/classTree';
import { runtime } from '../rpg/runtime';
import { PROFICIENCY_IDS } from '../rpg/proficiencies';
import { COUNTER_IDS } from '../rpg/profile';

interface DevHooks { setLastSeen(hoursAgo: number): Promise<void>; resetSave(): Promise<void>; }

/** Comandos de console para testar o ritmo lento (Tier 1 ~5,5 dias, Tier 2 30 a 50 dias). Ver `window.dev`. */
export function createDevTools(engine: GameEngine, hooks: DevHooks) {
  const run = <T>(label: string, action: () => T) => {
    try { const result = action(); console.info(`[dev] ${label}: ok`); return result; }
    catch (error) { console.error(`[dev] ${label}: ${error instanceof Error ? error.message : error}`); return undefined; }
  };
  return {
    list() {
      const info = {
        characters: engine.getSnapshot().characters.map(c => ({ id: c.id, name: c.name, classe: c.profile.classId, nivel: c.profile.level })),
        nodes: CLASS_NODES.map(n => n.id), proficiencies: [...PROFICIENCY_IDS], counters: [...COUNTER_IDS],
      };
      console.table(info.characters); console.info('[dev] nós:', info.nodes.join(', ')); console.info('[dev] proficiências:', info.proficiencies.join(', '));
      return info;
    },
    timeScale(n: number) { return run(`timeScale(${n})`, () => { if (!(n > 0)) throw new Error('Use um número > 0.'); runtime.trainScale = n; engine.devScaleChanged(); }); },
    xpScale(n: number) { return run(`xpScale(${n})`, () => { if (!(n > 0)) throw new Error('Use um número > 0.'); runtime.xpScale = n; engine.devScaleChanged(); }); },
    setLevel(id: string, n: number) { return run(`setLevel(${id}, ${n})`, () => engine.devSetLevel(id, n)); },
    giveXp(id: string, n: number) { return run(`giveXp(${id}, ${n})`, () => engine.devGiveXp(id, n)); },
    setProf(id: string, prof: string, n: number) { return run(`setProf(${id}, ${prof}, ${n})`, () => engine.devSetProf(id, prof, n)); },
    addTries(id: string, prof: string, n: number) { return run(`addTries(${id}, ${prof}, ${n})`, () => engine.devAddTries(id, prof, n)); },
    addCounter(id: string, counter: string, n: number) { return run(`addCounter(${id}, ${counter}, ${n})`, () => engine.devAddCounter(id, counter, n)); },
    evolve(id: string, target: string, opts: { force?: boolean } = {}) {
      const ok = engine.evolve(id, target, opts); console.info(`[dev] evolve(${id}, ${target}):`, ok ? 'ok' : engine.getSnapshot().message); return ok;
    },
    fastForwardOffline(hours: number) { return run(`fastForwardOffline(${hours})`, () => { engine.applyOffline(hours * 3600); engine.end(); }); },
    setLastSeen(hoursAgo: number) { return hooks.setLastSeen(hoursAgo).then(() => console.info(`[dev] lastSavedAt = ${hoursAgo} h atrás; autosave congelado. Recarregue a página.`)); },
    resetSave() { return hooks.resetSave(); },
  };
}
