// Act one on the table: the old way as a collage of scraps, each put down as it is named
// (Section 4.1.1, Table 4-1): her spreadsheet with the USB drive it lived on, the paper
// invoice book with one number used twice (five were, Chapter 4), a repair request buried
// in chat, and three inquiries on sticky notes that blow away. Nothing connects them.
// Then every scrap folds into one green hexagon, and the name lands beside it.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {Mark} from '../ui/Kit';
import {AT, REVEAL} from './timeline';
import {arrow, arrowHead, clamp01, Drop, EASE, FONT, Hand, Ink, lerp, lift, PAL, paper, Pin, Ransom, ring, sec, spr, t01, Tape} from './kit';

export const PIECES = {x: 3300, y: 600};
const HEX = {x: PIECES.x - 240, y: PIECES.y - 10, r: 190};

const sheetRows = [
  ['1a', 'Andrea V.', '4,500.00', 'Sep 3', '5070'], ['1b', 'Paolo D.', '4,500.00', 'Sep 4', '5071'], ['1c', 'Kristine S.', '4,800.00', 'Sep 5', '5072'],
  ['1d', 'Mark L.', '4,800.00', 'Sep 6', '5073'], ['1e', 'Bea M.', '4,500.00', 'Sep 7', '5074'], ['1f', 'Joshua R.', '4,500.00', 'Sep 8', '5075'],
  ['1g', 'Ella C.', '4,800.00', 'Sep 9', '5076'], ['1h', 'Carlo B.', '4,500.00', 'Sep 10', '5077'], ['2a', 'Nicole O.', '6,000.00', 'Sep 11', '5078'],
];
const Spreadsheet: React.FC = () => (
  <div style={{width: 640, height: 450, ...paper(PAL.white, 'crumple', 420), position: 'relative', overflow: 'hidden', fontFamily: FONT.type, fontSize: 19, color: '#3b3a36'}}>
    <div style={{display: 'flex', height: 46, alignItems: 'center', background: 'rgba(214,170,60,0.28)', fontWeight: 700, borderBottom: '2px solid rgba(120,90,40,0.4)'}}>
      {['Unit', 'Name', 'Rent', 'Paid', 'Inv.'].map((c, i) => <div key={c} style={{width: [70, 190, 140, 110, 90][i], paddingLeft: 12}}>{c}</div>)}
    </div>
    {sheetRows.map((r, k) => (
      <div key={k} style={{display: 'flex', height: 42, alignItems: 'center', borderBottom: '1px solid rgba(60,60,60,0.12)', background: k === 4 ? 'rgba(236,106,92,0.12)' : undefined}}>
        {r.map((v, i) => <div key={i} style={{width: [70, 190, 140, 110, 90][i], paddingLeft: 12, borderRight: '1px solid rgba(60,60,60,0.08)'}}>{v}</div>)}
      </div>
    ))}
    <div style={{position: 'absolute', right: 0, top: 0, width: 90, height: 90, background: 'linear-gradient(225deg, rgba(0,0,0,0) 48%, rgba(0,0,0,0.10) 50%, #efe8da 52%)'}} />
  </div>
);
const Usb: React.FC = () => (
  <div style={{position: 'relative', width: 300, height: 104}}>
    <div style={{position: 'absolute', left: 0, top: 26, width: 76, height: 52, ...paper('#c9cdd0'), borderRadius: '6px 0 0 6px', boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.08)'}}>
      <div style={{position: 'absolute', left: 14, top: 12, width: 14, height: 10, background: '#555'}} /><div style={{position: 'absolute', left: 40, top: 12, width: 14, height: 10, background: '#555'}} />
    </div>
    <div style={{position: 'absolute', left: 72, top: 0, width: 228, height: 104, ...paper('#2e3a44'), borderRadius: 22, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 26, boxSizing: 'border-box'}}>
      <div style={{fontFamily: FONT.type, fontSize: 13, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)'}}>USB · 8 GB</div>
      <div style={{fontFamily: FONT.type, fontWeight: 700, fontSize: 18, color: '#f3efe6', marginTop: 6}}>her workbook.xlsx</div>
      <div style={{position: 'absolute', right: 20, top: 44, width: 14, height: 14, borderRadius: 7, background: PAL.sun, boxShadow: `0 0 10px ${PAL.sun}`}} />
    </div>
  </div>
);
const Receipt: React.FC<{color: string; amount: string; name: string; circle?: boolean}> = ({color, amount, name}) => (
  <div style={{width: 430, height: 270, ...paper(color), padding: '20px 26px', boxSizing: 'border-box', fontFamily: FONT.type, color: '#5b3b35', position: 'relative'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, letterSpacing: '0.18em'}}><span>OFFICIAL RECEIPT</span></div>
    <div style={{fontFamily: FONT.serif, fontWeight: 600, fontSize: 44, color: '#b0362c', marginTop: 10}}>No. 1182</div>
    <div style={{fontSize: 18, marginTop: 12, borderBottom: '1px dashed rgba(91,59,53,0.4)', paddingBottom: 4}}>Received from <span style={{fontFamily: FONT.hand, fontWeight: 700, fontSize: 30, color: PAL.marker}}>{name}</span></div>
    <div style={{fontSize: 18, marginTop: 10, borderBottom: '1px dashed rgba(91,59,53,0.4)', paddingBottom: 4}}>the sum of <span style={{fontFamily: FONT.hand, fontWeight: 700, fontSize: 30, color: PAL.marker}}>{amount}</span></div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 8, background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 6px, transparent 6px 12px)'}} />
  </div>
);
const Bubble: React.FC<{text: string; color?: string; w?: number; tail?: 'l' | 'r'}> = ({text, color = PAL.white, w = 420, tail = 'l'}) => (
  <div style={{width: w, padding: '18px 24px', boxSizing: 'border-box', borderRadius: tail === 'l' ? '28px 28px 28px 6px' : '28px 28px 6px 28px', ...paper(color),
    fontFamily: FONT.ui, fontWeight: 600, fontSize: 25, lineHeight: 1.3, color: PAL.ink}}>{text}</div>
);
const Sticky: React.FC<{color: string; head: string; text: string}> = ({color, head, text}) => (
  <div style={{width: 250, height: 230, ...paper(color), padding: '18px 20px', boxSizing: 'border-box', boxShadow: 'inset 0 22px 0 rgba(0,0,0,0.04)'}}>
    <div style={{fontFamily: FONT.marker, fontSize: 26, color: '#4a3b2a', opacity: 0.85}}>{head}</div>
    <div style={{fontFamily: FONT.hand, fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: '#2b2a6b', marginTop: 10}}>{text}</div>
  </div>
);

// Where each scrap lies, and the colour of the facet it becomes in the fold.
const SCRAPS = [
  {id: 'sheet', x: 2440, y: 170, w: 640, h: 450, rot: -4, facet: PAL.white},
  {id: 'usb', x: 2760, y: 420, w: 300, h: 104, rot: 13, facet: '#2e3a44'},
  {id: 'book', x: 3230, y: 130, w: 430, h: 270, rot: 5, facet: '#f9d5d0'},
  {id: 'chat', x: 3820, y: 230, w: 420, h: 420, rot: -2, facet: PAL.mint},
  {id: 'notes', x: 2700, y: 760, w: 760, h: 240, rot: 0, facet: PAL.sun},
  {id: 'text', x: 3300, y: 640, w: 900, h: 160, rot: 0, facet: PAL.blue},
];

export const Pieces: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.sheet), B = sec(AT.book), C = sec(AT.chat), N = sec(AT.notes), X = sec(AT.nothing), F = sec(AT.folded), R = sec(REVEAL);
  // The fold: every scrap lifts, flies to the centre and shrinks away as the facets arrive.
  const gather = t01(f, F + 8, F + 44, EASE.inOut);
  const lifted = t01(f, F, F + 12, EASE.out);
  const scrap = (k: number): React.CSSProperties => {
    const s = SCRAPS[k];
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const g = clamp01(gather * 1.15 - k * 0.03);
    return {transform: `translate(${(HEX.x - cx) * g}px, ${(HEX.y - cy) * g}px) scale(${lerp(1 + lifted * 0.06, 0.12, g)}) rotate(${g * (random(`gr${k}`) - 0.5) * 120}deg)`,
      opacity: 1 - t01(g, 0.75, 0.95), transformOrigin: `${cx}px ${cy}px`};
  };
  // The sticky notes: in, then a gust takes them.
  const gust = (i: number) => t01(f, N + sec(1.05) + i * 5, N + sec(1.05) + i * 5 + 40, EASE.in);
  return (
    <div style={{position: 'absolute', left: 0, top: 0}}>
      {/* the spreadsheet and the only copy of it */}
      <div style={{position: 'absolute', left: 0, top: 0, ...scrap(0)}}>
        <Drop at={S} x={SCRAPS[0].x} y={SCRAPS[0].y} rot={-4} from={{dx: -160, dy: -60, rot: -14}}><Spreadsheet /></Drop>
        <Tape x={SCRAPS[0].x + 40} y={SCRAPS[0].y + 6} rot={-40} at={S + 16} seed="t1" />
        <Tape x={SCRAPS[0].x + 610} y={SCRAPS[0].y + 6} rot={38} at={S + 19} seed="t2" />
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, ...scrap(1)}}>
        <Drop at={S + sec(0.82)} x={SCRAPS[1].x} y={SCRAPS[1].y} rot={13} from={{dx: 120, dy: -80, rot: 40}} stiff={190}><Usb /></Drop>
        <Tape x={SCRAPS[1].x + 160} y={SCRAPS[1].y + 52} w={120} rot={-62} at={S + sec(1.15)} color="rgba(246,166,182,0.8)" seed="t3" />
        <Ink pts={arrow(2620, 760, 2800, 560, -0.25)} at={S + sec(1.35)} dur={0.3} color={PAL.red} seed="a1" />
        <Ink pts={arrowHead(2800, 560, 2700, 700)} at={S + sec(1.6)} dur={0.12} color={PAL.red} seed="a1h" />
        <Hand text="the only copy!" at={S + sec(1.4)} x={2330} y={700} size={58} color={PAL.red} rot={-6} seed="h1" />
      </div>

      {/* the invoice book: one number on two receipts */}
      <div style={{position: 'absolute', left: 0, top: 0, ...scrap(2)}}>
        <Drop at={B} x={3300} y={230} rot={-7} from={{dx: 60, dy: -120, rot: -20}}><Receipt color="#fbe9a6" amount="₱4,800" name="Unit 3b" /></Drop>
        <Drop at={B + 7} x={3230} y={130} rot={5} from={{dx: 120, dy: -80, rot: 18}}><Receipt color="#f9d5d0" amount="₱6,000" name="Unit 2a" /></Drop>
        <Ink pts={ring(3352, 205, 125, 44, 'r1')} at={B + sec(0.62)} dur={0.32} color={PAL.red} seed="r1" width={6} />
        <Ink pts={ring(3410, 313, 125, 44, 'r2')} at={B + sec(0.82)} dur={0.32} color={PAL.red} seed="r2" width={6} />
        <Hand text="used twice?!" at={B + sec(1.05)} x={3560} y={470} size={56} color={PAL.red} rot={4} seed="h2" />
      </div>

      {/* the chat: the repair request, and everything that buries it */}
      <div style={{position: 'absolute', left: 0, top: 0, ...scrap(3)}}>
        <Drop at={C} x={3840} y={430} rot={-3} from={{dx: 80, dy: -40, rot: 6}}><Bubble text="Ma'am, the faucet in 2C is leaking." color={PAL.mint} /></Drop>
        {['Good evening po!', 'Is the room still available?', 'Can I pay on Monday?', 'Noted po, thank you'].map((t, i) => (
          <Drop key={t} at={C + sec(0.5) + i * 8} x={3830 + (i % 2) * 40} y={410 - i * 52 + (i === 3 ? 120 : 0)} rot={(i % 2 ? 3 : -4)} from={{dx: 90, dy: -60, rot: i % 2 ? 14 : -10}} stiff={220}>
            <Bubble text={t} color={i % 2 ? '#fff2f4' : PAL.white} tail={i % 2 ? 'r' : 'l'} w={i === 1 ? 440 : 400} />
          </Drop>
        ))}
        <Pin x={4030} y={250} at={C + sec(1.1)} />
        <Hand text="buried" at={C + sec(1.15)} x={4120} y={640} size={56} color={PAL.red} rot={-5} seed="h3" />
      </div>

      {/* three inquiries on sticky notes, and the gust that takes them */}
      {[{c: PAL.sun, h: 'FB', t: 'still available?'}, {c: PAL.pink, h: 'TEXT', t: 'how much po?'}, {c: PAL.blue, h: 'WALK-IN', t: 'any vacant room?'}].map((n, i) => {
        const g = gust(i);
        return (
          <div key={n.h} style={{position: 'absolute', left: 0, top: 0, transform: `translate(${-g * (900 + i * 200)}px, ${-g * (500 + i * 120)}px) rotate(${g * (-90 - i * 40)}deg)`,
            transformOrigin: `${2780 + i * 270}px 880px`, opacity: 1 - t01(g, 0.6, 1)}}>
            <Drop at={N + sec(0.1) + i * 9} x={2700 + i * 270} y={770} rot={[-6, 4, -2][i]} from={{dx: 0, dy: -70, rot: 20}} stiff={200}>
              <div style={{transform: `perspective(800px) rotateX(${g * 50}deg) rotateY(${g * 30}deg)`}}><Sticky color={n.c} head={n.h} text={n.t} /></div>
            </Drop>
          </div>
        );
      })}

      {/* nothing connected: the lines between them, struck out, and the words */}
      <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - t01(f, F, F + 10)}}>
        {[[[2900, 640], [3300, 420]], [[3560, 420], [3860, 520]], [[3900, 760], [3400, 960]]].map(([a, b], i) => (
          <React.Fragment key={i}>
            <Ink pts={[a as [number, number], [(a[0] + b[0]) / 2 + 30, (a[1] + b[1]) / 2 - 30], b as [number, number]]} at={X + i * 5} dur={0.25} color={PAL.marker} width={5} dash="0.04 0.03" seed={`l${i}`} />
            <Ink pts={[[(a[0] + b[0]) / 2 - 30, (a[1] + b[1]) / 2 - 60], [(a[0] + b[0]) / 2 + 40, (a[1] + b[1]) / 2 + 20]]} at={X + sec(0.45) + i * 5} dur={0.1} color={PAL.red} width={9} seed={`x${i}a`} />
            <Ink pts={[[(a[0] + b[0]) / 2 + 40, (a[1] + b[1]) / 2 - 60], [(a[0] + b[0]) / 2 - 30, (a[1] + b[1]) / 2 + 20]]} at={X + sec(0.52) + i * 5} dur={0.1} color={PAL.red} width={9} seed={`x${i}b`} />
          </React.Fragment>
        ))}
      </div>
      <div style={{position: 'absolute', left: 2280, top: 560, width: 2100, ...scrap(5)}}>
        <Ransom text="Nothing connected." at={X} size={128} stagger={2.2} seed="nc" />
      </div>

      {/* The fold: six facets, one from each scrap, close into a hexagon and turn over green. */}
      <Fold />
      {/* The name. */}
      <div style={{position: 'absolute', left: HEX.x + HEX.r + 50, top: HEX.y - 110, display: 'flex', gap: 4}}>
        {'Hivelet'.split('').map((ch, i) => {
          const t = R + i * 3;
          if (f < t) return null;
          const p = spr(f, t, {damping: 11, stiffness: 260});
          return (
            <span key={i} style={{display: 'inline-block', fontFamily: FONT.grot, fontWeight: 800, fontSize: 240, lineHeight: 1, letterSpacing: '-0.05em', color: PAL.green,
              transform: `translateY(${(1 - Math.min(1, p)) * -80}px) scale(${lerp(1.6, 1, Math.min(1.04, p))}) rotate(${(random(`hv${i}`) - 0.5) * 6}deg)`, opacity: Math.min(1, p * 3),
              filter: `drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 ${4 + (1 - Math.min(1, p)) * 30}px ${6 + (1 - Math.min(1, p)) * 30}px rgba(74,52,30,0.3))`}}>{ch}</span>
          );
        })}
      </div>
    </div>
  );
};

