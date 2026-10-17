/* demo.js — Maquette Atelier: three original demo designs drawn by code (no stock images, no fonts to download),
 * so that every scene shows something before you load your own artwork. Geometric motifs inspired by
 * Amazigh/Kabyle pottery and weaving patterns (lozenges, zigzags, triangles). Original code and artwork, MIT licence. */
(function (root, factory) { root.DEMO = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Tifinagh', sans-serif";
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  /** Row of lozenges (zigzag band) between y0 and y1. */
  function band(x, y0, y1, w, n, c1, c2) {
    const h = y1 - y0, step = w / n;
    x.fillStyle = c1; x.fillRect(0, y0, w, h);
    x.fillStyle = c2;
    for (let i = 0; i < n; i++) {
      const cx = step * (i + 0.5);
      x.beginPath(); x.moveTo(cx, y0 + h * 0.12); x.lineTo(cx + step * 0.38, y0 + h / 2); x.lineTo(cx, y1 - h * 0.12); x.lineTo(cx - step * 0.38, y0 + h / 2); x.closePath(); x.fill();
    }
    x.fillRect(0, y0, w, h * 0.06); x.fillRect(0, y1 - h * 0.06, w, h * 0.06);
  }
  /** Poster, 2:3 portrait. */
  function poster() {
    const W = 1600, H = 2400, [c, x] = canvas(W, H);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f6c453'); g.addColorStop(0.55, '#ee7b3a'); g.addColorStop(1, '#b8322c');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff3da'; x.beginPath(); x.arc(W * 0.5, H * 0.38, W * 0.3, 0, Math.PI * 2); x.fill();
    // mountains
    x.fillStyle = '#3b1f2b';
    x.beginPath(); x.moveTo(0, H * 0.62);
    const peaks = [[0.12, 0.5], [0.26, 0.58], [0.42, 0.44], [0.58, 0.56], [0.74, 0.46], [0.9, 0.57], [1, 0.52]];
    for (const [px, py] of peaks) x.lineTo(W * px, H * py);
    x.lineTo(W, H * 0.7); x.lineTo(0, H * 0.7); x.closePath(); x.fill();
    band(x, H * 0.68, H * 0.76, W, 9, '#3b1f2b', '#f6c453');
    x.fillStyle = '#3b1f2b'; x.fillRect(0, H * 0.76, W, H * 0.24);
    x.fillStyle = '#fff3da'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.font = `800 ${W * 0.15}px ${FONT}`; x.fillText('ATELIER', W / 2, H * 0.88);
    x.font = `500 ${W * 0.045}px ${FONT}`; x.fillStyle = '#f6c453'; x.fillText('ⵜⴰⵡⵓⵔⵉ · 2026 · DESIGN', W / 2, H * 0.94);
    return c;
  }
  /** Business card, 85 × 55 proportion (landscape). */
  function card() {
    const W = 1700, H = 1100, [c, x] = canvas(W, H);
    x.fillStyle = '#16323a'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#e9b44c'; x.fillRect(0, H - 90, W, 90);
    band(x, H - 90, H, W, 14, '#e9b44c', '#16323a');
    const cx = W * 0.27, cy = H * 0.44, r = H * 0.25;
    x.strokeStyle = '#e9b44c'; x.lineWidth = 22; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#e9b44c'; x.beginPath(); x.moveTo(cx, cy - r * 0.62); x.lineTo(cx + r * 0.5, cy); x.lineTo(cx, cy + r * 0.62); x.lineTo(cx - r * 0.5, cy); x.closePath(); x.fill();
    x.fillStyle = '#16323a'; x.beginPath(); x.moveTo(cx, cy - r * 0.28); x.lineTo(cx + r * 0.22, cy); x.lineTo(cx, cy + r * 0.28); x.lineTo(cx - r * 0.22, cy); x.closePath(); x.fill();
    x.fillStyle = '#f4efe4'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.font = `750 ${H * 0.11}px ${FONT}`; x.fillText('Maquette', W * 0.5, H * 0.4);
    x.font = `750 ${H * 0.11}px ${FONT}`; x.fillStyle = '#e9b44c'; x.fillText('Atelier', W * 0.5, H * 0.52);
    x.fillStyle = 'rgba(244,239,228,.75)'; x.font = `400 ${H * 0.045}px ${FONT}`;
    x.fillText('studio graphique', W * 0.5, H * 0.62);
    return c;
  }
  /** Square repeating pattern (packaging, tote bag, social post). */
  function pattern() {
    const W = 1600, [c, x] = canvas(W, W), n = 6, s = W / n;
    const cols = ['#1f4e5f', '#e0a43a', '#c8553d', '#f3ead8'];
    x.fillStyle = cols[3]; x.fillRect(0, 0, W, W);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const px = i * s, py = j * s, k = (i + j) % 3;
      x.fillStyle = cols[k];
      x.beginPath(); x.moveTo(px + s / 2, py + s * 0.08); x.lineTo(px + s * 0.92, py + s / 2); x.lineTo(px + s / 2, py + s * 0.92); x.lineTo(px + s * 0.08, py + s / 2); x.closePath(); x.fill();
      x.fillStyle = cols[3];
      x.beginPath(); x.moveTo(px + s / 2, py + s * 0.3); x.lineTo(px + s * 0.7, py + s / 2); x.lineTo(px + s / 2, py + s * 0.7); x.lineTo(px + s * 0.3, py + s / 2); x.closePath(); x.fill();
      x.fillStyle = cols[(k + 1) % 3]; x.beginPath(); x.arc(px + s / 2, py + s / 2, s * 0.07, 0, 7); x.fill();
      x.fillStyle = cols[(k + 2) % 3];
      for (const [tx, ty] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { x.beginPath(); x.moveTo(px + tx * s, py + ty * s); x.lineTo(px + tx * s + (tx ? -1 : 1) * s * 0.18, py + ty * s); x.lineTo(px + tx * s, py + ty * s + (ty ? -1 : 1) * s * 0.18); x.closePath(); x.fill(); }
    }
    x.fillStyle = 'rgba(31,78,95,.92)'; x.fillRect(W * 0.18, W * 0.4, W * 0.64, W * 0.2);
    x.fillStyle = '#f3ead8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 ${W * 0.075}px ${FONT}`; x.fillText('TIZI · ⵜⵉⵣⵉ', W / 2, W * 0.5);
    return c;
  }
  return { list: [{ id: 'poster', make: poster }, { id: 'card', make: card }, { id: 'pattern', make: pattern }] };
});
