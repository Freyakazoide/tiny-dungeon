import { useMemo, useState, type CSSProperties } from 'react';
import { gearDataUrl, gearSize, recipeKey, type Recipe } from '../game/art/gear/assemble';
import { FAMILIES, partsFor, TEMPLATES } from '../game/art/gear/catalog';
import { MATERIALS, SHINE_FACTOR, type Material } from '../game/art/gear/materials';
import { compatible, RARITIES, type Family, type Rarity } from '../game/art/gear/parts';
import { PLAN_RECIPES, recipeForSeed, recipeIssues, SWORD_LADDER } from '../game/art/gear/recipes';
import { OUTLINE_ROLES, ROLE_KEYS, ROLES } from '../game/art/gear/roles';
import type { ArtData } from '../game/art/data';
import { cellRaster } from '../game/art/render';
import { pngDataUrl } from '../game/art/png';

const RARITY_NAME: Record<Rarity, string> = { common: 'Comum', uncommon: 'Incomum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
const FAMILY_NAME: Record<Family, string> = { espada: 'Espada', arco: 'Arco', cajado: 'Cajado' };
const Pix = ({ src, alt, scale, native }: { src: string; alt: string; scale: number; native: number }) =>
  <img src={src} alt={alt} style={{ imageRendering: 'pixelated', width: native * scale, display: 'block' }} />;

function Item({ recipe, scale = 4, label }: { recipe: Recipe; scale?: number; label?: boolean }) {
  const { w } = gearSize(recipe);
  return <figure style={{ margin: 0, textAlign: 'center' }}><Pix src={gearDataUrl(recipe, 1)} alt={recipe.nome} scale={scale} native={w} />{label && <figcaption style={{ fontSize: 11, marginTop: 4 }}>{recipe.nome}</figcaption>}</figure>;
}

function Swatches({ m }: { m: Material }) {
  const cells: [string, string][] = [['deep', m.deep], ['rim', m.rim], ['shadow', m.shadow], ['base', m.base], ['highlight', m.highlight], ['specular', m.specular], ...(m.emissive ? [['emissive', m.emissive] as [string, string]] : [])];
  return <span style={{ display: 'inline-flex' }}>{cells.map(([k, c]) => <span key={k} title={`${k} ${c}`} style={{ width: 18, height: 18, background: c, display: 'inline-block' }} />)}</span>;
}

function Legend() {
  return <details open style={{ marginBottom: 14 }}><summary><b>Papéis e materiais</b></summary>
    <table style={{ borderCollapse: 'collapse', fontSize: 12, margin: '8px 0' }}><tbody>
      {ROLE_KEYS.map(k => <tr key={k}><td style={{ padding: '2px 8px' }}><code>{k}</code></td><td style={{ padding: '2px 8px' }}>{ROLES[k].nome}</td><td style={{ padding: '2px 8px', opacity: .75 }}>{ROLES[k].uso}</td></tr>)}
      <tr><td style={{ padding: '2px 8px' }}><i>auto</i></td><td style={{ padding: '2px 8px' }}>contorno profundo</td><td style={{ padding: '2px 8px', opacity: .75 }}>{OUTLINE_ROLES.profundo}</td></tr>
      <tr><td style={{ padding: '2px 8px' }}><i>auto</i></td><td style={{ padding: '2px 8px' }}>contorno lateral</td><td style={{ padding: '2px 8px', opacity: .75 }}>{OUTLINE_ROLES.lateral}</td></tr>
    </tbody></table>
    <table style={{ borderCollapse: 'collapse', fontSize: 12 }}><thead><tr><th align="left">Material</th><th align="left">Tipo</th><th align="left">Specular</th><th align="left">Rampa (profundo, lateral, sombra, base, brilho, specular, emissivo)</th></tr></thead><tbody>
      {Object.values(MATERIALS).map(m => <tr key={m.id}><td style={{ padding: '2px 8px' }}>{m.nome}</td><td style={{ padding: '2px 8px' }}>{m.tipo}</td><td style={{ padding: '2px 8px' }}>{m.brilho} ({Math.round(SHINE_FACTOR[m.brilho] * 100)}%)</td><td style={{ padding: '2px 8px' }}><Swatches m={m} /></td></tr>)}
    </tbody></table></details>;
}

const BACKGROUNDS = ['claro', 'escuro', 'dungeon'] as const;

/** Montador: escolhe família, parte e material de cada slot e mostra o item em 1×/2×/4× sobre fundo claro, escuro e de dungeon. */
function Builder({ data }: { data: ArtData }) {
  const [recipe, setRecipe] = useState<Recipe>(PLAN_RECIPES[1]);
  const [zoom, setZoom] = useState<1 | 2 | 4 | 8>(8);
  const tpl = TEMPLATES[recipe.familia], issues = recipeIssues(recipe);
  const floor = useMemo(() => { try { const r = cellRaster('catacumbas', undefined, ['piso', 'piso', 'piso', 'piso'], data, .8); return pngDataUrl(r.width, r.height, r.data); } catch { return ''; } }, [data]);
  const bg = (kind: (typeof BACKGROUNDS)[number]): CSSProperties => kind === 'claro' ? { background: '#e9e4d6' } : kind === 'escuro' ? { background: '#0e131a' } : { backgroundColor: '#26242a', backgroundImage: floor ? `url(${floor})` : undefined, backgroundSize: `${32 * zoom}px`, imageRendering: 'pixelated' };
  const setFamily = (f: Family) => setRecipe(PLAN_RECIPES.find(r => r.familia === f) ?? recipeForSeed(f, 'common', 1));
  const setSlot = (slot: string, patch: { parte?: string; material?: string }) => setRecipe(r => {
    const cur = r.partes[slot] ?? { parte: partsFor(r.familia, slot)[0].id, material: 'ferro' };
    return { ...r, partes: { ...r.partes, [slot]: { ...cur, ...patch } } };
  });
  const clearSlot = (slot: string) => setRecipe(r => { const partes = { ...r.partes }; delete partes[slot]; return { ...r, partes }; });
  return <section>
    <h3>Montador</h3>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      <select aria-label="Família" value={recipe.familia} onChange={e => setFamily(e.target.value as Family)}>{FAMILIES.map(f => <option key={f} value={f}>{FAMILY_NAME[f]}</option>)}</select>
      <select aria-label="Receita pronta" value="" onChange={e => { const found = [...PLAN_RECIPES, ...SWORD_LADDER].find(r => r.id === e.target.value); if (found) setRecipe(found); }}>
        <option value="">(receita pronta…)</option>{[...PLAN_RECIPES, ...SWORD_LADDER].map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
      {([1, 2, 4, 8] as const).map(z => <button key={z} onClick={() => setZoom(z)} aria-pressed={zoom === z}>{z}×</button>)}
    </div>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        {tpl.slots.filter(s => !s.espelhaDe).map(s => {
          const pick = recipe.partes[s.slot], parts = partsFor(recipe.familia, s.slot);
          const part = parts.find(p => p.id === pick?.parte);
          return <label key={s.slot} style={{ display: 'grid', gridTemplateColumns: '110px 150px 160px auto', gap: 6, alignItems: 'center' }}>
            <span>{s.nome}</span>
            <select aria-label={`${s.nome}: parte`} value={pick?.parte ?? ''} onChange={e => e.target.value ? setSlot(s.slot, { parte: e.target.value }) : clearSlot(s.slot)}>
              {s.opcional && <option value="">(nenhum)</option>}{parts.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <select aria-label={`${s.nome}: material`} value={pick?.material ?? ''} disabled={!pick} onChange={e => setSlot(s.slot, { material: e.target.value })}>
              {Object.values(MATERIALS).map(m => <option key={m.id} value={m.id}>{part && !compatible(part, m) ? '✗ ' : ''}{m.nome}</option>)}</select>
            {pick && <Swatches m={MATERIALS[pick.material]} />}
          </label>;
        })}
        {issues.length > 0 && <ul role="alert" style={{ color: '#ffb4b4', margin: 0, paddingLeft: 18 }}>{issues.map(i => <li key={i}>{i}</li>)}</ul>}
        <code style={{ fontSize: 11, opacity: .7, wordBreak: 'break-all', maxWidth: 560 }}>{recipeKey(recipe)}</code>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {BACKGROUNDS.map(kind => <div key={kind} style={{ ...bg(kind), padding: 14, minWidth: 40, display: 'grid', placeItems: 'center' }} title={`fundo ${kind}`}><Item recipe={recipe} scale={zoom} /></div>)}
      </div>
    </div>
  </section>;
}

/** Raridade vira receita: sorteia N itens da família/raridade. A semente repete o mesmo item. */
function RarityRoll() {
  const [familia, setFamilia] = useState<Family>('espada'), [rarity, setRarity] = useState<Rarity>('legendary'), [seed, setSeed] = useState(1);
  const recipes = useMemo(() => Array.from({ length: 12 }, (_, i) => recipeForSeed(familia, rarity, seed * 100 + i)), [familia, rarity, seed]);
  return <section>
    <h3>Sorteio por raridade</h3>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      <select aria-label="Família do sorteio" value={familia} onChange={e => setFamilia(e.target.value as Family)}>{FAMILIES.map(f => <option key={f} value={f}>{FAMILY_NAME[f]}</option>)}</select>
      <select aria-label="Raridade" value={rarity} onChange={e => setRarity(e.target.value as Rarity)}>{RARITIES.map(r => <option key={r} value={r}>{RARITY_NAME[r]}</option>)}</select>
      <button onClick={() => setSeed(s => s + 1)}>Sortear outros 12 (semente {seed})</button>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, background: '#1a1f27', padding: 12 }}>{recipes.map(r => <Item key={r.id + recipeKey(r)} recipe={r} scale={4} />)}</div>
  </section>;
}

export function GearWorkshop({ data }: { data: ArtData }) {
  const total = FAMILIES.map(f => { const t = TEMPLATES[f]; const n = t.slots.filter(s => !s.espelhaDe).reduce((acc, s) => acc * (partsFor(f, s.slot).length * Object.keys(MATERIALS).length + (s.opcional ? 1 : 0)), 1); return `${FAMILY_NAME[f]}: ${n.toLocaleString('pt-BR')}`; });
  return <div>
    <p style={{ fontSize: 13, opacity: .8 }}>Itens montados por partes (lâmina + guarda + cabo + pomo + efeito) e recoloridos por material. Combinações possíveis (sem contar a curadoria): {total.join(' · ')}.</p>
    <Legend />
    <Builder data={data} />
    <section><h3>Provas do plano</h3><div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', background: '#1a1f27', padding: 12 }}>{PLAN_RECIPES.map(r => <Item key={r.id} recipe={r} scale={6} label />)}</div></section>
    <section><h3>Escada de raridade da espada</h3><div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', background: '#1a1f27', padding: 12 }}>{SWORD_LADDER.map(r => <Item key={r.id} recipe={r} scale={6} label />)}</div></section>
    <RarityRoll />
  </div>;
}
