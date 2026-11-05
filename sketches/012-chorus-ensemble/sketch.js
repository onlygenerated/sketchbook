// =====================================================================================================
// 012 Chorus (ensemble)
// Fork of 011 (round heads, no breath threads or braid) where the ensemble is alive:
//   - hair is back, with many more, finer strands growing from the round skull
//   - faces join as the music swells and leave as it quiets, and any noticeable change in the sound
//     (its spectrum shifting shape) brings someone in or takes someone out; they rise into view and
//     sink away
//   - scenes change more often (every 2 to 8 beats, three times out of four)
//   - the background changes on its own: when the sound turns brighter or darker, or every 6 to 20
//     beats, cross-fading from the old one
//   - a major change in the music (or the music returning after a hush) resets everything
//
// 011 notes: round heads, a skull fitted to each profile's forehead, rows solid to the back edge.
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

// Face profiles from Disentanglemation (Phil's 2022 originals): how far forward the face reaches,
// top of the head to the neck, 0..1000.
const FACE_DATA = [
  /* unisex, smooth */ [48,78,110,135,160,180,200,220,240,260,280,300,315,330,345,360,375,390,400,410,420,430,440,450,460,470,480,490,500,510,505,510,515,520,525,530,535,540,545,550,555,560,565,568,571,571,571,571,571,571,571,571,568,565,562,559,554,550,545,535,525,515,505,495,480,465,450,430,410,390,381,362,352,333,324,314,314,314,314,314,324,333,343,352,362,381,390,410,419,438,457,476,495,514,533,552,571,600,619,638,657,686,705,724,743,771,800,819,838,857,886,914,950,975,985,990,995,995,990,990,970,952,933,905,867,800,743,686,667,657,657,667,676,686,695,705,724,743,771,790,800,800,800,790,781,762,752,733,714,686,648,610,581,571,581,600,619,638,657,676,686,686,686,676,667,648,629,590,543,505,476,467,457,457,457,457,467,476,480,484,488,492,492,492,488,484,478,465,450,440,418,380,330,280,200,110],
  /* female 1 */ [167, 151, 143, 143, 143, 143, 143, 143, 143, 151, 159, 167, 167, 167, 175, 183, 190, 198, 214, 230, 246, 254, 270, 278, 294, 302, 317, 333, 357, 373, 389, 397, 413, 421, 437, 444, 452, 460, 468, 476, 484, 492, 500, 500, 508, 516, 524, 524, 532, 540, 548, 548, 548, 548, 540, 532, 516, 500, 484, 468, 460, 444, 429, 405, 381, 357, 341, 325, 333, 357, 357, 405, 333, 310, 310, 333, 381, 349, 365, 373, 389, 397, 413, 421, 437, 452, 476, 500, 524, 548, 571, 595, 619, 651, 683, 714, 738, 762, 786, 817, 849, 881, 905, 929, 944, 960, 968, 984, 992, 1000, 1000, 992, 984, 976, 976, 960, 937, 905, 881, 841, 794, 738, 690, 651, 619, 603, 595, 595, 595, 595, 595, 603, 611, 619, 627, 635, 651, 659, 675, 690, 698, 690, 675, 659, 635, 595, 548, 524, 524, 556, 587, 619, 627, 619, 603, 587, 571, 556, 540, 532, 516, 508, 492, 484, 476, 468, 460, 460, 468, 476, 484, 492, 500, 500, 500, 500, 500, 500, 500, 492, 484, 476, 468, 460, 452, 444, 429, 413, 397, 365, 310, 246, 183, 103, 60, 0],
  /* female 2 */ [42, 83, 111, 139, 153, 181, 194, 208, 222, 236, 250, 264, 278, 292, 306, 333, 361, 375, 375, 375, 389, 403, 431, 444, 458, 458, 458, 472, 486, 500, 500, 500, 500, 514, 528, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 528, 514, 500, 500, 500, 486, 472, 458, 458, 444, 431, 403, 389, 375, 361, 347, 333, 333, 319, 306, 292, 292, 292, 292, 333, 417, 375, 333, 250, 278, 292, 292, 306, 319, 347, 361, 389, 403, 431, 458, 500, 542, 583, 611, 639, 667, 708, 750, 792, 833, 875, 917, 944, 972, 986, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 986, 972, 944, 931, 917, 903, 806, 694, 597, 583, 597, 611, 625, 639, 653, 681, 694, 722, 750, 792, 833, 861, 875, 875, 875, 875, 861, 847, 833, 819, 792, 750, 694, 639, 625, 667, 722, 764, 778, 806, 819, 833, 833, 833, 833, 819, 806, 792, 764, 708, 639, 583, 556, 542, 542, 542, 542, 542, 556, 569, 583, 583, 583, 583, 583, 583, 569, 556, 542, 542, 542, 528, 514, 486, 472, 444, 417, 361, 292, 250, 208],
  /* female 3 */ [78, 67, 67, 67, 56, 44, 22, 11, 11, 33, 56, 78, 100, 133, 156, 178, 189, 211, 222, 244, 256, 267, 278, 289, 300, 300, 311, 322, 333, 344, 356, 367, 378, 389, 400, 400, 411, 422, 433, 433, 433, 433, 444, 456, 467, 467, 467, 467, 467, 467, 467, 467, 467, 467, 467, 467, 456, 444, 433, 422, 411, 389, 378, 367, 356, 344, 333, 333, 344, 356, 356, 333, 311, 300, 300, 311, 322, 333, 344, 356, 378, 389, 411, 422, 433, 433, 444, 467, 489, 511, 533, 556, 578, 600, 622, 656, 678, 711, 722, 744, 767, 789, 811, 833, 878, 911, 944, 967, 989, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 989, 978, 956, 922, 878, 833, 789, 733, 689, 656, 644, 633, 633, 633, 644, 656, 667, 678, 700, 733, 767, 789, 800, 800, 789, 778, 767, 756, 733, 689, 633, 611, 622, 678, 711, 733, 733, 733, 722, 711, 700, 667, 622, 567, 544, 533, 522, 500, 478, 467, 478, 489, 500, 500, 500, 500, 511, 522, 533, 533, 533, 533, 533, 522, 511, 500, 489, 478, 467, 456, 444, 422, 411, 389, 356, 300, 233, 156, 117, 67],
  /* male 1 */ [322, 310, 310, 322, 333, 345, 345, 345, 356, 368, 379, 391, 402, 414, 425, 437, 448, 460, 471, 483, 494, 506, 517, 517, 529, 540, 552, 552, 552, 552, 563, 575, 586, 586, 598, 609, 621, 621, 621, 632, 644, 655, 655, 655, 655, 655, 655, 655, 655, 655, 655, 655, 655, 644, 632, 621, 609, 586, 552, 517, 494, 483, 471, 460, 437, 414, 391, 368, 379, 391, 402, 379, 356, 356, 379, 391, 402, 402, 425, 437, 460, 471, 494, 517, 552, 586, 621, 655, 690, 713, 736, 747, 770, 782, 793, 805, 816, 839, 851, 874, 885, 908, 920, 943, 954, 966, 977, 989, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 989, 977, 966, 954, 931, 897, 828, 759, 701, 678, 667, 655, 655, 655, 655, 655, 667, 678, 690, 701, 713, 736, 747, 770, 782, 793, 793, 793, 793, 770, 724, 667, 632, 632, 667, 713, 736, 736, 724, 724, 713, 690, 667, 644, 632, 609, 598, 575, 563, 540, 529, 529, 540, 552, 552, 563, 575, 598, 609, 621, 621, 621, 609, 598, 586, 586, 575, 563, 552, 540, 529, 506, 494, 471, 448, 391, 310, 218, 115, 69, 0],
  /* male 2 */ [120,140,165,195,220,240,270,295,330,350,370,390,410,430,445,460,475,490,500,510,520,530,540,550,560,570,575,580,585,590,595,600,605,607,610,613,615,617,619,621,623,625,625,625,625,625,625,623,621,619,616,613,610,607,603,599,595,590,585,575,565,555,545,535,520,510,485,455,420,390,370,350,330,320,310,305,300,300,300,300,305,310,320,330,350,370,390,410,430,450,470,490,510,530,560,590,620,644,689,711,756,778,822,844,885,910,925,945,955,965,980,990,990,990,990,980,970,956,911,889,844,711,556,470,450,450,460,480,490,520,556,578,630,670,720,755,770,776,778,776,774,772,750,735,710,676,640,600,560,500,540,610,660,690,710,720,733,733,733,733,725,700,680,660,578,500,470,440,430,440,450,470,490,515,520,525,530,532,535,535,532,530,520,500,490,480,470,455,440,420,395,360,320,270,180,0],
  /* male 3 */ [127,143,159,175,206,222,230,240,254,270,302,315,330,340,349,370,388,405,418,430,440,445,455,460,464,468,472,476,480,484,488,492,500,508,515,520,525,528,531,534,537,537,537,537,537,537,537,534,531,528,525,520,515,508,492,492,492,492,476,460,444,429,413,397,381,381,365,349,333,333,317,305,302,302,305,305,325,333,349,365,381,397,413,429,444,460,476,492,508,540,556,587,603,635,651,683,698,730,746,778,794,825,841,873,889,921,937,968,984,1000,1000,1000,1000,1000,1000,984,968,937,905,825,746,667,619,571,540,524,524,524,540,556,587,603,635,651,683,714,746,762,762,762,762,762,746,730,698,667,619,587,620,660,690,705,714,714,698,683,667,651,603,540,492,476,476,460,460,444,460,460,476,476,485,495,505,515,522,522,522,522,522,522,520,515,512,508,500,485,480,468,455,430,410,380,350,280,180,0]
];

