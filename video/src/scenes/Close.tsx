// Scenes 12 and 13: the proof, and who made it.
import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, clamp, easeOut, jakarta, sora} from '../theme';
import {Scene} from '../components/Layout';
import {Words} from '../components/Words';

const rise = (frame: number, at: number) => interpolate(frame - at, [0, 26], [0, 1], {...clamp, easing: easeOut});

export const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const stats = [
    {to: 937, label: 'income records', at: 26},
    {to: 1327, label: 'expense records', at: 38},
    {to: 20, label: 'check suites, all passing', at: 50},
  ];
  return (
    <Scene>
      <div style={{position: 'absolute', left: 120, right: 120, top: 250}}>
        <Words text="Built on her real records." at={8} size={80} align="center" tracking="-0.04em" />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 480, display: 'flex', justifyContent: 'center', gap: 60}}>
        {stats.map((s) => {
          const p = rise(f, s.at);
          const v = Math.round(interpolate(f - s.at, [0, 44], [0, s.to], {...clamp, easing: easeOut}));
          return (
            <div key={s.label} style={{width: 460, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 34}px)`}}>
              <div style={{fontFamily: sora, fontWeight: 600, fontSize: 150, lineHeight: 0.95, letterSpacing: '-0.05em', color: C.brand, fontVariantNumeric: 'tabular-nums'}}>
                {v.toLocaleString('en-US')}
              </div>
              <div style={{width: 60, height: 3, borderRadius: 2, background: C.brandBright, margin: '30px auto 24px', transform: `scaleX(${p})`}} />
              <div style={{fontFamily: jakarta, fontSize: 30, color: C.inkSoft}}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

export const Close: React.FC = () => {
  const f = useCurrentFrame();
  const icon = rise(f, 6);
  const team = rise(f, 44);
  const names = ['Loyd', 'Sean', 'Eljohn', 'Vince', 'Kiel'];
  return (
    <Scene>
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32}}>
        <Img src={staticFile('icon-512.png')} style={{width: 112, height: 112, opacity: icon, transform: `scale(${0.92 + 0.08 * icon})`}} />
        <Words text="Hivelet" at={10} size={112} tracking="-0.045em" />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 476, textAlign: 'center', fontFamily: jakarta, fontWeight: 600, fontSize: 34, color: C.brand, opacity: rise(f, 26)}}>
        hivelet.vercel.app
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: team, transform: `translateY(${(1 - team) * 20}px)`}}>
        <div style={{fontFamily: jakarta, fontSize: 25, color: C.inkSoft, letterSpacing: '0.01em'}}>
          Group 4 · Bicol University · IT 124 Capstone Project 2
        </div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 54, marginTop: 26, fontFamily: sora, fontWeight: 500, fontSize: 32, color: C.ink, letterSpacing: '-0.01em'}}>
          {names.map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>
    </Scene>
  );
};
