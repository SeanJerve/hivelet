// Version E: "one". Full frame, 1920x1080, 42 s, 60 fps: the reference's screen language
// without the room, so every line is crisp. One green dot carries the whole piece: it is
// the landlady among 33 doors; the four places her business lived in pull away from it;
// "Hivelet makes it one" and the dot floods the frame; it comes back as the full stop of
// each "one ..."; and at the end it draws the mark.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame, random} from 'remotion';
import {Mark} from '../ui/Kit';
import {LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, ReceivedTile, RepairCard, SplitTile} from '../ui/Admin';
import {PaymentReceived, TenantHome} from '../ui/Tenant';
import {UnitShowcase} from '../ui/Public';
import {Big, C, Caption, clamp01, Draw, E, ellipse, FONT, lerp, sec, Serif, spr, t01} from '../screen/kit';
import vo from './vo.json';
import voAt from './vo-at.json';

export const ONE_TOTAL = 42 * 60;
type Line = keyof typeof vo;
const AT = voAt as Record<Line, number>, LEN = vo as Record<Line, number>;
const S = (t: number) => sec(t);
const WORD = {landlady: AT.doors + 1.22, usb: AT.four + 0.85, book: AT.four + 2.05, chat: AT.four + 2.84, none: AT.none + 1.08, one: AT.is + 1.0,
  gcash: AT.phone + 1.73, noAccount: AT.page + 1.93, aPlus: AT.secure + 0.82, rated: AT.quality + 0.69, connected: AT.close + 0.96, forThe: AT.close + 2.51};
const CAP = {x: 96, y: 960, size: 30, width: 1500};
const Cap: React.FC<{k: Line; dark?: boolean; accent?: string[]}> = ({k, dark, accent}) => <Caption text={SCRIPT[k]} at={S(AT[k])} dur={LEN[k] - 0.1} dark={dark} accent={accent} {...CAP} />;
const SCRIPT: Record<Line, string> = {
  doors: 'Thirty-three doors. One landlady.', four: 'A spreadsheet. A USB drive. A paper book. A chat.', none: 'Four places, and none of them talk to each other.', is: 'Hivelet makes it one.',
  ledger: 'One ledger, in her own layout.', phone: 'One phone for every tenant, with GCash.', board: 'One board for every repair.', page: 'One page for every visitor. No account needed.',
  records: 'Nine hundred thirty-seven records, moved in.', secure: 'Security, A-plus.', quality: 'Quality, four point five three out of five.', close: 'Hivelet. One connected system, for the Fe Galang Da Silva Boarding House.',
};
const Tag: React.FC<{n: string; t: string; dark?: boolean}> = ({n, t, dark}) => (
  <div style={{position: 'absolute', left: 96, top: 74, fontFamily: FONT.mono, fontSize: 22, letterSpacing: '0.04em', color: dark ? 'rgba(233,232,227,0.55)' : 'rgba(20,20,20,0.5)'}}>{n} <span style={{opacity: 0.6}}>/</span> {t}</div>
);
const Dot: React.FC<{x: number; y: number; r?: number; at?: number}> = ({x, y, r = 22, at = 0}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, {damping: 12, stiffness: 240});
  return <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: C.green, transform: `scale(${f < at ? 0 : Math.min(1.1, p)})`}} />;
};

// ---- 33 doors, one landlady ------------------------------------------------------------------------
const Doors: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.doors), L = S(WORD.landlady);
  const dim = t01(f, L, L + 16);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="01" t={f < L ? '33 doors' : '1 landlady'} />
      {Array.from({length: 33}, (_, i) => {
        const c = i % 11, r = Math.floor(i / 11), at = a + 2 + (c + r * 3) * 1.2;
        if (f < at) return null;
        const p = spr(f, at, {damping: 16, stiffness: 260});
        return <div key={i} style={{position: 'absolute', left: 430 + c * 98, top: 250 + r * 170, width: 58, height: 120, borderRadius: '29px 29px 4px 4px', border: `4px solid ${C.ink}`,
          opacity: Math.min(1, p * 2) * lerp(1, 0.16, dim), transform: `translateY(${(1 - Math.min(1, p)) * 24}px)`}} />;
      })}
      <Dot x={430 + 5 * 98 + 29} y={250 + 170 + 60} r={26} at={L} />
      <Cap k="doors" accent={['One', 'landlady.']} />
    </AbsoluteFill>
  );
};