// ---------------------------------------------------------------------------------------------------
// Profiles: landmarks found from the data (eye at the bridge of the nose, mouth between the lips)
// ---------------------------------------------------------------------------------------------------
const DEPTH = 0.21;      // how far the face reaches forward at 1000, as a fraction of head height
const MOUTH_GAP = 0.085; // how far the jaw drops at full voice, as a fraction of head height

const PROFILES = FACE_DATA.map((a) => {
  const n = a.length;
  const v = a.map((x, i) => {
    let s = 0, c = 0;
    for (let k = -2; k <= 2; k++) if (a[i + k] !== undefined) { s += a[i + k]; c++; }
    return s / c / 1000;
  });
  let nose = Math.floor(n * 0.55), best = -1;
  for (let i = Math.floor(n * 0.45); i < Math.floor(n * 0.75); i++) if (v[i] > best) { best = v[i]; nose = i; }
  let bridge = Math.floor(n * 0.38), low = 9;
  for (let i = Math.floor(n * 0.25); i < nose - 5; i++) if (v[i] < low) { low = v[i]; bridge = i; }
  const localMin = (s) => { for (let i = s + 1; i < n - 1; i++) if (v[i] <= v[i - 1] && v[i] < v[i + 1]) return i; return -1; };
  const localMax = (s) => { for (let i = s + 1; i < n - 1; i++) if (v[i] >= v[i - 1] && v[i] > v[i + 1]) return i; return -1; };
  const upperLip = localMax(localMin(nose));
  let mouth = upperLip > 0 ? localMin(upperLip) : -1;
  if (mouth < 0 || mouth > n * 0.9) mouth = Math.floor(n * 0.76);
  return { v: a.map((x) => x / 1000), n, bridgeT: bridge / n, noseT: nose / n, mouthT: mouth / n };
});

