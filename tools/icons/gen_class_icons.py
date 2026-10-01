#!/usr/bin/env python3
"""Gera os 15 emblemas de classe (public/assets/ui/icons/class_<id>.png, 96×96) e a folha tools/icons/class_preview.png.

Uso: python3 tools/icons/gen_class_icons.py   (mesma paleta e rasterizador de gen_icons.py)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_icons import C  # noqa: E402
from pixel import Canvas, sheet  # noqa: E402


def disc(c, base, light, dark):
    """Medalhão de fundo: disco com borda e brilho."""
    c.circle(12, 12, 10.5, dark)
    c.circle(12, 12, 9.4, base)
    c.circle(11, 11, 6.5, light)
    c.circle(12, 12.5, 8, base)


def guerreiro(c):
    disc(c, C['red_d'], C['red'], C['dark'])
    c.line(7, 17, 17, 6, C['steel_l'], 2); c.line(9, 18, 18, 8, C['steel'], 1)
    c.poly([(16, 4), (19, 4), (19, 7)], C['steel_l'])
    c.line(5, 14, 10, 19, C['gold'], 2); c.line(6, 19, 4, 21, C['wood'], 2)


def guardiao(c):
    disc(c, C['blue_d'], C['blue'], C['dark'])
    c.poly([(7, 6), (17, 6), (17, 13), (12, 19), (7, 13)], C['steel'])
    c.poly([(7, 6), (12, 6), (12, 19), (7, 13)], C['steel_l'])
    c.rect(11, 8, 12, 15, C['gold']); c.rect(9, 10, 14, 11, C['gold'])


def ladino(c):
    disc(c, C['purple_d'], C['purple'], C['dark'])
    c.line(6, 18, 17, 6, C['steel_l'], 2); c.line(18, 18, 7, 6, C['steel'], 2)
    c.line(5, 19, 8, 16, C['wood'], 2); c.line(19, 19, 16, 16, C['wood'], 2)
    c.set(12, 12, C['gold'])


def cacador(c):
    disc(c, C['green_d'], C['green'], C['dark'])
    c.line(8, 5, 8, 19, C['wood_l'], 2); c.poly([(8, 5), (14, 9), (14, 15), (8, 19), (10, 12)], C['wood'])
    c.line(9, 12, 18, 12, C['steel_l'], 1); c.poly([(18, 10), (21, 12), (18, 14)], C['steel_l'])
    c.line(8, 5, 8, 19, C['parch'], 1)


def mago(c):
    disc(c, C['blue_d'], C['cyan_d'], C['dark'])
    c.poly([(12, 3), (17, 14), (7, 14)], C['blue']); c.poly([(12, 3), (12, 14), (7, 14)], C['blue_l'])
    c.rect(5, 14, 18, 15, C['blue_d']); c.circle(12, 17.5, 3.2, C['cyan'])
    c.set(12, 8, C['yellow']); c.set(10, 11, C['yellow']); c.set(14, 10, C['yellow'])


def clerigo(c):
    disc(c, C['gold_d'], C['gold'], C['dark'])
    c.rect(11, 4, 12, 19, C['white']); c.rect(7, 8, 16, 9, C['white'])
    c.rect(10, 6, 13, 6, C['gold_l']); c.circle(12, 12, 1.2, C['gold_l'])


def bardo(c):
    disc(c, C['orange'], C['yellow'], C['dark'])
    c.circle(9, 17, 2.8, C['wood_d']); c.circle(9, 17, 1.8, C['wood'])
    c.rect(11, 6, 12, 17, C['wood_d']); c.poly([(12, 6), (18, 8), (18, 11), (12, 9)], C['wood_d'])
    c.circle(16, 13, 2.2, C['wood_d'])


def monge(c):
    disc(c, C['orange'], C['gold_l'], C['dark'])
    c.rect(7, 9, 17, 17, C['skin']); c.rect(7, 9, 17, 10, C['skin_d'])
    for x in (8, 11, 14): c.rect(x, 6, x + 2, 9, C['skin'])
    c.rect(6, 12, 8, 17, C['skin_d']); c.rect(8, 17, 16, 19, C['skin_d'])
    c.line(10, 10, 10, 13, C['skin_d']); c.line(13, 10, 13, 13, C['skin_d'])


def bruxo(c):
    disc(c, C['purple_d'], C['purple'], C['dark'])
    c.circle(12, 10.5, 5, C['white']); c.rect(9, 14, 14, 18, C['white'])
    c.circle(10, 10, 1.6, C['dark']); c.circle(14, 10, 1.6, C['dark']); c.rect(11, 12, 12, 13, C['dark'])
    c.rect(10, 16, 10, 18, C['dark']); c.rect(13, 16, 13, 18, C['dark'])
    c.set(10, 10, C['purple_l']); c.set(14, 10, C['purple_l'])


def alquimista(c):
    disc(c, C['green_d'], C['green_l'], C['dark'])
    c.rect(10, 4, 14, 8, C['white']); c.rect(9, 3, 15, 4, C['wood'])
    c.poly([(10, 8), (14, 8), (19, 19), (5, 19)], C['green']); c.poly([(10, 8), (12, 8), (12, 19), (5, 19)], C['green_l'])
    c.rect(7, 14, 17, 18, C['green_d']); c.set(10, 12, C['white']); c.set(14, 16, C['white'])


def mercenario(c):
    disc(c, C['stone_d'], C['stone'], C['dark'])
    c.rect(11, 4, 12, 20, C['wood']); c.poly([(12, 5), (19, 7), (19, 12), (12, 13)], C['steel']); c.poly([(12, 5), (16, 6), (12, 9)], C['steel_l'])
    c.circle(7, 17, 3, C['gold']); c.circle(7, 17, 1.6, C['gold_d'])


def mestre_runico(c):
    disc(c, C['cyan_d'], C['cyan'], C['dark'])
    c.ring(12, 12, 8.2, 6.6, C['cyan_l'])
    c.line(12, 6, 12, 18, C['white'], 1); c.line(12, 6, 17, 10, C['white'], 1); c.line(12, 12, 17, 16, C['white'], 1)
    c.set(8, 9, C['yellow']); c.set(16, 18, C['yellow'])


def ilusionista(c):
    disc(c, C['purple_d'], C['purple_l'], C['dark'])
    c.poly([(3, 12), (8, 7), (16, 7), (21, 12), (16, 17), (8, 17)], C['white'])
    c.circle(12, 12, 4, C['purple']); c.circle(12, 12, 2.2, C['dark']); c.set(11, 11, C['white'])
    c.poly([(3, 12), (8, 7), (16, 7), (21, 12)], C['purple_l']) if False else None


def druida(c):
    disc(c, C['green_d'], C['green'], C['dark'])
    c.poly([(12, 4), (19, 11), (16, 18), (8, 18), (5, 11)], C['green_l'])
    c.poly([(12, 4), (12, 18), (8, 18), (5, 11)], C['green'])
    c.line(12, 6, 12, 20, C['wood_d'], 1); c.line(12, 12, 16, 9, C['green_d'], 1); c.line(12, 14, 8, 11, C['green_d'], 1)


def artilheiro(c):
    disc(c, C['orange'], C['yellow'], C['dark'])
    c.rect(4, 10, 17, 15, C['stone_d']); c.rect(4, 10, 17, 11, C['stone']); c.rect(16, 9, 19, 16, C['steel'])
    c.circle(9, 17, 3, C['wood_d']); c.circle(9, 17, 1.6, C['wood'])
    c.poly([(19, 11), (22, 9), (21, 12), (23, 13), (20, 14)], C['yellow'])


DEFS = dict(guerreiro=guerreiro, guardiao=guardiao, ladino=ladino, cacador=cacador, mago=mago, clerigo=clerigo, bardo=bardo, monge=monge, bruxo=bruxo,
            alquimista=alquimista, mercenario=mercenario, mestre_runico=mestre_runico, ilusionista=ilusionista, druida=druida, artilheiro=artilheiro)

if __name__ == '__main__':
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dest = os.path.join(root, 'public', 'assets', 'ui', 'icons')
    icons = {}
    for name, fn in DEFS.items():
        c = Canvas(); fn(c); c.outline(); icons[f'class_{name}'] = c
        with open(os.path.join(dest, f'class_{name}.png'), 'wb') as f:
            f.write(c.to_png())
    with open(os.path.join(os.path.dirname(__file__), 'class_preview.png'), 'wb') as f:
        f.write(sheet(icons, cols=8))
    print(f'{len(icons)} emblemas de classe.')
