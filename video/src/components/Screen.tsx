import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, clamp, easeInOut, easeOut, jakarta} from '../theme';

// A real captured page, shown through a moving camera. Every coordinate below is
// in the page's own CSS pixels (1440x900 on a laptop, 390x844 on a phone), so a
// region can be read straight off the page it came from.

export type Key = {at: number; x: number; y: number; zoom: number; dur?: number};
export type Shot = {src: string; at: number; url?: string};
export type Lift = {x: number; y: number; w: number; h: number; at: number; out?: number; r?: number};
export type Point = {at: number; x: number; y: number};

type PageSize = {w: number; h: number};

function cameraAt(frame: number, keys: Key[]) {
  let cur = {x: keys[0].x, y: keys[0].y, zoom: keys[0].zoom};
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (frame < k.at) break;
    const t = interpolate(frame, [k.at, k.at + (k.dur ?? 36)], [0, 1], {...clamp, easing: easeInOut});
    cur = {x: cur.x + (k.x - cur.x) * t, y: cur.y + (k.y - cur.y) * t, zoom: cur.zoom + (k.zoom - cur.zoom) * t};
  }
  return cur;
}

function pointAt(frame: number, path: Point[]) {
  let cur = {x: path[0].x, y: path[0].y};
  for (let i = 1; i < path.length; i++) {
    const p = path[i];
    if (frame < p.at) break;
    const t = interpolate(frame, [p.at, p.at + 22], [0, 1], {...clamp, easing: easeInOut});
    cur = {x: cur.x + (p.x - cur.x) * t, y: cur.y + (p.y - cur.y) * t};
  }
  return cur;
}

export const activeShot = (frame: number, shots: Shot[]) => [...shots].reverse().find((s) => frame >= s.at) ?? shots[0];

type ViewportProps = {
  page: PageSize;
  width: number;
  viewH: number;
  shots: Shot[];
  keys: Key[];
  lifts?: Lift[];
  cursor?: {path: Point[]; clicks?: number[]};
  taps?: Point[];
};

export const Viewport: React.FC<ViewportProps> = ({page, width, viewH, shots, keys, lifts = [], cursor, taps = []}) => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, keys);
  const s = (width / page.w) * cam.zoom;
  const tx = Math.min(0, Math.max(width - page.w * s, width / 2 - cam.x * s));
  const ty = Math.min(0, Math.max(viewH - page.h * s, viewH / 2 - cam.y * s));
  const current = activeShot(frame, shots);

  const liftP = lifts.map((l) => {
    const i = interpolate(frame, [l.at, l.at + 16], [0, 1], {...clamp, easing: easeOut});
    const o = l.out === undefined ? 0 : interpolate(frame, [l.out, l.out + 12], [0, 1], {...clamp, easing: easeOut});
    return i * (1 - o);
  });
  const dim = Math.max(0, ...liftP) * 0.4;

  return (
    <div style={{position: 'relative', width, height: viewH, overflow: 'hidden', background: C.canvas}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: page.w, height: page.h, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        {shots.map((shot, i) => {
          const o = i === 0 ? 1 : interpolate(frame, [shot.at, shot.at + 10], [0, 1], {...clamp, easing: easeOut});
          return <Img key={shot.src} src={staticFile(shot.src)} style={{position: 'absolute', inset: 0, width: page.w, height: page.h, opacity: o}} />;
        })}
        <div style={{position: 'absolute', inset: 0, background: C.night, opacity: dim}} />
        {lifts.map((l, i) => {
          const p = liftP[i];
          if (p <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h, overflow: 'hidden',
                borderRadius: l.r ?? 16, transform: `scale(${1 + 0.05 * p})`, transformOrigin: 'center',
                boxShadow: `0 ${20 * p}px ${50 * p}px rgba(15,27,21,${0.32 * p})`, opacity: Math.min(1, p * 3),
              }}
            >
              <Img src={staticFile(current.src)} style={{position: 'absolute', left: -l.x, top: -l.y, width: page.w, height: page.h}} />
            </div>
          );
        })}
        {taps.map((t, i) => {
          const local = frame - t.at;
          if (local < 0 || local > 26) return null;
          const p = interpolate(local, [0, 26], [0, 1], {...clamp, easing: easeOut});
          const r = 34 / s;
          return (
            <div key={i} style={{position: 'absolute', left: t.x - r, top: t.y - r, width: r * 2, height: r * 2, borderRadius: '50%',
              background: C.brandBright, opacity: 0.35 * (1 - p), transform: `scale(${0.4 + 0.9 * p})`}} />
          );
        })}
        {cursor ? <Cursor frame={frame} path={cursor.path} clicks={cursor.clicks ?? []} scale={s} /> : null}
      </div>
    </div>
  );
};

