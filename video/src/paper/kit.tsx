// The paper pitch's materials. Everything on screen is meant to read as something you
// could touch: paper with tooth and fibres, washi tape with torn ends, marker that
// boils a little (redrawn at 12 fps, as hand-drawn animation is), rubber stamps with
// uneven ink, label-maker tape, a split-flap counter and foil star stickers. The camera
// and everything that moves through space run at the full 60 fps; only the hand-made
// marks boil at 12, which is what makes them read as drawn.
import React from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS, W, H} from './timeline';

// ---- Type ------------------------------------------------------------------------------
// The faces ship in public/fonts/ (SIL Open Font License; Permanent Marker, Apache 2.0).
const FACES: [string, string, string][] = [
  ['Fraunces', 'fraunces-latin', '100 900'],
  ['Bricolage Grotesque', 'bricolage-latin', '200 800'],
  ['Caveat', 'caveat-latin-700', '700'],
  ['Courier Prime', 'courier-prime-latin-400', '400'],
  ['Courier Prime', 'courier-prime-latin-700', '700'],
  ['Permanent Marker', 'permanent-marker-latin', '400'],
];
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const handle = delayRender('Loading the paper pitch\'s typefaces');
  Promise.all(FACES.map(([family, file, weight]) =>
    new FontFace(family, `url(${staticFile(`fonts/${file}.woff2`)}) format('woff2')`, {weight}).load().then((face) => { document.fonts.add(face); })))
    .then(() => continueRender(handle))
    .catch((err) => { console.error(err); continueRender(handle); });
}
export const FONT = {
  serif: 'Fraunces', grot: 'Bricolage Grotesque', hand: 'Caveat', marker: 'Permanent Marker', type: 'Courier Prime', ui: 'Plus Jakarta Sans',
};

// ---- Colour: her building's (cream walls, blue rails, green and coral awnings) -----------
export const PAL = {
  table: '#ece3d3', cream: '#f8f2e6', white: '#fdfbf6', kraft: '#c99e70', kraftDark: '#a87d52',
  sky: '#9fd0ee', cobalt: '#2c63c9', leaf: '#3c9a52', leafDark: '#21683a', awning: '#3fbf9c', coral: '#ec6a5c',
  sun: '#f5c242', pink: '#f6a6b6', mint: '#bfe8d2', blue: '#a9cdf5', ink: '#1f1b17', inkSoft: '#5b5148',
  red: '#d42f3f', marker: '#2541b2', green: '#17603f', greenBright: '#2f9e64', mat: '#2b6a4f', matLine: 'rgba(222,246,232,0.16)',
};

// ---- Time --------------------------------------------------------------------------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  soft: Easing.bezier(0.45, 0, 0.25, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  lin: (x: number) => x,
};
export const t01 = (f: number, a: number, b: number, e: (x: number) => number = EASE.lin) => e(clamp01((f - a) / (b - a)));
export const spr = (f: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: f - at, fps: FPS, config: {damping: 15, stiffness: 140, mass: 1, ...cfg}});
export const sec = (s: number) => Math.round(s * FPS);
// Ink that is lighter than what it is drawn on (white paint pen on the mat) must not
// multiply, or it vanishes; dark ink multiplies, so paper texture shows through it.
const light = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 170;
};
const blend = (c: string) => (light(c) ? 'normal' : 'multiply') as React.CSSProperties['mixBlendMode'];
// Hand-made marks change every fifth frame: 12 drawings a second.
export const BOIL = 5;
export const wob = (seed: string, f: number, amp: number) => (random(`${seed}:${Math.floor(f / BOIL)}`) - 0.5) * amp;

