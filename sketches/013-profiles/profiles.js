// Profiles: an algorithmic generator of proportionally correct head profiles (no p5 needed).
//
// Units: head heights. y runs down from the crown (0) to the bottom of the chin (1); x runs toward
// the face. The skeleton follows the standard artists' proportions (Loomis): the face divides into
// equal thirds (hairline to brow, brow to the base of the nose, nose to chin), the eyes sit just below
// the brow (about halfway down an adult head, lower on a child), the ear sits just behind the
// middle of the head between the brow and nose lines, and the whole head fits roughly in a square.
// The finer shape follows facial profile analysis: a forehead-to-nose angle of about 115-130
// degrees, nose-to-lip about 90-110, lower lip to chin about 120-130, chin to neck about 80-95,
// with the upper lip taking a third of the lower face and the lips just behind a nose-to-chin line.
//
//   const head = Profiles.make(rng, kind?)    // kind: 'child' | 'fem' | 'masc' | 'elder' | 'adult'
//   const shape = Profiles.shape(head, open)  // open: 0..1 jaw opening (singing)
//   shape.outline                             // closed polygon [[x, y], ...]
//   Profiles.spans(shape.outline, y)          // [[x0, x1], ...] where a row at height y is inside
//   shape.marks                               // eye, ear, nostril, mouth, hairline, skull: for drawing details
(() => {
  const G = 0.86; // x of the brow (glabella); the back of the skull is near 0

  const KINDS = ['child', 'fem', 'masc', 'elder', 'adult'];
  const KIND_WEIGHTS = [14, 28, 28, 12, 18];

  function make(r, kind) {
    const u = (a, b) => a + r() * (b - a);
    if (!kind) {
      let x = r() * KIND_WEIGHTS.reduce((a, b) => a + b, 0);
      kind = KINDS[KINDS.length - 1];
      for (let i = 0; i < KINDS.length; i++) { x -= KIND_WEIGHTS[i]; if (x < 0) { kind = KINDS[i]; break; } }
    }
    const child = kind === 'child', elder = kind === 'elder', masc = kind === 'masc', fem = kind === 'fem';
    const h = { kind };
    h.T = child ? u(0.21, 0.235) : u(0.262, 0.3);                  // one facial third
    h.skull = child ? u(1.0, 1.08) : u(0.9, 1.1);                  // skull length
    h.vault = child ? u(1.02, 1.1) : u(0.94, 1.06);                // skull height
    h.forehead = child ? u(-0.01, 0.015) : u(0.0, fem ? 0.04 : 0.07); // extra slope back at the hairline
    h.brow = masc ? u(0.012, 0.038) : fem ? u(0.0, 0.012) : child ? u(-0.006, 0.002) : u(0.003, 0.022);
    h.nasion = child ? u(0.025, 0.04) : u(0.008, 0.05);             // how deep the bridge sits
    h.noseProj = child ? u(0.04, 0.07) : elder ? u(0.09, 0.16) : u(0.075, 0.15); // tip ahead of the brow
    h.noseHump = child ? u(-0.02, -0.005) : u(-0.025, masc || elder ? 0.04 : 0.022); // + convex, - scooped
    h.tipDrop = child ? u(-0.02, -0.005) : u(-0.02, elder ? 0.05 : 0.03); // + droops, - turns up
    h.nostril = u(0.9, 1.2);
    h.lipFwd = child ? u(0.005, 0.025) : u(-0.01, 0.03);           // upper lip forward of the base of the nose
    h.lipFull = elder ? u(0.004, 0.014) : fem ? u(0.016, 0.036) : child ? u(0.012, 0.026) : u(0.008, 0.028);
    h.lipLow = u(0.7, 1.25);                                       // lower lip fullness, relative
    h.chin = child ? u(-0.08, -0.04) : masc ? u(-0.06, 0.03) : u(-0.09, 0.0); // chin ahead of the brow
    h.sulcus = u(0.008, 0.035);
    h.jaw = child ? u(0.13, 0.18) : masc ? u(0.21, 0.3) : u(0.15, 0.25); // chin to throat
    h.occiput = u(0.0, 0.035);
    h.neck = child ? u(0.3, 0.37) : masc ? u(0.45, 0.55) : u(0.37, 0.47);
    h.neckSlant = u(0.04, 0.2);
    h.ear = (elder ? u(1.06, 1.2) : child ? u(1.0, 1.1) : u(0.9, 1.08));
    h.earX = u(0.36, 0.43);
    h.earTilt = u(0.1, 0.34);
    return h;
  }

  // Centripetal Catmull-Rom through closed points: smooth, without loops or overshoot.
  function smoothClosed(pts, per = 8) {
    const n = pts.length, out = [];
    const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5) || 1e-4;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
      for (let k = 0; k < per; k++) {
        const t = t1 + (t2 - t1) * (k / per);
        const L = (a, b, ta, tb) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
        const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
        const B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3);
        out.push(L(B1, B2, t1, t2));
      }
    }
    return out;
  }

  function rotateAbout(p, c, a, amt = 1) {
    const ang = a * amt, cs = Math.cos(ang), sn = Math.sin(ang);
    const dx = p[0] - c[0], dy = p[1] - c[1];
    return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
  }

  // The outline and the positions of the features, with the jaw open by `open` (0..1).
  function shape(h, open = 0) {
    const yN = 1 - h.T;                 // base of the nose
    const yBr = 1 - 2 * h.T;            // brow
    const yH = 1 - 3 * h.T;             // hairline
    const yS = yN + h.T / 3;            // where the lips meet
    const yEye = yBr + 0.055;

    // The skull: an ellipse whose front reaches the brow and whose top is the crown.
    const ry = (yBr - 0.02) * h.vault * 0.98, cy = ry;
    const rx = 0.43 * h.skull, cx = G - rx + 0.012;
    const ell = (a) => [cx + rx * Math.cos(a), cy - ry * Math.sin(a)];
    const aHair = Math.asin(Math.max(-0.99, Math.min(0.99, (cy - yH) / ry)));

    // Jaw hinge: just in front of the ear, a little below the cheekbone.
    const hinge = [h.earX + 0.075, yN - 0.06];
    const jawA = 0.22 * open;

    const tipX = G + h.noseProj, tipY = yN - 0.032 + h.tipDrop * 0.6;
    const nasX = G - h.nasion, nasY = yBr + 0.035;
    const subX = G - 0.012 + h.lipFwd * 0.3;
    const chinX = G + h.chin;
    const stomX = subX + h.lipFwd * 0.6 + h.lipFull * 0.25;
    const lipTopX = subX + h.lipFwd + h.lipFull * 0.65;
    const lipBotX = subX + h.lipFwd * 0.5 + h.lipFull * 0.55 * h.lipLow - 0.006;
    const throatX = chinX - 0.05 - h.jaw;

    const jaw = (p, amt = 1) => rotateAbout(p, hinge, jawA, amt);
    const lowStom = jaw([stomX - 0.004, yS + 0.003]);
    const inner = [stomX - 0.022 - open * 0.035, (yS - 0.003 + lowStom[1]) / 2]; // the line where the lips meet
    const front = [
      [ell(aHair)[0] - h.forehead, yH],                                     // hairline
      [(ell(aHair)[0] - h.forehead) * 0.4 + (G + h.brow) * 0.6 + 0.008, (yH + yBr) / 2 - 0.015], // forehead
      [G + h.brow, yBr - 0.006],                                            // brow
      [nasX, nasY],                                                         // bridge
      [(nasX + tipX) / 2 + h.noseHump, (nasY + tipY) / 2],                  // ridge of the nose
      [tipX, tipY],                                                         // tip
      [tipX - 0.012, tipY + 0.02],                                          // under the tip
      [tipX - 0.036 * h.nostril, yN - 0.007],                               // nostril edge
      [subX, yN],                                                           // base of the nose
      [lipTopX, yN + (yS - yN) * 0.62],                                     // upper lip
      [stomX, yS - 0.003],                                                  // upper edge of the mouth
      inner,                                                                // inside the mouth
      lowStom,                                                              // lower edge of the mouth
      jaw([lipBotX, yS + 0.032]),                                           // lower lip
      jaw([chinX - h.sulcus, yS + 0.078]),                                  // fold under the lip
      jaw([chinX, 0.955]),                                                  // chin
      jaw([chinX - 0.05, 1.0]),                                             // under the chin
      jaw([chinX - 0.05 - h.jaw * 0.55, 1.022], 0.8),                       // under the jaw
      jaw([throatX, 1.055], 0.4),                                           // throat
      [throatX - h.neckSlant * 0.25, 1.35],
      [throatX - h.neckSlant * 0.55, 1.7],                                  // neck, front
    ];
    const napeX = throatX - h.neck;
    // The back of the skull comes down to about the level of the nose, then curves in under the
    // skull (the hollow above the nape) and down the back of the neck.
    const yNape = yN - 0.03;
    const aN = Math.PI + Math.asin(Math.max(-0.95, Math.min(0.95, (yNape - cy) / ry)));
    const back = [
      [napeX - h.neckSlant * 0.55 - 0.02, 1.7],                             // neck, back
      [napeX - h.neckSlant * 0.25 - 0.01, 1.3],
      [napeX, yS + 0.06],                                                   // nape
    ];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const a = aN - (aN - Math.PI * 0.5) * (i / steps); // up the back of the skull to the crown
      const p = ell(a);
      const bump = h.occiput * Math.exp(-Math.pow((a - Math.PI * 1.05) / 0.3, 2)); // the bump at the back
      back.push([p[0] - bump, p[1]]);
    }
    for (let i = 1; i < 4; i++) {
      const a = Math.PI * 0.5 - (Math.PI * 0.5 - aHair) * (i / 4);
      back.push(ell(a));
    }
    const pts = [...front, ...back];
    const outline = smoothClosed(pts, 7);

    const earH = (yN - yBr) * h.ear;
    return {
      outline,
      yN, yBr, yH, yS, yEye, hinge, jawA,
      skull: { cx, cy, rx, ry, aHair },
      marks: {
        eye: { x: nasX - 0.062, y: yEye, w: 0.034 },
        brow: { x: G - 0.02, y: yBr - 0.012 },
        ear: { x: h.earX, y: yBr + 0.006 + earH * 0.5, h: earH, w: earH * 0.55, tilt: h.earTilt },
        nostril: { x: tipX - 0.058 * h.nostril, y: yN - 0.02, r: 0.017 * h.nostril },
        mouth: { x: stomX, y: (yS + lowStom[1]) / 2, open },
        chin: jaw([chinX, 0.955]),
        tip: [tipX, tipY],
      },
    };
  }

  // Where a horizontal row at height y is inside the outline: pairs of x crossings.
  function spans(poly, y) {
    const xs = [];
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
    return out;
  }

  window.Profiles = { make, shape, spans, KINDS, G };
})();
