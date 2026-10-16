// Version G, "her desk": the reference's laptop in a dark room, and beside it the things the
// boarding house was run on, lying on the lacquered desk and lit only by the screen: a ring of
// keys, the USB drive, the invoice book with its pen, the cash, the phone the repairs came in on.
// The camera moves between them close, as a macro lens does, the screen soft behind. Then she
// opens Hivelet, and one by one each thing lifts off the desk and goes into the screen, which
// becomes the part of Hivelet that replaced it. At the end only the keys are left.
// 1920x1080, 60 fps.
import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Desk, Halo, Laptop, laptopEnv, ScreenLight, screenFrame, useStage} from '../objects/world';
import {Coin, InvoiceBook, Key, M, Phone, Usb, useCanvas} from '../objects/props';
import {ease, GROT, inOut, roundRect} from '../objects/draw';
import {Caption} from '../screen/kit';
import {LensRenderer} from './post';
import {drawScreen, screenGlow} from './screen';
import AT from './vo-at.json';
import LEN from './vo.json';
import SCRIPT from './script.json';

export const GW = 1920, GH = 1080, FPS = 60;
export const G_END = 56;
export const G_TOTAL = Math.round(G_END * FPS);
const OFF = 54.6;

type Id = keyof typeof AT;
// The camera's cuts: each part begins with its object lifting off the desk.
const C = {ledger: 21.0, invoice: 26.3, gcash: 29.6, repairs: 33.0, ask: 36.1, records: 40.1, secure: 43.75, quality: 45.85, close: 49.1};
// When each part of the screen begins: the moment its object reaches the glass, 0.8 s after
// it leaves the desk.
const S = {open: AT.open + 0.7, ledger: C.ledger + 1.3, invoice: C.invoice + 0.9, gcash: C.gcash + 0.9, repairs: C.repairs + 0.9, ask: C.ask, records: C.records, secure: C.secure, quality: C.quality, close: C.close};
const IN = {usb: S.ledger, book: S.invoice, coins: S.gcash, phone: S.repairs};
const PRESS = AT.gcash + 2.05; // "...and she verifies it"

const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sp = (t: number, at: number, cfg: {damping?: number; stiffness?: number} = {}) => spring({frame: (t - at) * FPS, fps: FPS, config: {damping: 14, stiffness: 140, mass: 1, ...cfg}});

// ---- What is on the desk ------------------------------------------------------------------------
// Positions on the desk (x, z) and the turn of each thing about the vertical.
const ON = {
  keys: {p: [-2.35, 1.6], r: 0.4, s: 0.13},
  usb: {p: [2.1, 1.45], r: 0.5, s: 0.15},
  book: {p: [-2.95, -0.1], r: 0.22, s: 0.3},
  coins: {p: [2.85, 0.3], r: 0, s: 0.12},
  phone: {p: [0.95, 2.4], r: -0.3, s: 0.3},
} as const;

// Lifts a thing off the desk at `leave` and carries it into the middle of the screen by `arrive`,
// shrinking as it goes through the glass. Returns null once it is in.
const flight = (t: number, leave: number, arrive: number, x: number, z: number) => {
  if (t < leave) return {pos: new THREE.Vector3(x, 0, z), k: 0, scale: 1};
  if (t >= arrive) return null;
  const k = inOut(seg(t, leave, arrive));
  const {centre, normal} = screenFrame(1);
  const end = centre.clone().add(normal.clone().multiplyScalar(0.02));
  const a = new THREE.Vector3(x, 0, z), c1 = new THREE.Vector3(x * 0.7, 1.1, z + 0.6), c2 = end.clone().add(normal.clone().multiplyScalar(1.2));
  const pos = new THREE.CubicBezierCurve3(a, c1, c2, end).getPoint(k);
  return {pos, k, scale: 1 - 0.85 * Math.pow(k, 2.2)};
};

// A ring of keys, fanned round a steel ring, lying flat.
const KEYS = Array.from({length: 9}, (_, i) => ({a: -0.2 + i * 0.36 + Math.sin(i * 7.3) * 0.08, brass: i % 3 !== 1}));
const Keyring: React.FC<{t: number}> = ({t}) => {
  const {p, r, s} = ON.keys;
  return (
    <group position={[p[0], 0.012, p[1]]} rotation={[-Math.PI / 2, 0, r]} scale={s}>
      <mesh material={M.steel} castShadow position={[0, 0, 0.1]}><torusGeometry args={[0.95, 0.07, 16, 72]} /></mesh>
      {KEYS.map(({a, brass}, i) => (
        <Key key={i} ring={false} mat={brass ? M.brass : M.steel} position={[Math.cos(a) * (0.95 + 1.77), Math.sin(a) * (0.95 + 1.77), 0.06 + i * 0.05]} rotation={[0.04 * Math.sin(i), 0.03 * Math.cos(i * 2), a]} />
      ))}
      {/* a slow glint: the keys catch the screen as it changes */}
      <group rotation={[0, 0, Math.sin(t * 0.2) * 0.002]} />
    </group>
  );
};

