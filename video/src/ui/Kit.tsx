// The app's own building blocks, rebuilt from frontend/src/index.css and the
// Vue components so they can move piece by piece. Sizes are the app's CSS
// pixels: tiles are rounded-tile (24px) with p-6, buttons are 44px pills,
// status pills are 12px semibold. Scenes scale the whole stage up.
import React from 'react';
import {ArrowUpRight, Bell, Menu} from 'lucide-react';
import {C, jakarta} from '../theme';

export type Tone = 'plain' | 'soft' | 'brand' | 'night';
const TILE: Record<Tone, React.CSSProperties> = {
  plain: {background: C.tile, color: C.ink},
  soft: {background: C.brandSoft, color: C.ink},
  brand: {background: C.brand, color: C.onBrand},
  night: {background: C.night, color: C.onNight},
};

export const Tile: React.FC<{
  tone?: Tone; w?: number; h?: number; title?: string; goto?: boolean; actions?: React.ReactNode;
  style?: React.CSSProperties; children?: React.ReactNode;
}> = ({tone = 'plain', w, h, title, goto, actions, style, children}) => {
  const dark = tone === 'brand' || tone === 'night';
  return (
    <div style={{width: w, height: h, borderRadius: 24, padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: jakarta, ...TILE[tone], ...style}}>
      {title || goto || actions ? (
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12}}>
          {title ? <div style={{fontSize: 15, lineHeight: '20px', fontWeight: 600, paddingTop: 10}}>{title}</div> : <span />}
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            {actions}
            {goto ? <IconBtn dark={dark}><ArrowUpRight size={16} strokeWidth={2} /></IconBtn> : null}
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
};

export const IconBtn: React.FC<{dark?: boolean; children: React.ReactNode; size?: number}> = ({dark, children, size = 44}) => (
  <div style={{width: size, height: size, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.18)' : C.line}`, background: dark ? 'transparent' : C.tile, color: dark ? C.onNight : C.ink}}>
    {children}
  </div>
);

export type PillTone = 'paid' | 'verify' | 'overdue' | 'neutral' | 'unentered' | 'on-dark';
const PILL: Record<PillTone, React.CSSProperties> = {
  paid: {background: C.brandSoft, color: C.brand},
  verify: {background: C.verifySoft, color: C.verify},
  overdue: {background: C.overdueSoft, color: C.overdue},
  neutral: {background: C.canvas, color: C.inkSoft},
  unentered: {background: C.tile, color: C.inkSoft, border: `1px solid ${C.line}`},
  'on-dark': {background: 'rgba(255,255,255,0.1)', color: C.onNight},
};
export const Pill: React.FC<{tone?: PillTone; children: React.ReactNode; style?: React.CSSProperties}> = ({tone = 'neutral', children, style}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, lineHeight: '16px', fontFamily: jakarta, ...PILL[tone], ...style}}>
    {children}
  </span>
);

export type BtnKind = 'brand' | 'light' | 'plain' | 'night' | 'quiet';
const BTN: Record<BtnKind, React.CSSProperties> = {
  brand: {background: C.brand, color: C.onBrand, border: `1px solid ${C.brand}`},
  light: {background: C.tile, color: C.ink, border: `1px solid ${C.tile}`},
  plain: {background: C.tile, color: C.ink, border: `1px solid ${C.line}`},
  night: {background: C.night, color: C.onNight, border: `1px solid ${C.night}`},
  quiet: {background: 'transparent', color: C.inkSoft, border: '1px solid transparent'},
};
// `press` is 0..1: the app's :active scale(0.97), plus the hover colour.
export const Btn: React.FC<{kind?: BtnKind; icon?: React.ReactNode; children: React.ReactNode; press?: number; style?: React.CSSProperties; full?: boolean}> = ({kind = 'plain', icon, children, press = 0, style, full}) => (
  <div style={{display: full ? 'flex' : 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '0 18px', borderRadius: 999, boxSizing: 'border-box',
    fontFamily: jakarta, fontSize: 14, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', transform: `scale(${1 - 0.03 * press})`,
    ...BTN[kind], ...(kind === 'brand' && press > 0 ? {background: C.brandStrong, borderColor: C.brandStrong} : {}), ...style}}>
    {icon}
    {children}
  </div>
);

