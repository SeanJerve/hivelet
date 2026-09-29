// The owner's screens, piece by piece, from views/AdminOverviewView.vue,
// RoomDirectoryView.vue, IncomeCollectionsView.vue, MaintenanceDispatchView.vue,
// InquiriesView.vue, AuditLogsView.vue and the modals they open. Every label is
// the app's own. The people and amounts are the same invented sample data the
// capture harness uses.
import React from 'react';
import {Calendar, Check, ChevronDown, CreditCard, FileText, Inbox, Pencil, Plus, TriangleAlert, Wrench, X} from 'lucide-react';
import {C, jakarta} from '../theme';
import {count, lerp, peso, pop, t01} from '../anim';
import {Btn, Field, IconBtn, Input, Pill, Tile} from './Kit';

const soft = (dark: boolean) => (dark ? C.onNightSoft : C.inkSoft);

// ---- Overview ---------------------------------------------------------------

export const OverviewHead: React.FC<{f: number; at?: number; press?: number}> = ({f, at = 0, press = 0}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: jakarta, width: 1054}}>
    <div>
      <div style={{fontSize: 14, color: C.inkSoft, opacity: t01(f, at, at + 10)}}>Tuesday, September 29, 2026</div>
      <div style={{fontSize: 34, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4, color: C.ink, opacity: t01(f, at + 4, at + 18), transform: `translateY(${(1 - t01(f, at + 4, at + 22)) * 10}px)`}}>
        Good afternoon, Fe
      </div>
    </div>
    <div style={{display: 'flex', gap: 10}}>
      <Btn kind="plain" icon={<Calendar size={16} />}>2026 <ChevronDown size={14} /></Btn>
      <Btn kind="brand" icon={<Plus size={16} />} press={press}>Record payment</Btn>
      <Btn kind="plain" icon={<FileText size={16} />}>Record expense</Btn>
    </div>
  </div>
);

