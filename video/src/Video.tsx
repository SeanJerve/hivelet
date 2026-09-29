import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile} from 'remotion';
import {C} from './theme';
import {Chapter, FadeIn} from './fx';
import {Act1} from './scenes/Act1';
import {Income, Overview, Rooms} from './scenes/Owner';
import {Guests, Tenant} from './scenes/People';
import {End, Proof} from './scenes/End';
import tl from './timeline.json';

const LandladyCard = () => <Chapter text="For the landlady." accent={['landlady.']} />;
const TenantsCard = () => <Chapter text="For the tenants." accent={['tenants.']} />;
const GuestsCard = () => <Chapter text="For guests." accent={['guests.']} />;

const COMPONENTS: Record<string, React.FC> = {
  'act1': Act1, 'ch-landlady': LandladyCard, 'overview': Overview, 'rooms': Rooms, 'income': Income,
  'ch-tenants': TenantsCard, 'tenant': Tenant, 'ch-guests': GuestsCard, 'guests': Guests, 'proof': Proof, 'end': End,
};

// Scenes overlap by OVERLAP frames: each fades in over the tail of the last.
const OVERLAP = 16;
export const TOTAL = tl.scenes.reduce((s, x) => s + x.frames, 0);

// The score (capture/score.mjs) is written to the same timeline. Music of your
// own can go at public/music.mp3 and replaces it.
const files = getStaticFiles().map((f) => f.name);
const track = files.includes('music.mp3') ? 'music.mp3' : files.includes('score.wav') ? 'score.wav' : null;

export const Video: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{background: C.night}}>
      {tl.scenes.map((s) => {
        const from = at;
        at += s.frames;
        const Scene = COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.frames + OVERLAP} name={s.id}>
            {from === 0 ? <Scene /> : <FadeIn><Scene /></FadeIn>}
          </Sequence>
        );
      })}
      {track ? <Audio src={staticFile(track)} volume={0.9} /> : null}
    </AbsoluteFill>
  );
};
