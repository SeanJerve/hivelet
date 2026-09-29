// For the tenants and for guests. The tenant's phone stays on the left; what
// reaches the landlady appears on the right, under the headline, never across it.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, jakarta} from '../theme';
import {easeIn, easeInOut, lerp, peso, pop, t01} from '../anim';
import {ActionCam, Bg, FloorShadow, Focus, Head} from '../fx';
import {AppHeader, Cursor, Field, Input, Ripple} from '../ui/Kit';
import {AttentionTile, BoardColumn, InquiryItem, RepairCard} from '../ui/Admin';
import {AmountDue, DoneNote, PaymentReceived, PayOpening, Phone, RepairForm, STATUS, TenantHome} from '../ui/Tenant';
import {AskDialog, PLAN, PlanImage, SHOW, UnitShowcase} from '../ui/Public';
import {Cues} from '../Sfx';
import {Zone} from './Owner';
import {TYPING, typedOf} from '../typing.mjs';

// Headlines to the right of the phone, one line each.
const TopHead: React.FC<{text: string; accent: string[]; sub?: string; at: number; out?: number}> = (p) => (
  <Head size={90} subSize={32} left={720} top={110} width={1100} {...p} />
);

// The board card carries the same title the tenant typed.
const REPAIR_TITLE = TYPING.title.text;

// Tenant timings (cues.mjs uses the same frames). The GCash payment runs 100 to
// 176; everything after it is its v6 frame plus 70.
export const T = {pay: 100, opening: 106, received: 138, payOut: 176, chip: 174, tile: 186, review: 246, settled: 268, toForm: 296,
  focusDetails: 378, closeOut: 426, send: 444, board: 446, fly: 450, s1: 486, s2: 506, note: 528};