export const AttentionTile: React.FC<{f: number; at?: number; name?: string; unit?: string; amount?: number; press?: number}> = ({
  f, at = 0, name = 'Adrian Molato', unit = 'Unit F2B, Sep 29', amount = 5250, press = 0,
}) => {
  const n = pop(f, at + 6);
  return (
    <Tile tone="night" title="Needs your attention" w={430} h={340}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
        <span style={{fontSize: 48, fontWeight: 600, letterSpacing: '-0.03em', display: 'inline-block', transform: `scale(${lerp(0.4, 1, n)})`, opacity: Math.min(1, n * 2)}}>1</span>
        <span style={{fontSize: 15, color: C.onNightSoft}}>payment to verify, {peso(amount, 2)} in total</span>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', opacity: t01(f, at + 12, at + 22), transform: `translateX(${(1 - t01(f, at + 12, at + 26)) * 30}px)`}}>
        <div>
          <div style={{fontSize: 15, fontWeight: 600}}>{name}</div>
          <div style={{fontSize: 13, color: C.onNightSoft, marginTop: 4}}>{unit}</div>
        </div>
        <div style={{fontSize: 15, fontWeight: 600}}>{peso(amount, 2)}</div>
      </div>
      <div><Btn kind="light" press={press}>Review payments</Btn></div>
      <div style={{borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
          <span style={{fontSize: 30, fontWeight: 600}}>1</span>
          <span style={{fontSize: 15, color: C.onNightSoft}}>urgent repair open</span>
        </div>
        <span style={{fontSize: 15, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4}}>Open repairs</span>
      </div>
    </Tile>
  );
};

export const CollectedTile: React.FC<{f: number; at?: number}> = ({f, at = 0}) => (
  <Tile title="Collected in September" goto w={340} h={340}>
    <div style={{fontSize: 48, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8, fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, at + 4, 36, 160400))}</div>
    <div style={{fontSize: 15, color: C.inkSoft, marginTop: -6}}>{count(f, at + 4, 36, 26)} collections entered this month</div>
    <div style={{flex: 1}} />
    <div style={{borderTop: `1px solid ${C.line}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 15}}>
      <span style={{color: C.inkSoft}}>2026 so far</span>
      <span style={{fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, at + 10, 40, 1715600))}</span>
    </div>
  </Tile>
);

export const OccupancyTile: React.FC<{f: number; at?: number}> = ({f, at = 0}) => {
  const ticks = 44;
  const filled = t01(f, at + 4, at + 40) * ticks * (32 / 33);
  return (
    <Tile title="Occupancy" goto w={252} h={340}>
      <div style={{position: 'relative', height: 170, display: 'flex', justifyContent: 'center'}}>
        <svg width={200} height={110} viewBox="0 0 200 110" style={{marginTop: 18}}>
          {Array.from({length: ticks}, (_, i) => {
            const a = Math.PI - (i / (ticks - 1)) * Math.PI;
            const c = Math.cos(a), s = Math.sin(a);
            return <line key={i} x1={100 + c * 70} y1={100 - s * 70} x2={100 + c * 94} y2={100 - s * 94} stroke={i < filled ? C.brand : C.line} strokeWidth={5.5} strokeLinecap="round" />;
          })}
        </svg>
        <div style={{position: 'absolute', top: 74, textAlign: 'center'}}>
          <span style={{fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'}}>{count(f, at + 4, 36, 32)}</span>
          <span style={{fontSize: 24, color: C.inkSoft}}>/33</span>
          <div style={{fontSize: 13, color: C.inkSoft}}>units occupied</div>
        </div>
      </div>
      <div style={{textAlign: 'center', fontSize: 15, color: C.inkSoft, opacity: t01(f, at + 30, at + 40)}}>Vacant: B3B</div>
    </Tile>
  );
};

export const ChartTile: React.FC<{f: number; at?: number}> = ({f, at = 0}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const values = [0.972, 0.972, 0.972, 0.972, 0.972, 0.972, 0.972, 0.972, 0.802];
  return (
    <Tile title="Collections in 2026" goto w={697} h={420}>
      <div style={{display: 'flex', gap: 10, height: 230, alignItems: 'flex-end', paddingTop: 6}}>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 224, fontSize: 12, color: C.inkFaint, marginRight: 6, alignSelf: 'flex-start'}}>
          <span>₱200k</span><span>₱100k</span><span>₱0</span>
        </div>
        {months.map((m, i) => {
          const v = values[i];
          const g = pop(f, at + 6 + i * 3, {damping: 15, stiffness: 150});
          return (
            <div key={m} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
              <div style={{height: 210, width: '100%', display: 'flex', alignItems: 'flex-end'}}>
                {v === undefined ? (
                  <div style={{width: '100%', height: 210 * 0.97 * t01(f, at + 30 + i * 2, at + 44 + i * 2), borderRadius: 999, border: `1.5px dashed ${C.hatch}`, boxSizing: 'border-box'}} />
                ) : (
                  <div style={{width: '100%', height: Math.max(0, 210 * v * g), borderRadius: 999, background: i === 8 ? C.brand : C.brandBright}} />
                )}
              </div>
              <span style={{fontSize: 12, color: i === 8 ? C.ink : C.inkFaint, fontWeight: i === 8 ? 600 : 400}}>{m}</span>
            </div>
          );
        })}
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <div>
          <div style={{fontSize: 12, color: C.inkFaint}}>September 2026</div>
          <div style={{fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums'}}>{peso(count(f, at + 20, 30, 160400))} recorded</div>
        </div>
        <div style={{display: 'flex', gap: 16, fontSize: 12, color: C.inkSoft, alignItems: 'center'}}>
          <span style={{display: 'flex', gap: 6, alignItems: 'center'}}><span style={{width: 10, height: 10, borderRadius: 5, background: C.brandBright}} />Recorded</span>
          <span style={{display: 'flex', gap: 6, alignItems: 'center'}}><span style={{width: 10, height: 10, borderRadius: 5, border: `1.5px dashed ${C.hatch}`}} />Expected</span>
        </div>
      </div>
    </Tile>
  );
};

export const ClustersTile: React.FC<{f: number; at?: number}> = ({f, at = 0}) => {
  const rows = [
    {name: 'BH', of: [22, 22], rent: 104700},
    {name: 'Back Apartment', of: [4, 5], rent: 28000},
    {name: 'Penthouse', of: [1, 1], rent: 12000},
    {name: 'Front Apartment', of: [3, 3], rent: 24500},
  ];
  return (
    <Tile title="Units by cluster" goto w={341} h={420}>
      {rows.map((r, i) => {
        const p = t01(f, at + 8 + i * 5, at + 30 + i * 5);
        const segs = r.of[1];
        return (
          <div key={r.name} style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14}}>
              <span style={{fontWeight: 600}}>{r.name}</span><span style={{color: C.inkSoft}}>{r.of[0]} of {r.of[1]} occupied</span>
            </div>
            <div style={{display: 'flex', gap: segs > 10 ? 3 : 4}}>
              {Array.from({length: segs}, (_, k) => {
                const on = k < r.of[0] && k / segs < p;
                return <div key={k} style={{flex: segs > 10 ? undefined : 1, width: segs > 10 ? 9 : undefined, height: 8, borderRadius: 4,
                  background: on ? C.brand : k < r.of[0] ? C.line : `repeating-linear-gradient(135deg, ${C.hatch} 0 1.5px, transparent 1.5px 5px)`}} />;
              })}
            </div>
            <div style={{fontSize: 12, color: C.inkSoft}}>Monthly rent of occupied units {peso(count(f, at + 8 + i * 5, 26, r.rent))}</div>
          </div>
        );
      })}
    </Tile>
  );
};

// ---- Rooms and rates ---------------------------------------------------------------

export const UnitCard: React.FC<{code: string; type: string; tenant?: string; rent: number; vacant?: boolean; style?: React.CSSProperties}> = ({code, type, tenant, rent, vacant, style}) => (
  <div style={{width: 241, height: 198, boxSizing: 'border-box', borderRadius: 20, border: `1px solid ${C.line}`, background: C.tile, padding: '18px 20px', fontFamily: jakarta, color: C.ink, ...style}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <div>
        <div style={{fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '28px'}}>{code}</div>
        <div style={{fontSize: 14, color: C.inkSoft, marginTop: 2}}>{type}</div>
      </div>
      <Pill tone={vacant ? 'unentered' : 'paid'}>{vacant ? 'Vacant' : 'Occupied'}</Pill>
    </div>
    <div style={{borderTop: `1px solid ${C.line}`, margin: '14px 0 12px'}} />
    <div style={{fontSize: 12, color: C.inkFaint}}>Tenant</div>
    <div style={{fontSize: 14, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{tenant ?? '—'}</div>
    <div style={{fontSize: 12, color: C.inkFaint, marginTop: 10}}>Monthly rent</div>
    <div style={{fontSize: 14, fontWeight: 600, marginTop: 2}}>{peso(rent)}</div>
  </div>
);

// ---- Monthly Income ---------------------------------------------------------------

export type LedgerRowData = {unit: string; paid: string; period: string; who: string; or: string; rent: number; water: number; heads: number; garbage: number};
export const LEDGER_COLS = [70, 150, 220, 118, 118, 118, 96, 128];
export const LedgerHead: React.FC = () => (
  <div style={{display: 'flex', padding: '0 28px', height: 48, alignItems: 'center', fontSize: 12, color: C.inkFaint, fontFamily: jakarta, borderBottom: `1px solid ${C.line}`}}>
    {['Unit', 'Paid', 'Who', 'Rent', '50% Share', 'Water', 'Garbage', 'Remitted'].map((h, i) => (
      <div key={h} style={{width: LEDGER_COLS[i], textAlign: i >= 3 ? 'right' : 'left', paddingRight: i >= 3 ? 12 : 0}}>{h}</div>
    ))}
  </div>
);
export const LedgerRow: React.FC<{r: LedgerRowData; flash?: number; style?: React.CSSProperties}> = ({r, flash = 0, style}) => {
  const cells = [peso(r.rent, 2), peso(r.rent / 2, 2), peso(r.water, 2), peso(r.garbage, 2), peso(r.rent + r.water + r.garbage, 2)];
  return (
    <div style={{display: 'flex', padding: '0 28px', height: 62, alignItems: 'center', fontSize: 14, fontFamily: jakarta, color: C.ink,
      borderBottom: `1px solid ${C.line}`, background: `rgba(226,240,231,${flash})`, ...style}}>
      <div style={{width: LEDGER_COLS[0], fontWeight: 600, textTransform: 'uppercase'}}>{r.unit}</div>
      <div style={{width: LEDGER_COLS[1]}}>{r.paid}<div style={{fontSize: 12, color: C.inkFaint}}>{r.period}</div></div>
      <div style={{width: LEDGER_COLS[2]}}>{r.who}<div style={{fontSize: 12, color: C.inkFaint}}>{r.or}</div></div>
      {cells.map((c, i) => (
        <div key={i} style={{width: LEDGER_COLS[3 + i], textAlign: 'right', paddingRight: 12, fontVariantNumeric: 'tabular-nums',
          color: i === 1 ? C.verify : i === 4 ? C.brand : C.ink, fontWeight: i === 4 ? 600 : 400}}>
          {c}
          {i === 2 ? <div style={{fontSize: 12, color: C.inkFaint}}>{r.heads} head{r.heads > 1 ? 's' : ''}</div> : null}
        </div>
      ))}
    </div>
  );
};

// The on-site payment dialog, components/modals/OnsitePaymentModal.vue.
export const RecordModal: React.FC<{f: number; unit: string; unitOpen?: number; or: string; orFocus?: boolean; rent: string; water: string; total: string; press?: number}> = ({
  unit, unitOpen = 0, or, orFocus, rent, water, total, press = 0,
}) => (
  <div style={{width: 768, borderRadius: 28, background: C.tile, fontFamily: jakarta, color: C.ink, boxShadow: '0 40px 120px rgba(15,27,21,0.35)'}}>
    <div style={{padding: '28px 32px 22px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between'}}>
      <div>
        <div style={{fontSize: 21, fontWeight: 600, letterSpacing: '-0.01em'}}>Record payment</div>
        <div style={{fontSize: 15, color: C.inkSoft, marginTop: 6}}>Money handed over in person, or an online payment you are entering yourself.</div>
      </div>
      <IconBtn><X size={18} /></IconBtn>
    </div>
    <div style={{padding: '22px 32px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative'}}>
      <Field label="Unit"><Input value={unit} focus={unitOpen > 0} right={<ChevronDown size={16} color={C.inkSoft} />} /></Field>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        <Field label="Rent"><Input value={rent} /></Field>
        <Field label="Water"><Input value={water} /><span style={{fontSize: 13, color: C.inkSoft}}>₱200 × 1 person</span></Field>
        <Field label="Garbage fee"><Input value="0" /></Field>
        <Field label="Receipt (OR) number"><Input value={or} placeholder="OR#4627" mono focus={orFocus} caret={orFocus} /></Field>
        <Field label="How they paid"><Input value="Cash" right={<ChevronDown size={16} color={C.inkSoft} />} /></Field>
        <Field label="Their reference number" style={{opacity: 0.55}}><Input placeholder="GCash reference" disabled /></Field>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end'}}>
        <Field label="Date received"><Input value="29/09/2026" right={<Calendar size={16} color={C.inkSoft} />} /></Field>
        <div style={{borderRadius: 18, background: C.canvas, padding: '12px 18px'}}>
          <div style={{fontSize: 12, color: C.inkFaint}}>Total handed over</div>
          <div style={{fontSize: 26, fontWeight: 600, color: C.brand, fontVariantNumeric: 'tabular-nums'}}>{total}</div>
        </div>
      </div>
      {unitOpen > 0 ? (
        <div style={{position: 'absolute', left: 32, right: 32, top: 90, borderRadius: 20, background: C.tile, boxShadow: '0 20px 50px rgba(15,27,21,0.2)', border: `1px solid ${C.line}`,
          padding: 6, opacity: Math.min(1, unitOpen * 2), transform: `translateY(${(1 - unitOpen) * -10}px) scale(${lerp(0.96, 1, unitOpen)})`, transformOrigin: 'top center'}}>
          {['1A, Andrea Villanueva (BH)', '1B, Paolo Dimayuga (BH)', '2A, Nicole Ong (BH)', '2B, Renzo Abrenica (BH)', '2C, Trisha Delos Santos (BH)'].map((o) => (
            <div key={o} style={{padding: '10px 14px', borderRadius: 14, fontSize: 14, background: o.startsWith('2B') && unitOpen > 0.9 ? C.brandSoft : 'transparent',
              color: o.startsWith('2B') && unitOpen > 0.9 ? C.brand : C.ink, fontWeight: o.startsWith('2B') && unitOpen > 0.9 ? 600 : 400}}>{o}</div>
          ))}
        </div>
      ) : null}
    </div>
    <div style={{padding: '18px 32px 24px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 10}}>
      <Btn kind="plain">Cancel</Btn>
      <Btn kind="brand" icon={<Check size={16} />} press={press}>Record payment</Btn>
    </div>
  </div>
);

// Its confirmation, with the second-payment warning.
export const ConfirmDialog: React.FC<{f: number; at: number}> = ({f, at}) => {
  const warn = pop(f, at + 8, {damping: 11, stiffness: 190});
  const shake = Math.sin(t01(f, at + 10, at + 26) * Math.PI * 5) * 6 * (1 - t01(f, at + 10, at + 26));
  return (
    <div style={{width: 448, borderRadius: 28, background: C.tile, fontFamily: jakarta, color: C.ink, boxShadow: '0 40px 120px rgba(15,27,21,0.4)'}}>
      <div style={{padding: '26px 28px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between'}}>
        <div>
          <div style={{fontSize: 19, fontWeight: 600}}>Record this payment?</div>
          <div style={{fontSize: 14, color: C.inkSoft, marginTop: 6, lineHeight: '20px'}}>Check the figures against what you were handed. This writes to the ledger.</div>
        </div>
        <IconBtn><X size={18} /></IconBtn>
      </div>
      <div style={{padding: '22px 28px 8px'}}>
        <div style={{borderRadius: 18, background: C.verifySoft, color: C.ink, padding: '14px 18px', fontSize: 13.5, lineHeight: '21px',
          transform: `translateX(${shake}px) scale(${lerp(0.9, 1, warn)})`, opacity: Math.min(1, warn * 2)}}>
          <div style={{display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, color: C.ink}}><TriangleAlert size={16} color={C.verify} />2B already has a payment recorded for this period</div>
          <div style={{marginTop: 6}}>Sep 7 {'–'} Oct 6: ₱4,800.00 rent, OR#5076, paid Sep 5, 2026</div>
          <div style={{marginTop: 6}}>Fine if this settles a remaining balance. If it's the same receipt entered twice, check the OR number first.</div>
        </div>
        {[['Unit', '2B'], ['Rent', '₱4,800.00'], ['Water', '₱200.00'], ['Garbage fee', '₱0.00']].map(([k, v]) => (
          <div key={k} style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '7px 0', color: C.inkSoft}}><span>{k}</span><span style={{color: C.ink}}>{v}</span></div>
        ))}
        <div style={{display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.line}`, padding: '12px 0', fontWeight: 600}}><span>Total handed over</span><span style={{fontSize: 20}}>₱5,000.00</span></div>
      </div>
      <div style={{padding: '14px 28px 22px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end', gap: 10}}>
        <Btn kind="plain">Go back</Btn>
        <Btn kind="brand">Record it anyway</Btn>
      </div>
    </div>
  );
};

