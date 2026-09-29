import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {GAIN, buildCues} from './cues.mjs';
import tl from './timeline.json';

// One sound effect at one frame of the scene it sits in. The files are made by
// capture/sfx.mjs.
export const Sfx: React.FC<{at: number; name: string; vol?: number}> = ({at, name, vol = 0.3}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={100} name={`sfx ${name}`} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={Math.min(1, vol * GAIN)} />
  </Sequence>
);

const CUES = buildCues(tl) as unknown as Record<string, [number, string, number, string][]>;

// Every sound a scene makes, from the one list in cues.mjs.
export const Cues: React.FC<{scene: string}> = ({scene}) => (
  <>{(CUES[scene] ?? []).map(([at, name, vol], i) => <Sfx key={`${scene}-${i}`} at={at} name={name} vol={vol} />)}</>
);
