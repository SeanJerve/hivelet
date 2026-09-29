// Act 1, one continuous camera move through a dark space.
//   0       Her spreadsheet, typed into by hand. "33 units." "One spreadsheet."
//   B[0]    The sheet shrinks into her workbook file, which slides into a drive.
//   B[1..5] The other problems, each in its own place: receipts nobody checks,
//           rows left incomplete, repairs in a chat, tenants asking what they owe,
//           inquiries arriving from everywhere.
//   CON     Pull back: all six on a ring around "Nothing connected."; the links
//           between neighbours reach for each other and break.
//   HIVE    Each problem bends into a hexagon carrying its icon and flies into a
//           hive; the centre cell grows into the Hivelet icon.
// Facts: Chapter 4 and 5 (two sheets on removable storage, receipt numbers used
// twice, 402 of 937 rows incomplete, requests by message or in person). How
// prospects asked before the system (social media, text, walk-in) is from Sean;
// the manuscript does not state it yet (see SCENES.md).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CircleHelp, FileSpreadsheet, Footprints, Inbox, MessageCircle, ReceiptText, Table2} from 'lucide-react';
import {C, jakarta, sora} from '../theme';
import {camera, easeIn, easeInOut, easeOut, gentle, lerp, pop, t01} from '../anim';
import {Bg, Head, Kin, Stage} from '../fx';
import {Mark} from '../ui/Kit';
import {Cues} from '../Sfx';
import {doneOf, typedOf} from '../typing.mjs';
import tl from '../timeline.json';

const B = tl.act1.beats;
const CONNECTED = tl.act1.connected;
const HIVE = tl.act1.hive;
const BRAAM = tl.act1.braam;
const hand = "'Segoe Print', 'Comic Sans MS', cursive";
const mono = 'ui-monospace, Consolas, monospace';

// The pulled-back view: the camera centred on CENTER at SCALE_BACK, and the six
// problems on an ellipse around the middle of the screen (EL, in screen pixels),
// leaving the middle for "Nothing connected." and then for the hive.
const CENTER = {x: 1800, y: 1000};
const SCALE_BACK = 0.44;
const EL = {rx: 660, ry: 345};
const ORDER = ['usb', 'receipts', 'rows', 'chat', 'ask', 'inquiries'] as const;
type Prop = typeof ORDER[number];
const ANG: Record<Prop, number> = {usb: 180, receipts: 240, rows: 300, chat: 360, ask: 420, inquiries: 480};
const rad = (d: number) => (d * Math.PI) / 180;
const P = Object.fromEntries(ORDER.map((k) => [k, {
  x: CENTER.x + (EL.rx / SCALE_BACK) * Math.cos(rad(ANG[k])), y: CENTER.y + (EL.ry / SCALE_BACK) * Math.sin(rad(ANG[k])),
}])) as Record<Prop, {x: number; y: number}>;
const SIZE: Record<Prop, [number, number]> = {usb: [760, 300], receipts: [760, 420], rows: [800, 560], chat: [700, 460], ask: [640, 260], inquiries: [700, 480]};
const ICON = {usb: FileSpreadsheet, receipts: ReceiptText, rows: Table2, chat: MessageCircle, ask: CircleHelp, inquiries: Inbox};

// The hive, in screen pixels once the camera has pulled back.
const HR = 58;
const axial = (q: number, r: number) => ({x: 960 + HR * Math.sqrt(3) * (q + r / 2), y: 540 + HR * 1.5 * r});
const toWorld = (s: {x: number; y: number}) => ({x: CENTER.x + (s.x - 960) / SCALE_BACK, y: CENTER.y + (s.y - 540) / SCALE_BACK});
// Each problem goes to the ring-one cell on its own side of the centre.
const TARGET: Record<Prop, [number, number]> = {usb: [-1, 0], receipts: [0, -1], rows: [1, -1], chat: [1, 0], ask: [0, 1], inquiries: [-1, 1]};
const RING2 = (() => {
  const out: [number, number][] = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === 2) out.push([q, r]);
  const a = ([q, r]: [number, number]) => { const p = axial(q, r); return Math.atan2(p.y - 540, p.x - 960); };
  return out.sort((m, n) => a(m) - a(n));
})();
const SHADES = [C.brand, '#1f7048', C.brandStrong, '#2a8a5c', C.brandBright, '#236b47'];
const HEX_W = Math.sqrt(3) * (HR / SCALE_BACK) * 0.95, HEX_H = 2 * (HR / SCALE_BACK) * 0.95;

// A rectangle whose corners slide to a pointy-top hexagon as m goes 0 to 1. The
// clip starts `pad` pixels outside the box so the props' shadows are not cut off
// in one frame, and closes in as the shape bends.
const morphClip = (m: number, pad: number) => {
  const y1 = `calc(${25 * m}% - ${pad}px)`, y2 = `calc(${100 - 25 * m}% + ${pad}px)`;
  const L = `${-pad}px`, R = `calc(100% + ${pad}px)`;
  return `polygon(50% ${-pad}px, ${R} ${y1}, ${R} ${y2}, 50% calc(100% + ${pad}px), ${L} ${y2}, ${L} ${y1})`;
};
const HEX_CLIP = morphClip(1, 0);

