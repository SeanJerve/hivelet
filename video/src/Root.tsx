import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS, H, W} from './theme';
import {TOTAL} from './timeline';

export const Root: React.FC = () => (
  <Composition id="Hivelet" component={Video} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
