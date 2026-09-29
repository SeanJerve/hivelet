// Scenes 10 to 12: the activity trail, the proof, and who made it.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, jakarta, sora} from '../theme';
import {camera, count, easeIn, flyIn, lerp, pop, t01} from '../anim';
import {Bg, FloorShadow, Head, Kin, Stage} from '../fx';
import {Mark, Tile} from '../ui/Kit';
import {ActivityRow} from '../ui/Admin';
import {Slam} from './Open';
import {RightStage, Wash} from './Owner';
import {Sfx, Ticks} from '../Sfx';

const TRAIL: [string, string, string, string][] = [
  ['Payment recorded', 'Sep 29, 2026, 09:12:00 AM', 'monthly income records', '7c2e41a9-5b3d-4f08-9e61-2a4d8c0b7f15'],
  ['Ticket update', 'Sep 28, 2026, 03:12:00 PM', 'maintenance tickets', 'b81f06d2-3c47-4a95-8e2b-6d19f4a07c33'],
  ['Expense recorded', 'Sep 27, 2026, 11:12:00 AM', 'expense entries', '3e9a7d5c-12f8-4b6e-a0d4-95c21e8b4f67'],
  ['Payment verified', 'Sep 26, 2026, 04:12:00 PM', 'payments', 'd4b62c18-7e05-4f3a-b9c1-0a8e37d5f219'],
  ['Inquiry status changed', 'Sep 26, 2026, 02:12:00 PM', 'inquiries', '5a0e93f7-c6b2-4d18-8f45-e17b2d9c6a04'],
  ['Unit edited', 'Sep 24, 2026, 10:12:00 AM', 'rooms', '9f1c84e2-0d6a-47b5-a3e8-c52f0b7d1e96'],
];

// 10. Every change on record; then the app on a phone's home screen.
export const Trust: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f, [
    {at: 0, x: 527, y: 300, s: 0.98, rx: 38, rz: -12},
    {at: 30, x: 527, y: 400, s: 0.92, rx: 30, rz: -8, dur: 70},
  ]);
  const no = pop(f, 44, {damping: 11, stiffness: 200});
  const partA = 1 - t01(f, 100, 110, easeIn);
  const drop = pop(f, 112, {damping: 10, stiffness: 150});
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={66} />
      <div style={{position: 'absolute', inset: 0, opacity: partA}}>
        <RightStage shift={380}>
          <Stage cam={cam} w={1054} h={900}>
            {TRAIL.map(([tag, when, on, id], i) => (
              <div key={id} style={{position: 'absolute', left: 0, top: i * 132, ...flyIn(f, 4 + i * 7, {y: -120, z: 0, rx: -20})}}>
                <ActivityRow tag={tag} when={when} on={on} id={id} style={{borderRadius: 20, border: `1px solid ${C.line}`, boxShadow: '0 16px 40px rgba(15,27,21,0.06)'}} />
              </div>
            ))}
          </Stage>
        </RightStage>
        <Wash />
        <div style={{position: 'absolute', right: 120, top: 150, transform: `scale(${1.5 * lerp(0.6, 1, pop(f, 36, {damping: 16, stiffness: 150}))}) rotate(${(1 - pop(f, 36)) * -8}deg)`, transformOrigin: '100% 0',
          opacity: t01(f, 36, 42), boxShadow: '0 50px 100px rgba(15,27,21,0.22)', borderRadius: 24}}>
          <Tile tone="soft" title="Can entries be changed?" w={300} h={250}>
            <div style={{fontSize: 44, fontWeight: 600, color: C.brand, transform: `scale(${lerp(2.4, 1, no)})`, transformOrigin: 'left center', opacity: t01(f, 44, 47)}}>No</div>
            <div style={{fontSize: 15, lineHeight: '22px', color: C.inkSoft}}>Nobody can edit or delete an entry, not even the app itself.</div>
          </Tile>
        </div>
        <Head kicker="For the landlady · Activity" text={'Every change,\non record.'} accent={['record.']} width={700}
          sub="Every payment, correction and repair, with who did it and when. Nothing can be edited or removed." at={8} out={96} />
      </div>
      {f >= 108 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <FloorShadow x={960} y={620} w={300} lift={1 - drop} />
          <div style={{marginTop: -160, transform: `translateY(${(1 - drop) * -700}px) rotate(${(1 - drop) * -20}deg)`, filter: `drop-shadow(0 ${30 * drop}px ${50 * drop}px rgba(15,27,21,0.22))`}}>
            <Mark size={250} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 690}}>
            <Kin text="Installs on a phone, like an app." at={122} size={84} align="center" accent={['phone,']} />
          </div>
        </AbsoluteFill>
      ) : null}
      <Sfx at={2} name="whoosh-low" vol={0.4} />
      {TRAIL.map((_, i) => <Sfx key={i} at={4 + i * 7} name="tick" vol={0.35} />)}
      <Sfx at={36} name="whoosh" vol={0.3} />
      <Sfx at={44} name="pop" vol={0.45} />
      <Sfx at={100} name="swipe" vol={0.4} />
      <Sfx at={118} name="pop" vol={0.45} />
      <Sfx at={122} name="bling" vol={0.45} />
    </AbsoluteFill>
  );
};

