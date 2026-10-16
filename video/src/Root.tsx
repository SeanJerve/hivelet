import React from 'react';
import {Composition} from 'remotion';
import {TOTAL, Video} from './Video';
import {H, W} from './theme';
import {OUT_FPS, STEP} from './anim';

export const Root: React.FC = () => (
  <Composition id="Hivelet" component={Video} durationInFrames={TOTAL * STEP} fps={OUT_FPS} width={W} height={H} />
);
