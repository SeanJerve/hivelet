// Act two: a green cutting mat, and on it the app itself, printed out and taped down one
// feature at a time, each marked up by hand as the voice names it. The prints are the
// film's own components (src/ui), drawn in their finished state. Notes on the mat are in
// white paint pen; notes on paper in marker.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {Mark} from '../ui/Kit';
import {LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, ReceivedTile, RepairCard, SplitTile} from '../ui/Admin';
import {PaymentReceived, TenantHome} from '../ui/Tenant';
import {UnitShowcase} from '../ui/Public';
import {AT, WORD} from './timeline';
import {arrow, arrowHead, clamp01, Drop, EASE, FONT, Hand, Ink, lerp, lift, PAL, paper, Pin, ring, sec, spr, t01, Tape, tick} from './kit';

export const MAT = {x0: 1100, x1: 8950, y0: 1820, y1: 3200};
export const STATION = {ledger: {x: 2100, y: 2500}, phone: {x: 3650, y: 2500}, repairs: {x: 5150, y: 2480}, visitors: {x: 6650, y: 2500}, install: {x: 8100, y: 2500}};
const PAINT = '#fbf7ec';

export const CuttingMat: React.FC = () => {
  const w = MAT.x1 - MAT.x0, h = MAT.y1 - MAT.y0;
  return (
    <div style={{position: 'absolute', left: MAT.x0, top: MAT.y0, width: w, height: h, borderRadius: 28, overflow: 'hidden',
      ...paper(PAL.mat, 'grain', 380), boxShadow: '0 10px 0 #1f4f3a, 0 18px 30px rgba(60,40,20,0.35)'}}>
      <div style={{position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${PAL.matLine} 1.5px, transparent 1.5px), linear-gradient(90deg, ${PAL.matLine} 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px'}} />
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(222,246,232,0.26) 2.5px, transparent 2.5px), linear-gradient(90deg, rgba(222,246,232,0.26) 2.5px, transparent 2.5px)', backgroundSize: '200px 200px'}} />
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(222,246,232,0.07) 0 2px, transparent 2px 400px)'}} />
      {Array.from({length: Math.floor(w / 200)}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: i * 200 + 6, top: 8, fontFamily: FONT.type, fontWeight: 700, fontSize: 20, color: 'rgba(222,246,232,0.5)'}}>{i * 5}</div>
      ))}
    </div>
  );
};

// A print of a screen: white paper with a thin margin, taped at two corners.
const Print: React.FC<{w: number; h: number; pad?: number; children: React.ReactNode}> = ({w, h, pad = 26, children}) => (
  <div style={{width: w, height: h, padding: pad, boxSizing: 'border-box', ...paper(PAL.white), overflow: 'hidden', position: 'relative'}}>
    {children}
    <div style={{position: 'absolute', inset: 0, ...paper('rgba(255,255,255,0)'), opacity: 0.6, pointerEvents: 'none'}} />
  </div>
);

const ROWS: LedgerRowData[] = [
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
  {unit: '2c', paid: 'Sep 18, 2026', period: 'Sep 20 – Oct 19', who: 'Trisha Delos Santos', or: '5077', rent: 4500, water: 400, heads: 2},
  {unit: '3a', paid: 'Sep 16, 2026', period: 'Sep 16 – Oct 15', who: 'Patrick Lomibao', or: '5081', rent: 6000, water: 600, heads: 3},
];