// A text input as the app draws it; `focus` draws its 3px focus ring.
export const Input: React.FC<{value?: string; placeholder?: string; focus?: boolean; caret?: boolean; mono?: boolean; right?: React.ReactNode; disabled?: boolean; style?: React.CSSProperties; area?: boolean}> = ({value, placeholder, focus, caret, mono, right, disabled, style, area}) => (
  <div style={{boxSizing: 'border-box', width: '100%', minHeight: area ? 96 : 44, border: `1px solid ${C.line}`, borderRadius: area ? 16 : 999,
    background: disabled ? C.canvas : C.tile, color: value ? C.ink : C.inkFaint, padding: area ? '12px 16px' : '10px 18px', fontSize: 14, lineHeight: '20px',
    fontFamily: mono ? 'ui-monospace, Consolas, monospace' : jakarta, display: 'flex', alignItems: area ? 'flex-start' : 'center', justifyContent: 'space-between',
    boxShadow: focus ? `0 0 0 2px ${C.tile}, 0 0 0 5px ${C.ink}` : 'none', ...style}}>
    <span>
      {value || placeholder}
      {caret ? <span style={{display: 'inline-block', width: 1.5, height: 17, background: C.ink, marginLeft: 1, verticalAlign: 'text-bottom'}} /> : null}
    </span>
    {right}
  </div>
);

export const Field: React.FC<{label: string; children: React.ReactNode; style?: React.CSSProperties}> = ({label, children, style}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: '16px', color: C.inkFaint, fontFamily: jakarta, minWidth: 0, ...style}}>
    {label}
    {children}
  </div>
);

// The top bar every signed-in page shares.
export const AppHeader: React.FC<{initials: string; unread: number; phone?: boolean; ring?: number}> = ({initials, unread, phone, ring = 0}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: phone ? 64 : 62, borderBottom: `1px solid ${C.line}`, fontFamily: jakarta}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      {phone ? <Menu size={22} color={C.inkSoft} /> : null}
      <span style={{display: 'flex', alignItems: 'center', gap: 8}}><Mark size={phone ? 26 : 28} />
      <span style={{fontSize: phone ? 21 : 22, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink}}>Hivelet</span></span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
      <div style={{position: 'relative', transform: `rotate(${Math.sin(ring * Math.PI * 6) * 14 * (1 - ring)}deg)`}}>
        <IconBtn><Bell size={18} strokeWidth={1.8} /></IconBtn>
        {unread > 0 ? (
          <span style={{position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: phone ? C.brand : C.overdue, color: '#fff',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.canvas}`}}>{unread}</span>
        ) : null}
      </div>
      <div style={{width: 36, height: 36, borderRadius: 18, background: C.brand, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{initials}</div>
    </div>
  </div>
);

// Pointer and tap, drawn at the stage's scale.
export const Cursor: React.FC<{x: number; y: number; press?: number; opacity?: number; size?: number}> = ({x, y, press = 0, opacity = 1, size = 26}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{position: 'absolute', left: x - size * 0.19, top: y - size * 0.1, opacity, transform: `scale(${1 - 0.15 * press})`,
    transformOrigin: '19% 10%', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))', zIndex: 50}}>
    <path d="M4.5 2.5 L4.5 19 L9 14.6 L12 21.2 L14.6 20 L11.7 13.6 L18 13.6 Z" fill={C.ink} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

export const Ripple: React.FC<{x: number; y: number; p: number; color?: string; r?: number}> = ({x, y, p, color = C.brandBright, r = 30}) =>
  p <= 0 || p >= 1 ? null : (
    <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `2px solid ${color}`,
      background: `${color}33`, opacity: 1 - p, transform: `scale(${0.3 + p * 1.3})`, zIndex: 49}} />
  );

// The app icon: same mark as frontend/public/favicon.svg. `draw` strokes it on.
// The Hivelet mark (frontend/public/favicon.svg): a green hexagon, the same cell
// the hive is built from, with a minimal H under a roof. `draw` strokes the roof
// and then the H in; `fill` fades the hexagon; `hex` colours it (the hive's
// centre cell arrives brighter and settles to the brand green).
export const HEX_PATH = 'M217.89 34 Q256 12 294.11 34 L429.21 112 Q467.31 134 467.31 178 L467.31 334 Q467.31 378 429.21 400 L294.11 478 Q256 500 217.89 478 L82.79 400 Q44.69 378 44.69 334 L44.69 178 Q44.69 134 82.79 112 Z';
export const Mark: React.FC<{size: number; draw?: number; fill?: number; hex?: string}> = ({size, draw = 1, fill = 1, hex = C.brand}) => {
  const seg = (a: number, b: number) => Math.max(0, Math.min(1, (draw - a) / (b - a)));
  const line = {fill: 'none', stroke: '#fff', strokeWidth: 36, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <path d={HEX_PATH} fill={hex} opacity={fill} />
      <path d="M146 226 L256 136 L366 226" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0, 0.45))} opacity={draw > 0 ? 1 : 0} />
      <path d="M186 254 V376" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0.35, 0.65))} opacity={draw > 0.35 ? 1 : 0} />
      <path d="M326 254 V376" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0.45, 0.75))} opacity={draw > 0.45 ? 1 : 0} />
      <path d="M186 314 H326" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0.7, 1))} opacity={draw > 0.7 ? 1 : 0} />
    </svg>
  );
};
