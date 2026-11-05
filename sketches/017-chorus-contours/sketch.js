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
// Stories (fourth pass): the faces are always arranged for a reason: a procession, two people face
// to face, a round passing the song along, generations in a line, a face and its reflection, a
// crowd with one who turns away. A story lasts a phrase. On every beat it takes one step (the
// procession walks on, the round turns, the eldest leaves and a child joins) and every face is
// drawn anew: each person's contours flow from where they were to where they are now.
//
// Fifth pass: two faces face to face is "home", every third story. A garden of several turning
// flowers of faces. Reflections meet their face at the waterline as one continuous outline. The
// procession leader (and the eldest, and the top of a rising column) walks off the screen before
// leaving. Busy stories cap their contours. Reflections stand on a wavy waterline.
//
// Sixth pass: a story lasts at most 8 beats. Backgrounds answer the beat in one of several ways
// (whipping to the other side, pumping, cutting to new shapes, jumping in hue). No face has more
// than 10 contours. Now and then someone turns to face the other way, in a snap or a slow turn,
// and keeps facing that way while the story goes on.
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
let cast = null;          // the faces of the current beat: story, palette, singers
let lowRes = false;
let paused = false;
let started = false;      // a source has been chosen
let clock = 0;            // seconds of animation (stops while paused)
let bands = new Array(12).fill(0);
let bassAbs = 0;
let lastStep = 0;         // when the story last took a step
let wild = 1.5;           // the wild slider: scales the frenzy (0 calm, 1 as the music says, 2.5 unhinged)

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
// ---------------------------------------------------------------------------------------------------
// Stories: every arrangement has a reason
// ---------------------------------------------------------------------------------------------------
// A story is how the faces are arranged and why. It lasts a phrase; on every beat it takes a step
// and every face is drawn anew. Each slot carries an id for the person in it: when a person moves
// (the procession walks on, the round turns) their contours travel with them to their new place.
// A person who leaves the story unravels; a person who arrives is formed from incoming lines.
let story = null;
const NECK_END = 1.3; // the neck fades out by here, in head heights below the crown

// Head sizes and fitting. A head is placed by its center (cx, cy): the crown is 0.6 h above it and
// the end of the neck 0.7 h below; it is about 0.95 h wide.
const fitH = (cy, h, H) => Math.max(10, Math.min(h, (cy - H * 0.03) / 0.6, (H * 0.97 - cy) / 0.7));
const wrapIndex = (i, n) => ((i % n) + n) % n;

// Where a seat at the council table is when the table has turned by angle: its place on the
// ellipse, its size (smaller at the far side), and which way the face turns toward the middle
// (full profile at the ends of the table, narrowing toward the near and far sides).
function councilSeat(o, angle, W) {
  const th = o.th0 + angle, depth = (Math.sin(th) + 1) / 2;
  const cx = W / 2 + o.rx * Math.cos(th);
  return { cx, cy: o.cy0 + o.ry * Math.sin(th), h: o.h0 * (0.7 + 0.3 * depth), depth, dir: cx < W / 2 ? 1 : -1, squash: narrowTo(-Math.cos(th)) * (o.flip ? -1 : 1) };
}
// never thinner than a fifth of a profile, so a face seen from the front still reads as a face
function narrowTo(c) {
  return (c < 0 ? -1 : 1) * (0.2 + 0.8 * Math.abs(c));
}

// A ring of n faces in a square of side D around (cx, cy), crowns outward like petals, each facing
// the back of the next; each beat everyone moves on one place (or, with pairs, neighbours face each
// other and stay put).
function petals(out, cx, cy, D, n, dir, b, prefix, pairs, slot0 = 0) {
  const h = Math.min(D * 0.3, (2 * Math.PI * 0.46 * D) / (0.95 * n + 4.4)), R0 = 0.46 * D - 0.7 * h;
  for (let j = 0; j < n; j++) {
    const th = -Math.PI / 2 + (2 * Math.PI * j) / n;
    out.push({ cx: cx + R0 * Math.cos(th), cy: cy + R0 * Math.sin(th), h, dir: pairs ? (j % 2 ? -1 : 1) : dir, rot: th + Math.PI / 2,
      id: prefix + (pairs ? j : wrapIndex(j - dir * b, n)), slot: (slot0 + j) % 7 });
  }
  return out;
}