// ---- Her ledger, adding itself up; and a payment that cannot go in twice ----------------
const Ledger: React.FC = () => {
  const f = useCurrentFrame();
  const L = sec(AT.ledger), A = sec(WORD.addsUp), T = sec(AT.twice);
  const X = STATION.ledger.x - 600, Y = STATION.ledger.y - 430;
  // The duplicate: slides in, is stopped, is crossed out, is crumpled and flicked away.
  const slide = t01(f, T + 4, T + 30, EASE.out), back = t01(f, T + 30, T + 40, EASE.out);
  const crumple = t01(f, T + sec(1.25), T + sec(1.55), EASE.inOut), flick = t01(f, T + sec(1.6), T + sec(2.0), EASE.in);
  const dupX = lerp(X + 1700, X + 900, slide) + back * 70 + flick * 900, dupY = Y + 560 - flick * 500;
  return (
    <>
      <Drop at={L - 4} x={X} y={Y} rot={-1.2} from={{dx: 260, dy: -80, rot: 6}} stiff={120}>
        <Print w={1200} h={860}>
          <div style={{display: 'flex', gap: 16}}>
            <ReceivedTile f={999} at={0} w={352} h={300} />
            <SplitTile f={999} at={0} w={772} h={300} />
          </div>
          <div style={{width: 1140, marginTop: 16, borderRadius: 24, background: '#fff', border: '1px solid #e2e8e3', overflow: 'hidden'}}>
            <LedgerCardHead f={999} at={0} />
            <div style={{margin: '0 20px 20px', border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}>
              <LedgerHead />
              {ROWS.map((r) => <LedgerRow key={r.or} r={r} />)}
            </div>
          </div>
        </Print>
      </Drop>
      <Tape x={X + 60} y={Y + 10} rot={-35} at={L + 14} seed="lt1" />
      <Tape x={X + 1150} y={Y + 860} rot={-35} at={L + 17} seed="lt2" color="rgba(169,205,245,0.8)" />
      {/* "adding itself up": the total ringed, and the note */}
      <Ink pts={ring(X + 190, Y + 140, 175, 70, 'lr')} at={A} dur={0.35} color={PAL.red} width={7} seed="lr" />
      <Ink pts={arrow(X - 150, Y + 330, X + 10, Y + 170, -0.25)} at={A + 16} dur={0.25} color={PAINT} width={8} seed="la" />
      <Ink pts={arrowHead(X + 10, Y + 170, X - 90, Y + 280)} at={A + 30} dur={0.1} color={PAINT} width={8} seed="lah" />
      <Hand text={'adds\nitself\nup ✓'} at={A + 4} x={X - 450} y={Y + 360} size={72} color={PAINT} font={FONT.marker} rot={-5} seed="lh" cps={22} />
      {/* the duplicate receipt */}
      {f >= T ? (
        <div style={{position: 'absolute', left: dupX, top: dupY, transform: `rotate(${4 + crumple * 160 + flick * 300}deg) scale(${lerp(1, 0.32, crumple)})`, opacity: 1 - t01(flick, 0.7, 1),
          transformOrigin: '50% 50%'}}>
          <div style={{width: 470, height: 190, padding: '18px 24px', boxSizing: 'border-box', ...paper(PAL.white, crumple > 0.05 ? 'crumple' : 'grain', 200), boxShadow: lift(0.5 + crumple * 0.4),
            borderRadius: crumple * 90, fontFamily: FONT.type, color: '#333', fontSize: 22, lineHeight: 1.5, filter: crumple > 0 ? `contrast(${1 + crumple * 0.4})` : undefined}}>
            <div style={{fontWeight: 700, letterSpacing: '0.16em', fontSize: 18}}>PAYMENT · UNIT 3D</div>
            <div>OR 5083 · Sep 27, 2026</div>
            <div>Rent ₱4,800.00 · Water ₱200.00</div>
          </div>
        </div>
      ) : null}
      <Ink pts={[[X + 905, Y + 575], [X + 1335, Y + 735]]} at={T + sec(0.75)} dur={0.12} color={PAL.red} width={12} seed="dx1" out={T + sec(1.25)} />
      <Ink pts={[[X + 1335, Y + 575], [X + 905, Y + 735]]} at={T + sec(0.85)} dur={0.12} color={PAL.red} width={12} seed="dx2" out={T + sec(1.25)} />
      <Hand text="already recorded" at={T + sec(0.9)} x={X + 700} y={Y + 800} size={62} color={PAINT} font={FONT.marker} rot={-3} seed="dh" cps={24} />
    </>
  );
};

// ---- The tenant's phone, cut from black card, and GCash -----------------------------------
const PaperPhone: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{width: 450, height: 920, borderRadius: 66, ...paper('#22201e', 'grain', 300), padding: 30, boxSizing: 'border-box', position: 'relative'}}>
    <div style={{position: 'absolute', left: 175, top: 14, width: 100, height: 10, borderRadius: 5, background: '#3a3734'}} />
    <div style={{width: 390, height: 860, borderRadius: 40, overflow: 'hidden', background: '#edf1ee', position: 'relative'}}>{children}</div>
  </div>
);
const Tenant: React.FC = () => {
  const f = useCurrentFrame();
  const P = sec(AT.phone), G = sec(WORD.gcash);
  const X = STATION.phone.x - 225, Y = STATION.phone.y - 470;
  const feed = t01(f, G + 14, G + 46, EASE.out);
  return (
    <>
      <Drop at={P - 4} x={X} y={Y} rot={2} from={{dx: 200, dy: -100, rot: 12}} stiff={130}>
        <PaperPhone><div style={{position: 'absolute', inset: 0, top: 30}}><TenantHome amount="₱4,700.00" unread={2} /></div></PaperPhone>
      </Drop>
      <Tape x={X + 225} y={Y + 4} w={200} rot={3} at={P + 14} seed="pt" color="rgba(246,166,182,0.8)" />
      {/* the receipt printing out of the phone's side */}
      {f >= G + 14 ? (
        <div style={{position: 'absolute', left: X + 430, top: Y + 380, width: 520 * feed, height: 200, overflow: 'hidden', transform: 'rotate(2deg)'}}>
          <div style={{position: 'absolute', left: -520 * (1 - feed), top: 0, width: 520, height: 190, ...paper('#fffdf7'), padding: '16px 20px', boxSizing: 'border-box', boxShadow: lift(0.15),
            clipPath: `polygon(0 0, 100% 0, ${Array.from({length: 13}, (_, i) => `${100 - (i % 2) * 1.6}% ${(i * 100) / 12}%`).join(', ')}, 0 100%)`}}>
            <PaymentReceived check={t01(f, G + 30, G + 60)} style={{width: 470, background: '#e2f0e7'}} />
          </div>
        </div>
      ) : null}
      <Ink pts={ring(X + 140, Y + 487, 135, 46, 'gr')} at={G - 8} dur={0.3} color={PAL.red} width={7} seed="gr" />
      <Hand text="paid with GCash" at={G + 30} x={X + 470} y={Y + 620} size={74} color={PAINT} font={FONT.marker} rot={3} seed="gh" cps={22} />
    </>
  );
};

