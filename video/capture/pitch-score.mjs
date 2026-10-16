// Synthesizes the one-minute pitch's score into public/pitch/score.wav, timed to the
// voice (src/pitch/vo-at.json and vo.json) and the scenes (SCENES in src/pitch/timeline.ts).
//
//   0 to 18.5 s, the old way, in D minor (Dm, Bb, Gm, then A): a sub drone, a dark pad
//   that slowly opens, and a clock. A struck-metal hit as "33" and "1" land and as each
//   problem arrives; a sixteenth-note pulse from the spreadsheet on; a glitch as
//   "Nothing connected" breaks up; a snare roll and a rising tone, then a hard stop, so
//   "So we built Hivelet" is said into silence. A reversed chord draws in to the drop.
//   20 s, the drop, as the mark fills: a sub hit, a crash and a wide D major chord.
//   20 to 40 s, the product, at 120 bpm: D, A, B minor, G, four on the floor, claps,
//   hats, an off-beat bass and pads that pump with the kick, and a plucked hook with a
//   dotted-eighth echo. A snare pickup and a crash land each thread wipe.
//   40 to 50.75 s, the proof: half time under 937, a build, a stop on "Graded", the A+
//   hit, then the groove again with the chords changing twice as fast under 4.53.
//   50.75 s, a reversed swell into the name and a last hit; the hook, slowed, under the
//   close; a bell for each name of the team; a held chord to the end.
//
// The music steps back 8 dB under every phrase of the voice, so the words always sit on
// top; the hits on the slams are not ducked. Everything is generated here, so there is
// nothing to license. Seeded, so the same file comes out every time.
//
//   node capture/pitch-score.mjs

import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const AT = JSON.parse(read('src/pitch/vo-at.json'));
const LEN = JSON.parse(read('src/pitch/vo.json'));
const SCN = {};
for (const m of read('src/pitch/timeline.ts').matchAll(/(\w+): \[([\d.]+), ([\d.]+)\]/g)) SCN[m[1]] = [+m[2], +m[3]];

// ---- The picture's moments (seconds) ---------------------------------------------------
const FR = 1 / 60;
const LAND = 0.03;                                  // a slam reads as landed this long after its frame
const HIT_33 = AT.units + LAND;                     // "33" (ActOne Hook: Slam at units)
const HIT_1 = AT.landlady + 2 * FR + LAND;          // "1" (Slam at landlady + 2)
const PANELS = [AT.invoices, AT.repairs, AT.inquiries].map((t) => t + 0.1); // each panel springs up
const GLITCH = AT.nothing + 6 * FR;                 // the RGB split (Glitch: at + 6 to at + 26)
const CUT = AT.built - 0.05;                        // the stop before "So we built Hivelet"
const DROP = 20.0;                                  // the mark fills (Turn: D - 2 to D + 10)
const WIPES = [SCN.tenant[0], SCN.repairs[0], SCN.visitors[0], SCN.install[0]];
const PROOF = SCN.records[0];
const SETTLE = AT.records + 60 * FR;                // 937 settles (Records: Camera hit at V + 60)
const GRADED = AT.secure;                           // the build stops as "Graded" is said
const APLUS = AT.secure + 8 * FR + LAND;            // A+ (Secure: Slam at V + 8)
const GAUGE = [AT.rated + 20 * FR, AT.rated + 120 * FR]; // the ring fills to 4.53
const BREAK = SCN.close[0];
const NAME = AT.name + 2 * FR + LAND;               // "Hivelet" (Close: Slam at N + 2)
const TEAM = 56.5;                                  // the five names, 5 frames apart
const END = 60;

const SR = 44100;
const N = Math.ceil((END + 0.5) * SR);
const pair = () => [new Float32Array(N), new Float32Array(N)];
const BED = pair(), HIT = pair(), PUMP = pair();
const SEND_BED = new Float32Array(N), SEND_HIT = new Float32Array(N);