const STORIES = {
  // A procession: everyone in one straight line, facing the same way, walking on. Each beat the
  // line steps forward: the one in front walks off and someone new joins at the back.
  procession: {
    weight: 14, tall: 0.6, maxRings: 7,
    init: (W, H, tall) => ({ n: tall ? rndInt(3, 4) : rndInt(4, 7), dir: sign(), yc: weighted([0.5, 0.4, 0.6], [50, 25, 25]) }),
    layout(st, b, W, H) {
      const sx = (W * 0.92) / st.n, cy = H * st.yc;
      const h = fitH(cy, Math.min(Math.min(H, W * 1.1) * 0.5, sx * 1.05), H);
      // one extra place past the front, off the screen: the leader walks off there before going
      return Array.from({ length: st.n + 1 }, (_, p) => {
        const x = p < st.n ? W * 0.04 + sx * (p + 0.5) : W + 0.6 * h;
        return { cx: st.dir > 0 ? x : W - x, cy, h, dir: st.dir, id: b - p, slot: Math.min(p, 6) };
      });
    },
  },
  // Generations: a child, grown-ups and an elder in one line, standing on the same ground, facing
  // the same way. Each beat everyone moves on a step: the elder at the front walks on and is gone,
  // and a child joins at the back.
  lineage: {
    weight: 10, tall: 0.6, maxRings: 8,
    init: (W, H, tall) => ({ n: tall ? 3 : rndInt(4, 5), dir: sign(), ground: rnd(0.78, 0.92), mid: [pick(['fem', 'masc', 'adult']), pick(['fem', 'masc', 'adult']), pick(['fem', 'masc'])] }),
    layout(st, b, W, H) {
      const sx = (W * 0.92) / st.n, hMax = Math.min(Math.min(H, W * 1.1) * 0.62, sx * 1.15, (H * st.ground - H * 0.04) / 1.3);
      return Array.from({ length: st.n + 1 }, (_, p) => {
        if (p === st.n) { // past the front, off the screen: where the elder walks off to
          const h = hMax;
          return { cx: st.dir > 0 ? W + 0.6 * h : -0.6 * h, cy: H * st.ground - 0.7 * h, h, dir: st.dir, kind: 'elder', id: b - p, slot: p };
        }
        const age = p / (st.n - 1); // 0 the child at the back, 1 the elder in front
        const kind = p === 0 ? 'child' : p === st.n - 1 ? 'elder' : st.mid[(p - 1) % 3];
        const h = hMax * (0.7 + 0.3 * age) / (kind === 'child' ? 0.82 : 1);
        const x = W * 0.04 + sx * (p + 0.5), hs = kind === 'child' ? h * 0.82 : h;
        return { cx: st.dir > 0 ? x : W - x, cy: H * st.ground - 0.7 * hs, h, dir: st.dir, kind, id: b - p, slot: p };
      });
    },
  },
  // Face to face: two people close together, a conversation or a quarrel. They take turns: the one
  // speaking leans in a little larger. Sometimes it is one person facing their own double.
  faceoff: {
    weight: 3,
    init: () => ({ same: chance(0.3), yc: rnd(0.45, 0.55), turns: weighted([1, 2], [60, 40]) }),
    layout(st, b, W, H) {
      const cy = H * st.yc, h0 = fitH(cy, Math.min(Math.min(H, W * 1.1) * 0.66, (W * 0.92) / 2.0), H);
      const head = st.same ? Profiles.make(R) : null, speaker = Math.floor(b / st.turns) % 2;
      return [0, 1].map((i) => {
        const h = h0 * (i === speaker ? 1.06 : 0.94);
        return { cx: W / 2 + (i ? 1 : -1) * 0.57 * h0, cy, h, dir: i ? -1 : 1, id: i ? 'R' : 'L', slot: i ? 5 : 1, head, silent: i !== speaker };
      });
    },
  },
  // Call and response: two small choirs face each other across the middle and answer each other,
  // a few beats each.
  choirs: {
    weight: 8,
    init: (W, H, tall) => ({ m: tall ? 3 : rndInt(2, 3), turns: weighted([2, 4], [50, 50]) }),
    layout(st, b, W, H) {
      const m = st.m, sy = (H * 0.9) / m, h = Math.min(sy / 1.25, W * 0.32);
      const calling = Math.floor(b / st.turns) % 2, out = [];
      for (const side of [0, 1]) for (let r = 0; r < m; r++) {
        const sing = side === calling;
        out.push({ cx: side ? W * 0.74 : W * 0.26, cy: H * 0.05 + sy * (r + 0.5) - 0.05 * h, h: h * (sing ? 1.05 : 0.92), dir: side ? -1 : 1, id: `${side}${r}`, slot: side * 4 + r, silent: !sing });
      }
      return out;
    },
  },
  // A round: voices in a circle, each facing the back of the next, passing the song along. Each
  // beat the circle turns one place, like a flower of faces turning.
  round: {
    weight: 12, maxRings: 9,
    init: (W, H, tall) => ({ n: tall ? rndInt(4, 6) : rndInt(5, 8), dir: sign(), pairs: chance(0.25) }),
    layout(st, b, W, H) {
      return petals([], W / 2, H / 2, Math.min(W, H), st.n, st.dir, b, '', st.pairs);
    },
  },
  // A garden: several small rounds, each its own circle passing its own song, turning against its
  // neighbours like gears.
  garden: {
    weight: 12, maxRings: 6,
    init: (W, H, tall) => {
      const g = tall ? 2 : weighted([2, 3, 4], [40, 40, 20]);
      return { n: Array.from({ length: g }, () => rndInt(5, 7)), dir: sign(), stagger: g > 2 && chance(0.6), y: rnd(0.45, 0.55) };
    },
    layout(st, b, W, H) {
      const g = st.n.length, tall = W < H, out = [];
      for (let i = 0; i < g; i++) {
        const lift = st.stagger ? (i % 2 ? 0.13 : -0.13) : 0;
        const cx = tall ? W / 2 : (W * (i + 0.5)) / g, cy = tall ? (H * (i + 0.5)) / g : H * (st.y + lift);
        const D = tall ? Math.min(W, H / g) : Math.min(W / g, H * (1 - 2 * Math.abs(lift)));
        petals(out, cx, cy, D * 0.98, st.n[i], i % 2 ? -st.dir : st.dir, b, `${i}:`, false, i * 2);
      }
      return out;
    },
  },
  // A council: people seated around a table, seen from the side; each half of the ring turns to
  // the middle. Those at the far side are smaller. One speaks at a time, and the word goes round.
  // Half the time the table turns like a carousel: everyone rides round, turning as they go, so
  // each face narrows as it passes the near and far sides of the table (seen from behind, or from
  // the front) and opens into profile again at the ends. It turns faster on the beat.
  council: {
    weight: 8, tall: 0.5,
    init: (W, H, tall) => ({ n: tall ? rndInt(4, 5) : rndInt(5, 8), order: chance(0.6) ? 1 : 0, spin: rnd(0, 6.28), carousel: chance(0.5), way: sign(), angle: 0, surge: 0 }),
    layout(st, b, W, H) {
      const n = st.n, rx = W * 0.33, ry = H * 0.17, cy0 = H * 0.5;
      const h0 = Math.min(Math.min(H, W * 1.1) * 0.42, (2 * rx) / (n / 2 + 0.6));
      const speaker = st.order ? b % n : Math.floor(Math.random() * n);
      return Array.from({ length: n }, (_, j) => {
        const orbit = { th0: st.spin + (2 * Math.PI * j) / n, rx, ry, cy0, h0: fitH(cy0, h0, H) * (j === speaker ? 1.1 : 0.95), flip: false };
        const p = councilSeat(orbit, st.carousel ? st.angle : 0, W);
        return { cx: p.cx, cy: p.cy, h: p.h, dir: p.dir, squash: st.carousel ? p.squash : undefined, orbit: st.carousel ? orbit : undefined,
          id: j, slot: j % 7, silent: j !== speaker, alpha: 0.75 + 0.25 * p.depth };
      });
    },
  },
  // A performer and an audience: one large face, and rows of small faces turned toward it,
  // mostly listening; now and then one of them sings back.
  audience: {
    weight: 8, maxRings: 7,
    init: (W, H, tall) => ({ side: sign(), rows: tall ? 3 : rndInt(2, 3), cols: tall ? 2 : rndInt(3, 5) }),
    layout(st, b, W, H) {
      const pc = st.side < 0 ? W * 0.22 : W * 0.78, cy = H * 0.5;
      const hp = fitH(cy, Math.min(Math.min(H, W * 1.1) * 0.62, W * 0.4), H);
      const x0 = st.side < 0 ? W * 0.47 : W * 0.03, aw = W * 0.5, cw = aw / st.cols, ch = (H * 0.84) / st.rows;
      const ha = Math.min(cw * 0.95, ch / 1.3), back = Math.floor(Math.random() * st.rows * st.cols);
      const out = [{ cx: pc, cy, h: hp, dir: -st.side, id: 'P', slot: 0 }];
      for (let r = 0; r < st.rows; r++) for (let c = 0; c < st.cols; c++) {
        const k = r * st.cols + c, stagger = r % 2 ? 0.5 : 0;
        out.push({ cx: x0 + cw * Math.min(st.cols - 0.5, c + 0.25 + stagger), cy: H * 0.08 + ch * (r + 0.5), h: ha, dir: st.side, id: `a${k}`, slot: 3 + (r % 3), silent: k !== back });
      }
      return out;
    },
  },
  // A face and its reflection, as in still water: the same face upside down beneath it. Sometimes a
  // few people stand along the shore.
  reflection: {
    weight: 9,
    init: (W, H, tall) => ({ n: tall ? 1 : weighted([1, 2, 3], [50, 30, 20]), horizon: rnd(0.48, 0.56), dir: sign(), facing: chance(0.3) }),
    layout(st, b, W, H) {
      const sx = (W * 0.9) / st.n, hz = H * st.horizon;
      const h = Math.min(Math.min(hz, H - hz) * 0.94 / 1.3, sx * 0.95), out = [];
      for (let i = 0; i < st.n; i++) {
        const head = Profiles.make(R);
        const dir = st.facing && st.n > 1 ? (i < st.n / 2 ? 1 : -1) : st.dir, cx = W * 0.05 + sx * (i + 0.5);
        out.push({ cx, cy: hz - 0.7 * h, h, dir, head, id: `u${i}`, slot: i * 2, anchor: true });
        // the reflection is the face above mirrored in the waterline, so the two meet at the neck
        out.push({ cx, cy: hz + 0.7 * h, h, dir: -dir, rot: Math.PI, head, id: `d${i}`, slot: i * 2, alpha: 0.55, mirror: out.length - 1, axis: hz });
      }
      return out;
    },
  },
  // A crowd in rows, all facing the same way, except one who has turned to face the other way.
  // Each beat it is someone else who turns away.
  conformity: {
    weight: 8, maxRings: 6,
    init: (W, H, tall) => ({ rows: tall ? 4 : rndInt(2, 3), cols: tall ? 2 : rndInt(4, 6), dir: sign() }),
    layout(st, b, W, H) {
      const cw = (W * 0.92) / st.cols, ch = (H * 0.9) / st.rows, h = Math.min(cw * 0.98, ch / 1.3);
      const odd = Math.floor(Math.random() * st.rows * st.cols), out = [];
      for (let r = 0; r < st.rows; r++) for (let c = 0; c < st.cols; c++) {
        const k = r * st.cols + c;
        out.push({ cx: W * 0.04 + cw * (c + 0.5), cy: H * 0.05 + ch * (r + 0.5) - 0.05 * h, h, dir: k === odd ? -st.dir : st.dir, id: k, slot: k === odd ? 6 : 2 + (r % 2) });
      }
      return out;
    },
  },
  // Rising: a column of faces, one above the other. Each beat they all move up a place: the top one
  // drifts away and a new one rises from below.
  ascent: {
    weight: 4, tall: 3, maxRings: 9,
    init: (W, H, tall) => ({ n: tall ? rndInt(3, 5) : rndInt(2, 3), dir: sign(), cols: tall ? 1 : weighted([1, 2, 3], [40, 40, 20]) }),
    layout(st, b, W, H) {
      const sy = (H * 0.94) / st.n, h = Math.min(sy * 1.02, (W * 0.8) / st.cols / 0.96), out = [];
      for (let c = 0; c < st.cols; c++) for (let p = 0; p <= st.n; p++) { // p = n: above the screen
        const dir = st.cols > 1 && c % 2 ? -st.dir : st.dir;
        out.push({ cx: (W * (c + 0.5)) / st.cols, cy: p < st.n ? H * 0.97 - sy * (p + 0.5) : -0.75 * h, h, dir, id: `${c}:${b - p}`, slot: Math.min(p, 6) });
      }
      return out;
    },
  },
  // Small groups in conversation, as at a party: pairs facing each other, and a trio where two
  // turn to one. Within each group they take turns.
  clusters: {
    weight: 7,
    init: (W, H, tall) => {
      const g = tall ? 2 : rndInt(2, 3), groups = [];
      for (let i = 0; i < g; i++) groups.push({ size: chance(0.6) ? 2 : 3, x: (i + 0.5) / g + rnd(-0.04, 0.04), y: rnd(0.35, 0.65), flip: sign() });
      return { groups };
    },
    layout(st, b, W, H) {
      const g = st.groups.length, out = [];
      st.groups.forEach((G, i) => {
        const cy = H * G.y, h = fitH(cy, Math.min((W / g) * 0.42, H * 0.5), H), cx = W * G.x;
        const speaker = (b + i) % G.size;
        const members = G.size === 2 ? [[-0.58, 1], [0.58, -1]] : [[-0.5, 1], [0.55, -1], [-0.9, 1]];
        members.forEach(([dx, d], j) => out.push({ cx: cx + dx * h * G.flip, cy: cy + (j === 2 ? 0.25 * h : 0), h: h * (j === speaker ? 1.05 : 0.9) * (j === 2 ? 0.85 : 1), dir: d * G.flip, id: `${i}.${j}`, slot: i * 2 + j, silent: j !== speaker }));
      });
      return out;
    },
  },
  // Strangers in a crowd: everyone facing their own way, nobody meeting; each beat they have all
  // moved somewhere else.
  strangers: {
    weight: 5,
    init: (W, H, tall) => ({ n: tall ? rndInt(3, 4) : rndInt(4, 7) }),
    layout(st, b, W, H) {
      const Hw = Math.min(H, W * 1.1), out = [];
      for (let j = 0; j < st.n; j++) {
        let best = null, bestD = -1;
        for (let k = 0; k < 12; k++) {
          const h = Hw * rnd(0.22, 0.42), cx = W * rnd(0.1, 0.9), cy = H * rnd(0.25, 0.72);
          const hh = fitH(cy, h, H);
          let d = 1e9;
          for (const o of out) d = Math.min(d, Math.hypot(cx - o.cx, cy - o.cy) / (hh + o.h));
          if (d > bestD) { bestD = d; best = { cx, cy, h: hh }; }
        }
        out.push({ ...best, dir: sign(), id: j, slot: j % 7 });
      }
      return out;
    },
  },
};

