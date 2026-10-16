// Act two, 20 to 40 s: what Hivelet does, one feature per beat. Words on the left,
// the app itself on the right as a product shot floating in 3D; the thread wipes from
// one feature to the next. The app pieces are the film's own components (src/ui),
// which keep 30 fps time, so they are given the pitch's frame halved.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Check, Plane, Wifi, WifiOff} from 'lucide-react';
import {jakarta, sora} from '../theme';
import {Btn, Mark, Pill} from '../ui/Kit';
import {LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, ReceivedTile, RepairCard, SplitTile} from '../ui/Admin';
import {PaymentReceived, Phone, TenantHome} from '../ui/Tenant';
import {UnitShowcase} from '../ui/Public';
import {expo, GREEN, inQuint, Label, lerp, MBlur, P, quint, Rise, speed, spr, t01, Thread, threadWipeClip, ThreadWipeLine, H, W} from './kit';
import {f as F, SCENES, vo0} from './timeline';

// The new feature comes in behind a diagonal thread that crosses the frame.
const Wipe: React.FC<{at: number; children: React.ReactNode; first?: boolean}> = ({at, children, first}) => {
  const f = useCurrentFrame();
  const p = t01(f, at, at + 26, quint);
  if (first) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <>
      <AbsoluteFill style={{clipPath: p < 1 ? threadWipeClip(p) : undefined}}>{children}</AbsoluteFill>
      <ThreadWipeLine p={p} />
    </>
  );
};
// The scene being left goes dark and drifts left as the wipe passes over it.
const Leave: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
  const f = useCurrentFrame();
  const p = t01(f, at, at + 26, quint);
  return <AbsoluteFill style={{transform: `translateX(${-p * 160}px)`, filter: p > 0 ? `brightness(${1 - p * 0.6})` : undefined}}>{children}</AbsoluteFill>;
};

// A product shot: a floating, slowly turning stage in perspective, lit from above.
const Stage3D: React.FC<{x: number; y: number; w: number; h: number; ry: [number, number]; rx?: number; at: number; dur: number; children: React.ReactNode; z?: number}> = ({x, y, w, h, ry, rx = 8, at, dur, children, z = 0}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, {damping: 18, stiffness: 70});
  const turn = t01(f, at, at + dur, (t) => t);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, perspective: 2200}}>
      <div style={{width: w, height: h, transformStyle: 'preserve-3d', transformOrigin: '50% 50%',
        transform: `translateZ(${(1 - p) * -900 + z}px) translateY(${(1 - p) * 120}px) rotateY(${lerp(ry[0], ry[1], turn) + (1 - p) * 30}deg) rotateX(${rx * (0.6 + 0.4 * p)}deg)`,
        opacity: Math.min(1, p * 1.6)}}>
        {children}
      </div>
    </div>
  );
};

// The words of a feature: an eyebrow, a two-line headline, and a second headline later.
const Words: React.FC<{n: string; kicker: string; a: string; aAt: number; b?: string; bAt?: number; out: number; accentA?: string[]; accentB?: string[]}> = ({n, kicker, a, aAt, b, bAt, out, accentA = [], accentB = []}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 130, top: 300, width: 760}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, opacity: t01(f, aAt - 10, aAt + 8) * (1 - t01(f, out, out + 10))}}>
        <span style={{fontFamily: jakarta, fontWeight: 800, fontSize: 22, color: P.ink, background: GREEN, borderRadius: 999, padding: '6px 14px'}}>{n}</span>
        <Label color={P.glow}>{kicker}</Label>
      </div>
      <div style={{position: 'relative', marginTop: 28}}>
        <Rise text={a} at={aAt} out={b ? (bAt as number) - 8 : out} size={118} accent={accentA} accentGradient={GREEN} />
        {b ? <div style={{position: 'absolute', left: 0, top: 0}}><Rise text={b} at={bAt as number} out={out} size={118} accent={accentB} accentGradient={GREEN} /></div> : null}
      </div>
    </div>
  );
};

