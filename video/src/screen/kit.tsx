// The screen pitch's design language, after the reference Sean sent: editorial and quiet.
// A warm off-white or charcoal screen, one accent (Hivelet's green; her building's blue
// once), heavy grotesk words, a serif italic for the hard moments, thin line drawings,
// dot grids, a small section label top left, and the voice typed in mono along the bottom
// with a block cursor.
import React from 'react';
import {continueRender, delayRender, Easing, random, spring, staticFile, useCurrentFrame} from 'remotion';
import {FPS} from './timeline';

const FACES: [string, string, string, string?][] = [
  ['Inter Tight', 'inter-tight-latin', '100 900'],
  ['JetBrains Mono', 'jetbrains-mono-latin', '100 800'],
  ['Instrument Serif', 'instrument-serif-latin-italic', '400', 'italic'],
  ['Instrument Serif', 'instrument-serif-latin', '400'],
];
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const handle = delayRender('Loading the screen pitch\'s typefaces');
  Promise.all(FACES.map(([family, file, weight, style]) =>
    new FontFace(family, `url(${staticFile(`fonts/${file}.woff2`)}) format('woff2')`, {weight, style: style ?? 'normal'}).load().then((face) => { document.fonts.add(face); })))
    .then(() => continueRender(handle))
    .catch((err) => { console.error(err); continueRender(handle); });
}
export const FONT = {grot: 'Inter Tight', mono: 'JetBrains Mono', serif: 'Instrument Serif', brand: 'Sora', ui: 'Plus Jakarta Sans'};

export const C = {
  paper: '#ebeae5', paperDeep: '#dedcd5', char: '#232323', charDeep: '#161616', ink: '#141414', inkSoft: '#6b6a66', faint: '#a9a7a0',
  green: '#1f9a62', greenDeep: '#13603d', greenLight: '#bfe5cf', blue: '#2346d8', white: '#fafaf7',
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.6, 0, 0.9, 0.4),
  lin: (x: number) => x,
};
export const t01 = (f: number, a: number, b: number, e: (x: number) => number = E.lin) => e(clamp01((f - a) / (b - a)));
export const sec = (s: number) => Math.round(s * FPS);
export const spr = (f: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: f - at, fps: FPS, config: {damping: 18, stiffness: 160, mass: 1, ...cfg}});
export const mix = (a: string, b: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp01(t)))).join(',')})`;
};

// ---- The caption: the voice, typed in mono as it is said ------------------------------------
// Characters appear across the spoken length of the phrase (so the typing keeps pace with the
// voice); words in `accent` are set in the accent colour. The cursor blinks when idle.
export const Caption: React.FC<{text: string; at: number; dur: number; dark?: boolean; accent?: string[]; out?: number; x?: number; y?: number; size?: number; width?: number; color?: string}> =
  ({text, at, dur, dark, accent = [], out, x = 72, y = 892, size = 28, width = 1100, color = C.green}) => {
    const f = useCurrentFrame();
    if (f < at - 6) return null;
    const n = Math.round(clamp01((f - at) / sec(dur)) * text.length);
    const gone = out !== undefined && f >= out;
    if (gone) return null;
    const typing = n > 0 && n < text.length;
    const on = typing || Math.floor(f / 24) % 2 === 0;
    const words = text.slice(0, n).split(/(\s+)/);
    return (
      <div style={{position: 'absolute', left: x, top: y, width, fontFamily: FONT.mono, fontWeight: 500, fontSize: size, lineHeight: 1.45, color: dark ? '#e9e8e3' : C.ink, letterSpacing: '-0.01em'}}>
        {words.map((w, i) => <span key={i} style={{color: accent.some((a) => w.replace(/[.,?]/g, '') === a) ? color : undefined, fontWeight: accent.some((a) => w.replace(/[.,?]/g, '') === a) ? 700 : undefined}}>{w}</span>)}
        <span style={{display: 'inline-block', width: size * 0.58, height: size * 1.05, marginLeft: 2, verticalAlign: '-0.18em', background: color, opacity: on ? 1 : 0}} />
      </div>
    );
  };

// The small label in the top left corner: "02 / ledger".
export const Label: React.FC<{n: string; text: string; dark?: boolean; at?: number}> = ({n, text, dark, at = 0}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 72, top: 62, fontFamily: FONT.mono, fontWeight: 500, fontSize: 21, letterSpacing: '0.04em', color: dark ? 'rgba(233,232,227,0.55)' : 'rgba(20,20,20,0.5)',
      opacity: t01(f, at, at + 12)}}>
      {n} <span style={{opacity: 0.6}}>/</span> {text}
    </div>
  );
};

// A line drawn on: an SVG path revealed along its length.
export const Draw: React.FC<{d: string; at: number; dur: number; color?: string; width?: number; size?: [number, number]; style?: React.CSSProperties; dash?: string; fill?: string; fillAt?: number}> =
  ({d, at, dur, color = C.ink, width = 4, size = [1600, 1000], style, dash, fill, fillAt}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const p = t01(f, at, at + sec(dur), E.inOut);
    return (
      <svg width={size[0]} height={size[1]} viewBox={`0 0 ${size[0]} ${size[1]}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
        {fill && fillAt !== undefined ? <path d={d} fill={fill} opacity={t01(f, fillAt, fillAt + 10)} /> : null}
        <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
          strokeDasharray={dash ?? '1 1'} strokeDashoffset={dash ? undefined : 1 - p} style={dash ? {clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`} : undefined} />
      </svg>
    );
  };

// A word set large in the grotesk, landing with a short rise.
export const Big: React.FC<{text: React.ReactNode; at: number; size?: number; color?: string; weight?: number; style?: React.CSSProperties; ls?: string}> =
  ({text, at, size = 260, color = C.ink, weight = 800, style, ls = '-0.055em'}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const p = spr(f, at, {damping: 20, stiffness: 200});
    return (
      <div style={{fontFamily: FONT.grot, fontWeight: weight, fontSize: size, lineHeight: 0.9, letterSpacing: ls, color, whiteSpace: 'nowrap',
        transform: `translateY(${(1 - p) * 40}px)`, opacity: Math.min(1, p * 2), ...style}}>{text}</div>
    );
  };
export const Serif: React.FC<{text: React.ReactNode; at: number; size?: number; color?: string; style?: React.CSSProperties}> = ({text, at, size = 170, color = C.white, style}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = t01(f, at, at + 20, E.out);
  return <div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: size, lineHeight: 1, color, letterSpacing: '-0.02em', opacity: p, filter: `blur(${(1 - p) * 8}px)`, ...style}}>{text}</div>;
};

// A loose hand-drawn ellipse, as a pen circles something.
export const ellipse = (cx: number, cy: number, rx: number, ry: number, seed: string) => {
  const pts = Array.from({length: 40}, (_, i) => {
    const a = -2.4 + (i / 39) * Math.PI * 2.15, r = 1 + (random(`${seed}${i}`) - 0.5) * 0.05 + i * 0.002;
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  });
  return 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ');
};
