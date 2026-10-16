// Synthesizes the paper pitch's whole soundtrack, music and paper sounds, into
// public/paper/score.wav, timed to the voice (src/paper/vo-at.json, vo.json) and to the
// moments the scenes put on screen (the times below are read off src/paper/*.tsx; move an
// event there and move it here).
//
// The music is hand-played, not electronic: plucked strings (Karplus-Strong), so a
// ukulele and pizzicato strings and a bass; a glockenspiel and a music box; stomps, claps,
// finger snaps, a shaker, a tambourine; and, for the finale, a whistle.
//   0-7 s    the book opens: a picked ukulele and a music box; a glockenspiel run as the
//            33 windows light, one note a window.
//   7-17 s   the scraps: sneaky pizzicato in D minor, snaps on two and four, a pluck as
//            each scrap lands. It stops dead for "Nothing connected."
//   19-21 s  the fold: the glockenspiel climbs, the claps roll, one beat of silence.
//   21 s     "Hivelet": the band comes in, D major, 120 bpm: strummed ukulele, stomp and
//            clap, shaker, bass, a glockenspiel hook.
//   44.75 s  the A+ stamp lands on the push into the bar; five notes for five stars.
//   49-52 s  the pull back: the whistle takes the hook; home on the book.
//   52-60 s  the hook slowed under the credits, and the last chord as the book shuts.
// Every paper sound is made here too: sheets landing, tape, marker, pins, the sticky
// notes blowing away, crumpling, the split-flap, the typewriter, the stamps, label tape,
// the receipt printer, the sticker, the book.
//
// The music steps back 10 dB where the voice is speaking; the paper sounds do not.
// Everything is generated, so there is nothing to license; seeded, so it is the same
// every time.   node capture/paper-score.mjs

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AT = JSON.parse(readFileSync(join(root, 'src', 'paper', 'vo-at.json'), 'utf8'));
const FR = 1 / 60;
const WORD = {landlady: AT.units + 1.12, legazpi: AT.meet + 2.75, addsUp: AT.ledger + 1.73, gcash: AT.phone + 2.45, noAccount: AT.visitors + 2.07, aPlus: AT.secure + 1.2, rated: AT.quality + 0.61};
const REVEAL = 21.0, END = 60;

const SR = 44100, N = Math.ceil((END + 0.5) * SR);
const pair = () => [new Float32Array(N), new Float32Array(N)];
const BED = pair(), FX = pair();
const SEND_BED = new Float32Array(N), SEND_FX = new Float32Array(N);
let T = BED, TS = SEND_BED;
const into = (w) => { T = w === 'fx' ? FX : BED; TS = w === 'fx' ? SEND_FX : SEND_BED; };
function out(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  T[0][i] += v * Math.cos((pan + 1) * Math.PI / 4); T[1][i] += v * Math.sin((pan + 1) * Math.PI / 4);
  TS[i] += v * send;
}
let seed = 23;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const noise = () => rnd() * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const decay = (tau, attack = 0.002) => (t) => Math.min(1, t / attack) * Math.exp(-t / tau);
const fadeAt = (len, r = 0.01) => (t) => clamp01((len - t) / r);

function sineVoice({freq, t0, dur, env, gain, pan = 0, send = 0}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) { const t = k / SR; ph += 2 * Math.PI * freq(t) / SR; out(a + k, Math.sin(ph) * env(t) * gain, pan, send); }
}
function noiseVoice({t0, dur, centre, q, env, gain, pan = 0, send = 0}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    if (k % 16 === 0) {
      const w = 2 * Math.PI * Math.min(centre(t), SR * 0.45) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
      b0 = al / a0; b2 = -al / a0; a1 = -2 * Math.cos(w) / a0; a2 = (1 - al) / a0;
    }
    const x = noise(), y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out(a + k, y * env(t) * gain, pan, send);
  }
}

// ---- Plucked strings (Karplus-Strong) ----------------------------------------------------------
// A burst of filtered noise in a delay line one period long, averaged as it circulates: the
// sound of a plucked string. `bright` is how hard and near the bridge it is plucked; `damp`
// how long it rings.
function ks({t0, m, dur = 1.6, gain = 0.2, pan = 0, send = 0.2, damp = 0.996, bright = 0.6}) {
  const n = Math.max(2, Math.round(SR / hz(m)));
  const buf = new Float32Array(n);
  let lp = 0, mean = 0;
  for (let i = 0; i < n; i++) { lp += bright * (noise() - lp); buf[i] = lp; mean += lp / n; }
  for (let i = 0; i < n; i++) buf[i] -= mean;
  const a = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  let idx = 0;
  for (let k = 0; k < len; k++) {
    const y = buf[idx], nx = buf[(idx + 1) % n];
    buf[idx] = damp * 0.5 * (y + nx);
    idx = (idx + 1) % n;
    out(a + k, y * gain * Math.min(1, k / 60) * Math.min(1, (len - k) / (0.03 * SR)), pan, send);
  }
}
// A ukulele (G C E A, re-entrant), chords as the notes on its four strings.
const UKE = {D: [69, 62, 66, 69], A: [69, 61, 64, 69], Bm: [71, 62, 66, 71], G: [67, 62, 67, 71], Dm: [69, 62, 65, 69], Bb: [70, 62, 65, 70], Gm: [67, 62, 67, 70]};
function strum(t, chord, g = 1, up = false, spread = 0.012) {
  const strings = up ? [...UKE[chord]].reverse() : UKE[chord];
  strings.forEach((m, i) => ks({t0: t + i * spread, m, dur: 1.4, gain: 0.07 * g * (up ? 0.7 : 1), pan: (i - 1.5) * 0.12, send: 0.2, damp: 0.9955, bright: up ? 0.45 : 0.62}));
}
const pizz = (t, m, g = 1, pan = 0) => ks({t0: t, m, dur: 0.45, gain: 0.11 * g, pan, send: 0.22, damp: 0.982, bright: 0.5});
const bassPluck = (t, m, g = 1, dur = 0.9) => ks({t0: t, m, dur, gain: 0.22 * g, pan: 0, send: 0.05, damp: 0.994, bright: 0.28});

