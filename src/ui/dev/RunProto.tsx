import { useEffect, useRef, useState } from 'react';
import { BAND, CHUNK_LEN } from '../../game/run/plan';
import { RunSim, type HeroSpec } from '../../game/run/sim';
import { MONSTERS } from '../../game/data/monsters';
import { HUNT_BY_ID } from '../../game/data/hunts';

/** Protótipo do corredor procedural (abre em #/proto): o grupo anda da direita para a esquerda, a IA reage sozinha. Só para aprovar o conceito. */
const CELL = 44, W = 1100, H = 10 * CELL + 40, HERO_X = W * .74;
const TIER_COLOR: Record<string, string> = { normal: '#8d95a0', light: '#e5ca91', reinforced: '#e0a05c', horde: '#d8554f', invasion: '#c45f9c' };
const ROLE_COLOR: Record<string, string> = { tank: '#5f8fb8', melee: '#d8554f', ranged: '#7cc08a', healer: '#e5ca91' };
const team = (p: number): HeroSpec[] => [
  { id: 't', name: 'Tanque', role: 'tank', maxHp: 420 * p, dps: 14 * p, range: 1.2 }, { id: 'm', name: 'Guerreiro', role: 'melee', maxHp: 300 * p, dps: 22 * p, range: 1.2 },
  { id: 'r', name: 'Arqueira', role: 'ranged', maxHp: 240 * p, dps: 20 * p, range: 5 }, { id: 'h', name: 'Clériga', role: 'healer', maxHp: 230 * p, dps: 0, range: 5, heal: 40 * p },
];

