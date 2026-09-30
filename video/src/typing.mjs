// Typing that sounds and looks like a person: an uneven rhythm, quick runs,
// a beat after a space and a longer one after a comma or full stop. The same
// times drive the text on screen and the key sounds in cues.mjs, so a key is
// only ever heard as its character appears.

// The frame at which each character of `text` appears, starting after `at`.
export function typeTimes(text, at, base = 2.2, seed = 7) {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out = [];
  let t = at;
  for (let i = 0; i < text.length; i++) {
    let d = base * (0.55 + rnd() * 0.9);
    if (i % 4 === 3 && rnd() < 0.55) d *= 0.6;
    if (text[i] === ' ') d += base * (0.3 + rnd() * 0.6);
    if (i > 0 && ',.!?'.includes(text[i - 1])) d += base * 1.8;
    t += d;
    out.push(t);
  }
  return out;
}

// The part of `text` on screen at frame f.
export function typedAt(text, f, times) {
  let n = 0;
  while (n < times.length && f >= times[n]) n++;
  return text.slice(0, n);
}

// Everything typed in the film. Frames are local to the scene named. Short on
// purpose: a few words at a person's pace, not a paragraph at a machine's.
export const TYPING = {
  // Act 1: two rents typed into her sheet, each formatted when Enter is pressed.
  sheet1: {scene: 'act1', text: '4800', at: 24, base: 3.2, seed: 3},
  sheet2: {scene: 'act1', text: '4500', at: 118, base: 3.2, seed: 4},
  // Income: the receipt number, digit by digit.
  or: {scene: 'income', text: '5120', at: 240, base: 4.5, seed: 31},
  // Tenant: the repair request.
  title: {scene: 'tenant', text: 'Faucet keeps dripping', at: 454, base: 2.3, seed: 11},
  details: {scene: 'tenant', text: 'Even when closed.', at: 512, base: 2.1, seed: 12},
  // Guests: the question asked about the unit.
  question: {scene: 'guests', text: 'Can we view it on Saturday?', at: 262, base: 2.1, seed: 21},
  // Guests: her answer in Inquiries, and the visitor writing back on their page.
  reply: {scene: 'guests', text: 'Yes po, Saturday at 10 am.', at: 468, base: 2.1, seed: 22},
  back: {scene: 'guests', text: 'Thank you po!', at: 624, base: 2.2, seed: 23},
};

const memo = {};
export const timesOf = (k) => (memo[k] ??= typeTimes(TYPING[k].text, TYPING[k].at, TYPING[k].base, TYPING[k].seed));
export const typedOf = (k, f) => typedAt(TYPING[k].text, f, timesOf(k));
export const doneOf = (k) => timesOf(k)[timesOf(k).length - 1];
