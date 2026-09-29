// For the landlady: the Overview assembling itself, all 33 units, and Monthly
// Income recording a payment down to the second-payment warning. Headlines
// stay in the text column; the app stays in the visual zone to its right.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Download, Plus} from 'lucide-react';
import {C, jakarta} from '../theme';
import {camera, cameraAt, Cam, count, easeInOut, flyIn, lerp, peso, pop, t01} from '../anim';
import {Bg, GRID, Head, Stage} from '../fx';
import {Btn, Cursor, Ripple, Tile} from '../ui/Kit';
import {AttentionTile, ChartTile, ClustersTile, CollectedTile, ConfirmDialog, LedgerHead, LedgerRow, LedgerRowData, OccupancyTile, OverviewHead, RecordModal, UnitCard} from '../ui/Admin';
import {Cues} from '../Sfx';
import {typedOf} from '../typing.mjs';

const CX = GRID.visCX;
const ZONE_MASK = 'linear-gradient(90deg, transparent 0, transparent 800px, #000 900px)';
const DIM_MASK = 'linear-gradient(90deg, transparent 0, transparent 760px, #000 1040px)';

// The visual zone: the stage fades out before it reaches the text column.
export const Zone: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{WebkitMaskImage: ZONE_MASK, maskImage: ZONE_MASK}}>{children}</AbsoluteFill>
);

const Piece: React.FC<{f: number; at: number; x: number; y: number; children: React.ReactNode; shadow?: boolean}> = ({f, at, x, y, children, shadow = true}) => (
  <div style={{position: 'absolute', left: x, top: y, ...flyIn(f, at)}}>
    <div style={{borderRadius: 24, boxShadow: shadow ? '0 30px 70px rgba(15,27,21,0.09)' : undefined}}>{children}</div>
  </div>
);

// Where a stage point lands on screen, for a flat (untilted) camera.
const toScreen = (f: number, keys: Cam[], x: number, y: number) => {
  const v = cameraAt(f, keys);
  return {x: CX + (x - v.x) * v.s, y: 540 + (y - v.y) * v.s};
};

// ---- Overview -------------------------------------------------------------------
export const Overview: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f, [
    {at: 0, x: 527, y: 438, s: 0.78, rx: 30, rz: -12},
    {at: 30, x: 527, y: 438, s: 0.8, rx: 18, rz: -6, dur: 70},
    {at: 96, x: 215, y: 270, s: 1.45, rx: 4, rz: -1, dur: 60},
    {at: 150, x: 616, y: 270, s: 1.45, rx: 3, rz: 0, dur: 56},
    {at: 206, x: 527, y: 666, s: 0.86, rx: 0, rz: 0, dur: 60},
  ], 2, CX);
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={70} />
      <Zone>
        <Stage cam={cam} w={1054} h={876}>
          <Piece f={f} at={2} x={0} y={0} shadow={false}><OverviewHead f={f} at={6} /></Piece>
          <Piece f={f} at={8} x={0} y={100}><AttentionTile f={f} at={140} /></Piece>
          <Piece f={f} at={16} x={446} y={100}><CollectedTile f={f} at={160} /></Piece>
          <Piece f={f} at={24} x={802} y={100}><OccupancyTile f={f} at={60} /></Piece>
          <Piece f={f} at={32} x={0} y={456}><ChartTile f={f} at={226} /></Piece>
          <Piece f={f} at={40} x={713} y={456}><ClustersTile f={f} at={70} /></Piece>
        </Stage>
      </Zone>
      <Head size={100} text={'What needs her,\nfirst.'} accent={['first.']} at={16} out={138} />
      <Head size={100} text={'Every peso,\ncounted.'} accent={['peso,']} at={150} />
      <Cues scene="overview" />
    </AbsoluteFill>
  );
};

