import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, clamp} from '../theme';
import {CaptionItem, Captions, Kicker} from './Words';

// Every scene fades in over the one before it, on its own background.
export const Scene: React.FC<{bg?: string; children: React.ReactNode}> = ({bg = C.canvas, children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14], [0, 1], clamp);
  return <AbsoluteFill style={{background: bg, opacity: o}}>{children}</AbsoluteFill>;
};

// The grid every product scene shares: words on the left, the screen on the right.
export const TEXT_LEFT = 120;
export const TEXT_WIDTH = 520;
export const SCREEN_LEFT = 696;
export const SCREEN_WIDTH = 1164;
export const SCREEN_TOP = Math.round((1080 - (46 + (SCREEN_WIDTH / 1440) * 900)) / 2);

export const TextColumn: React.FC<{kicker: CaptionItem[]; captions: CaptionItem[]; size?: number}> = ({kicker, captions, size = 60}) => (
  <div style={{position: 'absolute', left: TEXT_LEFT, top: 0, bottom: 0, width: TEXT_WIDTH, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
    <Kicker items={kicker} />
    <Captions items={captions} size={size} width={TEXT_WIDTH} />
  </div>
);
