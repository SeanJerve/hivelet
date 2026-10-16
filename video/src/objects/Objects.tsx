// Version F, "objects": the reference's laptop in a dark room, built in WebGL this time, and
// on its screen real things instead of drawings, the way the reference puts a brass magnifier
// or a cardboard box on a clean page. A brass key; the rack of thirty-three; the USB drive, the
// cash, the paper invoice book and the chat her business lived in; then Hivelet, and each part
// of it as an object: a ledger sheet that adds itself up, a phone that takes GCash, a spanner
// pushing a repair card to done, a paper dart for a stranger's question, a stack of 937 sheets,
// a padlock that shuts on A+, a gauge that stops at 4.53. 1080x1920, 60 fps.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Desk, Halo, Laptop, Renderer, ScreenLight, useStage, SW, SH} from './world';
import {Catcher, Coin, Face, Gauge, Hook, InvoiceBook, Key, M, Mark3D, PageLight, Padlock, PaperPlane, Phone, RBox, Sheet, Stack, Usb, useCanvas, Wrench} from './props';
import {BLUE, BRAND, caption, CHAR, clamp01, CORAL, ease, fill, GREEN, GROT, inOut, INK, label, leader, MONO, PAPER, roundRect, SERIF, text, WHITE} from './draw';
import AT from './vo-at.json';
import LEN from './vo.json';
import SCRIPT from './script.json';

export const FW = 1080, FH = 1920, FPS = 60;
export const F_END = 57.5;
export const F_TOTAL = Math.round(F_END * FPS);
const OFF = 56.1; // the screen goes dark

export type Id = keyof typeof AT;
export const LINE = Object.fromEntries(SCRIPT.lines.map((l) => [l.id, l.text])) as Record<Id, string>;

// ---- The scenes on the screen, back to back ------------------------------------------------------
export const SCENES = [
  ['key', 0], ['rack', 3.45], ['usb', 9.75], ['cash', 12.25], ['book', 13.85], ['chat', 15.95], ['talk', 18.05], ['no', 20.7],
  ['built', 22.4], ['ledger', 24.8], ['pay', 28.8], ['repair', 32.3], ['ask', 35.4], ['records', 40.3], ['secure', 44.4], ['quality', 47.0], ['close', 50.8],
] as const;
export type Scene = typeof SCENES[number][0];
export const sceneAt = (t: number): Scene => { let s: Scene = 'key'; for (const [id, at] of SCENES) if (t >= at) s = id; return s; };

export const BG: Record<Scene, string> = {
  key: PAPER, rack: PAPER, usb: CHAR, cash: PAPER, book: PAPER, chat: PAPER, talk: PAPER, no: '#101010', built: PAPER,
  ledger: PAPER, pay: CHAR, repair: PAPER, ask: CHAR, records: BLUE, secure: CORAL, quality: PAPER, close: PAPER,
};
export const DARK = new Set<Scene>(['usb', 'no', 'pay', 'ask']);
export const GREEN_DEEP = '#17603f';

// Captions: the line being spoken stays typed on the page until the next one starts.
export const ACCENT: Partial<Record<Id, string[]>> = {
  key: ['key'], rack: ['thirty-three'], out: ['Thirty-two'], usb: ['this'], cash: ['cash'], book: ['paper'], chat: ['chat'],
  talk: ['talk'], built: ['Hivelet'], ledger: ['adds', 'itself', 'up'], pay: ['GCash'], repair: ['done'], ask: ['No', 'account'],
  records: ['Nine', 'hundred', 'thirty-seven'], secure: ['A-plus'], quality: ['four', 'point', 'five', 'three'], close: ['Hivelet'],
};
export const IDS = Object.keys(AT) as Id[];
export const lineAt = (t: number): Id | null => { let s: Id | null = null; for (const id of IDS) if (t >= AT[id] - 0.05) s = id; return s; };

