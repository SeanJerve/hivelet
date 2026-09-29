// Can each sound be heard over the music under it? For every cue in
// src/cues.mjs, the effect (its wav at its cue volume, as Remotion plays it) and
// the score at the same moment (at the film's 0.9) are compared above 1 kHz,
// over the effect's loudest 100 ms. Above 1 kHz because that is where clicks,
// taps and ticks are heard; the groove's energy is in the bass and would make a
// broadband comparison say everything is buried.
//
// Prints, per scene and sound, how far the median cue sits from its target, and
// flags any more than 4 dB off. Act 1 has no targets: its score is a drone with
// almost nothing above 1 kHz, so everything there is clear of it.
//
//   node capture/levels.mjs

import {readFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(readFileSync(join(root, 'src', 'timeline.json'), 'utf8'));
const {buildCues} = await import(pathToFileURL(join(root, 'src', 'cues.mjs')).href);
const SR = 44100;

// Targets in dB relative to the music, by kind of sound: small object sounds a
// little under it, pointer clicks and taps a little over, notifications clearly over.
const TARGET = (n) => /^settle/.test(n) || /^tick/.test(n) ? -3 : /^flip/.test(n) ? -6 : /^pluck/.test(n) ? -2
  : ({nav: -3, flick: -3, sketch: -3, open: -1, 'status-1': -1, 'status-2': -1, 'status-3': -1, 'card-slide': 0,
    blip: 3, 'soft-click': 5, tap: 6, chime: 8, 'soft-warn': 9, bell: 10})[n];

const wav = (p) => {
  const b = readFileSync(p);
  let off = 12, at = 0, len = 0;
  while (off < b.length) { const id = b.toString('ascii', off, off + 4), sz = b.readUInt32LE(off + 4); if (id === 'data') { at = off + 8; len = sz; break; } off += 8 + sz; }
  const x = new Float32Array(len / 4);
  for (let i = 0; i < x.length; i++) x[i] = (b.readInt16LE(at + i * 4) + b.readInt16LE(at + i * 4 + 2)) / 65536;
  return x;
};
const highpass = (x, fc = 1000) => {
  const w = (2 * Math.PI * fc) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * 0.707);
  const b0 = (1 + c) / 2, b1 = -(1 + c), a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
};

const score = highpass(wav(join(root, 'public', 'score.wav')));
const start = {};
let t = 0;
for (const s of tl.scenes) { start[s.id] = t; t += s.frames; }
const cache = {};
const groups = {};
for (const [scene, cues] of Object.entries(buildCues(tl))) {
  if (scene === 'act1') continue;
  for (const [at, name, vol] of cues) {
    const target = TARGET(name);
    if (name.startsWith('key') || target === undefined) continue;
    const fx = (cache[name] ??= highpass(wav(join(root, 'public', 'sfx', `${name}.wav`))));
    const w = Math.round(0.1 * SR);
    let best = 0, peakAt = 0, acc = 0;
    for (let i = 0; i < fx.length; i++) { acc += fx[i] ** 2; if (i >= w) acc -= fx[i - w] ** 2; if (acc > best) { best = acc; peakAt = i; } }
    const s0 = Math.round(((start[scene] + Math.round(at)) / 30) * SR);
    let m = 0;
    for (let i = s0 + peakAt - w; i < s0 + peakAt; i++) m += (score[i] ?? 0) ** 2 * 0.81;
    const rel = 10 * Math.log10((best / w) * vol * vol + 1e-12) - 10 * Math.log10(m / w + 1e-12);
    (groups[`${scene} ${name}`] ??= {target, rel: []}).rel.push(rel);
  }
}
let off = 0;
for (const [k, g] of Object.entries(groups)) {
  const med = g.rel.sort((a, b) => a - b)[Math.floor(g.rel.length / 2)];
  const d = med - g.target;
  if (Math.abs(d) > 4) off++;
  console.log(`${k.padEnd(22)} ${med.toFixed(1).padStart(6)} dB vs music, target ${String(g.target).padStart(3)}  ${Math.abs(d) > 4 ? `OFF BY ${d.toFixed(1)}` : 'ok'}`);
}
console.log(off ? `${off} sound(s) more than 4 dB from target` : 'every sound within 4 dB of its target');
process.exitCode = off ? 1 : 0;
