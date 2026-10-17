/* app.js — Maquette Atelier: interface (designs, scenes, slots, controls), live preview with draggable
 * perspective handles, exports (PNG up to 4K / transparent, JPG, JSON settings), URL-hash sharing, languages
 * and themes. Original code, MIT licence. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const LS = { lang: 'ma-lang', tfng: 'ma-tfng', theme: 'ma-theme' };
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  const LANGS = I18N.LANGS;
  const parsed = MSET.fromHash(location.hash);
  const COLOR_KEYS = new Set(['bg1', 'bg2', 'surface', 'paper', 'device', 'accent', 'material']);

  /* ================================================================== state */
  const state = {
    s: parsed.settings, so: {}, pts: {}, slots: {}, designs: [], userDesigns: false, bgPhoto: null, nextId: 1,
    lang: LANGS.includes(parsed.extra.lang) ? parsed.extra.lang : LANGS.includes(store.get(LS.lang)) ? store.get(LS.lang) : 'fr',
    tfng: store.get(LS.tfng) === '1', free: false, sel: 0, geo: null, renders: 0,
  };
  for (const sc of SCENES.list) { state.so[sc.id] = SCENES.defaults(sc.id); state.slots[sc.id] = []; state.pts[sc.id] = null; }
  applyParsed(parsed);
  const L = (key, vars) => I18N.t(key, state.lang, vars, state.tfng);
  const scene = () => SCENES.byId[state.s.scene];
  const opts = () => state.so[state.s.scene];

  function applyParsed(p) {
    state.s = p.settings;
    const id = state.s.scene;
    state.so[id] = SCENES.normOpts(id, Object.assign({}, SCENES.defaults(id), p.so));
    state.slots[id] = p.slots || [];
    const n = SCENES.byId[id].build(state.so[id], state.s).pts.length;
    state.pts[id] = p.pts && p.pts.length === n ? p.pts : null;
  }

  /* ================================================================== i18n + theme */
  function applyLang() {
    if ($('toast')) $('toast').hidden = true; // a message shown in the previous language would be stale
    const root = document.documentElement;
    root.lang = state.lang === 'kab' ? (state.tfng ? 'kab-Tfng' : 'kab') : state.lang;
    document.body.classList.toggle('tfng-on', state.lang === 'kab' && state.tfng);
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = L(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => { const [attr, key] = pair.split(':'); el.setAttribute(attr, L(key)); });
    });
    $('helpBody').innerHTML = L('helpBody');
    $('lang').value = state.lang; $('tfngWrap').hidden = state.lang !== 'kab'; $('tfng').checked = state.tfng;
    buildScenes(); buildThemes(); buildMaterials(); buildSceneOpts(); buildSlots(); buildDesigns(); syncControls(); status();
  }
  function setUiTheme(th) { document.documentElement.dataset.theme = th; store.set(LS.theme, th); }
  setUiTheme(store.get(LS.theme) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  /* ================================================================== panels */
  const ICONS = {
    poster: '<rect x="9" y="2" width="12" height="18" rx="1"/><rect x="11.5" y="4.5" width="7" height="13"/><path d="M3 22h24"/>',
    cards: '<path d="M4 9l13-4 3 9-13 4z"/><path d="M10 13l14-2 1 9-14 2z"/>',
    flyer: '<path d="M8 2h11l4 4v16H8z"/><path d="M11 9h8M11 12h8M11 15h5"/>',
    book: '<path d="M7 4l4-2h12v18l-4 2H7z"/><path d="M11 2v18l-4 2"/><path d="M11 20h12"/>',
    phone: '<rect x="10" y="1.5" width="10" height="21" rx="2.5"/><path d="M13.5 4h3"/>',
    laptop: '<rect x="7" y="4" width="16" height="11" rx="1"/><path d="M3 19h24l-2-4H5z"/>',
    social: '<rect x="7" y="1.5" width="16" height="21" rx="2"/><circle cx="10.5" cy="5" r="1.4"/><rect x="7" y="8" width="16" height="9"/><path d="M10 20h6"/>',
    box: '<path d="M15 2l9 4v11l-9 5-9-5V6z"/><path d="M6 6l9 4 9-4M15 10v12"/>',
    tote: '<path d="M7 9h16l-1 13H8z"/><path d="M11 9c0-6 8-6 8 0"/>',
    billboard: '<rect x="4" y="3" width="22" height="12" rx="1"/><path d="M15 15v8M10 23h10"/>',
    libre: '<path d="M6 5l17 2-2 13-14 1z" stroke-dasharray="2 2"/><circle cx="6" cy="5" r="1.8"/><circle cx="23" cy="7" r="1.8"/><circle cx="21" cy="20" r="1.8"/><circle cx="7" cy="21" r="1.8"/>',
  };
  function buildScenes() {
    const box = $('scenes'); box.innerHTML = '';
    for (const sc of SCENES.list) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.scene = sc.id; b.setAttribute('aria-checked', String(sc.id === state.s.scene));
      b.innerHTML = `<svg viewBox="0 0 30 24" aria-hidden="true">${ICONS[sc.id]}</svg><span></span>`;
      b.querySelector('span').textContent = L('sc_' + sc.id);
      b.addEventListener('click', () => setScene(sc.id));
      box.appendChild(b);
    }
  }
  function buildThemes() {
    const box = $('themes'); box.innerHTML = '';
    for (const id of Object.keys(MSET.THEMES)) {
      const t = MSET.THEMES[id], b = document.createElement('button');
      b.type = 'button'; b.dataset.theme = id; b.setAttribute('aria-pressed', String(state.s.theme === id));
      b.innerHTML = `<i aria-hidden="true"><b style="background:${t.bg1}"></b><b style="background:${t.surface}"></b><b style="background:${t.bg2}"></b><b style="background:${t.accent}"></b></i><span></span>`;
      b.querySelector('span').textContent = L('th_' + id);
      b.addEventListener('click', () => { const before = geomKey(); state.s = MSET.applyTheme(state.s, id); afterChange(before); });
      box.appendChild(b);
    }
  }
  function buildMaterials() {
    const sel = $('s-material'); sel.innerHTML = '';
    for (const m of MSET.MATERIALS) { const o = document.createElement('option'); o.value = m; o.textContent = L('mat_' + m); sel.appendChild(o); }
    sel.value = state.s.material;
  }
  const choiceLabel = (v) => (I18N.has('c_' + v) ? L('c_' + v) : v);
  /** Scene-specific options, generated from the scene's option spec. */
  function buildSceneOpts() {
    const box = $('sceneOpts'), sc = scene(), o = opts(); box.innerHTML = '';
    for (const op of sc.opts) {
      const id = 'o-' + op.key, wrap = document.createElement(op.type === 'bool' ? 'label' : 'div');
      if (op.type === 'bool') {
        wrap.className = 'check'; wrap.innerHTML = `<input type="checkbox" id="${id}"> <span></span>`; wrap.querySelector('span').textContent = L('o_' + op.key);
        const inp = wrap.querySelector('input'); inp.checked = !!o[op.key]; inp.addEventListener('change', () => setOpt(op.key, inp.checked));
      } else {
        wrap.className = 'field' + (op.type === 'color' ? ' inline' : '');
        const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = L('o_' + op.key); wrap.appendChild(lab);
        let inp;
        if (op.type === 'select') { inp = document.createElement('select'); for (const c of op.choices) { const x = document.createElement('option'); x.value = c; x.textContent = choiceLabel(c); inp.appendChild(x); } inp.value = o[op.key]; inp.addEventListener('change', () => setOpt(op.key, inp.value)); }
        else if (op.type === 'range') {
          inp = document.createElement('input'); inp.type = 'range'; inp.min = op.min; inp.max = op.max; inp.step = op.step; inp.value = o[op.key];
          const out = document.createElement('output'); out.htmlFor = id; out.textContent = o[op.key];
          inp.addEventListener('input', () => { out.textContent = inp.value; setOpt(op.key, +inp.value); });
          wrap.appendChild(inp); inp.id = id; wrap.appendChild(out); box.appendChild(wrap); continue;
        } else if (op.type === 'color') { inp = document.createElement('input'); inp.type = 'color'; inp.value = o[op.key]; inp.addEventListener('input', () => setOpt(op.key, inp.value)); }
        else { inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = op.max || 40; inp.value = o[op.key]; inp.addEventListener('input', () => setOpt(op.key, inp.value)); }
        inp.id = id; wrap.appendChild(inp);
      }
      box.appendChild(wrap);
    }
  }
  /** One block per image slot: which design, fit, rotation. */
  function buildSlots() {
    const box = $('slots'), sc = scene(), list = sc.slots(opts()); box.innerHTML = '';
    const cur = state.slots[sc.id];
    list.forEach((def, i) => {
      const v = cur[i] || { src: 'def', fit: null, rot: 0 }, div = document.createElement('div');
      div.className = 'slot';
      const h = document.createElement('h4'); h.textContent = L(def.label); div.appendChild(h);
      const g = document.createElement('div'); g.className = 'grid3';
      const src = document.createElement('select'); src.setAttribute('aria-label', L(def.label));
      const add = (val, text) => { const o = document.createElement('option'); o.value = val; o.textContent = text; src.appendChild(o); };
      add('def', L('srcDef')); state.designs.forEach((d, j) => add('d' + j, L('designN', { n: j + 1 }) + (d.demo ? ' (' + L('demoTag') + ')' : ''))); add('auto', L('srcAuto')); add('none', L('srcNone'));
      src.value = [...src.options].some((o) => o.value === v.src) ? v.src : 'def';
      const fit = document.createElement('select'); fit.setAttribute('aria-label', L('fit'));
      for (const f of ['cover', 'contain', 'stretch']) { const o = document.createElement('option'); o.value = f; o.textContent = L('fit' + f[0].toUpperCase() + f.slice(1)); fit.appendChild(o); }
      fit.value = v.fit || def.fit || 'cover';
      const rot = document.createElement('select'); rot.setAttribute('aria-label', L('rotation'));
      for (const r of [0, 90, 180, 270]) { const o = document.createElement('option'); o.value = r; o.textContent = r + '°'; rot.appendChild(o); }
      rot.value = v.rot || 0;
      const upd = () => { const arr = state.slots[sc.id]; while (arr.length <= i) arr.push({ src: 'def', fit: null, rot: 0 }); arr[i] = { src: src.value, fit: fit.value === (def.fit || 'cover') ? null : fit.value, rot: +rot.value }; schedule(); hashSoon(); };
      [src, fit, rot].forEach((el) => { el.addEventListener('change', upd); g.appendChild(el); });
      div.appendChild(g); box.appendChild(div);
    });
  }
  function buildDesigns() {
    const ul = $('designs'); ul.innerHTML = '';
    state.designs.forEach((d, i) => {
      const li = document.createElement('li');
      li.innerHTML = '<img alt=""><div class="meta"><b></b><span></span></div><button class="x" type="button">✕</button>';
      li.querySelector('img').src = d.thumb;
      li.querySelector('b').textContent = L('designN', { n: i + 1 });
      li.querySelector('span').textContent = (d.demo ? L('demoTag') + ' · ' : d.name + ' · ') + d.w + '×' + d.h;
      const x = li.querySelector('.x'); x.setAttribute('aria-label', L('remove', { name: L('designN', { n: i + 1 }) })); x.title = x.getAttribute('aria-label');
      x.addEventListener('click', () => { state.designs.splice(i, 1); if (!state.designs.length) loadDemos(); buildDesigns(); buildSlots(); schedule(); });
      ul.appendChild(li);
    });
  }
  /** Copies state.s into every [data-set] control. */
  function syncControls() {
    document.querySelectorAll('[data-set]').forEach((el) => {
      const k = el.dataset.set, v = state.s[k];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v);
      const out = el.parentElement.querySelector('output'); if (out) out.textContent = v;
    });
    document.querySelectorAll('#themes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === state.s.theme)));
    document.querySelectorAll('#scenes button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.scene === state.s.scene)));
    const noCam = !!scene().noCam;
    document.querySelectorAll('.field.cam').forEach((f) => f.classList.toggle('disabled', noCam));
    $('noCam').hidden = !noCam; $('photoBox').hidden = state.s.scene !== 'libre';
    $('editedTag').hidden = !state.pts[state.s.scene];
    $('freeBtn').setAttribute('aria-pressed', String(state.free));
    $('viewer').classList.toggle('free', state.free); $('freeHint').hidden = !state.free;
  }

  /* ================================================================== changes */
  /** Key of the default geometry, to know when hand-moved corners must be reset. */
  function geomKey() { return JSON.stringify(scene().build(opts(), state.s).pts.map((p) => p.map((v) => Math.round(v * 10)))); }
  function afterChange(before) {
    const id = state.s.scene;
    if (before != null && state.pts[id] && geomKey() !== before) { state.pts[id] = null; toast(L('camReset')); }
    syncControls(); schedule(); hashSoon();
  }
  function setOpt(key, val) {
    const before = geomKey(), id = state.s.scene;
    state.so[id] = SCENES.normOpts(id, Object.assign({}, state.so[id], { [key]: val }));
    if (key === 'second') buildSlots();
    afterChange(before);
  }
  function setScene(id) {
    if (!SCENES.byId[id] || id === state.s.scene) return;
    state.s = MSET.normalize(Object.assign({}, state.s, { scene: id })); state.sel = 0;
    buildSceneOpts(); buildSlots(); syncControls(); schedule(); hashSoon(); status();
  }
  document.querySelectorAll('[data-set]').forEach((el) => {
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const k = el.dataset.set, before = geomKey();
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'range' || k === 'exportSize') v = +v;
      const next = Object.assign({}, state.s, { [k]: v });
      if (COLOR_KEYS.has(k)) next.theme = 'custom';
      state.s = MSET.normalize(next);
      afterChange(before);
    });
  });

  /* ================================================================== preview */
  const canvas = $('view'), viewer = $('viewer');
  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
  function aspectWH() { const [a, b] = state.s.aspect.split(':').map(Number); return [a, b]; }
  function job(channel) {
    const id = state.s.scene;
    return { s: state.s, o: state.so[id], pts: state.pts[id], slots: state.slots[id], designs: state.designs, bgPhoto: state.bgPhoto, channel };
  }
  function draw() {
    raf = 0;
    const [a, b] = aspectWH(), r = viewer.getBoundingClientRect(), pad = 14;
    const aw = Math.max(50, r.width - pad * 2), ah = Math.max(50, r.height - pad * 2);
    const cw = Math.floor(Math.min(aw, ah * a / b)), ch = Math.floor(cw * b / a), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');
    state.geo = RENDER.render(ctx, W, H, job('p'));
    state.geo.dpr = dpr;
    if (state.free) drawHandles(ctx, state.geo);
    state.renders++; document.body.dataset.renders = state.renders;
    if (state.backend !== state.geo.backend) { state.backend = state.geo.backend; status(); }
  }
  function drawHandles(ctx, g) {
    const { k, ox, oy, P, dpr, built } = g, dev = (p) => [p[0] * k + ox, p[1] * k + oy];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 1.4 * dpr; ctx.setLineDash([5 * dpr, 4 * dpr]); ctx.strokeStyle = 'rgba(255,255,255,.9)';
    for (const q of built.quads || [[0, 1, 2, 3]]) { ctx.beginPath(); q.forEach((i, j) => { const d = dev(P[i]); (j ? ctx.lineTo : ctx.moveTo).call(ctx, d[0], d[1]); }); ctx.closePath(); ctx.stroke(); }
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 0.8 * dpr;
    for (const q of built.quads || [[0, 1, 2, 3]]) { ctx.beginPath(); q.forEach((i, j) => { const d = dev(P[i]); (j ? ctx.lineTo : ctx.moveTo).call(ctx, d[0], d[1]); }); ctx.closePath(); ctx.stroke(); }
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f0b23e';
    P.forEach((p, i) => {
      const d = dev(p), r = (i === state.sel ? 10 : 8) * dpr;
      ctx.beginPath(); ctx.arc(d[0], d[1], r, 0, Math.PI * 2); ctx.fillStyle = i === state.sel ? acc : 'rgba(255,255,255,.95)'; ctx.fill();
      ctx.lineWidth = 2 * dpr; ctx.strokeStyle = i === state.sel ? '#fff' : acc; ctx.stroke();
      ctx.fillStyle = i === state.sel ? '#1e1503' : '#222'; ctx.font = `700 ${9 * dpr}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), d[0], d[1] + 0.5);
    });
    ctx.restore();
  }
  new ResizeObserver(schedule).observe(viewer);

  /* ------------------------------------------------------------------ free perspective: dragging */
  let drag = null;
  function toCore(e) {
    const r = canvas.getBoundingClientRect(), g = state.geo;
    const x = (e.clientX - r.left) * canvas.width / r.width, y = (e.clientY - r.top) * canvas.height / r.height;
    return [(x - g.ox) / g.k, (y - g.oy) / g.k];
  }
  function nearest(p) {
    const g = state.geo, tol = 22 * g.dpr / g.k; let best = -1, bd = tol;
    g.P.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function movePoint(i, np) {
    const id = state.s.scene;
    if (!state.pts[id]) state.pts[id] = scene().build(opts(), state.s).pts.map((p) => p.slice()); // fresh defaults (the last frame may be stale)
    state.pts[id][i] = [Math.round(np[0] * 10) / 10, Math.round(np[1] * 10) / 10];
    $('editedTag').hidden = false; schedule();
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.free || !state.geo) return;
    const p = toCore(e), i = nearest(p);
    if (i < 0) return;
    state.sel = i; const q = state.geo.P[i];
    drag = { id: e.pointerId, i, off: [q[0] - p[0], q[1] - p[1]] };
    canvas.setPointerCapture(e.pointerId); viewer.classList.add('dragging'); e.preventDefault(); schedule();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.free || !state.geo) return;
    if (drag && e.pointerId === drag.id) { const p = toCore(e); movePoint(drag.i, [p[0] + drag.off[0], p[1] + drag.off[1]]); return; }
    viewer.classList.toggle('grab', nearest(toCore(e)) >= 0);
  });
  const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag = null; viewer.classList.remove('dragging'); hashSoon(); } };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  function setFree(v) { state.free = !!v; syncControls(); schedule(); }
  function resetPts() { state.pts[state.s.scene] = null; syncControls(); schedule(); hashSoon(); }
  $('freeBtn').addEventListener('click', () => setFree(!state.free));
  $('resetPts').addEventListener('click', resetPts);
  viewer.addEventListener('keydown', (e) => {
    if (e.target !== viewer || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = state.geo ? state.geo.P.length : 4;
    if (e.key === 'f' || e.key === 'F') { setFree(!state.free); e.preventDefault(); return; }
    if (e.key === 'r' || e.key === 'R') { resetPts(); e.preventDefault(); return; }
    if (!state.free) return;
    if (e.key === '[' || e.key === ']') { state.sel = (state.sel + (e.key === ']' ? 1 : n - 1)) % n; live(L('cornerN', { n: state.sel + 1, t: n })); schedule(); e.preventDefault(); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d && state.geo) { const st = e.shiftKey ? 10 : 1, q = (state.pts[state.s.scene] || state.geo.P)[state.sel]; movePoint(state.sel, [q[0] + d[0] * st, q[1] + d[1] * st]); hashSoon(); e.preventDefault(); }
  });

  /* ================================================================== designs: loading */
  /** Dominant colour: 5-bit colour buckets on a small sample, weighted by alpha. */
  function dominant(c) {
    const s = 48, t = document.createElement('canvas'); t.width = t.height = s;
    const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, s, s);
    const d = x.getImageData(0, 0, s, s).data, cnt = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3), e = cnt.get(key) || [0, 0, 0, 0];
      e[0]++; e[1] += d[i]; e[2] += d[i + 1]; e[3] += d[i + 2]; cnt.set(key, e);
    }
    let best = null; for (const e of cnt.values()) if (!best || e[0] > best[0]) best = e;
    if (!best) return '#888888';
    return '#' + [best[1], best[2], best[3]].map((v) => Math.round(v / best[0]).toString(16).padStart(2, '0')).join('');
  }
  function mkDesign(c, name, demo) {
    const t = document.createElement('canvas'), s = 84, sc = Math.min(s / c.width, s / c.height);
    t.width = Math.max(1, Math.round(c.width * sc)); t.height = Math.max(1, Math.round(c.height * sc));
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    return { id: state.nextId++, canvas: c, name, demo: !!demo, w: c.width, h: c.height, avg: dominant(c), thumb: t.toDataURL('image/png') };
  }
  function loadDemos() {
    state.designs = DEMO.list.map((d) => mkDesign(d.make(), d.id, true)); state.userDesigns = false;
  }
  const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = url; });
  /** File → canvas (raster ≤ 4096 px; SVG rasterised at 3000 px on its long edge, keeping its viewBox ratio). */
  async function fileToCanvas(f) {
    const isSvg = f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);
    let w, h, url;
    if (isSvg) {
      const text = await f.text(), doc = new DOMParser().parseFromString(text, 'image/svg+xml'), el = doc.documentElement;
      if (!el || el.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('svg');
      const vb = (el.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
      let rw = parseFloat(el.getAttribute('width')), rh = parseFloat(el.getAttribute('height'));
      if (!(rw > 0 && rh > 0) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) { rw = vb[2]; rh = vb[3]; }
      if (!(rw > 0 && rh > 0)) { rw = 1000; rh = 1000; }
      const sc = 3000 / Math.max(rw, rh); w = Math.round(rw * sc); h = Math.round(rh * sc);
      el.setAttribute('width', w); el.setAttribute('height', h); if (!el.getAttribute('preserveAspectRatio')) el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' }));
    } else url = URL.createObjectURL(f);
    try {
      const img = await loadImg(url);
      if (!isSvg) { w = img.naturalWidth; h = img.naturalHeight; const sc = Math.min(1, 4096 / Math.max(w, h)); w = Math.round(w * sc); h = Math.round(h * sc); }
      if (!(w > 0 && h > 0)) throw new Error('size');
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
      return c;
    } finally { URL.revokeObjectURL(url); }
  }
  async function addFiles(files) {
    const list = [...files].filter((f) => /^image\//.test(f.type) || /\.svg$/i.test(f.name));
    if (!list.length) return 0;
    const before = state.designs, wasUser = state.userDesigns;
    if (!state.userDesigns) { state.designs = []; state.userDesigns = true; }
    let n = 0;
    for (const f of list) {
      if (state.designs.length >= 6) { toast(L('maxDesigns')); break; }
      try { state.designs.push(mkDesign(await fileToCanvas(f), f.name.replace(/[<>]/g, ''))); n++; } catch (e) { toast(L('loadErr', { f: f.name })); }
    }
    if (!state.designs.length) { state.designs = before; state.userDesigns = wasUser; }
    if (n) toast(L('added', { n }));
    buildDesigns(); buildSlots(); schedule();
    return n;
  }
  $('addBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', async (e) => { await addFiles(e.target.files); e.target.value = ''; });
  $('demoBtn').addEventListener('click', () => { loadDemos(); buildDesigns(); buildSlots(); schedule(); });
  // drag & drop and paste, anywhere on the page
  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; $('dropHint').hidden = false; } });
  document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('dropHint').hidden = true; });
  document.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); dragDepth = 0; $('dropHint').hidden = true; addFiles(e.dataTransfer.files); });
  document.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.items || [])].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
    if (files.length && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) { e.preventDefault(); addFiles(files); }
  });
  // background photo (free-perspective scene)
  $('photoBtn').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { state.bgPhoto = await fileToCanvas(f); schedule(); } catch (err) { toast(L('loadErr', { f: f.name })); }
  });
  $('photoClear').addEventListener('click', () => { state.bgPhoto = null; schedule(); });

  /* ================================================================== export */
  function exportDims() { const [a, b] = aspectWH(), Lg = state.s.exportSize; return a >= b ? [Lg, Math.round(Lg * b / a)] : [Math.round(Lg * a / b), Lg]; }
  /** Renders the mockup at export size → { blob, w, h, name, backend }. */
  async function renderExport(type) {
    const [W, H] = exportDims(), c = document.createElement('canvas'); c.width = W; c.height = H;
    const transparent = type === 'png' && $('transparent').checked;
    const g = RENDER.render(c.getContext('2d'), W, H, Object.assign(job('x'), { transparent }));
    let out = c;
    if (type === 'jpg') { out = document.createElement('canvas'); out.width = W; out.height = H; const x = out.getContext('2d'); x.fillStyle = state.s.bgMode === 'none' ? '#ffffff' : state.s.bg1; x.fillRect(0, 0, W, H); x.drawImage(c, 0, 0); }
    const blob = await new Promise((res) => out.toBlob(res, type === 'jpg' ? 'image/jpeg' : 'image/png', state.s.jpgQ / 100));
    RENDER.dropChannels('x:');
    c.width = c.height = 1; if (out !== c) out.width = out.height = 1;
    return { blob, w: W, h: H, name: `maquette-${state.s.scene}-${W}x${H}.${type}`, backend: g.backend };
  }
  function download(blob, name) {
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(L('downloaded', { f: name }));
  }
  async function exportImage(type) {
    $('busy').hidden = false;
    await new Promise((r) => setTimeout(r, 30));
    try { const r = await renderExport(type); if (r.blob) download(r.blob, r.name); return r; }
    finally { $('busy').hidden = true; }
  }
  $('exPng').addEventListener('click', () => exportImage('png'));
  $('quickPng').addEventListener('click', () => exportImage('png'));
  $('exJpg').addEventListener('click', () => exportImage('jpg'));
  function settingsObject() { return { app: 'maquette-atelier', version: 1, settings: state.s, sceneOptions: state.so, points: state.pts, slots: state.slots, lang: state.lang }; }
  $('exJson').addEventListener('click', () => download(new Blob([JSON.stringify(settingsObject(), null, 2)], { type: 'application/json' }), 'maquette-atelier-reglages.json'));
  $('imJson').addEventListener('click', () => $('jsonInput').click());
  $('jsonInput').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { importSettings(JSON.parse(await f.text())); toast(L('imported')); } catch (err) { toast(L('importErr')); }
  });
  function importSettings(j) {
    if (!j || j.app !== 'maquette-atelier' || typeof j.settings !== 'object') throw new Error('bad');
    state.s = MSET.normalize(j.settings);
    for (const sc of SCENES.list) {
      state.so[sc.id] = SCENES.normOpts(sc.id, Object.assign({}, SCENES.defaults(sc.id), (j.sceneOptions || {})[sc.id]));
      state.slots[sc.id] = MSET.normSlots((j.slots || {})[sc.id]);
      const n = sc.build(state.so[sc.id], state.s).pts.length;
      state.pts[sc.id] = MSET.normPts((j.points || {})[sc.id], n);
    }
    if (LANGS.includes(j.lang)) state.lang = j.lang;
    applyLang(); schedule(); hashSoon();
  }
  $('copyLink').addEventListener('click', async () => { updateHash(); await copyText(location.href); toast(L('copied')); });
  $('resetAll').addEventListener('click', () => {
    state.s = MSET.normalize({ scene: state.s.scene });
    for (const sc of SCENES.list) { state.so[sc.id] = SCENES.defaults(sc.id); state.slots[sc.id] = []; state.pts[sc.id] = null; }
    $('transparent').checked = false; applyLang(); schedule(); hashSoon(); toast(L('resetDone'));
  });
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) { /* ignore */ } ta.remove(); }
  }

  /* ================================================================== URL hash */
  let hashT = 0;
  function hashSoon() { clearTimeout(hashT); hashT = setTimeout(updateHash, 250); }
  function updateHash() {
    const id = state.s.scene, def = SCENES.defaults(id), so = {};
    for (const k in state.so[id]) if (state.so[id][k] !== def[k]) so[k] = state.so[id][k];
    const h = MSET.toHash(state.s, so, state.pts[id], state.slots[id], { lang: state.lang !== 'fr' ? state.lang : null });
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  }
  window.addEventListener('hashchange', () => { applyParsed(MSET.fromHash(location.hash)); const l = MSET.fromHash(location.hash).extra.lang; if (LANGS.includes(l)) state.lang = l; applyLang(); schedule(); });

  /* ================================================================== misc UI */
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); live(msg); }
  function live(msg) { $('status').textContent = msg; setTimeout(status, 3000); }
  function status() {
    const [W, H] = exportDims();
    $('status').textContent = L('sc_' + state.s.scene) + ' · ' + W + ' × ' + H + ' px · ' + L('backend', { b: state.backend === 'canvas' ? 'Canvas 2D' : 'WebGL2' });
  }
  $('lang').addEventListener('change', () => { state.lang = $('lang').value; store.set(LS.lang, state.lang); applyLang(); hashSoon(); });
  $('tfng').addEventListener('change', () => { state.tfng = $('tfng').checked; store.set(LS.tfng, state.tfng ? '1' : '0'); applyLang(); });
  $('themeBtn').addEventListener('click', () => { setUiTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); schedule(); });
  $('helpBtn').addEventListener('click', () => $('helpDlg').showModal());
  document.addEventListener('keydown', (e) => { if (e.key === 'F1') { e.preventDefault(); $('helpDlg').showModal(); } });

  /* ================================================================== start */
  if (/[?&]gl=0\b/.test(location.search)) WARP.setDisabled(true);
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load("40px 'Noto Sans Tifinagh'", 'ⵜⵉⵣⵉ').catch(() => null) : Promise.resolve();
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    loadDemos(); applyLang(); schedule(); document.body.dataset.ready = '1';
  });
  // test / automation hooks (no network, no side effects)
  window.MA = { state, setScene, setOpt, setFree, movePoint, addFiles, renderExport, importSettings, settingsObject, updateHash, draw: () => draw(), L };
})();
