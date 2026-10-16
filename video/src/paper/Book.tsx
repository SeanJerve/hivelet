// Her boarding house as a pop-up book, in CSS 3D: the back page is the sky, the front page
// the ground, and the building stands between them, cream walls, blue rails, a green
// awning on top and a coral one by the door, as in the photograph. Opening the book
// stands everything up; closing it folds everything flat under the cover.
//
// Geometry (book units): the hinge runs along y = 0. Walls are plain divs (upright, facing
// the viewer); the ground page is turned 90 degrees to lie flat toward the viewer. A piece
// that stands at depth z folds forward about its foot when the book closes, so it lies on
// the ground page face down, under the back page coming down on top of it.
import React from 'react';
import {random, staticFile, Img} from 'remotion';
import {Mark} from '../ui/Kit';
import {clamp01, FONT, lerp, PAL, paper} from './kit';

export const PW = 1300, PD = 560, PH = 560;  // page width, ground depth, sky height
const FW = 1060, FH = 470, FZ = 60;            // the building: width, height, depth from the hinge
const ROWS = 3, COLS = 11;
export const WIN_ORDER: number[] = Array.from({length: ROWS * COLS}, (_, i) => i)
  .sort((a, b) => ((a % COLS) + random(`w${a}`) * 2.2) - ((b % COLS) + random(`w${b}`) * 2.2));

const stand = (open: number, delay = 0) => -90 * (1 - clamp01((open - delay) / (1 - delay)));

// A leafy paper tree: overlapping leaf shapes in two greens on a trunk.
const Tree: React.FC<{w: number; h: number; seed: string}> = ({w, h, seed}) => (
  <svg width={w} height={h} viewBox="0 0 200 260">
    <rect x="92" y="150" width="16" height="110" rx="6" fill="#8a5a3c" />
    {Array.from({length: 9}, (_, i) => {
      const a = (i / 9) * Math.PI * 2, r = 46 + random(`${seed}${i}`) * 20;
      return <ellipse key={i} cx={100 + Math.cos(a) * r * 0.9} cy={100 + Math.sin(a) * r * 0.7} rx={44} ry={30} fill={i % 2 ? PAL.leaf : PAL.leafDark}
        transform={`rotate(${(a * 180) / Math.PI} ${100 + Math.cos(a) * r * 0.9} ${100 + Math.sin(a) * r * 0.7})`} stroke="rgba(0,0,0,0.12)" strokeWidth={2} />;
    })}
    <ellipse cx="100" cy="100" rx="58" ry="46" fill={PAL.leaf} stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
  </svg>
);
const Cloud: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={w * 0.5} viewBox="0 0 200 100" style={{filter: 'drop-shadow(0 5px 3px rgba(40,80,120,0.25))'}}>
    <path d="M30 80 Q8 80 12 60 Q14 42 36 46 Q40 18 72 22 Q92 0 120 18 Q150 8 160 38 Q190 36 188 62 Q188 82 162 80 Z" fill="#fffdf8" />
  </svg>
);

export type BookState = {
  open: number;      // 0 closed, 1 open at 90 degrees
  lit: number;       // how many windows are lit (in WIN_ORDER)
  door: number;      // 0 shut, 1 open
  coverSticker: number; // the Hivelet sticker on the cover, 0 or 1
  clouds: number;    // the clouds drifting in, 0 to 1
  tilt?: number;     // the viewing angle (degrees down from level)
};

