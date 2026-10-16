// Version I's sound ("model"), into public/model/score.wav. The voice carries it; under it a
// felt piano and a slow pad (C minor while the rooms are dark and the threads break, E-flat
// major once Hivelet connects them), glassy plinks as the windows light, the threads' hum,
// and what runs along them: rent coming in, a repair going out and coming back, a question.
// Times copy src/model/ModelFilm.tsx.
//
//   node capture/model-score.mjs

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AT = JSON.parse(readFileSync(join(root, 'src', 'model', 'vo-at.json'), 'utf8'));
const LEN = JSON.parse(readFileSync(join(root, 'src', 'model', 'vo.json'), 'utf8'));
const SCRIPT = JSON.parse(readFileSync(join(root, 'src', 'model', 'script.json'), 'utf8'));
const FR = 1 / 60;
const END = 49.5, OFF = END - 1.1;
const CUTS = [AT.sheet + 0.2, AT.pieces + 0.6, AT.ask + 0.2, AT.records + 0.6];
const SR = 44100, N = Math.ceil((END + 0.5) * SR);
const pair = () => [new Float32Array(N), new Float32Array(N)];
const BED = pair(), FX = pair(), SEND = new Float32Array(N);
let T = BED;
const into = (w) => { T = w === 'fx' ? FX : BED; };
function out(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  T[0][i] += v * Math.cos((pan + 1) * Math.PI / 4); T[1][i] += v * Math.sin((pan + 1) * Math.PI / 4);
  SEND[i] += v * send;
}
let seed = 31;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const noise = () => rnd() * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const decay = (tau, attack = 0.002) => (t) => Math.min(1, t / attack) * Math.exp(-t / tau);

