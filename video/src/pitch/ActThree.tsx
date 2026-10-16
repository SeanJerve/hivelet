// Act three, 40 to 60 s: the proof, one figure at a time, full screen, and the close.
// The figures are the study's own (Chapter 4): 937 income records carried over from her
// workbook, A+ from all three outside security scans (Section 4.4.4), and 4.53 out of 5,
// Very High Quality, on ISO/IEC 25010 (Table 4-17).
import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {jakarta, sora} from '../theme';
import {Mark} from '../ui/Kit';
import {Camera, expo, GREEN, inQuint, Label, lerp, MBlur, Odometer, P, quint, Rise, Slam, speed, spr, sweep, t01, Thread, W, H} from './kit';
import {markPts} from './ActOne';
import {f as F, SCENES, vo0} from './timeline';

// Each figure pushes the last one off to the left.
const Push: React.FC<{s: readonly [number, number]; first?: boolean; children: React.ReactNode}> = ({s, first, children}) => {
  const f = useCurrentFrame();
  const inn = first ? 1 : t01(f, F(s[0]), F(s[0]) + 22, quint);
  const out = t01(f, F(s[1]), F(s[1]) + 22, quint);
  const x = (1 - inn) * W * 0.6 - out * W * 0.6;
  const v = speed(f, F(s[0]), F(s[0]) + 22, quint) + speed(f, F(s[1]), F(s[1]) + 22, quint);
  return (
    <AbsoluteFill style={{transform: `translateX(${x}px)`, opacity: (first ? t01(f, F(s[0]), F(s[0]) + 16) : 1) * (1 - out)}}>
      <MBlur x={v * 40}><AbsoluteFill>{children}</AbsoluteFill></MBlur>
    </AbsoluteFill>
  );
};

// ---- 937 records ----------------------------------------------------------------------------------
export const Records: React.FC = () => {
  const f = useCurrentFrame();
  const V = vo0('records');
  // Her rows, flying in from the edges and into the figure.
  const streak = (i: number) => {
    const a = random(`a${i}`) * Math.PI * 2, d = 900 + random(`d${i}`) * 600;
    const at = V - 10 + random(`t${i}`) * 50;
    const p = t01(f, at, at + 34, inQuint);
    return {x: W / 2 + Math.cos(a) * d * (1 - p), y: 470 + Math.sin(a) * d * 0.6 * (1 - p), a, p, on: f >= at && p < 1};
  };
  return (
    <Push s={SCENES.records} first>
      <Camera hits={[V + 60]} drift={0.5}>
        {Array.from({length: 70}, (_, i) => {
          const s = streak(i);
          return s.on ? <div key={i} style={{position: 'absolute', left: s.x, top: s.y, width: 90, height: 4, borderRadius: 2, background: i % 5 ? P.glow : P.lime, opacity: 0.7 * (1 - s.p * 0.6),
            transform: `rotate(${(s.a * 180) / Math.PI}deg)`, boxShadow: `0 0 12px ${P.glow}`}} /> : null;
        })}
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 60}}>
          <div style={{transform: `scale(${lerp(1.25, 1, t01(f, V, V + 70))})`}}>
            <Odometer value="937" at={V} dur={70} size={420} gradient={GREEN} />
          </div>
          <Rise text="real records." at={V + 40} size={92} align="center" style={{marginTop: 10}} />
          <div style={{marginTop: 26, opacity: t01(f, V + 70, V + 90)}}><Label>Carried over from her own workbook</Label></div>
        </AbsoluteFill>
      </Camera>
    </Push>
  );
};

// ---- A+ ---------------------------------------------------------------------------------------------
export const Secure: React.FC = () => {
  const f = useCurrentFrame();
  const V = vo0('secure');
  const hit = V + 8;
  const ring = (k: number) => t01(f, hit + k * 6, hit + k * 6 + 40, expo);
  return (
    <Push s={SCENES.secure}>
      <Camera hits={[hit]} drift={0.5}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: `${6 - k * 1.5}px solid ${P.glow}`,
              transform: `scale(${lerp(0.6, 3.6 + k, ring(k))})`, opacity: (1 - ring(k)) * (f >= hit + k * 6 ? 0.8 : 0)}} />
          ))}
        </AbsoluteFill>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 60}}>
          <Slam text="A+" at={hit} from={2.6} size={440} gradient={sweep(f, hit + 14, P.glow, '#fff', P.lime)} />
          <Rise text="for security." at={hit + 16} size={92} align="center" style={{marginTop: 4}} />
          <div style={{marginTop: 26, opacity: t01(f, hit + 34, hit + 54)}}><Label>Qualys SSL Labs · Mozilla Observatory · securityheaders.com</Label></div>
        </AbsoluteFill>
      </Camera>
    </Push>
  );
};