// ---- Paper -------------------------------------------------------------------------------
const tex = (name: string) => `url(${staticFile(`paper/tex/${name}.png`)})`;
// A paper surface: its colour with the grain (and, if asked, fibres or creases) multiplied in.
export const paper = (color: string, kind: 'grain' | 'fibers' | 'crumple' | 'kraft' = 'grain', size = 512): React.CSSProperties => ({
  backgroundColor: color,
  backgroundImage: kind === 'grain' ? tex('grain') : kind === 'kraft' ? `${tex('fibers')}, ${tex('fibers')}, ${tex('grain')}` : `${tex(kind)}, ${tex('grain')}`,
  backgroundSize: kind === 'kraft' ? `${size}px, ${size * 0.6}px, ${size}px` : `${size}px, ${size}px`,
  backgroundBlendMode: 'multiply',
});
// A torn edge on any side of a w x h sheet, as a clip-path polygon (the other sides are cut clean).
export const torn = (w: number, h: number, seed: string, sides = 'b', amp = 7, step = 16): string => {
  const pts: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, rough: boolean, nx: number, ny: number, k: string) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = rough ? Math.max(2, Math.round(len / step)) : 1;
    for (let i = 0; i < n; i++) {
      const t = i / n, j = rough && i > 0 ? (random(`${seed}${k}${i}`) * amp) : 0;
      pts.push(`${(x0 + (x1 - x0) * t + nx * j).toFixed(1)}px ${(y0 + (y1 - y0) * t + ny * j).toFixed(1)}px`);
    }
  };
  edge(0, 0, w, 0, sides.includes('t'), 0, 1, 't');
  edge(w, 0, w, h, sides.includes('r'), -1, 0, 'r');
  edge(w, h, 0, h, sides.includes('b'), 0, -1, 'b');
  edge(0, h, 0, 0, sides.includes('l'), 1, 0, 'l');
  return `polygon(${pts.join(', ')})`;
};
// The shadow of a sheet at a height (0 lying on the table, 1 a hand's height above it).
export const lift = (h: number, k = 1) => `0 ${(3 + h * 34) * k}px ${(5 + h * 46) * k}px rgba(74,52,30,${(0.30 - h * 0.12).toFixed(3)}), 0 ${(1 + h * 4) * k}px ${(1.5 + h * 6) * k}px rgba(74,52,30,0.18)`;

// Something put down on the table: it comes down from above (larger, with a long soft
// shadow), lands with a little settle, and lies flat. `from` slides it in as it falls.
export const Drop: React.FC<{at: number; x: number; y: number; rot?: number; from?: {dx?: number; dy?: number; rot?: number}; w?: number; h?: number;
  stiff?: number; out?: number; outTo?: {dx?: number; dy?: number; rot?: number}; z?: number; children: React.ReactNode; style?: React.CSSProperties; shadow?: boolean}> =
  ({at, x, y, rot = 0, from = {}, w, h, stiff = 150, out, outTo = {}, z = 0, children, style, shadow = true}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const p = spr(f, at, {damping: 13, stiffness: stiff});
    const q = out === undefined ? 0 : t01(f, out, out + 26, EASE.in);
    const hgt = Math.max(0, 1 - p) + q * 1.4 + z;
    const dx = lerp(from.dx ?? 0, 0, p) + (outTo.dx ?? 0) * q, dy = lerp(from.dy ?? -40, 0, p) + (outTo.dy ?? 0) * q;
    const r = lerp(from.rot ?? rot + 8, rot, p) + (outTo.rot ?? 0) * q;
    const s = 1 + (1 - p) * 0.22 + q * 0.25;
    return (
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `translate(${dx}px, ${dy}px) rotate(${r}deg) scale(${s})`,
        opacity: Math.min(1, p * 3) * (1 - t01(q, 0.7, 1)), filter: shadow ? undefined : undefined, ...style}}>
        <div style={{position: 'relative', boxShadow: shadow ? lift(hgt) : undefined, borderRadius: style?.borderRadius}}>{children}</div>
      </div>
    );
  };

