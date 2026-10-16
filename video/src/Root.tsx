import React from 'react';
import {Composition} from 'remotion';
import {TOTAL, Video} from './Video';
import {H, W} from './theme';
import {OUT_FPS, STEP} from './anim';
import {Pitch, PITCH_FRAMES} from './pitch/Pitch';
import {FPS as PITCH_FPS} from './pitch/kit';
import {PaperPitch, PAPER_FRAMES} from './paper/PaperPitch';
import {ScreenPitch, SCREEN_FRAMES} from './screen/ScreenPitch';

export const Root: React.FC = () => (
  <>
    <Composition id="Hivelet" component={Video} durationInFrames={TOTAL * STEP} fps={OUT_FPS} width={W} height={H} />
    <Composition id="Pitch" component={Pitch} durationInFrames={PITCH_FRAMES} fps={PITCH_FPS} width={W} height={H} />
    <Composition id="PaperPitch" component={PaperPitch} durationInFrames={PAPER_FRAMES} fps={60} width={W} height={H} />
    <Composition id="ScreenPitch" component={ScreenPitch} durationInFrames={SCREEN_FRAMES} fps={60} width={W} height={H} />
  </>
);
