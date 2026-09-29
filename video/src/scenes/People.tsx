// For the tenants and for guests. The tenant's phone stays on the left; what
// reaches the landlady appears on the right, under the headline, never across it.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, jakarta} from '../theme';
import {easeIn, easeInOut, lerp, peso, pop, t01, typed} from '../anim';
import {Bg, FloorShadow, Head} from '../fx';
import {AppHeader, Cursor, Field, Input, Ripple} from '../ui/Kit';
import {AttentionTile, BoardColumn, InquiryItem, RepairCard} from '../ui/Admin';
import {AmountDue, DoneNote, Phone, RepairForm, STATUS, TenantHome} from '../ui/Tenant';
import {InquiryForm, UnitPanel} from '../ui/Public';
import {Sfx} from '../Sfx';

// Headlines to the right of the phone, one line each.
const TopHead: React.FC<{text: string; accent: string[]; sub?: string; at: number; out?: number}> = (p) => (
  <Head size={90} subSize={32} left={720} top={110} width={1100} {...p} />
);

const REPAIR_TITLE = 'Kitchen faucet keeps dripping';
const REPAIR_DETAILS = 'Under the kitchen sink. It started this morning and drips even when closed.';

export const Tenant: React.FC = () => {
  const f = useCurrentFrame();
  const PZ = 1.08, PX = 150, PY = 71;
  const screen = (x: number, y: number) => ({x: PX + (12 + x) * PZ, y: PY + (12 + STATUS + y) * PZ});
  const enter = pop(f, 0, {damping: 20, stiffness: 70});
  const amount = Math.round(lerp(0, 4700, t01(f, 14, 62)));
  const payTap = 100, sendTap = 330;
  const settled = t01(f, 198, 218);
  const toForm = t01(f, 226, 248, easeInOut);
  const titleText = typed(REPAIR_TITLE, f, 250, 1.5);
  const detailText = typed(REPAIR_DETAILS, f, 296, 0.42);
  const note = pop(f, 404, {damping: 20, stiffness: 90});

  const tileIn = pop(f, 116, {damping: 20, stiffness: 90});
  const tileOut = t01(f, 184, 202, easeIn);
  const TX = 1000, TY = 380, TZ = 1.2;
  const reviewAt = 176;
  const cur = {x: lerp(1760, TX + 104 * TZ, t01(f, 148, 170, easeInOut)), y: lerp(1000, TY + 212 * TZ, t01(f, 148, 170, easeInOut))};
  const cPress = t01(f, reviewAt - 3, reviewAt) * (1 - t01(f, reviewAt, reviewAt + 7));

  const pay = screen(125, 448);
  const chip = t01(f, 104, 128, easeInOut);

  const boardIn = pop(f, 332, {damping: 20, stiffness: 90});
  const BZ = 0.95, BX = 740, BY = 360;
  const colX = (i: number) => BX + i * (341 + 12) * BZ + 24 * BZ;
  const cardY = BY + 84 * BZ;
  const from = screen(195, 706);
  const fly = t01(f, 336, 362, easeInOut);
  const s1 = t01(f, 372, 388, easeInOut), s2 = t01(f, 392, 408, easeInOut);
  const cardX = lerp(lerp(lerp(from.x - 139, colX(0), fly), colX(1), s1), colX(2), s2);
  const cardTop = lerp(from.y - 90, cardY, fly) - Math.sin(fly * Math.PI) * 140;

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
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - toForm) * 390}px)`, background: C.canvas}}>
              <RepairForm title={titleText} details={detailText} focus={f < 294 ? 'title' : f < 326 ? 'details' : null} press={f >= sendTap - 3 && f < sendTap + 7 ? 1 : 0} unread={f >= 406 ? 3 : 2} />
            </div>
            {f >= 404 ? <div style={{position: 'absolute', left: 16, right: 16, top: 0, background: C.canvas}}><AppHeader phone initials="AV" unread={3} ring={t01(f, 404, 436)} /></div> : null}
            {f >= 404 ? <div style={{position: 'absolute', left: 0, right: 0, top: 74, transform: `translateY(${(1 - note) * -140}px)`, opacity: Math.min(1, note * 1.6)}}><DoneNote /></div> : null}
          </Phone>
        </div>
      </div>
      <Ripple x={pay.x} y={pay.y} p={t01(f, payTap, payTap + 18)} />
      <Ripple x={from.x} y={from.y} p={t01(f, sendTap, sendTap + 18)} />

      <TopHead text="Their bill, on their phone." accent={['phone.']} at={12} out={108} />
      <TopHead text="Pay by GCash." accent={['GCash.']} sub="She confirms it." at={120} out={220} />
      <TopHead text="Report a repair." accent={['repair.']} at={232} out={332} />
      <TopHead text="Follow it to the end." accent={['end.']} at={344} />

      {/* A close-up of what the tenant sees, while the phone is on screen alone. */}
      {f >= 14 && f < 106 ? (
        <div style={{position: 'absolute', left: 970 / 1.6, top: 360 / 1.6, zoom: 1.6, width: 358, transform: `translateY(${t01(f, 90, 106, easeIn) * 30}px) scale(${lerp(0.94, 1, pop(f, 14))})`,
          opacity: Math.min(1, pop(f, 14) * 1.6) * (1 - t01(f, 90, 104)), borderRadius: 24, boxShadow: '0 40px 90px rgba(15,27,21,0.2)'}}>
          <AmountDue amount={peso(amount, 2)} pill={pop(f, 62)} press={f >= payTap - 3 && f < payTap + 7 ? 1 : 0} />
        </div>
      ) : null}

      {/* The payment reaching her. */}
      {f >= 104 && f < 130 ? (
        <div style={{position: 'absolute', left: lerp(pay.x, TX + 200, chip), top: lerp(pay.y, TY + 150, chip) - Math.sin(chip * Math.PI) * 160, transform: `translate(-50%, -50%) scale(${1 + Math.sin(chip * Math.PI) * 0.25})`,
          background: C.brand, color: '#fff', borderRadius: 999, padding: '14px 22px', fontFamily: jakarta, fontWeight: 700, fontSize: 24, boxShadow: '0 20px 40px rgba(15,27,21,0.28)'}}>₱4,700.00</div>
      ) : null}
      {f >= 116 && f < 204 ? (
        <div style={{position: 'absolute', left: TX / TZ, top: TY / TZ, zoom: TZ, transformOrigin: '0 0', transform: `scale(${lerp(0.85, 1, tileIn)}) translateX(${tileOut * 700}px)`, opacity: Math.min(1, tileIn * 1.6) * (1 - tileOut)}}>
          <div style={{borderRadius: 24, boxShadow: '0 40px 90px rgba(15,27,21,0.22)'}}>
            <AttentionTile f={f} at={112} name="Andrea Villanueva" unit="Unit 1A, Sep 29" amount={4700} press={cPress} />
          </div>
        </div>
      ) : null}
      {f >= 148 && f < 200 ? <><Ripple x={cur.x} y={cur.y} p={t01(f, reviewAt, reviewAt + 18)} /><Cursor x={cur.x} y={cur.y} press={cPress} size={40} opacity={t01(f, 148, 156) * (1 - t01(f, 184, 196))} /></> : null}

      {/* A close-up of the form as the tenant types. */}
      {f >= 240 && f < 336 ? (
        <div style={{position: 'absolute', left: 820 / 1.9, top: 380 / 1.9, zoom: 1.9, transform: `translateY(${t01(f, 322, 336, easeIn) * 30}px) scale(${lerp(0.94, 1, pop(f, 240))})`,
          opacity: Math.min(1, pop(f, 240) * 1.6) * (1 - t01(f, 322, 336))}}>
          <div style={{width: 470, borderRadius: 26, background: C.tile, padding: 22, boxShadow: '0 30px 70px rgba(15,27,21,0.14)', display: 'flex', flexDirection: 'column', gap: 14}}>
            <Field label="What needs fixing"><Input value={titleText} placeholder="e.g. Bathroom sink pipe leak" focus={f < 294} caret={f < 294} /></Field>
            <Field label="Details"><Input area value={detailText} placeholder="Where it is in the unit, when it started, and how bad it is." focus={f >= 294} caret={f >= 294 && f < 326} /></Field>
          </div>
        </div>
      ) : null}

      {/* Her repairs board, and the card travelling across it. */}
      {f >= 332 ? (
        <div style={{position: 'absolute', left: BX / BZ, top: BY / BZ, zoom: BZ, display: 'flex', gap: 12, transform: `translateY(${(1 - boardIn) * 80}px)`, opacity: Math.min(1, boardIn * 1.6)}}>
          <BoardColumn title="To dispatch" sub="No technician assigned yet" n={f >= 362 && f < 380 ? 1 : 0} h={430} />
          <BoardColumn title="In progress" sub="A technician is on it" n={f >= 380 && f < 400 ? 1 : 0} h={430} />
          <BoardColumn title="Done" sub="Resolved or closed" n={f >= 400 ? 1 : 0} h={430} />
        </div>
      ) : null}
      {f >= 336 ? (
        <div style={{position: 'absolute', left: cardX / BZ, top: cardTop / BZ, zoom: BZ, transform: `rotate(${Math.sin(fly * Math.PI) * -6}deg) scale(${lerp(0.75, 1, fly)})`, transformOrigin: '0 0',
          boxShadow: `0 ${24 * Math.sin(fly * Math.PI) + 8}px 50px rgba(15,27,21,0.16)`, borderRadius: 20}}>
          <RepairCard title={REPAIR_TITLE} meta="Unit 1A, Plumbing" reported="Sep 29, 2026" tech={f < 372 ? 'Unassigned' : 'Plumber'} prio="Medium" />
        </div>
      ) : null}

      <Sfx at={0} name="air-long" vol={0.35} />
      <Sfx at={62} name="blip" vol={0.24} />
      <Sfx at={payTap - 1} name="tap" vol={0.28} />
      <Sfx at={104} name="air-short" vol={0.35} />
      <Sfx at={120} name="blip" vol={0.28} />
      <Sfx at={reviewAt - 1} name="soft-click" vol={0.5} />
      <Sfx at={200} name="bell" vol={0.36} />
      <Sfx at={226} name="air-short" vol={0.3} />
      {[250, 262, 274, 286, 300, 312].map((a, i) => <Sfx key={a} at={a} name={(['key1', 'key2', 'key3'] as const)[i % 3]} vol={0.07} />)}
      <Sfx at={sendTap - 1} name="tap" vol={0.28} />
      <Sfx at={336} name="air-short" vol={0.35} />
      <Sfx at={362} name="blip" vol={0.24} />
      <Sfx at={372} name="air-short" vol={0.24} />
      <Sfx at={392} name="air-short" vol={0.24} />
      <Sfx at={406} name="bell" vol={0.4} />
    </AbsoluteFill>
  );
};

// ---- For guests ------------------------------------------------------------------
const QUESTION = 'Good day! Is the two-bedroom in the back apartment still available? Could we view it this Saturday?';
export const Guests: React.FC = () => {
  const f = useCurrentFrame();
  const panelIn = pop(f, 6, {damping: 20, stiffness: 80});
  const panelOut = t01(f, 92, 106, easeIn);
  const formIn = pop(f, 100, {damping: 20, stiffness: 90});
  const formOut = t01(f, 188, 202, easeIn);
  const bubble = t01(f, 186, 214, easeInOut);
  const listIn = pop(f, 200, {damping: 20, stiffness: 90});
  const newItem = pop(f, 214, {damping: 20, stiffness: 110});
  const FZ = 1.2;
  return (
    <AbsoluteFill>
      <Bg mood="light" hex glowX={68} />
      <div style={{position: 'absolute', left: 1020, top: 150, opacity: Math.min(1, panelIn * 1.6) * (1 - panelOut), transform: `translateX(${(1 - panelIn) * 200 - panelOut * 120}px)`}}>
        <UnitPanel />
      </div>
      <Head size={100} text={'Find a\nvacant room.'} accent={['vacant']} at={10} out={96} />
      {f >= 100 && f < 206 ? (
        <div style={{position: 'absolute', left: 980 / FZ, top: 170 / FZ, zoom: FZ, transform: `translateX(${(1 - formIn) * 200 - formOut * 120}px)`, opacity: Math.min(1, formIn * 1.6) * (1 - formOut)}}>
          <InquiryForm name={typed('Kaye Ordoñez', f, 114, 2)} phone={typed('0918 555 0142', f, 142, 1.4)} question={typed(QUESTION, f, 162, 0.2)}
            focus={f < 140 ? 'name' : f < 160 ? 'phone' : f < 180 ? 'question' : null} press={f >= 181 && f < 190 ? 1 : 0} />
        </div>
      ) : null}
      <Head size={100} text={'Just ask.\nNo sign-up.'} accent={['ask.']} at={108} out={190} />
      {f >= 186 && f < 216 ? (
        <div style={{position: 'absolute', left: lerp(1060, 1180, bubble), top: lerp(820, 330, bubble) - Math.sin(bubble * Math.PI) * 120, width: 440, transform: `scale(${lerp(1, 0.75, bubble)})`,
          background: C.brand, color: '#fff', borderRadius: '24px 24px 24px 6px', padding: '18px 22px', fontFamily: jakarta, fontSize: 19, lineHeight: 1.45, boxShadow: '0 20px 50px rgba(15,27,21,0.26)',
          opacity: 1 - t01(f, 208, 216)}}>
          {QUESTION.slice(0, 64)}…
        </div>
      ) : null}
      {f >= 200 ? (
        <div style={{position: 'absolute', left: 1020 / 1.25, top: 230 / 1.25, zoom: 1.25, borderRadius: 24, overflow: 'hidden', background: C.tile, boxShadow: '0 40px 90px rgba(15,27,21,0.12)',
          transform: `translateY(${(1 - listIn) * 60}px)`, opacity: Math.min(1, listIn * 1.6)}}>
          <div style={{height: newItem * 152, overflow: 'hidden'}}>
            <InquiryItem name="Kaye Ordoñez" when="Sep 29, 2026" unit="B3B" status="Waiting for an answer" tone="verify" active msg="Good day! Is the two-bedroom in the back apartment still available? Could we view it this…" />
          </div>
          <InquiryItem name="Luis Barrameda" when="Sep 26, 2026" unit="B3B" status="Answered" tone="neutral" msg="Hello, I start at Bicol University next month. How much is the monthly rate?" />
          <InquiryItem name="Mica Tolentino" when="Sep 21, 2026" unit="1G" status="Nothing came of it" tone="neutral" msg="Do you have a studio for one person?" />
        </div>
      ) : null}
      <Head size={100} text={'Straight to\nher Inquiries.'} accent={['Inquiries.']} at={204} />
      <Sfx at={6} name="air" vol={0.3} />
      <Sfx at={100} name="air" vol={0.3} />
      {[114, 120, 126, 142, 150, 166, 172].map((a, i) => <Sfx key={a} at={a} name={(['key1', 'key2', 'key3'] as const)[i % 3]} vol={0.07} />)}
      <Sfx at={180} name="soft-click" vol={0.5} />
      <Sfx at={188} name="air-short" vol={0.35} />
      <Sfx at={214} name="blip" vol={0.28} />
      <Sfx at={218} name="bell" vol={0.35} />
    </AbsoluteFill>
  );
};

