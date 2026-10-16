// When each phrase of the screen pitch's voice starts (vo-at.json, which the score reads
// too) and how long it is (vo.json). WORD is where a word something waits for falls inside
// its clip, read off the clip's own speech segments.
import vo from './vo.json';
import voAt from './vo-at.json';

export const FPS = 60;
export const W = 1920, H = 1080;
export const TOTAL = 60 * FPS;
export const f = (s: number) => Math.round(s * FPS);
type Line = keyof typeof vo;
export const AT = voAt as Record<Line, number>;
export const LEN = vo as Record<Line, number>;
export const WORD = {
  legazpi: AT.meet + 2.83,
  landlady: AT.units + 1.17,
  usb: AT.before + 2.89,
  repairs: AT.pieces + 1.79,
  inquiries: AT.pieces + 3.88,
  hivelet: AT.built + 0.72,
  addsUp: AT.ledger + 1.76,
  gcash: AT.phone + 1.27,
  noAccount: AT.visitors + 2.1,
  thirtySeven: AT.records + 0.74,
  carried: AT.records + 2.7,
  aPlus: AT.secure + 1.2,
  rated: AT.quality + 0.65,
  oneScreen: AT.close + 0.76,
};
export const OFF = 58.7; // the screen goes dark
