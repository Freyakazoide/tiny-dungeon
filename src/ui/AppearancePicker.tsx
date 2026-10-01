import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ART } from '../game/art/data';
import { LOOK_REGIONS, normalizeLook, optionsOf, randomLook, type Look, type LookRegion } from '../game/art/look';
import { frameDataUrl, type Direction } from '../game/art/render';

const REGION_LABEL: Record<LookRegion, string> = { pele: 'Pele', cabelo: 'Cabelo', armadura: 'Armadura' };
const DIRS: Direction[] = ['down', 'up', 'left', 'right'];
const DIR_LABEL: Record<Direction, string> = { down: 'baixo', up: 'cima', left: 'esquerda', right: 'direita' };

/** As 4 direções do corpo com o `look`, alternando as 2 poses a 6 fps (pixelado, ampliado ×3). */
export function LookPreview({ look, animate = true }: { look: Look; animate?: boolean }) {
  const [pose, setPose] = useState<1 | 2>(1);
  useEffect(() => {
    if (!animate || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)) return;
    const id = window.setInterval(() => setPose(p => p === 1 ? 2 : 1), 1000 / 6);
    return () => window.clearInterval(id);
  }, [animate]);
  return <div className="ap-preview" aria-label="Pré-visualização">{DIRS.map(dir =>
    <img key={dir} className="ap-frame" alt={`Visto de ${DIR_LABEL[dir]}`} src={frameDataUrl({ kind: 'personagens', id: look.body, look }, dir, pose, 4)} />)}</div>;
}

function Carousel({ region, value, onPick }: { region: LookRegion; value: string; onPick: (id: string) => void }) {
  const list = optionsOf(region), index = Math.max(0, list.findIndex(o => o.id === value)), current = list[index];
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null);
  const go = (delta: number) => onPick(list[(index + delta + list.length) % list.length].id);
  useEffect(() => {
    if (!open) return;
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', key, true); document.addEventListener('mousedown', click);
    return () => { window.removeEventListener('keydown', key, true); document.removeEventListener('mousedown', click); };
  }, [open]);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } };
  if (!current) return null;
  return <div className="ap-carousel" role="group" aria-label={REGION_LABEL[region]} tabIndex={0} onKeyDown={onKey} ref={ref}>
    <span className="ap-label">{REGION_LABEL[region]}</span>
    <button type="button" className="pk-btn sm" aria-label={`${REGION_LABEL[region]} anterior`} onClick={() => go(-1)}>◀</button>
    <span className="pk-panel flat ap-swatch" style={{ background: current.cor }} title={current.cor} aria-hidden="true" />
    <span className="ap-name"><b>{current.nome}</b><small>{current.cor} · {index + 1} / {list.length}</small></span>
    <button type="button" className="pk-btn sm" aria-label={`${REGION_LABEL[region]} próxima`} onClick={() => go(1)}>▶</button>
    <button type="button" className="pk-btn sm" aria-label={`Todas as cores de ${REGION_LABEL[region].toLowerCase()}`} aria-expanded={open} onClick={() => setOpen(!open)}>▦</button>
    <span className="ap-live" aria-live="polite">{`${REGION_LABEL[region]}: ${current.nome}, ${index + 1} de ${list.length}`}</span>
    {open && <div className="pk-tip ap-grid" role="listbox" aria-label={`Cores de ${REGION_LABEL[region].toLowerCase()}`}>{list.map(o =>
      <button type="button" key={o.id} role="option" aria-selected={o.id === value} aria-label={o.nome} title={`${o.nome} ${o.cor}`} className={`ap-chip ${o.id === value ? 'on' : ''}`} style={{ background: o.cor }} onClick={() => { onPick(o.id); setOpen(false); }} />)}</div>}
  </div>;
}

/** Aparência do Squire: três carrosséis de cor (pele, cabelo, armadura) com prévia animada, Aleatório e Restaurar. */
export function AppearancePicker({ value, onChange, restore, label = 'Aparência' }: { value: Look; onChange: (look: Look) => void; restore?: Look; label?: string }) {
  const look = normalizeLook(value);
  return <div className="ap" role="group" aria-label={label}>
    <LookPreview look={look} />
    <div className="ap-controls">
      {LOOK_REGIONS.map(region => <Carousel key={region} region={region} value={look[region]} onPick={id => onChange({ ...look, [region]: id })} />)}
      <div className="pk-row"><button type="button" className="pk-btn sm" onClick={() => onChange(randomLook())}>Aleatório</button>
        {restore && <button type="button" className="pk-btn sm" onClick={() => onChange(restore)}>Restaurar</button>}</div>
    </div>
  </div>;
}
export const hasLooks = ART.colors.pele?.length > 0;
