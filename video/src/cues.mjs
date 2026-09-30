// Every sound in the film, and the thing on screen it belongs to.
//
// One list, so the picture and the sound can be checked against each other:
// capture/cuecheck.mjs renders the frame at every cue and prints what should be
// happening in it. Frames are local to the scene. Nothing here is a transition
// swell: camera moves are silent, and a sound only plays when an object on
// screen lands, slides, is written on, clicked, typed into or arrives.
//
// Timings are read off the scene code (see the comment on each group); change a
// scene's timing and change its cues here. Typing is the exception: key taps
// come from src/typing.mjs, the same times that put each character on screen.

import {TYPING, doneOf, timesOf} from './typing.mjs';

const KEYS = ['key1', 'key2', 'key3'];
// A key tap on the frame each character appears, never between.
const typing = (k, vol, what) => timesOf(k).map((t, i) => [Math.ceil(t), KEYS[(i * 7) % 3], vol * (0.85 + ((i * 13) % 4) * 0.05), `${what} (${JSON.stringify(TYPING[k].text[i])})`]);
const range = (n, fn) => Array.from({length: n}, (_, i) => fn(i));

export const GAIN = 1.3;

export function buildCues(tl) {
  const [B0, B1, B2, B3, B4, B5] = tl.act1.beats;
  const CON = tl.act1.connected, HIVE = tl.act1.hive, BRAAM = tl.act1.braam;
  // Act1.tsx: Enter is pressed 7 frames after the last digit of each rent.
  const enter = ['sheet1', 'sheet2'].map((k) => Math.round(doneOf(k) + 7));
  // Act1.tsx: the drive's light blinks on from B0+128 whenever sin(f / 5) > 0.
  let led = B0 + 129;
  while (Math.sin(led / 5) <= 0) led++;
  return {
    act1: [
      ...typing('sheet1', 0.2, 'a digit typed into the Rent cell'),
      [enter[0], 'tick-b', 0.16, 'Enter: 4800 becomes 4,800.00 and the selection moves down a row'],
      ...typing('sheet2', 0.18, 'a digit typed into the next Rent cell'),
      [enter[1], 'tick-b', 0.15, 'Enter: 4500 becomes 4,500.00 and the selection moves down a row'],
      // The sheet shrinks into the file card (B0+10..76); the card slides into the drive (B0+98..124).
      [B0 + 72, 'settle-a', 0.12, 'the shrinking sheet settles as her workbook file card'],
      [B0 + 100, 'card-slide', 0.2, 'the file card slides toward the drive'],
      [B0 + 116, 'soft-click', 0.3, 'the file card goes into the drive'],
      [led, 'beep', 0.12, "the drive's light comes on"],
      // Receipts: arrive B1+28..46; slide together B1+56..76; ring drawn B1+76..94.
      [B1 + 32, 'paper', 0.14, 'the receipts rise into view'],
      [B1 + 56, 'paper-slide', 0.14, 'one receipt slides over the other'],
      [B1 + 76, 'pen', 0.16, 'the two matching numbers are circled'],
      // Rows (at B2+36): hatched cells show from at+8+3r for the missing rows; the ring fills from at+30.
      ...[0, 1, 3, 4, 6, 8].map((r, i) => [B2 + 46 + 3 * r, `tick-${'abcdef'[i]}`, 0.08, `an empty anniversary and deposit appears in row ${r + 1}`]),
      [B2 + 66, 'fill', 0.14, 'the 43% ring fills'],
      // Chat (at B3+26): bubbles pop at +12, +28, +44. Ask (at B4+28): the question at +10.
      [B3 + 39, 'msg-in', 0.16, "a tenant's message about the faucet"],
      [B3 + 55, 'msg-out', 0.16, "her reply, 'Noted po'"],
      [B3 + 71, 'msg-in', 0.16, "another tenant's message about a light"],
      [B4 + 39, 'msg-in', 0.18, 'a tenant asks what they owe'],
      // Inquiries (at B5+26): social media at +10, a text at +24; in person, the
      // visitor walks up to the landlady from +40, a foot landing at +50 and +60
      // (Act1.tsx IN_PERSON). What they say is only spoken, so it makes no sound.
      [B5 + 37, 'msg-in', 0.15, 'a message arrives on social media'],
      [B5 + 51, 'sms', 0.22, 'a text message arrives'],
      [B5 + 76, 'step-a', 0.3, 'the visitor steps toward the landlady'],
      [B5 + 86, 'step-b', 0.26, 'the visitor steps up and stops in front of her'],
      // Nothing connected: the links reach (CON+64..96), then break at CON+104.
      [CON + 104, 'snap', 0.12, 'the dashed links between the problems break'],
      // The hive: each problem bends into a hexagon from HIVE+4i and lands at about HIVE+80+4i;
      // the outer twelve land at about HIVE+96+2j; the centre cell at HIVE+122. Then the
      // cells close up and the whole straightens into the mark, whole on the brass hit
      // in the score (BRAAM), so that part has no effect of its own.
      [HIVE + 14, 'glass', 0.16, 'the problems bend into hexagons'],
      ...range(6, (i) => [HIVE + 80 + 4 * i, i % 2 ? 'lock-b' : 'lock-a', 0.12, `problem ${i + 1} locks into the ring around the centre`]),
      ...range(12, (j) => [HIVE + 97 + 2 * j, j % 2 ? 'lock-a' : 'lock-b', 0.07, `outer cell ${j + 1} locks into the hive`]),
      [HIVE + 125, 'blip', 0.12, 'the centre cell appears'],
      [BRAAM + 54, 'shimmer', 0.2, 'the name Hivelet appears beside the icon'],
    ],
    overview: [
      // Pieces fly in at 8,16,24,32,40 (flyIn, settled about 12 frames later).
      ...[8, 16, 24, 32, 40].map((a, i) => [a + 10, ['settle-a', 'settle-b', 'settle-c', 'settle-a', 'settle-b'][i], 0.22,
        ['the attention tile lands', 'the collected tile lands', 'the occupancy tile lands', 'the collections chart lands', 'the clusters tile lands'][i]]),
      [147, 'blip', 0.09, 'the attention count pops to 1'],
      // ChartTile at=226: bar i grows from 232+3i.
      // Each bar's note is set against the groove under it (capture/levels.mjs).
      ...range(9, (i) => [234 + 3 * i, `pluck-${i + 1}`, [0.18, 0.14, 0.1, 0.09, 0.1, 0.11, 0.09, 0.05, 0.07][i], `the ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][i]} bar grows`]),
    ],
    rooms: [
      // Unit cards flip up along diagonals at 20+3d.
      ...range(13, (d) => [22 + 3 * d, `flip-${'abc'[d % 3]}`, 0.18, `diagonal ${d + 1} of unit cards flips up`]),
      [142, 'open', 0.16, 'unit 1A lifts out of the wall'],
    ],
    income: [
      ...[8, 14, 20, 26].map((a, i) => [a + 10, ['settle-a', 'settle-b', 'settle-c', 'settle-a'][i], [0.2, 0.33, 0.2, 0.2][i],
        ['Collected altogether lands', 'the Rent tile lands', 'the Water tile lands', 'the 50% Share tile lands'][i]]),
      // Ledger rows at 36+11i.
      ...range(6, (i) => [38 + 11 * i, `tick-${'abcdef'[i]}`, [0.16, 0.12, 0.13, 0.12, 0.11, 0.07][i], `ledger row ${i + 1} slides in`]),
      [123, 'soft-click', 0.27, 'the pointer clicks Record payment'],
      [129, 'open', 0.2, 'the Record payment dialog opens'],
      [167, 'soft-click', 0.27, 'the pointer clicks the Unit field'],
      [171, 'tick-c', 0.1, 'the unit list drops open'],
      [205, 'soft-click', 0.27, 'the pointer picks 2B, Renzo Abrenica'],
      [233, 'soft-click', 0.27, 'the pointer clicks the receipt number field'],
      ...typing('or', 0.08, 'a digit of the receipt number is typed'),
      [287, 'soft-click', 0.27, 'the pointer clicks Record payment in the dialog'],
      [295, 'open', 0.18, 'the confirmation opens'],
      [303, 'soft-warn', 0.24, '"2B already has a payment recorded for this period" appears and shakes'],
    ],
    tenant: [
      [18, 'settle-deep', 0.45, 'the phone lands'],
      [28, 'settle-a', 0.22, 'the Amount due close-up lands'],
      [64, 'blip', 0.16, '"Due in 6 days" pops in'],
      // Her rent, month by month (People.tsx T): the phone goes to Payments at 100,
      // the close-up pops at 110, the months rise from 126 (one every 3 frames);
      // the phone goes back to her Overview at 200.
      [101, 'nav', 0.3, 'the phone moves to her Payments page'],
      [122, 'settle-a', 0.22, 'the month-by-month close-up lands'],
      [127, 'fill', 0.14, 'her months rise one by one, October to September'],
      [201, 'nav', 0.3, 'the phone goes back to her Overview'],
      // From the payment on, everything is its fifth-cut frame plus 132: the dialog
      // opens the payment page at 238; back from GCash, "Payment received" at 270.
      [232, 'tap', 0.15, 'Pay with GCash is tapped'],
      [239, 'open', 0.18, 'the Pay with GCash dialog opens the payment page'],
      [271, 'bell', 0.12, '"Payment received": Adyen has confirmed it'],
      [307, 'flick', 0.1, 'the ₱4,700.00 chip lifts off the phone'],
      [328, 'settle-b', 0.33, "her attention tile lands, with Andrea's payment"],
      [377, 'soft-click', 0.27, 'the pointer clicks Review payments'],
      [401, 'chime', 0.06, 'the phone changes to Settled'],
      [429, 'nav', 0.3, 'the phone moves to Repairs'],
      [452, 'settle-c', 0.23, 'the form close-up lands'],
      ...typing('title', 0.05, 'a letter of the repair title is typed'),
      ...typing('details', 0.04, 'a letter of the details is typed'),
      // T: send 576, board 578, fly 582..608, s1 618..634, s2 638..654, note 660.
      [576, 'tap', 0.15, 'Send request is tapped'],
      [583, 'flick', 0.1, 'the repair card lifts off the phone'],
      [588, 'settle-a', 0.22, 'her repairs board lands'],
      [605, 'status-1', 0.26, 'the card lands in To dispatch'],
      [619, 'card-slide', 0.27, 'the card slides toward In progress'],
      [632, 'status-2', 0.15, 'the card lands in In progress'],
      [639, 'card-slide', 0.27, 'the card slides toward Done'],
      [652, 'status-3', 0.12, 'the card lands in Done'],
      [661, 'bell', 0.11, '"Your repair is done" drops onto the phone'],
    ],
    guests: [
      // People.tsx G: plan 26..72, chip 76, lift 104..134, drop 176..202, click 206,
      // dialog 212, autofill 232/236/240, send 338; the confirmation rises in from
      // 359; the question lifts off at 400 and lands in her list at 428; she picks it
      // at 446 and saves her answer at 554 (in the thread at 558); it lifts off her
      // screen at 574 and lands on the visitor's page at 600; they send theirs at 666.
      [18, 'settle-a', 0.17, 'the B3B showcase lands'],
      [27, 'sketch', 0.22, 'the floor plan draws itself in'],
      [77, 'blip', 0.065, 'the B3B label pops onto the plan'],
      [131, 'settle-b', 0.21, 'the plan settles, lifted out for a closer look'],
      [200, 'settle-c', 0.15, 'the plan settles back into the showcase'],
      [206, 'soft-click', 0.18, 'the pointer clicks Ask about unit B3B'],
      [213, 'open', 0.25, 'the Ask about unit B3B dialog opens'],
      [232, 'tick-a', 0.24, 'the name fills in'],
      [236, 'tick-b', 0.14, 'the phone number fills in'],
      [240, 'tick-c', 0.14, 'the email address fills in'],
      ...typing('question', 0.045, 'a letter of the question is typed'),
      [338, 'soft-click', 0.18, 'the pointer clicks Send inquiry'],
      [359, 'chime', 0.08, '"Your message about unit B3B is saved" rises in, with the link and the code'],
      [401, 'flick', 0.15, 'the question lifts off the dialog'],
      [419, 'settle-a', 0.17, 'her Inquiries lands'],
      [430, 'bell', 0.14, "Kaye's inquiry lands at the top of her list"],
      [446, 'soft-click', 0.18, "the pointer picks Kaye's inquiry"],
      ...typing('reply', 0.045, 'a letter of her answer is typed'),
      [554, 'soft-click', 0.18, 'the pointer clicks Save reply'],
      [559, 'msg-out', 0.16, 'her answer appears in the thread, and the inquiry reads Answered'],
      [575, 'flick', 0.15, 'her answer lifts off her screen'],
      [590, 'settle-b', 0.2, "the visitor's conversation page lands"],
      [601, 'bell', 0.14, "Michelle's answer lands on the visitor's page"],
      ...typing('back', 0.045, 'a letter of their answer is typed'),
      [666, 'soft-click', 0.18, 'the pointer clicks Send'],
      [671, 'msg-out', 0.16, 'their answer appears under hers'],
    ],
    proof: [
      [40, 'settle-deep', 0.4, 'the income records count lands and runs to 937'],
      [58, 'settle-deep', 0.4, 'the expense records count lands and runs to 1,327'],
      [76, 'settle-deep', 0.4, 'the check suites count lands and runs to 20'],
      [127, 'chime', 0.14, 'the last count finishes'],
    ],
    end: [
      [56, 'shimmer', 0.2, 'the name Hivelet appears'],
    ],
  };
}