function depthAt(p, t) {
  const x = Math.min(Math.max(t, 0), 1) * (p.n - 1);
  const i = Math.floor(x), f = x - i;
  const a = p.v[i], b = p.v[Math.min(i + 1, p.n - 1)];
  return a + (b - a) * f;
}

// Depth of the face at height t with the mouth open by `open` (0..1): the lips part, the jaw drops.
function faceDepth(p, t, open) {
  const tm = p.mouthT, gap = open * MOUTH_GAP;
  if (t <= tm || gap <= 0) return depthAt(p, t);
  if (t < tm + gap) {
    const u = (t - tm) / gap;
    return depthAt(p, tm) - open * 0.32 * Math.sin(Math.PI * u);
  }
  return depthAt(p, t - gap) - open * 0.035;
}

// The skull: an ellipse behind the face, fitted so that it meets the top of the profile (the
// profiles start at the hairline, so the crown sits a little above them). All in head heights,
// relative to the face line: positive is toward the face.
const SKULL = { back: 0.56, cy: 0.33, ry: 0.42 };
function skullFor(p0) {
  const k = Math.sqrt(1 - Math.pow(SKULL.cy / SKULL.ry, 2));
  const rx = (p0 + SKULL.back) / (1 + k); // passes through (p0, 0): the top of the forehead
  return { cx: -SKULL.back + rx, rx, top: SKULL.cy - SKULL.ry };
}
function skullHalf(sk, t) {
  const u = (t - SKULL.cy) / SKULL.ry;
  return u <= -1 || u >= 1 ? 0 : sk.rx * Math.sqrt(1 - u * u);
}
// How far the head reaches behind the face line: round skull, then the nape, then the neck.
function backAt(sk, t) {
  const skull = t <= SKULL.cy + SKULL.ry ? -(sk.cx - skullHalf(sk, t)) : 0;
  const neck = 0.15 + 0.08 * clamp01((t - 0.75) / 0.4);
  return Math.max(skull, neck);
}

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
  c.lineStyle = weighted(['bands', 'thin', 'dots'], [60, 25, 15]);
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
    prof: pick(PROFILES), depthScale: rnd(0.92, 1.12),
    slot: rndInt(0, 6), hueOffset: 0, join: chance(0.3) ? rnd(0.15, 0.55) : 0, silent: false,
    tiltGain: rnd(0.6, 1.25), baseTilt: rnd(-3, 3), alpha: 1, band: 0,
    hair: chance(0.65) ? {
      len: weighted([0.5, 0.8, 1.15], [30, 40, 30]), sweep: rnd(0.0, 0.12), strands: rndInt(30, 70),
      width: rnd(0.0035, 0.008), chaos: rnd(0.2, 1), seeds: [],
    } : null,
    e: 0, avg: 0.2, open: 0, eye: 0, tilt: 0, fade: 0, life: 'enter',
    ...extra,
  };
  if (s.hair) for (let i = 0; i < s.hair.strands; i++) s.hair.seeds.push([rnd(-1, 1), rnd(-1, 1), rnd(0.35, 1), rnd(0, 6.28), rnd(-1, 1)]);
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