// A sheet of paper, cut or torn, that casts its own shadow.
export const Sheet: React.FC<{w: number; h: number; color?: string; kind?: 'grain' | 'fibers' | 'crumple' | 'kraft'; tornSides?: string; seed?: string; radius?: number;
  hgt?: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({w, h, color = PAL.white, kind = 'grain', tornSides = '', seed = 's', radius = 2, hgt = 0, children, style}) => (
  <div style={{position: 'relative', width: w, height: h, filter: `drop-shadow(${lift(hgt).split(', ')[0]})`, ...style}}>
    <div style={{position: 'absolute', inset: 0, ...paper(color, kind), borderRadius: tornSides ? 0 : radius, clipPath: tornSides ? torn(w, h, seed, tornSides) : undefined, overflow: 'hidden'}}>
      {children}
    </div>
  </div>
);

// Washi tape: translucent, a faint pattern, both ends torn. It slaps down at `at`.
export const Tape: React.FC<{x: number; y: number; w?: number; h?: number; rot?: number; at: number; color?: string; stripe?: string; seed?: string}> =
  ({x, y, w = 150, h = 42, rot = 0, at, color = 'rgba(243,226,170,0.82)', stripe = 'rgba(255,255,255,0.22)', seed = 'tape'}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const p = t01(f, at, at + 7, EASE.out);
    const pts: string[] = [];
    const n = 7;
    for (let i = 0; i <= n; i++) pts.push(`${(random(`${seed}l${i}`) * 7).toFixed(1)}px ${(h * i / n).toFixed(1)}px`);
    for (let i = n; i >= 0; i--) pts.push(`${(w - random(`${seed}r${i}`) * 7).toFixed(1)}px ${(h * i / n).toFixed(1)}px`);
    return (
      <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg) scale(${lerp(1.25, 1, p)})`, opacity: p,
        background: `repeating-linear-gradient(90deg, ${color} 0 14px, ${stripe} 14px 16px, ${color} 16px 30px)`, clipPath: `polygon(${pts.join(', ')})`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)', mixBlendMode: 'multiply'}} />
    );
  };

// A push pin, seen from above.
export const Pin: React.FC<{x: number; y: number; at: number; color?: string}> = ({x, y, at, color = PAL.red}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = spr(f, at, {damping: 11, stiffness: 260});
  return (
    <div style={{position: 'absolute', left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 16, transform: `scale(${lerp(2.2, 1, Math.min(1, p))})`, opacity: Math.min(1, p * 3),
      background: `radial-gradient(circle at 35% 30%, #fff8 0 4px, ${color} 6px 100%)`, boxShadow: `0 ${4 + (1 - p) * 16}px ${6 + (1 - p) * 20}px rgba(60,30,20,0.35)`}} />
  );
};

// ---- Marks ---------------------------------------------------------------------------------
// A smooth line through points (Catmull-Rom as cubic Béziers).
export const smooth = (pts: [number, number][]) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};
// A marker stroke drawn on over `dur` seconds, boiling once it is down.
export const Ink: React.FC<{pts: [number, number][]; at: number; dur?: number; color?: string; width?: number; seed?: string; amp?: number; dash?: string; out?: number; opacity?: number}> =
  ({pts, at, dur = 0.4, color = PAL.red, width = 7, seed = 'ink', amp = 2.2, dash, out, opacity = 0.92}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const p = t01(f, at, at + sec(dur), EASE.soft);
    const moved = pts.map(([x, y], i): [number, number] => [x + wob(`${seed}x${i}`, f, amp), y + wob(`${seed}y${i}`, f, amp)]);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const pad = 30, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
    const fade = out === undefined ? 1 : 1 - t01(f, out, out + 10);
    return (
      <svg width={Math.max(...xs) - x0 + pad} height={Math.max(...ys) - y0 + pad} style={{position: 'absolute', left: x0, top: y0, overflow: 'visible', opacity: opacity * fade, mixBlendMode: blend(color), filter: light(color) ? 'drop-shadow(0 2px 1px rgba(0,0,0,0.25))' : undefined}}>
        <path d={smooth(moved.map(([x, y]) => [x - x0, y - y0]))} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={dash ?? '1'} strokeDashoffset={dash ? undefined : 1 - p} style={dash ? {clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`} : undefined} />
      </svg>
    );
  };
// A loose hand-drawn ellipse around a box, as a marker circles something.
export const ring = (cx: number, cy: number, rx: number, ry: number, seed: string, turns = 1.15): [number, number][] =>
  Array.from({length: 26}, (_, i) => {
    const a = -2.2 + (i / 25) * Math.PI * 2 * turns, r = 1 + (random(`${seed}${i}`) - 0.5) * 0.08 + i * 0.004;
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  });
// A check mark and a cross, as points for Ink.
export const tick = (x: number, y: number, s: number): [number, number][] => [[x, y], [x + s * 0.35, y + s * 0.38], [x + s, y - s * 0.55]];
export const arrow = (x0: number, y0: number, x1: number, y1: number, bend = 0.2): [number, number][] => {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  return [[x0, y0], [mx, my], [x1, y1]];
};
export const arrowHead = (x1: number, y1: number, fromX: number, fromY: number, s = 26): [number, number][] => {
  const a = Math.atan2(y1 - fromY, x1 - fromX);
  return [[x1 + Math.cos(a + 2.5) * s, y1 + Math.sin(a + 2.5) * s], [x1, y1], [x1 + Math.cos(a - 2.5) * s, y1 + Math.sin(a - 2.5) * s]];
};

// Handwriting: the words appear left to right at a writing pace, then boil slightly.
export const Hand: React.FC<{text: string; at: number; x: number; y: number; size?: number; color?: string; font?: string; rot?: number; cps?: number; seed?: string; style?: React.CSSProperties; out?: number}> =
  ({text, at, x, y, size = 54, color = PAL.marker, font = FONT.hand, rot = -3, cps = 16, seed = 'hand', style, out}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const p = clamp01((f - at) / (FPS * text.length / cps));
    const fade = out === undefined ? 1 : 1 - t01(f, out, out + 10);
    return (
      <div style={{position: 'absolute', left: x, top: y, whiteSpace: 'pre', fontFamily: font, fontWeight: font === FONT.hand ? 700 : 400, fontSize: size, lineHeight: 1.05, color,
        transform: `rotate(${rot + wob(`${seed}r`, f, 0.8)}deg) translate(${wob(`${seed}x`, f, 1.6)}px, ${wob(`${seed}y`, f, 1.6)}px)`,
        clipPath: `inset(-20% ${(1 - p) * 100}% -20% -5%)`, opacity: 0.94 * fade, mixBlendMode: blend(color),
        textShadow: light(color) ? '0 2px 1px rgba(0,0,0,0.25)' : undefined, ...style}}>{text}</div>
    );
  };

// Letters cut from different papers and magazines, each landing on its own.
const RANSOM_PAPERS = [PAL.white, PAL.sun, PAL.pink, PAL.blue, PAL.mint, '#1f1b17', PAL.coral, PAL.cream];
const RANSOM_FACES = [FONT.serif, FONT.grot, FONT.type, FONT.marker, FONT.serif, FONT.grot];
export const Ransom: React.FC<{text: string; at: number; size?: number; stagger?: number; seed?: string; style?: React.CSSProperties; out?: number}> =
  ({text, at, size = 110, stagger = 2.5, seed = 'ransom', style, out}) => {
    const f = useCurrentFrame();
    const gone = out === undefined ? 0 : t01(f, out, out + 18, EASE.in);
    return (
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: size * 0.06, ...style}}>
        {text.split('').map((ch, i) => {
          if (ch === ' ') return <span key={i} style={{width: size * 0.32}} />;
          const t = at + i * stagger;
          if (f < t) return <span key={i} style={{width: size * 0.7, visibility: 'hidden'}}>{ch}</span>;
          const p = spr(f, t, {damping: 12, stiffness: 230});
          const r = (random(`${seed}r${i}`) - 0.5) * 14, bg = RANSOM_PAPERS[Math.floor(random(`${seed}c${i}`) * RANSOM_PAPERS.length)];
          const face = RANSOM_FACES[Math.floor(random(`${seed}f${i}`) * RANSOM_FACES.length)];
          const dark = bg === '#1f1b17';
          return (
            <span key={i} style={{display: 'inline-block', padding: `${size * 0.04}px ${size * 0.1}px`, fontFamily: face, fontWeight: face === FONT.grot ? 800 : face === FONT.serif ? 900 : 700,
              fontSize: size * (0.82 + random(`${seed}s${i}`) * 0.3), lineHeight: 1, color: dark ? PAL.cream : random(`${seed}k${i}`) > 0.75 ? PAL.red : PAL.ink, ...paper(bg),
              transform: `rotate(${r + gone * (random(`${seed}g${i}`) - 0.5) * 80}deg) scale(${lerp(1.7, 1, Math.min(1.05, p)) * (1 - gone)}) translateY(${gone * 300}px)`,
              opacity: Math.min(1, p * 3) * (1 - gone), boxShadow: lift(Math.max(0, 1 - p) * 0.8), textTransform: random(`${seed}u${i}`) > 0.5 ? 'uppercase' : 'none'}}>{ch}</span>
          );
        })}
      </div>
    );
  };

// A rubber stamp: uneven ink, slammed down at `at`, with a bounce of the paper under it.
export const Stamp: React.FC<{text: string; at: number; x: number; y: number; size?: number; color?: string; rot?: number; sub?: string; w?: number; h?: number; seed?: string}> =
  ({text, at, x, y, size = 150, color = PAL.red, rot = -8, sub, w, h, seed = 'stamp'}) => {
    const f = useCurrentFrame();
    if (f < at - 6) return null;
    const down = t01(f, at - 6, at, EASE.in);
    const settle = f < at ? 0 : spr(f, at, {damping: 10, stiffness: 320});
    const s = f < at ? lerp(1.9, 1, down) : 1 + (1 - Math.min(1, settle)) * -0.06;
    const ww = w ?? size * (text.length * 0.62 + 0.7), hh = h ?? size * (sub ? 1.55 : 1.25);
    const id = `ink-${seed}`;
    return (
      <svg width={ww} height={hh} style={{position: 'absolute', left: x - ww / 2, top: y - hh / 2, overflow: 'visible', transform: `rotate(${rot}deg) scale(${s})`, opacity: f < at ? down * 0.35 : 0.96, mixBlendMode: 'multiply'}}>
        <defs>
          <filter id={`${id}-f`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves="3" seed={Math.floor(random(seed) * 90)} />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.6 1.75" />
          </filter>
          <mask id={id}><rect width={ww} height={hh} fill="#fff" filter={`url(#${id}-f)`} /></mask>
        </defs>
        <g mask={`url(#${id})`} fill={color} stroke={color}>
          <rect x={size * 0.08} y={size * 0.08} width={ww - size * 0.16} height={hh - size * 0.16} rx={size * 0.14} fill="none" strokeWidth={size * 0.07} />
          <text x={ww / 2} y={sub ? hh * 0.56 : hh * 0.5} dominantBaseline="central" textAnchor="middle" fontFamily={FONT.grot} fontWeight={800} fontSize={size} letterSpacing={size * -0.02} stroke="none">{text}</text>
          {sub ? <text x={ww / 2} y={hh * 0.2} dominantBaseline="central" textAnchor="middle" fontFamily={FONT.type} fontWeight={700} fontSize={size * 0.17} letterSpacing={size * 0.04} stroke="none">{sub}</text> : null}
        </g>
      </svg>
    );
  };

// Label-maker tape: the letters punch out one by one as the strip feeds, then it is pressed down.
export const Dymo: React.FC<{text: string; at: number; x: number; y: number; color?: string; size?: number; rot?: number; cps?: number}> =
  ({text, at, x, y, color = PAL.ink, size = 40, rot = 0, cps = 22}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const n = Math.min(text.length, Math.floor((f - at) / (FPS / cps)) + 1);
    const done = at + Math.ceil(text.length * FPS / cps);
    const press = f < done ? 0 : spr(f, done, {damping: 12, stiffness: 220});
    return (
      <div style={{position: 'absolute', left: x, top: y, transform: `rotate(${rot}deg) scale(${f < done ? 1.03 : lerp(1.03, 1, Math.min(1, press))})`, transformOrigin: '0 50%',
        padding: `${size * 0.28}px ${size * 0.5}px`, borderRadius: size * 0.12, whiteSpace: 'pre', fontFamily: FONT.grot, fontWeight: 700, fontSize: size, letterSpacing: '0.16em',
        color: 'rgba(255,255,255,0.94)', textShadow: '0 1.5px 0 rgba(255,255,255,0.35), 0 -1.5px 0 rgba(0,0,0,0.45)',
        background: `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.22) 100%), ${color}`,
        boxShadow: lift(f < done ? 0.35 : 0.35 * (1 - Math.min(1, press))), textTransform: 'uppercase'}}>
        {text.slice(0, n)}
      </div>
    );
  };

// A split-flap counter: each column flips through its digits, fast then slowing, and stops.
export const SplitFlap: React.FC<{target: string; at: number; dur: number; flips: number[]; w?: number; h?: number}> = ({target, at, dur, flips, w = 200, h = 290}) => {
  const f = useCurrentFrame();
  const FLIP = 5; // frames for one flap to fall
  return (
    <div style={{display: 'flex', gap: 14, padding: 22, borderRadius: 26, background: 'linear-gradient(180deg, #2a2724, #171513)', boxShadow: `${lift(0.25)}, inset 0 2px 0 rgba(255,255,255,0.08)`}}>
      {target.split('').map((ch, col) => {
        const end = Number(ch), n = flips[col], start = (end - n % 10 + 100) % 10;
        // When each flip happens: eased so the column slows into its digit.
        const times = Array.from({length: n}, (_, k) => at + Math.round(sec(dur) * (1 - Math.pow(1 - (k + 1) / n, 2.2)) * (0.75 + col * 0.12)));
        let k = 0;
        while (k < n && f >= times[k]) k++;
        const cur = (start + k) % 10, next = (start + k + 1) % 10;
        const inFlip = k < n ? clamp01((f - (times[k] - FLIP)) / FLIP) : 0;
        const half = (v: number, top: boolean, style: React.CSSProperties = {}) => (
          <div style={{position: 'absolute', left: 0, right: 0, height: h / 2, top: top ? 0 : h / 2, overflow: 'hidden', background: top ? '#2f2c29' : '#282522',
            borderRadius: top ? '12px 12px 0 0' : '0 0 12px 12px', ...style}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: top ? 0 : -h / 2, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT.grot, fontWeight: 800, fontSize: h * 0.78, color: PAL.cream, letterSpacing: '-0.04em'}}>{v}</div>
          </div>
        );
        return (
          <div key={col} style={{position: 'relative', width: w, height: h, perspective: 900}}>
            {half(k < n ? next : cur, true)}
            {half(cur, false)}
            {inFlip > 0 && inFlip < 0.5 ? half(cur, true, {transformOrigin: '50% 100%', transform: `rotateX(${-inFlip * 180}deg)`, filter: `brightness(${1 - inFlip * 0.8})`}) : null}
            {inFlip >= 0.5 ? half(next, false, {transformOrigin: '50% 0%', transform: `rotateX(${(1 - inFlip) * 180}deg)`, filter: `brightness(${0.6 + inFlip * 0.4})`}) : null}
            <div style={{position: 'absolute', left: 0, right: 0, top: h / 2 - 1.5, height: 3, background: '#0d0c0b'}} />
          </div>
        );
      })}
    </div>
  );
};

// A foil star sticker; `fill` below 1 leaves the rest of it as a pale outline.
const STAR = 'M50 4 L62 36 L96 37 L69 58 L79 92 L50 72 L21 92 L31 58 L4 37 L38 36 Z';
export const Star: React.FC<{size: number; fill?: number; id: string}> = ({size, fill = 1, id}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
    <defs>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe7a0" /><stop offset="0.45" stopColor="#f2b631" /><stop offset="0.7" stopColor="#ffd86b" /><stop offset="1" stopColor="#c98a12" /></linearGradient>
      <clipPath id={`${id}-c`}><rect x="0" y="0" width={100 * fill} height="100" /></clipPath>
    </defs>
    <path d={STAR} fill="rgba(201,138,18,0.12)" stroke="rgba(201,138,18,0.55)" strokeWidth="2.5" strokeDasharray="5 4" strokeLinejoin="round" />
    <path d={STAR} fill={`url(#${id}-g)`} stroke="#fff" strokeWidth="4" strokeLinejoin="round" clipPath={`url(#${id}-c)`} style={{filter: 'drop-shadow(0 3px 3px rgba(80,50,10,0.35))'}} />
  </svg>
);

// ---- The table, the light, the camera ------------------------------------------------------
export type Cam = {x: number; y: number; z: number; r: number};
export const World: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1, height: 1, transformOrigin: '0 0',
    transform: `translate(${W / 2}px, ${H / 2}px) rotate(${cam.r}deg) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`}}>
    {children}
  </div>
);
// A desk lamp from the top left, the room falling off at the corners, and a fine grain over all.
export const Light: React.FC = () => (
  <>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 75% at 30% 22%, rgba(255,240,214,0.20) 0%, rgba(255,240,214,0) 60%)', mixBlendMode: 'soft-light', pointerEvents: 'none'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 85% at 50% 48%, rgba(0,0,0,0) 55%, rgba(60,38,18,0.38) 100%)', pointerEvents: 'none'}} />
  </>
);
// A directional blur for the camera's fast moves (screen space).
export const Blur: React.FC<{x: number; y: number; children: React.ReactNode}> = ({x, y, children}) => {
  const on = x > 0.4 || y > 0.4;
  return (
    <AbsoluteFill style={{filter: on ? 'url(#cam-blur)' : undefined}}>
      {on ? <svg width={0} height={0} style={{position: 'absolute'}}><filter id="cam-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} /></filter></svg> : null}
      {children}
    </AbsoluteFill>
  );
};
