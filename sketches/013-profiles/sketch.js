// =====================================================================================================
// 013 Profiles
// A study page for the new head generator (profiles.js): a grid of random, proportionally correct
// profiles drawn with lines. Tap a face for a new one. Buttons (or keys): new faces (R), line style
// (S), proportion guides (G), sing (M). Each face is labeled with its type and seed.
// Line styles:
//   bands   horizontal rows with arrow tips at the face, like Disentanglemation
//   engrave rows that swell and thin with simple shading, like an engraved portrait
//   echo    the outline repeated, shrinking toward the ear, like ripples
// =====================================================================================================

const STYLES = ['bands', 'engrave', 'echo'];
let style = 'bands';
let guides = false;
let singing = false;
let faces = [];
let clock = 0;

function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
function hsbRgb(h, s, b) {
  h = ((h % 360) + 360) % 360; s = clamp01(s / 100); b = clamp01(b / 100);
  const f = (n) => { const k = (n + h / 60) % 6; return b - b * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return `${Math.round(f(5) * 255)},${Math.round(f(3) * 255)},${Math.round(f(1) * 255)}`;
}

// Hair types: swept back, falling behind the ear, or cropped close to the skull.
function pickHair(kind, x) {
  const w = { masc: [35, 15, 50], child: [30, 30, 40], fem: [40, 45, 15], elder: [40, 20, 40], adult: [40, 30, 30] }[kind];
  x *= w[0] + w[1] + w[2];
  return x < w[0] ? 'swept' : x < w[0] + w[1] ? 'fall' : 'crop';
}

// A face: the generator's parameters plus how it's colored and whether it has hair.
function newFace(seed) {
  seed = seed || ((Math.random() * 1e6) | 0);
  const r = makeRng(seed * 7919 + 17);
  const head = Profiles.make(r);
  const hairChance = { child: 0.8, fem: 0.92, masc: 0.6, elder: 0.55, adult: 0.75 }[head.kind];
  const face = {
    seed, head,
    hue: (r() < 0.5 ? -1 : 1) * Math.pow(r(), 1.25) * 180 - 45,
    rowHue: Array.from({ length: 300 }, () => (r() < 0.5 ? -1 : 1) * (3 + r() * r() * 15)),
    hair: r() < hairChance ? {
      type: pickHair(head.kind, r()),
      len: head.kind === 'masc' ? lerp(0.32, 0.6, r()) : head.kind === 'child' ? lerp(0.3, 0.8, r()) : lerp(0.35, 1.3, r()),
      strands: 0, width: lerp(0.0035, 0.008, r()),
      sweep: lerp(0, 0.1, r()), chaos: lerp(0.2, 1, r()), seeds: [],
    } : null,
    phase: r() * 6.28,
  };
  if (face.hair) face.hair.strands = Math.floor(lerp(30, 70, r()) * (face.hair.type === 'crop' ? 2.2 : 1));
  if (face.hair) for (let i = 0; i < face.hair.strands; i++) face.hair.seeds.push([r() * 2 - 1, r() * 2 - 1, lerp(0.35, 1, r()), r() * 6.28, r() * 2 - 1]);
  return face;
}

// ---------------------------------------------------------------------------------------------------
// Drawing one head. Everything below is drawn in head units (crown y = 0, chin y = 1, face toward +x)
// by scaling the canvas, so line widths are given in head units too.
// ---------------------------------------------------------------------------------------------------
const INK = 'rgba(26,20,32,0.88)';

function drawHead(ctx, face, ox, oy, h, dir, opts) {
  const { open = 0, eye = 1, sp = 0.022 } = opts;
  const shp = Profiles.shape(face.head, open);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(dir * h, h);
  const px = 1 / h; // one screen pixel, in head units

  const ys = shp.outline.map((p) => p[1]);
  const yTop = Math.min(...ys), yBot = Math.min(1.6, Math.max(...ys));
  const rows = [];
  for (let i = 0, y = yTop + sp * 0.5; y < yBot; i++, y += sp) {
    for (const [x0, x1] of Profiles.spans(shp.outline, y)) rows.push({ i, y, x0, x1 });
  }
  const sat = style === 'engrave' ? 55 : 88, bri = style === 'engrave' ? 42 : 96;

  if (style === 'echo') {
    drawEcho(ctx, face, shp, px);
  } else {
    for (const r of rows) if (r.i % 2 === 0) drawRow(ctx, r, sp, face, sat, bri, px);
    if (face.hair) drawHair(ctx, face, shp, px, sat, bri);
    for (const r of rows) if (r.i % 2 === 1) drawRow(ctx, r, sp, face, sat, bri, px);
  }
  drawFeatures(ctx, shp, px, eye);
  if (guides) drawGuides(ctx, face, shp, px);
  ctx.restore();
}

function drawRow(ctx, r, sp, face, sat, bri, px) {
  const rgb = hsbRgb(face.hue + face.rowHue[r.i % 300], sat, bri);
  const len = r.x1 - r.x0;
  if (len < sp * 0.4) return;
  if (style === 'bands') {
    const th = sp * 0.5, tip = Math.min(sp * 0.75, len * 0.5), tw = sp * 0.25;
    const tb = r.x1 - tip;
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; // shadow under the row
    ctx.fillRect(lerp(r.x0, tb, 0.15), r.y + th * 0.35, tb - lerp(r.x0, tb, 0.15), th);
    const g = ctx.createLinearGradient(r.x0, 0, tb, 0);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(Math.min(0.5, (sp * 2.5) / Math.max(len, 1e-3)), `rgba(${rgb},0.95)`);
    g.addColorStop(1, `rgba(${rgb},1)`);
    ctx.fillStyle = g;
    ctx.fillRect(r.x0, r.y - th / 2, tb - r.x0 + px * 0.5, th);
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.beginPath(); ctx.moveTo(r.x1, r.y); ctx.lineTo(tb, r.y - tw); ctx.lineTo(tb, r.y + tw); ctx.closePath(); ctx.fill();
  } else { // engrave: thickness follows a simple shading of the form
    const n = Math.max(6, Math.ceil(len / 0.02));
    const w = (u) => {
      const edge = Math.pow(Math.abs(2 * u - 1), 2.4);   // turning away at the edges: darker
      const back = (1 - u) * 0.35;                         // light from the front
      return sp * (0.05 + 0.75 * clamp01(edge * 0.85 + back * 1.2));
    };
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.beginPath();
    for (let k = 0; k <= n; k++) { const u = k / n; ctx.lineTo(lerp(r.x0, r.x1, u), r.y - w(u) / 2); }
    for (let k = n; k >= 0; k--) { const u = k / n; ctx.lineTo(lerp(r.x0, r.x1, u), r.y + w(u) / 2); }
    ctx.closePath();
    ctx.fill();
  }
}

function drawEcho(ctx, face, shp, px) {
  const c = [shp.marks.ear.x, shp.marks.ear.y];
  const rings = 7;
  ctx.lineJoin = 'round';
  for (let k = rings - 1; k >= 0; k--) {
    const s = 1 - k * 0.11;
    const rgb = hsbRgb(face.hue + face.rowHue[k] * 1.5, 85, 92);
    ctx.lineWidth = px * (k === 0 ? 3.2 : 2.2 - k * 0.18);
    ctx.strokeStyle = `rgba(${rgb},${k === 0 ? 1 : 0.85 - k * 0.09})`;
    ctx.beginPath();
    for (const p of shp.outline) ctx.lineTo(c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawHair(ctx, face, shp, px, sat, bri) {
  const hr = face.hair, sk = shp.skull;
  ctx.lineCap = 'butt';
  for (let k = 0; k < hr.strands; k++) {
    const [j1, j2, a, ph, j3] = hr.seeds[k];
    const u = clamp01((k + 0.5 + j3 * 0.45) / hr.strands); // 0 at the hairline .. 1 at the back
    const th = lerp(sk.aHair + 0.04, Math.PI * 1.04, u);
    const cx = Math.cos(th), cy = -Math.sin(th);
    const sx = sk.cx + cx * sk.rx * 1.015, sy = sk.cy + cy * sk.ry * 1.015;
    let nx = cx / sk.rx, ny = cy / sk.ry;
    const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const sway = singing ? Math.sin(clock * 0.8 + ph) * 0.01 : 0;
    let ex, ey, c1x, c1y, c2x, c2y, w = hr.width * (0.45 + 0.9 * a);
    if (hr.type === 'crop') {
      // short: a textured cap, each strand rising from just inside the scalp and combed back
      const r0 = 0.9 + 0.07 * a, t2 = th + 0.14 + 0.1 * a;
      const bx = sk.cx + cx * sk.rx * r0, by = sk.cy + cy * sk.ry * r0;
      ex = sk.cx + Math.cos(t2) * sk.rx * 1.035; ey = sk.cy - Math.sin(t2) * sk.ry * 1.035;
      c1x = bx + nx * 0.03; c1y = by + ny * 0.03;
      c2x = ex + nx * 0.015; c2y = ey + ny * 0.015;
      w *= 1.7;
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(${hsbRgb(face.hue + j1 * 18, sat * 0.95, bri * 0.85)},${0.5 + 0.5 * a})`;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey); ctx.stroke();
      continue;
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
    ctx.strokeStyle = `rgba(0,0,0,${0.14 * a})`;
    ctx.beginPath(); ctx.moveTo(sx + w * 0.4, sy + w * 0.4); ctx.bezierCurveTo(c1x + w * 0.4, c1y + w * 0.4, c2x + w * 0.4, c2y + w * 0.4, ex + w * 0.4, ey); ctx.stroke();
    ctx.strokeStyle = `rgba(${hsbRgb(face.hue + j1 * 18, sat * 0.95, bri)},${0.45 + 0.55 * a})`;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey); ctx.stroke();
  }
}

// Eye, brow, ear, nostril and the corner of the mouth, as lines.
function drawFeatures(ctx, shp, px, eyeOpen) {
  const m = shp.marks;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;

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
    ctx.fillStyle = 'rgba(255,252,246,0.95)';
    ctx.beginPath();
    ctx.moveTo(ex - w, ey);
    ctx.quadraticCurveTo(ex - w * 0.1, ey - w * 0.55, ex + w * 0.55, ey - w * 0.32);
    ctx.quadraticCurveTo(ex + w * 0.75, ey, ex + w * 0.5, ey + w * 0.26);
    ctx.quadraticCurveTo(ex - w * 0.15, ey + w * 0.35, ex - w, ey);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(ex + w * 0.35, ey - w * 0.02, w * 0.13, w * 0.27, 0, 0, Math.PI * 2); ctx.fill();
  }
  // brow
  ctx.lineWidth = px * 2;
  ctx.beginPath();
  ctx.moveTo(ex - w * 1.1, ey - w * 0.95);
  ctx.quadraticCurveTo(ex - w * 0.1, ey - w * 1.35, m.brow.x - 0.01, m.brow.y + 0.004);
  ctx.stroke();

  // nostril wing
  const n = m.nostril;
  ctx.lineWidth = px * 1.6;
  ctx.beginPath();
  ctx.arc(n.x, n.y, n.r, Math.PI * 0.62, Math.PI * 1.95);
  ctx.stroke();

  // corner of the mouth
  ctx.lineWidth = px * 1.8;
  ctx.beginPath();
  ctx.moveTo(m.mouth.x - 0.012, m.mouth.y);
  ctx.quadraticCurveTo(m.mouth.x - 0.035, m.mouth.y + 0.004, m.mouth.x - 0.05, m.mouth.y - 0.004);
  ctx.stroke();
}

// The proportions the generator follows: thirds of the face, eye line, the square, the ear.
function drawGuides(ctx, face, shp, px) {
  const hd = face.head;
  const x0 = shp.skull.cx - shp.skull.rx, x1 = Profiles.G + hd.noseProj;
  ctx.lineWidth = px;
  ctx.strokeStyle = 'rgba(200,40,40,0.75)';
  ctx.fillStyle = 'rgba(200,40,40,0.85)';
  ctx.setLineDash([px * 4, px * 3]);
  const lines = [[0, 'crown'], [shp.yH, 'hairline'], [shp.yBr, 'brow'], [shp.yEye, 'eye'], [shp.yN, 'nose'], [shp.yS, 'mouth'], [1, 'chin']];
  for (const [y, label] of lines) {
    ctx.beginPath(); ctx.moveTo(x0 - 0.04, y); ctx.lineTo(x1 + 0.06, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeRect(x0, 0, x1 - x0, 1); // the head fits roughly in a square
  ctx.beginPath(); ctx.moveTo(shp.hinge[0], shp.hinge[1]); ctx.arc(shp.hinge[0], shp.hinge[1], px * 3, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.scale(px, px); // back to screen pixels for the labels
  ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
  for (const [y, label] of lines) ctx.fillText(label, (x1 + 0.07) / px, (y + 0.01) / px);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------------------------------
let grid = { cols: 3, rows: 2, cw: 0, ch: 0 };

function layout() {
  const W = width, H = height;
  grid.cols = W < 560 ? 2 : W < 1000 ? 3 : W < 1500 ? 4 : 5;
  grid.cw = W / grid.cols;
  grid.rows = Math.max(2, Math.round(H / (grid.cw * 1.05)));
  grid.ch = H / grid.rows;
  const n = grid.cols * grid.rows;
  while (faces.length < n) faces.push(newFace());
  faces.length = n;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, displayDensity()));
  frameRate(30);
  layout();
  bindControls();
  noLoop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layout();
  redraw();
}

function draw() {
  clock += Math.min(deltaTime || 33, 100) / 1000;
  const ctx = drawingContext;
  ctx.fillStyle = '#f3efe6';
  ctx.fillRect(0, 0, width, height);
  const { cols, cw, ch } = grid;
  faces.forEach((f, i) => {
    const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx + 1, cy + 1, cw - 2, ch - 2); ctx.clip();
    const h = Math.min(ch * 0.66, cw * 0.62);
    const ox = cx + cw * 0.5 - h * 0.5, oy = cy + ch * 0.13;
    const open = singing ? clamp01(0.5 + 0.6 * Math.sin(clock * 2.2 + f.phase)) : 0;
    drawHead(ctx, f, ox, oy, h, 1, { open, eye: singing ? 0 : 1, sp: Math.max(3 / h, 0.02) });
    ctx.fillStyle = 'rgba(26,20,32,0.55)';
    ctx.font = '11px ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';
    ctx.fillText(`${f.head.kind} · ${f.seed}`, cx + 10, cy + ch - 10);
    ctx.restore();
  });
  // cell borders
  ctx.strokeStyle = 'rgba(26,20,32,0.08)';
  ctx.lineWidth = 1;
  for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, height); ctx.stroke(); }
  for (let r = 1; r < grid.rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(width, r * ch); ctx.stroke(); }
}

function cellAt(x, y) {
  const c = Math.floor(x / grid.cw), r = Math.floor(y / grid.ch);
  return r * grid.cols + c;
}

function bindControls() {
  document.querySelector('canvas').addEventListener('click', (e) => {
    const i = cellAt(e.offsetX, e.offsetY);
    if (i >= 0 && i < faces.length) { faces[i] = newFace(); redraw(); }
  });
  const btn = (id, fn) => document.getElementById(id).addEventListener('click', (e) => { e.stopPropagation(); fn(); e.target.blur(); });
  btn('b-new', newAll);
  btn('b-style', cycleStyle);
  btn('b-guides', toggleGuides);
  btn('b-sing', toggleSing);
  updateButtons();
}
function newAll() { faces = faces.map(() => newFace()); redraw(); }
function cycleStyle() { style = STYLES[(STYLES.indexOf(style) + 1) % STYLES.length]; updateButtons(); redraw(); }
function toggleGuides() { guides = !guides; updateButtons(); redraw(); }
function toggleSing() { singing = !singing; updateButtons(); if (singing) loop(); else { noLoop(); redraw(); } }
function updateButtons() {
  document.getElementById('b-style').textContent = `style: ${style}`;
  document.getElementById('b-guides').setAttribute('aria-pressed', String(guides));
  document.getElementById('b-sing').setAttribute('aria-pressed', String(singing));
}
function keyPressed() {
  const k = (key || '').toLowerCase();
  if (k === 'r') newAll();
  else if (k === 's') cycleStyle();
  else if (k === 'g') toggleGuides();
  else if (k === 'm') toggleSing();
}