let seed = 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const noise = () => rnd() * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Everything writes to one of three places: the bed (ducked under the voice), the pump
// (the bed, but also breathing with the kick), or the hits (never ducked).
let T = BED, TS = SEND_BED;
const into = (where) => {
  T = where === 'hit' ? HIT : where === 'pump' ? PUMP : BED;
  TS = where === 'hit' ? SEND_HIT : SEND_BED;
};
function out(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  T[0][i] += v * Math.cos((pan + 1) * Math.PI / 4);
  T[1][i] += v * Math.sin((pan + 1) * Math.PI / 4);
  TS[i] += v * send;
}

// ---- Voices (the film's, capture/score.mjs) ----------------------------------------------
// A band-limited saw (polyBLEP) through a two-pole low-pass whose cutoff moves.
function sawVoice({f0, t0, t1, env, cutoff, gain, pan = 0, send = 0, detune = 0}) {
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
const fadeAt = (len, r = 0.012) => (t) => clamp01((len - t) / r);

// ---- Instruments --------------------------------------------------------------------------
const SC = new Float32Array(N).fill(1); // the kick's pump on the pads and bass
function kick(t, g = 1) {
  sineVoice({freq: (x) => 47 + 120 * Math.exp(-x / 0.028), t0: t, dur: 0.42, gain: 0.5 * g, env: decay(0.16, 0.001)});
  sineVoice({freq: (x) => 95 + 90 * Math.exp(-x / 0.015), t0: t, dur: 0.12, gain: 0.16 * g, env: decay(0.035, 0.001)});
  noiseVoice({t0: t, dur: 0.02, centre: () => 3600, q: 0.7, gain: 0.15 * g, env: decay(0.005, 0.0005)});
  const a = Math.floor(t * SR);
  for (let i = 0; i < 0.48 * SR && a + i < N; i++) {
    const x = i / SR;
    SC[a + i] = Math.min(SC[a + i], 1 - 0.62 * g * clamp01(x / 0.006) * Math.exp(-x / 0.13));
  }
}
function clap(t, g = 1) {
  for (const [off, k, tail] of [[0, 0.6, false], [0.011, 0.75, false], [0.023, 1, true]]) {
    noiseVoice({t0: t + off, dur: tail ? 0.3 : 0.02, centre: () => 1500, q: 0.9, gain: 0.21 * g * k, send: 0.32, env: decay(tail ? 0.09 : 0.006, 0.0008)});
  }
}
function snare(t, g = 1) {
  sineVoice({freq: (x) => 182 + 70 * Math.exp(-x / 0.018), t0: t, dur: 0.2, gain: 0.17 * g, env: decay(0.06, 0.001)});
  noiseVoice({t0: t, dur: 0.28, centre: () => 4000, q: 0.6, gain: 0.2 * g, send: 0.25, env: decay(0.085, 0.001)});
}
function hat(t, g = 1, open = false, pan = 0.22) {
  noiseVoice({t0: t, dur: open ? 0.4 : 0.07, centre: () => 9600, q: 0.9, gain: 0.1 * g, pan, send: open ? 0.15 : 0.02, env: decay(open ? 0.12 : 0.022, 0.0008)});
}
function crash(t, g = 1) {
  noiseVoice({t0: t, dur: 3.2, centre: (x) => 7400 - 1800 * clamp01(x / 2), q: 0.5, gain: 0.075 * g, pan: -0.2, send: 0.4, env: decay(0.95, 0.002)});
  noiseVoice({t0: t, dur: 2.2, centre: () => 11500, q: 0.7, gain: 0.045 * g, pan: 0.25, send: 0.4, env: decay(0.6, 0.002)});
}
// A sub drop: a sine that falls into the floor.
function boom(t, g = 1, from = 72, to = 34, tau = 1.0) {
  sineVoice({freq: (x) => to + (from - to) * Math.exp(-x / 0.12), t0: t, dur: tau * 4, gain: 0.5 * g, env: decay(tau, 0.003)});
}
// Struck metal: inharmonic partials, each dying at its own rate.
function metal(t, g = 1, base = 150, pan = 0) {
  for (const [r, a, tau] of [[1, 1, 1.1], [2.32, 0.6, 0.7], [3.71, 0.42, 0.5], [5.18, 0.3, 0.32], [6.94, 0.2, 0.22], [8.47, 0.14, 0.15]]) {
    sineVoice({freq: () => base * r, t0: t, dur: tau * 5, gain: 0.065 * g * a, pan: pan + (r - 4) * 0.05, send: 0.5, env: decay(tau, 0.001)});
  }
  noiseVoice({t0: t, dur: 0.14, centre: () => 2400, q: 0.7, gain: 0.13 * g, send: 0.3, env: decay(0.025, 0.0005)});
}
// A wide chord of detuned saws.
function supersaw({notes, t0, dur, gain, env, cutoff, send = 0.45}) {
  const dets = [-17, -8, 0, 8, 17];
  notes.forEach((m, j) => dets.forEach((d, k) => sawVoice({f0: hz(m), t0, t1: t0 + dur, detune: d + (j % 2 ? 3 : -3), gain: (gain * 1.7) / dets.length,
    pan: ((k - 2) / 2) * 0.75, send, env, cutoff})));
}
// The hook's pluck, with a dotted-eighth echo that crosses the stereo field.
function pluck(t, m, g = 1, pan = 0, send = 0.35) {
  sawVoice({f0: hz(m), t0: t, t1: t + 0.6, gain: 0.12 * g, pan, send, env: decay(0.17, 0.002), cutoff: (x) => 800 + 6500 * Math.exp(-x / 0.055)});
  sineVoice({freq: () => hz(m + 12), t0: t, dur: 0.3, gain: 0.035 * g, pan: -pan, send, env: decay(0.07, 0.002)});
}
const echoPluck = (t, m, g = 1) => { pluck(t, m, g, 0.1); pluck(t + 0.375, m, g * 0.34, -0.55); pluck(t + 0.75, m, g * 0.13, 0.55); };
function bass(t, m, len, g = 1) {
  sawVoice({f0: hz(m), t0: t, t1: t + len, gain: 0.2 * g, send: 0.02, env: (x) => Math.min(1, x / 0.004) * Math.exp(-x / 0.22) * fadeAt(len)(x), cutoff: (x) => 300 + 1600 * Math.exp(-x / 0.045)});
  sineVoice({freq: () => hz(m), t0: t, dur: len, gain: 0.13 * g, env: (x) => Math.min(1, x / 0.006) * fadeAt(len, 0.015)(x)});
}
function bell(t, m, g = 1, pan = 0) {
  for (const [r, a, tau] of [[1, 1, 1.4], [2.0, 0.35, 0.8], [2.76, 0.28, 0.5], [5.4, 0.12, 0.2]]) {
    sineVoice({freq: () => hz(m) * r, t0: t, dur: tau * 4, gain: 0.05 * g * a, pan, send: 0.55, env: decay(tau, 0.002)});
  }
}
// A rising tone and a narrow sweep of air under a build.
function riser(t0, t1, g = 1, from = 57) {
  const d = t1 - t0;
  for (const k of [0, 7]) {
    sineVoice({freq: (x) => hz(from + k) * Math.pow(4, Math.pow(x / d, 1.5)), t0, dur: d, gain: 0.05 * g * (k ? 0.5 : 1), pan: k ? 0.3 : -0.3, send: 0.5,
      env: (x) => Math.pow(x / d, 2) * (0.7 + 0.3 * Math.sin(2 * Math.PI * (4 + 14 * x / d) * x)) * fadeAt(d)(x)});
  }
  noiseVoice({t0, dur: d, centre: (x) => 500 * Math.pow(16, x / d), q: 1.3, gain: 0.03 * g, send: 0.3, env: (x) => Math.pow(x / d, 2.5) * fadeAt(d)(x)});
}
// A snare roll that tightens: eighths, sixteenths, then thirty-seconds.
function roll(t0, t1, g0, g1) {
  for (let t = t0; t < t1 - 0.01;) {
    const p = (t - t0) / (t1 - t0);
    snare(t, lerp(g0, g1, Math.pow(p, 1.5)));
    t += p < 0.4 ? 0.25 : p < 0.75 ? 0.125 : 0.0625;
  }
}
// A chord played backwards: it draws in and stops dead on the downbeat.
function reverse(t1, dur, notes, g = 1) {
  const t0 = t1 - dur;
  notes.forEach((m, i) => sineVoice({freq: () => hz(m), t0, dur, gain: 0.05 * g, pan: (i / (notes.length - 1) - 0.5) * 0.8, send: 0.5,
    env: (x) => Math.exp((x - dur) / (dur * 0.26)) * fadeAt(dur, 0.01)(x)}));
  noiseVoice({t0, dur, centre: (x) => 2500 + 7000 * x / dur, q: 0.6, gain: 0.07 * g, send: 0.25, env: (x) => Math.pow(x / dur, 3) * fadeAt(dur, 0.01)(x)});
}
// Data breaking up: a scatter of square blips and noise, none longer than 70 ms.
function glitch(t0, t1, g = 1) {
  for (let t = t0; t < t1;) {
    const len = 0.018 + rnd() * 0.05, kind = rnd();
    const a = Math.floor(t * SR), n = Math.floor(len * SR);
    if (kind < 0.45) {
      const fq = 220 + rnd() * 1800, pan = rnd() - 0.5;
      for (let k = 0; k < n; k++) out(a + k, (Math.sin(2 * Math.PI * fq * k / SR) > 0 ? 1 : -1) * 0.05 * g * fadeAt(len, 0.002)(k / SR), pan, 0.1);
    } else if (kind < 0.8) {
      const c = 600 + rnd() * 6000;
      noiseVoice({t0: t, dur: len, centre: () => c, q: 1.5, gain: 0.16 * g, pan: rnd() - 0.5, send: 0.1, env: fadeAt(len, 0.002)});
    }
    t += len;
  }
}
// Silence the bed and its reverb feed from a to b, closing over 30 ms (what is already in
// the room keeps ringing). Called before anything after b is written, so it only takes
// the tails of what came before.
function gate(a, b) {
  for (let i = Math.floor(a * SR); i < Math.min(N, b * SR); i++) {
    const g = 1 - clamp01((i / SR - a) / 0.03);
    for (const [L, R] of [BED, PUMP]) { L[i] *= g; R[i] *= g; }
    SEND_BED[i] *= g;
  }
}

// ---- 0 to 18.5 s: the old way -----------------------------------------------------------
into('bed');
// The harmony under it: D minor, B flat, G minor, then A, which the drop resolves.
const ACT1 = [[0, [50, 57, 65]], [8, [46, 53, 62, 65]], [12, [43, 50, 58, 62]], [17, [45, 52, 61, 64]]];
ACT1.forEach(([t0, notes], k) => {
  const t1 = k < ACT1.length - 1 ? ACT1[k + 1][0] + 0.3 : CUT;
  const dur = t1 - t0;
  for (const m of notes) {
    for (const d of [-7, 7]) {
      sawVoice({f0: hz(m), t0, t1, detune: d, gain: 0.042, pan: d / 18, send: 0.45,
        env: (x) => clamp01(x / (k ? 0.35 : 3)) * clamp01((dur - x) / (k < ACT1.length - 1 ? 0.3 : 0.03)),
        cutoff: (x) => 260 + 1500 * Math.pow(clamp01((t0 + x) / CUT), 1.7)});
    }
  }
});
sineVoice({freq: () => hz(26), t0: 0, dur: CUT, gain: 0.12, env: (x) => clamp01(x / 2.5) * lerp(0.75, 1.15, x / CUT) * fadeAt(CUT, 0.03)(x)});
// A high, thin shimmer while the point of light pulses.
sineVoice({freq: () => hz(86), t0: 0.05, dur: 0.8, gain: 0.012, send: 0.7, env: (x) => clamp01(x / 0.5) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 6 * x)) * fadeAt(0.8, 0.05)(x)});
// The clock: eighths after "33", until the spreadsheet starts the pulse.
for (let t = 1.0, k = 0; t < 4.0; t += 0.25, k++) {
  noiseVoice({t0: t, dur: 0.03, centre: () => 5200, q: 4, gain: 0.05 * (k % 2 ? 0.6 : 1), pan: k % 2 ? 0.35 : -0.35, send: 0.15, env: decay(0.008, 0.0005)});
}
// The pulse: sixteenths on the root, opening up, with hats over it.
const PULSE = [[4, 38], [8, 34], [12, 43], [17, 45]];
for (let t = 4.0, k = 0; t < CUT - 0.01; t += 0.125, k++) {
  const root = PULSE.filter(([a]) => a <= t + 1e-6).pop()[1];
  const p = (t - 4) / (CUT - 4);
  const acc = [0, 3, 6, 10, 12].includes(k % 16) ? 1 : 0.62;
  sawVoice({f0: hz(root), t0: t, t1: t + 0.12, gain: 0.2 * acc * lerp(0.55, 1, p), send: 0.05, env: (x) => Math.min(1, x / 0.003) * Math.exp(-x / 0.06) * fadeAt(0.12, 0.01)(x),
    cutoff: (x) => 240 + lerp(250, 1500, p) * Math.exp(-x / 0.04)});
  hat(t, (k % 4 === 2 ? 0.9 : 0.45) * lerp(0.5, 1, p), false, k % 2 ? 0.3 : -0.1);
}
// A heavy, slow heartbeat under the problems.
for (let t = 9.0; t < 16.5; t += 1.0) {
  sineVoice({freq: (x) => lerp(90, 46, clamp01(x / 0.08)), t0: t, dur: 0.5, gain: 0.38, env: decay(0.16, 0.003)});
  sineVoice({freq: (x) => lerp(84, 44, clamp01(x / 0.08)), t0: t + 0.25, dur: 0.5, gain: 0.22, env: decay(0.14, 0.003)});
}
// The point of light drawn in to "33".
reverse(HIT_33, 0.7, [62, 69, 74], 0.7);
// The build into "So we built Hivelet".
roll(16.5, CUT, 0.12, 0.85);
riser(16.0, CUT, 1, 57);
gate(CUT, DROP);
// Silence; then, as the thread pulls the three in, a reversed D major draws in to the drop.
reverse(DROP - 0.004, 1.1, [62, 66, 69, 74, 78], 1.1);

