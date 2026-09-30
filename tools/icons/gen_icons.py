#!/usr/bin/env python3
"""Gera os 48 ícones da interface (Fase 8) em public/assets/ui/icons/<nome>.png: pixel art 96×96, fundo transparente.

Uso:  python3 tools/icons/gen_icons.py            # grava os PNGs e a folha de contato tools/icons/preview.png
Cada ícone é uma função pequena desenhando numa grade 24×24 (ver pixel.py); os nomes batem com a seção 7 da Fase 8.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pixel import Canvas, sheet  # noqa: E402

C = dict(
    gold_l='#f8e495', gold='#d9ad3e', gold_d='#8c6a25',
    steel_l='#eef2f6', steel='#a7b2c0', steel_d='#637080',
    wood_l='#cf9d70', wood='#8d5c38', wood_d='#52331f',
    red_l='#f27c70', red='#c8453f', red_d='#782824',
    blue_l='#86b6f4', blue='#4c82d3', blue_d='#28497f',
    green_l='#95da8f', green='#50b05b', green_d='#27662f',
    purple_l='#d3a0f2', purple='#9c5cd3', purple_d='#57327f',
    cyan_l='#bdf2f4', cyan='#60cad8', cyan_d='#2c7689',
    skin='#ebbc8d', skin_d='#b27f57', white='#f6f3ec',
    parch_l='#f4e6c0', parch='#dbc48c', parch_d='#8f7645',
    orange='#f28c3c', yellow='#f7dc45', stone='#8b8f98', stone_d='#55596a', dark='#2a2f3a',
)


def shield(c, cx, top, bottom, half, base, light, dark, emblem=None):
    mid = top + (bottom - top) * 0.55
    pts = [(cx - half, top), (cx + half, top), (cx + half, mid), (cx, bottom), (cx - half, mid)]
    c.poly(pts, base)
    c.poly([(cx - half, top), (cx, top), (cx, bottom), (cx - half, mid)], light)
    c.poly([(cx + 1, top + 1), (cx + half, top + 1), (cx + half, mid), (cx + 1, bottom - 2)], dark)
    c.line(cx - half, top, cx + half - 1, top, C['steel_l'])
    if emblem:
        emblem(c, cx, (top + bottom) // 2)


def sword(c, tx, ty, hx, hy):
    """Espada na diagonal: ponta em (tx,ty), guarda em (hx,hy), cabo e pomo seguindo para baixo-esquerda."""
    c.line(tx, ty, hx, hy, C['steel_l'], 2)
    c.line(tx + 2, ty + 1, hx + 2, hy, C['steel'], 1)
    c.poly([(tx - 1, ty - 1), (tx + 3, ty - 1), (tx + 3, ty + 3)], C['steel_l'])
    c.line(hx - 3, hy - 2, hx + 3, hy + 4, C['gold'], 2)
    c.line(hx - 1, hy + 2, hx - 4, hy + 5, C['wood'], 2)
    c.rect(hx - 6, hy + 5, hx - 5, hy + 6, C['gold'])


# ---------------------------------------------------------------- trilho
def personagem(c):
    c.poly([(5, 20), (6, 14), (9, 12), (15, 12), (18, 14), (19, 20)], C['blue'])
    c.poly([(5, 20), (6, 14), (9, 12), (12, 12), (12, 20)], C['blue_l'])
    c.poly([(12, 12), (15, 12), (18, 14), (19, 20), (12, 20)], C['blue_d'])
    c.circle(12, 9, 4.6, C['blue_d'])
    c.circle(12, 9.5, 3.2, C['skin'])
    c.rect(9, 7, 15, 7, C['blue'])
    c.set(10, 10, C['dark']); c.set(13, 10, C['dark'])
    c.rect(11, 14, 12, 17, C['gold'])


def itens(c):
    c.rect(6, 9, 17, 20, C['wood'])
    c.rect(6, 9, 8, 20, C['wood_l'])
    c.rect(15, 9, 17, 20, C['wood_d'])
    c.poly([(6, 9), (7, 5), (16, 5), (17, 9)], C['wood_l'])
    c.rect(9, 3, 14, 4, C['wood_d'])
    c.rect(6, 13, 17, 14, C['gold_d'])
    c.rect(10, 12, 13, 16, C['gold'])
    c.rect(11, 13, 12, 14, C['gold_l'])
    c.rect(8, 17, 15, 19, C['wood_d'])


def comercio(c):
    c.ellipse(9, 17, 5, 2.2, C['gold_d']); c.ellipse(9, 15.6, 5, 2.2, C['gold'])
    c.ellipse(9, 14.2, 5, 2.2, C['gold_l'])
    c.circle(15, 10, 6, C['gold_d']); c.circle(15, 9.5, 5.2, C['gold']); c.circle(14.4, 9, 3.2, C['gold_l'])
    c.rect(14, 6, 15, 12, C['gold_d']); c.rect(13, 6, 16, 6, C['gold_d']); c.rect(13, 12, 16, 12, C['gold_d'])


def classes(c):
    c.rect(6, 6, 18, 18, C['parch'])
    c.rect(6, 6, 18, 7, C['parch_l'])
    for y in (10, 12, 14):
        c.rect(8, y, 16, y, C['parch_d'])
    c.ellipse(12, 5, 7, 2, C['parch_l']); c.ellipse(12, 19, 7, 2, C['parch_d'])
    c.rect(5, 4, 5, 6, C['wood']); c.rect(19, 18, 19, 20, C['wood'])
    c.circle(16, 16, 2.4, C['red']); c.circle(15.5, 15.5, 1.2, C['red_l'])


def grupo(c):
    shield(c, 12, 4, 20, 7, C['blue'], C['blue_l'], C['blue_d'],
           lambda cc, cx, cy: (cc.rect(cx - 1, cy - 4, cx, cy + 3, C['gold']), cc.rect(cx - 4, cy - 1, cx + 3, cy, C['gold'])))


def hunts(c):
    c.poly([(3, 6), (9, 4), (15, 6), (21, 4), (21, 18), (15, 20), (9, 18), (3, 20)], C['parch'])
    c.poly([(3, 6), (9, 4), (9, 18), (3, 20)], C['parch_l'])
    c.poly([(15, 6), (21, 4), (21, 18), (15, 20)], C['parch_d'])
    c.line(6, 15, 10, 12, C['wood'], 1); c.line(10, 12, 13, 14, C['wood'], 1); c.line(13, 14, 17, 9, C['wood'], 1)
    c.line(15, 7, 19, 11, C['red'], 2); c.line(19, 7, 15, 11, C['red'], 2)


def analyzer(c):
    c.rect(4, 19, 20, 20, C['steel_d'])
    c.rect(4, 4, 5, 20, C['steel_d'])
    c.rect(7, 13, 10, 18, C['blue']); c.rect(7, 13, 8, 18, C['blue_l'])
    c.rect(12, 8, 15, 18, C['green']); c.rect(12, 8, 13, 18, C['green_l'])
    c.rect(17, 5, 20, 18, C['gold']); c.rect(17, 5, 18, 18, C['gold_l'])


def helper(c):
    cx = cy = 12
    for ang in range(8):
        import math
        a = ang * math.pi / 4
        x, y = int(round(cx + 7.5 * math.cos(a) - 1.5)), int(round(cy + 7.5 * math.sin(a) - 1.5))
        c.rect(x, y, x + 2, y + 2, C['steel'])
    c.circle(12, 12, 6.2, C['steel']); c.circle(11.5, 11.5, 4.6, C['steel_l'])
    c.circle(12, 12, 2.6, C['dark'])
    c.ring(12, 12, 6.2, 5.2, C['steel_d'])


def progressao(c):
    c.rect(4, 19, 20, 20, C['steel_d'])
    c.rect(5, 15, 8, 18, C['green']); c.rect(9, 12, 12, 18, C['green']); c.rect(13, 9, 16, 18, C['green'])
    c.rect(5, 15, 6, 18, C['green_l']); c.rect(9, 12, 10, 18, C['green_l']); c.rect(13, 9, 14, 18, C['green_l'])
    c.line(5, 11, 11, 6, C['gold'], 2); c.poly([(12, 3), (19, 3), (19, 10)], C['gold']); c.line(11, 6, 18, 4, C['gold'], 2)


def charms(c):
    c.poly([(12, 3), (19, 9), (12, 21), (5, 9)], C['cyan'])
    c.poly([(12, 3), (5, 9), (12, 21)], C['cyan_l'])
    c.poly([(12, 3), (19, 9), (12, 21)], C['cyan_d'])
    c.poly([(12, 3), (16, 9), (12, 9), (8, 9)], C['white'])
    c.line(5, 9, 19, 9, C['cyan_d'])


def sistema(c):
    c.rect(4, 4, 19, 19, C['blue_d']); c.rect(4, 4, 19, 6, C['blue'])
    c.rect(7, 4, 16, 10, C['steel_l']); c.rect(13, 5, 15, 9, C['dark'])
    c.rect(7, 13, 16, 19, C['parch']); c.rect(9, 15, 14, 15, C['parch_d']); c.rect(9, 17, 14, 17, C['parch_d'])


# ---------------------------------------------------------------- atributos
def stat_hp(c):
    c.circle(8.3, 9, 4.3, C['red']); c.circle(15.7, 9, 4.3, C['red'])
    c.poly([(3.6, 10), (20.4, 10), (12, 20)], C['red'])
    c.circle(7.2, 8, 1.6, C['red_l']); c.rect(6, 7, 7, 8, C['white'])
    c.poly([(13, 11), (20, 10), (12, 20)], C['red_d'])


def stat_mana(c):
    c.poly([(12, 3), (18, 13), (12, 13), (6, 13)], C['blue'])
    c.circle(12, 15, 5.6, C['blue'])
    c.circle(10.5, 14, 2.6, C['blue_l']); c.rect(9, 12, 10, 13, C['white'])
    c.poly([(12, 3), (12, 13), (18, 13)], C['blue_d']); c.circle(13.5, 16.5, 3.6, C['blue_d'])
    c.circle(12, 15, 4, C['blue']); c.circle(10.6, 14, 2.3, C['blue_l']); c.set(9, 12, C['white']); c.set(10, 12, C['white'])


def stat_xp(c):
    import math
    pts = []
    for i in range(10):
        r = 9 if i % 2 == 0 else 4
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((12 + r * math.cos(a), 12.5 + r * math.sin(a)))
    c.poly(pts, C['gold'])
    c.poly([pts[0], pts[1], (12, 12.5), pts[9]], C['gold_l'])
    c.poly([pts[4], pts[5], pts[6], (12, 12.5)], C['gold_d'])


def stat_gold(c):
    c.circle(12, 12, 8.4, C['gold_d']); c.circle(12, 11.6, 7.4, C['gold']); c.ring(12, 11.6, 5.8, 4.8, C['gold_l'])
    c.rect(11, 8, 12, 15, C['gold_d']); c.rect(9, 8, 14, 8, C['gold_d']); c.rect(9, 15, 14, 15, C['gold_d'])
    c.circle(9, 8.5, 1.3, C['white'])


def stat_attack(c):
    sword(c, 18, 4, 9, 13)


def stat_defense(c):
    shield(c, 12, 3, 21, 8, C['steel'], C['steel_l'], C['steel_d'],
           lambda cc, cx, cy: cc.rect(cx - 1, cy - 4, cx, cy + 3, C['gold']))


def stat_resistance(c):
    c.circle(12, 12, 8.6, C['steel_d']); c.circle(12, 12, 7.4, C['steel']); c.circle(12, 12, 5, C['steel_l'])
    c.circle(12, 12, 3, C['blue']); c.circle(11, 11, 1.2, C['blue_l'])
    for x, y in ((12, 4), (12, 19), (4, 12), (19, 12)):
        c.rect(x - 1, y - 1, x, y, C['gold'])


def stat_crit(c):
    import math
    pts = []
    for i in range(16):
        r = 9.4 if i % 2 == 0 else 4.4
        a = i * math.pi / 8
        pts.append((12 + r * math.cos(a), 12 + r * math.sin(a)))
    c.poly(pts, C['red']); c.circle(12, 12, 4.4, C['orange']); c.circle(12, 12, 2.4, C['yellow'])


def stat_speed(c):
    for dy, col in ((-5, C['steel']), (0, C['cyan']), (5, C['steel'])):
        c.line(3, 12 + dy, 8, 12 + dy, col, 1)
    c.poly([(9, 5), (15, 12), (9, 19), (9, 15), (12, 12), (9, 9)], C['cyan'])
    c.poly([(14, 5), (20, 12), (14, 19), (14, 15), (17, 12), (14, 9)], C['cyan_l'])


def stat_magic(c):
    c.line(5, 19, 15, 9, C['wood'], 2); c.line(5, 19, 6, 18, C['wood_d'])
    c.circle(16, 8, 2.6, C['purple_l']); c.set(15, 7, C['white'])
    for x, y in ((16, 3), (16, 13), (11, 8), (21, 8)):
        c.set(x, y, C['yellow'])
    c.set(19, 5, C['yellow']); c.set(13, 5, C['yellow']); c.set(19, 11, C['yellow'])


# ---------------------------------------------------------------- elementos
def elem_fire(c):
    c.poly([(12, 2), (16, 8), (19, 13), (17, 19), (12, 21), (7, 19), (5, 13), (8, 9), (9, 12), (10, 6)], C['red'])
    c.poly([(12, 8), (15, 13), (16, 18), (12, 21), (8, 18), (9, 13)], C['orange'])
    c.poly([(12, 13), (14, 17), (12, 20), (10, 17)], C['yellow'])


def elem_ice(c):
    for ang in ((12, 3, 12, 21), (4, 7, 20, 17), (4, 17, 20, 7)):
        c.line(*ang, C['cyan'], 2)
    c.circle(12, 12, 3, C['cyan_l'])
    for x, y in ((12, 3), (12, 20), (4, 7), (19, 7), (4, 17), (19, 17)):
        c.rect(x - 1, y - 1, x, y, C['white'])


def elem_energy(c):
    c.poly([(14, 2), (6, 13), (11, 13), (9, 22), (18, 10), (12.5, 10)], C['yellow'])
    c.poly([(14, 2), (6, 13), (11, 13), (12, 8)], C['gold_l'])
    c.poly([(12.5, 10), (18, 10), (9, 22), (11, 13)], C['gold'])


def elem_earth(c):
    c.poly([(3, 19), (6, 11), (10, 7), (15, 9), (19, 14), (20, 19)], C['wood'])
    c.poly([(3, 19), (6, 11), (10, 7), (11, 13), (9, 19)], C['wood_l'])
    c.poly([(15, 9), (19, 14), (20, 19), (13, 19)], C['wood_d'])
    c.poly([(10, 7), (13, 4), (16, 7), (15, 9)], C['green']); c.rect(11, 5, 13, 6, C['green_l'])


def elem_poison(c):
    c.poly([(12, 3), (18, 12), (12, 12), (6, 12)], C['green'])
    c.circle(12, 15, 6, C['green']); c.circle(10.5, 13.5, 2.4, C['green_l'])
    c.poly([(12, 3), (12, 12), (18, 12)], C['green_d']); c.circle(13.5, 16.5, 3.4, C['green_d']); c.circle(12, 15, 4.4, C['green'])
    c.circle(10.4, 13.6, 2.3, C['green_l'])
    c.rect(10, 16, 11, 17, C['dark']); c.rect(13, 16, 14, 17, C['dark']); c.set(12, 18, C['dark'])


def elem_holy(c):
    import math
    for i in range(8):
        a = i * math.pi / 4
        c.line(12, 12, int(round(12 + 9 * math.cos(a))), int(round(12 + 9 * math.sin(a))), C['gold_l'], 2 if i % 2 == 0 else 1)
    c.circle(12, 12, 5, C['gold']); c.circle(11.4, 11.4, 3.4, C['gold_l']); c.circle(11, 11, 1.4, C['white'])


def elem_death(c):
    c.ellipse(12, 10, 7.4, 7, C['parch_l']); c.rect(8, 14, 16, 19, C['parch_l'])
    c.ellipse(12, 10, 7.4, 7, C['white']); c.rect(8, 14, 16, 19, C['white'])
    c.rect(8, 14, 9, 19, C['steel']); c.rect(15, 14, 16, 19, C['steel'])
    c.circle(9, 10, 2.2, C['dark']); c.circle(15, 10, 2.2, C['dark'])
    c.poly([(12, 12), (13, 14), (11, 14)], C['dark'])
    for x in (10, 12, 14):
        c.rect(x, 16, x, 18, C['dark'])


def elem_physical(c):
    c.rect(6, 10, 18, 19, C['skin']); c.rect(6, 10, 7, 19, C['skin_d'])
    for x in (6, 9, 12, 15):
        c.rect(x, 5, x + 2, 10, C['skin'])
        c.line(x, 5, x, 10, C['skin_d'])
    c.rect(17, 9, 19, 14, C['skin']); c.line(17, 5, 17, 9, C['skin_d'])
    c.rect(5, 18, 19, 20, C['steel']); c.rect(5, 18, 19, 18, C['steel_l'])


def elem_psychic(c):
    c.ellipse(12, 12, 9.4, 5.6, C['white']); c.ellipse(12, 12, 9.4, 5.6, C['purple_l'])
    c.circle(12, 12, 4.4, C['purple']); c.circle(12, 12, 2.6, C['dark']); c.set(10, 10, C['white'])
    for x, y in ((12, 3), (12, 21), (4, 5), (20, 5)):
        c.set(x, y, C['purple_l'])


# ---------------------------------------------------------------- proficiências
def prof_melee(c):
    sword(c, 18, 4, 9, 13)


def prof_ranged(c):
    c.line(6, 4, 6, 20, C['wood'], 1)
    c.poly([(6, 4), (13, 8), (16, 12), (13, 16), (6, 20)], None)
    for (x0, y0, x1, y1) in ((6, 4, 14, 8), (14, 8, 16, 12), (16, 12, 14, 16), (14, 16, 6, 20)):
        c.line(x0, y0, x1, y1, C['wood'], 2)
    c.line(6, 4, 6, 20, C['steel_l'], 1)
    c.line(4, 12, 19, 12, C['wood_l'], 1)
    c.poly([(21, 12), (17, 9), (17, 15)], C['steel_l'])
    c.poly([(3, 12), (6, 9), (6, 15)], C['red'])


def prof_defense(c):
    c.circle(12, 12, 8.6, C['wood_d']); c.circle(12, 12, 7.4, C['blue']); c.circle(12, 12, 7.4, C['blue'])
    c.ring(12, 12, 8.6, 7, C['steel']); c.circle(12, 12, 3.4, C['steel_l']); c.circle(11.4, 11.4, 1.6, C['white'])
    c.ring(12, 12, 7, 6, C['blue_l'])


def prof_magic(c):
    c.circle(12, 12, 8, C['purple_d']); c.circle(12, 12, 6.6, C['purple']); c.circle(10, 10, 3.2, C['purple_l'])
    c.set(9, 8, C['white']); c.set(10, 8, C['white']); c.set(8, 9, C['white'])
    for x, y in ((20, 4), (4, 4), (20, 20)):
        c.set(x, y, C['yellow']); c.set(x - 1, y, C['yellow']); c.set(x + 1, y, C['yellow']); c.set(x, y - 1, C['yellow']); c.set(x, y + 1, C['yellow'])


# ---------------------------------------------------------------- slots
def slot_helmet(c):
    c.poly([(4, 18), (4, 11), (7, 6), (12, 4), (17, 6), (20, 11), (20, 18)], C['steel'])
    c.poly([(4, 18), (4, 11), (7, 6), (12, 4), (12, 18)], C['steel_l'])
    c.poly([(12, 4), (17, 6), (20, 11), (20, 18), (12, 18)], C['steel_d'])
    c.rect(7, 11, 17, 13, C['dark']); c.rect(11, 11, 12, 18, C['dark'])
    c.rect(11, 1, 12, 4, C['red']); c.rect(10, 2, 13, 3, C['red_l'])


def slot_armor(c):
    c.poly([(3, 7), (8, 4), (10, 5), (14, 5), (16, 4), (21, 7), (19, 12), (17, 11), (17, 20), (7, 20), (7, 11), (5, 12)], C['steel'])
    c.poly([(3, 7), (8, 4), (10, 5), (12, 5), (12, 20), (7, 20), (7, 11), (5, 12)], C['steel_l'])
    c.poly([(12, 5), (14, 5), (16, 4), (21, 7), (19, 12), (17, 11), (17, 20), (12, 20)], C['steel_d'])
    c.rect(11, 6, 12, 19, C['gold']); c.rect(7, 13, 17, 14, C['gold_d'])


def slot_legs(c):
    c.rect(6, 3, 18, 7, C['steel_d']); c.rect(6, 3, 18, 4, C['gold'])
    c.rect(6, 7, 11, 20, C['steel']); c.rect(13, 7, 18, 20, C['steel'])
    c.rect(6, 7, 8, 20, C['steel_l']); c.rect(13, 7, 15, 20, C['steel_l'])
    c.rect(10, 7, 11, 20, C['steel_d']); c.rect(17, 7, 18, 20, C['steel_d'])
    c.rect(6, 12, 11, 12, C['steel_d']); c.rect(13, 12, 18, 12, C['steel_d'])


def slot_boots(c):
    c.poly([(7, 3), (14, 3), (14, 14), (20, 16), (21, 20), (5, 20), (5, 15), (7, 14)], C['wood'])
    c.poly([(7, 3), (11, 3), (11, 14), (7, 14), (5, 15), (5, 20), (8, 20), (9, 14)], C['wood_l'])
    c.rect(5, 18, 21, 20, C['wood_d']); c.rect(7, 4, 14, 6, C['steel']); c.rect(7, 4, 14, 4, C['steel_l'])
    c.rect(8, 9, 13, 9, C['gold']); c.rect(8, 12, 13, 12, C['gold'])


def slot_weapon(c):
    sword(c, 18, 4, 9, 13)


def slot_offhand(c):
    c.poly([(4, 4), (20, 4), (20, 13), (12, 21), (4, 13)], C['wood'])
    c.poly([(4, 4), (12, 4), (12, 21), (4, 13)], C['wood_l'])
    c.poly([(12, 4), (20, 4), (20, 13), (12, 21)], C['wood_d'])
    c.rect(4, 4, 20, 6, C['steel']); c.rect(4, 4, 20, 4, C['steel_l'])
    c.circle(12, 11, 3, C['steel']); c.circle(11.4, 10.4, 1.6, C['steel_l'])


def slot_amulet(c):
    c.line(6, 3, 12, 11, C['gold_d'], 1); c.line(18, 3, 12, 11, C['gold_d'], 1)
    c.line(7, 3, 12, 10, C['gold'], 1); c.line(17, 3, 12, 10, C['gold'], 1)
    c.poly([(12, 10), (17, 14), (12, 21), (7, 14)], C['red'])
    c.poly([(12, 10), (7, 14), (12, 21)], C['red_l'])
    c.poly([(12, 10), (17, 14), (12, 21)], C['red_d'])
    c.ring(12, 15, 7, 6, C['gold'])
    c.circle(12, 15, 2, C['red_l']); c.set(11, 14, C['white'])


def slot_ring(c):
    c.ring(12, 14, 7.8, 4.8, C['gold']); c.ring(12, 14, 7.8, 6.6, C['gold_l']); c.ring(12, 14, 5.8, 4.8, C['gold_d'])
    c.poly([(12, 2), (16, 5), (12, 9), (8, 5)], C['blue']); c.poly([(12, 2), (8, 5), (12, 9)], C['blue_l']); c.set(11, 4, C['white'])


# ---------------------------------------------------------------- estado
def status_running(c):
    c.poly([(6, 3), (20, 12), (6, 21)], C['green']); c.poly([(6, 3), (13, 7.5), (6, 12)], C['green_l'])
    c.poly([(6, 12), (13, 16.5), (6, 21)], C['green_d'])


def status_paused(c):
    c.rect(5, 4, 10, 20, C['gold']); c.rect(14, 4, 19, 20, C['gold'])
    c.rect(5, 4, 6, 20, C['gold_l']); c.rect(14, 4, 15, 20, C['gold_l'])
    c.rect(9, 4, 10, 20, C['gold_d']); c.rect(18, 4, 19, 20, C['gold_d'])


def status_recovering(c):
    c.rect(9, 3, 15, 21, C['green']); c.rect(3, 9, 21, 15, C['green'])
    c.rect(9, 3, 11, 21, C['green_l']); c.rect(3, 9, 21, 11, C['green_l'])
    c.rect(13, 13, 15, 21, C['green_d']); c.rect(13, 13, 21, 15, C['green_d'])
    c.rect(10, 10, 14, 14, C['white'])


def status_transition(c):
    c.rect(5, 3, 19, 5, C['wood_l']); c.rect(5, 19, 19, 21, C['wood_l'])
    c.poly([(6, 5), (18, 5), (13, 12), (18, 19), (6, 19), (11, 12)], C['cyan'])
    c.poly([(6, 5), (12, 5), (12, 12), (11, 12)], C['cyan_l'])
    c.poly([(9, 17), (15, 17), (12, 14)], C['gold_l'])


def badge_tank(c):
    shield(c, 12, 3, 21, 8, C['gold'], C['gold_l'], C['gold_d'],
           lambda cc, cx, cy: cc.poly([(cx, cy - 4), (cx + 2, cy), (cx + 4, cy), (cx + 1, cy + 2), (cx + 2, cy + 5), (cx, cy + 3), (cx - 2, cy + 5), (cx - 1, cy + 2), (cx - 4, cy), (cx - 2, cy)], C['red']))


def badge_new(c):
    import math
    pts = []
    for i in range(16):
        r = 9.4 if i % 2 == 0 else 6.4
        a = i * math.pi / 8
        pts.append((12 + r * math.cos(a), 12 + r * math.sin(a)))
    c.poly(pts, C['green']); c.circle(12, 12, 6, C['green_l'])
    c.rect(11, 6, 12, 14, C['green_d']); c.rect(11, 16, 12, 17, C['green_d'])


ICONS = {
    # trilho
    'personagem': personagem, 'itens': itens, 'comercio': comercio, 'classes': classes, 'grupo': grupo, 'hunts': hunts,
    'analyzer': analyzer, 'helper': helper, 'progressao': progressao, 'charms': charms, 'sistema': sistema,
    # atributos
    'stat_hp': stat_hp, 'stat_mana': stat_mana, 'stat_xp': stat_xp, 'stat_gold': stat_gold, 'stat_attack': stat_attack,
    'stat_defense': stat_defense, 'stat_resistance': stat_resistance, 'stat_crit': stat_crit, 'stat_speed': stat_speed, 'stat_magic': stat_magic,
    # elementos
    'elem_fire': elem_fire, 'elem_ice': elem_ice, 'elem_energy': elem_energy, 'elem_earth': elem_earth, 'elem_poison': elem_poison,
    'elem_holy': elem_holy, 'elem_death': elem_death, 'elem_physical': elem_physical, 'elem_psychic': elem_psychic,
    # proficiências de combate
    'prof_melee': prof_melee, 'prof_ranged': prof_ranged, 'prof_defense': prof_defense, 'prof_magic': prof_magic,
    # slots
    'slot_helmet': slot_helmet, 'slot_armor': slot_armor, 'slot_legs': slot_legs, 'slot_boots': slot_boots,
    'slot_weapon': slot_weapon, 'slot_offhand': slot_offhand, 'slot_amulet': slot_amulet, 'slot_ring': slot_ring,
    # estado
    'status_running': status_running, 'status_paused': status_paused, 'status_recovering': status_recovering,
    'status_transition': status_transition, 'badge_tank': badge_tank, 'badge_new': badge_new,
}


def build():
    out = {}
    for name, draw in ICONS.items():
        canvas = Canvas()
        draw(canvas)
        canvas.outline()
        out[name] = canvas
    return out


if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dest = os.path.join(root, 'public', 'assets', 'ui', 'icons')
    os.makedirs(dest, exist_ok=True)
    icons = build()
    for name, canvas in icons.items():
        with open(os.path.join(dest, f'{name}.png'), 'wb') as f:
            f.write(canvas.to_png())
    with open(os.path.join(os.path.dirname(__file__), 'preview.png'), 'wb') as f:
        f.write(sheet(icons))
    print(f'{len(icons)} ícones em {dest}')
