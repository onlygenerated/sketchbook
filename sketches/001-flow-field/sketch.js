// 001 Flow field
// Particles drift along a Perlin noise vector field, leaving ink-like trails.
// Tap or click for a new seed and palette. Hold to pull particles into a vortex.

const PALETTES = [
  { bg: [14, 14, 18], inks: ['#f2efe8', '#e9b44c', '#d1495b', '#00798c'] },
  { bg: [10, 18, 26], inks: ['#9ad1d4', '#ccdbdc', '#ffd166', '#ef476f'] },
  { bg: [244, 239, 230], inks: ['#1b1b1e', '#8c2f39', '#2e5266', '#c9a227'] },
  { bg: [20, 12, 24], inks: ['#ff9f1c', '#ffbf69', '#cbf3f0', '#2ec4b6'] },
  { bg: [236, 242, 238], inks: ['#0b3d2e', '#3a7d44', '#9dc08b', '#e07a5f'] },
];

let particles = [];
let palette;
let zoom;
let fieldSpeed;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(2, displayDensity()));
  reseed();
}

function reseed() {
  const seed = floor(random(1e9));
  randomSeed(seed);
  noiseSeed(seed);
  palette = random(PALETTES);
  zoom = random(0.0015, 0.005);
  fieldSpeed = random(0.00005, 0.0002);
  background(...palette.bg);

  // Scale the particle count with screen area, capped so phones stay smooth.
  const count = constrain(floor((width * height) / 900), 400, 2200);
  particles = Array.from({ length: count }, () => makeParticle());
}

function makeParticle() {
  return {
    x: random(width),
    y: random(height),
    px: 0,
    py: 0,
    life: random(60, 400),
    ink: color(random(palette.inks)),
    w: random(0.5, 1.6),
  };
}

function draw() {
  // A very faint wash slowly fades old trails without erasing them.
  noStroke();
  fill(...palette.bg, 6);
  rect(0, 0, width, height);

  const t = millis() * fieldSpeed;
  const pulling = mouseIsPressed;

  for (const p of particles) {
    p.px = p.x;
    p.py = p.y;

    const n = noise(p.x * zoom, p.y * zoom, t);
    let a = n * TAU * 2;
    let speed = 1.4;

    if (pulling) {
      // Blend the field angle with a swirl around the pointer.
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const d = sqrt(dx * dx + dy * dy) + 1;
      const swirl = atan2(dy, dx) + HALF_PI * 0.85;
      const k = constrain(220 / d, 0, 1);
      a = lerpAngle(a, swirl, k);
      speed += k * 2;
    }

    p.x += cos(a) * speed;
    p.y += sin(a) * speed;
    p.life--;

    const out = p.x < 0 || p.x > width || p.y < 0 || p.y > height;
    if (out || p.life <= 0) {
      Object.assign(p, makeParticle());
      continue;
    }

    p.ink.setAlpha(95);
    stroke(p.ink);
    strokeWeight(p.w);
    line(p.px, p.py, p.x, p.y);
  }
}

function lerpAngle(a, b, k) {
  const diff = atan2(sin(b - a), cos(b - a));
  return a + diff * k;
}

let pressStart = 0;
function mousePressed() {
  pressStart = millis();
}

function mouseReleased() {
  // A quick tap reseeds; a long hold was a vortex, so leave the drawing alone.
  if (millis() - pressStart < 250) reseed();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(...palette.bg);
}
