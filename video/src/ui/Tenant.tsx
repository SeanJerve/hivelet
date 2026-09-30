// The tenant's phone screens, from views/TenantOverviewView.vue and
// views/TenantTicketsView.vue, at the phone's own 390px width.
import React from 'react';
import {ChevronDown, CreditCard, Loader2, Send, Wrench, X} from 'lucide-react';
import {C, jakarta} from '../theme';
import {AppHeader, Btn, Field, Input, Pill, Tile} from './Kit';

export const PHONE_W = 390;
export const PHONE_H = 844;

// A phone body around a 390x844 screen: status bar and notch above the app,
// which starts STATUS pixels down, as it does on a real phone.
export const STATUS = 44;
export const Phone: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{width: PHONE_W + 24, height: PHONE_H + 24, boxSizing: 'border-box', padding: 12, borderRadius: 64,
    background: 'linear-gradient(145deg, #2a3a31 0%, #0f1b15 45%, #1c2a22 100%)',
    boxShadow: '0 60px 120px rgba(15,27,21,0.30), 0 18px 40px rgba(15,27,21,0.18), inset 0 0 0 1.5px rgba(255,255,255,0.12)', ...style}}>
    <div style={{width: PHONE_W, height: PHONE_H, borderRadius: 52, overflow: 'hidden', background: C.canvas, position: 'relative'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: STATUS, bottom: 0}}>{children}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: STATUS, background: C.canvas, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 30px', fontFamily: jakarta, fontSize: 15, fontWeight: 700, color: C.ink, zIndex: 5}}>
        <span>9:41</span>
        <span style={{display: 'flex', gap: 5, alignItems: 'center'}}>
          {[6, 9, 12].map((h) => <span key={h} style={{width: 3.5, height: h, borderRadius: 1, background: C.ink}} />)}
          <span style={{width: 24, height: 12, borderRadius: 4, border: `1.5px solid ${C.ink}`, marginLeft: 6, padding: 1.5, boxSizing: 'border-box'}}>
            <span style={{display: 'block', width: '75%', height: '100%', borderRadius: 2, background: C.ink}} />
          </span>
        </span>
      </div>
      <div style={{position: 'absolute', left: '50%', top: 10, width: 118, height: 34, marginLeft: -59, borderRadius: 17, background: '#050806', zIndex: 6}} />
    </div>
  </div>
);

