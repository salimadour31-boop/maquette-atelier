// Node unit tests (no browser): node tests/geometry.test.js
// Homography maths (corner mapping, inverse, projective consistency with the 3D camera), convex hull, uv paths,
// settings validation + URL-hash round trip, scene option validation and every scene's default geometry.
const assert = require('assert'), path = require('path');
const W = require(path.join(__dirname, '../js/warp.js'));
const M = require(path.join(__dirname, '../js/settings.js'));
const SC = require(path.join(__dirname, '../js/scenes.js')).SCENES;
let n = 0; const ok = (m) => { n++; console.log('  ✓ ' + m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// --- homography
const quads = [[[10, 20], [200, 40], [180, 300], [30, 260]], [[0, 0], [100, 0], [100, 50], [0, 50]], [[400, 10], [900, 120], [870, 700], [380, 640]]];
for (const q of quads) {
  const H = W.squareToQuad(q), Hi = W.invert(H);
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => { const p = W.apply(H, u, v); assert(near(p[0], q[i][0], 1e-6) && near(p[1], q[i][1], 1e-6)); });
  for (let k = 0; k < 50; k++) { const u = Math.random(), v = Math.random(), p = W.apply(H, u, v), b = W.apply(Hi, p[0], p[1]); assert(near(b[0], u, 1e-7) && near(b[1], v, 1e-7)); }
}
ok('square → quad homography hits the 4 corners; inverse round-trips 150 random points');
// lines stay lines (projective map): three collinear uv points stay collinear
{ const H = W.squareToQuad(quads[2]); const a = W.apply(H, 0.1, 0.2), b = W.apply(H, 0.5, 0.5), c = W.apply(H, 0.9, 0.8); const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); assert(Math.abs(cr) < 1e-6); }
ok('straight lines stay straight');
// perspective, not affine: the centre of a receding quad is NOT the average of its corners
{ const q = quads[2], H = W.squareToQuad(q), c = W.apply(H, 0.5, 0.5), avg = [q.reduce((s, p) => s + p[0], 0) / 4, q.reduce((s, p) => s + p[1], 0) / 4]; assert(Math.hypot(c[0] - avg[0], c[1] - avg[1]) > 1); }
ok('true perspective: uv centre ≠ corner average for a receding quad');
// projective consistency with the pinhole camera: H(u,v) == camera projection of the 3D point
{
  const cam = SC.camera({ yaw: -30, pitch: 12, dist: 2400, fov: 32, target: [0, 0, 1500] }), w = 500, h = 700, z = 1500;
  const q = [cam.proj([-w / 2, 0, z + h / 2]), cam.proj([w / 2, 0, z + h / 2]), cam.proj([w / 2, 0, z - h / 2]), cam.proj([-w / 2, 0, z - h / 2])], H = W.squareToQuad(q);
  let worst = 0;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { const u = i / 10, v = j / 10, a = W.apply(H, u, v), b = cam.proj([-w / 2 + u * w, 0, z + h / 2 - v * h]); worst = Math.max(worst, Math.hypot(a[0] - b[0], a[1] - b[1])); }
  assert(worst < 1e-6, 'max error ' + worst);
}
ok('homography of 4 projected corners reproduces the 3D camera projection exactly (121 points)');
assert(W.isConvex(quads[0]) && !W.isConvex([[0, 0], [10, 10], [10, 0], [0, 10]]));
ok('convexity test (bow-tie rejected)');
{ const h = W.hull([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [2, 8]]); assert.strictEqual(h.length, 4); }
ok('convex hull');
{ const rr = W.roundRectUV(0, 0, 1, 1, 0.1, 0.2, 6); assert.strictEqual(rr.length, 28); assert(rr.every(([u, v]) => u >= -1e-9 && u <= 1 + 1e-9 && v >= -1e-9 && v <= 1 + 1e-9)); }
ok('rounded rectangle in uv space');