// ---- Mallets and bells -------------------------------------------------------------------------
function glock(t, m, g = 1, pan = 0) {
  for (const [r, a, tau] of [[1, 1, 1.3], [2.76, 0.3, 0.45], [5.4, 0.12, 0.18], [8.93, 0.05, 0.08]]) {
    sineVoice({freq: () => hz(m) * r, t0: t, dur: tau * 4, gain: 0.045 * g * a, pan, send: 0.45, env: decay(tau, 0.0015)});
  }
}
function musicBox(t, m, g = 1, pan = 0) {
  for (const [r, a, tau] of [[1, 1, 0.9], [3.0, 0.18, 0.25], [6.8, 0.05, 0.06]]) {
    sineVoice({freq: () => hz(m) * r, t0: t, dur: tau * 4, gain: 0.04 * g * a, pan, send: 0.55, env: decay(tau, 0.001)});
  }
}
// A whistle: a pure tone with breath, vibrato that grows into each note, glides between notes.
function whistle(notes, g = 1, pan = 0.1) {
  const t0 = notes[0][0], t1 = notes[notes.length - 1][0] + notes[notes.length - 1][2] + 0.2;
  const a = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR);
  let ph = 0, cur = hz(notes[0][1]), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let k = 0; k < n; k++) {
    const t = t0 + k / SR;
    let amp = 0, target = cur, since = 0;
    for (const [s, m, d] of notes) {
      if (t >= s - 0.02 && t < s + d + 0.12) {
        amp = Math.max(amp, Math.min(1, (t - s + 0.02) / 0.05) * Math.min(1, (s + d + 0.12 - t) / 0.12));
        target = hz(m); since = t - s;
      }
    }
    cur += (target - cur) * 0.0025;
    const vib = 1 + 0.006 * Math.min(1, Math.max(0, since - 0.12) / 0.25) * Math.sin(2 * Math.PI * 5.4 * t);
    ph += 2 * Math.PI * cur * vib / SR;
    // breath: noise in a narrow band at the whistled pitch
    const w = 2 * Math.PI * Math.min(cur, SR * 0.45) / SR, al = Math.sin(w) / 16, a0 = 1 + al;
    const x = noise(), y = (al / a0) * x - (al / a0) * x2 - (-2 * Math.cos(w) / a0) * y1 - ((1 - al) / a0) * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out(a + k, (Math.sin(ph) * 0.9 + y * 0.6) * amp * 0.06 * g, pan, 0.35);
  }
}

// ---- Hands and feet ------------------------------------------------------------------------------
const stomp = (t, g = 1) => {
  sineVoice({freq: (x) => 52 + 80 * Math.exp(-x / 0.025), t0: t, dur: 0.4, gain: 0.28 * g, env: decay(0.13, 0.001)});
  noiseVoice({t0: t, dur: 0.12, centre: () => 260, q: 0.7, gain: 0.22 * g, send: 0.12, env: decay(0.035, 0.001)});
};
const clap = (t, g = 1, pan = 0.05) => {
  for (const [off, k, tail] of [[0, 0.55, false], [0.01, 0.7, false], [0.021, 1, true]]) {
    noiseVoice({t0: t + off, dur: tail ? 0.3 : 0.02, centre: () => 1350, q: 0.8, gain: 0.17 * g * k, pan, send: 0.3, env: decay(tail ? 0.075 : 0.006, 0.0006)});
  }
};
const snap = (t, g = 1) => {
  noiseVoice({t0: t, dur: 0.05, centre: () => 2900, q: 2.2, gain: 0.2 * g, pan: 0.25, send: 0.2, env: decay(0.012, 0.0005)});
  noiseVoice({t0: t, dur: 0.01, centre: () => 6500, q: 0.8, gain: 0.08 * g, pan: 0.25, env: decay(0.002, 0.0003)});
};
const shaker = (t, g = 1) => noiseVoice({t0: t, dur: 0.1, centre: () => 7200, q: 1.1, gain: 0.05 * g, pan: -0.3, env: (x) => Math.min(1, x / 0.012) * Math.exp(-x / 0.04)});
const tamb = (t, g = 1) => {
  noiseVoice({t0: t, dur: 0.25, centre: () => 8800, q: 2.5, gain: 0.07 * g, pan: 0.35, send: 0.15, env: decay(0.08, 0.001)});
  for (const fq of [5230, 6870, 8120]) sineVoice({freq: () => fq, t0: t, dur: 0.2, gain: 0.006 * g, pan: 0.35, env: decay(0.06, 0.001)});
};
const woodblock = (t, g = 1, pan = -0.2) => {
  sineVoice({freq: () => 880, t0: t, dur: 0.15, gain: 0.08 * g, pan, send: 0.15, env: decay(0.035, 0.0005)});
  sineVoice({freq: () => 1640, t0: t, dur: 0.08, gain: 0.03 * g, pan, env: decay(0.015, 0.0005)});
};

