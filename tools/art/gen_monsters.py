#!/usr/bin/env python3
"""Gera a arte CSV dos monstros das hunts novas (arte/monstros/<id>/<dir>_<pose>.csv) e a paleta/meta correspondentes.

Uso: python3 tools/art/gen_monsters.py
Desenha em coordenadas de uma grade 24×32 (o chefe 40×51 escala as mesmas formas). Contorno é automático no jogo:
a arte deixa 1 px de margem e as 2 últimas linhas vazias. Reexecutar sobrescreve apenas os monstros listados em MONSTERS.
"""
import csv
import math
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'arte')

NEW_PALETTE = [
    ('f', '#7d7f86', 'pelo cinza'), ('F', '#a4a7ae', 'pelo cinza claro'), ('h', '#4c4e55', 'pelo cinza escuro'),
    ('i', '#8fd0ee', 'gelo'), ('I', '#e8f8ff', 'gelo claro'), ('j', '#4a86b8', 'gelo escuro'),
    ('s', '#4f9a3c', 'verde'), ('S', '#86cf63', 'verde claro'), ('H', '#2b5a28', 'verde escuro'),
    ('N', '#f0861f', 'laranja'), ('Y', '#ffc23a', 'brasa clara'), ('0', '#2a2224', 'carvao'),
    ('C', '#7ee0f0', 'cristal'), ('D', '#c8f6ff', 'cristal claro'), ('E', '#2f8ea8', 'cristal escuro'),
    ('W', '#8a4fc4', 'roxo'), ('X', '#c79af0', 'roxo claro'), ('Q', '#4a2a78', 'roxo escuro'),
    ('n', '#8a6038', 'pelo marrom'), ('J', '#b58656', 'pelo marrom claro'), ('G', '#5a3b22', 'pelo marrom escuro'),
    ('R', '#d94a2a', 'lava'), ('U', '#e9e4d6', 'pelo branco'), ('K', '#b9b2a2', 'pelo branco sombra'),
]


class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.sx, self.sy = w / 24.0, h / 32.0
        self.p = [['.'] * w for _ in range(h)]

    def put(self, x, y, k):
        if 1 <= x < self.w - 1 and 1 <= y < self.h - 2:        # margem de 1 px; 2 últimas linhas vazias
            self.p[y][x] = k

    def px(self, x, y, k):                       # um "pixel" lógico (bloco ao escalar)
        self.rect(x, y, x + 1, y + 1, k)

    def rect(self, x0, y0, x1, y1, k):           # [x0,x1) × [y0,y1) em coordenadas lógicas
        for y in range(round(y0 * self.sy), max(round(y0 * self.sy) + 1, round(y1 * self.sy))):
            for x in range(round(x0 * self.sx), max(round(x0 * self.sx) + 1, round(x1 * self.sx))):
                self.put(x, y, k)

    def shade(self, x0, y0, x1, y1, base, light, dark):
        self.rect(x0, y0, x1, y1, base)
        self.rect(x0, y0, x0 + .9, y1, light)
        self.rect(x1 - .9, y0 + .5, x1, y1, dark)
        self.rect(x0, y1 - .9, x1, y1, dark)

    def ell(self, cx, cy, rx, ry, base, light=None, dark=None):
        light = light or base; dark = dark or base
        for y in range(self.h):
            for x in range(self.w):
                dx, dy = ((x + .5) / self.sx - cx) / rx, ((y + .5) / self.sy - cy) / ry
                if dx * dx + dy * dy <= 1:
                    v = -dx * .5 - dy * .6
                    self.put(x, y, light if v > .33 else dark if v < -.4 else base)

    def line(self, x0, y0, x1, y1, k):
        n = max(abs(x1 - x0) * self.sx, abs(y1 - y0) * self.sy, 1)
        for i in range(int(n) + 1):
            t = i / n
            self.put(round((x0 + (x1 - x0) * t) * self.sx), round((y0 + (y1 - y0) * t) * self.sy), k)

    def rows(self):
        return [','.join(r) for r in self.p]


