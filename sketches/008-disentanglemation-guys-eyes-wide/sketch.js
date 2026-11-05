// =====================================================================================================
// Disentanglemation: Guys Eyes (wide)
// Fork of sketch 007 that fills any screen shape (changes marked "wide:"). The faces stay on a
// centered square "stage" sized to the shorter side of the window; the face lines, hair and
// background extend to the screen edges, and "spread" pushes the faces apart (fixed, or moving
// with the music). In a square window it draws exactly what 007 draws. P toggles low-res mode.
//
// Sketch 007 notes: fork of 006 for live use with any music (changes marked "live:"):
//   - "use laptop audio" listens to whatever the laptop is playing (Chrome/Edge screen-share audio)
//   - the microphone option can pick any audio input (a room mic, Stereo Mix, a virtual audio cable)
//   - sensitivity control with auto-level, so any track drives the piece like the original song did
//   - keys: F fullscreen, H hide or show all controls, M frame-rate meter, Space pause
//
// Sketch 006 notes: one deliberate rendering change (marked "change:"): the background is
// drawn once per beat into an offscreen canvas and reused until the next beat, using its own random
// stream. In the original, loud passages reshuffle the background on almost every frame (the bass
// changes the row count, which shifts the random sequence); here it changes on the beat instead.
// Everything else is identical to 005. Measured on the song: roughly half the painting work per frame.
//
// Sketch 005 notes: same pixels as 004 with less work (changes marked "opt:").
// p5's convenience functions are swapped for direct canvas calls that send the canvas exactly the
// same commands: the background gradient no longer builds a p5.Color per line, and curves,
// triangles and rectangles skip p5's shape-building machinery. Verified frame by frame against
// 004 with a replay test (fixed seeds plus audio levels recorded from the song).
//
// Sketch 004 notes: identical to 003 plus a frame-rate readout (marked "fork:").
// Sketch 003 notes follow.
// Ported from Phil's original 2022 sketch (onlygenerated/ac-guyseyes) as faithfully as possible.
// The drawing code below is unchanged. Changes from the original are limited to:
//   - Audio loading: the song isn't published (it's a commercial recording), so it plays from a
//     git-ignored private/ folder when present, otherwise the viewer picks an audio file or the mic.
//   - Play/pause works for the mic too, and the canvas resizes with the window.
//   - pixelDensity capped at 2 (no visible change; keeps high-density phones responsive).
// Libraries are the originals: p5.js 1.2.0 and p5.sound 0.3.12 (byte-identical CDN copies).
// =====================================================================================================

// -----------------------------------------------------------------------------------------------------
/*
Variables and functions only needed for testing
Remove when publishing
*/

function randomHash(nChar) {
    // convert number of characters to number of bytes
    var nBytes = Math.ceil(nChar = (+nChar || 8) / 2);

    // create a typed array of that many bytes
    var u = new Uint8Array(nBytes);

    // populate it with crypto-random values
    window.crypto.getRandomValues(u);

    // convert it to an Array of Strings (e.g. "01", "AF", ..)
    var zpad = function (str) {
        return '00'.slice(str.length) + str
    };
    var a = Array.prototype.map.call(u, function (x) {
        return zpad(x.toString(16))
    });

    // Array of String to String
    var str = a.join('').toUpperCase();
    // and snip off the excess digit if we want an odd number
    if (nChar % 2) str = str.slice(1);

    // return what we made
    return str;
}

let counter = 0;

// tokenData will be injected
let tokenData = {"hash":"0x"+randomHash(64),"tokenId":"61012305230532"};  
//let tokenData = {"hash":"0x"+"A0611121111135B353015285144C3D866ADCF3FF07FF3E7AB2192B41F010FFFF","tokenId":"61012305230532"};
// -----------------------------------------------------------------------------------------------------


// -----------------------------------------------------------------------------------------------------
/*
Project-specific variables
*/
let seed = parseInt(tokenData.hash.slice(0, 16), 16);
let dim;
let maleFaceData = [];
let femaleFaceData = [];

// audio gen stuff

let osc;
let envelope;
let fft;
let scaleArray = [60, 62, 64, 65, 67, 69, 71, 72];
let note = 0;
let peakDetect;
let framesPerPeak;
let estimatedBPM = 120;
let soundStarted = false;

// Input Variables (audio source, visual source, etc)
let source_bpm;
let source_bpm_min = 30;
let source_bpm_max = 120;
let source_volume_bass;
let source_volume_lowMid;
let source_volume_mid;
let source_volume_highMid;
let source_volume_treble;
let source_volume_average;
let source_volume_highest;
let source_volume_lowest;
let source_volume;
let source_volume_min = 0;
let source_volume_max = 1;

// Generative Properties

// labeled integers
let leftSilhouetteStyle;
let rightSilhouetteStyle;
let colorBlendStyle;
let numKnots = 0;
let backgroundStyle;
let backgroundLightnessStyle;
let leftHairStyle;
let rightHairStyle;
let leftHairChaos;
let rightHairChaos;


// labeled booleans
let leftFlipped;
let rightFlipped;
let rotate90;
let faceLines;
let attached;
let drawHair;
let leftGenderFemale;
let rightGenderFemale; 
let sparse;
let sixtyNine;
let monochromatic;
let grayscale;


// unlabeled ranges
let rootHue;
let bgSaturation;
let bgBrightness;
let bgLightness;
let hueDifference;
let lineSaturation;
let lineBrightness;
let rowEntropy;
let attachmentMultiplier;
let edgeBoldness;
let colorAdjustFactor;
let spacingMultiplier;
let weaveDensity;
let weaveVariation;   
let weaveWidth;
let connectLineColorVariation;



// -----------------------------------------------------------------------------------------------------





// -----------------------------------------------------------------------------------------------------
/*
Global Variable creation from random seed
*/

function generateUnlabeledVariable(numMin, numMax, power) {
  if (numMin == numMax) {return numMin}
  if (numMax == 0) {numMax = -0.00000001}
  let initialRandom = range(numMin, numMax);
  return ((initialRandom/numMax) ** power) * numMax;
}

function generateLabeledVariable(numMin, numMax, weights) {
    let i;

    for (i = 0; i < weights.length; i++) {
      weights[i] += weights[i - 1] || 0;
    }
    
    let randomTry = rnd() * weights[weights.length - 1];
    
    for (i = 0; i < weights.length; i++) {
      if (weights[i] > randomTry) {
        break;
      }
    }
  
    return numMin + i;
}

function initializeVariables() {
  
  // ----- Labeled Variables (INTEGER) ----- 
  // Each possible discrete value will have a corresponding label, e.g. "Style 1", "Style 2", etc.  
  
  leftSilhouetteStyle = rangeFloor(0,4);
  rightSilhouetteStyle = rangeFloor(0,4);
  colorBlendStyle = generateLabeledVariable(0, 8, [20, 10, 10, 5, 5, 400, 20, 3, 3]);
  backgroundStyle = generateLabeledVariable(0, 6, [20, 20, 10, 10, 10, 20, 10]); // note modifiers below
  backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 50, 23, 23]);
  leftHairChaos = generateLabeledVariable(0, 1, [6000, 4]);
  rightHairChaos = generateLabeledVariable(0, 1, [6000, 4]);
  //numKnots = generateLabeledVariable(0, 3, [70, 10, 10, 10]);
  numKnots = generateLabeledVariable(1, 3, [40, 35, 25]);
  if (source_volume_treble < 0.18) {
    numKnots = 0;
  }

  
  
  // ----- Labeled Variables (BOOLEAN) -----
  // Each variable will be labeled either "True" or "False"
  faceLines = generateLabeledVariable(0, 1, [12, 88]);
  attached = generateLabeledVariable(0, 1, [4, 6]); // % marriages still together after 15 years
  //sparse = generateLabeledVariable(0, 1, [92000, 8]);
  //leftFlipped = sparse ? 0 : generateLabeledVariable(0, 1, [9000, 1]);
  //rightFlipped = sparse ? 0 : generateLabeledVariable(0, 1, [9000, 1]);
  sparse = 0;
  leftFlipped = generateLabeledVariable(0, 1, [98, 2]);
  rightFlipped = generateLabeledVariable(0, 1, [98, 2]);
  sixtyNine = leftFlipped != rightFlipped;  
  rotate90 = sixtyNine;  
  drawHair = (sparse || colorBlendStyle == 7 || colorBlendStyle == 8 ) ? 0 : generateLabeledVariable(0, 1, [1, 9]);
  leftGenderFemale = generateLabeledVariable(0, 1, [51, 49]); // more women than men
  rightGenderFemale = rnd() < 0.1 ? leftGenderFemale : !leftGenderFemale; // 10% of couples are same-sex

  if (leftGenderFemale) {
    leftHairStyle = (leftSilhouetteStyle == 2) ? generateLabeledVariable(0, 4, [3, 0, 3, 2, 2]) : generateLabeledVariable(0, 4, [0, 0, 2, 3, 5]);
  } else {
    leftHairStyle = (leftSilhouetteStyle == 2) ? 0 : generateLabeledVariable(0, 4, [8, 0, 2, 0, 0]);
  }
  
  if (rightGenderFemale) {
    rightHairStyle = (rightSilhouetteStyle == 2) ? generateLabeledVariable(0, 4, [3, 0, 3, 2, 2]) : generateLabeledVariable(0, 4, [0, 0, 2, 3, 5]);
  } else {
    rightHairStyle = (rightSilhouetteStyle == 2) ? 0 : generateLabeledVariable(0, 4, [8, 0, 2, 0, 0]);
  }

  if (!drawHair) {
    leftHairStyle = 0;
    rightHairStyle = 0;
  }

  hairDyed = (leftHairStyle > 0 || rightHairStyle > 0) && generateLabeledVariable(0, 1, [90, 10]);
  grayscale = ((colorBlendStyle == 7 || colorBlendStyle == 8) && rnd() < 0.2);
  monochromatic = generateLabeledVariable(0, 1, [95, 5]) || grayscale;
 
  
  // ----- Unlabeled Variables -----
  // Each property will simply be represented by a number. 
  // Properties may have an exponential distribution.
  
  rootHue = ((((rnd() < 0.5) * 2) - 1) * generateUnlabeledVariable(0, 180, 1.25)) - 45; // hue is up to 360. Hue centered on 270, most common color is red-magenta, least common is green
  rootHue += rootHue < 0 ? 360 : 0; // put back into 0-360 format
  hueDifference = generateUnlabeledVariable(0, 30, 2); // this can be up to 360, but should be <= 90
  lineSaturation = grayscale ? 0 : generateUnlabeledVariable(90, 100, 1); // saturation is up to 100
  lineBrightness = generateUnlabeledVariable(90, 100, 1); // brightness is up to 100
  //rowEntropy = generateUnlabeledVariable(0.0, 1.0, 1); // 0.0 = all row colors the same, 1.0 = all row colors randomly shuffled
  rowEntropy = source_volume_mid < 0.5 ? 0 : Math.pow(source_volume_mid, 3); // 0.0 = all row colors the same, 1.0 = all row colors randomly shuffled
  attachmentMultiplier = generateUnlabeledVariable(0.0, 1.0, 1); // 0 = normal distance, 1 = extreme 
  edgeBoldness = attached ? generateUnlabeledVariable(0.4, 1.0, 1) : 1.0;
  colorAdjustFactor = generateUnlabeledVariable(1, 20, 2) * 6; 
  //spacingMultiplier = sparse ? generateUnlabeledVariable(0.05, 0.08, 1.5) : generateUnlabeledVariable(0.01, 0.025, 1);
  spacingMultiplier = 0.008 + (0.35 * Math.pow(source_volume_bass, 10));
  weaveDensity = generateUnlabeledVariable(1.0, 1.0, 1); // 0 = no weaveLines, 1.0 = highest density
  weaveVariation = generateUnlabeledVariable(0.5, 0.9, 1);   
  weaveWidth = generateUnlabeledVariable(0.016, 0.018, 1);
  connectLineColorVariation = generateUnlabeledVariable(0, 1, 3);

  if (numKnots == 3) {
    numKnots = attached ? generateUnlabeledVariable(3, 6, 2) : generateUnlabeledVariable(3, 20, 1);
  }

  if (!faceLines) {
    backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 4, 1, 1]);
    backgroundStyle = generateLabeledVariable(0, 6, [5, 5, 10, 5, 30, 20, 15]);
  }
  
  if (sparse) {
    backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 4, 1, 1]);
    backgroundStyle = generateLabeledVariable(0, 6, [1, 1, 1, 1, 1, 1, 4]);
  }
  
  if (!faceLines && sparse) {
    backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 3, 1, 1]);
    backgroundStyle = generateLabeledVariable(0, 6, [5, 5, 25, 5, 30, 5, 25]);
  }

  if (backgroundStyle == 2 || backgroundStyle == 4) {
    backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 6, 2, 2]);
  }

  if (backgroundStyle == 6) {
    backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 2, 2, 2]);
  }
  
  
  if (backgroundStyle == 3) {
    backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 10, 0, 0]);
  }
  
  if (colorBlendStyle == 6) {
    if (rnd() < 0.8) {
      backgroundLightnessStyle = 3;
      backgroundStyle = generateLabeledVariable(0, 6, [0, 4, 0, 0, 0, 3, 3]);
    } else {
      backgroundLightnessStyle = 4;
      backgroundStyle = generateLabeledVariable(0, 6, [0, 0, 0, 5, 0, 5, 0]);
    }
    if (!faceLines) {
      backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 20, 30, 0]);
      backgroundStyle = generateLabeledVariable(0, 6, [0, 0, 0, 3, 0, 4, 3]);
    }
  }
  
  if (colorBlendStyle == 7 && faceLines) {
    if (rnd() < 0.5) {
      backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 0, 6, 4]);
      backgroundStyle = generateLabeledVariable(0, 6, [0, 0, 15, 0, 40, 0, 45]);
    } else {
      backgroundLightnessStyle = generateLabeledVariable(0, 4, [0, 0, 5, 3, 1]);
      backgroundStyle = generateLabeledVariable(0, 6, [0, 0, 0, 3, 0, 2, 5]);
    }
  }

  if (colorBlendStyle == 8) {
    switch (rangeFloor(0,3)) {
      case 0: 
        backgroundLightnessStyle = 0;
        backgroundStyle = generateLabeledVariable(0, 6, [5, 5, 20, 0, 0, 0, 70]);
        break;
      case 1: 
        backgroundLightnessStyle = 1;
        backgroundStyle = generateLabeledVariable(0, 6, [5, 5, 0, 0, 0, 50, 40]);
        break;
      case 2:
        backgroundLightnessStyle = 2;
        backgroundStyle = generateLabeledVariable(0, 6, [5, 5, 90, 0, 0, 0, 0]);
        break;
    }
  }
  
  
  switch (backgroundLightnessStyle) {
    case 0: // very dark
      bgBrightness = generateUnlabeledVariable(5, 20, 1); // brightness is up to 100
      bgSaturation = generateUnlabeledVariable(50, 100, 1); // saturation is up to 100
      bgLightness = generateUnlabeledVariable(2, 15, 1.5); // lightness is up to 100
      break;
    case 1: // dark
      bgBrightness = generateUnlabeledVariable(15, 30, 1); // brightness is up to 100
      bgSaturation = generateUnlabeledVariable(50, 90, 1); // saturation is up to 100
      bgLightness = generateUnlabeledVariable(15, 25, 1); // lightness is up to 100
      break;
    case 2: // light saturated
      bgBrightness = generateUnlabeledVariable(70, 90, 1); // brightness is up to 100
      bgSaturation = generateUnlabeledVariable(100, 100, 1); // saturation is up to 100
      bgLightness = generateUnlabeledVariable(75, 85, 1); // lightness is up to 100
      break;
    case 3: // very light
      bgBrightness = generateUnlabeledVariable(95, 99, 1); // brightness is up to 100
      bgSaturation = generateUnlabeledVariable(80, 100, 1); // saturation is up to 100
      bgLightness = generateUnlabeledVariable(90, 90, 1); // lightness is up to 100
      break;
    case 4: // light desaturated
      bgBrightness = generateUnlabeledVariable(80, 90, 1); // brightness is up to 100
      bgSaturation = generateUnlabeledVariable(70, 90, 1); // saturation is up to 100
      bgLightness = generateUnlabeledVariable(80, 90, 1); // lightness is up to 100
      break;
    default:
      bgBrightness = generateUnlabeledVariable(0, 4, 1); // brightness is up to 100
      bgSaturation = generateUnlabeledVariable(50, 100, 1); // saturation is up to 100
      bgLightness = generateUnlabeledVariable(0, 4, 1); // lightness is up to 100
      break;
  }
  
  if (grayscale) {
    bgSaturation = 0;
  }
  
  
}
// -----------------------------------------------------------------------------------------------------


  function gradientLine(ctx, x1, y1, x2, y2, c1, c2, lineWidth) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }


// -----------------------------------------------------------------------------------------------------
/*
  opt: direct canvas versions of p5 1.2 drawing calls. Each one issues exactly the same canvas
  commands as the p5 function it replaces (including p5's "skip if fully transparent black" checks),
  so the pixels are identical. What they skip: argument copying, validation hooks, and for curves,
  p5's beginShape/vertex/bezierVertex/endShape bookkeeping.
*/
const STYLE_EMPTY = 'rgba(0,0,0,0)';

// Same as p5's endShape fill/stroke step.
function fastFillStroke(r, ctx) {
  if (r._doFill) ctx.fill();
  if (r._doStroke) ctx.stroke();
}

// p5 bezier(): beginShape(); vertex(x1, y1); bezierVertex(...); endShape();
function fastBezier(x1, y1, x2, y2, x3, y3, x4, y4) {
  const r = _renderer;
  if (!r._doStroke && !r._doFill) return;
  const ctx = r.drawingContext;
  ctx.beginPath();
  ctx.lineTo(x1, y1); // p5 starts shapes with lineTo on the empty path (renders differently from moveTo)
  ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
  fastFillStroke(r, ctx);
}

// The knot shape: vertex, bezierVertex, bezierVertex, vertex.
function fastKnot(ax, ay, b1x, b1y, b2x, b2y, bx, by, c1x, c1y, c2x, c2y, cx, cy, dx, dy) {
  const r = _renderer;
  if (!r._doStroke && !r._doFill) return;
  const ctx = r.drawingContext;
  ctx.beginPath();
  ctx.lineTo(ax, ay); // as in fastBezier()
  ctx.bezierCurveTo(b1x, b1y, b2x, b2y, bx, by);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, cx, cy);
  ctx.lineTo(dx, dy);
  fastFillStroke(r, ctx);
}

// p5's checks for "nothing to draw" in triangle() and rect().
function fastSkip(r) {
  const doFill = r._doFill, doStroke = r._doStroke;
  if (!doFill && !doStroke) return true;
  if (doFill && !doStroke) return r._getFill() === STYLE_EMPTY;
  if (!doFill && doStroke) return r._getStroke() === STYLE_EMPTY;
  return false;
}

function fastTriangle(x1, y1, x2, y2, x3, y3) {
  const r = _renderer;
  if (fastSkip(r)) return;
  const ctx = r.drawingContext;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  fastFillStroke(r, ctx);
}

// rect() in the default CORNER mode with no rounded corners.
function fastRect(x, y, w, h) {
  const r = _renderer;
  if (fastSkip(r)) return;
  const ctx = r.drawingContext;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  fastFillStroke(r, ctx);
}
// -----------------------------------------------------------------------------------------------------
/*
  change: per-beat background cache. begin() points p5 at an offscreen canvas and switches to a
  random stream seeded from the second half of the beat's hash; end() switches both back.
  paint() composites the cached background onto the main canvas, keeping the original's faint
  trace of the previous frame (the background lines never fully cover it).
*/
const bgCache = (() => {
  let canvas = null, octx = null, mainCtx = null, savedSeed = 0, pendingKey = null;
  const api = { key: null, colors: null };

  api.keyFor = () => {
    const c = _renderer.drawingContext.canvas;
    return tokenData.hash + '|' + c.width + 'x' + c.height;
  };

  api.begin = (key) => {
    mainCtx = _renderer.drawingContext;
    const w = mainCtx.canvas.width, h = mainCtx.canvas.height;
    if (!canvas || canvas.width !== w || canvas.height !== h) {
      canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      octx = canvas.getContext('2d');
    }
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, w, h);
    octx.setTransform(mainCtx.getTransform());
    octx.lineCap = mainCtx.lineCap;
    octx.lineJoin = mainCtx.lineJoin;
    octx.lineWidth = mainCtx.lineWidth;
    octx.strokeStyle = mainCtx.strokeStyle;
    octx.fillStyle = mainCtx.fillStyle;
    _renderer.drawingContext = octx;
    savedSeed = seed;
    seed = parseInt(tokenData.hash.slice(18, 34), 16) || 1;
    pendingKey = key;
  };

  api.end = (colors) => {
    _renderer.drawingContext = mainCtx;
    _renderer._cachedStrokeStyle = undefined; // p5's style caches described the offscreen canvas
    _renderer._cachedFillStyle = undefined;
    seed = savedSeed;
    api.colors = colors;
    api.key = pendingKey;
  };

  api.paint = () => {
    const ctx = _renderer.drawingContext;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  };

  return api;
})();
// -----------------------------------------------------------------------------------------------------


// -----------------------------------------------------------------------------------------------------
/*
P5.js required functions
*/

// Port: the original loaded 'assets/acmpp07.mp3' in preload(). The song now lives in a
// git-ignored private/ folder, and the viewer chooses a source (see the bottom of this file).
let sound;            // p5.SoundFile when playing a song
let live = null;      // live: the laptop-audio or microphone stream, when one is in use
let liveOn = false;   // live: false while paused
const LOCAL_SONG = 'private/acmpp07.mp3';

function setup() {

  dim = Math.min(windowWidth, windowHeight); // wide: the square stage the faces live on
  strokeCap(SQUARE);
  createCanvas(windowWidth, windowHeight);   // wide: the canvas fills the window
  pixelDensity(Math.min(2, displayDensity())); // port: cap density for phones
  createFaceData();
  frameRate(32);
  fft = new p5.FFT();
  framesPerPeak = 8;
  peakDetect = new p5.PeakDetect(150, 2000, 0.5);
  peakDetect.onPeak(triggerBeat);
  background(255,127,127);
  setupSourcePicker(); // port: replaces preload()

}

// port: true while a song is playing or the mic is listening
function audioActive() {
  return (sound && sound.isPlaying()) || liveOn;
}

function draw() {
  if (audioActive()) {
    const frameStart = performance.now(); // fork: time the work done each frame
    fft.analyze();
    peakDetect.update(fft);
    source_volume_bass = fft.getEnergy("bass") / 255;
    source_volume_lowMid = fft.getEnergy("lowMid") / 255;
    source_volume_mid = fft.getEnergy("mid") / 255;
    source_volume_highMid = fft.getEnergy("highMid") / 255;
    source_volume_treble = fft.getEnergy("treble") / 255;
    source_volume_average = (source_volume_bass + source_volume_lowMid + source_volume_mid + source_volume_highMid + source_volume_treble) / 5;
    source_volume_highest = Math.max(source_volume_bass, source_volume_lowMid, source_volume_mid, source_volume_highMid, source_volume_treble);
    source_volume_lowest = Math.min(source_volume_bass, source_volume_lowMid, source_volume_mid, source_volume_highMid, source_volume_treble);
    if (live) liveInput.autoLevel(source_volume_bass); // live: keep any music in the original's range
    //tokenData = {"hash":"0x"+randomHash(64),"tokenId":"61012305230532"};  
    seed = parseInt(tokenData.hash.slice(0, 16), 16);
    updateSpread(); // wide
    renderFrame();  // wide: was initializeVariables(); drawFace(0, 0, dim);
    fpsMeter.frame(performance.now() - frameStart); // fork
  } else {
    fpsMeter.pause(); // fork: hide the readout while paused
  }
}

