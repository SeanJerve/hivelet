// The proof, and who made it.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, jakarta, sora} from '../theme';
import {count, lerp, pop, t01, useFrame} from '../anim';
import {Bg, Kin} from '../fx';
import {Mark} from '../ui/Kit';
import {Cues} from '../Sfx';

// The study's own results, each counting up as it lands (Chapter 4: Table 11E for the tests,
// Section 4.4.3 and Table 4-17 for the ratings). The ratings are the second round's, on the
// redesigned system: 4.84 from its users (the landlady, 10 tenants and 3 prospective tenants)
// and 4.90 from three IT evaluators, each on its own, never averaged. The one test that failed
// was fixed and passed when re-tested (Table 23A).
export const PROOF = {stats: [24, 38, 52, 66], count: 50};
export const Proof: React.FC = () => {
  const f = useFrame();
  const rating = (at: number, to: number) => (count(f, at, PROOF.count, to) / 100).toFixed(2);
  const [a0, a1, a2, a3] = PROOF.stats;
  const stats: {at: number; big: React.ReactNode; label: string; sub: React.ReactNode}[] = [
    {at: a0, big: count(f, a0, PROOF.count, 937).toLocaleString('en-US'), label: 'income records', sub: 'carried over from her workbook'},
    {at: a1, big: <>{count(f, a1, PROOF.count, 82)}<span style={{fontSize: 80, opacity: 0.62, letterSpacing: '-0.04em'}}>/83</span></>, label: 'tests passed',
      sub: <>98.8%, none of them critical.<br />The one failure was fixed and<br />passed when re-tested.</>},
    {at: a2, big: rating(a2, 484), label: 'rated by its users', sub: <>the landlady, 10 tenants and<br />3 prospective tenants</>},
    {at: a3, big: rating(a3, 490), label: 'rated by IT evaluators', sub: 'three of them, on the live system'},
  ];
  const foot = t01(f, a3 + PROOF.count - 6, a3 + PROOF.count + 14);
  return (
    <AbsoluteFill>
      <Bg mood="green" hex />
      <div style={{position: 'absolute', left: 0, right: 0, top: 150}}>
        <Kin text="Real records. Real results." at={4} size={76} color="#fff" align="center" accent={['results.']} accentColor={C.amber} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 360, display: 'flex', justifyContent: 'center'}}>
        {stats.map(({at, big, label, sub}, i) => {
          const p = pop(f, at, {damping: 20, stiffness: 90});
          return (
            <div key={label} style={{width: 456, textAlign: 'center', borderLeft: i ? `1px solid rgba(255,255,255,${0.22 * t01(f, at, at + 16)})` : 'none',
              opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 40}px)`}}>
              <div style={{fontFamily: sora, fontWeight: 800, fontSize: 146, letterSpacing: '-0.06em', color: '#fff', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums'}}>
                {big}
              </div>
              <div style={{fontFamily: jakarta, fontWeight: 600, fontSize: 31, color: '#fff', marginTop: 26}}>{label}</div>
              <div style={{fontFamily: jakarta, fontSize: 23, lineHeight: 1.4, color: 'rgba(255,255,255,0.72)', marginTop: 8}}>{sub}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', fontFamily: jakarta, fontSize: 27, color: 'rgba(255,255,255,0.86)', opacity: foot, transform: `translateY(${(1 - foot) * 14}px)`}}>
        Both ratings out of 5: <b style={{color: C.amber, fontWeight: 700}}>Very High Quality</b> on ISO/IEC 25010.
      </div>
      <Cues scene="proof" />
    </AbsoluteFill>
  );
};

export const End: React.FC = () => {
  const f = useFrame();
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
            {['Lloyd', 'Sean', 'Eljohn', 'Vince', 'Kiel'].map((n, i) => <span key={n} style={{opacity: t01(f, 100 + i * 4, 114 + i * 4)}}>{n}</span>)}
          </div>
        </div>
      </AbsoluteFill>
      <Cues scene="end" />
    </AbsoluteFill>
  );
};
