// The paper pitch: 60 s, 1920x1080, 60 fps, in one take. A camera looks down on a craft
// table and glides across it: her boarding house as a pop-up book; the old way as a
// collage of scraps; the fold into one; the app on a cutting mat; the proof on kraft paper;
// then a pull back to the whole table (everything in one place) and home to the book, which
// closes. Each area is mounted only while the camera can see it.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, random, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {AT, f as F, LEN, REVEAL, TOTAL, WORD, W, H} from './timeline';
import {Blur, Cam, clamp01, EASE, FONT, Hand, Ink, Light, arrow, arrowHead, lerp, PAL, paper, sec, spr, t01, Tape, World, Dymo, Drop} from './kit';
import {Book, BookState, Polaroid} from './Book';
import {Mark} from '../ui/Kit';
import {Pieces} from './Pieces';
import {CuttingMat, MatScenes} from './Mat';
import {KraftSheet, ProofScenes} from './Proof';

// ---- The camera ----------------------------------------------------------------------------
// A starting pose, then moves: [start, end, x, y, zoom, roll]. Each move eases in and out and
// then the camera stays, breathing slightly, until the next. Zoom eases in log space so a
// pull back feels even.
const START: Cam = {x: 860, y: 700, z: 1.05, r: -1.5};
const MOVES: [number, number, number, number, number, number][] = [
  [0.35, 2.4, 990, 520, 0.9, 0],          // the book opens; rise with it
  [4.5, 6.9, 1000, 530, 0.94, 0.4],       // in a little as the windows light
  [7.1, 7.95, 2780, 420, 1.12, -1.2],     // whip right: the spreadsheet
  [11.2, 11.7, 3460, 330, 1.14, 0.8],     // the invoice book
  [12.75, 13.2, 4020, 430, 1.12, 1.4],    // the chat
  [14.75, 15.2, 3180, 820, 1.05, -0.6],   // the sticky notes
  [16.9, 17.5, 3330, 560, 0.86, 0],       // back: nothing connected
  [18.95, 20.4, 3548, 600, 1.2, 0],       // in on the fold
  [21.05, 21.85, 3548, 600, 1.27, 0.3],
  [21.85, 22.45, 2070, 2420, 0.92, -0.8], // dive to the mat: her ledger
  [27.2, 27.75, 3700, 2470, 0.95, 0.8],   // the phone
  [30.8, 31.3, 5150, 2440, 0.98, -0.6],   // repairs
  [32.95, 33.45, 6640, 2470, 0.95, 0.6],  // visitors
  [36.5, 37.0, 8150, 2480, 1.0, -0.8],    // install
  [38.95, 39.45, 8050, 4250, 0.98, 0.5],  // down to the kraft: 937
  [43.05, 43.55, 6680, 4290, 1.08, -0.6], // A+
  [45.3, 45.8, 5080, 4300, 1.04, 0.8],    // 4.53
  [45.8, 49.0, 5090, 4300, 1.08, 0.6],
  [49.05, 50.25, 4480, 2520, 0.185, 0],   // pull back: the whole table
  [50.55, 51.75, 1000, 520, 0.92, 0],     // home to the book
  [51.75, 58.2, 1000, 540, 0.9, 0],
  [58.2, 60.0, 990, 600, 0.97, 0],
];
const camAt = (s: number): Cam => {
  let pose = START;
  for (const [a, b, x, y, z, r] of MOVES) {
    if (s < a) break;
    const p = EASE.inOut(clamp01((s - a) / (b - a)));
    pose = {x: lerp(pose.x, x, p), y: lerp(pose.y, y, p), z: Math.exp(lerp(Math.log(pose.z), Math.log(z), p)), r: lerp(pose.r, r, p)};
  }
  // a hand-held breath
  return {x: pose.x + Math.sin(s * 0.9) * 6, y: pose.y + Math.cos(s * 0.7) * 5, z: pose.z, r: pose.r + Math.sin(s * 0.5) * 0.25};
};
// A short, decaying shake when something lands hard.
const SHAKES = [REVEAL, WORD.aPlus, AT.quality + 2.25];

// ---- Mounting --------------------------------------------------------------------------------
const on = (s: number, spans: [number, number][]) => spans.some(([a, b]) => s >= a && s < b);

const bookState = (s: number): BookState => ({
  open: s < 30 ? t01(s, 0.35, 1.95, EASE.inOut) : 1 - t01(s, 58.25, 59.35, EASE.inOut),
  clouds: t01(s, 0.9, 3.4, EASE.out),
  lit: s > 30 ? 33 : Math.floor(33 * t01(s, AT.units + 0.07, AT.units + 0.95)),
  door: t01(s, WORD.landlady - 0.05, WORD.landlady + 0.35, EASE.out),
  coverSticker: s > 50 ? 1 : 0,
});

