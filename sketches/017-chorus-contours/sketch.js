// =====================================================================================================
// 017 Chorus contours
// Fork of 016 that keeps only the contour (echo) style: every face is its outline repeated, shrinking
// toward the ear like ripples, on bright pastel backgrounds. No rows and no hair. The contour loop
// is now closed at the hairline, so the rings no longer have a gap above the forehead.
// This is the base for developing the contour style further.
//
// Wilder (second pass):
//   - a "wild" slider in the live panel scales how frantic everything gets (mood.F is the result)
//   - the background ranges from a slow drift to racing (about 60 times faster), lurches on every
//     beat, and in frantic music throws ribbons and circles somewhere new; their widths follow
//     the bands; a new "ripples" background spawns rings on the beat
//   - contour spacing varies by scene (from tight to wide, even, clustered or spreading), the rings
//     spread apart on loud notes and jump apart on the beat, and they can converge on the ear,
//     mouth, eye or skull
//   - heads join and leave on the beat, pop in and out when the music is fast, and in frantic
//     passages flip direction and jolt
//
// Strands (third pass): every contour is a line in screen space that can slide along a path, like
// a train on a track. A leaving face unravels: each contour peels away from one end and noodles off
// the screen in its own direction. A new face is built from lines that noodle in from off screen
// and slide into place. And a face can turn into another: its contours peel off, travel, and
// become the new face's contours. Scene changes do this for the whole cast at once.
//
// 016 notes:
// Fork of 015 with a new composition and more life when the music is fast:
//   - heads are whole and spread through the frame at different heights and sizes, their necks
//     fading out below the chin; a fourth arrangement scatters a crowd of heads across the screen
//   - "frenzy" (beats per second over the last few seconds, weighted by loudness) drives everything:
//   - each face's rows vibrate with its own band: low voices in slow, wide waves, high voices in
//     fast, fine shivers, stronger the more frenetic the music
//   - the background moves again: ribbons sway and circles drift, faster with the tempo, pulsing
//     on beats
//   - heads bob on the beat, and faces join, leave and change scenes faster
//
// 015 notes:
// Fork of 014 with no facial marks at all (no ear, eye or brow): just the silhouettes and the hair.
//
// 014 notes:
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
let rosterWant = 0, rosterAny = false, rosterWaited = 0; // a roster change waiting for the next beat
let wild = 1.5;           // the wild slider: scales the frenzy (0 calm, 1 as the music says, 2.5 unhinged)
let rosterCool = 0;       // seconds until the ensemble can grow or shrink again

const mood = { fast: null, slow: null, swell: 0, swellSlow: 0, tilt: 0, hush: 0, hushWas: 0, level: 0, n: 0, beats: [], frenzy: 0, F: 0 };
const beat = { avg: 0, last: 0, accent: 0 };
// Changes in the sound itself: the spectrum's shape (novelty) and its brightness (centroid).
const change = { short: null, long: null, novelty: 0, cool: 6, majorCool: 15, centFast: null, centSlow: null, bgCool: 4 };
const CHANGE_AT = 0.2;    // novelty that adds or removes a face
const MAJOR_AT = 0.52;    // novelty that resets the whole scene
const BRIGHT_SHIFT = 0.3; // centroid shift (in bands) that changes the background

// ---------------------------------------------------------------------------------------------------
// Scenes and the ensemble
// ---------------------------------------------------------------------------------------------------
function newCast(seed, morph) {
  const old = morph && cast ? cast.singers.filter((s) => s.life !== 'leave' && s.polys) : [];
  castSeed = seed || ((Math.random() * 4294967296) >>> 0);
  R = makeRng(castSeed);
  const W = width, H = height;
  const Hh = Math.min(H, W * 1.25);
  const tall = W < H;

  const c = {
    arrangement: weighted(['row', 'duet', 'solo', 'scatter'], [30, 25, 15, 30]),
    phraseLen: weighted([4, 6, 8, 12], [20, 35, 30, 15]),
    singers: [],
  };
  // Palette, after the original's: hue centered on red-magenta, rarely green.
  c.rootHue = wrapHue((sign() * skewed(0, 180, 1.25)) - 45);
  c.hueStep = sign() * skewed(4, 30, 1.5);
  c.unison = chance(0.1);
  c.lineStyle = 'echo'; // the only style in this sketch
  // Contour spacing for the scene: from tight (20 rings) to wide (4), evenly spaced, clustered at
  // the outline or spreading out, converging on one point of the head.
  c.ring = {
    gap: weighted([0.035, 0.055, 0.08, 0.11, 0.15, 0.2], [12, 18, 22, 20, 16, 12]) * rnd(0.85, 1.15),
    curve: weighted([1, 0.55, 1.8], [45, 30, 25]),
    center: weighted(['ear', 'mouth', 'eye', 'skull'], [45, 20, 20, 15]),
  };
  c.minN = c.arrangement === 'duet' ? 2 : 1;
  c.maxN = tall ? 4 : c.arrangement === 'scatter' ? 9 : 7;

  const Hw = Math.min(H, W * 1.1); // head sizes follow the screen's shorter side
  if (c.arrangement === 'row') {
    let n = weighted([2, 3, 4, 5, 6], [15, 25, 28, 20, 12]);
    if (tall) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.4 : i / (n - 1);
      const h = Hw * rnd(0.3, 0.58);
      // on a tall screen the row becomes a staggered column, so the heads use the whole height
      const x = tall ? Math.min(W - 0.2 * h, 0.9 * h + W * (0.02 + (i % 2) * 0.25 + rnd(0, 0.08))) : W * (0.12 + 0.76 * u + rnd(-0.03, 0.03));
      c.singers.push(makeSinger(c, x, h, 1, { y: placeY(h, tall ? u * 0.9 + rnd(0, 0.1) : rnd(0.1, 1)) }));
    }
    if (chance(0.18) && n > 2) { const s = pick(c.singers); s.dir = -1; s.x -= 0.86 * s.h; s.silent = true; }
  } else if (c.arrangement === 'duet') {
    const nl = weighted([1, 2], [65, 35]), nr = weighted([1, 2], [65, 35]);
    for (let i = 0; i < nl; i++) { const h = Hw * rnd(0.36, 0.62); c.singers.push(makeSinger(c, W * (0.14 + 0.2 * (nl === 1 ? 0.6 : i / (nl - 1)) + rnd(-0.03, 0.03)), h, 1, { side: 'L', y: placeY(h, rnd(0.2, 0.8)) })); }
    for (let i = 0; i < nr; i++) { const h = Hw * rnd(0.36, 0.62); c.singers.push(makeSinger(c, W * (0.86 - 0.2 * (nr === 1 ? 0.6 : i / (nr - 1)) + rnd(-0.03, 0.03)), h, -1, { side: 'R', y: placeY(h, rnd(0.2, 0.8)) })); }
  } else if (c.arrangement === 'solo') {
    const hs = Hw * rnd(0.62, 0.8);
    c.singers.push(makeSinger(c, W * rnd(0.24, 0.4), hs, 1, { join: 0, soloist: true, y: placeY(hs, rnd(0.3, 0.7)) }));
    if (chance(0.65)) {
      const n = rndInt(1, 4);
      for (let i = 0; i < n; i++) {
        const listen = chance(0.6), h = Hw * rnd(0.15, 0.28);
        c.singers.push(makeSinger(c, W * (0.62 + 0.32 * (n === 1 ? 0.5 : i / (n - 1)) + rnd(-0.03, 0.03)), h, -1,
          { silent: listen, join: listen ? 0 : rnd(0.2, 0.5), y: placeY(h, rnd()) }));
      }
    }
  } else { // scatter: a crowd of heads across the whole screen, facing every way
    const n = tall ? rndInt(3, 4) : rndInt(4, 8);
    for (let i = 0; i < n; i++) c.singers.push(scatterSinger(c, W, H, Hw, c.singers));
  }
  c.baseCount = c.singers.length;
  for (const s of c.singers) { s.fade = 0.45; s.life = 'enter'; } // a new scene rises into view
  finishRoster(c);
  cast = c;
  if (morph) morphCast(old, c.singers);
  beatsInPhrase = 0;
  newDetail();
}

