// When each phrase of the paper pitch's voice starts (vo-at.json, which the score reads
// too) and how long it is (vo.json, from capture/pitch_voice.py ... paper). The score is
// 120 bpm with its bars on the odd seconds, so the reveal lands on a downbeat at 21 s;
// every phrase starts just after a beat.
//
// WORD holds where a word that something on screen waits for falls inside its clip
// (seconds from the clip's start, read off the clip's own speech segments).
import vo from './vo.json';
import voAt from './vo-at.json';

export const FPS = 60;
export const W = 1920, H = 1080;
export const TOTAL_S = 60;
export const TOTAL = TOTAL_S * FPS;
export const f = (s: number) => Math.round(s * FPS);

type Line = keyof typeof vo;
export const AT = voAt as Record<Line, number>;
export const LEN = vo as Record<Line, number>;
export const WORD = {
  landlady: AT.units + 1.12,      // "One landlady."
  legazpi: AT.meet + 2.75,        // "in Legazpi City."
  addsUp: AT.ledger + 1.73,       // "adding itself up."
  gcash: AT.phone + 2.45,         // "GCash."
  noAccount: AT.visitors + 2.07,  // "No account needed."
  thirtySeven: AT.records + 1.39, // "thirty-seven"
  aPlus: AT.secure + 1.2,         // "A-plus."
  rated: AT.quality + 0.61,       // "rated four point five three"
  inOnePlace: AT.close + 0.74,    // "Her whole boarding house, in one place."
};
export const REVEAL = 21.0;