let storyCount = 0;
function newStory(seed) {
  R = makeRng(seed || ((Math.random() * 4294967296) >>> 0));
  const W = width, H = height, tall = W < H;
  const names = Object.keys(STORIES);
  // Home: every third story is the simplest one, two people face to face.
  const home = storyCount++ % 3 === 0;
  // (never the same story twice in a row, which would look like one long scene)
  const last = story ? story.name : '';
  const name = home && last !== 'faceoff' ? 'faceoff'
    : weighted(names, names.map((n) => (n === last ? 0 : STORIES[n].weight * (tall ? (STORIES[n].tall ?? 1) : 1))));
  story = {
    name, b: 0, phrase: weighted([4, 6, 8], [15, 30, 55]), // never more than 8 beats
    flips: new Set(), // people who have turned to face the other way
    // Palette, after the original's: hue centered on red-magenta, rarely green.
    rootHue: wrapHue((sign() * skewed(0, 180, 1.25)) - 45),
    hueStep: sign() * skewed(4, 30, 1.5), unison: chance(0.1),
    // Contour spacing: from tight (20 rings) to wide (4), evenly spaced, clustered at the outline
    // or spreading out, converging on one point of the head.
    ring: {
      gap: weighted([0.035, 0.055, 0.08, 0.11, 0.15, 0.2], [12, 18, 22, 20, 16, 12]) * rnd(0.85, 1.15),
      curve: weighted([1, 0.55, 1.8], [45, 30, 25]),
      center: weighted(['ear', 'mouth', 'eye', 'skull'], [45, 20, 20, 15]),
    },
  };
  story.st = STORIES[name].init(W, H, tall);
  if (home) story.st.same = false;
}

