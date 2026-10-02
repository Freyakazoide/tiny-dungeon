import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArtError, buildArtData, type ArtData } from '../game/art/data';
import { ARENA, CELL_PX, CANVAS_H, CANVAS_W, cellAt, type Cell } from '../game/art/geometry';
import { defaultLookFor, randomLook, type Look } from '../game/art/look';
import { mulberry32 } from '../game/run/rng';
import { frameRaster, mapRaster, toPixels, rasterize, type Direction } from '../game/art/render';
import { pngDataUrl } from '../game/art/png';
import { HUNTS } from '../game/data/hunts';
import { GearWorkshop } from './GearWorkshop';

const AppearancePicker = lazy(() => import('../ui/AppearancePicker').then(m => ({ default: m.AppearancePicker })));
class Guard extends Component<{ children: ReactNode }, { error?: string }> {
  state: { error?: string } = {};
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() { return this.state.error ? <p style={{ color: '#ff8080' }}>{this.state.error}</p> : this.props.children; }
}

const DIRS: Direction[] = ['down', 'up', 'left', 'right'];
const url = (r: { width: number; height: number; data: Uint8ClampedArray }) => pngDataUrl(r.width, r.height, r.data);
const Img = ({ src, alt, w }: { src: string; alt: string; w?: number }) => <img src={src} alt={alt} style={{ imageRendering: 'pixelated', width: w, display: 'block' }} />;

function SpriteBlock({ data, kind, id, look }: { data: ArtData; kind: 'personagens' | 'monstros'; id: string; look?: Look }) {
  const [pose, setPose] = useState<1 | 2>(1);
  useEffect(() => { const t = window.setInterval(() => setPose(p => p === 1 ? 2 : 1), 1000 / 6); return () => window.clearInterval(t); }, []);
  const raster = (dir: Direction, p: 1 | 2, scale: number) => url(frameRaster(kind, id, dir, p, look, scale, data));
  return <div style={{ display: 'grid', gap: 8 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 6, width: 'max-content' }}>{DIRS.flatMap(dir => ([1, 2] as const).map(p => <figure key={`${dir}${p}`} style={{ margin: 0 }}><Img src={raster(dir, p, 4)} alt={`${id} ${dir}_${p}`} /><figcaption style={{ fontSize: 10 }}>{dir}_{p}</figcaption></figure>))}</div>
    <div style={{ display: 'flex', gap: 10 }} aria-label={`animação de ${id}`}>{DIRS.map(dir => <Img key={dir} src={raster(dir, pose, 4)} alt={`${id} andando ${dir}`} />)}</div>
  </div>;
}

/** Galeria de variedade: 24 personagens sorteados (penteado, cabeça, capa e cores), com uma semente que dá sempre o mesmo grupo. */
function LookGallery({ data }: { data: ArtData }) {
  const [seed, setSeed] = useState(1);
  const looks = useMemo(() => { const rng = mulberry32(seed); return Array.from({ length: 24 }, () => randomLook(rng, data)); }, [seed, data]);
  return <section><h3>Variedade de personagens</h3>
    <button onClick={() => setSeed(s => s + 1)}>Sortear outros 24 (semente {seed})</button>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: '#1a1f27', padding: 12, marginTop: 8 }}>{looks.map((look, i) => <Img key={`${seed}-${i}`} src={url(frameRaster('personagens', look.body, DIRS[i % 2 === 0 ? 0 : 3], 1, look, 4, data))} alt={`personagem sorteado ${i + 1}`} />)}</div></section>;
}