// ---- Paper and things (all on the effects bus) -----------------------------------------------------
const fx = {
  drop(t, g = 1, size = 1) {
    noiseVoice({t0: t, dur: 0.25, centre: () => 380 / size, q: 0.6, gain: 0.3 * g * size, send: 0.08, env: decay(0.045, 0.004)});
    noiseVoice({t0: t + 0.004, dur: 0.06, centre: () => 2600, q: 0.9, gain: 0.09 * g, send: 0.08, env: decay(0.012, 0.0008)});
  },
  tape(t, g = 1) {
    noiseVoice({t0: t, dur: 0.13, centre: (x) => 3800 + 1500 * x / 0.13, q: 0.9, gain: 0.07 * g, pan: 0.1, env: (x) => Math.min(1, x / 0.01) * (1 - x / 0.13) * (0.4 + 0.6 * ((Math.floor(x * 400) * 7) % 3 ? 1 : 0.2))});
    noiseVoice({t0: t + 0.12, dur: 0.05, centre: () => 1500, q: 0.8, gain: 0.08 * g, env: decay(0.01, 0.0008)});
  },
  marker(t, dur, g = 1, pan = 0.15) {
    const rate = 7 + rnd() * 5;
    noiseVoice({t0: t, dur, centre: (x) => 2100 + 500 * Math.sin(x * 9), q: 2.4, gain: 0.07 * g, pan, env: (x) => Math.min(1, x / 0.02) * fadeAt(dur, 0.04)(x) * (0.45 + 0.55 * Math.abs(Math.sin(Math.PI * rate * x)))});
    sineVoice({freq: (x) => 1500 + 300 * Math.sin(x * 23), t0: t, dur, gain: 0.006 * g, pan, env: (x) => Math.min(1, x / 0.03) * fadeAt(dur, 0.04)(x) * Math.abs(Math.sin(Math.PI * rate * x))});
  },
  pin(t, g = 1) {
    noiseVoice({t0: t, dur: 0.02, centre: () => 5200, q: 1, gain: 0.12 * g, env: decay(0.004, 0.0003)});
    sineVoice({freq: () => 240, t0: t, dur: 0.08, gain: 0.08 * g, env: decay(0.02, 0.001)});
  },
  whoosh(t, dur, g = 1) {
    noiseVoice({t0: t, dur, centre: (x) => 500 + 2200 * Math.sin(Math.PI * x / dur), q: 0.9, gain: 0.06 * g, send: 0.1, env: (x) => Math.pow(Math.sin(Math.PI * x / dur), 2)});
  },
  flutter(t, dur, g = 1, pan = 0) {
    const rate = 18 + rnd() * 10;
    noiseVoice({t0: t, dur, centre: () => 2300, q: 1, gain: 0.07 * g, pan, env: (x) => Math.sin(Math.PI * x / dur) * (0.3 + 0.7 * Math.abs(Math.sin(Math.PI * rate * x)))});
  },
  crumple(t, dur, g = 1) {
    for (let x = 0; x < dur; x += 0.004 + rnd() * 0.012) {
      noiseVoice({t0: t + x, dur: 0.015, centre: () => 1200 + rnd() * 5000, q: 1.5, gain: 0.09 * g * (0.4 + rnd() * 0.6), pan: (rnd() - 0.5) * 0.4, env: decay(0.003, 0.0004)});
    }
  },
  stamp(t, g = 1) {
    sineVoice({freq: (x) => 48 + 60 * Math.exp(-x / 0.03), t0: t, dur: 0.4, gain: 0.3 * g, env: decay(0.09, 0.001)});
    noiseVoice({t0: t, dur: 0.12, centre: () => 1300, q: 0.7, gain: 0.26 * g, send: 0.2, env: decay(0.025, 0.0005)});
    noiseVoice({t0: t + 0.01, dur: 0.15, centre: () => 600, q: 0.8, gain: 0.14 * g, env: decay(0.05, 0.002)});
  },
  flap(t, g = 1) {
    noiseVoice({t0: t, dur: 0.02, centre: () => 3600, q: 1.2, gain: 0.11 * g, pan: 0.05, env: decay(0.004, 0.0003)});
    sineVoice({freq: () => 1150, t0: t, dur: 0.05, gain: 0.04 * g, pan: 0.05, env: decay(0.009, 0.0005)});
  },
  type(t, g = 1) {
    noiseVoice({t0: t, dur: 0.02, centre: () => 4200, q: 1, gain: 0.1 * g, pan: -0.1, env: decay(0.003, 0.0003)});
    sineVoice({freq: () => 2250, t0: t + 0.004, dur: 0.05, gain: 0.02 * g, pan: -0.1, env: decay(0.012, 0.0005)});
    sineVoice({freq: () => 170, t0: t, dur: 0.06, gain: 0.07 * g, pan: -0.1, env: decay(0.018, 0.0008)});
  },
  dymo(t, g = 1) {
    noiseVoice({t0: t, dur: 0.05, centre: () => 1800, q: 1.4, gain: 0.1 * g, env: decay(0.018, 0.001)});
    sineVoice({freq: () => 300, t0: t, dur: 0.05, gain: 0.04 * g, env: decay(0.012, 0.001)});
  },
  printer(t, dur, g = 1) {
    sineVoice({freq: () => 185, t0: t, dur, gain: 0.03 * g, pan: 0.2, env: (x) => Math.min(1, x / 0.02) * fadeAt(dur, 0.03)(x) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 42 * x))});
    noiseVoice({t0: t, dur, centre: () => 3200, q: 1.5, gain: 0.05 * g, pan: 0.2, env: (x) => Math.min(1, x / 0.02) * fadeAt(dur, 0.03)(x) * (Math.sin(2 * Math.PI * 42 * x) > 0 ? 1 : 0.3)});
  },
  peel(t, dur, g = 1) {
    noiseVoice({t0: t, dur, centre: (x) => 3000 + 3000 * x / dur, q: 1, gain: 0.07 * g, env: (x) => Math.min(1, x / 0.02) * fadeAt(dur, 0.02)(x) * (rnd() > 0.3 ? 1 : 0.3)});
  },
  press(t, g = 1) {
    noiseVoice({t0: t, dur: 0.12, centre: () => 500, q: 0.7, gain: 0.16 * g, env: decay(0.03, 0.002)});
    noiseVoice({t0: t, dur: 0.03, centre: () => 2800, q: 1, gain: 0.06 * g, env: decay(0.006, 0.0005)});
  },
  page(t, dur, g = 1) {
    noiseVoice({t0: t, dur, centre: (x) => 700 + 2600 * x / dur, q: 0.8, gain: 0.08 * g, send: 0.1, env: (x) => Math.sin(Math.PI * x / dur)});
    fx.crumple(t + dur * 0.3, dur * 0.4, 0.3 * g);
  },
  fwip(t, g = 1) {
    noiseVoice({t0: t, dur: 0.12, centre: (x) => 900 + 3500 * x / 0.12, q: 1.1, gain: 0.07 * g, env: (x) => Math.sin(Math.PI * x / 0.12)});
  },
  thump(t, g = 1) {
    sineVoice({freq: (x) => 44 + 40 * Math.exp(-x / 0.04), t0: t, dur: 0.6, gain: 0.28 * g, env: decay(0.16, 0.001)});
    noiseVoice({t0: t, dur: 0.2, centre: () => 900, q: 0.7, gain: 0.2 * g, send: 0.15, env: decay(0.04, 0.0008)});
  },
};
// Writing: a marker sound for the time a line of `chars` letters takes at `cps`.
const write = (t, chars, cps, g = 1, pan = 0.15) => fx.marker(t, Math.max(0.15, chars / cps), g, pan);

