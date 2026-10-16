// Version B: vertical (1080x1920), 46 s, 60 fps, after the same reference as the screen
// pitch but built differently: on what Hivelet replaces. "Not a spreadsheet. Not one USB
// drive. Not a paper invoice book. And no. Not a chat. It's Hivelet." Each "not" is the
// word set huge and struck out by hand; the name floods the room green; the proof is three
// full screens of colour (her building's blue, its coral awning, Hivelet's green) that turn
// the whole room with them. A different voice (af_bella) and a coral accent.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Mark} from '../ui/Kit';
import {LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, ReceivedTile, RepairCard, SplitTile} from '../ui/Admin';
import {PaymentReceived, Phone, TenantHome} from '../ui/Tenant';
import {UnitShowcase} from '../ui/Public';
import {Room, Camera, Glow} from '../screen/Room';
import {Big, C, Caption, clamp01, Draw, E, ellipse, FONT, Label, lerp, sec, Serif, spr, t01} from '../screen/kit';
import vo from './vo.json';
import voAt from './vo-at.json';

export const VW = 1080, VH = 1920, V_TOTAL = 46 * 60;
type Line = keyof typeof vo;
const AT = voAt as Record<Line, number>, LEN = vo as Record<Line, number>;
const CORAL = '#e5674f';
const OFF = 44.6;
const WORD = {hivelet: AT.its + 0.28, units: AT.forher + 3.05, landlady: AT.forher + 4.17, noAccount: AT.visitors + 1.15, aPlus: AT.aplus + 0.8, rated: AT.quality + 0.83, screen: AT.close + 1.76};

