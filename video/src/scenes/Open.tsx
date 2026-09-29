// Scenes 1 to 4: the place, how it ran before, what that cost, and the answer.
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, jakarta, sora} from '../theme';
import {count, easeIn, easeInOut, easeOut, lerp, pop, t01} from '../anim';
import {Bg, Head, Kin} from '../fx';
import {Mark} from '../ui/Kit';
import {Sfx, Ticks} from '../Sfx';

// A line slammed onto the screen: scaled down from large, blurred to sharp.
export const Slam: React.FC<{children: React.ReactNode; at: number; out?: number; style?: React.CSSProperties}> = ({children, at, out, style}) => {
  const f = useCurrentFrame();
  const p = pop(f, at, {damping: 13, stiffness: 210});
  const e = out === undefined ? 0 : t01(f, out, out + 7, easeIn);
  if (f < at) return null;
  return (
    <div style={{transform: `translateY(${-e * 140}px) scale(${1.45 - 0.45 * p})`, filter: `blur(${Math.max(0, (1 - t01(f, at, at + 6)) * 14 + e * 10)}px)`,
      opacity: t01(f, at, at + 3) * (1 - e), ...style}}>{children}</div>
  );
};

// ---- 1. Three numbers, then the building itself --------------------------------
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const nums: [string, string, number][] = [['33', 'units', 0], ['5', 'clusters', 20], ['1', 'owner', 40]];
  const open = t01(f, 62, 86, easeInOut);
  const inset = lerp(40, 0, open);
  const zoom = interpolate(f, [62, 160], [1.25, 1.04], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const title = 'Fe Galang Da Silva';
  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={50} />
      {nums.map(([n, label, at], i) => (
        <AbsoluteFill key={n} style={{alignItems: 'center', justifyContent: 'center'}}>
          <Slam at={at} out={i < 2 ? at + 17 : 60}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontFamily: sora, fontWeight: 800, fontSize: 400, lineHeight: 0.9, letterSpacing: '-0.06em', color: '#fff'}}>{n}</div>
              <div style={{fontFamily: jakarta, fontWeight: 600, fontSize: 50, color: C.glow, marginTop: 10}}>{label}</div>
            </div>
          </Slam>
        </AbsoluteFill>
      ))}
      {f >= 62 ? (
        <AbsoluteFill style={{clipPath: `inset(${inset}% ${inset * 1.2}% ${inset}% ${inset * 1.2}% round ${lerp(40, 0, open)}px)`}}>
          <Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`}} />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,17,12,0.05) 25%, rgba(8,17,12,0.88) 100%)'}} />
          <div style={{position: 'absolute', left: 110, bottom: 100}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, opacity: t01(f, 80, 92)}}>
              <span style={{width: 9, height: 9, borderRadius: 5, background: C.glow}} />
              <span style={{fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace', fontSize: 22, color: 'rgba(255,255,255,0.8)'}}>Legazpi City · 33 units · 5 clusters · 1 owner</span>
            </div>
            <div style={{fontFamily: sora, fontWeight: 700, fontSize: 150, letterSpacing: '-0.05em', color: '#fff', lineHeight: 1}}>
              {title.split('').map((ch, i) => {
                const p = pop(f, 84 + i * 1.2, {damping: 16, stiffness: 180});
                return <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * 90}px) rotate(${(1 - p) * 10}deg)`, opacity: Math.min(1, p * 2), whiteSpace: 'pre'}}>{ch}</span>;
              })}
            </div>
            <div style={{fontFamily: sora, fontWeight: 600, fontSize: 64, letterSpacing: '-0.04em', color: C.glow, marginTop: 6, opacity: t01(f, 100, 112), transform: `translateY(${(1 - t01(f, 100, 118)) * 24}px)`}}>
              Boarding House
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
      <Sfx at={0} name="impact" vol={0.55} />
      <Sfx at={20} name="swipe" vol={0.45} />
      <Sfx at={40} name="swipe" vol={0.45} />
      <Sfx at={60} name="whoosh-low" vol={0.6} />
      <Sfx at={86} name="pop" vol={0.25} />
    </AbsoluteFill>
  );
};