// ---- Rooms and rates -----------------------------------------------------------
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
    {at: 0, x: 1413, y: 321, s: 0.52, rx: 50, rz: -24},
    {at: 16, x: 1150, y: 321, s: 0.57, rx: 46, rz: -20, dur: 80},
    {at: 98, x: 121, y: 110, s: 1.55, rx: 0, rz: 0, dur: 58},
  ], 2, CX);
  const lift = pop(f, 140, {damping: 20, stiffness: 80});
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={70} />
      <Zone>
        <Stage cam={cam} w={cols * 257} h={3 * 214}>
          {UNITS.map(([code, type, who, rent], i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const p = pop(f, 20 + (col + row) * 3, {damping: 20, stiffness: 90});
            const isLift = i === 0;
            const dim = isLift ? 0 : t01(f, 134, 160) * 0.5;
            return (
              <div key={code} style={{position: 'absolute', left: col * 257, top: row * 214, transformStyle: 'preserve-3d', opacity: Math.min(1, p * 1.6) * (1 - dim),
                transform: `translateZ(${isLift ? lift * 160 : 0}px) rotateX(${(1 - p) * -90}deg) scale(${isLift ? 1 + lift * 0.12 : 1})`, transformOrigin: 'center bottom'}}>
                <UnitCard code={code} type={type} tenant={who ?? '—'} rent={rent} vacant={!who}
                  style={{boxShadow: isLift ? `0 ${36 * lift}px ${70 * lift}px rgba(15,27,21,${0.22 * lift})` : '0 10px 30px rgba(15,27,21,0.05)'}} />
              </div>
            );
          })}
        </Stage>
      </Zone>
      <Head size={100} text={'Every unit,\none place.'} accent={['one']} at={12} out={94} />
      <Head size={100} text={'Every tenant.\nEvery rate.'} accent={['rate.']} at={106} />
      <Cues scene="rooms" />
    </AbsoluteFill>
  );
};

