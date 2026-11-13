// The tenant's phone screens as they are since the redesign of November 2026, at the phone's own
// 390px width: views/TenantOverviewView.vue, TenantPaymentsView.vue, TenantTicketsView.vue and
// components/modals/AdyenPaymentModal.vue. Labels, sizes and colours were read from the running
// app on the sample-data harness on 13 Nov 2026. Andrea Villanueva of unit 1A is a sample tenant.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {CheckCircle2, CreditCard, Image as ImageIcon, Loader2, Search, Send, ShieldCheck, SlidersHorizontal, Wrench, X} from 'lucide-react';
import {C, GL, jakarta, sora} from '../theme';
import {AppHeader, Btn, Field, Glass, Input, Pill, Select, Tile} from './Kit';

export const PHONE_W = 390;
export const PHONE_H = 844;
const tab: React.CSSProperties = {fontVariantNumeric: 'tabular-nums'};
// The page behind a phone's screen: the app's wash at a phone's size.
const PHONE_WASH = 'radial-gradient(440px 370px at 6% 8%, rgba(150,226,182,0.36), transparent 70%), radial-gradient(370px 320px at 92% 4%, rgba(196,238,170,0.36), transparent 70%), radial-gradient(420px 355px at 96% 62%, rgba(160,230,205,0.33), transparent 70%), radial-gradient(390px 340px at 34% 100%, rgba(212,244,196,0.39), transparent 70%), #f8fbf9';

// A phone body around a 390x844 screen: status bar and notch above the app,
// which starts STATUS pixels down, as it does on a real phone.
export const STATUS = 44;
export const Phone: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{width: PHONE_W + 24, height: PHONE_H + 24, boxSizing: 'border-box', padding: 12, borderRadius: 64,
    background: 'linear-gradient(145deg, #2a3a31 0%, #0f1b15 45%, #1c2a22 100%)',
    boxShadow: '0 60px 120px rgba(15,27,21,0.30), 0 18px 40px rgba(15,27,21,0.18), inset 0 0 0 1.5px rgba(255,255,255,0.12)', ...style}}>
    <div style={{width: PHONE_W, height: PHONE_H, borderRadius: 52, overflow: 'hidden', background: PHONE_WASH, position: 'relative'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: STATUS, bottom: 0}}>{children}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: STATUS, background: '#f1f9f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 30px', fontFamily: jakarta, fontSize: 15, fontWeight: 700, color: C.ink, zIndex: 5}}>
        <span>3:20</span>
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