// ---- four places, none of them talk -------------------------------------------------------------------
const PLACES = [
  {x: 520, y: 330, label: 'spreadsheet', d: 'M 420 260 L 620 260 L 620 400 L 420 400 Z M 420 300 L 620 300 M 420 340 L 620 340 M 487 260 L 487 400 M 553 260 L 553 400'},
  {x: 1400, y: 330, label: 'one USB drive', d: 'M 1300 290 L 1470 290 Q 1490 290 1490 310 L 1490 350 Q 1490 370 1470 370 L 1300 370 Q 1280 370 1280 350 L 1280 310 Q 1280 290 1300 290 Z M 1490 305 L 1540 305 L 1540 355 L 1490 355'},
  {x: 520, y: 720, label: 'paper book', d: 'M 430 640 L 610 640 L 610 800 L 430 800 Z M 455 680 L 585 680 M 455 715 L 585 715 M 455 750 L 540 750'},
  {x: 1400, y: 720, label: 'chat', d: 'M 1300 650 L 1500 650 Q 1520 650 1520 670 L 1520 750 Q 1520 770 1500 770 L 1350 770 L 1310 800 L 1315 770 Q 1290 770 1290 750 L 1290 670 Q 1290 650 1310 650 Z'},
];
const Four: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.four);
  const at = [a, S(WORD.usb), S(WORD.book), S(WORD.chat)];
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="02" t="where it all lived" />
      {PLACES.map((p, i) => (
        <React.Fragment key={p.label}>
          <Draw d={p.d} at={at[i]} dur={0.4} width={5} size={[1920, 1080]} />
          <div style={{position: 'absolute', left: p.x - 200, width: 400, top: p.y + 105, textAlign: 'center', fontFamily: FONT.mono, fontSize: 26, color: C.ink, opacity: t01(f, at[i] + 10, at[i] + 20)}}>{p.label}</div>
        </React.Fragment>
      ))}
      <Cap k="four" accent={[]} />
    </AbsoluteFill>
  );
};
const None: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.none), N = S(WORD.none);
  const pairs = [[0, 1], [1, 3], [3, 2], [2, 0], [0, 3]];
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="03" t="none of them talk" />
      {PLACES.map((p) => <svg key={p.label} width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: lerp(1, 0.35, t01(f, N + 40, N + 60))}}><path d={p.d} fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" /></svg>)}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {pairs.map(([u, v], k) => {
          const A = PLACES[u], B = PLACES[v];
          const t = t01(f, N + k * 5, N + k * 5 + 14, E.out);
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          const stop = 0.42;
          return (
            <g key={k}>
              <line x1={A.x} y1={A.y} x2={lerp(A.x, mx, Math.min(1, t / stop) * 0.86)} y2={lerp(A.y, my, Math.min(1, t / stop) * 0.86)} stroke={C.ink} strokeWidth={3} strokeDasharray="10 12" />
              {t > stop ? <path d={`M ${mx - 16} ${my - 16} L ${mx + 16} ${my + 16} M ${mx + 16} ${my - 16} L ${mx - 16} ${my + 16}`} stroke="#d0402f" strokeWidth={6} strokeLinecap="round" opacity={t01(t, stop, stop + 0.2)} /> : null}
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center'}}><Serif text="none of them talk." at={N + 46} size={150} color={C.ink} /></div>
      <Cap k="none" accent={['none']} />
    </AbsoluteFill>
  );
};

