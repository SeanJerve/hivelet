// For the landlady: her whole workspace assembling itself, every unit by cluster, and Monthly
// Income recording a payment down to the second-payment warning. Headlines stay in the text
// column; the app stays in the visual zone to its right.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {GL} from '../theme';
import {camera, cameraAt, Cam, easeInOut, flyIn, gentle, lerp, pop, t01, useFrame} from '../anim';
import {ActionCam, Bg, Focus, GRID, Head, Stage} from '../fx';
import {Cursor, Ripple, under} from '../ui/Kit';
import {AttentionSection, ByClusterTile, CELL, CHART_W, CLUSTER_HEAD_H, CONFIRM_W, ClusterHead, ConfirmDialog, INCOME_HEAD_H, IncomeExpensesTile, IncomeHead, LEDGER_HEAD_H, LedgerCardHead, LedgerHead, LedgerRow,
  LedgerRowData, MAIN_W, OCC_W, OccupancySection, OverviewHead, RECORD, RECORDS_BAR_H, RecordModal, RecordsBar, RentMonthTile, RentSection, SHEET_W, SIDEBAR_W, Sidebar, UnitCell} from '../ui/Admin';
import {Cues} from '../Sfx';
import {typedOf} from '../typing.mjs';

const CX = GRID.visCX;
const ZONE_MASK = 'linear-gradient(90deg, transparent 0, transparent 800px, #000 900px)';

// The visual zone: the stage fades out before it reaches the text column.
export const Zone: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{WebkitMaskImage: ZONE_MASK, maskImage: ZONE_MASK}}>{children}</AbsoluteFill>
);

const Piece: React.FC<{f: number; at: number; x: number; y: number; children: React.ReactNode}> = ({f, at, x, y, children}) => (
  <div style={{position: 'absolute', left: x, top: y, ...flyIn(f, at)}}>{children}</div>
);

// Where a stage point lands on screen, for a flat (untilted) camera.
const toScreen = (f: number, keys: Cam[], x: number, y: number) => {
  const v = cameraAt(f, keys);
  return {x: CX + (x - v.x) * v.s, y: 540 + (y - v.y) * v.s};
};

// ---- Overview -------------------------------------------------------------------
// The stage is her whole workspace: the sidebar, and beside it the page. The page's sections
// sit where the app puts them (AdminOverviewView.vue's twelve-column grid at 1440 wide).
const PAGE_X = SIDEBAR_W + 32;
const OV = {attention: 147, rent: 424, lower: 731, h: 1190};
export const Overview: React.FC = () => {
  const f = useFrame();
  // The whole workspace first; then close on what needs her (payments to verify and urgent
  // repairs), on the month's rent and who is due this week, and on the year by month.
  // The zone shows a stage point from 440px left of its centre to 580px right of it, so each close
  // key is centred to put the left edge of what it reads at the zone's left edge.
  const near = (left: number, s: number) => left + 440 / s;
  const cam = camera(f, [
    {at: 0, x: 664, y: 590, s: 0.66, rx: 30, rz: -12},
    {at: 30, x: 664, y: 600, s: 0.74, rx: 16, rz: -5, dur: 70},
    {at: 96, x: near(PAGE_X - 8, 1.45), y: OV.attention + 118, s: 1.45, rx: 4, rz: -1, dur: 48},
    {at: 150, x: near(PAGE_X - 8, 1.45), y: OV.rent + 150, s: 1.45, rx: 3, rz: 0, dur: 50},
    {at: 200, x: near(PAGE_X + OCC_W + 8, 1.3), y: OV.lower + 228, s: 1.3, rx: 0, rz: 0, dur: 44},
  ], 2, CX);
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={70} />
      <Zone>
        <Stage cam={cam} w={PAGE_X + MAIN_W} h={OV.h}>
          <Piece f={f} at={8} x={0} y={0}><div style={{opacity: 1 - t01(f, 96, 116)}}><Sidebar f={f} at={10} /></div></Piece>
          <Piece f={f} at={2} x={PAGE_X} y={0}><OverviewHead f={f} at={6} /></Piece>
          <Piece f={f} at={16} x={PAGE_X} y={OV.attention}><AttentionSection f={f} at={126} /></Piece>
          <Piece f={f} at={24} x={PAGE_X} y={OV.rent}><RentSection f={f} at={34} dueAt={176} /></Piece>
          <Piece f={f} at={32} x={PAGE_X} y={OV.lower}><div style={{opacity: 1 - 0.9 * t01(f, 204, 228)}}><OccupancySection f={f} at={60} /></div></Piece>
          <Piece f={f} at={40} x={PAGE_X + OCC_W + 16} y={OV.lower}><IncomeExpensesTile f={f} at={226} /></Piece>
        </Stage>
      </Zone>
      <Head size={100} text={'What needs her,\nfirst.'} accent={['first.']} at={16} out={138} />
      <Head size={100} text={'Every peso,\ncounted.'} accent={['peso,']} at={150} />
      <Cues scene="overview" />
    </AbsoluteFill>
  );
};