// The Amount due tile on the tenant's Overview: how soon, how much, the day it is due, the month
// it pays for and how far the landlady's records reach, then Pay with GCash.
export const AMOUNT_DUE_H = 316;
export const AmountDue: React.FC<{amount: string; press?: number; pill?: number; style?: React.CSSProperties}> = ({amount, press = 0, pill = 1, style}) => (
  <Tile tone="brand" title="Amount due" goto pad={20} style={{height: AMOUNT_DUE_H, ...style}}>
    <div>
      <div style={{fontSize: 14, lineHeight: '20px', fontWeight: 600, color: C.onBrandSoft, opacity: pill, transform: `translateY(${(1 - pill) * 6}px)`}}>Due in 6 days</div>
      <div style={{fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.025em', marginTop: 8, ...tab}}>{amount}</div>
      <div style={{fontSize: 14, lineHeight: '20px', color: C.onBrandSoft, marginTop: 12}}>Due October 5, 2026</div>
      <div style={{fontSize: 14, lineHeight: '20px', color: C.onBrandSoft, marginTop: 4}}>Rent for October 2026</div>
      <div style={{fontSize: 14, lineHeight: '24px', color: C.onBrandSoft, marginTop: 12}}>Payments recorded up to October 4, 2026.</div>
    </div>
    <div><Btn kind="light" icon={<CreditCard size={16} />} press={press}>Pay with GCash</Btn></div>
  </Tile>
);

// One payment on her Overview's Payments list: what it was for and how it was paid, then where
// it stands and how much.
export const PayRow: React.FC<{a: string; b: string; status: React.ReactNode; amount: string; first?: boolean}> = ({a, b, status, amount, first}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: first ? 'none' : `1px solid ${GL.line}`}}>
    <span>
      <span style={{display: 'block', fontSize: 14, lineHeight: '20px', fontWeight: 500}}>{a}</span>
      <span style={{display: 'block', fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>{b}</span>
    </span>
    <span style={{display: 'flex', alignItems: 'center', gap: 12}}>{status}<span style={{fontSize: 14, lineHeight: '20px', fontWeight: 600, ...tab}}>{amount}</span></span>
  </div>
);

// Her Overview. `due` is how much of the Amount due tile is left (1, then 0 once her payment
// covers it and the tile makes way, as TenantOverviewView.vue's `sentCoversDue` does). `sent` is
// her GCash payment showing as "Waiting for verification"; `verified` turns it into a receipt in
// "Recorded by the landlady" the moment it leaves 0, and runs to 1 as the new row settles.
export const TenantHome: React.FC<{amount: string; due?: number; sent?: number; verified?: number; press?: number; unread?: number; pill?: number}> = ({amount, due = 1, sent = 0, verified = 0, press = 0, unread = 2, pill = 1}) => (
  <div style={{fontFamily: jakarta, color: C.ink}}>
    <AppHeader phone initials="AV" unread={unread} />
    <div style={{padding: '24px 16px 0'}}>
      <div style={{fontSize: 14, lineHeight: '20px', color: GL.inkFaint}}>Tuesday, September 29, 2026</div>
      <div style={{fontFamily: sora, fontSize: 30, lineHeight: '37.5px', fontWeight: 500, letterSpacing: '-0.025em', marginTop: 4}}>Good afternoon, Andrea</div>
      <div style={{height: (AMOUNT_DUE_H + 16) * due, marginTop: 20, overflow: 'hidden', opacity: Math.min(1, due * 1.5)}}>
        <AmountDue amount={amount} press={press} pill={pill} style={{transform: `scale(${0.96 + 0.04 * due})`, transformOrigin: '50% 0'}} />
      </div>
      <div style={{padding: '8px 0'}}>
        <div style={{fontFamily: sora, fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.025em', paddingTop: 10}}>Unit 1A</div>
        <div style={{position: 'relative', width: 256, height: 249, marginTop: 16}}>
          <Img src={staticFile('floorplans/ground.png')} style={{display: 'block', width: 256, height: 249}} />
          <span style={{position: 'absolute', left: '76.346%', top: '86.616%', transform: 'translate(-30%, -100%)', background: C.brand, color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 12, lineHeight: '16px', fontWeight: 600,
            boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 18px 42px -18px rgba(28,25,23,0.16)'}}>1A</span>
        </div>
        <div style={{fontSize: 14, lineHeight: '20px', fontWeight: 500, marginTop: 15}}>Studio, 1st Floor</div>
      </div>
      <Tile title="Payments" goto style={{marginTop: 8}}>
        <div>
          {sent > 0 && verified <= 0 ? (
            <div style={{height: 61 * sent, overflow: 'hidden', opacity: sent, borderBottom: `1px solid ${GL.line}`}}>
              <PayRow first a="GCash" b="Sent Sep 29, 2026" status={<Pill tone="verify">Waiting for verification</Pill>} amount="₱4,700.00" />
            </div>
          ) : null}
          <div style={{fontFamily: sora, fontSize: 12, lineHeight: '16px', fontWeight: 500, color: GL.inkFaint, letterSpacing: '-0.02em', padding: '12px 0 4px'}}>Recorded by the landlady</div>
          {verified > 0 ? (
            <div style={{background: `rgba(23,96,63,${0.14 * (1 - verified)})`, margin: '0 -8px', padding: '0 8px', borderRadius: 12}}>
              <PayRow first a="Rent, Oct 5 to Nov 4, 2026" b="Paid Sep 29, 2026, GCash" status={<Pill tone="paid">Verified</Pill>} amount="₱4,700.00" />
            </div>
          ) : null}
          <PayRow first={verified <= 0} a="Rent, Sep 5 to Oct 4, 2026" b="Paid Sep 4, 2026, Cash" status={<Pill tone="paid">Verified</Pill>} amount="₱4,700.00" />
          <PayRow a="Rent, Aug 5 to Sep 4, 2026" b="Paid Aug 4, 2026, Cash" status={<Pill tone="paid">Verified</Pill>} amount="₱4,700.00" />
        </div>
      </Tile>
    </div>
  </div>
);

// ---- Paying by GCash ------------------------------------------------------------
// The "Pay with GCash" dialog (AdyenPaymentModal.vue). Its words are the app's own, the first of
// them included: GCash here runs in Adyen's test environment and takes no real money. It opens
// the payment page, confirms the payment on the way back from GCash, and says it is sent and
// waiting for the landlady. `stage` is 0 opening, 1 confirming, 2 sent; `check` draws the tick.
export type PayStage = 0 | 1 | 2;
const PayBody: React.FC<{stage: PayStage; spin: number; check: number}> = ({stage, spin, check}) => (
  <>
    <div style={{borderRadius: 20, background: 'rgba(252,228,180,0.5)', padding: '12px 16px', fontSize: 14, lineHeight: '24px', color: C.ink}}>
      GCash here runs in a test mode and takes no real money. Please pay your rent in person.
    </div>
    {stage < 2 ? (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', textAlign: 'center'}}>
        <Loader2 size={28} color={C.brand} style={{transform: `rotate(${spin * 360}deg)`}} />
        <div style={{fontSize: 14, lineHeight: '20px', fontWeight: 500}}>{stage === 0 ? 'Opening the payment page' : 'Confirming your payment'}</div>
      </div>
    ) : (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', textAlign: 'center'}}>
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={12} cy={12} r={10} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - Math.min(1, check * 1.6))} transform="rotate(-90 12 12)" />
          <path d="m9 12 2 2 4-4" pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - Math.max(0, check * 2.5 - 1.5))} />
        </svg>
        <div style={{fontFamily: sora, fontSize: 18, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.025em'}}>Payment sent</div>
        <div style={{maxWidth: 384, fontSize: 14, lineHeight: '24px', color: GL.inkSoftFloat}}>It is waiting for the landlady to verify it.</div>
      </div>
    )}
  </>
);
const Adyen = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, lineHeight: '16px', color: GL.inkFaintFloat}}><ShieldCheck size={16} color={C.brand} />Payment details stay with Adyen</div>
);
// On the phone it is a sheet on the bottom edge, as every dialog is there.
export const PaySheet: React.FC<{h: number; stage: PayStage; spin: number; check: number}> = ({h, stage, spin, check}) => (
  <Glass tone="float" r="28px 28px 0 0" style={{width: PHONE_W, height: h, display: 'flex', flexDirection: 'column'}}>
    <div style={{height: 20, display: 'flex', justifyContent: 'center', paddingTop: 10, boxSizing: 'border-box'}}><span style={{width: 40, height: 6, borderRadius: 3, background: GL.line}} /></div>
    <div style={{height: 55, boxSizing: 'border-box', padding: '4px 12px 12px 20px', borderBottom: `1px solid ${GL.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontFamily: sora, fontSize: 18, lineHeight: '24.75px', fontWeight: 600, letterSpacing: '-0.025em'}}>Pay with GCash</div>
      <span style={{width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><X size={16} /></span>
    </div>
    <div style={{flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20}}><PayBody stage={stage} spin={spin} check={check} /></div>
    <div style={{padding: '12px 20px 20px', borderTop: `1px solid ${GL.line}`, display: 'flex', flexDirection: 'column', gap: 8}}>
      <Btn kind="quiet" full style={{color: GL.inkSoftFloat}}>{stage === 2 ? 'Done' : 'Cancel'}</Btn>
      <Adyen />
    </div>
  </Glass>
);
// The same dialog as it stands on a wider screen, for the close-up beside the phone.
export const PAY_CARD = {w: 448, h: 372};
export const PayCard: React.FC<{stage: PayStage; spin: number; check: number; style?: React.CSSProperties}> = ({stage, spin, check, style}) => (
  <Glass tone="float" r={24} style={{width: PAY_CARD.w, height: PAY_CARD.h, display: 'flex', flexDirection: 'column', ...style}}>
    <div style={{padding: '16px 16px 16px 24px', borderBottom: `1px solid ${GL.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontFamily: sora, fontSize: 18, lineHeight: '24.75px', fontWeight: 600, letterSpacing: '-0.025em'}}>Pay with GCash</div>
      <span style={{width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><X size={16} /></span>
    </div>
    <div style={{flex: 1, padding: '24px 24px 0', display: 'flex', flexDirection: 'column', gap: 4}}><PayBody stage={stage} spin={spin} check={check} /></div>
    <div style={{padding: '14px 24px 20px', borderTop: `1px solid ${GL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <Adyen />
      <Btn kind="quiet" style={{color: GL.inkSoftFloat}}>{stage === 2 ? 'Done' : 'Cancel'}</Btn>
    </div>
  </Glass>
);

// ---- Repairs --------------------------------------------------------------------
export const RepairForm: React.FC<{title: string; details: string; focus: 'title' | 'details' | null; press?: number; unread?: number}> = ({title, details, focus, press = 0, unread = 2}) => (
  <div style={{fontFamily: jakarta, color: C.ink}}>
    <AppHeader phone initials="AV" unread={unread} />
    <div style={{padding: '28px 16px 0'}}>
      <div style={{fontFamily: sora, fontSize: 30, lineHeight: '37.5px', fontWeight: 500, letterSpacing: '-0.025em'}}>Repairs</div>
      <div style={{fontFamily: sora, fontSize: 16, lineHeight: '24px', fontWeight: 600, letterSpacing: '-0.02em', marginTop: 20}}>Report it</div>
      <div style={{marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16}}>
        <Field label="What needs fixing"><Input value={title} placeholder="e.g. Bathroom sink pipe leak" focus={focus === 'title'} caret={focus === 'title'} style={{fontSize: 16}} /></Field>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <Field label="Category"><Select field value="Plumbing" style={{fontSize: 16}} /></Field>
          <Field label="How urgent"><Select field value="When you can" style={{fontSize: 16}} /></Field>
        </div>
        <Field label="Details"><Input area value={details} placeholder="Where it is in the unit, when it started, and how bad it is." focus={focus === 'details'} caret={focus === 'details'} style={{fontSize: 16, lineHeight: '20px', minHeight: 106}} /></Field>
        <Field label="Photo (optional)">
          <div style={{height: 112, boxSizing: 'border-box', borderRadius: 16, border: `2px dashed ${GL.line}`, background: GL.well, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6}}>
            <ImageIcon size={24} color={C.brand} />
            <span style={{fontSize: 12, lineHeight: '16px', fontWeight: 600, color: C.ink}}>Add a photo</span>
            <span style={{fontSize: 12, lineHeight: '16px', color: C.inkSoft}}>JPG or PNG</span>
          </div>
        </Field>
        <Btn kind="brand" full icon={<Send size={16} />} press={press} style={{marginTop: 16}}>Send request</Btn>
      </div>
    </div>
  </div>
);

// The notification a tenant gets when the landlady marks the repair done
// (backend/src/routes/admin.ts: "Your repair is done").
export const DoneNote: React.FC<{title: string; style?: React.CSSProperties}> = ({title, style}) => (
  <Glass tone="menu" r={22} style={{margin: '0 12px', padding: '16px 18px', display: 'flex', gap: 12, ...style}}>
    <div style={{width: 36, height: 36, borderRadius: 18, background: GL.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}><Wrench size={17} color={C.brand} /></div>
    <div>
      <div style={{fontSize: 15, lineHeight: '20px', fontWeight: 600}}>Your repair is done</div>
      <div style={{fontSize: 13, lineHeight: '19px', color: GL.inkSoftFloat, marginTop: 3}}>"{title}" in unit 1A has been marked resolved. If something is still wrong, reply on the repair.</div>
    </div>
  </Glass>
);

// ---- Her rent, month by month ----------------------------------------------------
// The Record tab of her Payments page (TenantPaymentsView.vue): one row for each month, the
// receipt the landlady verified for it or "Not recorded". It replaced the month chart on
// 7 Nov 2026. Seen on September 29, 2026, before she pays: October is the month now due, with
// nothing recorded yet; January to September each have a verified receipt of ₱4,700, paid in
// person. Ten months, as the page counts them.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
export const RECORD_MONTHS: {period: string; paid: string | null}[] = Array.from({length: 10}, (_, k) => {
  const m = 9 - k;
  return {period: `Rent, ${MONTHS[m]} 5 to ${MONTHS[m + 1]} 4`, paid: m === 9 ? null : `${MONTHS[m]} 4, 2026`};
});
const Tabs = () => (
  <div style={{display: 'flex', gap: 20, fontFamily: sora, fontSize: 15, lineHeight: '20px', letterSpacing: '-0.02em', paddingTop: 10}}>
    <span style={{color: C.inkSoft}}>History</span><span style={{fontWeight: 600, color: C.brand}}>Record</span>
  </div>
);

// The same list on a wider screen, where it is a table: the close-up beside the phone. `grow(i)`
// is how far row i has arrived (0 to 1).
const COLS = [250, 160, 130, 120, 140];
export const RECORD_TABLE_W = COLS.reduce((a, b) => a + b, 0);
export const RecordTable: React.FC<{grow: (i: number) => number}> = ({grow}) => {
  const c = (i: number): React.CSSProperties => ({width: COLS[i], boxSizing: 'border-box', padding: '0 16px 0 ' + (i ? 16 : 12) + 'px', textAlign: i === 2 ? 'right' : 'left'});
  return (
    <div style={{width: RECORD_TABLE_W, fontFamily: jakarta, color: C.ink}}>
      <Tabs />
      <div style={{display: 'flex', height: 43, alignItems: 'center', fontSize: 12, lineHeight: '18px', fontWeight: 600, borderBottom: `1px solid ${GL.line}`, marginTop: 14}}>
        {['For', 'Date paid', 'Amount', 'Method', 'Status'].map((h, i) => <div key={h} style={c(i)}>{h}</div>)}
      </div>
      {RECORD_MONTHS.map((m, i) => {
        const g = grow(i);
        return (
          <div key={m.period} style={{display: 'flex', height: 46, boxSizing: 'border-box', alignItems: 'center', fontSize: 14, lineHeight: '21px', borderTop: i ? `1px solid ${GL.line}` : 'none',
            opacity: g, transform: `translateY(${(1 - g) * 10}px)`, background: `rgba(23,96,63,${0.09 * Math.sin(Math.min(1, g) * Math.PI)})`}}>
            <div style={{...c(0), fontWeight: 500}}>{m.period}</div>
            <div style={{...c(1), color: C.inkSoft}}>{m.paid}</div>
            <div style={{...c(2), fontWeight: 600, color: m.paid ? C.brand : C.ink, ...tab}}>₱4,700.00</div>
            <div style={{...c(3), color: C.inkSoft}}>{m.paid ? 'Cash' : ''}</div>
            <div style={c(4)}><Pill tone={m.paid ? 'paid' : 'neutral'}>{m.paid ? 'Verified' : 'Not recorded'}</Pill></div>
          </div>
        );
      })}
      <div style={{textAlign: 'center', fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 14, opacity: grow(RECORD_MONTHS.length - 1)}}>10 of 10 months</div>
    </div>
  );
};

// The tenant's Payments page on the phone, `scroll` pixels down: its heading, the Due tile as it
// reads before she pays, then History and Record with the months, one card to a month. The top
// bar stays where it is.
export const PAYMENTS_TABS_Y = 424;
export const PaymentsPage: React.FC<{grow: (i: number) => number; scroll: number}> = ({grow, scroll}) => (
  <div style={{position: 'absolute', inset: 0, fontFamily: jakarta, color: C.ink, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 16, right: 16, top: 64, transform: `translateY(${-scroll}px)`, paddingTop: 28}}>
      <div style={{fontFamily: sora, fontSize: 30, lineHeight: '37.5px', fontWeight: 500, letterSpacing: '-0.025em'}}>Payments and billing</div>
      <Tile tone="brand" title="Due" pad={20} style={{marginTop: 20, height: 318}}>
        <div>
          <div style={{fontSize: 36, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.025em', ...tab}}>₱4,700.00</div>
          <div style={{fontSize: 14, lineHeight: '24px', color: C.onBrandSoft, marginTop: 8}}>
            Payments recorded up to October 4, 2026. Paying now covers October 5, 2026 to November 4, 2026.
          </div>
        </div>
        <div><Btn kind="light" icon={<CreditCard size={16} />}>Pay with GCash</Btn></div>
        <div style={{fontSize: 12, lineHeight: '20px', color: C.onBrandSoft}}>Paid in person? It shows here once the landlady records it.</div>
      </Tile>
      <div style={{marginTop: 28}}><Tabs /></div>
      <div style={{display: 'flex', gap: 8, marginTop: 16}}>
        <div style={{flex: 1}}><Input placeholder="Search" left={<Search size={16} color={GL.inkFaint} />} style={{fontSize: 16}} /></div>
        <Select value="Filters" w={99} style={{justifyContent: 'center', flexDirection: 'row-reverse', padding: '0 12px'}} />
      </div>
      <div style={{marginTop: 16}}>
        {RECORD_MONTHS.map((m, i) => {
          const g = grow(i);
          return (
            <div key={m.period} style={{padding: '16px 0', borderBottom: `1px solid ${GL.line}`, opacity: g, transform: `translateY(${(1 - g) * 10}px)`}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div>
                  <div style={{fontSize: 18, lineHeight: '18px', fontWeight: 600, color: m.paid ? C.brand : C.ink, ...tab}}>₱4,700.00</div>
                  {m.paid ? <div style={{fontSize: 14, lineHeight: '20px', color: C.inkSoft, marginTop: 6}}>Paid {m.paid}</div> : null}
                </div>
                <Pill tone={m.paid ? 'paid' : 'neutral'}>{m.paid ? 'Verified' : 'Not recorded'}</Pill>
              </div>
              {m.paid ? (
                <div style={{marginTop: 16}}>
                  <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>Method</div>
                  <div style={{fontSize: 14, lineHeight: '20px'}}>Cash</div>
                </div>
              ) : null}
              <div style={{marginTop: m.paid ? 12 : 16}}>
                <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint}}>For</div>
                <div style={{fontSize: 14, lineHeight: '20px'}}>{m.period}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, background: '#f1f9f3'}}><AppHeader phone initials="AV" unread={2} /></div>
  </div>
);
// The Filters control carries its icon; drawn here so the page above stays readable.
export const FiltersIcon = SlidersHorizontal;
