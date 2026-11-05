// =====================================================================================================
// 014 Chorus (new faces)
// Fork of 012 (the living ensemble) with the heads rebuilt on the algorithmic profile generator from
// sketch 013 (shared/profiles.js): proportionally correct, endlessly varied faces (children,
// feminine, masculine, elder and in between), whose jaws swing open around the hinge to sing.
// Rows are cut from each head's true outline. Each scene draws in one of three line styles: bands
// (rows with arrow tips), engrave (rows that swell and thin with shading) or echo (the outline
// repeated, shrinking toward the ear). Hair comes swept back, falling behind the ear, or cropped.
//
// 012 notes: faces join and leave with the music, scenes change often, the background changes on
// its own, and a major change in the music resets everything.
//
// A choir of profiles built from the same stacked bands, arrow tips, drop shadows and woven strands
// as Disentanglemation. Each singer is a voice in the music: large singers take the low frequencies
// and small ones the high, so their mouths open and close with their part of the spectrum, eyes
// closed while they sing. Breath leaves each mouth as threads that rise and braid into one rope
// across the sky, or, when two groups face each other, meet in a knot between them.
//
// The emotional arc follows the music: in a crescendo heads lift and waiting voices join; when it
// drops, heads bow, mouths close and the threads sag. When it comes back, a new scene begins.
// Scenes also change every few phrases: a row of singers, a duet, a soloist with a small audience,
// with rarer twists (one singer turned away, silent, eyes open; a unison of one color).
//
// Keys: F fullscreen, H hide controls, M meter, P low-res, N next scene, B new background, Space pause.
// =====================================================================================================

// ---------------------------------------------------------------------------------------------------
// Small helpers: seeded randomness and color
// ---------------------------------------------------------------------------------------------------
function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let R = makeRng(1);
const rnd = (a = 1, b) => (b === undefined ? R() * a : a + R() * (b - a));
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const chance = (p) => R() < p;
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const sign = () => (R() < 0.5 ? -1 : 1);
function weighted(items, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let x = R() * total;
  for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
  return items[items.length - 1];
}
// The original's "unlabeled variable": a random value with an adjustable bias toward the low end.
const skewed = (lo, hi, power) => (lo === hi ? lo : Math.pow(rnd(lo, hi) / hi, power) * hi);

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrapHue = (h) => ((h % 360) + 360) % 360;

function hsbRgb(h, s, b) {
  h = wrapHue(h); s = clamp01(s / 100); b = clamp01(b / 100);
  const f = (n) => { const k = (n + h / 60) % 6; return b - b * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return `${Math.round(f(5) * 255)},${Math.round(f(3) * 255)},${Math.round(f(1) * 255)}`;
}
const rgba = (rgb, a) => `rgba(${rgb},${a})`;

// ---------------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------------
let cast = null;          // the current scene: arrangement, palette, singers
let castSeed = 1;
let beatsInPhrase = 0;
let lowRes = false;
let paused = false;
let started = false;      // a source has been chosen
let clock = 0;            // seconds of animation (stops while paused)
let bands = new Array(12).fill(0);
let bassAbs = 0;
let rosterCool = 0;       // seconds until the ensemble can grow or shrink again

const mood = { fast: null, slow: null, swell: 0, swellSlow: 0, tilt: 0, hush: 0, hushWas: 0, level: 0, n: 0 };
const beat = { avg: 0, last: 0, accent: 0 };
// Changes in the sound itself: the spectrum's shape (novelty) and its brightness (centroid).
const change = { short: null, long: null, novelty: 0, cool: 6, majorCool: 15, centFast: null, centSlow: null, bgCool: 4 };
const CHANGE_AT = 0.2;    // novelty that adds or removes a face
const MAJOR_AT = 0.52;    // novelty that resets the whole scene
const BRIGHT_SHIFT = 0.3; // centroid shift (in bands) that changes the background

// ---------------------------------------------------------------------------------------------------
// Scenes and the ensemble
// ---------------------------------------------------------------------------------------------------
function newCast(seed) {
  castSeed = seed || ((Math.random() * 4294967296) >>> 0);
  R = makeRng(castSeed);
  const W = width, H = height;
  const Hh = Math.min(H, W * 1.25);
  const tall = W < H;

  const c = {
    arrangement: weighted(['row', 'duet', 'solo'], [45, 35, 20]),
    phraseLen: weighted([4, 6, 8, 12], [20, 35, 30, 15]),
    singers: [],
  };
  // Palette, after the original's: hue centered on red-magenta, rarely green.
  c.rootHue = wrapHue((sign() * skewed(0, 180, 1.25)) - 45);
  c.hueStep = sign() * skewed(4, 30, 1.5);
  c.unison = chance(0.1);
  c.lineSat = rnd(82, 100);
  c.lineBri = rnd(88, 100);
  c.lineStyle = weighted(['bands', 'engrave', 'echo'], [50, 30, 20]);
  c.minN = c.arrangement === 'duet' ? 2 : 1;
  c.maxN = tall ? 3 : 7;

  if (c.arrangement === 'row') {
    let n = weighted([1, 2, 3, 4, 5], [10, 25, 30, 22, 13]);
    if (tall) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.3 : i / (n - 1);
      c.singers.push(makeSinger(c, W * (0.1 + 0.72 * u + rnd(-0.04, 0.04)), Hh * rnd(0.42, 0.85), 1));
    }
    if (chance(0.18) && n > 2) { const s = pick(c.singers); s.dir = -1; s.silent = true; }
  } else if (c.arrangement === 'duet') {
    const nl = weighted([1, 2], [65, 35]), nr = weighted([1, 2], [65, 35]);
    for (let i = 0; i < nl; i++) c.singers.push(makeSinger(c, W * (0.07 + 0.22 * (nl === 1 ? 0.6 : i / (nl - 1)) + rnd(-0.03, 0.03)), Hh * rnd(0.5, 0.9), 1, { side: 'L' }));
    for (let i = 0; i < nr; i++) c.singers.push(makeSinger(c, W * (0.93 - 0.22 * (nr === 1 ? 0.6 : i / (nr - 1)) + rnd(-0.03, 0.03)), Hh * rnd(0.5, 0.9), -1, { side: 'R' }));
  } else { // solo
    c.singers.push(makeSinger(c, W * rnd(0.16, 0.36), Hh * rnd(0.95, 1.15), 1, { join: 0, soloist: true }));
    if (chance(0.5)) {
      const n = rndInt(1, 3);
      for (let i = 0; i < n; i++) {
        const listen = chance(0.6);
        c.singers.push(makeSinger(c, W * (0.62 + 0.32 * (n === 1 ? 0.5 : i / (n - 1)) + rnd(-0.02, 0.02)), Hh * rnd(0.2, 0.34), -1,
          { silent: listen, join: listen ? 0 : rnd(0.2, 0.5) }));
      }
    }
  }
  c.baseCount = c.singers.length;
  for (const s of c.singers) { s.fade = 0.45; s.life = 'enter'; } // a new scene rises into view
  finishRoster(c);
  cast = c;
  beatsInPhrase = 0;
  newDetail();
}