into('hit');
boom(HIT_33, 1.0, 74, 33, 1.0); metal(HIT_33, 1.0, 140, -0.1);
boom(HIT_1, 0.8, 78, 36, 0.8); metal(HIT_1, 0.75, 168, 0.15);
PANELS.forEach((t, i) => { boom(t, 0.55, 70, 36, 0.7); metal(t, 0.55, [124, 132, 117][i], [-0.4, 0, 0.4][i]); });
into('bed');
glitch(GLITCH, GLITCH + 20 * FR, 1);
glitch(AT.built - 14 * FR, CUT, 0.6);

// ---- 20 s: the drop ---------------------------------------------------------------------
// When a hit lands on a word (the A+, the name), its crash, chord and ring go in the bed,
// so they step back under the voice like the rest; only the low end hits at full weight.
function bigHit(t, g = 1, notes = [50, 57, 62, 66, 69, 76], metalBase = 220, spoken = false) {
  into('hit');
  boom(t, 1.15 * g, 90, 32, 1.4);
  kick(t, g);
  if (spoken) into('bed');
  crash(t, g);
  supersaw({notes, t0: t, dur: 3.2, gain: 0.07 * g, send: 0.6,
    env: (x) => Math.min(1, x / 0.004) * Math.exp(-x / 1.1) * fadeAt(3.2, 0.3)(x), cutoff: (x) => 700 + 6200 * Math.exp(-x / 0.35)});
  for (const [m, d] of [[26, -4], [26, 5], [38, 0], [45, -3], [50, 3]]) {
    sawVoice({f0: hz(m), t0: t, t1: t + 3.5, detune: d, gain: 0.14 * g, pan: d / 12, send: 0.35,
      env: (x) => Math.min(1, x / 0.02) * Math.exp(-x / 1.3), cutoff: (x) => (x < 0.05 ? 160 + 2400 * x / 0.05 : 400 + 2200 * Math.exp(-(x - 0.05) / 0.5))});
  }
  metal(t, 0.5 * g, metalBase, 0);
  into('bed');
}
bigHit(DROP + 0.004);

