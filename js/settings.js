/* settings.js — Maquette Atelier: global settings (spec, defaults, validation), colour themes, and the
 * URL-hash (#…) encoding used for sharing. The hash holds settings only — never your images.
 * Original code, MIT licence. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MSET = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SCENE_IDS = ['poster', 'cards', 'flyer', 'book', 'phone', 'laptop', 'social', 'box', 'tote', 'billboard', 'libre'];
  const MATERIALS = ['plain', 'wood', 'concrete', 'linen', 'plaster', 'brick', 'terrazzo'];
  // key: [short hash key, default, kind, min|choices, max]
  const SPEC = {
    scene: ['sc', 'poster', 'enum', SCENE_IDS],
    aspect: ['ar', '4:3', 'enum', ['4:3', '3:2', '16:9', '1:1', '4:5', '9:16']],
    zoom: ['z', 100, 'int', 50, 170],
    yaw: ['yw', 0, 'int', -45, 45],
    pitch: ['pt', 0, 'int', -30, 30],
    theme: ['th', 'lin', 'enum', ['lin', 'atlas', 'terracotta', 'menthe', 'nuit', 'safran', 'bois', 'beton', 'custom']],
    bgMode: ['bm', 'scene', 'enum', ['scene', 'solid', 'gradient', 'none']],
    bg1: ['b1', '#efe8dc', 'hex'],
    bg2: ['b2', '#d6cab7', 'hex'],
    bgAngle: ['ba', 160, 'int', 0, 360],
    material: ['mt', 'plaster', 'enum', MATERIALS],
    surface: ['sf', '#e6ddcf', 'hex'],
    paper: ['pp', '#fbf8f2', 'hex'],
    device: ['dv', '#2b2d31', 'hex'],
    accent: ['ac', '#c8553d', 'hex'],
    light: ['li', -35, 'int', -180, 180],
    lightK: ['lk', 55, 'int', 0, 100],
    shadow: ['sh', 60, 'int', 0, 100],
    soft: ['so', 50, 'int', 0, 100],
    gloss: ['gl', 20, 'int', 0, 100],
    ink: ['ik', true, 'bool'],
    paperTex: ['tx', 35, 'int', 0, 100],
    grain: ['gr', 10, 'int', 0, 100],
    vignette: ['vg', 18, 'int', 0, 100],
    deco: ['dc', 'none', 'enum', ['none', 'leaves', 'blinds']],
    decoK: ['dk', 45, 'int', 0, 100],
    exportSize: ['ex', 1920, 'int', 640, 3840],
    jpgQ: ['jq', 92, 'int', 50, 100],
  };
  /** Colour themes: each sets the backdrop, surface, paper, device and accent colours and a material. */
  const THEMES = {
    lin: { bg1: '#efe8dc', bg2: '#d6cab7', surface: '#e6ddcf', material: 'plaster', paper: '#fbf8f2', device: '#2b2d31', accent: '#c8553d' },
    atlas: { bg1: '#e3ebf1', bg2: '#a7bccc', surface: '#c8d5df', material: 'concrete', paper: '#ffffff', device: '#c9ccd1', accent: '#1f4e5f' },
    terracotta: { bg1: '#f3dccb', bg2: '#c98a6c', surface: '#d9a688', material: 'plaster', paper: '#fbf5ec', device: '#3a2e2a', accent: '#8c3b2a' },
    menthe: { bg1: '#e4f0e8', bg2: '#a9caba', surface: '#cfe2d6', material: 'linen', paper: '#ffffff', device: '#e6e4df', accent: '#2f6b55' },
    nuit: { bg1: '#2f3445', bg2: '#11131a', surface: '#3b4050', material: 'concrete', paper: '#f4f1ea', device: '#1a1c22', accent: '#e9b44c' },
    safran: { bg1: '#f8e6b0', bg2: '#e2a63c', surface: '#ecd08a', material: 'terrazzo', paper: '#fffaf0', device: '#2b2d31', accent: '#b8322c' },
    bois: { bg1: '#ede4d7', bg2: '#c9b498', surface: '#b28761', material: 'wood', paper: '#fbf8f2', device: '#c9ccd1', accent: '#3b1f2b' },
    beton: { bg1: '#e6e6e3', bg2: '#b5b5b1', surface: '#aeaeaa', material: 'concrete', paper: '#ffffff', device: '#2b2d31', accent: '#ff6b3d' },
  };
  const DEFAULTS = {};
  for (const k in SPEC) DEFAULTS[k] = SPEC[k][1];
  const HEX = /^#[0-9a-f]{6}$/;
  const normHex = (h) => { const t = String(h || '').trim().toLowerCase().replace(/^#?/, '#'); return HEX.test(t) ? t : null; };

  /** Validated copy of the settings: unknown keys dropped, numbers clamped, enums and colours checked. */
  function normalize(src) {
    const o = {}, s = src || {};
    for (const k in SPEC) {
      const [, def, kind, a, b] = SPEC[k];
      let v = s[k];
      if (kind === 'enum') o[k] = a.includes(v) ? v : def;
      else if (kind === 'bool') o[k] = v === true || v === 1 || v === '1' || v === 'true' ? true : v === false || v === 0 || v === '0' || v === 'false' ? false : def;
      else if (kind === 'hex') o[k] = normHex(v) || def;
      else { v = Number(v); if (!Number.isFinite(v)) v = def; o[k] = Math.round(Math.min(b, Math.max(a, v))); }
    }
    return o;
  }
  function applyTheme(s, name) { const t = THEMES[name]; return t ? normalize({ ...s, ...t, theme: name }) : normalize(s); }

  const SLOT_SRC = /^(def|auto|none|d[0-5])$/, FITS = ['cover', 'contain', 'stretch'], ROTS = [0, 90, 180, 270];
  /** Validated slot settings list: [{ src, fit, rot }]. */
  function normSlots(list) {
    return (Array.isArray(list) ? list : []).slice(0, 4).map((x) => {
      x = x || {};
      return { src: SLOT_SRC.test(x.src) ? x.src : 'def', fit: FITS.includes(x.fit) ? x.fit : null, rot: ROTS.includes(+x.rot) ? +x.rot : 0 };
    });
  }
  /** Validated point list (core coordinates) or null. */
  function normPts(list, n) {
    if (!Array.isArray(list) || (n && list.length !== n)) return null;
    const out = [];
    for (const p of list) { if (!Array.isArray(p) || p.length < 2) return null; const x = +p[0], y = +p[1]; if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e5 || Math.abs(y) > 1e5) return null; out.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]); }
    return out.length ? out : null;
  }

  /** Hash string: settings differing from defaults + current scene options (o.key) + points (pts) + slots (sl) + extra. */
  function toHash(s, so, pts, slots, extra) {
    const n = normalize(s), parts = [];
    for (const k in SPEC) {
      const [key, def, kind] = SPEC[k], v = n[k];
      if (v === def) continue;
      parts.push(key + '=' + (kind === 'bool' ? (v ? 1 : 0) : kind === 'hex' ? v.slice(1) : encodeURIComponent(v)));
    }
    for (const k in so || {}) parts.push('o.' + k + '=' + encodeURIComponent(typeof so[k] === 'boolean' ? (so[k] ? 1 : 0) : so[k]));
    if (pts && pts.length) parts.push('pts=' + pts.map((p) => p[0] + ',' + p[1]).join(';'));
    if (slots && slots.some((x) => x.src !== 'def' || x.fit || x.rot)) parts.push('sl=' + slots.map((x) => [x.src, x.fit || '', x.rot || 0].join('.')).join('_'));
    for (const k in extra || {}) if (extra[k] != null) parts.push(k + '=' + encodeURIComponent(extra[k]));
    return parts.join('&');
  }
  /** Parses a hash → { settings, so (raw scene options), pts, slots, extra }. */
  function fromHash(hash) {
    const raw = {}, so = {}, extra = {}, byKey = {};
    let pts = null, slots = null;
    for (const k in SPEC) byKey[SPEC[k][0]] = k;
    String(hash || '').replace(/^#/, '').split('&').forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf('='), key = i < 0 ? pair : pair.slice(0, i);
      let val = i < 0 ? '' : pair.slice(i + 1);
      try { val = decodeURIComponent(val); } catch (e) { /* keep raw */ }
      if (key.startsWith('o.')) { so[key.slice(2)] = val; return; }
      if (key === 'pts') { pts = normPts(val.split(';').map((p) => p.split(',').map(Number))); return; }
      if (key === 'sl') { slots = normSlots(val.split('_').map((x) => { const [src, fit, rot] = x.split('.'); return { src, fit, rot: +rot }; })); return; }
      const name = byKey[key];
      if (!name) { extra[key] = val; return; }
      raw[name] = SPEC[name][2] === 'hex' ? '#' + val : val;
    });
    return { settings: normalize(raw), so, pts, slots, extra };
  }
  return { SPEC, DEFAULTS, THEMES, SCENE_IDS, MATERIALS, normalize, applyTheme, normSlots, normPts, toHash, fromHash };
});
