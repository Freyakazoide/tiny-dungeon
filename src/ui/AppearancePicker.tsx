import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ART } from '../game/art/data';
import { LOOK_REGIONS, addCustomColor, colorChoices, normalizeLook, randomLook, removeCustomColor, type Look, type LookRegion } from '../game/art/look';
import { frameDataUrl, type Direction } from '../game/art/render';
import { HAIR_STYLES, HEADGEAR, type StyleOption } from '../game/art/styles';

const REGION_LABEL: Record<LookRegion, string> = { pele: 'Pele', cabelo: 'Cabelo', armadura: 'Armadura', capa: 'Capa' };
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
  const [version, setVersion] = useState(0), [open, setOpen] = useState(false), [adding, setAdding] = useState(false), [hex, setHex] = useState('#c0392b'), [nome, setNome] = useState('');
  const list = useMemo(() => colorChoices(region, value), [region, value, version]);
  const index = Math.max(0, list.findIndex(o => o.id === value)), current = list[index];
  const ref = useRef<HTMLDivElement>(null);
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
    <button type="button" className="pk-btn sm" aria-label={`Adicionar cor de ${REGION_LABEL[region].toLowerCase()}`} aria-expanded={adding} title="Adicionar uma cor ao carrossel" onClick={() => setAdding(!adding)}>＋</button>
    {current.custom && <button type="button" className="pk-btn sm" aria-label="Remover esta cor do carrossel" title="Remover esta cor" onClick={() => { removeCustomColor(region, current.id); setVersion(v => v + 1); onPick(list.find(o => o.id !== current.id)!.id); }}>✕</button>}
    <span className="ap-live" aria-live="polite">{`${REGION_LABEL[region]}: ${current.nome}, ${index + 1} de ${list.length}`}</span>
    {adding && <div className="ap-add pk-panel flat" role="group" aria-label={`Nova cor de ${REGION_LABEL[region].toLowerCase()}`}>
      <input type="color" aria-label="Escolher cor" value={hex} onChange={e => setHex(e.target.value)} />
      <input type="text" aria-label="Nome da cor" placeholder="Nome (opcional)" maxLength={18} value={nome} onChange={e => setNome(e.target.value)} />
      <button type="button" className="pk-btn sm primary" onClick={() => { const c = addCustomColor(region, hex, nome); if (c) { setVersion(v => v + 1); onPick(c.id); setNome(''); setAdding(false); } }}>Adicionar</button></div>}
    {open && <div className="pk-tip ap-grid" role="listbox" aria-label={`Cores de ${REGION_LABEL[region].toLowerCase()}`}>{list.map(o =>
      <button type="button" key={o.id} role="option" aria-selected={o.id === value} aria-label={o.nome} title={`${o.nome} ${o.cor}`} className={`ap-chip ${o.id === value ? 'on' : ''}`} style={{ background: o.cor }} onClick={() => { onPick(o.id); setOpen(false); }} />)}</div>}
  </div>;
}

/** Escolha entre opções com nome (penteado, chapéu/elmo): ◀ nome ▶. */
function StyleCarousel({ label, options, value, onPick }: { label: string; options: readonly StyleOption[]; value: string; onPick: (id: string) => void }) {
  const index = Math.max(0, options.findIndex(o => o.id === value)), go = (delta: number) => onPick(options[(index + delta + options.length) % options.length].id);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } };
  return <div className="ap-carousel" role="group" aria-label={label} tabIndex={0} onKeyDown={onKey}>
    <span className="ap-label">{label}</span>
    <button type="button" className="pk-btn sm" aria-label={`${label} anterior`} onClick={() => go(-1)}>◀</button>
    <span className="ap-name"><b>{options[index].nome}</b><small>{index + 1} / {options.length}</small></span>
    <button type="button" className="pk-btn sm" aria-label={`${label} próximo`} onClick={() => go(1)}>▶</button>
    <span className="ap-live" aria-live="polite">{`${label}: ${options[index].nome}, ${index + 1} de ${options.length}`}</span>
  </div>;
}

/** Aparência do Squire: carrosséis de cor (pele, cabelo, armadura, capa) e de estilo (penteado, chapéu/elmo) de cor (pele, cabelo, armadura) com prévia animada, Aleatório e Restaurar. */
export function AppearancePicker({ value, onChange, restore, label = 'Aparência' }: { value: Look; onChange: (look: Look) => void; restore?: Look; label?: string }) {
  const look = normalizeLook(value);
  return <div className="ap" role="group" aria-label={label}>
    <LookPreview look={look} />
    <div className="ap-controls">
      {LOOK_REGIONS.map(region => <Carousel key={region} region={region} value={look[region]} onPick={id => onChange({ ...look, [region]: id })} />)}
      <StyleCarousel label="Penteado" options={HAIR_STYLES} value={look.estilo} onPick={estilo => onChange({ ...look, estilo })} />
      <StyleCarousel label="Cabeça" options={HEADGEAR} value={look.topo} onPick={topo => onChange({ ...look, topo })} />
      <div className="pk-row"><button type="button" className="pk-btn sm" onClick={() => onChange(randomLook())}>Aleatório</button>
        {restore && <button type="button" className="pk-btn sm" onClick={() => onChange(restore)}>Restaurar</button>}</div>
    </div>
  </div>;
}
export const hasLooks = ART.colors.pele?.length > 0;
