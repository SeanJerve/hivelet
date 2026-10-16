// The one-minute pitch: 60 s, 1920x1080, 60 fps, with a voice. Scenes are placed on
// absolute frames from timeline.ts; each is mounted only while it is on screen.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Aurora, Grain, P, t01, Vignette, quint} from './kit';
import {Drive, Hook, Nothing, Problem, Turn} from './ActOne';
import {Install, Ledger, Repairs, Tenant, Visitors} from './ActTwo';
import {Close, Rated, Records, Secure} from './ActThree';
import {f as F, SCENES, TOTAL, VO_AT, VO_LEN} from './timeline';
import {CUES} from './cues';

const Win: React.FC<{s: readonly [number, number]; pad?: number; children: React.ReactNode}> = ({s, pad = 0.6, children}) => {
  const f = useCurrentFrame();
  return f >= F(s[0]) - 2 && f < F(s[1] + pad) ? <>{children}</> : null;
};

const files = new Set(getStaticFiles().map((x) => x.name));

export const Pitch: React.FC = () => {
  const f = useCurrentFrame();
  // The light changes once: dark and cold until the drop, emerald after it.
  const lit = t01(f, F(19.9), F(20.4), quint);
  return (
    <AbsoluteFill style={{background: P.ink, overflow: 'hidden'}}>
      <Aurora tone="night" intensity={1 - lit} />
      <Aurora tone="emerald" intensity={lit * (1 - 0.55 * t01(f, F(40.0), F(40.5)))} />
      <Win s={SCENES.hook}><Hook /></Win>
      <Win s={SCENES.drive}><Drive /></Win>
      <Win s={SCENES.problem} pad={0.4}><Problem /></Win>
      <Win s={SCENES.nothing} pad={0.2}><Nothing /></Win>
      <Win s={SCENES.turn}><Turn /></Win>
      <Win s={SCENES.ledger}><Ledger /></Win>
      <Win s={SCENES.tenant}><Tenant /></Win>
      <Win s={SCENES.repairs}><Repairs /></Win>
      <Win s={SCENES.visitors}><Visitors /></Win>
      <Win s={SCENES.install}><Install /></Win>
      <Win s={SCENES.records}><Records /></Win>
      <Win s={SCENES.secure}><Secure /></Win>
      <Win s={SCENES.rated}><Rated /></Win>
      <Win s={SCENES.close}><Close /></Win>
      <Vignette strength={0.7} />
      <Grain opacity={0.08} />
      <AbsoluteFill style={{background: '#000', opacity: t01(f, TOTAL - 50, TOTAL - 4)}} />

      {/* The voice, one clip per phrase; the score under it; the effects on their cues. */}
      {(Object.keys(VO_AT) as (keyof typeof VO_AT)[]).map((k) => (
        <Sequence key={k} from={F(VO_AT[k])} durationInFrames={F(VO_LEN[k]) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`pitch/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {files.has('pitch/score.wav') ? <Audio src={staticFile('pitch/score.wav')} volume={1} /> : null}
      {CUES.map(([at, name, vol], i) => files.has(`sfx/${name}.wav`) ? (
        <Sequence key={i} from={Math.max(0, F(at))} durationInFrames={F(3)} layout="none" name={`sfx ${name}`}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ) : null)}
    </AbsoluteFill>
  );
};
export const PITCH_FRAMES = TOTAL;