// ---- 2. The old way: four props, then nothing holding them together ------------
const hand = "'Segoe Print', 'Comic Sans MS', cursive";

const Sheet: React.FC<{p: number; f: number}> = ({p, f}) => {
  const rows = 14, cols = 6;
  return (
    <div style={{perspective: 1600}}>
      <div style={{width: 760, height: 520, borderRadius: 18, background: 'rgba(27,42,34,0.92)', border: '1px solid rgba(255,255,255,0.08)', padding: 22, boxSizing: 'border-box',
        transform: `rotateX(${lerp(70, 48, p)}deg) rotateZ(${lerp(-40, -28, p)}deg) translateZ(${lerp(-300, 0, p)}px)`, opacity: Math.min(1, p * 2),
        boxShadow: '0 60px 120px rgba(0,0,0,0.5)', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 15, color: 'rgba(238,245,240,0.55)'}}>
        {Array.from({length: rows}, (_, r) => (
          <div key={r} style={{display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 34, alignItems: 'center',
            background: r === 6 && f > 20 ? 'rgba(95,194,142,0.14)' : 'transparent'}}>
            {Array.from({length: cols}, (_, c) => (
              <span key={c} style={{width: 118, textAlign: c > 1 ? 'right' : 'left', opacity: t01(f, 4 + r * 1.2, 10 + r * 1.2), color: r === 0 ? C.glow : undefined}}>
                {r === 0 ? ['Unit', 'Rent for', 'Rent', 'Water', 'Garbage', 'Total'][c] : c === 0 ? `${(r % 8) + 1}${'abcdefgh'[r % 8]}` : c === 1 ? 'Sept 2025' : ['4,500.00', '200.00', '50.00', '4,750.00'][c - 2]}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
const Usb: React.FC<{p: number}> = ({p}) => (
  <div style={{display: 'flex', alignItems: 'center', transform: `translateX(${(1 - p) * 300}px) rotate(-8deg)`, opacity: Math.min(1, p * 2)}}>
    <div style={{width: 70, height: 50, background: '#b9c2bd', borderRadius: '6px 0 0 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box'}}>
      <div style={{height: 7, background: '#7d8883', borderRadius: 2}} /><div style={{height: 7, background: '#7d8883', borderRadius: 2}} />
    </div>
    <div style={{width: 250, height: 92, borderRadius: 18, background: 'linear-gradient(180deg, #2e3e35, #1d2a23)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: jakarta, fontSize: 16, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(238,245,240,0.5)'}}>REMOVABLE</div>
  </div>
);
const Receipt: React.FC<{no: string; amt: string; unit: string; style?: React.CSSProperties}> = ({no, amt, unit, style}) => (
  <div style={{width: 330, height: 220, borderRadius: 14, background: '#f6f1e4', padding: 24, boxSizing: 'border-box', boxShadow: '0 30px 60px rgba(0,0,0,0.45)', ...style}}>
    <div style={{fontFamily: jakarta, fontWeight: 700, fontSize: 15, letterSpacing: '0.14em', color: '#7c735f'}}>OFFICIAL RECEIPT</div>
    <div style={{fontFamily: hand, fontSize: 30, color: '#b3261e', marginTop: 10}}>No. {no}</div>
    <div style={{fontFamily: hand, fontSize: 24, color: '#27466e', marginTop: 8}}>Unit {unit}</div>
    <div style={{fontFamily: hand, fontSize: 26, color: '#27466e', marginTop: 4, textAlign: 'right'}}>₱{amt}</div>
  </div>
);
const Bill: React.FC<{tint: string; v: string; style?: React.CSSProperties}> = ({tint, v, style}) => (
  <div style={{width: 380, height: 170, borderRadius: 14, background: tint, boxShadow: '0 24px 50px rgba(0,0,0,0.4)', padding: '18px 26px', boxSizing: 'border-box', position: 'relative',
    border: '2px solid rgba(255,255,255,0.25)', ...style}}>
    <div style={{position: 'absolute', inset: 12, border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 8}} />
    <div style={{fontFamily: sora, fontWeight: 700, fontSize: 64, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.03em'}}>₱{v}</div>
    <div style={{position: 'absolute', right: 30, bottom: 24, width: 76, height: 76, borderRadius: 38, border: '2px solid rgba(255,255,255,0.35)'}} />
  </div>
);
const Bubble: React.FC<{text: string; me?: boolean; p: number}> = ({text, me, p}) => (
  <div style={{alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 440, padding: '16px 22px', borderRadius: me ? '24px 24px 6px 24px' : '24px 24px 24px 6px',
    background: me ? C.brand : '#26352d', color: '#fff', fontFamily: jakarta, fontSize: 24, lineHeight: 1.35,
    transform: `scale(${lerp(0.6, 1, p)})`, transformOrigin: me ? 'right bottom' : 'left bottom', opacity: Math.min(1, p * 2)}}>{text}</div>
);

const BEATS = [
  {at: 6, kicker: 'The old way · 1 of 4', text: 'One spreadsheet.\nOne USB drive.', accent: ['USB', 'drive.'], sub: 'Her whole ledger, in a file she typed by hand.'},
  {at: 40, kicker: 'The old way · 2 of 4', text: 'A receipt book,\nwritten by hand.', accent: ['hand.'], sub: 'Nothing checked a receipt against the sheet.'},
  {at: 74, kicker: 'The old way · 3 of 4', text: 'Cash, at\nthe door.', accent: ['door.'], sub: 'Collected in person, every month, unit by unit.'},
  {at: 108, kicker: 'The old way · 4 of 4', text: 'Repairs asked\nin a chat.', accent: ['chat.'], sub: 'Requests sent by message, or in person.'},
];
export const Before: React.FC = () => {
  const f = useCurrentFrame();
  const end = 142;
  const beatP = (i: number) => pop(f, BEATS[i].at + 4, {damping: 17, stiffness: 120});
  const beatOut = (i: number) => (i < 3 ? t01(f, BEATS[i + 1].at - 4, BEATS[i + 1].at + 4, easeIn) : t01(f, end - 4, end + 6, easeIn));
  const vis = (i: number) => f >= BEATS[i].at && beatOut(i) < 1;
  const scat = t01(f, end, end + 26, easeOut);
  const snap = t01(f, end + 62, end + 70);
  const drift = t01(f, end + 70, end + 108, easeIn);
  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={68} />
      {BEATS.map((b, i) => (vis(i) ? <Head key={b.kicker} dark kicker={b.kicker} text={b.text} accent={b.accent} sub={b.sub} at={b.at} out={i < 3 ? BEATS[i + 1].at - 6 : end - 6} size={100} top={300} /> : null))}
      {/* 1: the spreadsheet and its drive */}
      {vis(0) ? (
        <div style={{position: 'absolute', left: 880, top: 230, opacity: 1 - beatOut(0), transform: `translateX(${-beatOut(0) * 200}px)`}}>
          <Sheet p={beatP(0)} f={f} />
          <div style={{position: 'absolute', left: 520, top: 470}}><Usb p={pop(f, 20, {damping: 16, stiffness: 140})} /></div>
        </div>
      ) : null}
      {/* 2: receipts */}
      {vis(1) ? (
        <div style={{position: 'absolute', left: 1080, top: 300, opacity: 1 - beatOut(1), transform: `translateX(${-beatOut(1) * 200}px)`}}>
          {[['1182', '4,500', '2c', -9, 0], ['1183', '6,000', '2a', 4, 1], ['1184', '4,800', '3b', 12, 2]].map(([no, amt, unit, rot, k]) => {
            const p = pop(f, 44 + (k as number) * 5, {damping: 15, stiffness: 150});
            return <Receipt key={no as string} no={no as string} amt={amt as string} unit={unit as string}
              style={{position: 'absolute', left: (k as number) * 120, top: (k as number) * 60, transform: `translateY(${(1 - p) * 400}px) rotate(${(rot as number) * p}deg)`, opacity: Math.min(1, p * 2)}} />;
          })}
        </div>
      ) : null}
      {/* 3: cash */}
      {vis(2) ? (
        <div style={{position: 'absolute', left: 1080, top: 340, opacity: 1 - beatOut(2), transform: `translateX(${-beatOut(2) * 200}px)`}}>
          {[['#3e6fa8', '1000', -12], ['#b39b3c', '500', 3], ['#3e6fa8', '1000', 14]].map(([tint, v, rot], k) => {
            const p = pop(f, 78 + k * 4, {damping: 14, stiffness: 170});
            return <Bill key={k} tint={tint as string} v={v as string}
              style={{position: 'absolute', left: k * 60, top: k * 50, transform: `translateY(${(1 - p) * -380}px) rotate(${(rot as number) * p + (1 - p) * 40}deg)`, opacity: Math.min(1, p * 2)}} />;
          })}
        </div>
      ) : null}
      {/* 4: a chat thread */}
      {vis(3) ? (
        <div style={{position: 'absolute', left: 1080, top: 250, width: 620, padding: 30, borderRadius: 30, background: 'rgba(27,42,34,0.85)', display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 50px 100px rgba(0,0,0,0.45)', opacity: Math.min(1, beatP(3) * 2) * (1 - beatOut(3)), transform: `translateY(${(1 - beatP(3)) * 80}px) translateX(${-beatOut(3) * 200}px)`}}>
          <Bubble text="Ma'am, the faucet in 2c is leaking." p={pop(f, 114)} />
          <Bubble text="Noted po, I'll check later." me p={pop(f, 122)} />
          <Bubble text="How much is my bill this month?" p={pop(f, 130)} />
        </div>
      ) : null}
      {/* All four together, the links between them drawn, then snapping. */}
      {f >= end ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 200}}>
            <Kin text="Nothing connected them." at={end + 4} size={120} color="#fff" align="center" accent={['connected']} accentColor={C.coral} />
          </div>
          {[0, 1, 2, 3].map((i) => {
            const x = [270, 723, 1176, 1630][i], y = [650, 570, 650, 570][i];
            const p = pop(f, end + i * 4, {damping: 16, stiffness: 140});
            const dir = i < 2 ? -1 : 1;
            return (
              <div key={i} style={{position: 'absolute', left: x - 130, top: y - 90, width: 260, height: 180,
                transform: `translate(${drift * dir * (140 + i * 40)}px, ${drift * drift * 300}px) rotate(${drift * (i % 2 ? 12 : -10) + (1 - p) * 20}deg) scale(${lerp(0.5, 1, p) * (0.5 + 0.75 * scat)})`,
                opacity: Math.min(1, p * 2) * (1 - drift)}}>
                {i === 0 ? <div style={{transform: 'scale(0.34)', transformOrigin: '0 0'}}><Sheet p={1} f={f} /></div> : null}
                {i === 1 ? <div style={{transform: 'scale(0.62)', transformOrigin: '0 0'}}><Receipt no="1182" amt="4,500" unit="2c" /></div> : null}
                {i === 2 ? <div style={{transform: 'scale(0.6)', transformOrigin: '0 0'}}><Bill tint="#3e6fa8" v="1000" /></div> : null}
                {i === 3 ? <div style={{display: 'flex', flexDirection: 'column', gap: 10, transform: 'scale(0.7)', transformOrigin: '0 0', width: 380}}>
                  <Bubble text="Ma'am, the faucet in 2c is leaking." p={1} /><Bubble text="Noted po." me p={1} /></div> : null}
              </div>
            );
          })}
          {[0, 1, 2].map((i) => {
            const x1 = [445, 898, 1351][i], x2 = [548, 1001, 1455][i], y1 = [650, 570, 650][i], y2 = [570, 650, 570][i];
            const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
            const d = t01(f, end + 30 + i * 4, end + 44 + i * 4);
            const s = d * (1 - snap * 0.75);
            return (
              <div key={i} style={{position: 'absolute', left: x1, top: y1, width: len, height: 3, transformOrigin: '0 50%', transform: `rotate(${ang}rad)`, opacity: 1 - drift}}>
                <div style={{position: 'absolute', left: 0, width: len / 2, height: 3, background: snap > 0 ? C.coral : 'rgba(238,245,240,0.5)', transformOrigin: 'left', transform: `scaleX(${s})`}} />
                <div style={{position: 'absolute', right: 0, width: len / 2, height: 3, background: snap > 0 ? C.coral : 'rgba(238,245,240,0.5)', transformOrigin: 'right', transform: `scaleX(${s})`}} />
              </div>
            );
          })}
        </>
      ) : null}
      {BEATS.map((b) => <Sfx key={b.at} at={b.at} name="swipe" vol={0.4} />)}
      <Sfx at={20} name="click" vol={0.4} />
      {[44, 49, 54].map((a) => <Sfx key={a} at={a} name="swipe" vol={0.2} />)}
      {[78, 82, 86].map((a) => <Sfx key={a} at={a} name="whoosh" vol={0.18} />)}
      {[114, 122, 130].map((a) => <Sfx key={a} at={a} name="pop" vol={0.35} />)}
      <Sfx at={end} name="whoosh-low" vol={0.4} />
      {[0, 1, 2].map((i) => <Sfx key={`l${i}`} at={end + 30 + i * 4} name="tick" vol={0.35} />)}
      <Sfx at={end + 62} name="snap" vol={0.6} />
    </AbsoluteFill>
  );
};

// ---- 3. What moving her records in showed ----------------------------------------
export const Cost: React.FC = () => {
  const f = useCurrentFrame();
  const ring = t01(f, 62, 96);
  const slips = t01(f, 128, 146, easeInOut);
  const flash = t01(f, 146, 150) * (1 - t01(f, 160, 176));
  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={50} />
      <div style={{position: 'absolute', left: 110, top: 90, display: 'flex', alignItems: 'center', gap: 12, opacity: t01(f, 0, 12)}}>
        <span style={{width: 9, height: 9, borderRadius: 5, background: C.amber}} />
        <span style={{fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace', fontSize: 22, color: C.onNightSoft}}>What moving her records in showed</span>
      </div>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Slam at={4} out={52}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontFamily: sora, fontWeight: 800, fontSize: 340, letterSpacing: '-0.06em', color: '#fff', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums'}}>{count(f, 4, 34, 937)}</div>
            <div style={{fontFamily: jakarta, fontSize: 46, color: C.onNightSoft, marginTop: 24}}>income records in her workbook</div>
          </div>
        </Slam>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Slam at={58} out={112}>
          <div style={{display: 'flex', alignItems: 'center', gap: 80}}>
            <svg width={360} height={360} viewBox="0 0 360 360" style={{transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 30px rgba(242,178,82,${0.35 * ring}))`}}>
              <circle cx={180} cy={180} r={146} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={36} />
              <circle cx={180} cy={180} r={146} fill="none" stroke={C.amber} strokeWidth={36} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 146 * 0.43 * ring} 9999`} />
            </svg>
            <div>
              <div style={{fontFamily: sora, fontWeight: 800, fontSize: 260, letterSpacing: '-0.06em', color: C.amber, lineHeight: 0.9}}>{Math.round(43 * ring)}%</div>
              <div style={{fontFamily: jakarta, fontSize: 44, lineHeight: 1.3, color: C.onNightSoft, marginTop: 22, width: 700}}>had no anniversary date or deposit on file</div>
            </div>
          </div>
        </Slam>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Slam at={116}>
          <div style={{display: 'flex', alignItems: 'center', gap: 100}}>
            <div style={{position: 'relative', width: 400, height: 300}}>
              {[0, 1].map((k) => (
                <Receipt key={k} no="1182" amt="4,500" unit={k ? '3b' : '2c'} style={{position: 'absolute', left: 30, top: 40,
                  boxShadow: `0 30px 60px rgba(0,0,0,0.45), 0 0 0 ${flash * 6}px ${C.coral}`,
                  transform: `translate(${(k ? 1 : -1) * 80 * (1 - slips)}px, ${(k ? 1 : -1) * 18 * (1 - slips) + k * 14 * slips}px) rotate(${(k ? 7 : -8) * (1 - slips) + k * 3 * slips}deg)`}} />
              ))}
            </div>
            <div>
              <div style={{fontFamily: sora, fontWeight: 800, fontSize: 260, letterSpacing: '-0.06em', color: C.coral, lineHeight: 0.9}}>5</div>
              <div style={{fontFamily: jakarta, fontSize: 44, lineHeight: 1.3, color: C.onNightSoft, marginTop: 22, width: 640}}>receipt numbers were each used for two payments</div>
            </div>
          </div>
        </Slam>
      </AbsoluteFill>
      <Sfx at={4} name="impact" vol={0.35} />
      <Ticks at={6} dur={32} />
      <Sfx at={58} name="swipe" vol={0.45} />
      <Ticks at={64} dur={30} />
      <Sfx at={116} name="swipe" vol={0.45} />
      <Sfx at={130} name="whoosh" vol={0.3} />
      <Sfx at={146} name="warn" vol={0.5} />
      <Sfx at={132} name="riser" vol={0.5} />
    </AbsoluteFill>
  );
};

// ---- 4. The answer: a honeycomb builds itself and becomes the mark ----------------
const HEX = (() => {
  const cells: {q: number; r: number}[] = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) cells.push({q, r});
  return cells;
})();
const SHADES = [C.brand, C.brandStrong, C.brandBright, '#2a8a5c', '#1f7048'];
export const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const R = 62;
  const gather = t01(f, 34, 48, easeInOut);
  const light = t01(f, 40, 58, easeInOut);
  const markP = pop(f, 42, {damping: 13, stiffness: 150});
  const shift = t01(f, 56, 74, easeInOut);
  return (
    <AbsoluteFill>
      <Bg mood="night" hex glowX={50} />
      <AbsoluteFill style={{clipPath: `circle(${light * 1300}px at 50% 50%)`}}><Bg mood="light" /></AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', width: 0, height: 0, transform: `scale(${lerp(1, 0.2, gather)})`, opacity: 1 - t01(f, 42, 50)}}>
          {HEX.map(({q, r}, i) => {
            const x = R * Math.sqrt(3) * (q + r / 2), y = R * 1.5 * r;
            const seed = Math.sin(i * 12.9898) * 43758.5453;
            const sx = ((seed - Math.floor(seed)) - 0.5) * 1800, sy = ((Math.sin(i * 78.233) * 9999) % 1) * 900;
            const p = pop(f, 2 + i * 1.3, {damping: 15, stiffness: 140});
            const pulse = 1 + Math.sin(t01(f, 26, 36) * Math.PI) * 0.06;
            return (
              <svg key={i} width={R * 2} height={R * 2} viewBox="-1 -1 2 2" style={{position: 'absolute', left: lerp(sx, x, p) - R, top: lerp(sy, y, p) - R,
                transform: `rotate(${(1 - p) * 180}deg) scale(${pulse * 0.94})`, opacity: Math.min(1, p * 2)}}>
                <polygon points={Array.from({length: 6}, (_, k) => { const a = (Math.PI / 3) * k - Math.PI / 2; return `${Math.cos(a)},${Math.sin(a)}`; }).join(' ')}
                  fill={SHADES[i % SHADES.length]} stroke="rgba(255,255,255,0.18)" strokeWidth={0.03} />
              </svg>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: lerp(0, 48, shift), opacity: f >= 42 ? 1 : 0}}>
          <div style={{transform: `scale(${lerp(0.3, 1, markP) * lerp(1.5, 1, shift)})`, filter: `drop-shadow(0 30px 50px rgba(15,27,21,${0.3 * markP}))`}}>
            <Mark size={220} draw={t01(f, 42, 62)} />
          </div>
          <div style={{width: lerp(0, 820, shift), overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <Kin text="Hivelet" at={60} size={210} color={C.ink} stagger={0} ls="-0.055em" />
          </div>
        </div>
        <div style={{position: 'absolute', top: 720, left: 0, right: 0}}>
          <Kin text="One place for rooms, tenants, money and repairs." at={72} size={54} color={C.inkSoft} weight={500} align="center" ls="-0.02em" stagger={1.5} accent={['One', 'place']} accentColor={C.brand} />
        </div>
      </AbsoluteFill>
      {HEX.filter((_, i) => i % 3 === 0).map((_, k) => <Sfx key={k} at={2 + k * 4} name="tick" vol={0.3} />)}
      <Sfx at={0} name="impact" vol={0.7} />
      <Sfx at={34} name="whoosh" vol={0.35} />
      <Sfx at={44} name="bling" vol={0.55} />
    </AbsoluteFill>
  );
};