// ---- The table -----------------------------------------------------------------------------------
const Table: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: -2600, top: -2200, width: 14400, height: 9800, ...paper(PAL.table, 'kraft', 700)}} />
    {/* a faint ring where a cup stood, a pencil, a roll of tape, a few clips */}
    <div style={{position: 'absolute', left: 2080, top: 1260, width: 300, height: 300, borderRadius: 150, border: '10px solid rgba(140,90,40,0.10)', filter: 'blur(1.5px)'}} />
    <svg width={520} height={60} style={{position: 'absolute', left: 1560, top: 1080, transform: 'rotate(-18deg)', filter: 'drop-shadow(0 6px 5px rgba(70,50,30,0.3))'}}>
      <rect x={60} y={14} width={400} height={32} fill="#f2c14e" /><rect x={60} y={14} width={400} height={10} fill="rgba(255,255,255,0.25)" />
      <polygon points="60,14 0,30 60,46" fill="#e8c9a0" /><polygon points="18,25 0,30 18,35" fill="#333" />
      <rect x={460} y={14} width={38} height={32} fill="#c9c9c9" /><rect x={498} y={14} width={22} height={32} rx={8} fill="#f08fa0" />
    </svg>
    <div style={{position: 'absolute', left: 4560, top: 1340, width: 190, height: 190, borderRadius: 95, background: 'radial-gradient(circle, transparent 0 52px, rgba(246,166,182,0.85) 53px 88px, rgba(0,0,0,0.12) 89px, transparent 92px)',
      filter: 'drop-shadow(0 6px 6px rgba(70,50,30,0.3))'}} />
    {[[6100, 1580, 20], [6180, 1560, -12], [9200, 3300, 70]].map(([x, y, r], i) => (
      <div key={i} style={{position: 'absolute', left: x, top: y, width: 90, height: 30, borderRadius: 15, border: '5px solid #9aa6b2', transform: `rotate(${r}deg)`, boxShadow: '0 3px 3px rgba(0,0,0,0.2)'}} />
    ))}
  </>
);

// Paper confetti that falls as the voice says "in pieces", and blows away with the sticky notes.
const Confetti: React.FC = () => {
  const f = useCurrentFrame();
  const gust = t01(f, sec(AT.notes + 1.0), sec(AT.notes + 1.8), EASE.in);
  return (
    <>
      {Array.from({length: 16}, (_, i) => {
        const at = sec(AT.pieces + 0.15) + Math.floor(random(`ct${i}`) * 60);
        if (f < at) return null;
        const p = spr(f, at, {damping: 14, stiffness: 120});
        const x = 2380 + random(`cx${i}`) * 1900, y = 120 + random(`cy${i}`) * 1000;
        const c = [PAL.coral, PAL.sun, PAL.blue, PAL.pink, PAL.mint, PAL.white][i % 6];
        const pts = Array.from({length: 6}, (_, k) => `${(Math.cos(k * 1.05) * (0.6 + random(`cp${i}${k}`) * 0.4) * 50 + 50).toFixed(0)}% ${(Math.sin(k * 1.05) * (0.6 + random(`cq${i}${k}`) * 0.4) * 50 + 50).toFixed(0)}%`).join(', ');
        return (
          <div key={i} style={{position: 'absolute', left: x - gust * (1400 + i * 60), top: y - gust * (600 + i * 30), width: 60 + random(`cw${i}`) * 50, height: 50 + random(`ch${i}`) * 40,
            transform: `rotate(${random(`cr${i}`) * 360 + (1 - p) * 90 - gust * 200}deg) scale(${1 + (1 - Math.min(1, p)) * 0.6})`, opacity: Math.min(1, p * 3) * (1 - t01(gust, 0.6, 1)),
            clipPath: `polygon(${pts})`, ...paper(c), filter: 'drop-shadow(0 3px 2px rgba(70,50,30,0.3))'}} />
        );
      })}
    </>
  );
};

// The opening, beside the book: the photograph of the real building, and the first notes.
const Opening: React.FC = () => {
  const f = useCurrentFrame();
  const LG = sec(WORD.legazpi), U = sec(AT.units), LL = sec(WORD.landlady);
  return (
    <>
      <Drop at={sec(1.35)} x={1500} y={70} rot={5} from={{dx: 140, dy: -120, rot: 20}} stiff={130}>
        <Polaroid caption={<Hand text="Legazpi City" at={LG} x={70} y={10} size={64} color={PAL.marker} rot={-3} seed="lg" cps={14} />} />
      </Drop>
      <Tape x={1720} y={80} w={170} rot={8} at={sec(1.7)} seed="pt" />
      {/* the first notes; gone by the time the camera comes home */}
      <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - t01(f, sec(30), sec(31))}}>
        <Hand text="33 units" at={U + 2} x={1530} y={560} size={112} color={PAL.marker} font={FONT.marker} rot={-4} seed="u33" cps={14} />
        <Ink pts={arrow(1520, 610, 1280, 330, 0.2)} at={U + 18} dur={0.25} color={PAL.marker} seed="ua" />
        <Ink pts={arrowHead(1280, 330, 1400, 470)} at={U + 32} dur={0.08} color={PAL.marker} seed="uah" />
        <Hand text="1 landlady" at={LL} x={1540} y={720} size={92} color={PAL.red} font={FONT.marker} rot={-2} seed="l1" cps={16} />
        <Ink pts={arrow(1530, 790, 820, 560, -0.16)} at={LL + 14} dur={0.25} color={PAL.red} seed="la" />
        <Ink pts={arrowHead(820, 560, 1000, 640)} at={LL + 28} dur={0.08} color={PAL.red} seed="lah" />
      </div>
    </>
  );
};