// Six triangles, each in one scrap's paper, fly into a hexagon, then fold over one by one to
// show green on their backs; the white house mark is pressed on top.
const Fold: React.FC = () => {
  const f = useCurrentFrame();
  const F = sec(AT.folded), R = sec(REVEAL);
  const arrive = (k: number) => spr(f, F + 22 + k * 3, {damping: 16, stiffness: 150});
  const flip = (k: number) => t01(f, F + 50 + k * 5, F + 50 + k * 5 + 16, EASE.inOut);
  const mark = f < R - 14 ? 0 : spr(f, R - 14, {damping: 12, stiffness: 240});
  if (f < F + 18) return null;
  const r = HEX.r;
  return (
    <div style={{position: 'absolute', left: HEX.x - r, top: HEX.y - r, width: r * 2, height: r * 2, perspective: 1200}}>
      {Array.from({length: 6}, (_, k) => {
        const a0 = -Math.PI / 2 + (k * Math.PI) / 3, a1 = a0 + Math.PI / 3;
        const p = arrive(k), fl = flip(k);
        const from = {x: (random(`fx${k}`) - 0.5) * 1400, y: (random(`fy${k}`) - 0.5) * 900};
        // the outer edge's midpoint and direction: the facet turns over about it
        const mx = Math.cos((a0 + a1) / 2), my = Math.sin((a0 + a1) / 2);
        const pts = `${r}px ${r}px, ${r + Math.cos(a0) * r}px ${r + Math.sin(a0) * r}px, ${r + Math.cos(a1) * r}px ${r + Math.sin(a1) * r}px`;
        const ox = r + mx * r * 0.866, oy = r + my * r * 0.866;
        return (
          <div key={k} style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: `${ox}px ${oy}px`,
            transform: `translate(${from.x * (1 - p)}px, ${from.y * (1 - p)}px) rotate(${(1 - p) * 200}deg) rotate3d(${-my}, ${mx}, 0, ${fl * 180}deg)`, opacity: Math.min(1, p * 2) * (1 - t01(f, F + 84, F + 90))}}>
            <div style={{position: 'absolute', inset: 0, clipPath: `polygon(${pts})`, ...paper(SCRAPS[k].facet), backfaceVisibility: 'hidden'}} />
            <div style={{position: 'absolute', inset: 0, clipPath: `polygon(${pts})`, ...paper(k % 2 ? PAL.green : '#1d6b47'), transform: 'rotateY(180deg)', backfaceVisibility: 'hidden'}} />
          </div>
        );
      })}
      {/* the folded cell, its corners pressed round: the mark's own hexagon (circumradius 244/512 of its size) */}
      <div style={{position: 'absolute', left: r - 1.05 * r, top: r - 1.05 * r, opacity: t01(f, F + 80, F + 86), filter: `drop-shadow(${lift(0.1).split(', ')[0]})`}}>
        <Mark size={2.1 * r} hex={PAL.green} draw={0} />
      </div>
      {mark > 0 ? (
        <div style={{position: 'absolute', left: r - 1.05 * r, top: r - 1.05 * r, width: 2.1 * r, height: 2.1 * r, transform: `scale(${lerp(1.5, 1, Math.min(1, mark))})`, opacity: Math.min(1, mark * 3), filter: `drop-shadow(0 ${(1 - Math.min(1, mark)) * 20 + 3}px ${(1 - Math.min(1, mark)) * 20 + 3}px rgba(0,40,20,0.35))`}}>
          <svg width={2.1 * r} height={2.1 * r} viewBox="0 0 512 512">
            {[['M146 216 L256 126 L366 216', 0], ['M186 244 V366', 0], ['M326 244 V366', 0], ['M186 304 H326', 0]].map(([d], i) => (
              <path key={i} d={d as string} fill="none" stroke="#fffaf0" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        </div>
      ) : null}
    </div>
  );
};
export {HEX};
