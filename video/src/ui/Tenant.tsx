// The tenant's phone screens, from views/TenantOverviewView.vue and
// views/TenantTicketsView.vue, at the phone's own 390px width.
import React from 'react';
import {ChevronDown, CreditCard, Send, Wrench} from 'lucide-react';
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
