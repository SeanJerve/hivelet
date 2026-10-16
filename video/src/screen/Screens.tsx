// What the laptop's screen shows, 1600x1000, cut to the voice. Each phrase gets one idea,
// drawn plainly: a pen drawing the screen itself, her building in black and white, 33 dots
// becoming one, a spreadsheet collapsing into the drive it lived on, the problems, a serif
// "Nothing connected.", the green that floods the room for the name, the app itself, 937
// dots, a target hit dead centre, a curve that climbs to 4.53, and the name on one screen.
import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {Mark} from '../ui/Kit';
import {LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, ReceivedTile, RepairCard, SplitTile} from '../ui/Admin';
import {PaymentReceived, Phone, TenantHome} from '../ui/Tenant';
import {UnitShowcase} from '../ui/Public';
import {AT, LEN, OFF, WORD} from './timeline';
import {Big, C, Caption, clamp01, Draw, E, ellipse, FONT, Label, lerp, sec, Serif, spr, t01} from './kit';

type Scene = {from: number; to: number; bg: string; dark?: boolean; el: React.FC};

// ---- 0: what if (the pen draws the screen, and a house in it) -----------------------------
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const fill = t01(f, sec(AT.hook + 1.9), sec(AT.hook + 2.3), E.inOut);
  const grow = t01(f, sec(AT.hook + 2.25), sec(AT.hook + 2.75), E.inOut);
  const rx = lerp(560, 0, grow), ry = lerp(300, 0, grow), rw = lerp(480, 1600, grow), rh = lerp(300, 1000, grow);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="00" text="what if" />
      <div style={{position: 'absolute', left: rx, top: ry, width: rw, height: rh, border: `${lerp(5, 0, grow)}px solid ${C.ink}`, borderRadius: lerp(10, 0, grow), opacity: f < sec(AT.hook + 0.1) ? 0 : 1,
        clipPath: `inset(0 ${(1 - t01(f, sec(AT.hook + 0.1), sec(AT.hook + 0.6), E.inOut)) * 100}% 0 0)`, background: grow > 0 ? `rgba(31,154,98,${grow})` : undefined}} />
      {grow < 0.4 ? (
        <svg width={1600} height={1000} style={{position: 'absolute', inset: 0, opacity: 1 - grow * 2.5}}>
          <path d="M 720 560 L 720 470 L 800 405 L 880 470 L 880 560 Z" fill={`rgba(31,154,98,${fill})`} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" pathLength={1}
            strokeDasharray="1 1" strokeDashoffset={1 - t01(f, sec(AT.hook + 0.7), sec(AT.hook + 1.5), E.inOut)} />
          <path d="M 785 560 L 785 515 L 815 515 L 815 560" fill="none" stroke={C.ink} strokeWidth={5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t01(f, sec(AT.hook + 1.4), sec(AT.hook + 1.75))} />
        </svg>
      ) : null}
      <Caption text="What if a whole boarding house fit on one screen?" at={sec(AT.hook)} dur={LEN.hook - 0.1} accent={['one', 'screen']} out={sec(AT.hook + 2.3)} />
    </AbsoluteFill>
  );
};

