// Synthesizes the video's sound effects from scratch into public/sfx/*.wav:
// camera swipes, mouse clicks, phone taps, pops, pings, blings, key taps, a
// riser and an impact. Nothing is downloaded, so there is no licence to track.
// Seeded, so every run writes the same files.
//
//   node capture/sfx.mjs

import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const SR = 44100;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');
mkdirSync(out, {recursive: true});

let seed = 20260929;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

// RBJ band-pass whose centre can move every sample.
function bandpass(x, centreAt, q) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = Math.min(SR * 0.45, Math.max(20, centreAt(i / SR)));
    const w = (2 * Math.PI * f) / SR, alpha = Math.sin(w) / (2 * q), cw = Math.cos(w);
    const a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0, a1 = (-2 * cw) / a0, a2 = (1 - alpha) / a0;
    const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function lowpass(x, cutoff) {
  const y = new Float32Array(x.length);
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let p = 0;
  for (let i = 0; i < x.length; i++) { p = (1 - a) * x[i] + a * p; y[i] = p; }
  return y;
}
function highpass(x, cutoff) {
  const lp = lowpass(x, cutoff);
  return x.map((v, i) => v - lp[i]);
}
// A small room, so pings ring instead of stopping dead.
function room(x, mix = 0.18) {
  const y = Float32Array.from(x);
  for (const [d, g] of [[1531, 0.5], [2203, 0.42], [3119, 0.33]]) {
    for (let i = d; i < y.length; i++) y[i] += g * mix * y[i - d];
  }
  return y;
}
const tone = (b, at, freq, decay, amp = 1, attack = 0.002) => {
  const s = Math.floor(at * SR);
  for (let i = s; i < b.length; i++) {
    const t = (i - s) / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    if (env < 1e-4 && t > attack) break;
    b[i] += amp * env * Math.sin(2 * Math.PI * (typeof freq === 'function' ? freq(t) : freq * t));
  }
};
// Phase-accurate glide: integrate the frequency.
const glide = (b, at, f0, f1, dur, decay, amp = 1) => {
  const s = Math.floor(at * SR);
  let ph = 0;
  for (let i = s; i < b.length; i++) {
    const t = (i - s) / SR;
    const f = f0 * Math.pow(f1 / f0, Math.min(1, t / dur));
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / decay);
    if (env < 1e-4 && t > 0.01) break;
    b[i] += amp * env * Math.sin(ph);
  }
};
const burst = (b, at, decay, amp, hp = 0) => {
  const s = Math.floor(at * SR);
  const n = new Float32Array(Math.ceil(decay * 8 * SR));
  for (let i = 0; i < n.length; i++) n[i] = noise() * Math.exp(-(i / SR) / decay);
  const f = hp ? highpass(n, hp) : n;
  for (let i = 0; i < f.length && s + i < b.length; i++) b[s + i] += amp * f[i];
};

function normalize(x, peak = 0.89) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return m ? x.map((v) => (v / m) * peak) : x;
}
function write(name, left, right = left, peak) {
  const L = normalize(left, peak), R = normalize(right, peak);
  const n = Math.max(L.length, R.length);
  const data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 4, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] ?? 0)) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] ?? 0)) * 32767), 46 + i * 4);
  }
  writeFileSync(join(out, `${name}.wav`), data);
  console.log('wrote', name);
}

// Camera swipes: a band of noise sweeping up and down, panned across.
function whoosh(name, dur, lo, hi, q, pan = true) {
  const n = buf(dur);
  for (let i = 0; i < n.length; i++) n[i] = noise();
  const f = bandpass(n, (t) => {
    const p = t / dur;
    return p < 0.6 ? lo * Math.pow(hi / lo, p / 0.6) : hi * Math.pow(lo / hi, (p - 0.6) / 0.4) * 1.4;
  }, q);
  const L = new Float32Array(f.length), R = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const p = i / f.length;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(p, 0.8)), 2);
    const side = pan ? p : 0.5;
    L[i] = f[i] * env * Math.cos((side * Math.PI) / 2);
    R[i] = f[i] * env * Math.sin((side * Math.PI) / 2);
  }
  write(name, L, R);
}
whoosh('whoosh', 0.42, 280, 3800, 0.9);
whoosh('swipe', 0.26, 600, 6500, 1.1);
whoosh('whoosh-low', 0.8, 120, 1600, 0.7);