// ---- 20 to 40 s: the product -------------------------------------------------------------
// D, A, B minor, G: pads (voiced around middle C), bass roots, and the hook's chord tones.
const PROG = [
  {pad: [57, 62, 66, 69, 76], root: 38, hook: [78, 81, 86, 81, 90, 86]},
  {pad: [57, 61, 64, 69, 71], root: 33, hook: [76, 81, 85, 81, 88, 85]},
  {pad: [59, 62, 66, 71, 73], root: 35, hook: [78, 83, 86, 83, 90, 86]},
  {pad: [59, 62, 67, 71, 74], root: 31, hook: [79, 83, 86, 83, 91, 86]},
];
const HOOK_AT = [0, 3, 6, 8, 11, 14]; // sixteenths: three, three, two, three, three, two
const S16 = 0.125;
function grooveBar(t, c, {hook = true, hats = true, half = false} = {}) {
  into('pump');
  supersaw({notes: c.pad, t0: t, dur: (half ? 1 : 2) + 0.06, gain: 0.06, send: 0.45,
    env: (x) => clamp01(x / 0.015) * fadeAt((half ? 1 : 2) + 0.06, 0.06)(x), cutoff: (x) => 3200 + 900 * Math.sin((t + x) * 0.9)});
  for (const k of [2, 6, 10, 14]) if (!half || k < 8) bass(t + k * S16, c.root + 12, 0.2);
  into('bed');
  for (let b = 0; b < (half ? 2 : 4); b++) kick(t + b * 0.5);
  for (const k of half ? [4] : [4, 12]) clap(t + k * S16);
  if (hats) for (let k = 0; k < (half ? 8 : 16); k++) hat(t + k * S16, [0.5, 0.28, 1, 0.3][k % 4], false, k % 2 ? 0.3 : -0.1);
  if (hats) for (const k of half ? [2, 6] : [2, 6, 10, 14]) hat(t + k * S16, 0.45, true, -0.25);
  if (hook) HOOK_AT.forEach((k, i) => { if (!half || k < 8) echoPluck(t + k * S16, c.hook[i], 1); });
}
for (let b = 0; b < 10; b++) grooveBar(DROP + b * 2, PROG[b % 4], {hook: b > 0, hats: true});
// A snare pickup into each thread wipe, and a crash as the thread crosses.
for (const w of WIPES) {
  for (let k = 4; k >= 1; k--) snare(w - k * S16, lerp(0.35, 0.8, (4 - k) / 3));
  into('hit'); crash(w, 0.55); if (Math.abs((w - DROP) / 0.5 - Math.round((w - DROP) / 0.5)) > 1e-6) kick(w, 0.8); into('bed');
}