function makeSinger(c, x, h, dir, extra = {}) {
  const H = height;
  const s = {
    x, h, dir, y: H - h * rnd(0.86, 0.96),
    head: Profiles.make(R),
    slot: rndInt(0, 6), hueOffset: 0, join: chance(0.3) ? rnd(0.15, 0.55) : 0, silent: false,
    tiltGain: rnd(0.6, 1.25), baseTilt: rnd(-3, 3), alpha: 1, band: 0,
    hair: null,
    e: 0, avg: 0.2, open: 0, eye: 0, tilt: 0, fade: 0, life: 'enter',
    ...extra,
  };
  const kind = s.head.kind;
  if (kind === 'child') { s.h *= 0.82; s.y = H - s.h * rnd(0.86, 0.96); }
  s.x = x + dir * 0.43 * s.h; // scenes place a singer by the middle of the head; s.x is the brow
  if (chance({ child: 0.8, fem: 0.92, masc: 0.6, elder: 0.55, adult: 0.75 }[kind])) {
    const type = pickHair(kind, R());
    s.hair = {
      type, len: kind === 'masc' ? rnd(0.32, 0.6) : kind === 'child' ? rnd(0.3, 0.8) : rnd(0.35, 1.3),
      width: rnd(0.0035, 0.008), sweep: rnd(0, 0.1), chaos: rnd(0.2, 1), seeds: [],
    };
    s.hair.strands = Math.floor(rnd(30, 70) * (type === 'crop' ? 2.2 : 1));
    for (let i = 0; i < s.hair.strands; i++) s.hair.seeds.push([rnd(-1, 1), rnd(-1, 1), rnd(0.35, 1), rnd(0, 6.28), rnd(-1, 1)]);
  }
  s.rowHue = new Float32Array(400);
  s.yNow = s.y; s.alphaNow = 0;
  return s;
}

// Voices by size (bigger singers lower), colors by slot, softer and further back when smaller.
function finishRoster(c) {
  const live = c.singers.filter((s) => s.life !== 'leave');
  const bySize = [...live].sort((a, b) => b.h - a.h);
  bySize.forEach((s, i) => {
    s.band = Math.round((bySize.length === 1 ? 0.2 : i / (bySize.length - 1)) * 9);
  });
  for (const s of c.singers) s.hueOffset = c.unison ? 0 : (s.slot - 3) * c.hueStep;
  c.singers.sort((a, b) => a.h - b.h); // draw small (far) first
  const hMax = Math.max(...c.singers.map((s) => s.h));
  for (const s of c.singers) s.alpha = 0.55 + 0.45 * Math.pow(s.h / hMax, 0.8);
}

// Where a new face goes: the widest gap in its part of the stage.
function widestGap(xs, lo, hi) {
  const pts = [lo, ...xs.filter((x) => x > lo && x < hi).sort((a, b) => a - b), hi];
  let best = 0, at = (lo + hi) / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const g = pts[i + 1] - pts[i];
    if (g > best) { best = g; at = (pts[i] + pts[i + 1]) / 2; }
  }
  return at + (R() - 0.5) * best * 0.3;
}

function addSinger() {
  const c = cast;
  const live = c.singers.filter((s) => s.life !== 'leave');
  if (live.length >= c.maxN) return false;
  R = makeRng((Math.random() * 4294967296) >>> 0);
  const W = width, H = height, Hh = Math.min(H, W * 1.25);
  let s;
  if (c.arrangement === 'row') {
    const x = widestGap(live.map((q) => q.x), W * 0.06, W * 0.92);
    s = makeSinger(c, x, Hh * rnd(0.38, 0.85), 1);
    if (chance(0.12) && live.length > 1) { s.dir = -1; s.silent = true; }
  } else if (c.arrangement === 'duet') {
    const nl = live.filter((q) => q.side === 'L').length, nr = live.filter((q) => q.side === 'R').length;
    const side = nl === nr ? (chance(0.5) ? 'L' : 'R') : (nl < nr ? 'L' : 'R');
    const [lo, hi] = side === 'L' ? [W * 0.04, W * 0.36] : [W * 0.64, W * 0.96];
    s = makeSinger(c, widestGap(live.filter((q) => q.side === side).map((q) => q.x), lo, hi), Hh * rnd(0.45, 0.9), side === 'L' ? 1 : -1, { side });
  } else {
    const listen = chance(0.5);
    s = makeSinger(c, widestGap(live.filter((q) => !q.soloist).map((q) => q.x), W * 0.56, W * 0.97), Hh * rnd(0.18, 0.36), -1,
      { silent: listen, join: listen ? 0 : rnd(0.1, 0.4) });
  }
  const r = makeRng((Math.random() * 4294967296) >>> 0);
  fillRowHues(s, r);
  c.singers.push(s);
  finishRoster(c);
  return true;
}