# ---------------------------------------------------------------- arquétipos (coordenadas lógicas 24×32; chão em y=28)

def humanoid(g, d, f, c):
    """c: skin/skin_d, cloth/cloth_l/cloth_d, boots, head ('round','hood','horns','mask','helmet','mitre','halo'), weapon, wings, eye, big."""
    sk, skd, cl, cll, cld, bt, eye = c['skin'], c['skin_d'], c['cloth'], c['cloth_l'], c['cloth_d'], c['boots'], c.get('eye', 'e')
    w = c.get('width', 4.5)
    step = 1 if f else 0
    if c.get('wings'):                              # asas atrás do corpo
        wc, wd = c['wings']
        if d == 'right':
            g.shade(5, 8, 11, 21 + step, wc, wc, wd)
        else:
            g.shade(1.5, 7 - step, 7, 20, wc, wc, wd); g.shade(17, 7 - step, 22.5, 20, wc, wc, wd)
    if c.get('dress'):                              # vestido no lugar das pernas
        g.shade(12 - 5.5, 15, 12 + 5.5, 28 - step * .4, cl, cll, cld)
    elif d == 'right':
        g.shade(10, 19, 14, 27 + (0 if f else 1) - 0, bt, bt, bt); g.rect(10, 19, 14, 24, c['legs'])
        g.shade(12, 19 + step, 16, 27 + (1 if f else 0) - 0, bt, bt, bt); g.rect(12, 19 + step, 16, 24, c['legs'])
    else:
        g.rect(8, 19, 11.5, 27 + step, c['legs']); g.rect(8, 26 + step, 11.5, 28 + step, bt)
        g.rect(12.5, 19, 16, 28 - step, c['legs']); g.rect(12.5, 26 - step + 1, 16, 28, bt)
    tx0, tx1 = (9, 15.5) if d == 'right' else (12 - w - 1, 12 + w + 1)
    g.shade(tx0, 11, tx1, 20, cl, cll, cld)
    if c.get('belt'):
        g.rect(tx0, 17.5, tx1, 18.5, c['belt'])
    if c.get('trim'):
        g.rect(tx0 + 1, 11, tx1 - 1, 12, c['trim'])
    # braços
    if d == 'right':
        g.shade(11, 12, 14.5, 19 + step, cll, cll, cld)
    else:
        g.shade(tx0 - 2.5, 12, tx0, 19 - step, cl, cll, cld); g.shade(tx1, 12, tx1 + 2.5, 19 + step, cl, cll, cld)
        g.rect(tx0 - 2.5, 18 - step, tx0, 20 - step, sk); g.rect(tx1, 18 + step, tx1 + 2.5, 20 + step, sk)
    if c.get('cape') and d == 'up':
        g.shade(tx0 - 1, 11, tx1 + 1, 25, c['cape'][0], c['cape'][0], c['cape'][1])
    # cabeça
    hx = 13 if d == 'right' else 12
    head = c.get('head', 'round')
    if head in ('hood', 'mitre'):
        g.ell(hx, 7, 5, 5.2, cl, cll, cld)
        if d == 'down':
            g.rect(hx - 3, 6, hx + 3, 10, c.get('face', 'k')); g.px(hx - 2, 7.5, eye); g.px(hx + 1, 7.5, eye)
        elif d == 'right':
            g.rect(hx + 1, 6, hx + 4.5, 10, c.get('face', 'k')); g.px(hx + 2.5, 7.5, eye)
        if head == 'mitre':
            g.rect(hx - 3, 1.5, hx + 3, 4, c['trim']); g.rect(hx - .5, 1.5, hx + .5, 4, c.get('trim2', 'o'))
    else:
        g.ell(hx, 7, w, 4.6, sk, sk, skd)
        if d == 'down':
            g.px(hx - 2, 7, 'k'); g.px(hx + 1, 7, 'k'); g.px(hx - 2, 7, eye) if c.get('glow') else None
            if c.get('glow'): g.px(hx + 1, 7, eye)
            g.rect(hx - 1.5, 9.3, hx + 1.5, 10, skd)
        elif d == 'right':
            g.px(hx + 2.5, 7, eye if c.get('glow') else 'k')
        if head == 'helmet':
            g.rect(hx - w, 2.6, hx + w, 5.5, c['hair']); g.rect(hx - w - .5, 5, hx + w + .5, 6, c['hair'])
            if c.get('lamp'): g.rect(hx - 1, 2.5, hx + 1, 4, 'y')
        elif head == 'mask':
            g.rect(hx - w, 6.6, hx + w, 9.5, c['hair']) if d != 'up' else None
            g.rect(hx - w, 3, hx + w, 5, c['hair'])
        elif head == 'bald':
            pass
        else:
            if d == 'up':
                g.ell(hx, 7, w, 4.6, c.get('hair', skd))
            else:
                g.rect(hx - w + .5, 3, hx + w - .5, 4.6, c.get('hair', skd))
        if head == 'horns':
            for sgn in (-1, 1):
                g.px(hx + sgn * (w - .2) - (0 if sgn > 0 else 1), 2.4, c['horn']); g.px(hx + sgn * (w + .5) - (0 if sgn > 0 else 1), 1.4, c['horn'])
        if head == 'halo':
            g.rect(hx - 3, 1.2, hx + 3, 2, 'o'); g.px(hx - 3, 2, 'O'); g.px(hx + 2, 2, 'O')
    if c.get('crown'):
        for i in range(-3, 4, 2):
            g.rect(hx + i - .5, 1.5, hx + i + .5, 3, c['crown'])
        g.rect(hx - 3.5, 3, hx + 3.5, 4, c['crown'])
    # arma
    wp = c.get('weapon')
    if wp:
        side = 19.5 if d != 'right' else 15
        if wp == 'dagger':
            g.rect(side, 17 + step, side + 1, 22 + step, 't'); g.rect(side - .5, 22 + step, side + 1.5, 23 + step, 'M')
        elif wp == 'pick':
            g.rect(side, 12 + step, side + 1, 24 + step, 'm'); g.rect(side - 2.5, 11.5 + step, side + 3.5, 13 + step, 't'); g.px(side - 2.5, 13 + step, 'u'); g.px(side + 3, 13 + step, 'u')
        elif wp == 'staff':
            g.rect(side, 5, side + 1, 26, c.get('staffc', 'm')); g.ell(side + .5, 4.2, 1.8, 1.8, c.get('orb', 'y'))
        elif wp == 'club':
            g.rect(side, 14, side + 1.5, 24, 'm'); g.ell(side + .7, 13, 2.2, 3, 'm', 'V', 'M')
        elif wp == 'sword':
            g.rect(side, 8, side + 1, 22, 't'); g.rect(side - 1, 21.5, side + 2, 22.5, 'O'); g.rect(side, 22.5, side + 1, 24.5, 'M')
        elif wp == 'flame':
            g.ell(side + .5, 17 + step, 2.2, 3.2, 'N', 'Y', 'R')
        elif wp == 'rod':
            g.rect(side, 8, side + 1, 25, 'M'); g.rect(side - 1, 6.5, side + 2, 8.5, 'o'); g.px(side, 5.5, 'e')


