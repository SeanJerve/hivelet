// Act 1, one continuous camera move through a dark space.
//   0     Her spreadsheet, typed into by hand. "33 units. Every peso. Every tenant."
//   180+  The problems, each waiting in its own place: the drive, the receipts,
//         the incomplete rows, the repair chat, the tenant asking what they owe.
//   600   Pull back: all five surround "Nothing connected one record to another."
//   740   Each becomes a hexagon; the hexagons form a hive; the centre cell grows
//         into the Hivelet icon: "One connected system."
// Every fact is from the build prompt's verified list (Chapter 4 and 5).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CircleHelp, FileSpreadsheet, MessageCircle, ReceiptText, Table2} from 'lucide-react';
import {C, jakarta, sora} from '../theme';
import {camera, cameraAt, easeIn, easeInOut, gentle, lerp, pop, t01, typed} from '../anim';
import {Bg, Head, Kin, Stage} from '../fx';
import {Mark} from '../ui/Kit';
import {Sfx} from '../Sfx';
import tl from '../timeline.json';

const B = tl.act1.beats;
const CONNECTED = tl.act1.connected;
const HIVE = tl.act1.hive;
const BRAAM = tl.act1.braam;
const hand = "'Segoe Print', 'Comic Sans MS', cursive";
const mono = 'ui-monospace, Consolas, monospace';

// Where each problem waits in the world (stage pixels), around the centre.
const CENTER = {x: 1800, y: 1100};
const P = {usb: {x: 600, y: 1100}, receipts: {x: 1200, y: 600}, rows: {x: 2400, y: 600}, chat: {x: 3000, y: 1100}, ask: {x: 1800, y: 1650}};
const RING: [typeof ORDER[number], typeof ORDER[number]][] = [['usb', 'receipts'], ['receipts', 'rows'], ['rows', 'chat'], ['chat', 'ask'], ['ask', 'usb']];
const ORDER = ['usb', 'receipts', 'rows', 'chat', 'ask'] as const;

// ---- The props ------------------------------------------------------------------

const COLS = ['Unit', 'Name', 'Rent for', 'Date paid', 'OR No.', 'Rent', 'Water', 'Garbage', 'Total'];
const WIDTHS = [90, 230, 150, 150, 120, 150, 120, 130, 150];
const NAMES = ['Andrea Villanueva', 'Paolo Dimayuga', 'Kristine Salcedo', 'Mark Lorenzo', 'Bea Magbanua', 'Joshua Ramirez', 'Ella Cordero', 'Carlo Buenaflor', 'Nicole Ong', 'Renzo Abrenica', 'Trisha Delos Santos', 'Miguel Santiago', 'Angela Pascual', 'Jerome Taduran'];
const UNITS = ['1a', '1b', '1c', '1d', '1e', '1f', '1g', '1h', '2a', '2b', '2c', '2d', '2e', '2f'];
const RENT = [4500, 4500, 4800, 4800, 4500, 4500, 4800, 4500, 6000, 4800, 4500, 4800, 4500, 4800];