// ================================ The music =========================================================
into('bed');
// ---- 0 to 7 s: the book opens: picked ukulele, a music box ------------------------------------------
const pickChord = (t0, chord, beats, g = 1) => {
  const order = [1, 2, 3, 0, 2, 1, 3, 2];
  for (let k = 0; k < beats * 2; k++) ks({t0: t0 + k * 0.25, m: UKE[chord][order[k % 8]], dur: 1.2, gain: 0.06 * g, pan: (order[k % 8] - 1.5) * 0.15, send: 0.25, damp: 0.995, bright: 0.45});
};
pickChord(0.5, 'D', 1, 0.6);
pickChord(1.0, 'D', 4, 0.8);
pickChord(3.0, 'Bm', 4, 0.8);
pickChord(5.0, 'G', 2, 0.8);
pickChord(6.0, 'A', 2, 0.85);
[[1.0, 90], [1.5, 93], [2.0, 98], [3.0, 97], [3.5, 95], [4.0, 93], [4.5, 90]].forEach(([t, m]) => musicBox(t, m, 0.8, 0.2));
// 33 windows, one note a window, up the D major pentatonic.
{
  const PENTA = [0, 2, 4, 7, 9];
  for (let i = 0; i < 33; i++) {
    const t = AT.units + 0.07 + (0.88 * i) / 33;
    glock(t, 74 + 12 * Math.floor(i / 5) + PENTA[i % 5] - 12 * Math.floor(i / 15), 0.38 + 0.25 * (i / 33), (i / 33 - 0.5) * 0.8);
  }
}
strum(WORD.landlady - 0.02, 'D', 0.9);
glock(WORD.landlady + 0.02, 86, 0.6);

