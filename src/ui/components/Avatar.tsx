import { useState, type CSSProperties } from 'react';
import type { Character } from '../../game/core/types';
import { CLASSES } from '../../game/data/classes';
import { DEFAULT_SPRITE } from '../../game/data/sprites';
import { colorHex } from '../format';

/** Rosto do personagem: down_1.png do sprite (pixelado) ou, sem arte, um bloco na cor da classe. */
export function Avatar({ character, size = 24 }: { character: Pick<Character, 'spriteId' | 'classId'>; size?: number }) {
  const [broken, setBroken] = useState(false);
  const color = colorHex(CLASSES[character.classId].color);
  if (character.spriteId === DEFAULT_SPRITE || broken) return <span className="av-block" style={{ width: size, height: size, background: color } as CSSProperties} aria-hidden="true" />;
  return <img src={`assets/characters/${character.spriteId}/down_1.png`} alt="" width={size} height={size} style={{ imageRendering: 'pixelated' }} onError={() => setBroken(true)} aria-hidden="true" />;
}