def quad(g, d, f, c):
    """Fera de quatro patas. c: fur/fur_l/fur_d, belly, eye, kind ('wolf','lizard'), ears, tail_len, spines, teeth."""
    fu, fl, fd, eye = c['fur'], c['fur_l'], c['fur_d'], c.get('eye', 'e')
    lizard = c.get('kind') == 'lizard'
    st = 1 if f else 0
    if d == 'right':
        tail = c.get('tail_len', 6)
        g.line(4 - (0 if not lizard else 2), 15 + (st if lizard else 0), 7, 17, fd); g.line(3 if lizard else 5, 14, 6, 17, fd)
        if lizard:
            g.rect(2, 17, 8, 19, fu); g.rect(1.5, 18, 3.5, 19.5, fd)
        for (lx, off) in ((8, 0), (10.5, 1), (15, 1), (17.5, 0)):                    # patas
            dy = st if off else 1 - st
            g.rect(lx, 21 + (0 if lizard else 0), lx + 1.8, 28 - dy * .0 - (0 if dy else 0) + (0.5 if dy else 0), fd if off else fu)
        g.shade(7, 14, 19, 22, fu, fl, fd)
        if c.get('belly'): g.rect(8, 20, 18, 21.5, c['belly'])
        if c.get('spines'):
            for x in range(8, 19, 2): g.rect(x, 12.5, x + 1, 14.5, c['spines'])
        g.shade(16.5, 10.5 if not lizard else 13, 22.5, 18 if not lizard else 19, fu, fl, fd)
        g.rect(20, 16 if not lizard else 17, 23, 18.5 if not lizard else 19, fl)
        g.px(19, 12.5 if not lizard else 14.5, eye); g.px(19, 13.5 if not lizard else 15.5, 'k') if False else None
        if c.get('ears'): g.rect(17, 8.5, 18.6, 11, fd); g.rect(19.2, 8.5, 20.8, 11, fu)
        if c.get('teeth'): g.px(21, 18.5, 'w'); g.px(22, 18.5, 'w')
    else:
        L = d == 'down'
        # corpo (visto de frente/atrás), patas alternando
        g.rect(7.5, 19 + (0 if L else -1), 10.5, 27 + st * 1, fd); g.rect(13.5, 19 + (0 if L else -1), 16.5, 28 - st * 1, fd)
        g.shade(6.5, 13, 17.5, 22, fu, fl, fd)
        if lizard and not L:
            for y in range(14, 27, 2): g.rect(11, y, 13, y + 1.2, fd)
        if c.get('spines') and not L:
            for y in range(13, 22, 2): g.px(11.5, y, c['spines'])
        if L:
            g.shade(7, 5.5 if not lizard else 7, 17, 15, fu, fl, fd)
            if c.get('ears'): g.rect(7, 3.2, 9.4, 6.4, fd); g.rect(14.6, 3.2, 17, 6.4, fd); g.px(8, 4.6, fl); g.px(15.6, 4.6, fl) if False else None
            g.rect(9.5, 10, 14.5, 14.5, fl)                                                           # focinho
            g.px(8.6, 8.4, eye); g.px(14.4, 8.4, eye)
            g.rect(11, 10.5, 13, 12, 'k')
            if c.get('teeth'): g.px(10, 13.5, 'w'); g.px(13, 13.5, 'w')
        else:
            g.shade(7.5, 6 if not lizard else 7, 16.5, 14, fu, fl, fd)
            if c.get('ears'): g.rect(7.5, 3.6, 9.8, 6.6, fd); g.rect(14.2, 3.6, 16.5, 6.6, fd)
            tl = c.get('tail_len', 6)
            g.line(12, 21, 12 + (1 if st else -1), 21 + min(tl, 5), fd); g.line(11, 21, 11 + (1 if st else -1), 21 + min(tl, 5), fd)
            g.rect(11, 20, 13, 22, fd)