// The Amount due tile on the tenant's Overview.
export const AmountDue: React.FC<{amount: string; settled?: number; press?: number; pill?: number; style?: React.CSSProperties}> = ({amount, settled = 0, press = 0, pill = 1, style}) => (
    <Tile tone="brand" title="Amount due" style={{gap: 12, minHeight: 300, ...style}}
      actions={settled < 0.5 ? <span style={{opacity: pill, transform: `scale(${0.6 + 0.4 * pill})`, display: 'inline-block'}}><Pill tone="on-dark">Due in 6 days</Pill></span> : null}>
      {settled < 0.5 ? (
        <div style={{opacity: 1 - settled * 2}}>
          <div style={{fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'}}>{amount}</div>
          <div style={{fontSize: 14, color: C.onBrandSoft, marginTop: 10}}>Due October 5, 2026</div>
          <div style={{fontSize: 14, lineHeight: '22px', color: C.onBrandSoft, marginTop: 12}}>
            Your recorded payments cover rent up to October 4, 2026. Paying now covers October 5, 2026 to November 4, 2026 (₱4,700.00).
          </div>
          <div style={{marginTop: 18}}><Btn kind="light" icon={<CreditCard size={16} />} press={press}>Pay with GCash</Btn></div>
        </div>
      ) : (
        <div style={{opacity: (settled - 0.5) * 2, transform: `translateY(${(1 - settled) * 24}px)`}}>
          <div style={{fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em'}}>Settled</div>
          <div style={{fontSize: 14, color: C.onBrandSoft, marginTop: 12}}>Next rent is due November 5, 2026.</div>
        </div>
      )}
    </Tile>
);

export const TenantHome: React.FC<{amount: string; settled?: number; press?: number; unread?: number; pill?: number}> = ({amount, settled = 0, press = 0, unread = 2, pill = 1}) => (
  <div style={{padding: '0 16px', fontFamily: jakarta, color: C.ink}}>
    <AppHeader phone initials="AV" unread={unread} />
    <div style={{fontSize: 14, color: C.inkSoft, marginTop: 20}}>Tuesday, September 29, 2026</div>
    <div style={{fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4}}>Good afternoon, Andrea</div>
    <div style={{fontSize: 14, color: C.inkSoft, marginTop: 4}}>Unit 1A, 1st Floor</div>
    <AmountDue amount={amount} settled={settled} press={press} pill={pill} style={{marginTop: 20}} />
    <Tile tone="night" title="Repairs" style={{marginTop: 16, gap: 12}}>
      <div style={{fontSize: 14, lineHeight: '22px', color: C.onNightSoft}}>Tell the landlady what needs fixing in your unit, then follow the request until it is done.</div>
      <div><Btn kind="light" icon={<Wrench size={16} />}>Request a repair</Btn></div>
    </Tile>
  </div>
);

export const RepairForm: React.FC<{title: string; details: string; focus: 'title' | 'details' | null; press?: number; unread?: number}> = ({title, details, focus, press = 0, unread = 2}) => (
  <div style={{padding: '0 16px', fontFamily: jakarta, color: C.ink}}>
    <AppHeader phone initials="AV" unread={unread} />
    <div style={{fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: C.inkSoft, marginTop: 20}}>MY ACCOUNT</div>
    <div style={{fontSize: 34, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4}}>Repairs</div>
    <div style={{fontSize: 15, lineHeight: '23px', color: C.inkSoft, marginTop: 6}}>Tell the landlady what is wrong in unit 1a, and follow what happens next.</div>
    <div style={{marginTop: 18, borderRadius: 24, background: C.tile}}>
      <div style={{padding: '20px 20px 16px', borderBottom: `1px solid ${C.line}`}}>
        <div style={{fontSize: 16, fontWeight: 600}}>Report it</div>
        <div style={{fontSize: 14, color: C.inkSoft, marginTop: 4}}>This goes straight to the landlady.</div>
      </div>
      <div style={{padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14}}>
        <Field label="What needs fixing"><Input value={title} placeholder="e.g. Bathroom sink pipe leak" focus={focus === 'title'} caret={focus === 'title'} /></Field>
        <Field label="Category"><Input value="Plumbing" right={<ChevronDown size={16} color={C.inkSoft} />} /></Field>
        <Field label="How urgent"><Input value="When you can" right={<ChevronDown size={16} color={C.inkSoft} />} /></Field>
        <Field label="Details"><Input area value={details} placeholder="Where it is in the unit, when it started, and how bad it is." focus={focus === 'details'} caret={focus === 'details'} /></Field>
        <Btn kind="brand" full icon={<Send size={14} />} press={press}>Send request</Btn>
      </div>
    </div>
  </div>
);

// The notification a tenant gets when the owner marks the repair done
// (backend/src/routes/admin.ts: "Your repair is done").
export const DoneNote: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div style={{margin: '0 12px', borderRadius: 22, background: C.tile, boxShadow: '0 20px 50px rgba(15,27,21,0.25)', padding: '16px 18px', display: 'flex', gap: 12, fontFamily: jakarta, color: C.ink, ...style}}>
    <div style={{width: 36, height: 36, borderRadius: 18, background: C.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><Wrench size={17} color={C.brand} /></div>
    <div>
      <div style={{fontSize: 15, fontWeight: 600}}>Your repair is done</div>
      <div style={{fontSize: 13, lineHeight: '19px', color: C.inkSoft, marginTop: 3}}>"Kitchen faucet keeps dripping" in unit 1A has been marked resolved. If something is still wrong, reply on the repair.</div>
    </div>
  </div>
);

// ---- Paying by GCash ------------------------------------------------------------
// The "Pay with GCash" dialog opening the payment page (AdyenPaymentModal.vue),
// and, back from GCash, the confirmation on the payments page
// (TenantPaymentsView.vue's gateway notice). Their words are the app's own.
export const PayOpening: React.FC<{spin: number; style?: React.CSSProperties}> = ({spin, style}) => (
  <div style={{width: 358, borderRadius: 24, background: C.tile, padding: '22px 22px 30px', boxSizing: 'border-box', fontFamily: jakarta, color: C.ink, ...style}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <span style={{fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em'}}>Pay with GCash</span><X size={16} color={C.inkSoft} />
    </div>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '34px 0 4px', textAlign: 'center'}}>
      <Loader2 size={28} color={C.brand} style={{transform: `rotate(${spin * 360}deg)`}} />
      <div style={{fontSize: 14, fontWeight: 500}}>Opening the payment page</div>
      <div style={{fontSize: 14, color: C.inkSoft}}>This takes a few seconds.</div>
    </div>
  </div>
);

export const PaymentReceived: React.FC<{check: number; style?: React.CSSProperties}> = ({check, style}) => (
  <div style={{width: 358, borderRadius: 24, background: C.brandSoft, padding: '18px 18px 18px 20px', boxSizing: 'border-box', fontFamily: jakarta, display: 'flex', gap: 12, ...style}}>
    <div style={{minWidth: 0}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, lineHeight: '24px', color: C.brand}}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={12} cy={12} r={10} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - Math.min(1, check * 1.6))} transform="rotate(-90 12 12)" />
          <path d="m9 12 2 2 4-4" pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - Math.max(0, check * 2.5 - 1.5))} />
        </svg>
        Payment received
      </div>
      <div style={{fontSize: 14, lineHeight: '23px', color: C.inkSoft, marginTop: 4}}>
        Adyen has confirmed it. It now shows as waiting for the landlady to check it, and you will not be asked to pay this bill again.
      </div>
    </div>
    <X size={16} color={C.inkSoft} style={{flexShrink: 0, marginTop: 4}} />
  </div>
);

// ---- Your rent, month by month ----------------------------------------------------
// components/overview/PaymentMonths.vue on the tenant's Payments page, drawn with
// MonthCapsules.vue in the tenant's own words (PaymentMonths' `capsuleTerms`).
// Seen on September 29, 2026, before she pays: October 2025 to September 2026,
// each a verified receipt of ₱4,700 except March, which has nothing on record.
// She is paid up to October 4; the next period is due October 5, which is
// PaymentMonths' "Due soon" headline. (The app would also draw October as a
// dashed Due month from a week before; the film stops at September, so no month
// after the day the film is set in is on screen.)
export type MonthKind = 'recorded' | 'unentered' | 'expected' | 'future';
export const TENANT_TERMS: Record<MonthKind, string> = {recorded: 'Paid', unentered: 'Nothing recorded', expected: 'Due', future: 'Not due yet'};
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const RENT_MONTHS: {short: string; long: string; kind: MonthKind; value: number | null}[] = Array.from({length: 12}, (_, i) => {
  const idx = 2025 * 12 + 9 + i;
  const month = idx % 12, year = Math.floor(idx / 12);
  const nothing = month === 2 && year === 2026;
  return {short: MONTH_LONG[month].slice(0, 3), long: `${MONTH_LONG[month]} ${year}`, kind: nothing ? 'unentered' : 'recorded', value: nothing ? null : 4700};
});
const pesoApp = (v: number, decimals = 0) => `₱${v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}`;
// MonthCapsules' scale: the first round step at or above the largest value, and its ticks.
const SCALE_MAX = (() => {
  const top = Math.max(0, ...RENT_MONTHS.map((m) => (m.kind === 'recorded' || m.kind === 'expected' ? m.value ?? 0 : 0)));
  const magnitude = 10 ** Math.floor(Math.log10(top));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (step * magnitude >= top) return step * magnitude;
  return 10 * magnitude;
})();
const compact = (v: number) => (v >= 1000 ? `₱${Math.round(v / 1000).toLocaleString('en-PH')}k` : `₱${v}`);
const HATCH = `repeating-linear-gradient(135deg, ${C.hatch} 0 1.5px, transparent 1.5px 7px)`;
const PAID = RENT_MONTHS.filter((m) => m.kind === 'recorded');
const NOTHING = RENT_MONTHS.filter((m) => m.kind === 'unentered');

// `grow(i)` is how far capsule i has risen (0 to 1): the app's scaleY from the
// baseline with no overshoot, so a money chart never shows a wrong height. A
// month with nothing recorded has no height, so it settles in instead.
// `wide` is the layout from the sm breakpoint up (month names, figures in a row).
export const RentMonths: React.FC<{grow: (i: number) => number; figures?: number; wide?: boolean}> = ({grow, figures = 1, wide}) => {
  const selected = RENT_MONTHS.length - 1;
  const current = RENT_MONTHS[selected];
  const paid = PAID.length * 4700;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 16, fontFamily: jakarta, color: C.ink}}>
      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 8, fontSize: 16, fontWeight: 600, lineHeight: '24px'}}>
        <Pill tone="expected">Due soon</Pill>
        <span>Paid up to October 4, 2026. The next month is due on October 5, 2026.</span>
      </div>
      <div style={{display: 'flex', gap: 12}}>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 192, paddingBottom: 28, boxSizing: 'border-box', fontSize: 12, lineHeight: '16px',
          color: C.inkFaint, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
          {[SCALE_MAX, SCALE_MAX / 2, 0].map((t) => <span key={t}>{compact(t)}</span>)}
        </div>
        <div style={{flex: 1, display: 'grid', height: 192, gap: wide ? 8 : 2, gridTemplateColumns: `repeat(${RENT_MONTHS.length}, minmax(0, 1fr))`}}>
          {RENT_MONTHS.map((m, i) => {
            const g = grow(i);
            return (
              <div key={m.long} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%'}}>
                <span style={{position: 'relative', display: 'flex', width: '100%', maxWidth: 44, flex: 1, alignItems: 'flex-end'}}>
                  {m.kind === 'unentered' ? (
                    <span style={{position: 'absolute', inset: 0, borderRadius: 999, backgroundImage: HATCH, border: `1px solid ${C.line}`, opacity: g, transform: `scale(${0.9 + 0.1 * g})`}} />
                  ) : (
                    <span style={{width: '100%', height: `max(28px, ${((m.value ?? 0) / SCALE_MAX) * 100}%)`, borderRadius: 999, transformOrigin: '50% 100%', transform: `scaleY(${g})`,
                      background: i === selected ? C.brand : C.brandBright}} />
                  )}
                </span>
                <span style={{fontSize: 12, lineHeight: '16px', fontWeight: i === selected ? 600 : 400, color: i === selected ? C.ink : C.inkSoft}}>{wide ? m.short : m.short.charAt(0)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', columnGap: 24, rowGap: 12}}>
        <div>
          <div style={{fontSize: 12, lineHeight: '16px', color: C.inkFaint}}>{current.long}</div>
          <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums'}}>{pesoApp(current.value ?? 0)} {TENANT_TERMS.recorded.toLowerCase()}</div>
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 8, fontSize: 12, color: C.inkSoft}}>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}}><span style={{width: 12, height: 12, borderRadius: 6, background: C.brandBright}} />{TENANT_TERMS.recorded}</span>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}}><span style={{width: 12, height: 12, borderRadius: 6, backgroundImage: HATCH, border: `1px solid ${C.line}`, boxSizing: 'border-box'}} />{TENANT_TERMS.unentered}</span>
        </div>
      </div>
      <div style={{display: 'grid', gap: 16, borderTop: `1px solid ${C.line}`, paddingTop: 16, gridTemplateColumns: wide ? 'repeat(3, minmax(0, 1fr))' : '1fr'}}>
        {[
          ['Months paid', `${Math.round(PAID.length * figures)} of ${RENT_MONTHS.length}`, 'In the months shown'],
          ['Paid in these months', pesoApp(Math.round((paid * figures) / 100) * 100, 2), 'From receipts the landlady verified'],
          ['Due now', 'Nothing', null],
        ].map(([dt, dd, note]) => (
          <div key={dt}>
            <div style={{fontSize: 12, lineHeight: '16px', color: C.inkFaint}}>{dt}</div>
            <div style={{fontSize: 18, lineHeight: '28px', fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>{dd}</div>
            {note ? <div style={{fontSize: 12, lineHeight: '16px', color: C.inkSoft}}>{note}</div> : null}
          </div>
        ))}
      </div>
      <div style={{fontSize: 14, lineHeight: '24px', color: C.inkSoft}}>
        No payment is recorded for {NOTHING.map((m) => m.long).join(' and ')}. If you paid for it, ask the landlady to check her records.
      </div>
      <div style={{borderTop: `1px solid ${C.line}`, paddingTop: 12}}>
        <span style={{display: 'inline-flex', minHeight: 44, alignItems: 'center', fontSize: 14, color: C.inkSoft, textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: C.line}}>Show each month as a list</span>
      </div>
    </div>
  );
};

