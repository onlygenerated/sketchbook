// Mic: a small Web Audio helper for audio-reactive sketches (no p5.sound needed).
//
// Sources (each one replaces the previous):
//   await Mic.start();               // microphone or any audio input; Mic.start({ deviceId })
//   await Mic.startDisplay();        // the laptop's own audio (Chrome/Edge screen-share audio)
//   await Mic.startFile(fileOrUrl);  // a song file or URL; plays through the speakers and loops
//   Mic.startDemo();                 // synthetic audio, no permissions needed
//   Mic.stop();  Mic.pause();  Mic.resume();  Mic.paused;  Mic.kind  ('mic' | 'laptop' | 'file' | 'demo')
//
// Reading (call once or more per frame):
//   Mic.level();       // overall loudness, 0..1
//   Mic.bands(8);      // n log-spaced frequency bands, each 0..1 (bass first)
//   Mic.bass(), Mic.mid(), Mic.treble()
//   Mic.spectrum();    // raw Uint8Array of FFT bins, 0..255
//   Mic.waveform();    // raw Uint8Array of the time-domain signal, 128 = silence
//
// Level control: everything is analysed after a gain stage (the "sensitivity"). Song files still
// play at their normal volume; the gain only affects what the sketch hears.
//   Mic.setGain(g); Mic.getGain();
//   Mic.autoLevel = true; Mic.tick();   // call tick() once per frame to auto-level any music
//   await Mic.inputs();                 // audio inputs, for a device picker (after mic access)
//   Mic.onEnded = () => {...};          // the source stopped by itself (e.g. "Stop sharing")
//
// Browsers only allow the mic and laptop audio over HTTPS or localhost, after a tap or click.
(() => {
  let ctx = null;
  let analyser = null;
  let gainNode = null;
  let presence = null; // analyser before the gain: tells music from silence
  let presenceBuf = null;
  let freq = null;
  let wave = null;
  let demo = false;
  let current = null; // { kind, source, stream?, el?, url? }

  // Auto-level state. The target is the loudness of a well-mastered song at full volume.
  const AUTO_TARGET = 0.5;     // average of Mic.bands(8)
  const UNITS_PER_DOUBLING = 0.075;
  let avg = null, heard = 0, quiet = 0, settle = 0;

  const Mic = {
    started: false,
    demo: false,
    paused: false,
    kind: null,
    error: null,
    autoLevel: false,
    onEnded: null,

    async start({ deviceId, smoothing = 0.8, fftSize = 2048 } = {}) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: false, noiseSuppression: false, autoGainControl: false,
          },
        });
        const ac = await ensure(smoothing, fftSize);
        attach('mic', ac.createMediaStreamSource(stream), { stream });
        Mic.error = null;
      } catch (err) {
        Mic.error = err && err.name === 'NotAllowedError' ? 'Microphone access was blocked' : (err && err.message) || String(err);
        throw err;
      }
      return Mic;
    },

    async startDisplay({ smoothing = 0.8, fftSize = 2048 } = {}) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1, width: 320 }, // Chrome needs a video track; it's kept tiny and unused
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: 'include',
        selfBrowserSurface: 'exclude',
      });
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((t) => t.stop());
        const err = new Error('No audio came through. Share your entire screen and turn on "Share system audio".');
        err.name = 'NoAudio';
        throw err;
      }
      const ac = await ensure(smoothing, fftSize);
      attach('laptop', ac.createMediaStreamSource(new MediaStream(stream.getAudioTracks())), { stream });
      return Mic;
    },

    async startFile(src, { loop = true, smoothing = 0.8, fftSize = 2048 } = {}) {
      const ac = await ensure(smoothing, fftSize);
      const el = new Audio();
      const url = typeof src === 'string' ? null : URL.createObjectURL(src);
      el.src = url || src;
      el.loop = loop;
      const source = ac.createMediaElementSource(el);
      source.connect(ac.destination); // audible at its normal volume
      attach('file', source, { el, url });
      await el.play();
      return Mic;
    },

    startDemo() {
      stopCurrent();
      demo = true;
      Mic.demo = true;
      Mic.started = true;
      Mic.paused = false;
      Mic.kind = 'demo';
      freq = new Uint8Array(1024);
      wave = new Uint8Array(2048);
      return Mic;
    },

    stop() {
      stopCurrent();
      demo = false;
      Mic.demo = false;
      Mic.started = false;
      Mic.kind = null;
    },

    pause() {
      if (current && current.el) current.el.pause();
      Mic.paused = true;
    },

    resume() {
      if (ctx) ctx.resume();
      if (current && current.el) current.el.play();
      Mic.paused = false;
    },

    setGain(g) {
      if (!gainNode) return;
      gainNode.gain.setTargetAtTime(Math.min(40, Math.max(0.01, g)), ctx.currentTime, 0.05);
      gainNode.__value = Math.min(40, Math.max(0.01, g));
    },

    getGain() {
      return gainNode ? (gainNode.__value ?? gainNode.gain.value) : 1;
    },

    // Call once per frame. Settles in quickly for ~10 s after a source starts or after 2+ s of
    // silence (a new track), then drifts slowly so a song's quiet and loud parts still differ.
    tick() {
      if (!Mic.autoLevel || !current || Mic.paused) return;
      if (!hearing()) {
        heard = 0;
        if (++quiet > 120) settle = 600;
        return;
      }
      quiet = 0;
      if (++heard < 30) return;
      const b = Mic.bands(8);
      let lvl = 0;
      for (let i = 0; i < b.length; i++) lvl += b[i];
      lvl /= b.length;
      avg = avg === null ? lvl : avg + (lvl - avg) * 0.015;
      const doublings = (AUTO_TARGET - avg) / UNITS_PER_DOUBLING;
      const rate = settle > 0 ? 0.01 : 0.0015;
      if (settle > 0) settle--;
      if (Math.abs(doublings) > 0.2) {
        Mic.setGain(Mic.getGain() * Math.pow(2, Math.max(-1, Math.min(1, doublings)) * rate));
      }
    },

    resetAutoLevel() {
      avg = null; heard = 0; quiet = 0; settle = 600;
    },

    async inputs() {
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'audioinput');
    },

    currentInputId() {
      const t = current && current.stream && current.stream.getAudioTracks()[0];
      return t ? t.getSettings().deviceId : null;
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

  async function ensure(smoothing, fftSize) {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothing;
      gainNode = ctx.createGain();
      gainNode.connect(analyser); // analysis only; nothing goes to the speakers from here
      presence = ctx.createAnalyser();
      presence.fftSize = 512;
      presenceBuf = new Float32Array(presence.fftSize);
      freq = new Uint8Array(analyser.frequencyBinCount);
      wave = new Uint8Array(analyser.fftSize);
    }
    await ctx.resume();
    return ctx;
  }

  function attach(kind, source, extras) {
    stopCurrent();
    demo = false;
    Mic.demo = false;
    freq = new Uint8Array(analyser.frequencyBinCount);
    wave = new Uint8Array(analyser.fftSize);
    source.connect(gainNode);
    source.connect(presence);
    current = { kind, source, ...extras };
    Mic.kind = kind;
    Mic.started = true;
    Mic.paused = false;
    Mic.setGain(kind === 'mic' ? 2 : 1);
    Mic.resetAutoLevel();
    if (extras.stream) {
      extras.stream.getTracks().forEach((t) => t.addEventListener('ended', () => {
        if (current && current.stream === extras.stream) {
          Mic.stop();
          if (Mic.onEnded) Mic.onEnded();
        }
      }));
    }
  }

  function stopCurrent() {
    if (!current) return;
    if (current.stream) current.stream.getTracks().forEach((t) => t.stop());
    if (current.el) { current.el.pause(); current.el.removeAttribute('src'); current.el.load(); }
    if (current.url) URL.revokeObjectURL(current.url);
    try { current.source.disconnect(); } catch (e) { /* already disconnected */ }
    current = null;
  }

  // Is anything actually playing? (about -55 dBFS or louder, before the gain)
  function hearing() {
    if (!presence) return false;
    presence.getFloatTimeDomainData(presenceBuf);
    let sum = 0;
    for (let i = 0; i < presenceBuf.length; i++) sum += presenceBuf[i] * presenceBuf[i];
    return Math.sqrt(sum / presenceBuf.length) > 0.0018;
  }

  // Synthetic audio: a pulsing kick, a wandering melody and some hiss.
  let lastFill = -1;
  function fillDemo() {
    const now = performance.now();
    if (now === lastFill) return;
    lastFill = now;
    const t = now / 1000;
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 2)), 8);
    const swell = 0.6 + 0.4 * Math.sin(t * 0.25);
    const melody = 0.25 + 0.2 * Math.sin(t * 0.7);
    for (let i = 0; i < freq.length; i++) {
      const x = i / freq.length;
      const kick = beat * Math.exp(-x * 60);
      const tone = 0.6 * swell * Math.exp(-Math.pow((x - melody * 0.2) * 80, 2));
      const hiss = 0.08 * Math.random() * (1 - x);
      freq[i] = Math.min(255, (kick + tone + hiss) * 255);
    }
    for (let i = 0; i < wave.length; i++) {
      const v = beat * Math.sin(i * 0.02) * 0.6 + 0.2 * swell * Math.sin(i * 0.15 + t * 10);
      wave[i] = 128 + v * 127;
    }
  }

  window.Mic = Mic;
})();