// wide: draw one frame with the stage centered in the window
function renderFrame() {
  initializeVariables();
  const offX = Math.floor((width - dim) / 2);
  const offY = Math.floor((height - dim) / 2);
  drawFace(offX, offY, dim);
}

// wide: spread, from 0 (faces at their original distance) to 1 (each face as close to its screen
// edge as it was to the square's edge). With music on, the faces drift apart in quieter moments and
// come together when it gets louder; the slider sets how far apart they can get.
let wideSpread = 0;
const spreadCtl = { base: 0, music: false, fast: null, slow: null, cur: 0 };
const SPREAD_SWING = 0.1; // typical few-second swing in overall loudness (measured on the song)
function updateSpread() {
  let target = spreadCtl.base;
  if (spreadCtl.music) {
    const lvl = source_volume_average;
    spreadCtl.fast = spreadCtl.fast === null ? lvl : spreadCtl.fast + (lvl - spreadCtl.fast) * 0.08;
    spreadCtl.slow = spreadCtl.slow === null ? lvl : spreadCtl.slow + (lvl - spreadCtl.slow) * 0.004;
    const d = (spreadCtl.fast - spreadCtl.slow) / SPREAD_SWING; // louder than usual: positive
    target = spreadCtl.base * Math.min(1, Math.max(0, 0.5 - d * 0.5));
  }
  spreadCtl.cur += (target - spreadCtl.cur) * 0.1; // ease, so the faces glide rather than jump
  wideSpread = spreadCtl.cur;
}

function triggerBeat() {
  tokenData = {"hash":"0x"+randomHash(64),"tokenId":"61012305230532"};
}

function mouseClicked() {
  if (!sound && !live) return; // port: no source chosen yet; the picker handles the first tap
  togglePause();
}

// live: pause or resume whichever source is in use (tap, click or Space)
function togglePause() {
  userStartAudio();
  if (live) {
    liveOn = !liveOn;
    return;
  }
  if (!sound) return;
  if (sound.isPlaying()) {
    sound.pause();
  } else {
    if (!soundStarted) {
      soundStarted = true;
      sound.loop();
    } else {
      sound.play();  
    }    
  }
}

// -----------------------------------------------------------------------------------------------------





// -----------------------------------------------------------------------------------------------------
/*
  Project-specific drawing functions
*/
function createFaceData() {
  
  // Original, unisex, smooth features
  let faceArray0 = [48,78,110,135,160,180,200,220,240,260,280,300,315,330,345,360,375,390,400,410,420,430,440,450,460,470,480,490,500,510,505,510,515,520,525,530,535,540,545,550,555,560,565,568,571,571,571,571,571,571,571,571,568,565,562,559,554,550,545,535,525,515,505,495,480,465,450,430,410,390,381,362,352,333,324,314,314,314,314,314,324,333,343,352,362,381,390,410,419,438,457,476,495,514,533,552,571,600,619,638,657,686,705,724,743,771,800,819,838,857,886,914,950,975,985,990,995,995,990,990,970,952,933,905,867,800,743,686,667,657,657,667,676,686,695,705,724,743,771,790,800,800,800,790,781,762,752,733,714,686,648,610,581,571,581,600,619,638,657,676,686,686,686,676,667,648,629,590,543,505,476,467,457,457,457,457,467,476,480,484,488,492,492,492,488,484,478,465,450,440,418,380,330,280,200,110];


  // Female Ruth
  let faceArray1 = [167, 151, 143, 143, 143, 143, 143, 143, 143, 151, 159, 167, 167, 167, 175, 183, 190, 198, 214, 230, 246, 254, 270, 278, 294, 302, 317, 333, 357, 373, 389, 397, 413, 421, 437, 444, 452, 460, 468, 476, 484, 492, 500, 500, 508, 516, 524, 524, 532, 540, 548, 548, 548, 548, 540, 532, 516, 500, 484, 468, 460, 444, 429, 405, 381, 357, 341, 325, 333, 357, 357, 405, 333, 310, 310, 333, 381, 349, 365, 373, 389, 397, 413, 421, 437, 452, 476, 500, 524, 548, 571, 595, 619, 651, 683, 714, 738, 762, 786, 817, 849, 881, 905, 929, 944, 960, 968, 984, 992, 1000, 1000, 992, 984, 976, 976, 960, 937, 905, 881, 841, 794, 738, 690, 651, 619, 603, 595, 595, 595, 595, 595, 603, 611, 619, 627, 635, 651, 659, 675, 690, 698, 690, 675, 659, 635, 595, 548, 524, 524, 556, 587, 619, 627, 619, 603, 587, 571, 556, 540, 532, 516, 508, 492, 484, 476, 468, 460, 460, 468, 476, 484, 492, 500, 500, 500, 500, 500, 500, 500, 492, 484, 476, 468, 460, 452, 444, 429, 413, 397, 365, 310, 246, 183, 103, 60, 0];

  // Female Black 
  let faceArray2 = [42, 83, 111, 139, 153, 181, 194, 208, 222, 236, 250, 264, 278, 292, 306, 333, 361, 375, 375, 375, 389, 403, 431, 444, 458, 458, 458, 472, 486, 500, 500, 500, 500, 514, 528, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 542, 528, 514, 500, 500, 500, 486, 472, 458, 458, 444, 431, 403, 389, 375, 361, 347, 333, 333, 319, 306, 292, 292, 292, 292, 333, 417, 375, 333, 250, 278, 292, 292, 306, 319, 347, 361, 389, 403, 431, 458, 500, 542, 583, 611, 639, 667, 708, 750, 792, 833, 875, 917, 944, 972, 986, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 986, 972, 944, 931, 917, 903, 806, 694, 597, 583, 597, 611, 625, 639, 653, 681, 694, 722, 750, 792, 833, 861, 875, 875, 875, 875, 861, 847, 833, 819, 792, 750, 694, 639, 625, 667, 722, 764, 778, 806, 819, 833, 833, 833, 833, 819, 806, 792, 764, 708, 639, 583, 556, 542, 542, 542, 542, 542, 556, 569, 583, 583, 583, 583, 583, 583, 569, 556, 542, 542, 542, 528, 514, 486, 472, 444, 417, 361, 292, 250, 208];
  
  // Female White 
  let faceArray3 = [78, 67, 67, 67, 56, 44, 22, 11, 11, 33, 56, 78, 100, 133, 156, 178, 189, 211, 222, 244, 256, 267, 278, 289, 300, 300, 311, 322, 333, 344, 356, 367, 378, 389, 400, 400, 411, 422, 433, 433, 433, 433, 444, 456, 467, 467, 467, 467, 467, 467, 467, 467, 467, 467, 467, 467, 456, 444, 433, 422, 411, 389, 378, 367, 356, 344, 333, 333, 344, 356, 356, 333, 311, 300, 300, 311, 322, 333, 344, 356, 378, 389, 411, 422, 433, 433, 444, 467, 489, 511, 533, 556, 578, 600, 622, 656, 678, 711, 722, 744, 767, 789, 811, 833, 878, 911, 944, 967, 989, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 989, 978, 956, 922, 878, 833, 789, 733, 689, 656, 644, 633, 633, 633, 644, 656, 667, 678, 700, 733, 767, 789, 800, 800, 789, 778, 767, 756, 733, 689, 633, 611, 622, 678, 711, 733, 733, 733, 722, 711, 700, 667, 622, 567, 544, 533, 522, 500, 478, 467, 478, 489, 500, 500, 500, 500, 511, 522, 533, 533, 533, 533, 533, 522, 511, 500, 489, 478, 467, 456, 444, 422, 411, 389, 356, 300, 233, 156, 117, 67];

  // Male Mediterranean 
  let faceArray4 = [322, 310, 310, 322, 333, 345, 345, 345, 356, 368, 379, 391, 402, 414, 425, 437, 448, 460, 471, 483, 494, 506, 517, 517, 529, 540, 552, 552, 552, 552, 563, 575, 586, 586, 598, 609, 621, 621, 621, 632, 644, 655, 655, 655, 655, 655, 655, 655, 655, 655, 655, 655, 655, 644, 632, 621, 609, 586, 552, 517, 494, 483, 471, 460, 437, 414, 391, 368, 379, 391, 402, 379, 356, 356, 379, 391, 402, 402, 425, 437, 460, 471, 494, 517, 552, 586, 621, 655, 690, 713, 736, 747, 770, 782, 793, 805, 816, 839, 851, 874, 885, 908, 920, 943, 954, 966, 977, 989, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 989, 977, 966, 954, 931, 897, 828, 759, 701, 678, 667, 655, 655, 655, 655, 655, 667, 678, 690, 701, 713, 736, 747, 770, 782, 793, 793, 793, 793, 770, 724, 667, 632, 632, 667, 713, 736, 736, 724, 724, 713, 690, 667, 644, 632, 609, 598, 575, 563, 540, 529, 529, 540, 552, 552, 563, 575, 598, 609, 621, 621, 621, 609, 598, 586, 586, 575, 563, 552, 540, 529, 506, 494, 471, 448, 391, 310, 218, 115, 69, 0];

  // Male Black
  let faceArray5 = [120,140,165,195,220,240,270,295,330,350,370,390,410,430,445,460,475,490,500,510,520,530,540,550,560,570,575,580,585,590,595,600,605,607,610,613,615,617,619,621,623,625,625,625,625,625,625,623,621,619,616,613,610,607,603,599,595,590,585,575,565,555,545,535,520,510,485,455,420,390,370,350,330,320,310,305,300,300,300,300,305,310,320,330,350,370,390,410,430,450,470,490,510,530,560,590,620,644,689,711,756,778,822,844,885,910,925,945,955,965,980,990,990,990,990,980,970,956,911,889,844,711,556,470,450,450,460,480,490,520,556,578,630,670,720,755,770,776,778,776,774,772,750,735,710,676,640,600,560,500,540,610,660,690,710,720,733,733,733,733,725,700,680,660,578,500,470,440,430,440,450,470,490,515,520,525,530,532,535,535,532,530,520,500,490,480,470,455,440,420,395,360,320,270,180,0];
  
  // Male White
  let faceArray6 = [127,143,159,175,206,222,230,240,254,270,302,315,330,340,349,370,388,405,418,430,440,445,455,460,464,468,472,476,480,484,488,492,500,508,515,520,525,528,531,534,537,537,537,537,537,537,537,534,531,528,525,520,515,508,492,492,492,492,476,460,444,429,413,397,381,381,365,349,333,333,317,305,302,302,305,305,325,333,349,365,381,397,413,429,444,460,476,492,508,540,556,587,603,635,651,683,698,730,746,778,794,825,841,873,889,921,937,968,984,1000,1000,1000,1000,1000,1000,984,968,937,905,825,746,667,619,571,540,524,524,524,540,556,587,603,635,651,683,714,746,762,762,762,762,762,746,730,698,667,619,587,620,660,690,705,714,714,698,683,667,651,603,540,492,476,476,460,460,444,460,460,476,476,485,495,505,515,522,522,522,522,522,522,520,515,512,508,500,485,480,468,455,430,410,380,350,280,180,0];

  
  femaleFaceData.push(faceArray0);
  femaleFaceData.push(faceArray1);
  femaleFaceData.push(faceArray2); 
  femaleFaceData.push(faceArray3); 
  
  maleFaceData.push(faceArray0);
  maleFaceData.push(faceArray4);
  maleFaceData.push(faceArray5);
  maleFaceData.push(faceArray6);
  
}

