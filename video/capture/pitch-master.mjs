// Masters the pitch's sound: takes out/pitch-raw.mp4 (Remotion's render: voice, score and
// effects mixed), brings the mix to -15 LUFS with a look-ahead peak limiter (ceiling
// -1.5 dBFS), and writes out/pitch.mp4 with the picture copied untouched.
//
// Remotion sums its audio tracks with no limiter, so the score is written with headroom
// for the voice and the effects on top (capture/pitch-score.mjs); this is where that
// headroom is given back. The loudness is measured the BS.1770 way (K-weighted, gated).
//
//   node capture/pitch-master.mjs          (after: remotion render ... Pitch out/pitch-raw.mp4)

import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(root, 'out', 'pitch-raw.mp4'), OUT = join(root, 'out', 'pitch.mp4');
const PCM = join(root, 'out', 'pitch-master.wav');
const SR = 48000, TARGET = -15, CEILING = Math.pow(10, -1.5 / 20);
const ffmpeg = (args) => execFileSync('npx', ['remotion', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', ...args], {cwd: root, stdio: ['ignore', 'inherit', 'inherit']});

// The mix, as interleaved floats. Remotion's ffmpeg writes 24-bit WAV, not float, and has no
// raw muxers; the mastered mix goes back as a float WAV, which it can read.
ffmpeg(['-i', RAW, '-vn', '-c:a', 'pcm_s24le', '-ar', String(SR), '-ac', '2', PCM]);
const wav = readFileSync(PCM);
let at = 12;
while (wav.toString('ascii', at, at + 4) !== 'data') at += 8 + wav.readUInt32LE(at + 4);
const x = new Float32Array(wav.readUInt32LE(at + 4) / 3);
for (let i = 0; i < x.length; i++) x[i] = wav.readIntLE(at + 8 + i * 3, 3) / 8388608;
const n = x.length / 2;

// Integrated loudness, BS.1770: K-weighting (a high shelf, then a high-pass), 400 ms
// blocks every 100 ms, an absolute gate at -70 LUFS and a relative one 10 LU down.
function lufs(gain = 1, g = null) {
  const shelf = [[1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]];
  const hp = [[1, -2, 1], [-1.99004745483398, 0.99007225036621]];
  const sq = new Float64Array(n);
  for (let c = 0; c < 2; c++) {
    let s1 = [0, 0, 0, 0], s2 = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      const v = x[i * 2 + c] * gain * (g ? g[i] : 1);
      const y1 = shelf[0][0] * v + shelf[0][1] * s1[0] + shelf[0][2] * s1[1] - shelf[1][0] * s1[2] - shelf[1][1] * s1[3];
      s1 = [v, s1[0], y1, s1[2]];
      const y2 = hp[0][0] * y1 + hp[0][1] * s2[0] + hp[0][2] * s2[1] - hp[1][0] * s2[2] - hp[1][1] * s2[3];
      s2 = [y1, s2[0], y2, s2[2]];
      sq[i] += y2 * y2;
    }
  }
  const block = 0.4 * SR, step = 0.1 * SR, blocks = [];
  for (let a = 0; a + block <= n; a += step) {
    let s = 0;
    for (let i = a; i < a + block; i++) s += sq[i];
    blocks.push(s / block);
  }
  const L = (ms) => -0.691 + 10 * Math.log10(ms);
  const abs = blocks.filter((b) => L(b) > -70);
  const rel = L(abs.reduce((s, b) => s + b, 0) / abs.length) - 10;
  const kept = abs.filter((b) => L(b) > rel);
  return L(kept.reduce((s, b) => s + b, 0) / kept.length);
}

// The limiter's gain: what each sample needs to stay under the ceiling, as the minimum over
// 5 ms either side (so it starts coming down before a peak), averaged over 5 ms (so it
// ramps rather than steps), and let back up over 120 ms.
function limiterGain(gain) {
  const L = Math.round(0.005 * SR), need = new Float32Array(n), g = new Float32Array(n);
  for (let i = 0; i < n; i++) need[i] = Math.min(1, CEILING / (Math.max(Math.abs(x[i * 2]), Math.abs(x[i * 2 + 1])) * gain + 1e-9));
  const lo = new Float32Array(n);
  const dq = []; // a sliding-window minimum over [i - L, i + L]
  for (let j = 0, i = -L; i < n; j++, i++) {
    if (j < n) { while (dq.length && need[dq[dq.length - 1]] >= need[j]) dq.pop(); dq.push(j); }
    if (i >= 0) { while (dq[0] < i - L) dq.shift(); lo[i] = need[dq[0]]; }
  }
  let sum = 0;
  const half = L >> 1;
  for (let i = -half; i < n; i++) {
    if (i + half < n) sum += lo[i + half];
    if (i - half - 1 >= 0) sum -= lo[i - half - 1];
    if (i >= 0) g[i] = sum / (Math.min(n - 1, i + half) - Math.max(0, i - half) + 1);
  }
  const rel = 1 - Math.exp(-1 / (0.12 * SR));
  for (let i = 1; i < n; i++) g[i] = Math.min(g[i], g[i - 1] + (1 - g[i - 1]) * rel);
  return g;
}

const before = lufs();
let gain = Math.pow(10, (TARGET - before) / 20), g = limiterGain(gain);
// The limiter takes a little loudness off the peaks; make that up once.
gain *= Math.pow(10, (TARGET - lufs(gain, g)) / 20);
g = limiterGain(gain);
let peak = 0, reduced = 0;
for (let i = 0; i < n; i++) {
  for (let c = 0; c < 2; c++) {
    const v = Math.max(-CEILING, Math.min(CEILING, x[i * 2 + c] * gain * g[i]));
    x[i * 2 + c] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  reduced = Math.max(reduced, -20 * Math.log10(g[i]));
}
const head = Buffer.alloc(44);
head.write('RIFF', 0); head.writeUInt32LE(36 + x.byteLength, 4); head.write('WAVE', 8);
head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(3, 20); head.writeUInt16LE(2, 22);
head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 8, 28); head.writeUInt16LE(8, 32); head.writeUInt16LE(32, 34);
head.write('data', 36); head.writeUInt32LE(x.byteLength, 40);
writeFileSync(PCM, Buffer.concat([head, Buffer.from(x.buffer, x.byteOffset, x.byteLength)]));
console.log(`loudness ${before.toFixed(1)} -> ${lufs().toFixed(1)} LUFS (gain ${(20 * Math.log10(gain)).toFixed(1)} dB), peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS, most limiting ${reduced.toFixed(1)} dB`);

ffmpeg(['-i', RAW, '-i', PCM, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', OUT]);
rmSync(PCM);
console.log(`wrote ${OUT}`);