// Her workbook, as a spreadsheet: two tabs, rows typed in by hand.
const Sheet: React.FC<{f: number}> = ({f}) => {
  const cell = (r: number) => (r === 4 ? typed('4,800.00', f, 24, 4) : r === 5 ? typed('4,500.00', f, 118, 4) : null);
  const sel = f < 110 ? 4 : 5;
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
        return (
          <div key={r} style={{display: 'flex', height: 45, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', color: header ? C.glow : undefined, fontWeight: header ? 700 : 400}}>
            <div style={{width: 50, textAlign: 'center', color: 'rgba(238,245,240,0.3)', fontSize: 14}}>{r + 1}</div>
            {vals.map((v, i) => {
              const typedHere = !header && i === 5 && cell(r) !== null;
              const selected = !header && i === 5 && r === sel;
              return (
                <div key={i} style={{width: WIDTHS[i], padding: '0 12px', boxSizing: 'border-box', textAlign: i >= 5 ? 'right' : 'left', whiteSpace: 'nowrap', overflow: 'hidden',
                  height: 45, lineHeight: '45px', position: 'relative', outline: selected ? `2.5px solid ${C.glow}` : 'none', outlineOffset: -2, background: selected ? 'rgba(95,194,142,0.10)' : 'transparent',
                  color: typedHere ? '#fff' : undefined}}>
                  {typedHere ? cell(r) : r >= 4 && r <= 5 && i === 5 ? '' : v}
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

const FileCard: React.FC = () => (
  <div style={{width: 300, height: 190, borderRadius: 22, background: '#1d2d24', border: '1px solid rgba(255,255,255,0.1)', padding: 24, boxSizing: 'border-box',
    boxShadow: '0 30px 60px rgba(0,0,0,0.45)', fontFamily: jakarta, color: C.onNight}}>
    <FileSpreadsheet size={46} color={C.glow} strokeWidth={1.5} />
    <div style={{fontSize: 20, fontWeight: 700, marginTop: 14}}>Her workbook</div>
    <div style={{fontSize: 15, color: C.onNightSoft, marginTop: 4}}>Monthly Income · Monthly Expenses</div>
  </div>
);

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

// Her rows, with the anniversary and deposit columns hatched where nothing was
// recorded - the same hatching the app uses for a missing figure.
const Rows: React.FC<{f: number; at: number}> = ({f, at}) => {
  const missing = [0, 1, 3, 4, 6, 8];
  const ring = t01(f, at + 30, at + 64, gentle);
  return (
    <div style={{width: 760, borderRadius: 24, background: '#16241c', border: '1px solid rgba(255,255,255,0.08)', padding: '26px 30px', boxSizing: 'border-box', position: 'relative',
      boxShadow: '0 50px 100px rgba(0,0,0,0.5)', fontFamily: jakarta, color: C.onNight}}>
      <div style={{display: 'flex', fontSize: 15, color: C.onNightSoft, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        {['Unit', 'Rent for', 'Anniversary', 'Deposit'].map((h, i) => <div key={h} style={{width: [110, 190, 190, 190][i]}}>{h}</div>)}
      </div>
      {Array.from({length: 9}, (_, r) => {
        const miss = missing.includes(r);
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

// ---- The hive ---------------------------------------------------------------------

const hexPoints = (r: number) => Array.from({length: 6}, (_, k) => { const a = (Math.PI / 3) * k - Math.PI / 2; return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`; }).join(' ');
const Hex: React.FC<{x: number; y: number; r: number; fill: string; rot?: number; opacity?: number; glow?: number; icon?: React.ReactNode}> = ({x, y, r, fill, rot = 0, opacity = 1, glow = 0, icon}) => (
  <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, opacity, transform: `rotate(${rot}deg)`,
    filter: glow > 0 ? `drop-shadow(0 0 ${24 * glow}px rgba(95,194,142,${0.7 * glow}))` : undefined}}>
    <svg width={r * 2} height={r * 2} viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`} style={{position: 'absolute', inset: 0}}>
      <polygon points={hexPoints(r * 0.96)} fill={fill} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
    </svg>
    {icon ? <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.55}}>{icon}</div> : null}
  </div>
);

const HR = 58;
const cells = (() => {
  const out: {q: number; r: number}[] = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) out.push({q, r});
  return out.sort((a, b) => (Math.abs(a.q) + Math.abs(a.r) + Math.abs(a.q + a.r)) - (Math.abs(b.q) + Math.abs(b.r) + Math.abs(b.q + b.r)));
})();
const cellXY = ({q, r}: {q: number; r: number}) => ({x: 960 + HR * Math.sqrt(3) * (q + r / 2), y: 540 + HR * 1.5 * r});
const SHADES = [C.brand, '#1f7048', C.brandStrong, '#2a8a5c', C.brandBright];
const ICONS = [FileSpreadsheet, ReceiptText, Table2, MessageCircle, CircleHelp];

// ---- The act ----------------------------------------------------------------------

export const Act1: React.FC = () => {
  const f = useCurrentFrame();
  const focus = (p: {x: number; y: number}, off = 330) => ({x: p.x - off / 1.15, y: p.y, s: 1.15});
  const keys = [
    {at: 0, x: 1400, y: 880, s: 1.75, rx: 26, rz: -10},
    {at: 70, x: 1860, y: 1130, s: 0.8, rx: 42, rz: -20, dur: 110, ease: gentle},
    {at: B[0], ...focus(P.usb), rx: 0, rz: 0, dur: 56},
    ...ORDER.slice(1).map((k, i) => ({at: B[i + 1], ...focus(P[k], k === 'rows' ? 390 : 330), dur: 56})),
    {at: CONNECTED, x: CENTER.x, y: CENTER.y - 200, s: 0.5, dur: 70},
  ];
  const cam = camera(f, keys);
  const worldOut = t01(f, HIVE, HIVE + 34, easeIn);

  // The sheet shrinks into the file, and the file goes into the drive.
  const shrink = t01(f, B[0], B[0] + 40, easeInOut);
  const sheetX = lerp(CENTER.x, P.usb.x - 130, shrink), sheetY = lerp(CENTER.y, P.usb.y, shrink);
  const fileIn = pop(f, B[0] + 30);
  const plug = t01(f, B[0] + 46, B[0] + 66, easeInOut);

  // Receipts slide onto each other.
  const slide = t01(f, B[1] + 28, B[1] + 48, easeInOut);
  const ring = t01(f, B[1] + 48, B[1] + 66, gentle);

  // "Nothing connected": the links reach toward the centre, then break.
  const reach = t01(f, CONNECTED + 44, CONNECTED + 76, gentle);
  const snap = t01(f, CONNECTED + 92, CONNECTED + 100);
  const bob = (i: number) => Math.sin((f + i * 23) / 28) * 10 * t01(f, CONNECTED, CONNECTED + 30);

  const propStyle = (k: typeof ORDER[number], i: number, w: number, h: number): React.CSSProperties => {
    const arrive = B[i] + (k === 'usb' ? 0 : 6);
    const shown = k === 'usb' ? 1 : t01(f, arrive, arrive + 18);
    const dim = t01(f, CONNECTED, CONNECTED + 30) * 0.3;
    // A spotlight: while each problem is discussed, the others step back.
    const lit = t01(f, B[i] - 4, B[i] + 16) * (i < 4 ? 1 - t01(f, B[i + 1] - 4, B[i + 1] + 16) : 1);
    const spot = lerp(lerp(0.2, 1, lit), 1, t01(f, CONNECTED, CONNECTED + 30));
    return {position: 'absolute', left: P[k].x - w / 2, top: P[k].y - h / 2 + bob(i), width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: shown * (1 - dim) * spot, transform: `translateY(${(1 - shown) * 60}px)`};
  };

  // Screen positions of the props once the camera has pulled back.
  const v = cameraAt(Math.max(f, CONNECTED + 70), keys);
  const onScreen = (p: {x: number; y: number}) => ({x: 960 + (p.x - v.x) * v.s, y: 540 + (p.y - v.y) * v.s});

  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={55} />
      <div style={{position: 'absolute', inset: 0, opacity: 1 - worldOut}}>
        <Stage cam={cam} w={3600} h={2200}>
          {f < B[0] + 44 ? (
            <div style={{position: 'absolute', left: sheetX - 750, top: sheetY - 440, width: 1500, height: 880, transform: `scale(${lerp(1, 0.18, shrink)})`, opacity: 1 - t01(f, B[0] + 30, B[0] + 42)}}>
              <Sheet f={f} />
            </div>
          ) : null}
          <div style={propStyle('usb', 0, 760, 300)}>
            <div style={{position: 'relative', width: 760, height: 200}}>
              <div style={{position: 'absolute', left: 0, top: 5, transform: `translateX(${plug * 190}px) scale(${lerp(0.7, 1, fileIn) * lerp(1, 0.55, plug)})`,
                opacity: Math.min(1, fileIn * 2) * (1 - t01(f, B[0] + 60, B[0] + 68))}}><FileCard /></div>
              <div style={{position: 'absolute', left: 330, top: 45, opacity: t01(f, B[0] + 10, B[0] + 30)}}><Usb led={f > B[0] + 66 ? (Math.sin(f / 5) > 0 ? 1 : 0) : 0} /></div>
            </div>
          </div>
          <div style={propStyle('receipts', 1, 760, 420)}>
            <div style={{position: 'relative', width: 700, height: 360}}>
              <Receipt no="1183" amt="6,000" unit="2a" style={{position: 'absolute', left: 350, top: 20, transform: 'rotate(8deg)'}} />
              <Receipt no="1182" amt="4,500" unit="2c" style={{position: 'absolute', left: 0, top: 70, transform: `rotate(${lerp(-9, -3, slide)}deg)`}} ring={ring} />
              <Receipt no="1182" amt="4,800" unit="3b" style={{position: 'absolute', left: lerp(200, 40, slide), top: lerp(150, 100, slide), transform: `rotate(${lerp(4, 2, slide)}deg)`}} ring={ring} />
            </div>
          </div>
          <div style={propStyle('rows', 2, 800, 560)}><Rows f={f} at={B[2]} /></div>
          <div style={propStyle('chat', 3, 700, 460)}><Chat f={f} at={B[3]} /></div>
          <div style={propStyle('ask', 4, 640, 260)}><Ask f={f} at={B[4]} /></div>
        </Stage>
      </div>

      {/* The text column keeps a dark wash behind it while the camera travels. */}
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(8,17,12,0.88) 0%, rgba(8,17,12,0.7) 34%, rgba(8,17,12,0) 56%)', opacity: 1 - t01(f, CONNECTED - 10, CONNECTED + 20)}} />
      <Head dark text="33 units." size={140} at={20} out={98} sub="Every peso. Every tenant." subSize={38} top={380} />
      <Head dark text="One spreadsheet." accent={['spreadsheet.']} size={104} width={940} at={110} out={B[0] - 8} sub="Typed by hand." subSize={38} top={390} />
      <Head dark width={820} size={100} text={'One file.\nOne drive.'} accent={['drive.']} at={B[0] + 14} out={B[1] - 8} />
      <Head dark width={820} size={100} text={'Receipts,\nunchecked.'} accent={['unchecked.']} accentColor={C.coral} at={B[1] + 14} out={B[2] - 8} sub="5 numbers, used twice." subSize={34} />
      <Head dark width={820} size={86} text={'402 of 937\nrows incomplete.'} accent={['402']} accentColor={C.amber} at={B[2] + 14} out={B[3] - 8} sub="No anniversary. No deposit." subSize={34} />
      <Head dark width={820} size={100} text={'Repairs,\nin a chat.'} accent={['chat.']} at={B[3] + 14} out={B[4] - 8} />
      <Head dark width={820} size={100} text={'Tenants had\nto ask.'} accent={['ask.']} at={B[4] + 14} out={CONNECTED - 8} sub="What do I owe?" subSize={34} />

      {/* Nothing connected: the links reach toward the centre and break. */}
      {f >= CONNECTED && f < HIVE + 30 ? (
        <>
          {RING.map(([k1, k2]) => {
            const a = onScreen(P[k1]), b = onScreen(P[k2]);
            const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
            const len = Math.max(0, dist - 330);
            const s = reach * (1 - snap * 0.75);
            const dash = `repeating-linear-gradient(90deg, ${snap > 0 ? C.coral : 'rgba(238,245,240,0.5)'} 0 10px, transparent 10px 18px)`;
            return (
              <div key={k1} style={{position: 'absolute', left: a.x + Math.cos(ang) * 165, top: a.y + Math.sin(ang) * 165, width: len, height: 2.5,
                transformOrigin: '0 50%', transform: `rotate(${ang}rad)`, opacity: (1 - worldOut) * 0.9}}>
                <div style={{position: 'absolute', left: 0, width: len / 2, height: '100%', transformOrigin: '0 50%', transform: `scaleX(${s})`, background: dash}} />
                <div style={{position: 'absolute', right: 0, width: len / 2, height: '100%', transformOrigin: '100% 50%', transform: `scaleX(${s})`, background: dash}} />
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 0, right: 0, top: 70, opacity: 1 - worldOut}}>
            <Kin text={'Nothing connected.'} at={CONNECTED + 24} out={HIVE - 6} size={104} color="#fff" align="center" accent={['connected']} accentColor={C.coral} />
          </div>
        </>
      ) : null}

      {/* The hive. Each problem becomes a cell; the cells gather; the centre grows into the icon. */}
      {f >= HIVE ? (() => {
        const gather = (i: number) => t01(f, HIVE + 24 + i * 2, HIVE + 70 + i * 2, easeInOut);
        const release = t01(f, BRAAM - 14, BRAAM + 6, easeIn);
        const grow = t01(f, BRAAM - 10, BRAAM + 26, easeInOut);
        const light = t01(f, BRAAM - 2, BRAAM + 30, easeInOut);
        const glow = t01(f, BRAAM - 40, BRAAM - 14) * (1 - release);
        const shift = t01(f, BRAAM + 40, BRAAM + 70, easeInOut);
        const ring1 = cells.slice(1, 7);
        return (
          <>
            <AbsoluteFill style={{clipPath: `circle(${light * 1300}px at 50% 50%)`}}><Bg mood="light" hex /></AbsoluteFill>
            {cells.slice(1).map((c, idx) => {
              const i = idx;
              const target = cellXY(c);
              const fromProp = ring1.indexOf(c) >= 0 && ring1.indexOf(c) < 5 ? ORDER[ring1.indexOf(c)] : null;
              const seed = Math.sin((i + 3) * 12.9898) * 43758.5453;
              const rnd = seed - Math.floor(seed);
              const start = fromProp ? onScreen(P[fromProp]) : {x: 960 + Math.cos(rnd * 6.28) * 1100, y: 540 + Math.sin(rnd * 6.28) * 700};
              const g = gather(i);
              const appear = fromProp ? t01(f, HIVE, HIVE + 18) : t01(f, HIVE + 20 + i * 2, HIVE + 40 + i * 2);
              const Icon = fromProp ? ICONS[ORDER.indexOf(fromProp)] : null;
              const out = release;
              return <Hex key={i} x={lerp(start.x, target.x, g) + (target.x - 960) * out * 0.6} y={lerp(start.y, target.y, g) + (target.y - 540) * out * 0.6}
                r={lerp(fromProp ? 130 : 30, HR, g) * (1 - out * 0.5)} fill={SHADES[i % SHADES.length]} rot={(1 - g) * (fromProp ? 30 : 120)} opacity={appear * (1 - out)} glow={glow}
                icon={Icon ? <Icon size={lerp(64, 30, g)} color="#fff" strokeWidth={1.6} /> : null} />;
            })}
            {/* The centre cell, then the icon it becomes. */}
            <Hex x={960 - shift * 420} y={540} r={lerp(HR, 170, grow)} fill={C.brandBright} opacity={t01(f, HIVE + 70, HIVE + 90) * (1 - t01(f, BRAAM + 14, BRAAM + 26))} glow={glow} />
            {f >= BRAAM + 8 ? (
              <div style={{position: 'absolute', left: 960 - 150 - shift * 420, top: 390, width: 300, height: 300, transform: `scale(${lerp(1.15, 1, t01(f, BRAAM + 8, BRAAM + 40, easeInOut))})`,
                opacity: t01(f, BRAAM + 8, BRAAM + 24), filter: 'drop-shadow(0 30px 60px rgba(15,27,21,0.25))'}}>
                <Mark size={300} draw={t01(f, BRAAM + 14, BRAAM + 44, easeInOut)} />
              </div>
            ) : null}
            {f >= BRAAM + 40 ? (
              <div style={{position: 'absolute', left: 960 + 220 - shift * 420, top: 400, width: lerp(0, 860, shift), overflow: 'hidden', whiteSpace: 'nowrap'}}>
                <Kin text="Hivelet" at={BRAAM + 48} size={220} color={C.ink} stagger={0} ls="-0.055em" />
              </div>
            ) : null}
            <div style={{position: 'absolute', left: 0, right: 0, top: 760}}>
              <Kin text="One connected system." at={BRAAM + 64} size={64} weight={600} color={C.inkSoft} align="center" accent={['connected']} accentColor={C.brand} ls="-0.03em" />
            </div>
          </>
        );
      })() : null}

      {[24, 28, 32, 36, 40].map((a) => <Sfx key={a} at={a} name={(['key1', 'key2', 'key3'] as const)[a % 3]} vol={0.07} />)}
      {[118, 122, 126, 130].map((a) => <Sfx key={a} at={a} name={(['key1', 'key2', 'key3'] as const)[a % 3]} vol={0.07} />)}
      <Sfx at={74} name="air-long" vol={0.4} />
      <Sfx at={B[0]} name="air" vol={0.35} />
      <Sfx at={B[0] + 64} name="soft-click" vol={0.35} />
      {B.slice(1).map((b) => <Sfx key={b} at={b} name="air" vol={0.3} />)}
            <Sfx at={B[1] + 50} name="soft-warn" vol={0.3} />
      {[B[3] + 12, B[3] + 28, B[3] + 44, B[4] + 10].map((a) => <Sfx key={a} at={a} name="blip" vol={0.28} />)}
      <Sfx at={CONNECTED} name="air-long" vol={0.4} />
      <Sfx at={CONNECTED + 92} name="snap" vol={0.14} />
      <Sfx at={HIVE + 4} name="air" vol={0.35} />
      <Sfx at={BRAAM + 48} name="shimmer" vol={0.35} />
    </AbsoluteFill>
  );
};
