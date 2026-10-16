// Version D: the tenant's side. Vertical (1080x1920), 39 s, 60 fps. A phone on a stand in a
// dark room fills the frame: a visitor finds a vacant unit near Bicol University, asks with
// no account, hears back; moves in, sees the rent, pays with GCash; reports a repair and
// watches it get done. Only then does the camera pull back to show what is behind it: her
// laptop, waking, and the name on both screens. The captions are typed in the dark above
// the phone, not on a screen. A British voice (bf_emma).
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Mark} from '../ui/Kit';
import {LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, OverviewHead, ReceivedTile, SplitTile} from '../ui/Admin';
import {DoneNote, PaymentReceived, PayOpening, RepairForm, TenantHome} from '../ui/Tenant';
import {AskDialog, InquiryThread, PlanImage} from '../ui/Public';
import {Room, Camera, Glow} from '../screen/Room';
import {C, clamp01, E, FONT, lerp, sec, spr, t01} from '../screen/kit';
import vo from './vo.json';
import voAt from './vo-at.json';

export const TW = 1080, TH = 1920, T_TOTAL = 39 * 60;
type Line = keyof typeof vo;
const AT = voAt as Record<Line, number>, LEN = vo as Record<Line, number>;
const SCRIPT: Record<Line, string> = {
  find: 'Looking for a room near Bicol University?', vacant: 'The Fe Galang Da Silva Boarding House shows you a vacant unit, floor plan and all.', ask: 'Ask about it. No account needed.',
  answer: 'And she answers you, right there.', movein: 'Move in, and your rent lives on your phone.', gcash: 'Pay with GCash, whenever you want.', repair: 'Something breaks? Report it.',
  done: 'And watch it get done.', behind: 'Behind every screen is one connected system, for one landlady.', name: 'Hivelet.',
};
const ACCENT: Record<Line, string[]> = {find: ['room'], vacant: ['floor', 'plan'], ask: ['No', 'account'], answer: ['right', 'there.'], movein: ['phone.'], gcash: ['GCash,'], repair: ['Report'], done: ['done.'], behind: ['one', 'connected'], name: []};
const OFF = 37.4;
const S = (t: number) => sec(t);
const ink = '#121212';

