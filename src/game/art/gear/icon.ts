import { pngDataUrl } from '../png';
import { gearRaster, gearSize, recipeKey, type Recipe } from './assemble';

const cache = new Map<string, string>();
/**
 * PNG quadrado `box`×`box` com o item centralizado, na maior escala inteira que cabe (mínimo 1×): pixel nítido em qualquer ícone.
 * Se o item for maior que a caixa, a caixa cresce para ele (nunca corta).
 */
export function gearIconDataUrl(recipe: Recipe, box = 48): string {
  const key = `${recipeKey(recipe)}@${box}`; let url = cache.get(key);
  if (url) return url;
  const { w, h } = gearSize(recipe), scale = Math.max(1, Math.floor(box / Math.max(w, h))), r = gearRaster(recipe, scale), side = Math.max(box, r.width, r.height);
  const data = new Uint8ClampedArray(side * side * 4), ox = Math.floor((side - r.width) / 2), oy = Math.floor((side - r.height) / 2);
  for (let y = 0; y < r.height; y++) data.set(r.data.subarray(y * r.width * 4, (y + 1) * r.width * 4), ((oy + y) * side + ox) * 4);
  url = pngDataUrl(side, side, data); if (cache.size > 600) cache.clear(); cache.set(key, url);
  return url;
}
