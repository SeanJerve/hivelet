// When each phrase of the voiceover starts (seconds, vo-at.json, which the score
// generator reads too), and where each scene sits.
// The score is 120 bpm, so a beat is 0.5 s and a bar 2 s: cuts sit on beats, the
// drop on bar 10 (20 s), and every phrase starts just after the beat it belongs to.
// Phrase lengths come from vo.json (capture/pitch_voice.py).
import vo from './vo.json';
import voAt from './vo-at.json';
import {FPS} from './kit';

export const VO_AT = voAt as Record<keyof typeof vo, number>;
export const VO_LEN = vo as Record<keyof typeof vo, number>;
export const f = (s: number) => Math.round(s * FPS);
export const vo0 = (k: keyof typeof vo) => f(VO_AT[k]);
export const vo1 = (k: keyof typeof vo) => f(VO_AT[k] + VO_LEN[k]);

// The scenes, in seconds. Each runs from its start to the next one's start, plus the
// overlap its transition needs.
export const SCENES = {
  hook: [0, 4.2],
  drive: [4.2, 9.0],
  problem: [9.0, 15.25],
  nothing: [15.25, 19.5],
  turn: [18.5, 20.5],
  ledger: [20.0, 25.5],
  tenant: [25.5, 30.0],
  repairs: [30.0, 33.0],
  visitors: [33.0, 36.75],
  install: [36.75, 40.0],
  records: [40.0, 44.0],
  secure: [44.0, 46.5],
  rated: [46.5, 50.75],
  close: [50.75, 60.0],
} as const;
export const TOTAL_S = 60;
export const TOTAL = f(TOTAL_S);
export const DROP = 20.0;