// ---- Motion helpers --------------------------------------------------------------------------------
export const sp = (t: number, at: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: (t - at) * FPS, fps: FPS, config: {damping: 14, stiffness: 140, mass: 1, ...cfg}});
// A drop onto the page from height h, landing with a small bounce.
export const drop = (t: number, at: number, h = 8) => (t < at ? h : h * (1 - sp(t, at, {damping: 9, stiffness: 120})));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const rnd = (i: number) => { const x = Math.sin(i * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };

// =====================================================================================================
// The page's objects, scene by scene
// =====================================================================================================
export const KeyScene: React.FC<{t: number}> = ({t}) => (
  <Key position={[0.4, 0.55, 0.25 + drop(t, 0.85, 9)]} rotation={[0, 0, lerp(-1.4, -0.32, sp(t, 0.85, {damping: 20})) + (t - 0.85) * 0.03]} scale={1.55} />
);

// Thirty-three hooks in three rows, a key on each; then thirty-two are taken.
const RACK = Array.from({length: 33}, (_, i) => ({col: i % 11, row: Math.floor(i / 11)}));
const STAYS = 16; // the middle of the middle row
const LEAVE = (() => { const order = RACK.map((_, i) => i).filter((i) => i !== STAYS).sort((a, b) => rnd(a) - rnd(b)); return Object.fromEntries(order.map((k, j) => [k, j])); })();
const hookAt = (i: number): [number, number] => [-5.4 + RACK[i].col * 1.08, 3.35 - RACK[i].row * 2.18];
const Board: React.FC = () => {
  const grain = useCanvas(1024, 600, (c) => {
    c.fillStyle = '#6a4529'; c.fillRect(0, 0, 1024, 600);
    for (let k = 0; k < 140; k++) {
      const y = rnd(k) * 600, a = 0.05 + rnd(k + 300) * 0.12;
      c.strokeStyle = rnd(k + 7) > 0.5 ? `rgba(40,22,10,${a})` : `rgba(160,110,70,${a})`;
      c.lineWidth = 1 + rnd(k + 9) * 3;
      c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) c.lineTo(x, y + Math.sin(x / 140 + k) * 6 * rnd(k + 2));
      c.stroke();
    }
  });
  return (
    <group position={[0, 0.45, 0.2]}>
      <RBox size={[12.7, 7.4, 0.4]} r={0.12} mat={M.wood} />
      <Face w={12.5} h={7.2} tex={grain} position={[0, 0, 0.201]} rough={0.6} />
    </group>
  );
};
export const RackScene: React.FC<{t: number}> = ({t}) => (
  <group>
    <Board />
    {RACK.map((_, i) => {
      const [hx, hy] = hookAt(i);
      const at = 3.55 + i * 0.04;
      const z0 = drop(t, at, 4);
      const go = i === STAYS ? 0 : ease(seg(t, 7.2 + LEAVE[i] * 0.042, 7.75 + LEAVE[i] * 0.042));
      if (t < at - 0.02) return <Hook key={i} position={[hx, hy, 0.62]} />;
      return (
        <group key={i}>
          <Hook position={[hx, hy, 0.62]} />
          {go < 1 ? (
            <Key position={[hx + go * (rnd(i) - 0.5) * 3, hy - 0.93 + go * 12, 0.75 + z0 + go * 3]} rotation={[go * 0.8, 0, -Math.PI / 2 + (rnd(i + 5) - 0.5) * 0.12 + go * (rnd(i + 9) - 0.5) * 2]} scale={0.42} />
          ) : null}
        </group>
      );
    })}
  </group>
);

export const UsbScene: React.FC<{t: number}> = ({t}) => (
  <Usb position={[0.2, 0.5, 0.3 + drop(t, 9.85, 9)]} rotation={[0, 0, lerp(0.6, -0.22, sp(t, 9.85, {damping: 20}))]} scale={1.7} />
);

const COINS = [[-3.2, 1.6, 1.15, 0], [-0.6, 2.3, 1.0, 1], [1.9, 1.2, 1.2, 0], [4.3, 2.0, 0.95, 1], [-4.6, -1.0, 1.0, 1], [-1.6, -0.6, 1.25, 0], [1.0, -1.4, 1.0, 1], [3.6, -0.6, 1.1, 0], [5.6, 0.3, 0.9, 1]] as const;
export const CashScene: React.FC<{t: number}> = ({t}) => (
  <group>
    {COINS.map(([x, y, r, gold], i) => {
      const at = 12.3 + i * 0.07;
      const k = sp(t, at, {damping: 8, stiffness: 160});
      return <Coin key={i} mat={gold ? M.brass : M.steel} r={r} position={[x, y, 0.1 * r + (t < at ? 9 : 9 * (1 - k))]} rotation={[(1 - k) * (rnd(i) - 0.5) * 2.4, (1 - k) * (rnd(i + 4) - 0.5) * 2.4, rnd(i + 2) * 6]} />;
    })}
  </group>
);

export const BookScene: React.FC<{t: number}> = ({t}) => (
  <InvoiceBook position={[0.9, 0.55, drop(t, 13.9, 6)]} rotation={[0, 0, -0.07]} scale={1.22} open={inOut(seg(t, 14.25, 14.95))} />
);