// ---- A repair, from request to done ---------------------------------------------------------
const Repairs: React.FC = () => {
  const f = useCurrentFrame();
  const R = sec(AT.repairs);
  const cols = [STATION.repairs.x - 520, STATION.repairs.x, STATION.repairs.x + 520];
  const leg1 = t01(f, R + sec(0.85), R + sec(1.2), EASE.inOut), leg2 = t01(f, R + sec(1.5), R + sec(1.85), EASE.inOut);
  const cx = lerp(lerp(cols[0], cols[1], leg1), cols[2], leg2);
  const tilt = (leg1 > 0 && leg1 < 1 ? Math.sin(leg1 * Math.PI) : 0) + (leg2 > 0 && leg2 < 1 ? Math.sin(leg2 * Math.PI) : 0);
  const Y = STATION.repairs.y;
  return (
    <>
      {['To dispatch', 'In progress', 'Done'].map((t, i) => (
        <Hand key={t} text={t} at={R + i * 6} x={cols[i] - 240} y={Y - 420} size={64} color={PAINT} font={FONT.marker} rot={-2 + i * 1.5} seed={`rc${i}`} cps={30} style={{width: 480, textAlign: 'center'}} />
      ))}
      {[0, 1].map((i) => <Ink key={i} pts={[[cols[i] + 260, Y - 380], [cols[i] + 262, Y + 330]]} at={R + 4 + i * 4} dur={0.25} color={PAINT} width={6} dash="0.05 0.035" seed={`rl${i}`} />)}
      <Drop at={R + 6} x={cx - 205} y={Y - 260} rot={-2 + tilt * 6} from={{dx: -80, dy: -60, rot: -12}} stiff={160} style={{transformOrigin: '50% 100%'}}>
        <div style={{transform: 'scale(1.4)', transformOrigin: '0 0', width: 293 * 1.4, height: 230 * 1.4}}>
          <RepairCard title="Kitchen faucet keeps dripping" unit="1A" category="Plumbing" reported="Sep 29, 2026" tech={leg1 > 0.5 ? 'Plumber' : 'Unassigned'} prio="Medium" />
        </div>
      </Drop>
      <Ink pts={tick(cols[2] + 230, Y + 120, 120)} at={R + sec(2.0)} dur={0.22} color={PAINT} width={14} seed="rt" />
    </>
  );
};