// One beat of the story: everyone in their new place, every face drawn anew.
function stepStory(morph) {
  const old = cast ? cast.singers.filter((s) => s.life !== 'leave' && s.polys) : [];
  R = makeRng((Math.random() * 4294967296) >>> 0);
  const W = width, H = height;
  const c = { arrangement: story.name, rootHue: story.rootHue, hueStep: story.hueStep, unison: story.unison, ring: story.ring, maxRings: Math.min(10, STORIES[story.name].maxRings || 10), singers: [] };
  const made = [];
  const slots = STORIES[story.name].layout(story.st, story.b, W, H);
  // Now and then someone turns to face the other way (or turns back), and stays turned.
  let turned = null, slow = false;
  if (morph && story.b > 0 && chance(0.14 + 0.3 * mood.F)) {
    const can = slots.filter((sl) => sl.mirror === undefined);
    if (can.length) {
      turned = pick(can).id; slow = chance(0.5);
      if (story.flips.has(turned)) story.flips.delete(turned); else story.flips.add(turned);
    }
  }
  slots.forEach((sl, i) => {
    if (story.flips.has(sl.id) && sl.mirror === undefined) { sl.dir = -sl.dir; if (sl.squash !== undefined) sl.squash = -sl.squash; if (sl.orbit) sl.orbit.flip = true; }
    const s = makeSinger(c, sl.cx, sl.h, sl.dir, {
      head: sl.head || (sl.kind ? Profiles.make(R, sl.kind) : Profiles.make(R)),
      rot: sl.rot || 0, id: sl.id, storyName: story.name, slot: sl.slot ?? i % 7, alphaMul: sl.alpha ?? 1,
      anchor: !!sl.anchor, squash: sl.squash, orbit: sl.orbit,
      ...(sl.silent ? { silent: true, join: 0 } : {}),
      ...(sl.mirror !== undefined ? { mirrorOf: made[sl.mirror], axis: sl.axis, gapMul: made[sl.mirror].gapMul } : {}),
    });
    // (a child is drawn smaller; an anchored face keeps its neck exactly on the waterline)
    s.y = s.yNow = sl.anchor ? sl.cy + 0.7 * sl.h - NECK_END * s.h : sl.cy - 0.6 * s.h;
    if (s.orbit) { s.orbit.hk = s.h / sl.h; s.dir = 1; } // a rider faces by squash alone, so it can turn smoothly
    if (sl.id === turned && slow) s.turn = { t: 0, T: rnd(0.5, 0.9) }; // a slow turn instead of a snap
    made.push(s);
    c.singers.push(s);
  });
  finishRoster(c);
  cast = c;
  story.b++;
  lastStep = clock;
  newDetail();
  if (morph && old.length) morphCast(old, c.singers);
  else for (const s of c.singers) { s.fade = 0.45; s.life = 'enter'; } // a new scene rises into view
}