// --- settings
{
  const s = M.normalize({ zoom: 999, yaw: -99, scene: 'nope', bg1: 'zz', ink: '0', aspect: '16:9' });
  assert.strictEqual(s.zoom, 170); assert.strictEqual(s.yaw, -45); assert.strictEqual(s.scene, 'poster'); assert.strictEqual(s.bg1, M.DEFAULTS.bg1); assert.strictEqual(s.ink, false); assert.strictEqual(s.aspect, '16:9');
  const t = M.applyTheme(M.DEFAULTS, 'nuit'); assert.strictEqual(t.bg1, M.THEMES.nuit.bg1); assert.strictEqual(t.theme, 'nuit');
}
ok('settings validation (clamping, enums, colours, booleans) and themes');
{
  const s = { ...M.DEFAULTS, scene: 'box', yaw: 12, light: 40, paper: '#abcdef', deco: 'leaves' };
  const pts = [[1, 2], [3.5, -4], [100.25, 50]], slots = [{ src: 'd2', fit: 'contain', rot: 90 }, { src: 'auto', fit: null, rot: 0 }];
  const h = M.toHash(s, { bw: 200, finish: 'kraft' }, pts, slots, { lang: 'kab' }), r = M.fromHash('#' + h);
  assert.deepStrictEqual(r.settings, M.normalize(s)); assert.deepStrictEqual(r.so, { bw: '200', finish: 'kraft' }); assert.strictEqual(r.extra.lang, 'kab');
  assert.deepStrictEqual(r.pts, [[1, 2], [3.5, -4], [100.3, 50]]); assert.deepStrictEqual(r.slots, slots);
  assert.strictEqual(M.toHash(M.DEFAULTS), '');
  assert.strictEqual(M.normPts([[1, 2]], 2), null); assert.strictEqual(M.normPts([[NaN, 2], [1, 1]]), null);
}
ok('URL hash round trip (settings, scene options, points, slots, language); defaults → empty hash; bad points rejected');

// --- scenes
assert.strictEqual(SC.list.length, 11);
for (const sc of SC.list) {
  const o = SC.defaults(sc.id);
  for (const variant of [o, ...sc.opts.filter((op) => op.type === 'select').flatMap((op) => op.choices.map((c) => ({ ...o, [op.key]: c })))]) {
    for (const cam of [[0, 0], [-45, -30], [45, 30]]) {
      const b = sc.build(SC.normOpts(sc.id, variant), { ...M.DEFAULTS, scene: sc.id, yaw: cam[0], pitch: cam[1] });
      assert(b.pts.length >= 4 && b.pts.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])), sc.id + ' pts');
      assert(b.focus.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])), sc.id + ' focus');
      for (const q of b.quads || [[0, 1, 2, 3]]) { assert(q.every((i) => i < b.pts.length)); assert(W.isConvex(q.map((i) => b.pts[i])), sc.id + ' convex ' + JSON.stringify(variant) + cam); }
      const slots = sc.slots(variant); assert(slots.length >= 1 && slots.length <= 3);
    }
  }
}
ok('11 scenes × every select option × 3 camera angles: finite points, convex faces, 1–3 slots');
{
  const o = SC.normOpts('box', { bw: 9999, bd: 'x', finish: 'velvet', zzz: 1 }); assert.deepStrictEqual(o, { bw: 320, bd: 90, bh: 210, finish: 'matte' });
  const t = SC.normOpts('book', { spine: '<b>x</b>'.repeat(20) }); assert(!/[<>]/.test(t.spine) && t.spine.length <= 40);
}
ok('scene options validation (ranges, choices, unknown keys, sanitised text)');
// box faces share their edges (a closed solid)
{ const b = SC.byId.box.build(SC.defaults('box'), { ...M.DEFAULTS, scene: 'box' }); const [front, side, top] = b.quads; assert(front.includes(1) && side.includes(1) && top.includes(1)); }
ok('box: front, side and top faces share the front-top-right corner');
console.log(`\n${n} geometry checks passed`);
