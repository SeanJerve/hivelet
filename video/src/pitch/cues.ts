// Every effect in the pitch, and the thing on screen it belongs to: [seconds, sound, volume].
// The film's rule holds here too (SCENES.md, "Sound"): a sound plays only when something on
// screen lands, slides, is drawn, tapped or arrives; whole-frame pushes and camera moves
// are silent, and the slams and the drop are the score's (capture/pitch-score.mjs).
// Times are read off the scenes; move an event there and move its cue here.
import {expo} from './kit';
import {VO_AT} from './timeline';

type Cue = [number, string, number];
const FR = 1 / 60;
const TICKS = ['tick-a', 'tick-b', 'tick-c', 'tick-d', 'tick-e', 'tick-f'];

// ActThree Records: the odometer's last column rolls 47 digits (to 7, after four turns)
// over 70 frames from records + 12, fast then slow. A tick as each digit passes, never
// closer than 45 ms, and a lock as it stops.
const odometer = (): Cue[] => {
  const a = VO_AT.records + 12 * FR, d = 70 * FR;
  const out: Cue[] = [];
  let shown = 0, last = -1;
  for (let k = 1; k <= 600; k++) {
    const at = a + (k / 600) * d, pos = Math.floor(47 * expo(k / 600));
    if (pos > shown && at - last >= 0.045) { out.push([at, TICKS[out.length % TICKS.length], 0.15]); last = at; }
    shown = Math.max(shown, pos);
  }
  return [...out, [a + d - 2 * FR, 'lock-a', 0.32]];
};

const U = VO_AT.units, L = VO_AT.landlady, B = VO_AT.repairs, Cq = VO_AT.inquiries, BT = VO_AT.built;

export const CUES: Cue[] = [
  // ActOne Hook: the 33 cells burst out of the point of light, close into one, lock, and
  // stretch into a line.
  [U + 4 * FR, 'air-short', 0.22],
  [L + 4 * FR, 'air-short', 0.2],
  [L + 32 * FR, 'lock-a', 0.28],
  [3.55, 'swipe', 0.26],
  // Drive: the sheet slides in, collapses; the thread draws the drive and its plug; its
  // light comes on; it falls.
  [4.2, 'paper-slide', 0.32],
  [6.85, 'paper', 0.3],
  [7.2, 'sketch', 0.3],
  [7.6, 'sketch', 0.2],
  [7.98, 'beep', 0.16],
  [8.45, 'whoosh-low', 0.32],
  // Problem: each panel springs up; the receipt numbers are circled; the chat buries the
  // repair; the three inquiries arrive, then break up.
  [VO_AT.invoices, 'card-slide', 0.32],
  [VO_AT.invoices + 40 * FR, 'pen', 0.34],
  [VO_AT.invoices + 56 * FR, 'pen', 0.28],
  [B, 'card-slide', 0.32],
  ...[0, 1, 2, 3, 4, 5].map((i): Cue => [B + (30 + i * 9) * FR, i % 3 === 1 ? 'msg-out' : 'msg-in', 0.2]),
  [Cq, 'card-slide', 0.32],
  [Cq + 8 * FR, 'msg-in', 0.22],
  [Cq + 16 * FR, 'sms', 0.2],
  [Cq + 24 * FR, 'step-a', 0.24],
  [Cq + 32 * FR, 'step-b', 0.2],
  [Cq + 62 * FR, 'air', 0.18],
  // Nothing: the broken links flicker; the thread runs through the three cards and pulls
  // them in; the light flashes; the hexagon is traced.
  [VO_AT.nothing + 28 * FR, 'soft-warn', 0.18],
  [BT + 2 * FR, 'swipe', 0.28],
  [BT + 34 * FR, 'whoosh-low', 0.32],
  [BT + 56 * FR, 'shimmer', 0.26],
  [BT + 44 * FR, 'sketch', 0.18],
  // Turn: through the mark, into the product.
  [20.0 + 18 * FR, 'whoosh', 0.3],

  // ActTwo Ledger: the tiles settle; the rows slide in; the kept invoice chip pops up.
  [20.0 + 40 * FR, 'settle-a', 0.22],
  ...[0, 1, 2, 3].map((i): Cue => [20.0 + (50 + i * 12) * FR, TICKS[i], 0.22]),
  [23.9, 'status-3', 0.28],
  // The thread crossing the frame for each wipe.
  [25.5, 'swipe', 0.3], [30.0, 'swipe', 0.3], [33.0, 'swipe', 0.3], [36.75, 'swipe', 0.3],
  // Tenant: Pay with GCash is tapped; the payment arrives.
  [27.95, 'tap', 0.5],
  [28.35, 'chime', 0.38],
  // Repairs: the card lands in To dispatch, slides to In progress, then to Done.
  [30.0 + 20 * FR, 'status-1', 0.32],
  [31.0, 'card-slide', 0.28],
  [31.45, 'status-2', 0.32],
  [31.85, 'card-slide', 0.28],
  [32.3, 'status-3', 0.38],
  // Visitors: the floor plan draws in; the question goes, the answer comes; the reference.
  [33.0 + 10 * FR, 'sketch', 0.24],
  [34.3, 'msg-out', 0.34],
  [35.1, 'msg-in', 0.34],
  [35.35, 'pop', 0.28],
  // Install: the icon drops onto the home screen; airplane mode on; the app opens anyway.
  [37.72, 'settle-a', 0.32],
  [37.74, 'pop', 0.22],
  [38.58, 'click', 0.42],
  [38.95, 'open', 0.36],

  // ActThree: the odometer; the A+ shockwave; the mark traced at the close.
  ...odometer(),
  [VO_AT.secure + 8 * FR + 0.05, 'shimmer', 0.22],
  [50.75 + 4 * FR, 'sketch', 0.22],
];
