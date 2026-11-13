// The landlady's screens, piece by piece, as they are since the redesign of November 2026:
// views/AdminOverviewView.vue, RoomDirectoryView.vue, IncomeCollectionsView.vue,
// MaintenanceDispatchView.vue, InquiriesView.vue, components/layout/AppSidebar.vue and the
// dialogs they open. Every label, size and colour was read from the running app on the
// sample-data harness (capture/harness.html) on 13 Nov 2026. The people and amounts are that
// harness's invented sample data.
import React from 'react';
import {ArrowUpRight, Building2, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, CircleCheck, CircleX, DoorOpen, FileSpreadsheet, Inbox, LayoutDashboard, Phone, Plus, ReceiptText, Search, Send, TriangleAlert, UserPlus, Users, Wallet, Wrench, X} from 'lucide-react';
import {C, GL, jakarta, sora} from '../theme';
import {count, lerp, peso, pop, t01} from '../anim';
import {Btn, Field, Glass, Input, Pill, Rim, Select, Tile} from './Kit';

const MONO = 'ui-monospace, Consolas, monospace';
const tab: React.CSSProperties = {fontVariantNumeric: 'tabular-nums'};

// ---- The sidebar ------------------------------------------------------------------
// components/layout/AppSidebar.vue: the seven pages, the one she is on under a pane of glass,
// what is new on Repairs and Inquiries as a count, and "Recently", her own last three actions
// in the sentences the server writes (services/recentActions.ts).
export const SIDEBAR_W = 232;
const NAV: [string, React.FC<{size?: number; color?: string}>, number?, string?][] = [
  ['Overview', LayoutDashboard], ['Monthly Income', Wallet], ['Monthly Expenses', ReceiptText], ['Tenants', Users],
  ['Rooms and rates', Building2], ['Repairs', Wrench, 1, C.overdue], ['Inquiries', Inbox, 1, C.brand],
];
const RECENT: [string, string][] = [
  ['Recorded a payment: 1E, rent for September 2026, ₱4,900.', 'Today, 2:12 PM'],
  ['Marked the repair “Bedroom light flickers” in 3E in progress.', 'Yesterday, 3:12 PM'],
  ['Recorded an expense of ₱4,368.', 'Sep 27, 11:12 AM'],
];
export const Sidebar: React.FC<{f: number; at?: number; active?: string}> = ({f, at = 0, active = 'Overview'}) => (
  <div style={{width: SIDEBAR_W, fontFamily: jakarta, color: C.ink}}>
    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
      {NAV.map(([label, Icon, badge, badgeBg], i) => {
        const on = label === active;
        const p = t01(f, at + i * 2, at + 12 + i * 2);
        return (
          <div key={label} style={{position: 'relative', height: 44, borderRadius: 999, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: p, transform: `translateX(${(1 - p) * -14}px)`,
            ...(on ? {background: 'linear-gradient(180deg, rgba(255,255,255,0.5), transparent 55%), rgba(255,255,255,0.5)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.85), inset 0 1px 1px #ffffff, 0 3px 8px -4px rgba(16,60,40,0.35)'} : {})}}>
            <span style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, lineHeight: '20px', fontWeight: on ? 600 : 500, color: on ? C.brand : C.inkSoft}}>
              <Icon size={16} color={on ? C.brand : GL.inkFaint} />{label}
            </span>
            {badge ? <span style={{minWidth: 8, padding: '2px 8px', borderRadius: 999, background: badgeBg, color: '#fff', fontSize: 12, lineHeight: '16px', fontWeight: 600, textAlign: 'center'}}>{badge}</span> : null}
          </div>
        );
      })}
    </div>
    <div style={{marginTop: 24, borderTop: `1px solid ${GL.line}`, padding: '20px 16px 0', opacity: t01(f, at + 14, at + 28)}}>
      <div style={{fontFamily: sora, fontSize: 11.2, lineHeight: '16.8px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: GL.inkFaint}}>Recently</div>
      <div style={{marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2}}>
        {RECENT.map(([text, when]) => (
          <div key={text} style={{padding: '6px 0'}}>
            <div style={{fontSize: 13, lineHeight: '17.875px', fontWeight: 500, color: C.inkSoft}}>{text}</div>
            <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, marginTop: 2}}>{when}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ---- Overview ---------------------------------------------------------------------
// The page is 1064 wide beside the sidebar. Top to bottom: the date (its year is the year
// menu), the greeting and her three actions; Needs your attention, on the page with a rule
// under it; Rent for the month with who is due this week; Occupancy beside Income and expenses,
// the one boxed tile.
export const MAIN_W = 1064;
export const OVERVIEW_HEAD_H = 127;
export const OverviewHead: React.FC<{f: number; at?: number; press?: number}> = ({f, at = 0, press = 0}) => (
  <div style={{fontFamily: jakarta, width: MAIN_W, height: OVERVIEW_HEAD_H}}>
    <div style={{fontSize: 14, lineHeight: '20px', color: GL.inkFaint, opacity: t01(f, at, at + 10), display: 'flex', alignItems: 'center', gap: 4}}>
      <span>Tuesday, September 29,</span><b style={{color: C.brand, fontWeight: 700}}>2026</b><ChevronDown size={16} color={C.brand} />
    </div>
    <div style={{fontFamily: sora, fontSize: 34, lineHeight: '42.5px', fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4, color: C.ink, opacity: t01(f, at + 4, at + 18), transform: `translateY(${(1 - t01(f, at + 4, at + 22)) * 10}px)`}}>
      Good afternoon, Michelle
    </div>
    <div style={{display: 'flex', gap: 8, marginTop: 16}}>
      {[['Move someone in/out', <DoorOpen key="d" size={16} />], ['Record expense', <ReceiptText key="r" size={16} />], ['Record payment', <Plus key="p" size={16} />]].map(([label, icon], i) => (
        <span key={label as string} style={{opacity: t01(f, at + 10 + i * 3, at + 22 + i * 3), transform: `translateY(${(1 - t01(f, at + 10 + i * 3, at + 26 + i * 3)) * 12}px)`, display: 'inline-block'}}>
          <Btn kind="brand" icon={icon as React.ReactNode} press={i === 2 ? press : 0}>{label as string}</Btn>
        </span>
      ))}
    </div>
  </div>
);

// One part of Needs your attention: what it is and the arrow that opens it, how many, and the
// first of them on three lines. `rows` are [first line, second line, third line]; a row whose
// `enter` is under 1 is arriving (it opens a place for itself and the others move down).
export type AttRow = {a: string; b: React.ReactNode; c: string; enter?: number};
const AttPart: React.FC<{label: string; n: number; rows: AttRow[]; f: number; at: number; i: number; press?: number}> = ({label, n, rows, f, at, i, press = 0}) => {
  const p = pop(f, at + 6 + i * 2);
  return (
    <div style={{width: 333, minWidth: 0}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 4, height: 44, fontSize: 16, lineHeight: '24px', fontWeight: 600}}>
        {label}
        <span style={{width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: press > 0 ? GL.hover : 'transparent', transform: `scale(${1 - 0.06 * press})`}}><ArrowUpRight size={16} /></span>
      </div>
      <div style={{marginTop: 4, height: 30, fontSize: 30, lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.025em'}}>
        <span style={{display: 'inline-block', transformOrigin: '0 100%', transform: `scale(${lerp(0.4, 1, p)})`, opacity: Math.min(1, p * 2)}}>{n}</span>
      </div>
      <div style={{marginTop: 8}}>
        {rows.map((r, k) => {
          const e = r.enter ?? 1;
          const show = t01(f, at + 12 + i * 2 + k * 3, at + 24 + i * 2 + k * 3) * Math.min(1, e * 1.4);
          return (
            <div key={r.a} style={{height: 97 * e, overflow: 'hidden', borderTop: k ? `1px solid ${GL.line}` : 'none'}}>
              <div style={{padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start', opacity: show, transform: `translateY(${(1 - show) * 8}px)`}}>
                <span style={{fontSize: 18, lineHeight: '24.75px', fontWeight: 600}}>{r.a}</span>
                {typeof r.b === 'string' ? <span style={{fontSize: 18, lineHeight: '28px', fontWeight: 600, ...tab}}>{r.b}</span> : r.b}
                <span style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft}}>{r.c}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export const ADRIAN: AttRow = {a: 'Adrian Molato', b: '₱9,800.00', c: 'Sent Sep 29, 2026'};
// `payments` are the GCash payments waiting for her; `press` presses the arrow that opens them
// (its label in the app is "Review payments").
export const AttentionSection: React.FC<{f: number; at?: number; payments?: AttRow[]; press?: number; rule?: boolean}> = ({f, at = 0, payments = [ADRIAN], press = 0, rule = true}) => (
  <Tile title="Needs your attention" w={MAIN_W} style={{borderBottom: rule ? `1px solid ${GL.line}` : 'none', paddingBottom: 24}}>
    <div style={{display: 'flex', gap: 32}}>
      <AttPart label="Payments to verify" n={payments.filter((r) => (r.enter ?? 1) > 0.5).length} rows={payments} f={f} at={at} i={0} press={press} />
      <AttPart label="Urgent repairs" n={1} f={f} at={at} i={1}
        rows={[{a: 'No water in the bathroom', b: <Pill tone="verify">High</Pill>, c: 'Reported Sep 29, 2026'}]} />
      <AttPart label="Inquiries" n={1} f={f} at={at} i={2} rows={[{a: 'Luis Barrameda', b: 'Unit B3B', c: 'Sep 26, 2026'}]} />
    </div>
  </Tile>
);

const DUE: [string, number, string][] = [
  ['Czarina Bañez', 5000, 'Unit 3B, Oct 3 to Nov 2'], ['Andrea Villanueva', 4700, 'Unit 1A, Oct 5 to Nov 4'], ['Gian Rebusi', 4900, 'Unit 3E, Oct 6 to Nov 5'],
];
export const RentSection: React.FC<{f: number; at?: number; dueAt?: number}> = ({f, at = 0, dueAt = at + 30}) => (
  <Tile title="Rent for September" goto w={MAIN_W}>
    <div style={{opacity: t01(f, at, at + 8)}}>
      <div style={{fontSize: 30, lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.025em', ...tab}}>{peso(count(f, at + 4, 36, 160400))}</div>
      <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 8}}>{count(f, at + 4, 36, 26)} payments entered for September so far</div>
    </div>
    <div>
      <div style={{display: 'flex', alignItems: 'center', gap: 4, height: 44, fontSize: 14, color: C.inkSoft, opacity: t01(f, dueAt - 6, dueAt + 6)}}>Due this week<span style={{width: 44, display: 'flex', justifyContent: 'center', color: C.ink}}><ArrowUpRight size={16} /></span></div>
      <div style={{display: 'flex', gap: 32}}>
        {DUE.map(([name, amount, where], i) => {
          const p = t01(f, dueAt + i * 4, dueAt + 14 + i * 4);
          return (
            <div key={name} style={{width: 333, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 2, opacity: p, transform: `translateY(${(1 - p) * 8}px)`}}>
              <span style={{fontSize: 18, lineHeight: '24.75px', fontWeight: 600}}>{name}</span>
              <span style={{fontSize: 18, lineHeight: '28px', fontWeight: 600, ...tab}}>{peso(amount, 2)}</span>
              <span style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft}}>{where}</span>
            </div>
          );
        })}
      </div>
    </div>
  </Tile>
);

// Occupancy: the count, the unit left vacant, one bar of all 33 units by cluster (the vacant
// one as empty track at the end) and each cluster's count. The semicircle went on 1 Nov 2026.
const CLUSTER: [string, number, number, string][] = [
  ['Boarding House', 22, 22, C.brand], ['Back Apartment', 4, 5, C.brandBright], ['Front Apartment', 3, 3, C.night],
  ['Linda Units', 2, 2, GL.seriesSoft], ['Penthouse', 1, 1, GL.inkFaint],
];
export const OCC_W = 344;
export const OccupancySection: React.FC<{f: number; at?: number}> = ({f, at = 0}) => (
  <Tile title="Occupancy" goto w={OCC_W}>
    <div style={{opacity: t01(f, at, at + 8)}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
        <span style={{fontSize: 30, lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.025em', ...tab}}>
          <span style={{color: C.brand}}>{count(f, at + 4, 40, 32)}</span><span style={{fontSize: 20, color: GL.inkFaint}}>/33</span>
        </span>
        <span style={{fontSize: 14, color: C.inkSoft}}>units occupied</span>
      </div>
      <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 8, opacity: t01(f, at + 40, at + 50)}}>Vacant: B3B</div>
    </div>
    <div style={{display: 'flex', gap: 4, height: 14}}>
      {[...CLUSTER.map(([, occ, , col]) => [occ, col] as [number, string]), [1, GL.line] as [number, string]].map(([v, col], i) => (
        <div key={i} style={{flex: `${v} 0 0`, minWidth: 6, borderRadius: 999, background: col, transformOrigin: '0 50%', transform: `scaleX(${t01(f, at + 6 + i * 3, at + 22 + i * 3)})`}} />
      ))}
    </div>
    <div>
      {CLUSTER.map(([name, occ, total, col], i) => (
        <div key={name} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: i ? `1px solid ${GL.line}` : 'none', opacity: t01(f, at + 10 + i * 3, at + 24 + i * 3)}}>
          <span style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, lineHeight: '19.25px', fontWeight: 500}}><span style={{width: 12, height: 12, borderRadius: 6, background: col}} />{name}</span>
          <span style={{fontSize: 16, lineHeight: '24px', fontWeight: 600, ...tab}}>{occ}/{total}</span>
        </div>
      ))}
    </div>
  </Tile>
);

// Income and expenses, the boxed tile: the year as twelve capsules (components/overview/
// MonthCapsules.vue), the month picked under it, and that month's income, operating expenses
// and what is left. Bar i grows from at + 6 + 3i with no overshoot: a money chart never shows a
// height it does not mean.
export const CHART_W = 704;
export const IncomeExpensesTile: React.FC<{f: number; at?: number}> = ({f, at = 0}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const values = [0.97, 0.97, 0.97, 0.97, 0.97, 0.97, 0.97, 0.97, 0.802];
  const figures = t01(f, at + 20, at + 50);
  return (
    <Tile tone="boxed" title="Income and expenses" goto w={CHART_W}>
      <div style={{display: 'flex', gap: 12, opacity: t01(f, at, at + 10)}}>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 192, paddingBottom: 28, boxSizing: 'border-box', fontSize: 12, lineHeight: '16px', color: GL.inkFaint, textAlign: 'right', ...tab}}>
          <span>₱200k</span><span>₱100k</span><span>₱0</span>
        </div>
        <div style={{flex: 1}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 8, height: 192}}>
            {months.map((m, i) => {
              const v = values[i];
              return (
                <div key={m} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%'}}>
                  <div style={{position: 'relative', flex: 1, width: '100%', maxWidth: 44, display: 'flex', alignItems: 'flex-end'}}>
                    {v === undefined ? (
                      <div style={{width: '100%', height: '97%', borderRadius: 999, background: GL.tile, boxShadow: GL.drop, opacity: t01(f, at + 30 + (i - 9) * 3, at + 44 + (i - 9) * 3)}} />
                    ) : (
                      <div style={{width: '100%', height: `${v * 100}%`, borderRadius: 999, background: i === 8 ? C.brand : C.brandBright, transformOrigin: '50% 100%', transform: `scaleY(${t01(f, at + 6 + i * 3, at + 22 + i * 3)})`}} />
                    )}
                  </div>
                  <span style={{fontSize: 12, lineHeight: '16px', color: i === 8 ? C.ink : C.inkSoft, fontWeight: i === 8 ? 600 : 400}}>{m}</span>
                </div>
              );
            })}
          </div>
          <div style={{display: 'flex', gap: 16, fontSize: 12, lineHeight: '16px', color: C.inkSoft, alignItems: 'center', marginTop: 12}}>
            <span style={{display: 'flex', gap: 6, alignItems: 'center'}}><span style={{width: 12, height: 12, borderRadius: 6, background: C.brandBright}} />Recorded</span>
            <span style={{display: 'flex', gap: 6, alignItems: 'center'}}><span style={{width: 12, height: 12, borderRadius: 6, border: `2px dashed ${GL.inkFaint}`, boxSizing: 'border-box'}} />Expected</span>
          </div>
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, opacity: t01(f, at + 23, at + 33)}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
          <div>
            <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>September 2026</div>
            <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.025em', ...tab}}>{peso(Math.round(160400 * figures), 2)} recorded</div>
          </div>
          <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, ...tab, opacity: figures}}>Rent ₱150,000.00, water ₱10,400.00</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, borderTop: `1px solid ${GL.line}`, paddingTop: 12}}>
          {[['Income', 160400, true], ['Operating expenses', 26313, true], ['Net income', 134087, false]].map(([k, v, link]) => (
            <div key={k as string}>
              <div style={{display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>{k as string}{link ? <ArrowUpRight size={14} /> : null}</div>
              <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 600, ...tab}}>{peso(Math.round((v as number) * figures), 2)}</div>
            </div>
          ))}
        </div>
      </div>
    </Tile>
  );
};

