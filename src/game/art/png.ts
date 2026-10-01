/** Codificador PNG mínimo (RGBA 8 bits, deflate "stored"): dá data URLs de pixels sem depender de canvas (também em testes). */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (bytes: Uint8Array) => { let c = 0xffffffff; for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const adler32 = (bytes: Uint8Array) => { let a = 1, b = 0; for (const x of bytes) { a = (a + x) % 65521; b = (b + a) % 65521; } return ((b << 16) | a) >>> 0; };
const put32 = (a: Uint8Array, at: number, n: number) => { a[at] = (n >>> 24) & 255; a[at + 1] = (n >>> 16) & 255; a[at + 2] = (n >>> 8) & 255; a[at + 3] = n & 255; };

export function encodePng(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const stride = width * 4 + 1, raw = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * stride + 1);
  // zlib "stored": 2 bytes de cabeçalho + blocos de até 65535 + adler32
  const blocks = Math.ceil(raw.length / 65535), z = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  z[0] = 0x78; z[1] = 0x01; let at = 2;
  for (let i = 0; i < raw.length; i += 65535) {
    const len = Math.min(65535, raw.length - i);
    z[at++] = i + 65535 >= raw.length ? 1 : 0; z[at++] = len & 255; z[at++] = len >> 8; z[at++] = ~len & 255; z[at++] = (~len >> 8) & 255;
    z.set(raw.subarray(i, i + len), at); at += len;
  }
  put32(z, at, adler32(raw));
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length); put32(out, 0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8); put32(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out;
  };
  const ihdr = new Uint8Array(13); put32(ihdr, 0, width); put32(ihdr, 4, height); ihdr[8] = 8; ihdr[9] = 6;
  const parts = [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const toBase64 = (bytes: Uint8Array) => {
  const B = (globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(bytes).toString('base64');
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x2000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x2000) as unknown as number[]);
  return btoa(bin);
};
export const pngDataUrl = (width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): string => `data:image/png;base64,${toBase64(encodePng(width, height, rgba))}`;