function removeSinger() {
  const c = cast;
  const live = c.singers.filter((s) => s.life !== 'leave' && !s.soloist);
  if (c.singers.filter((s) => s.life !== 'leave').length <= c.minN || !live.length) return false;
  if (c.arrangement === 'duet') { // keep at least one singer on each side
    for (const side of ['L', 'R']) {
      if (live.filter((q) => q.side === side).length <= 1) {
        for (let i = live.length - 1; i >= 0; i--) if (live[i].side === side) live.splice(i, 1);
      }
    }
    if (!live.length) return false;
  }
  // the quiet ones leave first
  live.sort((a, b) => (a.singing ? 1 : 0) - (b.singing ? 1 : 0) || a.e - b.e);
  const s = live[Math.min(live.length - 1, Math.floor(Math.random() * Math.min(2, live.length)))];
  s.life = 'leave';
  finishRoster(c);
  return true;
}

// Every frame: faces rise in and sink away; the ensemble follows the music's swell.
function updateRoster(dt) {
  const c = cast;
  for (const s of c.singers) {
    if (s.life === 'enter') { s.fade = Math.min(1, s.fade + dt / 0.7); if (s.fade >= 1) s.life = 'live'; }
    else if (s.life === 'leave') s.fade -= dt / 0.7;
  }
  if (c.singers.some((s) => s.life === 'leave' && s.fade <= 0)) {
    c.singers = c.singers.filter((s) => !(s.life === 'leave' && s.fade <= 0));
  }
  for (const s of c.singers) {
    const f = smooth01(s.fade);
    s.yNow = s.y + (1 - f) * 0.35 * s.h;
    s.alphaNow = s.alpha * f;
  }
  rosterCool -= dt;
  if (!started || rosterCool > 0) return;
  const live = c.singers.filter((s) => s.life !== 'leave').length;
  const target = Math.max(c.minN, Math.min(c.maxN, Math.round(c.baseCount + mood.swellSlow * 2.5)));
  if (live < target ? addSinger() : live > target ? removeSinger() : false) rosterCool = rnd(1.5, 3);
}

// A noticeable change in the sound: someone joins or someone leaves.
function onMusicChange() {
  const grow = mood.swell > 0.2 ? 0.75 : mood.swell < -0.2 ? 0.25 : 0.5;
  if (Math.random() < grow ? addSinger() || removeSinger() : removeSinger() || addSinger()) rosterCool = rnd(1.5, 3);
}

// Re-rolled on every beat: each row's color.
function fillRowHues(s, r) {
  for (let i = 0; i < 400; i++) {
    // most rows close to the singer's hue, a few further off (as in the original's row colors)
    s.rowHue[i] = (r() < 0.5 ? -1 : 1) * (3 + Math.pow(r(), 2) * 15) + (r() < 0.04 ? (r() - 0.5) * 120 : 0);
  }
}
function newDetail() {
  const r = makeRng((Math.random() * 4294967296) >>> 0);
  for (const s of cast.singers) fillRowHues(s, r);
}

// ---------------------------------------------------------------------------------------------------
// Background: changes on its own, cross-fading from the old one
// ---------------------------------------------------------------------------------------------------
const bg = { params: null, cur: null, prev: null, mix: 1, key: '', beatsLeft: 12 };

function newBackground() {
  const saved = R;
  R = makeRng((Math.random() * 4294967296) >>> 0);
  const anchor = cast ? cast.rootHue : 300;
  const lightStyle = weighted(['very dark', 'dark', 'light', 'very light', 'soft'], [25, 20, 25, 15, 15]);
  const L = { 'very dark': [3, 12], dark: [14, 24], light: [74, 84], 'very light': [88, 94], soft: [78, 88] }[lightStyle];
  const hue = anchor + sign() * rndInt(3, 9) * 10;
  const params = {
    pattern: weighted(['gradient', 'ribbons', 'circles'], [25, 50, 25]),
    dark: lightStyle === 'very dark' || lightStyle === 'dark',
    hue1: hue, hue2: hue + sign() * rndInt(0, 3) * 10,
    sat: lightStyle === 'soft' ? rnd(35, 60) : rnd(60, 100),
    light1: rnd(L[0], L[1]), light2: rnd(L[0], L[1]),
    strokeHue: chance(0.5) ? hue + 30 : anchor,
    seed: (R() * 4294967296) >>> 0,
  };
  bg.beatsLeft = rndInt(6, 20);
  R = saved;
  if (bg.cur && bg.params) { bg.prev = bg.cur; bg.mix = 0; }
  bg.cur = null;
  bg.params = params;
  bg.key = '';
}