// ---- Rooms and rates --------------------------------------------------------------
// views/RoomDirectoryView.vue: the units by cluster. Each cluster has its name, how many are
// occupied and one segment per unit (a vacant one hatched); each unit is a cell on the page with
// a rule under it, four to a row: its code, its kind, the tenant and the monthly rent. A vacant
// unit says so beside its code and reads "No tenant". `hover` is the cell answering the pointer
// (.row-open, --hover).
export const CELL = {w: 266, h: 190};
export const UnitCell: React.FC<{code: string; type: string; tenant?: string; rent: number; vacant?: boolean; hover?: number; style?: React.CSSProperties}> = ({code, type, tenant, rent, vacant, hover = 0, style}) => (
  <div style={{position: 'relative', width: CELL.w, height: CELL.h + 1, boxSizing: 'border-box', borderBottom: `1px solid ${GL.line}`, padding: '20px 12px', fontFamily: jakarta, color: C.ink, ...style}}>
    {hover > 0 ? <div style={{position: 'absolute', inset: 4, borderRadius: 12, background: 'rgba(255,255,255,0.86)', boxShadow: `0 ${18 * hover}px ${44 * hover}px rgba(16,60,40,${0.22 * hover}), inset 0 0 0 1px rgba(255,255,255,0.9)`, opacity: hover}} /> : null}
    <div style={{position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <div style={{fontSize: 20, lineHeight: '20px', fontWeight: 600, textTransform: 'uppercase'}}>{code}</div>
          <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 6}}>{type}</div>
        </div>
        {vacant ? <Pill>Vacant</Pill> : null}
      </div>
      <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, marginTop: 12}}>Tenant</div>
      <div style={{fontSize: 14, lineHeight: '20px', fontWeight: 500, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{vacant ? 'No tenant' : tenant}</div>
      <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, marginTop: 12}}>Monthly rent</div>
      <div style={{fontSize: 16, lineHeight: '24px', fontWeight: 700, marginTop: 2, color: C.brand, ...tab}}>{peso(rent)}</div>
    </div>
  </div>
);
const HATCHED = `repeating-linear-gradient(135deg, ${C.hatch} 0 1.5px, transparent 1.5px 7px)`;
export const CLUSTER_HEAD_H = 71;
export const ClusterHead: React.FC<{name: string; occupied: number; total: number; grow?: number; style?: React.CSSProperties}> = ({name, occupied, total, grow = 1, style}) => (
  <div style={{width: MAIN_W, height: CLUSTER_HEAD_H, boxSizing: 'border-box', padding: '16px 0', borderBottom: `1px solid ${GL.line}`, fontFamily: jakarta, color: C.ink, ...style}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 23}}>
      <span style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: sora, fontSize: 15, lineHeight: '22.5px', fontWeight: 600, letterSpacing: '-0.02em'}}><ChevronDown size={16} color={C.inkSoft} />{name}</span>
      <span style={{fontFamily: sora, fontSize: 12, lineHeight: '16px', color: C.inkSoft, letterSpacing: '-0.02em'}}>{occupied}/{total} occupied</span>
    </div>
    <div style={{display: 'flex', gap: 4, height: 6, marginTop: 10}}>
      {Array.from({length: total}, (_, k) => (
        <span key={k} style={{flex: 1, borderRadius: 999, background: k < occupied ? C.brand : HATCHED, opacity: k / total < grow ? 1 : 0.15}} />
      ))}
    </div>
  </div>
);