// The phone's screens: a chat, then Hivelet's tenant view.
const chatScreen = (t: number) => (c: CanvasRenderingContext2D) => {
  const W = 540, H = 1146;
  c.fillStyle = '#0e0e10'; roundRect(c, 0, 0, W, H, 54); c.fill();
  c.fillStyle = '#f2f2f2'; c.font = `600 34px ${GROT}`; c.fillText('Messages', 40, 118);
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, 150, W, 2);
  const bubbles: [number, string, boolean][] = [[16.0, 'good evening po', true], [16.55, 'the sink is leaking', true], [16.75, 'again', true], [17.4, 'ok, I\'ll check', false]];
  let y = 230;
  bubbles.forEach(([at, s, them]) => {
    if (t < at) return;
    const p = ease(seg(t, at, at + 0.25));
    c.font = `500 36px ${GROT}`;
    const w = c.measureText(s).width + 56;
    const x = them ? 30 : W - 30 - w;
    c.globalAlpha = p;
    c.fillStyle = them ? '#2a2a2d' : '#2f6fe4'; roundRect(c, x, y + (1 - p) * 20, w, 76, 34); c.fill();
    c.fillStyle = '#fff'; c.fillText(s, x + 28, y + 51 + (1 - p) * 20);
    c.globalAlpha = 1;
    y += 96;
  });
};
const payScreen = (t: number) => (c: CanvasRenderingContext2D) => {
  const W = 540, H = 1146;
  const paid = t >= 31.25;
  c.fillStyle = '#f6f5f1'; roundRect(c, 0, 0, W, H, 54); c.fill();
  c.fillStyle = '#17603f'; c.font = `700 34px ${BRAND}`; c.fillText('Hivelet', 44, 112);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = `500 24px ${GROT}`; c.fillText('Good evening', 44, 196);
  // the rent card
  // after paying, the payment waits for the owner to verify it (4.2.4): it changes nothing on
  // the bill until she does, so the phone says so rather than "paid"
  c.fillStyle = paid ? '#ffffff' : '#17603f'; roundRect(c, 32, 236, W - 64, 420, 36); c.fill();
  c.fillStyle = paid ? '#17603f' : 'rgba(255,255,255,0.7)'; c.font = `500 26px ${GROT}`; c.fillText(paid ? 'Sent with GCash' : 'Rent due', 68, 300);
  c.fillStyle = paid ? '#111' : '#fff'; c.font = `700 72px ${GROT}`; c.fillText('₱4,500.00', 66, 390);
  c.fillStyle = paid ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'; c.font = `500 24px ${GROT}`; c.fillText(paid ? 'October rent · just now' : 'October rent', 68, 436);
  if (!paid) {
    const press = seg(t, 30.95, 31.15);
    c.fillStyle = '#ffffff'; roundRect(c, 68, 500, W - 136, 100, 50); c.fill();
    c.fillStyle = '#17603f'; c.font = `700 32px ${GROT}`; c.textAlign = 'center'; c.fillText('Pay with GCash', W / 2, 562); c.textAlign = 'left';
    if (press > 0) { c.fillStyle = `rgba(23,96,63,${0.35 * (1 - press)})`; c.beginPath(); c.arc(W / 2, 550, 40 + press * 220, 0, Math.PI * 2); c.fill(); }
  } else {
    const p = ease(seg(t, 31.25, 31.6));
    c.globalAlpha = p;
    c.fillStyle = '#fbefd6'; roundRect(c, 68, 500, 400, 64, 32); c.fill();
    c.fillStyle = '#8a5a00'; c.font = `600 26px ${GROT}`; c.fillText('Pending verification', 96, 542);
    c.globalAlpha = 1;
  }
  c.fillStyle = '#ffffff'; roundRect(c, 32, 690, W - 64, 150, 30); c.fill();
  c.fillStyle = '#111'; c.font = `600 26px ${GROT}`; c.fillText('Repairs', 66, 752);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = `500 22px ${GROT}`; c.fillText('Report something that needs fixing', 66, 796);
};
const PhoneOn: React.FC<{t: number; draw: (t: number) => (c: CanvasRenderingContext2D) => void; buzz?: number} & Omit<React.ComponentProps<typeof Phone>, 'screen'>> = ({t, draw, buzz, ...rest}) => {
  const tex = useCanvas(540, 1146, draw(t), Math.round(t * FPS));
  const b = buzz !== undefined && t > buzz && t < buzz + 0.45 ? Math.sin((t - buzz) * 120) * 0.03 : 0;
  return <Phone {...rest} screen={tex} rotation={[0, 0, ((rest.rotation as number[] | undefined)?.[2] ?? 0) + b]} />;
};
export const ChatScene: React.FC<{t: number}> = ({t}) => (
  <PhoneOn t={t} draw={chatScreen} buzz={16.55} position={[0.4, 0.45, 0.16 + drop(t, 15.98, 7)]} rotation={[0, 0, 0.1]} scale={1.22} />
);

export const TalkScene: React.FC<{t: number}> = ({t}) => (
  <group>
    <Usb position={[-4.3, 2.4, 0.3 + drop(t, 18.08, 6)]} rotation={[0, 0, -0.18]} scale={0.95} />
    {[[3.6, 2.6, 0], [4.9, 2.0, 1], [4.4, 3.3, 1]].map(([x, y, g], i) => <Coin key={i} mat={g ? M.brass : M.steel} position={[x, y, 0.1 + drop(t, 18.14 + i * 0.04, 6)]} rotation={[0, 0, i]} />)}
    <InvoiceBook position={[-4.0, -1.6, drop(t, 18.2, 6)]} rotation={[0, 0, 0.06]} scale={0.62} open={1} />
    <PhoneOn t={17.9} draw={chatScreen} position={[4.3, -1.3, 0.16 + drop(t, 18.26, 6)]} rotation={[0, 0, -0.12]} scale={0.6} />
  </group>
);

export const BuiltScene: React.FC<{t: number}> = ({t}) => (
  <Mark3D position={[-3.2, 0.55, 0.1 + drop(t, 22.55, 10)]} rotation={[0, 0, lerp(-0.5, 0, sp(t, 22.55, {damping: 16}))]} scale={1.05} />
);