// ---- 40 to 50.75 s: the proof -------------------------------------------------------------
// Half time under 937: B minor, G, then A for the build.
into('hit'); crash(PROOF, 0.7); into('bed');
const HALF = [[PROOF, PROG[2]], [PROOF + 1, PROG[2]], [PROOF + 2, PROG[3]], [PROOF + 3, PROG[1]]];
HALF.forEach(([t, c], i) => {
  into('pump');
  supersaw({notes: c.pad, t0: t, dur: i === 3 ? GRADED - t : 1.06, gain: 0.055, send: 0.55,
    env: (x) => clamp01(x / 0.02) * fadeAt(i === 3 ? GRADED - t : 1.06, i === 3 ? 0.02 : 0.06)(x), cutoff: (x) => 1500 + 900 * clamp01((t + x - PROOF) / 4)});
  bass(t, c.root, i === 3 ? GRADED - t : 1.0, 1.1);
  into('bed');
  if (i === 0 || i === 2) kick(t);
  if (i === 1) { snare(t, 0.9); clap(t, 1.1); }
  for (let k = 0; k < 4; k++) hat(t + k * 0.25, k % 2 ? 0.7 : 0.35, false, 0.2);
});
into('hit'); boom(SETTLE, 0.6, 70, 36, 0.7); metal(SETTLE, 0.4, 196, 0); into('bed');
roll(PROOF + 3, GRADED, 0.15, 0.95);
riser(PROOF + 2.5, GRADED, 1.1, 57);
gate(GRADED, APLUS + 0.5); // nothing after the A+ is written yet, only the roll's tail
bigHit(APLUS, 1.1, [50, 57, 62, 66, 69, 74, 78], 262, true);
// After the A+: the D chord rings, the hats and a snare build bring the groove back.
into('pump');
supersaw({notes: PROG[0].pad, t0: APLUS + 0.25, dur: 46 - APLUS - 0.25 + 0.05, gain: 0.04, send: 0.6,
  env: (x) => clamp01(x / 0.8) * fadeAt(46 - APLUS - 0.2, 0.05)(x), cutoff: () => 1900});
