// Scenes 8 and 9: the tenant's side on a phone, handing off to the owner's
// screens as each thing happens, and a guest's inquiry reaching her.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, jakarta, sora} from '../theme';
import {easeIn, easeInOut, lerp, peso, pop, t01, typed} from '../anim';
import {Bg, FloorShadow, Head, Kin} from '../fx';
import {AppHeader, Cursor, Field, Input, Ripple} from '../ui/Kit';
import {AttentionTile, BoardColumn, InquiryItem, RepairCard} from '../ui/Admin';
import {DoneNote, Phone, RepairForm, STATUS, TenantHome} from '../ui/Tenant';
import {CATEGORIES, InquiryForm, UnitPanel} from '../ui/Public';
import {Sfx, Ticks, Typing} from '../Sfx';

// Headlines to the right of the phone: one line each, so the owner's screens
// that answer the tenant have the lower half of the frame.
const RightHead: React.FC<{text: string; accent: string[]; sub: string; at: number; out?: number}> = (p) => (
  <Head kicker="For the tenants" size={92} left={760} top={96} width={1080} {...p} />
);

// 8. Tenant: see the bill, pay by GCash, report a repair, hear it is done.
const REPAIR_TITLE = 'Kitchen faucet keeps dripping';
const REPAIR_DETAILS = 'Under the kitchen sink. It started this morning and drips even when closed.';
export const Tenant: React.FC = () => {
  const f = useCurrentFrame();
  const PS = 1.1, PX = 150, PY = 60; // phone scale and position
  const screen = (x: number, y: number) => ({x: PX + (12 + x) * PS, y: PY + (12 + STATUS + y) * PS});
  const enter = pop(f, 0, {damping: 18, stiffness: 110});
  const amount = Math.round(lerp(0, 4700, t01(f, 10, 44)));
  const payTap = 92;
  const settled = t01(f, 170, 190);
  const toForm = t01(f, 204, 222, easeInOut);
  const titleText = typed(REPAIR_TITLE, f, 222, 1.2);
  const detailText = typed(REPAIR_DETAILS, f, 262, 0.4);
  const sendTap = 296;
  const note = pop(f, 364, {damping: 16, stiffness: 150});

  // Owner tile for the payment, then the repairs board.
  const tileIn = pop(f, 104, {damping: 17, stiffness: 150});
  const tileOut = t01(f, 198, 210, easeIn);
  const boardIn = pop(f, 286, {damping: 18, stiffness: 140});

  // The repair card's flight: from the phone's Send button into the board, then along it.
  const from = screen(195, 706);
  const col = (i: number) => ({x: 772 + i * 352 + 24 * 0.98, y: 380 + 86 * 0.98});
  const fly = t01(f, 300, 320, easeInOut);
  const step1 = t01(f, 334, 346, easeInOut), step2 = t01(f, 350, 362, easeInOut);
  const cardX = lerp(lerp(from.x - 147, col(0).x, fly), col(1).x, step1);
  const cardX2 = lerp(cardX, col(2).x, step2);
  const cardY = lerp(from.y - 90, col(0).y, fly) - Math.sin(fly * Math.PI) * 160;

  // The pointer on the owner's tile.
  const reviewAt = 158;
  const cur = {x: lerp(1500, 900 + 104 * 1.25, t01(f, 136, 154, easeInOut)), y: lerp(980, 400 + 212 * 1.25, t01(f, 136, 154, easeInOut))};
  const cPress = t01(f, reviewAt - 3, reviewAt) * (1 - t01(f, reviewAt, reviewAt + 6));

  // A chip carrying the payment from the phone to her.
  const chip = t01(f, 96, 114, easeInOut);
  const pay = screen(125, 448);

  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={30} />
      <FloorShadow x={PX + 207 * PS} y={PY + 868 * PS + 6} w={520} lift={1 - enter} />
      <div style={{position: 'absolute', left: PX, top: PY, transformOrigin: '0 0', perspective: 1800}}>
        <div style={{transformOrigin: '50% 60%', transform: `scale(${PS}) translateY(${(1 - enter) * 300}px) rotateY(${(1 - enter) * -38}deg) rotateX(${(1 - enter) * 14}deg)`,
          opacity: Math.min(1, enter * 2)}}>
          <Phone>
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${-toForm * 390}px)`}}>
              <TenantHome amount={peso(amount, 2)} settled={settled} press={f >= payTap - 3 && f < payTap + 6 ? 1 : 0} pill={pop(f, 44)} />
            </div>
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - toForm) * 390}px)`, background: C.canvas}}>
              <RepairForm title={titleText} details={detailText} focus={f < 262 ? 'title' : f < 294 ? 'details' : null} press={f >= sendTap - 3 && f < sendTap + 6 ? 1 : 0}
                unread={f >= 366 ? 3 : 2} />
            </div>
            {f >= 364 ? <div style={{position: 'absolute', left: 0, right: 0, top: 72, transform: `translateY(${(1 - note) * -160}px)`, opacity: Math.min(1, note * 2)}}><DoneNote /></div> : null}
            {f >= 364 ? <div style={{position: 'absolute', left: 16, right: 16, top: 0}}><AppHeader phone initials="AV" unread={3} ring={t01(f, 364, 390)} /></div> : null}
          </Phone>
        </div>
      </div>
      <Ripple x={pay.x} y={pay.y} p={t01(f, payTap, payTap + 16)} />
      <Ripple x={from.x} y={from.y} p={t01(f, sendTap, sendTap + 16)} />

      {/* The payment reaching the owner. */}
      {f >= 96 && f < 116 ? (
        <div style={{position: 'absolute', left: lerp(pay.x, 1000, chip), top: lerp(pay.y, 560, chip) - Math.sin(chip * Math.PI) * 180, transform: `translate(-50%, -50%) scale(${1 + Math.sin(chip * Math.PI) * 0.3})`,
          background: C.brand, color: '#fff', borderRadius: 999, padding: '14px 22px', fontFamily: jakarta, fontWeight: 700, fontSize: 24, boxShadow: '0 20px 40px rgba(15,27,21,0.3)'}}>₱4,700.00</div>
      ) : null}
      {f >= 104 && f < 214 ? (
        <div style={{position: 'absolute', left: 900, top: 400, transformOrigin: '0 0', transform: `scale(${1.25 * lerp(0.7, 1, tileIn)}) translateX(${tileOut * 900}px)`, opacity: Math.min(1, tileIn * 2)}}>
          <div style={{borderRadius: 24, boxShadow: '0 40px 90px rgba(15,27,21,0.25)'}}>
            <AttentionTile f={f} at={100} name="Andrea Villanueva" unit="Unit 1A, Sep 29" amount={4700} press={cPress} />
          </div>
        </div>
      ) : null}
      {f >= 136 && f < 200 ? <><Ripple x={cur.x} y={cur.y} p={t01(f, reviewAt, reviewAt + 16)} /><Cursor x={cur.x} y={cur.y} press={cPress} size={40} opacity={t01(f, 136, 142)} /></> : null}

      {/* A close-up of the form as the tenant types, so the words can be read. */}
      {f >= 214 && f < 298 ? (
        <div style={{position: 'absolute', left: 800, top: 390, transformOrigin: '0 0', transform: `scale(${2.1 * lerp(0.85, 1, pop(f, 214))}) translateY(${t01(f, 284, 296, easeIn) * 40}px)`,
          opacity: Math.min(1, pop(f, 214) * 2) * (1 - t01(f, 284, 296))}}>
          <div style={{width: 470, borderRadius: 26, background: C.tile, padding: 22, boxShadow: '0 40px 90px rgba(15,27,21,0.18)', display: 'flex', flexDirection: 'column', gap: 14}}>
            <Field label="What needs fixing"><Input value={titleText} placeholder="e.g. Bathroom sink pipe leak" focus={f < 262} caret={f < 262} /></Field>
            <Field label="Details"><Input area value={detailText} placeholder="Where it is in the unit, when it started, and how bad it is." focus={f >= 262} caret={f >= 262 && f < 294} /></Field>
          </div>
        </div>
      ) : null}

      {/* The owner's repairs board. */}
      {f >= 286 ? (
        <div style={{position: 'absolute', left: 772, top: 380, display: 'flex', gap: 352 - 341 * 0.98, transformOrigin: '0 0', transform: `scale(0.98) translateY(${(1 - boardIn) * 120}px)`, opacity: Math.min(1, boardIn * 2)}}>
          <BoardColumn title="To dispatch" sub="No technician assigned yet" n={f >= 320 && f < 334 ? 1 : 0} h={430} />
          <BoardColumn title="In progress" sub="A technician is on it" n={f >= 340 && f < 350 ? 1 : 0} h={430} />
          <BoardColumn title="Done" sub="Resolved or closed" n={f >= 356 ? 1 : 0} h={430} />
        </div>
      ) : null}
      {f >= 300 ? (
        <div style={{position: 'absolute', left: cardX2, top: cardY, transform: `rotate(${Math.sin(fly * Math.PI) * -8}deg) scale(${lerp(0.7, 0.98, fly)})`, transformOrigin: '0 0',
          boxShadow: `0 ${30 * Math.sin(fly * Math.PI) + 8}px 60px rgba(15,27,21,0.2)`, borderRadius: 20}}>
          <RepairCard title={REPAIR_TITLE} meta="Unit 1A, Plumbing" reported="Sep 29, 2026" tech={f < 334 ? 'Unassigned' : 'Plumber'} prio="Medium" />
        </div>
      ) : null}

      <Head kicker="For the tenants" text={'Tenants see\nwhat they owe.'} accent={['owe.']} size={116} left={760} top={320} width={1080}
        sub="The amount, the due date and the period it covers, on their own phone." at={10} out={96} />
      <RightHead text="Pay by GCash. She confirms it." accent={['GCash.']} sub="A GCash payment counts once she verifies it. Cash works as it always has." at={108} out={196} />
      <RightHead text="Report a repair from the phone." accent={['repair']} sub="It goes straight to the landlady, with the unit already on it." at={212} out={318} />
      <RightHead text="Follow it until it is done." accent={['done.']} sub="Each step shows on the board, and the tenant is told when it is fixed." at={324} />

      <Sfx at={0} name="whoosh-low" vol={0.5} />
      <Ticks at={10} dur={34} vol={0.18} />
      <Sfx at={44} name="pop" vol={0.3} />
      <Sfx at={payTap - 1} name="tap" vol={0.8} />
      <Sfx at={96} name="swipe" vol={0.4} />
      <Sfx at={112} name="pop" vol={0.35} />
      <Sfx at={reviewAt - 1} name="click" vol={0.7} />
      <Sfx at={170} name="chime" vol={0.55} />
      <Sfx at={200} name="whoosh" vol={0.35} />
      <Typing at={222} chars={REPAIR_TITLE.length} perChar={1.2} vol={0.26} />
      <Typing at={262} chars={30} perChar={1} vol={0.2} />
      <Sfx at={sendTap - 1} name="tap" vol={0.8} />
      <Sfx at={286} name="whoosh" vol={0.3} />
      <Sfx at={300} name="swipe" vol={0.45} />
      <Sfx at={320} name="pop" vol={0.35} />
      <Sfx at={334} name="swipe" vol={0.3} />
      <Sfx at={350} name="swipe" vol={0.3} />
      <Sfx at={362} name="pop" vol={0.3} />
      <Sfx at={364} name="ping" vol={0.55} />
    </AbsoluteFill>
  );
};