function drawBackground(ctx, dt) {
  const dpr = pixelDensity();
  const W = width, H = height;
  const key = `${bg.params.seed}|${W}x${H}@${dpr}`;
  if (key !== bg.key) {
    if (bg.prev && (bg.prev.width !== Math.round(W * dpr) || bg.prev.height !== Math.round(H * dpr))) bg.prev = null;
    bg.cur = paintBackground(bg.params, W, H, dpr);
    bg.key = key;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(bg.cur, 0, 0);
  if (bg.prev && bg.mix < 1) {
    bg.mix = Math.min(1, bg.mix + dt / 1.2);
    ctx.globalAlpha = 1 - smooth01(bg.mix);
    ctx.drawImage(bg.prev, 0, 0);
    if (bg.mix >= 1) bg.prev = null;
  }
  ctx.restore();
}

function paintBackground(b, W, H, dpr) {
  const D = Math.min(W, H);
  const cnv = document.createElement('canvas');
  cnv.width = Math.round(W * dpr);
  cnv.height = Math.round(H * dpr);
  const g = cnv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const saved = R;
  R = makeRng(b.seed);

  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `hsl(${wrapHue(b.hue1)} ${b.sat}% ${b.light1}%)`);
  grad.addColorStop(1, `hsl(${wrapHue(b.hue2)} ${b.sat}% ${b.light2}%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  if (b.pattern === 'ribbons') {
    const n = rndInt(18, 55);
    const amax = b.dark ? rnd(0.05, 0.2) : rnd(0.12, 0.5);
    for (let i = 0; i < n; i++) {
      const x0 = rnd(-0.1, 1.1) * W, x1 = x0 + rnd(-0.5, 0.5) * W;
      const sway = rnd(-0.3, 0.3) * W, st = rnd(0.05, 0.35) * H;
      g.strokeStyle = `hsla(${wrapHue(b.strokeHue + rndInt(-10, 10) * 6)} ${b.sat}% ${rnd(50, 95)}% / ${skewed(0.01, amax, 2)})`;
      g.lineWidth = D * 0.004 * rnd(0.5, 40);
      g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(x0, -0.05 * H);
      g.bezierCurveTo(x0 + sway, st, x1 - sway, H - st, x1, H * 1.05);
      g.stroke();
    }
  } else if (b.pattern === 'circles') {
    const n = rndInt(40, 140);
    const amax = b.dark ? 0.05 : rnd(0.12, 0.28);
    for (let i = 0; i < n; i++) {
      const s = sign();
      g.fillStyle = `hsla(${wrapHue(b.strokeHue + s * skewed(0, 20, 2.5) * 8)} ${b.sat}% ${rnd(50, 95)}% / ${skewed(0.001, amax, 2)})`;
      g.beginPath();
      g.arc(W * 0.5 + s * skewed(0, W * 0.55, 1), H * 0.55 + sign() * skewed(0, H * 0.5, 2), D * 0.025 * skewed(3, 16, 2), 0, Math.PI * 2);
      g.fill();
    }
  }
  R = saved;
  return cnv;
}

// ---------------------------------------------------------------------------------------------------
// Audio and mood
// ---------------------------------------------------------------------------------------------------
function listen(dt) {
  Mic.tick();
  bands = Mic.bands(12);
  let sum = 0;
  for (const v of bands) sum += v;
  const lvl = sum / bands.length;
  mood.level = lvl;
  bassAbs = (bands[0] + bands[1]) / 2;

  // Swell: how much louder (or quieter) the last second is than the last ~15 seconds.
  // (The long average warms up as a plain running mean, and only counts frames with sound.)
  if (lvl > 0.04) {
    mood.n++;
    mood.fast = mood.fast === null ? lvl : mood.fast + (lvl - mood.fast) * 0.06;
    mood.slow = mood.slow === null ? lvl : mood.slow + (lvl - mood.slow) * Math.max(0.0024, 1 / mood.n);
  } else if (mood.fast !== null) {
    mood.fast += (lvl - mood.fast) * 0.06;
  }
  mood.swell = mood.slow === null ? 0 : Math.max(-1, Math.min(1, (mood.fast - mood.slow) / 0.08));
  mood.swellSlow += (mood.swell - mood.swellSlow) * 0.03; // the ensemble follows the longer arc
  const tiltTarget = mood.swell >= 0 ? mood.swell * 15 : mood.swell * 11; // degrees
  mood.tilt += (tiltTarget - mood.tilt) * 0.08;
  const hushTarget = lvl < 0.04 ? 1 : clamp01((-mood.swell - 0.55) * 2.2);
  mood.hush += (hushTarget - mood.hush) * (hushTarget > mood.hush ? 0.06 : 0.12);
  // The music coming back after a hush resets the whole scene.
  if (mood.hushWas > 0.6 && mood.hush < 0.25) { newCast(); newBackground(); }
  mood.hushWas = mood.hush > 0.6 ? Math.max(mood.hushWas, mood.hush) : (mood.hush < 0.25 ? 0 : mood.hushWas);

  // Changes in the sound: compare the spectrum's shape over the last ~0.3 s with the last ~4 s.
  if (!change.short) { change.short = bands.slice(); change.long = bands.slice(); }
  let diff = 0, tot = 0, cw = 0, cs = 0;
  for (let i = 0; i < bands.length; i++) {
    change.short[i] += (bands[i] - change.short[i]) * 0.12;
    change.long[i] += (bands[i] - change.long[i]) * 0.008;
    diff += Math.abs(change.short[i] - change.long[i]);
    tot += change.long[i];
    cw += i * bands[i]; cs += bands[i];
  }
  change.novelty = lvl > 0.1 ? diff / Math.max(tot, 3) : 0; // ignore near-silence
  change.cool -= dt; change.majorCool -= dt; change.bgCool -= dt;
  if (change.novelty > MAJOR_AT && change.majorCool <= 0) {
    change.majorCool = 20; change.cool = 3; change.bgCool = 5;
    newCast(); newBackground();
  } else if (change.novelty > CHANGE_AT && change.cool <= 0) {
    change.cool = rnd(1.2, 2.5);
    onMusicChange();
  }
  // Brightness: when the sound gets noticeably brighter or darker, the background changes.
  const cent = cs > 0.05 ? cw / cs : 5;
  change.centFast = change.centFast === null ? cent : change.centFast + (cent - change.centFast) * 0.08;
  change.centSlow = change.centSlow === null ? cent : change.centSlow + (cent - change.centSlow) * 0.006;
  if (Math.abs(change.centFast - change.centSlow) > BRIGHT_SHIFT && change.bgCool <= 0) {
    change.bgCool = rnd(5, 10);
    newBackground();
  }

  // Beats: a jump in the low bands.
  const low = (bands[0] + bands[1] + bands[2]) / 3;
  const now = clock * 1000;
  if (low - beat.avg > 0.055 && low > 0.18 && now - beat.last > 300) {
    beat.last = now;
    beat.accent = mood.swell > 0.3 ? 1 : 0;
    onBeat();
  }
  beat.avg += (low - beat.avg) * 0.09;
  beat.accent *= 0.9;

  for (const s of cast.singers) {
    const b = Math.min(s.band, bands.length - 2);
    const raw = (bands[b] + bands[b + 1]) / 2;
    s.avg += (raw - s.avg) * 0.008;
    const rel = raw / (s.avg + 0.03);
    let target = raw < 0.04 ? 0 : clamp01((rel - 0.72) / 0.55);
    const singing = !s.silent && s.life !== 'leave' && (s.join === 0 || mood.swell > s.join);
    if (!singing) target = 0;
    target *= 1 - mood.hush * 0.85;
    s.e += (target - s.e) * (target > s.e ? 0.45 : 0.1);
    s.open += (s.e - s.open) * 0.5;
    s.singing = singing;
    const eyeTarget = s.silent ? 1 : (beat.accent > 0.5 ? 1 : 0);
    s.eye += (eyeTarget - s.eye) * (eyeTarget > s.eye ? 0.5 : 0.08);
    const bow = singing ? 0 : -4;
    s.tilt += ((mood.tilt + bow) * s.tiltGain + s.baseTilt - s.tilt) * 0.1;
  }
}

function onBeat() {
  newDetail();
  if (--bg.beatsLeft <= 0) newBackground();
  if (++beatsInPhrase >= cast.phraseLen) {
    if (chance(0.75)) newCast(); // a new arrangement; the background keeps its own timing
    else beatsInPhrase = 0;
  }
}

// ---------------------------------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------------------------------
function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));
  frameRate(30); // like the original's 32
  cnv.elt.addEventListener('click', () => { if (started) togglePause(); });
  newCast(20261104);
  newBackground();
  setupSourcePicker();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (cast) newCast(castSeed); // re-lay out the same scene for the new size
}

function draw() {
  if (paused) return;
  const frameStart = performance.now();
  const dt = Math.min(deltaTime, 100) / 1000;
  clock += dt;
  if (started) listen(dt);
  else idleListen();
  updateRoster(dt);

  const ctx = drawingContext;
  drawBackground(ctx, dt);

  const W = width, H = height, D = Math.min(W, H);
  const sp0 = 0.016 + 0.1 * Math.pow(clamp01((bassAbs - 0.5) / 0.4), 3); // louder bass, fewer and bolder rows

  for (const s of cast.singers) drawSinger(ctx, s, sp0);

  if (started) fpsMeter.frame(performance.now() - frameStart);
}

// Before a source is chosen: a slow, breathing preview.
function idleListen() {
  const t = clock;
  for (const s of cast.singers) {
    const target = s.silent ? 0 : 0.25 + 0.25 * Math.sin(t * 0.8 + s.band);
    s.e += (target - s.e) * 0.05;
    s.open += (s.e - s.open) * 0.3;
    s.singing = !s.silent;
    s.eye += ((s.silent ? 1 : 0) - s.eye) * 0.1;
    s.tilt += (s.baseTilt + 3 * Math.sin(t * 0.3) - s.tilt) * 0.05;
  }
  mood.level = 0.3;
}

// Where a singer's head is drawn: the brow sits at s.x, the crown at s.yNow. The head tilts about
// the back of the neck.
function singerPivot(s) {
  return { x: s.x - s.dir * (Profiles.G - 0.16) * s.h, y: s.yNow + 0.95 * s.h };
}

// Everything inside a head is drawn in head units (crown y = 0, chin y = 1, face toward +x) by
// scaling the canvas, so the face points the right way for either direction.
function drawSinger(ctx, s, sp0) {
  const h = s.h, dir = s.dir;
  const shp = Profiles.shape(s.head, s.open);
  const style = cast.lineStyle;
  const hue = cast.rootHue + s.hueOffset;
  const dark = bg.params.dark;

  ctx.save();
  const pv = singerPivot(s);
  ctx.translate(pv.x, pv.y);
  ctx.rotate(-dir * s.tilt * Math.PI / 180);
  ctx.translate(-pv.x, -pv.y);
  ctx.translate(s.x - dir * Profiles.G * h, s.yNow);
  ctx.scale(dir * h, h);
  ctx.globalAlpha = s.alphaNow;
  const px = 1 / h; // one screen pixel, in head units
  const sp = Math.max(2.5 * px, sp0);

  const sat = style === 'engrave' ? 60 : cast.lineSat - (s.singing ? 0 : 12);
  const bri = style === 'engrave' ? (dark ? 92 : 38) : cast.lineBri;
  if (style === 'echo') {
    drawEcho(ctx, s, shp, px, hue);
  } else {
    const yEnd = Math.min(1.7, (height - s.yNow) / h + 0.3);
    const ys = shp.outline.map((p) => p[1]);
    const rows = [];
    for (let i = 0, y = Math.min(...ys) + sp * 0.5; y < yEnd; i++, y += sp) {
      for (const [x0, x1] of Profiles.spans(shp.outline, y)) rows.push({ i, y, x0, x1 });
    }
    const shadows = s.alpha >= 0.8;
    // Weave: even rows, then the hair, then odd rows, so strands pass over and under.
    for (const r of rows) if (r.i % 2 === 0) drawRow(ctx, r, sp, s, hue, sat, bri, px, style, shadows);
    if (s.hair) drawHair(ctx, s, shp, px, hue, sat, bri, shadows);
    for (const r of rows) if (r.i % 2 === 1) drawRow(ctx, r, sp, s, hue, sat, bri, px, style, shadows);
  }
  drawFeatures(ctx, shp, px, s.eye, dark ? 'rgba(255,250,240,0.92)' : 'rgba(22,16,28,0.86)', dark);
  ctx.restore();
}

function drawRow(ctx, r, sp, s, hue, sat, bri, px, style, shadows) {
  const len = r.x1 - r.x0;
  if (len < sp * 0.4) return;
  const rgb = hsbRgb(hue + s.rowHue[r.i % 400], sat, bri);
  if (style === 'bands') {
    const th = sp * 0.5, tip = Math.min(sp * 0.75, len * 0.5), tw = sp * 0.25;
    const tb = r.x1 - tip;
    if (shadows) {
      ctx.globalAlpha = s.alphaNow * 0.16;
      ctx.fillStyle = '#000';
      ctx.fillRect(lerp(r.x0, tb, 0.15), r.y + th * 0.35, tb - lerp(r.x0, tb, 0.15), th);
      ctx.globalAlpha = s.alphaNow;
    }
    const g = ctx.createLinearGradient(r.x0, 0, tb, 0);
    g.addColorStop(0, rgba(rgb, 0)); // a soft back edge, then solid to the face
    g.addColorStop(Math.min(0.5, (sp * 2.5) / Math.max(len, 1e-3)), rgba(rgb, 0.95));
    g.addColorStop(1, rgba(rgb, 1));
    ctx.fillStyle = g;
    ctx.fillRect(r.x0, r.y - th / 2, tb - r.x0 + px * 0.5, th);
    ctx.fillStyle = rgba(rgb, 1);
    ctx.beginPath(); ctx.moveTo(r.x1, r.y); ctx.lineTo(tb, r.y - tw); ctx.lineTo(tb, r.y + tw); ctx.closePath(); ctx.fill();
  } else { // engrave: thickness follows a simple shading of the form
    const n = Math.max(6, Math.ceil(len / 0.02));
    const w = (u) => {
      const edge = Math.pow(Math.abs(2 * u - 1), 2.4); // turning away at the edges: darker
      const back = (1 - u) * 0.35;                       // light from the front
      return sp * (0.05 + 0.75 * clamp01(edge * 0.85 + back * 1.2));
    };
    ctx.fillStyle = rgba(rgb, 1);
    ctx.beginPath();
    for (let k = 0; k <= n; k++) { const u = k / n; ctx.lineTo(lerp(r.x0, r.x1, u), r.y - w(u) / 2); }
    for (let k = n; k >= 0; k--) { const u = k / n; ctx.lineTo(lerp(r.x0, r.x1, u), r.y + w(u) / 2); }
    ctx.closePath();
    ctx.fill();
  }
}

// Echo: the outline repeated, shrinking toward the ear, like ripples.
function drawEcho(ctx, s, shp, px, hue) {
  const c = [shp.marks.ear.x, shp.marks.ear.y];
  const rings = 7;
  ctx.lineJoin = 'round';
  for (let k = rings - 1; k >= 0; k--) {
    const sc = 1 - k * 0.11;
    const rgb = hsbRgb(hue + s.rowHue[k] * 1.5, 85, 92);
    ctx.lineWidth = px * (k === 0 ? 3.2 : 2.2 - k * 0.18) * (1 + s.e * 0.6);
    ctx.strokeStyle = rgba(rgb, k === 0 ? 1 : 0.85 - k * 0.09);
    ctx.beginPath();
    for (const p of shp.outline) ctx.lineTo(c[0] + (p[0] - c[0]) * sc, c[1] + (p[1] - c[1]) * sc);
    ctx.closePath();
    ctx.stroke();
  }
}

// Hair types: swept back, falling behind the ear, or cropped close to the skull.
function pickHair(kind, x) {
  const w = { masc: [35, 15, 50], child: [30, 30, 40], fem: [40, 45, 15], elder: [40, 20, 40], adult: [40, 30, 30] }[kind];
  x *= w[0] + w[1] + w[2];
  return x < w[0] ? 'swept' : x < w[0] + w[1] ? 'fall' : 'crop';
}

function drawHair(ctx, s, shp, px, hue, sat, bri, shadows) {
  const hr = s.hair, sk = shp.skull;
  ctx.lineCap = 'butt';
  for (let k = 0; k < hr.strands; k++) {
    const [j1, j2, a, ph, j3] = hr.seeds[k];
    const u = clamp01((k + 0.5 + j3 * 0.45) / hr.strands); // 0 at the hairline .. 1 at the back
    const th = lerp(sk.aHair + 0.04, Math.PI * 1.04, u);
    const cx = Math.cos(th), cy = -Math.sin(th);
    const sx = sk.cx + cx * sk.rx * 1.015, sy = sk.cy + cy * sk.ry * 1.015;
    let nx = cx / sk.rx, ny = cy / sk.ry;
    const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const sway = Math.sin(clock * 0.8 + ph) * 0.01;
    let w = hr.width * (0.45 + 0.9 * a);
    let ex, ey, c1x, c1y, c2x, c2y, bx = sx, by = sy;
    if (hr.type === 'crop') {
      // short: a textured cap, each strand rising from just inside the scalp and combed back
      const r0 = 0.9 + 0.07 * a, t2 = th + 0.14 + 0.1 * a;
      bx = sk.cx + cx * sk.rx * r0; by = sk.cy + cy * sk.ry * r0;
      ex = sk.cx + Math.cos(t2) * sk.rx * 1.035; ey = sk.cy - Math.sin(t2) * sk.ry * 1.035;
      c1x = bx + nx * 0.03; c1y = by + ny * 0.03;
      c2x = ex + nx * 0.015; c2y = ey + ny * 0.015;
      w *= 1.7;
    } else if (hr.type === 'fall') {
      // long: over the head and down behind the ear
      ex = Math.min(sx - 0.02, sk.cx - sk.rx * 0.15) - 0.1 * u + j1 * hr.chaos * 0.03 + sway;
      ey = Math.max(sy + 0.2, hr.len * (0.85 + 0.2 * a) + 0.25);
      const lift = 0.05 + 0.04 * u;
      c1x = sx + nx * lift + j2 * hr.chaos * 0.02; c1y = sy + ny * lift;
      c2x = ex + 0.03 + sway; c2y = lerp(sy, ey, 0.6);
    } else {
      // swept back
      ex = sk.cx - sk.rx * (0.55 + 0.6 * u) - hr.sweep + j1 * hr.chaos * 0.05 + sway;
      ey = Math.max(sy + 0.12, hr.len * (0.85 + 0.2 * a));
      const lift = 0.04 + 0.08 * u;
      c1x = sx + nx * lift + j2 * hr.chaos * 0.03; c1y = sy + ny * lift;
      c2x = ex + 0.07 + j2 * hr.chaos * 0.06 + sway; c2y = lerp(sy, ey, 0.55);
    }
    ctx.lineWidth = w;
    if (shadows && hr.type !== 'crop') {
      ctx.globalAlpha = s.alphaNow * 0.14 * a;
      ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.moveTo(bx + w * 0.4, by + w * 0.4); ctx.bezierCurveTo(c1x + w * 0.4, c1y + w * 0.4, c2x + w * 0.4, c2y + w * 0.4, ex + w * 0.4, ey); ctx.stroke();
    }
    ctx.globalAlpha = s.alphaNow * (0.45 + 0.55 * a);
    ctx.strokeStyle = rgba(hsbRgb(hue + j1 * 18, sat * 0.95, bri * (hr.type === 'crop' ? 0.85 : 1)), 1);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey); ctx.stroke();
  }
  ctx.globalAlpha = s.alphaNow;
}

// Eye, brow and ear, as lines. The nose and lips come from the rows' own edges.
function drawFeatures(ctx, shp, px, eyeOpen, ink, dark) {
  const m = shp.marks;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;

  // ear: the outer rim curls round the back, an inner fold, the small flap at the front
  const e = m.ear;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(-e.tilt);
  ctx.scale(e.w, e.h);
  ctx.lineWidth = px * 2.4 / e.w;
  ctx.beginPath();
  ctx.moveTo(0.12, -0.2);
  ctx.bezierCurveTo(0.12, -0.52, -0.3, -0.58, -0.44, -0.3);
  ctx.bezierCurveTo(-0.56, -0.05, -0.45, 0.2, -0.28, 0.34);
  ctx.bezierCurveTo(-0.2, 0.42, -0.14, 0.54, 0.02, 0.5);
  ctx.bezierCurveTo(0.16, 0.47, 0.18, 0.36, 0.12, 0.3);
  ctx.stroke();
  ctx.lineWidth = px * 1.5 / e.w;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.28);
  ctx.bezierCurveTo(-0.28, -0.3, -0.3, 0.05, -0.12, 0.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.26, -0.02); ctx.quadraticCurveTo(0.34, 0.08, 0.24, 0.16);
  ctx.stroke();
  ctx.restore();

  // eye: closed is a lid line with lashes; open is a wedge with the iris toward the front
  const w = m.eye.w, ex = m.eye.x, ey = m.eye.y;
  ctx.lineWidth = px * 2.2;
  if (eyeOpen < 0.4) {
    ctx.beginPath();
    ctx.moveTo(ex - w, ey - w * 0.05);
    ctx.quadraticCurveTo(ex - w * 0.1, ey + w * 0.5, ex + w * 0.6, ey + w * 0.05);
    ctx.stroke();
    ctx.lineWidth = px * 1.3;
    for (let k = 0; k < 3; k++) {
      const lx = ex - w * 0.55 + k * w * 0.45, ly = ey + w * 0.26 + (k === 1 ? w * 0.04 : 0);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + w * 0.12, ly + w * 0.3); ctx.stroke();
    }
  } else {
    ctx.fillStyle = dark ? 'rgba(10,8,14,0.92)' : 'rgba(255,252,246,0.95)';
    ctx.beginPath();
    ctx.moveTo(ex - w, ey);
    ctx.quadraticCurveTo(ex - w * 0.1, ey - w * 0.55, ex + w * 0.55, ey - w * 0.32);
    ctx.quadraticCurveTo(ex + w * 0.75, ey, ex + w * 0.5, ey + w * 0.26);
    ctx.quadraticCurveTo(ex - w * 0.15, ey + w * 0.35, ex - w, ey);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.ellipse(ex + w * 0.35, ey - w * 0.02, w * 0.13, w * 0.27, 0, 0, Math.PI * 2); ctx.fill();
  }
  // brow
  ctx.lineWidth = px * 2;
  ctx.beginPath();
  ctx.moveTo(ex - w * 1.1, ey - w * 0.95);
  ctx.quadraticCurveTo(ex - w * 0.1, ey - w * 1.35, m.brow.x - 0.01, m.brow.y + 0.004);
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------------
// Sources and live controls (same layout as sketches 007 and 008)
// ---------------------------------------------------------------------------------------------------
const LOCAL_SONG = 'private/acmpp07.mp3'; // Phil's own copy; git-ignored, never published

function setupSourcePicker() {
  const picker = document.getElementById('picker');
  const note = document.getElementById('picker-note');
  const panel = document.getElementById('live-panel');
  const sourceLabel = document.getElementById('live-source');
  const playLocal = document.getElementById('play-local');
  const fileInput = document.getElementById('file');
  const useLaptop = document.getElementById('use-laptop');
  const useMic = document.getElementById('use-mic');
  const device = document.getElementById('live-device');
  const sens = document.getElementById('live-sens');
  const sensValue = document.getElementById('live-sens-value');
  const auto = document.getElementById('live-auto');

  picker.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.tagName === 'BUTTON') e.target.blur(); // so Space pauses instead of re-pressing it
  });

  Mic.autoLevel = true;
  const SENS_MIN = 0.01, SENS_MAX = 40;
  const toSlider = (g) => Math.round(100 * Math.log(g / SENS_MIN) / Math.log(SENS_MAX / SENS_MIN));
  const fromSlider = (v) => SENS_MIN * Math.pow(SENS_MAX / SENS_MIN, v / 100);
  const refresh = () => {
    sens.value = toSlider(Mic.getGain());
    sensValue.textContent = '×' + Mic.getGain().toFixed(2);
    auto.checked = Mic.autoLevel;
  };
  setInterval(() => { if (!panel.hidden) refresh(); }, 250);
  sens.addEventListener('input', () => { Mic.autoLevel = false; Mic.setGain(fromSlider(+sens.value)); refresh(); });
  auto.addEventListener('change', () => { Mic.autoLevel = auto.checked; Mic.resetAutoLevel(); });

  const started_ = (label) => {
    started = true;
    paused = false;
    picker.hidden = true;
    sourceLabel.textContent = label;
    panel.hidden = false;
    note.textContent = '';
    mood.fast = mood.slow = null;
    mood.n = 0;
    change.short = null; change.centFast = change.centSlow = null;
    newCast();
    newBackground();
    refresh();
  };
  const showPicker = (message) => {
    started = false;
    picker.hidden = false;
    panel.hidden = true;
    note.textContent = message || '';
  };
  Mic.onEnded = () => showPicker('The audio stopped. Pick a source to continue.');

  fetch(LOCAL_SONG, { method: 'HEAD' }).then((r) => { if (r.ok) playLocal.hidden = false; }).catch(() => {});
  if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) useLaptop.hidden = true;

  playLocal.addEventListener('click', async () => {
    note.textContent = 'loading Guys Eyes...';
    try { await Mic.startFile(LOCAL_SONG); device.hidden = true; started_('Guys Eyes'); }
    catch (e) { note.textContent = "couldn't play the song"; }
  });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    note.textContent = `loading ${f.name}...`;
    try { await Mic.startFile(f); device.hidden = true; started_(f.name); }
    catch (e) { note.textContent = `couldn't play ${f.name}`; }
  });
  useLaptop.addEventListener('click', async () => {
    note.textContent = 'In the share window, choose your entire screen and turn on "Share system audio".';
    try { await Mic.startDisplay(); device.hidden = true; started_('laptop audio'); }
    catch (e) { note.textContent = e && e.name === 'NoAudio' ? e.message : 'Sharing was cancelled.'; }
  });
  const listInputs = async () => {
    const inputs = await Mic.inputs();
    const cur = Mic.currentInputId();
    device.replaceChildren(...inputs.map((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || `input ${i + 1}`;
      o.selected = d.deviceId === cur;
      return o;
    }));
    device.hidden = inputs.length < 2;
  };
  useMic.addEventListener('click', async () => {
    note.textContent = 'starting microphone...';
    try { await Mic.start(); await listInputs(); started_('audio input'); }
    catch (e) { note.textContent = 'microphone access was blocked'; }
  });
  device.addEventListener('change', async () => {
    try { await Mic.start({ deviceId: device.value }); } catch (e) { console.warn('could not switch input', e); }
  });

  document.getElementById('live-change').addEventListener('click', () => { Mic.stop(); showPicker(); });
  document.getElementById('live-full').addEventListener('click', toggleFullscreen);

  // Fade the panel when the mouse is idle, unless it's being used.
  let idleTimer;
  const wake = () => {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!panel.matches(':hover') && !panel.contains(document.activeElement)) document.body.classList.add('idle');
    }, 3000);
  };
  for (const type of ['pointermove', 'pointerdown', 'keydown']) window.addEventListener(type, wake, { passive: true });
  wake();
}