into('bed');
for (let t = 45.0, k = 0; t < 46 - 0.01; t += S16, k++) hat(t, 0.3 + 0.5 * k / 8, false, k % 2 ? 0.3 : -0.1);
for (let t = 45.0, k = 0; t < 46 - 0.01; t += 0.25, k++) snare(t, 0.25 + 0.12 * k);
// The groove again, the chords twice as fast, with the ring filling under 4.53.
const FAST = [0, 1, 2, 3, 0, 1, 2, 3, 0];
for (let i = 0; i < FAST.length && 46 + i < BREAK; i++) grooveBar(46 + i, PROG[FAST[i]], {half: true});
into('hit'); crash(46, 0.7); into('bed');
{
  const [g0, g1] = GAUGE, d = g1 - g0;
  const io = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (2 - 2 * x) ** 5 / 2); // the ring's in-out ease (kit.tsx quint)
  sineVoice({freq: (x) => hz(lerp(62, 81, io(clamp01(x / d)))), t0: g0, dur: d + 0.6, gain: 0.03, pan: 0.15, send: 0.6,
    env: (x) => clamp01(x / 0.1) * (x > d ? Math.exp(-(x - d) / 0.2) : 1)});
  bell(g1, 81, 0.8, 0.2);
}
gate(BREAK, END); // only the groove's tails are past the break so far