function sine({freq, t0, dur, env, gain, pan = 0, send = 0}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) { const t = k / SR; ph += 2 * Math.PI * freq(t) / SR; out(a + k, Math.sin(ph) * env(t) * gain, pan, send); }
}
function band({t0, dur, centre, q, env, gain, pan = 0, send = 0}) {
  const a = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    if (k % 16 === 0) { const w = 2 * Math.PI * Math.min(centre(t), SR * 0.45) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; b0 = al / a0; b2 = -al / a0; a1 = -2 * Math.cos(w) / a0; a2 = (1 - al) / a0; }
    const x = noise(), y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out(a + k, y * env(t) * gain, pan, send);
  }
}
// A detuned saw through a moving low-pass: the pad.
function saw({f0, t0, t1, env, cutoff, gain, pan = 0, send = 0, detune = 0}) {
  const a = Math.floor(t0 * SR), b = Math.min(N, Math.floor(t1 * SR));
  let ph = rnd(), l1 = 0, l2 = 0, coef = 0;
  const dt = f0 * Math.pow(2, detune / 1200) / SR;
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
// A felt piano: soft hammer, a few partials, a long quiet decay.
function piano(t, m, g = 1, pan = 0) {
  for (const [r, a, tau] of [[1, 1, 2.4], [2, 0.35, 1.2], [3, 0.12, 0.6], [4.02, 0.05, 0.3]]) {
    sine({freq: () => hz(m) * r * (1 + 0.0004 * r), t0: t, dur: tau * 3.5, gain: 0.05 * g * a, pan, send: 0.5, env: decay(tau, 0.012)});
  }
  band({t0: t, dur: 0.05, centre: () => 1200, q: 0.8, gain: 0.01 * g, pan, env: decay(0.01, 0.002)});
}
const pad = (notes, t0, t1, g = 1, bright = 900) => notes.forEach((m, i) => [-6, 6].forEach((d) =>
  saw({f0: hz(m), t0, t1, detune: d + i, gain: 0.012 * g, pan: d / 20, send: 0.6, cutoff: (t) => bright + 200 * Math.sin(t * 0.8),
    env: (t) => clamp01(t / 1.6) * clamp01((t1 - t0 - t) / 1.2)})));
// Small, close sounds.
const tick = (t, g = 1, pan = 0, f0 = 3200) => band({t0: t, dur: 0.03, centre: () => f0, q: 1.4, gain: 0.05 * g, pan, env: decay(0.004, 0.0004)});
const key = (t, g = 1, pan = 0.1) => { band({t0: t, dur: 0.04, centre: () => 2600 + rnd() * 900, q: 1.1, gain: 0.07 * g, pan, env: decay(0.006, 0.0005)}); sine({freq: () => 220, t0: t, dur: 0.04, gain: 0.03 * g, pan, env: decay(0.01, 0.001)}); };
const pen = (t, dur, g = 1) => band({t0: t, dur, centre: (x) => 1900 + 400 * Math.sin(x * 30), q: 2.4, gain: 0.03 * g, pan: 0.1, env: (x) => Math.min(1, x / 0.03) * clamp01((dur - x) / 0.05) * (0.5 + 0.5 * Math.abs(Math.sin(x * 20)))});
const pop = (t, g = 1, m = 84) => { sine({freq: (x) => hz(m) * (1 + 0.6 * Math.exp(-x / 0.01)), t0: t, dur: 0.15, gain: 0.05 * g, env: decay(0.04, 0.001)}); };
const thud = (t, g = 1) => { sine({freq: (x) => 55 + 60 * Math.exp(-x / 0.03), t0: t, dur: 0.35, gain: 0.2 * g, env: decay(0.09, 0.001)}); band({t0: t, dur: 0.06, centre: () => 700, q: 0.8, gain: 0.08 * g, env: decay(0.015, 0.0008)}); };
const whoosh = (t, dur, g = 1) => band({t0: t, dur, centre: (x) => 500 + 1800 * Math.sin(Math.PI * x / dur), q: 0.9, gain: 0.025 * g, env: (x) => Math.pow(Math.sin(Math.PI * x / dur), 2)});
const ding = (t, m, g = 1, pan = 0) => { for (const [r, a, tau] of [[1, 1, 1.2], [2.76, 0.25, 0.4], [5.4, 0.08, 0.15]]) sine({freq: () => hz(m) * r, t0: t, dur: tau * 4, gain: 0.03 * g * a, pan, send: 0.5, env: decay(tau, 0.001)}); };

const clink = (t, m, g = 1, pan = 0) => { for (const [r, a, tau] of [[1, 1, 0.22], [2.32, 0.6, 0.12], [4.25, 0.35, 0.06], [6.63, 0.2, 0.03]]) sine({freq: () => hz(m) * r, t0: t, dur: tau * 5, gain: 0.02 * g * a, pan, send: 0.35, env: decay(tau, 0.0006)}); };
const hum = (t0, dur, g = 1) => { sine({freq: () => 110, t0, dur, gain: 0.004 * g, env: (x) => clamp01(x / 0.6) * clamp01((dur - x) / 0.6)}); sine({freq: () => 220.5, t0, dur, gain: 0.002 * g, env: (x) => clamp01(x / 0.6) * clamp01((dur - x) / 0.6)}); };
const glide = (t0, t1, m0, m1, g = 1) => sine({freq: (x) => hz(lerp(m0, m1, clamp01(x / (t1 - t0)))), t0, dur: t1 - t0, gain: 0.012 * g, send: 0.5, env: (x) => Math.sin(Math.PI * clamp01(x / (t1 - t0)))});

// ================= the music ======================================================================
into('bed');
pad([36, 43, 48, 51], 0.4, AT.connect, 0.9, 600);
[[AT.intro, 63, 0.55], [AT.rooms, 60, 0.55], [AT.sheet, 55, 0.5], [AT.sheet + 2.95, 58, 0.45], [AT.pieces, 56, 0.5], [AT.pieces + 1.1, 55, 0.45], [AT.pieces + 2.74, 53, 0.45]].forEach(([t, m, g]) => piano(t, m, g, -0.15));
const HIVE = AT.connect + 0.1;
pad([39, 51, 55, 58, 63, 67], HIVE - 0.1, AT.close, 1.2, 1300);
[[HIVE, 63], [HIVE + 0.22, 67], [HIVE + 0.44, 70], [HIVE + 0.66, 75]].forEach(([t, m], i) => piano(t, m, 0.85 - i * 0.08, 0.1));
sine({freq: () => 38.9, t0: HIVE - 0.1, dur: 3.5, gain: 0.12, env: (t) => Math.min(1, t / 0.4) * Math.exp(-t / 1.4)});
[[AT.gcash, 70], [AT.repair, 72], [AT.ask, 74], [AT.records, 75], [AT.proof, 77], [AT.proof + 1.9, 79]].forEach(([t, m]) => { piano(t, m, 0.55, 0.2); piano(t, m - 12, 0.3, -0.2); });
pad([39, 51, 58, 63, 67, 70], AT.close, END, 1.15, 1100);
[[AT.close, 75], [AT.close + 0.4, 79], [AT.close + 0.8, 82], [AT.close + 1.6, 87]].forEach(([t, m]) => piano(t, m, 0.6, 0.1));

// ================= the model ======================================================================
into('fx');
CUTS.forEach((t) => tick(t, 0.4, 0.15, 2600));
// thirty-two windows, each a small glassy plink as it lights
for (let k = 0; k < 32; k++) clink(AT.rooms + 1.4 + k * 0.045 + 0.05, 84 + [0, 3, 5, 7, 10, 12][k % 6], 0.35, (Math.sin(k * 2.1)) * 0.6);
for (let k = 0; k < 11; k++) tick(AT.pieces + 0.5 + k * 0.06, 0.25, (k - 5) * 0.1, 1800);
whoosh(HIVE + 0.2, 1.4, 1.2); hum(HIVE + 0.4, AT.close - HIVE, 1); ding(HIVE + 1.4, 87, 0.45);
for (let k = 0; k < 6; k++) { glide(AT.gcash + 0.2 + k * 0.25, AT.gcash + 1.4 + k * 0.25, 79, 86, 0.8); clink(AT.gcash + 1.4 + k * 0.25, 91, 0.4); }
tick(AT.gcash + 1.9, 1.0, 0, 2400); ding(AT.gcash + 2.05, 89, 0.45);
for (let k = 0; k < 6; k++) tick(AT.repair + 0.3 + k * 0.4, 0.5, -0.3, 1500);
glide(AT.repair + 0.6, AT.repair + 1.8, 74, 81, 0.9); glide(AT.repair + 2.0, AT.repair + 2.9, 86, 79, 0.9); ding(AT.repair + 2.9, 86, 0.45);
glide(AT.ask + 0.2, AT.ask + 1.2, 70, 77, 0.8); glide(AT.ask + 1.2, AT.ask + 2.3, 77, 84, 0.8); clink(AT.ask + 2.3, 89, 0.5);
for (let k = 1; k <= 60; k++) tick(AT.records + 0.2 + 1.4 * (k / 60), 0.12, 0.2, 4200);
thud(AT.proof + 0.9, 0.4); ding(AT.proof + 0.95, 88, 0.45);
glide(AT.proof + 2.4, AT.proof + 3.6, 62, 79, 0.9); ding(AT.proof + 3.7, 86, 0.45);
pop(AT.close + 2.1, 0.5, 76); for (let k = 0; k < 18; k++) key(AT.close + 2.4 + k * 0.05, 0.85);

// ================= under the voice, the room, the master ============================================
const DUCK = new Float32Array(N).fill(1);
{
  const target = new Float32Array(N).fill(1), low = Math.pow(10, -8 / 20);
  for (const k of Object.keys(AT)) {
    const wav = readFileSync(join(root, 'public', 'model', 'vo', `${k}.wav`));
    const rate = wav.readUInt32LE(24);
    let p = 12;
    while (wav.toString('ascii', p, p + 4) !== 'data') p += 8 + wav.readUInt32LE(p + 4);
    const n = wav.readUInt32LE(p + 4) / 2, w = Math.round(rate / 100), on = [];
    for (let j = 0; j + w <= n; j += w) { let e = 0; for (let q = 0; q < w; q++) e += (wav.readInt16LE(p + 8 + (j + q) * 2) / 32768) ** 2; if (10 * Math.log10(e / w + 1e-12) > -38) on.push(j / rate); }
    for (let q = 0; q < on.length; q++) {
      const a = on[q] - 0.05, b = (q + 1 < on.length && on[q + 1] - on[q] < 0.35 ? on[q + 1] : on[q] + 0.01) + 0.03;
      for (let i = Math.max(0, Math.floor((AT[k] + a) * SR)); i < Math.min(N, (AT[k] + b) * SR); i++) target[i] = low;
    }
  }
  const att = 1 - Math.exp(-1 / (0.04 * SR)), rel = 1 - Math.exp(-1 / (0.3 * SR));
  let g = 1;
  for (let i = 0; i < N; i++) { g += (target[i] - g) * (target[i] < g ? att : rel); DUCK[i] = g; }
}
function freeverb(input, room = 0.86, damp = 0.4, spread = 23) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225];
  const make = (off) => {
    const o = new Float32Array(input.length);
    for (const d0 of combs) { const d = d0 + off, buf = new Float32Array(d); let idx = 0, store = 0; for (let i = 0; i < input.length; i++) { const y = buf[idx]; store = y * (1 - damp) + store * damp; buf[idx] = input[i] * 0.015 + store * room; idx = (idx + 1) % d; o[i] += y; } }
    for (const d0 of alls) { const d = d0 + off, buf = new Float32Array(d); let idx = 0; for (let i = 0; i < o.length; i++) { const b = buf[idx], x = o[i]; o[i] = -x + b; buf[idx] = x + b * 0.5; idx = (idx + 1) % d; } }
    return o;
  };
  return [make(0), make(spread)];
}
const [RL, RR] = freeverb(SEND);
// a faint room tone under everything, and gone with the screen
into('bed');
band({t0: 0, dur: END, centre: () => 300, q: 0.5, gain: 0.004, env: (t) => clamp01(t / 0.5) * clamp01((OFF + 0.8 - t) / 0.6)});
const OL = new Float32Array(N), OR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const fade = clamp01((END - 0.05 - i / SR) / 0.8);
  OL[i] = Math.tanh(((BED[0][i]) * DUCK[i] + FX[0][i] + RL[i] * 0.8) * 1.1) * fade;
  OR[i] = Math.tanh(((BED[1][i]) * DUCK[i] + FX[1][i] + RR[i] * 0.8) * 1.1) * fade;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(OL[i]), Math.abs(OR[i]));
const gain = Math.pow(10, -9 / 20) / peak;
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { data.writeInt16LE(Math.round(OL[i] * gain * 32767), 44 + i * 4); data.writeInt16LE(Math.round(OR[i] * gain * 32767), 46 + i * 4); }
mkdirSync(join(root, 'public', 'model'), {recursive: true});
writeFileSync(join(root, 'public', 'model', 'score.wav'), data);
console.log(`model/score.wav: ${(N / SR).toFixed(1)} s, gain ${gain.toFixed(2)}`);