// ---- Repairs ---------------------------------------------------------------

export const RepairCard: React.FC<{title: string; meta: string; reported: string; tech: string; prio: string; prioTone?: 'verify' | 'neutral'; style?: React.CSSProperties}> = ({title, meta, reported, tech, prio, prioTone = 'neutral', style}) => (
  <div style={{width: 293, boxSizing: 'border-box', borderRadius: 20, border: `1px solid ${C.line}`, background: C.tile, padding: '18px 20px', fontFamily: jakarta, color: C.ink, ...style}}>
    <div style={{display: 'flex', justifyContent: 'space-between', gap: 8}}>
      <div style={{fontSize: 15, fontWeight: 600, lineHeight: '20px'}}>{title}</div>
      <Pill tone={prioTone}>{prio}</Pill>
    </div>
    <div style={{fontSize: 13, color: C.inkFaint, marginTop: 4}}>{meta}</div>
    <div style={{fontSize: 13, color: C.inkSoft, marginTop: 12}}><span style={{color: C.inkFaint}}>Reported </span>{reported}</div>
    <div style={{fontSize: 13, color: C.inkSoft, marginTop: 4}}><span style={{color: C.inkFaint}}>Technician </span>{tech}</div>
    <div style={{marginTop: 14}}><Btn kind="plain" icon={<Pencil size={14} />}>Manage</Btn></div>
  </div>
);

