/**
 * Sprites de personagem: cosméticos e independentes de classe; cada personagem escolhe o seu (e pode trocar).
 * Cada sprite são 8 PNGs em public/assets/characters/<id>/ (down/up/left/right × _1/_2, fundo transparente,
 * pés centralizados na base, uma escala única; referência 220–252 × 328–351 px para `scale: 0.18`).
 * Para acrescentar um sprite pronto, basta uma linha aqui; arquivo ausente cai no bloco colorido, sem quebrar.
 */
export interface SpriteDef { id: string; name: string; scale: number; origin: readonly [number, number]; }

export const SPRITES: SpriteDef[] = [
  { id: 'necromancer', name: 'Necromante', scale: 0.18, origin: [0.5, 0.88] },
  // novos: acrescentar uma linha por sprite pronto
];

/** O bloco colorido da classe (o "sem arte"). */
export const DEFAULT_SPRITE = 'block';
export const spriteById = (id: string) => SPRITES.find(s => s.id === id);
export const isKnownSprite = (id: unknown): id is string => typeof id === 'string' && (id === DEFAULT_SPRITE || !!spriteById(id));
/** Sprite padrão do n-ésimo personagem criado: reveza pelo registro, ou o bloco se ele estiver vazio. */
export const defaultSpriteFor = (index: number) => SPRITES.length ? SPRITES[index % SPRITES.length].id : DEFAULT_SPRITE;