// ---- 50.75 s to the end: the name, and the close --------------------------------------------
reverse(NAME - 0.004, NAME - BREAK, [62, 66, 69, 74, 78, 81], 1.0);
bigHit(NAME, 0.95, [50, 57, 62, 66, 69, 76, 81], 233, true);
// A soft bed in D, then G over D, then D, fading out with the picture.
const OUTRO = [[NAME + 0.3, [50, 57, 62, 64, 66, 69]], [54.4, [50, 55, 59, 62, 66, 71]], [56.4, [50, 57, 62, 64, 66, 69, 73]]];
OUTRO.forEach(([t0, notes], k) => {
  const t1 = k < OUTRO.length - 1 ? OUTRO[k + 1][0] + 0.5 : END;
  const dur = t1 - t0;
  for (const m of notes) for (const d of [-6, 6]) {
    sawVoice({f0: hz(m), t0, t1, detune: d, gain: 0.026 * (m > 70 ? 0.6 : 1), pan: d / 14, send: 0.55,
      env: (x) => clamp01(x / (k ? 0.6 : 1.4)) * clamp01((dur - x) / 0.6) * clamp01((END - 0.25 - (t0 + x)) / 3.0), cutoff: (x) => 1250 + 350 * Math.sin((t0 + x) * 0.6)});
  }
});
sineVoice({freq: () => hz(38), t0: NAME + 0.3, dur: END - NAME - 0.3, gain: 0.12, env: (x) => clamp01(x / 1.5) * clamp01((END - 0.25 - (NAME + 0.3 + x)) / 3.0)});
// The hook, slowed to quarter notes, under the close.
const SLOW = [78, 81, 86, 81, 78, 81, 86, 88, 86, 83, 79, 83, 86, 83, 81, 78];
SLOW.forEach((m, i) => { const t = 52.5 + i * 0.25 * 2; if (t < TEAM - 0.3) echoPluck(t, m, 0.55); });
// A bell for each name as it appears (Close: names at 56.5 s, 5 frames apart).
[74, 76, 78, 81, 86].forEach((m, i) => bell(TEAM + i * 5 * FR + 0.08, m, 0.7, (i - 2) * 0.25));

