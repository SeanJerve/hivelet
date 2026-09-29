// The public site, from views/CategoryRoomsView.vue.
// Its large headings are Sora, as on the site.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {ArrowUpRight, Send, X} from 'lucide-react';
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

// The inquiry dialog the button opens, with its real labels.
export const AskDialog: React.FC<{name: string; phone: string; email: string; question: string; focus: 'question' | null; press?: number}> = ({name, phone, email, question, focus, press = 0}) => (
  <div style={{width: 640, borderRadius: 24, border: `1px solid ${C.line}`, background: C.tile, padding: '48px 52px', boxSizing: 'border-box', fontFamily: jakarta, color: C.ink,
    boxShadow: '0 2px 4px rgba(28,25,23,0.04), 0 40px 90px -20px rgba(15,27,21,0.3)', position: 'relative'}}>
    <X size={18} color={C.inkSoft} style={{position: 'absolute', right: 26, top: 26}} />
    <div style={{fontFamily: sora, fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.15}}>Ask about unit B3B</div>
    <div style={{fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginTop: 14, maxWidth: 440}}>
      Mrs. Fe Galang Da Silva reads these herself and replies by phone or email. Nothing is sent to you automatically.
    </div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28, rowGap: 22, marginTop: 34}}>
      <Field label="Your name" style={{gridColumn: 'span 2'}}><Input value={name} /></Field>
      <Field label="Phone number"><Input value={phone} placeholder="0917-000-0000" /></Field>
      <Field label="Email address"><Input value={email} placeholder="you@email.com" /></Field>
      <Field label="Your question" style={{gridColumn: 'span 2'}}><Input area value={question} focus={focus === 'question'} caret={focus === 'question'} /></Field>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 34}}>
      <Btn kind="brand" press={press} icon={<Send size={15} />}>Send inquiry</Btn>
      <span style={{fontSize: 13, color: C.inkSoft, textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: C.line}}>Cancel</span>
    </div>
  </div>
);