// ---- Hivelet makes it one: the dot floods the frame -----------------------------------------------------
const Is: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.is), O = S(WORD.one);
  const gather = t01(f, a, O - 6, E.inOut);
  const flood = t01(f, O - 4, O + 16, E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      {PLACES.map((p) => <svg key={p.label} width={1920} height={1080} style={{position: 'absolute', inset: 0, transformOrigin: `${p.x}px ${p.y}px`, transform: `translate(${(960 - p.x) * gather}px, ${(540 - p.y) * gather}px) scale(${1 - gather * 0.9})`, opacity: 0.35 * (1 - gather)}}><path d={p.d} fill="none" stroke={C.ink} strokeWidth={5} /></svg>)}
      <div style={{position: 'absolute', left: 960 - 22 - 1200 * flood, top: 540 - 22 - 1200 * flood, width: 44 + 2400 * flood, height: 44 + 2400 * flood, borderRadius: '50%', background: C.green, transform: `scale(${gather > 0.05 ? 1 : 0})`}} />
      {flood > 0.6 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 50}}>
          <Mark size={280} draw={t01(f, O + 8, O + 44, E.inOut)} fill={0} hex={C.green} />
          <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 250, letterSpacing: '-0.06em', color: C.white, opacity: t01(f, O + 20, O + 36)}}>Hivelet</div>
        </AbsoluteFill>
      ) : null}
      <Cap k="is" dark={flood > 0.5} accent={['one.']} />
    </AbsoluteFill>
  );
};