// ---- Monthly Income ---------------------------------------------------------------
// views/IncomeCollectionsView.vue: the year menu over the title, Download and Record payment at
// the right; the month's rent beside Income by cluster (a true part-to-whole, Linda Units
// hatched because they are kept apart from the totals); then the records, one section per
// cluster, in her workbook's columns (Rent, Water, Remitted). Sample figures.
export const INCOME_HEAD_H = 68;
export const IncomeHead: React.FC<{press?: number}> = ({press = 0}) => (
  <div style={{width: MAIN_W, height: INCOME_HEAD_H, fontFamily: jakarta, color: C.ink}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 4, height: 20, fontSize: 14, fontWeight: 700, color: C.brand}}>2026<ChevronDown size={16} /></div>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, height: 44}}>
      <div style={{fontFamily: sora, fontSize: 34, lineHeight: '42.5px', fontWeight: 500, letterSpacing: '-0.025em'}}>Monthly Income</div>
      <div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
        <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: C.brand}}>Download <FileSpreadsheet size={16} /></span>
        <Btn kind="brand" icon={<Plus size={16} />} press={press}>Record payment</Btn>
      </div>
    </div>
  </div>
);

export const RentMonthTile: React.FC<{f: number; at?: number}> = ({f, at = 0}) => (
  <Tile title="Rent for September" w={OCC_W}>
    <div style={{fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.025em', ...tab}}>{peso(count(f, at, 60, 159200), 2)}</div>
  </Tile>
);

const SPLIT: [string, number, string][] = [
  ['Boarding House', 987200, C.brand], ['Back Apartment', 266700, C.brandBright], ['Front Apartment', 229800, C.night],
  ['Penthouse', 115200, GL.seriesSoft], ['Linda Units', 103500, 'hatch'],
];
const SPLIT_TOTAL = SPLIT.reduce((a, [, v]) => a + v, 0);
export const ByClusterTile: React.FC<{f: number; at?: number; h?: number}> = ({f, at = 0, h}) => {
  const grow = t01(f, at + 6, at + 46);
  return (
    <Tile tone="boxed" w={CHART_W} h={h}
      title={<span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>Income by <span style={{color: C.brand, fontWeight: 700}}>cluster</span><ChevronDown size={16} color={C.brand} /></span>}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
        <span style={{fontSize: 24, lineHeight: '24px', fontWeight: 600, ...tab}}>{peso(count(f, at, 60, SPLIT_TOTAL), 2)}</span>
        <span style={{fontSize: 14, color: C.inkSoft}}>received from {count(f, at, 60, 282)} payments</span>
      </div>
      <div style={{display: 'flex', gap: 4, height: 14}}>
        {SPLIT.map(([n, v, col]) => (
          <span key={n} style={{flex: (v / SPLIT_TOTAL) * grow + 0.0001, borderRadius: 999, background: col === 'hatch' ? `${HATCHED}, ${GL.tile}` : col, boxShadow: col === 'hatch' ? GL.drop : 'none', opacity: grow > 0 ? 1 : 0}} />
        ))}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        {SPLIT.map(([n, v, col], i) => (
          <div key={n} style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, lineHeight: '20px', opacity: t01(f, at + 10 + i * 3, at + 22 + i * 3)}}>
            <span style={{width: 12, height: 12, borderRadius: 6, background: col === 'hatch' ? HATCHED : col, boxSizing: 'border-box'}} />
            <span style={{flex: 1}}>{n}</span>
            <span style={{fontSize: 12, color: GL.inkFaint, ...tab}}>{Math.round((v / SPLIT_TOTAL) * 100)}%</span>
            <span style={{fontWeight: 600, width: 99, textAlign: 'right', ...tab}}>{peso(v, 2)}</span>
          </div>
        ))}
      </div>
    </Tile>
  );
};