function drawFace(regX, regY, imageDim) {
  
  push();
  translate(regX, regY);
  
  let leftArray = [];
  let rightArray = [];
  let drawLeftHair = true;
  let drawRightHair = true;
  let leftHairLength; // 0 = no hair, 1 = from top of screen to bottom
  let leftHairStretchAdjust;
  let leftHairSweep;
  let rightHairLength; // 0 = no hair, 1 = from top of screen to bottom
  let rightHairStretchAdjust;
  let rightHairSweep;
  
  switch (leftHairStyle) {
    case 0: // bald
      drawLeftHair = false;
      leftHairLength = 0;
      leftHairStretchAdjust = 0;
      leftHairSweep = 0;
      break;
    case 1: // short spiky (not currently used)
      leftHairLength = generateUnlabeledVariable(0.15, 0.25, 3);
      leftHairStretchAdjust = generateUnlabeledVariable(1, 5, 3);
      leftHairSweep = range(0.02,0.06);
      leftHairChaos = generateLabeledVariable(-1, 1, [600, 200, 200]);      
      break;
    case 2: // medium swept
      leftHairLength = range(0.6, 0.8);
      leftHairStretchAdjust = 10;
      leftHairSweep = 0.10;
      break;
    case 3: // long swept
      leftHairLength = 1;
      leftHairStretchAdjust = 10;
      leftHairSweep = 0.16;
      break;
    case 4: // long straight
      leftHairLength = 1;
      leftHairStretchAdjust = 5;
      leftHairSweep = 0.06;
      break;
  }
  switch (rightHairStyle) {
    case 0: // bald
      drawRightHair = false;
      rightHairLength = 0;
      rightHairStretchAdjust = 0;
      rightHairSweep = 0;
      break;
    case 1: // short spiky (not currently used)
      rightHairLength = generateUnlabeledVariable(0.15, 0.25, 3);
      rightHairStretchAdjust = generateUnlabeledVariable(1, 5, 3);
      rightHairSweep = range(0.02,0.06);
      rightHairChaos = generateLabeledVariable(-1, 1, [6, 2, 2]);
      break;
    case 2: // medium swept
      rightHairLength = range(0.6, 0.8);
      rightHairStretchAdjust = 10;
      rightHairSweep = 0.10;
      break;
    case 3: // long swept
      rightHairLength = 1;
      rightHairStretchAdjust = 10;
      rightHairSweep = 0.16;
      break;
    case 4: // long straight
      rightHairLength = 1;
      rightHairStretchAdjust = 5;
      rightHairSweep = 0.06;
      break;
  }

  
  leftArray = leftGenderFemale ? [...femaleFaceData[leftSilhouetteStyle]] : [...maleFaceData[leftSilhouetteStyle]];
  rightArray = rightGenderFemale ? [...femaleFaceData[rightSilhouetteStyle]] : [...maleFaceData[rightSilhouetteStyle]];
    
  if (leftFlipped) {
    leftArray.reverse();
  }

  if (rightFlipped) {
    rightArray.reverse();
  }
  
  let spacing = spacingMultiplier * imageDim;
  let numLines = Math.round((imageDim) / spacing);
  let endYArray = Array.from(Array(numLines).keys()); // fill an array with 0 to numLines

  let unattachedDistanceMin = 0.11;
  let unattachedDistanceMax = 0.08;
  let attachedDistanceMin = 0.19;
  let attachedDistanceMax = 0.16;
  let faceDistance;
 
  faceDistance = attached ? map(attachmentMultiplier, 0, 1, attachedDistanceMax, attachedDistanceMin) : map(attachmentMultiplier, 0, 1, unattachedDistanceMax, unattachedDistanceMin);
  
  let startX = imageDim * faceDistance;
  let endX = imageDim - (imageDim * faceDistance);
  
  let stretchFactor = 0.65 + range(0, rowEntropy * 1.25); 
  let faceDepthMultiplier = imageDim * range(0.2, 0.22) * 0.001;
  let leftShear = imageDim * ((faceDistance * 0.016) - 0.001); // closer together, they lean apart to kiss
  let rightShear = -leftShear;
  if (leftFlipped != rightFlipped) {
    leftShear *= -1;
  }
  
  colorMode(HSB);

  hueDifference *= (rnd() < 0.5 ? -1 : 1) * !monochromatic;
    
  let bgPlusMinus = rangeFloor(-1,2) * !monochromatic;
  let bgRootHue = rootHue + (!monochromatic * (rnd() < 0.5 ? -1 : 1) * rangeFloor(4, 6) * 10); 
  let leftHue = rootHue + hueDifference;
  let rightHue = rootHue - hueDifference;
  let leftBaseColor = color(leftHue, lineSaturation, lineBrightness);
  let rightBaseColor = color(rightHue, lineSaturation, lineBrightness);
  let bgBaseColor = color(bgRootHue + (3 * hueDifference), lineSaturation, lineBrightness);
  let backgroundColor1 = color(bgRootHue + (!monochromatic * bgPlusMinus * rangeFloor(0, 3) * 10), bgSaturation + range(-10,10), bgBrightness);
  let backgroundColor2 = color(bgRootHue + (!monochromatic * bgPlusMinus * rangeFloor(0, 3) * 10), bgSaturation + range(-10,10), bgBrightness);
  
  colorMode(HSL);
  backgroundColor1 = color(hue(backgroundColor1), saturation(backgroundColor1), bgLightness);
  backgroundColor2 = color(hue(backgroundColor2), saturation(backgroundColor2), bgLightness);
  
  colorMode(RGB);
  let bgStrokeColor = rnd() < 0.5 ? bgBaseColor : lerpColor(leftBaseColor, rightBaseColor, 0.5);;
  
  colorMode(HSB);
  let shadowColor = color(0,0,0,0.2);
  let shadowColorLighter = color(0,0,0,0.08);

  shuffleArrayEntropy(endYArray, rowEntropy);
  

  
  // ------ Draw Background Content ------

  // wide: the background covers the whole canvas, not just the stage. Shapes are laid out in
  // stage units as before (same random choices), then mapped onto the full canvas.
  const bgX0 = (-regX) || 0, bgY0 = (-regY) || 0;
  const bgSX = width / imageDim, bgSY = height / imageDim;
  const bx = (x) => bgX0 + x * bgSX;
  const by = (y) => bgY0 + y * bgSY;
  
  let bgWeaveWidth = spacing * 2;
  
  let currentBeginTargetX;
  let currentBeginTargetY;
  let currentBeginStretchX;
  let currentBeginStretchY;
  let currentEndTargetX;
  let currentEndTargetY;
  let currentEndStretchX;
  let currentEndStretchY;
  let curBGWeaveWidth;
  let bgStrokeDensity;
  let bgAlphaMax = 0;
  let bgPlusMinus2 = 0;
  let saturationMultiplier;

  
  // change: draw the background once per beat (see bgCache), then reuse it
  const bgKey = bgCache.keyFor();
  if (bgCache.key !== bgKey) {
  bgCache.begin(bgKey);
  noFill();
  switch (backgroundStyle) {
    case 0: // top-down gradient
      setGradient(bgX0, bgY0, width, height, backgroundColor1, backgroundColor2, "Y", range(1,3));
      break;
    
    case 1: // bottom-top gradient
      setGradient(bgX0, bgY0, width, height, backgroundColor2, backgroundColor1, "Y", range(1,3));
      break;
    
    case 2: // Dense curvy ribbons behind faces, LOUD ---NO BREAK IS INTENTIONAL---
      bgAlphaMax = range(0.2, 0.6);
      bgStrokeDensity = rangeFloor(80, 120);
    
    case 3: // Dense curvy ribbons behind faces, SUBTLE     
      if (bgAlphaMax < 0.1) {
        bgAlphaMax = 0.04;
        bgStrokeDensity = rangeFloor(80, 120);
      }  

      setGradient(bgX0, bgY0, width, height, backgroundColor1, backgroundColor2, "Y", range(1,3));
      for (let j = 0; j < bgStrokeDensity; j++) {
        let bgWeaveWidthVariation = range(0.1,5);
        let curAlpha = generateUnlabeledVariable(0.01, bgAlphaMax, 2);
        //colorMode(HSL);
        colorMode(HSB);
        let curBGWeaveColor = color(hue(bgStrokeColor) + (rangeFloor(-10, 10) * 10 * !monochromatic), saturation(bgStrokeColor) * 0.5, brightness(bgStrokeColor), curAlpha);        
        let curStretchAdjust = range(-spacing*40, spacing*40);
        let curStretch = imageDim * range(0.01,0.3);
        strokeWeight(bgWeaveWidth * bgWeaveWidthVariation);
        curBGWeaveWidth = bgWeaveWidth * range(-0.25, 4);
        currentBeginTargetX = rnd() < 0.5 ? range(0,imageDim) : rangeFloor(0,2) * imageDim;
        currentBeginTargetY = currentBeginTargetX % imageDim == 0 ? range(0,imageDim/2) : 0;
        currentBeginStretchX = currentBeginTargetX + curStretchAdjust;
        currentBeginStretchY = currentBeginTargetY + curStretch;
        currentEndTargetX = rnd() < 0.5 ? range(0,imageDim) : rangeFloor(0,2) * imageDim;
        currentEndTargetY = currentEndTargetX % imageDim == 0 ? range(imageDim/2, imageDim) : imageDim;
        currentEndStretchX = currentEndTargetX - curStretchAdjust;
        currentEndStretchY = currentEndTargetY - curStretch;
        strokeWeight(curBGWeaveWidth);
        stroke(curBGWeaveColor);
        fastBezier( // wide: mapped onto the full canvas
          bx(currentBeginTargetX), by(currentBeginTargetY),
          bx(currentBeginStretchX), by(currentBeginStretchY),
          bx(currentEndStretchX), by(currentEndStretchY),
          bx(currentEndTargetX), by(currentEndTargetY)
        ); 
      }
      break;

    case 4: // Mostly straight ribbons behind faces, LOUD ---NO BREAK IS INTENTIONAL---
      bgAlphaMax = range(0.4, 0.8);

    case 5: // Mostly straight ribbons behind faces, SUBTLE
      if (bgAlphaMax < 0.1) {
        bgAlphaMax = 0.08
      }      
      bgStrokeDensity = rangeFloor(20, 60);
      colorMode(HSL);
      bgPlusMinus2 = rangeFloor(-1,2);
      backgroundColor1 = color(hue(backgroundColor1) + (bgPlusMinus2 * generateUnlabeledVariable(0,180,5) * !monochromatic), saturation(backgroundColor1), bgLightness);
      backgroundColor2 = color(hue(backgroundColor2) + (bgPlusMinus2 * generateUnlabeledVariable(0,180,5) * !monochromatic), saturation(backgroundColor2), bgLightness);
      colorMode(HSB);
      setGradient(bgX0, bgY0, width, height, backgroundColor2, backgroundColor1, "Y", range(1,3));
      for (let j = 0; j < bgStrokeDensity; j++) {
        let bgWeaveWidthVariation = range(0.1,20);
        let curAlpha = generateUnlabeledVariable(0.01, bgAlphaMax, 2);
        colorMode(HSL);
        let curBGWeaveColor = color(hue(bgStrokeColor) + (rangeFloor(-20, 20) * 5 * !monochromatic), saturation(bgStrokeColor) * 1, range(50,95), curAlpha);
        colorMode(HSB);
        let curStretchAdjust = 0;
        let curStretch = imageDim * range(0.01,0.3);
        strokeWeight(bgWeaveWidth * bgWeaveWidthVariation);
        curBGWeaveWidth = bgWeaveWidth * range(-0.25, 4);
        currentBeginTargetX = rnd() < 0.5 ? range(0,imageDim) : rangeFloor(0,2) * imageDim;
        currentBeginTargetY = currentBeginTargetX % imageDim == 0 ? range(0,imageDim/2) : 0;
        currentBeginStretchX = currentBeginTargetX + curStretchAdjust;
        currentBeginStretchY = currentBeginTargetY + curStretch;
        currentEndTargetX = rnd() < 0.5 ? range(0,imageDim) : rangeFloor(0,2) * imageDim;
        currentEndTargetY = currentEndTargetX % imageDim == 0 ? range(imageDim/2, imageDim) : imageDim;
        currentEndStretchX = currentEndTargetX - curStretchAdjust;
        currentEndStretchY = currentEndTargetY - curStretch;
        strokeWeight(curBGWeaveWidth);
        stroke(curBGWeaveColor);
        fastBezier( // wide: mapped onto the full canvas
          bx(currentBeginTargetX), by(currentBeginTargetY),
          bx(currentBeginStretchX), by(currentBeginStretchY),
          bx(currentEndStretchX), by(currentEndStretchY),
          bx(currentEndTargetX), by(currentEndTargetY)
        );
      }
      break;
    
    case 6: // circles behind faces, LOUDISH
      if (backgroundLightnessStyle == 0 || backgroundLightnessStyle == 1 || (faceLines && !sparse)) {
        bgAlphaMax = 0.05;
        bgStrokeDensity = rangeFloor(50, 200);
        saturationMultiplier = 0.5;        
      } else {
        bgAlphaMax = range(0.15, 0.3);
        bgStrokeDensity = rangeFloor(50, 100);
        saturationMultiplier = 1;  
      }
      colorMode(HSL);
      bgPlusMinus2 = rangeFloor(-1,2);
      backgroundColor1 = color(hue(backgroundColor1) + (bgPlusMinus2 * generateUnlabeledVariable(0,180,5) * !monochromatic), saturation(backgroundColor1) * saturationMultiplier, bgBrightness);
      backgroundColor2 = color(hue(backgroundColor2) + (bgPlusMinus2 * generateUnlabeledVariable(0,180,5) * !monochromatic), saturation(backgroundColor2) * saturationMultiplier, bgBrightness);
      colorMode(HSB);
      setGradient(bgX0, bgY0, width, height, backgroundColor2, backgroundColor1, "Y", range(1,3));
      for (let j = 0; j < bgStrokeDensity; j++) {
        bgPlusMinus2 = (rangeFloor(0,2) * 2) - 1;
        let curAlpha = generateUnlabeledVariable(0.0, bgAlphaMax, 2);
        colorMode(HSL);
        let curBGWeaveColor = color(hue(bgStrokeColor) + (bgPlusMinus2 * generateUnlabeledVariable(0, 20, 2.5) * 8 * !monochromatic), saturation(bgStrokeColor) * 1, range(50,95), curAlpha);
        colorMode(HSB);
        noStroke();
        let circleWidth = imageDim * 0.05 * generateUnlabeledVariable(3, 16, 2);
        fill(curBGWeaveColor);
        ellipseMode(CENTER);
        circle(bx((imageDim * 0.5) + (bgPlusMinus2 * generateUnlabeledVariable(0, imageDim * 0.5, 1))), by((imageDim * 0.55) + (bgPlusMinus2 * generateUnlabeledVariable(0, imageDim * 0.45, 3))), circleWidth); // wide: mapped
      }        
      break;
    
    default: // ????
      break;
  }
  bgCache.end([backgroundColor1, backgroundColor2]);
  } else {
    // later code uses the background colors as some styles adjusted them
    backgroundColor1 = bgCache.colors[0];
    backgroundColor2 = bgCache.colors[1];
  }
  bgCache.paint();

      
  // ------ Draw Foreground Content ------

  // wide: how far the face lines reach along their axis (screen x, or screen y in rotated frames),
  // and how far spread pushes the faces apart along it.
  const sideExtA = rotate90 ? regY : regX;
  const sideExtB = rotate90 ? (height - imageDim - regY) : (width - imageDim - regX);
  const lineMin = (-sideExtA) || 0;
  const lineMax = imageDim + sideExtB;
  const spreadPx = wideSpread * Math.min(sideExtA, sideExtB);
  
    angleMode(DEGREES);
  
  if (rotate90) {
    translate(imageDim, 0);
    rotate(90);
  }
  
  // if weaving lines, draw the foreground in 2 passes so that the accent lines can weave randomly in between the lines

  let weaveColor;
  let desaturatedBrightness = generateUnlabeledVariable(0, 8, 1);  
  let desaturatedBrightnessVariation = rangeFloor(0, 12);
  let passes = drawHair + 1; // 2 passes if drawHair is true, 1 if not
  let swapped = rnd() < 0.5; // determines whether connecting lines start from left or right
  let knotOffsets = [];
  for (let curKnot = 0; curKnot < numKnots; curKnot++) {
    knotOffsets.push(range(-(attachedDistanceMin - faceDistance), attachedDistanceMin - faceDistance) * imageDim * 1.5); // each knot will be located somewhere random between the two faces
  }


  // wide: extra hair strands beyond the square, so the hair runs all the way to the screen edges
  // behind each head. Real strands are one per face row (a row's height becomes its strand's x), so
  // the extras continue that spacing outward with the same shapes, sweep and hair style. They use
  // their own random stream, so the original's random choices (and the square window) are untouched,
  // and they layer the way the original's drawing order would continue: on the outer left, strands
  // go mostly under the face lines; on the outer right, mostly over.
  const extraHair = faceLines && drawHair;
  let hairSeed = (parseInt(tokenData.hash.slice(34, 42), 16) ^ (numLines * 7919)) || 1;
  const withHairRng = (fn) => { const saved = seed; seed = hairSeed; fn(); hairSeed = seed; seed = saved; };

  // An approximation of a row's connecting-line color (the real strands take theirs from their row).
  const extraWeaveBase = () => {
    switch (colorBlendStyle) {
      case 0: return lerpColor(leftBaseColor, rightBaseColor, 0.5);
      case 1: case 3: return leftBaseColor;
      case 2: case 4: return rightBaseColor;
      case 6: { const c = rnd() < 0.5 ? leftBaseColor : rightBaseColor; return color(hue(c), range(20, 50), brightness(c)); }
      default: { const c = rnd() < 0.5 ? leftBaseColor : rightBaseColor;
        return color(hue(c) + (rnd() < 0.5 ? -1 : 1) * range(3, 18) * !monochromatic, saturation(c), brightness(c)); }
    }
  };

  // Same as the strand code in the row loop below, for a strand at strip position stripY.
  const drawExtraStrand = (stripY, isLeft) => {
    colorMode(HSB);
    const wc = extraWeaveBase();
    const curAlpha = generateUnlabeledVariable(0.4, 1.0, 1); // hair never appears with blend style 7
    const curWeaveColor = color(hue(wc) + (range(-hueDifference, hueDifference) * !monochromatic), saturation(wc), brightness(wc), curAlpha);
    const curShadowColor = color(hue(shadowColor), saturation(shadowColor), brightness(shadowColor), alpha(shadowColor) * curAlpha);
    const curWeaveWidth = imageDim * (weaveWidth + ((weaveWidth) * range(-0.40 * weaveVariation, 3 * weaveVariation)));
    const curSideX = Math.round(stripY + (spacing / 4));
    let bTX, bTY, bSX, bSY, eSX, eSY, eTX, eTY;
    if (isLeft) {
      const top = range(leftHairChaos * spacing * leftHairStretchAdjust, spacing * leftHairStretchAdjust);
      const bottom = range(-spacing * leftHairStretchAdjust, leftHairChaos * spacing * leftHairStretchAdjust);
      bTX = curSideX - (imageDim * 0.10);
      bTY = -imageDim * 0.02;
      bSX = curSideX + top - (imageDim * 0.10);
      bSY = leftHairLength * imageDim * 0.25 - (imageDim * 0.001);
      eSX = curSideX + bottom - (leftHairSweep * imageDim) - (imageDim * 0.10);
      eSY = leftHairLength * imageDim * 0.75;
      eTX = curSideX - (leftHairSweep * imageDim) - (imageDim * 0.10);
      eTY = leftHairLength * imageDim + range(leftHairLength * leftHairChaos * -0.15 * imageDim, leftHairLength * 0.15 * imageDim);
    } else {
      const top = range(-spacing * rightHairStretchAdjust, rightHairChaos * spacing * rightHairStretchAdjust);
      const bottom = range(rightHairChaos * spacing * rightHairStretchAdjust, spacing * rightHairStretchAdjust);
      bTX = curSideX + (imageDim * 0.10);
      bTY = -imageDim * 0.02;
      bSX = curSideX + top + (imageDim * 0.10);
      bSY = rightHairLength * imageDim * 0.25 - (imageDim * 0.001);
      eSX = curSideX + bottom + (rightHairSweep * imageDim) + (imageDim * 0.10);
      eSY = rightHairLength * imageDim * 0.75;
      eTX = curSideX + (rightHairSweep * imageDim) + (imageDim * 0.10);
      eTY = rightHairLength * imageDim + range(rightHairLength * rightHairChaos * -0.15 * imageDim, rightHairLength * 0.15 * imageDim);
    }
    const shift = isLeft ? -spreadPx : spreadPx;
    bTX += shift; bSX += shift; eSX += shift; eTX += shift;

    const ctx = drawingContext;
    ctx.save();
    strokeWeight(curWeaveWidth);
    stroke(curShadowColor);
    strokeCap(SQUARE);
    noFill();
    if ((isLeft && leftFlipped) || (!isLeft && rightFlipped)) applyMatrix(1, 0, 0, -1, 0, imageDim);
    fastBezier(bTX + (spacing / 16), bTY, bSX + (spacing / 16), bSY, eSX + (spacing / 16), eSY, eTX + (spacing / 16), eTY);
    stroke(curWeaveColor);
    fastBezier(bTX, bTY, bSX, bSY, eSX, eSY, eTX, eTY);
    ctx.restore();
    _renderer._cachedStrokeStyle = undefined; // p5's style cache described the state before restore()
    _renderer._cachedFillStyle = undefined;
  };

  // Strip positions continue the real rows' spacing: row i sits at i * spacing + spacing * 0.125.
  // Row index parity decides the pass, as in the loop below.
  const extraLeft = (pass) => {
    if (!extraHair || !drawLeftHair || sideExtA <= 0) return;
    for (let k = 1; ; k++) {
      const stripY = (-k * spacing) + (spacing * 0.125);
      if (stripY + (spacing / 4) - spreadPx < lineMin) break;
      if ((((-k) % passes) + passes) % passes === pass) drawExtraStrand(stripY, true);
    }
  };
  const extraRight = (pass) => {
    if (!extraHair || !drawRightHair || sideExtB <= 0) return;
    for (let i = numLines; ; i++) {
      const stripY = (i * spacing) + (spacing * 0.125);
      if (stripY + (spacing / 4) + spreadPx > lineMax) break;
      if (i % passes === pass) drawExtraStrand(stripY, false);
    }
  };

  noFill();
  

  for (let currentPass = 0; currentPass < passes; currentPass++) {
    withHairRng(() => extraLeft(currentPass)); // wide: outer-left strands, before this pass's rows

    // draw each face's set of components (faceLines, connectLines, weaveLines, and their shadows)
    // if drawing weaveLines, do it in 2 passes: first evens then odds. 
    for (let i = currentPass; i < numLines; i+= passes) {
      let curIndex;
      let leftFaceX;
      let leftFaceY;
      let rightFaceY;
      let rightFaceX;
      let stretch1;
      let leftColor;
      let rightColor;
      let curColor;
      let leftEdgeColor;
      let rightEdgeColor;
      let connectColor;
      let greenAdjust;
      let blueAdjust;
      let redAdjust;
      
      curIndexLeft = Math.round(i / numLines * leftArray.length);
      curIndexRight = Math.round(endYArray[i] / numLines * leftArray.length);
     
      //leftFaceY = (spacing / 2) + (i * spacing);            
      //rightFaceY = (endYArray[i] * spacing);
      if (!swapped) {
        leftFaceY = (i * spacing) + (spacing * 0.125);            
        rightFaceY = (endYArray[i] * spacing) + (spacing * 0.625);
        leftFaceX = startX + (leftArray[curIndexLeft] * faceDepthMultiplier) + (leftShear * i); 
        rightFaceX = Math.round(imageDim - startX - (rightArray[curIndexRight] * faceDepthMultiplier) + (rightShear * endYArray[i]));
      } else {
        leftFaceY = (endYArray[i] * spacing) + (spacing * 0.125);            
        rightFaceY = (i * spacing) + (spacing * 0.625);
        leftFaceX = startX + (leftArray[curIndexRight] * faceDepthMultiplier) + (leftShear * endYArray[i]); 
        rightFaceX = Math.round(imageDim - startX - (rightArray[curIndexLeft] * faceDepthMultiplier) + (rightShear * i));
     }     
      leftFaceX -= spreadPx;  // wide
      rightFaceX += spreadPx; // wide
      
      stretch1 = (rightFaceX - leftFaceX) * stretchFactor;

      leftColor = color(leftHue, lineSaturation, lineBrightness);
      rightColor = color(rightHue, lineSaturation, lineBrightness);

      greenAdjust = range(-colorAdjustFactor * 0.5, colorAdjustFactor) * !monochromatic;
      blueAdjust = range(-colorAdjustFactor, colorAdjustFactor * 1.8) * !monochromatic;
      redAdjust = range(-colorAdjustFactor * 0.5, colorAdjustFactor) * !monochromatic;
  
      colorMode(HSB);
      
      leftColor.setGreen(green(leftColor) + greenAdjust);
      leftColor.setBlue(blue(leftColor) + blueAdjust);
      leftColor.setRed(red(leftColor) + redAdjust);
      rightColor.setGreen(green(rightColor) + greenAdjust);
      rightColor.setBlue(blue(rightColor) + blueAdjust);
      rightColor.setRed(red(rightColor) + redAdjust);      

      switch(colorBlendStyle) {
        case 0: // 2 edge colors and connector is midpoint color
          connectColor = lerpColor(leftBaseColor, rightBaseColor, 0.5);
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break;
        case 1: // left edge color overpowers connect color
          connectColor = leftColor;
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break;
        case 2: // right edge color overpowers connect color
          connectColor = rightColor;
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break;
        case 3: // both edges are the same color (left)
          connectColor = leftColor;
          leftEdgeColor = leftColor;
          rightEdgeColor = leftColor;
          break;
        case 4: // both edges are the same color (right)
          connectColor = rightColor;
          leftEdgeColor = rightColor;
          rightEdgeColor = rightColor;
          break;
        case 5: // each row is one solid color (mix of left and right)
          leftColor = color(hue(leftColor) + ((rnd() < 0.5 ? -1 : 1)) * (generateUnlabeledVariable(3, 18, 1) * !monochromatic), saturation(leftColor), brightness(leftColor));
          rightColor = color(hue(rightColor) + ((rnd() < 0.5 ? -1 : 1)) * (generateUnlabeledVariable(3, 18, 1) * !monochromatic), saturation(rightColor), brightness(rightColor));
          connectColor = (rnd() < 0.5 ? leftColor : rightColor);
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break;   
          
        case 6: // Varied row colors
          leftColor = color(hue(leftColor) + ((rnd() < 0.5 ? -1 : 1)) * (generateUnlabeledVariable(3, 6, 1) * !monochromatic), saturation(leftColor) + rangeFloor(-30,-40), brightness(leftColor));
          rightColor = color(hue(rightColor) + ((rnd() < 0.5 ? -1 : 1)) * (generateUnlabeledVariable(3, 6, 1) * !monochromatic), range(20, 50), brightness(rightColor));          
          connectColor = (rnd() < 0.5 ? leftColor : rightColor);
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break; 
          
        case 7: // Very Dark / black
          leftColor = color(hue(leftColor), rangeFloor(0, 100) * !monochromatic, desaturatedBrightness + rangeFloor(-desaturatedBrightnessVariation, desaturatedBrightnessVariation));
          rightColor = color(hue(rightColor), rangeFloor(0, 100) * !monochromatic, desaturatedBrightness + rangeFloor(-desaturatedBrightnessVariation, desaturatedBrightnessVariation));
         
          connectColor = leftColor;
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break;
          
        case 8: // Very Light / white
          leftColor = color(hue(leftColor), rangeFloor(50, 100)  * !monochromatic, 100 + rangeFloor(-desaturatedBrightnessVariation, desaturatedBrightnessVariation));
          rightColor = color(hue(rightColor), rangeFloor(50, 100) * !monochromatic, 100 + rangeFloor(-desaturatedBrightnessVariation, desaturatedBrightnessVariation));   
          
          colorMode(HSL);
          leftColor = color(hue(leftColor), saturation(leftColor), 100 - (rangeFloor(0, desaturatedBrightness)));
          rightColor = color(hue(rightColor), saturation(rightColor), 100 - (rangeFloor(0, desaturatedBrightness)));         
          connectColor = leftColor;
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          colorMode(HSB);
          break; 
          
        default:
          connectColor = lerpColor(leftColor, rightColor, 0.5);
          leftEdgeColor = leftColor;
          rightEdgeColor = rightColor;
          break;        
      }

      if (!faceLines) {
        leftColor = color(hue(leftColor) + ((rnd() < 0.5 ? -1 : 1)) * rangeFloor(3, 7), saturation(leftColor) + rangeFloor(-30,-40) * !monochromatic, brightness(leftColor));
        rightColor = color(hue(rightColor) + ((rnd() < 0.5 ? -1 : 1)) * rangeFloor(3, 7), range(20, 50)  * !monochromatic, brightness(rightColor));          
        connectColor = rnd() < 0.5 ? color(hue(connectColor) + (range(-180 * connectLineColorVariation, 180 * connectLineColorVariation)), saturation(connectColor) * !monochromatic, brightness(connectColor)) : (rnd() < 0.5 ? leftColor : rightColor);
      }
      
      
      let connectWeight = imageDim * 0.0015;
      colorMode(RGB);      
      leftEdgeColor = lerpColor(backgroundColor1, leftEdgeColor, edgeBoldness);
      rightEdgeColor = lerpColor(backgroundColor1, rightEdgeColor, edgeBoldness);
      colorMode(HSB);
      weaveColor = connectColor;      
      stroke(connectColor);
      strokeWeight(connectWeight);
      noFill();

      let percentFromMiddle = Math.abs(numLines / 2 - i) / (numLines / 2);      
      if (attached || percentFromMiddle < attachmentMultiplier || !faceLines) { 
        if (numKnots == 0) { // connect lines directly to other face 
          
          let currentRightTargetX = rightFaceX + (connectWeight * 1.5);
          let currentLeftTargetX = leftFaceX - (connectWeight * 1.5);
          let currentRightTargetY = rightFaceY;
          let currentLeftTargetY = leftFaceY;
          
          // draw shadow
          stroke(shadowColorLighter);
          strokeWeight(connectWeight * 1.5);
          fastBezier(
            currentLeftTargetX,
            currentLeftTargetY + connectWeight,
            currentLeftTargetX + stretch1,
            currentLeftTargetY + connectWeight,
            currentRightTargetX - stretch1,
            currentRightTargetY + connectWeight,
            currentRightTargetX,
            currentRightTargetY + connectWeight
          );
          
          // draw connecting line
          stroke(connectColor);
          strokeWeight(connectWeight);
          fastBezier(
            currentLeftTargetX,
            currentLeftTargetY,
            currentLeftTargetX + stretch1,
            currentLeftTargetY,
            currentRightTargetX - stretch1,
            currentRightTargetY,
            currentRightTargetX,
            currentRightTargetY
          );          
          
        } else { // draw connecting lines in the form of a knot
          let targetAssetNum = rangeFloor(1, numKnots + 1);
          let targetLineNum = Math.round(targetAssetNum * (numLines / (numKnots + 1)));
          let targetLeftX = startX + (leftArray[targetLineNum] * faceDepthMultiplier) + (leftShear * targetLineNum);
          let targetRightX = Math.round(imageDim - startX - (rightArray[targetLineNum] * faceDepthMultiplier) + (rightShear * targetLineNum));
          targetLeftX -= spreadPx;  // wide
          targetRightX += spreadPx; // wide
          let stretch2 = ((targetRightX - targetLeftX) * 0.1 * stretchFactor) * range(1 - (rowEntropy * 0.2), 1 + (rowEntropy * 0.2));
          let targetX = ((targetLeftX + targetRightX) / 2) + (range(-stretch2, stretch2) * rowEntropy * 0.3) + knotOffsets[targetAssetNum - 1];      
          let targetY = (imageDim / (numKnots + 1)) * targetAssetNum;

          // draw connecting line shadow
          stroke(shadowColorLighter);
          strokeWeight(connectWeight * 1.5);
          
          fastKnot( // opt: was beginShape/vertex/bezierVertex/endShape
            leftFaceX - (connectWeight * 1.5), leftFaceY + connectWeight,
            targetX + stretch2, leftFaceY + connectWeight, targetX + stretch2, targetY - (stretch2 * (leftFaceY / imageDim / 2)) + connectWeight, targetX, targetY + connectWeight,
            targetX - stretch2, targetY + (stretch2 * (leftFaceY / imageDim / 2)) + connectWeight,  targetX - stretch2, rightFaceY + connectWeight, rightFaceX, rightFaceY + connectWeight,
            rightFaceX + (connectWeight * 1.5), rightFaceY + connectWeight);
                    
          // draw connecting line
          stroke(connectColor);
          strokeWeight(connectWeight);
          fastKnot( // opt: was beginShape/vertex/bezierVertex/endShape
            leftFaceX - (connectWeight * 1.5), leftFaceY,
            targetX + stretch2, leftFaceY, targetX + stretch2, targetY - (stretch2 * (leftFaceY / imageDim / 2)), targetX, targetY,
            targetX - stretch2, targetY + (stretch2 * (leftFaceY / imageDim / 2)),  targetX - stretch2, rightFaceY, rightFaceX, rightFaceY,
            rightFaceX + (connectWeight * 1.5), rightFaceY);
        }
      }    

      stroke(connectColor);

      // draw triangles or circles on ends of lines       
      if (faceLines) {   
       
        // triangle shadow
        let shadowTriangleLeftY = leftFaceY + (spacing/4);
        let shadowTrianglerightY = rightFaceY + (spacing/4);        
        noStroke();
        fill(shadowColor);
        fastTriangle(leftFaceX, leftFaceY, leftFaceX - (spacing * 0.75), leftFaceY, leftFaceX - (spacing * 0.75), leftFaceY + (spacing * 0.5));
        fastTriangle(rightFaceX, rightFaceY, rightFaceX + (spacing * 0.75), rightFaceY, rightFaceX + (spacing * 0.75), rightFaceY + (spacing * 0.5));
        
        // triangle
        fill(connectColor);
        fastTriangle(leftFaceX, leftFaceY, leftFaceX - (spacing * 0.75), leftFaceY - (spacing * 0.25), leftFaceX - (spacing * 0.75), leftFaceY + (spacing * 0.25));
        fastTriangle(rightFaceX, rightFaceY, rightFaceX + (spacing * 0.75), rightFaceY - (spacing * 0.25), rightFaceX + (spacing * 0.75), rightFaceY + (spacing * 0.25));
        
      } else {
        // circle shadow
        noStroke();
        fill(shadowColor);
        circle(leftFaceX, leftFaceY + (spacing * 0.125), spacing * 0.375);
        circle(rightFaceX, rightFaceY + (spacing * 0.125), spacing * 0.375);

        // circle
        fill(connectColor);
        circle(leftFaceX, leftFaceY, spacing * 0.375);
        circle(rightFaceX, rightFaceY, spacing * 0.375);
      }


      // draw all faceLines (and weaveLines where needed)
      if (faceLines) {
        
        let stretch3 = (rightFaceX - leftFaceX) * stretchFactor;

        
        // draw left face shadow
        fill(shadowColor);
        noStroke();
        fastRect(lineMin, leftFaceY - (spacing * 0.25), leftFaceX - (spacing * 0.75) - lineMin, spacing * 0.75); // wide: to the edge
        noFill();
        stroke(connectColor);

        
        // draw left face lines
        gradientLine(drawingContext, Math.round(leftFaceX - (spacing * 13/16)), leftFaceY, lineMin, leftFaceY, connectColor, leftEdgeColor, spacing/2); // wide: to the edge

        
        // Draw weave line if it would overlap with a face and meets density probability        
        let targetLeftHairX = startX + (leftArray[0 + (leftFlipped * (leftArray.length - 1))] * faceDepthMultiplier) + (imageDim * 0.15);
        let targetRightHairX = imageDim - startX - (rightArray[0 + (rightFlipped * (leftArray.length - 1))] * faceDepthMultiplier) - (imageDim * 0.15);
        
        
        let drawingLeftHair = leftFaceY < imageDim / 2;
        if (drawHair && (rnd() < weaveDensity) && ((leftFaceY < targetLeftHairX && drawLeftHair)  || (leftFaceY > targetRightHairX && drawRightHair))) {
          
          // variables needed to define location of current weaveLine bezier curve
          let currentBeginTargetX;
          let currentBeginTargetY;
          let currentBeginStretchX;
          let currentBeginStretchY;
          let currentEndTargetX;
          let currentEndTargetY;
          let currentEndStretchX;
          let currentEndStretchY;
          let curTopStretchAdjust;
          let curBottomStretchAdjust;
          
          // variables needed to define color / width of current weaveLine

          let curAlpha = (colorBlendStyle == 7) ? 1 : generateUnlabeledVariable(0.4,1.0,1); //if dark lines, make hair opaque      
          //let curWeaveColor = color(hue(weaveColor) + (range(-25,25) * !monochromatic), saturation(weaveColor) * 1, brightness(weaveColor) * 1, curAlpha);
          let curWeaveColor = color(hue(weaveColor) + (range(-hueDifference,hueDifference) * !monochromatic), saturation(weaveColor) * 1, brightness(weaveColor) * 1, curAlpha);
          let curShadowColor = color(hue(shadowColor), saturation(shadowColor), brightness(shadowColor), alpha(shadowColor) * curAlpha);
          let curWeaveWidth = imageDim * (weaveWidth + ((weaveWidth) * range(-0.40 * weaveVariation, 3 * weaveVariation)));

          // variables needed to calculate points for the current weaveLine bezier curve
          let curSideX = Math.round(leftFaceY + (spacing/4));
          let leftFlipYStart = leftFlipped ? imageDim : 0;
          let rightFlipYStart = rightFlipped ? imageDim : 0;
          let leftFlipModifier = (leftFlipped * -2) + 1; // negative 
          
          if (drawingLeftHair) {
              curTopStretchAdjust = range(leftHairChaos * spacing * leftHairStretchAdjust, spacing * leftHairStretchAdjust);
              curBottomStretchAdjust = range(-spacing * leftHairStretchAdjust, leftHairChaos * spacing * leftHairStretchAdjust);
              currentBeginTargetX = curSideX - (imageDim * 0.10);
              currentBeginTargetY = -imageDim * 0.02;
              currentBeginStretchX = curSideX + curTopStretchAdjust - (imageDim * 0.10);
              currentBeginStretchY = leftHairLength * imageDim * 0.25 - (imageDim * 0.001);
              currentEndStretchX = curSideX + curBottomStretchAdjust - (leftHairSweep * imageDim) - (imageDim * 0.10);
              currentEndStretchY = leftHairLength * imageDim * 0.75;
              currentEndTargetX = curSideX - (leftHairSweep * imageDim) - (imageDim * 0.10);
              currentEndTargetY = leftHairLength * imageDim + range(leftHairLength * leftHairChaos * -0.15 * imageDim, leftHairLength * 0.15 * imageDim);
           } else {
              curTopStretchAdjust = range(-spacing * rightHairStretchAdjust, rightHairChaos * spacing * rightHairStretchAdjust);
              curBottomStretchAdjust = range(rightHairChaos * spacing * rightHairStretchAdjust, spacing * rightHairStretchAdjust);
              currentBeginTargetX = curSideX + (imageDim * 0.10);
              currentBeginTargetY = -imageDim * 0.02;
              currentBeginStretchX = curSideX + curTopStretchAdjust + (imageDim * 0.10);
              currentBeginStretchY = rightHairLength * imageDim * 0.25 - (imageDim * 0.001);
              currentEndStretchX = curSideX + curBottomStretchAdjust + (rightHairSweep * imageDim) + (imageDim * 0.10);
              currentEndStretchY = rightHairLength * imageDim * 0.75;
              currentEndTargetX = curSideX + (rightHairSweep * imageDim) + (imageDim * 0.10);
              currentEndTargetY = rightHairLength * imageDim + range(rightHairLength * rightHairChaos * -0.15 * imageDim, rightHairLength * 0.15 * imageDim);
          }
          const hairShift = drawingLeftHair ? -spreadPx : spreadPx; // wide: hair moves with its face
          currentBeginTargetX += hairShift;
          currentBeginStretchX += hairShift;
          currentEndStretchX += hairShift;
          currentEndTargetX += hairShift;
          
          strokeWeight(curWeaveWidth);
          stroke(curShadowColor);
          strokeCap(SQUARE);
          noFill();
          
          if ((drawingLeftHair && leftFlipped) || (!drawingLeftHair && rightFlipped)) {
            applyMatrix(1, 0, 0, -1, 0, imageDim);
            //translate(0, imageDim);            
          } 
           
          // Draw weave shadow
          fastBezier(
            currentBeginTargetX + (spacing / 16),
            currentBeginTargetY,
            currentBeginStretchX + (spacing / 16),
            currentBeginStretchY,
            currentEndStretchX + (spacing / 16),
            currentEndStretchY,
            currentEndTargetX + (spacing / 16),
            currentEndTargetY
          );

          // Draw weaveLine
          stroke(curWeaveColor);
          fastBezier(
            currentBeginTargetX,
            currentBeginTargetY,
            currentBeginStretchX,
            currentBeginStretchY,
            currentEndStretchX,
            currentEndStretchY,
            currentEndTargetX,
            currentEndTargetY
          );
          
          if ((drawingLeftHair && leftFlipped) || (!drawingLeftHair && rightFlipped)) {
            resetMatrix();
            translate(regX, regY); // wide: restore the stage offset
            if (rotate90) {
              translate(imageDim, 0);
              rotate(90);
            }
          } 
                 
        }         

        // Draw right face shadow
        fill(shadowColor);
        noStroke();
        fastRect(rightFaceX + (spacing * 0.75), rightFaceY - (spacing * 0.25), lineMax, spacing * 0.75); // wide: to the edge
        noFill();
        stroke(connectColor);

        // Draw right face line
        gradientLine(drawingContext, Math.round(rightFaceX + (spacing * 13/16)), rightFaceY, lineMax, rightFaceY, connectColor, leftEdgeColor, spacing/2); // wide: to the edge

           
      }
    }    
    withHairRng(() => extraRight(currentPass)); // wide: outer-right strands, after this pass's rows
  }
  
  pop();
}
// -----------------------------------------------------------------------------------------------------





