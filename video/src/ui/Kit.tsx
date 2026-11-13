// The app's own building blocks, rebuilt from frontend/src/index.css, glass.css and the Vue
// components so they can move piece by piece. Sizes are the app's CSS pixels, read from the
// running app (13 Nov 2026, after the November redesign): a section sits on the page with no
// card unless it is boxed, a boxed tile is rounded-tile (24px) glass with p-6, buttons are 44px
// tinted-glass pills, a status is a coloured word, not a pill. Scenes scale the whole stage up.
import React from 'react';
import {ArrowUpRight, Bell, ChevronDown, Menu} from 'lucide-react';
import {C, GL, jakarta, sora} from '../theme';

// The 1px bright rim round every glass surface (glass.css `::after`): a gradient drawn in the
// padding box only, so the middle stays clear.
export const Rim: React.FC<{bg?: string}> = ({bg = GL.rim}) => (
  <div style={{position: 'absolute', inset: 0, padding: 1, borderRadius: 'inherit', pointerEvents: 'none', background: bg, zIndex: 1,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude'}} />
);

// A glass surface. `tile` is .bg-tile, `night` and `brand` the two dark tiles, `float` a dialog
// or sheet (.ws-modal-panel, dialog.ws-dialog) and `menu` a dropdown or a toast (.shadow-lift).
// In the app the two floating ones blur what is under them (backdrop-filter). Here the scene
// blurs the layer underneath instead (see `Under` below): a backdrop filter cannot see the film's
// 3D stage, and the result is the same frosted panel.
export type GlassTone = 'tile' | 'night' | 'brand' | 'float' | 'menu';
const GLASS: Record<GlassTone, React.CSSProperties> = {
  tile: {background: GL.tile, boxShadow: `${GL.sheen}, ${GL.drop}`, color: C.ink},
  night: {background: `linear-gradient(172deg, rgba(255,255,255,0.07), transparent 30%), ${GL.night}`, boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), ${GL.drop}`, color: C.onNight},
  brand: {background: `radial-gradient(80% 110% at 8% -15%, rgba(255,255,255,0.09), transparent 62%), radial-gradient(70% 120% at 100% 115%, rgba(120,230,180,0.08), transparent 60%), ${GL.brand}`,
    boxShadow: `inset 0 1px 1px rgba(255,255,255,0.2), ${GL.drop}`, color: C.onBrand},
  float: {background: `${GL.floatSheen}, rgba(248,252,249,0.84)`, boxShadow: `${GL.sheen}, ${GL.dropFloat}`, color: C.ink},
  menu: {background: `${GL.floatSheen}, rgba(249,253,250,0.96)`, boxShadow: `${GL.sheen}, ${GL.dropFloat}`, color: C.ink},
};
export const Glass: React.FC<{tone?: GlassTone; r?: number | string; style?: React.CSSProperties; children?: React.ReactNode}> = ({tone = 'tile', r = 24, style, children}) => (
  <div style={{position: 'relative', borderRadius: r, boxSizing: 'border-box', fontFamily: jakarta, ...GLASS[tone], ...style}}>
    {children}
    <Rim bg={tone === 'night' || tone === 'brand' ? GL.rimDark : GL.rim} />
  </div>
);

// What lies under a floating panel: blurred and washed by `p` (0 to 1), as the panel's own
// backdrop filter does in the app (blur 28px, lower contrast, brighter).
export const under = (p: number): React.CSSProperties => (p > 0 ? {filter: `blur(${14 * p}px) contrast(${1 - 0.25 * p}) brightness(${1 + 0.08 * p})`} : {});

// A section of an overview (components/overview/OverviewTile.vue): its title in the display
// face with the arrow that opens its page beside it, then what it holds. On the page with no
// card by default; `boxed` and the two dark tones are glass tiles with p-6 (p-5 on a phone).
export type Tone = 'plain' | 'boxed' | 'brand' | 'night';
export const Tile: React.FC<{
  tone?: Tone; w?: number; h?: number; title?: React.ReactNode; goto?: boolean; pad?: number; gap?: number;
  style?: React.CSSProperties; children?: React.ReactNode;
}> = ({tone = 'plain', w, h, title, goto, pad, gap = 16, style, children}) => {
  const dark = tone === 'brand' || tone === 'night';
  const inner = (
    <>
      {title || goto ? (
        <div style={{display: 'flex', alignItems: 'flex-start', minHeight: goto ? 44 : 30}}>
          {title ? <div style={{fontFamily: sora, fontSize: 15, lineHeight: '20px', fontWeight: 600, letterSpacing: '-0.02em', paddingTop: 10}}>{title}</div> : null}
          {goto ? <span style={{width: 44, height: 44, marginLeft: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? '#fff' : C.ink}}><ArrowUpRight size={16} strokeWidth={2} /></span> : null}
        </div>
      ) : null}
      {children}
    </>
  );
  const box: React.CSSProperties = {width: w, height: h, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap, fontFamily: jakarta};
  return tone === 'plain'
    ? <div style={{...box, padding: `${pad ?? 8}px 0`, color: C.ink, ...style}}>{inner}</div>
    : <Glass tone={tone === 'boxed' ? 'tile' : tone} style={{...box, padding: pad ?? 24, ...style}}>{inner}</Glass>;
};

// A status, set in the type (components/overview/StatusPill.vue): 13px medium, coloured by what
// it says. Ochre for what is waiting, clay for what is wrong, brand green for what is done.
export type PillTone = 'paid' | 'verify' | 'overdue' | 'neutral' | 'expected' | 'on-dark';
const WORD: Record<PillTone, React.CSSProperties> = {
  paid: {color: C.brand},
  verify: {color: GL.statusWait},
  overdue: {color: GL.statusAlert, fontWeight: 600},
  neutral: {color: C.inkSoft},
  expected: {color: GL.inkFaint},
  'on-dark': {color: C.onNight},
};
export const Pill: React.FC<{tone?: PillTone; children: React.ReactNode; style?: React.CSSProperties}> = ({tone = 'neutral', children, style}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, lineHeight: '20px', fontFamily: jakarta, ...WORD[tone], ...style}}>
    {children}
  </span>
);

// The pills. `brand` is .pill-btn-brand (deep green glass), `light` .pill-btn-light (the white
// one on a dark tile), `plain` .pill-btn (clear glass), `quiet` .pill-btn-quiet (words only).
export type BtnKind = 'brand' | 'light' | 'plain' | 'quiet';
const mirror = (tint: string, sheen: number) => `linear-gradient(180deg, rgba(255,255,255,${sheen}), rgba(255,255,255,0.03) 44%, transparent 62%, rgba(255,255,255,0.1)), ${tint}`;
const BTN: Record<BtnKind, React.CSSProperties> = {
  brand: {background: mirror(GL.brandBtn, 0.2), color: '#ffffff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)'},
  light: {background: mirror('rgba(255,255,255,0.9)', 0.34), color: C.night, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)'},
  plain: {background: GL.field, color: C.ink, border: `1px solid ${GL.fieldEdge}`, boxShadow: GL.fieldShadow},
  quiet: {background: 'transparent', color: C.inkSoft},
};
// `press` is 0..1: the app's :active scale(0.97), and the brand pill's deeper hover tint.
export const Btn: React.FC<{kind?: BtnKind; icon?: React.ReactNode; children?: React.ReactNode; press?: number; style?: React.CSSProperties; full?: boolean}> = ({kind = 'plain', icon, children, press = 0, style, full}) => (
  <div style={{position: 'relative', display: full ? 'flex' : 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '0 18px', borderRadius: 999, boxSizing: 'border-box',
    fontFamily: jakarta, fontSize: 14, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', transform: `scale(${1 - 0.03 * press})`,
    ...BTN[kind], ...(kind === 'brand' && press > 0 ? {background: mirror('rgba(14,72,46,0.88)', 0.2)} : {}), ...style}}>
    {icon}
    {children}
    {kind === 'brand' || kind === 'light' ? <Rim bg={GL.rimBtn} /> : null}
  </div>
);

// A text input as the app draws it (.ws-input): clear glass with a bright edge. `float` is the
// one inside a dialog, a little more solid. `focus` draws the workspace's 3px focus ring.
export const Input: React.FC<{value?: string; placeholder?: string; focus?: boolean; caret?: boolean; mono?: boolean; right?: React.ReactNode; left?: React.ReactNode; float?: boolean; style?: React.CSSProperties; area?: boolean}> = ({value, placeholder, focus, caret, mono, right, left, float, style, area}) => (
  <div style={{boxSizing: 'border-box', width: '100%', minHeight: area ? 96 : 44, border: `1px solid ${float ? GL.fieldFloatEdge : GL.fieldEdge}`, borderRadius: area ? 16 : 999,
    background: float ? GL.fieldFloat : GL.field, color: value ? C.ink : GL.inkFaint, padding: area ? '12px 16px' : '10px 18px', fontSize: 14, lineHeight: area ? '24px' : '20px',
    fontFamily: mono ? 'ui-monospace, Consolas, monospace' : jakarta, display: 'flex', alignItems: area ? 'flex-start' : 'center', gap: 10,
    boxShadow: focus ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 5px #101713' : GL.fieldShadow, ...style}}>
    {left}
    <span style={{flex: 1, minWidth: 0}}>
      {value || placeholder}
      {caret ? <span style={{display: 'inline-block', width: 1.5, height: 17, background: C.ink, marginLeft: 1, verticalAlign: 'text-bottom'}} /> : null}
    </span>
    {right}
  </div>
);

// The app's dropdown trigger (components/ui/PillSelect.vue): mirror glass with a fine green ring.
export const Select: React.FC<{value: string; count?: string; open?: boolean; field?: boolean; w?: number | string; style?: React.CSSProperties}> = ({value, count, open, field, w = '100%', style}) => (
  <div style={{position: 'relative', boxSizing: 'border-box', width: w, height: 44, borderRadius: 999, padding: field ? '8px 12px 8px 18px' : '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    fontFamily: jakarta, fontSize: 14, lineHeight: '20px', fontWeight: field ? 400 : 500, color: C.ink, background: mirror('rgba(255,255,255,0.34)', 0.34),
    boxShadow: open ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 5px #101713' : 'inset 0 0 0 1px rgba(23,96,63,0.18), inset 0 1px 1px rgba(255,255,255,0.7)', ...style}}>
    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{value}</span>
    <span style={{display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0}}>
      {count ? <span style={{fontSize: 12, fontWeight: 600, color: C.inkSoft, fontVariantNumeric: 'tabular-nums'}}>{count}</span> : null}
      <ChevronDown size={16} color={open ? C.brand : C.inkSoft} style={{transform: open ? 'rotate(180deg)' : undefined}} />
    </span>
  </div>
);

export const Field: React.FC<{label: string; children: React.ReactNode; float?: boolean; style?: React.CSSProperties}> = ({label, children, float, style}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: '16px', color: float ? GL.inkFaintFloat : GL.inkFaint, fontFamily: jakarta, minWidth: 0, ...style}}>
    {label}
    {children}
  </div>
);

// The top bar every signed-in page shares (components/layout/AppHeader.vue): a strip of glass
// with the wordmark alone, in the display face, and a dot on the bell when anything is unread,
// red on the landlady's side and green on a tenant's phone.
export const AppHeader: React.FC<{initials: string; unread: number; phone?: boolean; ring?: number}> = ({initials, unread, phone, ring = 0}) => (
  <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: phone ? '0 16px' : 0, boxSizing: 'border-box', fontFamily: jakarta,
    background: phone ? 'rgba(255,255,255,0.5)' : 'transparent', boxShadow: phone ? `inset 0 -1px 0 ${GL.line}, ${GL.sheen}` : `inset 0 -1px 0 ${GL.line}`}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
      {phone ? <span style={{width: 44, height: 44, marginLeft: -4, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Menu size={20} color={C.inkSoft} /></span> : null}
      <span style={{fontFamily: sora, fontSize: 20, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.025em', color: C.ink}}>Hivelet</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
      <div style={{position: 'relative', transform: `rotate(${Math.sin(ring * Math.PI * 6) * 14 * (1 - ring)}deg)`}}>
        <div style={{width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink}}><Bell size={20} strokeWidth={2} /></div>
        {unread > 0 ? (
          <span style={{position: 'absolute', top: 3, right: 3, width: 10, height: 10, borderRadius: 5, background: phone ? C.brand : C.overdue, boxShadow: '0 0 0 2px #edf1ee',
            transform: `scale(${1 + Math.sin(Math.min(1, ring * 3) * Math.PI) * 0.6})`}} />
        ) : null}
      </div>
      <div style={{width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: 36, height: 36, borderRadius: 18, background: C.brand, color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{initials}</div>
      </div>
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
      <path d="M146 216 L256 126 L366 216" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0, 0.45))} opacity={draw > 0 ? 1 : 0} />
      <path d="M186 244 V366" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0.35, 0.65))} opacity={draw > 0.35 ? 1 : 0} />
      <path d="M326 244 V366" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0.45, 0.75))} opacity={draw > 0.45 ? 1 : 0} />
      <path d="M186 304 H326" {...line} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - seg(0.7, 1))} opacity={draw > 0.7 ? 1 : 0} />
    </svg>
  );
};
