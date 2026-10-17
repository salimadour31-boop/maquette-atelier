// Headless UI test (Playwright + Chrome/Chromium): node tests/ui.test.js
// Serves the folder locally and runs the interface at 1440 × 900 (desktop) and 390 × 844 (mobile):
// demo designs, loading PNG (alpha) / JPG / SVG designs by file picker, drag-and-drop and paste, every scene
// (non-blank render, slot controls), scene options, slot assignment, free-perspective corner dragging (mouse +
// keyboard), camera reset of moved corners, themes, backgrounds, languages (+ Tifinagh), every export (PNG at 4K,
// transparent PNG alpha check, JPG, JSON settings + import), URL-hash restore, WebGL vs Canvas-2D fallback pixel
// agreement, no console errors, no horizontal overflow on mobile. Writes the README screenshots.
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.resolve(__dirname, '../../node_modules/playwright'))); }
const root = path.resolve(__dirname, '..'), shots = path.join(root, 'screenshots'), fx = path.join(__dirname, 'fixtures');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
let checks = 0;
const ok = (msg) => { checks++; console.log('  ✓ ' + msg); };
const SCENES = ['poster', 'cards', 'flyer', 'book', 'phone', 'laptop', 'social', 'box', 'tote', 'billboard', 'libre'];

/** PNG width/height from the IHDR chunk; JPEG from the first SOFn marker. */
function pngSize(b) { assert.strictEqual(b.toString('ascii', 1, 4), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function jpgSize(b) {
  assert(b[0] === 0xff && b[1] === 0xd8, 'JPEG SOI');
  let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + len; }
  throw new Error('no SOF');
}
async function rendered(page, fn) {
  const n0 = await page.evaluate(() => +(document.body.dataset.renders || 0));
  await fn();
  await page.waitForFunction((n) => +(document.body.dataset.renders || 0) > n, n0, { timeout: 15000 });
  await page.waitForTimeout(40);
}
/** Canvas statistics in the page: luminance std-dev and number of distinct coarse colours. */
const canvasStats = (page) => page.evaluate(() => {
  const v = document.getElementById('view'), c = new OffscreenCanvas(v.width, v.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(v, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
  let s = 0, s2 = 0, n = 0; const set = new Set();
  for (let i = 0; i < d.length; i += 4 * 37) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; s += l; s2 += l * l; n++; set.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4)); }
  return { std: Math.sqrt(s2 / n - (s / n) ** 2), colours: set.size, w: c.width, h: c.height };
});

