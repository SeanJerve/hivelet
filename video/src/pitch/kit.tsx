// The pitch's motion language. A different film from the product film: near-black
// and luminous emerald instead of the app's canvas, one glowing thread that ties
// everything together, huge type, directional motion blur on every fast move, and
// film grain. Rendered natively at 60 fps: frames here are 1/60 s.
import React, {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame} from 'remotion';
import {jakarta, sora} from '../theme';

export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const sec = (s: number) => Math.round(s * FPS);

export const P = {
  ink: '#030705',
  deep: '#06120c',
  moss: '#0b2a1c',
  emerald: '#1fbf7a',
  glow: '#5ff2a8',
  lime: '#c8f56a',
  amber: '#ffb547',
  coral: '#ff6b5e',
  white: '#f4fbf7',
  soft: 'rgba(244,251,247,0.62)',
  faint: 'rgba(244,251,247,0.34)',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const quint = Easing.bezier(0.83, 0, 0.17, 1);
export const inQuint = Easing.bezier(0.64, 0, 0.78, 0);
export const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);
export const t01 = (f: number, a: number, b: number, ease: (t: number) => number = expo) => interpolate(f, [a, b], [0, 1], {...clamp, easing: ease});
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const spr = (f: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: f - at, fps: FPS, config: {damping: 16, stiffness: 120, mass: 1, ...cfg}});
// How fast something eased by t01 is moving at frame f, 0 to about 1: drives motion blur.
export const speed = (f: number, a: number, b: number, ease: (t: number) => number = expo) => Math.abs(t01(f + 1, a, b, ease) - t01(f - 1, a, b, ease)) * (b - a) / 2;