// Where a point in a singer's own frame ends up after the head tilts (pivot at the back of the neck).
function singerPivot(s) {
  return { x: s.x - s.dir * 0.12 * s.h, y: s.yNow + 0.95 * s.h };
}
function toWorld(s, x, y) {
  const pv = singerPivot(s);
  const a = -s.dir * s.tilt * Math.PI / 180;
  const c = Math.cos(a), sn = Math.sin(a);
  const dx = x - pv.x, dy = y - pv.y;
  return { x: pv.x + dx * c - dy * sn, y: pv.y + dx * sn + dy * c };
}
function drawSinger(ctx, s, sp0) {
  const H = height;
  const h = s.h, dir = s.dir, p = s.prof;
  const sp = Math.max(2.5, sp0 * h);
  const style = cast.lineStyle;
  const thick = style === 'bands' ? sp * 0.5 : style === 'thin' ? Math.max(1, sp * 0.16) : Math.max(0.8, sp * 0.09);
  const tipLen = style === 'thin' ? sp * 0.5 : sp * 0.75;
  const tipW = style === 'thin' ? sp * 0.13 : sp * 0.25;
  const hue = cast.rootHue + s.hueOffset;

  ctx.save();
  const pv = singerPivot(s);
  ctx.translate(pv.x, pv.y);
  ctx.rotate(-dir * s.tilt * Math.PI / 180);
  ctx.translate(-pv.x, -pv.y);
  ctx.globalAlpha = s.alphaNow;

  // Lay out the rows from the crown downward, until they leave the screen. Above the profile's
  // first row (the hairline) the front of the head follows the skull.
  const rows = [];
  const maxT = (H + h * 0.3 - s.yNow) / h;
  const sk = skullFor(depthAt(p, 0) * DEPTH * s.depthScale);
  for (let i = 0; ; i++) {
    const y = s.yNow + sk.top * h + (i + 0.5) * sp;
    const t = (y - s.yNow) / h;
    if (t > Math.min(maxT, 1.25)) break;
    const front = t < 0 ? sk.cx + skullHalf(sk, t) : faceDepth(p, Math.min(t, 1), s.open) * DEPTH * s.depthScale;
    const xf = s.x + dir * front * h;
    const xb = s.x - dir * backAt(sk, t) * h;
    if ((xf - xb) * dir < tipLen * 1.2) continue;
    const rh = hue + s.rowHue[i % 400];
    rows.push({ i, y, xf, xb, rgb: hsbRgb(rh, cast.lineSat - (s.singing ? 0 : 12), cast.lineBri) });
  }

  const drawRow = (r) => {
    const tipBase = r.xf - dir * tipLen;
    // drop shadow under the front of the row (skipped for faded back-row singers)
    if (s.alpha < 0.8) { ctx.globalAlpha = s.alphaNow; } else {
    ctx.globalAlpha = s.alphaNow * 0.18;
    ctx.fillStyle = '#000';
    if (style === 'dots') {
      ctx.beginPath(); ctx.arc(r.xf, r.y + sp * 0.12, sp * 0.22, 0, Math.PI * 2); ctx.fill();
    } else {
      const xm = lerp(r.xb, tipBase, 0.2);
      ctx.fillRect(Math.min(xm, tipBase), r.y + thick * 0.35, Math.abs(tipBase - xm), thick);
      ctx.beginPath(); ctx.moveTo(r.xf, r.y + thick * 0.35); ctx.lineTo(tipBase, r.y + thick * 0.35 - tipW); ctx.lineTo(tipBase, r.y + thick * 0.35 + tipW); ctx.fill();
    }
    }
    ctx.globalAlpha = s.alphaNow;
    // the row itself: fades in from behind the head, solid at the face
    const g = ctx.createLinearGradient(r.xb, 0, tipBase, 0);
    g.addColorStop(0, rgba(r.rgb, 0));                                 // a soft back edge
    g.addColorStop(0.18, rgba(r.rgb, style === 'dots' ? 0.4 : 0.92));  // then solid to the face
    g.addColorStop(1, rgba(r.rgb, style === 'dots' ? 0.6 : 1));
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(r.xb, tipBase), r.y - thick / 2, Math.abs(tipBase - r.xb) + 0.5, thick);
    ctx.fillStyle = rgba(r.rgb, 1);
    ctx.beginPath();
    if (style === 'dots') {
      ctx.arc(r.xf, r.y, sp * 0.22, 0, Math.PI * 2);
    } else {
      ctx.moveTo(r.xf, r.y); ctx.lineTo(tipBase, r.y - tipW); ctx.lineTo(tipBase, r.y + tipW); ctx.closePath();
    }
    ctx.fill();
  };

  // Weave: even rows, then the hair, then odd rows, so strands pass over and under.
  for (const r of rows) if (r.i % 2 === 0) drawRow(r);
  if (s.hair) drawHair(ctx, s, hue, sk);
  for (const r of rows) if (r.i % 2 === 1) drawRow(r);

  drawEye(ctx, s);
  ctx.restore();
}

