// Scenes 5 to 7: the owner's Overview assembling itself, all 33 units, and
// Monthly Income recording a payment live, down to the second-payment warning.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Download, Plus} from 'lucide-react';
import {C, jakarta} from '../theme';
import {camera, count, easeInOut, flyIn, lerp, peso, pop, t01, typed} from '../anim';
import {Bg, Head, Stage} from '../fx';
import {Btn, Cursor, Ripple, Tile} from '../ui/Kit';
import {AttentionTile, ChartTile, ClustersTile, CollectedTile, ConfirmDialog, LedgerHead, LedgerRow, LedgerRowData, OccupancyTile, OverviewHead, RecordModal, UnitCard} from '../ui/Admin';
import {Sfx, Ticks, Typing} from '../Sfx';

const Piece: React.FC<{f: number; at: number; x: number; y: number; children: React.ReactNode; from?: Parameters<typeof flyIn>[2]; shadow?: boolean}> = ({f, at, x, y, children, from, shadow = true}) => (
  <div style={{position: 'absolute', left: x, top: y, ...flyIn(f, at, from)}}>
    <div style={{borderRadius: 24, boxShadow: shadow ? '0 30px 70px rgba(15,27,21,0.10)' : undefined}}>{children}</div>
  </div>
);

// The screen sits right of centre and bleeds off the edge; the headline column
// on the left keeps a soft wash behind it so the words always read.
export const RightStage: React.FC<{children: React.ReactNode; shift?: number}> = ({children, shift = 330}) => (
  <AbsoluteFill style={{transform: `translateX(${shift}px)`}}>{children}</AbsoluteFill>
);
// Depth of field: whatever passes behind the headline is blurred and softened,
// sharp again by the middle of the frame.
export const Wash: React.FC<{opacity?: number}> = ({opacity = 1}) => (
  <AbsoluteFill style={{opacity}}>
    <AbsoluteFill style={{backdropFilter: 'blur(14px)', WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 34%, transparent 54%)', maskImage: 'linear-gradient(90deg, #000 0%, #000 34%, transparent 54%)'}} />
    <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(241,245,242,0.92) 0%, rgba(241,245,242,0.82) 32%, rgba(241,245,242,0) 54%)'}} />
  </AbsoluteFill>
);
const OWNER = 'For the landlady';

// 5. The Overview builds itself tile by tile while the camera flies over it.
export const Overview: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f, [
    {at: 0, x: 527, y: 470, s: 0.92, rx: 34, rz: -16, z: -150},
    {at: 50, x: 215, y: 270, s: 1.95, rx: 10, rz: -4, dur: 44},
    {at: 106, x: 640, y: 270, s: 1.9, rx: 8, rz: -2, dur: 34},
    {at: 148, x: 360, y: 660, s: 1.62, rx: 9, rz: 3, dur: 38},
    {at: 204, x: 527, y: 520, s: 0.98, rx: 0, rz: 0, dur: 46},
  ]);
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={66} />
      <RightStage>
        <Stage cam={cam} w={1054} h={876}>
          <Piece f={f} at={4} x={0} y={0} shadow={false}><OverviewHead f={f} at={8} /></Piece>
          <Piece f={f} at={10} x={0} y={100}><AttentionTile f={f} at={62} /></Piece>
          <Piece f={f} at={16} x={446} y={100}><CollectedTile f={f} at={110} /></Piece>
          <Piece f={f} at={22} x={802} y={100}><OccupancyTile f={f} at={116} /></Piece>
          <Piece f={f} at={28} x={0} y={456}><ChartTile f={f} at={146} /></Piece>
          <Piece f={f} at={34} x={713} y={456}><ClustersTile f={f} at={160} /></Piece>
        </Stage>
      </RightStage>
      <Wash />
      <Head kicker={`${OWNER} · Overview`} text={'What needs her,\nfirst.'} accent={['first.']} sub="Payments to verify and urgent repairs lead the screen she opens first." at={8} out={100} />
      <Head kicker={`${OWNER} · Overview`} text={'Money in,\nas it is recorded.'} accent={['Money']} sub="Every payment she enters moves the month's total." at={110} out={186} />
      <Head kicker={`${OWNER} · Overview`} text={'Her whole year,\nat a glance.'} accent={['year,']} sub="Collections month by month, and how full each cluster is." at={196} />
      <Sfx at={0} name="whoosh-low" vol={0.5} />
      {[10, 16, 22, 28, 34].map((a) => <Sfx key={a} at={a} name="pop" vol={0.28} />)}
      <Sfx at={50} name="whoosh" vol={0.25} />
      <Sfx at={68} name="ping" vol={0.35} />
      <Sfx at={106} name="whoosh" vol={0.22} />
      <Ticks at={114} dur={36} />
      <Sfx at={148} name="whoosh" vol={0.22} />
      <Ticks at={152} dur={30} vol={0.16} />
      <Sfx at={204} name="whoosh-low" vol={0.35} />
    </AbsoluteFill>
  );
};

