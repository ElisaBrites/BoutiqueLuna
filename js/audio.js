/* ============================================================
   BOUTIQUE LUNA — sonidos suaves (WebAudio)
   ============================================================ */

(function () {
  const S = {
    enabled: true,
    ctx: null,
    master: null,
    noiseBuffer: null
  };

  function ensure() {
    if (!S.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      S.ctx = new AC();
      S.master = S.ctx.createGain();
      S.master.gain.value = 0.22;
      S.master.connect(S.ctx.destination);
    }
    if (S.ctx.state === 'suspended') S.ctx.resume();
    return S.ctx;
  }

  function note(freq, delay, dur, opts) {
    const ctx = S.ctx;
    if (!ctx) return;
    const o = opts || {};
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const vol = o.vol == null ? 0.14 : o.vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(S.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(delay, dur, vol) {
    const ctx = S.ctx;
    if (!ctx) return;
    if (!S.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.4);
      S.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = S.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = S.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(S.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  function play(name) {
    if (!S.enabled) return;
    const ctx = ensure();
    if (!ctx) return;
    switch (name) {
      case 'click':
        note(620, 0, 0.07, { type: 'sine', vol: 0.08 });
        break;
      case 'pick':
        note(520, 0, 0.1, { type: 'triangle', vol: 0.11 });
        note(780, 0.07, 0.13, { type: 'sine', vol: 0.1 });
        break;
      case 'deliver':
        note(740, 0, 0.1, { type: 'sine', vol: 0.11 });
        note(988, 0.08, 0.16, { type: 'sine', vol: 0.12 });
        note(1319, 0.17, 0.2, { type: 'sine', vol: 0.1 });
        break;
      case 'coin':
        note(1046, 0, 0.1, { type: 'triangle', vol: 0.12 });
        note(1318, 0.06, 0.12, { type: 'triangle', vol: 0.12 });
        note(1568, 0.13, 0.22, { type: 'sine', vol: 0.1 });
        break;
      case 'error':
        note(220, 0, 0.12, { type: 'sawtooth', vol: 0.05 });
        note(185, 0.1, 0.16, { type: 'sawtooth', vol: 0.045 });
        break;
      case 'bell':
        note(1568, 0, 0.16, { type: 'sine', vol: 0.09 });
        note(2093, 0.12, 0.22, { type: 'sine', vol: 0.07 });
        break;
      case 'curtain':
        noise(0, 0.22, 0.04);
        break;
      case 'heart':
        note(523, 0, 0.12, { type: 'sine', vol: 0.11 });
        note(659, 0.09, 0.14, { type: 'sine', vol: 0.1 });
        note(784, 0.18, 0.22, { type: 'sine', vol: 0.1 });
        break;
      case 'heartLost':
        note(392, 0, 0.16, { type: 'triangle', vol: 0.1 });
        note(294, 0.12, 0.3, { type: 'triangle', vol: 0.09 });
        break;
      case 'pay':
        for (let i = 0; i < 4; i++) {
          note(720 + i * 120, i * 0.12, 0.08, { type: 'sine', vol: 0.06 });
        }
        break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) => {
          note(f, i * 0.11, 0.34, { type: i % 2 ? 'sine' : 'triangle', vol: 0.11 });
        });
        note(1568, 0.6, 0.7, { type: 'sine', vol: 0.08 });
        break;
      case 'lose':
        [440, 392, 330, 262].forEach((f, i) => {
          note(f, i * 0.16, 0.3, { type: 'triangle', vol: 0.09 });
        });
        break;
      case 'level':
        [523, 659, 784].forEach((f, i) => {
          note(f, i * 0.09, 0.25, { type: 'sine', vol: 0.09 });
        });
        break;
      case 'buy':
        note(660, 0, 0.1, { type: 'triangle', vol: 0.1 });
        note(880, 0.07, 0.12, { type: 'triangle', vol: 0.1 });
        note(1174, 0.15, 0.28, { type: 'sine', vol: 0.11 });
        break;
      default:
        break;
    }
  }

  BL.Sound = {
    get enabled() { return S.enabled; },
    set enabled(v) { S.enabled = !!v; if (v) ensure(); },
    play,
    unlock: ensure
  };
})();