function togglePause() {
  paused = !paused;
  if (paused) { Mic.pause(); fpsMeter.pause(); } else Mic.resume();
}

function toggleLowRes() {
  lowRes = !lowRes;
  pixelDensity(lowRes ? 1 : Math.min(2, displayDensity()));
  bg.key = '';
  document.getElementById('lowres-flag').hidden = !lowRes;
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}
document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('clean', !!document.fullscreenElement); // H brings controls back
});

function keyPressed(e) {
  if (document.activeElement && document.activeElement.tagName === 'SELECT') return;
  const k = (key || '').toLowerCase();
  if (k === 'f') toggleFullscreen();
  else if (k === 'h') document.body.classList.toggle('clean');
  else if (k === 'm') document.body.classList.toggle('no-meter');
  else if (k === 'p') toggleLowRes();
  else if (k === 'n') newCast();
  else if (k === 'b') newBackground();
  else if (key === ' ') {
    if (started) togglePause();
    if (e) e.preventDefault();
    return false;
  }
}

// Frame-rate readout: frames per second over the last second, plus each frame's drawing time.
const fpsMeter = (() => {
  const TARGET = 30;
  let el = null, stamps = [], works = [], lastRefresh = 0;
  function frame(workMs) {
    const now = performance.now();
    stamps.push(now); works.push(workMs);
    while (stamps.length && now - stamps[0] > 1000) { stamps.shift(); works.shift(); }
    if (now - lastRefresh < 250 || stamps.length < 2) return;
    lastRefresh = now;
    const fps = (stamps.length - 1) / ((stamps[stamps.length - 1] - stamps[0]) / 1000);
    const avg = works.reduce((a, b) => a + b, 0) / works.length;
    const peak = Math.max(...works);
    if (!el) { el = document.createElement('div'); el.className = 'fps-meter'; document.body.appendChild(el); }
    el.hidden = false;
    el.dataset.health = fps >= TARGET * 0.9 ? 'good' : fps >= TARGET * 0.6 ? 'ok' : 'slow';
    el.innerHTML = `<b>${fps.toFixed(1)}</b> fps <span>/ ${TARGET} target</span><br>` +
      `draw ${avg.toFixed(1)} ms <span>avg</span> &middot; ${peak.toFixed(1)} ms <span>max</span>`;
  }
  function pause() { if (el) el.hidden = true; stamps = []; works = []; }
  return { frame, pause };
})();