function MapView({ data }: { data: ArtData }) {
  const names = Object.keys(data.maps), [map, setMap] = useState(names[0] ?? 'catacumbas'), [zoom, setZoom] = useState<1 | 2>(1);
  const [grid, setGrid] = useState(false), [box, setBox] = useState(false), [tileset, setTileset] = useState(''), [mark, setMark] = useState<Cell | null>(null);
  const hunt = HUNTS.find(h => h.id === map);
  const raster = useMemo(() => { try { return mapRaster(map, hunt?.color, data, tileset || undefined); } catch (e) { return null; } }, [data, map, tileset, hunt]);
  if (!raster) return <p>Mapa indisponível.</p>;
  const w = CANVAS_W * zoom / 2, h = CANVAS_H * zoom / 2, k = zoom / 2;
  return <div>
    <div className="bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      <select aria-label="Mapa" value={map} onChange={e => setMap(e.target.value)}>{[...new Set([...names, ...HUNTS.map(x => x.id)])].map(n => <option key={n}>{n}</option>)}</select>
      <select aria-label="Tileset" value={tileset} onChange={e => setTileset(e.target.value)}><option value="">(do mapa)</option>{Object.keys(data.tilesets).map(n => <option key={n}>{n}</option>)}</select>
      <button onClick={() => setZoom(zoom === 1 ? 2 : 1)}>{zoom}×</button>
      <label><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /> grade de células</label>
      <label><input type="checkbox" checked={box} onChange={e => setBox(e.target.checked)} /> caixa 3×3</label>
    </div>
    <div style={{ position: 'relative', width: w, height: h }} onClick={e => { if (!box) return; const r = e.currentTarget.getBoundingClientRect(); setMark(cellAt((e.clientX - r.left) / k, (e.clientY - r.top) / k)); }}>
      <Img src={url(raster)} alt={`mapa ${map}`} w={w} />
      {grid && <div data-testid="grid" style={{ position: 'absolute', left: ARENA.x * k, top: ARENA.y * k, width: ARENA.cols * CELL_PX * k, height: ARENA.rows * CELL_PX * k, outline: '2px solid #ffd36e', backgroundImage: 'linear-gradient(#fff4 1px, transparent 1px), linear-gradient(90deg, #fff4 1px, transparent 1px)', backgroundSize: `${CELL_PX * k}px ${CELL_PX * k}px` }} />}
      {box && mark && <div data-testid="box" style={{ position: 'absolute', left: (ARENA.x + (mark.c - 1) * CELL_PX) * k, top: (ARENA.y + (mark.r - 1) * CELL_PX) * k, width: 3 * CELL_PX * k, height: 3 * CELL_PX * k, border: '2px solid #4fae73', background: '#4fae7333' }} />}
    </div>
  </div>;
}

/** Estúdio de arte (só em desenvolvimento): sprites, tiles e mapas a partir dos CSV, com erros de validação em vermelho. */
export function StudioApp({ files }: { files: Record<string, string> }) {
  const [look, setLook] = useState<Look>(defaultLookFor(0));
  const { data, error } = useMemo(() => { try { return { data: buildArtData(files), error: '' }; } catch (e) { return { data: null, error: e instanceof ArtError || e instanceof Error ? e.message : String(e) }; } }, [files]);
  return <main style={{ fontFamily: 'Inter, sans-serif', background: '#0e131a', color: '#e7e0d2', minHeight: '100vh', padding: 16 }}>
    <h1 style={{ marginTop: 0 }}>Estúdio de arte</h1>
    {error && <pre role="alert" style={{ background: '#3a1212', color: '#ffb4b4', padding: 10, border: '1px solid #a33', whiteSpace: 'pre-wrap' }}>{error}</pre>}
    {data && <>
      <h2>Oficina de itens (arte por partes)</h2><Guard><GearWorkshop data={data} /></Guard>
      <h2>Personagens</h2><LookGallery data={data} />
      <h2>Sprites</h2>
      {data.meta.map(m => <section key={m.id} style={{ marginBottom: 18 }}><h3>{m.id} <small>({m.tipo}, {m.largura}×{m.altura}, {m.celulas})</small></h3>
        <SpriteBlock data={data} kind={m.tipo === 'personagem' ? 'personagens' : 'monstros'} id={m.id} look={m.tipo === 'personagem' ? look : undefined} />
        {m.tipo === 'personagem' && <Guard><Suspense fallback={null}><AppearancePicker value={look} onChange={setLook} restore={defaultLookFor(0)} /></Suspense></Guard>}</section>)}
      <h2>Tiles</h2>
      {Object.entries(data.tiles).map(([set, tiles]) => <section key={set}><h3>{set}</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Object.entries(tiles).map(([name, g]) => <figure key={name} style={{ margin: 0 }}><Img src={url(rasterize(toPixels(g, data.palette), 4))} alt={`tile ${name}`} /><figcaption style={{ fontSize: 10 }}>{name}</figcaption></figure>)}</div></section>)}
      <h2>Mapas</h2><MapView data={data} />
    </>}
  </main>;
}