// ---- Monthly Income -------------------------------------------------------------
const ROWS: LedgerRowData[] = [
  {unit: '1a', paid: 'Sep 4, 2026', period: 'Sep 5 – Oct 4', who: 'Andrea Villanueva', or: '5089', rent: 4500, water: 200, heads: 1, garbage: 50},
  {unit: '1b', paid: 'Sep 10, 2026', period: 'Sep 12 – Oct 11', who: 'Paolo Dimayuga', or: '5090', rent: 4500, water: 400, heads: 2, garbage: 50},
  {unit: '1c', paid: 'Sep 2, 2026', period: 'Sep 3 – Oct 2', who: 'Kristine Salcedo', or: '5091', rent: 4800, water: 400, heads: 2, garbage: 50},
  {unit: '1e', paid: 'Sep 7, 2026', period: 'Sep 8 – Oct 7', who: 'Bea Magbanua', or: '5092', rent: 4500, water: 400, heads: 2, garbage: 50},
  {unit: '2a', paid: 'Sep 9, 2026', period: 'Sep 10 – Oct 9', who: 'Nicole Ong', or: '5075', rent: 6000, water: 600, heads: 3, garbage: 50},
  {unit: '2b', paid: 'Sep 5, 2026', period: 'Sep 7 – Oct 6', who: 'Renzo Abrenica', or: '5076', rent: 4800, water: 200, heads: 1, garbage: 50},
];
export const Income: React.FC = () => {
  const f = useCurrentFrame();
  const keys: Cam[] = [
    {at: 0, x: 550, y: 430, s: 0.7, rx: 14, rz: -4},
    {at: 30, x: 550, y: 520, s: 0.76, rx: 0, rz: 0, dur: 70},
  ];
  const cam = camera(f, keys, 2, CX);
  const MZ = 1.1, MX = CX - (768 * MZ) / 2, MY = 175;
  const m = (x: number, y: number) => ({x: MX + x * MZ, y: MY + y * MZ});
  const btn = toScreen(Math.max(f, 100), keys, 1005, 62);
  const modalP = pop(f, 128, {damping: 20, stiffness: 110});
  const unitOpen = t01(f, 170, 182) * (1 - t01(f, 208, 216));
  const chosen = f >= 210;
  const orText = typedOf('or', f);
  const confirmP = pop(f, 294, {damping: 20, stiffness: 110});
  const dim = t01(f, 128, 146) * 0.2;

  const path: [number, number, number][] = [
    [100, 1780, 1000], [106, btn.x, btn.y], [150, m(384, 167).x, m(384, 167).y], [188, m(220, 337).x, m(220, 337).y],
    [220, m(564, 357).x, m(564, 357).y], [268, m(651, 612).x, m(651, 612).y],
  ];
  let cx = path[0][1], cy = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const t = t01(f, path[i][0], path[i][0] + 22, easeInOut);
    cx = lerp(cx, path[i][1], t); cy = lerp(cy, path[i][2], t);
  }
  const clicks = [124, 168, 206, 234, 288];
  const press = Math.max(...clicks.map((c) => t01(f, c - 3, c) * (1 - t01(f, c, c + 7))));

  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={70} />
      <Zone>
        <Stage cam={cam} w={1100} h={900}>
          <Piece f={f} at={2} x={0} y={0} shadow={false}>
            <div style={{width: 1100, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: jakarta, color: C.ink}}>
              <div>
                <div style={{fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: C.inkSoft}}>ADMIN</div>
                <div style={{fontSize: 34, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4}}>Monthly Income</div>
                <div style={{fontSize: 15, color: C.inkSoft, marginTop: 4}}>Every payment received, unit by unit.</div>
              </div>
              <div style={{display: 'flex', gap: 10}}>
                <Btn kind="plain" icon={<Download size={16} />}>Download 2026 for Excel</Btn>
                <Btn kind="brand" icon={<Plus size={16} />} press={f < 132 ? press : 0}>Record payment</Btn>
              </div>
            </div>
          </Piece>
          <Piece f={f} at={8} x={0} y={120}>
            <Tile tone="night" title="Collected altogether" w={330} h={236}>
              <div style={{fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, 16, 70, 1715600))}</div>
              <div style={{fontSize: 15, color: C.onNightSoft, lineHeight: '22px'}}>Rent, water and garbage, from {count(f, 16, 70, 282)} payments</div>
            </Tile>
          </Piece>
          {[['Rent', 1594400, 'The full rent from every payment', C.ink], ['Water', 108000, '₱200 a head, each month', C.ink],
            ['50% Share', 461700, "Half of each BH payment's rent, worked out automatically", C.verify]].map(([t, v, s, col], i) => (
            <Piece key={t as string} f={f} at={14 + i * 6} x={346 + i * 256} y={120}>
              <Tile title={t as string} w={240} h={236}>
                <div style={{fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: col as string, fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, 20 + i * 6, 64, v as number))}</div>
                <div style={{fontSize: 14, color: C.inkSoft, lineHeight: '21px'}}>{s as string}</div>
              </Tile>
            </Piece>
          ))}
          <Piece f={f} at={24} x={0} y={380}>
            <div style={{width: 1100, borderRadius: 24, background: C.tile, overflow: 'hidden', paddingBottom: 8}}>
              <LedgerHead />
              {ROWS.map((r, i) => {
                const at = 36 + i * 11;
                const p = pop(f, at, {damping: 20, stiffness: 100});
                return <LedgerRow key={r.or} r={r} flash={(1 - t01(f, at + 6, at + 40)) * (f >= at ? 0.9 : 0)}
                  style={{opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - p) * 60}px)`}} />;
              })}
            </div>
          </Piece>
        </Stage>
      </Zone>
      <AbsoluteFill style={{background: C.night, opacity: dim, WebkitMaskImage: DIM_MASK, maskImage: DIM_MASK}} />
      <Head size={100} text={'Her ledger.\nHer layout.'} accent={['ledger.']} at={14} out={116} />
      <Head size={100} text={'Her receipt\nnumbers, kept.'} accent={['kept.']} at={138} out={284} />
      <Head size={100} text={'Paid twice?\nIt asks first.'} accent={['twice?']} at={298} />
      {f >= 128 ? (
        <div style={{position: 'absolute', left: MX / MZ, top: MY / MZ, zoom: MZ, transformOrigin: '100% 0', transform: `scale(${lerp(0.4, 1, modalP)})`, opacity: Math.min(1, modalP * 1.6)}}>
          <RecordModal f={f} unit={chosen ? '2B, Renzo Abrenica (BH)' : '1A, Andrea Villanueva (BH)'} unitOpen={unitOpen}
            rent={chosen ? '4800' : '4500'} water="200" or={orText} orFocus={f >= 234 && f < 288} total={chosen ? '₱5,000.00' : '₱4,700.00'}
            press={f >= 282 && f < 296 ? press : 0} />
        </div>
      ) : null}
      {f >= 294 ? (
        <>
          <AbsoluteFill style={{background: C.night, opacity: t01(f, 294, 306) * 0.16, WebkitMaskImage: DIM_MASK, maskImage: DIM_MASK}} />
          <div style={{position: 'absolute', left: (CX - (448 * 1.3) / 2) / 1.3, top: 150 / 1.3, zoom: 1.3, transform: `scale(${lerp(0.7, 1, confirmP)})`, opacity: Math.min(1, confirmP * 1.6)}}>
            <ConfirmDialog f={f} at={294} />
          </div>
        </>
      ) : null}
      {f >= 100 && f < 310 ? (
        <>
          {clicks.map((c) => <Ripple key={c} x={cx} y={cy} p={t01(f, c, c + 18)} />)}
          <Cursor x={cx} y={cy} press={press} size={40} opacity={t01(f, 100, 110) * (1 - t01(f, 298, 308))} />
        </>
      ) : null}
      <Cues scene="income" />
    </AbsoluteFill>
  );
};