def golem(g, d, f, c):
    """Golem: pedra em blocos. c: rock/rock_l/rock_d, vein (cor de brilho ou None), crest (cristais), eye."""
    r, rl, rd, v, eye = c['rock'], c['rock_l'], c['rock_d'], c.get('vein'), c.get('eye', 'e')
    st = 1 if f else 0
    g.shade(7, 20, 11.5, 28 - st * .5, r, rl, rd); g.shade(12.5, 20, 17, 27.5 + st * .5, r, rl, rd)
    g.shade(5.5, 11, 18.5, 21, r, rl, rd)
    g.shade(2, 12 + st, 6, 22 + st, r, rl, rd); g.shade(18, 12 - st + 1, 22, 22 - st + 1, r, rl, rd)
    g.shade(1.5, 20 + st, 6.5, 24 + st, rl, rl, rd); g.shade(17.5, 21 - st, 22.5, 25 - st, rl, rl, rd)
    g.shade(8, 5, 16, 12, r, rl, rd)
    if v:
        g.line(8, 14, 11, 16, v); g.line(11, 16, 10, 19, v); g.line(15, 13, 14, 17, v); g.px(4, 15 + st, v); g.px(20, 16, v)
    if c.get('crest'):
        for x, h in ((5.5, 8), (9, 3), (12, 2), (15, 3.5), (18, 8)):
            g.rect(x, h, x + 1.6, 12 if h > 5 else 6, c['crest']); g.px(x, h, c.get('crest_l', c['crest']))
    if d == 'down':
        g.rect(9.5, 7.5, 11.5, 9, eye); g.rect(12.5, 7.5, 14.5, 9, eye); g.rect(10, 10, 14, 10.8, rd)
    elif d == 'right':
        g.rect(13, 7.5, 15.5, 9, eye)
    if c.get('fire') and d != 'up':
        g.ell(12, 3.5, 2.2, 2.2, 'N', 'Y', 'R')