// ---- 1: her building, in black and white ---------------------------------------------------
const Meet: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.meet);
  const z = lerp(1.0, 1.08, t01(f, S, S + sec(4)));
  const pin = spr(f, sec(WORD.legazpi), {damping: 12, stiffness: 220});
  return (
    <AbsoluteFill style={{background: C.char}}>
      <div style={{position: 'absolute', left: 260, top: 120, width: 1080, height: 650, overflow: 'hidden', opacity: t01(f, S - 4, S + 10)}}>
        <Img src={staticFile('fe-galang-building.webp')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '45% 40%', transform: `scale(${z})`, filter: 'grayscale(1) contrast(1.25) brightness(0.95)'}} />
      </div>
      <Label n="01" text="the place" dark at={S} />
      <div style={{position: 'absolute', left: 260, top: 790, fontFamily: FONT.mono, fontSize: 22, color: 'rgba(233,232,227,0.7)', opacity: t01(f, S + 20, S + 34)}}>Fe Galang Da Silva Boarding House</div>
      {f >= sec(WORD.legazpi) ? (
        <div style={{position: 'absolute', left: 1180, top: 790, display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${Math.min(1, pin)})`, transformOrigin: '0 50%'}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: C.green, boxShadow: `0 0 0 6px rgba(31,154,98,0.25)`}} />
          <span style={{fontFamily: FONT.mono, fontSize: 22, color: '#e9e8e3'}}>Legazpi City</span>
        </div>
      ) : null}
      <Caption text="This is the Fe Galang Da Silva Boarding House, in Legazpi City." at={S} dur={LEN.meet - 0.1} dark accent={['Legazpi', 'City']} />
    </AbsoluteFill>
  );
};

// ---- 2: thirty-three units, one landlady ------------------------------------------------------
const Units: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.units), L = sec(WORD.landlady);
  const one = t01(f, L, L + 14, E.out);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="02" text="the house" at={S} />
      <div style={{position: 'absolute', left: 120, top: 250}}>
        {f < L ? <Big text="33" at={S + 2} size={420} /> : <Big text="1" at={L} size={420} color={C.green} />}
        <div style={{fontFamily: FONT.mono, fontSize: 30, color: C.inkSoft, marginTop: 18, marginLeft: 12}}>{f < L ? 'units' : 'landlady'}</div>
      </div>
      {Array.from({length: 33}, (_, i) => {
        const c = i % 11, r = Math.floor(i / 11);
        const at = S + 6 + (c + r * 2) * 1.6;
        if (f < at) return null;
        const p = spr(f, at, {damping: 14, stiffness: 260});
        const me = i === 16;
        const s = me ? lerp(1, 2.4, one) : lerp(1, 0.7, one);
        return <div key={i} style={{position: 'absolute', left: 760 + c * 66, top: 360 + r * 80, width: 30, height: 30, borderRadius: 15,
          background: me && one > 0 ? C.green : C.ink, opacity: (me ? 1 : lerp(1, 0.18, one)) * Math.min(1, p * 2), transform: `scale(${Math.min(1.1, p) * s})`}} />;
      })}
      <Caption text="Thirty-three units. One landlady." at={S} dur={LEN.units - 0.1} accent={['One', 'landlady']} />
    </AbsoluteFill>
  );
};

// ---- 3: a spreadsheet, on one USB drive ---------------------------------------------------------
const Before: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.before), U = sec(WORD.usb);
  const shrink = t01(f, U - 10, U + 18, E.inOut);
  const usb = t01(f, U + 10, U + 40, E.out);
  const scroll = (f - S) * 1.4;
  const gx = lerp(70, 640, shrink), gy = lerp(150, 420, shrink), gw = lerp(1460, 300, shrink), gh = lerp(680, 120, shrink);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="03" text="before" at={S} />
      <div style={{position: 'absolute', left: gx, top: gy, width: gw, height: gh, overflow: 'hidden', border: `2px solid ${C.ink}`, opacity: 1 - t01(shrink, 0.85, 1)}}>
        <div style={{position: 'absolute', left: 0, top: -(scroll % 46), width: 1460, transform: `scale(${gw / 1460})`, transformOrigin: '0 0'}}>
          {Array.from({length: 22}, (_, r) => (
            <div key={r} style={{display: 'flex', height: 46, borderBottom: '1px solid rgba(20,20,20,0.18)', fontFamily: FONT.mono, fontSize: 20, color: C.ink, alignItems: 'center'}}>
              {[`${['1', '2', '3'][r % 3]}${'abcdefgh'[r % 8]}`, ['Andrea V.', 'Paolo D.', 'Kristine S.', 'Mark L.', 'Bea M.', 'Joshua R.'][r % 6], `${(4500 + (r % 3) * 300).toLocaleString('en-US')}.00`, `Sep ${3 + r}`, `${5070 + r}`, `${(200 * (1 + (r % 2))).toFixed(2)}`, `${(4700 + (r % 3) * 300).toLocaleString('en-US')}.00`].map((v, i) => (
                <div key={i} style={{width: [110, 300, 220, 200, 160, 200, 270][i], paddingLeft: 14, borderRight: '1px solid rgba(20,20,20,0.12)', height: '100%', display: 'flex', alignItems: 'center'}}>{v}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {usb > 0 ? (
        <svg width={1600} height={1000} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(800 480) scale(${lerp(0.6, 1, usb)}) translate(-800 -480)`} opacity={usb}>
            <rect x={660} y={430} width={260} height={100} rx={22} fill="none" stroke={C.ink} strokeWidth={5} />
            <rect x={920} y={452} width={70} height={56} fill="none" stroke={C.ink} strokeWidth={5} />
            <rect x={940} y={468} width={12} height={10} fill={C.ink} /><rect x={962} y={468} width={12} height={10} fill={C.ink} />
            <circle cx={700} cy={480} r={9} fill={C.green} />
          </g>
        </svg>
      ) : null}
      <div style={{position: 'absolute', left: 660, top: 580, fontFamily: FONT.mono, fontSize: 26, color: C.ink, opacity: t01(f, U + 30, U + 44)}}>workbook.xlsx <span style={{color: C.green, fontWeight: 700}}>· the only copy</span></div>
      <Caption text="Her income and expenses lived in a spreadsheet, on one USB drive." at={S} dur={LEN.before - 0.1} accent={['one', 'USB', 'drive']} />
    </AbsoluteFill>
  );
};