// ---- one ... (the word "one" set huge, its o the green dot) ----------------------------------------------
const OneWord: React.FC<{at: number; what: string; dark?: boolean}> = ({at, what, dark}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, {damping: 20, stiffness: 200});
  return (
    <div style={{position: 'absolute', left: 96, top: 210, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 30}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', fontFamily: FONT.grot, fontWeight: 800, fontSize: 200, letterSpacing: '-0.06em', lineHeight: 0.85, color: dark ? C.white : C.ink}}>
        <span style={{display: 'inline-block', width: 116, height: 116, borderRadius: 58, background: C.green, marginRight: 8, marginTop: 30}} />ne
      </div>
      <div style={{fontFamily: FONT.grot, fontWeight: 700, fontSize: 76, letterSpacing: '-0.04em', color: dark ? C.white : C.ink, marginTop: 10}}>{what}</div>
    </div>
  );
};
const ROWS: LedgerRowData[] = [
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
  {unit: '2c', paid: 'Sep 18, 2026', period: 'Sep 20 – Oct 19', who: 'Trisha Delos Santos', or: '5077', rent: 4500, water: 400, heads: 2},
];
const Float: React.FC<{at: number; x: number; y: number; children: React.ReactNode; scale?: number; ry?: number}> = ({at, x, y, children, scale = 1, ry = -10}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, {damping: 20, stiffness: 120});
  return (
    <div style={{position: 'absolute', left: x, top: y, perspective: 2000}}>
      <div style={{transform: `translateY(${(1 - p) * 120}px) rotateY(${ry + (1 - p) * -20}deg) rotateX(4deg) scale(${scale})`, transformOrigin: '0 0', opacity: Math.min(1, p * 2), filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.16))'}}>{children}</div>
    </div>
  );
};
const Ledger: React.FC = () => {
  const a = S(AT.ledger);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="04" t="her ledger" />
      <OneWord at={a} what="ledger." />
      <Float at={a + 6} x={760} y={150}>
        <div style={{width: 1100, padding: 22, borderRadius: 26, background: '#edf1ee', transform: 'scale(0.95)', transformOrigin: '0 0'}}>
          <div style={{display: 'flex', gap: 16}}><ReceivedTile f={999} at={0} w={340} h={300} /><SplitTile f={999} at={0} w={714} h={300} /></div>
          <div style={{marginTop: 16, borderRadius: 24, background: '#fff', overflow: 'hidden'}}><LedgerCardHead f={999} at={0} /><div style={{margin: '0 20px 20px', border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}><LedgerHead />{ROWS.map((r) => <LedgerRow key={r.or} r={r} />)}</div></div>
        </div>
      </Float>
      <Cap k="ledger" accent={['own', 'layout.']} />
    </AbsoluteFill>
  );
};
const Phones: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.phone), G = S(WORD.gcash);
  const toast = spr(f, G, {damping: 16, stiffness: 160});
  return (
    <AbsoluteFill style={{background: C.char}}>
      <Tag n="05" t="every tenant" dark />
      <OneWord at={a} what="phone for every tenant." dark />
      {[-2, -1, 1, 2].map((k) => <div key={k} style={{position: 'absolute', left: 1240 + k * 150 - 90, top: 300, width: 180, height: 380, borderRadius: 30, border: '3px solid rgba(233,232,227,0.25)', opacity: t01(f, a + 10 + Math.abs(k) * 4, a + 22 + Math.abs(k) * 4)}} />)}
      <Float at={a + 4} x={1060} y={130} ry={0}>
        <div style={{width: 390, height: 844, borderRadius: 50, overflow: 'hidden', boxShadow: '0 0 0 10px #0d0d0e', transform: 'scale(0.84)', transformOrigin: '0 0', position: 'relative', background: '#edf1ee'}}>
          <div style={{position: 'absolute', inset: 0, top: 40}}><TenantHome amount="₱4,700.00" unread={2} /></div>
          {f >= G ? <div style={{position: 'absolute', left: 16, top: 220, transform: `translateY(${(1 - toast) * 40}px)`, opacity: Math.min(1, toast * 2)}}><PaymentReceived check={t01(f, G + 6, G + 40)} /></div> : null}
        </div>
      </Float>
      <Cap k="phone" dark accent={['GCash.']} />
    </AbsoluteFill>
  );
};
const Board: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.board);
  const m = t01(f, a + 20, a + 90, E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="06" t="every repair" />
      <OneWord at={a} what="board for every repair." />
      {['to dispatch', 'in progress', 'done'].map((t, i) => <div key={t} style={{position: 'absolute', left: 900 + i * 320, top: 200, width: 290, fontFamily: FONT.mono, fontSize: 24, color: C.inkSoft, borderBottom: `3px solid ${i === 2 && m > 0.98 ? C.green : 'rgba(20,20,20,0.15)'}`, paddingBottom: 12}}>{t}</div>)}
      <div style={{position: 'absolute', left: lerp(900, 1540, m), top: 270, transform: `scale(1.0) rotate(${Math.sin(m * Math.PI) * 4}deg)`, filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.12))'}}>
        <RepairCard title="Kitchen faucet keeps dripping" unit="1A" category="Plumbing" reported="Sep 29, 2026" tech={m > 0.5 ? 'Plumber' : 'Unassigned'} prio="Medium" />
      </div>
      <Cap k="board" accent={['repair.']} />
    </AbsoluteFill>
  );
};
const Page: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.page), NA = S(WORD.noAccount);
  const strike = t01(f, NA + 8, NA + 22, E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="07" t="every visitor" />
      <OneWord at={a} what="page for every visitor." />
      <Float at={a + 4} x={940} y={170} scale={0.86}><UnitShowcase plan={1} chip={1} ring={0} /></Float>
      {f >= NA ? (
        <div style={{position: 'absolute', left: 96, top: 640, fontFamily: FONT.grot, fontWeight: 800, fontSize: 96, letterSpacing: '-0.05em', color: C.ink}}>
          <span style={{position: 'relative'}}>account<svg width={420} height={80} style={{position: 'absolute', left: -10, top: 30, overflow: 'visible'}}><path d="M 0 30 L 400 20" stroke={C.green} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - strike} /></svg></span>
          <span style={{fontFamily: FONT.mono, fontWeight: 600, fontSize: 32, letterSpacing: 0, color: C.green, marginLeft: 26, opacity: t01(f, NA + 20, NA + 30)}}>not needed</span>
        </div>
      ) : null}
      <Cap k="page" accent={['No', 'account']} />
    </AbsoluteFill>
  );
};

