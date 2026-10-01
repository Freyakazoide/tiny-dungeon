import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTER_ANIMATION_FPS, CHARACTER_DIRECTIONS } from './assets';

const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe('arte em CSV (sem imagens no jogo)', () => {
  it('constantes de animação continuam as mesmas', () => {
    expect(CHARACTER_ANIMATION_FPS).toBe(6); expect(CHARACTER_DIRECTIONS).toEqual(['down', 'up', 'left', 'right']);
  });
  it('public/assets contém apenas ui/ e o repositório não referencia characters/, maps/ nem bg.png', () => {
    expect(readdirSync('public/assets')).toEqual(['ui']);
    expect(existsSync('public/assets/maps')).toBe(false); expect(existsSync('public/assets/characters')).toBe(false);
    for (const file of walk('src').filter(f => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f))) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/assets\/(characters|maps)\/|\bbg\.png|logo\.png|star\.png/);
    }
  });
  it('as cenas não carregam imagens de mapas, personagens ou monstros (load.image)', () => {
    for (const file of walk('src/game/scenes').filter(f => f.endsWith('.ts') && !f.includes('.test.'))) expect(readFileSync(file, 'utf8'), file).not.toMatch(/load\.image|load\.setPath/);
  });
  it('documentos que estavam em public/assets/maps foram para docs/', () => {
    expect(readdirSync('docs').filter(f => f.endsWith('.md')).length).toBeGreaterThanOrEqual(3);
  });
  it('nenhum arquivo importa SPRITES, characterFramePath, spriteId ou data/sprites', () => {
    for (const file of walk('src').filter(f => /\.(ts|tsx)$/.test(f) && !/assets\.test|\.test\.|persistence\/validation/.test(f))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\bSPRITES\b|characterFramePath|spriteId\b|data\/sprites|SpritePicker|setSprite/);
    }
  });
});