// ---- Directional motion blur ---------------------------------------------------------
// An SVG Gaussian blur stretched along the direction of travel, on any HTML element.
export const MBlur: React.FC<{x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x = 0, y = 0, children, style}) => {
  const id = useId().replace(/:/g, '');
  const on = Math.abs(x) > 0.2 || Math.abs(y) > 0.2;
  return (
    <div style={{filter: on ? `url(#mb${id})` : undefined, ...style}}>
      {on ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={`mb${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={`${Math.abs(x).toFixed(2)} ${Math.abs(y).toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      {children}
    </div>
  );
};

// ---- Atmosphere --------------------------------------------------------------------------
// Slow light in the dark: three soft blobs drifting, coloured per act.
export const Aurora: React.FC<{tone: 'night' | 'warm' | 'emerald'; intensity?: number}> = ({tone, intensity = 1}) => {
  const f = useCurrentFrame();
  const c = tone === 'warm' ? ['rgba(255,181,71,0.16)', 'rgba(255,107,94,0.10)', 'rgba(31,191,122,0.08)']
    : tone === 'emerald' ? ['rgba(31,191,122,0.42)', 'rgba(200,245,106,0.16)', 'rgba(95,242,168,0.22)']
      : ['rgba(31,191,122,0.13)', 'rgba(95,242,168,0.06)', 'rgba(200,245,106,0.05)'];
  const blob = (i: number, color: string) => {
    const x = 50 + Math.sin(f / (190 + i * 40) + i * 2) * 26;
    const y = 50 + Math.cos(f / (230 + i * 35) + i) * 22;
    return `radial-gradient(ellipse ${46 + i * 8}% ${52 + i * 6}% at ${x}% ${y}%, ${color} 0%, transparent 70%)`;
  };
  return <AbsoluteFill style={{background: `${c.map((col, i) => blob(i, col)).join(', ')}, ${P.ink}`, opacity: intensity}} />;
};

// Film grain: fresh noise every other frame, faint, laid over everything.
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 97;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <filter id={`grain${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter={`url(#grain${seed})`} />
    </svg>
  );
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.75}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 40%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none'}} />
);

// A camera that breathes: a slow drift, and a short, decaying shake after each hit.
export const Camera: React.FC<{hits?: number[]; drift?: number; children: React.ReactNode; zoom?: number}> = ({hits = [], drift = 1, children, zoom = 1}) => {
  const f = useCurrentFrame();
  let sx = 0, sy = 0, sr = 0;
  for (const h of hits) {
    const k = f - h;
    if (k < 0 || k > 24) continue;
    const decay = Math.exp(-k / 6);
    sx += (random(`x${h}${k}`) - 0.5) * 18 * decay;
    sy += (random(`y${h}${k}`) - 0.5) * 14 * decay;
    sr += (random(`r${h}${k}`) - 0.5) * 0.6 * decay;
  }
  const dx = Math.sin(f / 97) * 6 * drift, dy = Math.cos(f / 113) * 4 * drift;
  return <AbsoluteFill style={{transform: `translate(${sx + dx}px, ${sy + dy}px) rotate(${sr}deg) scale(${zoom})`}}>{children}</AbsoluteFill>;
};

// ---- Type ---------------------------------------------------------------------------------
type Look = {size: number; color?: string; weight?: number; font?: string; ls?: string; lh?: number; gradient?: string};
const textStyle = ({size, color = P.white, weight = 800, font = sora, ls = '-0.055em', lh = 0.92, gradient}: Look): React.CSSProperties => ({
  fontFamily: font, fontSize: size, fontWeight: weight, letterSpacing: ls, lineHeight: lh, color,
  ...(gradient ? {backgroundImage: gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {}),
});

// Letters rising out of their own baseline, one after another, each on a spring,
// with a blur that clears as it lands. `out` sends them up and away, blurred.
export const Rise: React.FC<Look & {text: string; at: number; out?: number; stagger?: number; align?: 'left' | 'center' | 'right'; style?: React.CSSProperties; accent?: string[]; accentGradient?: string}> = ({
  text, at, out, stagger = 1.6, align = 'left', style, accent = [], accentGradient, ...look
}) => {
  const f = useCurrentFrame();
  let k = 0;
  return (
    <div style={{textAlign: align, whiteSpace: 'pre', ...style}}>
      {text.split('\n').map((line, li) => (
        <div key={li} style={{...textStyle(look)}}>
          {line.split(/(\s+)/).map((word, wi) => {
            if (/^\s+$/.test(word)) return <span key={wi}>{word}</span>;
            const hot = accent.includes(word.replace(/[.,!?:]/g, ''));
            return (
              <span key={wi} style={{display: 'inline-block', whiteSpace: 'nowrap', ...(hot && accentGradient ? {backgroundImage: accentGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {})}}>
                {word.split('').map((ch, ci) => {
                  const n = k++;
                  const p = spr(f, at + n * stagger, {damping: 15, stiffness: 140});
                  const e = out === undefined ? 0 : t01(f, out + n * 0.6, out + n * 0.6 + 16, inQuint);
                  const blur = (1 - Math.min(1, p)) * 14 + e * 18;
                  return (
                    <span key={ci} style={{display: 'inline-block', transform: `translateY(${(1 - p) * 0.7 * look.size - e * 0.6 * look.size}px) rotate(${(1 - p) * 8}deg) scale(${lerp(0.7, 1, Math.min(1, p))})`,
                      opacity: Math.min(1, p * 1.4) * (1 - e), filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
                      ...(hot && accentGradient ? {backgroundImage: accentGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {})}}>{ch}</span>
                  );
                })}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// A word that lands hard: from large and blurred to its size, with a little overshoot.
export const Slam: React.FC<Look & {text: React.ReactNode; at: number; out?: number; from?: number; style?: React.CSSProperties}> = ({text, at, out, from = 1.9, style, ...look}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, {damping: 13, stiffness: 170});
  const e = out === undefined ? 0 : t01(f, out, out + 14, inQuint);
  const blur = Math.max(0, 1 - p) * 30 + e * 24;
  return (
    <div style={{...textStyle(look), transform: `scale(${lerp(from, 1, p) * (1 + e * 0.35)})`, opacity: Math.min(1, p * 2) * (1 - e),
      filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined, whiteSpace: 'nowrap', ...style}}>{text}</div>
  );
};

// A light that passes across text once: a bright band in a gradient fill.
export const sweep = (f: number, at: number, base = P.white, light = '#ffffff', band = P.lime) => {
  const x = lerp(-60, 160, t01(f, at, at + 50, quint));
  return `linear-gradient(100deg, ${base} ${x - 24}%, ${band} ${x - 6}%, ${light} ${x}%, ${band} ${x + 6}%, ${base} ${x + 24}%)`;
};

export const GREEN = `linear-gradient(95deg, ${P.glow} 0%, ${P.lime} 100%)`;
export const WARM = `linear-gradient(95deg, ${P.amber} 0%, ${P.coral} 100%)`;

// Digits that roll into place like an odometer, each column on its own delay.
export const Odometer: React.FC<Look & {value: string; at: number; dur?: number}> = ({value, at, dur = 70, ...look}) => {
  const f = useCurrentFrame();
  const h = look.size * 1.0;
  // A gradient fill has to sit on each digit: background-clip text does not reach through
  // the rolling columns' transforms and filters, so on the parent the digits come out clear.
  const fill: React.CSSProperties = look.gradient ? {backgroundImage: look.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {};
  return (
    <div style={{display: 'flex', ...textStyle({...look, gradient: undefined}), lineHeight: 1}}>
      {value.split('').map((ch, i) => {
        if (!/[0-9]/.test(ch)) return <span key={i} style={{display: 'inline-block', opacity: t01(f, at + 10, at + 30), ...fill}}>{ch}</span>;
        const target = Number(ch) + 10 * (2 + i);
        const t = t01(f, at + i * 6, at + i * 6 + dur, expo);
        const pos = target * t;
        const v = speed(f, at + i * 6, at + i * 6 + dur, expo) * target;
        return (
          <span key={i} style={{display: 'inline-block', height: h, overflow: 'hidden', position: 'relative', width: '0.62em'}}>
            <MBlur y={Math.min(26, v * 4)}>
              <span style={{display: 'block', transform: `translateY(${-(pos % 10) * h}px)`}}>
                {Array.from({length: 11}, (_, d) => <span key={d} style={{display: 'block', height: h, textAlign: 'center', ...fill}}>{d % 10}</span>)}
              </span>
            </MBlur>
          </span>
        );
      })}
    </div>
  );
};

// A small label: wide-tracked caps, quiet.
export const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = P.soft, size = 22, style}) => (
  <div style={{fontFamily: jakarta, fontWeight: 700, fontSize: size, letterSpacing: '0.22em', textTransform: 'uppercase', color, ...style}}>{children}</div>
);

// ---- The thread ---------------------------------------------------------------------------
// One glowing line through the whole film. A path is a list of points, smoothed by a
// Catmull-Rom spline and resampled, so its length and any point along it are exact.
export type Pt = {x: number; y: number};
export function spline(points: Pt[], steps = 24): Pt[] {
  if (points.length < 3) return points;
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}
export function measure(pts: Pt[]) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = acc[acc.length - 1];
  const at = (len: number): Pt => {
    const L = Math.max(0, Math.min(total, len));
    let i = 1;
    while (i < acc.length - 1 && acc[i] < L) i++;
    const seg = acc[i] - acc[i - 1] || 1, u = (L - acc[i - 1]) / seg;
    return {x: lerp(pts[i - 1].x, pts[i].x, u), y: lerp(pts[i - 1].y, pts[i].y, u)};
  };
  return {total, at, d: pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')};
}

// Draw the part of a path between `from` and `to` (0..1 of its length), with a soft glow,
// a hot core and a bright head where it is being drawn.
export const Thread: React.FC<{pts: Pt[]; from?: number; to: number; width?: number; color?: string; head?: boolean; glow?: number}> = ({pts, from = 0, to, width = 4, color = P.glow, head = true, glow = 1}) => {
  const m = measure(pts);
  const a = Math.max(0, Math.min(1, from)) * m.total, b = Math.max(0, Math.min(1, to)) * m.total;
  if (b - a < 0.5) return null;
  const dash = {strokeDasharray: `${b - a} ${m.total * 2}`, strokeDashoffset: -a};
  const h = m.at(b);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <path d={m.d} fill="none" stroke={color} strokeWidth={width * 6} strokeLinecap="round" strokeLinejoin="round" opacity={0.18 * glow} style={{filter: 'blur(14px)', ...dash}} />
      <path d={m.d} fill="none" stroke={color} strokeWidth={width * 2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.45 * glow} style={{filter: 'blur(4px)', ...dash}} />
      <path d={m.d} fill="none" stroke="#eafff3" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={dash} />
      {head && b < m.total - 0.5 ? (
        <>
          <circle cx={h.x} cy={h.y} r={width * 7} fill={color} opacity={0.35} style={{filter: 'blur(10px)'}} />
          <circle cx={h.x} cy={h.y} r={width * 1.6} fill="#ffffff" />
        </>
      ) : null}
    </svg>
  );
};

// A bright diagonal line that crosses the frame and reveals what is behind it: the cut
// between scenes. `p` runs 0 to 1; the new scene is shown where the line has passed.
export const threadWipeClip = (p: number) => {
  // The line runs from (x, -100) to (x - 700, H + 100); the revealed side is to its left.
  const x = lerp(-200, W + 900, p);
  return `polygon(-1000px -200px, ${x}px -200px, ${x - 760}px ${H + 200}px, -1000px ${H + 200}px)`;
};
export const ThreadWipeLine: React.FC<{p: number}> = ({p}) => {
  if (p <= 0 || p >= 1) return null;
  const x = lerp(-200, W + 900, p);
  return <Thread pts={[{x, y: -200}, {x: x - 760, y: H + 200}]} to={1} width={5} head={false} glow={1.4} />;
};

// A glass panel for product shots: a dark sheet with a lit edge.
export const Glass: React.FC<{w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties; r?: number}> = ({w, h, children, style, r = 32}) => (
  <div style={{width: w, height: h, borderRadius: r, position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 100%)',
    border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 50px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18)', ...style}}>
    {children}
  </div>
);