// The close: a Hivelet sticker pressed onto the book's sky, over her building (it comes off
// as the book shuts; the cover has its own), and the address and the team on label tape.
const Credits: React.FC = () => {
  const f = useCurrentFrame();
  const at = sec(51.15), p = f < at ? 0 : spr(f, at, {damping: 11, stiffness: 220});
  const gone = t01(f, sec(58.1), sec(58.45), EASE.in);
  return (
  <>
    {p > 0 ? (
      <div style={{position: 'absolute', left: 660, top: 170, width: 200, height: 200, transform: `scale(${lerp(1.8, 1, Math.min(1.05, p)) * (1 - gone * 0.4)}) rotate(${lerp(-30, -7, Math.min(1, p))}deg)`,
        opacity: Math.min(1, p * 3) * (1 - gone), filter: `drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 ${4 + (1 - Math.min(1, p)) * 30}px ${6 + (1 - Math.min(1, p)) * 30}px rgba(40,30,20,0.35))`}}>
        <Mark size={200} hex={PAL.green} />
      </div>
    ) : null}
    <Dymo text="hivelet.vercel.app" at={sec(53.0)} x={200} y={880} color={PAL.green} size={44} rot={-1.5} />
    <Dymo text="Lloyd · Sean · Eljohn · Vince · Kiel" at={sec(54.2)} x={930} y={892} color={PAL.ink} size={40} rot={1} />
    <Dymo text="Group 4 · Bicol University · IT 124 Capstone Project 2" at={sec(55.6)} x={380} y={985} color={PAL.red} size={32} rot={-0.6} />
  </>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));

export const PaperPitch: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const cam = camAt(s);
  // shake
  let sx = 0, sy = 0;
  for (const t of SHAKES) {
    const k = s - t;
    if (k < 0 || k > 0.4) continue;
    const d = Math.exp(-k / 0.09);
    sx += (random(`sx${Math.round(t * 60)}${f}`) - 0.5) * 22 * d;
    sy += (random(`sy${Math.round(t * 60)}${f}`) - 0.5) * 16 * d;
  }
  const a = camAt(s - 1 / 60), b = camAt(s + 1 / 60);
  const bx = Math.min(36, Math.abs(b.x - a.x) / 2 * cam.z * 0.4), by = Math.min(36, Math.abs(b.y - a.y) / 2 * cam.z * 0.4);
  const shown = {x: cam.x - sx / cam.z, y: cam.y - sy / cam.z, z: cam.z, r: cam.r};
  return (
    <AbsoluteFill style={{background: PAL.table, overflow: 'hidden'}}>
      <Blur x={bx} y={by}>
        <World cam={shown}>
          <Table />
          {on(s, [[0, 8.4], [49.0, 60.1]]) ? <>
            <Book s={bookState(s)} x={760} y={640} />
            <Opening />
            {s > 49 ? <Credits /> : null}
          </> : null}
          {on(s, [[6.9, 22.9], [49.0, 52.0]]) ? <><Confetti /><Pieces /></> : null}
          {on(s, [[21.7, 40.0], [49.0, 52.0]]) ? <><CuttingMat /><MatScenes /></> : null}
          {on(s, [[38.7, 52.0]]) ? <><KraftSheet /><ProofScenes /></> : null}
        </World>
      </Blur>
      <Light />
      <AbsoluteFill style={{background: '#000', opacity: t01(f, TOTAL - 40, TOTAL - 2)}} />

      {(Object.keys(AT) as (keyof typeof AT)[]).map((k) => (
        <Sequence key={k} from={F(AT[k])} durationInFrames={F(LEN[k]) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`paper/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {/* the music and every paper sound, in one track (capture/paper-score.mjs) */}
      {files.has('paper/score.wav') ? <Audio src={staticFile('paper/score.wav')} volume={1} /> : null}
    </AbsoluteFill>
  );
};
export const PAPER_FRAMES = TOTAL;
export {W, H, Tape};