export const Book: React.FC<{s: BookState; x: number; y: number}> = ({s, x, y}) => {
  const tilt = s.tilt ?? 26;
  // stops a hair above flat, so the cover lies on top of the building when closed
  const backdrop = -89.2 * (1 - s.open);
  return (
    <div style={{position: 'absolute', left: x - 900, top: y - 700, width: 1800, height: 1400, perspective: 2800, perspectiveOrigin: '50% 30%', transform: 'scale(0.86)', transformOrigin: '50% 50%'}}>
      <div style={{position: 'absolute', left: 900 - PW / 2, top: 700, width: PW, height: 0, transformStyle: 'preserve-3d', transform: `rotateX(${-tilt}deg)`}}>
        {/* The cover boards under everything, and the ground page on them. */}
        <div style={{position: 'absolute', left: -24, top: 0, width: PW + 48, height: PD + 24, transformOrigin: '50% 0', transform: 'translateY(4px) rotateX(90deg)',
          ...paper('#b9493a', 'fibers', 300), borderRadius: '0 0 10px 10px', boxShadow: '0 0 0 2px rgba(0,0,0,0.08)'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PD, transformOrigin: '50% 0', transform: 'translateY(2px) rotateX(90deg)', ...paper(PAL.cream)}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 26, background: 'linear-gradient(180deg, rgba(90,60,30,0.28), rgba(90,60,30,0))'}} />
          <div style={{position: 'absolute', left: PW / 2 - 70, top: 30, width: 140, height: PD - 30, ...paper('#d8b78a'), clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)'}} />
          <div style={{position: 'absolute', left: 0, top: 30, width: PW / 2 - 120, height: PD - 30, ...paper('#9ccf86')}} />
          <div style={{position: 'absolute', right: 0, top: 30, width: PW / 2 - 120, height: PD - 30, ...paper('#9ccf86')}} />
          {Array.from({length: 14}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: (i < 7 ? 40 : PW / 2 + 140) + (i % 7) * 70 + random(`fl${i}`) * 20, top: 120 + random(`fy${i}`) * 360, width: 18, height: 18, borderRadius: 9,
              background: [PAL.coral, PAL.sun, PAL.pink, '#fff'][i % 4], boxShadow: '0 2px 2px rgba(0,0,0,0.2)'}} />
          ))}
        </div>

        {/* The sky: the back page, with the cover on its back. */}
        <div style={{position: 'absolute', left: 0, top: -PH - 3, width: PW, height: PH, transformOrigin: '50% 100%', transform: `rotateX(${backdrop}deg)`, transformStyle: 'preserve-3d'}}>
          <div style={{position: 'absolute', inset: 0, ...paper(PAL.sky), backfaceVisibility: 'hidden', overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: PW - 260, top: 60, width: 130, height: 130, borderRadius: 65, ...paper(PAL.sun), boxShadow: '0 6px 0 rgba(0,0,0,0.06)'}} />
            <div style={{position: 'absolute', left: lerp(-260, 90, s.clouds), top: 70}}><Cloud w={260} /></div>
            <div style={{position: 'absolute', left: lerp(PW + 60, 760, s.clouds), top: 150}}><Cloud w={210} /></div>
            <div style={{position: 'absolute', left: lerp(-200, 420, s.clouds * 0.9), top: 210}}><Cloud w={150} /></div>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, background: 'linear-gradient(0deg, rgba(40,60,90,0.25), rgba(40,60,90,0))'}} />
          </div>
          <div style={{position: 'absolute', left: -24, top: -24, width: PW + 48, height: PH + 24, transform: 'rotateY(180deg) rotateZ(180deg)', backfaceVisibility: 'hidden',
            ...paper('#c4503f', 'fibers', 300), borderRadius: '10px 10px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>
            <div style={{position: 'absolute', inset: 22, border: '3px solid rgba(255,226,170,0.55)', borderRadius: 8}} />
            <div style={{fontFamily: FONT.serif, fontWeight: 600, fontStyle: 'italic', fontSize: 50, color: '#ffe2aa', opacity: 0.9, letterSpacing: '0.01em'}}>The</div>
            <div style={{fontFamily: FONT.serif, fontWeight: 800, fontSize: 92, lineHeight: 0.95, color: '#ffe2aa', textAlign: 'center', letterSpacing: '-0.02em'}}>Fe Galang Da Silva<br />Boarding House</div>
            {s.coverSticker > 0 ? (
              <div style={{position: 'absolute', right: 70, bottom: 56, transform: 'rotate(-8deg)', padding: 14, borderRadius: 26, background: '#fff', boxShadow: '0 6px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 14}}>
                <Mark size={110} hex={PAL.green} />
                <span style={{fontFamily: FONT.grot, fontWeight: 800, fontSize: 64, color: PAL.green, letterSpacing: '-0.04em', paddingRight: 10}}>Hivelet</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* The building. */}
        <div style={{position: 'absolute', left: (PW - FW) / 2, top: -FH, width: FW, height: FH, transformOrigin: '50% 100%', transform: `translateZ(${FZ}px) rotateX(${stand(s.open, 0.05)}deg)`,
          backfaceVisibility: 'hidden'}}>
          <div style={{position: 'absolute', inset: 0, ...paper('#f2e4c8'), boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.05)'}} />
          {/* green awning over the top floor */}
          <div style={{position: 'absolute', left: 520, top: -34, width: 520, height: 58, ...paper(PAL.awning), clipPath: 'polygon(0 0, 100% 0, 97% 100%, 3% 100%)'}} />
          {Array.from({length: ROWS}, (_, r) => (
            <React.Fragment key={r}>
              <div style={{position: 'absolute', left: -14, right: -14, top: 26 + r * 112 + 92, height: 14, ...paper('#d9cfbd'), boxShadow: '0 4px 0 rgba(0,0,0,0.08)'}} />
              {r < 2 ? (
                <div style={{position: 'absolute', left: 6, right: 6, top: 26 + r * 112 + 58, height: 34, borderTop: `5px solid ${PAL.cobalt}`,
                  background: `repeating-linear-gradient(90deg, ${PAL.cobalt} 0 4px, transparent 4px 26px)`, opacity: 0.95}} />
              ) : null}
            </React.Fragment>
          ))}
          {Array.from({length: ROWS * COLS}, (_, i) => {
            const r = Math.floor(i / COLS), c = i % COLS;
            const lit = WIN_ORDER.indexOf(i) < s.lit;
            return (
              <div key={i} style={{position: 'absolute', left: 30 + c * 92, top: 30 + r * 112, width: 64, height: 56, borderRadius: 3,
                ...paper(lit ? PAL.sun : '#34445f'), boxShadow: lit ? '0 0 22px rgba(255,200,80,0.75), inset 0 0 0 3px rgba(255,255,255,0.35)' : 'inset 0 0 0 3px rgba(255,255,255,0.12)'}}>
                <div style={{position: 'absolute', left: 30, top: 0, bottom: 0, width: 4, background: lit ? 'rgba(160,110,20,0.35)' : 'rgba(255,255,255,0.12)'}} />
              </div>
            );
          })}
          {/* the ground floor: a coral awning, the door, plants */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 362, bottom: 0, ...paper('#e9d9b9')}} />
          <div style={{position: 'absolute', left: 40, top: 352, width: 300, height: 46, ...paper(PAL.coral), clipPath: 'polygon(0 0, 100% 0, 94% 100%, 6% 100%)'}} />
          <div style={{position: 'absolute', left: FW / 2 - 50, top: 368, width: 100, height: 102, background: '#fff3c4', boxShadow: 'inset 0 0 30px rgba(245,170,40,0.9)', overflow: 'hidden'}}>
            {/* one small figure in the light */}
            <div style={{position: 'absolute', left: 38, top: 22, width: 24, height: 24, borderRadius: 12, background: '#3b2a20', opacity: s.door}} />
            <div style={{position: 'absolute', left: 30, top: 46, width: 40, height: 60, borderRadius: '18px 18px 4px 4px', background: '#3b2a20', opacity: s.door}} />
          </div>
          <div style={{position: 'absolute', left: FW / 2 - 50, top: 368, width: 100, height: 102, transformOrigin: '0 50%', transform: `perspective(600px) rotateY(${-78 * s.door}deg)`,
            ...paper('#8a5a3c'), boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.12)'}}>
            <div style={{position: 'absolute', right: 14, top: 50, width: 10, height: 10, borderRadius: 5, background: PAL.sun}} />
          </div>
        </div>

        {/* Trees either side, and a hedge along the front. */}
        {[{x: 40, s: 'ta'}, {x: PW - 260, s: 'tb'}].map((t) => (
          <div key={t.s} style={{position: 'absolute', left: t.x, top: -260, width: 220, height: 260, transformOrigin: '50% 100%',
            transform: `translateZ(260px) rotateX(${stand(s.open, 0.18)}deg)`, backfaceVisibility: 'hidden'}}>
            <Tree w={220} h={260} seed={t.s} />
          </div>
        ))}
        <div style={{position: 'absolute', left: 120, top: -86, width: PW - 240, height: 86, transformOrigin: '50% 100%', transform: `translateZ(440px) rotateX(${stand(s.open, 0.3)}deg)`, backfaceVisibility: 'hidden'}}>
          <svg width={PW - 240} height={86} viewBox={`0 0 ${PW - 240} 86`}>
            <path d={`M0 86 ${Array.from({length: 24}, (_, i) => `Q ${(i + 0.5) * (PW - 240) / 24} ${random(`h${i}`) * 20} ${(i + 1) * (PW - 240) / 24} ${30 + random(`hh${i}`) * 20}`).join(' ')} L ${PW - 240} 86 Z`}
              fill={PAL.leafDark} stroke="rgba(0,0,0,0.15)" strokeWidth={2} />
            <rect x={(PW - 240) / 2 - 90} y={0} width={180} height={86} fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// The real building, as a print with a white border, for beside the book.
export const Polaroid: React.FC<{caption?: React.ReactNode}> = ({caption}) => (
  <div style={{width: 420, padding: '20px 20px 0', boxSizing: 'border-box', ...paper('#fbf8f1'), borderRadius: 4}}>
    <div style={{width: 380, height: 300, overflow: 'hidden', background: '#ddd'}}>
      <Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '42% 50%', filter: 'saturate(1.05) contrast(1.02)'}} />
    </div>
    <div style={{height: 92, position: 'relative'}}>{caption}</div>
  </div>
);
