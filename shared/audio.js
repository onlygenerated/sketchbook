// Mic: a small Web Audio helper for audio-reactive sketches (no p5.sound needed).
//
//   await Mic.start();      // call from a tap or click; asks for microphone access
//   Mic.level();            // overall loudness, 0..1
//   Mic.bands(8);           // n log-spaced frequency bands, each 0..1 (bass first)
//   Mic.bass(), Mic.mid(), Mic.treble()
//   Mic.spectrum();         // raw Uint8Array of FFT bins, 0..255
//   Mic.waveform();         // raw Uint8Array of the time-domain signal, 128 = silence
//
// If the mic is unavailable or denied, Mic.startDemo() feeds synthetic data so
// the sketch still moves. Browsers only allow the mic over HTTPS or localhost.
(() => {
  let ctx = null;
  let analyser = null;
  let freq = null;
  let wave = null;
  let demo = false;
  let demoT = 0;

  const Mic = {
    started: false,
    demo: false,
    error: null,

    async start({ smoothing = 0.8, fftSize = 2048 } = {}) {
      if (Mic.started) return Mic;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume();
        analyser = ctx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothing;
        ctx.createMediaStreamSource(stream).connect(analyser);
        freq = new Uint8Array(analyser.frequencyBinCount);
        wave = new Uint8Array(analyser.fftSize);
        Mic.started = true;
        Mic.error = null;
      } catch (err) {
        Mic.error = err && err.name === 'NotAllowedError' ? 'Microphone access was blocked' : (err && err.message) || String(err);
        throw err;
      }
      return Mic;
    },

    startDemo() {
      demo = true;
      Mic.demo = true;
      Mic.started = true;
      freq = new Uint8Array(1024);
      wave = new Uint8Array(2048);
      return Mic;
    },

    sampleRate() {
      return ctx ? ctx.sampleRate : 48000;
    },

    spectrum() {
      if (!Mic.started) return new Uint8Array(1024);
      if (demo) fillDemo();
      else analyser.getByteFrequencyData(freq);
      return freq;
    },

    waveform() {
      if (!Mic.started) return new Uint8Array(2048).fill(128);
      if (demo) fillDemo();
      else analyser.getByteTimeDomainData(wave);
      return wave;
    },

    level() {
      const w = Mic.waveform();
      let sum = 0;
      for (let i = 0; i < w.length; i++) {
        const v = (w[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / w.length) * 3);
    },

    // Split roughly 30 Hz to 16 kHz into n log-spaced bands.
    bands(n = 8, lo = 30, hi = 16000) {
      const s = Mic.spectrum();
      const nyquist = Mic.sampleRate() / 2;
      const out = new Array(n).fill(0);
      for (let b = 0; b < n; b++) {
        const f0 = lo * Math.pow(hi / lo, b / n);
        const f1 = lo * Math.pow(hi / lo, (b + 1) / n);
        const i0 = Math.max(0, Math.floor((f0 / nyquist) * s.length));
        const i1 = Math.min(s.length, Math.max(i0 + 1, Math.ceil((f1 / nyquist) * s.length)));
        let sum = 0;
        for (let i = i0; i < i1; i++) sum += s[i];
        out[b] = sum / (i1 - i0) / 255;
      }
      return out;
    },

    bass() { const b = Mic.bands(3); return b[0]; },
    mid() { const b = Mic.bands(3); return b[1]; },
    treble() { const b = Mic.bands(3); return b[2]; },
  };

  // Synthetic audio: a pulsing kick, a wandering melody and some hiss.
  let lastFill = -1;
  function fillDemo() {
    const now = performance.now();
    if (now === lastFill) return;
    lastFill = now;
    demoT = now / 1000;
    const beat = Math.pow(Math.max(0, Math.sin(demoT * Math.PI * 2 * 2)), 8);
    const melody = 0.25 + 0.2 * Math.sin(demoT * 0.7);
    for (let i = 0; i < freq.length; i++) {
      const x = i / freq.length;
      const kick = beat * Math.exp(-x * 60);
      const tone = 0.6 * Math.exp(-Math.pow((x - melody * 0.2) * 80, 2));
      const hiss = 0.08 * Math.random() * (1 - x);
      freq[i] = Math.min(255, (kick + tone + hiss) * 255);
    }
    for (let i = 0; i < wave.length; i++) {
      const v = beat * Math.sin(i * 0.02) * 0.6 + 0.2 * Math.sin(i * 0.15 + demoT * 10);
      wave[i] = 128 + v * 127;
    }
  }

  window.Mic = Mic;
})();