// ---- 7 to 17 s: the scraps: sneaky pizzicato in D minor -------------------------------------------
const MINOR = [[7, 'Dm', 38], [9, 'Bb', 34], [11, 'Gm', 31], [13, 'A', 33], [15, 'Dm', 38]];
for (const [b, ch, root] of MINOR) {
  for (let k = 0; k < 8; k++) {
    const t = b + k * 0.25;
    if (t >= 17.0) break;
    if (k % 2 === 0) pizz(t, root + (k % 4 === 0 ? 12 : 19), 1.05, -0.15);
    else pizz(t, UKE[ch][1 + (k % 3)] - 12, 0.55, 0.25);
  }
  for (const off of [0.5, 1.5]) if (b + off < 17) snap(b + off, 0.9);
  if (b >= 9) for (let k = 0; k < 16 && b + k * 0.125 < 17; k++) shaker(b + k * 0.125, k % 2 ? 0.45 : 0.9);
  bassPluck(b, root, 0.8, 1.6);
}
// A pluck as each scrap lands.
[[9.15, 81], [9.95, 86], [11.65, 82], [13.15, 79], [15.2, 77], [15.35, 81], [15.5, 84]].forEach(([t, m]) => pizz(t, m, 0.9, 0.4));
// "Nothing connected": a last low pluck, then only a clock.
pizz(17.0, 26, 1.4);
bassPluck(17.0, 26, 1.1, 1.2);
for (let t = 17.5; t < 18.8; t += 0.5) woodblock(t, 0.55);

// ---- 18.8 to 21 s: the fold, and the build -----------------------------------------------------------
for (let k = 0; k < 28; k++) {
  const t = 19.0 + k * 0.0625;
  if (t > 20.85) break;
  glock(t, [62, 66, 69, 74][k % 4] + 12 * Math.floor(k / 8), 0.3 + 0.5 * (k / 28), (k % 2 ? 0.3 : -0.3));
}
for (let t = 19.5, k = 0; t < 20.88; k++) { clap(t, 0.25 + 0.6 * ((t - 19.5) / 1.4)); t += (t < 20.25 ? 0.25 : t < 20.6 ? 0.125 : 0.0625); }
for (let k = 0; k < 12; k++) strum(19.0 + k * 0.125, k < 6 ? 'G' : 'A', 0.25 + 0.4 * k / 12, k % 2 === 1, 0.006);

// ---- 21 to 49 s: the product, D major at 120 bpm -------------------------------------------------------
// Bars on the odd seconds. The strum: down, down-up, up-down-up (eighths 0, 2, 3, 5, 6, 7).
const PROG = [['D', 38], ['A', 33], ['Bm', 35], ['G', 31]];
const HOOK = [[0, 78], [1, 81], [2, 83], [3, 81], [4.5, 78], [6, 76], [7, 74]]; // eighths, notes
function bar(b, chord, root, opts = {}) {
  const {drums = true, hook = false, lift = false, strums = true} = opts;
  if (strums) [[0, false], [2, false], [3, true], [5, true], [6, false], [7, true]].forEach(([e, up]) => strum(b + e * 0.25, chord, lift ? 1.15 : 1, up));
  bassPluck(b, root, 1, 0.9);
  bassPluck(b + 1.0, root + 7, 0.75, 0.6);
  bassPluck(b + 1.75, root + (root === 31 ? 2 : -1), 0.6, 0.3);
  if (drums) {
    stomp(b, 1); stomp(b + 1.0, 0.85);
    clap(b + 0.5, 1); clap(b + 1.5, 1);
    if (lift) { clap(b, 0.5); clap(b + 1.0, 0.5); }
    for (let k = 0; k < 16; k++) shaker(b + k * 0.125, k % 2 ? 0.5 : 1);
    for (const e of [1, 3, 5, 7]) tamb(b + e * 0.25, lift ? 0.9 : 0.5);
  }
  if (hook) HOOK.forEach(([e, m]) => glock(b + e * 0.25, m + 12, 0.75, 0.25));
}
const ACT2 = [21, 23, 25, 27, 29, 31, 33, 35, 37];
ACT2.forEach((b, i) => bar(b, PROG[i % 4][0], PROG[i % 4][1], {hook: i % 2 === 1}));
// a two-clap pickup and a tambourine as the camera lands on each feature
for (const t of [27.75, 31.3, 33.45, 37.0]) { clap(t - 0.25, 0.45); clap(t - 0.125, 0.6); tamb(t, 1.2); }
// the reveal itself
into('fx');
stomp(REVEAL, 1.5); clap(REVEAL, 1.0); strum(REVEAL, 'D', 1.3); glock(REVEAL, 86, 0.9); glock(REVEAL, 93, 0.7); tamb(REVEAL, 1.2);
into('bed');