const Cursor: React.FC<{frame: number; path: Point[]; clicks: number[]; scale: number}> = ({frame, path, clicks, scale}) => {
  const appear = interpolate(frame, [path[0].at, path[0].at + 10], [0, 1], clamp);
  if (appear <= 0) return null;
  const pos = pointAt(frame, path);
  const size = 30 / scale;
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(frame, [c - 3, c, c + 6], [0, 1, 0], clamp)), 0);
  return (
    <>
      {clicks.map((c, i) => {
        const local = frame - c;
        if (local < 0 || local > 20) return null;
        const p = interpolate(local, [0, 20], [0, 1], {...clamp, easing: easeOut});
        const r = (14 + 22 * p) / scale;
        return <div key={i} style={{position: 'absolute', left: pos.x - r, top: pos.y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${2 / scale}px solid ${C.brandBright}`, opacity: 1 - p}} />;
      })}
      <svg
        width={size} height={size} viewBox="0 0 24 24"
        style={{position: 'absolute', left: pos.x - size * 0.18, top: pos.y - size * 0.08, opacity: appear, transform: `scale(${1 - 0.14 * press})`, transformOrigin: '20% 10%', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))'}}
      >
        <path d="M4.5 2.5 L4.5 19 L9 14.6 L12 21.2 L14.6 20 L11.7 13.6 L18 13.6 Z" fill={C.ink} stroke="#ffffff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
};

type FrameProps = Omit<ViewportProps, 'page' | 'width' | 'viewH'> & {left: number; top: number; width: number; enterAt?: number};

// A plain browser window: three quiet dots and the page's real address.
export const Browser: React.FC<FrameProps> = ({left, top, width, enterAt = 0, ...rest}) => {
  const frame = useCurrentFrame();
  const page = {w: 1440, h: 900};
  const viewH = (width / page.w) * page.h;
  const p = interpolate(frame - enterAt, [0, 28], [0, 1], {...clamp, easing: easeOut});
  const url = activeShot(frame, rest.shots).url ?? '';
  return (
    <div
      style={{
        position: 'absolute', left, top, width, borderRadius: 18, overflow: 'hidden', background: C.tile,
        border: `1px solid ${C.line}`, boxShadow: '0 40px 90px rgba(15,27,21,0.14), 0 3px 10px rgba(15,27,21,0.06)',
        opacity: p, transform: `translateY(${(1 - p) * 56}px) scale(${0.97 + 0.03 * p})`,
      }}
    >
      <div style={{height: 46, display: 'flex', alignItems: 'center', padding: '0 18px', borderBottom: `1px solid ${C.line}`, position: 'relative'}}>
        {[0, 1, 2].map((i) => <div key={i} style={{width: 11, height: 11, borderRadius: 6, background: '#d8dfda', marginRight: 8}} />)}
        <div style={{position: 'absolute', left: '50%', transform: 'translateX(-50%)', height: 28, padding: '0 18px', borderRadius: 14, background: C.canvas,
          display: 'flex', alignItems: 'center', gap: 8, fontFamily: jakarta, fontSize: 14, color: C.inkSoft, letterSpacing: '0.01em'}}>
          <svg width="11" height="12" viewBox="0 0 11 12"><rect x="1" y="5" width="9" height="6.5" rx="1.5" fill={C.inkFaint} /><path d="M3 5V3.6a2.5 2.5 0 0 1 5 0V5" stroke={C.inkFaint} strokeWidth="1.4" fill="none" /></svg>
          {url}
        </div>
      </div>
      <Viewport page={page} width={width} viewH={viewH} {...rest} />
    </div>
  );
};

// A plain phone: one dark bezel, no invented status bar.
export const Phone: React.FC<Omit<FrameProps, 'width'> & {height: number}> = ({left, top, height, enterAt = 0, ...rest}) => {
  const frame = useCurrentFrame();
  const page = {w: 390, h: 844};
  const width = (height / page.h) * page.w;
  const p = interpolate(frame - enterAt, [0, 30], [0, 1], {...clamp, easing: easeOut});
  return (
    <div
      style={{
        position: 'absolute', left, top, padding: 12, borderRadius: 64, background: C.night,
        boxShadow: '0 50px 100px rgba(15,27,21,0.22), 0 4px 14px rgba(15,27,21,0.12)',
        opacity: p, transform: `translateY(${(1 - p) * 70}px)`,
      }}
    >
      <div style={{borderRadius: 52, overflow: 'hidden'}}>
        <Viewport page={page} width={width} viewH={height} {...rest} />
      </div>
    </div>
  );
};
