#!/usr/bin/env python3
"""Gera os 90 emblemas das especializações (public/assets/ui/icons/class_<id>.png) e a folha class_spec_preview.png.

Regra visual: pura = medalhão redondo com o glifo da habilidade e, no canto, a marca do contador; híbrida = losango de duas cores com os
dois glifos; elementos livres (Mago) = anel com orbes coloridos. Uso: python3 tools/icons/gen_spec_icons.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'classes'))
from gen_icons import C  # noqa: E402
from pixel import Canvas, rgb, sheet  # noqa: E402
from specs import SPECS  # noqa: E402

TONE = dict(  # (base, claro, escuro)
    melee=('#c8453f', '#f27c70', '#782824'), ranged=('#50b05b', '#95da8f', '#27662f'), defense=('#4c82d3', '#86b6f4', '#28497f'), magic=('#7a6ad8', '#b3a8f4', '#3d3585'),
    fire=('#f28c3c', '#f7dc45', '#9c3f12'), ice=('#60cad8', '#bdf2f4', '#2c7689'), energy=('#f7dc45', '#fff7b0', '#9c8420'), earth=('#8d5c38', '#cf9d70', '#52331f'),
    poison=('#7cab3c', '#b9e06a', '#3f6a1c'), holy=('#e6c15a', '#fff1b8', '#8c6a25'), death=('#9c5cd3', '#d3a0f2', '#57327f'), physical=('#a7b2c0', '#eef2f6', '#637080'),
    psychic=('#e06fb4', '#f7b4dd', '#8f2f6d'),
)
WHITE, DARK = '#f6f3ec', '#2a2f3a'


def px(c, x, y, color):
    c.set(int(round(x)), int(round(y)), color)


def glyph(c, name, cx, cy, s):
    """Glifo de `s` px de lado centrado em (cx, cy). Coordenadas normalizadas em [-1, 1]."""
    base, light, dark = TONE[name]
    h = s / 2.0

    def P(x, y):
        return (cx + x * h, cy + y * h)

    def L(x0, y0, x1, y1, color, t=1):
        a, b = P(x0, y0), P(x1, y1)
        c.line(int(round(a[0])), int(round(a[1])), int(round(b[0])), int(round(b[1])), color, t)

    def poly(pts, color):
        c.poly([P(x, y) for x, y in pts], color)

    t = 2 if s >= 11 else 1
    if name == 'melee':
        L(-.7, .7, .7, -.7, WHITE, t); L(-.8, .35, -.35, .8, '#d9ad3e', t); poly([(.5, -.9), (.95, -.95), (.9, -.5)], WHITE)
    elif name == 'ranged':
        L(-.5, -.8, -.5, .8, '#cf9d70', 1); poly([(-.5, -.8), (.4, -.4), (.4, .4), (-.5, .8), (-.2, 0)], '#8d5c38'); L(-.4, 0, .9, 0, WHITE, 1); poly([(.9, -.3), (1.1, 0), (.9, .3)], WHITE)
    elif name == 'defense':
        poly([(-.8, -.8), (.8, -.8), (.8, .1), (0, 1), (-.8, .1)], light); poly([(-.8, -.8), (0, -.8), (0, 1), (-.8, .1)], base); L(0, -.5, 0, .5, WHITE, 1)
    elif name == 'magic':
        poly([(0, -1), (.28, -.28), (1, 0), (.28, .28), (0, 1), (-.28, .28), (-1, 0), (-.28, -.28)], light); poly([(0, -.5), (.15, -.15), (.5, 0), (.15, .15), (0, .5), (-.15, .15), (-.5, 0), (-.15, -.15)], WHITE)
    elif name == 'fire':
        poly([(0, -1), (.6, -.1), (.8, .5), (0, 1), (-.8, .5), (-.6, -.1)], base); poly([(0, -.2), (.4, .4), (0, .9), (-.4, .4)], light)
    elif name == 'ice':
        poly([(0, -1), (.6, -.3), (.6, .5), (0, 1), (-.6, .5), (-.6, -.3)], base); poly([(0, -1), (0, 1), (-.6, .5), (-.6, -.3)], light); L(0, -.6, 0, .6, WHITE, 1)
    elif name == 'energy':
        poly([(.2, -1), (-.7, .2), (-.05, .2), (-.3, 1), (.7, -.2), (.05, -.2)], base); poly([(.15, -.7), (-.35, .1), (.1, .1)], light)
    elif name == 'earth':
        poly([(-.9, .6), (-.4, -.6), (.2, -.8), (.9, .1), (.6, .8)], base); poly([(-.4, -.6), (.2, -.8), (0, 0)], light); L(.1, .1, .4, .6, dark, 1)
    elif name == 'poison':
        poly([(0, -1), (.7, .2), (.6, .7), (0, 1), (-.6, .7), (-.7, .2)], base); poly([(0, -.5), (.3, .2), (-.1, .3)], light)
    elif name == 'holy':
        L(0, -1, 0, 1, base, t); L(-.7, -.35, .7, -.35, base, t); c.circle(*P(0, -.35), max(1, h * .3), WHITE)
    elif name == 'death':
        c.circle(*P(0, -.2), max(1.5, h * .7), WHITE); poly([(-.35, .3), (.35, .3), (.3, .95), (-.3, .95)], WHITE); c.circle(*P(-.3, -.25), max(.5, h * .22), dark); c.circle(*P(.3, -.25), max(.5, h * .22), dark)
    elif name == 'physical':
        poly([(-.8, -.6), (.8, -.6), (.8, .5), (-.8, .5)], base); L(-.3, -.6, -.3, .1, dark, 1); L(.2, -.6, .2, .1, dark, 1); poly([(-.8, .5), (.8, .5), (.5, 1), (-.5, 1)], light)
    elif name == 'psychic':
        poly([(-1, 0), (-.4, -.6), (.4, -.6), (1, 0), (.4, .6), (-.4, .6)], WHITE); c.circle(*P(0, 0), max(1, h * .45), base); c.circle(*P(0, 0), max(.5, h * .2), dark)


def mark(c, counter, x, y):
    """Marca pequena do contador (5×5) no canto."""
    c.rect(x - 3, y - 3, x + 3, y + 3, DARK)
    if counter == 'crits': c.line(x - 2, y + 2, x + 2, y - 2, '#f7dc45'); c.line(x - 2, y - 2, x + 2, y + 2, '#f7dc45')
    elif counter == 'bossCrits': c.rect(x - 2, y, x + 2, y + 1, '#d9ad3e'); c.set(x - 2, y - 1, '#d9ad3e'); c.set(x, y - 2, '#d9ad3e'); c.set(x + 2, y - 1, '#d9ad3e')
    elif counter == 'damageTaken': c.rect(x - 2, y - 2, x + 2, y + 1, '#4c82d3'); c.set(x - 1, y + 2, '#4c82d3'); c.set(x, y + 2, '#4c82d3'); c.set(x + 1, y + 2, '#4c82d3')
    elif counter == 'healingDone': c.rect(x - 2, y, x + 2, y, '#95da8f'); c.rect(x, y - 2, x, y + 2, '#95da8f')
    elif counter == 'buffsApplied': c.line(x, y + 2, x, y - 2, '#f7dc45'); c.line(x - 2, y, x, y - 2, '#f7dc45'); c.line(x + 2, y, x, y - 2, '#f7dc45')
    elif counter == 'dotDamage': c.circle(x, y, 2, '#7cab3c'); c.set(x, y - 2, '#b9e06a')
    elif counter == 'supportPotionsUsed': c.rect(x - 1, y - 2, x + 1, y - 1, WHITE); c.poly([(x - 1, y), (x + 2, y), (x + 3, y + 3), (x - 2, y + 3)], '#e06fb4')
    elif counter == 'bossKills': c.circle(x, y - 1, 2, WHITE); c.rect(x - 1, y + 1, x + 1, y + 2, WHITE); c.set(x - 1, y - 1, DARK); c.set(x + 1, y - 1, DARK)
    elif counter == 'goldEarned': c.circle(x, y, 2.4, '#f7dc45'); c.circle(x, y, 1.2, '#d9ad3e')
    elif counter == 'controlSpells': c.ring(x, y, 2.6, 1.4, '#e06fb4'); c.set(x, y, '#e06fb4')


def medallion(c, tones):
    c.circle(12, 12, 10.5, DARK); c.circle(12, 12, 9.6, tones[0]); c.circle(12, 12, 8.2, tones[2])
    c.circle(12, 12, 6.6, tuple(max(0, v - 14) for v in rgb(tones[2])[:3]) + (255,))


def diamond(c, a, b):
    c.poly([(12, 1.2), (22.8, 12), (12, 22.8), (1.2, 12)], DARK)
    c.poly([(12, 2.4), (21.6, 12), (12, 21.6), (2.4, 12)], a[0])
    c.poly([(12, 2.4), (21.6, 12), (12, 21.6)], b[0])
    c.poly([(12, 4), (19.8, 12), (12, 19.8), (4.2, 12)], DARK)
    c.poly([(12, 4.4), (4.6, 12), (12, 19.4)], a[2]); c.poly([(12, 4.4), (19.4, 12), (12, 19.4)], b[2])


ELEMENT_ORDER = ['fire', 'ice', 'energy', 'earth', 'poison', 'holy', 'death', 'physical', 'psychic']


def draw(spec):
    c = Canvas()
    skills = list(spec['skills'])
    if spec['elements']:
        n = spec['elements'][0]
        medallion(c, TONE['magic'])
        names = ELEMENT_ORDER[:n] if n < 5 else [ELEMENT_ORDER[i] for i in (0, 1, 2, 4, 6)]
        for i, name in enumerate(names):
            ang = -math.pi / 2 + i * 2 * math.pi / len(names)
            ox, oy = 12 + 6 * math.cos(ang), 12 + 6 * math.sin(ang)
            c.circle(ox, oy, 2.7, DARK); c.circle(ox, oy, 2.0, TONE[name][0]); c.set(int(ox), int(oy - 1), TONE[name][1])
        glyph(c, 'magic', 12, 12, 7)
    elif len(skills) == 1:
        medallion(c, TONE[skills[0]])
        glyph(c, skills[0], 11.5 if spec['counter'] else 12, 11.5 if spec['counter'] else 12, 12 if not spec['counter'] else 11)
        if spec['counter']:
            mark(c, spec['counter'], 18, 18)
    else:
        a, b = skills
        diamond(c, TONE[a], TONE[b])
        glyph(c, a, 8.5, 12, 8); glyph(c, b, 15.5, 12, 8)
    c.outline()
    return c


if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dest = os.path.join(root, 'public', 'assets', 'ui', 'icons')
    icons = {}
    for spec in SPECS:
        c = draw(spec); icons[f'class_{spec["id"]}'] = c
        with open(os.path.join(dest, f'class_{spec["id"]}.png'), 'wb') as f:
            f.write(c.to_png())
    with open(os.path.join(os.path.dirname(__file__), 'class_spec_preview.png'), 'wb') as f:
        f.write(sheet(icons, cols=15))
    print(f'{len(icons)} emblemas de especialização.')
