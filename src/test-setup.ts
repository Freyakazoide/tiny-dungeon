import { beforeEach } from 'vitest';
import { RUN_CONFIG, WAVE_CONFIG } from './game/data/balance';

/** Reforços de wave desligados em todo teste (os que precisam deles ligam e a config volta ao normal no próximo teste). */
const defaults = { ...WAVE_CONFIG }, runDefaults = { ...RUN_CONFIG };
beforeEach(() => { Object.assign(WAVE_CONFIG, defaults, { enabled: false }); Object.assign(RUN_CONFIG, runDefaults, { enabled: false }); });
