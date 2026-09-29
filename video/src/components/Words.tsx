import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, clamp, easeOut, jakarta, sora} from '../theme';

type WordsProps = {
  text: string;
  at?: number;
  out?: number;
  size: number;
  weight?: number;
  color?: string;
  font?: string;
  lineHeight?: number;
  tracking?: string;
  stagger?: number;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
};

// A line that rises into place word by word, each word from behind its own mask,
// and lifts away when it is replaced.
export const Words: React.FC<WordsProps> = ({
  text, at = 0, out, size, weight = 600, color = C.ink, font = sora,
  lineHeight = 1.08, tracking = '-0.03em', stagger = 2.5, align = 'left', style,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  const exit = out === undefined ? 0 : interpolate(frame, [out, out + 12], [0, 1], {...clamp, easing: easeOut});
  return (
    <div
      style={{
        fontFamily: font, fontSize: size, fontWeight: weight, color, lineHeight, letterSpacing: tracking,
        textAlign: align, opacity: 1 - exit, transform: `translateY(${-18 * exit}px)`, ...style,
      }}
    >
      {words.map((word, i) => {
        const p = interpolate(frame - at - i * stagger, [0, 24], [0, 1], {...clamp, easing: easeOut});
        return (
          <React.Fragment key={i}>
            <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.16em', marginBottom: '-0.16em'}}>
              <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 108}%)`}}>{word}</span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export type CaptionItem = {text: string; at: number; out?: number};

// Several lines that replace one another in the same place.
export const Captions: React.FC<{items: CaptionItem[]; size?: number; color?: string; align?: 'left' | 'center'; width?: number}> = ({
  items, size = 62, color = C.ink, align = 'left', width,
}) => (
  <div style={{display: 'grid', width}}>
    {items.map((c, i) => (
      <div key={i} style={{gridArea: '1 / 1'}}>
        <Words text={c.text} at={c.at} out={c.out} size={size} color={color} align={align} />
      </div>
    ))}
  </div>
);

// The small uppercase label over a headline, the same treatment the app gives
// the "ADMIN" line over each page title.
export const Kicker: React.FC<{items: CaptionItem[]; color?: string; align?: 'left' | 'center'}> = ({items, color = C.brand, align = 'left'}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'grid', marginBottom: 26}}>
      {items.map((k, i) => {
        const p = interpolate(frame - k.at, [0, 18], [0, 1], {...clamp, easing: easeOut});
        const e = k.out === undefined ? 0 : interpolate(frame, [k.out, k.out + 10], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              gridArea: '1 / 1', fontFamily: jakarta, fontWeight: 600, fontSize: 21, letterSpacing: '0.16em',
              textTransform: 'uppercase', color, textAlign: align, opacity: p * (1 - e),
              transform: `translateY(${(1 - p) * 10}px)`,
            }}
          >
            {k.text}
          </div>
        );
      })}
    </div>
  );
};
