import { beforeEach } from 'vitest';
import { WAVE_CONFIG } from './game/data/balance';

/** Reforços de wave desligados em todo teste (os que precisam deles ligam e a config volta ao normal no próximo teste). */
const defaults = { ...WAVE_CONFIG };
beforeEach(() => { Object.assign(WAVE_CONFIG, defaults, { enabled: false }); });