// ---- the phone's screens (390 x 844) ----------------------------------------------------------------
const Find: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#f6f5f1', fontFamily: FONT.ui, color: ink}}>
      <div style={{height: 54, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', fontFamily: FONT.brand, fontWeight: 800, fontSize: 20}}><Mark size={26} hex={C.green} />Hivelet</div>
      <div style={{margin: '6px 16px 0', height: 300, borderRadius: 22, overflow: 'hidden'}}><Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '45% 45%', transform: `scale(${lerp(1.12, 1.0, t01(f, S(AT.find), S(AT.find) + 140))})`}} /></div>
      <div style={{padding: '20px 20px 0'}}>
        <div style={{fontSize: 12, letterSpacing: '0.16em', color: '#6b6a66'}}>LEGAZPI CITY · NEAR BICOL UNIVERSITY</div>
        <div style={{fontFamily: FONT.brand, fontWeight: 600, fontSize: 30, lineHeight: 1.08, letterSpacing: '-0.03em', marginTop: 10}}>Fe Galang Da Silva Boarding House</div>
        <div style={{marginTop: 22, display: 'inline-flex', gap: 8, alignItems: 'center', padding: '12px 18px', borderRadius: 999, background: C.greenDeep, color: '#fff', fontSize: 15, fontWeight: 600}}>See vacant units →</div>
      </div>
    </AbsoluteFill>
  );
};
const Vacant: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.vacant), plan = t01(f, S(AT.vacant + 1.0), S(AT.vacant + 2.4), E.inOut);
  return (
    <AbsoluteFill style={{background: '#f6f5f1', fontFamily: FONT.ui, color: ink, padding: '24px 18px', boxSizing: 'border-box'}}>
      <span style={{background: C.greenDeep, color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', padding: '8px 14px', borderRadius: 4}}>VACANT</span>
      <div style={{fontSize: 12, letterSpacing: '0.16em', color: '#6b6a66', marginTop: 22}}>3RD FLOOR, BACK APARTMENT</div>
      <div style={{fontFamily: FONT.brand, fontSize: 46, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 6}}>Unit B3B</div>
      <div style={{fontFamily: FONT.brand, fontSize: 26, fontWeight: 500, marginTop: 6}}>₱8,500 <span style={{fontSize: 15, color: '#6b6a66', fontFamily: FONT.ui}}>a month</span></div>
      <div style={{marginTop: 22, background: '#fff', borderRadius: 20, padding: 10, opacity: t01(f, a + 10, a + 24)}}><PlanImage width={334} plan={plan} chip={t01(f, S(AT.vacant + 3.3), S(AT.vacant + 3.7))} ring={t01(f, S(AT.vacant + 3.5), S(AT.vacant + 4.3))} /></div>
      <div style={{marginTop: 18, padding: '14px 18px', borderRadius: 999, background: C.greenDeep, color: '#fff', fontSize: 15, fontWeight: 600, textAlign: 'center'}}>Ask about unit B3B ↗</div>
    </AbsoluteFill>
  );
};
const Ask: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.ask), q = 'Is unit B3B still available? Can we view it on Saturday?';
  const n = Math.round(clamp01((f - a - 6) / 110) * q.length), sent = a + 126;
  return (
    <AbsoluteFill style={{background: 'rgba(16,23,19,0.55)'}}>
      <div style={{position: 'absolute', left: 10, top: 120, transform: 'scale(0.578)', transformOrigin: '0 0'}}>
        <AskDialog name="Kaye Ordoñez" phone="0918 555 0142" email="kaye.ordonez@email.com" question={q.slice(0, n)} focus={f < sent ? 'question' : null} press={f >= sent - 6 && f < sent + 2 ? 1 : 0} saved={t01(f, sent, sent + 30)} />
      </div>
    </AbsoluteFill>
  );
};
const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.answer);
  return (
    <AbsoluteFill style={{background: '#edf1ee'}}>
      <div style={{position: 'absolute', left: 11, top: 70, transform: 'scale(0.5)', transformOrigin: '0 0'}}>
        <InquiryThread question="Is unit B3B still available? Can we view it on Saturday?" replyText="Yes, it is. You can view it on Saturday at 10 am." reply={t01(f, a + 20, a + 40)} back="" backFocus={false} backText="" sent={0} />
      </div>
    </AbsoluteFill>
  );
};
const Home: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const G = S(AT.gcash + 0.45), R = S(AT.repair), D = S(AT.done + 0.55);
  if (s >= AT.repair - 0.1 && s < AT.done - 0.1) {
    const title = 'Kitchen faucet keeps dripping';
    const n = Math.round(clamp01((f - R - 6) / 60) * title.length);
    return <AbsoluteFill style={{background: '#edf1ee', paddingTop: 44}}><RepairForm title={title.slice(0, n)} details={n >= title.length ? 'Under the sink, since this morning.' : ''} focus={n < title.length ? 'title' : 'details'} press={f >= R + 90 && f < R + 98 ? 1 : 0} /></AbsoluteFill>;
  }
  return (
    <AbsoluteFill style={{background: '#edf1ee'}}>
      <div style={{position: 'absolute', inset: 0, top: 44}}><TenantHome amount="₱4,700.00" unread={s > AT.done ? 3 : 2} press={t01(f, G - 8, G - 2) * (1 - t01(f, G - 2, G + 4))} /></div>
      {s >= AT.gcash && f >= G && f < G + 36 ? <div style={{position: 'absolute', left: 16, top: 260}}><PayOpening spin={(f - G) / 40} /></div> : null}
      {s >= AT.gcash && s < AT.repair && f >= G + 36 ? <div style={{position: 'absolute', left: 16, top: 220, transform: `translateY(${(1 - spr(f, G + 36)) * 40}px)`}}><PaymentReceived check={t01(f, G + 40, G + 70)} /></div> : null}
      {s >= AT.done && f >= D ? <div style={{position: 'absolute', left: 0, right: 0, top: 70, transform: `translateY(${(1 - spr(f, D, {damping: 15, stiffness: 160})) * -140}px)`}}><DoneNote /></div> : null}
    </AbsoluteFill>
  );
};
const Splash: React.FC = () => (
  <AbsoluteFill style={{background: C.green, alignItems: 'center', justifyContent: 'center'}}>
    <div style={{width: 150, height: 150, borderRadius: 36, background: '#0f1b15', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Mark size={120} /></div>
    <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 52, color: '#fff', marginTop: 24, letterSpacing: '-0.04em'}}>Hivelet</div>
  </AbsoluteFill>
);
const PHONE: {from: number; bg: string; el: React.FC}[] = [
  {from: 0, bg: '#f6f5f1', el: Find}, {from: AT.vacant - 0.1, bg: '#f6f5f1', el: Vacant}, {from: AT.ask - 0.1, bg: '#7b827e', el: Ask}, {from: AT.answer - 0.1, bg: '#edf1ee', el: Answer},
  {from: AT.movein - 0.1, bg: '#edf1ee', el: Home}, {from: AT.name - 0.05, bg: C.green, el: Splash},
];
const phoneAt = (s: number) => [...PHONE].reverse().find((x) => s >= x.from) ?? PHONE[0];
const PhoneScreen: React.FC = () => {
  const f = useCurrentFrame();
  const El = phoneAt(f / 60).el;
  const on = t01(f, S(0.15), S(0.45)) * (1 - t01(f, S(OFF), S(OFF + 0.4)));
  return <AbsoluteFill style={{background: '#000'}}><AbsoluteFill style={{opacity: on}}><El /></AbsoluteFill></AbsoluteFill>;
};