// Records or To verify, then the list's own toolbar.
export const RECORDS_BAR_H = 140;
export const RecordsBar: React.FC = () => (
  <div style={{width: MAIN_W, height: RECORDS_BAR_H, fontFamily: jakarta, color: C.ink}}>
    <div style={{display: 'flex', gap: 20, height: 28, alignItems: 'center', fontSize: 14, lineHeight: '20px'}}>
      <span style={{fontWeight: 700, color: C.brand}}>Records</span>
      <span style={{color: C.inkSoft, display: 'inline-flex', gap: 8}}>To verify<span style={{fontWeight: 600, color: GL.statusWait}}>1</span></span>
    </div>
    <div style={{marginTop: 12, width: 320}}><Input placeholder="Search" left={<Search size={16} color={GL.inkFaint} />} /></div>
    <div style={{display: 'flex', gap: 12, marginTop: 12}}>
      <Select value="By cluster" w={176} /><Select value="All clusters" count="282" w={192} /><Select value="All months" w={192} /><Select value="Group by cluster" w={192} /><Select value="Newest first" w={192} />
    </div>
  </div>
);

export type LedgerRowData = {unit: string; paid: string; period: string; who: string; or: string; rent: number; water: number; heads: number};
// The table's own columns: Unit, Paid, Who, Rent, a column only Linda Units fill, Water, Remitted.
export const LEDGER_COLS = [56, 104, 472, 112, 100, 100, 112];
export const LEDGER_HEAD_H = 91;
export const LedgerCardHead: React.FC<{f: number; at?: number}> = ({f, at = 0}) => (
  <div style={{width: MAIN_W, height: LEDGER_HEAD_H, boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 0', borderBottom: `1px solid ${GL.line}`, fontFamily: sora, color: C.ink, letterSpacing: '-0.02em'}}>
    <div>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, lineHeight: '22.5px', fontWeight: 600}}><ChevronDown size={16} color={C.inkSoft} />Boarding House</div>
      <div style={{fontSize: 14, lineHeight: '24px', color: C.inkSoft, marginTop: 4}}>22 units</div>
    </div>
    <div style={{fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.025em', color: C.brand, marginTop: 4, ...tab}}>{peso(count(f, at, 60, 987200))}</div>
  </div>
);
const cell = (i: number): React.CSSProperties => ({width: LEDGER_COLS[i], boxSizing: 'border-box', padding: '0 12px', textAlign: i >= 3 ? 'right' : 'left'});
export const LedgerHead: React.FC = () => (
  <div style={{display: 'flex', width: MAIN_W + 24, marginLeft: -12, height: 43, alignItems: 'center', fontSize: 12, lineHeight: '18px', fontWeight: 600, color: C.ink, fontFamily: jakarta, borderBottom: `1px solid ${GL.line}`}}>
    {['Unit', 'Paid', 'Who', 'Rent', '', 'Water', 'Remitted'].map((h, i) => <div key={i} style={cell(i)}>{h}</div>)}
  </div>
);
export const LedgerRow: React.FC<{r: LedgerRowData; flash?: number; first?: boolean; style?: React.CSSProperties}> = ({r, flash = 0, first, style}) => (
  <div style={{display: 'flex', width: MAIN_W + 24, marginLeft: -12, height: 62, alignItems: 'center', fontSize: 14, lineHeight: '21px', fontFamily: jakarta, color: C.ink,
    borderTop: first ? 'none' : `1px solid ${GL.line}`, boxSizing: 'border-box', background: `rgba(23,96,63,${0.1 * flash})`, ...style}}>
    <div style={{...cell(0), fontWeight: 600, textTransform: 'uppercase'}}>{r.unit}</div>
    <div style={cell(1)}><div style={{whiteSpace: 'nowrap'}}>{r.paid}</div><div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, whiteSpace: 'nowrap'}}>{r.period}</div></div>
    <div style={cell(2)}>{r.who}<div style={{fontFamily: MONO, fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>{r.or}</div></div>
    <div style={{...cell(3), fontWeight: 600, ...tab}}>{peso(r.rent, 2)}</div>
    <div style={cell(4)} />
    <div style={{...cell(5), fontWeight: 600, ...tab}}>{peso(r.water, 2)}<div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, fontWeight: 400}}>{r.heads} head{r.heads > 1 ? 's' : ''}</div></div>
    <div style={{...cell(6), fontWeight: 600, color: C.brand, ...tab}}>{peso(r.rent + r.water, 2)}</div>
  </div>
);