// 6. A wall of all 33 units flipping in, and one of them stepping forward.
const UNITS: [string, string, string | null, number][] = [
  ['1A', 'Studio', 'Andrea Villanueva', 4500], ['1B', 'Studio', 'Paolo Dimayuga', 4500], ['1C', 'Studio', 'Kristine Salcedo', 4800], ['1D', 'Studio', 'Mark Lorenzo', 4800],
  ['1E', 'Studio', 'Bea Magbanua', 4500], ['1F', 'Studio', 'Joshua Ramirez', 4500], ['1G', 'Studio', 'Ella Cordero', 4800], ['1H', 'Studio', 'Carlo Buenaflor', 4500],
  ['2A', 'One-bedroom', 'Nicole Ong', 6000], ['2B', 'Studio', 'Renzo Abrenica', 4800], ['2C', 'Studio', 'Trisha Delos Santos', 4500],
  ['2D', 'Studio', 'Miguel Santiago', 4800], ['2E', 'Studio', 'Angela Pascual', 4500], ['2F', 'Studio', 'Jerome Taduran', 4800], ['2G', 'Studio', 'Hazel Obias', 4500],
  ['3A', 'One-bedroom', 'Patrick Lomibao', 6000], ['3B', 'Studio', 'Czarina Bañez', 4800], ['3C', 'Studio', 'Ramon Estrella', 4500], ['3D', 'Studio', 'Faith Nuñez', 4800],
  ['3E', 'Studio', 'Gian Rebusi', 4500], ['3F', 'Studio', 'Liza Moreno', 4800], ['3G', 'Studio', 'Denver Arcilla', 4500],
  ['B1F', 'One-bedroom', 'Rowena Sabio', 6500], ['B2F', 'One-bedroom', 'Antonio Brizuela', 6500], ['B2B', 'One-bedroom', 'Clarisse Gonzaga', 6500],
  ['B3F', 'Two-bedroom', 'Edgar Monte', 8500], ['B3B', 'Two-bedroom', null, 8500], ['PH', 'Three-bedroom', 'Victoria Lim', 12000],
  ['F1', 'One-bedroom', 'Noel Bitancor', 6500], ['F2F', 'Two-bedroom', 'Sheila Oreta', 9000], ['F2B', 'Two-bedroom', 'Adrian Molato', 9000],
  ['LF', 'One-bedroom', 'Josefina Nieva', 6000], ['LB', 'One-bedroom', 'Ramil Balingbing', 5500],
];
export const Rooms: React.FC = () => {
  const f = useCurrentFrame();
  const cols = 11;
  const cam = camera(f, [
    {at: 0, x: 1413, y: 321, s: 0.6, rx: 54, rz: -26},
    {at: 20, x: 980, y: 321, s: 0.68, rx: 50, rz: -22, dur: 70},
    {at: 92, x: 121, y: 110, s: 1.75, rx: 0, rz: 0, dur: 42},
  ]);
  const lift = pop(f, 100, {damping: 15, stiffness: 140});
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={66} />
      <RightStage shift={300}>
      <Stage cam={cam} w={cols * 257} h={3 * 214}>
        {UNITS.map(([code, type, who, rent], i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const at = 2 + (col + row) * 2.2;
          const p = pop(f, at, {damping: 16, stiffness: 150});
          const isLift = i === 0;
          const dim = isLift ? 0 : t01(f, 96, 116) * 0.55;
          return (
            <div key={code} style={{position: 'absolute', left: col * 257, top: row * 214, transformStyle: 'preserve-3d', opacity: Math.min(1, p * 2) * (1 - dim),
              transform: `translateZ(${isLift ? lift * 220 : 0}px) rotateX(${(1 - p) * -95}deg) scale(${isLift ? 1 + lift * 0.18 : 1})`, transformOrigin: 'center bottom'}}>
              <UnitCard code={code} type={type} tenant={who ?? '—'} rent={rent} vacant={!who}
                style={{boxShadow: isLift ? `0 ${40 * lift}px ${80 * lift}px rgba(15,27,21,${0.25 * lift})` : '0 10px 30px rgba(15,27,21,0.06)'}} />
            </div>
          );
        })}
      </Stage>
      </RightStage>
      <Wash />
      <Head kicker={`${OWNER} · Rooms and rates`} text={'All 33 units,\nin one place.'} accent={['33']} sub="Every unit in its cluster, whether it is occupied or vacant." at={8} out={90} />
      <Head kicker={`${OWNER} · Rooms and rates`} text={'Who lives where,\nand for how much.'} accent={['where,']} sub="Each unit's tenant and monthly rent, kept on one record." at={98} />
      <Ticks at={2} dur={46} vol={0.18} />
      <Sfx at={20} name="whoosh-low" vol={0.4} />
      <Sfx at={92} name="whoosh" vol={0.3} />
      <Sfx at={102} name="pop" vol={0.35} />
    </AbsoluteFill>
  );
};