// 39 to 49 s: the proof, lifted. Bm, G, D, A, D.
const ACT3 = [[39, 'Bm', 35], [41, 'G', 31], [43, 'D', 38], [45, 'A', 33], [47, 'D', 38]];
ACT3.forEach(([b, ch, root], i) => {
  const breakA = b === 43;
  bar(b, ch, root, {lift: true, hook: i === 1 || i === 3, drums: !breakA, strums: !breakA});
  if (breakA) {
    // the stop before the stamp: only a tremolo strum, rising, until the A+ lands
    for (let k = 0; k < 14; k++) strum(43 + k * 0.125, k < 8 ? 'D' : 'A', 0.3 + 0.5 * k / 14, k % 2 === 1, 0.006);
    for (let t = 43.0; t < 44.7; t += 0.25) shaker(t, 0.8);
  }
});
// 937 lands; the A+ lands on the push into bar 45; five notes for five stars.
glock(AT.records + 1.95, 86, 0.9); glock(AT.records + 1.95, 90, 0.7);
into('fx');
stomp(WORD.aPlus, 1.4); clap(WORD.aPlus, 1.2); strum(WORD.aPlus, 'A', 1.6); tamb(WORD.aPlus, 1.5);
into('bed');
[74, 78, 81, 86, 90].forEach((m, i) => glock(WORD.rated + i * 8 * FR, m, i === 4 ? 0.7 : 0.95, (i - 2) * 0.2));
stomp(AT.quality + 2.25, 1.1);

// ---- 49 to 52 s: the pull back: the whistle takes the hook; home on the book ------------------------------
for (let b = 49; b < 51.75; b += 0.5) { strum(b, b < 50 ? 'G' : b < 51 ? 'A' : 'A', 0.7, false); strum(b + 0.25, b < 50 ? 'G' : 'A', 0.45, true); }
for (let t = 49.0; t < 51.7; t += 0.125) shaker(t, 0.8);
whistle([[49.0, 78, 0.22], [49.25, 81, 0.22], [49.5, 83, 0.22], [49.75, 81, 0.45], [50.25, 78, 0.22], [50.5, 81, 0.22], [50.75, 86, 0.9]], 1.0);
into('fx');
strum(51.75, 'D', 1.4); glock(51.75, 86, 1.0); glock(51.75, 90, 0.7); stomp(51.75, 0.8);
into('bed');

// ---- 52 to 60 s: the credits, slower, and the book shut -------------------------------------------------
pickChord(52.0, 'D', 4, 0.75);
pickChord(54.0, 'G', 4, 0.75);
pickChord(56.0, 'Bm', 2, 0.7);
pickChord(57.0, 'A', 2, 0.7);
whistle([[52.75, 78, 0.45], [53.25, 81, 0.45], [53.75, 83, 0.45], [54.25, 81, 0.9], [55.25, 78, 0.45], [55.75, 76, 0.45], [56.25, 74, 1.4]], 0.85);
[[57.5, 90], [58.0, 86], [58.5, 81]].forEach(([t, m]) => musicBox(t, m, 0.8, 0.1));
into('fx');
strum(59.32, 'D', 1.2); musicBox(59.32, 86, 1.0); musicBox(59.32, 93, 0.6);
into('bed');

