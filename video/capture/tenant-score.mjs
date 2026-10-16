// Version D's sound (the tenant's phone), into public/tenant/score.wav: quiet, as the reference is. The
// voice carries it. Under it: a felt piano and a low pad, D minor while the problem is told,
// D major once the room turns green; and small, close sounds for what the screen does:
// the screen waking, soft ticks as the captions type, a pen drawing, receipts, chat pops,
// a dart's thunk on the target, the 937 counting, the address typed into the pill, and the
// click of the screen going dark. Timed to src/tenant/vo-at.json, vo.json and the scenes.
// The synths are the screen pitch's (capture/screen-score.mjs).
//
//   node capture/tenant-score.mjs

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AT = JSON.parse(readFileSync(join(root, 'src', 'tenant', 'vo-at.json'), 'utf8'));
const LEN = JSON.parse(readFileSync(join(root, 'src', 'tenant', 'vo.json'), 'utf8'));
const SCRIPT = JSON.parse(readFileSync(join(root, 'src', 'tenant', 'script.json'), 'utf8'));
const FR = 1 / 60;
const OFF = 37.4, END = 39;
const CUTS = [AT.vacant, AT.ask, AT.answer, AT.movein, AT.name].map((t) => t - 0.1);
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

// ================= the music ======================================================================
into('bed');
// a tenant's day: warm from the start, D major, a piano note on each phrase
pad([38, 50, 54, 57, 62], 0.3, AT.behind + 0.2, 1.0, 1000);
[[AT.find, 66], [AT.vacant, 69], [AT.ask, 71], [AT.answer, 74], [AT.movein, 69], [AT.gcash, 71], [AT.repair, 66], [AT.done, 74]].forEach(([t, m]) => piano(t, m, 0.6, 0.1));
// behind every screen: the pad deepens as the camera pulls back, and opens on the name
pad([31, 43, 50, 55, 59, 62], AT.behind, AT.name + 0.1, 1.1, 900);
[[AT.behind, 55], [AT.behind + 0.8, 59], [AT.behind + 1.6, 62]].forEach(([t, m]) => piano(t, m, 0.6, -0.1));
pad([38, 50, 57, 62, 66, 69], AT.name - 0.1, OFF + 0.5, 1.25, 1300);
[[AT.name, 74], [AT.name + 0.25, 78], [AT.name + 0.5, 81], [AT.name + 0.75, 86]].forEach(([t, m], i) => piano(t, m, 0.85 - i * 0.08, 0.1));
sine({freq: () => 36.7, t0: AT.name - 0.1, dur: 3.5, gain: 0.12, env: (t) => Math.min(1, t / 0.4) * Math.exp(-t / 1.4)});

// ================= the phone and the laptop ========================================================
into('fx');
thud(0.15, 0.2); ding(0.2, 93, 0.25);
CUTS.forEach((t) => tick(t, 0.6, 0.15, 2600));
// the plan drawing in; the unit marked
pen(AT.vacant + 1.0, 1.4, 0.8); pop(AT.vacant + 3.3, 0.6, 79);
// typing the question; sending it
for (let k = 0; k < 56; k += 2) key(AT.ask + (6 + k * 110 / 56) / 60, 0.55, 0.15);
tick(AT.ask + 120 / 60, 1.0, 0.1, 1500); pop(AT.ask + 126 / 60, 0.7, 79);
// her answer arriving
pop(AT.answer + 20 / 60, 0.8, 81); ding(AT.answer + 0.4, 88, 0.45);
// GCash: the tap, the payment page, the confirmation
const G = AT.gcash + 0.45;
tick(G - 4 / 60, 1.1, 0.1, 1500); whoosh(G, 0.5, 0.6); pop(G + 36 / 60, 0.8, 81); ding(G + 0.75, 88, 0.5);
// the repair typed and sent; done
for (let k = 0; k < 28; k += 2) key(AT.repair + (6 + k * 60 / 28) / 60, 0.55, 0.15);
tick(AT.repair + 90 / 60, 1.0, 0.1, 1500); pop(AT.repair + 92 / 60, 0.6, 76);
pop(AT.done + 0.55, 0.8, 81); ding(AT.done + 0.7, 86, 0.5);
// the pull back, and her laptop waking behind it
whoosh(25.6, 3.6, 0.9); thud(AT.behind + 0.3, 0.25); ding(AT.behind + 0.35, 90, 0.3);
// the name on both screens; the screens going dark
whoosh(AT.name - 0.15, 0.5, 1.2); ding(AT.name + 0.05, 86, 0.5);
tick(OFF, 1.0, 0.2, 1500); tick(OFF + 0.3, 1.0, -0.2, 1400); thud(OFF + 0.3, 0.25);

// ================= under the voice, the room, the master ============================================
const DUCK = new Float32Array(N).fill(1);
{
  const target = new Float32Array(N).fill(1), low = Math.pow(10, -8 / 20);
  for (const k of Object.keys(AT)) {
    const wav = readFileSync(join(root, 'public', 'tenant', 'vo', `${k}.wav`));
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
mkdirSync(join(root, 'public', 'tenant'), {recursive: true});
writeFileSync(join(root, 'public', 'tenant', 'score.wav'), data);
console.log(`tenant/score.wav: ${(N / SR).toFixed(1)} s, gain ${gain.toFixed(2)}`);
