// Motion helpers. Everything is a pure function of the frame, so any frame can
// be rendered on its own and the film is the same every time.
import {Easing, interpolate, spring} from 'remotion';

export const FPS = 30;

const clampOpts = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const gentle = Easing.bezier(0.45, 0, 0.2, 1);

// 0 to 1 between two frames.
export const t01 = (f: number, a: number, b: number, ease = easeOut) => interpolate(f, [a, b], [0, 1], {...clampOpts, easing: ease});
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// A soft physical spring: arrives with the smallest overshoot and settles. The
// film is deliberately unhurried, so the defaults are slow and well damped.
export const pop = (f: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: f - at, fps: FPS, config: {damping: 20, stiffness: 95, mass: 1, ...cfg}});

export const count = (f: number, at: number, dur: number, to: number) => Math.round(interpolate(f, [at, at + dur], [0, to], {...clampOpts, easing: expoOut}));
export const typed = (text: string, f: number, at: number, perChar = 2) => text.slice(0, Math.max(0, Math.floor((f - at) / perChar)));

export const peso = (v: number, decimals = 0) => `₱${v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}`;

// Camera keyframes over a flat stage: centre (x, y) of the stage at scale s,
// tilted by rx, ry, rz degrees. Between keys it eases in and out. `z` is the
// stage's render zoom (see Stage in fx.tsx): the stage is laid out z times
// larger and the camera scales it back down, so nothing is ever enlarged from a
// small raster and every edge stays sharp.
export type Cam = {at: number; x: number; y: number; s: number; rx?: number; ry?: number; rz?: number; dur?: number; ease?: (t: number) => number};
export function cameraAt(f: number, keys: Cam[]) {
  const v = {x: keys[0].x, y: keys[0].y, s: keys[0].s, rx: keys[0].rx ?? 0, ry: keys[0].ry ?? 0, rz: keys[0].rz ?? 0};
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.at) break;
    const t = t01(f, k.at, k.at + (k.dur ?? 50), k.ease ?? easeInOut);
    v.x = lerp(v.x, k.x, t); v.y = lerp(v.y, k.y, t); v.s = lerp(v.s, k.s, t);
    v.rx = lerp(v.rx, k.rx ?? 0, t); v.ry = lerp(v.ry, k.ry ?? 0, t); v.rz = lerp(v.rz, k.rz ?? 0, t);
  }
  return v;
}
export function camera(f: number, keys: Cam[], z = 2, cx = 960, cy = 540) {
  const v = cameraAt(f, keys);
  return `translate(${cx}px, ${cy}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg) rotateZ(${v.rz}deg) scale(${v.s / z}) translate(${-v.x * z}px, ${-v.y * z}px)`;
}

// A piece arriving from depth: returns style for opacity and a 3D transform.
export function flyIn(f: number, at: number, from: {x?: number; y?: number; z?: number; rx?: number; ry?: number; s?: number} = {}) {
  const p = pop(f, at, {damping: 20, stiffness: 80});
  const o = t01(f, at, at + 14);
  return {
    opacity: o,
    transform: `translate3d(${(from.x ?? 0) * (1 - p)}px, ${(from.y ?? 60) * (1 - p)}px, ${(from.z ?? -400) * (1 - p)}px) rotateX(${(from.rx ?? 14) * (1 - p)}deg) rotateY(${(from.ry ?? 0) * (1 - p)}deg) scale(${lerp(from.s ?? 1, 1, p)})`,
  };
}