// -----------------------------------------------------------------------------------------------------
/*
  Project-specific helper functions
*/

function setGradient(x, y, w, h, c1, c2, axis, power) {
  noFill();
  strokeWeight(1.5);
  colorMode(RGB);
  if (axis == "Y") { // Top to bottom gradient
    // opt: same result as lerpColor + stroke + line per row, but the color math is done inline with
    // p5's exact arithmetic, and the color string is only rebuilt when the rounded color changes.
    const r = _renderer;
    const ctx = r.drawingContext;
    r._setProperty('_strokeSet', true); // what stroke() sets on every call
    r._setProperty('_doStroke', true);
    const L1 = c1.levels, L2 = c2.levels;
    const f0 = L1[0] / 255, f1 = L1[1] / 255, f2 = L1[2] / 255, f3 = L1[3] / 255;
    const t0 = L2[0] / 255, t1 = L2[1] / 255, t2 = L2[2] / 255, t3 = L2[3] / 255;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    let p0 = -1, p1 = -1, p2 = -1, pA = -1, str = '';
    for (let i = y; i <= y + h; i++) {
      var inter = (i - y) / (y + h - y) * (1 - 0) + 0; // p5 map()
      let amt = Math.pow(inter, power);
      amt = Math.max(Math.min(amt, 1), 0); // lerpColor's clamp
      // lerpColor in RGB mode, then color() and its rounding to 0..255 levels
      const a0 = clamp01((amt * (t0 - f0) + f0) * 255 / 255);
      const a1 = clamp01((amt * (t1 - f1) + f1) * 255 / 255);
      const a2 = clamp01((amt * (t2 - f2) + f2) * 255 / 255);
      const aA = clamp01((amt * (t3 - f3) + f3) * 255 / 255);
      const v0 = Math.round(a0 * 255), v1 = Math.round(a1 * 255), v2 = Math.round(a2 * 255);
      if (v0 !== p0 || v1 !== p1 || v2 !== p2 || aA !== pA) {
        str = 'rgba(' + v0 + ',' + v1 + ',' + v2 + ',' + aA + ')'; // p5 Color.toString()
        p0 = v0; p1 = v1; p2 = v2; pA = aA;
      }
      if (str !== r._cachedStrokeStyle) { // p5 _setStroke() only sets a changed style
        ctx.strokeStyle = str;
        r._cachedStrokeStyle = str;
      }
      if (str === STYLE_EMPTY) continue; // p5 line() skips fully transparent black
      ctx.beginPath();
      ctx.moveTo(x, i);
      ctx.lineTo(x + w, i);
      ctx.stroke();
    }
  } else if (axis == "Xlr") { // Left to right gradient
    for (let j = x; j <= x + w; j++) {
      var inter2 = map(j, x, x + w, 0, 1);
      var d = lerpColor(c1, c2, Math.pow(inter2, power));
      //var d = lerpColor(c1, c2, inter2);
      stroke(d);
      line(j, y, j, y + h);
    }
  } else if (axis == "Xrl") { // Right to left gradient
    for (let k = x; k >= x - w; k--) {
      var inter3 = map(k, x, x - w, 0, 1);
      var d = lerpColor(c1, c2, Math.pow(inter3, power));
      //var d = lerpColor(c1, c2, inter3);
      stroke(d);
      line(k, y, k, y + h);
    }
  }
  colorMode(HSB);
}


