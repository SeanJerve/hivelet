// The proof, and who made it.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, jakarta, sora} from '../theme';
import {count, lerp, pop, t01} from '../anim';
import {Bg, Kin} from '../fx';
import {Mark} from '../ui/Kit';
import {Sfx} from '../Sfx';

export const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const stats: [number, string, string, number][] = [
    [937, 'income records', 'from her workbook', 30], [1327, 'expense records', 'carried over', 48], [20, 'check suites', 'all passing', 66],
  ];
  return (
    <AbsoluteFill>
      <Bg mood="green" hex />
      <div style={{position: 'absolute', left: 0, right: 0, top: 170}}>
        <Kin text="Built on her real records." at={4} size={76} color="#fff" align="center" accent={['real']} accentColor={C.amber} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 390, display: 'flex', justifyContent: 'center'}}>
        {stats.map(([n, label, sub, at], i) => {
          const p = pop(f, at, {damping: 20, stiffness: 90});
          return (
            <div key={label} style={{width: 540, textAlign: 'center', borderLeft: i ? `1px solid rgba(255,255,255,${0.22 * t01(f, at, at + 16)})` : 'none',
              opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 40}px)`}}>
              <div style={{fontFamily: sora, fontWeight: 800, fontSize: 170, letterSpacing: '-0.06em', color: '#fff', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums'}}>
                {count(f, at, 60, n).toLocaleString('en-US')}
              </div>
              <div style={{fontFamily: jakarta, fontWeight: 600, fontSize: 34, color: '#fff', marginTop: 28}}>{label}</div>
              <div style={{fontFamily: jakarta, fontSize: 26, color: 'rgba(255,255,255,0.68)', marginTop: 6}}>{sub}</div>
            </div>
          );
        })}
      </div>
      {stats.map(([, , , at]) => <Sfx key={at} at={at} name="blip" vol={0.28} />)}
      <Sfx at={118} name="shimmer" vol={0.3} />
    </AbsoluteFill>
  );
};

export const End: React.FC = () => {
  const f = useCurrentFrame();
  const draw = t01(f, 6, 46);
  const shift = t01(f, 40, 70);
  const team = t01(f, 96, 120);
  const photo = t01(f, 0, 40);
  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={50} glowY={42} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', width: 740, height: 740, top: 70, opacity: 0.2 * photo, transform: `scale(${lerp(0.94, 1.02, t01(f, 0, 180))})`,
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'}}>
          <Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: lerp(0, 40, shift), marginTop: -150}}>
          <div style={{transform: `scale(${lerp(1.25, 1, shift)})`, filter: 'drop-shadow(0 0 40px rgba(95,194,142,0.3))'}}><Mark size={160} draw={draw} fill={t01(f, 0, 14)} /></div>
          <div style={{width: lerp(0, 660, shift), overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <Kin text="Hivelet" at={46} size={160} stagger={0} ls="-0.055em" color="#fff" />
          </div>
        </div>
        <div style={{fontFamily: jakarta, fontSize: 34, color: C.onNight, marginTop: 40, textAlign: 'center', lineHeight: 1.4, opacity: t01(f, 60, 80), transform: `translateY(${(1 - t01(f, 60, 84)) * 18}px)`}}>
          One connected system for the<br /><b>Fe Galang Da Silva Boarding House.</b>
        </div>
        <div style={{fontFamily: jakarta, fontWeight: 600, fontSize: 30, color: C.glow, marginTop: 30, opacity: t01(f, 76, 94)}}>hivelet.vercel.app</div>
        <div style={{position: 'absolute', bottom: 96, left: 0, right: 0, textAlign: 'center', opacity: team, transform: `translateY(${(1 - team) * 20}px)`}}>
          <div style={{fontFamily: jakarta, fontSize: 24, color: C.onNightSoft}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
          <div style={{display: 'flex', justifyContent: 'center', gap: 56, marginTop: 18, fontFamily: sora, fontWeight: 600, fontSize: 32, color: '#fff', letterSpacing: '-0.02em'}}>
            {['Loyd', 'Sean', 'Eljohn', 'Vince', 'Kiel'].map((n, i) => <span key={n} style={{opacity: t01(f, 100 + i * 4, 114 + i * 4)}}>{n}</span>)}
          </div>
        </div>
      </AbsoluteFill>
      <Sfx at={44} name="shimmer" vol={0.35} />
    </AbsoluteFill>
  );
};
