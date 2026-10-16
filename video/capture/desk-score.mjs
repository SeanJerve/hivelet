// Version G's sound ("desk"), into public/desk/score.wav. The voice carries it; under it a
// felt piano and a slow pad (B minor over the things on her desk, D major once Hivelet opens,
// G and back to D at the close), and the desk's own sounds: keys settling on their ring, the
// phone buzzing, each object lifting off the lacquer and going through the glass, the verify
// button, the address typed, the screen going dark. Timed to src/desk/vo-at.json, vo.json and
// the cut and arrival times in src/desk/DeskFilm.tsx (C, S, IN below copy them).
//
//   node capture/desk-score.mjs

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AT = JSON.parse(readFileSync(join(root, 'src', 'desk', 'vo-at.json'), 'utf8'));
const LEN = JSON.parse(readFileSync(join(root, 'src', 'desk', 'vo.json'), 'utf8'));
const SCRIPT = JSON.parse(readFileSync(join(root, 'src', 'desk', 'script.json'), 'utf8'));
const FR = 1 / 60;
const OFF = 54.6, END = 56;
const C = {ledger: 21.0, invoice: 26.3, gcash: 29.6, repairs: 33.0, ask: 36.1, records: 40.1, secure: 43.75, quality: 45.85, close: 49.1};
const S = {open: AT.open + 0.7, ledger: C.ledger + 1.3, invoice: C.invoice + 0.9, gcash: C.gcash + 0.9, repairs: C.repairs + 0.9};
const PRESS = AT.gcash + 2.05;
const CUTS = [3.2, 6.9, 10.65, 13.85, 15.55, C.invoice, C.gcash, C.repairs, C.ask, C.records, C.secure, C.quality, C.close];
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

const clink = (t, m, g = 1, pan = 0) => { for (const [r, a, tau] of [[1, 1, 0.22], [2.32, 0.6, 0.12], [4.25, 0.35, 0.06], [6.63, 0.2, 0.03]]) sine({freq: () => hz(m) * r, t0: t, dur: tau * 5, gain: 0.022 * g * a, pan, send: 0.25, env: decay(tau, 0.0006)}); tick(t, 0.6 * g, pan, 5200); };
const buzz = (t, dur, g = 1) => saw({f0: 150, t0: t, t1: t + dur, cutoff: () => 600, gain: 0.03 * g, env: (x) => (Math.sin(x * 2 * Math.PI * 22) > 0 ? 1 : 0.15) * clamp01((dur - x) / 0.03)});
const click = (t, g = 1) => { tick(t, 1.2 * g, 0, 6000); band({t0: t, dur: 0.05, centre: () => 1200, q: 1, gain: 0.08 * g, env: decay(0.008, 0.0004)}); };
const hum = (t0, dur, up) => { sine({freq: () => 120, t0, dur, gain: 0.006, env: (x) => (up ? clamp01(x / 0.4) : clamp01(1 - x / dur))}); band({t0, dur, centre: () => 9000, q: 4, gain: 0.002, env: (x) => (up ? clamp01(x / 0.3) : clamp01(1 - x / dur))}); };
// something lifting off the lacquer and going through the glass: a rising air, a soft glassy pluck
const through = (t0, t1, m) => { whoosh(t0, t1 - t0, 0.9); sine({freq: (x) => hz(m - 12) * (1 + 0.5 * clamp01(x / (t1 - t0))), t0, dur: t1 - t0, gain: 0.006, env: (x) => Math.sin(Math.PI * clamp01(x / (t1 - t0)))}); ding(t1, m, 0.45); clink(t1, m + 12, 0.25); };