def toad(g, d, f, c):
    """Anfíbio gordo. c: skin/skin_l/skin_d, belly, wart, eye."""
    sk, sl, sd, eye = c['skin'], c['skin_l'], c['skin_d'], c.get('eye', 'y')
    st = 1 if f else 0
    if d == 'right':
        g.rect(7, 22 + st, 10, 27, sd); g.rect(14.5, 23, 18, 27 - st, sd)
        g.rect(15, 26 - st, 20, 27.5, sd)
        g.ell(11.5, 17, 7.5, 6, sk, sl, sd); g.rect(14, 19, 22, 21.5, c.get('belly', sl))
        g.ell(18, 13.5, 3, 3, sk, sl, sd); g.px(18.5, 12.2, eye); g.px(19.4, 12.2, 'k')
        g.px(9, 13.2, c['wart']); g.px(12, 12.5, c['wart']); g.px(7, 16, c['wart'])
    else:
        g.rect(4.5, 22 + st, 8.5, 27.5, sd); g.rect(15.5, 23 - st + 1, 19.5, 27.5, sd)
        g.ell(12, 17.5, 9, 6.5, sk, sl, sd)
        if d == 'down':
            g.ell(12, 18.5, 5.5, 3.8, c.get('belly', sl))
            g.rect(8.5, 12, 11, 14, sk); g.rect(13, 12, 15.5, 14, sk)
            g.px(9, 12, eye); g.px(9.8, 12, 'k'); g.px(13.5, 12, eye); g.px(14.3, 12, 'k')
            g.rect(8.5, 15.5, 15.5, 16.4, sd)
        else:
            g.rect(8.5, 12, 11, 14, sd); g.rect(13, 12, 15.5, 14, sd)
        for (x, y) in ((7, 15), (16.5, 16), (9.5, 21), (14.5, 14.5)):
            g.px(x, y, c['wart'])


def spider(g, d, f, c):
    """Aranha (chefe). c: body/body_l/body_d, leg, mark, eye, crown."""
    b, bl, bd, leg, eye = c['body'], c['body_l'], c['body_d'], c['leg'], c.get('eye', 'e')
    st = 1 if f else 0
    for i, (ax, ay) in enumerate(((7, 14), (6, 17), (6, 20), (7, 23))):
        ex = 1 + (i % 2) * 1.5 + (st if i % 2 else -st) * .8
        g.line(ax, ay, ex, ay - 4 + (i * 1.2), leg); g.line(ex, ay - 4 + i * 1.2, ex + .5, 27, leg)
        g.line(24 - ax, ay, 24 - ex, ay - 4 + (i * 1.2), leg); g.line(24 - ex, ay - 4 + i * 1.2, 24 - ex - .5, 27, leg)
    g.ell(12, 20, 6.5, 6.2, b, bl, bd)
    if d != 'up':
        g.rect(10.8, 17, 13.2, 22, c['mark']); g.rect(10, 19, 14, 20.4, c['mark'])
    else:
        g.rect(11, 15, 13, 24, c['mark'])
    g.ell(12, 11.5, 4.4, 3.6, b, bl, bd)
    if d != 'up':
        for ex in (9.8, 11.3, 12.7, 14.2): g.px(ex, 10.4, eye)
        g.px(10.6, 12, 'w'); g.px(13.2, 12, 'w')
    if c.get('crown'):
        for x in (9.5, 11.5, 13.5): g.rect(x, 6.2, x + 1, 8.2, c['crown'])
        g.rect(9.5, 8, 14.5, 9, c['crown'])