const ledgerSheet = (t: number) => (c: CanvasRenderingContext2D) => {
  const W = 1200, H = 1560;
  c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#111'; c.font = `700 54px ${GROT}`; c.fillText('Monthly Income Report', 80, 150);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = `500 30px ${MONO}`; c.fillText('October 2026', 80, 205);
  const cols = [80, 330, 640, 1120];
  c.font = `600 26px ${MONO}`; c.fillStyle = 'rgba(0,0,0,0.55)';
  ['Date', 'Paid via', 'Rent', 'Received'].forEach((h, i) => { c.textAlign = i >= 2 ? 'right' : 'left'; c.fillText(h, i === 2 ? 860 : cols[i], 300); });
  c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(80, 326); c.lineTo(1120, 326); c.stroke();
  const rows: [string, string, number][] = [['Oct 01', 'GCash', 4500], ['Oct 01', 'Cash', 4700], ['Oct 02', 'GCash', 3800], ['Oct 02', 'GCash', 4500], ['Oct 03', 'Cash', 4200], ['Oct 03', 'GCash', 4500], ['Oct 04', 'GCash', 4700], ['Oct 05', 'GCash', 3800]];
  let sum = 0;
  const fmt = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 2});
  rows.forEach(([d, via, amt], i) => {
    const at = 25.15 + i * 0.27;
    if (t < at) return;
    sum += amt;
    const y = 400 + i * 100, p = ease(seg(t, at, at + 0.2));
    c.globalAlpha = p;
    c.textAlign = 'left'; c.font = `500 34px ${MONO}`; c.fillStyle = '#111'; c.fillText(d, 80, y);
    c.fillStyle = via === 'GCash' ? '#1f6fd6' : '#555'; c.fillText(via, 330, y);
    c.textAlign = 'right'; c.fillStyle = '#111'; c.fillText(fmt(amt), 860, y); c.fillText(fmt(amt), 1120, y);
    c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 2; c.beginPath(); c.moveTo(80, y + 34); c.lineTo(1120, y + 34); c.stroke();
    c.globalAlpha = 1;
  });
  // the total adds itself up as the voice says so
  const total = rows.reduce((a, r) => a + r[2], 0);
  const k = seg(t, 27.4, 28.25);
  if (t >= 27.3) {
    const y = 400 + rows.length * 100 + 40;
    c.fillStyle = `rgba(31,154,98,${0.14 * ease(seg(t, 27.3, 27.6))})`; c.fillRect(70, y - 66, 1060, 100);
    c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(80, y - 66); c.lineTo(1120, y - 66); c.stroke();
    c.textAlign = 'left'; c.font = `700 36px ${MONO}`; c.fillStyle = '#111'; c.fillText('Total', 80, y);
    c.textAlign = 'right'; c.fillStyle = '#17603f'; c.fillText(fmt(Math.round(total * ease(k) / 100) * 100), 1120, y);
  }
  c.textAlign = 'left';
  void sum;
};
export const LedgerScene: React.FC<{t: number}> = ({t}) => {
  const tex = useCanvas(1200, 1560, ledgerSheet(t), Math.round(t * FPS));
  return <Sheet w={6.3} h={8.19} tex={tex} position={[0.3, 0.35, 0.05 + drop(t, 24.85, 5)]} rotation={[0, 0, lerp(0.25, 0.035, sp(t, 24.85, {damping: 22}))]} />;
};

export const PayScene: React.FC<{t: number}> = ({t}) => {
  const ck = sp(t, 30.35, {damping: 12, stiffness: 150});
  const sink = ease(seg(t, 30.85, 31.1));
  return (
    <group>
      <PhoneOn t={t} draw={payScreen} position={[0.4, 0.5, 0.16 + drop(t, 28.85, 7)]} rotation={[0, 0, -0.06]} scale={1.12} />
      {t > 30.35 && sink < 1 ? <Coin mat={M.steel} position={[0.55, -0.6, 0.6 + 8 * (1 - ck)]} rotation={[0.3 * (1 - ck), 0, 1]} r={0.85 * (1 - sink)} /> : null}
    </group>
  );
};