// ---- 4.53 out of 5 -----------------------------------------------------------------------------------
export const Rated: React.FC = () => {
  const f = useCurrentFrame();
  const V = vo0('rated');
  const fill = t01(f, V + 20, V + 120, quint);
  const value = 4.53 * fill;
  const R = 300, CX = W / 2, CY = 470, SW = 26;
  // A 270-degree gauge, open at the bottom.
  const arc = (from: number, to: number) => {
    const a0 = ((135 + from * 270) * Math.PI) / 180, a1 = ((135 + to * 270) * Math.PI) / 180;
    const p = (a: number) => `${(CX + R * Math.cos(a)).toFixed(1)} ${(CY + R * Math.sin(a)).toFixed(1)}`;
    return `M ${p(a0)} A ${R} ${R} 0 ${(to - from) * 270 > 180 ? 1 : 0} 1 ${p(a1)}`;
  };
  const end = (4.53 / 5) * fill;
  const tip = ((135 + end * 270) * Math.PI) / 180;
  return (
    <Push s={SCENES.rated}>
      <Camera drift={0.5}>
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="gauge" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor={P.glow} /><stop offset="100%" stopColor={P.lime} /></linearGradient>
          </defs>
          <path d={arc(0, 1)} fill="none" stroke="rgba(244,251,247,0.10)" strokeWidth={SW} strokeLinecap="round" />
          {end > 0.002 ? <>
            <path d={arc(0, end)} fill="none" stroke="url(#gauge)" strokeWidth={SW * 2.4} strokeLinecap="round" opacity={0.25} style={{filter: 'blur(16px)'}} />
            <path d={arc(0, end)} fill="none" stroke="url(#gauge)" strokeWidth={SW} strokeLinecap="round" />
            <circle cx={CX + R * Math.cos(tip)} cy={CY + R * Math.sin(tip)} r={10} fill="#fff" style={{filter: `drop-shadow(0 0 12px ${P.lime})`}} />
          </> : null}
          {[1, 2, 3, 4, 5].map((n) => {
            const a = ((135 + ((n - 1) / 4) * 270) * Math.PI) / 180;
            return <text key={n} x={CX + (R + 52) * Math.cos(a)} y={CY + (R + 52) * Math.sin(a) + 8} textAnchor="middle" fontFamily={jakarta} fontSize={22} fontWeight={700} fill="rgba(244,251,247,0.4)">{n}</text>;
          })}
        </svg>
        <div style={{position: 'absolute', left: 0, right: 0, top: CY - 150, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 10, opacity: t01(f, V, V + 14)}}>
          <span style={{fontFamily: sora, fontWeight: 800, fontSize: 230, letterSpacing: '-0.06em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            backgroundImage: GREEN, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{value.toFixed(2)}</span>
          <span style={{fontFamily: sora, fontWeight: 700, fontSize: 70, color: P.faint}}>/5</span>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 820, textAlign: 'center'}}>
          <Rise text="Very High Quality" at={V + 30} size={92} align="center" />
          <div style={{marginTop: 22, opacity: t01(f, V + 80, V + 100), display: 'flex', justifyContent: 'center'}}><Label>ISO/IEC 25010 · rated by the owner, tenants and evaluators</Label></div>
        </div>
      </Camera>
    </Push>
  );
};

// ---- The close ---------------------------------------------------------------------------------------
export const Close: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(SCENES.close[0]), N = vo0('name'), C = vo0('close');
  const SZ = 230, CX = W / 2, CY = 330;
  const trace = t01(f, S + 4, N + 6, quint);
  const draw = t01(f, N - 6, N + 18, quint);
  const fill = t01(f, N + 6, N + 20);
  const photo = t01(f, C + 30, C + 120);
  const team = t01(f, F(56.4), F(57.0));
  const names = ['Lloyd', 'Sean', 'Eljohn', 'Vince', 'Kiel'];
  return (
    <AbsoluteFill style={{opacity: t01(f, S, S + 12)}}>
      {/* Her building, quietly, inside the hive's cell. */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', width: 900, height: 900, top: -10, opacity: 0.22 * photo, transform: `scale(${lerp(1.08, 1, t01(f, C, F(60), (t) => t))})`,
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)', WebkitMaskImage: 'radial-gradient(circle at 50% 45%, #000 30%, transparent 72%)', maskImage: 'radial-gradient(circle at 50% 45%, #000 30%, transparent 72%)'}}>
          <Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </div>
      </AbsoluteFill>
      <Thread pts={markPts(CX, CY, SZ)} to={trace} width={4} />
      <div style={{position: 'absolute', left: CX - SZ / 2, top: CY - SZ / 2, opacity: Math.max(fill, draw > 0 ? 1 : 0), transform: `scale(${1 + (1 - Math.min(1, spr(f, N + 6, {damping: 12, stiffness: 160}))) * 0.2})`,
        filter: `drop-shadow(0 0 ${30 * fill}px rgba(95,242,168,0.55))`}}>
        <Mark size={SZ} draw={draw} fill={fill} hex={P.emerald} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: CY + SZ / 2 + 30, display: 'flex', justifyContent: 'center'}}>
        <Slam text="Hivelet" at={N + 2} from={1.4} size={170} gradient={sweep(f, N + 10, P.white, '#fff', P.lime)} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: CY + SZ / 2 + 250, textAlign: 'center'}}>
        <Rise text="One connected system" at={C} size={64} align="center" ls="-0.035em" accent={['connected']} accentGradient={GREEN} />
        <div style={{marginTop: 16, display: 'flex', justifyContent: 'center'}}>
          <Rise text="for the Fe Galang Da Silva Boarding House." at={C + 60} size={36} weight={500} font={jakarta} ls="-0.01em" align="center" color={P.soft} stagger={0.7} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 92, textAlign: 'center', opacity: team, transform: `translateY(${(1 - team) * 24}px)`}}>
        <div style={{fontFamily: jakarta, fontWeight: 700, fontSize: 26, color: P.glow, letterSpacing: '0.02em'}}>hivelet.vercel.app</div>
        <div style={{fontFamily: jakarta, fontSize: 20, color: P.faint, marginTop: 14, letterSpacing: '0.06em'}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 46, marginTop: 14, fontFamily: sora, fontWeight: 700, fontSize: 30, color: P.white, letterSpacing: '-0.02em'}}>
          {names.map((n, i) => <span key={n} style={{opacity: t01(f, F(56.5) + i * 5, F(56.5) + i * 5 + 14)}}>{n}</span>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
