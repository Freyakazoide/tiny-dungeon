import { parseCsv, parseGrid } from './csv';

/** Chave da paleta → cor `#rrggbb`, ou `null` para transparente. */
export type Palette = Record<string, string | null>;
export type Grid = string[][];
export interface ColorOption { id: string; nome: string; cor: string }
export interface RegionKey { regiao: string; chave: string; tom: 'base' | 'claro' | 'escuro' }
export interface MetaRow { id: string; tipo: 'personagem' | 'monstro'; largura: number; altura: number; celulas: '1x1' | '2x2'; monstroId?: string; hunt?: string }
export type FrameName = `${'down' | 'up' | 'left' | 'right'}_${1 | 2}`;
export interface ArtData {
  palette: Palette; paletteNames: Record<string, string>;
  regions: RegionKey[]; colors: Record<string, ColorOption[]>; meta: MetaRow[];
  sprites: { personagens: Record<string, Partial<Record<FrameName, Grid>>>; monstros: Record<string, Partial<Record<FrameName, Grid>>> };
  tiles: Record<string, Record<string, Grid>>; maps: Record<string, Grid>; tilesets: Record<string, Palette>;
}

/** Erro de validação com o caminho do arquivo e a linha. */
export class ArtError extends Error { constructor(path: string, line: number | undefined, message: string) { super(`${path}${line ? `:${line}` : ''}: ${message}`); this.name = 'ArtError'; } }