// Mouse click: a sharp press and a softer release.
{
  const b = buf(0.14);
  burst(b, 0, 0.0009, 1, 1800); tone(b, 0, 3300, 0.006, 0.35);
  burst(b, 0.068, 0.0007, 0.55, 2400); tone(b, 0.068, 3900, 0.004, 0.2);
  write('click', b);
}
// Phone tap: rounder and lower.
{
  const b = buf(0.12);
  tone(b, 0, 1150, 0.014, 1); burst(b, 0, 0.0015, 0.35, 900);
  write('tap', lowpass(b, 6000));
}
// Pop: a quick upward bubble, for pieces arriving.
{
  const b = buf(0.18);
  glide(b, 0, 320, 1150, 0.04, 0.035, 1); burst(b, 0, 0.001, 0.15, 3000);
  write('pop', b);
}
// Key tap, three variants so typing does not sound like a machine gun.
[2100, 2500, 1850].forEach((f, k) => {
  const b = buf(0.06);
  burst(b, 0, 0.0012, 0.8, 1500); tone(b, 0, f, 0.007, 0.45);
  write(`key${k + 1}`, b);
});
// Tick: the smallest sound, for counters running.
{
  const b = buf(0.03);
  burst(b, 0, 0.0006, 1, 4000);
  write('tick', b, b, 0.6);
}
// Ping and bling: bells with two partials, in a small room.
{
  const b = buf(1.1);
  tone(b, 0, 1568, 0.32, 1); tone(b, 0, 3136, 0.16, 0.35); tone(b, 0, 4704, 0.08, 0.12);
  write('ping', room(b));
}
{
  const L = buf(1.2);
  tone(L, 0, 1318.5, 0.3, 0.9); tone(L, 0, 2637, 0.14, 0.3);
  tone(L, 0.075, 1975.5, 0.42, 1); tone(L, 0.075, 3951, 0.18, 0.3);
  const R = new Float32Array(L.length);
  R.set(L.subarray(0, L.length - 530), 530);
  write('bling', room(L), room(R));
}
// Chime: a rising arpeggio for something completed.
{
  const b = buf(1.4);
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => { tone(b, i * 0.055, f, 0.4, 0.8); tone(b, i * 0.055, f * 2, 0.15, 0.2); });
  write('chime', room(b, 0.22));
}
// Warning: two soft falling tones, noticeable without alarm.
{
  const b = buf(0.5);
  for (const [at, f] of [[0, 880], [0.11, 698.5]]) { tone(b, at, f, 0.09, 0.9); tone(b, at, f * 3, 0.05, 0.18); }
  write('warn', room(b, 0.12));
}
// Snap: two cracks, for a link breaking.
{
  const b = buf(0.2);
  burst(b, 0, 0.004, 1, 1400); burst(b, 0.035, 0.003, 0.6, 2200);
  write('snap', b);
}
// Riser: noise climbing into the reveal.
{
  const dur = 1.6;
  const n = buf(dur);
  for (let i = 0; i < n.length; i++) n[i] = noise();
  const f = bandpass(n, (t) => 180 * Math.pow(7000 / 180, Math.pow(t / dur, 1.6)), 1.8);
  const b = f.map((v, i) => v * Math.pow(i / f.length, 2.2));
  glide(b, 0, 110, 880, dur, 9, 0.12);
  write('riser', b);
}
// Impact: a deep hit with a bright edge, for the logo.
{
  const b = buf(2.2);
  glide(b, 0, 160, 42, 0.22, 0.55, 1);
  tone(b, 0, 44, 1.1, 0.5, 0.004);
  const n = buf(0.5);
  burst(n, 0, 0.06, 0.8, 0);
  const nl = lowpass(n, 1100);
  for (let i = 0; i < nl.length; i++) b[i] += nl[i];
  write('impact', room(b, 0.15));
}

// ---- The softer set, for the third cut ----------------------------------------
// Air: a slow, low swell of breath-like noise that rises and falls over the
// length of a camera move, instead of a sharp whoosh. Three lengths, so the
// sound lasts exactly as long as the motion it sits under.
function air(name, dur, lo, hi) {
  const n = buf(dur);
  for (let i = 0; i < n.length; i++) n[i] = noise();
  const f = lowpass(bandpass(n, (t) => {
    const p = t / dur;
    return lo * Math.pow(hi / lo, Math.sin(Math.PI * p));
  }, 0.55), 2400);
  const L = new Float32Array(f.length), R = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const p = i / f.length;
    const env = Math.pow(Math.sin(Math.PI * p), 1.6);
    const pan = 0.5 + 0.35 * Math.sin(Math.PI * (p - 0.5));
    L[i] = f[i] * env * Math.cos(pan * Math.PI / 2);
    R[i] = f[i] * env * Math.sin(pan * Math.PI / 2);
  }
  write(name, L, R, 0.5);
}
air('air-short', 0.9, 350, 1500);
air('air', 1.7, 260, 1200);
air('air-long', 3.4, 180, 900);

// Blip: a soft rounded tone for something arriving on screen.
{
  const b = buf(0.3);
  glide(b, 0, 740, 990, 0.05, 0.09, 1);
  tone(b, 0.004, 1980, 0.03, 0.12);
  write('blip', lowpass(room(b, 0.2), 7000), undefined, 0.55);
}
// Soft click: a trackpad click rather than a mouse button.
{
  const b = buf(0.1);
  tone(b, 0, 1500, 0.006, 1, 0.0008); burst(b, 0, 0.0008, 0.35, 1200);
  tone(b, 0.055, 1800, 0.004, 0.45, 0.0008);
  write('soft-click', lowpass(b, 6000), undefined, 0.6);
}
// Bell: a gentle notification, two partials with a slow attack.
{
  const L = buf(1.6);
  tone(L, 0, 1318.5, 0.55, 0.8, 0.006); tone(L, 0, 2637, 0.2, 0.15, 0.006);
  tone(L, 0.09, 1760, 0.7, 0.9, 0.006); tone(L, 0.09, 3520, 0.25, 0.12, 0.006);
  const R = new Float32Array(L.length);
  R.set(L.subarray(0, L.length - 400), 400);
  write('bell', room(L, 0.3), room(R, 0.3), 0.6);
}
// Soft warning: two rounded falling tones.
{
  const b = buf(0.8);
  tone(b, 0, 783.99, 0.16, 0.9, 0.01); tone(b, 0.16, 659.25, 0.22, 0.9, 0.01);
  write('soft-warn', room(b, 0.25), undefined, 0.6);
}
// Shimmer: a bright cluster that blooms and fades, for a reveal.
{
  const b = buf(3.2);
  [1760, 2217.46, 2637, 3520].forEach((f, i) => tone(b, i * 0.07, f, 1.1, 0.5, 0.25));
  write('shimmer', room(room(b, 0.35), 0.3), undefined, 0.5);
}
