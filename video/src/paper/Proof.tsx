// Act three, on a sheet of kraft paper: the study's own figures (Chapter 4), each made of
// something you could hold. 937 income rows carried over from her workbook, on a split-flap
// counter; A+ from all three outside scans (Section 4.4.4), typed on an index card and
// stamped; 4.53 out of 5, Very High Quality on ISO/IEC 25010 (Table 4-17), as foil stars.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AT, WORD} from './timeline';
import {Drop, Dymo, EASE, FONT, Hand, Ink, PAL, paper, sec, SplitFlap, Stamp, Star, spr, t01, Tape, torn} from './kit';

export const KRAFT = {x0: 4250, x1: 8950, y0: 3560, y1: 5000};
export const PROOF = {records: {x: 8050, y: 4280}, secure: {x: 6560, y: 4280}, quality: {x: 5060, y: 4280}};

export const KraftSheet: React.FC = () => {
  const w = KRAFT.x1 - KRAFT.x0, h = KRAFT.y1 - KRAFT.y0;
  return (
    <div style={{position: 'absolute', left: KRAFT.x0, top: KRAFT.y0, width: w, height: h, filter: 'drop-shadow(0 8px 10px rgba(60,40,20,0.3))'}}>
      <div style={{position: 'absolute', inset: 0, ...paper(PAL.kraft, 'kraft', 420), clipPath: torn(w, h, 'kraft', 'tl', 14, 24)}} />
    </div>
  );
};

// Text typed onto a card, one character at a time.
const Typed: React.FC<{text: string; at: number; cps?: number; style?: React.CSSProperties}> = ({text, at, cps = 40, style}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const n = Math.min(text.length, Math.floor(((f - at) / 60) * cps) + 1);
  return <div style={{fontFamily: FONT.type, whiteSpace: 'pre', ...style}}>{text.slice(0, n)}<span style={{opacity: n < text.length && Math.floor(f / 6) % 2 ? 1 : 0}}>▌</span></div>;
};

const Records: React.FC = () => {
  const R = sec(AT.records);
  const {x, y} = PROOF.records;
  return (
    <>
      <Drop at={R - 10} x={x - 360} y={y - 200} rot={-1.5} from={{dx: 0, dy: -80, rot: 6}} stiff={120}>
        <SplitFlap target="937" at={R + 2} dur={1.85} flips={[9, 13, 17]} w={210} h={300} />
      </Drop>
      <Dymo text="her real records" at={sec(AT.records + 2.25)} x={x - 300} y={y + 190} color={PAL.red} size={46} rot={-2} />
      <Hand text="moved in from her workbook" at={sec(AT.records + 2.9)} x={x - 420} y={y - 330} size={60} color={PAL.ink} rot={-3} seed="mh" cps={30} />
    </>
  );
};

const Secure: React.FC = () => {
  const S = sec(AT.secure), A = sec(WORD.aPlus);
  const {x, y} = PROOF.secure;
  return (
    <>
      <Drop at={S - 12} x={x - 420} y={y - 250} rot={2} from={{dx: 0, dy: -80, rot: -6}} stiff={130}>
        <div style={{width: 840, height: 500, ...paper('#fffdf6'), position: 'relative', padding: '34px 48px', boxSizing: 'border-box'}}>
          <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 63px, rgba(80,130,200,0.35) 63px 65px)', backgroundPosition: '0 40px'}} />
          <div style={{position: 'absolute', left: 92, top: 0, bottom: 0, width: 3, background: 'rgba(220,70,70,0.45)'}} />
          <Typed text="SECURITY · THREE OUTSIDE SCANS" at={S - 2} cps={46} style={{fontWeight: 700, fontSize: 30, letterSpacing: '0.06em', color: '#2b2a28', marginLeft: 60}} />
          <div style={{marginTop: 34, marginLeft: 60, fontSize: 32, lineHeight: '65px', color: '#2b2a28'}}>
            <Typed text="Qualys SSL Labs ........ A+" at={S + 16} cps={60} style={{fontSize: 32}} />
            <Typed text="Mozilla Observatory .... A+" at={S + 30} cps={60} style={{fontSize: 32}} />
            <Typed text="securityheaders.com .... A+" at={S + 44} cps={60} style={{fontSize: 32}} />
          </div>
        </div>
      </Drop>
      <Stamp text="A+" at={A} x={x + 540} y={y + 140} size={290} color="#c41a32" rot={-12} sub="SECURITY GRADE" w={470} h={400} seed="aplus" />
    </>
  );
};

const Quality: React.FC = () => {
  const f = useCurrentFrame();
  const Q = sec(AT.quality), R = sec(WORD.rated);
  const {x, y} = PROOF.quality;
  return (
    <>
      <Drop at={Q - 12} x={x - 470} y={y - 270} rot={-1.5} from={{dx: 0, dy: -80, rot: 6}} stiff={130}>
        <div style={{width: 940, height: 560, ...paper(PAL.cream), position: 'relative', padding: '34px 48px', boxSizing: 'border-box', border: '10px double rgba(23,96,63,0.35)'}}>
          <div style={{fontFamily: FONT.serif, fontWeight: 800, fontSize: 52, color: PAL.green, letterSpacing: '-0.01em'}}>Report card</div>
          <div style={{fontFamily: FONT.type, fontWeight: 700, fontSize: 24, letterSpacing: '0.08em', color: '#3b3a36', marginTop: 4}}>QUALITY · ISO/IEC 25010</div>
          <div style={{fontFamily: FONT.type, fontSize: 21, color: '#5b5148', marginTop: 4}}>rated by the owner, tenants and evaluators</div>
          <div style={{display: 'flex', gap: 22, marginTop: 40}}>
            {[1, 1, 1, 1, 0.53].map((fill, i) => {
              const t = R + i * 8;
              if (f < t) return <div key={i} style={{width: 120, height: 120}}><Star size={120} fill={0} id={`s${i}`} /></div>;
              const p = spr(f, t, {damping: 10, stiffness: 260});
              return (
                <div key={i} style={{width: 120, height: 120, transform: `scale(${1 + (1 - Math.min(1, p)) * 0.8}) rotate(${(1 - Math.min(1, p)) * 40 + (i - 2) * 3}deg)`}}>
                  <Star size={120} fill={fill} id={`s${i}`} />
                </div>
              );
            })}
          </div>
        </div>
      </Drop>
      <Tape x={x - 430} y={y - 262} rot={-30} at={Q + 4} seed="qt1" />
      <Tape x={x + 430} y={y - 262} rot={30} at={Q + 6} seed="qt2" color="rgba(191,232,210,0.8)" />
      <Hand text="4.53 / 5" at={R + 44} x={x + 30} y={y + 40} size={140} color={PAL.red} font={FONT.marker} rot={-5} seed="q453" cps={12} />
      <Stamp text="VERY HIGH QUALITY" at={sec(AT.quality + 2.25)} x={x + 60} y={y + 360} size={64} color={PAL.green} rot={-4} w={760} h={120} seed="vhq" />
    </>
  );
};

export const ProofScenes: React.FC = () => (
  <>
    <Records />
    <Secure />
    <Quality />
  </>
);
export {EASE, Ink, t01};