// A pen lying on the open book.
const PEN = new THREE.MeshPhysicalMaterial({color: '#121214', metalness: 0.2, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1});
const Pen: React.FC<{position: [number, number, number]; rotation: [number, number, number]}> = (props) => (
  <group {...props}>
    <mesh material={PEN} castShadow rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 4.6, 24]} /></mesh>
    <mesh material={M.steel} castShadow position={[2.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.13, 0.5, 24]} /></mesh>
    <mesh material={M.steel} castShadow position={[-1.6, 0.0, 0.15]}><boxGeometry args={[1.5, 0.08, 0.06]} /></mesh>
  </group>
);

// The chat on the phone, scrolling away as the repairs did.
const chat = (t: number) => (c: CanvasRenderingContext2D) => {
  const W = 540, H = 1146;
  c.fillStyle = '#0e0e10'; roundRect(c, 0, 0, W, H, 54); c.fill();
  const scroll = Math.max(0, t - (AT.chat + 0.6)) * 380;
  const msgs: [string, boolean][] = [['good morning po', true], ['the sink is leaking', true], ['again', true], ['ok I\'ll check', false], ['thank you po', true], ['the faucet in the', true], ['kitchen too', true], ['noted', false], ['hi po, the light', true], ['in the hallway', true], ['is out', true], ['ok', false]];
  c.save(); roundRect(c, 0, 0, W, H, 54); c.clip();
  msgs.forEach(([s, them], i) => {
    const y = 200 + i * 96 - scroll;
    if (y < -100 || y > H + 100) return;
    c.font = `500 36px ${GROT}`;
    const w = c.measureText(s).width + 56, x = them ? 30 : W - 30 - w;
    c.fillStyle = them ? '#2a2a2d' : '#2f6fe4'; roundRect(c, x, y, w, 76, 34); c.fill();
    c.fillStyle = '#fff'; c.fillText(s, x + 28, y + 51);
  });
  c.restore();
  c.fillStyle = '#0e0e10'; c.fillRect(0, 0, W, 150); c.fillStyle = '#f2f2f2'; c.font = `600 34px ${GROT}`; c.fillText('Messages', 40, 118);
};
const ChatPhone: React.FC<{t: number}> = ({t}) => {
  const tex = useCanvas(540, 1146, chat(t), Math.round(t * FPS));
  const {p, r, s} = ON.phone;
  const fl = flight(t, IN.phone - 0.8, IN.phone, p[0], p[1]);
  if (!fl) return null;
  const buzz = t > AT.chat && t < AT.chat + 0.5 ? Math.sin(t * 130) * 0.02 : 0;
  return <group position={fl.pos.clone().setY(fl.pos.y + 0.045)} rotation={[-Math.PI / 2 + fl.k * 1.2, 0, r + buzz + fl.k * 0.6]} scale={s * fl.scale}><Phone screen={tex} /></group>;
};

const Things: React.FC<{t: number}> = ({t}) => {
  const usb = flight(t, IN.usb - 0.8, IN.usb, ON.usb.p[0], ON.usb.p[1]);
  const book = flight(t, IN.book - 0.8, IN.book, ON.book.p[0], ON.book.p[1]);
  return (
    <>
      <Keyring t={t} />
      {usb ? <group position={usb.pos.clone().setY(usb.pos.y + 0.03)} rotation={[-Math.PI / 2 + usb.k * 1.4, 0, ON.usb.r + usb.k]} scale={ON.usb.s * usb.scale}><Usb /></group> : null}
      {book ? (
        <group position={book.pos} rotation={[-Math.PI / 2 + book.k * 1.3, 0, ON.book.r]} scale={ON.book.s * book.scale}>
          <InvoiceBook open={1} />
          <Pen position={[0.6, -0.3, 0.68]} rotation={[0, 0, 0.5]} />
        </group>
      ) : null}
      {[[0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3], [0, 0, 4], [1.9, 0.9, 0], [-1.3, 1.7, 0], [1.2, -1.6, 0]].map(([dx, dz, h], i) => {
        const fl = flight(t, IN.coins - 0.8 + i * 0.06, IN.coins + i * 0.06, ON.coins.p[0] + dx * ON.coins.s, ON.coins.p[1] + dz * ON.coins.s);
        if (!fl) return null;
        return <group key={i} position={fl.pos.clone().setY(fl.pos.y + 0.012 + h * 0.024)} rotation={[-Math.PI / 2 + fl.k * 2, 0, i]} scale={ON.coins.s * fl.scale}><Coin mat={i % 3 === 1 ? M.steel : M.brass} /></group>;
      })}
      <ChatPhone t={t} />
    </>
  );
};

