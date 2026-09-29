import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile} from 'remotion';
import {C} from './theme';
import {OVERLAP, SceneId, T, TOTAL, VOICE, VOICE_CUES} from './timeline';
import {Answer, Before, Cost, Place} from './scenes/Story';
import {Activity, Guests, Income, Overview, Repairs, Rooms, Tenant} from './scenes/Product';
import {Close, Proof} from './scenes/Close';

const SCENES: [SceneId, React.FC][] = [
  ['place', Place], ['before', Before], ['cost', Cost], ['answer', Answer], ['rooms', Rooms],
  ['income', Income], ['overview', Overview], ['tenant', Tenant], ['repairs', Repairs],
  ['guests', Guests], ['activity', Activity], ['proof', Proof], ['close', Close],
];

// Music is optional: drop a track at public/music.mp3 and it plays under the
// voice, lowered while a line is spoken. Without it the video is complete.
const hasMusic = getStaticFiles().some((f) => f.name === 'music.mp3');

const musicVolume = (frame: number) => {
  const speaking = VOICE_CUES.some((c) => frame >= c.at - 8 && frame <= c.at + c.dur + 8);
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [TOTAL - 60, TOTAL], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (speaking ? 0.1 : 0.32) * fadeIn * fadeOut;
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{background: C.canvas}}>
    {SCENES.map(([id, Component]) => (
      <Sequence key={id} from={T[id].from} durationInFrames={T[id].dur + OVERLAP} name={id}>
        <Component />
      </Sequence>
    ))}
    {VOICE_CUES.map((c) => (
      <Sequence key={c.id} from={c.at} durationInFrames={c.dur} name={`voice ${c.id}`}>
        <Audio src={staticFile(`voice/${VOICE}/${c.id}.mp3`)} />
      </Sequence>
    ))}
    {hasMusic ? <Audio src={staticFile('music.mp3')} volume={musicVolume} /> : null}
  </AbsoluteFill>
);
