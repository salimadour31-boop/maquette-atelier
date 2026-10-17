/* scenes.js — Maquette Atelier: the procedural scenes. Every object is built from a small pinhole camera
 * (yaw / pitch / focal length) looking at real-world dimensions in millimetres, so the default perspective is
 * physically consistent; the projected corner points are then the draggable handles of the free-perspective mode.
 * Each scene = { id, opts (scene options), slots (image slots), build(o, s) → { pts, focus, cam, … }, env(R), draw(R) }.
 * Nothing here comes from a photo: walls, desks, frames, devices, bags and skies are all drawn with code.
 * Original code, MIT licence. */
(function (root, factory) { root.SCENES = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const v2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

  /** Pinhole camera orbiting `target` (Z up). proj([x, y, z]) → [x, y] in the 1200 × 900 core space. */
  function camera({ yaw = 0, pitch = 20, dist = 1000, fov = 30, target = [0, 0, 0] }) {
    pitch = clamp(pitch, -86, 86);
    const y = yaw * D2R, p = pitch * D2R;
    const pos = [target[0] + dist * Math.cos(p) * Math.sin(y), target[1] - dist * Math.cos(p) * Math.cos(y), target[2] + dist * Math.sin(p)];
    const f = norm(sub(target, pos)), r = norm(cross(f, [0, 0, 1])), u = cross(r, f), F = 450 / Math.tan(fov / 2 * D2R);
    const proj = (P) => { const v = sub(P, pos), zc = Math.max(1e-3, dot(v, f)); return [600 + F * dot(v, r) / zc, 450 - F * dot(v, u) / zc]; };
    return { proj, pos, f, r, u, F, facing: (P, n) => dot(n, sub(pos, P)) > 0 };
  }
  /** Rectangle lying on a horizontal plane (z), rotated by rot° → projected TL, TR, BR, BL (TL/TR = far edge). */
  function planeRect(cam, cx, cy, w, h, rot, z = 0) {
    const a = rot * D2R, c = Math.cos(a), s = Math.sin(a);
    return [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]].map(([x, y]) => cam.proj([cx + x * c - y * s, cy + x * s + y * c, z]));
  }

  /* ================================================================== environments */
  /** Soft light pool + falloff over the whole view. */
  function pool(R, mult = 1) {
    const { ctx, view, lx, ly, lk } = R, d = Math.hypot(view.w, view.h);
    const cx = (view.x0 + view.x1) / 2 + lx * view.w * 0.28, cy = (view.y0 + view.y1) / 2 + ly * view.h * 0.28;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, d * 0.78);
    g.addColorStop(0, `rgba(255,250,240,${0.16 * lk * mult})`); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(12,8,4,${0.3 * lk * mult})`);
    R.fill(view.poly, g);
  }
  function envDesk(R) { R.fill(R.view.poly, R.pattern(R.s.material, R.s.surface, 0.9)); pool(R); }
  function envWall(R) { R.fill(R.view.poly, R.pattern(R.s.material, R.s.surface, 0.9)); pool(R, 0.9); }
  /** Gradient backdrop with soft colour blobs (floating objects: phone, social card, free mode). */
  function envBackdrop(R) {
    const { ctx, s, view } = R, a = s.bgAngle * D2R, cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2, rr = Math.hypot(view.w, view.h) / 2;
    const g = ctx.createLinearGradient(cx - Math.sin(a) * rr, cy + Math.cos(a) * rr, cx + Math.sin(a) * rr, cy - Math.cos(a) * rr);
    g.addColorStop(0, s.bg2); g.addColorStop(1, s.bg1); R.fill(view.poly, g);
    const rnd = TEX.rng(s.scene.length * 31 + 5);
    [[s.accent, 0.3], [R.shade(s.bg1, 0.5), 0.55], [s.bg2, 0.45]].forEach(([col, al]) => {
      const x = view.x0 + view.w * (0.15 + rnd() * 0.7), y = view.y0 + view.h * (0.15 + rnd() * 0.7), r = rr * (0.35 + rnd() * 0.35);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, R.rgba(col, al)); gg.addColorStop(1, R.rgba(col, 0)); R.fill(view.poly, gg);
    });
    if (s.material !== 'plain') { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; R.fill(view.poly, R.pattern(s.material, '#ffffff', 0.9)); ctx.restore(); }
    pool(R, 0.6);
  }
  /** Studio corner: wall (backdrop gradient) + floor/table (surface material) meeting at the projected wall line. */
  function envStudio(R, wallY, ext) {
    const { ctx, s, view, B } = R, cam = B.cam;
    const g = ctx.createLinearGradient(0, view.y0, 0, view.y1); g.addColorStop(0, s.bg1); g.addColorStop(1, s.bg2); R.fill(view.poly, g);
    const A = cam.proj([-ext, wallY, 0]), Bp = cam.proj([ext, wallY, 0]), inside = cam.proj([0, wallY - ext, 0]);
    const floor = R.halfPlane(A, Bp, inside);
    if (floor.length > 2) {
      R.fill(floor, R.pattern(s.material, s.surface, 0.9));
      const M = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2], dx = Bp[0] - A[0], dy = Bp[1] - A[1], l = Math.hypot(dx, dy) || 1;
      let nx = -dy / l, ny = dx / l; if ((inside[0] - M[0]) * nx + (inside[1] - M[1]) * ny < 0) { nx = -nx; ny = -ny; }
      const L = view.h * 0.9, fg = ctx.createLinearGradient(M[0], M[1], M[0] + nx * L, M[1] + ny * L);
      fg.addColorStop(0, 'rgba(10,6,2,.2)'); fg.addColorStop(0.1, 'rgba(10,6,2,.05)'); fg.addColorStop(0.6, `rgba(255,252,245,${0.07 * R.lk})`); fg.addColorStop(1, 'rgba(10,6,2,.12)');
      R.fill(floor, fg);
      const wall = R.halfPlane(A, Bp, [M[0] - nx * 10, M[1] - ny * 10]), wg = ctx.createLinearGradient(M[0], M[1], M[0] - nx * view.h * 0.3, M[1] - ny * view.h * 0.3);
      wg.addColorStop(0, 'rgba(10,6,2,.12)'); wg.addColorStop(1, 'rgba(10,6,2,0)'); if (wall.length > 2) R.fill(wall, wg);
    }
    pool(R, 0.8);
  }

  /* ================================================================== shared object helpers */
  /** Axis-aligned cuboid: draws the faces turned towards the camera, shaded by their normal. */
  function cuboid(R, cam, [x0, x1], [y0, y1], [z0, z1], fillFor) {
    const p = cam.proj, faces = [
      { n: [0, 0, 1], c: [(x0 + x1) / 2, (y0 + y1) / 2, z1], q: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]] },
      { n: [0, -1, 0], c: [(x0 + x1) / 2, y0, (z0 + z1) / 2], q: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] },
      { n: [-1, 0, 0], c: [x0, (y0 + y1) / 2, (z0 + z1) / 2], q: [[x0, y1, z1], [x0, y0, z1], [x0, y0, z0], [x0, y1, z0]] },
      { n: [1, 0, 0], c: [x1, (y0 + y1) / 2, (z0 + z1) / 2], q: [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]] },
    ];
    const out = [];
    for (const f of faces) if (cam.facing(f.c, f.n)) { const q = f.q.map(p); R.fill(q, fillFor(f.n)); R.shade3D(q, f.n, 0.9); out.push(q); }
    return out;
  }
  function cuboidHull(R, cam, [x0, x1], [y0, y1], [z0, z1]) {
    const pts = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) pts.push(cam.proj([x, y, z]));
    return R.hull(pts);
  }
  /** Screen painter (phone / laptop): black glass, design, optional camera island. */
  function screenPainter(island) {
    return (x, w, h, src) => {
      x.fillStyle = '#050506'; x.fillRect(0, 0, w, h);
      if (src.kind === 'img') RENDER.drawFit(x, src.img, 0, 0, w, h, src.fit, src.rot);
      else if (src.kind === 'color') { x.fillStyle = src.color; x.fillRect(0, 0, w, h); }
      if (island) { const iw = w * 0.31, ih = w * 0.088; RENDER.roundRect(x, (w - iw) / 2, w * 0.035, iw, ih, ih / 2); x.fillStyle = '#000'; x.fill(); }
    };
  }
  /** Contrasting ink for text drawn over a colour. */
  const inkOn = (hex) => (RENDER.lum(hex || '#888888') > 0.55 ? '#1b1c20' : '#f7f3ea');
  const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Tifinagh', sans-serif";

  /* ================================================================== 1. poster on a wall */
  const RATIOS = { 'a-p': [495, 700], 'a-l': [700, 495], '2:3': [467, 700], '3:2': [700, 467], '3:4': [525, 700], '1:1': [600, 600] };
  const FRAMES = { none: 0, black: 24, white: 24, oak: 32, alu: 11 };
  const poster = {
    id: 'poster',
    opts: [
      { key: 'ratio', type: 'select', choices: Object.keys(RATIOS), def: 'a-p' },
      { key: 'frame', type: 'select', choices: Object.keys(FRAMES), def: 'oak' },
      { key: 'mat', type: 'range', min: 0, max: 25, step: 1, def: 8 },
      { key: 'decor', type: 'bool', def: true },
    ],
    slots: () => [{ label: 'slPoster', def: 0 }],
    build(o, s) {
      const [w, h] = RATIOS[o.ratio] || RATIOS['a-p'], zc = 1520;
      const cam = camera({ yaw: clamp(-16 + s.yaw, -60, 60), pitch: clamp(3 + s.pitch, -20, 30), dist: o.decor ? 3600 : 2700, fov: 30, target: [0, 0, o.decor ? 1080 : zc] });
      const p = cam.proj, pts = [p([-w / 2, 0, zc + h / 2]), p([w / 2, 0, zc + h / 2]), p([w / 2, 0, zc - h / 2]), p([-w / 2, 0, zc - h / 2])];
      const m = FRAMES[o.frame] + (o.frame === 'none' ? 0 : o.mat / 100 * Math.min(w, h));
      const focus = o.decor
        ? [p([-900, 0, zc + h / 2 + m + 120]), p([900, 0, zc + h / 2 + m + 120]), p([900, -470, 0]), p([-900, -470, 0]), p([900, 0, 0]), p([-900, 0, 0])]
        : [[-w / 2 - m - w * 0.35, zc + h / 2 + m + h * 0.28], [w / 2 + m + w * 0.35, zc + h / 2 + m + h * 0.28], [w / 2 + m + w * 0.35, zc - h / 2 - m - h * 0.28], [-w / 2 - m - w * 0.35, zc - h / 2 - m - h * 0.28]].map(([x, z]) => p([x, 0, z]));
      return { pts, focus, cam, w, h, zc, pad: 0.03 };
    },
    env(R) {
      envWall(R);
      const { B, s, view } = R, p = B.cam.proj;
      const fA = p([-1500, 0, 0]), fB = p([1500, 0, 0]), inside = p([0, -1500, 0]);
      const floor = R.halfPlane(fA, fB, inside);
      if (floor.length > 2) {
        const floorCol = R.mix(s.surface, '#4a3a2c', 0.55);
        R.fill(floor, R.pattern('wood', floorCol, 1.1));
        const g = R.ctx.createLinearGradient(0, fA[1], 0, view.y1); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,.05)'); R.fill(floor, g);
        const bA = p([-1500, 0, 95]), bB = p([1500, 0, 95]);
        const board = R.halfPlane(bA, bB, inside, R.halfPlane(fA, fB, p([0, 0, 600])));
        if (board.length > 2) { R.fill(board, R.shade(s.surface, 0.22)); R.fill(board, 'rgba(0,0,0,.05)'); }
      }
    },
    draw(R) {
      const { P, B, o, s, ctx, k, lx, ly, lk } = R, { w, h } = B, Hm = R.H(P);
      const fw = FRAMES[o.frame] || 0, mat = fw ? o.mat / 100 * Math.min(w, h) : 0;
      const outer = R.sub(Hm, -(fw + mat) / w, -(fw + mat) / h, 1 + (fw + mat) / w, 1 + (fw + mat) / h);
      const inner = R.sub(Hm, -mat / w, -mat / h, 1 + mat / w, 1 + mat / h);
      if (fw) {
        R.shadow([outer], { dist: 1.15, blur: 1 });
        const base = { black: '#1e1e21', white: '#f1efe9', oak: '#b4895b', alu: '#c3c7cd' }[o.frame];
        const sides = [[[0, -1], [outer[0], outer[1], inner[1], inner[0]]], [[1, 0], [outer[1], outer[2], inner[2], inner[1]]], [[0, 1], [outer[2], outer[3], inner[3], inner[2]]], [[-1, 0], [outer[3], outer[0], inner[0], inner[3]]]];
        for (const [n, q] of sides) {
          R.fill(q, o.frame === 'oak' ? R.pattern('wood', base, 0.5) : base);
          const f = (n[0] * lx + n[1] * ly) * lk;
          R.fill(q, f > 0 ? `rgba(255,255,255,${0.22 * f})` : `rgba(0,0,0,${-0.3 * f})`);
        }
        ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(0,0,0,.25)'; R.path(outer); ctx.stroke();
        R.fill(inner, s.paper);
        R.sheet(P, { slot: 0, def: { def: 0 }, aspect: w / h, shadow: false, noLight: true, glossMult: 0 });
        // inner shadow cast by the frame on the mat
        ctx.save(); R.path(inner); ctx.clip();
        const V = R.view; ctx.beginPath(); ctx.rect(V.x0 - 50, V.y0 - 50, V.w + 100, V.h + 100); inner.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
        ctx.shadowColor = `rgba(0,0,0,${0.45 * Math.max(0.3, lk)})`; ctx.shadowBlur = 7 * k; ctx.shadowOffsetX = -lx * 3 * k; ctx.shadowOffsetY = -ly * 3 * k;
        ctx.fillStyle = '#000'; ctx.fill('evenodd'); ctx.restore();
        R.lightFlat(inner); R.gloss(inner, 1.15, 0.04);
      } else {
        R.sheet(P, { slot: 0, def: { def: 0 }, aspect: w / h, shadow: { dist: 0.35, blur: 0.5 }, glossMult: 0.5 });
      }
      if (o.decor) drawConsole(R);
    },
  };
  /** Low sideboard with books and a vase (poster scene decor). */
  function drawConsole(R) {
    const cam = R.B.cam, p = cam.proj, { s, ctx } = R, wood = '#a07650';
    const X = [-760, 760], Y = [-430, -25], Z = [0, 520];
    R.shadow([cuboidHull(R, cam, X, Y, Z)], { dist: 0.8, blur: 1 });
    cuboid(R, cam, X, Y, Z, (n) => (n[2] ? R.pattern('wood', R.shade(wood, 0.08), 0.45) : R.pattern('wood', wood, 0.45)));
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.8;
    for (const x of [-253, 253]) { const a = p([x, -430, 500]), b = p([x, -430, 30]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (const x of [-380, 0, 380]) { const a = p([x - 40, -432, 300]), b = p([x + 40, -432, 300]); ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(30,22,14,.55)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    cuboid(R, cam, [-610, -330], [-340, -120], [520, 556], () => R.mix(s.accent, '#ffffff', 0.35));
    cuboid(R, cam, [-590, -350], [-322, -140], [556, 584], () => R.shade(s.bg2, -0.35));
    // vase: sampled cylinder
    const cx = 420, cy = -230, r = 78, z0 = 520, z1 = 760, ring = (z) => { const o = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; o.push(p([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z])); } return o; };
    const bottom = ring(z0), top = ring(z1), sil = R.hull(bottom.concat(top));
    R.shadow([sil], { dist: 0.5, blur: 0.6 });
    const bb = R.bbox(sil), g = ctx.createLinearGradient(bb.x0, 0, bb.x1, 0), L = R.lx;
    g.addColorStop(0, R.shade(s.accent, -0.35 + Math.min(0, L) * 0.2)); g.addColorStop(0.5 - L * 0.25, R.shade(s.accent, 0.18)); g.addColorStop(1, R.shade(s.accent, -0.35 - Math.max(0, L) * 0.2));
    R.fill(sil, g); R.fill(top, R.shade(s.accent, -0.55));
    ctx.lineCap = 'round';
    [[-0.5, 1], [0.25, 1.25], [0.8, 0.9]].forEach(([dx, hh], i) => {
      const pts = []; for (let t = 0; t <= 1.0001; t += 0.1) pts.push(p([cx + dx * 120 * t * t, cy, z1 + 380 * hh * t]));
      ctx.strokeStyle = '#3f4a35'; ctx.lineWidth = 1.6; ctx.beginPath(); pts.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      for (let j = 3; j < pts.length; j += 2) for (const sd of [-1, 1]) {
        const q = pts[j]; ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(sd * (0.9 + i * 0.1) - Math.PI / 2 + dx * 0.4);
        ctx.fillStyle = j % 4 ? '#5d6e4c' : '#4b5b3d'; ctx.beginPath(); ctx.ellipse(0, -9, 3.6, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    });
  }

  /* ================================================================== 2. business cards on a desk */
  const cards = {
    id: 'cards',
    opts: [
      { key: 'layout', type: 'select', choices: ['pair', 'stack'], def: 'pair' },
      { key: 'radius', type: 'range', min: 0, max: 5, step: 0.5, def: 0 },
      { key: 'thick', type: 'range', min: 0, max: 4, step: 0.5, def: 1.5 },
    ],
    slots: () => [{ label: 'slFront', def: 0 }, { label: 'slBack', def: 1 }],
    build(o, s) {
      const cam = camera({ yaw: s.yaw, pitch: clamp(62 + s.pitch, 25, 86), dist: 700, fov: 30 });
      const A = o.layout === 'stack' ? planeRect(cam, -16, -6, 85, 55, -7) : planeRect(cam, -28, -16, 85, 55, -11);
      const Bq = o.layout === 'stack' ? planeRect(cam, 54, 40, 85, 55, 22) : planeRect(cam, 36, 24, 85, 55, 15);
      return { pts: A.concat(Bq), focus: A.concat(Bq), cam, pad: 0.2, quads: [[0, 1, 2, 3], [4, 5, 6, 7]] };
    },
    env: envDesk,
    draw(R) {
      const { P, o, s } = R, t = [0, o.thick * 0.9], edge = R.shade(s.paper, -0.18), rad = o.radius / 55;
      const opt = { aspect: 85 / 55, radius: rad, thick: o.thick ? t : null, edge };
      R.sheet(P.slice(4, 8), Object.assign({ slot: 1, def: { def: 1 }, shadow: { dist: 0.25, blur: 0.45 } }, opt));
      if (o.layout === 'stack') {
        const A = P.slice(0, 4);
        for (let i = 4; i >= 1; i--) {
          const q = A.map((p) => [p[0] + i * 0.25, p[1] + t[1] * i + i * 0.9]), Hm = R.H(q), sil = rad ? R.rrUV(Hm, 0, 0, 1, 1, rad * 55 / 85, rad) : q;
          if (i === 4) R.shadow([sil], { dist: 0.35, blur: 0.5 });
          R.fill(R.hull(sil.concat(sil.map((p) => R.add(p, t)))), edge); R.fill(sil, R.shade(s.paper, -0.04 - i * 0.012));
        }
      }
      R.sheet(P.slice(0, 4), Object.assign({ slot: 0, def: { def: 0 }, shadow: { dist: o.layout === 'stack' ? 0.2 : 0.32, blur: 0.5 } }, opt));
    },
  };

  /* ================================================================== 3. A4 flyer / letterhead */
  const FORMATS = { a4: [210, 297], letter: [216, 279], dl: [99, 210] };
  const flyer = {
    id: 'flyer',
    opts: [
      { key: 'format', type: 'select', choices: Object.keys(FORMATS), def: 'a4' },
      { key: 'second', type: 'bool', def: true },
      { key: 'pencil', type: 'bool', def: true },
    ],
    slots: (o) => (o.second ? [{ label: 'slSheet1', def: 0 }, { label: 'slSheet2', def: 1 }] : [{ label: 'slSheet1', def: 0 }]),
    build(o, s) {
      const [w, h] = FORMATS[o.format] || FORMATS.a4, cam = camera({ yaw: s.yaw, pitch: clamp(58 + s.pitch, 25, 86), dist: 1250 + h * 1.4, fov: 28 });
      const A = planeRect(cam, o.second ? w * 0.3 : 0, -h * 0.03, w, h, o.second ? -6 : -4), Bq = planeRect(cam, -w * 0.3, h * 0.07, w, h, 8);
      const pen = { cx: (o.second ? w * 0.3 : 0) + w * 0.62 + 32, cy: -h * 0.12, ang: 104, len: 175 };
      const pts = o.second ? A.concat(Bq) : A, focus = pts.concat(o.pencil ? [cam.proj([pen.cx, pen.cy + 95, 0]), cam.proj([pen.cx + 30, pen.cy - 95, 0])] : []);
      return { pts, focus, cam, pen, w, h, pad: 0.1, quads: o.second ? [[0, 1, 2, 3], [4, 5, 6, 7]] : [[0, 1, 2, 3]] };
    },
    env: envDesk,
    draw(R) {
      const { P, B, o, s } = R, asp = B.w / B.h, t = [0, 0.6];
      if (o.second) R.sheet(P.slice(4, 8), { slot: 1, def: { def: 1 }, aspect: asp, thick: t, edge: R.shade(s.paper, -0.15), shadow: { dist: 0.25, blur: 0.5 } });
      R.sheet(P.slice(0, 4), { slot: 0, def: { def: 0 }, aspect: asp, thick: t, edge: R.shade(s.paper, -0.15), shadow: { dist: 0.35, blur: 0.6 } });
      if (o.pencil) drawPencil(R, B.cam, B.pen);
    },
  };
  /** Hexagonal pencil lying on the desk (3 facets, cone, graphite, ferrule, eraser). */
  function drawPencil(R, cam, pen) {
    const { s, ctx } = R, a = pen.ang * D2R, d = [Math.cos(a), Math.sin(a)], n = [-Math.sin(a), Math.cos(a)], rad = 3.6, half = pen.len / 2, cone = 19;
    const P = (t, off, z = rad) => cam.proj([pen.cx + d[0] * t + n[0] * off, pen.cy + d[1] * t + n[1] * off, z]);
    const outline = [P(-half, -rad), P(half - cone, -rad), P(half, 0, 0.8), P(half - cone, rad), P(-half, rad)];
    R.shadow([outline], { dist: 0.35, blur: 0.35 });
    const body = s.accent, facets = [[-rad, -rad / 3, -0.18], [-rad / 3, rad / 3, 0.12], [rad / 3, rad, -0.32]];
    for (const [o0, o1, sh] of facets) {
      R.fill([P(-half + 16, o0), P(half - cone, o0), P(half - cone, o1), P(-half + 16, o1)], R.shade(body, sh * (0.6 + R.lk)));
      R.fill([P(half - cone, o0), P(half, 0, 0.8), P(half - cone, o1)], R.shade('#e2c08f', sh * 0.8));
    }
    R.fill([P(half - 6.5, -rad * 0.34), P(half, 0, 0.8), P(half - 6.5, rad * 0.34)], '#34353a');
    R.fill([P(-half + 7, -rad), P(-half + 16, -rad), P(-half + 16, rad), P(-half + 7, rad)], '#b9bcc3');
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 0.5;
    for (const tt of [-half + 9.5, -half + 13.5]) { const q0 = P(tt, -rad), q1 = P(tt, rad); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    R.fill([P(-half, -rad), P(-half + 7, -rad), P(-half + 7, rad), P(-half, rad)], '#e39a93');
  }

  /* ================================================================== 4. book / magazine with spine */
  const BOOKS = { b5: [170, 240], a5: [148, 210], sq: [200, 200], mag: [210, 280] };
  const book = {
    id: 'book',
    opts: [
      { key: 'pose', type: 'select', choices: ['stand', 'lying'], def: 'stand' },
      { key: 'size', type: 'select', choices: Object.keys(BOOKS), def: 'b5' },
      { key: 'thick', type: 'range', min: 3, max: 60, step: 1, def: 24 },
      { key: 'spine', type: 'text', def: 'ATELIER · 2026', max: 40 },
    ],
    slots: () => [{ label: 'slCover', def: 0 }, { label: 'slSpine', def: 1, fallback: 'auto' }],
    build(o, s) {
      const [W, H] = BOOKS[o.size] || BOOKS.b5, T = o.thick, x0 = -W / 2, x1 = W / 2;
      let cam, pts, n;
      if (o.pose === 'lying') {
        cam = camera({ yaw: clamp(-28 + s.yaw, -80, -6), pitch: clamp(48 + s.pitch, 12, 86), dist: 900 + H * 1.7, fov: 30 });
        const p = cam.proj;
        pts = [p([x0, H / 2, T]), p([x1, H / 2, T]), p([x1, -H / 2, T]), p([x0, -H / 2, T]), p([x0, H / 2, 0]), p([x0, -H / 2, 0]), p([x1, -H / 2, 0])];
        n = { cover: [0, 0, 1], spine: [-1, 0, 0], third: [0, -1, 0] };
      } else {
        cam = camera({ yaw: clamp(-30 + s.yaw, -80, -6), pitch: clamp(9 + s.pitch, 1, 50), dist: 900 + H * 1.7, fov: 30, target: [0, 0, H / 2] });
        const p = cam.proj, y0 = -T / 2, y1 = T / 2;
        pts = [p([x0, y0, H]), p([x1, y0, H]), p([x1, y0, 0]), p([x0, y0, 0]), p([x0, y1, H]), p([x0, y1, 0]), p([x1, y1, H])];
        n = { cover: [0, -1, 0], spine: [-1, 0, 0], third: [0, 0, 1] };
      }
      return { pts, focus: pts, cam, W, H, T, n, pad: 0.24, quads: [[0, 1, 2, 3], [4, 0, 3, 5], o.pose === 'lying' ? [3, 2, 6, 5] : [4, 6, 1, 0]] };
    },
    env(R) { if (R.o.pose === 'lying') envDesk(R); else envStudio(R, R.B.T / 2 + 260, 600); },
    draw(R) {
      const { P, B, o, s, ctx } = R, { W, H, T, n } = B;
      R.shadow([R.hull(P)], { dist: o.pose === 'lying' ? 0.55 : 0.95, blur: 0.9 });
      const coverSrc = R.source(0, { def: 0 }), board = coverSrc.avg || (coverSrc.color) || s.accent;
      const third = o.pose === 'lying' ? [P[3], P[2], P[6], P[5]] : [P[4], P[6], P[1], P[0]];
      R.sheet(third, {
        slot: 'pg', src: { kind: 'none', id: 'pages' }, aspect: W / T, shadow: false, normal: n.third, glossMult: 0, key: board + T,
        painter: (x, w, h) => {
          x.fillStyle = R.mix(s.paper, '#efe3c8', 0.55); x.fillRect(0, 0, w, h);
          const lines = Math.round(T * 3); x.fillStyle = 'rgba(90,70,40,.10)';
          for (let i = 1; i < lines; i++) x.fillRect(0, i / lines * h, w, Math.max(1, h / lines * 0.35));
          const bt = Math.max(1.5, h * Math.min(0.12, 1.2 / T)); x.fillStyle = board; x.fillRect(0, 0, w, bt); x.fillRect(0, h - bt, w, bt); x.fillRect(0, 0, Math.max(2, w * 1.4 / W), h);
        },
      });
      R.sheet([P[4], P[0], P[3], P[5]], {
        slot: 1, def: { def: 1, fallback: 'auto' }, aspect: T / H, shadow: false, normal: n.spine, glossMult: 0.5, key: o.spine,
        painter: (x, w, h, src) => {
          R.paintPrint(x, w, h, src, { paper: s.paper, ink: s.ink, tex: s.paperTex / 100 });
          if (o.spine && w > 6) {
            const bg = src.kind === 'color' ? src.color : src.avg || s.paper;
            x.save(); x.translate(w / 2, h * 0.07); x.rotate(Math.PI / 2);
            x.fillStyle = inkOn(bg); x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `700 ${Math.min(w * 0.42, h * 0.05)}px ${FONT}`;
            x.fillText(o.spine, 0, 0, h * 0.86); x.restore();
          }
        },
      });
      R.sheet(P.slice(0, 4), { slot: 0, def: { def: 0 }, aspect: W / H, shadow: false, normal: n.cover, glossMult: 0.8 });
      ctx.strokeStyle = `rgba(255,255,255,${0.28 * R.lk})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[3][0], P[3][1]); ctx.stroke();
    },
  };

  /* ================================================================== 5. phone */
  const PH = { W: 72, H: 152, D: 8.2, ins: 3.6, rad: 11 };
  const phone = {
    id: 'phone',
    opts: [{ key: 'pose', type: 'select', choices: ['stand', 'flat'], def: 'stand' }, { key: 'island', type: 'bool', def: true }],
    slots: () => [{ label: 'slScreen', def: 0, fit: 'cover' }],
    build(o, s) {
      const { W, H, D, ins } = PH, sx0 = -W / 2 + ins, sx1 = W / 2 - ins;
      let cam, pts, t, focus;
      if (o.pose === 'flat') {
        cam = camera({ yaw: s.yaw, pitch: clamp(60 + s.pitch, 20, 86), dist: 640, fov: 30 });
        const p = cam.proj; pts = [p([sx0, H / 2 - ins, D]), p([sx1, H / 2 - ins, D]), p([sx1, -H / 2 + ins, D]), p([sx0, -H / 2 + ins, D])];
        t = v2(p([0, 0, 0]), p([0, 0, D])); focus = [p([-W / 2, H / 2, 0]), p([W / 2, H / 2, 0]), p([W / 2, -H / 2, 0]), p([-W / 2, -H / 2, 0])];
      } else {
        cam = camera({ yaw: clamp(-24 + s.yaw, -75, 75), pitch: clamp(7 + s.pitch, -30, 45), dist: 640, fov: 30, target: [0, 0, H / 2] });
        const p = cam.proj; pts = [p([sx0, 0, H - ins]), p([sx1, 0, H - ins]), p([sx1, 0, ins]), p([sx0, 0, ins])];
        t = v2(p([0, D, H / 2]), p([0, 0, H / 2])); focus = [p([-W / 2, 0, H]), p([W / 2, 0, H]), p([W / 2, D, 0]), p([-W / 2, D, 0])];
      }
      return { pts, focus, cam, t, pad: 0.2 };
    },
    env(R) { if (R.o.pose === 'flat') envDesk(R); else envBackdrop(R); },
    draw(R) {
      const { P, B, o, s, ctx } = R, { W, H, ins, rad } = PH, sw = W - 2 * ins, sh = H - 2 * ins, Hm = R.H(P);
      const body = R.rrUV(Hm, -ins / sw, -ins / sh, 1 + ins / sw, 1 + ins / sh, rad / sw, rad / sh), back = body.map((p) => R.add(p, B.t)), side = R.hull(body.concat(back));
      R.shadow([side], o.pose === 'flat' ? { dist: 0.45, blur: 0.6 } : { dist: 2.2, blur: 1.5 });
      const bb = R.bbox(side), g = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1), dev = s.device;
      g.addColorStop(0, R.shade(dev, -0.3)); g.addColorStop(0.45 - R.lx * 0.2, R.shade(dev, 0.22)); g.addColorStop(1, R.shade(dev, -0.35));
      R.fill(side, g);
      ctx.strokeStyle = R.shade(dev, 0.3); ctx.lineWidth = 0.7; R.path(body); ctx.stroke();
      R.fill(body, '#0b0c0f');
      R.sheet(P, { slot: 0, def: { def: 0, fit: 'cover' }, aspect: sw / sh, radius: (rad - ins) / sw, shadow: false, paper: null, painter: screenPainter(o.island), lightMult: 0.25, glossMult: 1.05, glossBase: 0.05, key: 'isl' + o.island });
      R.gloss(body, 0.35);
    },
  };

  /* ================================================================== 6. laptop */
  const LT = { W: 310, D: 215, T: 9, L: 205 };
  const laptop = {
    id: 'laptop',
    opts: [{ key: 'open', type: 'range', min: 95, max: 135, step: 1, def: 112 }],
    slots: () => [{ label: 'slScreen', def: 0, fit: 'cover' }],
    build(o, s) {
      const { W, D, T, L } = LT, a = o.open * D2R, dl = [0, -Math.cos(a), Math.sin(a)];
      const cam = camera({ yaw: clamp(-26 + s.yaw, -80, 80), pitch: clamp(17 + s.pitch, 2, 70), dist: 1250, fov: 28, target: [0, 30, 80] }), p = cam.proj;
      const pts = [p([-W / 2, -D / 2, T]), p([W / 2, -D / 2, T]), p([W / 2, D / 2, T]), p([-W / 2, D / 2, T]), p([-W / 2, D / 2 + L * dl[1], T + L * dl[2]]), p([W / 2, D / 2 + L * dl[1], T + L * dl[2]])];
      const t = v2(p([-W / 2, -D / 2, 0]), p([-W / 2, -D / 2, T]));
      const left = cam.facing([-W / 2, 0, T / 2], [-1, 0, 0]), right = cam.facing([W / 2, 0, T / 2], [1, 0, 0]);
      return { pts, focus: pts.concat([p([-W / 2, -D / 2, 0]), p([W / 2, -D / 2, 0])]), cam, t, left, right, lidN: [0, -Math.sin(a), -Math.cos(a)], pad: 0.12, quads: [[3, 2, 1, 0], [4, 5, 2, 3]] };
    },
    env(R) { envStudio(R, LT.D / 2 + 420, 900); },
    draw(R) {
      const { P, B, s, ctx } = R, { W, D, L } = LT, t = B.t, dev = s.device, add = R.add;
      R.shadow([R.hull(P.slice(0, 4).concat(P.slice(0, 4).map((p) => add(p, t))))], { dist: 0.55, blur: 0.8 });
      R.shadow([[P[4], P[5], P[2], P[3]]], { dist: 0.9, blur: 1.4, alpha: 0.45, contact: false });
      if (B.left) { const q = [P[3], P[0], add(P[0], t), add(P[3], t)]; R.fill(q, R.shade(dev, -0.28)); }
      if (B.right) { const q = [P[1], P[2], add(P[2], t), add(P[1], t)]; R.fill(q, R.shade(dev, -0.22)); }
      const front = [P[0], P[1], add(P[1], t), add(P[0], t)]; R.fill(front, R.shade(dev, -0.14));
      R.sheet([P[3], P[2], P[1], P[0]], {
        slot: 'kb', src: { kind: 'none', id: 'kb' }, aspect: W / D, shadow: false, normal: [0, 0, 1], glossMult: 0.25, key: dev, radius: 0.025,
        painter: (x, w, h) => {
          x.fillStyle = dev; x.fillRect(0, 0, w, h);
          x.fillStyle = R.shade(dev, -0.18); x.fillRect(0, 0, w, h * 0.035);
          const keyCol = R.lum(dev) > 0.45 ? '#232428' : R.shade(dev, -0.55), kx0 = w * 0.085, kx1 = w * 0.915, ky0 = h * 0.08, ky1 = h * 0.53;
          RENDER.roundRect(x, kx0 - w * 0.01, ky0 - h * 0.012, kx1 - kx0 + w * 0.02, ky1 - ky0 + h * 0.024, w * 0.008); x.fillStyle = R.shade(dev, -0.1); x.fill();
          const rows = 6, cols = 14, gw = (kx1 - kx0) / cols, gh = (ky1 - ky0) / rows;
          x.fillStyle = keyCol;
          for (let r = 0; r < rows; r++) {
            if (r === 5) { // bottom row with a space bar
              const widths = [1, 1, 1, 1.3, 5.4, 1.3, 1, 1, 1]; let xx = kx0; const tot = widths.reduce((a, b) => a + b, 0), unit = (kx1 - kx0) / tot;
              for (const wd of widths) { RENDER.roundRect(x, xx + gw * 0.08, ky0 + r * gh + gh * 0.1, wd * unit - gw * 0.16, gh * 0.8, gw * 0.12); x.fill(); xx += wd * unit; }
              continue;
            }
            const hh = r === 0 ? gh * 0.55 : gh * 0.8;
            for (let c = 0; c < cols; c++) { RENDER.roundRect(x, kx0 + c * gw + gw * 0.08, ky0 + r * gh + gh * 0.1, gw * 0.84, hh, gw * 0.12); x.fill(); }
          }
          RENDER.roundRect(x, w * 0.33, h * 0.6, w * 0.34, h * 0.33, w * 0.015); x.fillStyle = R.shade(dev, -0.05); x.fill(); x.strokeStyle = R.shade(dev, -0.2); x.lineWidth = Math.max(1, w / 600); x.stroke();
        },
      });
      const lid = [P[4], P[5], P[2], P[3]], Hl = R.H(lid), lidSil = R.rrUV(Hl, 0, 0, 1, 1, 9 / W, 9 / L);
      R.fill(lidSil, R.shade(dev, -0.05));
      R.fill(R.rrUV(Hl, 0.006, 0.009, 0.994, 0.995, 8 / W, 8 / L), '#0c0d10');
      const scr = R.sub(Hl, 9 / W, 11 / L, 1 - 9 / W, 1 - 17 / L);
      R.sheet(scr, { slot: 0, def: { def: 0, fit: 'cover' }, aspect: (W - 18) / (L - 28), shadow: false, paper: null, painter: screenPainter(false), lightMult: 0.25, glossMult: 1.05, glossBase: 0.04 });
      R.gloss(lidSil, 0.3);
      const cpt = R.map(Hl, 0.5, 5.5 / L), cr = Math.hypot(...v2(R.map(Hl, 0.5 + 1 / W, 5.5 / L), cpt));
      ctx.fillStyle = '#26282d'; ctx.beginPath(); ctx.arc(cpt[0], cpt[1], Math.max(0.4, cr), 0, Math.PI * 2); ctx.fill();
      void D;
    },
  };

  /* ================================================================== 7. square social post */
  const social = {
    id: 'social',
    opts: [{ key: 'format', type: 'select', choices: ['1:1', '4:5'], def: '1:1' }, { key: 'dark', type: 'bool', def: false }, { key: 'account', type: 'text', def: 'atelier.design', max: 30 }],
    slots: () => [{ label: 'slPost', def: 0 }],
    build(o, s) {
      const CH = 150 + (o.format === '4:5' ? 1350 : 1080) + 230;
      const cam = camera({ yaw: clamp(-14 + s.yaw, -70, 70), pitch: clamp(6 + s.pitch, -40, 50), dist: 4400 + CH, fov: 30, target: [0, 0, CH / 2] }), p = cam.proj;
      const pts = [p([-540, 0, CH]), p([540, 0, CH]), p([540, 0, 0]), p([-540, 0, 0])];
      return { pts, focus: pts, cam, CH, pad: 0.15 };
    },
    env: envBackdrop,
    draw(R) {
      const { P, B, o, s } = R, imgH = o.format === '4:5' ? 1350 : 1080;
      R.sheet(P, {
        slot: 0, def: { def: 0 }, aspect: 1080 / B.CH, radius: 36 / 1080, shadow: { dist: 2, blur: 1.5 }, normal: [0, -1, 0], lightMult: 0.6, glossMult: 0.35, key: [o.format, o.dark, o.account, s.accent].join(','),
        painter: (x, w, h, src) => {
          const f = w / 1080, bg = o.dark ? '#141519' : '#ffffff', ink = o.dark ? '#f1f1f3' : '#16171b', mute = o.dark ? '#33353d' : '#e7e7ec';
          RENDER.roundRect(x, 0, 0, w, h, 36 * f); x.clip(); x.fillStyle = bg; x.fillRect(0, 0, w, h);
          const ag = x.createLinearGradient(30 * f, 30 * f, 120 * f, 120 * f); ag.addColorStop(0, s.accent); ag.addColorStop(1, R.mix(s.accent, '#f6c453', 0.6));
          x.fillStyle = ag; x.beginPath(); x.arc(75 * f, 75 * f, 46 * f, 0, Math.PI * 2); x.fill();
          x.fillStyle = bg; x.beginPath(); x.arc(75 * f, 75 * f, 40 * f, 0, Math.PI * 2); x.fill();
          x.fillStyle = src.avg || src.color || s.accent; x.beginPath(); x.arc(75 * f, 75 * f, 35 * f, 0, Math.PI * 2); x.fill();
          x.fillStyle = ink; x.font = `650 ${34 * f}px ${FONT}`; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(o.account || '', 140 * f, 76 * f, 760 * f);
          for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(w - 110 * f + i * 22 * f, 75 * f, 5 * f, 0, Math.PI * 2); x.fill(); }
          if (src.kind === 'img') RENDER.drawFit(x, src.img, 0, 150 * f, w, imgH * f, src.fit, src.rot);
          else { x.fillStyle = src.kind === 'color' ? src.color : mute; x.fillRect(0, 150 * f, w, imgH * f); }
          const y0 = (150 + imgH + 62) * f, sz = 44 * f; x.strokeStyle = ink; x.lineWidth = 4.5 * f; x.lineJoin = 'round'; x.lineCap = 'round';
          let cx = 62 * f; // heart
          x.beginPath(); x.moveTo(cx, y0 + sz * 0.38); x.bezierCurveTo(cx - sz * 0.75, y0 - sz * 0.05, cx - sz * 0.3, y0 - sz * 0.62, cx, y0 - sz * 0.2); x.bezierCurveTo(cx + sz * 0.3, y0 - sz * 0.62, cx + sz * 0.75, y0 - sz * 0.05, cx, y0 + sz * 0.38); x.stroke();
          cx = 145 * f; x.beginPath(); x.arc(cx, y0, sz * 0.42, Math.PI * 0.75, Math.PI * 2.55); x.lineTo(cx - sz * 0.45, y0 + sz * 0.45); x.closePath(); x.stroke(); // bubble
          cx = 225 * f; x.beginPath(); x.moveTo(cx - sz * 0.45, y0 - sz * 0.1); x.lineTo(cx + sz * 0.48, y0 - sz * 0.45); x.lineTo(cx + sz * 0.1, y0 + sz * 0.45); x.lineTo(cx - sz * 0.05, y0 + sz * 0.02); x.closePath(); x.stroke(); // paper plane
          cx = w - 70 * f; x.beginPath(); x.moveTo(cx - sz * 0.3, y0 - sz * 0.45); x.lineTo(cx + sz * 0.3, y0 - sz * 0.45); x.lineTo(cx + sz * 0.3, y0 + sz * 0.45); x.lineTo(cx, y0 + sz * 0.2); x.lineTo(cx - sz * 0.3, y0 + sz * 0.45); x.closePath(); x.stroke(); // bookmark
          x.fillStyle = mute;
          for (const [yy, ww] of [[y0 + 62 * f, 280 * f], [y0 + 104 * f, w - 200 * f], [y0 + 140 * f, w * 0.5]]) { RENDER.roundRect(x, 40 * f, yy, ww, 20 * f, 10 * f); x.fill(); }
        },
      });
    },
  };

  /* ================================================================== 8. packaging box */
  const box = {
    id: 'box',
    opts: [
      { key: 'bw', type: 'range', min: 40, max: 320, step: 5, def: 150 },
      { key: 'bd', type: 'range', min: 20, max: 240, step: 5, def: 90 },
      { key: 'bh', type: 'range', min: 20, max: 340, step: 5, def: 210 },
      { key: 'finish', type: 'select', choices: ['matte', 'gloss', 'kraft'], def: 'matte' },
    ],
    slots: () => [{ label: 'slFront', def: 0 }, { label: 'slSide', def: 1, fallback: 'auto' }, { label: 'slTop', def: 2, fallback: 'auto' }],
    build(o, s) {
      const w = o.bw, d = o.bd, h = o.bh, M = Math.max(w, d, h);
      const cam = camera({ yaw: clamp(32 + s.yaw, 6, 84), pitch: clamp(20 + s.pitch, 3, 72), dist: M * 5.2, fov: 28, target: [0, 0, h / 2] }), p = cam.proj;
      const pts = [p([-w / 2, -d / 2, h]), p([w / 2, -d / 2, h]), p([w / 2, -d / 2, 0]), p([-w / 2, -d / 2, 0]), p([w / 2, d / 2, h]), p([w / 2, d / 2, 0]), p([-w / 2, d / 2, h])];
      return { pts, focus: pts, cam, M, pad: 0.26, quads: [[0, 1, 2, 3], [1, 4, 5, 2], [6, 4, 1, 0]] };
    },
    env(R) { envStudio(R, R.o.bd / 2 + R.B.M * 0.9, R.B.M * 3); },
    draw(R) {
      const { P, o, s, ctx } = R, kraft = o.finish === 'kraft', paper = kraft ? '#c39b69' : s.paper, gm = o.finish === 'gloss' ? 1.5 : kraft ? 0 : 0.35, tex = kraft ? Math.max(0.5, s.paperTex / 100) : s.paperTex / 100;
      R.shadow([R.hull(P)], { dist: 0.95, blur: 1 });
      const base = { shadow: false, paper, tex, glossMult: gm };
      R.sheet([P[0], P[1], P[2], P[3]], Object.assign({ slot: 0, def: { def: 0 }, aspect: o.bw / o.bh, normal: [0, -1, 0] }, base));
      R.sheet([P[1], P[4], P[5], P[2]], Object.assign({ slot: 1, def: { def: 1, fallback: 'auto' }, aspect: o.bd / o.bh, normal: [1, 0, 0] }, base));
      R.sheet([P[6], P[4], P[1], P[0]], Object.assign({ slot: 2, def: { def: 2, fallback: 'auto' }, aspect: o.bw / o.bd, normal: [0, 0, 1] }, base));
      ctx.lineWidth = 0.8; ctx.lineCap = 'round'; ctx.strokeStyle = `rgba(255,255,255,${0.35 * R.lk})`;
      for (const [a, b] of [[0, 1], [1, 4], [1, 2]]) { ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); }
    },
  };

  /* ================================================================== 9. tote bag */
  const TB = { W: 380, H: 410, top: 720 };
  const tote = {
    id: 'tote',
    opts: [{ key: 'fabric', type: 'color', def: '#e9dfcb' }, { key: 'print', type: 'range', min: 30, max: 90, step: 1, def: 62 }],
    slots: () => [{ label: 'slPrint', def: 0, fit: 'contain' }],
    build(o, s) {
      const { W, H, top } = TB;
      const cam = camera({ yaw: clamp(-12 + s.yaw, -65, 65), pitch: clamp(3 + s.pitch, -35, 45), dist: 2700, fov: 28, target: [0, 0, top - 120] }), p = cam.proj;
      const pts = [p([-W / 2, 0, top]), p([W / 2, 0, top]), p([W / 2, 0, top - H]), p([-W / 2, 0, top - H])];
      return { pts, focus: pts.concat([p([-W / 2, 0, top + 330]), p([W / 2, 0, top + 330])]), cam, pad: 0.12 };
    },
    env: envWall,
    draw(R) {
      const { P, o, s, ctx } = R, { W, H } = TB, Hm = R.H(P), fab = o.fabric;
      const strap = (u0, du, dv) => { // strap ribbon from the bag's top edge up to the peg, as a polygon in perspective
        const P0 = [u0 + du, 0.07], C = [u0 + (u0 < 0.5 ? 0.0 : 0.0) + du, -0.62 + dv], P1 = [0.5 + du, -0.75 + dv], L = [], Rr = [], wd = 13;
        for (let i = 0; i <= 20; i++) {
          const t = i / 20, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
          const pu = a * P0[0] + b * C[0] + c * P1[0], pv = a * P0[1] + b * C[1] + c * P1[1];
          const tu = 2 * (1 - t) * (C[0] - P0[0]) + 2 * t * (P1[0] - C[0]), tv = 2 * (1 - t) * (C[1] - P0[1]) + 2 * t * (P1[1] - C[1]);
          const tx = tu * W, ty = tv * H, l = Math.hypot(tx, ty) || 1, nx = -ty / l * wd, ny = tx / l * wd;
          L.push([pu + nx / W, pv + ny / H]); Rr.push([pu - nx / W, pv - ny / H]);
        }
        return R.uv(Hm, L.concat(Rr.reverse()));
      };
      const sL = strap(0.25, 0, 0), sR = strap(0.75, 0, 0), bL = strap(0.27, 0.025, -0.01), bR = strap(0.73, 0.025, -0.01);
      R.shadow([P, sL, sR], { dist: 0.9, blur: 0.8 });
      const peg = R.map(Hm, 0.5, -0.75), pr = Math.hypot(...v2(R.map(Hm, 0.535, -0.75), peg));
      R.fill(bL, R.shade(fab, -0.3)); R.fill(bR, R.shade(fab, -0.3));
      ctx.fillStyle = '#8a6a48'; ctx.beginPath(); ctx.arc(peg[0], peg[1], pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(peg[0] + R.lx * pr * 0.35, peg[1] + R.ly * pr * 0.35, pr * 0.45, 0, Math.PI * 2); ctx.fill();
      R.sheet(P, {
        slot: 0, def: { def: 0, fit: 'contain' }, aspect: W / H, shadow: false, glossMult: 0, lightMult: 0.9, key: fab + o.print + s.ink,
        painter: (x, w, h, src) => {
          const pw = o.print / 100 * w, ph = Math.min(pw, h * 0.72);
          R.paintPrint(x, w, h, src, { paper: fab, ink: true, tex: 0.45 + s.paperTex / 250, fabric: true, rect: [(w - pw) / 2, h * 0.55 - ph / 2, pw, ph] });
          const rnd = TEX.rng(77); x.globalCompositeOperation = 'multiply';
          for (let i = 0; i < 7; i++) {
            const cx = rnd() * w, bw = w * (0.04 + rnd() * 0.08), g = x.createLinearGradient(cx - bw, 0, cx + bw, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(120,110,95,${0.08 + rnd() * 0.1})`); g.addColorStop(1, 'rgba(255,255,255,0)');
            x.fillStyle = g; x.fillRect(cx - bw, 0, bw * 2, h);
          }
          x.fillStyle = 'rgba(110,100,85,.16)'; x.fillRect(0, 0, w, h * 0.075);
          x.globalCompositeOperation = 'source-over'; x.strokeStyle = 'rgba(80,70,60,.35)'; x.lineWidth = Math.max(1, w / 500); x.setLineDash([w / 90, w / 140]);
          x.beginPath(); x.moveTo(0, h * 0.068); x.lineTo(w, h * 0.068); x.stroke(); x.setLineDash([]);
          const bg = x.createLinearGradient(0, h * 0.8, 0, h); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(40,30,20,.14)'); x.fillStyle = bg; x.fillRect(0, h * 0.8, w, h * 0.2);
        },
      });
      for (const sp of [sL, sR]) {
        R.fill(sp, fab); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5; R.fill(sp, ctx.createPattern(TEX.weave(), 'repeat')); ctx.restore(); R.lightFlat(sp, 0.8);
      }
      ctx.strokeStyle = 'rgba(70,60,50,.4)'; ctx.lineWidth = 0.6;
      for (const u of [0.25, 0.75]) { const q = R.sub(Hm, u - 0.03, 0.012, u + 0.03, 0.06); R.path(q); ctx.stroke(); ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.moveTo(q[1][0], q[1][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.stroke(); }
    },
  };

  /* ================================================================== 10. billboard / signage */
  const BB = { '4:3': { w: 4000, h: 3000, zb: 3900 }, '3:1': { w: 6000, h: 2000, zb: 4300 }, mupi: { w: 1200, h: 1760, zb: 650 } };
  const SKY = {
    day: { top: '#5b9be0', hor: '#d8ebfa', ground: '#8e9a6c', hill: '#9fb0a3' },
    dusk: { top: '#2d3b78', hor: '#f4a46b', ground: '#5e4f52', hill: '#7d5d6d' },
    night: { top: '#070b1f', hor: '#26305a', ground: '#161a28', hill: '#1d2440' },
  };
  const billboard = {
    id: 'billboard',
    opts: [{ key: 'ratio', type: 'select', choices: ['4:3', '3:1', 'mupi'], def: '4:3' }, { key: 'time', type: 'select', choices: ['day', 'dusk', 'night'], def: 'day' }, { key: 'lamps', type: 'bool', def: true }],
    slots: () => [{ label: 'slPanel', def: 0 }],
    build(o, s) {
      const D = BB[o.ratio] || BB['4:3'], mupi = o.ratio === 'mupi';
      const cam = camera({ yaw: clamp(-22 + s.yaw, -70, 70), pitch: clamp((mupi ? -2 : -10) + s.pitch, -40, 35), dist: mupi ? 6400 : 19000, fov: 32, target: [0, 0, D.zb + D.h / 2] }), p = cam.proj;
      const pts = [p([-D.w / 2, 0, D.zb + D.h]), p([D.w / 2, 0, D.zb + D.h]), p([D.w / 2, 0, D.zb]), p([-D.w / 2, 0, D.zb])];
      return { pts, focus: pts.concat([p([-D.w * 0.6, 0, 0]), p([D.w * 0.6, 0, 0]), p([0, 0, D.zb + D.h * 1.18])]), cam, D, pad: 0.07 };
    },
    env(R) {
      const { ctx, view, B, o, lx } = R, cam = B.cam, C = SKY[o.time] || SKY.day;
      const fh = norm([cam.f[0], cam.f[1], 0]), far = 2e5, pos = cam.pos;
      const hA = cam.proj([pos[0] + fh[0] * far - fh[1] * far * 0.5, pos[1] + fh[1] * far + fh[0] * far * 0.5, 0]);
      const hB = cam.proj([pos[0] + fh[0] * far + fh[1] * far * 0.5, pos[1] + fh[1] * far - fh[0] * far * 0.5, 0]);
      const inside = cam.proj([pos[0] + fh[0] * 25000, pos[1] + fh[1] * 25000, 0]), hy = (hA[1] + hB[1]) / 2;
      const g = ctx.createLinearGradient(0, view.y0, 0, Math.max(view.y0 + 1, hy)); g.addColorStop(0, C.top); g.addColorStop(1, C.hor); R.fill(view.poly, g);
      const rnd = TEX.rng(99);
      if (o.time === 'night') { ctx.fillStyle = '#fff'; for (let i = 0; i < 160; i++) { const x = view.x0 + rnd() * view.w, y = view.y0 + rnd() * (hy - view.y0); ctx.globalAlpha = 0.25 + rnd() * 0.6; ctx.fillRect(x, y, 0.9 + rnd(), 0.9 + rnd()); } ctx.globalAlpha = 1; }
      const sx = (view.x0 + view.x1) / 2 + lx * view.w * 0.36, sy = o.time === 'day' ? view.y0 + view.h * 0.12 : hy - view.h * 0.1;
      const sunR = view.h * (o.time === 'dusk' ? 0.05 : 0.035), glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunR * 9);
      const sunCol = o.time === 'night' ? '#e8ecff' : o.time === 'dusk' ? '#ffcf8a' : '#fffbea';
      glow.addColorStop(0, R.rgba(sunCol, o.time === 'night' ? 0.28 : 0.55)); glow.addColorStop(1, R.rgba(sunCol, 0)); R.fill(view.poly, glow);
      if (o.time === 'night') { // crescent moon: a disc minus an offset disc, cut on its own small canvas so the sky shows through
        const m = Math.ceil(sunR * 2 + 4), mc = R.mk ? R.mk(m, m) : Object.assign(document.createElement('canvas'), { width: m, height: m }), mx = mc.getContext('2d');
        mx.fillStyle = sunCol; mx.beginPath(); mx.arc(m / 2, m / 2, sunR, 0, Math.PI * 2); mx.fill();
        mx.globalCompositeOperation = 'destination-out'; mx.beginPath(); mx.arc(m / 2 + sunR * 0.45, m / 2 - sunR * 0.2, sunR * 0.85, 0, Math.PI * 2); mx.fill();
        ctx.drawImage(mc, sx - m / 2, sy - m / 2);
      } else { ctx.fillStyle = sunCol; ctx.beginPath(); ctx.arc(sx, sy, sunR, 0, Math.PI * 2); ctx.fill(); }
      [[0.055, 0.6], [0.03, 0.85]].forEach(([amp, t], li) => { // distant hills, two layers
        const pts = [], n = 60;
        for (let i = 0; i <= n; i++) { const x = view.x0 + (i / n) * view.w, y = hy - view.h * amp * (0.45 + 0.35 * Math.sin(i * 0.37 + li * 2) + 0.2 * Math.sin(i * 1.13 + li)); pts.push([x, y]); }
        pts.push([view.x1, hy + 2], [view.x0, hy + 2]); R.fill(pts, R.mix(C.hor, C.hill, t));
      });
      const ground = R.halfPlane(hA, hB, inside);
      if (ground.length > 2) {
        R.fill(ground, R.pattern('concrete', C.ground, 1.6));
        const gg = ctx.createLinearGradient(0, hy, 0, view.y1); gg.addColorStop(0, R.rgba(C.hor, 0.35)); gg.addColorStop(0.25, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,.2)'); R.fill(ground, gg);
      }
    },
    draw(R) {
      const { P, B, o, ctx } = R, { w, h, zb } = B.D, Hm = R.H(P), mupi = o.ratio === 'mupi', fw = mupi ? 90 : 140, night = o.time === 'night';
      const outer = R.sub(Hm, -fw / w, -fw / h, 1 + fw / w, 1 + fw / h), steel = night ? '#1b1d24' : '#3a3e46';
      const vg = 1 + zb / h;
      const pole = mupi ? R.sub(Hm, 0.36, 1 + fw / h, 0.64, vg) : R.sub(Hm, 0.5 - 230 / w, 1 + fw / h, 0.5 + 230 / w, vg);
      R.shadow([outer, pole], { dist: 1.1, blur: 1.2, alpha: o.time === 'day' ? 0.7 : 0.35 });
      R.fill(pole, steel); R.fill(R.sub(Hm, mupi ? 0.36 : 0.5 - 230 / w, 1 + fw / h, mupi ? 0.42 : 0.5 - 120 / w, vg), 'rgba(255,255,255,.08)');
      if (mupi) R.fill(R.sub(Hm, 0.28, vg - 60 / h, 0.72, vg), R.shade(steel, -0.2));
      if (!mupi) { R.fill(R.sub(Hm, -0.015, 1 + fw / h, 1.015, 1 + (fw + 70) / h), R.shade(steel, -0.15)); }
      const lamps = !mupi && o.lamps ? [0.17, 0.5, 0.83] : [];
      ctx.strokeStyle = steel; ctx.lineWidth = Math.max(0.6, Math.hypot(...v2(R.map(Hm, 0.5 + 60 / w, 0), R.map(Hm, 0.5, 0))));
      for (const u of lamps) { const a = R.map(Hm, u, -fw / h), b = R.map(Hm, u, -(fw + 420) / h); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); R.fill(R.sub(Hm, u - 150 / w, -(fw + 470) / h, u + 150 / w, -(fw + 380) / h), R.shade(steel, -0.2)); }
      R.fill(outer, steel); R.fill(R.sub(Hm, -fw / w, -fw / h, 1 + fw / w, -fw / h + 30 / h), 'rgba(255,255,255,.12)');
      R.sheet(P, { slot: 0, def: { def: 0 }, aspect: w / h, shadow: false, glossMult: mupi ? 0.9 : 0.25, tex: 0.12, lightMult: night ? 0 : 0.8 });
      ctx.save(); R.path(P); ctx.clip();
      if (o.time === 'dusk') { ctx.globalCompositeOperation = 'multiply'; R.fill(P, 'rgba(255,200,160,.45)'); }
      if (night && !mupi) {
        ctx.globalCompositeOperation = 'multiply'; R.fill(P, 'rgba(40,48,92,.8)'); ctx.globalCompositeOperation = 'screen';
        const ph = Math.hypot(...v2(R.map(Hm, 0.5, 1), R.map(Hm, 0.5, 0)));
        for (const u of lamps) { const c = R.map(Hm, u, 0.02), g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], ph * 0.85); g.addColorStop(0, 'rgba(255,226,170,.7)'); g.addColorStop(1, 'rgba(255,226,170,0)'); R.fill(P, g); }
      }
      if (night && mupi) { ctx.globalCompositeOperation = 'screen'; R.fill(P, 'rgba(255,255,255,.08)'); }
      ctx.restore();
      for (const u of lamps) if (night) { const c = R.map(Hm, u, -(fw + 380) / h), g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 16); g.addColorStop(0, 'rgba(255,240,200,.95)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], 16, 0, Math.PI * 2); ctx.fill(); }
    },
  };

  /* ================================================================== 11. free perspective (optionally on your own photo) */
  const libre = {
    id: 'libre',
    noCam: true,
    opts: [{ key: 'paper', type: 'bool', def: false }, { key: 'shadowOn', type: 'bool', def: true }],
    slots: () => [{ label: 'slDesign', def: 0, fit: 'contain' }],
    build() { return { pts: [[385, 170], [835, 215], [815, 705], [405, 735]], focus: [[0, 0], [1200, 900]], pad: 0 }; },
    env(R) {
      const ph = R.job.bgPhoto;
      if (!ph) return envBackdrop(R);
      const v = R.view, sc = Math.max(v.w / ph.width, v.h / ph.height);
      R.ctx.drawImage(ph, (v.x0 + v.x1) / 2 - ph.width * sc / 2, (v.y0 + v.y1) / 2 - ph.height * sc / 2, ph.width * sc, ph.height * sc);
    },
    draw(R) {
      const { P, o, s, ctx } = R, d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const asp = clamp((d(P[0], P[1]) + d(P[3], P[2])) / Math.max(1, d(P[0], P[3]) + d(P[1], P[2])), 0.1, 10);
      ctx.save();
      if (s.ink && !o.paper) ctx.globalCompositeOperation = 'multiply';
      R.sheet(P, { slot: 0, def: { def: 0, fit: 'contain' }, aspect: Math.round(asp * 50) / 50, paper: o.paper ? s.paper : null, shadow: o.shadowOn && o.paper ? { dist: 0.5, blur: 0.6 } : false, glossMult: 0.5, lightMult: 0.6, tex: o.paper ? s.paperTex / 100 : s.paperTex / 250 });
      ctx.restore();
    },
  };

  const list = [poster, cards, flyer, book, phone, laptop, social, box, tote, billboard, libre];
  const byId = {}; for (const sc of list) byId[sc.id] = sc;
  /** Default scene options (key → value). */
  function defaults(id) { const o = {}; for (const op of byId[id].opts) o[op.key] = op.def; return o; }
  /** Validated scene options. */
  function normOpts(id, src) {
    const o = {}, s = src || {};
    for (const op of byId[id].opts) {
      let v = s[op.key];
      if (op.type === 'select') o[op.key] = op.choices.includes(v) ? v : op.def;
      else if (op.type === 'bool') o[op.key] = v === true || v === '1' || v === 1 || v === 'true' ? true : v === false || v === '0' || v === 0 || v === 'false' ? false : op.def;
      else if (op.type === 'range') { v = Number(v); o[op.key] = Number.isFinite(v) ? clamp(Math.round(v / op.step) * op.step, op.min, op.max) : op.def; }
      else if (op.type === 'color') o[op.key] = /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : op.def;
      else if (op.type === 'text') o[op.key] = typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, op.max || 40) : op.def;
    }
    return o;
  }
  return { list, byId, defaults, normOpts, camera, planeRect };
});