const HEX = /^#[0-9a-fA-F]{6}$/;
const fileKey = (path: string) => path.replace(/^\/?arte\//, '');

/** Monta e valida os dados a partir de `{ caminho: texto }` (a carga real vem de `import.meta.glob`). */
export function buildArtData(files: Record<string, string>): ArtData {
  const byKey = new Map(Object.entries(files).map(([path, text]) => [fileKey(path), { path, text }]));
  const need = (name: string) => { const f = byKey.get(name); if (!f) throw new ArtError(`arte/${name}`, undefined, 'arquivo ausente'); return f; };
  const table = (name: string, header: string[]) => {
    const f = need(name), rows = parseCsv(f.text);
    if (!rows.length || header.some((h, i) => rows[0].cells[i] !== h)) throw new ArtError(f.path, rows[0]?.line ?? 1, `cabeçalho esperado: ${header.join(',')}`);
    return { f, rows: rows.slice(1) };
  };

  const palette: Palette = {}, paletteNames: Record<string, string> = {};
  { const { f, rows } = table('palette.csv', ['chave', 'cor', 'nome']);
    for (const r of rows) {
      const [key, color, name = ''] = r.cells;
      if (key.length !== 1) throw new ArtError(f.path, r.line, `chave "${key}" deve ter 1 caractere`);
      if (key in palette) throw new ArtError(f.path, r.line, `chave "${key}" repetida`);
      if (color === 'transparente') palette[key] = null; else if (HEX.test(color)) palette[key] = color.toLowerCase(); else throw new ArtError(f.path, r.line, `cor inválida "${color}"`);
      paletteNames[key] = name;
    } }

  const regions: RegionKey[] = [];
  { const { f, rows } = table('regioes.csv', ['regiao', 'chave', 'tom']);
    for (const r of rows) {
      const [regiao, chave, tom] = r.cells;
      if (!(chave in palette)) throw new ArtError(f.path, r.line, `chave "${chave}" não existe na paleta`);
      if (tom !== 'base' && tom !== 'claro' && tom !== 'escuro') throw new ArtError(f.path, r.line, `tom inválido "${tom}"`);
      regions.push({ regiao, chave, tom });
    } }

  const colors: Record<string, ColorOption[]> = {};
  { const { f, rows } = table('cores.csv', ['regiao', 'id', 'nome', 'cor']);
    for (const r of rows) {
      const [regiao, id, nome, cor] = r.cells;
      if (!HEX.test(cor ?? '')) throw new ArtError(f.path, r.line, `cor inválida "${cor}"`);
      const list = colors[regiao] ??= [];
      if (list.some(o => o.id === id)) throw new ArtError(f.path, r.line, `id "${id}" repetido em ${regiao}`);
      list.push({ id, nome, cor: cor.toLowerCase() });
    } }

  const meta: MetaRow[] = [];
  { const { f, rows } = table('meta.csv', ['id', 'tipo', 'largura', 'altura', 'celulas', 'monstro_id', 'hunt']);
    for (const r of rows) {
      const [id, tipo, w, h, celulas, monstroId, hunt] = r.cells;
      if (tipo !== 'personagem' && tipo !== 'monstro') throw new ArtError(f.path, r.line, `tipo inválido "${tipo}"`);
      if (celulas !== '1x1' && celulas !== '2x2') throw new ArtError(f.path, r.line, `celulas inválido "${celulas}"`);
      if (!Number(w) || !Number(h)) throw new ArtError(f.path, r.line, 'largura/altura inválidas');
      meta.push({ id, tipo, largura: Number(w), altura: Number(h), celulas, monstroId: monstroId || undefined, hunt: hunt || undefined });
    } }

  const grid = (f: { path: string; text: string }, allowTileNames = false, tileNames?: Set<string>): Grid => {
    const rows = parseGrid(f.text);
    if (!rows.length) throw new ArtError(f.path, undefined, 'grade vazia');
    const width = rows[0].cells.length;
    for (const r of rows) {
      if (r.cells.length !== width) throw new ArtError(f.path, r.line, `linha com ${r.cells.length} colunas (esperado ${width})`);
      for (const cell of r.cells) {
        if (allowTileNames) { if (!tileNames?.has(cell)) throw new ArtError(f.path, r.line, `tile desconhecido "${cell}"`); }
        else if (!(cell in palette)) throw new ArtError(f.path, r.line, `chave "${cell}" não existe em palette.csv`);
      }
    }
    return rows.map(r => r.cells);
  };

  const sprites: ArtData['sprites'] = { personagens: {}, monstros: {} };
  const tiles: ArtData['tiles'] = {}, maps: ArtData['maps'] = {};
  const mapFiles: { name: string; f: { path: string; text: string } }[] = [];
  for (const [key, f] of byKey) {
    let m = /^(personagens|monstros)\/([^/]+)\/(down|up|left|right)_([12])\.csv$/.exec(key);
    if (m) { ((sprites[m[1] as 'personagens' | 'monstros'][m[2]] ??= {}) as Record<string, Grid>)[`${m[3]}_${m[4]}`] = grid(f); continue; }
    m = /^tiles\/([^/]+)\/([^/]+)\.csv$/.exec(key);
    if (m) { const g = grid(f); if (g.length !== 16 || g.some(row => row.length !== 16)) throw new ArtError(f.path, undefined, `tile deve ser 16×16 (é ${g[0].length}×${g.length})`); (tiles[m[1]] ??= {})[m[2]] = g; continue; }
    m = /^mapas\/([^/]+)\.csv$/.exec(key);
    if (m) mapFiles.push({ name: m[1], f });
  }
  for (const { name, f } of mapFiles) { const set = tiles[name] ?? tiles.catacumbas ?? {}; maps[name] = grid(f, true, new Set(Object.keys(set))); }

  const tilesets: Record<string, Palette> = {};
  if (byKey.has('tilesets.csv')) { const { f, rows } = table('tilesets.csv', ['tileset', 'troca']);
    for (const r of rows) {
      const swap: Palette = {};
      for (const part of (r.cells[1] ?? '').split(';').filter(Boolean)) {
        const [key, hex] = part.split('=');
        if (!(key in palette)) throw new ArtError(f.path, r.line, `chave "${key}" não existe na paleta`);
        if (!HEX.test(hex ?? '')) throw new ArtError(f.path, r.line, `cor inválida "${hex}"`);
        swap[key] = hex.toLowerCase();
      }
      tilesets[r.cells[0]] = swap;
    } }

  return { palette, paletteNames, regions, colors, meta, sprites, tiles, maps, tilesets };
}

/** Carga real: todos os CSV de `arte/` (leitura síncrona, validada na importação). */
const RAW = import.meta.glob('/arte/**/*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const ART: ArtData = buildArtData(RAW);
export const monsterArtId = (monsterId: string) => ART.meta.find(m => m.tipo === 'monstro' && m.monstroId === monsterId)?.id;