// shuffle the items in an array based on the amount of entropy. 0 = no shuffle, 1 = completely shuffled
function shuffleArrayEntropy(array, entropy) {
  for (let i = 0; i < array.length; i++) {
    let minIndex = i - Math.round(i * entropy);
    let maxIndex = i + Math.round((array.length - 1 - i) * entropy);
    const j = Math.round(range(minIndex, maxIndex));
    [array[i], array[j]] = [array[j], array[i]];

  }
}

// -----------------------------------------------------------------------------------------------------





// -----------------------------------------------------------------------------------------------------
/*
  General helper functions
*/

function rnd () {
  seed ^= seed << 13
  seed ^= seed >> 17
  seed ^= seed << 5
  
  let result = (((seed < 0) ? ~seed + 1 : seed) % 1000) / 1000
  return result
}

function range (min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }

  return rnd() * (max - min) + min;
}

function rangeFloor (min, max) {
  if (max === undefined) {
    max = min
    min = 0
  }


  return Math.floor(range(min, max))
}
// -----------------------------------------------------------------------------------------------------



// -----------------------------------------------------------------------------------------------------
/*
  Port additions: choosing an audio source, and resizing with the window.
  live: sources are now the song file (as in 003), the laptop's own audio, or any audio input.
*/

// live: the laptop-audio and microphone streams. Each one runs through a gain node (the
// sensitivity control) into the same FFT the original used. Nothing is sent to the speakers,
// so there's no echo.
const liveInput = (() => {
  const SENS_MIN = 0.01, SENS_MAX = 40;
  const START_GAIN = { laptop: 1, mic: 2 }; // starting points; auto-level takes it from there
  const TARGET_BASS = 0.68;  // typical bass level of the original song as the sketch heard it
  const DB_PER_UNIT = 0.086; // FFT energy rises about 0.086 for each doubling of gain
  let auto = true;
  let gainValue = 0.2;
  let avgBass = null;
  let heard = 0;             // frames of sound since the last silence
  let quiet = 0;             // frames of silence in a row
  let settle = 0;            // frames left in the fast "settling in" phase
  let presence = null;       // analyser before the gain, to tell music from silence
  let presenceBuf = null;
  let uiTick = 0;

  const ui = {};
  const toSlider = (g) => Math.round(100 * Math.log(g / SENS_MIN) / Math.log(SENS_MAX / SENS_MIN));
  const fromSlider = (v) => SENS_MIN * Math.pow(SENS_MAX / SENS_MIN, v / 100);

  function setGain(g) {
    gainValue = Math.min(SENS_MAX, Math.max(SENS_MIN, g));
    if (live) live.gain.gain.setTargetAtTime(gainValue, live.gain.context.currentTime, 0.05);
  }

  function refreshUi() {
    if (!ui.sens) return;
    ui.sens.value = toSlider(gainValue);
    ui.sensValue.textContent = '×' + gainValue.toFixed(2);
    ui.auto.checked = auto;
  }

  function stop() {
    if (!live) return;
    live.stream.getTracks().forEach((t) => t.stop());
    live.source.disconnect();
    live.gain.disconnect();
    live = null;
    liveOn = false;
    fft.setInput(); // back to the main output, which is how the song file is analysed
  }

  function start(stream, kind) {
    const ac = getAudioContext();
    const source = ac.createMediaStreamSource(stream);
    const gain = ac.createGain();
    presence = ac.createAnalyser();
    presence.fftSize = 512;
    presenceBuf = new Float32Array(presence.fftSize);
    source.connect(presence);
    source.connect(gain);
    fft.setInput(gain);
    live = { kind, stream, source, gain };
    liveOn = true;
    avgBass = null;
    heard = 0;
    settle = 300;
    setGain(START_GAIN[kind]);
    refreshUi();
    // If the share is stopped from the browser's own "Stop sharing" bar, go back to the picker.
    stream.getTracks().forEach((t) => t.addEventListener('ended', () => {
      if (live && live.stream === stream) {
        stop();
        showPicker('The audio stopped. Pick a source to continue.');
      }
    }));
  }

  // Is anything actually playing? (about -55 dBFS or louder, before the gain)
  function hearingSomething() {
    if (!presence) return false;
    presence.getFloatTimeDomainData(presenceBuf);
    let sum = 0;
    for (let i = 0; i < presenceBuf.length; i++) sum += presenceBuf[i] * presenceBuf[i];
    return Math.sqrt(sum / presenceBuf.length) > 0.0018;
  }

  // Called every frame: nudge the gain so the music's bass sits where the original song's did.
  // It settles in quickly (up to ~50% per second) for the first 10 seconds after a source starts
  // or after 2+ seconds of silence (a new track), then drifts very slowly (~6% per second) so a
  // song's own quiet and loud sections still look quiet and loud. It holds steady once it's close
  // and ignores silence and the first half-second of sound.
  function autoLevel(bass) {
    if (!auto || !liveOn) return;
    if (!hearingSomething()) {
      heard = 0;
      if (++quiet > 60) settle = 300;
      return;
    }
    quiet = 0;
    if (++heard < 15) return;
    avgBass = avgBass === null ? bass : avgBass + (bass - avgBass) * 0.03;
    const doublings = (TARGET_BASS - avgBass) / DB_PER_UNIT; // how far off, in doublings of gain
    const rate = settle > 0 ? 0.02 : 0.003;
    if (settle > 0) settle--;
    if (Math.abs(doublings) > 0.2) {
      setGain(gainValue * Math.pow(2, Math.max(-1, Math.min(1, doublings)) * rate));
    }
    if (++uiTick % 8 === 0) refreshUi();
  }

  async function startLaptopAudio() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 1, width: 320 }, // Chrome needs a video track; it's kept tiny and unused
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      systemAudio: 'include',
      selfBrowserSurface: 'exclude',
    });
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('no-audio');
    }
    stop();
    start(stream, 'laptop');
  }

  async function startMic(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      },
    });
    stop();
    start(stream, 'mic');
    await listDevices(stream.getAudioTracks()[0].getSettings().deviceId);
  }

  // Device names are only available after the browser has granted microphone access.
  async function listDevices(currentId) {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput');
    ui.device.replaceChildren(...devices.map((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || `input ${i + 1}`;
      o.selected = d.deviceId === currentId;
      return o;
    }));
    ui.device.hidden = devices.length < 2;
  }

  function bindUi() {
    ui.sens = document.getElementById('live-sens');
    ui.sensValue = document.getElementById('live-sens-value');
    ui.auto = document.getElementById('live-auto');
    ui.device = document.getElementById('live-device');
    ui.sens.addEventListener('input', () => {
      auto = false; // moving the slider takes over from auto-level
      setGain(fromSlider(+ui.sens.value));
      refreshUi();
    });
    ui.auto.addEventListener('change', () => {
      auto = ui.auto.checked;
      avgBass = null;
      settle = 300;
      refreshUi();
    });
    ui.device.addEventListener('change', () => {
      startMic(ui.device.value).catch((e) => console.warn('could not switch input', e));
    });
    refreshUi();
  }

  return { startLaptopAudio, startMic, stop, autoLevel, bindUi, get kind() { return live && live.kind; } };
})();

