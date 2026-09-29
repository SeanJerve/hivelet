import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile} from 'remotion';
import {C} from './theme';
import {Wipe} from './fx';
import {Sfx} from './Sfx';
import {Before, Cost, Hook, Reveal} from './scenes/Open';
import {Income, Overview, Rooms} from './scenes/Owner';
import {Guests, Tenant} from './scenes/People';
import {End, Proof, Trust} from './scenes/End';

// Scene lengths in frames at 30 fps. Kept in step with SCENES.md.
export const SCENES: [string, React.FC, number, boolean][] = [
  // id, scene, frames, whether a brand wipe covers the cut into it
  ['hook', Hook, 150, false],
  ['before', Before, 250, true],
  ['cost', Cost, 180, true],
  ['reveal', Reveal, 110, false],
  ['overview', Overview, 270, true],
  ['rooms', Rooms, 150, true],
  ['income', Income, 330, true],
  ['tenant', Tenant, 390, true],
  ['guests', Guests, 210, true],
  ['trust', Trust, 180, true],
  ['proof', Proof, 150, true],
  ['end', End, 150, true],
];
export const TOTAL = SCENES.reduce((s, [, , d]) => s + d, 0);

// Optional music: drop a track at public/music.mp3 and it plays low under the effects.
const hasMusic = getStaticFiles().some((f) => f.name === 'music.mp3');

export const Video: React.FC = () => {
  let at = 0;
  const starts = SCENES.map(([, , d]) => { const s = at; at += d; return s; });
  return (
    <AbsoluteFill style={{background: C.canvas}}>
      {SCENES.map(([id, Scene, d], i) => (
        <Sequence key={id} from={starts[i]} durationInFrames={d} name={id}>
          <Scene />
        </Sequence>
      ))}
      {SCENES.map(([id, , , wipe], i) => (wipe ? (
        <Sequence key={`w-${id}`} from={starts[i] - 8} durationInFrames={24} name={`wipe into ${id}`}>
          <Wipe at={0} />
          <Sfx at={0} name="whoosh" vol={0.45} />
        </Sequence>
      ) : null))}
      {hasMusic ? (
        <Audio src={staticFile('music.mp3')} volume={(f) => 0.25 * interpolate(f, [0, 30, TOTAL - 60, TOTAL], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
      ) : null}
    </AbsoluteFill>
  );
};