// A word set huge, then struck out by hand.
const Not: React.FC<{word: string; at: number; size?: number; draw?: React.ReactNode; dark?: boolean}> = ({word, at, size = 230, draw, dark}) => {
  const f = useCurrentFrame();
  const strike = t01(f, at + sec(0.55), at + sec(0.8), E.inOut);
  return (
    <AbsoluteFill style={{background: dark ? C.char : C.paper}}>
      {draw}
      <div style={{position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'relative'}}>
          <Big text={word} at={at} size={size} color={dark ? C.white : C.ink} />
          <svg width={1200} height={300} style={{position: 'absolute', left: -60, top: -40, overflow: 'visible'}}>
            <path d={`M 20 ${size * 0.62} C 300 ${size * 0.52}, 700 ${size * 0.66}, ${word.length * size * 0.52 + 60} ${size * 0.5}`} fill="none" stroke={CORAL} strokeWidth={22} strokeLinecap="round"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - strike} />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ROWS: LedgerRowData[] = [
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
  {unit: '2c', paid: 'Sep 18, 2026', period: 'Sep 20 – Oct 19', who: 'Trisha Delos Santos', or: '5077', rent: 4500, water: 400, heads: 2},
];

type Scene = {from: number; to: number; bg: string; el: React.FC};
const S = (k: Line) => sec(AT[k]);

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('hook');
  const ring = t01(f, a, a + 30, E.inOut), dot = t01(f, a + 30, a + 40, E.out), word = t01(f, a + 44, a + 60, E.out), frame = t01(f, a + sec(2.6), a + sec(3.1), E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="00" text="what if" />
      <svg width={1600} height={1000} style={{position: 'absolute', inset: 0}}>
        <circle cx={800} cy={470} r={70} fill={dot > 0 ? CORAL : 'none'} fillOpacity={dot} stroke={C.ink} strokeWidth={5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform="rotate(-90 800 470)" />
        <rect x={lerp(800, 250, frame)} y={lerp(470, 250, frame)} width={lerp(0, 1100, frame)} height={lerp(0, 440, frame)} rx={14} fill="none" stroke={C.ink} strokeWidth={5} opacity={frame > 0 ? 1 : 0} />
      </svg>
      {word > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 380, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: FONT.grot, fontWeight: 800, fontSize: 210, letterSpacing: '-0.055em', color: C.ink, opacity: word}}>
          <span style={{transform: `translateX(${(1 - word) * 40}px)`}}>h</span><span style={{width: 150}} /><span style={{transform: `translateX(${(1 - word) * -40}px)`}}>use</span>
        </div>
      ) : null}
      <Caption text="What if I told you a whole boarding house could live on one screen?" at={a} dur={LEN.hook - 0.1} accent={['one', 'screen']} color={CORAL} width={1450} />
    </AbsoluteFill>
  );
};
const NotSheet: React.FC = () => {
  const a = S('sheet');
  return <><Not word="spreadsheet" at={a} size={210} draw={<div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(20,20,20,0.08) 2px, transparent 2px), linear-gradient(90deg, rgba(20,20,20,0.08) 2px, transparent 2px)', backgroundSize: '160px 60px'}} />} />
    <Caption text="Not a spreadsheet." at={a} dur={LEN.sheet} color={CORAL} /></>;
};
const NotUsb: React.FC = () => {
  const a = S('usb');
  return <><Not word="USB drive" at={a} draw={<Draw d="M 640 190 L 900 190 Q 920 190 920 210 L 920 270 Q 920 290 900 290 L 640 290 Q 620 290 620 270 L 620 210 Q 620 190 640 190 Z M 920 212 L 990 212 L 990 268 L 920 268" at={a} dur={0.4} width={6} />} />
    <Caption text="Not one USB drive." at={a} dur={LEN.usb} color={CORAL} /></>;
};
const NotBook: React.FC = () => {
  const a = S('book');
  return <><Not word="paper book" at={a} draw={<Draw d="M 620 130 L 980 130 L 980 330 L 620 330 Z M 660 190 L 900 190 M 660 240 L 940 240 M 660 285 L 820 285" at={a} dur={0.45} width={6} />} />
    <Caption text="Not a paper invoice book." at={a} dur={LEN.book} color={CORAL} /></>;
};
const NotChat: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('chat');
  const strike = t01(f, a + sec(1.1), a + sec(1.35), E.inOut);
  return (
    <AbsoluteFill style={{background: C.charDeep, alignItems: 'center', justifyContent: 'center'}}>
      <Serif text="No." at={a} size={340} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 690, textAlign: 'center', fontFamily: FONT.mono, fontSize: 40, color: '#e9e8e3', opacity: t01(f, a + sec(0.75), a + sec(0.9))}}>
        <span style={{position: 'relative'}}>not a chat<svg width={260} height={60} style={{position: 'absolute', left: -10, top: 10, overflow: 'visible'}}><path d="M 0 22 L 250 18" stroke={CORAL} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - strike} /></svg></span>
      </div>
      <Caption text="And no. Not a chat." at={a} dur={LEN.chat} dark color={CORAL} />
    </AbsoluteFill>
  );
};
const Its: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('its'), HV = sec(WORD.hivelet);
  const flood = t01(f, HV - 6, HV + 12, E.inOut);
  return (
    <AbsoluteFill style={{background: C.charDeep}}>
      <div style={{position: 'absolute', left: 800 - 1100 * flood - 12, top: 500 - 1100 * flood - 12, width: 24 + 2200 * flood, height: 24 + 2200 * flood, borderRadius: '50%', background: C.green, opacity: f >= a + 4 ? 1 : 0}} />
      {flood > 0.6 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 44}}>
          <Mark size={250} draw={t01(f, HV + 4, HV + 36, E.inOut)} fill={0} hex={C.green} />
          <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 220, letterSpacing: '-0.06em', color: C.white, opacity: t01(f, HV + 18, HV + 32)}}>Hivelet</div>
        </AbsoluteFill>
      ) : null}
      <Caption text="It's Hivelet." at={a} dur={LEN.its} dark color={C.white} />
    </AbsoluteFill>
  );
};
const ForHer: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('forher'), U = sec(WORD.units), L = sec(WORD.landlady);
  return (
    <AbsoluteFill style={{background: C.char}}>
      <Img src={staticFile('fe-galang-building.webp')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.2) brightness(0.7)', transform: `scale(${lerp(1.05, 1.15, t01(f, a, a + sec(5)))})`}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.55))'}} />
      <Label n="01" text="Legazpi City" dark at={a} />
      <div style={{position: 'absolute', left: 72, top: 520, display: 'flex', gap: 80, alignItems: 'flex-end'}}>
        {f >= U ? <div><Big text="33" at={U} size={240} color={C.white} /><div style={{fontFamily: FONT.mono, fontSize: 28, color: '#e9e8e3', marginTop: 10}}>units</div></div> : null}
        {f >= L ? <div><Big text="1" at={L} size={240} color={CORAL} /><div style={{fontFamily: FONT.mono, fontSize: 28, color: '#e9e8e3', marginTop: 10}}>landlady</div></div> : null}
      </div>
      <Caption text="Made for the Fe Galang Da Silva Boarding House. Thirty-three units, one landlady." at={a} dur={LEN.forher - 0.1} dark color={CORAL} width={1450} />
    </AbsoluteFill>
  );
};
const Ledger: React.FC = () => {
  const a = S('ledger');
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="02" text="ledger" at={a} />
      <div style={{position: 'absolute', left: 200, top: 130, width: 1200, height: 700, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(20,20,20,0.15)', background: '#edf1ee'}}>
        <div style={{transform: 'scale(0.92)', transformOrigin: '0 0', padding: 24}}>
          <div style={{display: 'flex', gap: 16}}><ReceivedTile f={999} at={0} w={360} h={300} /><SplitTile f={999} at={0} w={860} h={300} /></div>
          <div style={{width: 1236, marginTop: 16, borderRadius: 24, background: '#fff', border: '1px solid #e2e8e3', overflow: 'hidden'}}>
            <LedgerCardHead f={999} at={0} /><div style={{margin: '0 20px 20px', border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}><LedgerHead />{ROWS.map((r) => <LedgerRow key={r.or} r={r} />)}</div>
          </div>
        </div>
      </div>
      <Draw d={ellipse(1080, 222, 260, 60, 'vl')} at={a + sec(0.85)} dur={0.4} color={CORAL} width={7} />
      <Caption text="Her ledger, in her own layout." at={a} dur={LEN.ledger - 0.1} accent={['own', 'layout']} color={CORAL} />
    </AbsoluteFill>
  );
};
const Gcash: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('gcash');
  const toast = spr(f, a + sec(0.6), {damping: 16, stiffness: 160});
  return (
    <AbsoluteFill style={{background: C.char}}>
      <Label n="03" text="tenants" dark at={a} />
      <div style={{position: 'absolute', left: 300, top: 40}}><Phone><TenantHome amount="₱4,700.00" unread={2} /></Phone></div>
      <Draw d={ellipse(440, 520, 150, 52, 'vg')} at={a + sec(0.4)} dur={0.3} color={CORAL} width={7} />
      {f >= a + sec(0.6) ? <div style={{position: 'absolute', left: 780, top: 400, transform: `translateX(${(1 - toast) * 80}px) scale(1.4)`, transformOrigin: '0 0', opacity: Math.min(1, toast * 2)}}><PaymentReceived check={t01(f, a + sec(0.7), a + sec(1.2))} /></div> : null}
      <Caption text="Rent, paid with GCash." at={a} dur={LEN.gcash - 0.1} dark accent={['GCash']} color={CORAL} />
    </AbsoluteFill>
  );
};
const Repairs: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('repairs');
  const m = t01(f, a + sec(0.3), a + sec(1.1), E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="04" text="repairs" at={a} />
      {['to dispatch', 'in progress', 'done'].map((t, i) => <div key={t} style={{position: 'absolute', left: 150 + i * 470, top: 150, width: 420, fontFamily: FONT.mono, fontSize: 26, color: C.inkSoft, borderBottom: '2px solid rgba(20,20,20,0.15)', paddingBottom: 14}}>{t}</div>)}
      <div style={{position: 'absolute', left: lerp(150, 1090, m), top: 240, transform: `scale(1.35) rotate(${Math.sin(m * Math.PI) * 4}deg)`, transformOrigin: '0 0', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.12))'}}>
        <RepairCard title="Kitchen faucet keeps dripping" unit="1A" category="Plumbing" reported="Sep 29, 2026" tech={m > 0.5 ? 'Plumber' : 'Unassigned'} prio="Medium" />
      </div>
      <Caption text="Repairs, tracked to done." at={a} dur={LEN.repairs - 0.1} accent={['done']} color={CORAL} />
    </AbsoluteFill>
  );
};
const Visitors: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('visitors'), NA = sec(WORD.noAccount);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="05" text="visitors" at={a} />
      <div style={{position: 'absolute', left: 110, top: 150, transform: 'scale(0.92)', transformOrigin: '0 0', borderRadius: 24, overflow: 'hidden', boxShadow: '0 0 0 2px rgba(20,20,20,0.12)'}}><UnitShowcase plan={1} chip={1} ring={1} /></div>
      <div style={{position: 'absolute', left: 1040, top: 380, fontFamily: FONT.grot, fontWeight: 800, fontSize: 92, lineHeight: 0.95, letterSpacing: '-0.045em', color: CORAL, opacity: t01(f, NA, NA + 12), transform: `translateY(${(1 - t01(f, NA, NA + 18, E.out)) * 30}px)`}}>no<br />account<br />needed.</div>
      <Caption text="Visitors ask. No account needed." at={a} dur={LEN.visitors - 0.1} accent={['No', 'account']} color={CORAL} />
    </AbsoluteFill>
  );
};
// The proof: three full screens of colour, one figure each.
const Full: React.FC<{k: Line; bg: string; big: string; sub: string; caption: string; at?: number}> = ({k, bg, big, sub, caption, at}) => {
  const f = useCurrentFrame();
  const a = S(k), t = at ?? a;
  return (
    <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center'}}>
      <Big text={big} at={t} size={460} color={C.white} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 740, textAlign: 'center', fontFamily: FONT.mono, fontSize: 30, color: 'rgba(255,255,255,0.85)', opacity: t01(f, t + 10, t + 22)}}>{sub}</div>
      <Caption text={caption} at={a} dur={LEN[k] - 0.1} dark color={C.white} />
    </AbsoluteFill>
  );
};
const Records: React.FC = () => <Full k="records" bg={C.blue} big="937" sub="real records, from her workbook" caption="Nine hundred thirty-seven real records." />;
const APlus: React.FC = () => <Full k="aplus" bg={CORAL} big="A+" sub="Qualys · Mozilla Observatory · securityheaders.com" caption="Security: A-plus." at={sec(WORD.aPlus)} />;
const Quality: React.FC = () => <Full k="quality" bg={C.greenDeep} big="4.53" sub="out of 5 · Very High Quality · ISO/IEC 25010" caption="Quality: four point five three, out of five." at={sec(WORD.rated)} />;
const Close: React.FC = () => {
  const f = useCurrentFrame();
  const a = S('close'), O = sec(WORD.screen);
  const url = 'hivelet.vercel.app';
  const typed = Math.round(clamp01((f - (O + 40)) / 46) * url.length);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 240, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34, opacity: t01(f, a, a + 12)}}>
        <Mark size={170} draw={t01(f, a, a + 36, E.inOut)} fill={t01(f, a + 18, a + 30)} hex={C.green} />
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 170, letterSpacing: '-0.06em', color: C.ink}}>Hivelet</div>
      </div>
      <div style={{position: 'absolute', left: 500, top: 530, width: 600, height: 92, borderRadius: 46, background: C.white, boxShadow: '0 0 0 2px rgba(20,20,20,0.1)', display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', boxSizing: 'border-box', opacity: t01(f, O + 20, O + 34)}}>
        <div style={{width: 48, height: 48, borderRadius: 24, background: C.ink}} />
        <div style={{flex: 1, fontFamily: FONT.mono, fontWeight: 600, fontSize: 32, color: C.ink}}>{url.slice(0, typed)}<span style={{display: 'inline-block', width: 16, height: 34, background: CORAL, marginLeft: 2, verticalAlign: '-0.18em', opacity: typed < url.length || Math.floor(f / 24) % 2 ? 1 : 0}} /></div>
        <div style={{width: 48, height: 48, borderRadius: 24, border: `3px solid ${CORAL}`, color: CORAL, fontFamily: FONT.grot, fontWeight: 800, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>↑</div>
      </div>
      <Draw d={ellipse(800, 576, 360, 82, 'vpill')} at={O + 96} dur={0.5} color={CORAL} width={5} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: C.inkSoft, opacity: t01(f, sec(41.5), sec(41.9))}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 806, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 600, fontSize: 28, color: C.ink, opacity: t01(f, sec(42.2), sec(42.6))}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
      <Caption text="Hivelet. One boarding house. One screen." at={a} dur={LEN.close - 0.1} accent={['One', 'screen.']} color={CORAL} out={sec(41.2)} />
    </AbsoluteFill>
  );
};

