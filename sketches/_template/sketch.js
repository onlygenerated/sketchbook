// p5.js 2.x sketch. Fills the window, handles resizes and treats taps as clicks.
// Need an image or font? p5 2.x has no preload(): make setup async and await it,
//   async function setup() { img = await loadImage('photo.jpg'); ... }

let seed;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(2, displayDensity()));
  reseed();
}

function draw() {
  background(13, 13, 15, 40);
  noStroke();
  fill(242, 239, 232);
  const r = min(width, height) * 0.15;
  const t = millis() / 1000;
  circle(width / 2 + cos(t) * r, height / 2 + sin(t * 1.3) * r, r * 0.4);
}

function mousePressed() {
  reseed();
}

function reseed() {
  seed = floor(random(1e9));
  randomSeed(seed);
  noiseSeed(seed);
  background(13, 13, 15);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(13, 13, 15);
}