// ---- the proof -----------------------------------------------------------------------------------------
const Records: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.records);
  const n = Math.round(937 * t01(f, a + 4, a + 100, E.out));
  return (
    <AbsoluteFill style={{background: C.blue}}>
      <Tag n="08" t="her records" dark />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>{Array.from({length: n}, (_, i) => <circle key={i} cx={110 + (i % 52) * 21} cy={220 + Math.floor(i / 52) * 34} r={6} fill="rgba(255,255,255,0.85)" />)}</svg>
      <div style={{position: 'absolute', right: 100, top: 330, textAlign: 'right'}}>
        <div style={{fontFamily: FONT.grot, fontWeight: 800, fontSize: 320, letterSpacing: '-0.06em', color: C.white, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums'}}>{n}</div>
        <div style={{fontFamily: FONT.mono, fontSize: 30, color: 'rgba(255,255,255,0.85)', marginTop: 16}}>moved in from her workbook</div>
      </div>
      <Cap k="records" dark />
    </AbsoluteFill>
  );
};
const Secure: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.secure), A = S(WORD.aPlus);
  const shield = 'M 960 200 L 1180 280 L 1180 520 Q 1180 720 960 820 Q 740 720 740 520 L 740 280 Z';
  const hit = f >= A ? spr(f, A, {damping: 9, stiffness: 280}) : 0;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Tag n="09" t="security" />
      <Draw d={shield} at={a} dur={0.7} width={7} size={[1920, 1080]} fill={C.green} fillAt={A} />
      {hit > 0 ? <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontFamily: FONT.grot, fontWeight: 800, fontSize: 200, letterSpacing: '-0.05em', color: C.white, transform: `scale(${lerp(1.5, 1, Math.min(1, hit))})`, opacity: Math.min(1, hit * 2)}}>A+</div> : null}
      <div style={{position: 'absolute', left: 1260, top: 380, fontFamily: FONT.mono, fontSize: 24, lineHeight: 2, color: C.inkSoft, opacity: t01(f, A + 10, A + 24)}}>Qualys SSL Labs  A+<br />Mozilla Observatory  A+<br />securityheaders.com  A+</div>
      <Cap k="secure" accent={['A-plus.']} />
    </AbsoluteFill>
  );
};
const Quality: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.quality), R = S(WORD.rated);
  const p = t01(f, R, R + sec(1.3), E.out);
  const v = 1 + 3.53 * (1 - Math.pow(1 - p, 3));
  return (
    <AbsoluteFill style={{background: C.charDeep}}>
      <Tag n="10" t="quality · ISO/IEC 25010" dark />
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 380, lineHeight: 0.9, color: C.white, fontVariantNumeric: 'tabular-nums', opacity: t01(f, a, a + 10)}}>{v.toFixed(2)}</div>
      <div style={{position: 'absolute', left: 560, right: 560, top: 680, height: 8, borderRadius: 4, background: 'rgba(233,232,227,0.15)'}}><div style={{width: `${((v - 1) / 4) * 100}%`, height: '100%', borderRadius: 4, background: C.green}} /></div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 720, textAlign: 'center', fontFamily: FONT.mono, fontSize: 30, color: 'rgba(233,232,227,0.8)', opacity: t01(f, R + 70, R + 84)}}>out of 5 · <span style={{color: '#5fd39a'}}>Very High Quality</span></div>
      <Cap k="quality" dark accent={['five.']} />
    </AbsoluteFill>
  );
};