// ---- Under the voice, the room, and the master ---------------------------------------------
// The pads and bass breathe with the kick, then join the bed.
for (let i = 0; i < N; i++) { BED[0][i] += PUMP[0][i] * SC[i]; BED[1][i] += PUMP[1][i] * SC[i]; }

// The duck: down 8 dB while the voice is actually speaking, read from the clips themselves
// (10 ms windows above -38 dBFS), held through gaps under 0.35 s so it does not pump
// between words, and let go 0.18 s after the last one.
const DUCK = new Float32Array(N).fill(1);
{
  const target = new Float32Array(N).fill(1);
  const low = Math.pow(10, -8 / 20);
  for (const k of Object.keys(AT)) {
    const wav = readFileSync(join(root, 'public', 'pitch', 'vo', `${k}.wav`));
    const rate = wav.readUInt32LE(24);
    let p = 12;
    while (wav.toString('ascii', p, p + 4) !== 'data') p += 8 + wav.readUInt32LE(p + 4);
    const n = wav.readUInt32LE(p + 4) / 2, w = Math.round(rate / 100);
    const on = [];
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
  const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.18 * SR));
  let g = 1;
  for (let i = 0; i < N; i++) { g += (target[i] - g) * (target[i] < g ? att : rel); DUCK[i] = g; }
}

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
const [BRL, BRR] = freeverb(SEND_BED);
const [HRL, HRR] = freeverb(SEND_HIT, 0.88);
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = (BED[0][i] + BRL[i] * 0.9) * DUCK[i] + HIT[0][i] + HRL[i] * 0.9;
  R[i] = (BED[1][i] + BRR[i] * 0.9) * DUCK[i] + HIT[1][i] + HRR[i] * 0.9;
}
// A tilt, so the sub does not swallow the rest: about 6 dB off below 110 Hz, about 4 dB
// added above 2.5 kHz. Then soft saturation and the fade with the picture.
for (const X of [L, R]) {
  const lo = 1 - Math.exp(-2 * Math.PI * 110 / SR), hi = 1 - Math.exp(-2 * Math.PI * 2500 / SR);
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < N; i++) {
    a += lo * (X[i] - a); b += lo * (a - b); c += hi * (X[i] - c);
    X[i] = Math.tanh((X[i] - 0.5 * b + 0.6 * (X[i] - c)) * 1.1) * clamp01((END - 0.08 - i / SR) / 0.6);
  }
}

// Level: the loudest moment at -5.5 dBFS, leaving room for the voice and the effects on top.
// Then report the music's level with the voice on and off, to check the balance: the speech
// is at -16 dBFS RMS (-17.4 at the 0.85 Pitch.tsx plays it at), and the music under it
// should sit about 10 dB lower.
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = Math.pow(10, -5.5 / 20) / peak;
const rms = (pred) => {
  let s = 0, n = 0;
  for (let i = 0; i < N; i += 4) if (pred(i / SR)) { s += (L[i] * gain) ** 2 + (R[i] * gain) ** 2; n += 2; }
  return (10 * Math.log10(s / Math.max(1, n))).toFixed(1);
};
const voiced = (t) => Object.keys(AT).some((k) => t >= AT[k] && t < AT[k] + LEN[k]);
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4);
}
mkdirSync(join(root, 'public', 'pitch'), {recursive: true});
writeFileSync(join(root, 'public', 'pitch', 'score.wav'), data);
console.log(`pitch/score.wav: ${(N / SR).toFixed(1)} s; drop ${DROP}, A+ ${APLUS.toFixed(2)}, name ${NAME.toFixed(2)}; gain ${gain.toFixed(2)}`);
console.log(`music RMS: under the voice ${rms(voiced)} dBFS, groove without it ${rms((t) => t > 20 && t < 50.75 && !voiced(t))} dBFS, act one without it ${rms((t) => t < CUT && !voiced(t))} dBFS`);