// The whole tile, as OverviewTile draws it (p-5 on a phone, p-6 from sm up).
export const RentMonthsTile: React.FC<{grow: (i: number) => number; figures?: number; wide?: boolean; style?: React.CSSProperties}> = ({grow, figures, wide, style}) => (
  <Tile title="Your rent, month by month" style={{padding: wide ? 24 : 20, ...style}}>
    <RentMonths grow={grow} figures={figures} wide={wide} />
  </Tile>
);

// The tenant's Payments page (TenantPaymentsView.vue) on the phone, `scroll`
// pixels down: its heading, the Due tile and Your rent as they read before she
// pays (no bill raised yet, her records stop at October 4), then the months. The
// top bar stays where it is.
export const PaymentsPage: React.FC<{grow: (i: number) => number; figures?: number; scroll: number}> = ({grow, figures, scroll}) => (
  <div style={{position: 'absolute', inset: 0, fontFamily: jakarta, color: C.ink, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 16, right: 16, top: 64, transform: `translateY(${-scroll}px)`, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 20}}>
      <div>
        <div style={{fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: C.inkFaint}}>MY ACCOUNT</div>
        <div style={{fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.25, marginTop: 4}}>Payments and billing</div>
        <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 4}}>Pay a bill with GCash, and see what has been recorded against your unit.</div>
        <div style={{display: 'inline-flex', minHeight: 44, alignItems: 'center', fontSize: 14, color: C.inkSoft, textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: C.line}}>How paying online works</div>
      </div>
      <Tile tone="brand" title="Due" style={{padding: 20}}>
        <div>
          <div style={{fontSize: 36, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums'}}>₱4,700.00</div>
          <div style={{fontSize: 14, lineHeight: '24px', color: C.onBrandSoft, marginTop: 8}}>
            Your recorded payments cover rent up to October 4, 2026. Paying now covers October 5, 2026 to November 4, 2026.
          </div>
        </div>
        <div><Btn kind="light" icon={<CreditCard size={16} />}>Pay with GCash</Btn></div>
        <div style={{fontSize: 12, lineHeight: '20px', color: C.onBrandSoft}}>₱4,700.00 per period. Paid in person? It shows here once the landlady records the receipt.</div>
      </Tile>
      <Tile title="Your rent" style={{padding: 20}}>
        <div style={{display: 'flex', flexDirection: 'column', fontSize: 14}}>
          {[['Rent', '₱4,500.00', null], ['Water', '₱200.00', '1 registered occupant at ₱200 each'], ['Each month', '₱4,700.00', null]].map(([k, v, note], i) => (
            <div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: i ? '10px 0' : '0 0 10px', borderTop: i ? `1px solid ${C.line}` : 'none'}}>
              <span style={{fontWeight: i === 2 ? 600 : 400}}>{k}{note ? <span style={{display: 'block', fontSize: 12, color: C.inkFaint}}>{note}</span> : null}</span>
              <span style={{fontWeight: 600, fontSize: i === 2 ? 18 : 14, fontVariantNumeric: 'tabular-nums'}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize: 14, lineHeight: '24px', color: C.inkSoft}}>Rent is due on the 5th of each month. It counts as overdue from the day after, with no grace period.</div>
      </Tile>
      <RentMonthsTile grow={grow} figures={figures} />
    </div>
    <div style={{position: 'absolute', left: 16, right: 16, top: 0, background: C.canvas}}><AppHeader phone initials="AV" unread={2} /></div>
  </div>
);
