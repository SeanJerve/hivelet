// Version C: two screens in the dark. The laptop is hers; a phone on a stand beside it is
// her tenants'. It opens with the lid lifting and the light flooding the desk, and ends with
// it closing. The story moves between the two: the payment made on the phone lands in her
// ledger; the repair she moves to Done shows up on the tenant's phone; a visitor asks on the
// phone and she answers on the laptop; for the proof both screens turn the same colour.
// A male voice (am_michael), telling it as a story.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame, random} from 'remotion';
import {Mark} from '../ui/Kit';
import {BoardColumn, InquiryInbox, LedgerCardHead, LedgerHead, LedgerRow, LedgerRowData, ReceivedTile, RepairCard, SplitTile} from '../ui/Admin';
import {DoneNote, PaymentReceived, PayOpening, TenantHome} from '../ui/Tenant';
import {AskDialog, REF_CODE} from '../ui/Public';
import {Room, Camera, Glow, TILT} from '../screen/Room';
import {Big, C, Caption, clamp01, Draw, E, FONT, Label, lerp, sec, Serif, spr, t01} from '../screen/kit';
import vo from './vo.json';
import voAt from './vo-at.json';

export const DUO_TOTAL = 60 * 60;
type Line = keyof typeof vo;
const AT = voAt as Record<Line, number>, LEN = vo as Record<Line, number>;
const WORD = {units: AT.peso + 0.07, peso: AT.peso + 1.49, repairs: AT.book + 2.27, gone: AT.asking + 2.22, hivelet: AT.name + 0.08, rent: AT.phones + 1.19, gcash: AT.phones + 3.05,
  watches: AT.repair + 2.25, done: AT.repair + 3.75, noAccount: AT.visitor + 2.47, answers: AT.visitor + 3.84, aPlus: AT.proof + 4.35, rated: AT.proof + 6.21, connected: AT.close + 0.84};
const OPEN = [0.35, 1.6], SHUT = [58.0, 59.3];
const CORAL = '#e5674f';
const S = (t: number) => sec(t);