const repairCard = (done: boolean) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 720, 420);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = `500 26px ${MONO}`; c.fillText('REPAIR', 44, 70);
  c.fillStyle = '#111'; c.font = `700 44px ${GROT}`; c.fillText('Kitchen faucet', 44, 160); c.fillText('keeps dripping', 44, 214);
  c.fillStyle = done ? '#1f9a62' : '#efe9dc'; roundRect(c, 44, 290, done ? 170 : 240, 64, 32); c.fill();
  c.fillStyle = done ? '#fff' : '#6b5a2e'; c.font = `600 28px ${GROT}`; c.fillText(done ? 'Done ✓' : 'Requested', 70, 332);
};
export const RepairScene: React.FC<{t: number}> = ({t}) => {
  const done = t >= 34.55;
  const tex = useCanvas(720, 420, repairCard(done), done);
  const x = lerp(lerp(-5.2, 0, inOut(seg(t, 33.0, 33.55))), 5.2, inOut(seg(t, 33.9, 34.5)));
  const wx = x - 3.95 + (t < 32.75 ? -8 : t < 33.0 ? -8 * (1 - ease(seg(t, 32.75, 33.0))) : 0) - (t > 34.55 ? 9 * ease(seg(t, 34.6, 35.1)) : 0);
  const wobble = Math.sin(t * 9) * 0.03;
  return (
    <group>
      <group position={[x, 0.2, 0.05 + drop(t, 32.35, 5)]}>
        <RBox size={[3.7, 2.2, 0.06]} r={0.03} mat={M.paper} position={[0, 0, 0.03]} />
        <Face w={3.6} h={2.1} tex={tex} position={[0, 0, 0.065]} />
      </group>
      <Wrench position={[wx, 0.05, 0.1]} rotation={[0, 0, Math.PI + wobble]} scale={0.62} />
    </group>
  );
};

export const AskScene: React.FC<{t: number}> = ({t}) => {
  const k = inOut(seg(t, 35.55, 37.0));
  const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(-12, 7, 5), new THREE.Vector3(-6, 6, 4), new THREE.Vector3(-2, -1, 2), new THREE.Vector3(0.6, 0.6, 0.45));
  const p = curve.getPoint(k), d = curve.getTangent(Math.min(0.999, k));
  const settle = ease(seg(t, 37.0, 37.5));
  return (
    <PaperPlane position={[p.x + settle * 0.3, p.y - settle * 0.1, p.z]} rotation={[Math.sin(k * Math.PI) * 0.5, -0.15 * (1 - settle), Math.atan2(d.y, d.x) * (1 - settle) + settle * 0.35]} scale={1.5} />
  );
};

export const RecordsScene: React.FC<{t: number}> = ({t}) => {
  const n = Math.round(937 * ease(seg(t, 40.45, 42.1)));
  return <Stack n={Math.max(1, n)} max={937} drop={t < 42.1 ? 0.3 : 0.3 * (1 - ease(seg(t, 42.1, 42.4)))} position={[3.1, -0.4, 0]} rotation={[0, 0, -0.12]} />;
};

export const SecureScene: React.FC<{t: number}> = ({t}) => {
  const face = useCanvas(512, 420, (c) => {
    c.fillStyle = 'rgba(70,45,10,0.92)'; c.font = `800 250px ${GROT}`; c.textAlign = 'center'; c.fillText('A+', 256, 270);
    c.beginPath(); c.arc(256, 345, 26, 0, Math.PI * 2); c.fill(); c.fillRect(246, 345, 20, 52);
  });
  const shut = t < 46.15 ? 0 : sp(t, 46.15, {damping: 11, stiffness: 400});
  return <Padlock shut={shut} face={face} position={[0.3, -0.1, drop(t, 44.45, 7)]} rotation={[0, 0, lerp(0.3, -0.06, sp(t, 44.45, {damping: 20}))]} scale={1.55} />;
};