// ================================ The paper =========================================================
into('fx');
// the book opens: the cover, the building standing up, trees, hedge
fx.page(0.36, 0.7, 1.1); fx.fwip(1.15, 1.0); fx.fwip(1.42, 0.7); fx.fwip(1.62, 0.6);
fx.drop(1.5, 0.8); fx.tape(1.7, 0.9);
write(WORD.legazpi, 12, 14, 0.8);
write(AT.units + 2 * FR, 8, 14, 1); fx.marker(AT.units + 18 * FR, 0.25, 0.8); fx.marker(AT.units + 32 * FR, 0.08, 0.7);
fx.pin(WORD.landlady - 0.05, 0.5);
write(WORD.landlady, 10, 16, 1); fx.marker(WORD.landlady + 14 * FR, 0.25, 0.8); fx.marker(WORD.landlady + 28 * FR, 0.08, 0.7);
fx.whoosh(7.08, 0.85, 0.8);
for (let i = 0; i < 9; i++) fx.drop(AT.pieces + 0.2 + rnd() * 1.0, 0.18, 0.5);
// the scraps
const S = AT.sheet, B = AT.book, C = AT.chat, NT = AT.notes, X = AT.nothing, F = AT.folded;
fx.drop(S + 0.12, 1.0, 1.2); fx.tape(S + 16 * FR, 0.8); fx.tape(S + 19 * FR, 0.7);
fx.drop(S + 0.9, 0.7, 0.8); fx.pin(S + 0.92, 0.5); fx.tape(S + 1.15, 0.8);
fx.marker(S + 1.35, 0.3, 0.8); write(S + 1.4, 14, 16, 0.9);
fx.drop(B + 0.1, 0.8); fx.drop(B + 7 * FR + 0.1, 0.8);
fx.marker(B + 0.62, 0.32, 0.9); fx.marker(B + 0.82, 0.32, 0.9); write(B + 1.05, 12, 16, 0.9);
fx.drop(C + 0.1, 0.6, 0.8); [0, 1, 2, 3].forEach((i) => fx.drop(C + 0.5 + i * 8 * FR + 0.06, 0.45, 0.7)); fx.pin(C + 1.1, 0.8); write(C + 1.15, 6, 16, 0.9);
[0, 1, 2].forEach((i) => fx.drop(NT + 0.1 + i * 9 * FR + 0.08, 0.5, 0.7));
fx.flutter(NT + 1.05, 0.75, 1.0, -0.2); fx.flutter(NT + 1.15, 0.8, 0.8, -0.4); fx.whoosh(NT + 1.0, 0.9, 0.7);
[0, 1, 2].forEach((i) => { fx.marker(X + i * 5 * FR, 0.25, 0.6); fx.marker(X + 0.45 + i * 5 * FR, 0.1, 0.9); fx.marker(X + 0.52 + i * 5 * FR, 0.1, 0.9); });
for (let i = 0; i < 18; i++) fx.drop(X + i * 2.2 * FR + 0.03, 0.22, 0.45);
// the fold
fx.whoosh(F + 0.15, 0.6, 0.9);
for (let k = 0; k < 6; k++) fx.fwip(F + (22 + k * 3) * FR, 0.45);
for (let k = 0; k < 6; k++) { fx.flap(F + (50 + k * 5 + 8) * FR, 0.9); fx.fwip(F + (50 + k * 5) * FR, 0.35); }
fx.press(REVEAL - 14 * FR + 0.1, 0.9);
for (let i = 0; i < 7; i++) fx.drop(REVEAL + i * 3 * FR + 0.05, 0.45, 0.6);
fx.whoosh(21.88, 0.6, 1.0);
// the mat
const L = AT.ledger, A = WORD.addsUp, TW = AT.twice, P = AT.phone, G = WORD.gcash, R = AT.repairs, V = AT.visitors, I = AT.install;
fx.drop(L + 0.12, 1.0, 1.3); fx.tape(L + 14 * FR, 0.8); fx.tape(L + 17 * FR, 0.7);
fx.marker(A, 0.35, 0.9); write(A + 4 * FR, 16, 22, 0.9, -0.3); fx.marker(A + 16 * FR, 0.25, 0.7); fx.marker(A + 30 * FR, 0.1, 0.7);
fx.whoosh(TW + 0.05, 0.45, 0.5); fx.drop(TW + 30 * FR, 0.5, 0.6);
fx.marker(TW + 0.75, 0.12, 1.0); fx.marker(TW + 0.85, 0.12, 1.0); write(TW + 0.9, 16, 24, 0.85, 0.3);
fx.crumple(TW + 1.25, 0.32, 1.0); fx.whoosh(TW + 1.6, 0.4, 0.5);
fx.whoosh(27.2, 0.55, 0.8);
fx.drop(P + 0.12, 0.9, 1.1); fx.tape(P + 14 * FR, 0.8);
fx.marker(G - 8 * FR, 0.3, 0.9); fx.printer(G + 14 * FR, 0.55, 1.0); write(G + 30 * FR, 15, 22, 0.85, 0.3);
fx.whoosh(30.8, 0.5, 0.8);
[0, 1, 2].forEach((i) => write(R + i * 6 * FR, 11, 30, 0.6, (i - 1) * 0.4)); fx.drop(R + 6 * FR + 0.15, 0.7);
fx.whoosh(R + 0.85, 0.35, 0.45); fx.drop(R + 1.2, 0.35, 0.6); fx.whoosh(R + 1.5, 0.35, 0.45); fx.drop(R + 1.85, 0.35, 0.6); fx.marker(R + 2.0, 0.22, 1.0);
glock(R + 1.2, 81, 0.6); glock(R + 1.85, 86, 0.7);
fx.whoosh(32.95, 0.5, 0.8);
fx.drop(V + 0.1, 0.9, 1.1); fx.tape(V + 12 * FR, 0.8); fx.drop(V + 0.82, 0.5, 0.7); fx.pin(V + 0.95, 0.7); fx.drop(V + 1.57, 0.5, 0.7); fx.press(WORD.noAccount + 0.08, 1.0);
fx.whoosh(36.5, 0.5, 0.8);
fx.drop(I + 0.08, 0.9, 1.1); fx.drop(I + 0.1, 0.4, 0.6); fx.peel(I + 8 * FR, 0.27, 1.0); fx.whoosh(I + 24 * FR, 0.4, 0.4); fx.press(I + 48 * FR, 1.0); glock(I + 48 * FR, 93, 0.6);
write(I + 52 * FR, 24, 26, 0.75, 0.3);
fx.whoosh(38.95, 0.55, 0.9);
// the kraft
const RC = AT.records, SC = AT.secure, Q = AT.quality;
fx.drop(RC - 10 * FR + 0.12, 1.0, 1.4);
{
  // the split-flap's flips, as SplitFlap times them (kit.tsx)
  const at = Math.round(RC * 60) + 2, dur = Math.round(1.85 * 60), flips = [9, 13, 17];
  flips.forEach((n, col) => { for (let k = 0; k < n; k++) fx.flap((at + Math.round(dur * (1 - Math.pow(1 - (k + 1) / n, 2.2)) * (0.75 + col * 0.12))) / 60 - 0.03, 0.75, (col - 1) * 0.3); });
}
for (let k = 0; k < 16; k++) fx.dymo(RC + 2.25 + k / 22, 0.8); fx.press(RC + 2.25 + 16 / 22 + 0.02, 0.6);
write(RC + 2.9, 26, 30, 0.7);
fx.whoosh(43.05, 0.5, 0.8);
fx.drop(SC - 12 * FR + 0.12, 0.8, 1.0);
const typeRun = (t, chars, cps) => { for (let k = 0; k < chars; k += 2) fx.type(t + k / cps, 0.7 + rnd() * 0.3); };
typeRun(SC - 2 * FR, 30, 46); typeRun(SC + 16 * FR, 27, 60); typeRun(SC + 30 * FR, 27, 60); typeRun(SC + 44 * FR, 27, 60);
fx.whoosh(WORD.aPlus - 0.12, 0.12, 0.6); fx.stamp(WORD.aPlus, 1.4);
fx.whoosh(45.3, 0.5, 0.8);
fx.drop(Q - 12 * FR + 0.12, 0.8, 1.1); fx.tape(Q + 4 * FR, 0.7); fx.tape(Q + 6 * FR, 0.6);
for (let i = 0; i < 5; i++) fx.press(WORD.rated + i * 8 * FR + 0.03, 0.75);
write(WORD.rated + 44 * FR, 8, 12, 1.1);
fx.whoosh(Q + 2.25 - 0.1, 0.1, 0.5); fx.stamp(Q + 2.25, 1.0);
// the pull back and home
fx.whoosh(49.1, 1.1, 0.9); fx.whoosh(50.6, 1.1, 0.9);
fx.press(51.18, 1.0);
for (const [t, n] of [[53.0, 18], [54.2, 36], [55.6, 54]]) { for (let k = 0; k < n; k++) fx.dymo(t + k / 22, 0.55 + rnd() * 0.15); fx.press(t + n / 22 + 0.03, 0.6); }
fx.page(58.3, 0.9, 1.0); fx.thump(59.32, 1.1);
into('bed');

