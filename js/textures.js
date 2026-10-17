/* textures.js — Maquette Atelier: procedural, seamless (tileable) textures drawn by code — no photos.
 * Seeded PRNG + periodic value noise (fBm) → paper fibres, film grain, fabric weave, and surface materials
 * (plain, wood, concrete, linen, plaster, brick, terrazzo) tinted with any colour. Tiles are cached.
 * Original code, MIT licence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TEX = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /** mulberry32: small, fast, seeded PRNG → [0, 1). */
  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** Periodic value noise of size×size with cx×cy lattice cells (wraps at the tile edges), values 0..1. */
  function valueNoise(size, cx, cy, seed) {
    const r = rng(seed), lat = new Float32Array(cx * cy);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const out = new Float32Array(size * size), sm = (t) => t * t * (3 - 2 * t);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * cy, iy = Math.floor(fy), ty = sm(fy - iy), y0 = iy % cy, y1 = (iy + 1) % cy;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cx, ix = Math.floor(fx), tx = sm(fx - ix), x0 = ix % cx, x1 = (ix + 1) % cx;
        const a = lat[y0 * cx + x0], b = lat[y0 * cx + x1], c = lat[y1 * cx + x0], d = lat[y1 * cx + x1];
        out[y * size + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      }
    }
    return out;
  }
  /** Fractal sum of periodic noise octaves (normalised 0..1). */
  function fbm(size, cx, cy, oct, seed) {
    const out = new Float32Array(size * size);
    let amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const n = valueNoise(size, cx << o, cy << o, seed + o * 101);
      for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
      tot += amp; amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  function mk(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
  const cache = new Map();
  function cached(key, fn) { if (!cache.has(key)) { if (cache.size > 40) cache.delete(cache.keys().next().value); cache.set(key, fn()); } return cache.get(key); }

  /** Film grain: black and white specks on transparency (use with source-atop + globalAlpha). */
  function grain() {
    return cached('grain', () => {
      const s = 256, c = mk(s), x = c.getContext('2d'), im = x.createImageData(s, s), r = rng(7);
      for (let i = 0; i < s * s; i++) { const v = r(); const dark = v < 0.5; const a = Math.pow(Math.abs(v - 0.5) * 2, 1.6) * 230; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = dark ? 0 : 255; im.data[i * 4 + 3] = a; }
      x.putImageData(im, 0, 0); return c;
    });
  }
  /** Paper: soft cloudy fibres, light greys around white (use with multiply). */
  function paper() {
    return cached('paper', () => {
      const s = 512, c = mk(s), x = c.getContext('2d'), n = fbm(s, 6, 6, 5, 11), fine = valueNoise(s, 128, 128, 12), im = x.createImageData(s, s);
      for (let i = 0; i < s * s; i++) { const v = 255 - n[i] * 26 - fine[i] * 14 + 8; im.data[i * 4] = clamp(v); im.data[i * 4 + 1] = clamp(v); im.data[i * 4 + 2] = clamp(v - 2); im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0);
      // fibres: short curved hair-lines, drawn with wrap-around so the tile stays seamless
      const r = rng(13); x.lineCap = 'round';
      for (let i = 0; i < 420; i++) {
        const px = r() * s, py = r() * s, a = r() * Math.PI * 2, l = 6 + r() * 22, bend = (r() - 0.5) * 8;
        x.strokeStyle = `rgba(${r() < 0.5 ? '120,110,100' : '255,255,255'},${0.08 + r() * 0.12})`; x.lineWidth = 0.6 + r() * 0.8;
        for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
          x.beginPath(); x.moveTo(px + ox, py + oy);
          x.quadraticCurveTo(px + ox + Math.cos(a) * l / 2 - Math.sin(a) * bend, py + oy + Math.sin(a) * l / 2 + Math.cos(a) * bend, px + ox + Math.cos(a) * l, py + oy + Math.sin(a) * l); x.stroke();
        }
      }
      return c;
    });
  }
  /** Fabric weave (tote bag): fine crossed threads, light greys (multiply). */
  function weave() {
    return cached('weave', () => {
      const s = 256, c = mk(s), x = c.getContext('2d'), im = x.createImageData(s, s), n = valueNoise(s, 32, 32, 21), r = rng(22), N = 64;
      for (let y = 0; y < s; y++) for (let xx = 0; xx < s; xx++) {
        const i = y * s + xx, wx = Math.sin((xx / s) * N * Math.PI * 2), wy = Math.sin((y / s) * N * Math.PI * 2);
        const over = ((Math.floor(xx / s * N) + Math.floor(y / s * N)) & 1) ? wx : wy;
        const v = 236 + over * 12 - n[i] * 22 - r() * 10;
        im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = clamp(v); im.data[i * 4 + 3] = 255;
      }
      x.putImageData(im, 0, 0); return c;
    });
  }
  /** Coloured surface materials, 512 px seamless tiles. */
  function material(type, hex) {
    return cached('m:' + type + hex, () => {
      const s = 512, c = mk(s), x = c.getContext('2d'), [R, G, B] = hexRgb(hex), im = x.createImageData(s, s), d = im.data;
      const put = (i, f, add = 0) => { d[i * 4] = clamp(R * f + add); d[i * 4 + 1] = clamp(G * f + add); d[i * 4 + 2] = clamp(B * f + add); d[i * 4 + 3] = 255; };
      if (type === 'wood') {
        const warp = fbm(s, 2, 8, 4, 31), fine = valueNoise(s, 4, 256, 32), knot = valueNoise(s, 3, 3, 33);
        for (let y = 0; y < s; y++) for (let xx = 0; xx < s; xx++) {
          const i = y * s + xx, ring = Math.sin(((y / s) * 12 + warp[i] * 3.2 + knot[i] * 1.5) * Math.PI * 2);
          put(i, 0.9 + ring * 0.06 + (fine[i] - 0.5) * 0.12 + (warp[i] - 0.5) * 0.08);
        }
        x.putImageData(im, 0, 0);
        x.fillStyle = 'rgba(0,0,0,.18)'; for (const yy of [0, 128, 256, 384]) x.fillRect(0, yy, s, 1.5); // plank joints
      } else if (type === 'concrete') {
        const n = fbm(s, 4, 4, 6, 41), r = rng(42);
        for (let i = 0; i < s * s; i++) put(i, 0.86 + (n[i] - 0.5) * 0.32 + (r() - 0.5) * 0.06);
        x.putImageData(im, 0, 0);
        for (let i = 0; i < 260; i++) { const px = r() * s, py = r() * s, rr = 0.5 + r() * 1.6; x.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.2})`; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill(); }
      } else if (type === 'linen') {
        const n = valueNoise(s, 16, 16, 51), sl = valueNoise(s, 2, 128, 52), sl2 = valueNoise(s, 128, 2, 53), N = 128;
        for (let y = 0; y < s; y++) for (let xx = 0; xx < s; xx++) {
          const i = y * s + xx, a = Math.sin((xx / s) * N * Math.PI * 2) * (0.6 + sl[i] * 0.6), b = Math.sin((y / s) * N * Math.PI * 2) * (0.6 + sl2[i] * 0.6);
          put(i, 0.9 + (a + b) * 0.035 + (n[i] - 0.5) * 0.08);
        }
        x.putImageData(im, 0, 0);
      } else if (type === 'plaster') {
        const n = fbm(s, 3, 3, 5, 61), fine = valueNoise(s, 160, 160, 62);
        for (let i = 0; i < s * s; i++) put(i, 0.92 + (n[i] - 0.5) * 0.14 + (fine[i] - 0.5) * 0.05);
        x.putImageData(im, 0, 0);
      } else if (type === 'brick') {
        const n = fbm(s, 8, 8, 4, 71), r = rng(72), rows = 8, cols = 4, bh = s / rows, bw = s / cols;
        for (let i = 0; i < s * s; i++) put(i, 1.06 + (n[i] - 0.5) * 0.1); // mortar
        x.putImageData(im, 0, 0);
        for (let row = 0; row < rows; row++) for (let col = -1; col < cols; col++) {
          const off = (row & 1) ? bw / 2 : 0, f = 0.74 + r() * 0.16;
          x.fillStyle = `rgb(${clamp(R * f)},${clamp(G * f * 0.97)},${clamp(B * f * 0.94)})`;
          const bx = col * bw + off + 3, by = row * bh + 3;
          x.fillRect(bx, by, bw - 6, bh - 6); if (bx + bw > s) x.fillRect(bx - s, by, bw - 6, bh - 6);
        }
        const ov = x.getImageData(0, 0, s, s), od = ov.data, nn = valueNoise(s, 64, 64, 73);
        for (let i = 0; i < s * s; i++) { const f = 0.94 + nn[i] * 0.12; od[i * 4] = clamp(od[i * 4] * f); od[i * 4 + 1] = clamp(od[i * 4 + 1] * f); od[i * 4 + 2] = clamp(od[i * 4 + 2] * f); }
        x.putImageData(ov, 0, 0);
      } else if (type === 'terrazzo') {
        const n = valueNoise(s, 32, 32, 81), r = rng(82);
        for (let i = 0; i < s * s; i++) put(i, 0.96 + (n[i] - 0.5) * 0.06);
        x.putImageData(im, 0, 0);
        const chips = [[0.55, 0.55, 0.55], [0.35, 0.33, 0.3], [1.12, 1.1, 1.08], [0.8, 0.62, 0.5], [0.62, 0.7, 0.68]];
        for (let i = 0; i < 520; i++) {
          const cx = r() * s, cy = r() * s, rr = 1.5 + Math.pow(r(), 3) * 12, k = chips[Math.floor(r() * chips.length)], sides = 4 + Math.floor(r() * 4), a0 = r() * 6.3;
          x.fillStyle = `rgb(${clamp(R * k[0])},${clamp(G * k[1])},${clamp(B * k[2])})`;
          for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
            x.beginPath();
            for (let j = 0; j < sides; j++) { const a = a0 + j / sides * Math.PI * 2, q = rr * (0.6 + r() * 0.5); x.lineTo(cx + ox + Math.cos(a) * q, cy + oy + Math.sin(a) * q); }
            x.fill();
          }
        }
      } else { // plain: flat colour with an almost invisible noise (avoids banding in gradients)
        const r = rng(91);
        for (let i = 0; i < s * s; i++) put(i, 1, (r() - 0.5) * 4);
        x.putImageData(im, 0, 0);
      }
      return c;
    });
  }
  return { rng, valueNoise, fbm, grain, paper, weave, material, hexRgb, MATERIALS: ['plain', 'wood', 'concrete', 'linen', 'plaster', 'brick', 'terrazzo'] };
});