def hydra(g, d, f, c):
    """Hidra (chefe): corpo anfíbio + 3 pescoços com cabeça."""
    sk, sl, sd, eye = c['skin'], c['skin_l'], c['skin_d'], c.get('eye', 'y')
    st = 1 if f else 0
    g.rect(5, 22 + st, 9, 28, sd); g.rect(15, 22 + (1 - st), 19, 28, sd)
    g.ell(12, 20.5, 9.5, 6.2, sk, sl, sd)
    if d != 'up': g.ell(12, 22, 5.8, 3.6, c['belly'])
    for i, (nx, hx, hy) in enumerate(((6.5, 4.5, 5), (12, 12, 3), (17.5, 19.5, 5))):
        bob = (st if i != 1 else 1 - st) * .8
        g.line(nx, 17, (nx + hx) / 2, (17 + hy) / 2 + 2, sk); g.line(nx + 1, 17, (nx + hx) / 2 + 1, (17 + hy) / 2 + 2, sk)
        g.line(nx, 17, hx, hy + 3, sk); g.line(nx + 1, 17, hx + 1, hy + 3, sk); g.line(nx - 1, 17, hx - 1, hy + 3, sd)
        g.ell(hx, hy + 1.8 - bob, 3, 2.4, sk, sl, sd)
        if d != 'up':
            g.px(hx - 1.4, hy + .6 - bob, eye); g.px(hx + .8, hy + .6 - bob, eye)
            g.rect(hx - 1.5, hy + 2.8 - bob, hx + 1.5, hy + 3.3 - bob, 'x')
    for (x, y) in ((7, 18), (16, 19), (11, 23), (13.5, 17)): g.px(x, y, c['wart'])


def yeti(g, d, f, c):
    """Grandão peludo: humanoid largo com pelo e cara."""
    cc = dict(skin=c['face'], skin_d=c['face_d'], cloth=c['fur'], cloth_l=c['fur_l'], cloth_d=c['fur_d'], boots=c['fur_d'], legs=c['fur'],
              head='round', hair=c['fur'], width=5.2, glow=True, eye='e')
    humanoid(g, d, f, cc)
    # braços maiores / garras
    st = 1 if f else 0
    if d != 'right':
        g.rect(2, 19 + st, 5, 22 + st, c['claw']); g.rect(19, 19 - st + 1, 22, 22 - st + 1, c['claw'])
    if d == 'down': g.rect(6.5, 4.5, 17.5, 7, c['fur'])
    if d == 'down': g.rect(9, 8.6, 15, 10.8, c['face']); g.px(10, 9, 'k'); g.px(13.5, 9, 'k'); g.rect(10, 10.2, 14, 10.8, 'w')


ARCH = dict(humanoid=humanoid, quad=quad, golem=golem, toad=toad, spider=spider, hydra=hydra, yeti=yeti)


def S(**kw):
    return kw