// ---- The camera ---------------------------------------------------------------------------------
// Keys: [t, camera x, y, z, look x, y, z, aperture]. The lens focuses where it looks.
const K: number[][] = [
  [0, -1.45, 0.42, 3.05, -2.3, 0.05, 1.6, 0.035], [3.2, -1.2, 0.47, 2.85, -2.25, 0.05, 1.55, 0.035],
  [6.4, -0.9, 0.85, 3.9, -0.6, 0.55, 0.0, 0.02],
  [6.9, 2.8, 0.3, 2.5, 2.1, 0.05, 1.45, 0.03], [10.6, 2.65, 0.34, 2.35, 2.1, 0.05, 1.45, 0.03],
  [10.65, -2.0, 0.78, 1.3, -2.9, 0.02, -0.1, 0.028], [13.8, -1.9, 0.72, 1.15, -2.9, 0.02, -0.1, 0.028],
  [13.85, 3.5, 0.33, 1.3, 2.85, 0.04, 0.3, 0.035], [15.5, 3.4, 0.36, 1.2, 2.85, 0.04, 0.3, 0.035],
  [15.55, 1.35, 0.8, 3.6, 0.95, 0.02, 2.4, 0.03], [18.6, 1.3, 0.72, 3.4, 0.95, 0.02, 2.4, 0.03],
  [C.ledger, 0.0, 1.55, 6.6, 0.0, 0.75, 0.0, 0.008], [C.ledger + 1.3, 1.7, 1.15, 4.7, 0.35, 0.8, -0.6, 0.01], [C.invoice - 0.05, 1.4, 1.1, 4.5, 0.3, 0.85, -0.6, 0.01],
  [C.invoice, -1.75, 1.1, 4.4, -0.3, 0.8, -0.6, 0.01], [C.gcash - 0.05, -1.5, 1.05, 4.2, -0.25, 0.85, -0.6, 0.01],
  [C.gcash, 2.0, 1.0, 4.3, 0.3, 0.75, -0.4, 0.01], [C.repairs - 0.05, 1.7, 0.98, 4.1, 0.25, 0.8, -0.4, 0.01],
  [C.repairs, 0.6, 0.9, 4.7, 0.2, 0.72, 0.0, 0.012], [C.ask - 0.05, 0.45, 0.92, 4.4, 0.15, 0.78, -0.3, 0.012],
  [C.ask, 0.0, 1.0, 4.1, 0.0, 1.05, -1.2, 0.006], [C.records - 0.05, 0.0, 0.98, 3.55, 0.0, 1.05, -1.2, 0.006],
  [C.records, -1.3, 0.42, 5.3, 0.0, 0.7, 0.0, 0.012], [C.secure - 0.05, -0.6, 0.44, 5.2, 0.0, 0.7, 0.0, 0.012],
  [C.secure, 1.2, 0.5, 5.0, 0.0, 0.72, 0.0, 0.012], [C.quality - 0.05, 0.8, 0.5, 5.0, 0.0, 0.72, 0.0, 0.012],
  [C.quality, 0.0, 0.6, 4.8, 0.0, 0.8, 0.0, 0.012], [C.close - 0.05, 0.0, 0.66, 4.6, 0.0, 0.82, 0.0, 0.012],
  [C.close, -0.6, 0.95, 4.4, 0.0, 0.85, -0.3, 0.014], [G_END, -0.95, 1.25, 6.2, 0.0, 0.8, 0.0, 0.012],
];
// Between keys that are a hair apart the camera cuts; otherwise it glides.
const camAt = (t: number) => {
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  const k = inOut(seg(t, a[0], b[0]));
  const v = a.map((x, j) => lerp(x, b[j], k));
  const h = (f: number, p: number) => Math.sin(t * f + p) * 0.5 + Math.sin(t * f * 2.3 + p * 1.7) * 0.25;
  const pos = new THREE.Vector3(v[1] + h(0.5, 1) * 0.012, v[2] + h(0.7, 2) * 0.008, v[3] + h(0.4, 3) * 0.012);
  const look = new THREE.Vector3(v[4], v[5], v[6]);
  return {pos, look, aperture: v[7]};
};