// ---- 4: invoices, repairs, inquiries ------------------------------------------------------------
const Receipt: React.FC<{x: number; y: number; at: number; rot: number}> = ({x, y, at, rot}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = spr(f, at, {damping: 16, stiffness: 200});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 380, height: 240, border: `4px solid ${C.ink}`, borderRadius: 6, background: C.paper, transform: `rotate(${rot}deg) translateY(${(1 - p) * 60}px)`, opacity: Math.min(1, p * 2),
      padding: '22px 28px', boxSizing: 'border-box'}}>
      <div style={{fontFamily: FONT.mono, fontSize: 18, letterSpacing: '0.2em', color: C.inkSoft}}>OFFICIAL RECEIPT</div>
      <div style={{fontFamily: FONT.serif, fontSize: 64, color: C.ink, marginTop: 10}}>No. 1182</div>
      <div style={{height: 2, background: 'rgba(20,20,20,0.2)', marginTop: 14}} /><div style={{height: 2, background: 'rgba(20,20,20,0.2)', marginTop: 22, width: '70%'}} />
    </div>
  );
};
const Pieces: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.pieces), R = sec(WORD.repairs), Q = sec(WORD.inquiries);
  const part = f < R - 6 ? 0 : f < Q - 6 ? 1 : 2;
  const chat = ['Good evening po!', 'Is the room still available?', 'Ok po, thank you', 'Can I pay on Monday?', 'Who has the key?', 'Noted po'];
  const pushed = Math.max(0, (f - R - 10) / 7);
  const dust = t01(f, Q + 50, Q + 90, E.in);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="04" text={['invoices', 'repairs', 'inquiries'][part]} at={S} />
      {part === 0 ? (
        <>
          <Receipt x={380} y={300} at={S + 4} rot={-4} />
          <Receipt x={840} y={330} at={S + 34} rot={3} />
          <Draw d={ellipse(560, 420, 175, 60, 'r1')} at={S + 52} dur={0.35} color={C.green} width={6} />
          <Draw d={ellipse(1020, 450, 175, 60, 'r2')} at={S + 64} dur={0.35} color={C.green} width={6} />
          <div style={{position: 'absolute', left: 640, top: 640, fontFamily: FONT.mono, fontSize: 30, color: C.ink, opacity: t01(f, S + 70, S + 80)}}>same number, <span style={{color: C.green, fontWeight: 700}}>twice</span></div>
        </>
      ) : null}
      {part === 1 ? (
        <div style={{position: 'absolute', left: 520, top: 0, width: 560, height: 820, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%)', maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%)'}}>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', flexDirection: 'column', gap: 18, transform: `translateY(${0}px)`}}>
            <div style={{alignSelf: 'flex-start', padding: '20px 26px', border: `4px solid ${C.green}`, borderRadius: '26px 26px 26px 6px', fontFamily: FONT.mono, fontSize: 26, color: C.ink}}>Ma'am, the faucet in 2C is leaking.</div>
            {chat.map((c, i) => f >= R + 10 + i * 7 ? (
              <div key={c} style={{alignSelf: i % 2 ? 'flex-end' : 'flex-start', padding: '18px 24px', border: `3px solid ${C.ink}`, borderRadius: i % 2 ? '24px 24px 6px 24px' : '24px 24px 24px 6px', fontFamily: FONT.mono, fontSize: 24, color: C.ink,
                opacity: Math.min(1, (f - R - 10 - i * 7) / 5)}}>{c}</div>
            ) : null)}
          </div>
          <div style={{display: 'none'}}>{pushed}</div>
        </div>
      ) : null}
      {part === 2 ? (
        <>
          {[{t: 'Facebook: still available?', y: 280}, {t: 'Text: how much po?', y: 430}, {t: 'Walk-in: any vacant room?', y: 580}].map((m, i) => {
            const d = clamp01(dust * 1.4 - i * 0.2);
            return (
              <div key={m.t} style={{position: 'absolute', left: 520, top: m.y}}>
                <div style={{padding: '18px 26px', border: `3px solid ${C.ink}`, borderRadius: '24px 24px 24px 6px', fontFamily: FONT.mono, fontSize: 26, color: C.ink, whiteSpace: 'nowrap',
                  opacity: (1 - d) * Math.min(1, (f - Q - i * 6) / 8), filter: d > 0 ? `blur(${d * 6}px)` : undefined}}>{m.t}</div>
                {d > 0 ? Array.from({length: 26}, (_, k) => (
                  <div key={k} style={{position: 'absolute', left: 20 + random(`dx${i}${k}`) * 480, top: 10 + random(`dy${i}${k}`) * 60, width: 7, height: 7, borderRadius: 4, background: C.ink,
                    transform: `translate(${(random(`vx${i}${k}`) * 1.2 + 0.2) * 300 * d}px, ${(random(`vy${i}${k}`) - 0.6) * 160 * d}px)`, opacity: (1 - d) * 0.9}} />
                )) : null}
              </div>
            );
          })}
        </>
      ) : null}
      <Caption text="Invoices, in a paper book. Repairs, lost in a chat. Inquiries, with no record at all." at={S} dur={LEN.pieces - 0.1} accent={['paper', 'chat.', 'record']} width={1400} />
    </AbsoluteFill>
  );
};

