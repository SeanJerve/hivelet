// The public site, from views/CategoryRoomsView.vue and views/InquireView.vue.
// Its large headings are Sora, as on the site.
import React from 'react';
import {C, jakarta, sora} from '../theme';
import {Btn, Field, Input} from './Kit';

export const CATEGORIES: [string, number][] = [['Studio', 20], ['One-bedroom', 8], ['Two-bedroom', 4], ['Three-bedroom', 1]];

export const UnitPanel: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div style={{width: 560, fontFamily: jakarta, color: C.ink, ...style}}>
    <span style={{display: 'inline-block', background: C.brand, color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.18em', padding: '10px 18px'}}>VACANT</span>
    <div style={{fontSize: 14, letterSpacing: '0.2em', color: C.inkSoft, marginTop: 36}}>3RD FLOOR, BACK APARTMENT</div>
    <div style={{fontFamily: sora, fontSize: 86, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.05, marginTop: 14}}>Unit B3B</div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 18}}>
      <span style={{fontFamily: sora, fontSize: 60, fontWeight: 600, letterSpacing: '-0.04em'}}>₱8,500</span>
      <span style={{fontSize: 20, color: C.inkSoft}}>a month</span>
    </div>
    <div style={{borderTop: `2px solid ${C.ink}`, marginTop: 34}} />
    {[['Room for', 'up to 4 people'], ['Water', '₱200 per person, each month']].map(([k, v]) => (
      <div key={k} style={{display: 'flex', justifyContent: 'space-between', padding: '20px 0', borderBottom: `1px solid ${C.line}`, fontSize: 19}}>
        <span style={{color: C.inkSoft}}>{k}</span><span>{v}</span>
      </div>
    ))}
  </div>
);

export const InquiryForm: React.FC<{name: string; phone: string; question: string; focus: 'name' | 'phone' | 'question' | null; press?: number}> = ({name, phone, question, focus, press = 0}) => (
  <div style={{width: 600, fontFamily: jakarta, color: C.ink}}>
    <div style={{fontFamily: sora, fontSize: 56, fontWeight: 600, letterSpacing: '-0.035em'}}>Send an inquiry</div>
    <div style={{fontSize: 18, color: C.inkSoft, marginTop: 10}}>Viewings are by appointment.</div>
    <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28}}>
      <Field label="Your name"><Input value={name} focus={focus === 'name'} caret={focus === 'name'} /></Field>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
        <Field label="Email address"><Input value="" /></Field>
        <Field label="Phone number"><Input value={phone} focus={focus === 'phone'} caret={focus === 'phone'} /></Field>
      </div>
      <Field label="Your question">
        <Input area value={question} placeholder="For example: which unit, when you would like to move in, or a time to view." focus={focus === 'question'} caret={focus === 'question'} />
      </Field>
      <div><Btn kind="brand" press={press}>Send inquiry</Btn></div>
    </div>
  </div>
);