export const BoardColumn: React.FC<{title: string; sub: string; n: number; h: number; children?: React.ReactNode}> = ({title, sub, n, h, children}) => (
  <div style={{width: 341, height: h, boxSizing: 'border-box', borderRadius: 24, background: C.tile, padding: 24, fontFamily: jakarta, color: C.ink}}>
    <div style={{display: 'flex', justifyContent: 'space-between'}}>
      <div>
        <div style={{fontSize: 16, fontWeight: 600}}>{title}</div>
        <div style={{fontSize: 13, color: C.inkFaint, marginTop: 2}}>{sub}</div>
      </div>
      <span style={{width: 26, height: 26, borderRadius: 13, background: C.canvas, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{n}</span>
    </div>
    <div style={{marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative'}}>{children}</div>
  </div>
);

// One row of the notification panel, components/layout/NotificationPopover.vue.
export const NoteRow: React.FC<{kind: 'pay' | 'repair' | 'inquiry'; title: string; msg: string; when: string; soon?: boolean; word: string; style?: React.CSSProperties}> = ({kind, title, msg, when, soon, word, style}) => {
  const Icon = kind === 'pay' ? CreditCard : kind === 'repair' ? Wrench : Inbox;
  return (
    <div style={{display: 'flex', gap: 14, padding: '18px 22px', background: '#f3f7f4', borderBottom: `1px solid ${C.line}`, fontFamily: jakarta, color: C.ink, ...style}}>
      <div style={{width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: kind === 'inquiry' ? C.brandSoft : C.verifySoft, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon size={17} color={kind === 'inquiry' ? C.brand : C.verify} />
      </div>
      <div style={{flex: 1}}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontSize: 15, fontWeight: 600}}>{title}</span><span style={{fontSize: 12, color: C.inkFaint}}>{when}</span></div>
        <div style={{fontSize: 14, color: C.inkSoft, marginTop: 4, lineHeight: '20px'}}>{msg}</div>
        <div style={{display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, fontSize: 12}}>
          {soon ? <Pill tone="verify">Soon</Pill> : null}<span style={{color: C.inkSoft}}>{word}</span><span style={{color: C.brand, fontWeight: 600}}>Unread</span>
        </div>
      </div>
    </div>
  );
};
export const NotePanel: React.FC<{unread: number; children: React.ReactNode; w?: number}> = ({unread, children, w = 420}) => (
  <div style={{width: w, borderRadius: 22, background: C.tile, overflow: 'hidden', boxShadow: '0 30px 80px rgba(15,27,21,0.25)', fontFamily: jakarta, color: C.ink}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 12px 22px', borderBottom: `1px solid ${C.line}`}}>
      <div style={{fontSize: 15, fontWeight: 600}}>Notifications <span style={{color: C.brand, fontSize: 13, marginLeft: 4}}>{unread} unread</span></div>
      <div style={{display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: C.brand, fontWeight: 600}}><Check size={14} />Mark all read<IconBtn size={36}><X size={16} /></IconBtn></div>
    </div>
    <div style={{display: 'flex', gap: 6, padding: '12px 18px', fontSize: 13, color: C.inkSoft, borderBottom: `1px solid ${C.line}`}}>
      {['All', 'Unread', 'Payments', 'Repairs', 'Inquiries'].map((c, i) => (
        <span key={c} style={{padding: '6px 12px', borderRadius: 999, background: i === 0 ? C.ink : 'transparent', color: i === 0 ? '#fff' : C.inkSoft, fontWeight: i === 0 ? 600 : 500}}>{c}</span>
      ))}
    </div>
    {children}
  </div>
);

// ---- Inquiries and Activity -------------------------------------------------------

export const InquiryItem: React.FC<{name: string; when: string; unit: string; status: string; tone: 'verify' | 'neutral'; msg: string; active?: boolean; style?: React.CSSProperties}> = ({name, when, unit, status, tone, msg, active, style}) => (
  <div style={{width: 470, boxSizing: 'border-box', padding: '20px 24px', background: active ? '#e6efe9' : C.tile, borderBottom: `1px solid ${C.line}`, fontFamily: jakarta, color: C.ink, ...style}}>
    <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontSize: 16, fontWeight: 600}}>{name}</span><span style={{fontSize: 13, color: C.inkSoft}}>{when}</span></div>
    <div style={{display: 'flex', gap: 10, alignItems: 'center', marginTop: 8}}><span style={{fontSize: 15, fontWeight: 600, color: C.brand}}>Unit {unit}</span><Pill tone={tone}>{status}</Pill></div>
    <div style={{fontSize: 15, color: C.inkSoft, marginTop: 10, lineHeight: '22px'}}>{msg}</div>
  </div>
);

export const ActivityRow: React.FC<{tag: string; when: string; on: string; id: string; style?: React.CSSProperties}> = ({tag, when, on, id, style}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 1054, boxSizing: 'border-box', padding: '22px 28px', background: C.tile,
    borderBottom: `1px solid ${C.line}`, fontFamily: jakarta, color: C.ink, ...style}}>
    <div>
      <div style={{display: 'flex', gap: 12, alignItems: 'center'}}><Pill tone={tag === 'Payment recorded' || tag === 'Payment verified' ? 'paid' : 'neutral'}>{tag}</Pill><span style={{fontSize: 15, color: C.inkSoft}}>{when}</span></div>
      <div style={{fontSize: 15, marginTop: 10}}><b style={{fontWeight: 600}}>Fe Galang Da Silva</b><span style={{color: C.inkSoft}}>, admin, on </span><b style={{fontWeight: 600}}>{on}</b></div>
      <div style={{fontSize: 13, color: C.inkFaint, marginTop: 4}}>Record {id} · no address recorded</div>
    </div>
    <Btn kind="plain" icon={null}>What changed <ChevronDown size={14} /></Btn>
  </div>
);