function makeSinger(c, x, h, dir, extra = {}) {
  const s = {
    x, h, dir, y: 0,
    slot: rndInt(0, 6), hueOffset: 0, join: chance(0.3) ? rnd(0.15, 0.55) : 0, silent: false,
    tiltGain: rnd(0.6, 1.25), baseTilt: rnd(-3, 3), alpha: 1, band: 0,
    e: 0, avg: 0.2, open: 0, eye: 0, tilt: 0, fade: 0, life: 'enter', vib: 0, bob: 0, vph: rnd(0, 6.28),
    gapMul: rnd(0.75, 1.35), punch: 0, jx: 0, jy: 0, rot: 0,
    ...extra,
  };
  if (!s.head) s.head = Profiles.make(R);
  if (s.head.kind === 'child') s.h *= 0.82;
  s.x = x + dir * 0.43 * s.h; // placed by the middle of the head; s.x is the brow
  s.rowHue = new Float32Array(400);
  s.rings = Math.max(4, Math.min(c.maxRings || 10, Math.round(0.75 / (c.ring.gap * s.gapMul)) + 1));
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
  for (const s of c.singers) s.alpha = (0.55 + 0.45 * Math.pow(s.h / hMax, 0.8)) * (s.alphaMul ?? 1);
}

// Every frame: faces fade in (when they weren't formed from strands) and bob on the beat.
function updateRoster(dt) {
  const st = story.st;
  if (story.name === 'council' && st.carousel) {
    // half a seat per beat on average, faster when frantic, with a push on every beat
    st.angle += st.way * dt * (Math.PI / st.n) / beatGap() * (0.5 + 0.9 * mood.F) * (1 + 2.5 * st.surge);
    st.surge *= 0.9;
  }
  for (const s of cast.singers) {
    if (s.orbit) {
      const p = councilSeat(s.orbit, st.angle || 0, width);
      s.h = p.h * s.orbit.hk; s.squash = p.squash;
      s.x = p.cx + s.dir * 0.43 * s.h; s.y = p.cy - 0.6 * s.h;
    }
    if (s.life === 'enter') { s.fade = Math.min(1, s.fade + dt / lerp(0.7, 0.15, mood.F)); if (s.fade >= 1) s.life = 'live'; }
    const f = smooth01(s.fade);
    s.yNow = s.anchor ? s.y : s.y + (1 - f) * 0.35 * s.h - s.bob * 0.03 * s.h; // (anchored faces hold still)
    if (s.turn && (s.turn.t += dt) >= s.turn.T) s.turn = null;
    s.alphaNow = s.alpha * f;
  }
}