// ---- A visitor's question, no account --------------------------------------------------------
const Visitors: React.FC = () => {
  const f = useCurrentFrame();
  const V = sec(AT.visitors), NA = sec(WORD.noAccount);
  const X = STATION.visitors.x - 560, Y = STATION.visitors.y - 360;
  const badge = f < NA ? 0 : spr(f, NA, {damping: 10, stiffness: 240});
  return (
    <>
      <Drop at={V - 4} x={X} y={Y} rot={-1.5} from={{dx: 200, dy: -60, rot: -8}} stiff={120}>
        <Print w={920} h={600} pad={14}>
          <div style={{transform: 'scale(0.927)', transformOrigin: '0 0'}}><UnitShowcase plan={1} chip={1} ring={1} /></div>
        </Print>
      </Drop>
      <Tape x={X + 460} y={Y - 2} w={220} rot={-2} at={V + 12} seed="vt" />
      <Drop at={V + sec(0.75)} x={X + 560} y={Y + 470} rot={-3} from={{dx: 60, dy: -40, rot: 10}} stiff={220}>
        <div style={{padding: '18px 26px', borderRadius: '28px 28px 6px 28px', ...paper(PAL.mint), fontFamily: FONT.ui, fontWeight: 700, fontSize: 30, color: PAL.ink, whiteSpace: 'nowrap'}}>Can we view it on Saturday?</div>
      </Drop>
      <Drop at={V + sec(1.5)} x={X + 300} y={Y + 600} rot={2} from={{dx: -60, dy: -40, rot: -10}} stiff={220}>
        <div style={{fontFamily: FONT.ui, fontWeight: 600, fontSize: 20, color: PAINT, marginBottom: 6}}>Boarding house</div>
        <div style={{padding: '18px 26px', borderRadius: '28px 28px 28px 6px', ...paper(PAL.white), fontFamily: FONT.ui, fontWeight: 700, fontSize: 30, color: PAL.ink, whiteSpace: 'nowrap'}}>Yes po, Saturday at 10 am.</div>
      </Drop>
      <Pin x={X + 920} y={Y + 480} at={V + sec(0.95)} color={PAL.cobalt} />
      {badge > 0 ? (
        <div style={{position: 'absolute', left: X + 760, top: Y - 150, width: 260, height: 260, transform: `scale(${lerp(1.8, 1, Math.min(1.05, badge))}) rotate(${lerp(-40, 12, Math.min(1, badge))}deg)`, opacity: Math.min(1, badge * 3)}}>
          <svg width={260} height={260} viewBox="0 0 260 260" style={{filter: `drop-shadow(0 ${3 + (1 - Math.min(1, badge)) * 30}px ${4 + (1 - Math.min(1, badge)) * 30}px rgba(40,30,20,0.35))`}}>
            <path d={Array.from({length: 48}, (_, i) => { const a = (i / 48) * Math.PI * 2, r = i % 2 ? 112 : 126; return `${i ? 'L' : 'M'} ${130 + Math.cos(a) * r} ${130 + Math.sin(a) * r}`; }).join(' ') + ' Z'} fill={PAL.coral} stroke="#fff" strokeWidth={6} strokeLinejoin="round" />
          </svg>
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.grot, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 0.92}}>
            <span style={{fontSize: 34, letterSpacing: '0.04em'}}>NO</span><span style={{fontSize: 46, letterSpacing: '-0.02em'}}>ACCOUNT</span><span style={{fontSize: 34, letterSpacing: '0.04em'}}>NEEDED</span>
          </div>
        </div>
      ) : null}
    </>
  );
};

