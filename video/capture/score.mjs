// Synthesizes the film's score into public/score.wav, timed to src/timeline.json.
//
//   Act 1 (the old way): a low drone and a heartbeat that quickens, a soft low
//   hit on each problem, a tension cluster under "Nothing connected", a riser,
//   a moment of silence, then a deep brass hit as the hive becomes the icon.
//   The product: a warm chord bed in A major with soft plucks and a quiet pulse.
//   The end: a lighter hit and a last held chord.
//
// Everything is generated here, so there is nothing to license. Seeded, so the
// same file comes out every time.   node capture/score.mjs

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(readFileSync(join(root, 'src', 'timeline.json'), 'utf8'));
const start = {};
let frames = 0;
for (const s of tl.scenes) { start[s.id] = frames / tl.fps; frames += s.frames; }
const TOTAL = frames / tl.fps;
const sec = (f) => f / tl.fps;
const BEATS = tl.act1.beats.map(sec);
const SNAP = sec(tl.act1.connected + 92);
const HIVE = sec(tl.act1.hive);
const BRAAM = sec(tl.act1.braam);

const SR = 44100;
const N = Math.ceil((TOTAL + 3) * SR);
const L = new Float32Array(N), R = new Float32Array(N), W = new Float32Array(N);

let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const noise = () => rnd() * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;

function out(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.cos((pan + 1) * Math.PI / 4);
  R[i] += v * Math.sin((pan + 1) * Math.PI / 4);
  W[i] += v * send;
}

// A band-limited saw (polyBLEP) through a two-pole low-pass whose cutoff moves.
function sawVoice({f0, t0, t1, env, cutoff, gain, pan = 0, send = 0, detune = 0}) {
  const a = Math.floor(t0 * SR), b = Math.min(N, Math.floor(t1 * SR));
  let ph = rnd(), l1 = 0, l2 = 0, coef = 0;
  const f = f0 * Math.pow(2, detune / 1200);
  const dt = f / SR;
  for (let i = a; i < b; i++) {
    const t = (i - a) / SR;
    if ((i - a) % 32 === 0) coef = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff(t), SR * 0.45) / SR);
    ph += dt; if (ph >= 1) ph -= 1;
    let s = 2 * ph - 1;
    if (ph < dt) { const x = ph / dt; s -= x + x - x * x - 1; } else if (ph > 1 - dt) { const x = (ph - 1) / dt; s -= x * x + x + x + 1; }
    l1 += coef * (s - l1); l2 += coef * (l1 - l2);
    out(i, l2 * env(t) * gain, pan, send);
  }
}
function sineVoice({freq, t0, dur, env, gain, pan = 0, send = 0}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    ph += 2 * Math.PI * freq(t) / SR;
    out(a + k, Math.sin(ph) * env(t) * gain, pan, send);
  }
}
function noiseVoice({t0, dur, centre, q, env, gain, pan = 0, send = 0}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    if (k % 32 === 0) {
      const w = 2 * Math.PI * Math.min(centre(t), SR * 0.45) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
      b0 = al / a0; b2 = -al / a0; a1 = -2 * Math.cos(w) / a0; a2 = (1 - al) / a0;
    }
    const x = noise();
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out(a + k, y * env(t) * gain, pan, send);
  }
}
const decay = (tau, attack = 0.003) => (t) => Math.min(1, t / attack) * Math.exp(-t / tau);

// ---- Act 1: the drone ------------------------------------------------------------
const CUT = BRAAM - 0.09; // a breath of silence before the hit
const droneEnv = (fadeIn, gainEnd = 1) => (t) => clamp01(t / fadeIn) * lerp(0.8, gainEnd, clamp01(t / CUT)) * (t > CUT - 0.04 ? clamp01((CUT - t) / 0.04) : 1);
sineVoice({freq: () => 55, t0: 0, dur: CUT, env: droneEnv(4, 1.1), gain: 0.13});
for (const [f0, g] of [[110, 0.07], [164.81, 0.05]]) {
  for (const d of [-7, 7]) {
    sawVoice({f0, t0: 0, t1: CUT, detune: d, gain: g, pan: d / 20, send: 0.25, env: droneEnv(5), cutoff: (t) => 220 + 420 * Math.pow(clamp01(t / CUT), 1.6) + 40 * Math.sin(t * 0.7)});
  }
}
// Minor colour and a high tension cluster from "Nothing connected" on.
const tense = sec(tl.act1.connected);
for (const d of [-6, 6]) sawVoice({f0: 130.81, t0: tense, t1: CUT, detune: d, gain: 0.045, send: 0.3, env: (t) => clamp01(t / 2.5) * (t > CUT - tense - 0.04 ? 0 : 1), cutoff: () => 700});
for (const fq of [880, 932.33]) {
  sineVoice({freq: () => fq, t0: tense, dur: CUT - tense, gain: 0.02, pan: fq > 900 ? 0.4 : -0.4, send: 0.5,
    env: (t) => clamp01(t / (CUT - tense)) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 5.5 * t))});
}