// Where a head of height h can sit so all of it (crown to the end of the neck) is on screen.
const NECK_END = 1.3; // the neck fades out by here, in head heights below the crown
function placeY(h, u) {
  const H = height, lo = H * 0.04, hi = Math.max(lo, H - h * NECK_END - H * 0.02);
  return lerp(lo, hi, clamp01(u));
}

// A head for the scattered crowd: of a dozen random spots, the one furthest from everyone else.
function scatterSinger(c, W, H, Hw, others) {
  let best = null, bestD = -1;
  for (let k = 0; k < 12; k++) {
    const h = Hw * rnd(0.2, 0.45), x = W * rnd(0.08, 0.92), y = placeY(h, rnd());
    let d = 1e9;
    for (const o of others) if (o.life !== 'leave') d = Math.min(d, Math.hypot(x - (o.x - o.dir * 0.43 * o.h), (y + 0.55 * h) - (o.y + 0.55 * o.h)) / (h + o.h));
    if (d > bestD) { bestD = d; best = { x, h, y }; }
  }
  const dir = (best.x < W / 2 ? 1 : -1) * (chance(0.2) ? -1 : 1);
  return makeSinger(c, best.x, best.h, dir, { y: best.y });
}

function makeSinger(c, x, h, dir, extra = {}) {
  const H = height;
  const s = {
    x, h, dir, y: placeY(h, rnd()),
    head: Profiles.make(R),
    slot: rndInt(0, 6), hueOffset: 0, join: chance(0.3) ? rnd(0.15, 0.55) : 0, silent: false,
    tiltGain: rnd(0.6, 1.25), baseTilt: rnd(-3, 3), alpha: 1, band: 0,
    e: 0, avg: 0.2, open: 0, eye: 0, tilt: 0, fade: 0, life: 'enter', vib: 0, bob: 0, vph: rnd(0, 6.28),
    gapMul: rnd(0.75, 1.35), punch: 0, jx: 0, jy: 0,
    ...extra,
  };
  const kind = s.head.kind;
  if (kind === 'child') s.h *= 0.82;
  s.x = x + dir * 0.43 * s.h; // scenes place a singer by the middle of the head; s.x is the brow
  s.rowHue = new Float32Array(400);
  s.rings = Math.max(4, Math.min(22, Math.round(0.75 / (c.ring.gap * s.gapMul)) + 1));
  s.ready = new Array(s.rings).fill(true); // false while a strand is still on its way to that contour
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

function addSinger(noStrands) {
  const c = cast;
  const live = c.singers.filter((s) => s.life !== 'leave');
  if (live.length >= c.maxN) return false;
  R = makeRng((Math.random() * 4294967296) >>> 0);
  const W = width, H = height;
  const Hw = Math.min(H, W * 1.1);
  let s;
  if (c.arrangement === 'row') {
    const x = widestGap(live.map((q) => q.x - q.dir * 0.43 * q.h), W * 0.06, W * 0.94);
    s = makeSinger(c, x, Hw * rnd(0.3, 0.58), 1);
    if (chance(0.12) && live.length > 1) { s.dir = -1; s.x -= 0.86 * s.h; s.silent = true; }
  } else if (c.arrangement === 'duet') {
    const nl = live.filter((q) => q.side === 'L').length, nr = live.filter((q) => q.side === 'R').length;
    const side = nl === nr ? (chance(0.5) ? 'L' : 'R') : (nl < nr ? 'L' : 'R');
    const [lo, hi] = side === 'L' ? [W * 0.06, W * 0.4] : [W * 0.6, W * 0.94];
    const h = Hw * rnd(0.3, 0.6);
    s = makeSinger(c, widestGap(live.filter((q) => q.side === side).map((q) => q.x - q.dir * 0.43 * q.h), lo, hi), h, side === 'L' ? 1 : -1, { side, y: placeY(h, rnd(0.15, 0.85)) });
  } else if (c.arrangement === 'solo') {
    const listen = chance(0.5);
    s = makeSinger(c, widestGap(live.filter((q) => !q.soloist).map((q) => q.x - q.dir * 0.43 * q.h), W * 0.56, W * 0.97), Hw * rnd(0.15, 0.28), -1,
      { silent: listen, join: listen ? 0 : rnd(0.1, 0.4) });
  } else {
    s = scatterSinger(c, W, H, Hw, live);
  }
  const r = makeRng((Math.random() * 4294967296) >>> 0);
  fillRowHues(s, r);
  s.punch = 1;
  c.singers.push(s);
  finishRoster(c);
  if (!noStrands && strands.length + s.rings <= STRAND_CAP) formStrands(s);
  return s;
}

// Who leaves: the quiet ones first. With anyone, the cast may shrink below its minimum (used when a
// face turns into another).
function chooseLeaver(anyone) {
  const c = cast;
  const live = c.singers.filter((s) => s.life !== 'leave' && !s.soloist);
  if (!live.length) return null;
  if (!anyone) {
    if (c.singers.filter((s) => s.life !== 'leave').length <= c.minN) return null;
    if (c.arrangement === 'duet') { // keep at least one singer on each side
      for (const side of ['L', 'R']) {
        if (live.filter((q) => q.side === side).length <= 1) {
          for (let i = live.length - 1; i >= 0; i--) if (live[i].side === side) live.splice(i, 1);
        }
      }
      if (!live.length) return null;
    }
  }
  live.sort((a, b) => (a.singing ? 1 : 0) - (b.singing ? 1 : 0) || a.e - b.e);
  return live[Math.min(live.length - 1, Math.floor(Math.random() * Math.min(2, live.length)))];
}

function detach(s) {
  const i = cast.singers.indexOf(s);
  if (i >= 0) cast.singers.splice(i, 1);
  finishRoster(cast);
}

function removeSinger() {
  const s = chooseLeaver(false);
  if (!s) return false;
  if (s.polys && strands.length + s.rings <= STRAND_CAP) { detach(s); unravel(s); } // it unravels
  else { s.life = 'leave'; finishRoster(cast); } // too busy: it just fades
  return true;
}

// One face turns into another somewhere else: its contours peel off and become the new face's.
function morphSinger() {
  const s = chooseLeaver(true);
  if (!s || !s.polys || strands.length + 2 * s.rings > STRAND_CAP) return false;
  detach(s);
  const n = addSinger(true);
  if (n) morphStrands(s, n); else unravel(s);
  return true;
}

// Every frame: faces rise in and sink away; the ensemble follows the music's swell.
function updateRoster(dt) {
  const c = cast;
  for (const s of c.singers) {
    const ft = lerp(0.7, 0.08, mood.F); // fast music: heads pop in and out
    if (s.life === 'enter') { s.fade = Math.min(1, s.fade + dt / ft); if (s.fade >= 1) s.life = 'live'; }
    else if (s.life === 'leave') s.fade -= dt / ft;
  }
  if (c.singers.some((s) => s.life === 'leave' && s.fade <= 0)) {
    c.singers = c.singers.filter((s) => !(s.life === 'leave' && s.fade <= 0));
  }
  for (const s of c.singers) {
    const f = smooth01(s.fade);
    s.yNow = s.y + (1 - f) * 0.35 * s.h - s.bob * 0.03 * s.h; // rise in, and bob on the beat
    s.alphaNow = s.alpha * f;
  }
  rosterCool -= dt;
  if (!started) return;
  if (rosterWant) { // waiting for a beat; if none comes, go ahead anyway
    rosterWaited += dt;
    if (rosterWaited > 2.5) doRoster();
    return;
  }
  if (rosterCool > 0) return;
  const live = c.singers.filter((s) => s.life !== 'leave').length;
  const target = rosterTarget();
  if (live !== target) { rosterWant = live < target ? 1 : -1; rosterAny = false; rosterWaited = 0; }
}

function rosterTarget() {
  const c = cast;
  return Math.max(c.minN, Math.min(c.maxN, Math.round(c.baseCount + mood.swellSlow * 2.5)));
}

// Carry out the waiting change (on a beat, usually).
function doRoster() {
  const ok = rosterWant > 0 ? addSinger() || (rosterAny && removeSinger()) : removeSinger() || (rosterAny && addSinger());
  rosterWant = 0;
  if (ok) rosterCool = rnd(1.5, 3) * (1 - 0.7 * mood.F);
  return ok;
}

// A noticeable change in the sound: someone joins or someone leaves, on the next beat.
function onMusicChange() {
  const grow = mood.swell > 0.2 ? 0.75 : mood.swell < -0.2 ? 0.25 : 0.5;
  rosterWant = Math.random() < grow ? 1 : -1; rosterAny = true; rosterWaited = 0;
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
const bg = { params: null, cur: null, prev: null, mix: 1, beatsLeft: 12, flash: 0, kick: 0, key: '' };

// A background: a gradient (painted once) plus ribbons, circles or ripples that move every frame.
function newBackground() {
  const saved = R;
  R = makeRng((Math.random() * 4294967296) >>> 0);
  const anchor = cast ? cast.rootHue : 300;
  // Bright pastels only: light, airy grounds that the saturated contour lines sit on.
  // (High saturation with high lightness reads as candy pastel; low saturation turns beige.)
  const lightStyle = weighted(['pastel', 'very light', 'bright'], [50, 25, 25]);
  const L = { pastel: [80, 87], 'very light': [87, 92], bright: [74, 81] }[lightStyle];
  const hue = anchor + sign() * rndInt(6, 18) * 10; // at least 60 degrees from the faces, so the lines stand out
  const p = {
    pattern: weighted(['gradient', 'ribbons', 'circles', 'ripples'], [8, 42, 25, 25]),
    dark: false,
    hue1: hue, hue2: hue + sign() * rndInt(0, 3) * 10,
    sat: rnd(72, 100),
    light1: rnd(L[0], L[1]), light2: rnd(L[0], L[1]),
    strokeHue: chance(0.5) ? hue + 30 : anchor,
  };
  p.amax = { ribbons: rnd(0.12, 0.5), circles: rnd(0.14, 0.3), ripples: rnd(0.3, 0.6), gradient: 0 }[p.pattern];
  // The moving parts, laid out in fractions of the screen so they survive a resize.
  const elems = [];
  const n = p.pattern === 'ribbons' ? rndInt(16, 45) : p.pattern === 'circles' ? rndInt(30, 80) : 0;
  for (let i = 0; i < n; i++) elems.push(makeElem(p));
  bg.beatsLeft = rndInt(6, 20);
  R = saved;
  if (bg.cur) { bg.prev = bg.cur; bg.mix = 0; }
  bg.cur = { p, elems, ripples: [], spawn: 0, t: Math.random() * 100, grad: null, gradKey: '' };
  bg.params = p;
}

function makeElem(p) {
  if (p.pattern === 'ribbons') return {
    x0: rnd(-0.1, 1.1), dx: rnd(-0.5, 0.5), sway: rnd(-0.3, 0.3), st: rnd(0.05, 0.35),
    hue: p.strokeHue + rndInt(-10, 10) * 6, light: rnd(68, 97), alpha: skewed(0.01, p.amax, 2), w: rnd(0.5, 40),
    ph: rnd(0, 6.28), sp: rnd(0.4, 1.6), band: rndInt(0, 11),
  };
  const sg = sign();
  return {
    x: 0.5 + sg * skewed(0, 0.55, 1), y: 0.55 + sign() * skewed(0, 0.5, 2), r: 0.025 * skewed(3, 16, 2),
    hue: p.strokeHue + sg * skewed(0, 20, 2.5) * 8, light: rnd(68, 97), alpha: skewed(0.001, p.amax, 2),
    ph: rnd(0, 6.28), sp: rnd(0.4, 1.6), band: rndInt(0, 11),
  };
}

function spawnRipples(b, n) {
  for (let i = 0; i < n; i++) b.ripples.push({
    x: rnd(0, 1), y: rnd(0, 1), age: 0, life: rnd(1.2, 3.5), v: rnd(0.15, 0.5) * (1 + 2 * mood.F),
    hue: b.p.strokeHue + rndInt(-10, 10) * 6, light: rnd(68, 97), w: rnd(1, 14), alpha: rnd(0.4, 1) * b.p.amax,
  });
  if (b.ripples.length > 60) b.ripples.splice(0, b.ripples.length - 60);
  b.spawn = rnd(0.8, 2);
}

// On a beat the background answers: it lurches forward, ripples spawn, and in frantic music some
// ribbons or circles are thrown somewhere new.
function bgBeat() {
  const b = bg.cur, F = mood.F;
  bg.flash = 1;
  bg.kick = 0.6 + 2.4 * F;
  if (b.p.pattern === 'ripples') spawnRipples(b, 1 + Math.round(4 * F));
  else if (b.elems.length && F > 0.25) {
    const n = Math.round(b.elems.length * 0.5 * (F - 0.25));
    for (let i = 0; i < n; i++) b.elems[Math.floor(Math.random() * b.elems.length)] = makeElem(b.p);
  }
  if (F > 0.55 && chance(0.35)) b.t += rnd(1, 3);
}

function drawBackground(ctx, dt) {
  const F = mood.F;
  // Calm music barely drifts; frantic music races, with a shove on every beat.
  const speed = 0.06 + 0.6 * F + 3.5 * F * F + 3 * bg.kick;
  bg.kick *= 0.86;
  bg.flash *= 0.88;
  for (const b of [bg.cur, bg.prev]) {
    if (!b) continue;
    b.t += dt * speed;
    if (b.p.pattern === 'ripples' && b === bg.cur && (b.spawn -= dt) <= 0) spawnRipples(b, 1);
  }
  drawBgLayer(ctx, bg.cur, 1, dt);
  if (bg.prev && bg.mix < 1) {
    bg.mix = Math.min(1, bg.mix + dt / 1.2);
    drawBgLayer(ctx, bg.prev, 1 - smooth01(bg.mix), dt);
    if (bg.mix >= 1) bg.prev = null;
  }
}

function drawBgLayer(ctx, b, alpha, dt) {
  const dpr = pixelDensity(), W = width, H = height, D = Math.min(W, H);
  const key = `${W}x${H}@${dpr}`;
  if (b.gradKey !== key) {
    b.grad = document.createElement('canvas');
    b.grad.width = Math.round(W * dpr); b.grad.height = Math.round(H * dpr);
    const g = b.grad.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, b.grad.height);
    gr.addColorStop(0, `hsl(${wrapHue(b.p.hue1)} ${b.p.sat}% ${b.p.light1}%)`);
    gr.addColorStop(1, `hsl(${wrapHue(b.p.hue2)} ${b.p.sat}% ${b.p.light2}%)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, b.grad.width, b.grad.height);
    b.gradKey = key;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(b.grad, 0, 0);
  ctx.restore();
  ctx.save();
  const F = mood.F, t = b.t, pulse = 1 + bg.flash * (0.5 + 1.2 * F);
  const reach = 0.4 + 2.2 * F; // how far things swing: a little when calm, wildly when frantic
  const band = (i) => (started ? bands[i] : 0.4);
  if (b.p.pattern === 'ribbons') {
    ctx.lineCap = 'butt';
    for (const e of b.elems) {
      const x0 = (e.x0 + Math.sin(t * 0.5 * e.sp + e.ph * 2) * 0.05 * reach) * W;
      const x1 = x0 + e.dx * W;
      const sway = (e.sway + Math.sin(t * e.sp + e.ph) * 0.14 * reach) * W, st = e.st * H;
      ctx.strokeStyle = `hsla(${wrapHue(e.hue)} ${b.p.sat}% ${e.light}% / ${Math.min(0.9, e.alpha * pulse) * alpha})`;
      ctx.lineWidth = D * 0.004 * e.w * (0.5 + 1.3 * band(e.band));
      ctx.beginPath();
      ctx.moveTo(x0, -0.05 * H);
      ctx.bezierCurveTo(x0 + sway, st, x1 - sway, H - st, x1, H * 1.05);
      ctx.stroke();
    }
  } else if (b.p.pattern === 'circles') {
    for (const e of b.elems) {
      const x = (e.x + Math.sin(t * e.sp + e.ph) * 0.04 * reach) * W, y = (e.y + Math.cos(t * e.sp * 0.8 + e.ph) * 0.04 * reach) * H;
      ctx.fillStyle = `hsla(${wrapHue(e.hue)} ${b.p.sat}% ${e.light}% / ${Math.min(0.9, e.alpha * pulse) * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, D * e.r * (0.75 + 0.6 * band(e.band) + 0.15 * bg.flash), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.p.pattern === 'ripples') {
    for (const r of b.ripples) {
      r.age += dt;
      const u = r.age / r.life;
      if (u >= 1) continue;
      ctx.strokeStyle = `hsla(${wrapHue(r.hue)} ${b.p.sat}% ${r.light}% / ${r.alpha * Math.pow(1 - u, 1.5) * alpha})`;
      ctx.lineWidth = D * 0.002 * r.w * (1 - 0.6 * u);
      ctx.beginPath();
      ctx.arc(r.x * W, r.y * H, D * r.v * r.age * (1 + 0.3 * u), 0, Math.PI * 2);
      ctx.stroke();
    }
    b.ripples = b.ripples.filter((r) => r.age < r.life);
  }
  ctx.restore();
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
  if (mood.hushWas > 0.6 && mood.hush < 0.25) { newCast(0, true); newBackground(); }
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
    newCast(0, true); newBackground();
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
    mood.beats.push(now);
    onBeat();
  }
  beat.avg += (low - beat.avg) * 0.09;
  // Frenzy: beats per second over the last 4 seconds, weighted by loudness (0 calm .. 1 frantic).
  while (mood.beats.length && now - mood.beats[0] > 4000) mood.beats.shift();
  const bps = mood.beats.length / 4;
  const fz = clamp01((bps - 0.5) / 1.3) * (0.4 + 0.6 * clamp01(lvl * 1.8));
  mood.frenzy += (fz - mood.frenzy) * (fz > mood.frenzy ? 0.05 : 0.015);
  mood.F = clamp01(mood.frenzy * wild + Math.max(0, wild - 1) * 0.2); // what everything else reacts to
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
    // every face quivers with its own band, singing or not
    const vt = clamp01((rel - 0.6) / 0.8) * (1 - mood.hush);
    s.vib += (vt - s.vib) * (vt > s.vib ? 0.5 : 0.15);
    s.bob *= 0.86;
    s.punch *= 0.82;
    s.jx *= 0.8; s.jy *= 0.8;
    const bow = singing ? 0 : -4;
    s.tilt += ((mood.tilt + bow) * s.tiltGain + s.baseTilt - s.tilt) * 0.1;
  }
}

function onBeat() {
  const F = mood.F;
  newDetail();
  bgBeat();
  for (const s of cast.singers) {
    s.punch = Math.max(s.punch, 0.5 + 0.5 * F); // the contours jump apart
    if (F > 0.15) s.bob = Math.max(s.bob, 0.4 + 0.6 * F);
    if (F > 0.45) { // frantic: heads jolt, and now and then one turns to face the other way
      s.jx = rnd(-1, 1) * 0.07 * F; s.jy = rnd(-1, 1) * 0.05 * F;
      if (!s.soloist && cast.arrangement !== 'duet' && chance(0.1 * F)) {
        const cx = s.x - s.dir * 0.43 * s.h;
        s.dir = -s.dir; s.x = cx + s.dir * 0.43 * s.h;
      }
    }
  }
  // Heads join and leave on the beat: a waiting change happens now, and the faster the music the
  // more often someone pops in or out (sometimes both at once).
  if (rosterWant) doRoster();
  else if (started && rosterCool <= 0.5 && chance(0.05 + 0.5 * F)) {
    const live = cast.singers.filter((s) => s.life !== 'leave').length, target = rosterTarget();
    if (F > 0.5 && chance(0.6 * F)) morphSinger(); // fast music: a face turns into another
    else {
      rosterWant = chance(live < target ? 0.75 : live > target ? 0.25 : 0.5) ? 1 : -1; rosterAny = true;
      doRoster();
    }
    rosterCool = Math.min(rosterCool, 0.3);
  } else if (started && chance(0.04 + 0.12 * F)) morphSinger(); // now and then, even when calm
  bg.beatsLeft -= 1 + mood.F; // frantic music changes the backdrop sooner
  if (bg.beatsLeft <= 0) newBackground();
  if (++beatsInPhrase >= cast.phraseLen * (1 - 0.5 * mood.F)) {
    if (chance(0.75)) newCast(0, true); // a new arrangement; the background keeps its own timing
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
  for (const s of cast.singers) computeRings(s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const s of cast.singers) drawHead(ctx, s);
  updateStrands(ctx, dt);

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
  mood.F = 0.15;
}

// Where a singer's head is drawn: the brow sits at s.x, the crown at s.yNow. The head tilts about
// the back of the neck.
function singerPivot(s) {
  return { x: s.x - s.dir * (Profiles.G - 0.16) * s.h, y: s.yNow + 0.95 * s.h };
}

// ---------------------------------------------------------------------------------------------------
// Contours in screen space
// ---------------------------------------------------------------------------------------------------
// Every contour is the head's visible outline (crown to the neck cut, as one open line from the back
// of the neck round to the front) resampled to NPTS points, scaled toward one point of the head and
// then placed on screen. Strands use the same number of points, so any contour can become any other.
const NPTS = 200;

function hsbArr(h, s, b) {
  h = wrapHue(h); s = clamp01(s / 100); b = clamp01(b / 100);
  const f = (n) => { const k = (n + h / 60) % 6; return (b - b * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; };
  return [f(5), f(3), f(1)];
}
const rgbaArr = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// The open outline in head units, resampled evenly by length.
const curveTmp = [];
function headCurve(shp, out) {
  const o = shp.outline, n = o.length;
  let i = 0;
  while (i < n && o[i][1] <= NECK_END) i++;
  let j = i;
  while (j + 1 < n && o[j + 1][1] > NECK_END) j++;
  const cross = (p, q) => { const t = (NECK_END - p[1]) / (q[1] - p[1]); return [p[0] + (q[0] - p[0]) * t, NECK_END]; };
  const pts = curveTmp; pts.length = 0;
  if (i >= n || j + 1 >= n || i === 0) { for (const p of o) pts.push(p); pts.push(o[0]); } // (never expected)
  else {
    pts.push(cross(o[j + 1], o[j]));
    for (let q = j + 1; q < n; q++) pts.push(o[q]);
    for (let q = 0; q < i; q++) pts.push(o[q]);
    pts.push(cross(o[i - 1], o[i]));
  }
  resample(pts, out);
}

// Resample a polyline (array of [x, y]) to NPTS evenly spaced points.
function resample(pts, out) {
  const m = pts.length, cum = new Float64Array(m);
  for (let q = 1; q < m; q++) cum[q] = cum[q - 1] + Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]);
  const total = cum[m - 1];
  let q = 0;
  for (let k = 0; k < NPTS; k++) {
    const d = total * k / (NPTS - 1);
    while (q < m - 2 && cum[q + 1] < d) q++;
    const seg = cum[q + 1] - cum[q], t = seg > 0 ? (d - cum[q]) / seg : 0;
    out[2 * k] = pts[q][0] + (pts[q + 1][0] - pts[q][0]) * t;
    out[2 * k + 1] = pts[q][1] + (pts[q + 1][1] - pts[q][1]) * t;
  }
}

// Each frame, every head's contours in screen coordinates, with their colors and widths. The scene
// sets the spacing; the rings spread apart on loud notes, jump apart on the beat, and wobble with
// the singer's band.
function computeRings(s) {
  const shp = Profiles.shape(s.head, s.open);
  if (!s.polys) s.polys = {
    base: new Float32Array(2 * NPTS),
    pts: Array.from({ length: s.rings }, () => new Float32Array(2 * NPTS)),
    style: Array.from({ length: s.rings }, () => ({ rgb: [0, 0, 0], w: 1, a: 1 })),
  };
  const P = s.polys, base = P.base;
  headCurve(shp, base);
  const ring = cast.ring, F = mood.F, m = shp.marks;
  const c = ring.center === 'mouth' ? [m.mouth.x, m.mouth.y] : ring.center === 'eye' ? [m.eye.x, m.eye.y]
    : ring.center === 'skull' ? [shp.skull.cx, shp.skull.cy] : [m.ear.x, m.ear.y];
  const rings = s.rings, gap = ring.gap * s.gapMul;
  const span = Math.min(0.97, Math.min(0.8, gap * (rings - 1)) * (1 + 0.35 * s.e * (0.3 + F) + 0.5 * s.punch * (0.3 + F)));
  const omega = 2.2 + s.band * 1.6, wob = 0.02 * s.vib * (0.4 + 2.5 * F);
  const thin = Math.sqrt(Math.min(1, 7 / rings)); // many rings: finer lines
  const hue = cast.rootHue + s.hueOffset;
  const h = s.h, dir = s.dir;
  const pv = singerPivot(s), ang = -dir * s.tilt * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const ox = s.x - dir * Profiles.G * h + s.jx * h, oy = s.yNow + s.jy * h;
  for (let k = 0; k < rings; k++) {
    const u = k / (rings - 1);
    const sc = 1 - span * Math.pow(u, ring.curve) + Math.sin(clock * omega + k * 0.9 + s.vph) * wob;
    const out = P.pts[k];
    for (let q = 0; q < NPTS; q++) {
      const hx = c[0] + (base[2 * q] - c[0]) * sc, hy = c[1] + (base[2 * q + 1] - c[1]) * sc;
      const dx = ox + dir * h * hx - pv.x, dy = oy + h * hy - pv.y;
      out[2 * q] = pv.x + dx * ca - dy * sa;
      out[2 * q + 1] = pv.y + dx * sa + dy * ca;
    }
    const st = P.style[k];
    st.rgb = hsbArr(hue + s.rowHue[k] * 1.5, 85, 92);
    st.w = (k === 0 ? 3.2 : (2.2 - u * 1.1) * thin) * (1 + s.e * 0.6);
    st.a = (k === 0 ? 1 : 0.85 - u * 0.55) * s.alphaNow;
  }
}

function strokePoly(ctx, pts, rgb, w, a) {
  if (a < 0.01) return;
  ctx.strokeStyle = rgbaArr(rgb, a);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let q = 1; q < NPTS; q++) ctx.lineTo(pts[2 * q], pts[2 * q + 1]);
  ctx.stroke();
}

function drawHead(ctx, s) {
  const P = s.polys;
  for (let k = s.rings - 1; k >= 0; k--) if (s.ready[k]) strokePoly(ctx, P.pts[k], P.style[k].rgb, P.style[k].w, P.style[k].a);
}

// ---------------------------------------------------------------------------------------------------
// Strands: contours on the move
// ---------------------------------------------------------------------------------------------------
// A strand is a line sliding along a track: the track starts with the line's own shape, then a wavy
// transit (a curve that leaves the line's end smoothly and arrives smoothly), then either a target
// contour on a live head (which it slides into) or a straight run off the screen. The line keeps
// its length as it goes (stretching toward the target's length), so it peels off from its leading
// end and noodles along behind it.
const strands = [];
const STRAND_CAP = 500;
const track = { x: new Float64Array(1200), y: new Float64Array(1200), c: new Float64Array(1200), n: 0 };

function polyLen(a, n = a.length / 2) {
  let L = 0;
  for (let q = 1; q < n; q++) L += Math.hypot(a[2 * q] - a[2 * q - 2], a[2 * q + 1] - a[2 * q - 1]);
  return L;
}
const reversed = (a) => { const n = a.length / 2, r = new Float32Array(a.length); for (let q = 0; q < n; q++) { r[2 * q] = a[2 * (n - 1 - q)]; r[2 * q + 1] = a[2 * (n - 1 - q) + 1]; } return r; };

// From point (x, y) heading at angle th, a point just past the edge of the screen.
function exitPoint(x, y, th) {
  const dx = Math.cos(th), dy = Math.sin(th), W = width, H = height;
  let t = 1e9;
  if (dx > 1e-6) t = Math.min(t, (W - x) / dx); else if (dx < -1e-6) t = Math.min(t, -x / dx);
  if (dy > 1e-6) t = Math.min(t, (H - y) / dy); else if (dy < -1e-6) t = Math.min(t, -y / dy);
  t = Math.max(0, t) + Math.min(W, H) * 0.12;
  return [x + dx * t, y + dy * t];
}

function newStrand(prefix, style, o) {
  const st = {
    prefix, L0: polyLen(prefix), rgb: style.rgb.slice(), w: style.w, a: style.a,
    t: 0, T: o.T, easeIn: !!o.easeIn, target: o.target || null, rev: !!o.rev,
    B: o.B || null, dB: o.dB || null,
    a1: rnd(0.25, 0.75), a2: rnd(0.25, 0.75), amp: rnd(0.04, 0.18) * (0.7 + mood.F), freq: rnd(0.8, 3.2), ph: rnd(0, 6.28),
    pts: new Float32Array(2 * NPTS), tp: o.target ? new Float32Array(2 * NPTS) : null,
  };
  strands.push(st);
  return st;
}

// Off the screen, wavily, from the strand's leading end.
function flowOff(prefix, style, th, T) {
  const n = prefix.length / 2, ax = prefix[2 * n - 2], ay = prefix[2 * n - 1];
  const B = exitPoint(ax, ay, th);
  return newStrand(prefix, style, { B, dB: [Math.cos(th), Math.sin(th)], T, easeIn: true });
}

const flowT = () => lerp(2.6, 1.1, mood.F) * rnd(0.8, 1.3);
const formT = () => lerp(2.3, 0.8, mood.F) * rnd(0.8, 1.25);

// A leaving face: every finished contour peels off and flows away in its own direction.
function unravel(s) {
  const base = Math.random() * Math.PI * 2;
  for (let k = 0; k < s.rings; k++) {
    if (!s.ready[k]) continue;
    const pts = s.polys.pts[k];
    flowOff(Math.random() < 0.5 ? pts.slice() : reversed(pts), s.polys.style[k], base + rnd(-1.6, 1.6), flowT() + k * rnd(0, 0.04));
  }
}

// A new face: its contours noodle in from off the screen, from roughly one side, and coalesce.
function formStrands(s, only) {
  computeRings(s);
  s.fade = 1; s.life = 'live'; s.alphaNow = s.alpha;
  computeRings(s);
  const cx = s.x - s.dir * 0.43 * s.h, cy = s.y + 0.6 * s.h;
  const base = Math.random() * Math.PI * 2;
  for (let k = 0; k < s.rings; k++) {
    if (only && !only.includes(k)) continue;
    s.ready[k] = false;
    const th = base + rnd(-0.9, 0.9);
    const S = exitPoint(cx, cy, th), v = [-Math.cos(th), -Math.sin(th)];
    const L1 = polyLen(s.polys.pts[k]);
    const prefix = new Float32Array([S[0] - v[0] * L1, S[1] - v[1] * L1, S[0], S[1]]);
    newStrand(prefix, s.polys.style[k], { target: { s, k }, T: formT() + k * 0.03, rev: Math.random() < 0.5 });
  }
}

// One face into another: contour for contour; spare old ones flow off, missing new ones fly in.
function morphStrands(o, n) {
  computeRings(n);
  n.fade = 1; n.life = 'live'; n.alphaNow = n.alpha;
  computeRings(n);
  const from = [];
  for (let k = 0; k < o.rings; k++) if (o.ready[k]) from.push(k);
  const missing = [];
  for (let k = 0; k < n.rings; k++) {
    n.ready[k] = false;
    if (k < from.length) {
      const pts = o.polys.pts[from[k]];
      newStrand(Math.random() < 0.5 ? pts.slice() : reversed(pts), o.polys.style[from[k]], { target: { s: n, k }, T: formT() + k * 0.03, rev: Math.random() < 0.5 });
    } else missing.push(k);
  }
  if (missing.length) formStrands(n, missing);
  const base = Math.random() * Math.PI * 2;
  for (let q = n.rings; q < from.length; q++) flowOff(o.polys.pts[from[q]].slice(), o.polys.style[from[q]], base + rnd(-1.6, 1.6), flowT());
}

// A whole new scene: old faces turn into new ones in random pairs; the rest unravel or form.
function morphCast(old, fresh) {
  const need = old.reduce((t, s) => t + s.rings, 0) + fresh.reduce((t, s) => t + s.rings, 0);
  if (strands.length + need > STRAND_CAP) return; // too busy: the plain fade
  const olds = old.slice().sort(() => Math.random() - 0.5);
  fresh.forEach((n, i) => { if (i < olds.length) morphStrands(olds[i], n); else formStrands(n); });
  for (let i = fresh.length; i < olds.length; i++) unravel(olds[i]);
}

function updateStrands(ctx, dt) {
  for (let i = strands.length - 1; i >= 0; i--) {
    const st = strands[i];
    // its face left before it arrived: it flows off instead, from where it is
    if (st.target && (!cast.singers.includes(st.target.s) || st.target.s.life === 'leave')) {
      const repl = flowOff(st.pts.slice(), st, Math.random() * Math.PI * 2, flowT());
      strands.pop(); strands[i] = repl;
      continue;
    }
    st.t += dt;
    const u = clamp01(st.t / st.T);
    const e = st.easeIn ? u * u : smooth01(u);
    buildTrack(st);
    const total = track.c[track.n - 1];
    const L1 = st.target ? st.L1 : st.L0;
    const L = lerp(st.L0, L1, e);
    windowOf(st.pts, e * Math.max(0, total - L), L);
    let rgb = st.rgb, w = st.w, a = st.a;
    if (st.target) {
      const ts = st.target.s.polys.style[st.target.k];
      rgb = [lerp(st.rgb[0], ts.rgb[0], e), lerp(st.rgb[1], ts.rgb[1], e), lerp(st.rgb[2], ts.rgb[2], e)];
      w = lerp(st.w, ts.w, e); a = lerp(st.a, ts.a, e);
    }
    strokePoly(ctx, st.pts, rgb, w, a);
    if (u >= 1) {
      if (st.target) st.target.s.ready[st.target.k] = true;
      strands.splice(i, 1);
    }
  }
}

function pushPt(x, y) {
  const n = track.n;
  track.x[n] = x; track.y[n] = y;
  track.c[n] = n ? track.c[n - 1] + Math.hypot(x - track.x[n - 1], y - track.y[n - 1]) : 0;
  track.n++;
}

// The strand's whole track for this frame (the target may have moved).
function buildTrack(st) {
  track.n = 0;
  const pre = st.prefix, np = pre.length / 2;
  for (let q = 0; q < np; q++) pushPt(pre[2 * q], pre[2 * q + 1]);
  const ax = pre[2 * np - 2], ay = pre[2 * np - 1];
  let dax = ax - pre[2 * np - 4], day = ay - pre[2 * np - 3];
  const dl = Math.hypot(dax, day) || 1; dax /= dl; day /= dl;
  let bx, by, dbx, dby, tp = null;
  if (st.target) {
    const src = st.target.s.polys.pts[st.target.k];
    tp = st.tp;
    if (st.rev) for (let q = 0; q < NPTS; q++) { tp[2 * q] = src[2 * (NPTS - 1 - q)]; tp[2 * q + 1] = src[2 * (NPTS - 1 - q) + 1]; }
    else tp.set(src);
    st.L1 = polyLen(tp);
    bx = tp[0]; by = tp[1];
    dbx = tp[2] - tp[0]; dby = tp[3] - tp[1];
    const l = Math.hypot(dbx, dby) || 1; dbx /= l; dby /= l;
  } else { bx = st.B[0]; by = st.B[1]; dbx = st.dB[0]; dby = st.dB[1]; }
  // the wavy transit: a cubic from A to B, plus a sideways wave that vanishes at both ends
  const chx = bx - ax, chy = by - ay, len = Math.hypot(chx, chy);
  if (len > 1) {
    const D = Math.min(width, height);
    const c1x = ax + dax * len * st.a1, c1y = ay + day * len * st.a1;
    const c2x = bx - dbx * len * st.a2, c2y = by - dby * len * st.a2;
    const nx = -chy / len, ny = chx / len, amp = Math.min(st.amp * D, len * 0.35);
    const m = Math.max(12, Math.min(160, Math.round(len / (D * 0.012))));
    for (let j = 1; j < m; j++) {
      const t = j / m, it = 1 - t;
      const x = it * it * it * ax + 3 * it * it * t * c1x + 3 * it * t * t * c2x + t * t * t * bx;
      const y = it * it * it * ay + 3 * it * it * t * c1y + 3 * it * t * t * c2y + t * t * t * by;
      const wv = amp * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * st.freq * t + st.ph);
      pushPt(x + nx * wv, y + ny * wv);
    }
  }
  if (tp) for (let q = 0; q < NPTS; q++) pushPt(tp[2 * q], tp[2 * q + 1]);
  else { pushPt(bx, by); pushPt(bx + dbx * (st.L0 * 1.05 + 10), by + dby * (st.L0 * 1.05 + 10)); }
}

// The stretch of track from distance s0, of length L, as NPTS points.
function windowOf(out, s0, L) {
  const n = track.n, X = track.x, Y = track.y, C = track.c;
  let q = 0;
  for (let k = 0; k < NPTS; k++) {
    const d = s0 + L * k / (NPTS - 1);
    while (q < n - 2 && C[q + 1] < d) q++;
    const seg = C[q + 1] - C[q], t = seg > 0 ? clamp01((d - C[q]) / seg) : 0;
    out[2 * k] = X[q] + (X[q + 1] - X[q]) * t;
    out[2 * k + 1] = Y[q] + (Y[q + 1] - Y[q]) * t;
  }
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
  const wildEl = document.getElementById('live-wild'), wildValue = document.getElementById('live-wild-value');
  const showWild = () => { wildValue.textContent = '×' + wild.toFixed(1); };
  wildEl.addEventListener('input', () => { wild = +wildEl.value / 100; showWild(); });
  showWild();

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
  else if (k === 'n') newCast(0, true);
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
