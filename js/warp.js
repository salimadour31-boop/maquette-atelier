/* warp.js — Maquette Atelier: true perspective (projective) mapping of an image onto any 4-corner quad.
 *  • homography maths: unit square → quad (Heckbert's square-to-quad), inverse, point mapping, uv paths;
 *  • WebGL2 renderer: every output pixel is mapped back through the inverse homography in a fragment shader
 *    (exact perspective, no seams), with analytic anti-aliased edges and trilinear mip-mapped sampling;
 *  • Canvas 2D fallback: the quad is subdivided into small triangles, each drawn with an affine transform.
 * Pure maths functions also run in Node (tests). Original code, MIT licence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WARP = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ homography maths */
  /** Homography (row-major 3×3) mapping (0,0),(1,0),(1,1),(0,1) → q[0],q[1],q[2],q[3]. */
  function squareToQuad(q) {
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
    const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) { // parallelogram: affine case
      return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1];
    }
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    const den = dx1 * dy2 - dx2 * dy1 || 1e-12;
    const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
  }
  /** Inverse of a 3×3 matrix (adjugate / determinant). */
  function invert(m) {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C || 1e-12;
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
      B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
      C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  }
  /** Maps (u, v) through the homography m. */
  function apply(m, u, v) {
    const w = m[6] * u + m[7] * v + m[8];
    return [(m[0] * u + m[1] * v + m[2]) / w, (m[3] * u + m[4] * v + m[5]) / w];
  }
  /** Maps a list of [u, v] points. */
  function mapPts(m, uv) { return uv.map((p) => apply(m, p[0], p[1])); }
  /** Corners of the sub-rectangle [u0,u1]×[v0,v1] of a quad (TL, TR, BR, BL). */
  function subQuad(m, u0, v0, u1, v1) { return [apply(m, u0, v0), apply(m, u1, v0), apply(m, u1, v1), apply(m, u0, v1)]; }
  /** Rounded rectangle in uv space as a polyline (radii ru, rv in uv units), for paths drawn in perspective. */
  function roundRectUV(u0, v0, u1, v1, ru, rv, seg = 7) {
    ru = Math.max(0, Math.min(ru, (u1 - u0) / 2)); rv = Math.max(0, Math.min(rv, (v1 - v0) / 2));
    if (ru <= 0 || rv <= 0) return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const out = [], arc = (cu, cv, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; out.push([cu + Math.cos(a) * ru, cv + Math.sin(a) * rv]); } };
    arc(u1 - ru, v0 + rv, -Math.PI / 2); arc(u1 - ru, v1 - rv, 0); arc(u0 + ru, v1 - rv, Math.PI / 2); arc(u0 + ru, v0 + rv, Math.PI);
    return out;
  }
  /** Signed area (screen coords, y down): > 0 when the points run clockwise on screen. */
  function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  /** True when the quad is convex and not self-intersecting. */
  function isConvex(q) {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
      const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(z) < 1e-9) continue;
      if (!sign) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false;
    }
    return sign !== 0;
  }
  /** Convex hull (monotone chain) of a point list. */
  function hull(points) {
    const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  /* ------------------------------------------------------------------ WebGL2 renderer */
  const VS = `#version 300 es
in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
  // For each output pixel: device position → inverse homography → uv; AA from screen-space derivatives of uv.
  const FS = `#version 300 es
precision highp float;
uniform mat3 uHi; uniform vec2 uOrg; uniform float uH; uniform float uAlpha; uniform sampler2D uTex;
out vec4 o;
void main() {
  vec2 p = vec2(uOrg.x + gl_FragCoord.x, uOrg.y + uH - gl_FragCoord.y);
  vec3 q = uHi * vec3(p, 1.0);
  if (q.z <= 0.0) discard;
  vec2 uv = q.xy / q.z;
  vec2 fw = max(fwidth(uv), vec2(1e-6));
  float a = clamp(min(uv.x, 1.0 - uv.x) / fw.x + 0.5, 0.0, 1.0) * clamp(min(uv.y, 1.0 - uv.y) / fw.y + 0.5, 0.0, 1.0);
  if (a <= 0.0) discard;
  o = texture(uTex, clamp(uv, 0.0, 1.0)) * (a * uAlpha);
}`;
  const G = { gl: null, canvas: null, prog: null, loc: null, failed: false, maxTex: 4096, aniso: null, texs: new WeakMap(), disabled: false };

  function initGL() {
    if (G.gl) return true;
    if (G.failed || G.disabled || typeof document === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true, depth: false, stencil: false });
      if (!gl) throw new Error('no webgl2');
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      G.loc = { hi: gl.getUniformLocation(prog, 'uHi'), org: gl.getUniformLocation(prog, 'uOrg'), h: gl.getUniformLocation(prog, 'uH'), alpha: gl.getUniformLocation(prog, 'uAlpha'), tex: gl.getUniformLocation(prog, 'uTex') };
      gl.uniform1i(G.loc.tex, 0);
      G.maxTex = Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096);
      G.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); G.gl = null; G.texs = new WeakMap(); });
      Object.assign(G, { gl, canvas: c, prog });
      return true;
    } catch (e) { G.failed = true; G.gl = null; return false; }
  }
  /** Uploads (or reuses) the texture of a source canvas; canvases carry a `_v` version number when they change. */
  function texture(src) {
    const gl = G.gl, v = src._v || 0, hit = G.texs.get(src);
    if (hit && hit.v === v) { gl.bindTexture(gl.TEXTURE_2D, hit.tex); return true; }
    const tex = hit ? hit.tex : gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (G.aniso) gl.texParameterf(gl.TEXTURE_2D, G.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(G.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    G.texs.set(src, { tex, v });
    return true;
  }
  /** Draws src warped onto quadDev (device pixels: TL, TR, BR, BL) using WebGL; returns false when unavailable. */
  function drawGL(ctx, src, quadDev, alpha) {
    if (!initGL()) return false;
    if (src.width > G.maxTex || src.height > G.maxTex) return false;
    const gl = G.gl, W = ctx.canvas.width, Hh = ctx.canvas.height;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of quadDev) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1);
    x1 = Math.min(W, Math.ceil(x1) + 1); y1 = Math.min(Hh, Math.ceil(y1) + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return true;
    if (w > G.maxTex || h > G.maxTex) return false;
    if (G.canvas.width !== w || G.canvas.height !== h) { G.canvas.width = w; G.canvas.height = h; }
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    texture(src);
    const m = invert(squareToQuad(quadDev));
    gl.uniformMatrix3fv(G.loc.hi, false, new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]])); // column-major
    gl.uniform2f(G.loc.org, x0, y0); gl.uniform1f(G.loc.h, h); gl.uniform1f(G.loc.alpha, alpha == null ? 1 : alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (gl.isContextLost()) return false;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(G.canvas, 0, 0, w, h, x0, y0, w, h); ctx.restore();
    return true;
  }

  /* ------------------------------------------------------------------ Canvas 2D fallback */
  /** Affine-maps the source triangle s0 s1 s2 onto the destination triangle d0 d1 d2 (clip slightly enlarged to hide seams). */
  function triangle(ctx, img, s0, s1, s2, d0, d1, d2) {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7]; };
    const [e0, e1, e2] = [grow(d0), grow(d1), grow(d2)];
    const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]);
    if (Math.abs(den) < 1e-9) return;
    const a = (d0[0] * (s1[1] - s2[1]) + d1[0] * (s2[1] - s0[1]) + d2[0] * (s0[1] - s1[1])) / den;
    const b = (d0[1] * (s1[1] - s2[1]) + d1[1] * (s2[1] - s0[1]) + d2[1] * (s0[1] - s1[1])) / den;
    const c = (d0[0] * (s2[0] - s1[0]) + d1[0] * (s0[0] - s2[0]) + d2[0] * (s1[0] - s0[0])) / den;
    const d = (d0[1] * (s2[0] - s1[0]) + d1[1] * (s0[0] - s2[0]) + d2[1] * (s1[0] - s0[0])) / den;
    const e = (d0[0] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[0] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[0] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    const f = (d0[1] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[1] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[1] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
  /** Subdivided-triangle perspective mapping (grid of n × n cells, n adapted to the quad size). */
  function drawTriangles(ctx, src, quadDev, alpha) {
    const m = squareToQuad(quadDev), sw = src.width, sh = src.height;
    const size = Math.max(Math.hypot(quadDev[1][0] - quadDev[0][0], quadDev[1][1] - quadDev[0][1]), Math.hypot(quadDev[3][0] - quadDev[0][0], quadDev[3][1] - quadDev[0][1]));
    const n = Math.max(4, Math.min(28, Math.round(size / 40)));
    const P = [];
    for (let j = 0; j <= n; j++) { P.push([]); for (let i = 0; i <= n; i++) P[j].push(apply(m, i / n, j / n)); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (alpha != null) ctx.globalAlpha *= alpha;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const s00 = [i / n * sw, j / n * sh], s10 = [(i + 1) / n * sw, j / n * sh], s11 = [(i + 1) / n * sw, (j + 1) / n * sh], s01 = [i / n * sw, (j + 1) / n * sh];
      triangle(ctx, src, s00, s10, s11, P[j][i], P[j][i + 1], P[j + 1][i + 1]);
      triangle(ctx, src, s00, s11, s01, P[j][i], P[j + 1][i + 1], P[j + 1][i]);
    }
    ctx.restore();
  }

  /** Public entry: warp `src` (canvas/image) onto the device-space quad. Uses WebGL2, else the triangle fallback. */
  function draw(ctx, src, quadDev, alpha) {
    if (!src || !src.width || !src.height) return 'none';
    if (drawGL(ctx, src, quadDev, alpha)) return 'webgl';
    drawTriangles(ctx, src, quadDev, alpha);
    return 'canvas';
  }
  function backend() { return initGL() ? 'webgl' : 'canvas'; }
  function setDisabled(v) { G.disabled = !!v; }

  return { squareToQuad, invert, apply, mapPts, subQuad, roundRectUV, area, isConvex, hull, draw, drawTriangles, backend, setDisabled, maxTexture: () => (initGL() ? G.maxTex : 4096) };
});