# id da pasta, tamanho, arquétipo, parâmetros
MONSTERS = {
    # --- Floresta Sombria
    'lobo': ('wolf', 24, 32, 'quad', S(fur='f', fur_l='F', fur_d='h', belly='F', kind='wolf', ears=True, teeth=True, tail_len=6)),
    'bandido': ('bandit', 24, 32, 'humanoid', S(skin='J', skin_d='n', cloth='M', cloth_l='m', cloth_d='M', boots='M', legs='v', belt='O', head='mask', hair='x', weapon='dagger', cape=('M', 'M'))),
    'rainha_aranha': ('spider_queen', 40, 51, 'spider', S(body='0', body_l='h', body_d='k', leg='h', mark='r', eye='e', crown='o')),
    # --- Pântano Tóxico
    'sapo_venenoso': ('toxic_toad', 24, 32, 'toad', S(skin='s', skin_l='S', skin_d='H', belly='y', wart='W', eye='y')),
    'lagarto_pantano': ('bog_lizard', 24, 32, 'quad', S(fur='s', fur_l='S', fur_d='H', belly='y', kind='lizard', spines='H', tail_len=6, eye='y')),
    'hidra_pantano': ('bog_hydra', 40, 51, 'hydra', S(skin='s', skin_l='S', skin_d='H', belly='y', wart='W', eye='y')),
    # --- Minas Esquecidas
    'kobold_minerador': ('kobold_miner', 24, 32, 'humanoid', S(skin='n', skin_d='G', cloth='v', cloth_l='V', cloth_d='M', boots='M', legs='G', head='helmet', hair='u', lamp=True, weapon='pick', belt='O')),
    'golem_pedra': ('stone_golem', 24, 32, 'golem', S(rock='1', rock_l='2', rock_d='3', vein=None, eye='e')),
    'golem_cristal': ('crystal_golem', 40, 51, 'golem', S(rock='E', rock_l='C', rock_d='j', vein='D', crest='C', crest_l='D', eye='e')),
    # --- Fortaleza de Gelo
    'lobo_gelo': ('frost_wolf', 24, 32, 'quad', S(fur='i', fur_l='I', fur_d='j', belly='I', kind='wolf', ears=True, teeth=True, eye='C')),
    'yeti': ('yeti', 24, 32, 'yeti', S(fur='U', fur_l='w', fur_d='K', face='i', face_d='j', claw='I')),
    'rainha_inverno': ('winter_queen', 40, 51, 'humanoid', S(skin='I', skin_d='i', cloth='i', cloth_l='I', cloth_d='j', boots='j', legs='i', dress=True, head='round', hair='I', crown='C', weapon='staff', staffc='i', orb='C', glow=True, eye='C', trim='I')),
    # --- Vulcão Ardente
    'salamandra': ('salamander', 24, 32, 'quad', S(fur='N', fur_l='Y', fur_d='R', belly='Y', kind='lizard', spines='Y', tail_len=6, eye='y')),
    'golem_lava': ('lava_golem', 24, 32, 'golem', S(rock='0', rock_l='h', rock_d='k', vein='R', eye='y')),
    'senhor_chamas': ('flame_lord', 40, 51, 'humanoid', S(skin='N', skin_d='R', cloth='R', cloth_l='N', cloth_d='x', boots='0', legs='x', head='horns', horn='Y', hair='Y', weapon='flame', glow=True, eye='y', belt='Y', width=5)),
    # --- Templo Profano
    'cultista_sombrio': ('dark_cultist', 24, 32, 'humanoid', S(skin='n', skin_d='G', cloth='Q', cloth_l='W', cloth_d='k', boots='k', legs='Q', head='hood', face='k', eye='e', belt='O', weapon='dagger')),
    'anjo_caido': ('fallen_angel', 24, 32, 'humanoid', S(skin='w', skin_d='g', cloth='k', cloth_l='Q', cloth_d='k', boots='Q', legs='k', head='halo', hair='k', wings=('Q', 'k'), glow=True, eye='e', weapon='sword')),
    'sumo_sacerdote': ('profane_high_priest', 40, 51, 'humanoid', S(skin='n', skin_d='G', cloth='W', cloth_l='X', cloth_d='Q', boots='k', legs='Q', head='mitre', trim='o', trim2='r', face='k', eye='e', belt='o', weapon='rod', dress=True, width=5)),
}


def write_monster(folder, w, h, arch, params):
    path = os.path.join(ROOT, 'monstros', folder)
    os.makedirs(path, exist_ok=True)
    for d in ('down', 'up', 'right'):
        for f in (0, 1):
            g = Grid(w, h)
            ARCH[arch](g, d, f, params)
            rows = g.rows()
            assert all(r.split(',')[0] == '.' and r.split(',')[-1] == '.' for r in rows), f'{folder} {d}_{f + 1}: toca a borda lateral'
            assert all(k == '.' for k in rows[0].split(',')) and all(k == '.' for k in rows[-1].split(',')), f'{folder} {d}_{f + 1}: toca topo/base'
            with open(os.path.join(path, f'{d}_{f + 1}.csv'), 'w', newline='') as fh:
                fh.write('\n'.join(rows) + '\n')


