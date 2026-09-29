// The film's motion language: glowing backgrounds, a honeycomb pattern,
// headlines with one coloured word, chapter cards, and a sharp 3D stage.
// Only the app's colours and fonts (plus the lighter accent steps in theme.ts).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, H, W, jakarta, sora} from './theme';
import {easeIn, lerp, pop, t01} from './anim';

// The grid every scene keeps to. Text lives in the left column; the visual
// lives in its own zone to the right. Nothing crosses from one to the other.
export const GRID = {textX: 120, textW: 740, visX: 880, visW: 920, visCX: 1340, top: 100, bottom: 980};

// Words rising from behind their own masks, each on a soft spring, leaving upward.
export const Kin: React.FC<{
  text: string; at: number; out?: number; size: number; color?: string; accentColor?: string; font?: string; weight?: number;
  align?: 'left' | 'center' | 'right'; lh?: number; ls?: string; stagger?: number; style?: React.CSSProperties; accent?: string[];
}> = ({text, at, out, size, color = C.ink, accentColor = C.brandBright, font = sora, weight = 700, align = 'left', lh = 1.06, ls = '-0.045em', stagger = 3, style, accent = []}) => {
  const f = useCurrentFrame();
  // Accent words are matched without their punctuation, on both sides.
  const bare = (w: string) => w.replace(/[.,!?]/g, '');
  const accented = accent.map(bare);
  let k = 0;
  return (
    <div style={{fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight: lh, letterSpacing: ls, textAlign: align, ...style}}>
      {text.split('\n').map((line, li) => (
        <div key={li}>
          {line.split(' ').map((w, i, arr) => {
            const n = k++;
            const p = pop(f, at + n * stagger, {damping: 22, stiffness: 90});
            const e = out === undefined ? 0 : t01(f, out + n, out + n + 14, easeIn);
            return (
              <React.Fragment key={i}>
                <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.06em 0.03em 0.16em', margin: '-0.06em -0.03em -0.16em'}}>
                  <span style={{display: 'inline-block', whiteSpace: 'nowrap', transform: `translateY(${(1 - p) * 110 - e * 110}%)`, opacity: Math.min(1, p * 1.5) * (1 - e),
                    color: accented.includes(bare(w)) ? accentColor : undefined}}>{w}</span>
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

// A headline in the text column and one plain sentence under it.
export const Head: React.FC<{
  text: string; accent?: string[]; sub?: string; at: number; out?: number; dark?: boolean; size?: number;
  left?: number; top?: number; width?: number; accentColor?: string; align?: 'left' | 'center'; subSize?: number;
}> = ({text, accent, sub, at, out, dark, size = 80, left = GRID.textX, top = 360, width = GRID.textW, accentColor, align = 'left', subSize = 28}) => {
  const f = useCurrentFrame();
  const sp = t01(f, at + 16, at + 36);
  const se = out === undefined ? 0 : t01(f, out, out + 12);
  return (
    <div style={{position: 'absolute', left, top, width, textAlign: align}}>
      <Kin text={text} at={at} out={out} size={size} color={dark ? '#ffffff' : C.ink} accent={accent} accentColor={accentColor ?? (dark ? C.glow : C.brandBright)} align={align} />
      {sub ? (
        <div style={{fontFamily: jakarta, fontSize: subSize, lineHeight: 1.5, color: dark ? C.onNightSoft : C.inkSoft, marginTop: 26, maxWidth: width,
          opacity: sp * (1 - se), transform: `translateY(${(1 - sp) * 14}px)`, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0}}>{sub}</div>
      ) : null}
    </div>
  );
};

// A chapter card: one line, centred, that eases in and gives way to the scene.
export const Chapter: React.FC<{text: string; accent: string[]}> = ({text, accent}) => {
  const f = useCurrentFrame();
  const line = t01(f, 4, 30);
  return (
    <AbsoluteFill>
      <Bg mood="light" hex />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Kin text={text} at={2} out={44} size={124} align="center" accent={accent} />
        <div style={{width: 120 * line, height: 4, borderRadius: 2, background: C.brandBright, marginTop: 34, opacity: 1 - t01(f, 44, 56)}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// A honeycomb drawn as an SVG pattern: the hive in the name, used quietly.
export const Honeycomb: React.FC<{opacity?: number; color?: string; r?: number; drift?: number}> = ({opacity = 0.08, color = '#ffffff', r = 42, drift = 0.15}) => {
  const f = useCurrentFrame();
  const w = Math.sqrt(3) * r, h = 3 * r;
  const hex = (cx: number, cy: number) => Array.from({length: 6}, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${k ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + 'Z';
  const id = `hc${color.replace('#', '')}`;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity}}>
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse" patternTransform={`translate(${(f * drift) % w} ${(f * drift * 0.4) % h})`}>
          <path d={`${hex(w / 2, r)} ${hex(0, 2.5 * r)} ${hex(w, 2.5 * r)}`} fill="none" stroke={color} strokeWidth={1.2} />
        </pattern>
        <radialGradient id={`${id}f`} cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}m`}><rect width={W} height={H} fill={`url(#${id}f)`} /></mask>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} mask={`url(#${id}m)`} />
    </svg>
  );
};

// Backgrounds. Night: deep green with a soft glow behind the subject. Light: the
// app's canvas, brightest behind the subject. Green: the brand colour.
export const Bg: React.FC<{mood?: 'night' | 'light' | 'green'; hex?: boolean; glowX?: number; glowY?: number}> = ({mood = 'light', hex, glowX = 62, glowY = 46}) => {
  const bg = mood === 'night'
    ? `radial-gradient(ellipse 70% 80% at ${glowX}% ${glowY}%, ${C.moss} 0%, ${C.night} 48%, ${C.deep} 100%)`
    : mood === 'green'
      ? `radial-gradient(ellipse 80% 90% at 50% 45%, #1f7a50 0%, ${C.brand} 45%, ${C.brandStrong} 100%)`
      : `radial-gradient(ellipse 75% 85% at ${glowX}% ${glowY}%, #ffffff 0%, #f4f7f5 40%, ${C.canvas} 72%, #e1e8e3 100%)`;
  return (
    <AbsoluteFill style={{background: bg}}>
      {hex ? <Honeycomb opacity={mood === 'light' ? 0.55 : 0.07} color={mood === 'light' ? '#dde6e0' : '#ffffff'} /> : null}
    </AbsoluteFill>
  );
};

// A perspective stage laid out `z` times larger than its logical size and
// scaled back by the camera, so the raster is always at least full resolution.
export const Stage: React.FC<{cam: string; w: number; h: number; z?: number; children: React.ReactNode; persp?: number; style?: React.CSSProperties}> = ({cam, w, h, z = 2, children, persp = 2800, style}) => (
  <AbsoluteFill style={{perspective: persp, perspectiveOrigin: '50% 45%', ...style}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: w * z, height: h * z, transformOrigin: '0 0', transformStyle: 'preserve-3d', transform: cam}}>
      <div style={{zoom: z, width: w, height: h, position: 'relative', transformStyle: 'preserve-3d'}}>{children}</div>
    </div>
  </AbsoluteFill>
);

// A soft shadow on the "floor" under something floating.
export const FloorShadow: React.FC<{x: number; y: number; w: number; lift?: number}> = ({x, y, w, lift = 0}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y, width: w, height: w * 0.12, borderRadius: '50%',
    background: 'radial-gradient(ellipse at center, rgba(15,27,21,0.26) 0%, rgba(15,27,21,0) 70%)', transform: `scale(${1 - lift * 0.25})`, opacity: 1 - lift * 0.4}} />
);

// Every scene fades in over the one before it.
export const FadeIn: React.FC<{children: React.ReactNode; dur?: number}> = ({children, dur = 18}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{opacity: t01(f, 0, dur)}}>{children}</AbsoluteFill>;
};

export const clampLerp = (a: number, b: number, t: number) => lerp(a, b, Math.max(0, Math.min(1, t)));