// What metal on the desk reflects: a dark room with one bright soft panel where the screen is,
// a dimmer one above, and nothing else, so keys and coins catch the screen and stay dark elsewhere.
const roomEnv = () => {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050506');
  const panel = (w: number, h: number, pos: [number, number, number], i: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color('#fffaf2').multiplyScalar(i), side: THREE.DoubleSide}));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(6, 4, [0, 2.5, -6], 2.4);   // the screen
  panel(10, 10, [0, 9, 2], 0.25);   // the ceiling, faintly
  panel(3, 6, [8, 1, 4], 0.12);     // a window somewhere to the right
  return s;
};

const World: React.FC<{t: number}> = ({t}) => {
  const stage = useStage();
  const {camera, scene, gl} = useThree();
  React.useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(roomEnv(), 0.03).texture;
    scene.environmentIntensity = 0.7;
    laptopEnv(0.12);
  }, [gl, scene]);
  const {pos, look, aperture} = camAt(t);
  camera.position.copy(pos); camera.lookAt(look);
  const power = t < 0.15 ? 0.6 : 1 - ease(seg(t, OFF, OFF + 0.45));
  const [hex, lv0] = screenGlow(t, S);
  const glow = new THREE.Color(hex), lv = lv0 * power;
  return (
    <>
      <LensRenderer stage={stage} lens={{focus: pos.distanceTo(look), aperture}} drawBack={(c) => drawScreen(c, t, S, IN, PRESS)} />
      <Laptop screen={stage.rt.texture} dim={power} />
      <ScreenLight color={glow} level={lv * 1.15} />
      <Halo color={glow} level={lv} />
      <Desk glow={glow} level={lv} refl={0.3} />
      <Things t={t} />
      <hemisphereLight args={['#9fb0c8', '#000000', 0.04]} />
      {/* a faint fill from where the camera is, as a phone camera's own spill: things in front
          of the bright screen are not quite silhouettes */}
      <directionalLight position={pos.clone().add(new THREE.Vector3(0, 0.6, 0))} intensity={0.35} color="#dfe6ee" />
    </>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));
type Line = {id: string; text: string};
const ACCENT: Record<string, string[]> = {
  rooms: ['Thirty-three'], usb: ['USB'], book: ['paper'], cash: ['cash'], chat: ['chat'], open: ['Hivelet'], ledger: ['themselves'], invoice: ['repeats'],
  gcash: ['GCash'], repairs: ['done'], ask: ['No', 'account'], records: ['thirty-seven'], secure: ['A-plus'], quality: ['four', 'point', 'five', 'three'], close: ['Hivelet'],
};

export const DeskFilm: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = SCRIPT.lines as Line[];
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <ThreeCanvas width={GW} height={GH} shadows gl={{preserveDrawingBuffer: true, antialias: false, toneMapping: THREE.NeutralToneMapping}} camera={{fov: 30, near: 0.05, far: 100, position: [0, 1, 6]}}>
        <World t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('paper/tex/grain.png')})`, backgroundSize: '360px', backgroundPosition: `${(f * 137) % 360}px ${(f * 251) % 360}px`, mixBlendMode: 'screen', opacity: 0.05}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)'}} />
      {/* the voice, typed as subtitles in the dark under the desk */}
      {lines.map((l, i) => {
        const at = Math.round(AT[l.id as Id] * FPS), next = i + 1 < lines.length ? Math.round(AT[lines[i + 1].id as Id] * FPS) - 4 : Math.round((OFF - 0.6) * FPS);
        return <Caption key={l.id} text={l.text} at={at} dur={Math.max(0.4, LEN[l.id as Id] - 0.15)} out={next} dark accent={ACCENT[l.id] ?? []} x={96} y={954} size={34} width={1700} />;
      })}
      {lines.map((l) => (
        <Sequence key={l.id} from={Math.round(AT[l.id as Id] * FPS)} durationInFrames={Math.ceil((LEN[l.id as Id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`desk/vo/${l.id}.wav`)} />
        </Sequence>
      ))}
      {files.has('desk/score.wav') ? <Audio src={staticFile('desk/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