// ---- The props ------------------------------------------------------------------

const COLS = ['Unit', 'Name', 'Rent for', 'Date paid', 'OR No.', 'Rent', 'Water', 'Garbage', 'Total'];
const WIDTHS = [90, 230, 150, 150, 120, 150, 120, 130, 150];
const NAMES = ['Andrea Villanueva', 'Paolo Dimayuga', 'Kristine Salcedo', 'Mark Lorenzo', 'Bea Magbanua', 'Joshua Ramirez', 'Ella Cordero', 'Carlo Buenaflor', 'Nicole Ong', 'Renzo Abrenica', 'Trisha Delos Santos', 'Miguel Santiago', 'Angela Pascual', 'Jerome Taduran'];
const UNITS = ['1a', '1b', '1c', '1d', '1e', '1f', '1g', '1h', '2a', '2b', '2c', '2d', '2e', '2f'];
const RENT = [4500, 4500, 4800, 4800, 4500, 4500, 4800, 4500, 6000, 4800, 4500, 4800, 4500, 4800];

// Two rents typed into the sheet as plain digits; Enter formats each and moves
// the selection down a row, as a spreadsheet does.
export const SHEET_ENTER = [Math.round(doneOf('sheet1') + 7), Math.round(doneOf('sheet2') + 7)];
const SHEET_ROWS: [number, 'sheet1' | 'sheet2', string][] = [[4, 'sheet1', '4,800.00'], [5, 'sheet2', '4,500.00']];