const SC: Scene[] = [
  {from: 0, to: AT.sheet - 0.1, bg: C.paper, el: Hook},
  {from: AT.sheet - 0.1, to: AT.usb - 0.1, bg: C.paper, el: NotSheet},
  {from: AT.usb - 0.1, to: AT.book - 0.1, bg: C.paper, el: NotUsb},
  {from: AT.book - 0.1, to: AT.chat - 0.1, bg: C.paper, el: NotBook},
  {from: AT.chat - 0.1, to: AT.its - 0.1, bg: C.charDeep, el: NotChat},
  {from: AT.its - 0.1, to: AT.forher - 0.15, bg: C.green, el: Its},
  {from: AT.forher - 0.15, to: AT.ledger - 0.15, bg: '#3a3a3a', el: ForHer},
  {from: AT.ledger - 0.15, to: AT.gcash - 0.1, bg: C.paper, el: Ledger},
  {from: AT.gcash - 0.1, to: AT.repairs - 0.1, bg: C.char, el: Gcash},
  {from: AT.repairs - 0.1, to: AT.visitors - 0.1, bg: C.paper, el: Repairs},
  {from: AT.visitors - 0.1, to: AT.records - 0.1, bg: C.paper, el: Visitors},
  {from: AT.records - 0.1, to: AT.aplus - 0.1, bg: C.blue, el: Records},
  {from: AT.aplus - 0.1, to: AT.quality - 0.1, bg: CORAL, el: APlus},
  {from: AT.quality - 0.1, to: AT.close - 0.2, bg: C.greenDeep, el: Quality},
  {from: AT.close - 0.2, to: 99, bg: C.paper, el: Close},
];
const at = (s: number) => SC.find((x) => s >= x.from && s < x.to) ?? SC[SC.length - 1];
const VScreen: React.FC = () => {
  const f = useCurrentFrame();
  const El = at(f / 60).el;
  const on = t01(f, sec(0.2), sec(0.55), E.out) * (1 - t01(f, sec(OFF), sec(OFF + 0.45), E.in));
  return <AbsoluteFill style={{background: '#000'}}><AbsoluteFill style={{opacity: on}}><El /></AbsoluteFill></AbsoluteFill>;
};

