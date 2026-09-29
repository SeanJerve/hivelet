import React from 'react';
import {Composition} from 'remotion';
import {TOTAL, Video} from './Video';
import {H, W} from './theme';
import {FPS} from './anim';

export const Root: React.FC = () => (
  <Composition id="Hivelet" component={Video} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