function drawHair(ctx, s, hue, sk) {
  // Strands grow along the scalp (the skull curve, from the top of the forehead over the crown to
  // the back of the head) and fall down behind it, sweeping back.
  const hr = s.hair, h = s.h, dir = s.dir, y0 = s.yNow;
  const th0 = Math.asin(SKULL.cy / SKULL.ry) + 0.06; // just behind where the skull meets the forehead
  const shadows = s.alpha >= 0.8;
  ctx.lineCap = 'butt';
  for (let k = 0; k < hr.strands; k++) {
    const [j1, j2, a, ph, j3] = hr.seeds[k];
    const u = clamp01((k + 0.5 + j3 * 0.45) / hr.strands); // 0 front .. 1 back
    const th = lerp(th0, Math.PI * 0.99, u);
    const cx = Math.cos(th), cy = -Math.sin(th);
    const sx = s.x + dir * (sk.cx + cx * sk.rx * 1.02) * h;
    const sy = y0 + (SKULL.cy + cy * SKULL.ry * 1.02) * h;
    let nx = dir * cx / sk.rx, ny = cy / SKULL.ry;
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const len = hr.len * h * (0.8 + 0.25 * a);
    const sway = Math.sin(clock * 0.6 + ph) * 0.012 * h;
    const ex = s.x - dir * (0.28 + 0.36 * u + hr.sweep) * h + j1 * hr.chaos * 0.05 * h + sway;
    const ey = Math.max(sy + 0.12 * h, y0 + len);
    const lift = (0.04 + 0.08 * u) * h; // front strands lie flatter, back strands fall away
    const c1x = sx + nx * lift + j2 * hr.chaos * 0.03 * h, c1y = sy + ny * lift;
    const c2x = ex + dir * 0.07 * h + j2 * hr.chaos * 0.06 * h + sway, c2y = lerp(sy, ey, 0.55);
    const w = h * hr.width * (0.45 + 0.9 * a);
    if (shadows) {
      ctx.globalAlpha = s.alphaNow * 0.16 * a;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(sx + w * 0.4, sy + w * 0.4); ctx.bezierCurveTo(c1x + w * 0.4, c1y + w * 0.4, c2x + w * 0.4, c2y + w * 0.4, ex + w * 0.4, ey);
      ctx.stroke();
    }
    ctx.globalAlpha = s.alphaNow * (0.45 + 0.55 * a);
    ctx.strokeStyle = rgba(hsbRgb(hue + j1 * 18, cast.lineSat * 0.95, cast.lineBri), 1);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    ctx.stroke();
  }
  ctx.globalAlpha = s.alphaNow;
}