export function RunProto() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(2024), [speed, setSpeed] = useState(1), [paused, setPaused] = useState(false), [power, setPower] = useState(2), [hunt, setHunt] = useState('catacumbas');
  const sim = useRef<RunSim>(new RunSim({ seed, huntId: hunt }, team(power))), live = useRef({ speed, paused });
  live.current = { speed, paused };
  useEffect(() => { sim.current = new RunSim({ seed, huntId: hunt }, team(power)); }, [seed, power, hunt]);
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const draw = () => {
      const s = sim.current, ctx = canvas.current?.getContext('2d'); if (!ctx) return;
      const sx = (d: number) => HERO_X - (d - s.anchor) * CELL, sy = (y: number) => 20 + y * CELL;
      ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, W, H);
      const first = s.depth - 2, last = s.depth + Math.ceil(HERO_X / CELL / CHUNK_LEN) + 2;
      for (let i = Math.max(0, first); i <= last; i++) {
        const c = s.plan.chunk(i), x1 = sx(c.start + CHUNK_LEN), w = CHUNK_LEN * CELL;
        ctx.fillStyle = c.encounter?.boss ? '#241a1a' : i % 2 ? '#19212b' : '#1c2531'; ctx.fillRect(x1, sy(c.floor), w, BAND * CELL);
        ctx.strokeStyle = '#2b3644'; ctx.lineWidth = 1;
        for (let k = 0; k <= CHUNK_LEN; k++) { ctx.beginPath(); ctx.moveTo(x1 + k * CELL, sy(c.floor)); ctx.lineTo(x1 + k * CELL, sy(c.floor + BAND)); ctx.stroke(); }
        for (const o of c.obstacles) { const x = sx(c.start + o.c + 1); ctx.fillStyle = o.kind === 'a' ? '#5a4b3a' : '#4a4f58'; ctx.fillRect(x + 3, sy(o.r) + 3, CELL - 6, CELL - 6); ctx.strokeStyle = '#0b1016'; ctx.strokeRect(x + 3, sy(o.r) + 3, CELL - 6, CELL - 6); }
        ctx.fillStyle = '#6a727d'; ctx.font = '10px monospace'; ctx.fillText(`chunk ${i}`, x1 + 4, sy(c.floor) - 4);
        if (c.encounter) { const e = c.encounter, x = sx(c.start + e.at); ctx.fillStyle = TIER_COLOR[e.tier]; ctx.fillRect(x - 2, sy(c.floor) - 16, 4, BAND * CELL + 16); ctx.font = '11px monospace'; ctx.fillText(`${e.boss ? '☠ CHEFE ' + e.bossPower : e.tier} ${e.monsters.length}`, x + 5, sy(c.floor) - 6); }
      }
      for (const f of s.foes) { const sz = f.boss ? CELL * 1.4 : CELL * .62; ctx.fillStyle = f.boss ? '#8a2a2a' : MONSTERS[f.defId]?.color ? `#${MONSTERS[f.defId].color.toString(16).padStart(6, '0')}` : '#b04040'; ctx.fillRect(sx(f.d) - sz / 2, sy(f.y) - sz / 2, sz, sz); ctx.fillStyle = '#000a'; ctx.fillRect(sx(f.d) - sz / 2, sy(f.y) - sz / 2 - 6, sz, 3); ctx.fillStyle = '#d8554f'; ctx.fillRect(sx(f.d) - sz / 2, sy(f.y) - sz / 2 - 6, sz * f.hp / f.maxHp, 3); }
      for (const h of s.heroes) { if (!h.alive) continue; ctx.fillStyle = ROLE_COLOR[h.role]; ctx.fillRect(sx(h.d) - 12, sy(h.y) - 12, 24, 24); ctx.fillStyle = '#0b1016'; ctx.font = 'bold 12px monospace'; ctx.fillText(h.role[0].toUpperCase(), sx(h.d) - 4, sy(h.y) + 4); ctx.fillStyle = '#000a'; ctx.fillRect(sx(h.d) - 12, sy(h.y) - 19, 24, 3); ctx.fillStyle = '#7cc08a'; ctx.fillRect(sx(h.d) - 12, sy(h.y) - 19, 24 * h.hp / h.maxHp, 3); }
      ctx.fillStyle = '#e5ca91'; ctx.font = '13px monospace';
      ctx.fillText(`${HUNT_BY_ID[s.params.huntId].name} · semente ${s.params.seed} · ${(s.t / 60).toFixed(1)} min · distância ${s.stats.distance.toFixed(0)} · chunk ${s.depth} · mortes ${s.stats.kills} · chefes ${s.stats.bossKills} · vivos ${s.foes.length}${s.over ? ' · FIM DA RUN' : ''}`, 12, H - 8);
    };
    const loop = (now: number) => {
      const { speed: sp, paused: pa } = live.current; acc += Math.min(.25, (now - last) / 1000) * sp; last = now;
      if (!pa) while (acc >= .1) { sim.current.step(.1); acc -= .1; } else acc = 0;
      draw(); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="rp-wrap" style={{ background: '#0b1016', minHeight: '100vh', color: '#f1e4c9', padding: 12, fontFamily: 'monospace', overflow: 'auto' }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
      <b>Protótipo do corredor procedural</b>
      {[1, 5, 25].map(v => <button key={v} className={`pk-btn sm ${speed === v ? 'on' : ''}`} onClick={() => setSpeed(v)}>×{v}</button>)}
      <button className="pk-btn sm" onClick={() => setPaused(p => !p)}>{paused ? '▶ Continuar' : '⏸ Pausar'}</button>
      <button className="pk-btn sm" onClick={() => setSeed(Math.floor(Math.random() * 1e6))}>🎲 Nova semente</button>
      <label>força do grupo <input type="range" min=".1" max="8" step=".1" value={power} onChange={e => setPower(+e.target.value)} /> {power.toFixed(1)}</label>
      <select value={hunt} onChange={e => setHunt(e.target.value)}>{Object.values(HUNT_BY_ID).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
    </div>
    <canvas ref={canvas} width={W} height={H} style={{ border: '2px solid #303944', maxWidth: '100%', imageRendering: 'pixelated' }} aria-label="Corredor procedural" />
    <p style={{ fontSize: 12, color: '#8d95a0' }}>Azul = tanque · vermelho = corpo a corpo · verde = à distância (mantém 4 células e se afasta de quem chega) · amarelo = curandeira. Faixas coloridas = encontros (cinza normal, dourado leve, laranja reforço, vermelho horda, rosa invasão). A faixa andável sobe e desce; obstáculos nunca fecham o caminho.</p>
  </div>;
}