// ================= her laptop ====================================================================
const Sheet: React.FC = () => {
  const f = useCurrentFrame();
  const typed = '4,500.00'.slice(0, Math.max(0, Math.min(8, Math.floor((f - S(WORD.peso)) / 7))));
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return (
    <AbsoluteFill style={{background: '#fbfbf9', fontFamily: FONT.mono}}>
      <div style={{height: 64, background: '#1f7a4d', color: '#fff', display: 'flex', alignItems: 'center', paddingLeft: 30, fontSize: 24, fontWeight: 600}}>Monthly Income Report.xlsx</div>
      <div style={{display: 'flex', height: 40, background: '#eeeeea', borderBottom: '1px solid #ccc'}}>
        <div style={{width: 60}} />{cols.map((c) => <div key={c} style={{width: 186, textAlign: 'center', fontSize: 18, color: '#777', lineHeight: '40px', borderLeft: '1px solid #ddd'}}>{c}</div>)}
      </div>
      {Array.from({length: 17}, (_, r) => (
        <div key={r} style={{display: 'flex', height: 44, borderBottom: '1px solid #e2e2de', fontSize: 20, color: '#2a2a2a'}}>
          <div style={{width: 60, textAlign: 'center', lineHeight: '44px', color: '#888', background: '#eeeeea'}}>{r + 1}</div>
          {(r === 0 ? ['Unit', 'Name', 'Rent for', 'Paid', 'Inv.', 'Rent', 'Water', 'Total'] : [`${'123'[r % 3]}${'abcdefgh'[r % 8]}`, ['Andrea V.', 'Paolo D.', 'Kristine S.', 'Mark L.', 'Bea M.'][r % 5], `Sep ${r + 2}`, `Sep ${r + 1}`, `${5068 + r}`,
            r === 9 ? typed : `${(4500 + (r % 3) * 300).toLocaleString('en-US')}.00`, '200.00', `${(4700 + (r % 3) * 300).toLocaleString('en-US')}.00`]).map((v, i) => (
            <div key={i} style={{width: 186, paddingLeft: 12, lineHeight: '44px', borderLeft: '1px solid #e2e2de', fontWeight: r === 0 ? 700 : 400, overflow: 'hidden', whiteSpace: 'nowrap',
              outline: r === 9 && i === 5 && f >= S(WORD.peso) ? '3px solid #1f7a4d' : undefined, outlineOffset: -3}}>{v}{r === 9 && i === 5 && f >= S(WORD.peso) && typed.length < 8 ? '|' : ''}</div>
          ))}
        </div>
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, background: '#eeeeea', borderTop: '1px solid #ccc', fontSize: 18, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 30, opacity: t01(f, S(WORD.units), S(WORD.units) + 10)}}>Count: 33</div>
      <Caption text="Every month, she opened the same spreadsheet." at={S(AT.month)} dur={LEN.month - 0.1} out={S(AT.peso)} y={860} />
      <Caption text="Thirty-three units. Every peso, typed by hand." at={S(AT.peso)} dur={LEN.peso - 0.1} accent={['hand']} y={860} />
    </AbsoluteFill>
  );
};
const Pieces: React.FC = () => {
  const f = useCurrentFrame();
  const R = S(WORD.repairs);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="01" text={f < R ? 'invoices' : 'repairs'} />
      {f < R ? (
        <Draw d="M 560 250 L 1040 250 L 1040 620 L 560 620 Z M 620 330 L 980 330 M 620 400 L 980 400 M 620 470 L 860 470 M 620 540 L 760 540" at={S(AT.book)} dur={0.7} width={6} />
      ) : (
        ['Good evening po!', 'Is the room still available?', "Ma'am, the faucet in 2C is leaking.", 'Ok po', 'Can I pay on Monday?'].map((t, i) => {
          const at = R + i * 8;
          if (f < at) return null;
          const lost = i === 2 ? t01(f, R + 40, R + 60) : 0;
          return <div key={t} style={{position: 'absolute', left: i % 2 ? 820 : 420, top: 200 + i * 105 - (f - R) * 1.2, padding: '18px 26px', border: `3px solid ${i === 2 ? CORAL : C.ink}`, borderRadius: 24,
            fontFamily: FONT.mono, fontSize: 26, color: C.ink, opacity: Math.min(1, (f - at) / 6) * (1 - lost * 0.75)}}>{t}</div>;
        })
      )}
      <Caption text="Invoices lived in a paper book. Repairs, somewhere in a chat." at={S(AT.book)} dur={LEN.book - 0.1} accent={['paper', 'chat.']} width={1450} />
    </AbsoluteFill>
  );
};
const Asking: React.FC = () => {
  const f = useCurrentFrame();
  const G = S(WORD.gone);
  const dust = t01(f, G - 6, G + 40, E.in);
  return (
    <AbsoluteFill style={{background: C.charDeep}}>
      {['Facebook: still available?', 'Text: how much po?', 'Walk-in: any vacant room?'].map((t, i) => {
        const d = clamp01(dust * 1.4 - i * 0.2);
        return (
          <div key={t} style={{position: 'absolute', left: 500, top: 260 + i * 150}}>
            <div style={{padding: '18px 26px', border: '3px solid #e9e8e3', borderRadius: 24, fontFamily: FONT.mono, fontSize: 26, color: '#e9e8e3', whiteSpace: 'nowrap', opacity: (1 - d) * Math.min(1, (f - S(AT.asking) - i * 8) / 8), filter: d > 0 ? `blur(${d * 6}px)` : undefined}}>{t}</div>
            {d > 0 ? Array.from({length: 24}, (_, k) => <div key={k} style={{position: 'absolute', left: 20 + random(`ax${i}${k}`) * 460, top: 10 + random(`ay${i}${k}`) * 60, width: 7, height: 7, borderRadius: 4, background: '#e9e8e3',
              transform: `translate(${(random(`bx${i}${k}`) + 0.2) * 300 * d}px, ${(random(`by${i}${k}`) - 0.6) * 160 * d}px)`, opacity: (1 - d) * 0.9}} />) : null}
          </div>
        );
      })}
      {f >= G ? <div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center'}}><Serif text="Gone." at={G + 10} size={240} /></div> : null}
      <Caption text="And the people asking about a room? Gone, without a record." at={S(AT.asking)} dur={LEN.asking - 0.1} dark accent={['record.']} width={1450} color={CORAL} />
    </AbsoluteFill>
  );
};
const Gave: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.gave), HV = S(WORD.hivelet);
  const meet = t01(f, a + 10, a + 70, E.inOut);
  const flood = t01(f, HV - 4, HV + 14, E.inOut);
  return (
    <AbsoluteFill style={{background: C.charDeep}}>
      {[[-1, 0], [1, -0.6], [0.6, 1]].map(([dx, dy], i) => <div key={i} style={{position: 'absolute', left: 800 - 14 + dx * 380 * (1 - meet), top: 500 - 14 + dy * 260 * (1 - meet), width: 28, height: 28, borderRadius: 14, background: meet > 0.95 ? C.green : '#e9e8e3', opacity: flood > 0 ? 0 : 1}} />)}
      <div style={{position: 'absolute', left: 800 - 1100 * flood, top: 500 - 1100 * flood, width: 2200 * flood, height: 2200 * flood, borderRadius: '50%', background: C.green}} />
      {flood > 0.6 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 44}}>
          <Mark size={240} draw={t01(f, HV + 6, HV + 40, E.inOut)} fill={0} hex={C.green} />
          <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 210, letterSpacing: '-0.06em', color: C.white, opacity: t01(f, HV + 22, HV + 38)}}>Hivelet</div>
        </AbsoluteFill>
      ) : null}
      <Caption text="So we gave her one system." at={a} dur={LEN.gave - 0.1} dark accent={['one']} out={HV - 4} />
    </AbsoluteFill>
  );
};
const ROWS: LedgerRowData[] = [
  {unit: '3d', paid: 'Sep 27, 2026', period: 'Sep 27 – Oct 26', who: 'Faith Nuñez', or: '5083', rent: 4800, water: 200, heads: 1},
  {unit: '1f', paid: 'Sep 21, 2026', period: 'Sep 22 – Oct 21', who: 'Joshua Ramirez', or: '5072', rent: 4500, water: 200, heads: 1},
  {unit: '2c', paid: 'Sep 18, 2026', period: 'Sep 20 – Oct 19', who: 'Trisha Delos Santos', or: '5077', rent: 4500, water: 400, heads: 2},
];
const NEW: LedgerRowData = {unit: '1a', paid: 'Sep 29, 2026', period: 'Oct 5 – Nov 4', who: 'Andrea Villanueva', or: 'GCash', rent: 4500, water: 200, heads: 1};
const Ledger: React.FC = () => {
  const f = useCurrentFrame();
  const G = S(WORD.gcash) + 40;
  const show = f >= G;
  const p = show ? spr(f, G, {damping: 18, stiffness: 160}) : 0;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Label n="02" text="her laptop · ledger" at={S(AT.ledger)} />
      <div style={{position: 'absolute', left: 200, top: 120, width: 1200, height: 720, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(20,20,20,0.15)', background: '#edf1ee'}}>
        <div style={{transform: 'scale(0.92)', transformOrigin: '0 0', padding: 24}}>
          <div style={{display: 'flex', gap: 16}}><ReceivedTile f={999} at={0} w={360} h={300} /><SplitTile f={999} at={0} w={860} h={300} /></div>
          <div style={{width: 1236, marginTop: 16, borderRadius: 24, background: '#fff', border: '1px solid #e2e8e3', overflow: 'hidden'}}>
            <LedgerCardHead f={999} at={0} />
            <div style={{margin: '0 20px 20px', border: '1px solid #e2e8e3', borderRadius: 20, overflow: 'hidden'}}>
              <LedgerHead />
              {show ? <LedgerRow r={NEW} flash={1 - t01(f, G + 20, G + 90)} style={{opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * -20}px)`}} /> : null}
              {ROWS.map((r) => <LedgerRow key={r.or} r={r} />)}
            </div>
          </div>
        </div>
      </div>
      {show ? <div style={{position: 'absolute', left: 1160, top: 860, fontFamily: FONT.mono, fontSize: 24, color: C.green, fontWeight: 700, opacity: t01(f, G + 10, G + 24)}}>← from her tenant's phone</div> : null}
      <Caption text="On her laptop, her ledger, in her own layout." at={S(AT.ledger)} dur={LEN.ledger - 0.1} accent={['own', 'layout.']} out={S(AT.phones)} />
    </AbsoluteFill>
  );
};
const Board: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.repair);
  const m1 = t01(f, a + sec(1.0), a + sec(1.5), E.inOut), m2 = t01(f, S(WORD.done) - 30, S(WORD.done), E.inOut);
  const x = lerp(lerp(0, 1, m1), 2, m2);
  return (
    <AbsoluteFill style={{background: '#edf1ee'}}>
      <Label n="03" text="her laptop · repairs" at={a} />
      <div style={{position: 'absolute', left: 230, top: 150, display: 'flex', gap: 30, transform: 'scale(1.05)', transformOrigin: '0 0'}}>
        <BoardColumn title="To dispatch" sub="Waiting for a technician" n={x < 0.5 ? 1 : 0} h={560} />
        <BoardColumn title="In progress" sub="Being worked on" n={x >= 0.5 && x < 1.5 ? 1 : 0} h={560} />
        <BoardColumn title="Done" sub="Resolved" n={x >= 1.5 ? 1 : 0} h={560} />
      </div>
      <div style={{position: 'absolute', left: 254 + x * 389, top: 245, transform: `rotate(${(m1 > 0 && m1 < 1 ? Math.sin(m1 * Math.PI) : 0) * 3 + (m2 > 0 && m2 < 1 ? Math.sin(m2 * Math.PI) : 0) * 3}deg)`, filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.12))'}}>
        <RepairCard title="Kitchen faucet keeps dripping" unit="1A" category="Plumbing" reported="Sep 29, 2026" tech={x > 0.5 ? 'Plumber' : 'Unassigned'} prio="Medium" />
      </div>
      <Caption text="A repair lands on her board, and the tenant watches it move to done." at={a} dur={LEN.repair - 0.1} accent={['done.']} width={1450} />
    </AbsoluteFill>
  );
};
const Inbox: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.visitor), sent = S(WORD.noAccount) + 20, A = S(WORD.answers);
  const reply = 'Yes, it is. You can view it on Saturday at 10 am.';
  const typedN = Math.round(clamp01((f - A) / 70) * reply.length);
  return (
    <AbsoluteFill style={{background: '#edf1ee'}}>
      <Label n="04" text="her laptop · inquiries" at={a} />
      <div style={{position: 'absolute', left: 327, top: 150}}>
        <InquiryInbox lead={{name: 'Kaye Ordoñez', date: 'Sep 29, 2026', unit: 'B3B', status: 'Pending', msg: 'Is unit B3B still available? Can we view it on Saturday?'}}
          others={[{name: 'Luis Barrameda', date: 'Sep 26, 2026', unit: 'B3B', status: 'Contacted', msg: 'Hello, I start at Bicol University next month. How much is the monthly rate?'}]}
          arrive={t01(f, sent, sent + 20)} picked={t01(f, sent + 30, sent + 40)} reply={reply.slice(0, typedN)} replyFocus={f >= A && f < A + 80} replyText={reply}
          saved={t01(f, A + 84, A + 104)} press={f >= A + 80 && f < A + 88 ? 1 : 0} refCode={REF_CODE} />
      </div>
      <Caption text="A visitor asks about a vacant room, with no account, and she answers from the same place." at={a} dur={LEN.visitor - 0.1} accent={['same', 'place.']} width={1450} />
    </AbsoluteFill>
  );
};
const Proof: React.FC<{phone?: boolean}> = ({phone}) => {
  const f = useCurrentFrame();
  const a = S(AT.proof), A = S(WORD.aPlus), R = S(WORD.rated);
  const which = f < A - 25 ? 0 : f < R - 6 ? 1 : 2;
  const bg = [C.blue, CORAL, C.greenDeep][which];
  const big = ['937', 'A+', '4.53'][which];
  const sub = ['her real records, moved in', 'security · three outside scans', 'out of 5 · Very High Quality'][which];
  const at = [a, A - 25, R - 6][which];
  return (
    <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center'}}>
      <Big text={big} at={at} size={phone ? 200 : 420} color={C.white} />
      <div style={{position: 'absolute', left: 0, right: 0, top: phone ? 520 : 720, textAlign: 'center', fontFamily: FONT.mono, fontSize: phone ? 18 : 30, color: 'rgba(255,255,255,0.85)', opacity: t01(f, at + 10, at + 22)}}>{sub}</div>
      {phone ? null : <Caption text="Nine hundred thirty-seven of her real records moved in. Graded A-plus for security. Rated four point five three, out of five." at={a} dur={LEN.proof - 0.1} dark color={C.white} width={1450} />}
    </AbsoluteFill>
  );
};
const End: React.FC = () => {
  const f = useCurrentFrame();
  const a = S(AT.close);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34, opacity: t01(f, a, a + 12)}}>
        <Mark size={170} draw={t01(f, a, a + 36, E.inOut)} fill={t01(f, a + 18, a + 30)} hex={C.green} />
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 170, letterSpacing: '-0.06em', color: C.ink}}>Hivelet</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', fontFamily: FONT.grot, fontWeight: 700, fontSize: 56, letterSpacing: '-0.03em', color: C.ink, opacity: t01(f, S(WORD.connected), S(WORD.connected) + 14)}}>
        One <span style={{color: C.green}}>connected</span> system
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: FONT.mono, fontSize: 28, color: C.inkSoft, opacity: t01(f, S(AT.close + 2.49), S(AT.close + 2.49) + 14)}}>for the Fe Galang Da Silva Boarding House · hivelet.vercel.app</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: C.inkSoft, opacity: t01(f, S(54.8), S(55.2))}}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 806, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 600, fontSize: 28, color: C.ink, opacity: t01(f, S(55.6), S(56.0))}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
    </AbsoluteFill>
  );
};
type Scene = {from: number; to: number; bg: string; el: React.FC};
const LAPTOP: Scene[] = [
  {from: 0, to: AT.book - 0.1, bg: '#f4f4f1', el: Sheet},
  {from: AT.book - 0.1, to: AT.asking - 0.1, bg: C.paper, el: Pieces},
  {from: AT.asking - 0.1, to: AT.gave - 0.1, bg: C.charDeep, el: Asking},
  {from: AT.gave - 0.1, to: AT.ledger - 0.15, bg: C.charDeep, el: Gave},
  {from: AT.ledger - 0.15, to: AT.repair - 0.1, bg: C.paper, el: Ledger},
  {from: AT.repair - 0.1, to: AT.visitor - 0.1, bg: '#edf1ee', el: Board},
  {from: AT.visitor - 0.1, to: AT.proof - 0.1, bg: '#edf1ee', el: Inbox},
  {from: AT.proof - 0.1, to: AT.close - 0.2, bg: C.blue, el: Proof},
  {from: AT.close - 0.2, to: 99, bg: C.paper, el: End},
];
const laptopAt = (s: number) => LAPTOP.find((x) => s >= x.from && s < x.to) ?? LAPTOP[LAPTOP.length - 1];
const laptopBg = (s: number) => {
  const sc = laptopAt(s);
  if (sc.el !== Proof) return sc.bg;
  return s < WORD.aPlus - 25 / 60 ? C.blue : s < WORD.rated - 0.1 ? CORAL : C.greenDeep;
};
const LaptopScreen: React.FC = () => {
  const f = useCurrentFrame();
  const El = laptopAt(f / 60).el;
  return <AbsoluteFill style={{background: '#000'}}><El /></AbsoluteFill>;
};

// ================= the tenant's phone ===============================================================
const PHONE_ON = AT.phones - 0.1, PHONE_OFF = 59.4;
const PhoneScreen: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  if (s < PHONE_ON || s > PHONE_OFF) return <AbsoluteFill style={{background: '#030303'}} />;
  const wake = t01(f, S(PHONE_ON), S(PHONE_ON) + 12);
  let body: React.ReactNode;
  if (s < AT.repair - 0.1) {
    const G = S(WORD.gcash);
    body = (
      <>
        <div style={{position: 'absolute', inset: 0, top: 44}}><TenantHome amount="₱4,700.00" unread={2} press={t01(f, G - 10, G - 4) * (1 - t01(f, G - 4, G + 2))} /></div>
        {f >= G && f < G + 30 ? <div style={{position: 'absolute', left: 16, top: 260}}><PayOpening spin={(f - G) / 40} /></div> : null}
        {f >= G + 30 ? <div style={{position: 'absolute', left: 16, top: 220, transform: `translateY(${(1 - spr(f, G + 30)) * 40}px)`}}><PaymentReceived check={t01(f, G + 34, G + 60)} /></div> : null}
      </>
    );
  } else if (s < AT.visitor - 0.1) {
    const D = S(WORD.done);
    body = (
      <>
        <div style={{position: 'absolute', inset: 0, top: 44}}><TenantHome amount="₱4,700.00" unread={3} /></div>
        {f >= D ? <div style={{position: 'absolute', left: 0, right: 0, top: 70, transform: `translateY(${(1 - spr(f, D, {damping: 15, stiffness: 160})) * -140}px)`}}><DoneNote /></div> : null}
      </>
    );
  } else if (s < AT.proof - 0.1) {
    const a = S(AT.visitor), q = 'Is unit B3B still available? Can we view it on Saturday?';
    const n = Math.round(clamp01((f - a - 20) / 70) * q.length), sent = S(WORD.noAccount) + 20;
    body = (
      <div style={{position: 'absolute', left: 0, top: 70, transform: 'scale(0.6)', transformOrigin: '0 0'}}>
        <AskDialog name="Kaye Ordoñez" phone="0918 555 0142" email="kaye.ordonez@email.com" question={q.slice(0, n)} focus={f < sent ? 'question' : null} press={f >= sent - 6 && f < sent + 2 ? 1 : 0} saved={t01(f, sent, sent + 30)} />
      </div>
    );
  } else if (s < AT.close - 0.2) {
    body = <Proof phone />;
  } else {
    body = (
      <AbsoluteFill style={{background: C.green, alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: 150, height: 150, borderRadius: 36, background: '#0f1b15', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.25)'}}><Mark size={120} /></div>
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 48, color: C.white, marginTop: 24, letterSpacing: '-0.04em'}}>Hivelet</div>
      </AbsoluteFill>
    );
  }
  const off = t01(f, S(PHONE_OFF) - 20, S(PHONE_OFF));
  return <AbsoluteFill style={{background: '#edf1ee'}}><AbsoluteFill style={{opacity: wake * (1 - off)}}>{body}</AbsoluteFill><AbsoluteFill style={{background: '#000', opacity: 1 - wake * (1 - off)}} /></AbsoluteFill>;
};
const phoneBg = (s: number): string => {
  if (s < PHONE_ON || s > PHONE_OFF) return '#000000';
  if (s >= AT.proof - 0.1 && s < AT.close - 0.2) return s < WORD.aPlus - 25 / 60 ? C.blue : s < WORD.rated - 0.1 ? CORAL : C.greenDeep;
  if (s >= AT.close - 0.2) return C.green;
  return '#edf1ee';
};

// The phone, on a small stand to the right of the laptop, turned toward the camera.
const PX = 1030, PZ = 260;
const Phone3D: React.FC<{mirror: boolean}> = () => (
  <div style={{position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `translate3d(${PX}px, 0, ${PZ}px) rotateY(-34deg)`}}>
    {/* the stand: a dark wedge behind the phone */}
    <div style={{position: 'absolute', left: -120, top: -240, width: 240, height: 240, transformOrigin: '50% 100%', transform: 'translateZ(-90px) rotateX(-12deg)', background: '#1b1c1f', borderRadius: 14}} />
    <div style={{position: 'absolute', left: -150, top: -24, width: 300, height: 24, transform: 'translateZ(40px)', background: '#202124', borderRadius: 6}} />
    {/* the phone, leaning back */}
    <div style={{position: 'absolute', left: -190, top: -800, width: 380, height: 780, transformOrigin: '50% 100%', transform: 'translateZ(30px) rotateX(16deg)', borderRadius: 56, background: '#0c0c0d', boxShadow: 'inset 0 0 0 3px #26272b'}}>
      <div style={{position: 'absolute', left: 16, top: 16, width: 348, height: 748, borderRadius: 44, overflow: 'hidden', background: '#000'}}>
        <div style={{width: 390, height: 844, transform: `scale(${348 / 390}, ${748 / 844})`, transformOrigin: '0 0', position: 'relative'}}><PhoneScreen /></div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%)'}} />
      </div>
      <div style={{position: 'absolute', left: 150, top: 28, width: 80, height: 22, borderRadius: 11, background: '#050505'}} />
    </div>
  </div>
);

// ================= the room, the camera, the sound ====================================================
// The camera starts close on the shut laptop, rises with the lid, and then moves between the
// two screens: to the phone when the tenants come in, back to her board, to the phone for the
// visitor, back to her inbox for the answer, wide for the proof and the close.
const K: [number, number, number, number, number, number][] = [
  [0, 120, 470, -700, 7, 26],
  [1.8, 140, 420, -560, 4.5, 24],
  [21.0, 140, 400, -480, 4.5, 21],
  [24.6, 140, 400, -520, 4.5, 21],
  [25.4, -1000, 330, -330, 4, 4],
  [28.7, -1000, 330, -330, 4, 4],
  [29.5, 140, 400, -500, 4.5, 21],
  [30.9, 140, 400, -500, 4.5, 21],
  [31.7, -1000, 330, -330, 4, 4],
  [33.5, -980, 330, -360, 4, 5],
  [34.3, -1000, 330, -330, 4, 4],
  [36.4, -1000, 330, -330, 4, 4],
  [37.2, 140, 400, -500, 4.5, 21],
  [39.6, 140, 400, -520, 4.5, 21],
  [40.5, -40, 380, -820, 4.5, 14],
  [57.6, -40, 380, -880, 4.5, 14],
  [60, 0, 400, -760, 5, 16],
];
const camAt = (s: number): Camera => {
  let i = 0;
  while (i < K.length - 2 && s >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  const p = E.inOut(clamp01((s - a[0]) / (b[0] - a[0])));
  const v = a.map((x, k) => lerp(x, b[k], p));
  const h = (fr: number, ph: number) => Math.sin(s * fr + ph) * 0.6 + Math.sin(s * fr * 2.3 + ph * 1.7) * 0.4;
  return {x: v[1] + h(0.7, 1) * 4, y: v[2] + h(0.5, 2) * 4, z: v[3], tilt: v[4] + h(0.4, 3) * 0.12, yaw: v[5] + h(0.35, 4) * 0.25, roll: h(0.3, 5) * 0.12};
};
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const lumOf = (c: [number, number, number]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const files = new Set(getStaticFiles().map((x) => x.name));

export const Duo: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 60;
  const lid = s < 30 ? lerp(-90, TILT, t01(f, S(OPEN[0]), S(OPEN[1]), E.inOut)) : lerp(TILT, -90, t01(f, S(SHUT[0]), S(SHUT[1]), E.inOut));
  const open = clamp01((lid + 90) / (90 + TILT));
  const lc = rgb(laptopBg(s));
  const glow: Glow = {color: lc, level: (0.25 + 0.95 * lumOf(lc)) * Math.pow(open, 1.5)};
  const pc = rgb(phoneBg(s));
  const pglow: Glow = {color: pc, level: phoneBg(s) === '#000000' ? 0 : 0.35 + 0.6 * lumOf(pc)};
  return (
    <>
      <Room cam={camAt(s)} glow={glow} screen={<LaptopScreen />} mirrorScreen={<LaptopScreen />} lid={lid}
        extra={(m) => <Phone3D mirror={m} />} extraGlow={{at: [PX, -420, PZ], glow: pglow}} />
      {(Object.keys(AT) as Line[]).map((k) => (
        <Sequence key={k} from={Math.round(AT[k] * 60)} durationInFrames={Math.round(LEN[k] * 60) + 30} layout="none" name={`vo ${k}`}>
          <Audio src={staticFile(`duo/vo/${k}.wav`)} volume={0.85} />
        </Sequence>
      ))}
      {files.has('duo/score.wav') ? <Audio src={staticFile('duo/score.wav')} volume={1} /> : null}
    </>
  );
};
export {Draw};
