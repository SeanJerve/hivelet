// The screen pitch: 60 s, 1920x1080, 60 fps. A laptop in a dark room; on its screen, the
// pitch, typed and drawn as the voice speaks (after the reference Sean sent). The camera
// barely moves, as a phone on a tripod would: a slow push, a breath of hand-held drift,
// a pull back at the end as the screen goes dark.
import React from 'react';
import {Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Room, Camera, Glow} from './Room';
import {clamp01, E, lerp, sec, t01} from './kit';
import {AT, f as F, LEN, OFF, TOTAL} from './timeline';
import {sceneAt, Screen} from './Screens';

// [seconds, x, y, z, tilt, yaw]: the camera eases from each to the next.
const K: [number, number, number, number, number, number][] = [
  [0, 150, 360, -900, 3.5, 27],
  [3.6, 150, 365, -660, 3.5, 25],
  [21.4, 140, 380, -540, 4, 22],
  [23.2, 140, 385, -600, 4, 22],
  [25.0, 140, 380, -560, 4.5, 23],
  [49.5, 150, 385, -470, 5, 19],
  [57.5, 150, 360, -720, 4, 23],
  [60, 150, 350, -840, 3.5, 24],
];
const camAt = (s: number): Camera => {
  let i = 0;
  while (i < K.length - 2 && s >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  const p = E.inOut(clamp01((s - a[0]) / (b[0] - a[0])));
  const v = a.map((x, k) => lerp(x, b[k], p));
  // a hand-held breath: slow, small, never still
  const h = (fr: number, ph: number) => Math.sin(s * fr + ph) * 0.6 + Math.sin(s * fr * 2.3 + ph * 1.7) * 0.4;
  return {x: v[1] + h(0.7, 1) * 5, y: v[2] + h(0.5, 2) * 4, z: v[3], tilt: v[4] + h(0.4, 3) * 0.12, yaw: v[5] + h(0.35, 4) * 0.25, roll: h(0.3, 5) * 0.12};
};

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const lum = (c: [number, number, number]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

const files = new Set(getStaticFiles().map((x) => x.name));

export const ScreenPitch: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const sc = sceneAt(s);
  const color = rgb(sc.bg);
  const on = t01(f, sec(0.25), sec(0.6), E.out) * (1 - t01(f, sec(OFF), sec(OFF + 0.5), E.in));
  const glow: Glow = {color, level: (0.25 + 0.95 * lum(color)) * on};
  return (
    <>
      <Room cam={camAt(s)} glow={glow} screen={<Screen />} mirrorScreen={<Screen />} />
      {(Object.keys(AT) as (keyof typeof AT)[]).map((k) => (
        <Sequence key={k} from={F(AT[k])} durationInFrames={F(LEN[k]) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`screen/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {files.has('screen/score.wav') ? <Audio src={staticFile('screen/score.wav')} volume={1} /> : null}
    </>
  );
};
export const SCREEN_FRAMES = TOTAL;