// The heartbeat, quickening toward the hive, stopping just before the hit.
for (let t = 1.6; t < CUT - 0.5; ) {
  const thump = (at, g) => sineVoice({freq: (x) => lerp(66, 42, clamp01(x / 0.09)), t0: at, dur: 0.5, gain: g, env: decay(0.17, 0.004)});
  thump(t, 0.4); thump(t + 0.24, 0.22);
  t += lerp(1.3, 0.6, clamp01(t / (CUT - 1)));
}

// A soft low hit on "33 units", on each problem, and on the snap.
const boom = (at, g) => {
  sineVoice({freq: (x) => lerp(52, 36, clamp01(x / 0.5)), t0: at, dur: 2.2, gain: g, env: decay(0.9, 0.006), send: 0.2});
  noiseVoice({t0: at, dur: 0.4, centre: () => 180, q: 0.8, gain: g * 0.5, env: decay(0.06), send: 0.3});
};
boom(0.62, 0.34);
BEATS.forEach((b) => boom(b + 0.45, 0.3));
boom(SNAP, 0.34);

// The riser into the hive.
noiseVoice({t0: HIVE, dur: CUT - HIVE, centre: (t) => 200 * Math.pow(26, clamp01(t / (CUT - HIVE))), q: 1.4, gain: 0.42, send: 0.3,
  env: (t) => Math.pow(clamp01(t / (CUT - HIVE)), 2.2)});
sineVoice({freq: (t) => 110 * Math.pow(8, clamp01(t / (CUT - HIVE))), t0: HIVE, dur: CUT - HIVE, gain: 0.06, send: 0.4,
  env: (t) => Math.pow(clamp01(t / (CUT - HIVE)), 1.6) * (0.6 + 0.4 * Math.sin(2 * Math.PI * lerp(4, 16, t / (CUT - HIVE)) * t))});

// ---- The brass hit ---------------------------------------------------------------
function braam(at, g) {
  const len = 5.5;
  const a = Math.floor(at * SR), n = Math.floor(len * SR);
  const tmpL = new Float32Array(n), tmpR = new Float32Array(n), tmpW = new Float32Array(n);
  const saveL = L, saveR = R;
  const voices = [[55, 0.5, -3], [55, 0.4, 5], [82.41, 0.3, 0], [110, 0.34, -4], [110, 0.28, 4], [220, 0.1, 0]];
  for (const [f0, vg, d] of voices) {
    sawVoice({f0, t0: at, t1: at + len, detune: d, gain: vg * g, pan: d / 12, send: 0.4,
      env: (t) => Math.min(1, t / 0.025) * Math.exp(-t / 2.1),
      cutoff: (t) => (t < 0.06 ? 150 + 2600 * (t / 0.06) : 420 + 2300 * Math.exp(-(t - 0.06) / 0.55))});
  }
  sineVoice({freq: (t) => lerp(58, 44, clamp01(t / 1.2)), t0: at, dur: len, gain: 0.55 * g, env: decay(2.4, 0.01)});
  noiseVoice({t0: at, dur: 0.8, centre: () => 900, q: 0.6, gain: 0.25 * g, env: decay(0.12), send: 0.5});
  // Gentle saturation over the hit's own span, for weight.
  for (let i = a; i < a + n && i < N; i++) { L[i] = Math.tanh(L[i] * 1.6) / 1.2; R[i] = Math.tanh(R[i] * 1.6) / 1.2; }
  void tmpL; void tmpR; void tmpW; void saveL; void saveR;
}
braam(BRAAM, 1);

// ---- The product: a warm bed -----------------------------------------------------
const BEAT = 60 / 90; // 90 bpm
const BAR = BEAT * 4;
const n = (semi) => 440 * Math.pow(2, (semi - 9) / 12 - 4); // semitones from C0
const CHORDS = [
  [n(33), n(40), n(45), n(49), n(59)], // A add9
  [n(30), n(37), n(45), n(52)],        // F#m7
  [n(26), n(33), n(42), n(49), n(52)], // D maj9
  [n(28), n(35), n(40), n(44), n(47)], // E
];
const bedStart = BRAAM + 0.1;
const bedEnd = TOTAL + 1.5;
const fadeOut = (t) => clamp01((TOTAL - 0.5 - t) / 3);
for (let t = bedStart, c = 0; t < bedEnd; t += BAR, c++) {
  const chord = CHORDS[t >= start.end ? 0 : c % 4];
  const isLast = t >= start.end;
  const dur = isLast ? bedEnd - t : BAR + 1.3;
  for (const f0 of chord) {
    for (const d of [-5, 5]) {
      sawVoice({f0, t0: t, t1: Math.min(bedEnd, t + dur), detune: d, pan: d / 12, send: 0.5, gain: 0.044 * (f0 > 400 ? 0.7 : 1) * (t >= start.proof ? 1.3 : 1),
        env: (x) => clamp01(x / 0.9) * clamp01((dur - x) / 1.2) * (t < bedStart + 0.01 ? clamp01(x / 2.6) : 1) * fadeOut(t + x),
        cutoff: (x) => 900 + 350 * Math.sin((t + x) * 0.35)});
    }
  }
  if (isLast) break;
}

