// The public site as it is since the redesign of November 2026: views/CategoryRoomsView.vue,
// its inquiry dialog, and views/InquiryThreadView.vue inside components/public/VisitorShell.vue.
// The public pages are set in Sora throughout, as on the site. Labels, sizes and colours were
// read from the running app on the sample-data harness on 13 Nov 2026.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {ArrowLeft, ArrowUpRight, Copy, MessageSquare, Moon, RotateCw, Send, X} from 'lucide-react';
import {C, GL, jakarta, sora} from '../theme';
import {lerp} from '../anim';
import {Btn, Glass} from './Kit';

// ---- The unit showcase on a category page (CategoryRoomsView.vue) ----------------
// Two columns divided by a hairline, on the page with no box behind them: the floor plan with
// the unit marked on it (the plan as ink on the page, capture/plans.mjs), and the unit's
// details with "Ask about unit B3B". `plan` draws the plan in (0 to 1), `chip` pops the unit's
// label onto it.
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
      opacity: Math.min(1, chip * 1.6), background: C.brand, color: '#fff', borderRadius: 999, padding: `${width * 0.0045}px ${width * 0.018}px`,
      fontFamily: sora, fontSize: width * 0.027, fontWeight: 600, lineHeight: 1.34, boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 18px 42px -18px rgba(28,25,23,0.16)'}}>B3B</span>
  </div>
);

