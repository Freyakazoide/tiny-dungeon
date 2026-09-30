"""Mini rasterizador de pixel art para os ícones da interface (sem dependências: só a biblioteca padrão).

Cada ícone é desenhado numa grade de 24×24, recebe um contorno escuro de 1 px e é ampliado 4× (vizinho mais próximo)
para um PNG RGBA de 96×96 com fundo transparente. A área desenhável fica em [3, 20] para sobrar a margem de ~8 px.
"""
import struct
import zlib

N = 24
SCALE = 4
OUTLINE = (10, 12, 16, 255)


def rgb(hex_color):
    h = hex_color.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


class Canvas:
    def __init__(self):
        self.px = [[None] * N for _ in range(N)]

    def set(self, x, y, color):
        if 0 <= x < N and 0 <= y < N and color is not None:
            self.px[y][x] = rgb(color) if isinstance(color, str) else color

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < N and 0 <= y < N else None

    def rect(self, x0, y0, x1, y1, color):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for x in range(min(x0, x1), max(x0, x1) + 1):
                self.set(x, y, color)

    def circle(self, cx, cy, r, color):
        for y in range(N):
            for x in range(N):
                if (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r:
                    self.set(x, y, color)

    def ellipse(self, cx, cy, rx, ry, color):
        for y in range(N):
            for x in range(N):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1:
                    self.set(x, y, color)

    def ring(self, cx, cy, r_out, r_in, color):
        for y in range(N):
            for x in range(N):
                d = (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2
                if r_in * r_in <= d <= r_out * r_out:
                    self.set(x, y, color)

    def line(self, x0, y0, x1, y1, color, thick=1):
        dx, dy = abs(x1 - x0), abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx - dy
        while True:
            for ox in range(thick):
                for oy in range(thick):
                    self.set(x0 + ox, y0 + oy, color)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy

    def poly(self, points, color):
        for y in range(N):
            for x in range(N):
                px, py = x + .5, y + .5
                inside = False
                j = len(points) - 1
                for i in range(len(points)):
                    xi, yi = points[i]
                    xj, yj = points[j]
                    if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                        inside = not inside
                    j = i
                if inside:
                    self.set(x, y, color)

    def outline(self):
        out = [row[:] for row in self.px]
        for y in range(N):
            for x in range(N):
                if self.px[y][x] is None:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        if self.get(x + dx, y + dy) is not None:
                            out[y][x] = OUTLINE
                            break
        self.px = out

    def to_png(self):
        big = N * SCALE
        raw = bytearray()
        for y in range(big):
            raw.append(0)
            for x in range(big):
                p = self.px[y // SCALE][x // SCALE]
                raw.extend(p if p else (0, 0, 0, 0))

        def chunk(tag, data):
            body = tag + data
            return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

        return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', big, big, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))


def sheet(icons, cols=8, cell=96, pad=6, bg=(27, 34, 43, 255)):
    """Folha de contato (para conferir todos os ícones de uma vez): {nome: Canvas} em grade."""
    names = list(icons)
    rows = (len(names) + cols - 1) // cols
    w, h = cols * (cell + pad) + pad, rows * (cell + pad) + pad
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            col, row = (x - pad) // (cell + pad), (y - pad) // (cell + pad)
            lx, ly = (x - pad) % (cell + pad), (y - pad) % (cell + pad)
            p = None
            if 0 <= col < cols and 0 <= row < rows and lx < cell and ly < cell and row * cols + col < len(names):
                p = icons[names[row * cols + col]].px[ly // SCALE][lx // SCALE]
            raw.extend(p if p else bg)

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))