// Soft plucks: eighth notes through the chord, from the Overview to the end card.
const pluckStart = start.overview, pluckEnd = start.end;
const firstBar = bedStart + Math.ceil((pluckStart - bedStart) / BAR) * BAR;
for (let t = firstBar, k = 0; t < pluckEnd; t += BEAT / 2, k++) {
  const bar = Math.floor((t - bedStart) / BAR) % 4;
  const chord = CHORDS[bar];
  const pattern = [0, 2, 3, 1, 3, 2, 4, 2];
  const note = chord[Math.min(chord.length - 1, pattern[k % 8])] * (chord[pattern[k % 8] % chord.length] < 300 ? 4 : 2);
  const build = t > start.proof ? 1.25 : 1;
  sineVoice({freq: () => note, t0: t, dur: 0.9, gain: 0.08 * build, pan: k % 2 ? 0.35 : -0.35, send: 0.45, env: decay(0.26, 0.004)});
  sineVoice({freq: () => note * 2, t0: t, dur: 0.4, gain: 0.022 * build, pan: k % 2 ? 0.35 : -0.35, send: 0.45, env: decay(0.12, 0.003)});
}
// A quiet pulse on beats one and three.
for (let t = firstBar; t < start.proof; t += BEAT * 2) {
  sineVoice({freq: (x) => lerp(60, 44, clamp01(x / 0.08)), t0: t, dur: 0.4, gain: 0.24, env: decay(0.14, 0.004)});
}
// The proof builds: soft hats on the off-beats, and a short riser into the end card.
for (let t = start.proof + BEAT / 2; t < start.end - 0.1; t += BEAT) {
  noiseVoice({t0: t, dur: 0.12, centre: () => 8000, q: 0.9, gain: 0.05, env: decay(0.025), pan: 0.2});
}
noiseVoice({t0: start.end - 1.6, dur: 1.55, centre: (t) => 400 * Math.pow(12, t / 1.55), q: 1.2, gain: 0.22, send: 0.4, env: (t) => Math.pow(t / 1.55, 2)});

// Chapter cards: a soft swell into each, and a small shimmer on the card.
for (const id of ['ch-landlady', 'ch-tenants', 'ch-guests']) {
  const at = start[id];
  noiseVoice({t0: at - 1.0, dur: 1.2, centre: (t) => 1500 * Math.pow(4, t / 1.2), q: 0.9, gain: 0.1, send: 0.5, env: (t) => Math.pow(clamp01(t / 1.1), 2) * clamp01((1.2 - t) / 0.1)});
  for (const f0 of [880, 1108.73, 1318.51]) sineVoice({freq: () => f0, t0: at + 0.1, dur: 2.5, gain: 0.018, send: 0.7, env: decay(1.1, 0.02), pan: (f0 - 1100) / 600});
}

// The end: a lighter hit.
braam(start.end, 0.5);

// ---- Room and master ---------------------------------------------------------------
function freeverb(input, room = 0.86, damp = 0.3, spread = 23) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const make = (off) => {
    const o = new Float32Array(input.length);
    for (const d0 of combs) {
      const d = d0 + off, buf = new Float32Array(d);
      let idx = 0, store = 0;
      for (let i = 0; i < input.length; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = input[i] * 0.015 + store * room;
        idx = (idx + 1) % d;
        o[i] += y;
      }
    }
    for (const d0 of alls) {
      const d = d0 + off, buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < o.length; i++) {
        const b = buf[idx], x = o[i];
        o[i] = -x + b; buf[idx] = x + b * 0.5; idx = (idx + 1) % d;
      }
    }
    return o;
  };
  return [make(0), make(spread)];
}
const [RL, RR] = freeverb(W);
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh((L[i] + RL[i] * 0.9) * 1.05);
  R[i] = Math.tanh((R[i] + RR[i] * 0.9) * 1.05);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.85 / peak;
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4);
}
mkdirSync(join(root, 'public'), {recursive: true});
writeFileSync(join(root, 'public', 'score.wav'), data);
console.log(`score.wav: ${(N / SR).toFixed(1)}s, braam at ${BRAAM.toFixed(2)}s, peak scaled by ${gain.toFixed(2)}`);