async function run(browser, base, vp, tag) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(base);
  await page.waitForFunction(() => document.body.dataset.ready === '1' && +document.body.dataset.renders > 0, null, { timeout: 30000 });
  assert.strictEqual(await page.evaluate(() => MA.state.designs.filter((d) => d.demo).length), 3);
  assert.strictEqual(await page.evaluate(() => MA.state.backend), 'webgl');
  ok('loads with 3 demo designs, WebGL2 renderer');

  // ---------------------------------------------------------------- designs
  await rendered(page, () => page.setInputFiles('#fileInput', [path.join(fx, 'logo-alpha.png'), path.join(fx, 'landscape.jpg'), path.join(fx, 'test.svg')]));
  await page.waitForFunction(() => MA.state.designs.length === 3 && !MA.state.designs.some((d) => d.demo));
  const ds = await page.evaluate(() => MA.state.designs.map((d) => [d.name, d.w, d.h, d.avg]));
  assert.deepStrictEqual(ds.map((d) => d[0]), ['logo-alpha.png', 'landscape.jpg', 'test.svg']);
  assert.deepStrictEqual(ds[0].slice(1, 3), [1200, 1200]); assert.deepStrictEqual(ds[1].slice(1, 3), [1600, 1000]);
  assert.deepStrictEqual(ds[2].slice(1, 3), [3000, 2000], 'SVG rasterised at 3000 px with its viewBox ratio');
  assert.strictEqual(await page.locator('#designs li').count(), 3);
  ok('PNG (alpha), JPG and SVG loaded by file picker; demos replaced; SVG keeps its 3:2 viewBox at 3000 px');
  // drag & drop and paste (synthetic DataTransfer with a real PNG)
  const png = fs.readFileSync(path.join(fx, 'logo-alpha.png')).toString('base64');
  await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), f = new File([bin], 'dropped.png', { type: 'image/png' }), dt = new DataTransfer(); dt.items.add(f);
    document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, png);
  await page.waitForFunction(() => MA.state.designs.length === 4);
  await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), f = new File([bin], 'pasted.png', { type: 'image/png' }), dt = new DataTransfer(); dt.items.add(f);
    document.body.focus(); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, png);
  await page.waitForFunction(() => MA.state.designs.length === 5);
  await page.locator('#designs li').nth(4).locator('.x').click(); await page.locator('#designs li').nth(3).locator('.x').click();
  assert.strictEqual(await page.evaluate(() => MA.state.designs.length), 3);
  ok('drag-and-drop and Ctrl+V paste add designs; remove buttons work');
  // bad file
  await page.setInputFiles('#fileInput', { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a png') });
  await page.waitForFunction(() => /broken\.png/.test(document.getElementById('toast').textContent));
  assert.strictEqual(await page.evaluate(() => MA.state.designs.length), 3);
  ok('unreadable file → message, designs untouched');
  // use demos again for nice screenshots later? keep user designs for scene checks, switch to demos for README shots
  // ---------------------------------------------------------------- every scene
  for (const id of SCENES) {
    await rendered(page, async () => { await page.locator(`#scenes button[data-scene="${id}"]`).click(); await page.evaluate(() => MA.draw()); });
    const st = await canvasStats(page);
    assert(st.std > 8 && st.colours > 30, `${id} looks blank: ${JSON.stringify(st)}`);
    const nSlots = await page.locator('#slots .slot').count(), exp = await page.evaluate(() => SCENES.byId[MA.state.s.scene].slots(MA.state.so[MA.state.s.scene]).length);
    assert.strictEqual(nSlots, exp);
    assert.strictEqual(await page.locator(`#scenes button[data-scene="${id}"]`).getAttribute('aria-checked'), 'true');
  }
  ok('all 11 scenes render (non-blank, varied colours) with the right slot controls');
  // scene options through the generated controls
  await rendered(page, () => page.locator('#scenes button[data-scene="book"]').click());
  await rendered(page, () => page.selectOption('#o-pose', 'lying'));
  await rendered(page, () => page.fill('#o-spine', 'MON LIVRE'));
  assert.deepStrictEqual(await page.evaluate(() => [MA.state.so.book.pose, MA.state.so.book.spine]), ['lying', 'MON LIVRE']);
  await rendered(page, () => page.locator('#scenes button[data-scene="box"]').click());
  await rendered(page, () => page.selectOption('#o-finish', 'kraft'));
  await rendered(page, () => page.locator('#o-bw').fill('260'));
  assert.deepStrictEqual(await page.evaluate(() => [MA.state.so.box.finish, MA.state.so.box.bw]), ['kraft', 260]);
  // slot assignment: side of the box gets design 3, rotated
  await rendered(page, () => page.locator('#slots .slot').nth(1).locator('select').first().selectOption('d2'));
  await rendered(page, () => page.locator('#slots .slot').nth(1).locator('select').nth(2).selectOption('90'));
  assert.deepStrictEqual(await page.evaluate(() => MA.state.slots.box[1]), { src: 'd2', fit: null, rot: 90 });
  await rendered(page, () => page.locator('#scenes button[data-scene="flyer"]').click());
  assert.strictEqual(await page.locator('#slots .slot').count(), 2);
  await rendered(page, () => page.locator('#o-second').uncheck());
  assert.strictEqual(await page.locator('#slots .slot').count(), 1);
  await rendered(page, () => page.locator('#o-second').check());
  ok('scene options (select, text, range, checkbox) and slot source / rotation are applied; slot list follows options');

  // ---------------------------------------------------------------- free perspective
  await rendered(page, () => page.locator('#scenes button[data-scene="poster"]').click());
  await rendered(page, () => page.click('#freeBtn'));
  assert.strictEqual(await page.getAttribute('#freeBtn', 'aria-pressed'), 'true');
  const handle = async (i) => page.evaluate((i) => { const g = MA.state.geo, c = document.getElementById('view'), r = c.getBoundingClientRect(), p = g.P[i]; return [r.left + (p[0] * g.k + g.ox) / c.width * r.width, r.top + (p[1] * g.k + g.oy) / c.height * r.height]; }, i);
  const [hx, hy] = await handle(2), before = await page.evaluate(() => MA.state.geo.P[2].slice());
  await page.mouse.move(hx, hy); await page.mouse.down(); await page.mouse.move(hx + 30, hy + 20, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => MA.state.pts.poster[2]), k = await page.evaluate(() => { const g = MA.state.geo, c = document.getElementById('view'); return g.k * c.getBoundingClientRect().width / c.width; });
  assert(Math.abs((after[0] - before[0]) * k - 30) < 2 && Math.abs((after[1] - before[1]) * k - 20) < 2, `drag moved ${after} from ${before}`);
  assert(/pts=/.test(await page.evaluate(() => location.hash)));
  assert(await page.isVisible('#editedTag'));
  ok('mouse drag of a corner handle moves it by exactly the pointer delta; hash stores the points');
  await page.focus('#viewer'); await page.keyboard.press(']'); await page.keyboard.press('Shift+ArrowRight');
  const kb = await page.evaluate(() => [MA.state.sel, MA.state.pts.poster[3][0] - MA.state.geo.built.pts[3][0]]);
  assert.strictEqual(kb[0], 3); assert(Math.abs(kb[1] - 10) < 0.11);
  ok('keyboard: ] selects the next corner, Shift+→ moves it 10 units');
  const stFree = await canvasStats(page); assert(stFree.std > 8);
  if (tag === 'desktop') await page.locator('#viewer').screenshot({ path: path.join(shots, 'free-perspective.png') });
  await rendered(page, () => page.locator('#s-yaw').fill('20'));
  assert.strictEqual(await page.evaluate(() => MA.state.pts.poster), null);
  ok('changing the camera resets hand-moved corners (with a message)');
  await rendered(page, () => page.click('#freeBtn'));
  // libre scene: drag a corner on a background photo
  await rendered(page, () => page.locator('#scenes button[data-scene="libre"]').click());
  assert(await page.isVisible('#photoBox'));
  await rendered(page, () => page.setInputFiles('#photoInput', path.join(fx, 'landscape.jpg')));
  await page.waitForFunction(() => !!MA.state.bgPhoto);
  await rendered(page, () => page.evaluate(() => { MA.setFree(true); MA.movePoint(0, [300, 120]); }));
  assert.deepStrictEqual(await page.evaluate(() => MA.state.pts.libre[0]), [300, 120]);
  await rendered(page, () => page.evaluate(() => MA.setFree(false)));
  ok('free-perspective scene: own background photo + programmatic corner move');

  // ---------------------------------------------------------------- themes, backgrounds, languages
  await rendered(page, () => page.locator('#scenes button[data-scene="cards"]').click());
  await rendered(page, () => page.locator('#themes button[data-theme="nuit"]').click());
  assert.deepStrictEqual(await page.evaluate(() => [MA.state.s.theme, MA.state.s.bg1]), ['nuit', '#2f3445']);
  await rendered(page, () => page.locator('[data-set="accent"]').fill('#00aa88'));
  assert.strictEqual(await page.evaluate(() => MA.state.s.theme), 'custom');
  for (const m of ['solid', 'gradient', 'none', 'scene']) { await rendered(page, () => page.selectOption('#s-bgMode', m)); assert.strictEqual(await page.evaluate(() => MA.state.s.bgMode), m); }
  for (const d of ['leaves', 'blinds', 'none']) await rendered(page, () => page.selectOption('#s-deco', d));
  await rendered(page, () => page.locator('#themes button[data-theme="lin"]').click());
  ok('colour themes, custom colour → "custom", 4 background modes, decorative shadows');
  await page.selectOption('#lang', 'en');
  assert.strictEqual(await page.textContent('#scenes button[data-scene="cards"] span'), 'Business cards');
  assert.strictEqual(await page.evaluate(() => document.documentElement.lang), 'en');
  await page.selectOption('#lang', 'kab');
  assert(await page.isVisible('#tfngWrap'));
  assert.strictEqual(await page.textContent('#scenes button[data-scene="phone"] span'), 'Tilifun');
  await page.check('#tfng');
  assert(/[\u2D30-\u2D7F]/.test(await page.textContent('#scenes button[data-scene="phone"] span')));
  assert.strictEqual(await page.evaluate(() => document.documentElement.lang), 'kab-Tfng');
  if (tag === 'desktop') await page.screenshot({ path: path.join(shots, 'tifinagh.png') });
  await page.uncheck('#tfng'); await page.selectOption('#lang', 'fr');
  assert.strictEqual(await page.textContent('#scenes button[data-scene="cards"] span'), 'Cartes de visite');
  await page.click('#helpBtn'); assert(await page.isVisible('#helpDlg')); await page.keyboard.press('Escape');
  ok('languages FR / EN / Taqbaylit (+ Tifinagh), help dialog');

  // ---------------------------------------------------------------- exports
  if (tag === 'desktop') {
    await page.selectOption('#s-exportSize', '3840');
    const t0 = Date.now();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exPng')]);
    const f = path.join(root, 'test-results', 'export.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); await dl.saveAs(f);
    const b = fs.readFileSync(f); assert.deepStrictEqual(pngSize(b), [3840, 2880]); assert(b.length > 200000, 'png size ' + b.length);
    assert.strictEqual(dl.suggestedFilename(), 'maquette-cards-3840x2880.png');
    ok(`4K PNG export: 3840 × 2880, ${(b.length / 1e6).toFixed(1)} MB, ${Date.now() - t0} ms`);
    for (const id of SCENES) { // every scene exports at 4K without errors and with real content
      const r = await page.evaluate(async (id) => { MA.setScene(id); const e = await MA.renderExport('png'); const bm = await createImageBitmap(e.blob); const c = new OffscreenCanvas(64, 48), x = c.getContext('2d'); x.drawImage(bm, 0, 0, 64, 48); const d = x.getImageData(0, 0, 64, 48).data; let s = 0, s2 = 0; for (let i = 0; i < d.length; i += 4) { s += d[i]; s2 += d[i] * d[i]; } const n = d.length / 4; return { w: bm.width, h: bm.height, size: e.blob.size, std: Math.sqrt(s2 / n - (s / n) ** 2), backend: e.backend }; }, id);
      assert.deepStrictEqual([r.w, r.h], [3840, 2880], id); assert(r.std > 6 && r.size > 100000, id + ' ' + JSON.stringify(r)); assert.strictEqual(r.backend, 'webgl');
    }
    ok('all 11 scenes export at 3840 × 2880 with content (WebGL warp at 4K)');
    await page.check('#transparent');
    const alpha = await page.evaluate(async () => { MA.setScene('phone'); const e = await MA.renderExport('png'); const bm = await createImageBitmap(e.blob); const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bm, 0, 0); const at = (px, py) => x.getImageData(px, py, 1, 1).data[3]; return [at(5, 5), at(bm.width / 2, bm.height / 2), bm.width]; });
    assert.strictEqual(alpha[0], 0, 'corner transparent'); assert.strictEqual(alpha[1], 255, 'phone opaque'); assert.strictEqual(alpha[2], 3840);
    await page.uncheck('#transparent');
    ok('transparent PNG: background alpha 0, object alpha 255');
    await page.selectOption('#s-exportSize', '1920'); await page.selectOption('#s-aspect', '4:5');
    const [dj] = await Promise.all([page.waitForEvent('download'), page.click('#exJpg')]);
    const fj = path.join(root, 'test-results', 'export.jpg'); await dj.saveAs(fj);
    assert.deepStrictEqual(jpgSize(fs.readFileSync(fj)), [1536, 1920]);
    await page.selectOption('#s-aspect', '4:3');
    ok('JPG export 4:5 portrait: 1536 × 1920');
    const [dJ] = await Promise.all([page.waitForEvent('download'), page.click('#exJson')]);
    const fJ = path.join(root, 'test-results', 'settings.json'); await dJ.saveAs(fJ);
    const J = JSON.parse(fs.readFileSync(fJ, 'utf8')); assert.strictEqual(J.app, 'maquette-atelier'); assert.strictEqual(J.sceneOptions.box.finish, 'kraft');
    assert(!JSON.stringify(J).includes('data:image'), 'no image data in JSON');
    await page.evaluate(() => { MA.setScene('tote'); });
    await page.setInputFiles('#jsonInput', fJ);
    await page.waitForFunction(() => MA.state.s.scene === 'phone' && MA.state.so.box.finish === 'kraft');
    ok('settings JSON export (no image data) and import');
  }

  // ---------------------------------------------------------------- URL hash restore
  await rendered(page, () => page.evaluate(() => { MA.setScene('laptop'); MA.setOpt('open', 120); MA.setFree(true); MA.movePoint(4, [300, 100]); MA.setFree(false); MA.updateHash(); }));
  const hash = await page.evaluate(() => location.hash);
  assert(/sc=laptop/.test(hash) && /o\.open=120/.test(hash) && /pts=/.test(hash));
  const p2 = await ctx.newPage(); const err2 = []; p2.on('pageerror', (e) => err2.push(e.message));
  await p2.goto(base + hash); await p2.waitForFunction(() => document.body.dataset.ready === '1' && +document.body.dataset.renders > 0);
  assert.deepStrictEqual(await p2.evaluate(() => [MA.state.s.scene, MA.state.so.laptop.open, MA.state.pts.laptop[4]]), ['laptop', 120, [300, 100]]);
  assert.deepStrictEqual(err2, []); await p2.close();
  ok('shared link restores scene, scene options and moved corners');

  // ---------------------------------------------------------------- layout
  if (tag === 'mobile') {
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(ov <= 0, 'horizontal overflow ' + ov);
    ok('no horizontal overflow at 390 px');
  }
  assert.deepStrictEqual(errors, [], 'console errors');
  ok('no console errors or warnings');
  await ctx.close();
}

/** README screenshots with the demo designs. */
async function screenshots(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base); await page.waitForFunction(() => document.body.dataset.ready === '1' && +document.body.dataset.renders > 0);
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, 'desktop.png') });
  const shot = async (name, fn) => { await rendered(page, fn); await page.waitForTimeout(80); await page.locator('#view').screenshot({ path: path.join(shots, name + '.png') }); };
  await shot('cards', () => page.evaluate(() => MA.setScene('cards')));
  await shot('book', () => page.evaluate(() => MA.setScene('book')));
  await shot('box', () => page.evaluate(() => { MA.setScene('box'); }));
  await shot('phone', () => page.evaluate(() => { MA.setScene('phone'); }));
  await shot('laptop', () => page.evaluate(() => { MA.setScene('laptop'); }));
  await shot('flyer-leaves', () => page.evaluate(() => { MA.setScene('flyer'); document.getElementById('s-deco').value = 'leaves'; document.getElementById('s-deco').dispatchEvent(new Event('change')); }));
  await page.evaluate(() => { const s = document.getElementById('s-deco'); s.value = 'none'; s.dispatchEvent(new Event('change')); });
  await shot('billboard-night', () => page.evaluate(() => { MA.setScene('billboard'); MA.setOpt('time', 'night'); }));
  await shot('tote', () => page.evaluate(() => { MA.setScene('tote'); }));
  await shot('social', () => page.evaluate(() => { MA.setScene('social'); }));
  await shot('poster', () => page.evaluate(() => { MA.setScene('poster'); }));
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await m.newPage(); await mp.goto(base); await mp.waitForFunction(() => document.body.dataset.ready === '1' && +document.body.dataset.renders > 0);
  await mp.evaluate(() => { document.documentElement.dataset.theme = 'dark'; MA.setScene('phone'); }); await mp.waitForTimeout(400);
  await mp.screenshot({ path: path.join(shots, 'mobile.png') });
  await m.close();
}