// ---- On her home screen, like an app -----------------------------------------------------------
const ICONS = [PAL.coral, PAL.sun, PAL.cobalt, PAL.pink, PAL.awning, '#8b6cd8', PAL.blue, '#f08a3c', null, PAL.leaf, '#e86aa8', PAL.mint, '#5bc0de', PAL.kraft, '#9aa6b2', PAL.red];
const Install: React.FC = () => {
  const f = useCurrentFrame();
  const I = sec(AT.install);
  const X = STATION.install.x - 380, Y = STATION.install.y - 470;
  const peel = t01(f, I + 8, I + 24, EASE.inOut), fly = t01(f, I + 24, I + 48, EASE.inOut), press = f < I + 48 ? 0 : spr(f, I + 48, {damping: 9, stiffness: 260});
  // the empty slot (row 3, column 1 of the grid), and where the 160 px sticker must sit so
  // that, shrunk to 66 px about its bottom centre, it covers the slot exactly
  const slot = {x: X + 30 + 30 - 47, y: Y + 30 + 70 + 2 * 120 - 94};
  const sheet = {x: X + 560, y: Y + 470};
  const sx = lerp(sheet.x + 40, slot.x, fly), sy = lerp(sheet.y + 40, slot.y, fly) - Math.sin(fly * Math.PI) * 160;
  return (
    <>
      <Drop at={I - 6} x={X} y={Y} rot={-2} from={{dx: -160, dy: -80, rot: -10}} stiff={130}>
        <PaperPhone>
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(170deg, #f6d7a7 0%, #f2b8a2 55%, #c9a6d8 100%)'}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 66px)', gap: '54px 30px', padding: '70px 30px'}}>
              {ICONS.map((c, i) => <div key={i} style={{width: 66, height: 66, borderRadius: 18, ...(c ? paper(c) : {border: '3px dashed rgba(255,255,255,0.75)', boxSizing: 'border-box'})}} />)}
            </div>
          </div>
        </PaperPhone>
      </Drop>
      {/* the sticker sheet */}
      <Drop at={I - 2} x={sheet.x} y={sheet.y} rot={6} from={{dx: 80, dy: -40, rot: 14}} stiff={160}>
        <div style={{width: 240, height: 240, ...paper('#f4f1ea'), borderRadius: 14, position: 'relative'}}>
          <div style={{position: 'absolute', left: 40, top: 40, width: 160, height: 160, borderRadius: 38, border: '2px dashed rgba(0,0,0,0.18)'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 10, textAlign: 'center', fontFamily: FONT.type, fontSize: 16, color: '#888'}}>peel here</div>
        </div>
      </Drop>
      {f >= I - 2 ? (
        <div style={{position: 'absolute', left: sx, top: sy, width: 160, height: 160, transformOrigin: '50% 100%', perspective: 700,
          transform: `rotate(${lerp(6, -4, fly)}deg) scale(${lerp(1, 0.4125, fly) * (1 + (1 - Math.min(1, press || 1)) * 0.2) * (fly < 1 ? 1 + Math.sin(fly * Math.PI) * 0.25 : 1)})`}}>
          <div style={{width: 160, height: 160, borderRadius: 38, background: PAL.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: '50% 100%',
            transform: `rotateX(${peel * 38 * (1 - fly)}deg)`, boxShadow: lift(0.15 + peel * 0.5 * (1 - (press ? 1 : 0))), outline: '6px solid #fff'}}>
            <Mark size={130} hex={PAL.green} />
          </div>
        </div>
      ) : null}
      <Hand text="installs from the browser" at={I + 52} x={X + 500} y={Y + 180} size={66} color={PAINT} font={FONT.marker} rot={-4} seed="ih" cps={26} />
    </>
  );
};

export const MatScenes: React.FC = () => (
  <>
    <Ledger />
    <Tenant />
    <Repairs />
    <Visitors />
    <Install />
  </>
);
export {clamp01, random};
