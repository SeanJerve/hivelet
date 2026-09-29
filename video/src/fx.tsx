// The film's own motion language: glowing backgrounds, a honeycomb pattern,
// kinetic headlines with one coloured word, full-screen wipes and a 3D stage.
// Only the app's colours and fonts (plus the lighter accent steps in theme.ts).
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, H, W, jakarta, sora} from './theme';
import {easeIn, easeInOut, pop, t01} from './anim';

// Words rising from behind their own masks, each on a spring, and leaving upward.
export const Kin: React.FC<{
  text: string; at: number; out?: number; size: number; color?: string; accentColor?: string; font?: string; weight?: number;
  align?: 'left' | 'center' | 'right'; lh?: number; ls?: string; stagger?: number; style?: React.CSSProperties; accent?: string[];
}> = ({text, at, out, size, color = C.ink, accentColor = C.brandBright, font = sora, weight = 700, align = 'left', lh = 1.04, ls = '-0.045em', stagger = 2, style, accent = []}) => {
  const f = useCurrentFrame();
  const lines = text.split('\n');
  let k = 0;
  return (
    <div style={{fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight: lh, letterSpacing: ls, textAlign: align, ...style}}>
      {lines.map((line, li) => (
        <div key={li}>
          {line.split(' ').map((w, i, arr) => {
            const n = k++;
            const p = pop(f, at + n * stagger, {damping: 19, stiffness: 150});
            const e = out === undefined ? 0 : t01(f, out + n * 0.7, out + n * 0.7 + 9, easeIn);
            const y = (1 - p) * 115 - e * 115;
            return (
              <React.Fragment key={i}>
                <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.06em 0.03em 0.16em', margin: '-0.06em -0.03em -0.16em'}}>
                  <span style={{display: 'inline-block', whiteSpace: 'nowrap', transform: `translateY(${y}%) rotate(${(1 - p) * 7}deg)`, transformOrigin: '0 100%',
                    color: accent.includes(w.replace(/[.,!?]/g, '')) ? accentColor : undefined}}>{w}</span>
                </span>
                {i < arr.length - 1 ? ' ' : null}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// The headline block every beat uses: a small labelled line, the headline with
// one coloured word, and one plain sentence under it.
export const Head: React.FC<{
  kicker?: string; text: string; accent?: string[]; sub?: string; at: number; out?: number; dark?: boolean; size?: number;
  left?: number; top?: number; width?: number; accentColor?: string; align?: 'left' | 'center';
}> = ({kicker, text, accent, sub, at, out, dark, size = 100, left = 110, top = 330, width = 860, accentColor, align = 'left'}) => {
  const f = useCurrentFrame();
  const kp = t01(f, at - 4, at + 8);
  const ke = out === undefined ? 0 : t01(f, out, out + 8);
  const sp = t01(f, at + 12, at + 26);
  return (
    <div style={{position: 'absolute', left, top, width, textAlign: align}}>
      {kicker ? (
        <div style={{display: 'flex', alignItems: 'center', gap: 12, justifyContent: align === 'center' ? 'center' : 'flex-start', marginBottom: 26, opacity: kp * (1 - ke), transform: `translateY(${(1 - kp) * 10}px)`}}>
          <span style={{width: 9, height: 9, borderRadius: 5, background: dark ? C.amber : C.brandBright}} />
          <span style={{fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace', fontSize: 21, letterSpacing: '0.04em', color: dark ? C.onNightSoft : C.inkSoft}}>{kicker}</span>
        </div>
      ) : null}
      <Kin text={text} at={at} out={out} size={size} color={dark ? '#ffffff' : C.ink} accent={accent} accentColor={accentColor ?? (dark ? C.glow : C.brandBright)} align={align} />
      {sub ? (
        <div style={{fontFamily: jakarta, fontSize: 30, lineHeight: 1.45, color: dark ? C.onNightSoft : C.inkSoft, marginTop: 28, maxWidth: width - 60,
          opacity: sp * (1 - ke), transform: `translateY(${(1 - sp) * 16}px)`, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0}}>{sub}</div>
      ) : null}
    </div>
  );
};

// A honeycomb drawn as an SVG pattern: the hive in the name, used quietly.
export const Honeycomb: React.FC<{opacity?: number; color?: string; r?: number; drift?: number}> = ({opacity = 0.08, color = '#ffffff', r = 42, drift = 0.25}) => {
  const f = useCurrentFrame();
  const w = Math.sqrt(3) * r, h = 3 * r;
  const hex = (cx: number, cy: number) => Array.from({length: 6}, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${k ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + 'Z';
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity}}>
      <defs>
        <pattern id="hc" width={w} height={h} patternUnits="userSpaceOnUse" patternTransform={`translate(${(f * drift) % w} ${(f * drift * 0.4) % h})`}>
          <path d={`${hex(w / 2, r)} ${hex(0, 2.5 * r)} ${hex(w, 2.5 * r)}`} fill="none" stroke={color} strokeWidth={1.3} />
        </pattern>
        <radialGradient id="hcFade" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="hcMask"><rect width={W} height={H} fill="url(#hcFade)" /></mask>
      </defs>
      <rect width={W} height={H} fill="url(#hc)" mask="url(#hcMask)" />
    </svg>
  );
};

// Backgrounds. Night: deep green with a soft glow behind the subject. Light: the
// app's canvas, brightest in the middle. Green: the brand colour, for the proof.
export const Bg: React.FC<{mood?: 'night' | 'light' | 'green'; hex?: boolean; glowX?: number; glowY?: number}> = ({mood = 'light', hex, glowX = 62, glowY = 46}) => {
  const bg = mood === 'night'
    ? `radial-gradient(ellipse 70% 80% at ${glowX}% ${glowY}%, ${C.moss} 0%, ${C.night} 48%, ${C.deep} 100%)`
    : mood === 'green'
      ? `radial-gradient(ellipse 80% 90% at 50% 45%, #1f7a50 0%, ${C.brand} 45%, ${C.brandStrong} 100%)`
      : `radial-gradient(ellipse 75% 85% at ${glowX}% ${glowY}%, #ffffff 0%, #f3f6f4 38%, ${C.canvas} 70%, #dde5df 100%)`;
  return (
    <AbsoluteFill style={{background: bg}}>
      {hex ? <Honeycomb opacity={mood === 'light' ? 0.5 : 0.07} color={mood === 'light' ? '#dfe7e1' : '#ffffff'} /> : null}
    </AbsoluteFill>
  );
};

// A full-screen wipe: a brand band sweeps across and the cut happens under it.
export const Wipe: React.FC<{at: number; dur?: number}> = ({at, dur = 16}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur + 4) return null;
  const band = (lag: number, width: number, color: string) => {
    const t = t01(f, at + lag, at + lag + dur, easeInOut);
    const left = interpolate(t, [0, 1], [-2.4 * W, 1.4 * W]);
    return <div style={{position: 'absolute', top: -H * 0.2, height: H * 1.4, left, width, background: color, transform: 'skewX(-16deg)'}} />;
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden', zIndex: 100}}>
      {band(0, W * 2, C.brand)}
      {band(2, W * 0.12, C.glow)}
    </AbsoluteFill>
  );
};

// A perspective stage: children are laid out flat in stage pixels and the
// camera string moves and tilts them.
export const Stage: React.FC<{cam: string; w: number; h: number; children: React.ReactNode; persp?: number; style?: React.CSSProperties}> = ({cam, w, h, children, persp = 2600, style}) => (
  <AbsoluteFill style={{perspective: persp, perspectiveOrigin: '50% 45%', ...style}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0', transformStyle: 'preserve-3d', transform: cam}}>{children}</div>
  </AbsoluteFill>
);

// A soft shadow on the "floor" under something floating.
export const FloorShadow: React.FC<{x: number; y: number; w: number; lift?: number}> = ({x, y, w, lift = 0}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y, width: w, height: w * 0.12, borderRadius: '50%',
    background: 'radial-gradient(ellipse at center, rgba(15,27,21,0.28) 0%, rgba(15,27,21,0) 70%)', transform: `scale(${1 - lift * 0.25})`, opacity: 1 - lift * 0.4}} />
);
