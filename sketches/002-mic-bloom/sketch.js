// 002 Mic bloom
// A radial flower driven by the microphone: each petal is a frequency band,
// bass swells the core, and the waveform traces a ring around it.
// Tap to start the mic. If the mic is blocked, it falls back to demo audio.

const BANDS = 24;
let smooth = new Array(BANDS).fill(0);
let bassSmooth = 0;
let hueBase = 0;
const promptEl = document.getElementById('prompt');

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(2, displayDensity()));
  colorMode(HSB, 360, 100, 100, 1);
  background(250, 30, 6);
}

async function mousePressed() {
  if (Mic.started) {
    hueBase = random(360); // tap again to shift the palette
    return;
  }
  promptEl.querySelector('span').textContent = 'starting microphone...';
  try {
    await Mic.start();
    promptEl.hidden = true;
  } catch (err) {
    Mic.startDemo();
    promptEl.querySelector('span').textContent = `${Mic.error || 'no microphone'}: showing demo audio`;
    setTimeout(() => (promptEl.hidden = true), 2500);
  }
}

function draw() {
  noStroke();
  fill(250, 30, 6, 0.18);
  rect(0, 0, width, height);
  if (!Mic.started) {
    drawIdle();
    return;
  }

  const bands = Mic.bands(BANDS);
  for (let i = 0; i < BANDS; i++) {
    // Fast attack, slow release, so petals snap open and drift closed.
    const k = bands[i] > smooth[i] ? 0.5 : 0.08;
    smooth[i] = lerp(smooth[i], bands[i], k);
  }
  const bass = (bands[0] + bands[1] + bands[2]) / 3;
  bassSmooth = lerp(bassSmooth, bass, bass > bassSmooth ? 0.6 : 0.06);
  hueBase = (hueBase + 0.15) % 360;

  const R = min(width, height) * 0.42;
  const t = millis() / 1000;

  push();
  translate(width / 2, height / 2);
  rotate(t * 0.05);
  scale(1 + bassSmooth * 0.25);

  // Core glow pulses with the bass.
  for (let g = 5; g > 0; g--) {
    fill((hueBase + 200) % 360, 60, 100, 0.06 * g);
    circle(0, 0, R * (0.12 + bassSmooth * 0.5) * (g / 3));
  }

  // Petals: the bands run bass to treble and back, repeated SYMMETRY times,
  // so the flower stays balanced however the energy is distributed.
  const SYMMETRY = 3;
  const span = BANDS * 2;
  const petals = span * SYMMETRY;
  for (let i = 0; i < petals; i++) {
    const j = i % span;
    const b = j < BANDS ? j : span - 1 - j;
    const e = smooth[b];
    const a = (i / petals) * TAU;
    const len = R * (0.15 + e * 0.85);
    const w = (TAU / petals) * 1.6; // petals overlap slightly, like a real bloom
    fill((hueBase + b * 9) % 360, 55 + e * 40, 60 + e * 40, 0.35 + e * 0.5);
    beginShape();
    vertex(0, 0);
    for (let s = 0; s <= 8; s++) {
      const aa = a - w / 2 + (w * s) / 8;
      const bulge = sin((s / 8) * PI);
      const r = len * (0.6 + 0.4 * bulge);
      vertex(cos(aa) * r, sin(aa) * r);
    }
    endShape(CLOSE);
  }

  // Waveform ring: average the signal into 180 points so it reads as a
  // wobbling line rather than jagged noise.
  const wave = Mic.waveform();
  const POINTS = 180;
  const per = floor(wave.length / POINTS);
  noFill();
  stroke((hueBase + 40) % 360, 20, 100, 0.7);
  strokeWeight(1.25);
  beginShape();
  for (let p = 0; p < POINTS; p++) {
    let sum = 0;
    for (let k = 0; k < per; k++) sum += wave[p * per + k] - 128;
    const v = sum / per / 128;
    const a = (p / POINTS) * TAU;
    const r = R * 1.02 + v * R * 0.1;
    vertex(cos(a) * r, sin(a) * r);
  }
  endShape(CLOSE);
  pop();
}

function drawIdle() {
  // A slow breathing ring so the page isn't empty before the tap.
  const R = min(width, height) * 0.2;
  const b = 0.5 + 0.5 * sin(millis() / 900);
  noFill();
  stroke(250, 20, 100, 0.15 + b * 0.2);
  strokeWeight(1.5);
  circle(width / 2, height / 2, R * (1.6 + b * 0.3));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(250, 30, 6);
}