// ---- her laptop, behind it all ---------------------------------------------------------------------
const ROWS: LedgerRowData[] = [
  {unit: '1a', paid: 'Sep 29, 2026', period: 'Oct 5 – Nov 4', who: 'Andrea Villanueva', or: 'GCash', rent: 4500, water: 200, heads: 1},
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
];
const LaptopScreen: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const wake = t01(f, S(AT.behind + 0.3), S(AT.behind + 0.8)) * (1 - t01(f, S(OFF + 0.3), S(OFF + 0.7)));
  const name = s >= AT.name - 0.05;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: wake}}>
        {name ? (
          <AbsoluteFill style={{background: '#ebeae5', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 34}}><Mark size={170} hex={C.green} /><div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 170, letterSpacing: '-0.06em', color: ink}}>Hivelet</div></div>
            <div style={{fontFamily: FONT.grot, fontWeight: 700, fontSize: 56, letterSpacing: '-0.03em', color: ink, marginTop: 30}}>One <span style={{color: C.green}}>connected</span> system</div>
            <div style={{fontFamily: FONT.mono, fontSize: 26, color: '#6b6a66', marginTop: 70, opacity: t01(f, S(33.2), S(33.6))}}>hivelet.vercel.app · Group 4 · Bicol University · IT 124 Capstone Project 2</div>
            <div style={{fontFamily: FONT.mono, fontWeight: 600, fontSize: 30, color: ink, marginTop: 16, opacity: t01(f, S(34.0), S(34.4))}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
          </AbsoluteFill>
        ) : (
          <AbsoluteFill style={{background: '#edf1ee', padding: 40, boxSizing: 'border-box'}}>
            <div style={{transform: 'scale(1.38)', transformOrigin: '0 0'}}><OverviewHead f={999} at={0} /></div>
            <div style={{transform: 'scale(0.95)', transformOrigin: '0 0', marginTop: 40}}>
              <div style={{display: 'flex', gap: 16}}><ReceivedTile f={999} at={0} w={380} h={300} /><SplitTile f={999} at={0} w={1180} h={300} /></div>
              <div style={{width: 1576, marginTop: 16, borderRadius: 24, background: '#fff', border: '1px solid #e2e8e3', overflow: 'hidden'}}>
                <LedgerCardHead f={999} at={0} /><div style={{margin: '0 20px 20px', border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}><LedgerHead />{ROWS.map((r) => <LedgerRow key={r.or} r={r} />)}</div>
              </div>
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- the phone in the room ----------------------------------------------------------------------------
const PX = 330, PZ = 900;
const Phone3D: React.FC = () => (
  <div style={{position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `translate3d(${PX}px, 0, ${PZ}px) rotateY(-12deg)`}}>
    <div style={{position: 'absolute', left: -120, top: -230, width: 240, height: 230, transformOrigin: '50% 100%', transform: 'translateZ(-90px) rotateX(-12deg)', background: '#1b1c1f', borderRadius: 14}} />
    <div style={{position: 'absolute', left: -150, top: -24, width: 300, height: 24, transform: 'translateZ(40px)', background: '#202124', borderRadius: 6}} />
    <div style={{position: 'absolute', left: -190, top: -800, width: 380, height: 780, transformOrigin: '50% 100%', transform: 'translateZ(30px) rotateX(14deg)', borderRadius: 56, background: '#0c0c0d', boxShadow: 'inset 0 0 0 3px #26272b'}}>
      <div style={{position: 'absolute', left: 16, top: 16, width: 348, height: 748, borderRadius: 44, overflow: 'hidden', background: '#000'}}>
        <div style={{width: 390, height: 844, transform: `scale(${348 / 390}, ${748 / 844})`, transformOrigin: '0 0', position: 'relative'}}><PhoneScreen /></div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%)'}} />
      </div>
      <div style={{position: 'absolute', left: 150, top: 28, width: 80, height: 22, borderRadius: 11, background: '#050505'}} />
    </div>
  </div>
);

// ---- the camera: close on the phone, then pulling back to show the laptop behind it -----------------------
const K: [number, number, number, number, number, number][] = [
  [0, -330, 420, 260, 3, 6],
  [25.6, -330, 410, 300, 3, 4],
  [29.4, -170, 330, -1120, 4.5, 12],
  [39, -160, 320, -1220, 4.5, 14],
];
const camAt = (s: number): Camera => {
  let i = 0;
  while (i < K.length - 2 && s >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  const p = E.inOut(clamp01((s - a[0]) / (b[0] - a[0])));
  const v = a.map((x, k) => lerp(x, b[k], p));
  const h = (fr: number, ph: number) => Math.sin(s * fr + ph) * 0.6 + Math.sin(s * fr * 2.3 + ph * 1.7) * 0.4;
  return {x: v[1] + h(0.7, 1) * 5, y: v[2] + h(0.5, 2) * 5, z: v[3], tilt: v[4] + h(0.4, 3) * 0.15, yaw: v[5] + h(0.35, 4) * 0.3, roll: h(0.3, 5) * 0.15};
};

// ---- the captions, typed in the dark above the phone --------------------------------------------------------
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const k = (Object.keys(AT) as Line[]).filter((x) => s >= AT[x] - 0.05).pop();
  if (!k || s > OFF) return null;
  const text = SCRIPT[k], n = Math.round(clamp01((f - S(AT[k])) / S(LEN[k] - 0.1)) * text.length);
  const typing = n < text.length;
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: 210, fontFamily: FONT.mono, fontWeight: 500, fontSize: 46, lineHeight: 1.4, color: '#ecebe6', letterSpacing: '-0.01em'}}>
      {text.slice(0, n).split(/(\s+)/).map((w, i) => <span key={i} style={{color: ACCENT[k].includes(w.replace(/[.,?]/g, '')) || ACCENT[k].includes(w) ? '#36c784' : undefined}}>{w}</span>)}
      <span style={{display: 'inline-block', width: 26, height: 50, marginLeft: 4, verticalAlign: '-0.2em', background: '#36c784', opacity: typing || Math.floor(f / 24) % 2 === 0 ? 1 : 0}} />
    </div>
  );
};

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const lumOf = (c: [number, number, number]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const files = new Set(getStaticFiles().map((x) => x.name));

export const TenantPitch: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const pc = rgb(phoneAt(s).bg);
  const pOn = t01(f, S(0.15), S(0.45)) * (1 - t01(f, S(OFF), S(OFF + 0.4)));
  const lOn = t01(f, S(AT.behind + 0.3), S(AT.behind + 0.8)) * (1 - t01(f, S(OFF + 0.3), S(OFF + 0.7)));
  const lc: [number, number, number] = s >= AT.name - 0.05 ? [235, 234, 229] : [237, 241, 238];
  const glow: Glow = {color: lc, level: (0.25 + 0.95 * lumOf(lc)) * lOn};
  return (
    <>
      <Room cam={camAt(s)} glow={glow} screen={<LaptopScreen />} mirrorScreen={<LaptopScreen />} w={TW} h={TH}
        extra={() => <Phone3D />} extraGlow={{at: [PX, -420, PZ], glow: {color: pc, level: (0.45 + 0.6 * lumOf(pc)) * pOn}}} />
      <Captions />
      {(Object.keys(AT) as Line[]).map((k) => (
        <Sequence key={k} from={Math.round(AT[k] * 60)} durationInFrames={Math.round(LEN[k] * 60) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`tenant/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {files.has('tenant/score.wav') ? <Audio src={staticFile('tenant/score.wav')} volume={1} /> : null}
    </>
  );
};