// ---- one connected system -----------------------------------------------------------------------------------
const Close: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.close);
  const url = 'hivelet.vercel.app';
  const typed = Math.round(clamp01((f - S(37.2)) / 50) * url.length);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{opacity: 1 - t01(f, a + 6, a + 14)}}><Dot x={960} y={300} r={30} at={a - 6} /></div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36, opacity: t01(f, a + 6, a + 16)}}>
        <Mark size={190} draw={t01(f, a + 4, a + 40, E.inOut)} fill={t01(f, a + 24, a + 36)} hex={C.green} />
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 190, letterSpacing: '-0.06em', color: C.ink}}>Hivelet</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', fontFamily: FONT.grot, fontWeight: 700, fontSize: 64, letterSpacing: '-0.035em', color: C.ink, opacity: t01(f, S(WORD.connected), S(WORD.connected) + 12)}}>
        One <span style={{color: C.green}}>connected</span> system
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: FONT.mono, fontSize: 30, color: C.inkSoft, opacity: t01(f, S(WORD.forThe), S(WORD.forThe) + 12)}}>for the Fe Galang Da Silva Boarding House</div>
      <div style={{position: 'absolute', left: 660, top: 650, width: 600, height: 88, borderRadius: 44, background: C.white, boxShadow: '0 0 0 2px rgba(20,20,20,0.1)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px', boxSizing: 'border-box', opacity: t01(f, S(37.0), S(37.2))}}>
        <div style={{width: 44, height: 44, borderRadius: 22, background: C.green}} />
        <div style={{flex: 1, fontFamily: FONT.mono, fontWeight: 600, fontSize: 30, color: C.ink}}>{url.slice(0, typed)}<span style={{display: 'inline-block', width: 15, height: 32, background: C.green, marginLeft: 2, verticalAlign: '-0.18em', opacity: typed < url.length || Math.floor(f / 24) % 2 ? 1 : 0}} /></div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: C.inkSoft, opacity: t01(f, S(38.4), S(38.8))}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 846, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 600, fontSize: 30, color: C.ink, opacity: t01(f, S(39.0), S(39.4))}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
      <Caption text={SCRIPT.close} at={S(AT.close)} dur={LEN.close - 0.1} accent={['connected']} out={S(37.0)} {...CAP} />
    </AbsoluteFill>
  );
};

const SC: {from: number; el: React.FC}[] = [
  {from: 0, el: Doors}, {from: AT.four - 0.1, el: Four}, {from: AT.none - 0.1, el: None}, {from: AT.is - 0.1, el: Is}, {from: AT.ledger - 0.15, el: Ledger}, {from: AT.phone - 0.1, el: Phones},
  {from: AT.board - 0.1, el: Board}, {from: AT.page - 0.1, el: Page}, {from: AT.records - 0.15, el: Records}, {from: AT.secure - 0.1, el: Secure}, {from: AT.quality - 0.1, el: Quality}, {from: AT.close - 0.2, el: Close},
];
const files = new Set(getStaticFiles().map((x) => x.name));
export const One: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const El = [...SC].reverse().find((x) => s >= x.from)!.el;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <El />
      {/* a whisper of grain, as on a screen filmed */}
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('paper/tex/grain.png')})`, backgroundSize: '300px', backgroundPosition: `${(f * 137) % 300}px ${(f * 251) % 300}px`, mixBlendMode: 'multiply', opacity: 0.25}} />
      <AbsoluteFill style={{background: '#000', opacity: t01(f, ONE_TOTAL - 36, ONE_TOTAL - 2)}} />
      {(Object.keys(AT) as Line[]).map((k) => (
        <Sequence key={k} from={Math.round(AT[k] * 60)} durationInFrames={Math.round(LEN[k] * 60) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`one/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {files.has('one/score.wav') ? <Audio src={staticFile('one/score.wav')} volume={1} /> : null}
    </AbsoluteFill>
  );
};
export {random, ellipse, Big};