function drawEye(ctx, s) {
  const p = s.prof, h = s.h, dir = s.dir;
  const te = p.bridgeT - 0.012;
  const ex = s.x + dir * (depthAt(p, te) * DEPTH * s.depthScale - 0.085) * h;
  const ey = s.yNow + te * h;
  const w = 0.034 * h;
  const ink = bg.params.dark ? 'rgba(255,250,240,0.92)' : 'rgba(20,14,24,0.85)';
  // a soft socket so the eye reads against the stripes
  ctx.globalAlpha = s.alphaNow * 0.35;
  ctx.fillStyle = bg.params.dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(ex, ey, w * 1.35, w * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = s.alphaNow;
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.2, 0.007 * h);
  const open = s.eye;
  if (open < 0.35) {
    // closed: the lower curve of a lid, with a few lashes
    ctx.beginPath();
    ctx.moveTo(ex - dir * w, ey - w * 0.1);
    ctx.quadraticCurveTo(ex, ey + w * 0.55, ex + dir * w, ey - w * 0.2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, 0.004 * h);
    for (let k = 0; k < 3; k++) {
      const u = -0.5 + k * 0.5;
      const lx = ex + dir * u * w, ly = ey + w * 0.25 * (1 - u * u) + w * 0.05;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - dir * w * 0.12, ly + w * 0.32); ctx.stroke();
    }
  } else {
    const o = smooth01((open - 0.35) / 0.65);
    ctx.fillStyle = bg.params.dark ? 'rgba(10,8,14,0.9)' : 'rgba(255,252,246,0.95)';
    ctx.beginPath(); ctx.ellipse(ex, ey, w, w * (0.15 + 0.4 * o), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(ex + dir * w * 0.35, ey, w * (0.15 + 0.2 * o), 0, Math.PI * 2); ctx.fill();
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
