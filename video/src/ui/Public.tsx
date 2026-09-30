// The public site, from views/CategoryRoomsView.vue.
// Its large headings are Sora, as on the site.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {ArrowLeft, ArrowUpRight, Copy, MessageSquare, RotateCw, Send, X} from 'lucide-react';
import {C, jakarta, sora} from '../theme';
import {lerp} from '../anim';
import {Btn, Field, Input} from './Kit';

// ---- The unit showcase on a category page (CategoryRoomsView.vue) ----------------
// Two columns divided by a hairline: the floor plan with the unit marked on it,
// and the unit's details with "Ask about unit B3B". `plan` draws the plan in
// (0 to 1), `chip` pops the unit's label onto it.
export const PLAN = {src: 'floorplans/back3rdfloor.png', w: 1024, h: 858, x: 31.392, y: 34.1};
export const SHOW = {w: 960, planW: 540, h: 600, imgW: 448};

export const PlanImage: React.FC<{width: number; plan?: number; chip?: number; ring?: number}> = ({width, plan = 1, chip = 1, ring = 0}) => (
  <div style={{position: 'relative', width, height: (width * PLAN.h) / PLAN.w}}>
    <Img src={staticFile(PLAN.src)} style={{display: 'block', width: '100%', clipPath: `inset(0 ${(1 - plan) * 100}% 0 0)`}} />
    {ring > 0 && ring < 1 ? (
      <div style={{position: 'absolute', left: `${PLAN.x}%`, top: `${PLAN.y}%`, width: 30, height: 30, marginLeft: 8, marginTop: -26, borderRadius: '50%',
        border: `2px solid ${C.brandBright}`, transform: `translate(-50%, -50%) scale(${1 + ring * 3})`, opacity: 1 - ring}} />
    ) : null}
    <span style={{position: 'absolute', left: `${PLAN.x}%`, top: `${PLAN.y}%`, transform: `translate(-30%, -100%) scale(${lerp(0.6, 1, chip)})`, transformOrigin: '30% 100%',
      opacity: Math.min(1, chip * 1.6), background: C.brand, color: '#fff', borderRadius: 999, padding: `${width * 0.0045 + 1}px ${width * 0.018}px`,
      fontFamily: jakarta, fontSize: width * 0.027, fontWeight: 600, lineHeight: 1.4, boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 18px 42px -18px rgba(28,25,23,0.16)'}}>B3B</span>
  </div>
);

export const UnitShowcase: React.FC<{plan?: number; chip?: number; ring?: number; hidePlan?: boolean; press?: number}> = ({plan = 1, chip = 1, ring = 0, hidePlan, press = 0}) => (
  <div style={{width: SHOW.w, height: SHOW.h, display: 'flex', background: C.tile, borderTop: `1px solid ${C.line}`, fontFamily: jakarta, color: C.ink,
    boxShadow: '0 40px 90px rgba(15,27,21,0.12)', borderRadius: 24, overflow: 'hidden'}}>
    <div style={{position: 'relative', width: SHOW.planW, borderRight: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{opacity: hidePlan ? 0 : 1}}><PlanImage width={SHOW.imgW} plan={plan} chip={chip} ring={ring} /></div>
      <span style={{position: 'absolute', left: 0, top: 0, background: C.brand, color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: '0.18em', padding: '10px 18px',
        boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 18px 42px -18px rgba(28,25,23,0.16)'}}>VACANT</span>
    </div>
    <div style={{flex: 1, padding: '44px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box'}}>
      <div>
        <div style={{fontSize: 13, letterSpacing: '0.18em', color: C.inkSoft}}>3RD FLOOR, BACK APARTMENT</div>
        <div style={{fontFamily: sora, fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 0.95, marginTop: 18}}>Unit B3B</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 30}}>
          <span style={{fontFamily: sora, fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em'}}>₱8,500</span>
          <span style={{fontSize: 15, color: C.inkSoft}}>a month</span>
        </div>
        <div style={{borderTop: `1px solid ${C.ink}`, marginTop: 34}} />
        {[['Room for', 'up to 4 people'], ['Water', '₱200 per person, each month']].map(([k, v]) => (
          <div key={k} style={{display: 'flex', justifyContent: 'space-between', gap: 20, padding: '15px 0', borderBottom: `1px solid ${C.line}`, fontSize: 15}}>
            <span style={{color: C.inkSoft}}>{k}</span><span>{v}</span>
          </div>
        ))}
      </div>
      <Btn kind="brand" full press={press} style={{fontSize: 15, minHeight: 50}}>
        <span>Ask about unit B3B</span><ArrowUpRight size={17} />
      </Btn>
    </div>
  </div>
);

// ---- Asking about the unit, and hearing back ----------------------------------------
// The dialog "Ask about unit B3B" opens (CategoryRoomsView.vue), with its real
// labels; once sent, the same dialog says the message is saved and gives the way
// back in (components/public/InquiryConversationLink.vue). The landlady is
// LANDLADY.name in lib/systemState.ts. The reference code is a sample.
export const LANDLADY = 'Michelle';
export const REF_CODE = 'K7QM-3XRD';
// The dialog's two states, at the app's own sizes: the form, and what replaces it.
export const DIALOG = {w: 640, form: 616, saved: 520, padX: 52, padY: 48};
const link: React.CSSProperties = {textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: C.line};

// `saved` runs 0 to 1 as the form gives way to the confirmation, inside the same
// box, which eases from the form's height to the confirmation's.
export const AskDialog: React.FC<{name: string; phone: string; email: string; question: string; focus: 'question' | null; press?: number; saved?: number}> = ({name, phone, email, question, focus, press = 0, saved = 0}) => {
  const out = Math.min(1, saved / 0.45), inn = Math.max(0, Math.min(1, (saved - 0.35) / 0.65));
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  return (
    <div style={{width: DIALOG.w, height: lerp(DIALOG.form, DIALOG.saved, ease(saved)), borderRadius: 24, border: `1px solid ${C.line}`, background: C.tile, boxSizing: 'border-box', fontFamily: jakarta, color: C.ink,
      boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 40px 90px -20px rgba(15,27,21,0.3)', position: 'relative', overflow: 'hidden'}}>
      {out < 1 ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: DIALOG.w, height: DIALOG.form, padding: `${DIALOG.padY}px ${DIALOG.padX}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          opacity: 1 - out, transform: `translateY(${-14 * out}px)`}}>
          <X size={18} color={C.inkSoft} style={{position: 'absolute', right: 26, top: 26}} />
          <div style={{fontFamily: sora, fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.15}}>Ask about unit B3B</div>
          <div style={{fontSize: 12, color: C.inkSoft, lineHeight: 1.625, marginTop: 16, maxWidth: 448}}>
            {LANDLADY}, who runs the boarding house, reads these herself and replies by phone or email. Nothing is sent to you automatically. See the <span style={link}>privacy policy</span> for what happens to this information.
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28, rowGap: 22, marginTop: 34}}>
            <Field label="Your name" style={{gridColumn: 'span 2'}}><Input value={name} /></Field>
            <Field label="Phone number"><Input value={phone} placeholder="0917-000-0000" /></Field>
            <Field label="Email address"><Input value={email} placeholder="you@email.com" /></Field>
            <Field label="Your question" style={{gridColumn: 'span 2'}}><Input area value={question} focus={focus === 'question'} caret={focus === 'question'} /></Field>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 'auto'}}>
            <Btn kind="brand" press={press} icon={<Send size={15} />}>Send inquiry</Btn>
            <span style={{fontSize: 12, color: C.inkSoft, ...link}}>Cancel</span>
          </div>
        </div>
      ) : null}
      {inn > 0 ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: DIALOG.w, height: DIALOG.saved, padding: `${DIALOG.padY}px ${DIALOG.padX}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          opacity: inn, transform: `translateY(${16 * (1 - inn)}px)`}}>
          <div style={{fontFamily: sora, fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.15}}>Your message about unit B3B is saved</div>
          <div style={{fontSize: 14, color: C.inkSoft, lineHeight: 1.625, marginTop: 16, maxWidth: 448}}>
            {LANDLADY}, who runs the boarding house, reads every inquiry herself. She replies here, and may also call <span style={{color: C.ink}}>0918-555-0142</span>. No automatic confirmation email or text is sent.
          </div>
          <div style={{marginTop: 24, maxWidth: 576, borderLeft: `2px solid ${C.brand}`, paddingLeft: 16}}>
            <div style={{fontSize: 14, lineHeight: 1.625, color: C.ink}}>{LANDLADY} answers on your inquiry's own page. Open it any time to read her reply and write back.</div>
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16}}>
              <Btn kind="brand" icon={<MessageSquare size={16} />}>Open your conversation</Btn>
              <Btn kind="plain" icon={<Copy size={16} />}>Copy the link</Btn>
            </div>
            <div style={{fontSize: 12, lineHeight: 1.625, color: C.inkSoft, marginTop: 16}}>
              Your reference is <b style={{fontWeight: 500, color: C.ink, letterSpacing: '0.08em', fontSize: 14}}>{REF_CODE}</b>. Write it down: with the phone number you gave, it opens the same page at <span style={link}>hivelet.vercel.app/inquiry</span> if you lose the link.
            </div>
          </div>
          <div style={{marginTop: 'auto'}}><Btn kind="brand" style={{padding: '0 20px'}}>Done</Btn></div>
        </div>
      ) : null}
    </div>
  );
};

// The page the visitor comes back to (views/InquiryThreadView.vue, /inquiry), at
// its max-w-2xl on the site's canvas. Her reply pops in when `reply` rises; the
// visitor's answer is typed into "Write back to Michelle" and sent with `sent`.
export const THREAD = {w: 736, pad: 32, h: 760};
const Said: React.FC<{mine?: boolean; who: string; when: string; body: string; p?: number}> = ({mine, who, when, body, p = 1}) => (
  <div style={{width: '85%', marginLeft: mine ? 'auto' : 0, boxSizing: 'border-box', borderRadius: 24, border: `1px solid ${mine ? C.brandSoft : C.line}`, background: mine ? C.brandSoft : '#f5f5f4',
    padding: '12px 16px', opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 14}px) scale(${lerp(0.96, 1, p)})`, transformOrigin: mine ? '100% 0' : '0 0'}}>
    <div style={{fontSize: 11.2, color: C.inkSoft}}><span style={{fontWeight: 500, color: C.ink}}>{who}</span> · {when}</div>
    <div style={{fontSize: 14, lineHeight: 1.625, marginTop: 4, color: C.ink}}>{body}</div>
  </div>
);
export const InquiryThread: React.FC<{question: string; replyText: string; reply: number; back: string; backFocus: boolean; backText: string; sent: number; press?: number}> = ({question, replyText, reply, back, backFocus, backText, sent, press = 0}) => {
  const waiting = reply < 0.5 || sent >= 0.5;
  return (
    <div style={{width: THREAD.w, height: THREAD.h, boxSizing: 'border-box', padding: THREAD.pad, borderRadius: 24, background: C.canvas, fontFamily: jakarta, color: C.ink,
      boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 40px 90px -20px rgba(15,27,21,0.26)', border: `1px solid ${C.line}`}}>
      <div style={{display: 'inline-flex', minHeight: 44, alignItems: 'center', gap: 6, fontSize: 12, color: C.inkSoft}}><ArrowLeft size={14} /><span style={link}>Your inquiries</span></div>
      <div style={{fontFamily: sora, fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.2, marginTop: 8}}>Your inquiry</div>
      <div style={{fontSize: 12, color: C.inkSoft, marginTop: 8}}>Sent Sep 29, 2026, 4:12 PM · Reference <span style={{fontWeight: 500, color: C.ink, letterSpacing: '0.08em'}}>{REF_CODE}</span></div>
      <div style={{fontSize: 14, marginTop: 16, height: 20}}>{waiting ? `Waiting for ${LANDLADY} to reply. Check back here.` : `${LANDLADY} has replied.`}</div>
      <div style={{marginTop: 24, height: 238, display: 'flex', flexDirection: 'column', gap: 12}}>
        <Said mine who="You" when="Sep 29, 2026, 4:12 PM" body={question} />
        {reply > 0 ? <Said who={LANDLADY} when="Sep 29, 2026, 4:20 PM" body={replyText} p={reply} /> : null}
        {sent > 0 ? <Said mine who="You" when="Sep 29, 2026, 4:31 PM" body={backText} p={sent} /> : null}
      </div>
      <div style={{marginTop: 16}}><Btn kind="plain" icon={<RotateCw size={16} />}>Check for a reply</Btn></div>
      <div style={{marginTop: 32}}>
        <Field label={`Write back to ${LANDLADY}`}><Input area value={back} placeholder="For example: a time you can come to view the unit." focus={backFocus} caret={backFocus} /></Field>
        <div style={{marginTop: 12}}><Btn kind="brand" press={press} icon={<Send size={16} />}>Send</Btn></div>
      </div>
    </div>
  );
};