// 11. The proof, on the brand colour.
export const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const stats: [number, string, string, number][] = [
    [937, 'income records', 'from her workbook', 24], [1327, 'expense records', 'carried over', 34], [33, 'units', '32 occupied', 44],
  ];
  const pill = pop(f, 70, {damping: 16, stiffness: 160});
  return (
    <AbsoluteFill>
      <Bg mood="green" hex />
      <div style={{position: 'absolute', left: 0, right: 0, top: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, opacity: t01(f, 2, 14)}}>
        <span style={{width: 9, height: 9, borderRadius: 5, background: C.amber}} />
        <span style={{fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace', fontSize: 24, color: 'rgba(255,255,255,0.75)'}}>Her real records, moved in and checked</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center'}}>
        {stats.map(([n, label, sub, at], i) => (
          <div key={label} style={{width: 540, textAlign: 'center', borderLeft: i ? `1px solid rgba(255,255,255,${0.25 * t01(f, at, at + 10)})` : 'none'}}>
            <Slam at={at}>
              <div style={{fontFamily: sora, fontWeight: 800, fontSize: 176, letterSpacing: '-0.06em', color: '#fff', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums'}}>
                {count(f, at, 40, n).toLocaleString('en-US')}
              </div>
              <div style={{fontFamily: jakarta, fontWeight: 600, fontSize: 34, color: '#fff', marginTop: 26}}>{label}</div>
              <div style={{fontFamily: jakarta, fontSize: 26, color: 'rgba(255,255,255,0.65)', marginTop: 6}}>{sub}</div>
            </Slam>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 800, display: 'flex', justifyContent: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '16px 28px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          fontFamily: jakarta, fontSize: 26, color: '#fff', opacity: Math.min(1, pill * 2), transform: `translateY(${(1 - pill) * 30}px) scale(${lerp(0.8, 1, pill)})`}}>
          <span style={{width: 30, height: 30, borderRadius: 15, background: C.glow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.night, fontWeight: 800, fontSize: 18}}>✓</span>
          20 automated check suites, all passing
        </div>
      </div>
      <Sfx at={0} name="whoosh" vol={0.35} />
      {stats.map(([, , , at]) => <Sfx key={at} at={at} name="pop" vol={0.4} />)}
      <Ticks at={26} dur={50} vol={0.18} />
      <Sfx at={70} name="chime" vol={0.45} />
    </AbsoluteFill>
  );
};

// 12. The name, the address, the team.
export const End: React.FC = () => {
  const f = useCurrentFrame();
  const draw = t01(f, 4, 34);
  const shift = t01(f, 30, 50);
  const team = t01(f, 62, 80);
  const photo = t01(f, 0, 30);
  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={50} glowY={42} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', width: 760, height: 760, opacity: 0.22 * photo, transform: `scale(${lerp(0.9, 1.05, t01(f, 0, 150))})`,
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', top: 90}}>
          <Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: lerp(0, 40, shift), marginTop: -120}}>
          <div style={{transform: `scale(${lerp(1.3, 1, shift)})`, filter: 'drop-shadow(0 0 40px rgba(95,194,142,0.35))'}}><Mark size={170} draw={draw} fill={t01(f, 0, 10)} /></div>
          <div style={{width: lerp(0, 700, shift), overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <Kin text="Hivelet" at={34} size={170} stagger={0} ls="-0.055em" color="#fff" />
          </div>
        </div>
        <div style={{fontFamily: jakarta, fontSize: 36, color: C.onNight, marginTop: 40, textAlign: 'center', lineHeight: 1.35, opacity: t01(f, 44, 58), transform: `translateY(${(1 - t01(f, 44, 62)) * 20}px)`}}>
          One connected system for the<br /><b>Fe Galang Da Silva Boarding House.</b>
        </div>
        <div style={{fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace', fontSize: 30, color: C.glow, marginTop: 34, opacity: t01(f, 54, 66)}}>hivelet.vercel.app</div>
        <div style={{position: 'absolute', bottom: 90, left: 0, right: 0, textAlign: 'center', opacity: team, transform: `translateY(${(1 - team) * 24}px)`}}>
          <div style={{fontFamily: jakarta, fontSize: 24, color: C.onNightSoft}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
          <div style={{display: 'flex', justifyContent: 'center', gap: 56, marginTop: 18, fontFamily: sora, fontWeight: 600, fontSize: 32, color: '#fff', letterSpacing: '-0.02em'}}>
            {['Loyd', 'Sean', 'Eljohn', 'Vince', 'Kiel'].map((n, i) => <span key={n} style={{opacity: t01(f, 66 + i * 3, 76 + i * 3)}}>{n}</span>)}
          </div>
        </div>
      </AbsoluteFill>
      <Sfx at={0} name="whoosh-low" vol={0.4} />
      <Sfx at={34} name="bling" vol={0.45} />
      <Sfx at={62} name="pop" vol={0.25} />
    </AbsoluteFill>
  );
};