// ---- Rooms and rates -----------------------------------------------------------
// The 33 units as the page lists them: by cluster, four to a row. Code, kind, tenant, how many
// live there (one tenant is named, the rest are roommates) and the monthly rent. Sample people
// and rates; the unit codes, clusters and kinds are the property's own.
type U = [string, string, string | null, number, number];
const CLUSTERS: [string, U[]][] = [
  ['Boarding House', [
    ['1A', 'Studio', 'Andrea Villanueva', 1, 4500], ['1B', 'Studio', 'Paolo Dimayuga', 2, 4500], ['1C', 'Studio', 'Kristine Salcedo', 2, 4800], ['1D', 'Studio', 'Mark Lorenzo', 1, 4800],
    ['1E', 'Studio', 'Bea Magbanua', 2, 4500], ['1F', 'Studio', 'Joshua Ramirez', 1, 4500], ['1G', 'Studio', 'Ella Cordero', 2, 4800], ['1H', 'Studio', 'Carlo Buenaflor', 1, 4500],
    ['2A', 'One-bedroom', 'Nicole Ong', 3, 6000], ['2B', 'Studio', 'Renzo Abrenica', 1, 4800], ['2C', 'Studio', 'Trisha Delos Santos', 2, 4500], ['2D', 'Studio', 'Miguel Santiago', 1, 4800],
    ['2E', 'Studio', 'Angela Pascual', 2, 4500], ['2F', 'Studio', 'Jerome Taduran', 1, 4800], ['2G', 'Studio', 'Hazel Obias', 2, 4500], ['3A', 'One-bedroom', 'Patrick Lomibao', 3, 6000],
    ['3B', 'Studio', 'Czarina Bañez', 1, 4800], ['3C', 'Studio', 'Ramon Estrella', 2, 4500], ['3D', 'Studio', 'Faith Nuñez', 1, 4800], ['3E', 'Studio', 'Gian Rebusi', 2, 4500],
    ['3F', 'Studio', 'Liza Moreno', 1, 4800], ['3G', 'Studio', 'Denver Arcilla', 2, 4500],
  ]],
  ['Back Apartment', [
    ['B1F', 'One-bedroom', 'Rowena Sabio', 3, 6500], ['B2B', 'One-bedroom', 'Clarisse Gonzaga', 2, 6500], ['B2F', 'One-bedroom', 'Antonio Brizuela', 3, 6500], ['B3B', 'Two-bedroom', null, 0, 8500],
    ['B3F', 'Two-bedroom', 'Edgar Monte', 4, 8500],
  ]],
  ['Penthouse', [['PH', 'Three-bedroom', 'Victoria Lim', 4, 12000]]],
  ['Front Apartment', [['F1', 'One-bedroom', 'Noel Bitancor', 2, 6500], ['F2B', 'Two-bedroom', 'Adrian Molato', 4, 9000], ['F2F', 'Two-bedroom', 'Sheila Oreta', 3, 9000]]],
  ['Linda Units', [['LB', 'One-bedroom', 'Ramil Balingbing', 1, 5500], ['LF', 'One-bedroom', 'Josefina Nieva', 2, 6000]]],
];
const tenantLine = (name: string | null, n: number) => (name ? (n > 1 ? `${name} + ${n - 1} roommate${n > 2 ? 's' : ''}` : name) : '');
// Each cluster's place down the page, and each unit's row counted from the top of the page, so
// the cells stand up along diagonals as one wave.
const LAYOUT = (() => {
  let y = 0, row = 0;
  return CLUSTERS.map(([name, units]) => {
    const rows = Math.ceil(units.length / 4);
    const out = {name, units, y, row};
    y += CLUSTER_HEAD_H + 16 + rows * CELL.h + 9;
    row += rows;
    return out;
  });
})();
const ROOMS_H = LAYOUT[LAYOUT.length - 1].y + CLUSTER_HEAD_H + 16 + CELL.h + 9;
const LAST_ROW = LAYOUT[LAYOUT.length - 1].row;
export const Rooms: React.FC = () => {
  const f = useFrame();
  // One move up the whole page at a tilt, from Linda Units past the vacant B3B to the Boarding
  // House, then flat and close on 1A.
  const cam = camera(f, [
    {at: 0, x: 560, y: ROOMS_H - 260, s: 0.82, rx: 40, rz: -11},
    {at: 10, x: 560, y: 700, s: 0.86, rx: 34, rz: -8, dur: 88, ease: gentle},
    {at: 98, x: CELL.w / 2 + 40, y: CLUSTER_HEAD_H + 16 + 70, s: 1.55, rx: 0, rz: 0, dur: 58},
    {at: 136, x: CELL.w / 2 + 20, y: CLUSTER_HEAD_H + 16 + 86, s: 1.85, rx: 0, rz: 0, dur: 40},
  ], 2, CX);
  const lift = pop(f, 140, {damping: 20, stiffness: 80});
  const dim = t01(f, 134, 160) * 0.55;
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={70} />
      <Zone>
        <Stage cam={cam} w={MAIN_W} h={ROOMS_H}>
          {LAYOUT.map(({name, units, y, row}) => {
            const head = t01(f, 4 + (LAST_ROW - row) * 3, 22 + (LAST_ROW - row) * 3);
            return (
              <React.Fragment key={name}>
                <ClusterHead name={name} occupied={units.filter((u) => u[2]).length} total={units.length} grow={t01(f, 12 + (LAST_ROW - row) * 3, 48 + (LAST_ROW - row) * 3)}
                  style={{position: 'absolute', left: 0, top: y, opacity: head * (1 - dim), transform: `translateY(${(1 - head) * 16}px)`}} />
                {units.map(([code, type, who, n, rent], i) => {
                  const col = i % 4, r = Math.floor(i / 4);
                  const p = pop(f, 8 + (col + LAST_ROW - row - r) * 3, {damping: 20, stiffness: 90});
                  const isLift = code === '1A';
                  return (
                    <div key={code} style={{position: 'absolute', left: col * CELL.w, top: y + CLUSTER_HEAD_H + 16 + r * CELL.h, transformStyle: 'preserve-3d', opacity: Math.min(1, p * 1.6) * (isLift ? 1 : 1 - dim),
                      transform: `translateZ(${isLift ? lift * 120 : 0}px) rotateX(${(1 - p) * -90}deg) scale(${isLift ? 1 + lift * 0.08 : 1})`, transformOrigin: 'center bottom', zIndex: isLift ? 2 : 1}}>
                      <UnitCell code={code} type={type} tenant={tenantLine(who, n)} rent={rent} vacant={!who} hover={isLift ? lift : 0} />
                    </div>
                  );
                })}
              </React.Fragment>
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
// The Boarding House's latest records, newest first, as the page orders them.
const ROWS: LedgerRowData[] = [
  {unit: '1b', paid: 'Sep 10, 2026', period: 'Sep 12 to Oct 11', who: 'Paolo Dimayuga', or: '5090', rent: 4500, water: 400, heads: 2},
  {unit: '2a', paid: 'Sep 9, 2026', period: 'Sep 10 to Oct 9', who: 'Nicole Ong', or: '5075', rent: 6000, water: 600, heads: 3},
  {unit: '1e', paid: 'Sep 7, 2026', period: 'Sep 8 to Oct 7', who: 'Bea Magbanua', or: '5092', rent: 4500, water: 400, heads: 2},
  {unit: '2b', paid: 'Sep 5, 2026', period: 'Sep 7 to Oct 6', who: 'Renzo Abrenica', or: '5076', rent: 4800, water: 200, heads: 1},
  {unit: '1a', paid: 'Sep 4, 2026', period: 'Sep 5 to Oct 4', who: 'Andrea Villanueva', or: '5089', rent: 4500, water: 200, heads: 1},
  {unit: '1c', paid: 'Sep 2, 2026', period: 'Sep 3 to Oct 2', who: 'Kristine Salcedo', or: '5091', rent: 4800, water: 400, heads: 2},
];
const INC = {tiles: INCOME_HEAD_H + 24, tileH: 374, get bar() { return this.tiles + this.tileH + 24; }, get ledger() { return this.bar + RECORDS_BAR_H + 24; }};
const INC_H = INC.ledger + LEDGER_HEAD_H + 16 + 43 + ROWS.length * 62 + 8;
export const Income: React.FC = () => {
  const f = useFrame();
  const keys: Cam[] = [
    {at: 0, x: 532, y: 500, s: 0.76, rx: 14, rz: -4},
    {at: 30, x: 532, y: 588, s: 0.84, rx: 0, rz: 0, dur: 70},
  ];
  const cam = camera(f, keys, 2, CX);
  // The sheet stands on the bottom edge, its top 24px under the top, as in the app.
  const SHEET_H = 1056, MX = CX - SHEET_W / 2, MY = 1080 - SHEET_H;
  const m = (p: {x: number; y: number}) => ({x: MX + p.x, y: MY + p.y});
  const btn = toScreen(Math.max(f, 100), keys, MAIN_W - 88, INCOME_HEAD_H - 22);
  const modalP = pop(f, 128, {damping: 24, stiffness: 110});
  const unitOpen = t01(f, 170, 182) * (1 - t01(f, 208, 216));
  const chosen = f >= 210;
  const orText = typedOf('or', f);
  const confirmP = pop(f, 294, {damping: 20, stiffness: 110});
  const scrim = t01(f, 128, 146);
  const SAVE = m(RECORD.save(SHEET_H));

  const path: [number, number, number][] = [
    [100, 1780, 1000], [106, btn.x, btn.y], [150, m(RECORD.unit).x, m(RECORD.unit).y], [188, m(RECORD.option).x, m(RECORD.option).y],
    [220, m(RECORD.invoice).x, m(RECORD.invoice).y], [268, SAVE.x, SAVE.y],
  ];
  let cx = path[0][1], cy = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const t = t01(f, path[i][0], path[i][0] + 22, easeInOut);
    cx = lerp(cx, path[i][1], t); cy = lerp(cy, path[i][2], t);
  }
  const clicks = [124, 168, 206, 234, 288];
  // Where the camera goes, in screen pixels: to Record payment, back out as the sheet rises,
  // into the Unit field and its list, close on the invoice number while it is typed, down to the
  // sheet's Record payment, then to the warning.
  const CZ = 1.2, CONFIRM_TOP = 130;
  const zoom: Focus[] = [
    {at: 96, x: btn.x, y: btn.y, s: 1.45, tx: 1420, ty: 400, dur: 26},
    {at: 126, s: 1, dur: 22},
    {at: 150, x: 1340, y: MY + 250, s: 1.3, tx: 1340, ty: 440},
    {at: 184, x: 1280, y: MY + 300, s: 1.3, tx: 1320, ty: 470, dur: 22},
    {at: 220, x: m(RECORD.invoice).x, y: m(RECORD.invoice).y, s: 1.6, tx: 1400, ty: 540, dur: 22},
    {at: 264, x: SAVE.x - 40, y: SAVE.y - 90, s: 1.35, tx: 1400, ty: 700, dur: 22},
    {at: 292, x: 1340, y: 400, s: 1.12, tx: 1340, ty: 410},
    {at: 336, x: 1340, y: 540, s: 1.04, dur: 24},
  ];
  const press = Math.max(...clicks.map((c) => t01(f, c - 3, c) * (1 - t01(f, c, c + 7))));

  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={70} />
      <Zone><ActionCam keys={zoom}>
      <Zone><AbsoluteFill style={under(scrim)}>
        <Stage cam={cam} w={MAIN_W} h={INC_H}>
          <Piece f={f} at={2} x={0} y={0}><IncomeHead press={f < 132 ? press : 0} /></Piece>
          <Piece f={f} at={8} x={0} y={INC.tiles}><RentMonthTile f={f} at={16} /></Piece>
          <Piece f={f} at={14} x={OCC_W + 16} y={INC.tiles}><ByClusterTile f={f} at={22} h={INC.tileH} /></Piece>
          <Piece f={f} at={20} x={0} y={INC.bar}><RecordsBar /></Piece>
          <Piece f={f} at={26} x={0} y={INC.ledger}>
            <div style={{width: MAIN_W}}>
              <LedgerCardHead f={f} at={30} />
              <div style={{paddingTop: 16}}>
                <LedgerHead />
                {ROWS.map((r, i) => {
                  const at = 36 + i * 11;
                  const p = pop(f, at, {damping: 20, stiffness: 100});
                  return <LedgerRow key={r.or} r={r} first={i === 0} flash={(1 - t01(f, at + 6, at + 40)) * (f >= at ? 0.9 : 0)}
                    style={{opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - p) * 60}px)`}} />;
                })}
              </div>
            </div>
          </Piece>
        </Stage>
      </AbsoluteFill></Zone>
      {/* The page dims a little under the sheet (--scrim) and blurs, as under the sheet's glass. */}
      <div style={{position: 'absolute', inset: -1500, background: GL.scrim, opacity: scrim}} />
      {f >= 128 ? (
        <div style={{position: 'absolute', left: MX, top: MY, transform: `translateY(${(1 - modalP) * (SHEET_H + 40)}px)`, ...under(t01(f, 294, 306) * 0.6)}}>
          <RecordModal h={SHEET_H} unit={chosen ? '2B, Renzo Abrenica (Boarding House)' : '1A, Andrea Villanueva (Boarding House)'} unitOpen={unitOpen} hoverOption={f >= 196}
            rent={chosen ? '4800' : '4500'} water="₱200.00" or={orText} orFocus={f >= 234 && f < 288} total={chosen ? '₱5,000.00' : '₱4,700.00'}
            press={f >= 282 && f < 296 ? press : 0} />
        </div>
      ) : null}
      {f >= 294 ? (
        <>
          <div style={{position: 'absolute', inset: -1500, background: GL.scrim, opacity: t01(f, 294, 306)}} />
          <div style={{position: 'absolute', left: (CX - (CONFIRM_W * CZ) / 2) / CZ, top: CONFIRM_TOP / CZ, zoom: CZ, transform: `translateY(${(1 - confirmP) * 12}px) scale(${lerp(0.96, 1, confirmP)})`, opacity: Math.min(1, confirmP * 1.6)}}>
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
      </ActionCam></Zone>
      <Head size={100} text={'Her records.\nHer layout.'} accent={['records.']} at={14} out={116} />
      <Head size={100} text={'Her invoice\nnumbers, kept.'} accent={['kept.']} at={138} out={284} />
      <Head size={100} text={'Paid twice?\nIt asks first.'} accent={['twice?']} at={298} />
      <Cues scene="income" />
    </AbsoluteFill>
  );
};

