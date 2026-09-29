// Generates the six voiced lines with edge-tts (Microsoft neural voices, free,
// no key) and records how long each one runs, so every voiced scene is timed to
// its audio. Needs: python -m pip install edge-tts
//
//   node capture/voice.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LINES, VOICES } from '../src/voice-lines.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'voice');
const durations = {};

for (const voice of VOICES) {
  mkdirSync(join(out, voice.id), { recursive: true });
  durations[voice.id] = {};
  for (const line of LINES) {
    const mp3 = join(out, voice.id, `${line.id}.mp3`);
    const srt = join(out, voice.id, `${line.id}.srt`);
    // The voice service drops a connection now and then; try again before giving up,
    // and keep lines already made so a rerun only fetches what is missing.
    for (let attempt = 1; !(existsSync(mp3) && existsSync(srt)); attempt++) {
      try {
        execFileSync('python', ['-m', 'edge_tts', '--voice', voice.name, `--rate=${voice.rate}`, '--text', line.text, '--write-media', mp3, '--write-subtitles', srt], { stdio: 'pipe' });
      } catch (e) {
        rmSync(mp3, { force: true }); rmSync(srt, { force: true });
        if (attempt === 4) throw new Error(`${voice.id} ${line.id}: ${String(e.stderr || e).split('\n').filter(Boolean).pop()}`);
        execFileSync('powershell', ['-NoProfile', '-Command', `Start-Sleep -Seconds ${attempt * 3}`]);
      }
    }
    // The last cue's end time is when the voice stops.
    const stamps = [...readFileSync(srt, 'utf8').matchAll(/(\d\d):(\d\d):(\d\d)[,.](\d\d\d)/g)];
    const [, h, m, s, ms] = stamps[stamps.length - 1];
    durations[voice.id][line.id] = Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
    console.log(voice.id, line.id, durations[voice.id][line.id].toFixed(2) + 's');
  }
}
writeFileSync(join(here, '..', 'src', 'voice-durations.json'), JSON.stringify(durations, null, 2) + '\n');