// Record payment (components/modals/OnsitePaymentModal.vue). Since the redesign it is a sheet of
// frosted glass that rises from the bottom edge, with a grip at its top: the unit, its occupants
// setting the water (₱200 a person, never typed), the rent, the invoice number or ACK, the mode
// of payment, the months covered, the date paid and the total. `h` is how tall the sheet stands.
// Where things are, for the scene's pointer, from the sheet's top left corner.
export const SHEET_W = 768;
export const RECORD = {unit: {x: 384, y: 147}, option: {x: 190, y: 322}, invoice: {x: 520, y: 347}, save: (h: number) => ({x: 656, y: h - 46})};
const UNIT_OPTIONS = ['1G, Ella Cordero + 1 roommate (Boarding House)', '1H, Carlo Buenaflor (Boarding House)', '2A, Nicole Ong + 2 roommates (Boarding House)', '2B, Renzo Abrenica (Boarding House)',
  '2C, Trisha Delos Santos + 1 roommate (Boarding House)', '2D, Miguel Santiago (Boarding House)', '2E, Angela Pascual + 1 roommate (Boarding House)'];
export const RecordModal: React.FC<{h: number; unit: string; unitOpen?: number; hoverOption?: boolean; or: string; orFocus?: boolean; rent: string; water: string; total: string; press?: number; heads?: number}> = ({
  h, unit, unitOpen = 0, hoverOption, or, orFocus, rent, water, total, press = 0, heads = 1,
}) => (
  <Glass tone="float" r="28px 28px 0 0" style={{width: SHEET_W, height: h, display: 'flex', flexDirection: 'column'}}>
    <div style={{height: 20, display: 'flex', justifyContent: 'center', paddingTop: 10, boxSizing: 'border-box'}}><span style={{width: 40, height: 6, borderRadius: 3, background: GL.line}} /></div>
    <div style={{height: 59, boxSizing: 'border-box', padding: '4px 16px 16px 24px', borderBottom: `1px solid ${GL.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontFamily: sora, fontSize: 18, lineHeight: '24.75px', fontWeight: 600, letterSpacing: '-0.025em'}}>Record payment</div>
      <span style={{width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><X size={16} /></span>
    </div>
    <div style={{flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, position: 'relative'}}>
      <Field float label="Unit"><Select field value={unit} open={unitOpen > 0.5} /></Field>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: 94}}>
        <Field float label="Occupants"><Input float value={String(heads)} /></Field>
        <Field float label="Water"><Input float value={water} style={{boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), inset 0 1px 1px rgba(255,255,255,0.85)'}} /><span style={{fontSize: 13, lineHeight: '22px', color: GL.inkSoftFloat}}>{heads} × ₱200 a month</span></Field>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: 94}}>
        <Field float label="Rent"><Input float value={rent} /></Field>
        <Field float label="Invoice or acknowledgement receipt (if any)">
          <Input float value={or} placeholder="INV#4627" mono focus={orFocus} caret={orFocus} style={{paddingRight: 6}}
            right={<span style={{fontFamily: jakarta, fontSize: 12, lineHeight: '16px', fontWeight: 600, letterSpacing: '0.025em', color: GL.inkSoftFloat, background: GL.pane, borderRadius: 999, height: 32, padding: '0 12px',
              display: 'inline-flex', alignItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), inset 0 1px 1px rgba(255,255,255,0.85)'}}>ACK</span>} />
          <span style={{fontSize: 13, lineHeight: '22px', color: GL.inkSoftFloat}}>{or.length >= 4 ? `Saved as INV#${or}` : 'Tap ACK if the slip has no number.'}</span>
        </Field>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        <Field float label="Mode of payment"><Select field value="Cash" /></Field>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
        <Field float label="Months covered"><Input float value="1" /></Field>
        <Field float label="Covering from"><Input float value="09/29/2026" right={<Calendar size={16} color={C.ink} />} /></Field>
        <Field float label="Covering to"><Input float value="10/28/2026" /></Field>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end'}}>
        <Field float label="Date paid"><Input float value="09/29/2026" right={<Calendar size={16} color={C.ink} />} /></Field>
        <div style={{padding: '4px 0'}}>
          <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaintFloat}}>Total</div>
          <div style={{fontSize: 30, lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.025em', color: C.brand, marginTop: 4, ...tab}}>{total}</div>
        </div>
      </div>
      {unitOpen > 0 ? (
        <Glass tone="menu" r={20} style={{position: 'absolute', left: 24, right: 24, top: 96, padding: 6, zIndex: 3, opacity: Math.min(1, unitOpen * 2),
          transform: `translateY(${(1 - unitOpen) * -8}px) scale(${lerp(0.97, 1, unitOpen)})`, transformOrigin: 'top left'}}>
          {UNIT_OPTIONS.map((o) => {
            const on = o.startsWith('2B') && hoverOption;
            return <div key={o} style={{height: 36, boxSizing: 'border-box', padding: '8px 12px', borderRadius: 16, marginBottom: 2, fontSize: 14, lineHeight: '20px', background: on ? GL.hover : 'transparent'}}>{o}</div>;
          })}
        </Glass>
      ) : null}
    </div>
    <div style={{height: 93, boxSizing: 'border-box', padding: 24, borderTop: `1px solid ${GL.line}`, display: 'flex', justifyContent: 'flex-end', gap: 12}}>
      <Btn kind="quiet" style={{color: GL.inkSoftFloat, minWidth: 120}}>Cancel</Btn>
      <Btn kind="brand" icon={<Check size={16} />} press={press}>Record payment</Btn>
    </div>
  </Glass>
);

// Its confirmation, with the second-payment warning: the earlier payment it found, then every
// figure, and "Record it anyway" instead of "Record it". The wording is the dialog's own.
export const CONFIRM_W = 448;
export const ConfirmDialog: React.FC<{f: number; at: number}> = ({f, at}) => {
  const warn = pop(f, at + 8, {damping: 11, stiffness: 190});
  const shake = Math.sin(t01(f, at + 10, at + 26) * Math.PI * 5) * 6 * (1 - t01(f, at + 10, at + 26));
  const row = (k: string, v: React.ReactNode, strong = false) => (
    <div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 14, lineHeight: '20px'}}>
      <span style={{color: strong ? C.ink : GL.inkSoftFloat, fontWeight: strong ? 600 : 400}}>{k}</span><span style={{color: C.ink, textAlign: 'right'}}>{v}</span>
    </div>
  );
  const b = (s: string) => <b style={{fontWeight: 600, ...tab}}>{s}</b>;
  return (
    <Glass tone="float" r={24} style={{width: CONFIRM_W}}>
      <div style={{padding: '16px 16px 16px 24px', borderBottom: `1px solid ${GL.line}`, display: 'flex', justifyContent: 'space-between', gap: 16}}>
        <div style={{padding: '4px 0'}}>
          <div style={{fontFamily: sora, fontSize: 18, lineHeight: '24.75px', fontWeight: 600, letterSpacing: '-0.025em'}}>Record this payment?</div>
          <div style={{fontSize: 14, lineHeight: '20px', color: GL.inkSoftFloat, marginTop: 2}}>Check the figures against what you were handed. This writes to the records.</div>
        </div>
        <span style={{width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -6}}><X size={16} /></span>
      </div>
      <div style={{padding: 24, display: 'flex', flexDirection: 'column', gap: 32}}>
        <div style={{borderRadius: 20, background: 'rgba(252,228,180,0.5)', color: C.ink, padding: 16, fontSize: 14, lineHeight: '24px', display: 'flex', flexDirection: 'column', gap: 8,
          transform: `translateX(${shake}px) scale(${lerp(0.9, 1, warn)})`, opacity: Math.min(1, warn * 2)}}>
          <div style={{display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 600}}><TriangleAlert size={16} color={C.verify} style={{marginTop: 4, flexShrink: 0}} />2B already has a payment recorded for this period</div>
          <div>Sep 7 to Oct 6: ₱4,800.00 rent, invoice 5076, paid Sep 5, 2026</div>
          <div>Fine if this settles a remaining balance. If it's the same payment entered twice, check the invoice number first.</div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {row('Unit', b('2B'))}
          {row('Rent', b('₱4,800.00'))}
          {row('Water', <>{b('₱200.00')}<span style={{display: 'block', fontSize: 12, lineHeight: '16px', color: GL.inkFaintFloat}}>1 person × ₱200</span></>)}
          {row('Invoice', <span style={{fontFamily: MONO}}>INV#5120</span>)}
          <div style={{borderTop: `1px solid ${GL.line}`, paddingTop: 8}}>{row('Total', <b style={{fontSize: 18, lineHeight: '28px', fontWeight: 600, ...tab}}>₱5,000.00</b>, true)}</div>
          <div style={{borderTop: `1px solid ${GL.line}`, paddingTop: 8}}>{row('Covers', '1 month, Sep 29, 2026 to Oct 28, 2026')}</div>
          {row('Mode of payment', 'Cash')}
        </div>
      </div>
      <div style={{padding: '16px 24px 24px', borderTop: `1px solid ${GL.line}`, display: 'flex', justifyContent: 'flex-end', gap: 12}}>
        <Btn kind="quiet" style={{color: GL.inkSoftFloat, minWidth: 120}}>Go back</Btn>
        <Btn kind="brand">Record it anyway</Btn>
      </div>
    </Glass>
  );
};

// ---- Repairs ----------------------------------------------------------------------
// The repairs board (MaintenanceDispatchView.vue): three columns on the page, each its name and
// how many it holds, and each request a tile of glass: the unit and how urgent, what is wrong,
// then its kind, when it was reported and who is on it. One in progress carries Mark resolved.
export const BOARD = {col: 344, gap: 16, head: 46, card: 159, cardBtn: 195, cardGap: 12};
export const RepairCard: React.FC<{title: string; unit: string; category: string; reported: string; tech: string; prio: string; prioTone?: 'verify' | 'neutral'; resolve?: number; style?: React.CSSProperties}> = ({title, unit, category, reported, tech, prio, prioTone = 'neutral', resolve = 0, style}) => (
  <Glass style={{width: BOARD.col, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, ...style}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, height: 24}}>
      <div style={{fontSize: 16, lineHeight: '24px', fontWeight: 700, letterSpacing: '-0.025em', textTransform: 'uppercase'}}>Unit {unit}</div>
      <Pill tone={prioTone}>{prio}</Pill>
    </div>
    <div style={{fontSize: 18, lineHeight: '24.75px', fontWeight: 600}}>{title}</div>
    <div style={{display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}><span>{category}</span><span>Reported {reported}</span><span>{tech}</span></div>
    {resolve > 0 ? (
      <div style={{height: 36 * resolve, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end', marginTop: -10 * (1 - resolve), opacity: resolve}}>
        <Btn kind="brand" icon={<CircleCheck size={14} />} style={{minHeight: 36, height: 36, fontSize: 13, padding: '0 14px', gap: 6}}>Mark resolved</Btn>
      </div>
    ) : null}
  </Glass>
);
export const BoardColumn: React.FC<{title: string; n: number; children?: React.ReactNode}> = ({title, n, children}) => (
  <div style={{width: BOARD.col, fontFamily: jakarta, color: C.ink, paddingTop: 8}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', height: 22}}>
      <span style={{fontFamily: sora, fontSize: 15, lineHeight: '20px', fontWeight: 600, letterSpacing: '-0.02em'}}>{title}</span>
      <span style={{fontSize: 14, lineHeight: '20px', fontWeight: 600, color: C.inkSoft, ...tab}}>{n}</span>
    </div>
    <div style={{marginTop: 16, position: 'relative'}}>{children}</div>
  </div>
);

// ---- Inquiries --------------------------------------------------------------------
// views/InquiriesView.vue at the xl layout: the inquiries on the page at the left (search, then
// Status and Order), the one being read under a pane, and the conversation in a tile of glass at
// the right: who and where it stands, their number, the unit and its rate, Close inquiry and
// Move them in; what was said; and the reply box with its send button inside. A new inquiry
// drops in at the top (`arrive`), is picked (`picked`), her answer is typed, and sending it puts
// it in the thread (`saved`), which also moves the inquiry from "Waiting for an answer" to
// "Answered", as routes/admin.ts does when she replies.
export const INBOX = {w: MAIN_W, list: 434, gap: 16, detail: 614, head: 67, top: 91, h: 640, listHead: 100, row: 134, detailHead: 164, composer: 96};
type Lead = {name: string; date: string; unit: string; status: 'Pending' | 'Contacted' | 'Closed'; msg: string};
const STATUS_WORD = {Pending: 'Waiting for an answer', Contacted: 'Answered', Closed: 'Closed'} as const;
const STATUS_TONE = {Pending: 'verify', Contacted: 'neutral', Closed: 'neutral'} as const;
const LeadRow: React.FC<{lead: Lead; active?: number; first?: boolean}> = ({lead, active = 0, first}) => (
  <div style={{position: 'relative', height: lead.msg.length > 60 ? INBOX.row : 110, boxSizing: 'border-box', padding: '16px 0', borderTop: first ? 'none' : `1px solid ${GL.line}`}}>
    {active > 0 ? <div style={{position: 'absolute', inset: '0 -12px', borderRadius: 16, background: GL.hover, opacity: active}} /> : null}
    <div style={{position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8}}>
        <span style={{fontSize: 14, lineHeight: '20px', fontWeight: 600}}>{lead.name}</span><span style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>{lead.date}</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 6}}>
        <span style={{fontSize: 14, lineHeight: '20px', fontWeight: 600, color: C.brand}}>Unit {lead.unit}</span><Pill tone={STATUS_TONE[lead.status]}>{STATUS_WORD[lead.status]}</Pill>
      </div>
      <div style={{fontSize: 14, lineHeight: '24px', color: C.inkSoft, marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{lead.msg}</div>
    </div>
  </div>
);
// A message as both sides draw it: theirs a small tile of glass, hers deep green glass.
export const Bubble: React.FC<{mine?: boolean; who: string; when: string; text: string; p?: number}> = ({mine, who, when, text, p = 1}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 12}px)`, fontFamily: jakarta}}>
    <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, marginBottom: 4, padding: '0 4px'}}><span style={{fontWeight: 600, color: C.inkSoft}}>{who}</span> · {when}</div>
    <div style={{position: 'relative', maxWidth: 448, borderRadius: 16, padding: '12px 16px', fontSize: 14, lineHeight: '24px',
      ...(mine ? {background: 'rgba(14,72,46,0.8)', color: C.onBrand, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.32), inset 0 0 0 1px rgba(255,255,255,0.1)'}
        : {background: GL.tile, color: C.ink, boxShadow: `${GL.sheen}, ${GL.drop}, 0 0 0 1px ${GL.line}`}),
      transform: `scale(${lerp(0.9, 1, p)})`, transformOrigin: mine ? '100% 100%' : '0 100%'}}>{text}</div>
  </div>
);
// The toast that answers a saved reply (components/ui/ToastContainer.vue).
export const Toast: React.FC<{title: string; body: string; style?: React.CSSProperties}> = ({title, body, style}) => (
  <Glass tone="menu" r={20} style={{width: 384, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', ...style}}>
    <CheckCircle2 size={20} color={C.brand} style={{flexShrink: 0, marginTop: 2}} />
    <div>
      <div style={{fontSize: 14, lineHeight: '20px', fontWeight: 600}}>{title}</div>
      <div style={{fontSize: 14, lineHeight: '24px', color: GL.inkSoftFloat}}>{body}</div>
    </div>
  </Glass>
);
export const InquiryInbox: React.FC<{lead: Lead; others: Lead[]; arrive: number; picked: number; reply: string; replyFocus: boolean; replyText: string; saved: number; press?: number; refCode: string}> = ({
  lead, others, arrive, picked, reply, replyFocus, replyText, saved, press = 0, refCode,
}) => {
  const answered = saved >= 0.5;
  const now: Lead = {...lead, status: answered ? 'Contacted' : 'Pending'};
  const n = others.length + (arrive > 0.5 ? 1 : 0);
  return (
    <div style={{width: INBOX.w, fontFamily: jakarta, color: C.ink}}>
      <div style={{height: INBOX.head}}>
        <div style={{fontSize: 14, lineHeight: '20px', color: GL.inkFaint}}>Tuesday, September 29, 2026</div>
        <div style={{fontFamily: sora, fontSize: 34, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: '42.5px', marginTop: 4}}>Inquiries</div>
      </div>
      <div style={{display: 'flex', gap: INBOX.gap, marginTop: INBOX.top - INBOX.head, height: INBOX.h}}>
        <div style={{width: INBOX.list}}>
          <div style={{height: INBOX.listHead}}>
            <Input placeholder="Search" left={<Search size={16} color={GL.inkFaint} />} />
            <div style={{display: 'flex', gap: 12, marginTop: 12}}>
              <Select value="All inquiries" count={String(n)} w={210} /><Select value="Newest first" w={210} />
            </div>
          </div>
          <div style={{marginTop: 16}}>
            <div style={{height: arrive * 110, overflow: 'hidden'}}><LeadRow lead={now} active={picked} first /></div>
            {others.map((o, i) => <LeadRow key={o.name} lead={o} first={i === 0 && arrive < 0.02} />)}
          </div>
        </div>
        <Glass style={{width: INBOX.detail, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
          {picked < 1 ? (
            <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 48, opacity: 1 - picked}}>
              <Inbox size={32} color={GL.inkFaint} />
              <div style={{fontSize: 16, fontWeight: 600, marginTop: 12}}>Nothing picked yet</div>
              <div style={{fontSize: 14, lineHeight: '24px', color: C.inkSoft, marginTop: 4}}>Choose an inquiry to read it and answer.</div>
            </div>
          ) : null}
          {picked > 0 ? (
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', opacity: picked, transform: `translateY(${(1 - picked) * 10}px)`}}>
              <div style={{height: INBOX.detailHead, boxSizing: 'border-box', padding: 24, borderBottom: `1px solid ${GL.line}`}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8}}>
                  <span style={{fontFamily: sora, fontSize: 18, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.025em'}}>{lead.name}</span>
                  <span style={{fontSize: 12, letterSpacing: '0.08em', color: GL.inkFaint, ...tab}}>{refCode}</span>
                  <Pill tone={STATUS_TONE[now.status]}>{STATUS_WORD[now.status]}</Pill>
                </div>
                <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                  <div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, height: 44, fontSize: 14, fontWeight: 600, ...tab}}><Phone size={14} />0918 555 0142</div>
                    <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 8}}>
                      Unit <b style={{fontWeight: 600, color: C.ink}}>B3B</b>, <b style={{fontWeight: 600, color: C.ink}}>₱8,500</b> a month
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: 8}}>
                    <Btn kind="quiet" icon={<CircleX size={14} />}>Close inquiry</Btn>
                    <Btn kind="brand" icon={<UserPlus size={16} />}>Move them in</Btn>
                  </div>
                </div>
              </div>
              <div style={{flex: 1, boxSizing: 'border-box', background: GL.well, padding: 24, display: 'flex', flexDirection: 'column', gap: 20}}>
                <Bubble who={lead.name} when="Sep 29, 4:12 PM" text={lead.msg} />
                {saved > 0 ? <Bubble mine who="You" when="Sep 29, 4:20 PM" text={replyText} p={saved} /> : null}
              </div>
              <div style={{height: INBOX.composer, boxSizing: 'border-box', borderTop: `1px solid ${GL.line}`, padding: 20}}>
                <div style={{position: 'relative', height: 56, boxSizing: 'border-box', borderRadius: 28, border: `1px solid ${GL.fieldEdge}`, background: GL.field, padding: '15px 64px 0 20px',
                  fontSize: 14, lineHeight: '24px', color: reply ? C.ink : GL.inkFaint, boxShadow: replyFocus ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 5px #101713' : GL.fieldShadow}}>
                  {reply || 'Write a reply'}
                  {replyFocus ? <span style={{display: 'inline-block', width: 1.5, height: 17, background: C.ink, marginLeft: 1, verticalAlign: 'text-bottom'}} /> : null}
                  <div style={{position: 'absolute', right: 5, bottom: 5, width: 44, height: 44, borderRadius: 22, opacity: reply ? 1 : 0.5, transform: `scale(${1 - 0.06 * press})`}}>
                    <Btn kind="brand" press={press} style={{width: 44, height: 44, padding: 0}}><Send size={16} color="#fff" /></Btn>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Glass>
      </div>
    </div>
  );
};

// A chevron for a cluster that is closed (Rooms and rates, Monthly Income).
export const Closed = ChevronRight;
export {Rim};
