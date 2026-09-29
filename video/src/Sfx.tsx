import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

export type SfxName =
  | 'whoosh' | 'swipe' | 'whoosh-low' | 'click' | 'tap' | 'pop' | 'key1' | 'key2' | 'key3'
  | 'tick' | 'ping' | 'bling' | 'chime' | 'warn' | 'snap' | 'riser' | 'impact';

// One sound effect at one frame of the scene it sits in.
export const Sfx: React.FC<{at: number; name: SfxName; vol?: number}> = ({at, name, vol = 0.6}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={90} name={`sfx ${name}`} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
  </Sequence>
);

// Key taps for text being typed: one per character, varied so it sounds like hands.
export const Typing: React.FC<{at: number; chars: number; perChar?: number; vol?: number}> = ({at, chars, perChar = 2, vol = 0.32}) => (
  <>
    {Array.from({length: chars}, (_, i) => (
      <Sfx key={i} at={at + i * perChar} name={(['key1', 'key2', 'key3'] as const)[(i * 7) % 3]} vol={vol * (0.8 + ((i * 13) % 5) * 0.06)} />
    ))}
  </>
);

// Ticks while a number runs up, thinning out as it settles.
export const Ticks: React.FC<{at: number; dur: number; vol?: number}> = ({at, dur, vol = 0.22}) => {
  const frames: number[] = [];
  for (let t = 0; t < dur; t += 1 + Math.floor((t / dur) * 5)) frames.push(at + t);
  return <>{frames.map((f) => <Sfx key={f} at={f} name="tick" vol={vol} />)}</>;
};
