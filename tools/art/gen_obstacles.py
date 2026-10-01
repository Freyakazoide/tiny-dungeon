#!/usr/bin/env python3
"""Gera os obstáculos das salas (arte/obstaculos/<id>.csv, 30×30; o contorno é automático no jogo).

Uso: python3 tools/art/gen_obstacles.py   (usa a mesma grade/paleta de gen_monsters.py)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_monsters import Grid, ROOT  # noqa: E402

W = H = 30


def pilar(g):
    g.shade(5, 24, 19, 28.5, '2', '2', '3')
    g.shade(7.5, 9, 16.5, 25, '1', '2', '3')
    g.shade(5.5, 5.5, 18.5, 10.5, '2', '2', '3')
    g.rect(10, 12, 11, 16, '4'); g.rect(13, 17, 14, 22, '4'); g.px(9, 18, '4')


def rocha(g):
    g.ell(12, 19.5, 9.5, 7.5, '1', '2', '3')
    g.ell(8.5, 22, 5, 4.2, '1', '2', '3')
    g.ell(17.5, 22.5, 5, 3.8, '2', '2', '3')
    g.px(10, 15, '2'); g.px(11, 15, '2'); g.rect(13, 19, 15, 20, '4'); g.px(7, 21, '4')


def caixote(g):
    g.shade(4, 11, 20, 28, 'm', 'V', 'M')
    g.rect(4, 17, 20, 18, 'M'); g.rect(4, 22, 20, 23, 'M')
    for x in (4, 19):
        g.rect(x, 11, x + 1, 28, 't')
    g.rect(4, 11, 20, 12, 'T'); g.px(11.5, 14, 'O'); g.px(11.5, 25, 'O')


def toco(g):
    g.rect(5, 24, 8, 28, 'M'); g.rect(16, 24, 19, 28, 'M')
    g.shade(6.5, 12, 17.5, 27, 'm', 'V', 'M')
    g.ell(12, 12.5, 6, 2.6, 'V', 'V', 'm')
    g.ell(12, 12.5, 3.8, 1.5, 'm'); g.ell(12, 12.5, 1.6, .7, 'M')
    g.rect(9, 17, 10, 24, 'M'); g.rect(14, 15, 15, 21, 'M')
    g.rect(6.5, 12, 9, 14, 's'); g.px(15, 12, 'S')


def gelo(g):
    g.shade(5, 14, 19, 28, 'i', 'I', 'j')
    g.rect(5, 14, 19, 15, 'I')
    for x, top, w in ((6.5, 7, 3), (10.5, 3.5, 4), (15, 8, 3)):
        g.rect(x, top, x + w, 15, 'i'); g.rect(x, top, x + 1, 15, 'I'); g.rect(x + w - 1, top + 1, x + w, 15, 'j')
    g.px(9, 19, 'I'); g.px(10, 20, 'I'); g.rect(13, 21, 15, 24, 'j')


DEFS = dict(pilar=pilar, rocha=rocha, caixote=caixote, toco=toco, gelo=gelo)

if __name__ == '__main__':
    out = os.path.join(ROOT, 'obstaculos')
    os.makedirs(out, exist_ok=True)
    for name, fn in DEFS.items():
        g = Grid(W, H)
        fn(g)
        with open(os.path.join(out, f'{name}.csv'), 'w', newline='') as fh:
            fh.write('\n'.join(g.rows()) + '\n')
    print(f'{len(DEFS)} obstáculos gerados.')