// 7. Monthly Income: the ledger fills in, then a payment is recorded for real.
const ROWS: LedgerRowData[] = [
  {unit: '1a', paid: 'Sep 4, 2026', period: 'Sep 5 – Oct 4', who: 'Andrea Villanueva', or: '5089', rent: 4500, water: 200, heads: 1, garbage: 50},
  {unit: '1b', paid: 'Sep 10, 2026', period: 'Sep 12 – Oct 11', who: 'Paolo Dimayuga', or: '5090', rent: 4500, water: 400, heads: 2, garbage: 50},
  {unit: '1c', paid: 'Sep 2, 2026', period: 'Sep 3 – Oct 2', who: 'Kristine Salcedo', or: '5091', rent: 4800, water: 400, heads: 2, garbage: 50},
  {unit: '1e', paid: 'Sep 7, 2026', period: 'Sep 8 – Oct 7', who: 'Bea Magbanua', or: '5092', rent: 4500, water: 400, heads: 2, garbage: 50},
  {unit: '2a', paid: 'Sep 9, 2026', period: 'Sep 10 – Oct 9', who: 'Nicole Ong', or: '5075', rent: 6000, water: 600, heads: 3, garbage: 50},
  {unit: '2b', paid: 'Sep 5, 2026', period: 'Sep 7 – Oct 6', who: 'Renzo Abrenica', or: '5076', rent: 4800, water: 200, heads: 1, garbage: 50},
  {unit: '2e', paid: 'Sep 1, 2026', period: 'Sep 2 – Oct 1', who: 'Angela Pascual', or: '5078', rent: 4500, water: 400, heads: 2, garbage: 50},
];
export const Income: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f, [
    {at: 0, x: 318, y: 430, s: 1.12, rx: 16, rz: -5},
    {at: 50, x: 330, y: 610, s: 1.18, rx: 8, rz: -2, dur: 50},
    {at: 104, x: 780, y: 62, s: 1.6, rx: 0, rz: 0, dur: 26},
  ]);
  // The dialog, placed on the right at 1.25x; positions below are its own pixels.
  const MX = 880, MY = 110, MS = 1.25;
  const m = (x: number, y: number) => ({x: MX + x * MS, y: MY + y * MS});
  const modalP = pop(f, 134, {damping: 17, stiffness: 170});
  const unitOpen = t01(f, 160, 170) * (1 - t01(f, 188, 194));
  const chosen = f >= 190;
  const orText = typed('5120', f, 212, 3);
  const confirmP = pop(f, 248, {damping: 15, stiffness: 180});
  const dim = t01(f, 134, 146) * 0.45;

  // The pointer's path, in screen pixels.
  const path: [number, number, number][] = [
    [100, 1580, 940], [118, 1320, 545], [150, m(384, 167).x, m(384, 167).y], [176, m(220, 337).x, m(220, 337).y],
    [198, m(564, 357).x, m(564, 357).y], [230, m(651, 612).x, m(651, 612).y],
  ];
  let cx = path[0][1], cy = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const t = t01(f, path[i][0], path[i][0] + 16, easeInOut);
    cx = lerp(cx, path[i][1], t); cy = lerp(cy, path[i][2], t);
  }
  const clicks = [132, 162, 188, 208, 246];
  const press = Math.max(...clicks.map((c) => t01(f, c - 3, c) * (1 - t01(f, c, c + 6))));
  const ripple = clicks.map((c) => t01(f, c, c + 16));

  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={66} />
      <Stage cam={cam} w={1100} h={960}>
        <Piece f={f} at={2} x={0} y={0} shadow={false}>
          <div style={{width: 1100, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: jakarta, color: C.ink}}>
            <div>
              <div style={{fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: C.inkSoft}}>ADMIN</div>
              <div style={{fontSize: 34, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4}}>Monthly Income</div>
              <div style={{fontSize: 15, color: C.inkSoft, marginTop: 4}}>Every payment received, unit by unit.</div>
            </div>
            <div style={{display: 'flex', gap: 10}}>
              <Btn kind="plain" icon={<Download size={16} />}>Download 2026 for Excel</Btn>
              <Btn kind="brand" icon={<Plus size={16} />} press={f < 140 ? press : 0}>Record payment</Btn>
            </div>
          </div>
        </Piece>
        <Piece f={f} at={6} x={0} y={120}>
          <Tile tone="night" title="Collected altogether" w={330} h={236}>
            <div style={{fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, 12, 50, 1715600))}</div>
            <div style={{fontSize: 15, color: C.onNightSoft, lineHeight: '22px'}}>Rent, water and garbage, from {count(f, 12, 50, 282)} payments</div>
          </Tile>
        </Piece>
        {[['Rent', 1594400, 'The full rent from every payment', C.ink], ['Water', 108000, '₱200 a head, each month', C.ink],
          ['50% Share', 461700, "Half of each BH payment's rent, worked out automatically", C.verify]].map(([t, v, s, col], i) => (
          <Piece key={t as string} f={f} at={10 + i * 4} x={346 + i * 256} y={120}>
            <Tile title={t as string} w={240} h={236}>
              <div style={{fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: col as string, fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, 14 + i * 4, 46, v as number))}</div>
              <div style={{fontSize: 14, color: C.inkSoft, lineHeight: '21px'}}>{s as string}</div>
            </Tile>
          </Piece>
        ))}
        <Piece f={f} at={16} x={0} y={380}>
          <div style={{width: 1100, borderRadius: 24, background: C.tile, overflow: 'hidden', paddingBottom: 8}}>
            <LedgerHead />
            {ROWS.map((r, i) => {
              const at = 24 + i * 8;
              const p = pop(f, at, {damping: 18, stiffness: 170});
              return <LedgerRow key={r.or} r={r} flash={(1 - t01(f, at + 4, at + 30)) * (f >= at ? 1 : 0)}
                style={{opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 80}px)`}} />;
            })}
          </div>
        </Piece>
      </Stage>
      <AbsoluteFill style={{background: C.night, opacity: dim}} />
      <Wash />
      <Head kicker={`${OWNER} · Monthly Income`} text={'Her own ledger,\nher own layout.'} accent={['ledger,']} width={720} size={86}
        sub="Rent, water and garbage per unit, laid out like her workbook, totals worked out." at={8} out={96} />
      <Head kicker={`${OWNER} · Record payment`} text={'Every receipt,\nher number.'} accent={['receipt,']} width={720} size={86}
        sub="The number from her paper receipt book goes on the record." at={140} out={244} />
      <Head kicker={`${OWNER} · Record payment`} text={'Paid twice?\nIt asks first.'} accent={['twice?']} width={720} size={86}
        sub="A second payment for the same unit and month is flagged before it is saved." at={254} />
      {f >= 134 ? (
        <div style={{position: 'absolute', left: MX, top: MY, transformOrigin: '100% 0', transform: `scale(${MS * lerp(0.3, 1, modalP)})`, opacity: Math.min(1, modalP * 2)}}>
          <RecordModal f={f} unit={chosen ? '2B, Renzo Abrenica (BH)' : '1A, Andrea Villanueva (BH)'} unitOpen={unitOpen}
            rent={chosen ? '4800' : '4500'} water="200" or={orText} orFocus={f >= 208 && f < 246} total={chosen ? '₱5,000.00' : '₱4,700.00'}
            press={f >= 240 && f < 252 ? press : 0} />
        </div>
      ) : null}
      {f >= 248 ? (
        <>
          <AbsoluteFill style={{background: C.night, opacity: t01(f, 248, 258) * 0.35}} />
          <div style={{position: 'absolute', left: MX + 150, top: 140, transformOrigin: '50% 50%', transform: `scale(${1.4 * lerp(0.6, 1, confirmP)})`, opacity: Math.min(1, confirmP * 2)}}>
            <ConfirmDialog f={f} at={248} />
          </div>
        </>
      ) : null}
      {f >= 100 && f < 262 ? (
        <>
          {clicks.map((c, i) => <Ripple key={c} x={cx} y={cy} p={ripple[i]} />)}
          <Cursor x={cx} y={cy} press={press} size={40} opacity={t01(f, 100, 108)} />
        </>
      ) : null}
      {ROWS.map((_, i) => <Sfx key={i} at={24 + i * 8} name="tick" vol={0.3} />)}
      <Ticks at={12} dur={46} vol={0.12} />
      <Sfx at={104} name="whoosh" vol={0.28} />
      {clicks.map((c) => <Sfx key={`c${c}`} at={c - 1} name="click" vol={0.7} />)}
      <Sfx at={134} name="whoosh" vol={0.35} />
      <Sfx at={134} name="pop" vol={0.3} />
      <Typing at={212} chars={4} perChar={3} />
      <Sfx at={248} name="pop" vol={0.3} />
      <Sfx at={256} name="warn" vol={0.6} />
    </AbsoluteFill>
  );
};