// A noticeable change in the sound: the story ends within a couple of beats.
function onMusicChange() {
  story.phrase = Math.min(story.phrase, story.b + 2);
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
    pattern: weighted(['gradient', 'ribbons', 'circles', 'ripples'], [4, 44, 27, 25]),
    // how it answers each beat: drift (shoved along), whip (swings to the other side), pump (swells
    // toward you), cut (jumps to new shapes) or hue (jumps to a neighbouring color)
    beatMode: weighted(['drift', 'whip', 'pump', 'cut', 'hue'], [22, 24, 22, 18, 14]),
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
  bg.cur = { p, elems, ripples: [], spawn: 0, t: Math.random() * 100, grad: null, gradKey: '', ph: 0, phT: 0, pump: 0, hue: 0, hueT: 0 };
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
  bg.kick = 1 + 3 * F;
  const mode = b.p.beatMode;
  if (mode === 'whip') b.phT += (chance(0.5) ? 1 : -1) * Math.PI * (0.6 + 0.6 * F);
  else if (mode === 'pump') b.pump = 1;
  else if (mode === 'hue') b.hueT += sign() * rnd(25, 60);
  if (b.p.pattern === 'ripples') spawnRipples(b, (mode === 'cut' ? 4 : 1) + Math.round(4 * F));
  else if (mode === 'cut') { // a hard cut: most of the shapes are somewhere new
    const n = Math.round(b.elems.length * (0.5 + 0.5 * F));
    for (let i = 0; i < n; i++) b.elems[Math.floor(Math.random() * b.elems.length)] = makeElem(b.p);
  } else if (b.elems.length && F > 0.25) {
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
    b.ph += (b.phT - b.ph) * 0.22;   // whip: swing toward the new side, fast
    b.hue += (b.hueT - b.hue) * 0.25;
    b.pump *= 0.84;
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
  const F = mood.F, t = b.t, pulse = 1 + bg.flash * (0.8 + 1.6 * F), ph = b.ph, hs = b.hue;
  if (b.pump > 0.01) { // pump: everything swells toward you on the beat
    const z = 1 + b.pump * (0.06 + 0.12 * F);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  }
  const reach = 0.4 + 2.2 * F; // how far things swing: a little when calm, wildly when frantic
  const band = (i) => (started ? bands[i] : 0.4);
  if (b.p.pattern === 'ribbons') {
    ctx.lineCap = 'butt';
    for (const e of b.elems) {
      const x0 = (e.x0 + Math.sin(t * 0.5 * e.sp + e.ph * 2 + ph * 0.5) * 0.05 * reach) * W;
      const x1 = x0 + e.dx * W;
      const sway = (e.sway + Math.sin(t * e.sp + e.ph + ph) * 0.14 * reach) * W, st = e.st * H;
      ctx.strokeStyle = `hsla(${wrapHue(e.hue + hs)} ${b.p.sat}% ${e.light}% / ${Math.min(0.9, e.alpha * pulse) * alpha})`;
      ctx.lineWidth = D * 0.004 * e.w * (0.5 + 1.3 * band(e.band));
      ctx.beginPath();
      ctx.moveTo(x0, -0.05 * H);
      ctx.bezierCurveTo(x0 + sway, st, x1 - sway, H - st, x1, H * 1.05);
      ctx.stroke();
    }
  } else if (b.p.pattern === 'circles') {
    for (const e of b.elems) {
      const x = (e.x + Math.sin(t * e.sp + e.ph + ph) * 0.04 * reach) * W, y = (e.y + Math.cos(t * e.sp * 0.8 + e.ph + ph) * 0.04 * reach) * H;
      ctx.fillStyle = `hsla(${wrapHue(e.hue + hs)} ${b.p.sat}% ${e.light}% / ${Math.min(0.9, e.alpha * pulse) * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, D * e.r * (0.75 + 0.6 * band(e.band) + 0.15 * bg.flash), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.p.pattern === 'ripples') {
    for (const r of b.ripples) {
      r.age += dt;
      const u = r.age / r.life;
      if (u >= 1) continue;
      ctx.strokeStyle = `hsla(${wrapHue(r.hue + hs)} ${b.p.sat}% ${r.light}% / ${r.alpha * Math.pow(1 - u, 1.5) * alpha})`;
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
  if (mood.hushWas > 0.6 && mood.hush < 0.25) { newStory(); stepStory(true); newBackground(); }
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
    newStory(); stepStory(true); newBackground();
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
    if (s.anchor) s.tilt = 0;
  }
}

function onBeat() {
  const F = mood.F;
  bgBeat();
  if (story.st.surge !== undefined) story.st.surge = 1;
  // Every beat the story takes a step and every face is drawn anew.
  if (story.b >= Math.min(8, story.phrase * (1 - 0.3 * F))) newStory(); // a story never outlasts 8 beats
  stepStory(true);
  for (const s of cast.singers) {
    s.punch = Math.max(s.punch, 0.5 + 0.5 * F); // the contours jump apart
    if (F > 0.15) s.bob = Math.max(s.bob, 0.4 + 0.6 * F);
    if (F > 0.45 && !s.anchor) { s.jx = rnd(-1, 1) * 0.07 * F; s.jy = rnd(-1, 1) * 0.05 * F; } // frantic: heads jolt
  }
  bg.beatsLeft -= 1 + mood.F; // frantic music changes the backdrop sooner
  if (bg.beatsLeft <= 0) newBackground();
}

// ---------------------------------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------------------------------
function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));
  frameRate(30); // like the original's 32
  cnv.elt.addEventListener('click', () => { if (started) togglePause(); });
  newStory(20261104);
  stepStory(false);
  newBackground();
  setupSourcePicker();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (story) stepStory(true); // re-lay out the story for the new size
}

function draw() {
  if (paused) return;
  const frameStart = performance.now();
  const dt = Math.min(deltaTime, 100) / 1000;
  clock += dt;
  if (started) listen(dt);
  else idleListen();
  if (clock - lastStep > (started ? 2.5 : 1.6) && mood.hush < 0.5) stepStory(true); // no beat: a slower step
  updateRoster(dt);

  const ctx = drawingContext;
  drawBackground(ctx, dt);

  const W = width, H = height, D = Math.min(W, H);
  for (const s of cast.singers) if (!s.mirrorOf) computeRings(s);
  for (const s of cast.singers) if (s.mirrorOf) computeRings(s);
  drawWaterline(ctx, dt);
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
    if (s.anchor) s.tilt = 0;
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
  if (s.mirrorOf) return mirrorRings(s);
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
  const cxs = s.x - dir * 0.43 * h + s.jx * h, oy = s.yNow + s.jy * h;
  // a slow turn: the head narrows (as if seen from the front) and widens again facing the new way
  const fx0 = s.squash !== undefined ? s.squash : dir; // (a carousel narrows faces seen from the front or back)
  const fx = s.turn ? fx0 * -Math.cos(Math.PI * smooth01(s.turn.t / s.turn.T)) : fx0, g0 = Profiles.G - 0.43;
  // a story can turn a head right round (a ring of faces, a reflection), about its middle
  const rot = s.rot, cr = Math.cos(rot), sr = Math.sin(rot);
  const ccx = s.x - dir * 0.43 * h + s.jx * h, ccy = s.yNow + 0.6 * h + s.jy * h;
  for (let k = 0; k < rings; k++) {
    const u = k / (rings - 1);
    const sc = 1 - span * Math.pow(u, ring.curve) + (s.anchor && k === 0 ? 0 : Math.sin(clock * omega + k * 0.9 + s.vph) * wob);
    const out = P.pts[k];
    for (let q = 0; q < NPTS; q++) {
      const hx = c[0] + (base[2 * q] - c[0]) * sc, hy = c[1] + (base[2 * q + 1] - c[1]) * sc;
      const dx = cxs + fx * h * (hx - g0) - pv.x, dy = oy + h * hy - pv.y;
      let X = pv.x + dx * ca - dy * sa, Y = pv.y + dx * sa + dy * ca;
      if (rot) { const ex = X - ccx, ey = Y - ccy; X = ccx + ex * cr - ey * sr; Y = ccy + ex * sr + ey * cr; }
      out[2 * q] = X;
      out[2 * q + 1] = Y;
    }
    const st = P.style[k];
    st.rgb = hsbArr(hue + s.rowHue[k] * 1.5, 85, 92);
    st.w = (k === 0 ? 3.2 : (2.2 - u * 1.1) * thin) * (1 + s.e * 0.6);
    st.a = (k === 0 ? 1 : 0.85 - u * 0.55) * s.alphaNow;
  }
}

// A reflection: the face above, mirrored in the waterline, a little fainter.
function mirrorRings(s) {
  const U = s.mirrorOf;
  if (!U.polys) computeRings(U);
  if (!s.polys) s.polys = {
    pts: Array.from({ length: s.rings }, () => new Float32Array(2 * NPTS)),
    style: Array.from({ length: s.rings }, () => ({ rgb: [0, 0, 0], w: 1, a: 1 })),
  };
  const a2 = 2 * s.axis, f = smooth01(s.fade);
  for (let k = 0; k < s.rings; k++) {
    const src = U.polys.pts[Math.min(k, U.rings - 1)], out = s.polys.pts[k];
    for (let q = 0; q < NPTS; q++) { out[2 * q] = src[2 * q]; out[2 * q + 1] = a2 - src[2 * q + 1]; }
    const us = U.polys.style[Math.min(k, U.rings - 1)], st = s.polys.style[k];
    st.rgb = us.rgb; st.w = us.w; st.a = us.a * s.alphaMul * f;
  }
}

// The waterline in a reflection: one long wavy line across the screen, drawn in from the side when
// the story begins. It swells with the bass and the beat, and goes still where it meets each neck,
// so the faces and their reflections stand in the water.
const water = { a: 0, reveal: 0, hz: 0, rgb: [80, 80, 160], spans: [], from: 1, pts: new Float32Array(2 * 240) };
function drawWaterline(ctx, dt) {
  const on = story.name === 'reflection';
  const anchors = cast.singers.filter((s) => s.anchor && s.polys);
  if (on && anchors.length) {
    const m = cast.singers.find((s) => s.mirrorOf);
    if (m) water.hz = m.axis;
    water.rgb = anchors[0].polys.style[0].rgb;
    water.spans = anchors.map((u) => { const p = u.polys.pts[0]; return [Math.min(p[0], p[p.length - 2]), Math.max(p[0], p[p.length - 2])]; });
    if (water.a < 0.01) { water.reveal = 0; water.from = Math.random() < 0.5 ? 1 : -1; }
  }
  water.a += ((on ? 1 : 0) - water.a) * (on ? 0.2 : 0.08);
  if (on) water.reveal = Math.min(1, water.reveal + dt / 0.9);
  if (water.a < 0.01) return;
  const W = width, D = Math.min(W, height), F = mood.F;
  const low = started ? (bands[0] + bands[1]) / 2 : 0.3;
  const A = D * (0.009 + 0.022 * low + 0.016 * F + 0.014 * bg.flash);
  const n = 240, end = smooth01(water.reveal);
  for (const [layer, alpha, width_] of [[0, 0.9, 2.6], [1, 0.35, 1.4]]) {
    ctx.beginPath();
    for (let q = 0; q < n; q++) {
      const u = q / (n - 1);
      const x = water.from > 0 ? u * W * end : W - u * W * end;
      // still where it meets a neck, rippling away from it
      let still = 1;
      for (const [a, b] of water.spans) {
        const d = x < a ? a - x : x > b ? x - b : 0;
        still = Math.min(still, smooth01(d / (0.06 * D)));
      }
      const wave = Math.sin(x * 0.011 - clock * (2 + 4 * F) + layer * 1.3) + 0.5 * Math.sin(x * 0.027 + clock * (1.3 + 3 * F));
      const y = water.hz + layer * D * 0.018 + A * (layer ? 0.6 : 1) * still * wave;
      if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    strokeStyleWater(ctx, alpha * water.a, width_);
  }
}
function strokeStyleWater(ctx, a, w) {
  ctx.strokeStyle = rgbaArr(water.rgb, a);
  ctx.lineWidth = w;
  ctx.stroke();
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
const STRAND_CAP = 700;
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
    t: 0, T: o.T, easeIn: !!o.easeIn, target: o.target || null, rev: !!o.rev, lerp: !!o.lerp,
    B: o.B || null, dB: o.dB || null,
    a1: rnd(0.25, 0.75), a2: rnd(0.25, 0.75), amp: rnd(0.04, 0.18) * (0.7 + mood.F), freq: rnd(0.8, 3.2), ph: rnd(0, 6.28),
    pts: new Float32Array(2 * NPTS), tp: o.target ? new Float32Array(2 * NPTS) : null,
  };
  // until its first frame, it sits where it starts
  if (prefix.length === 2 * NPTS) st.pts.set(prefix);
  else for (let q = 0; q < NPTS; q++) { st.pts[2 * q] = prefix[prefix.length - 2]; st.pts[2 * q + 1] = prefix[prefix.length - 1]; }
  strands.push(st);
  return st;
}

// Off the screen, wavily, from the strand's leading end.
function flowOff(prefix, style, th, T) {
  const n = prefix.length / 2, ax = prefix[2 * n - 2], ay = prefix[2 * n - 1];
  const B = exitPoint(ax, ay, th);
  return newStrand(prefix, style, { B, dB: [Math.cos(th), Math.sin(th)], T, easeIn: true });
}

const beatGap = () => { const b = mood.beats; return b.length >= 3 ? (b[b.length - 1] - b[0]) / (b.length - 1) / 1000 : 0.8; };
const flowT = () => lerp(2.6, 1.1, mood.F) * rnd(0.8, 1.3);
// lines arrive in about a beat and a half (and never slower than the music allows)
const formT = () => Math.max(0.3, Math.min(lerp(2.3, 0.8, mood.F), beatGap() * 1.4)) * rnd(0.8, 1.2);

// The contours a face has right now: the finished ones, and the lines still on their way to it
// (those are taken over, so they carry on from where they are).
function ringSources(o) {
  const out = [], taken = new Set();
  for (let k = 0; k < o.rings; k++) {
    if (o.ready[k]) { out.push({ pts: o.polys.pts[k].slice(), style: o.polys.style[k] }); continue; }
    const st = strands.find((q) => q.target && q.target.s === o && q.target.k === k);
    if (st) { out.push({ pts: st.rev && !st.lerp ? reversed(st.pts) : st.pts.slice(), style: st.cur || st }); taken.add(st); }
  }
  if (taken.size) for (let i = strands.length - 1; i >= 0; i--) if (taken.has(strands[i])) strands.splice(i, 1);
  return out;
}

// A leaving face: every contour peels off and flows away in its own direction.
function unravel(s) {
  const base = Math.random() * Math.PI * 2;
  ringSources(s).forEach((src, k) => {
    flowOff(Math.random() < 0.5 ? src.pts : reversed(src.pts), src.style, base + rnd(-1.6, 1.6), flowT() + k * rnd(0, 0.03));
  });
}

// A new face: its contours noodle in from off the screen, from roughly one side, and coalesce.
function formStrands(s, only) {
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
    newStrand(prefix, s.polys.style[k], { target: { s, k }, T: formT() + k * 0.012, rev: Math.random() < 0.5 });
  }
}

// One face into another: contour for contour; spare old ones flow off, missing new ones fly in.
// When it is the same person moving (glide), each contour morphs point by point to its new place;
// otherwise the lines peel off and travel.
const glideT = () => Math.max(0.25, Math.min(0.9, beatGap() * 0.85)) * rnd(0.85, 1.1);
function morphStrands(o, n, glide) {
  n.fade = 1; n.life = 'live'; n.alphaNow = n.alpha;
  computeRings(n);
  const from = ringSources(o), missing = [];
  for (let k = 0; k < n.rings; k++) {
    n.ready[k] = false;
    if (k < from.length) {
      if (glide) newStrand(from[k].pts, from[k].style, { target: { s: n, k }, T: glideT(), lerp: true });
      else newStrand(Math.random() < 0.5 ? from[k].pts : reversed(from[k].pts), from[k].style, { target: { s: n, k }, T: formT() + k * 0.012, rev: Math.random() < 0.5 });
    }
    else missing.push(k);
  }
  if (missing.length) formStrands(n, missing);
  const base = Math.random() * Math.PI * 2;
  for (let q = n.rings; q < from.length; q++) flowOff(from[q].pts, from[q].style, base + rnd(-1.6, 1.6), flowT());
}

// A new beat: each person carries their contours to their new place. Someone who has left the
// story unravels; someone new is formed. When the story itself changes, old faces turn into new
// ones in random pairs.
function morphCast(old, fresh) {
  const need = fresh.reduce((t, s) => t + s.rings, 0);
  if (strands.length + need > STRAND_CAP) return; // too busy: the plain fade
  const byId = new Map();
  for (const o of old) if (o.id !== undefined && o.storyName === story.name) byId.set(o.id, o);
  const pairs = [], used = new Set();
  for (const n of fresh) {
    const o = byId.get(n.id);
    if (o && !used.has(o)) { used.add(o); pairs.push([o, n]); }
  }
  const restOld = old.filter((o) => !used.has(o)).sort(() => Math.random() - 0.5);
  const restNew = fresh.filter((n) => !pairs.some((p) => p[1] === n));
  const glide = pairs.length > 0;
  if (!glide) while (restOld.length && restNew.length) pairs.push([restOld.pop(), restNew.shift()]);
  for (const [o, n] of pairs) morphStrands(o, n, glide);
  for (const n of restNew) formStrands(n);
  for (const o of restOld) unravel(o);
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
    if (st.lerp) glideStep(st, e);
    else {
      buildTrack(st);
      const total = track.c[track.n - 1];
      const L = lerp(st.L0, st.target ? st.L1 : st.L0, e);
      windowOf(st.pts, e * Math.max(0, total - L), L);
    }
    let rgb = st.rgb, w = st.w, a = st.a;
    if (st.target) {
      const ts = st.target.s.polys.style[st.target.k];
      rgb = [lerp(st.rgb[0], ts.rgb[0], e), lerp(st.rgb[1], ts.rgb[1], e), lerp(st.rgb[2], ts.rgb[2], e)];
      w = lerp(st.w, ts.w, e); a = lerp(st.a, ts.a, e);
    }
    st.cur = { rgb, w, a };
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

// A glide: every point moves from the old contour to the new one, the change running along the line
// from the back of the neck to the front, with a sideways wave while it travels.
function glideStep(st, e) {
  const from = st.prefix, to = st.target.s.polys.pts[st.target.k];
  const D = Math.min(width, height), stg = 0.6, amp = st.amp * D * 0.6;
  for (let q = 0; q < NPTS; q++) {
    const f = q / (NPTS - 1), eq = smooth01(e * (1 + stg) - stg * f);
    const x0 = from[2 * q], y0 = from[2 * q + 1], x1 = to[2 * q], y1 = to[2 * q + 1];
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    const wv = Math.min(amp, d * 0.3) * Math.sin(Math.PI * eq) * Math.sin(f * Math.PI * 2 * (st.freq + 1) + st.ph);
    st.pts[2 * q] = x0 + dx * eq - (dy / d) * wv;
    st.pts[2 * q + 1] = y0 + dy * eq + (dx / d) * wv;
  }
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
    newStory(); stepStory(true);
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
  else if (k === 'n') { newStory(); stepStory(true); }
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