def update_palette():
    p = os.path.join(ROOT, 'palette.csv')
    with open(p, newline='') as fh:
        rows = list(csv.reader(fh))
    have = {r[0] for r in rows[1:]}
    for k, color, name in NEW_PALETTE:
        if k not in have:
            rows.append([k, color, name])
    with open(p, 'w', newline='') as fh:
        csv.writer(fh, lineterminator='\n').writerows(rows)


def update_meta():
    p = os.path.join(ROOT, 'meta.csv')
    with open(p, newline='') as fh:
        rows = list(csv.reader(fh))
    have = {r[0] for r in rows[1:]}
    hunts = {'wolf': 'floresta_sombria', 'bandit': 'floresta_sombria', 'spider_queen': 'floresta_sombria', 'toxic_toad': 'pantano_toxico', 'bog_lizard': 'pantano_toxico', 'bog_hydra': 'pantano_toxico',
             'kobold_miner': 'minas_esquecidas', 'stone_golem': 'minas_esquecidas', 'crystal_golem': 'minas_esquecidas', 'frost_wolf': 'fortaleza_de_gelo', 'yeti': 'fortaleza_de_gelo', 'winter_queen': 'fortaleza_de_gelo',
             'salamander': 'vulcao_ardente', 'lava_golem': 'vulcao_ardente', 'flame_lord': 'vulcao_ardente', 'dark_cultist': 'templo_profano', 'fallen_angel': 'templo_profano', 'profane_high_priest': 'templo_profano'}
    for folder, (mid, w, h, _a, _p) in MONSTERS.items():
        if folder not in have:
            rows.append([folder, 'monstro', str(w), str(h), '2x2' if w > 24 else '1x1', mid, hunts[mid]])
    with open(p, 'w', newline='') as fh:
        csv.writer(fh, lineterminator='\n').writerows(rows)


def preview():
    """Folha de contato ASCII-free: grava PNG simples com todos os down_1 (sem dependências), para conferência rápida."""
    import struct, zlib
    pal = {}
    with open(os.path.join(ROOT, 'palette.csv'), newline='') as fh:
        for k, color, _n in list(csv.reader(fh))[1:]:
            pal[k] = None if k == '.' else tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
    cols, S = 6, 4
    cell_w, cell_h = 42, 54
    names = list(MONSTERS)
    rows_n = (len(names) + cols - 1) // cols * 3
    W, H = cols * cell_w * S, rows_n * cell_h * S
    img = [[(36, 40, 46)] * W for _ in range(H)]
    for i, folder in enumerate(names):
        for di, d in enumerate(('down', 'up', 'right')):
            gx = (i % cols) * cell_w + 1; gy = ((i // cols) * 3 + di) * cell_h + 1
            with open(os.path.join(ROOT, 'monstros', folder, f'{d}_1.csv')) as fh:
                g = [r.strip().split(',') for r in fh if r.strip()]
            for y, row in enumerate(g):
                for x, k in enumerate(row):
                    col = pal.get(k)
                    if col:
                        for yy in range(S):
                            for xx in range(S):
                                img[(gy + y) * S + yy][(gx + x) * S + xx] = col
    raw = b''.join(b'\x00' + bytes(c for px in row for c in px) for row in img)
    def chunk(t, data): return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(os.path.join(os.path.dirname(__file__), 'preview.png'), 'wb') as fh:
        fh.write(png)


if __name__ == '__main__':
    update_palette()
    for folder, (_mid, w, h, arch, params) in MONSTERS.items():
        write_monster(folder, w, h, arch, params)
    update_meta()
    preview()
    print(f'{len(MONSTERS)} monstros gerados.')