// ================================ Under the voice, the room, the master ================================
const DUCK = new Float32Array(N).fill(1);
{
  const target = new Float32Array(N).fill(1), low = Math.pow(10, -10 / 20);
  for (const k of Object.keys(AT)) {
    const wav = readFileSync(join(root, 'public', 'paper', 'vo', `${k}.wav`));
    const rate = wav.readUInt32LE(24);
    let p = 12;
    while (wav.toString('ascii', p, p + 4) !== 'data') p += 8 + wav.readUInt32LE(p + 4);
    const n = wav.readUInt32LE(p + 4) / 2, w = Math.round(rate / 100), on = [];
    for (let j = 0; j + w <= n; j += w) {
      let e = 0;
      for (let q = 0; q < w; q++) e += (wav.readInt16LE(p + 8 + (j + q) * 2) / 32768) ** 2;
      if (10 * Math.log10(e / w + 1e-12) > -38) on.push(j / rate);
    }
    for (let q = 0; q < on.length; q++) {
      const a = on[q] - 0.05, b = (q + 1 < on.length && on[q + 1] - on[q] < 0.35 ? on[q + 1] : on[q] + 0.01) + 0.03;
      for (let i = Math.max(0, Math.floor((AT[k] + a) * SR)); i < Math.min(N, (AT[k] + b) * SR); i++) target[i] = low;
    }
  }
  const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.2 * SR));
  let g = 1;
  for (let i = 0; i < N; i++) { g += (target[i] - g) * (target[i] < g ? att : rel); DUCK[i] = g; }
}
function freeverb(input, room = 0.82, damp = 0.35, spread = 23) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225];
  const make = (off) => {
    const o = new Float32Array(input.length);
    for (const d0 of combs) {
      const d = d0 + off, buf = new Float32Array(d);
      let idx = 0, store = 0;
      for (let i = 0; i < input.length; i++) { const y = buf[idx]; store = y * (1 - damp) + store * damp; buf[idx] = input[i] * 0.015 + store * room; idx = (idx + 1) % d; o[i] += y; }
    }
    for (const d0 of alls) {
      const d = d0 + off, buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < o.length; i++) { const b = buf[idx], x = o[i]; o[i] = -x + b; buf[idx] = x + b * 0.5; idx = (idx + 1) % d; }
    }
    return o;
  };
  return [make(0), make(spread)];
}
const [BRL, BRR] = freeverb(SEND_BED);
const [FRL, FRR] = freeverb(SEND_FX, 0.7, 0.45);
// The bed is played softly (its instruments are plucked and struck); lift it 8 dB against
// the paper sounds and the stomps, which set the peak.
const BED_GAIN = Math.pow(10, 8 / 20);
const OL = new Float32Array(N), OR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const fade = clamp01((END - 0.05 - i / SR) / 0.7);
  OL[i] = Math.tanh(((BED[0][i] + BRL[i] * 0.85) * DUCK[i] * BED_GAIN + FX[0][i] + FRL[i] * 0.6) * 1.1) * fade;
  OR[i] = Math.tanh(((BED[1][i] + BRR[i] * 0.85) * DUCK[i] * BED_GAIN + FX[1][i] + FRR[i] * 0.6) * 1.1) * fade;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(OL[i]), Math.abs(OR[i]));
const gain = Math.pow(10, -5.5 / 20) / peak;
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { data.writeInt16LE(Math.round(OL[i] * gain * 32767), 44 + i * 4); data.writeInt16LE(Math.round(OR[i] * gain * 32767), 46 + i * 4); }
mkdirSync(join(root, 'public', 'paper'), {recursive: true});
writeFileSync(join(root, 'public', 'paper', 'score.wav'), data);
console.log(`paper/score.wav: ${(N / SR).toFixed(1)} s, gain ${gain.toFixed(2)}`);