export const UnitShowcase: React.FC<{plan?: number; chip?: number; ring?: number; hidePlan?: boolean; press?: number}> = ({plan = 1, chip = 1, ring = 0, hidePlan, press = 0}) => (
  <div style={{width: SHOW.w, height: SHOW.h, boxSizing: 'border-box', display: 'flex', borderTop: `1px solid ${GL.line}`, borderBottom: `1px solid ${GL.line}`, fontFamily: sora, color: C.ink}}>
    <div style={{position: 'relative', width: SHOW.planW, borderRight: `1px solid ${GL.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{opacity: hidePlan ? 0 : 1}}><PlanImage width={SHOW.imgW} plan={plan} chip={chip} ring={ring} /></div>
      <span style={{position: 'absolute', left: 16, top: 16, background: GL.tile, color: C.brand, fontSize: 14, lineHeight: '20px', fontWeight: 600, padding: '4px 12px', borderRadius: 999, boxShadow: `${GL.sheen}, ${GL.drop}`}}>Vacant</span>
    </div>
    <div style={{flex: 1, padding: '48px 40px 48px 40px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'}}>
      <div style={{fontSize: 11.2, lineHeight: '17px', letterSpacing: '0.18em', color: C.inkSoft, textTransform: 'uppercase'}}>3rd Floor, Back Apartment</div>
      <div style={{fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: '49.4px', marginTop: 16}}>Unit B3B</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 32}}>
        <span style={{fontSize: 36, lineHeight: '54px', fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums'}}>₱8,500</span>
        <span style={{fontSize: 14, color: C.inkSoft}}>a month</span>
      </div>
      <div style={{borderTop: `1px solid ${C.ink}`, marginTop: 40}} />
      {[['Room for', 'up to 4 people'], ['Water', '₱200 per person, each month']].map(([k, v]) => (
        <div key={k} style={{display: 'flex', justifyContent: 'space-between', gap: 20, padding: '16px 0', borderBottom: `1px solid ${GL.line}`, fontSize: 14, lineHeight: '20px'}}>
          <span style={{color: C.inkSoft}}>{k}</span><span>{v}</span>
        </div>
      ))}
      <div style={{fontSize: 14, lineHeight: '22.75px', color: C.inkSoft, marginTop: 28}}>Two-bedroom unit, Back Apartment</div>
      <Btn kind="brand" full press={press} style={{fontFamily: sora, marginTop: 'auto'}}>
        <span>Ask about unit B3B</span><ArrowUpRight size={16} />
      </Btn>
    </div>
  </div>
);

// ---- Asking about the unit, and hearing back ----------------------------------------
// The dialog "Ask about unit B3B" opens (CategoryRoomsView.vue): a name, a phone number and the
// question. No email address is asked for. Once sent, the same dialog says so and gives the way
// back in: the conversation itself, and a reference code to come back with later. The reference
// code is a sample.
export const REF_CODE = 'K7QM-3XRD';
// The dialog's two states, at the app's own sizes: the form, and what replaces it.
export const DIALOG = {w: 608, form: 602, saved: 418, padX: 48, padY: 56};
const field = (focus: boolean, area?: boolean): React.CSSProperties => ({boxSizing: 'border-box', width: '100%', minHeight: area ? 106 : 44, border: `1px solid ${GL.fieldFloatEdge}`, borderRadius: area ? 16 : 999,
  background: GL.fieldFloat, padding: area ? '12px 16px' : '11px 18px', fontSize: 14, lineHeight: '20px', color: C.ink, boxShadow: focus ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 5px #101713' : GL.fieldShadow});
const Label: React.FC<{text: string; children: React.ReactNode; style?: React.CSSProperties}> = ({text, children, style}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, lineHeight: '16px', color: GL.inkFaintFloat, ...style}}>{text}{children}</div>
);

// `saved` runs 0 to 1 as the form gives way to the confirmation, inside the same
// box, which eases from the form's height to the confirmation's.
export const AskDialog: React.FC<{name: string; phone: string; question: string; focus: 'question' | null; press?: number; saved?: number}> = ({name, phone, question, focus, press = 0, saved = 0}) => {
  const out = Math.min(1, saved / 0.45), inn = Math.max(0, Math.min(1, (saved - 0.35) / 0.65));
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const pad = `${DIALOG.padY}px ${DIALOG.padX}px`;
  return (
    <Glass tone="menu" r={24} style={{width: DIALOG.w, height: lerp(DIALOG.form, DIALOG.saved, ease(saved)), fontFamily: sora, overflow: 'hidden'}}>
      {out < 1 ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: DIALOG.w, height: DIALOG.form, padding: pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          opacity: 1 - out, transform: `translateY(${-14 * out}px)`}}>
          <X size={16} color={C.ink} style={{position: 'absolute', right: 26, top: 26}} />
          <div style={{fontSize: 30.4, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: '34.96px'}}>Ask about unit B3B</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 28, marginTop: 40}}>
            <Label text="Your name"><div style={field(false)}>{name || ' '}</div></Label>
            <Label text="Phone number" style={{width: 239}}><div style={{...field(false), color: phone ? C.ink : GL.inkFaint}}>{phone || '0917 123 4567'}</div></Label>
            <Label text="Your question">
              <div style={field(focus === 'question', true)}>
                {question}
                {focus === 'question' ? <span style={{display: 'inline-block', width: 1.5, height: 17, background: C.ink, marginLeft: 1, verticalAlign: 'text-bottom'}} /> : null}
              </div>
            </Label>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 'auto'}}>
            <Btn kind="brand" press={press} icon={<Send size={16} />} style={{fontFamily: sora, padding: '0 20px'}}>Send inquiry</Btn>
            <Btn kind="quiet" style={{fontFamily: sora, color: GL.inkSoftFloat}}>Cancel</Btn>
          </div>
        </div>
      ) : null}
      {inn > 0 ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: DIALOG.w, height: DIALOG.saved, padding: pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          opacity: inn, transform: `translateY(${16 * (1 - inn)}px)`}}>
          <div style={{fontSize: 30.4, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: '34.96px'}}>Your inquiry is sent</div>
          <div style={{fontSize: 14, color: GL.inkSoftFloat, lineHeight: '22.75px', marginTop: 16, maxWidth: 448}}>
            We will reply on your inquiry page, and may also call <span style={{color: C.ink, whiteSpace: 'nowrap'}}>0918 555 0142</span>.
          </div>
          <div style={{marginTop: 23, borderLeft: `2px solid ${C.brand}`, paddingLeft: 16}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <Btn kind="brand" icon={<MessageSquare size={16} />} style={{fontFamily: sora}}>Open your conversation</Btn>
              <Btn kind="quiet" icon={<Copy size={16} />} style={{fontFamily: sora, color: GL.inkSoftFloat}}>Copy the code</Btn>
            </div>
            <div style={{fontSize: 12, lineHeight: '19.5px', color: GL.inkSoftFloat, marginTop: 16}}>
              Your reference code is <b style={{fontWeight: 500, color: C.ink, letterSpacing: '0.08em', fontSize: 14}}>{REF_CODE}</b>. To come back later, enter it with your phone number at <b style={{fontWeight: 600}}>hivelet.vercel.app/inquiry</b>.
            </div>
          </div>
          <div style={{marginTop: 'auto'}}><Btn kind="brand" style={{fontFamily: sora, padding: '0 20px'}}>Done</Btn></div>
        </div>
      ) : null}
    </Glass>
  );
};

// The page the visitor comes back to (views/InquiryThreadView.vue, /inquiry): the left half of
// the visitor pages' split screen, on the site's own wash. The same bubbles as the landlady's
// side, each as wide as its message. Her reply pops in when `reply` rises; the visitor's answer
// is typed into "Write a reply" and sent with `sent`. Where things are, from the top left:
export const THREAD = {w: 720, pad: 56, h: 836, slot2: 408, box: 680, send: {x: 106, y: 769}, zoom: 1.15};
const WASH = 'radial-gradient(520px 440px at 6% 8%, rgba(150,226,182,0.36), transparent 70%), radial-gradient(440px 380px at 92% 4%, rgba(196,238,170,0.36), transparent 70%), radial-gradient(500px 420px at 96% 62%, rgba(160,230,205,0.33), transparent 70%), radial-gradient(460px 400px at 34% 100%, rgba(212,244,196,0.39), transparent 70%), #f8fbf9';
const Said: React.FC<{mine?: boolean; who: string; when: string; body: string; p?: number}> = ({mine, who, when, body, p = 1}) => (
  <div style={{height: 68, display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 14}px)`}}>
    <div style={{fontSize: 12, lineHeight: '16px', color: GL.inkFaint, padding: '0 4px', marginBottom: 4}}><span style={{fontWeight: 600, color: C.inkSoft}}>{who}</span> · {when}</div>
    <div style={{borderRadius: 20, padding: '12px 16px', fontSize: 14, lineHeight: '24px', whiteSpace: 'nowrap', transform: `scale(${lerp(0.94, 1, p)})`, transformOrigin: mine ? '100% 0' : '0 0',
      ...(mine ? {background: 'rgba(14,72,46,0.8)', color: '#fff', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.32), inset 0 0 0 1px rgba(255,255,255,0.1)'} : {background: GL.tile, color: C.ink, boxShadow: `${GL.sheen}, ${GL.drop}, 0 0 0 1px ${GL.line}`})}}>{body}</div>
  </div>
);
export const InquiryThread: React.FC<{question: string; replyText: string; reply: number; back: string; backFocus: boolean; backText: string; sent: number; press?: number}> = ({question, replyText, reply, back, backFocus, backText, sent, press = 0}) => {
  const waiting = reply < 0.5 || sent >= 0.5;
  return (
    <div style={{width: THREAD.w, height: THREAD.h, boxSizing: 'border-box', padding: `0 ${THREAD.pad}px`, borderRadius: 24, background: WASH, fontFamily: sora, color: C.ink, overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 40px 90px -20px rgba(15,27,21,0.26), inset 0 0 0 1px rgba(255,255,255,0.8)'}}>
      <div style={{height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontSize: 20, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.025em'}}>Hivelet</span><Moon size={18} />
      </div>
      <div style={{height: 44, marginTop: 24, display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, lineHeight: '16px', fontWeight: 600}}>
        <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, color: C.inkSoft}}><ArrowLeft size={14} />Home</span><span style={{color: GL.inkFaint, fontWeight: 400}}>/</span><span>Your inquiries</span>
      </div>
      <div style={{height: 44, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: '16px', fontWeight: 600, color: C.inkSoft}}><ArrowLeft size={14} />Back</div>
      <div style={{fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: '36px', marginTop: 8}}>Your inquiry</div>
      <div style={{fontSize: 12, lineHeight: '16px', color: C.inkSoft, marginTop: 8}}>Sent Sep 29, 2026, 4:12 PM · Reference <span style={{fontWeight: 500, color: C.ink, letterSpacing: '0.08em'}}>{REF_CODE}</span></div>
      <div style={{fontSize: 14, lineHeight: '20px', marginTop: 16}}>{waiting ? 'Waiting for a reply. Check back here.' : 'You have a reply.'}</div>
      <div style={{marginTop: 24, height: 236, display: 'flex', flexDirection: 'column', gap: 16}}>
        <Said mine who="You" when="Sep 29, 2026, 4:12 PM" body={question} />
        {reply > 0 ? <Said who="Boarding house" when="Sep 29, 2026, 4:20 PM" body={replyText} p={reply} /> : null}
        {sent > 0 ? <Said mine who="You" when="Sep 29, 2026, 4:31 PM" body={backText} p={sent} /> : null}
      </div>
      <div style={{marginTop: 16, display: 'flex', gap: 12}}>
        <Btn kind="plain" icon={<RotateCw size={16} />} style={{fontFamily: sora}}>Check for a reply</Btn>
        <Btn kind="quiet" icon={<Copy size={16} />} style={{fontFamily: sora}}>Copy conversation link</Btn>
      </div>
      <div style={{marginTop: 32}}>
        <div style={{boxSizing: 'border-box', height: 96, border: `1px solid ${GL.fieldEdge}`, borderRadius: 16, background: GL.field, padding: '12px 16px', fontSize: 14, lineHeight: '20px', color: back ? C.ink : GL.inkFaint,
          boxShadow: backFocus ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 5px #101713' : GL.fieldShadow}}>
          {back || 'Write a reply'}
          {backFocus ? <span style={{display: 'inline-block', width: 1.5, height: 17, background: C.ink, marginLeft: 1, verticalAlign: 'text-bottom'}} /> : null}
        </div>
        <div style={{marginTop: 19}}><Btn kind="brand" press={press} icon={<Send size={16} />} style={{fontFamily: sora}}>Send</Btn></div>
      </div>
    </div>
  );
};
export {jakarta};