let showPicker; // set up in setupSourcePicker()

function setupSourcePicker() {
  const picker = document.getElementById('picker');
  const note = document.getElementById('picker-note');
  const playLocal = document.getElementById('play-local');
  const fileInput = document.getElementById('file');
  const useLaptop = document.getElementById('use-laptop');
  const useMic = document.getElementById('use-mic');
  const panel = document.getElementById('live-panel');
  const sourceLabel = document.getElementById('live-source');

  // Taps on the picker and panel shouldn't also count as a tap on the sketch.
  picker.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.tagName === 'BUTTON') e.target.blur(); // so Space pauses instead of re-pressing it
  });

  const started = (label) => {
    picker.hidden = true;
    sourceLabel.textContent = label;
    panel.dataset.kind = liveInput.kind || 'song';
    panel.hidden = false;
    note.textContent = '';
  };

  showPicker = (message) => {
    picker.hidden = false;
    panel.hidden = true;
    note.textContent = message || '';
  };

  const stopSong = () => {
    if (sound) {
      sound.stop();
      sound = null;
      soundStarted = false;
    }
  };

  const startSong = (source, label) => {
    userStartAudio();
    liveInput.stop();
    stopSong();
    note.textContent = `loading ${label}...`;
    sound = loadSound(
      source,
      () => {
        sound.amp(0.2); // as in the original
        soundStarted = true;
        sound.loop();
        started(label);
      },
      () => { note.textContent = `couldn't load ${label}`; }
    );
  };

  // The song is only present where Phil has put his own copy in private/ (never published).
  fetch(LOCAL_SONG, { method: 'HEAD' })
    .then((r) => { if (r.ok) playLocal.hidden = false; })
    .catch(() => {});

  // Laptop audio needs screen-share audio, which Chrome and Edge on desktop support.
  if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) useLaptop.hidden = true;

  playLocal.addEventListener('click', () => startSong(LOCAL_SONG, 'Guys Eyes'));

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) startSong(f, f.name);
  });

  useLaptop.addEventListener('click', async () => {
    userStartAudio();
    note.textContent = 'In the share window, choose your entire screen and turn on "Share system audio".';
    try {
      await liveInput.startLaptopAudio();
      stopSong();
      started('laptop audio');
    } catch (e) {
      note.textContent = e && e.message === 'no-audio'
        ? 'No audio came through. Share your entire screen and turn on "Share system audio".'
        : 'Sharing was cancelled.';
    }
  });

  useMic.addEventListener('click', async () => {
    userStartAudio();
    note.textContent = 'starting microphone...';
    try {
      await liveInput.startMic();
      stopSong();
      started('audio input');
    } catch (e) {
      note.textContent = 'microphone access was blocked';
    }
  });

  document.getElementById('live-change').addEventListener('click', () => {
    liveInput.stop();
    stopSong();
    showPicker();
  });
  document.getElementById('live-full').addEventListener('click', toggleFullscreen);
  liveInput.bindUi();

  // wide: spread controls. Only shown when the window is wider than it is tall.
  const spread = document.getElementById('spread');
  const spreadMusic = document.getElementById('spread-music');
  spread.value = Math.round(spreadCtl.base * 100);
  spread.addEventListener('input', () => { spreadCtl.base = +spread.value / 100; });
  spreadMusic.addEventListener('change', () => {
    spreadCtl.music = spreadMusic.checked;
    spreadCtl.fast = spreadCtl.slow = null;
    if (spreadCtl.music && spreadCtl.base === 0) { // nothing to move with at 0, so open it up
      spreadCtl.base = 0.7;
      spread.value = 70;
    }
  });
  window.updateWideUi = () => {
    document.body.classList.toggle('not-wide', width <= height * 1.05);
  };
  updateWideUi();

  // live: fade the control panel when the mouse is idle, unless it's being used
  let idleTimer;
  const wake = () => {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!panel.matches(':hover') && !panel.contains(document.activeElement)) {
        document.body.classList.add('idle');
      }
    }, 3000);
  };
  for (const type of ['pointermove', 'pointerdown', 'keydown']) {
    window.addEventListener(type, wake, { passive: true });
  }
  wake();
}