// ---- 5: nothing connected -----------------------------------------------------------------------
const Nothing: React.FC = () => {
  const S = sec(AT.nothing);
  return (
    <AbsoluteFill style={{background: C.charDeep, alignItems: 'center', justifyContent: 'center'}}>
      <Serif text="Nothing connected." at={S + 4} size={180} />
      <Caption text="Nothing connected." at={S} dur={LEN.nothing} dark />
    </AbsoluteFill>
  );
};

// ---- 6: so we built Hivelet (a green dot, and the green floods the room) --------------------------
const Built: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.built), HV = sec(WORD.hivelet);
  const dot = t01(f, S + 6, S + 22, E.out);
  const flood = t01(f, HV - 4, HV + 14, E.inOut);
  const mark = t01(f, HV + 6, HV + 40, E.inOut);
  return (
    <AbsoluteFill style={{background: C.charDeep}}>
      <div style={{position: 'absolute', left: 800 - 1100 * flood - 14 * dot, top: 500 - 1100 * flood - 14 * dot, width: 28 * dot + 2200 * flood, height: 28 * dot + 2200 * flood, borderRadius: '50%', background: C.green}} />
      {flood > 0.6 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 44}}>
          <Mark size={240} draw={mark} fill={0} hex={C.green} />
          <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 210, letterSpacing: '-0.06em', color: C.white, opacity: t01(f, HV + 24, HV + 40), transform: `translateX(${(1 - t01(f, HV + 24, HV + 46, E.out)) * -40}px)`}}>Hivelet</div>
        </AbsoluteFill>
      ) : null}
      <Caption text="So we built Hivelet." at={S} dur={LEN.built} dark accent={[]} />
    </AbsoluteFill>
  );
};

// ---- 7: her ledger ----------------------------------------------------------------------------------
const ROWS: LedgerRowData[] = [
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
  {unit: '2c', paid: 'Sep 18, 2026', period: 'Sep 20 – Oct 19', who: 'Trisha Delos Santos', or: '5077', rent: 4500, water: 400, heads: 2},
];
const Ledger: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.ledger), A = sec(WORD.addsUp);
  const scroll = t01(f, S, S + sec(2.6), E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="05" text="ledger" at={S} />
      <div style={{position: 'absolute', left: 200, top: 130, width: 1200, height: 720, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(20,20,20,0.15)', background: '#edf1ee'}}>
        <div style={{transform: `translateY(${-scroll * 60}px) scale(0.92)`, transformOrigin: '0 0', padding: 24}}>
          <div style={{display: 'flex', gap: 16}}><ReceivedTile f={999} at={0} w={360} h={300} /><SplitTile f={999} at={0} w={860} h={300} /></div>
          <div style={{width: 1236, marginTop: 16, borderRadius: 24, background: '#fff', border: '1px solid #e2e8e3', overflow: 'hidden'}}>
            <LedgerCardHead f={999} at={0} />
            <div style={{margin: '0 20px 20px', border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}><LedgerHead />{ROWS.map((r) => <LedgerRow key={r.or} r={r} />)}</div>
          </div>
        </div>
      </div>
      <Draw d={ellipse(400, 230, 185, 72, 'lg')} at={A} dur={0.4} color={C.green} width={7} />
      <Caption text="Her ledger, in her own layout, adding itself up." at={S} dur={LEN.ledger - 0.1} accent={['own', 'layout']} />
    </AbsoluteFill>
  );
};

// ---- 8: the tenant's phone, and GCash --------------------------------------------------------------
const PhoneScene: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.phone), G = sec(WORD.gcash);
  const toast = spr(f, G + 30, {damping: 16, stiffness: 160});
  return (
    <AbsoluteFill style={{background: C.char}}>
      <Label n="06" text="tenants" dark at={S} />
      <div style={{position: 'absolute', left: 430, top: 40, transform: 'scale(0.98)', transformOrigin: '0 0', opacity: t01(f, S - 2, S + 10)}}>
        <Phone><TenantHome amount="₱4,700.00" unread={2} press={t01(f, G + 10, G + 16) * (1 - t01(f, G + 16, G + 24))} /></Phone>
      </div>
      <Draw d={ellipse(570, 520, 150, 52, 'gc')} at={G} dur={0.35} color={C.green} width={7} />
      {f >= G + 30 ? <div style={{position: 'absolute', left: 900, top: 420, transform: `translateX(${(1 - toast) * 80}px) scale(1.3)`, transformOrigin: '0 0', opacity: Math.min(1, toast * 2)}}><PaymentReceived check={t01(f, G + 36, G + 70)} /></div> : null}
      <Caption text="Tenants see their rent, and pay with GCash." at={S} dur={LEN.phone - 0.1} dark accent={['GCash']} />
    </AbsoluteFill>
  );
};

