import { useState, type CSSProperties } from 'react';
import { DEFAULT_SPRITE, SPRITES } from '../game/data/sprites';

/** Miniatura (down_1.png) do sprite; se o PNG não existir, mostra um bloco. */
function Thumb({ id, color }: { id: string; color?: string }) {
  const [broken, setBroken] = useState(false);
  if (id === DEFAULT_SPRITE || broken) return <span className="sprite-thumb sprite-block" style={{ background: color ?? '#8f9aa8' }} aria-hidden="true" />;
  return <img className="sprite-thumb" src={`assets/characters/${id}/down_1.png`} alt="" onError={() => setBroken(true)} />;
}

/** Grade de miniaturas: um "Bloco" (sem arte) e um botão por sprite do registro. Cosmético e gratuito. */
export function SpritePicker({ value, onChange, color, label = 'Sprite' }: { value: string; onChange: (spriteId: string) => void; color?: string; label?: string }) {
  const options = [{ id: DEFAULT_SPRITE, name: 'Bloco' }, ...SPRITES.map(s => ({ id: s.id, name: s.name }))];
  return <div className="sprite-picker" role="radiogroup" aria-label={label}>{options.map(option =>
    <button type="button" role="radio" aria-checked={value === option.id} aria-label={`${label}: ${option.name}`} key={option.id} className={value === option.id ? 'selected' : ''} style={{ '--class-color': color } as CSSProperties} onClick={() => onChange(option.id)}>
      <Thumb id={option.id} color={color} /><small>{option.name}</small>
    </button>)}</div>;
}