// ================= the music ======================================================================
into('bed');
pad([47, 54, 59, 62], 0.4, AT.open + 0.6, 0.95, 650);
[[AT.desk, 66, 0.6], [AT.rooms, 62, 0.6], [AT.usb, 59, 0.55], [AT.book, 62, 0.5], [AT.cash, 64, 0.45], [AT.chat, 61, 0.5]].forEach(([t, m, g]) => piano(t, m, g, -0.15));
piano(AT.open, 47, 0.8); piano(AT.open + 0.3, 54, 0.5);
const HIVE = S.open;
pad([38, 50, 54, 57, 62, 66], HIVE - 0.1, C.close, 1.2, 1300);
[[HIVE, 62], [HIVE + 0.22, 66], [HIVE + 0.44, 69], [HIVE + 0.66, 74]].forEach(([t, m], i) => piano(t, m, 0.85 - i * 0.08, 0.1));
sine({freq: () => 36.7, t0: HIVE - 0.1, dur: 3.5, gain: 0.12, env: (t) => Math.min(1, t / 0.4) * Math.exp(-t / 1.4)});
[[AT.ledger, 69], [AT.invoice, 71], [AT.gcash, 73], [AT.repairs, 74], [AT.ask, 76], [AT.records, 78], [AT.secure, 81], [AT.quality, 83]].forEach(([t, m]) => { piano(t, m, 0.55, 0.2); piano(t, m - 12, 0.3, -0.2); });
pad([43, 55, 59, 62, 67, 71], C.close, C.close + 2.4, 1.1, 1100);
pad([38, 50, 57, 62, 66, 69], C.close + 2.3, OFF + 0.6, 1.1, 1100);
[[AT.close, 74], [AT.close + 0.4, 78], [AT.close + 0.8, 81], [AT.close + 2.4, 86]].forEach(([t, m]) => piano(t, m, 0.65, 0.1));

// ================= what happens on screen ==========================================================
into('fx');
hum(0.05, 0.6, true);
CUTS.forEach((t) => tick(t, 0.5, 0.15, 2600));
// the keys settle on their ring as the film opens
[0.35, 0.5, 0.58, 0.8].forEach((t, i) => clink(t, 94 + i, 0.35, -0.4));
buzz(AT.chat, 0.5, 1); buzz(AT.chat + 0.9, 0.35, 0.7);
whoosh(S.open - 0.1, 0.5, 1.4); ding(S.open + 0.1, 86, 0.5);
through(C.ledger + 0.5, S.ledger, 81);
for (let i = 0; i < 7; i++) key(S.ledger + 0.4 + i * 0.32, 0.5);
for (let k = 0; k < 14; k++) tick(S.ledger + 2.9 + k * 0.07, 0.45, 0.2, 3000 + k * 60);
ding(S.ledger + 3.9, 88, 0.4);
through(C.invoice + 0.1, S.invoice, 83);
for (let k = 0; k < 4; k++) key(S.invoice + 0.9 + k * 0.12, 0.8);
ding(S.invoice + 1.6, 88, 0.4);
for (let i = 0; i < 8; i++) clink(C.gcash + 0.1 + i * 0.06 + 0.8, 92 + (i % 3), 0.35, (i - 4) * 0.1);
through(C.gcash + 0.1, S.gcash, 85);
click(PRESS, 0.9); ding(PRESS + 0.2, 89, 0.5);
through(C.repairs + 0.1, S.repairs, 86);
[0.3, 0.9].forEach((d) => whoosh(S.repairs + d, 0.4, 0.5)); ding(S.repairs + 1.4, 88, 0.4);
for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) key(C.ask + 0.4 + i * 0.45 + k * 0.06, 0.5);
pen(C.ask + 2.2, 0.4, 1.2);
{ for (let k = 1; k <= 100; k++) tick(C.records + 0.1 + 1.4 * (1 - Math.pow(1 - k / 100, 1 / 2)), 0.13, 0.2, 4200); thud(C.records + 1.5, 0.3); }
thud(C.secure + 0.6, 0.55); ding(C.secure + 0.65, 88, 0.5);
sine({freq: (x) => hz(lerp(62, 79, 1 - Math.pow(1 - clamp01(x / 1.0), 3))), t0: C.quality + 0.6, dur: 1.3, gain: 0.016, send: 0.4, env: (x) => Math.min(1, x / 0.1) * clamp01((1.3 - x) / 0.3)});
ding(C.quality + 1.6, 86, 0.45);
pop(C.close + 2.4, 0.5, 76); for (let k = 0; k < 18; k++) key(C.close + 2.7 + k * 0.05, 0.85); tick(C.close + 3.8, 0.6, 0, 3000);
click(OFF, 0.8); hum(OFF, 0.5, false);

// ================= under the voice, the room, the master ============================================
const DUCK = new Float32Array(N).fill(1);
{
  const target = new Float32Array(N).fill(1), low = Math.pow(10, -8 / 20);
  for (const k of Object.keys(AT)) {
    const wav = readFileSync(join(root, 'public', 'desk', 'vo', `${k}.wav`));
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
mkdirSync(join(root, 'public', 'desk'), {recursive: true});
writeFileSync(join(root, 'public', 'desk', 'score.wav'), data);
console.log(`desk/score.wav: ${(N / SR).toFixed(1)} s, gain ${gain.toFixed(2)}`);