// ---- 20 to 25.5 s: her ledger ----------------------------------------------------------------
const ROWS: LedgerRowData[] = [
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
  {unit: '2c', paid: 'Sep 18, 2026', period: 'Sep 20 – Oct 19', who: 'Trisha Delos Santos', or: '5077', rent: 4500, water: 400, heads: 2},
  {unit: '3a', paid: 'Sep 16, 2026', period: 'Sep 16 – Oct 15', who: 'Patrick Lomibao', or: '5081', rent: 6000, water: 600, heads: 3},
];
export const Ledger: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(SCENES.ledger[0]), V = vo0('ledger');
  const g = f / 2, g0 = S / 2;
  return (
    <Leave at={F(SCENES.ledger[1])}>
      <Wipe at={S} first>
        <Words n="01" kicker="Monthly Income" a={'Her ledger.\nHer layout.'} aAt={V} b={'Every peso,\ncounted.'} bAt={F(22.95)} out={F(25.3)} accentA={['ledger.']} accentB={['counted.']} />
        <Stage3D x={880} y={190} w={1100} h={820} ry={[-26, -12]} at={S + 14} dur={F(5.5)}>
          <div style={{transform: 'scale(0.98)', transformOrigin: '0 0', display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={{display: 'flex', gap: 16}}>
              <div style={{borderRadius: 24, boxShadow: '0 40px 90px rgba(0,0,0,0.55)'}}><ReceivedTile f={g} at={g0 + 20} w={352} h={300} /></div>
              <div style={{borderRadius: 24, boxShadow: '0 40px 90px rgba(0,0,0,0.55)'}}><SplitTile f={g} at={g0 + 26} w={732} h={300} /></div>
            </div>
            <div style={{width: 1100, borderRadius: 24, background: '#fff', overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.55)'}}>
              <LedgerCardHead f={g} at={g0 + 30} />
              <div style={{margin: 20, border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}>
                <LedgerHead />
                {ROWS.map((r, i) => {
                  const at = S + 50 + i * 12;
                  const p = spr(f, at, {damping: 18, stiffness: 140});
                  return <LedgerRow key={r.or} r={r} flash={(1 - t01(f, at + 8, at + 60)) * (f >= at ? 0.9 : 0)} style={{opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - p) * 80}px)`}} />;
                })}
              </div>
            </div>
          </div>
        </Stage3D>
        {/* A chip that floats in front: the invoice number, kept as she wrote it. */}
        <div style={{position: 'absolute', left: 1490, top: 760, opacity: t01(f, F(23.9), F(24.2)), transform: `translateY(${(1 - spr(f, F(23.9), {damping: 14, stiffness: 160})) * 60}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', borderRadius: 999, background: P.ink, border: `1px solid ${P.glow}`, boxShadow: `0 0 40px rgba(95,242,168,0.45)`,
            fontFamily: jakarta, fontWeight: 700, fontSize: 26, color: P.white}}><Check size={24} color={P.glow} />Invoice INV#5120 kept</div>
        </div>
      </Wipe>
    </Leave>
  );
};

// ---- 25.5 to 30 s: rent on their phone, and GCash ----------------------------------------------
export const Tenant: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(SCENES.tenant[0]), V = vo0('tenants');
  const tap = F(27.95), got = F(28.35);
  const press = t01(f, tap - 4, tap) * (1 - t01(f, tap, tap + 8));
  const ripple = t01(f, tap, tap + 30);
  const card = spr(f, got, {damping: 15, stiffness: 120});
  return (
    <Leave at={F(SCENES.tenant[1])}>
      <Wipe at={S}>
        <Words n="02" kicker="For tenants" a={'Their rent,\non their phone.'} aAt={V} b={'Pay with\nGCash.'} bAt={F(27.8)} out={F(29.85)} accentA={['phone.']} accentB={['GCash.']} />
        <Stage3D x={1080} y={60} w={414} h={868} ry={[34, -10]} rx={4} at={S + 10} dur={F(4.5)}>
          <div style={{transform: 'scale(1.0)', transformOrigin: '0 0', filter: 'drop-shadow(0 60px 80px rgba(0,0,0,0.6))'}}>
            <Phone><TenantHome amount="₱4,700.00" press={press} unread={2} /></Phone>
          </div>
          {/* a light that slides across the glass */}
          <div style={{position: 'absolute', inset: 12, borderRadius: 52, pointerEvents: 'none', background: `linear-gradient(115deg, transparent ${lerp(-40, 140, t01(f, S + 20, S + 110))}%, rgba(255,255,255,0.22) ${lerp(-30, 150, t01(f, S + 20, S + 110))}%, transparent ${lerp(-20, 160, t01(f, S + 20, S + 110))}%)`}} />
        </Stage3D>
        {ripple > 0 && ripple < 1 ? (
          <div style={{position: 'absolute', left: 1170 - 60, top: 538 - 60, width: 120, height: 120, borderRadius: 60, border: `3px solid ${P.glow}`, transform: `scale(${0.3 + ripple * 1.6})`, opacity: 1 - ripple}} />
        ) : null}
        {f >= got ? (
          <div style={{position: 'absolute', left: 1380, top: 520, perspective: 1600}}>
            <MBlur x={(1 - card) * 20}>
              <div style={{transform: `translateX(${(1 - card) * -260}px) translateZ(${(1 - card) * -400}px) rotateY(${(1 - card) * 40}deg) scale(1.25)`, transformOrigin: '0 0', opacity: Math.min(1, card * 2),
                filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.5))'}}>
                <PaymentReceived check={t01(f, got + 6, got + 40)} />
              </div>
            </MBlur>
          </div>
        ) : null}
      </Wipe>
    </Leave>
  );
};

// ---- 30 to 33 s: a repair, from request to done ------------------------------------------------
export const Repairs: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(SCENES.repairs[0]), V = vo0('tracked');
  const stops = [{x: 980, label: 'To dispatch'}, {x: 1300, label: 'In progress'}, {x: 1620, label: 'Done'}];
  const leg1 = t01(f, F(31.0), F(31.45), quint), leg2 = t01(f, F(31.85), F(32.3), quint);
  const cx = lerp(lerp(stops[0].x, stops[1].x, leg1), stops[2].x, leg2);
  const v = speed(f, F(31.0), F(31.45), quint) + speed(f, F(31.85), F(32.3), quint);
  const reached = (i: number) => (i === 0 ? f >= S + 20 : i === 1 ? leg1 > 0.98 : leg2 > 0.98);
  const line = [{x: stops[0].x, y: 760}, {x: stops[2].x, y: 760}];
  const fill = (cx - stops[0].x) / (stops[2].x - stops[0].x);
  return (
    <Leave at={F(SCENES.repairs[1])}>
      <Wipe at={S}>
        <Words n="03" kicker="Repairs" a={'From request\nto done.'} aAt={V} out={F(32.85)} accentA={['done.']} />
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}><line x1={stops[0].x} y1={760} x2={stops[2].x} y2={760} stroke="rgba(244,251,247,0.16)" strokeWidth={4} strokeLinecap="round" /></svg>
        <Thread pts={line} to={Math.max(0.001, fill)} width={4} head={false} />
        {stops.map((s, i) => {
          const on = reached(i);
          const pop = spr(f, i === 0 ? S + 20 : i === 1 ? F(31.45) : F(32.3), {damping: 10, stiffness: 200});
          return (
            <div key={s.label} style={{position: 'absolute', left: s.x - 120, top: 790, width: 240, textAlign: 'center'}}>
              <div style={{width: 34, height: 34, borderRadius: 17, margin: '-51px auto 0', background: on ? (i === 2 ? GREEN : P.glow) : P.deep, border: `3px solid ${on ? P.glow : 'rgba(244,251,247,0.25)'}`,
                transform: `scale(${on ? 1 + (1 - Math.min(1, pop)) * 0.6 : 1})`, boxShadow: on ? `0 0 30px ${P.glow}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {on && i === 2 ? <Check size={20} color={P.ink} strokeWidth={3} /> : null}
              </div>
              <div style={{marginTop: 18, fontFamily: jakarta, fontWeight: 700, fontSize: 24, color: on ? P.white : P.faint}}>{s.label}</div>
            </div>
          );
        })}
        <div style={{position: 'absolute', left: cx - 146 * 1.45, top: 250, transformOrigin: '50% 100%', transform: `rotate(${(leg1 < 1 ? speed(f, F(31.0), F(31.45), quint) : -speed(f, F(31.85), F(32.3), quint)) * 6}deg) scale(1.45)`,
          opacity: t01(f, S + 12, S + 30)}}>
          <MBlur x={v * 26}>
            <div style={{filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.55))'}}>
              <RepairCard title="Kitchen faucet keeps dripping" unit="1A" category="Plumbing" reported="Sep 29, 2026" tech={leg1 > 0.5 ? 'Plumber' : 'Unassigned'} prio="Medium" />
            </div>
          </MBlur>
        </div>
      </Wipe>
    </Leave>
  );
};

// ---- 33 to 36.75 s: a visitor asks, no account ---------------------------------------------------
export const Visitors: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(SCENES.visitors[0]), V = vo0('visitors');
  const g = f / 2;
  const plan = t01(f, S + 10, S + 70, quint);
  const q = spr(f, F(34.3), {damping: 15, stiffness: 150}), a = spr(f, F(35.1), {damping: 15, stiffness: 150});
  const chip = spr(f, F(35.35), {damping: 12, stiffness: 180});
  return (
    <Leave at={F(SCENES.visitors[1])}>
      <Wipe at={S}>
        <Words n="04" kicker="For visitors" a={'Ask about\na vacant room.'} aAt={V} b={'No account\nneeded.'} bAt={F(35.2)} out={F(36.6)} accentA={['vacant']} accentB={['needed.']} />
        <Stage3D x={900} y={190} w={960} h={600} ry={[-22, -10]} at={S + 6} dur={F(3.75)}>
          <div style={{transform: 'scale(0.9)', transformOrigin: '0 0', filter: 'drop-shadow(0 50px 80px rgba(0,0,0,0.55))'}}>
            <UnitShowcase plan={plan} chip={t01(f, S + 50, S + 70)} ring={t01(f, S + 60, S + 100)} />
          </div>
        </Stage3D>
        {[{t: 'Can we view it on Saturday?', who: 'Visitor', p: q, x: 1180, y: 660, mine: true}, {t: 'Yes po, Saturday at 10 am.', who: 'Boarding house', p: a, x: 1010, y: 790, mine: false}].map((m) => (
          <div key={m.t} style={{position: 'absolute', left: m.x, top: m.y, opacity: Math.min(1, m.p * 2), transform: `translateY(${(1 - m.p) * 40}px) scale(${lerp(0.8, 1, Math.min(1, m.p))})`, transformOrigin: m.mine ? '100% 100%' : '0 100%'}}>
            <div style={{fontFamily: jakarta, fontSize: 18, color: P.soft, marginBottom: 6}}>{m.who}</div>
            <div style={{padding: '18px 24px', borderRadius: m.mine ? '24px 24px 6px 24px' : '24px 24px 24px 6px', background: m.mine ? P.glow : '#fff', color: P.ink, fontFamily: jakarta, fontSize: 28, fontWeight: 600,
              boxShadow: '0 30px 60px rgba(0,0,0,0.45)'}}>{m.t}</div>
          </div>
        ))}
        <div style={{position: 'absolute', left: 1500, top: 120, opacity: Math.min(1, chip * 2), transform: `scale(${lerp(0.6, 1, Math.min(1.1, chip))})`}}>
          <div style={{padding: '14px 22px', borderRadius: 18, background: P.ink, border: '1px solid rgba(95,242,168,0.6)', boxShadow: '0 0 40px rgba(95,242,168,0.35)'}}>
            <div style={{fontFamily: jakarta, fontSize: 16, fontWeight: 700, letterSpacing: '0.18em', color: P.soft}}>REFERENCE</div>
            <div style={{fontFamily: sora, fontSize: 34, fontWeight: 700, letterSpacing: '0.08em', color: P.white, marginTop: 4}}>K7QM-3XRD</div>
          </div>
        </div>
      </Wipe>
    </Leave>
  );
};

// ---- 36.75 to 40 s: installs like an app, opens offline -------------------------------------------
const ICONS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#06b6d4', '#f97316', '#64748b', '#ec4899', '#84cc16', '#0ea5e9'];
export const Install: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(SCENES.install[0]), V = vo0('installs');
  const drop = spr(f, F(37.6), {damping: 9, stiffness: 160});
  const squash = 1 + Math.sin(Math.min(1, t01(f, F(37.6), F(37.95))) * Math.PI) * 0.12;
  const plane = t01(f, F(38.55), F(38.8), quint);
  const opens = t01(f, F(38.95), F(39.35), quint);
  return (
    <Leave at={F(40.0)}>
      <Wipe at={S}>
        <Words n="05" kicker="Installs from the browser" a={'Like an app.'} aAt={V + 8} b={'Even\noffline.'} bAt={F(38.6)} out={F(39.85)} accentA={['app.']} accentB={['offline.']} />
        <Stage3D x={1100} y={60} w={414} h={868} ry={[-26, -8]} rx={4} at={S + 6} dur={F(3.25)}>
          <div style={{filter: 'drop-shadow(0 60px 80px rgba(0,0,0,0.6))'}}>
            <Phone>
              {/* the home screen */}
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(170deg, #12352a 0%, #0a1712 60%, #050a07 100%)', padding: '40px 28px', boxSizing: 'border-box',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px 22px', alignContent: 'start', opacity: 1 - opens}}>
                {Array.from({length: 16}, (_, i) => {
                  const mine = i === 5;
                  return (
                    <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                      {mine ? (
                        <div style={{width: 66, height: 66, transform: `translateY(${(1 - drop) * -420}px) scale(${1 / squash}, ${squash})`, transformOrigin: '50% 100%', opacity: drop > 0.01 ? 1 : 0}}>
                          <div style={{width: 66, height: 66, borderRadius: 16, background: P.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px rgba(95,242,168,${0.6 * drop})`}}><Mark size={56} /></div>
                        </div>
                      ) : <div style={{width: 66, height: 66, borderRadius: 16, background: ICONS[i % ICONS.length], opacity: 0.55}} />}
                      <span style={{fontFamily: jakarta, fontSize: 13, color: mine ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: mine ? 700 : 500, opacity: mine ? t01(f, F(37.8), F(38.0)) : 1}}>{mine ? 'Hivelet' : ' '}</span>
                    </div>
                  );
                })}
              </div>
              {/* opened, with no connection: the bar the app shows, and what it last loaded */}
              {opens > 0 ? (
                <div style={{position: 'absolute', inset: 0, opacity: opens, transform: `scale(${lerp(0.6, 1, opens)})`, transformOrigin: '30% 30%', background: '#edf1ee'}}>
                  <div style={{height: 26, background: '#101713', color: '#eef5f0', fontFamily: jakarta, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                    <WifiOff size={13} />No connection · Transactions unavailable
                  </div>
                  <TenantHome amount="₱4,700.00" unread={0} />
                </div>
              ) : null}
            </Phone>
          </div>
        </Stage3D>
        {/* the airplane-mode switch, flipped */}
        <div style={{position: 'absolute', left: 1560, top: 420, opacity: t01(f, F(38.35), F(38.55)), transform: `translateX(${(1 - t01(f, F(38.35), F(38.6), expo)) * 60}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', borderRadius: 24, background: 'rgba(3,7,5,0.85)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}}>
            <div style={{width: 48, height: 48, borderRadius: 24, background: plane > 0.5 ? P.amber : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              {plane > 0.5 ? <Plane size={24} color={P.ink} /> : <Wifi size={24} color={P.white} />}
            </div>
            <div style={{width: 76, height: 42, borderRadius: 21, background: plane > 0.5 ? P.amber : 'rgba(255,255,255,0.2)', position: 'relative'}}>
              <div style={{position: 'absolute', top: 4, left: lerp(4, 38, plane), width: 34, height: 34, borderRadius: 17, background: '#fff'}} />
            </div>
          </div>
        </div>
      </Wipe>
    </Leave>
  );
};

export {Btn, Pill, inQuint};