export const QualityScene: React.FC<{t: number}> = ({t}) => {
  const dial = useCanvas(1024, 1024, (c) => {
    c.fillStyle = '#f7f6f1'; c.beginPath(); c.arc(512, 512, 506, 0, Math.PI * 2); c.fill();
    const ang = (v: number) => THREE.MathUtils.degToRad(-(210 - (v / 5) * 240));
    // the band for "Very High Quality", 4.21 to 5
    c.strokeStyle = '#1f9a62'; c.lineWidth = 30; c.beginPath(); c.arc(512, 512, 400, ang(4.21), ang(5)); c.stroke();
    for (let i = 0; i <= 50; i++) {
      const v = i / 10, a = ang(v), big = i % 10 === 0, r0 = big ? 340 : 368;
      c.strokeStyle = '#141414'; c.lineWidth = big ? 6 : 2.5;
      c.beginPath(); c.moveTo(512 + Math.cos(a) * r0, 512 + Math.sin(a) * r0); c.lineTo(512 + Math.cos(a) * 386, 512 + Math.sin(a) * 386); c.stroke();
      if (big) { c.fillStyle = '#141414'; c.font = `600 54px ${GROT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(v), 512 + Math.cos(a) * 280, 512 + Math.sin(a) * 280); }
    }
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.font = `500 30px ${MONO}`; c.textAlign = 'center'; c.fillText('ISO/IEC 25010', 512, 700);
  });
  const v = t < 48.15 ? 0 : 4.53 * sp(t, 48.15, {damping: 13, stiffness: 60});
  return <Gauge value={v} dial={dial} position={[-3.3, 0.45, drop(t, 47.05, 6)]} scale={1.1} />;
};

export const CloseScene: React.FC<{t: number}> = ({t}) => (
  <group>
    <Mark3D position={[-4.6, 1.25, 0.1 + drop(t, 50.85, 10)]} rotation={[0, 0, lerp(-0.5, 0, sp(t, 50.85, {damping: 16}))]} scale={0.8} />
    {t > 51.75 ? <Key position={[-4.5, -2.0, 0.25 + drop(t, 51.8, 9)]} rotation={[0, 0, lerp(-1.4, -0.3, sp(t, 51.8, {damping: 20}))]} scale={0.7} /> : null}
  </group>
);

// =====================================================================================================
// The page's flat layers
// =====================================================================================================
const back = (c: CanvasRenderingContext2D, t: number, s: Scene) => {
  fill(c, BG[s]);
  if (s === 'talk') {
    // the four places, joined by lines that do not hold
    const pts: [number, number][] = [[330, 260], [1270, 250], [340, 680], [1280, 650]];
    const pairs = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3], [1, 2]];
    c.save(); c.setLineDash([10, 12]); c.strokeStyle = 'rgba(20,20,20,0.35)'; c.lineWidth = 3;
    pairs.forEach(([a, b], i) => {
      const p = ease(seg(t, 18.5 + i * 0.08, 18.9 + i * 0.08));
      c.beginPath(); c.moveTo(...pts[a]); c.lineTo(pts[a][0] + (pts[b][0] - pts[a][0]) * p, pts[a][1] + (pts[b][1] - pts[a][1]) * p); c.stroke();
    });
    c.setLineDash([]);
    pairs.forEach(([a, b], i) => {
      const k = ease(seg(t, 19.45 + i * 0.07, 19.65 + i * 0.07));
      if (k <= 0) return;
      const mx = (pts[a][0] + pts[b][0]) / 2, my = (pts[a][1] + pts[b][1]) / 2, r = 18 * k;
      c.fillStyle = BG.talk; c.beginPath(); c.arc(mx, my, 30 * k, 0, Math.PI * 2); c.fill();
      c.strokeStyle = CORAL; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(mx - r, my - r); c.lineTo(mx + r, my + r); c.moveTo(mx + r, my - r); c.lineTo(mx - r, my + r); c.stroke();
    });
    c.restore();
  }
  if (s === 'no') {
    const p = ease(seg(t, 20.8, 21.2));
    c.save(); c.filter = `blur(${(1 - p) * 14}px)`; c.globalAlpha = p;
    text(c, 'No.', SW / 2, 610, `italic 400 380px ${SERIF}`, WHITE, {align: 'center'});
    c.restore();
  }
  if (s === 'built') {
    const k = ease(seg(t, 23.2, 23.85));
    if (k > 0) { c.fillStyle = GREEN_DEEP; c.beginPath(); c.arc(530, 470, k * 1900, 0, Math.PI * 2); c.fill(); }
    if (t > 23.45) text(c, 'Hivelet', 760, 560, `800 190px ${BRAND}`, WHITE, {ls: -6, alpha: ease(seg(t, 23.45, 23.8))});
  }
  if (s === 'repair') {
    ['Requested', 'In progress', 'Done'].forEach((h, i) => {
      const x = 160 + i * 513;
      text(c, h.toUpperCase(), x, 190, `600 30px ${MONO}`, i === 2 && t > 34.55 ? GREEN : 'rgba(20,20,20,0.5)', {ls: 2});
      if (i > 0) { c.fillStyle = 'rgba(20,20,20,0.12)'; c.fillRect(x - 60, 150, 2, 640); }
    });
  }
  if (s === 'records') {
    const n = Math.round(937 * ease(seg(t, 40.45, 42.1)));
    text(c, String(n), 110, 560, `800 300px ${GROT}`, WHITE, {ls: -14});
    text(c, 'of her real records, moved in', 120, 640, `500 30px ${MONO}`, 'rgba(255,255,255,0.75)');
  }
  if (s === 'secure' && t > 46.3) {
    text(c, 'Qualys SSL Labs · Mozilla Observatory · securityheaders.com', SW / 2, 820, `500 24px ${MONO}`, 'rgba(255,255,255,0.85)', {align: 'center', alpha: ease(seg(t, 46.3, 46.7))});
  }
  if (s === 'quality' && t > 48.3) {
    const a = ease(seg(t, 48.3, 48.8));
    text(c, '4.53', 1010, 520, `italic 400 300px ${SERIF}`, INK, {alpha: a});
    text(c, 'out of 5 · Very High Quality', 1020, 600, `500 28px ${MONO}`, 'rgba(20,20,20,0.6)', {alpha: a});
  }
  if (s === 'close') {
    if (t > 51.0) text(c, 'Hivelet', 640, 520, `800 210px ${BRAND}`, INK, {ls: -7, alpha: ease(seg(t, 51.0, 51.4))});
  }
};

type ToPx = (x: number, y: number, z: number) => [number, number];
const front = (c: CanvasRenderingContext2D, t: number, s: Scene, toPx: ToPx) => {
  const dark = DARK.has(s) || (s === 'built' && t > 23.4) || s === 'records' || s === 'secure';
  const L: Record<Scene, [string, string]> = {
    key: ['01', 'a key'], rack: ['02', 'thirty-three rooms'], usb: ['03', 'her books'], cash: ['04', 'rent'], book: ['05', 'invoices'], chat: ['06', 'repairs'],
    talk: ['07', 'four places'], no: ['', ''], built: ['08', 'hivelet'], ledger: ['09', 'ledger'], pay: ['10', 'pay'], repair: ['11', 'repairs'], ask: ['12', 'inquiries'],
    records: ['13', 'records'], secure: ['14', 'security'], quality: ['15', 'quality'], close: ['16', 'hivelet'],
  };
  if (L[s][0]) label(c, L[s][0], L[s][1], dark);
  // labels pointing at things
  const lead = (p: [number, number], dx: number, dy: number, note: string, k: number, dark = false) => leader(c, p[0], p[1], p[0] + dx, p[1] + dy, note, k, dark);
  if (s === 'rack') lead(toPx(0.2, -0.2, 0.8), 230, 120, '1 vacant', seg(t, 8.95, 9.6));
  if (s === 'usb') lead(toPx(1.1, 1.25, 0.7), 200, -150, 'the only copy.', seg(t, 11.35, 12.1), true);
  if (s === 'ask') lead(toPx(0.9, 0.5, 0.5), 220, 170, 'no account needed.', seg(t, 38.65, 39.6), true);
  if (s === 'close' && t > 52.9) {
    // the pill: the address, typed
    const url = 'hivelet.vercel.app', n = Math.round(clamp01((t - 53.2) / 0.9) * url.length), a = ease(seg(t, 52.9, 53.2));
    c.save(); c.globalAlpha = a;
    c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,0.12)'; c.shadowBlur = 24; c.shadowOffsetY = 6; roundRect(c, 650, 600, 520, 84, 42); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = GREEN; c.beginPath(); c.arc(694, 642, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = INK; c.font = `500 30px ${MONO}`; c.fillText(url.slice(0, n), 724, 652);
    if (n < url.length || Math.floor(t * 2.5) % 2 === 0) { const w = c.measureText(url.slice(0, n)).width; c.fillStyle = GREEN; c.fillRect(728 + w, 628, 16, 32); }
    c.restore();
    if (t > 54.4) {
      const k = ease(seg(t, 54.4, 54.8));
      text(c, 'Group 4 · Bicol University · IT 124 Capstone Project 2', 650, 740, `500 22px ${MONO}`, 'rgba(20,20,20,0.55)', {alpha: k});
      text(c, 'Lloyd · Sean · Eljohn · Vince · Kiel', 650, 776, `600 22px ${MONO}`, 'rgba(20,20,20,0.75)', {alpha: k});
    }
  }
  // the caption: the line being spoken
  const id = lineAt(t);
  if (id && id !== 'no' && !(s === 'close' && t > 54.2)) caption(c, t, LINE[id], AT[id], Math.max(0.4, LEN[id] - 0.15), {dark, accent: ACCENT[id], color: s === 'secure' || s === 'records' || (s === 'built' && t > 23.4) ? WHITE : GREEN});
};

// The room's light follows the screen.
const glowOf = (s: Scene, t: number): [THREE.Color, number] => {
  if (s === 'built' && t > 23.3) return [new THREE.Color(GREEN_DEEP).lerp(new THREE.Color('#ffffff'), 0.25), 0.85];
  if (s === 'records') return [new THREE.Color(BLUE).lerp(new THREE.Color('#ffffff'), 0.15), 0.8];
  if (s === 'secure') return [new THREE.Color(CORAL).lerp(new THREE.Color('#ffffff'), 0.1), 0.9];
  if (s === 'usb' || s === 'ask') return [new THREE.Color('#d9d9d9'), 0.3];
  if (s === 'pay') return [new THREE.Color('#e4ece6'), 0.45];
  if (s === 'no') return [new THREE.Color('#ffffff'), 0.14];
  return [new THREE.Color('#f1efe8'), 1];
};

// =====================================================================================================
// The room: camera, screen power, everything together
// =====================================================================================================
// Camera keys: [t, x, y, z, lookX, lookY]
const K: [number, number, number, number, number, number][] = [
  [0, -0.3, 1.0, 8.6, 0.03, 0.8], [3.4, -0.45, 0.85, 7.3, 0.03, 0.74], [9.7, -0.25, 0.8, 7.1, 0.03, 0.74], [18.0, 0.25, 0.78, 7.1, 0.0, 0.74],
  [20.6, 0.05, 0.62, 6.6, 0.0, 0.86], [22.6, 0.0, 0.64, 6.6, 0.0, 0.86], [24.4, -0.7, 1.1, 8.4, 0.08, 0.68], [28.8, -0.35, 0.86, 7.2, 0.04, 0.74],
  [35.4, 0.35, 0.8, 7.1, 0.0, 0.74], [40.3, -0.8, 0.95, 8.0, 0.08, 0.68], [47.0, 0.8, 0.95, 8.0, -0.08, 0.68], [50.8, 0.0, 0.85, 7.6, 0.0, 0.74], [57.5, 0.0, 0.8, 7.0, 0.0, 0.76],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const [a, b] = [K[i], K[i + 1]];
  const k = inOut(seg(t, a[0], b[0]));
  const v = a.map((x, j) => lerp(x, b[j], k));
  // a hand holding the camera: slow, small, never still
  const h = (f: number, p: number) => Math.sin(t * f + p) * 0.5 + Math.sin(t * f * 2.3 + p * 1.7) * 0.25;
  return {pos: new THREE.Vector3(v[1] + h(0.5, 1) * 0.05, v[2] + h(0.7, 2) * 0.025, v[3] + h(0.4, 3) * 0.05), look: new THREE.Vector3(v[4] + h(0.6, 4) * 0.02, v[5] + h(0.5, 5) * 0.015, 0)};
};

const pageCam = (cam: THREE.PerspectiveCamera, s: Scene, t: number) => {
  cam.up.set(0, 1, 0);
  if (s === 'records') { cam.position.set(1.5, -13.5, 20.5); cam.lookAt(1.2, 0.6, 1.4); return; }
  if (s === 'secure') { cam.position.set(0, -5, 25.5); cam.lookAt(0, 0.3, 0); return; }
  if (s === 'book') { const k = ease(seg(t, 13.85, 15.95)); cam.position.set(0, 0, lerp(22, 20, k)); cam.lookAt(0, 0, 0); return; }
  const z: Partial<Record<Scene, number>> = {ledger: 19.2, pay: 18.5, chat: 18, usb: 20, repair: 19.5, ask: 20, key: 21, cash: 21};
  cam.position.set(0, 0, z[s] ?? 22); cam.lookAt(0, 0, 0);
};

const World: React.FC<{t: number}> = ({t}) => {
  const stage = useStage();
  const {camera} = useThree();
  const s = sceneAt(t);
  const {pos, look} = camAt(t);
  camera.position.copy(pos); camera.lookAt(look);
  pageCam(stage.cam, s, t);
  stage.cam.updateMatrixWorld();
  const toPx: ToPx = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(stage.cam); return [(v.x + 1) / 2 * SW, (1 - v.y) / 2 * SH]; };
  // the screen wakes at the start and goes dark at the end
  const power = t < 0.2 ? 0 : t < 0.55 ? ease(seg(t, 0.2, 0.55)) * (0.85 + 0.15 * Math.sin(t * 80)) : 1 - ease(seg(t, OFF, OFF + 0.45));
  const [glow, level] = glowOf(s, t);
  const lv = level * power;
  return (
    <>
      <Renderer stage={stage} drawBack={(c) => back(c, t, s)} drawFront={(c) => front(c, t, s, toPx)}>
        <PageLight intensity={s === 'no' ? 0.4 : 2.2} />
        <Catcher opacity={BG[s] === PAPER ? 0.3 : 0.38} />
        {s === 'key' ? <KeyScene t={t} /> : null}
        {s === 'rack' ? <RackScene t={t} /> : null}
        {s === 'usb' ? <UsbScene t={t} /> : null}
        {s === 'cash' ? <CashScene t={t} /> : null}
        {s === 'book' ? <BookScene t={t} /> : null}
        {s === 'chat' ? <ChatScene t={t} /> : null}
        {s === 'talk' ? <TalkScene t={t} /> : null}
        {s === 'built' ? <BuiltScene t={t} /> : null}
        {s === 'ledger' ? <LedgerScene t={t} /> : null}
        {s === 'pay' ? <PayScene t={t} /> : null}
        {s === 'repair' ? <RepairScene t={t} /> : null}
        {s === 'ask' ? <AskScene t={t} /> : null}
        {s === 'records' ? <RecordsScene t={t} /> : null}
        {s === 'secure' ? <SecureScene t={t} /> : null}
        {s === 'quality' ? <QualityScene t={t} /> : null}
        {s === 'close' ? <CloseScene t={t} /> : null}
      </Renderer>
      <Laptop screen={stage.rt.texture} dim={power * 0.9} />
      <ScreenLight color={glow} level={lv} />
      <Halo color={glow} level={lv} />
      <Desk glow={glow} level={lv} />
      <ambientLight intensity={0.015} />
    </>
  );
};

// The score is written by capture/objects-score.mjs; the film plays without it until then.
const files = new Set(getStaticFiles().map((x) => x.name));

export const Objects: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <ThreeCanvas width={FW} height={FH} shadows gl={{preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping}} camera={{fov: 38, near: 0.1, far: 200, position: [0, 1, 10]}}>
        <World t={t} />
      </ThreeCanvas>
      {/* film grain and a soft vignette, as a phone camera in a dark room sees it */}
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('paper/tex/grain.png')})`, backgroundSize: '360px', backgroundPosition: `${(f * 137) % 360}px ${(f * 251) % 360}px`, mixBlendMode: 'screen', opacity: 0.05}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 60% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
      {IDS.map((id) => (
        <Sequence key={id} from={Math.round(AT[id] * FPS)} durationInFrames={Math.ceil((LEN[id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`objects/vo/${id}.wav`)} />
        </Sequence>
      ))}
      {files.has('objects/score.wav') ? <Audio src={staticFile('objects/score.wav')} /> : null}
    </AbsoluteFill>
  );
};

