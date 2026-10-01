import type { Character } from '../../game/core/types';
import { frameDataUrl } from '../../game/art/render';
import { normalizeLook } from '../../game/art/look';

/** Rosto do personagem: o quadro `down_1` do corpo com as cores do `look` (24×32, pixelado). `size` é a altura. */
export function Avatar({ character, size = 24 }: { character: Pick<Character, 'look'>; size?: number }) {
  const look = normalizeLook(character.look);
  return <img className="av-img" src={frameDataUrl({ kind: 'personagens', id: look.body, look }, 'down', 1, 4)} alt="" height={size} width={Math.round(size * 24 / 32)} aria-hidden="true" />;
}