// wide: low-res mode renders at standard resolution, for screens with display scaling
let lowRes = false;
function toggleLowRes() {
  lowRes = !lowRes;
  pixelDensity(lowRes ? 1 : Math.min(2, displayDensity()));
  background(255,127,127);
  document.getElementById('lowres-flag').hidden = !lowRes;
}

// live: performance controls
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

document.addEventListener('fullscreenchange', () => {
  // Going fullscreen hides every control for a clean show; H brings them back.
  document.body.classList.toggle('clean', !!document.fullscreenElement);
});

function keyPressed() {
  if (document.activeElement && document.activeElement.tagName === 'SELECT') return;
  const k = key.toLowerCase();
  if (k === 'f') toggleFullscreen();
  else if (k === 'h') document.body.classList.toggle('clean');
  else if (k === 'm') document.body.classList.toggle('no-meter');
  else if (k === 'p') toggleLowRes(); // wide
  else if (key === ' ') {
    if (sound || live) togglePause();
    return false; // keep Space from scrolling or pressing a focused button
  }
}

function windowResized() {
  dim = Math.min(windowWidth, windowHeight);
  resizeCanvas(windowWidth, windowHeight); // wide
  if (window.updateWideUi) updateWideUi();
  background(255,127,127);
}
// -----------------------------------------------------------------------------------------------------



// -----------------------------------------------------------------------------------------------------
/*
  fork: frame-rate readout. Shows frames per second over the last second, plus how long each
  frame's work takes (audio analysis + drawing). The page shows it only while animating, and
  refreshes the text four times a second so the readout itself costs next to nothing.
*/
const fpsMeter = (() => {
  const WINDOW_MS = 1000;
  const REFRESH_MS = 250;
  let el = null;
  let stamps = [];   // when each recent frame finished
  let works = [];    // how long each recent frame's work took, in ms
  let lastRefresh = 0;

  function ensureEl() {
    if (!el) {
      el = document.createElement('div');
      el.className = 'fps-meter';
      el.setAttribute('aria-live', 'off');
      document.body.appendChild(el);
    }
    return el;
  }

  function frame(workMs) {
    const now = performance.now();
    stamps.push(now);
    works.push(workMs);
    while (stamps.length && now - stamps[0] > WINDOW_MS) {
      stamps.shift();
      works.shift();
    }
    if (now - lastRefresh < REFRESH_MS || stamps.length < 2) return;
    lastRefresh = now;

    const fps = (stamps.length - 1) / ((stamps[stamps.length - 1] - stamps[0]) / 1000);
    const avg = works.reduce((a, b) => a + b, 0) / works.length;
    const peak = Math.max(...works);
    const target = 32; // the original's frameRate(32)

    const m = ensureEl();
    m.hidden = false;
    m.dataset.health = fps >= target * 0.9 ? 'good' : fps >= target * 0.6 ? 'ok' : 'slow';
    m.innerHTML =
      `<b>${fps.toFixed(1)}</b> fps <span>/ ${target} target</span><br>` +
      `draw ${avg.toFixed(1)} ms <span>avg</span> &middot; ${peak.toFixed(1)} ms <span>max</span>`;
  }

  function pause() {
    if (el) el.hidden = true;
    stamps = [];
    works = [];
  }

  return { frame, pause };
})();
// -----------------------------------------------------------------------------------------------------