const Sheet: React.FC<{f: number}> = ({f}) => {
  const sel = f < SHEET_ENTER[0] ? 4 : f < SHEET_ENTER[1] ? 5 : 6;
  const cell = (r: number) => {
    const i = SHEET_ROWS.findIndex(([row]) => row === r);
    if (i < 0) return null;
    const [, key, formatted] = SHEET_ROWS[i];
    const typed = typedOf(key, f);
    return {text: f >= SHEET_ENTER[i] ? formatted : typed, editing: f < SHEET_ENTER[i] && typed.length > 0};
  };
  return (
    <div style={{width: 1500, height: 880, borderRadius: 18, background: '#132119', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', fontFamily: mono, fontSize: 17,
      color: 'rgba(238,245,240,0.62)', boxShadow: '0 80px 160px rgba(0,0,0,0.55)'}}>
      <div style={{display: 'flex', height: 38, background: '#1a2b22', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(238,245,240,0.35)', alignItems: 'center'}}>
        <div style={{width: 50}} />
        {WIDTHS.map((w, i) => <div key={i} style={{width: w, textAlign: 'center'}}>{String.fromCharCode(65 + i)}</div>)}
      </div>
      {Array.from({length: 18}, (_, r) => {
        const header = r === 0;
        const d = r - 1;
        const vals = header ? COLS : [UNITS[d % 14], NAMES[d % 14], `Sep ${(d % 27) + 1}`, `Sep ${(d % 27) + 1}`, `${5070 + d}`, (RENT[d % 14]).toLocaleString('en-US') + '.00', ['200.00', '400.00'][d % 2], '50.00', (RENT[d % 14] + [200, 400][d % 2] + 50).toLocaleString('en-US') + '.00'];
        const typedCell = header ? null : cell(r);
        return (
          <div key={r} style={{display: 'flex', height: 45, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', color: header ? C.glow : undefined, fontWeight: header ? 700 : 400}}>
            <div style={{width: 50, textAlign: 'center', color: 'rgba(238,245,240,0.3)', fontSize: 14}}>{r + 1}</div>
            {vals.map((v, i) => {
              const here = i === 5 && typedCell !== null;
              const selected = !header && i === 5 && r === sel;
              return (
                <div key={i} style={{width: WIDTHS[i], padding: '0 12px', boxSizing: 'border-box', textAlign: i >= 5 ? 'right' : 'left', whiteSpace: 'nowrap', overflow: 'hidden',
                  height: 45, lineHeight: '45px', outline: selected ? `2.5px solid ${C.glow}` : 'none', outlineOffset: -2, background: selected ? 'rgba(95,194,142,0.10)' : 'transparent',
                  color: here ? '#fff' : undefined}}>
                  {here ? (
                    <>{typedCell!.text}{typedCell!.editing ? <span style={{display: 'inline-block', width: 2, height: 20, marginLeft: 2, verticalAlign: -3, background: C.glow}} /> : null}</>
                  ) : v}
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{display: 'flex', gap: 2, padding: '0 50px', height: 40, alignItems: 'flex-end', background: '#1a2b22', fontFamily: jakarta, fontSize: 16}}>
        <span style={{padding: '8px 22px', background: '#132119', color: C.glow, fontWeight: 700, borderRadius: '8px 8px 0 0'}}>Monthly Income</span>
        <span style={{padding: '8px 22px', color: 'rgba(238,245,240,0.5)'}}>Monthly Expenses</span>
      </div>
    </div>
  );
};

// Her workbook as a file: a spreadsheet page with a folded corner and an XLSX
// band. CardFace is its content alone, so the sheet can morph into it.
const XlsxIcon: React.FC<{size?: number}> = ({size = 58}) => (
  <svg width={size * 0.82} height={size} viewBox="0 0 48 58">
    <path d="M4 2 H32 L44 14 V54 a2 2 0 0 1 -2 2 H4 a2 2 0 0 1 -2 -2 V4 a2 2 0 0 1 2 -2 Z" fill="#e8f3ec" />
    <path d="M32 2 V12 a2 2 0 0 0 2 2 H44" fill="#b9d9c5" />
    {[20, 27, 34].map((y) => <rect key={y} x={9} y={y} width={28} height={4} rx={1} fill="#9cc7ad" />)}
    <rect x={0} y={40} width={36} height={13} rx={3} fill="#1d7a4c" />
    <text x={18} y={49.6} textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight={800} fontSize={8.4} fill="#fff" letterSpacing={0.6}>XLSX</text>
  </svg>
);
const CardFace: React.FC = () => (
  <div style={{width: 300, height: 190, padding: 24, boxSizing: 'border-box', fontFamily: jakarta, color: C.onNight}}>
    <XlsxIcon />
    <div style={{fontSize: 20, fontWeight: 700, marginTop: 12}}>Her workbook.xlsx</div>
    <div style={{fontSize: 15, color: C.onNightSoft, marginTop: 4}}>Monthly Income · Monthly Expenses</div>
  </div>
);
const CARD_BOX: React.CSSProperties = {width: 300, height: 190, borderRadius: 22, background: '#1d2d24', border: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box',
  boxShadow: '0 30px 60px rgba(0,0,0,0.45)', overflow: 'hidden'};
const FileCard: React.FC = () => <div style={CARD_BOX}><CardFace /></div>;

const Usb: React.FC<{led: number}> = ({led}) => (
  <div style={{display: 'flex', alignItems: 'center'}}>
    <div style={{width: 84, height: 60, background: 'linear-gradient(180deg, #c9d1cc, #9aa59f)', borderRadius: '8px 0 0 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '0 16px', boxSizing: 'border-box'}}>
      <div style={{height: 8, background: '#6f7a74', borderRadius: 2}} /><div style={{height: 8, background: '#6f7a74', borderRadius: 2}} />
    </div>
    <div style={{width: 300, height: 110, borderRadius: 22, background: 'linear-gradient(180deg, #33453b, #1c2a22)', boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', boxSizing: 'border-box'}}>
      <span style={{fontFamily: jakarta, fontSize: 17, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(238,245,240,0.55)'}}>REMOVABLE</span>
      <span style={{width: 12, height: 12, borderRadius: 6, background: led > 0.5 ? C.amber : '#4a5a51', boxShadow: led > 0.5 ? `0 0 16px ${C.amber}` : 'none'}} />
    </div>
  </div>
);

export const Receipt: React.FC<{no: string; amt: string; unit: string; style?: React.CSSProperties; ring?: number}> = ({no, amt, unit, style, ring = 0}) => (
  <div style={{width: 340, height: 226, borderRadius: 14, background: '#f6f1e4', padding: 26, boxSizing: 'border-box', boxShadow: '0 30px 60px rgba(0,0,0,0.45)', position: 'relative', ...style}}>
    <div style={{fontFamily: jakarta, fontWeight: 700, fontSize: 15, letterSpacing: '0.14em', color: '#7c735f'}}>OFFICIAL RECEIPT</div>
    <div style={{fontFamily: hand, fontSize: 31, color: '#b3261e', marginTop: 10, position: 'relative', display: 'inline-block'}}>
      No. {no}
      {ring > 0 ? (
        <svg width={170} height={74} viewBox="0 0 170 74" style={{position: 'absolute', left: -18, top: -14}}>
          <ellipse cx={85} cy={37} rx={80} ry={32} fill="none" stroke={C.coral} strokeWidth={4} strokeDasharray={520} strokeDashoffset={520 * (1 - ring)} transform="rotate(-4 85 37)" />
        </svg>
      ) : null}
    </div>
    <div style={{fontFamily: hand, fontSize: 24, color: '#27466e', marginTop: 6}}>Unit {unit}</div>
    <div style={{fontFamily: hand, fontSize: 27, color: '#27466e', textAlign: 'right'}}>₱{amt}</div>
  </div>
);

// Her rows, with the anniversary and deposit hatched where nothing was recorded -
// the same hatching the app uses for a missing figure.
const MISSING = [0, 1, 3, 4, 6, 8];
const Rows: React.FC<{f: number; at: number}> = ({f, at}) => {
  const ring = t01(f, at + 30, at + 64, gentle);
  return (
    <div style={{width: 760, borderRadius: 24, background: '#16241c', border: '1px solid rgba(255,255,255,0.08)', padding: '26px 30px', boxSizing: 'border-box', position: 'relative',
      boxShadow: '0 50px 100px rgba(0,0,0,0.5)', fontFamily: jakarta, color: C.onNight}}>
      <div style={{display: 'flex', fontSize: 15, color: C.onNightSoft, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        {['Unit', 'Rent for', 'Anniversary', 'Deposit'].map((h, i) => <div key={h} style={{width: [110, 190, 190, 190][i]}}>{h}</div>)}
      </div>
      {Array.from({length: 9}, (_, r) => {
        const miss = MISSING.includes(r);
        const show = t01(f, at + 8 + r * 3, at + 20 + r * 3);
        return (
          <div key={r} style={{display: 'flex', alignItems: 'center', height: 42, fontSize: 17, borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
            <div style={{width: 110, fontWeight: 600}}>{UNITS[r]}</div>
            <div style={{width: 190, color: C.onNightSoft}}>Sep 2025</div>
            {[0, 1].map((c) => (
              <div key={c} style={{width: 190}}>
                {miss ? (
                  <div style={{width: 150, height: 20, borderRadius: 6, opacity: show, border: `1px solid ${C.amber}55`,
                    backgroundImage: `repeating-linear-gradient(135deg, ${C.amber}99 0 1.5px, transparent 1.5px 7px)`}} />
                ) : <span style={{color: C.onNightSoft}}>{c ? '₱4,500' : 'Mar 12'}</span>}
              </div>
            ))}
          </div>
        );
      })}
      <div style={{position: 'absolute', right: -60, top: -60, width: 150, height: 150, borderRadius: 75, background: '#0f1b15', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: t01(f, at + 26, at + 36)}}>
        <svg width={150} height={150} viewBox="0 0 150 150" style={{position: 'absolute', transform: 'rotate(-90deg)'}}>
          <circle cx={75} cy={75} r={60} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
          <circle cx={75} cy={75} r={60} fill="none" stroke={C.amber} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 60 * 0.43 * ring} 999`} />
        </svg>
        <span style={{fontFamily: sora, fontWeight: 700, fontSize: 36, color: C.amber}}>{Math.round(43 * ring)}%</span>
      </div>
    </div>
  );
};

const Bubble: React.FC<{text: string; me?: boolean; p: number; size?: number}> = ({text, me, p, size = 24}) => (
  <div style={{alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 470, padding: '16px 22px', borderRadius: me ? '24px 24px 6px 24px' : '24px 24px 24px 6px',
    background: me ? C.brand : '#26352d', color: '#fff', fontFamily: jakarta, fontSize: size, lineHeight: 1.38,
    transform: `translateY(${(1 - p) * 16}px) scale(${lerp(0.85, 1, p)})`, transformOrigin: me ? 'right bottom' : 'left bottom', opacity: Math.min(1, p * 1.6)}}>{text}</div>
);

const Chat: React.FC<{f: number; at: number}> = ({f, at}) => (
  <div style={{width: 660, borderRadius: 30, background: 'rgba(22,36,28,0.96)', border: '1px solid rgba(255,255,255,0.08)', padding: 30, boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 50px 100px rgba(0,0,0,0.5)'}}>
    <div style={{fontFamily: jakarta, fontSize: 15, color: C.onNightSoft, marginBottom: 4}}>Messages</div>
    <Bubble text="Ma'am, the faucet in 2c is leaking." p={pop(f, at + 12)} />
    <Bubble text="Noted po, I'll check later." me p={pop(f, at + 28)} />
    <Bubble text="Good evening po, the light in 3e is flickering." p={pop(f, at + 44)} />
  </div>
);

const Ask: React.FC<{f: number; at: number}> = ({f, at}) => {
  const dots = (k: number) => 0.35 + 0.65 * Math.max(0, Math.sin((f - at) / 4 - k * 0.9));
  return (
    <div style={{width: 600, display: 'flex', flexDirection: 'column', gap: 16}}>
      <Bubble text="Good morning po! How much is my bill this month?" p={pop(f, at + 10)} size={28} />
      <div style={{alignSelf: 'flex-end', display: 'flex', gap: 8, padding: '18px 22px', borderRadius: '24px 24px 6px 24px', background: C.brand, opacity: t01(f, at + 30, at + 40)}}>
        {[0, 1, 2].map((k) => <span key={k} style={{width: 11, height: 11, borderRadius: 6, background: '#fff', opacity: dots(k)}} />)}
      </div>
    </div>
  );
};

// Inquiries arriving three different ways, none of them kept in one place.
const FacebookLogo: React.FC<{size?: number}> = ({size = 26}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx={12} cy={12} r={12} fill="#1877F2" />
    <path d="M16.2 15.47 16.73 12H13.4V9.75c0-.95.47-1.87 1.96-1.87h1.51V4.93s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H6.61v3.47h3.05V24h3.74v-8.53h2.8Z" fill="#fff" />
  </svg>
);
const MessagesLogo: React.FC<{size?: number}> = ({size = 26}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <defs><linearGradient id="imsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5BF675" /><stop offset="1" stopColor="#0CBD2A" /></linearGradient></defs>
    <rect width={24} height={24} rx={5.4} fill="url(#imsg)" />
    <path d="M12 5.2c-4.2 0-7.5 2.7-7.5 6.1 0 1.9 1.1 3.6 2.8 4.7-.1.9-.6 1.9-1.5 2.6 1.6 0 3-.6 3.9-1.4.7.2 1.5.3 2.3.3 4.2 0 7.5-2.7 7.5-6.1S16.2 5.2 12 5.2Z" fill="#fff" />
  </svg>
);
const Source: React.FC<{logo: React.ReactNode; label: string; children: React.ReactNode; p: number; rot: number; style?: React.CSSProperties}> = ({logo, label, children, p, rot, style}) => (
  <div style={{position: 'absolute', width: 380, opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 40}px) rotate(${rot * p}deg) scale(${lerp(0.9, 1, p)})`, ...style}}>
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 9, padding: '5px 14px 5px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: C.onNightSoft,
      fontFamily: jakarta, fontSize: 16, fontWeight: 600, marginBottom: 10}}>{logo}{label}</div>
    {children}
  </div>
);
const Inquiries: React.FC<{f: number; at: number}> = ({f, at}) => (
  <div style={{position: 'relative', width: 700, height: 480}}>
    <Source logo={<FacebookLogo />} label="Facebook" p={pop(f, at + 12)} rot={-3} style={{left: 0, top: 0}}>
      <div style={{borderRadius: 18, background: '#26352d', padding: '16px 18px', display: 'flex', gap: 12, fontFamily: jakarta, color: '#fff', boxShadow: '0 30px 60px rgba(0,0,0,0.4)'}}>
        <span style={{width: 40, height: 40, borderRadius: 20, background: C.brandBright, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15}}>KO</span>
        <div><div style={{fontSize: 15, fontWeight: 700}}>Kaye O.</div><div style={{fontSize: 20, marginTop: 2}}>Is this still available?</div></div>
      </div>
    </Source>
    <Source logo={<MessagesLogo />} label="Text" p={pop(f, at + 26)} rot={2} style={{left: 320, top: 150}}>
      <div style={{borderRadius: '22px 22px 22px 6px', background: '#26352d', padding: '16px 20px', fontFamily: jakarta, color: '#fff', fontSize: 21, boxShadow: '0 30px 60px rgba(0,0,0,0.4)'}}>Hi po, how much is a studio?</div>
    </Source>
    <Source logo={<span style={{width: 26, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Footprints size={15} /></span>} label="In person" p={pop(f, at + 40)} rot={-4} style={{left: 40, top: 300}}>
      <div style={{width: 300, background: '#f3e7a6', padding: '16px 20px', fontFamily: hand, color: '#3b3a2c', fontSize: 22, lineHeight: 1.35, boxShadow: '0 30px 60px rgba(0,0,0,0.45)'}}>Walk-in asked about 2a. Will come back?</div>
    </Source>
  </div>
);

// Blend two #rrggbb colours.
const mix = (a: string, b: string, t: number) => '#' + [1, 3, 5].map((i) => Math.round(lerp(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), t)).toString(16).padStart(2, '0')).join('');
// A hive cell drawn as the mark's own rounded hexagon, with the circumradius of
// the cells around it (0.95 r), so the centre cell and the logo are one shape.
const CentreCell: React.FC<{x: number; y: number; r: number; hex: string; draw: number; opacity?: number; glow?: number; shadow?: number}> = ({x, y, r, hex, draw, opacity = 1, glow = 0, shadow = 0}) => {
  const size = (0.95 * r * 512) / 244;
  const filters = [glow > 0 ? `drop-shadow(0 0 ${24 * glow}px rgba(95,194,142,${0.7 * glow}))` : '', shadow > 0 ? `drop-shadow(0 30px 60px rgba(15,27,21,${0.25 * shadow}))` : ''].join(' ').trim();
  return (
    <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity, filter: filters || undefined}}>
      <Mark size={size} hex={hex} draw={draw} />
    </div>
  );
};

// The part of a polyline between two fractional indices.
const slice = (pts: {x: number; y: number}[], a: number, b: number) => {
  if (b <= a) return '';
  const at = (t: number) => { const i = Math.min(pts.length - 2, Math.floor(t)); const u = t - i; return {x: lerp(pts[i].x, pts[i + 1].x, u), y: lerp(pts[i].y, pts[i + 1].y, u)}; };
  const out = [at(a)];
  for (let i = Math.ceil(a); i < b; i++) out.push(pts[i]);
  out.push(at(b));
  return out.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
};

// Where each link along the ring can be seen: the stretch of the ellipse between
// two neighbouring problems, outside both of their boxes.
const LINKS = ORDER.map((a, i) => {
  const b = ORDER[(i + 1) % ORDER.length];
  const N = 90;
  const pts = Array.from({length: N + 1}, (_, n) => { const t = rad(ANG[a] + (60 * n) / N); return {x: 960 + EL.rx * Math.cos(t), y: 540 + EL.ry * Math.sin(t)}; });
  const box = (k: Prop) => ({x: 960 + EL.rx * Math.cos(rad(ANG[k])), y: 540 + EL.ry * Math.sin(rad(ANG[k])), hw: (SIZE[k][0] / 2) * SCALE_BACK + 20, hh: (SIZE[k][1] / 2) * SCALE_BACK + 20});
  const inside = (p: {x: number; y: number}, k: Prop) => { const q = box(k); return Math.abs(p.x - q.x) < q.hw && Math.abs(p.y - q.y) < q.hh; };
  const i0 = pts.findIndex((p) => !inside(p, a));
  let i1 = N;
  while (i1 > 0 && inside(pts[i1], b)) i1--;
  return {pts, i0, i1};
});

// ---- The act ----------------------------------------------------------------------

export const Act1: React.FC = () => {
  const f = useCurrentFrame();
  const focus = (p: {x: number; y: number}, off = 330) => ({x: p.x - off / 1.15, y: p.y, s: 1.15});
  const keys = [
    {at: 0, x: 1600, y: 880, s: 1.75, rx: 26, rz: -10},
    {at: 70, x: 1860, y: 1130, s: 0.8, rx: 42, rz: -20, dur: 110, ease: gentle},
    {at: B[0], ...focus({x: P.usb.x - 60, y: P.usb.y}, 330), rx: 0, rz: 0, dur: 80},
    ...ORDER.slice(1).map((k, i) => ({at: B[i + 1], ...focus(P[k], k === 'rows' ? 390 : 330), dur: 48})),
    {at: CONNECTED, x: CENTER.x, y: CENTER.y, s: SCALE_BACK, dur: 70},
  ];
  const cam = camera(f, keys);

  // Beat 0, slowly: the sheet shrinks to the size of a file card and becomes it;
  // the card rests, then slides into the drive, and the drive's light comes on.
  const CARD = {x: P.usb.x - 380 + 20 + 150, y: P.usb.y};
  const morph = t01(f, B[0] + 10, B[0] + 76, easeInOut);
  const toCard = f >= B[0] + 76 ? 1 : 0;
  const mw = Math.exp(lerp(Math.log(1500), Math.log(300), morph)), mh = Math.exp(lerp(Math.log(880), Math.log(190), morph));
  const plug = t01(f, B[0] + 98, B[0] + 124, easeInOut);
  const ledOn = f > B[0] + 128 && Math.sin(f / 5) > 0 ? 1 : 0;

  // Receipts slide together and are circled.
  const slide = t01(f, B[1] + 56, B[1] + 76, easeInOut);
  const ring = t01(f, B[1] + 76, B[1] + 94, gentle);

  // Nothing connected: the links reach for each other, then break.
  const reach = t01(f, CONNECTED + 64, CONNECTED + 96, gentle);
  const snap = t01(f, CONNECTED + 104, CONNECTED + 112);
  const bob = (i: number) => Math.sin((f + i * 23) / 28) * 10 * t01(f, CONNECTED, CONNECTED + 30);

  // The hive glows once whole, then lets go as the light comes up.
  const glow = t01(f, BRAAM - 40, BRAAM - 14) * (1 - t01(f, BRAAM - 14, BRAAM));
  const release = t01(f, BRAAM - 14, BRAAM + 6, easeIn);
  const glowFilter = glow > 0 ? `drop-shadow(0 0 ${40 * glow}px rgba(95,194,142,${0.6 * glow}))` : undefined;

  // Each problem as a world object: in place, lit while it is discussed, then
  // bending into a hexagon with its icon and flying to its cell.
  const prop = (k: Prop, i: number, content: React.ReactNode) => {
    const [w, h] = SIZE[k];
    // Each arrives once the camera has all but settled on it.
    const arrive = k === 'usb' ? 0 : B[i] + 28;
    const shown = k === 'usb' ? 1 : t01(f, arrive, arrive + 18);
    const lit = t01(f, B[i] - 4, B[i] + 16) * (i < 5 ? 1 - t01(f, B[i + 1] - 4, B[i + 1] + 16) : 1);
    const spot = lerp(lerp(0.2, 1, lit), 1, t01(f, CONNECTED, CONNECTED + 30));
    const dim = t01(f, CONNECTED, CONNECTED + 30) * 0.3 * (1 - t01(f, HIVE, HIVE + 20));
    const m = t01(f, HIVE + i * 4, HIVE + 44 + i * 4, easeInOut);
    const g = t01(f, HIVE + 30 + i * 4, HIVE + 84 + i * 4, easeInOut);
    const target = toWorld(axial(...TARGET[k]));
    const cx = lerp(P[k].x, target.x, g) + (target.x - CENTER.x) * release * 1.2;
    const cy = lerp(P[k].y, target.y, g) + bob(i) * (1 - g) + (target.y - CENTER.y) * release * 1.2;
    const bw = lerp(w, HEX_W, m), bh = lerp(h, HEX_H, m);
    const inner = lerp(1, Math.min(HEX_W / w, HEX_H / h) * 1.15, m);
    const pad = 200 * (1 - t01(m, 0, 0.5, easeOut));
    const Icon = ICON[k];
    return (
      <div key={k} style={{position: 'absolute', left: cx - bw / 2, top: cy - bh / 2, width: bw, height: bh, opacity: shown * (1 - dim) * spot * (1 - release),
        transform: `translateY(${(1 - shown) * 60}px) scale(${1 - release * 0.4})`, filter: glowFilter}}>
        <div style={{position: 'absolute', inset: 0, clipPath: m > 0 ? morphClip(m, pad) : undefined}}>
          <div style={{position: 'absolute', left: bw / 2 - w / 2, top: bh / 2 - h / 2, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${inner})`, opacity: 1 - t01(m, 0.35, 0.8)}}>{content}</div>
          {m > 0 ? <div style={{position: 'absolute', inset: 0, background: SHADES[i], opacity: t01(m, 0.25, 0.75)}} /> : null}
          {m > 0.5 ? (
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: t01(m, 0.55, 0.95) * 0.92,
              transform: `scale(${lerp(0.8, 1, t01(m, 0.55, 1))})`}}><Icon size={72} color="#fff" strokeWidth={1.6} /></div>
          ) : null}
        </div>
      </div>
    );
  };

  const grow = t01(f, BRAAM - 10, BRAAM + 26, easeInOut);
  const light = t01(f, BRAAM - 2, BRAAM + 30, easeInOut);
  const shift = t01(f, BRAAM + 40, BRAAM + 70, easeInOut);
  const centre = pop(f, HIVE + 122);

  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={55} />
      <Stage cam={cam} w={3600} h={2200}>
        {f < B[0] + 76 ? (
          <div style={{position: 'absolute', left: lerp(CENTER.x, CARD.x, morph) - mw / 2, top: lerp(CENTER.y + 100, CARD.y, morph) - mh / 2, width: mw, height: mh,
            borderRadius: lerp(18, 22, morph), overflow: 'hidden', background: mix('#132119', '#1d2d24', morph), border: '1px solid rgba(255,255,255,0.1)', boxSizing: 'border-box',
            boxShadow: `0 ${lerp(80, 30, morph)}px ${lerp(160, 60, morph)}px rgba(0,0,0,0.5)`}}>
            <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${mw / 1500})`, opacity: 1 - t01(morph, 0.35, 0.72)}}><Sheet f={f} /></div>
            <div style={{position: 'absolute', left: mw / 2 - 150, top: mh / 2 - 95, transform: `scale(${Math.max(1, mw / 300)})`, opacity: t01(morph, 0.5, 0.92)}}><CardFace /></div>
          </div>
        ) : null}
        {prop('usb', 0, (
          <div style={{position: 'relative', width: 760, height: 300}}>
            <div style={{position: 'absolute', left: 20, top: 55, transform: `translateX(${plug * 200}px) scale(${lerp(1, 0.5, plug)})`, transformOrigin: '100% 50%',
              opacity: toCard * (1 - t01(f, B[0] + 116, B[0] + 126))}}><FileCard /></div>
            <div style={{position: 'absolute', left: 350, top: 95, opacity: t01(f, B[0] + 70, B[0] + 92), transform: `translateX(${(1 - t01(f, B[0] + 70, B[0] + 96, easeOut)) * 60}px)`}}><Usb led={ledOn} /></div>
          </div>
        ))}
        {prop('receipts', 1, (
          <div style={{position: 'relative', width: 700, height: 360}}>
            <Receipt no="1183" amt="6,000" unit="2a" style={{position: 'absolute', left: 350, top: 20, transform: 'rotate(8deg)'}} />
            <Receipt no="1182" amt="4,500" unit="2c" style={{position: 'absolute', left: 0, top: 70, transform: `rotate(${lerp(-9, -3, slide)}deg)`}} ring={ring} />
            <Receipt no="1182" amt="4,800" unit="3b" style={{position: 'absolute', left: lerp(200, 40, slide), top: lerp(150, 100, slide), transform: `rotate(${lerp(4, 2, slide)}deg)`}} ring={ring} />
          </div>
        ))}
        {prop('rows', 2, <Rows f={f} at={B[2] + 36} />)}
        {prop('chat', 3, <Chat f={f} at={B[3] + 26} />)}
        {prop('ask', 4, <Ask f={f} at={B[4] + 28} />)}
        {prop('inquiries', 5, <Inquiries f={f} at={B[5] + 26} />)}
        {/* The rest of the hive: twelve more cells gathering from the dark. */}
        {RING2.map(([q, r], j) => {
          const t = toWorld(axial(q, r));
          const ang = Math.atan2(t.y - CENTER.y, t.x - CENTER.x);
          const g = t01(f, HIVE + 64 + j * 2, HIVE + 100 + j * 2, easeInOut);
          if (g <= 0) return null;
          const x = lerp(t.x + Math.cos(ang) * 1400, t.x, g) + (t.x - CENTER.x) * release * 1.2;
          const y = lerp(t.y + Math.sin(ang) * 900, t.y, g) + (t.y - CENTER.y) * release * 1.2;
          return (
            <div key={j} style={{position: 'absolute', left: x - HEX_W / 2, top: y - HEX_H / 2, width: HEX_W, height: HEX_H, filter: glowFilter,
              opacity: Math.min(1, g * 2) * (1 - release), transform: `rotate(${(1 - g) * 60}deg) scale(${lerp(0.4, 1, g) * (1 - release * 0.4)})`}}>
              <div style={{position: 'absolute', inset: 0, clipPath: HEX_CLIP, background: SHADES[(j + 2) % 6]}} />
            </div>
          );
        })}
      </Stage>

      {/* The text column keeps a dark wash behind it while the camera travels. */}
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(8,17,12,0.88) 0%, rgba(8,17,12,0.7) 34%, rgba(8,17,12,0) 56%)', opacity: 1 - t01(f, CONNECTED - 10, CONNECTED + 20)}} />
      <Head dark text="33 units." size={140} at={20} out={98} sub="Every peso. Every tenant." subSize={38} top={380} />
      <Head dark text="One spreadsheet." accent={['spreadsheet.']} size={104} width={940} at={110} out={B[0] - 8} sub="Typed by hand." subSize={38} top={390} />
      <Head dark width={820} size={100} text={'One file.\nOne drive.'} accent={['drive.']} at={B[0] + 16} out={B[1] - 8} />
      <Head dark width={820} size={100} text={'Receipts,\nunchecked.'} accent={['unchecked.']} accentColor={C.coral} at={B[1] + 14} out={B[2] - 8} sub="Duplicates go unnoticed." subSize={34} />
      <Head dark width={820} size={86} text={'402 of 937\nrows incomplete.'} accent={['402']} accentColor={C.amber} at={B[2] + 14} out={B[3] - 8} sub="No anniversary. No deposit." subSize={34} />
      <Head dark width={820} size={100} text={'Repairs,\nin a chat.'} accent={['chat.']} at={B[3] + 14} out={B[4] - 8} />
      <Head dark width={820} size={100} text={'Tenants had\nto ask.'} accent={['ask.']} at={B[4] + 14} out={B[5] - 8} sub="What do I owe?" subSize={34} />
      <Head dark width={820} size={100} text={'Inquiries,\neverywhere.'} accent={['everywhere.']} at={B[5] + 14} out={CONNECTED - 8} sub="Social media, texts, walk-ins." subSize={34} />

      {/* Nothing connected: along the ring, each neighbour reaches for the next and
          stops short; then the links break and fall back. */}
      {f >= CONNECTED && f < HIVE + 30 ? (
        <>
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: 0.9 * (1 - t01(f, HIVE, HIVE + 20))}}>
            {LINKS.map(({pts, i0, i1}, n) => {
              const mid = (i0 + i1) / 2;
              const s = reach * (1 - snap * 0.7) * 0.86;
              return (
                <g key={n} fill="none" stroke={snap > 0 ? C.coral : 'rgba(238,245,240,0.5)'} strokeWidth={2.5} strokeDasharray="10 8" strokeLinecap="round">
                  <polyline points={slice(pts, i0, i0 + (mid - i0) * s)} />
                  <polyline points={slice(pts, i1 - (i1 - mid) * s, i1)} />
                </g>
              );
            })}
          </svg>
          <div style={{position: 'absolute', left: 0, right: 0, top: 438}}>
            <Kin text={'Nothing\nconnected.'} at={CONNECTED + 24} out={HIVE - 6} size={96} color="#fff" align="center" accent={['connected.']} accentColor={C.coral} />
          </div>
        </>
      ) : null}

      {/* The centre cell, then the icon it becomes, on a light ground. */}
      {f >= HIVE + 96 ? (
        <>
          <AbsoluteFill style={{clipPath: `circle(${light * 1300}px at 50% 50%)`}}><Bg mood="light" hex /></AbsoluteFill>
          <CentreCell x={960 - shift * 420} y={540} r={lerp(HR * lerp(0.6, 1, centre), 150.5, grow) * (1 + 0.04 * Math.sin(Math.PI * t01(f, BRAAM + 20, BRAAM + 44)))}
            hex={mix('#3f9a6b', '#17603f', t01(f, BRAAM - 4, BRAAM + 30))} draw={t01(f, BRAAM + 14, BRAAM + 48, easeInOut)}
            opacity={Math.min(1, centre * 1.6)} glow={glow} shadow={t01(f, BRAAM + 10, BRAAM + 40)} />
          {f >= BRAAM + 40 ? (
            <div style={{position: 'absolute', left: 960 + 220 - shift * 420, top: 400, width: lerp(0, 860, shift), overflow: 'hidden', whiteSpace: 'nowrap'}}>
              <Kin text="Hivelet" at={BRAAM + 48} size={220} color={C.ink} stagger={0} ls="-0.055em" />
            </div>
          ) : null}
          <div style={{position: 'absolute', left: 0, right: 0, top: 760}}>
            <Kin text="One connected system." at={BRAAM + 64} size={64} weight={600} color={C.inkSoft} align="center" accent={['connected']} accentColor={C.brand} ls="-0.03em" />
          </div>
        </>
      ) : null}
      <Cues scene="act1" />
    </AbsoluteFill>
  );
};