// The camera: closer than the landscape cut, and it moves more: a slow orbit from the
// left to straight on as the name arrives, a push for the proof, a pull back at the end.
const K: [number, number, number, number, number, number][] = [
  [0, 250, 240, -1150, 4, 34],
  [12.0, 200, 250, -980, 4, 24],
  [14.0, 160, 255, -940, 4.5, 16],
  [28.6, 110, 260, -900, 5, 12],
  [36.5, 90, 255, -800, 5, 10],
  [46, 100, 240, -1150, 4, 18],
];
const camAt = (s: number): Camera => {
  let i = 0;
  while (i < K.length - 2 && s >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  const p = E.inOut(clamp01((s - a[0]) / (b[0] - a[0])));
  const v = a.map((x, k) => lerp(x, b[k], p));
  const h = (fr: number, ph: number) => Math.sin(s * fr + ph) * 0.6 + Math.sin(s * fr * 2.3 + ph * 1.7) * 0.4;
  return {x: v[1] + h(0.7, 1) * 4, y: v[2] + h(0.5, 2) * 4, z: v[3], tilt: v[4] + h(0.4, 3) * 0.12, yaw: v[5] + h(0.35, 4) * 0.25, roll: h(0.3, 5) * 0.12};
};
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const files = new Set(getStaticFiles().map((x) => x.name));

export const Vertical: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const color = rgb(at(s).bg);
  const on = t01(f, sec(0.2), sec(0.55), E.out) * (1 - t01(f, sec(OFF), sec(OFF + 0.45), E.in));
  const lum = (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255;
  const glow: Glow = {color, level: (0.3 + 0.95 * lum) * on};
  return (
    <>
      <Room cam={camAt(s)} glow={glow} screen={<VScreen />} mirrorScreen={<VScreen />} w={VW} h={VH} />
      {(Object.keys(AT) as Line[]).map((k) => (
        <Sequence key={k} from={Math.round(AT[k] * 60)} durationInFrames={Math.round(LEN[k] * 60) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`vertical/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {files.has('vertical/score.wav') ? <Audio src={staticFile('vertical/score.wav')} volume={1} /> : null}
    </>
  );
};
export {Draw, FONT};