export const Tenant: React.FC = () => {
  const f = useCurrentFrame();
  const PZ = 1.08, PX = 150, PY = 71;
  const screen = (x: number, y: number) => ({x: PX + (12 + x) * PZ, y: PY + (12 + STATUS + y) * PZ});
  const enter = pop(f, 0, {damping: 20, stiffness: 70});
  const amount = Math.round(lerp(0, 4700, t01(f, 14, 62)));
  const payTap = T.pay, sendTap = T.send;
  const settled = t01(f, T.settled, T.settled + 20);
  const toForm = t01(f, T.toForm, T.toForm + 22, easeInOut);
  const titleText = typedOf('title', f);
  const detailText = typedOf('details', f);
  const typingFocus = f < T.focusDetails ? 'title' : f < sendTap ? 'details' : null;
  const note = pop(f, T.note, {damping: 20, stiffness: 90});

  // Paying: the dialog opens the payment page, and back from GCash the payments
  // page confirms it. The same two cards show on the phone and, larger, beside it.
  const opening = pop(f, T.opening, {damping: 20, stiffness: 110});
  const received = pop(f, T.received, {damping: 18, stiffness: 120});
  const check = t01(f, T.received + 4, T.received + 26);
  const payOut = t01(f, T.payOut, T.payOut + 14, easeIn);
  const spin = (f - T.opening) / 22;
  const payCard = (scale: number) => (
    <div style={{position: 'relative', width: 358, height: 250}}>
      <div style={{position: 'absolute', left: 0, top: 0, opacity: Math.min(1, opening * 1.6) * (1 - t01(f, T.received - 4, T.received + 6)), transform: `translateY(${(1 - opening) * 30 * scale}px)`}}>
        <PayOpening spin={spin} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, opacity: Math.min(1, received * 1.6), transform: `translateY(${(1 - received) * 24 * scale}px) scale(${lerp(0.94, 1, received)})`}}>
        <PaymentReceived check={check} />
      </div>
    </div>
  );

  const tileIn = pop(f, T.tile, {damping: 20, stiffness: 90});
  const tileOut = t01(f, T.review + 8, T.review + 26, easeIn);
  const TX = 1000, TY = 380, TZ = 1.2;
  const reviewAt = T.review;
  const cur = {x: lerp(1760, TX + 104 * TZ, t01(f, T.review - 28, T.review - 6, easeInOut)), y: lerp(1000, TY + 212 * TZ, t01(f, T.review - 28, T.review - 6, easeInOut))};
  const cPress = t01(f, reviewAt - 3, reviewAt) * (1 - t01(f, reviewAt, reviewAt + 7));
  // The tutorial camera on her side: into Review payments as it is clicked.
  const tileZoom: Focus[] = [
    {at: T.review - 32, x: 1125, y: 620, s: 1.4, tx: 1250, ty: 610},
    {at: T.review + 10, s: 1, dur: 22},
  ];

  const pay = screen(125, 448);
  const chip = t01(f, T.chip, T.chip + 24, easeInOut);

  // Her board, and the card moving along it: into To dispatch, then In progress, then Done.
  const boardIn = pop(f, T.board, {damping: 20, stiffness: 90});
  const BZ = 0.95, BX = 740, BY = 360;
  const colX = (i: number) => BX + i * (341 + 12) * BZ + 24 * BZ;
  const cardY = BY + 84 * BZ;
  const from = screen(195, 706);
  const fly = t01(f, T.fly, T.fly + 26, easeInOut);
  const s1 = t01(f, T.s1, T.s1 + 16, easeInOut), s2 = t01(f, T.s2, T.s2 + 16, easeInOut);
  const cardX = lerp(lerp(lerp(from.x - 139, colX(0), fly), colX(1), s1), colX(2), s2);
  const cardTop = lerp(from.y - 90, cardY, fly) - Math.sin(fly * Math.PI) * 140;
  // A slight lift while the card slides between columns.
  const slideLift = Math.sin(s1 * Math.PI) + Math.sin(s2 * Math.PI);
  const col = f < T.s1 + 8 ? 0 : f < T.s2 + 8 ? 1 : 2;
  // The tutorial camera follows the card column to column, then lets go.
  const cardMid = (i: number) => colX(i) + 151;
  const boardZoom: Focus[] = [
    {at: T.fly + 18, x: cardMid(0), y: 540, s: 1.35, tx: 1150, ty: 600, dur: 22},
    {at: T.s1, x: cardMid(1), y: 540, s: 1.35, tx: 1260, ty: 600, dur: 18},
    {at: T.s2, x: cardMid(2), y: 540, s: 1.35, tx: 1360, ty: 600, dur: 18},
    {at: T.note - 4, s: 1, dur: 26},
  ];

  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={32} />
      <FloorShadow x={PX + 207 * PZ} y={PY + 868 * PZ + 4} w={480} lift={1 - enter} />
      <div style={{position: 'absolute', left: PX / PZ, top: PY / PZ, zoom: PZ, perspective: 1800}}>
        <div style={{transformOrigin: '50% 60%', transform: `translateY(${(1 - enter) * 260}px) rotateY(${(1 - enter) * -30}deg) rotateX(${(1 - enter) * 10}deg)`, opacity: Math.min(1, enter * 1.6)}}>
          <Phone>
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${-toForm * 390}px)`}}>
              <TenantHome amount={peso(amount, 2)} settled={settled} press={f >= payTap - 3 && f < payTap + 7 ? 1 : 0} pill={pop(f, 62)} />
            </div>
            {f >= T.opening && f < T.payOut + 16 ? (
              <div style={{position: 'absolute', inset: 0, background: `rgba(15,27,21,${0.45 * Math.min(1, opening) * (1 - payOut)})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{opacity: 1 - payOut, transform: 'scale(0.98)'}}>{payCard(1)}</div>
              </div>
            ) : null}
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - toForm) * 390}px)`, background: C.canvas}}>
              <RepairForm title={titleText} details={detailText} focus={typingFocus} press={f >= sendTap - 3 && f < sendTap + 7 ? 1 : 0} unread={f >= T.note + 2 ? 3 : 2} />
            </div>
            {f >= T.note ? <div style={{position: 'absolute', left: 16, right: 16, top: 0, background: C.canvas}}><AppHeader phone initials="AV" unread={3} ring={t01(f, T.note, T.note + 32)} /></div> : null}
            {f >= T.note ? <div style={{position: 'absolute', left: 0, right: 0, top: 74, transform: `translateY(${(1 - note) * -140}px)`, opacity: Math.min(1, note * 1.6)}}><DoneNote /></div> : null}
          </Phone>
        </div>
      </div>
      <Ripple x={pay.x} y={pay.y} p={t01(f, payTap, payTap + 18)} />
      <Ripple x={from.x} y={from.y} p={t01(f, sendTap, sendTap + 18)} />

      <TopHead text="Their bill, on their phone." accent={['phone.']} at={12} out={92} />
      <TopHead text="Pay by GCash." accent={['GCash.']} sub="She confirms it." at={110} out={T.settled + 22} />
      <TopHead text="Report a repair." accent={['repair.']} at={T.toForm + 6} out={sendTap} />
      <TopHead text="Follow it to the end." accent={['end.']} at={sendTap + 18} />

      {/* A close-up of what the tenant sees, while the phone is on screen alone. */}
      {f >= 14 && f < 106 ? (
        <div style={{position: 'absolute', left: 970 / 1.6, top: 360 / 1.6, zoom: 1.6, width: 358, transform: `translateY(${t01(f, 94, 106, easeIn) * 30}px) scale(${lerp(0.94, 1, pop(f, 14))})`,
          opacity: Math.min(1, pop(f, 14) * 1.6) * (1 - t01(f, 96, 106)), borderRadius: 24, boxShadow: '0 40px 90px rgba(15,27,21,0.2)'}}>
          <AmountDue amount={peso(amount, 2)} pill={pop(f, 62)} press={f >= payTap - 3 && f < payTap + 7 ? 1 : 0} />
        </div>
      ) : null}
      {/* The same payment, close up: opening the payment page, then confirmed. */}
      {f >= T.opening && f < T.payOut + 16 ? (
        <div style={{position: 'absolute', left: 930 / 1.6, top: 380 / 1.6, zoom: 1.6, opacity: 1 - payOut, transform: `translateY(${payOut * 30}px)`,
          filter: 'drop-shadow(0 40px 60px rgba(15,27,21,0.18))'}}>
          {payCard(1)}
        </div>
      ) : null}

      {/* The payment reaching her, and her tile: the camera follows the click. */}
      <ActionCam keys={tileZoom}>
        {f >= T.chip && f < T.chip + 26 ? (
          <div style={{position: 'absolute', left: lerp(pay.x, TX + 200, chip), top: lerp(pay.y, TY + 150, chip) - Math.sin(chip * Math.PI) * 160, transform: `translate(-50%, -50%) scale(${1 + Math.sin(chip * Math.PI) * 0.25})`,
            background: C.brand, color: '#fff', borderRadius: 999, padding: '14px 22px', fontFamily: jakarta, fontWeight: 700, fontSize: 24, boxShadow: '0 20px 40px rgba(15,27,21,0.28)'}}>₱4,700.00</div>
        ) : null}
        {f >= T.tile && f < T.review + 28 ? (
          <div style={{position: 'absolute', left: TX / TZ, top: TY / TZ, zoom: TZ, transformOrigin: '0 0', transform: `scale(${lerp(0.85, 1, tileIn)}) translateX(${tileOut * 700}px)`, opacity: Math.min(1, tileIn * 1.6) * (1 - tileOut)}}>
            <div style={{borderRadius: 24, boxShadow: '0 40px 90px rgba(15,27,21,0.22)'}}>
              <AttentionTile f={f} at={T.tile - 4} name="Andrea Villanueva" unit="Unit 1A, Sep 29" amount={4700} press={cPress} />
            </div>
          </div>
        ) : null}
        {f >= T.review - 28 && f < T.review + 24 ? <><Ripple x={cur.x} y={cur.y} p={t01(f, reviewAt, reviewAt + 18)} /><Cursor x={cur.x} y={cur.y} press={cPress} size={40} opacity={t01(f, T.review - 28, T.review - 20) * (1 - t01(f, T.review + 8, T.review + 20))} /></> : null}
      </ActionCam>

      {/* A close-up of the form as the tenant types. */}
      {f >= T.toForm + 14 && f < T.closeOut + 14 ? (
        <div style={{position: 'absolute', left: 820 / 1.9, top: 380 / 1.9, zoom: 1.9, transform: `translateY(${t01(f, T.closeOut, T.closeOut + 14, easeIn) * 30}px) scale(${lerp(0.94, 1, pop(f, T.toForm + 14))})`,
          opacity: Math.min(1, pop(f, T.toForm + 14) * 1.6) * (1 - t01(f, T.closeOut, T.closeOut + 12))}}>
          <div style={{width: 470, borderRadius: 26, background: C.tile, padding: 22, boxShadow: '0 30px 70px rgba(15,27,21,0.14)', display: 'flex', flexDirection: 'column', gap: 14}}>
            <Field label="What needs fixing"><Input value={titleText} placeholder="e.g. Bathroom sink pipe leak" focus={typingFocus === 'title'} caret={typingFocus === 'title'} /></Field>
            <Field label="Details"><Input area value={detailText} placeholder="Where it is in the unit, when it started, and how bad it is." focus={typingFocus === 'details'} caret={typingFocus === 'details'} /></Field>
          </div>
        </div>
      ) : null}

      {/* Her repairs board, and the card travelling across it. */}
      <ActionCam keys={boardZoom}>
        {f >= T.board ? (
          <div style={{position: 'absolute', left: BX / BZ, top: BY / BZ, zoom: BZ, display: 'flex', gap: 12, transform: `translateY(${(1 - boardIn) * 80}px)`, opacity: Math.min(1, boardIn * 1.6)}}>
            <BoardColumn title="To dispatch" sub="No technician assigned yet" n={f >= T.fly + 26 && col === 0 ? 1 : 0} h={430} />
            <BoardColumn title="In progress" sub="A technician is on it" n={col === 1 ? 1 : 0} h={430} />
            <BoardColumn title="Done" sub="Resolved or closed" n={col === 2 ? 1 : 0} h={430} />
          </div>
        ) : null}
        {f >= T.fly ? (
          <div style={{position: 'absolute', left: cardX / BZ, top: (cardTop - slideLift * 10) / BZ, zoom: BZ, transform: `rotate(${Math.sin(fly * Math.PI) * -6 + slideLift * 1.5}deg) scale(${lerp(0.75, 1, fly)})`, transformOrigin: '0 0',
            boxShadow: `0 ${24 * Math.sin(fly * Math.PI) + 8 + slideLift * 14}px ${50 + slideLift * 20}px rgba(15,27,21,0.16)`, borderRadius: 20}}>
            <RepairCard title={REPAIR_TITLE} meta="Unit 1A, Plumbing" reported="Sep 29, 2026" tech={f < T.s1 ? 'Unassigned' : 'Plumber'} prio="Medium" />
          </div>
        ) : null}
      </ActionCam>

      <Cues scene="tenant" />
    </AbsoluteFill>
  );
};

// ---- For guests ------------------------------------------------------------------
// A vacant unit on its category page, its floor plan drawn with the unit marked,
// the plan lifted for a closer look, then "Ask about unit B3B" and the question
// arriving in her Inquiries.
export const G = {plan: 26, chip: 76, lift: 104, drop: 176, click: 206, dialog: 212, fill: 232, focus: 250, send: 338, list: 350, item: 368};

export const Guests: React.FC = () => {
  const f = useCurrentFrame();
  // The showcase card, at zoom SZ in the visual zone.
  const SZ = 0.92, SX = 900, SY = 264;
  const cardIn = pop(f, 6, {damping: 20, stiffness: 80});
  const plan = t01(f, G.plan, G.plan + 46, easeInOut);
  const chip = pop(f, G.chip, {damping: 16, stiffness: 140});
  const ring1 = t01(f, G.chip + 4, G.chip + 34);

  // The plan lifting out of the card and back: from its place in the card to a
  // close-up in the middle of the zone, along the same path both ways.
  const lift = t01(f, G.lift, G.lift + 30, easeInOut) * (1 - t01(f, G.drop, G.drop + 26, easeInOut));
  const imgH = (w: number) => (w * PLAN.h) / PLAN.w;
  const inCard = {x: SX + ((SHOW.planW - SHOW.imgW) / 2) * SZ, y: SY + ((SHOW.h - imgH(SHOW.imgW)) / 2) * SZ, w: SHOW.imgW * SZ};
  const CLOSE = {w: 740, x: 1340 - 370, y: (1080 - imgH(740)) / 2};
  const lx = lerp(inCard.x, CLOSE.x, lift), ly = lerp(inCard.y, CLOSE.y, lift), lw = lerp(inCard.w, CLOSE.w, lift);
  const ring2 = t01(f, G.lift + 40, G.lift + 72);
  const lifted = f >= G.lift && f < G.drop + 26;

  // "Ask about unit B3B", then the dialog.
  const btn = {x: 1590, y: 752};
  const curA = {x: lerp(1760, btn.x, t01(f, 184, 202, easeInOut)), y: lerp(1010, btn.y, t01(f, 184, 202, easeInOut))};
  const pressA = t01(f, G.click - 3, G.click) * (1 - t01(f, G.click, G.click + 7));
  const dialogIn = pop(f, G.dialog, {damping: 22, stiffness: 120});
  const dialogOut = t01(f, G.send + 4, G.send + 18, easeIn);
  // The dialog, 598px tall at zoom DZ, centred in the zone.
  const DZ = 1.1, DX = 1340 - 320 * DZ, DY = (1080 - 598 * DZ) / 2;
  const sendBtn = {x: DX + (52 + 75) * DZ, y: DY + (598 - 48 - 22) * DZ};
  const curB = {x: lerp(1560, sendBtn.x, t01(f, 314, 332, easeInOut)), y: lerp(980, sendBtn.y, t01(f, 314, 332, easeInOut))};
  const pressB = t01(f, G.send - 3, G.send) * (1 - t01(f, G.send, G.send + 7));
  // The tutorial camera: in on Ask about unit B3B as it is clicked, back out as the
  // dialog opens, close on the question while it is typed, to Send, then out.
  const guestZoom: Focus[] = [
    {at: 184, x: btn.x, y: btn.y, s: 1.4, tx: 1440, ty: 640, dur: 22},
    {at: G.dialog, s: 1, dur: 18},
    {at: G.focus - 6, x: 1300, y: 660, s: 1.45, tx: 1340, ty: 560, dur: 22},
    {at: 318, x: sendBtn.x, y: sendBtn.y, s: 1.35, tx: 1250, ty: 640, dur: 18},
    {at: G.send + 8, s: 1, dur: 22},
  ];
  const cardDim = t01(f, G.dialog - 2, G.dialog + 14);
  const cardOut = t01(f, G.send + 4, G.send + 18, easeIn);
  const question = typedOf('question', f);
  const filled = (at: number, v: string) => (f >= at ? v : '');

  // Her Inquiries, with the question arriving at the top.
  const bubble = t01(f, G.send + 4, G.send + 32, easeInOut);
  const listIn = pop(f, G.list, {damping: 20, stiffness: 90});
  const newItem = pop(f, G.item, {damping: 20, stiffness: 110});

  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={68} />
      <Zone><ActionCam keys={guestZoom}>
      {f < G.send + 20 ? (
        <div style={{position: 'absolute', left: SX / SZ, top: SY / SZ, zoom: SZ, transform: `translateX(${(1 - cardIn) * 220}px)`,
          opacity: Math.min(1, cardIn * 1.6) * (1 - 0.8 * lift) * (1 - 0.75 * cardDim) * (1 - cardOut)}}>
          <UnitShowcase plan={plan} chip={chip} ring={ring1} hidePlan={lifted} press={f >= G.click - 3 && f < G.click + 7 ? 1 : 0} />
        </div>
      ) : null}
      {lifted ? (
        <div style={{position: 'absolute', left: lx - 28 * lift, top: ly - 28 * lift, padding: 28 * lift, borderRadius: 26, background: C.tile,
          boxShadow: `0 ${40 * lift}px ${90 * lift}px rgba(15,27,21,${0.2 * lift})`}}>
          <PlanImage width={lw} ring={ring2} />
        </div>
      ) : null}

      {f >= G.dialog && f < G.send + 20 ? (
        <div style={{position: 'absolute', left: DX / DZ, top: DY / DZ, zoom: DZ, transformOrigin: '50% 50%', transform: `scale(${lerp(0.96, 1, dialogIn) - dialogOut * 0.03})`,
          opacity: Math.min(1, dialogIn * 1.6) * (1 - dialogOut)}}>
          <AskDialog name={filled(G.fill, 'Kaye Ordoñez')} phone={filled(G.fill + 4, '0918-555-0142')} email={filled(G.fill + 8, 'kaye.ordonez@email.com')}
            question={question} focus={f >= G.focus && f < G.send ? 'question' : null} press={f >= G.send - 3 && f < G.send + 7 ? 1 : 0} />
        </div>
      ) : null}
      {f >= 184 && f < G.dialog + 12 ? <><Ripple x={curA.x} y={curA.y} p={t01(f, G.click, G.click + 18)} /><Cursor x={curA.x} y={curA.y} press={pressA} size={40} opacity={t01(f, 184, 192) * (1 - t01(f, G.dialog, G.dialog + 10))} /></> : null}
      {f >= 314 && f < G.send + 16 ? <><Ripple x={curB.x} y={curB.y} p={t01(f, G.send, G.send + 18)} /><Cursor x={curB.x} y={curB.y} press={pressB} size={40} opacity={t01(f, 314, 322) * (1 - t01(f, G.send + 6, G.send + 16))} /></> : null}

      {f >= G.send + 4 && f < G.send + 34 ? (
        <div style={{position: 'absolute', left: lerp(DX + 52 * DZ, 1060, bubble), top: lerp(DY + 376 * DZ, 300, bubble) - Math.sin(bubble * Math.PI) * 120, transform: `scale(${lerp(1, 0.8, bubble)})`,
          transformOrigin: '0 0', background: C.brand, color: '#fff', borderRadius: '24px 24px 24px 6px', padding: '16px 22px', fontFamily: jakarta, fontSize: 19, lineHeight: 1.45,
          boxShadow: '0 20px 50px rgba(15,27,21,0.26)', opacity: 1 - t01(f, G.send + 26, G.send + 34)}}>
          {TYPING.question.text}
        </div>
      ) : null}
      {f >= G.list ? (
        <div style={{position: 'absolute', left: 1020 / 1.25, top: 230 / 1.25, zoom: 1.25, borderRadius: 24, overflow: 'hidden', background: C.tile, boxShadow: '0 40px 90px rgba(15,27,21,0.12)',
          transform: `translateY(${(1 - listIn) * 60}px)`, opacity: Math.min(1, listIn * 1.6)}}>
          <div style={{height: newItem * 130, overflow: 'hidden'}}>
            <InquiryItem name="Kaye Ordoñez" when="Sep 29, 2026" unit="B3B" status="Waiting for an answer" tone="verify" active msg={TYPING.question.text} />
          </div>
          <InquiryItem name="Luis Barrameda" when="Sep 26, 2026" unit="B3B" status="Answered" tone="neutral" msg="Hello, I start at Bicol University next month. How much is the monthly rate?" />
          <InquiryItem name="Mica Tolentino" when="Sep 21, 2026" unit="1G" status="Nothing came of it" tone="neutral" msg="Do you have a studio for one person?" />
        </div>
      ) : null}
      </ActionCam></Zone>
      <Head size={100} text={'Find a\nvacant room.'} accent={['vacant']} at={10} out={98} />
      <Head size={100} text={'See the\nfloor plan.'} accent={['plan.']} sub="Each unit, marked on its floor." subSize={32} at={108} out={G.drop + 10} />
      <Head size={100} text={'Just ask.\nNo sign-up.'} accent={['ask.']} at={G.click - 2} out={G.send + 4} />
      <Head size={100} text={'Straight to\nher Inquiries.'} accent={['Inquiries.']} at={G.send + 20} />
      <Cues scene="guests" />
    </AbsoluteFill>
  );
};