/** WebGL vs Canvas-2D fallback: the same scene must agree pixel-wise (mean abs difference on luminance). */
async function fallbackAgreement(browser, base) {
  const grab = async (q) => {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(base + q + '#sc=cards&gr=0&dc=none'); await p.waitForFunction(() => document.body.dataset.ready === '1' && +document.body.dataset.renders > 0);
    const r = await p.evaluate(async () => { const e = await MA.renderExport('png'); const bm = await createImageBitmap(e.blob); const c = new OffscreenCanvas(400, 300), x = c.getContext('2d'); x.drawImage(bm, 0, 0, 400, 300); return { backend: e.backend, px: Array.from(x.getImageData(0, 0, 400, 300).data) }; });
    assert.deepStrictEqual(errs, []); await ctx.close(); return r;
  };
  const a = await grab(''), b = await grab('?gl=0');
  assert.strictEqual(a.backend, 'webgl'); assert.strictEqual(b.backend, 'canvas');
  let d = 0, n = 0; for (let i = 0; i < a.px.length; i += 4) { d += Math.abs((a.px[i] + a.px[i + 1] + a.px[i + 2]) - (b.px[i] + b.px[i + 1] + b.px[i + 2])) / 3; n++; }
  const mad = d / n; assert(mad < 2.5, 'mean abs diff ' + mad);
  ok(`Canvas-2D triangle fallback agrees with WebGL (mean |Δ| = ${mad.toFixed(2)} / 255)`);
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const exe = ['/usr/bin/google-chrome', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let code = 0;
  try {
    fs.mkdirSync(shots, { recursive: true });
    console.log('desktop 1440 × 900'); await run(browser, base, { width: 1440, height: 900 }, 'desktop');
    console.log('mobile 390 × 844'); await run(browser, base, { width: 390, height: 844 }, 'mobile');
    console.log('renderers'); await fallbackAgreement(browser, base);
    console.log('screenshots'); await screenshots(browser, base); ok('README screenshots written');
    console.log(`\n${checks} UI checks passed`);
  } catch (e) { console.error('\n✗ ' + (e.stack || e)); code = 1; }
  await browser.close(); server.close(); process.exit(code);
})();
