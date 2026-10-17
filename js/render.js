/* render.js — Maquette Atelier: the rendering pipeline shared by every scene.
 *  1. framing: the scene's focus box is fitted into the output canvas (any aspect ratio, zoom);
 *  2. background: the scene's procedural environment, a solid colour, a gradient, or nothing (transparent);
 *  3. objects: each scene draws its objects with the helpers below (soft shadows, perspective faces, lighting,
 *     gloss, paper texture, multiply "ink" printing);
 *  4. finishing: decorative light & shadow (leaves, blinds), vignette and film grain.
 * Faces (a design fitted on paper, a screen, a keyboard…) are painted flat, cached per slot, then warped
 * through a homography by WARP (WebGL2 or the triangle fallback). Original code, MIT licence. */
(function (root, factory) { root.RENDER = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexRgb = (h) => TEX.hexRgb(h);
  const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
  /** Mixes two hex colours (t = 0 → a, 1 → b). */
  function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  const shade = (h, t) => (t < 0 ? mix(h, '#000000', -t) : mix(h, '#ffffff', t));
  const lum = (h) => { const [r, g, b] = hexRgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function bbox(pts) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
  const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };

  /* ------------------------------------------------------------------ faces (flat textures), cached per channel */
  const channels = new Map();
  /** Returns a canvas painted by paint(ctx, w, h) — repainted only when `key` or the size changes. */
  function face(channel, key, w, h, paint) {
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
    let ch = channels.get(channel);
    if (!ch) { ch = { key: null, c: mk(w, h) }; channels.set(channel, ch); }
    const full = key + '|' + w + 'x' + h;
    if (ch.key !== full) {
      if (ch.c.width !== w || ch.c.height !== h) { ch.c.width = w; ch.c.height = h; }
      const x = ch.c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, h);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      paint(x, w, h);
      ch.key = full; ch.c._v = (ch.c._v || 0) + 1;
    }
    return ch.c;
  }
  function dropChannels(prefix) { for (const k of [...channels.keys()]) if (k.startsWith(prefix)) channels.delete(k); }

  /** Draws img into the box (x, y, w, h) with fit = cover | contain | stretch and a rotation of 0/90/180/270°. */
  function drawFit(x, img, bx, by, bw, bh, fit, rot) {
    rot = ((rot || 0) % 360 + 360) % 360;
    x.save(); x.beginPath(); x.rect(bx, by, bw, bh); x.clip();
    x.translate(bx + bw / 2, by + bh / 2); x.rotate(rot * D2R);
    const W = rot % 180 ? bh : bw, H = rot % 180 ? bw : bh, iw = img.width, ih = img.height;
    let dw = W, dh = H;
    if (fit !== 'stretch') { const s = fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih); dw = iw * s; dh = ih * s; }
    x.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    x.restore();
  }
  function roundRect(x, X, Y, W, H, r) {
    r = Math.max(0, Math.min(r, W / 2, H / 2)); x.beginPath();
    if (x.roundRect) x.roundRect(X, Y, W, H, r);
    else { x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  }
  /** Standard printed face: paper colour, design (multiplied = inked), paper fibres, optional rounded corners. */
  function paintPrint(x, w, h, src, o) {
    o = o || {};
    const rect = o.rect || [0, 0, w, h];
    if (o.radius) { roundRect(x, 0, 0, w, h, o.radius); x.clip(); }
    if (o.paper) { x.fillStyle = o.paper; x.fillRect(0, 0, w, h); }
    if (src.kind === 'img') {
      x.globalCompositeOperation = o.paper && o.ink ? 'multiply' : 'source-over';
      drawFit(x, src.img, rect[0], rect[1], rect[2], rect[3], src.fit, src.rot);
      x.globalCompositeOperation = 'source-over';
    } else if (src.kind === 'color') { x.fillStyle = src.color; x.fillRect(rect[0], rect[1], rect[2], rect[3]); }
    if (o.tex > 0 && (o.paper || src.kind !== 'none')) {
      const tile = o.fabric ? TEX.weave() : TEX.paper(), p = x.createPattern(tile, 'repeat'), sc = Math.max(0.5, Math.max(w, h) / (o.fabric ? 900 : 1400));
      p.setTransform(new DOMMatrix([sc, 0, 0, sc, 0, 0]));
      x.globalCompositeOperation = 'multiply'; x.globalAlpha = clamp(o.tex, 0, 1); x.fillStyle = p;
      if (!o.paper) x.globalCompositeOperation = 'source-atop';
      x.fillRect(0, 0, w, h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
  }

  /* ------------------------------------------------------------------ main render */
  /**
   * job = { s: settings, o: scene options, pts: points override or null, slots: slot settings, designs, bgPhoto,
   *         transparent, channel: 'p' | 'x', handles: bool } → returns geometry for interaction.
   */
  function render(ctx, W, H, job) {
    const sc = SCENES.byId[job.s.scene] || SCENES.list[0];
    const s = job.s, o = job.o;
    const built = sc.build(o, s);
    const P = job.pts && job.pts.length === built.pts.length ? job.pts : built.pts;
    // framing: fit the (default) focus box, so free-perspective dragging never moves the camera
    const fb = bbox(built.focus), pad = built.pad != null ? built.pad : 0.08;
    const fw = fb.w * (1 + pad * 2), fh = fb.h * (1 + pad * 2);
    const k = Math.min(W / fw, H / fh) * (s.zoom / 100);
    const ox = W / 2 - fb.cx * k, oy = H / 2 - fb.cy * k;
    const view = { x0: -ox / k, y0: -oy / k, x1: (W - ox) / k, y1: (H - oy) / k };
    view.w = view.x1 - view.x0; view.h = view.y1 - view.y0; view.poly = [[view.x0, view.y0], [view.x1, view.y0], [view.x1, view.y1], [view.x0, view.y1]];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(k, 0, 0, k, ox, oy);
    const R = helpers(ctx, { W, H, k, ox, oy, view, s, o, P, B: built, job, sc });
    const transparent = job.transparent || s.bgMode === 'none';
    if (!transparent) {
      if (s.bgMode === 'scene') sc.env(R);
      else if (s.bgMode === 'gradient') {
        const a = s.bgAngle * D2R, cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2, r = Math.hypot(view.w, view.h) / 2;
        const g = ctx.createLinearGradient(cx - Math.sin(a) * r, cy + Math.cos(a) * r, cx + Math.sin(a) * r, cy - Math.cos(a) * r);
        g.addColorStop(0, s.bg2); g.addColorStop(1, s.bg1); R.fill(view.poly, g);
      } else R.fill(view.poly, s.bg1);
    }
    R.transparent = transparent;
    sc.draw(R);
    finishing(R);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return { k, ox, oy, P, built, backend: R.backend };
  }

  /* ------------------------------------------------------------------ finishing: decorative light, vignette, grain */
  const decoCache = { key: null, c: null };
  function finishing(R) {
    const { ctx, s, k, view } = R, W = ctx.canvas.width, H = ctx.canvas.height; // (R.H is the homography helper)
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (s.deco !== 'none' && s.decoK > 0) {
      const key = [s.deco, W, H, k.toFixed(4), R.ox.toFixed(1), R.oy.toFixed(1), s.light, s.soft, s.scene].join('|');
      if (decoCache.key !== key) { decoCache.c = decoLayer(R); decoCache.key = key; }
      ctx.globalCompositeOperation = R.transparent ? 'source-atop' : 'multiply'; ctx.globalAlpha = s.decoK / 100 * 0.62;
      ctx.drawImage(decoCache.c, 0, 0);
    }
    if (s.vignette > 0) {
      const cx = W / 2, cy = H / 2, d = Math.hypot(W, H) / 2, g = ctx.createRadialGradient(cx, cy, d * 0.35, cx, cy, d * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(12,8,4,${s.vignette / 100 * 0.6})`);
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (s.grain > 0) {
      const p = ctx.createPattern(TEX.grain(), 'repeat'), gs = Math.max(1, W / 1600);
      p.setTransform(new DOMMatrix([gs, 0, 0, gs, 0, 0]));
      ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = s.grain / 100 * 0.38; ctx.fillStyle = p; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    void view;
  }
  /** Soft decorative shadows (window light through leaves or blinds), blurred with the shadow trick. */
  function decoLayer(R) {
    const { k, ox, oy, s, view } = R, W = R.ctx.canvas.width, H = R.ctx.canvas.height, c = mk(W, H), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    const off = W + H + 400, blur = (6 + s.soft / 100 * 26) * k;
    x.shadowColor = 'rgb(58,62,92)'; x.shadowBlur = blur; x.shadowOffsetX = off; x.shadowOffsetY = 0;
    x.setTransform(k, 0, 0, k, ox - off, oy);
    x.fillStyle = '#000';
    const r = TEX.rng(1234 + s.scene.length * 17), a = s.light * D2R, lx = Math.sin(a), ly = -Math.cos(a);
    const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2, D = Math.hypot(view.w, view.h);
    if (s.deco === 'blinds') {
      const ang = Math.atan2(ly, lx) + Math.PI / 2 + 0.35, per = D / 11;
      x.save(); x.translate(cx, cy); x.rotate(ang);
      for (let i = -9; i <= 9; i++) x.fillRect(-D, i * per, D * 2, per * 0.42);
      x.restore();
    } else { // leaves: a few branches entering from the light side
      for (let b = 0; b < 4; b++) {
        let px = cx + lx * D * 0.55 + (r() - 0.5) * D * 0.5, py = cy + ly * D * 0.55 + (r() - 0.5) * D * 0.5;
        let dir = Math.atan2(-ly, -lx) + (r() - 0.5) * 1.2;
        for (let i = 0; i < 16; i++) {
          const step = D * (0.03 + r() * 0.02); px += Math.cos(dir) * step; py += Math.sin(dir) * step; dir += (r() - 0.5) * 0.5;
          x.lineWidth = D * 0.004; x.strokeStyle = '#000'; x.beginPath(); x.moveTo(px, py); x.lineTo(px - Math.cos(dir) * step, py - Math.sin(dir) * step); x.stroke();
          for (const side of [-1, 1]) {
            const la = dir + side * (0.7 + r() * 0.5), len = D * (0.035 + r() * 0.035), wid = len * (0.32 + r() * 0.12);
            x.save(); x.translate(px + Math.cos(la) * len * 0.55, py + Math.sin(la) * len * 0.55); x.rotate(la);
            x.beginPath(); x.ellipse(0, 0, len * 0.55, wid, 0, 0, Math.PI * 2); x.fill(); x.restore();
          }
        }
      }
    }
    return c;
  }

  /* ------------------------------------------------------------------ helpers handed to the scenes */
  function helpers(ctx, G) {
    const { k, ox, oy, s, job } = G;
    const a = s.light * D2R, lx = Math.sin(a), ly = -Math.cos(a), lk = s.lightK / 100;
    const R = Object.assign({}, G, { ctx, lx, ly, lk, backend: 'none', mix, shade, rgba, lum, bbox, centroid, D2R });
    // 3D light vector in world space (for faces with a known normal), built from the camera basis
    const cam = G.B.cam;
    if (cam) {
      const v = [0, 1, 2].map((i) => cam.r[i] * lx * 0.95 + cam.u[i] * -ly * 0.95 - cam.f[i] * 0.6), n = Math.hypot(...v);
      R.L3 = v.map((q) => q / n);
    } else R.L3 = [lx, 0, -ly];
    R.dev = (p) => [p[0] * k + ox, p[1] * k + oy];
    R.path = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
    R.fill = (pts, style) => { ctx.fillStyle = style; R.path(pts); ctx.fill(); };
    R.H = (q) => WARP.squareToQuad(q);
    R.map = (Hm, u, v) => WARP.apply(Hm, u, v);
    R.uv = (Hm, uvPts) => WARP.mapPts(Hm, uvPts);
    R.sub = (Hm, u0, v0, u1, v1) => WARP.subQuad(Hm, u0, v0, u1, v1);
    R.rrUV = (Hm, u0, v0, u1, v1, ru, rv) => WARP.mapPts(Hm, WARP.roundRectUV(u0, v0, u1, v1, ru, rv));
    R.hull = (pts) => WARP.hull(pts);
    R.add = (p, t) => [p[0] + t[0], p[1] + t[1]];
    /** Surface material pattern in core units (tile pixel = sc core units). */
    R.pattern = (type, hex, sc = 0.8) => { const p = ctx.createPattern(TEX.material(type, hex), 'repeat'); p.setTransform(new DOMMatrix([sc, 0, 0, sc, 0, 0])); return p; };
    /** Clip the view to a half-plane through p→q (extended), keeping the side of `inside`. */
    R.halfPlane = (p, q, inside, poly) => {
      const side = (pt) => (q[0] - p[0]) * (pt[1] - p[1]) - (q[1] - p[1]) * (pt[0] - p[0]);
      const sIn = Math.sign(side(inside)) || 1, src = poly || G.view.poly, out = [];
      for (let i = 0; i < src.length; i++) {
        const A = src[i], B = src[(i + 1) % src.length], sa = side(A) * sIn, sb = side(B) * sIn;
        if (sa >= 0) out.push(A);
        if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
      }
      return out;
    };
    /** Soft cast shadow of one or more polygons: a contact shadow plus a larger, softer one away from the light. */
    R.shadow = (polys, opt = {}) => {
      const sk = s.shadow / 100 * (opt.alpha == null ? 1 : opt.alpha);
      if (sk <= 0) return;
      const soft = 0.35 + s.soft / 100 * 1.5, dist = opt.dist == null ? 1 : opt.dist, off = 30000;
      const pass = (blur, d, alpha) => {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath();
        for (const poly of polys) poly.forEach((p, i) => { const q = R.dev(p); (i ? ctx.lineTo : ctx.moveTo).call(ctx, q[0] - off, q[1]); });
        ctx.shadowColor = `rgba(24,16,8,${clamp(alpha, 0, 1)})`; ctx.shadowBlur = blur * k; ctx.shadowOffsetX = off - lx * d * k; ctx.shadowOffsetY = -ly * d * k;
        ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
      };
      if (opt.contact !== false) pass(2.5 * soft, 1.5 * dist, 0.5 * sk);
      pass(16 * soft * (opt.blur || 1), 13 * dist, 0.42 * sk);
    };
    /** Resolves slot i's image source: { kind: img | color | none, img, color, fit, rot }. */
    R.source = (i, def) => {
      const slot = (job.slots && job.slots[i]) || {}, D = job.designs || [], d0 = D[0];
      const fit = slot.fit || def.fit || 'cover', rot = slot.rot || 0;
      let src = slot.src || 'def';
      // 'def': design n°def if it exists, else the scene's fallback (secondary faces such as a spine or a box side use the
      // dominant colour when they have no design of their own — and always while only the demo designs are loaded)
      if (src === 'def') { const n = def.def || 0, own = D[n] && !(D[n].demo && def.fallback === 'auto'); src = own ? 'd' + n : def.fallback === 'auto' && n > 0 ? 'auto' : 'd0'; }
      if (src === 'none') return { kind: 'none', fit, rot, id: 'none' };
      if (src === 'auto') { const c = d0 ? d0.avg : s.accent; return { kind: 'color', color: c, fit, rot, id: 'auto' + c }; }
      const d = D[+src.slice(1)] || d0;
      if (!d) return { kind: 'color', color: s.accent, fit, rot, id: 'acc' + s.accent };
      return { kind: 'img', img: d.canvas, fit, rot, id: 'd' + d.id, avg: d.avg };
    };
    /** Texture size for a face covering quad q (device pixels, bucketed so small drags don't repaint). */
    R.faceSize = (q, mult = 1) => {
      let m = 0; for (let i = 0; i < 4; i++) { const A = q[i], B = q[(i + 1) % 4]; m = Math.max(m, Math.hypot(A[0] - B[0], A[1] - B[1])); }
      const px = m * k * mult * 1.1, b = px < 512 ? 128 : 256;
      return clamp(Math.ceil(px / b) * b, 128, Math.min(4096, WARP.maxTexture()));
    };
    R.faceDims = (aspect, size) => (aspect >= 1 ? [size, size / aspect] : [size * aspect, size]);
    R.face = (name, key, w, h, paint) => face(job.channel + ':' + s.scene + ':' + name, key, w, h, paint);
    R.paintPrint = paintPrint; R.drawFit = drawFit; R.roundRect = roundRect;
    /** Warp a face canvas onto a core-space quad. */
    R.warp = (canvas, q, alpha) => { R.backend = WARP.draw(ctx, canvas, q.map(R.dev), alpha); };
    /** Flat lighting: a gradient across the object, brighter towards the light. */
    R.lightFlat = (sil, mult = 1) => {
      const kk = lk * mult; if (kk <= 0) return;
      const c = centroid(sil); let rr = 0; for (const p of sil) rr = Math.max(rr, Math.hypot(p[0] - c[0], p[1] - c[1]));
      const g = ctx.createLinearGradient(c[0] + lx * rr, c[1] + ly * rr, c[0] - lx * rr, c[1] - ly * rr);
      g.addColorStop(0, `rgba(255,252,245,${0.2 * kk})`); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(20,14,8,${0.26 * kk})`);
      ctx.save(); R.path(sil); ctx.clip(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    };
    /** Face shading from its world normal and the light direction. */
    R.shade3D = (sil, n, mult = 1) => {
      const L = R.L3, d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2], kk = lk * mult;
      ctx.save(); R.path(sil); ctx.clip();
      const dark = clamp((0.92 - d) * 0.5, 0, 0.75) * kk;
      if (dark > 0) { ctx.fillStyle = `rgba(18,12,6,${dark})`; ctx.fill(); }
      if (d > 0.72) { ctx.fillStyle = `rgba(255,250,240,${(d - 0.72) * 0.5 * kk})`; ctx.fill(); }
      ctx.restore();
      R.lightFlat(sil, mult * 0.45);
    };
    /** Specular band (gloss / glass reflection). */
    R.gloss = (sil, mult = 1, base = 0) => {
      const gk = clamp(s.gloss / 100 * mult + base, 0, 1.4); if (gk <= 0) return;
      const c = centroid(sil); let rr = 0; for (const p of sil) rr = Math.max(rr, Math.hypot(p[0] - c[0], p[1] - c[1]));
      const ang = Math.atan2(ly, lx) + 0.75, dx = Math.cos(ang), dy = Math.sin(ang);
      const g = ctx.createLinearGradient(c[0] - dx * rr, c[1] - dy * rr, c[0] + dx * rr, c[1] + dy * rr);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,0)');
      g.addColorStop(0.4, `rgba(255,255,255,${0.32 * gk})`); g.addColorStop(0.47, `rgba(255,255,255,${0.1 * gk})`);
      g.addColorStop(0.56, `rgba(255,255,255,${0.16 * gk})`); g.addColorStop(0.66, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); R.path(sil); ctx.clip(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fill(); ctx.restore();
    };
    /**
     * A printed sheet / card / cover on quad q (TL, TR, BR, BL):
     * opt = { slot, def, aspect, radius (fraction of short side), thick ([dx,dy] edge vector), edge (colour),
     *         shadow ({dist, blur, alpha} | false), paper (colour | null), ink, tex, fabric, normal, glossMult,
     *         lightMult, painter(x, w, h, src), key (extra cache key), noLight }
     */
    R.sheet = (q, opt) => {
      const Hm = R.H(q), asp = opt.aspect || 1;
      const ru = opt.radius ? opt.radius * Math.min(1, 1 / asp) : 0, rv = opt.radius ? opt.radius * Math.min(1, asp) : 0;
      const sil = opt.radius ? R.rrUV(Hm, 0, 0, 1, 1, ru, rv) : q;
      if (opt.shadow !== false) R.shadow([opt.thick ? R.hull(sil.concat(sil.map((p) => R.add(p, opt.thick)))) : sil], opt.shadow || {});
      if (opt.thick) { R.fill(R.hull(sil.concat(sil.map((p) => R.add(p, opt.thick)))), opt.edge || shade(opt.paper || '#ffffff', -0.2)); }
      const src = opt.src || R.source(opt.slot, opt.def || {});
      const size = R.faceSize(q), [fw, fh] = R.faceDims(asp, size);
      const paper = opt.paper === undefined ? s.paper : opt.paper;
      const key = [src.id, src.fit, src.rot, paper, s.ink, s.paperTex, opt.radius, asp.toFixed(4), opt.key || ''].join('|');
      const f = R.face('slot' + opt.slot + (opt.chan || ''), key, fw, fh, opt.painter ? (x, w, h) => opt.painter(x, w, h, src) : (x, w, h) => paintPrint(x, w, h, src, {
        paper, ink: s.ink, tex: opt.tex == null ? s.paperTex / 100 : opt.tex, radius: opt.radius ? opt.radius * Math.min(w, h) : 0, fabric: opt.fabric,
      }));
      R.warp(f, q);
      if (!opt.noLight) { if (opt.normal) R.shade3D(sil, opt.normal, opt.lightMult || 1); else R.lightFlat(sil, opt.lightMult || 1); }
      R.gloss(sil, opt.glossMult == null ? 1 : opt.glossMult, opt.glossBase || 0);
      return { H: Hm, sil, src };
    };
    return R;
  }
  return { render, mix, shade, lum, rgba, drawFit, roundRect, dropChannels, bbox, mk };
});