// ---- 9: repairs, request to done --------------------------------------------------------------------
const Repairs: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.repairs);
  const stops = [300, 800, 1300];
  const a = t01(f, S + sec(0.7), S + sec(1.05), E.inOut), b = t01(f, S + sec(1.35), S + sec(1.7), E.inOut);
  const x = lerp(lerp(stops[0], stops[1], a), stops[2], b);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="07" text="repairs" at={S} />
      <div style={{position: 'absolute', left: 150, right: 150, top: 700, height: 3, background: 'rgba(20,20,20,0.15)'}} />
      <div style={{position: 'absolute', left: 150, top: 700, width: x - 150, height: 3, background: C.green}} />
      {['to dispatch', 'in progress', 'done'].map((t, i) => {
        const reached = [true, a > 0.98, b > 0.98][i];
        return (
          <div key={t} style={{position: 'absolute', left: stops[i] - 120, top: 680, width: 240, textAlign: 'center'}}>
            <div style={{width: 40, height: 40, borderRadius: 20, margin: '0 auto', background: reached ? C.green : C.paper, border: `3px solid ${reached ? C.green : 'rgba(20,20,20,0.3)'}`}} />
            <div style={{fontFamily: FONT.mono, fontSize: 24, color: reached ? C.ink : C.inkSoft, marginTop: 16}}>{t}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: x - 205, top: 230, transform: `scale(1.4) rotate(${(a > 0 && a < 1 ? Math.sin(a * Math.PI) : 0) * 4 - (b > 0 && b < 1 ? Math.sin(b * Math.PI) : 0) * 4}deg)`, transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.12))'}}>
        <RepairCard title="Kitchen faucet keeps dripping" unit="1A" category="Plumbing" reported="Sep 29, 2026" tech={a > 0.5 ? 'Plumber' : 'Unassigned'} prio="Medium" />
      </div>
      <Caption text="Repairs are tracked, from request to done." at={S} dur={LEN.repairs - 0.1} accent={['done']} />
    </AbsoluteFill>
  );
};

// ---- 10: a visitor asks; no account ------------------------------------------------------------------
const Visitors: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.visitors), NA = sec(WORD.noAccount);
  const strike = t01(f, NA + 6, NA + 22, E.inOut);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="08" text="visitors" at={S} />
      <div style={{position: 'absolute', left: 110, top: 150, transform: 'scale(0.92)', transformOrigin: '0 0', borderRadius: 24, overflow: 'hidden', boxShadow: '0 0 0 2px rgba(20,20,20,0.12)', opacity: t01(f, S - 2, S + 10)}}>
        <UnitShowcase plan={1} chip={1} ring={1} />
      </div>
      {/* the account a visitor does not need: a sign-in form, struck through */}
      <div style={{position: 'absolute', left: 1040, top: 260, width: 440, opacity: t01(f, NA - 8, NA + 4)}}>
        <div style={{fontFamily: FONT.mono, fontSize: 22, color: C.inkSoft, marginBottom: 14}}>sign in</div>
        {['email', 'password'].map((p) => <div key={p} style={{height: 64, border: '3px solid rgba(20,20,20,0.35)', borderRadius: 12, marginBottom: 16, fontFamily: FONT.mono, fontSize: 22, color: C.faint, display: 'flex', alignItems: 'center', paddingLeft: 20}}>{p}</div>)}
        <div style={{height: 64, borderRadius: 12, background: 'rgba(20,20,20,0.25)'}} />
        <svg width={520} height={340} style={{position: 'absolute', left: -40, top: -10, overflow: 'visible'}}><path d="M 0 320 L 520 20" stroke={C.green} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - strike} /></svg>
      </div>
      <div style={{position: 'absolute', left: 1040, top: 640, fontFamily: FONT.grot, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: C.green, opacity: t01(f, NA + 18, NA + 30)}}>not needed.</div>
      <Caption text="Visitors ask about a vacant room. No account needed." at={S} dur={LEN.visitors - 0.1} accent={['No', 'account']} />
    </AbsoluteFill>
  );
};