// 9. A guest finds the vacant unit and asks; the owner sees it with the unit attached.
const QUESTION = 'Good day! Is the two-bedroom in the back apartment still available? Could we view it this Saturday?';
export const Guests: React.FC = () => {
  const f = useCurrentFrame();
  const partA = 1 - t01(f, 70, 82, easeIn);
  const formIn = pop(f, 74, {damping: 18, stiffness: 150});
  const formOut = t01(f, 150, 162, easeIn);
  const listIn = pop(f, 152, {damping: 18, stiffness: 140});
  const bubble = t01(f, 148, 170, easeInOut);
  const newItem = pop(f, 170, {damping: 14, stiffness: 180});
  const tab = t01(f, 16, 30, easeInOut);
  const tabX = [0, 212, 470, 718];
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={60} />
      {/* The public category page. */}
      <div style={{position: 'absolute', inset: 0, opacity: partA, transform: `translateX(${(1 - partA) * -300}px)`}}>
        <Head kicker="For guests · the public site" text="Two-bedroom" size={150} top={170} width={1100} at={4} />
        <div style={{position: 'absolute', left: 110, top: 470}}>
          <div style={{display: 'flex', gap: 60, fontFamily: jakarta, fontSize: 30, color: C.inkSoft, position: 'relative'}}>
            {CATEGORIES.map(([name, n], i) => (
              <span key={name} style={{color: i === 2 ? C.ink : C.inkSoft, opacity: t01(f, 8 + i * 3, 18 + i * 3), transform: `translateY(${(1 - t01(f, 8 + i * 3, 22 + i * 3)) * 20}px)`}}>
                {name} <span style={{fontSize: 22, marginLeft: 6}}>{Math.round(n * t01(f, 8 + i * 3, 30 + i * 3))}</span>
              </span>
            ))}
            <div style={{position: 'absolute', left: tabX[2] * tab, bottom: -12, width: 190, height: 3, background: C.ink, transform: `scaleX(${tab})`, transformOrigin: 'left'}} />
          </div>
          <div style={{fontFamily: jakarta, fontSize: 30, color: C.inkSoft, marginTop: 60, width: 720, lineHeight: 1.45, opacity: t01(f, 24, 36)}}>
            4 units of this kind, <b style={{color: C.ink}}>1 vacant</b> at the moment.
          </div>
        </div>
        <div style={{position: 'absolute', left: 1250, top: 190, transform: `translateX(${(1 - pop(f, 12, {damping: 18, stiffness: 130})) * 700}px)`}}>
          <UnitPanel />
        </div>
      </div>
      {/* The inquiry form, typed in. */}
      {f >= 70 ? (
        <div style={{position: 'absolute', left: 110, top: 150, transformOrigin: '0 0', transform: `scale(1.18) translateX(${(1 - formIn) * 900 - formOut * 1400}px)`, opacity: Math.min(1, formIn * 2)}}>
          <InquiryForm name={typed('Kaye Ordoñez', f, 84, 1.3)} phone={typed('0918 555 0142', f, 102, 0.9)} question={typed(QUESTION, f, 116, 0.28)}
            focus={f < 100 ? 'name' : f < 114 ? 'phone' : f < 144 ? 'question' : null} press={f >= 141 && f < 150 ? 1 : 0} />
        </div>
      ) : null}
      {f >= 80 && f < 160 ? (
        <Head kicker="For guests · Send an inquiry" text={'Guests find a room,\nand ask.'} accent={['ask.']} sub="No account needed. Viewings are by appointment." left={980} top={300} width={880} size={88} at={84} out={146} />
      ) : null}
      {/* The question flying to her Inquiries. */}
      {f >= 148 && f < 172 ? (
        <div style={{position: 'absolute', left: lerp(300, 1180, bubble), top: lerp(820, 420, bubble) - Math.sin(bubble * Math.PI) * 140, width: 420, transform: `scale(${lerp(1, 0.8, bubble)})`,
          background: C.brand, color: '#fff', borderRadius: '24px 24px 24px 6px', padding: '18px 22px', fontFamily: jakarta, fontSize: 18, lineHeight: 1.45, boxShadow: '0 20px 50px rgba(15,27,21,0.3)'}}>
          {QUESTION.slice(0, 64)}…
        </div>
      ) : null}
      {f >= 150 ? (
        <>
          <Head kicker="For the landlady · Inquiries" text={'She sees it,\nwith the unit.'} accent={['unit.']} sub="Each inquiry lands in her Inquiries, with the unit they asked about." width={780} at={160} />
          <div style={{position: 'absolute', left: 1030, top: 250, borderRadius: 24, overflow: 'hidden', background: C.tile, boxShadow: '0 40px 90px rgba(15,27,21,0.15)',
            transformOrigin: '0 0', transform: `scale(1.3) translateY(${(1 - listIn) * 200}px)`, opacity: Math.min(1, listIn * 2)}}>
            <div style={{height: newItem * 150, overflow: 'hidden'}}>
              <div style={{transform: `scale(${lerp(0.9, 1, newItem)})`}}>
                <InquiryItem name="Kaye Ordoñez" when="Sep 29, 2026" unit="B3B" status="Waiting for an answer" tone="verify" active msg="Good day! Is the two-bedroom in the back apartment still available? Could we view it this…" />
              </div>
            </div>
            <InquiryItem name="Luis Barrameda" when="Sep 26, 2026" unit="B3B" status="Answered" tone="neutral" msg="Hello, I start at Bicol University next month. How much is the monthly rate?" />
            <InquiryItem name="Mica Tolentino" when="Sep 21, 2026" unit="1G" status="Nothing came of it" tone="neutral" msg="Do you have a studio for one person?" />
          </div>
        </>
      ) : null}
      <Sfx at={0} name="whoosh" vol={0.4} />
      <Ticks at={8} dur={24} vol={0.15} />
      <Sfx at={12} name="whoosh" vol={0.3} />
      <Sfx at={26} name="pop" vol={0.35} />
      <Sfx at={70} name="swipe" vol={0.45} />
      <Typing at={84} chars={12} perChar={1.3} vol={0.24} />
      <Typing at={102} chars={13} perChar={0.9} vol={0.2} />
      <Typing at={116} chars={40} perChar={0.7} vol={0.16} />
      <Sfx at={140} name="click" vol={0.7} />
      <Sfx at={148} name="swipe" vol={0.45} />
      <Sfx at={170} name="pop" vol={0.4} />
      <Sfx at={172} name="ping" vol={0.45} />
    </AbsoluteFill>
  );
};