// ---- 11: installs like an app (a dot grid of icons; one becomes Hivelet) ---------------------------------
const Install: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.install);
  const pop = spr(f, S + 30, {damping: 11, stiffness: 220});
  return (
    <AbsoluteFill style={{background: C.char}}>
      <Label n="09" text="add to home screen" dark at={S} />
      {Array.from({length: 6 * 4}, (_, i) => {
        const c = i % 6, r = Math.floor(i / 6), me = i === 14;
        return me ? (
          <div key={i} style={{position: 'absolute', left: 470 + c * 120 - 20, top: 270 + r * 120 - 20, width: 120, height: 120, transform: `scale(${f < S + 30 ? 0.35 : lerp(0.35, 1, Math.min(1.1, pop))})`}}>
            <div style={{width: 120, height: 120, borderRadius: 28, background: '#0f1b15', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px rgba(31,154,98,${0.5 * Math.min(1, pop)})`}}><Mark size={96} /></div>
          </div>
        ) : <div key={i} style={{position: 'absolute', left: 470 + c * 120, top: 270 + r * 120, width: 80, height: 80, borderRadius: 22, background: 'rgba(233,232,227,0.14)', opacity: Math.min(1, (f - S + 4 - i) / 6)}} />;
      })}
      <Caption text="And it installs like an app." at={S} dur={LEN.install - 0.1} dark accent={['app']} />
    </AbsoluteFill>
  );
};

// ---- 12: 937 records (her building's blue) -----------------------------------------------------------------
const Records: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.records), T = sec(WORD.thirtySeven);
  const n = Math.round(937 * t01(f, S + 4, T + 36, E.out));
  return (
    <AbsoluteFill style={{background: C.blue}}>
      <Label n="10" text="her records" dark at={S} />
      <svg width={1600} height={1000} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: n}, (_, i) => <circle key={i} cx={110 + (i % 47) * 19} cy={180 + Math.floor(i / 47) * 30} r={5.5} fill="rgba(255,255,255,0.85)" />)}
      </svg>
      <div style={{position: 'absolute', right: 110, top: 300, textAlign: 'right'}}>
        <div style={{fontFamily: FONT.grot, fontWeight: 800, fontSize: 300, letterSpacing: '-0.06em', color: C.white, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums'}}>{n}</div>
        <div style={{fontFamily: FONT.mono, fontSize: 28, color: 'rgba(255,255,255,0.8)', marginTop: 18, opacity: t01(f, sec(WORD.carried), sec(WORD.carried) + 12)}}>carried over from her workbook</div>
      </div>
      <Caption text="Nine hundred thirty-seven of her real records, carried over." at={S} dur={LEN.records - 0.1} dark />
    </AbsoluteFill>
  );
};

// ---- 13: A+ (a target, hit dead centre) ------------------------------------------------------------------------
const Secure: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.secure), A = sec(WORD.aPlus);
  const fly = t01(f, A - 14, A, E.in);
  const hit = f >= A ? spr(f, A, {damping: 8, stiffness: 300}) : 0;
  const shake = f >= A && f < A + 14 ? Math.sin((f - A) * 2.2) * (1 - (f - A) / 14) * 6 : 0;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="11" text="security" at={S} />
      <svg width={1600} height={1000} style={{position: 'absolute', inset: 0, transform: `translateX(${shake}px)`}}>
        {[300, 230, 160, 90].map((r, i) => <circle key={r} cx={800} cy={470} r={r} fill="none" stroke={i % 2 ? C.green : C.ink} strokeWidth={i === 3 ? 6 : 3} opacity={t01(f, S + i * 4, S + i * 4 + 10)} />)}
        <line x1={420} y1={470} x2={1180} y2={470} stroke="rgba(20,20,20,0.15)" strokeWidth={2} /><line x1={800} y1={90} x2={800} y2={850} stroke="rgba(20,20,20,0.15)" strokeWidth={2} />
        {/* the dart: tip at the point of impact, shaft trailing back the way it came */}
        {f >= A - 14 ? (
          <g transform={`translate(${lerp(1500, 800, fly)} ${lerp(80, 470, fly)}) rotate(${-29 + (f >= A ? Math.sin((f - A) * 1.6) * 5 * Math.exp(-(f - A) / 10) : 0)})`}>
            <line x1={34} y1={0} x2={250} y2={0} stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
            <path d="M 0 0 L 44 -15 L 44 15 Z" fill={C.ink} />
            <path d="M 225 0 L 262 -26 L 250 0 L 262 26 Z" fill={C.green} />
          </g>
        ) : null}
      </svg>
      {hit > 0 ? <div style={{position: 'absolute', left: 800 - 120, top: 470 - 120, width: 240, height: 240, borderRadius: 120, background: C.paper, transform: `scale(${Math.min(1, hit)})`, boxShadow: `0 0 0 6px ${C.green}`}} /> : null}
      {hit > 0 ? <div style={{position: 'absolute', left: 0, right: 0, top: 390, textAlign: 'center', fontFamily: FONT.grot, fontWeight: 800, fontSize: 150, letterSpacing: '-0.05em', color: C.green, transform: `scale(${lerp(1.4, 1, Math.min(1, hit))})`, opacity: Math.min(1, hit * 2)}}>A+</div> : null}
      <div style={{position: 'absolute', left: 1180, top: 260, fontFamily: FONT.mono, fontSize: 22, lineHeight: 2, color: C.inkSoft, opacity: t01(f, A + 10, A + 24)}}>Qualys SSL Labs  A+<br />Mozilla Observatory  A+<br />securityheaders.com  A+</div>
      <Caption text="Security, graded A-plus." at={S} dur={LEN.secure - 0.1} accent={['A-plus']} />
    </AbsoluteFill>
  );
};

// ---- 14: 4.53 out of 5 (a curve that climbs) ---------------------------------------------------------------------
const Quality: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.quality), R = sec(WORD.rated);
  const p = t01(f, R, R + sec(1.3), E.out);
  const X0 = 180, X1 = 1000, Y0 = 760, Y1 = 180;
  const yOf = (v: number) => lerp(Y0, Y1, (v - 1) / 4);
  const pts = Array.from({length: 61}, (_, i) => { const t = i / 60; const e = 1 - Math.pow(1 - t, 3); return [lerp(X0, X1, t), yOf(1 + 3.53 * e)]; });
  const shown = pts.slice(0, Math.max(2, Math.round(p * 60) + 1));
  const v = 1 + 3.53 * (1 - Math.pow(1 - p, 3));
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="12" text="quality · ISO/IEC 25010" at={S} />
      <svg width={1600} height={1000} style={{position: 'absolute', inset: 0}}>
        {[1, 2, 3, 4, 5].map((k) => <g key={k}><line x1={X0} y1={yOf(k)} x2={X1} y2={yOf(k)} stroke="rgba(20,20,20,0.1)" strokeWidth={2} /><text x={X0 - 40} y={yOf(k) + 8} fontFamily={FONT.mono} fontSize={22} fill={C.inkSoft}>{k}</text></g>)}
        <polyline points={shown.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={C.green} strokeWidth={6} strokeLinecap="round" />
        <circle cx={shown[shown.length - 1][0]} cy={shown[shown.length - 1][1]} r={12} fill={C.green} />
      </svg>
      <div style={{position: 'absolute', left: 1080, top: 230}}>
        <div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 250, lineHeight: 0.9, color: C.ink, fontVariantNumeric: 'tabular-nums'}}>{v.toFixed(2)}</div>
        <div style={{fontFamily: FONT.mono, fontSize: 28, color: C.inkSoft, marginTop: 20}}>out of 5</div>
        <div style={{fontFamily: FONT.grot, fontWeight: 800, fontSize: 52, letterSpacing: '-0.03em', color: C.green, marginTop: 22, opacity: t01(f, R + sec(1.3), R + sec(1.5))}}>Very High Quality</div>
      </div>
      <Caption text="Quality, rated four point five three, out of five." at={S} dur={LEN.quality - 0.1} accent={['five']} />
    </AbsoluteFill>
  );
};

// ---- 15: the name, on one screen ---------------------------------------------------------------------------------
const Close: React.FC = () => {
  const f = useCurrentFrame();
  const S = sec(AT.close), O = sec(WORD.oneScreen);
  const url = 'hivelet.vercel.app';
  const typed = Math.round(clamp01((f - (O + 60)) / 50) * url.length);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34, opacity: t01(f, S, S + 14)}}>
        <Mark size={170} draw={t01(f, S, S + 40, E.inOut)} fill={t01(f, S + 20, S + 34)} hex={C.green} />
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 170, letterSpacing: '-0.06em', color: C.ink}}>Hivelet</div>
      </div>
      {/* the pill, after the reference's own end card: the address typed into it */}
      <div style={{position: 'absolute', left: 500, top: 540, width: 600, height: 92, borderRadius: 46, background: C.white, boxShadow: '0 0 0 2px rgba(20,20,20,0.1), 0 10px 30px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', boxSizing: 'border-box',
        opacity: t01(f, O + 40, O + 54), transform: `translateY(${(1 - t01(f, O + 40, O + 60, E.out)) * 20}px)`}}>
        <div style={{width: 48, height: 48, borderRadius: 24, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Mark size={34} hex={C.ink} /></div>
        <div style={{flex: 1, fontFamily: FONT.mono, fontWeight: 600, fontSize: 32, color: C.ink}}>{url.slice(0, typed)}<span style={{display: 'inline-block', width: 16, height: 34, background: C.green, marginLeft: 2, verticalAlign: '-0.18em', opacity: typed < url.length || Math.floor(f / 24) % 2 ? 1 : 0}} /></div>
        <div style={{width: 48, height: 48, borderRadius: 24, border: `3px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontFamily: FONT.grot, fontWeight: 800, fontSize: 28}}>↑</div>
      </div>
      <Draw d={ellipse(800, 586, 360, 82, 'pill')} at={O + 120} dur={0.55} color={C.green} width={5} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: C.inkSoft, opacity: t01(f, sec(55.0), sec(55.4))}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 806, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 600, fontSize: 28, color: C.ink, opacity: t01(f, sec(55.8), sec(56.2))}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
      <Caption text="Hivelet. Her whole boarding house, on one screen." at={S} dur={LEN.close - 0.1} accent={['one', 'screen.']} out={sec(54.6)} />
    </AbsoluteFill>
  );
};

export const SCENES: Scene[] = [
  {from: 0, to: AT.meet - 0.05, bg: C.paper, el: Hook},
  {from: AT.meet - 0.05, to: AT.units - 0.15, bg: C.char, dark: true, el: Meet},
  {from: AT.units - 0.15, to: AT.before - 0.15, bg: C.paper, el: Units},
  {from: AT.before - 0.15, to: AT.pieces - 0.15, bg: C.paper, el: Before},
  {from: AT.pieces - 0.15, to: AT.nothing - 0.2, bg: C.paper, el: Pieces},
  {from: AT.nothing - 0.2, to: AT.built - 0.1, bg: C.charDeep, dark: true, el: Nothing},
  {from: AT.built - 0.1, to: AT.ledger - 0.15, bg: C.green, dark: true, el: Built},
  {from: AT.ledger - 0.15, to: AT.phone - 0.15, bg: C.paper, el: Ledger},
  {from: AT.phone - 0.15, to: AT.repairs - 0.15, bg: C.char, dark: true, el: PhoneScene},
  {from: AT.repairs - 0.15, to: AT.visitors - 0.15, bg: C.paper, el: Repairs},
  {from: AT.visitors - 0.15, to: AT.install - 0.15, bg: C.paper, el: Visitors},
  {from: AT.install - 0.15, to: AT.records - 0.15, bg: C.char, dark: true, el: Install},
  {from: AT.records - 0.15, to: AT.secure - 0.15, bg: C.blue, dark: true, el: Records},
  {from: AT.secure - 0.15, to: AT.quality - 0.15, bg: C.paper, el: Secure},
  {from: AT.quality - 0.15, to: AT.close - 0.25, bg: C.paper, el: Quality},
  {from: AT.close - 0.25, to: 60, bg: C.paper, el: Close},
];

// The screen at time s: the scene showing, and how bright and what colour its light is.
export const sceneAt = (s: number) => SCENES.find((x) => s >= x.from && s < x.to) ?? SCENES[SCENES.length - 1];
export const Screen: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const sc = sceneAt(s);
  const El = sc.el;
  // The screen wakes at the start and goes dark at the end.
  const on = t01(f, sec(0.25), sec(0.6), E.out) * (1 - t01(f, sec(OFF), sec(OFF + 0.5), E.in));
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: on}}><El /></AbsoluteFill>
    </AbsoluteFill>
  );
};
