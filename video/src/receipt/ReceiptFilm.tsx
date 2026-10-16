// Version H, "the receipt": a thermal printer on the lacquered desk prints the story of the
// boarding house as a receipt, line by line as the voice says it: the place, what it ran on
// before, what Hivelet replaced each thing with, the proof, and a total. The paper curls out of
// the slot and runs across the desk toward her laptop, which glows at the far end, soft. At the
// end the receipt is torn off and the lens racks focus to the laptop's screen. The reference's
// mono caption, typed with the voice, becomes the print itself. 1080x1920, 60 fps.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Desk, Halo, Laptop, laptopEnv, ScreenLight, useStage} from '../objects/world';
import {M, RBox, useCanvas} from '../objects/props';
import {BRAND, clamp01, ease, inOut, MONO, roundRect, SERIF, text} from '../objects/draw';
import {HEX_PATH} from '../ui/Kit';
import {LensRenderer} from '../desk/post';
import AT from './vo-at.json';
import LEN from './vo.json';

export const HW = 1080, HH = 1920, FPS = 60;
export const H_END = 53.5;
export const H_TOTAL = Math.round(H_END * FPS);
type Id = keyof typeof AT;

const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---- The receipt -------------------------------------------------------------------------------
// [time it prints, left, right, style]. Times are the words in the voice they belong to.
type Row = [number, string, string, ('big' | 'bold' | 'rule' | 'double' | 'center' | 'tick')?];
const R: Row[] = [
  [AT.intro + 0.1, 'RECEIPT', '', 'big'],
  [AT.intro + 1.1, 'for running a boarding house', '', 'center'],
  [AT.intro + 1.6, '', '', 'rule'],
  [AT.place + 0.3, 'FE GALANG DA SILVA', '', 'bold'],
  [AT.place + 1.2, 'BOARDING HOUSE', '', 'bold'],
  [AT.place + 2.4, 'Legazpi City', '', undefined],
  [AT.place + 3.9, 'Units', '33', undefined],
  [AT.place + 4.95, 'Lived in', '32', undefined],
  [AT.place + 5.6, '', '', 'rule'],
  [AT.before + 0.05, 'BEFORE', '', 'bold'],
  [AT.before + 0.8, 'Income & expenses', 'USB drive', undefined],
  [AT.before + 4.0, 'Copies', '1', undefined],
  [AT.pieces + 0.1, 'Invoices', 'paper book', undefined],
  [AT.pieces + 1.75, 'Rent', 'cash', undefined],
  [AT.pieces + 3.0, 'Repairs', 'chat', undefined],
  [AT.pieces + 4.2, 'Inquiries', 'no record', undefined],
  [AT.pieces + 5.0, '', '', 'rule'],
  [AT.now + 0.4, 'NOW: HIVELET', '', 'bold'],
  [AT.ledger + 0.15, 'Ledger', 'her layout', 'tick'],
  [AT.ledger + 2.05, 'Invoice numbers', 'checked', 'tick'],
  [AT.online + 0.1, 'GCash', 'verified by her', 'tick'],
  [AT.online + 2.2, 'Repairs', 'request > done', 'tick'],
  [AT.online + 4.1, 'Inquiries', 'no account', 'tick'],
  [AT.online + 5.3, '', '', 'rule'],
  [AT.proof + 0.6, 'Records moved in', '937', undefined],
  [AT.proof + 3.1, 'Security', 'A+', undefined],
  [AT.proof + 5.0, 'Quality', '4.53 / 5.00', undefined],
  [AT.proof + 7.0, '', '', 'double'],
  [AT.total + 0.1, 'TOTAL', '1 SYSTEM', 'big'],
  [AT.total + 1.0, '', '', 'rule'],
  [AT.close + 0.3, 'hivelet.vercel.app', '', 'center'],
  [AT.close + 0.6, 'Thank you!', '', 'center'],
];
const TEAR = AT.close + 1.15;
// Paper geometry: 0.86 wide; each row 0.092 long; a margin before the first row.
const PW = 0.86, ROW = 0.092, LEAD = 0.16, CPX = 1024, ROWPX = Math.round(ROW / PW * CPX), CH = Math.ceil((LEAD + (R.length + 3) * ROW) / PW * CPX);
const rowH = (r: Row) => (r[3] === 'big' ? 1.5 : 1);
const rowTop = R.reduce<number[]>((a, r, i) => { a.push(i === 0 ? LEAD : a[i - 1] + rowH(R[i - 1]) * ROW); return a; }, []);
// How much paper has come out at time t: each row feeds in 0.16 s as it prints.
const printed = (t: number) => {
  let L = 0.06;
  R.forEach((r, i) => { if (t >= r[0]) L = rowTop[i] + rowH(r) * ROW * ease(seg(t, r[0], r[0] + 0.16)); });
  return L + 0.05;
};
const linesOut = (t: number) => R.filter((r) => t >= r[0]).length;

const drawReceipt = (n: number) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = '#f7f6f2'; c.fillRect(0, 0, CPX, CH);
  // the faint grain of thermal paper
  for (let i = 0; i < 1400; i++) { const x = (Math.sin(i * 91.3) * 0.5 + 0.5) * CPX, y = (Math.sin(i * 47.1 + 3) * 0.5 + 0.5) * CH; c.fillStyle = `rgba(0,0,0,${0.015 + (i % 5) * 0.004})`; c.fillRect(x, y, 2, 2); }
  const px = (u: number) => Math.round(u / PW * CPX);
  const mx = 70, rx = CPX - 70;
  R.slice(0, n).forEach((r, i) => {
    const [, l, rt, st] = r;
    const y = px(rowTop[i]) + Math.round(ROWPX * rowH(r) * 0.72);
    c.fillStyle = '#1b1b1d';
    if (st === 'rule' || st === 'double') {
      c.font = `500 46px ${MONO}`; c.textAlign = 'left';
      const dash = st === 'double' ? '='.repeat(32) : '-'.repeat(32);
      c.fillText(dash, mx, y - 6);
      return;
    }
    if (st === 'big') {
      c.font = `800 92px ${MONO}`;
      if (rt) { c.textAlign = 'left'; c.fillText(l, mx, y); c.textAlign = 'right'; c.font = `800 78px ${MONO}`; c.fillText(rt, rx, y); }
      else { c.textAlign = 'center'; c.fillText(l, CPX / 2, y); }
      c.textAlign = 'left';
      return;
    }
    if (st === 'center') { c.font = `500 44px ${MONO}`; c.textAlign = 'center'; c.fillText(l, CPX / 2, y); c.textAlign = 'left'; return; }
    c.font = `${st === 'bold' ? 800 : 500} 46px ${MONO}`; c.textAlign = 'left'; c.fillText(l, mx, y);
    if (rt) {
      c.textAlign = 'right';
      c.fillText(rt + (st === 'tick' ? ' *' : ''), rx, y);
      c.textAlign = 'left';
    }
  });
};

// The paper's shape: out of the slot heading up and forward, curling over under its own weight
// to the desk, then lying flat. A short stub is stiffer and stands straighter.
const SLOT = new THREE.Vector3(0, 0.82, 0.58);
const profile = (L: number, tear: number) => {
  const N = 140, pts: THREE.Vector3[] = [];
  const R0 = 0.32 + Math.max(0, 0.7 - L) * 0.9;
  let y = SLOT.y, z = SLOT.z, th = THREE.MathUtils.degToRad(28), flat = false;
  const ds = L / N;
  for (let i = 0; i <= N; i++) {
    pts.push(new THREE.Vector3(0, y, z));
    if (!flat) {
      th = Math.max(THREE.MathUtils.degToRad(-72), th - ds / R0);
      y += Math.sin(th) * ds; z += Math.cos(th) * ds;
      if (y <= 0.004) { y = 0.004; flat = true; }
    } else { z += ds; }
  }
  // torn off: the whole strip settles onto the desk and slides a little forward
  if (tear > 0) {
    const zFlat = pts.map((_, i) => SLOT.z + 0.35 + i * ds);
    pts.forEach((p, i) => { p.y = lerp(p.y, 0.004, tear); p.z = lerp(p.z, zFlat[i] + 0.25 * tear, tear); });
  }
  return pts;
};

const Paper: React.FC<{t: number}> = ({t}) => {
  const n = linesOut(t);
  const tex = useCanvas(CPX, CH, drawReceipt(n), n);
  const tear = t < TEAR ? 0 : ease(seg(t, TEAR, TEAR + 0.7));
  const L = printed(Math.min(t, TEAR));
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 140, W = 9;
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((N + 1) * W * 3), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((N + 1) * W * 2), 2));
    const idx: number[] = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < W - 1; j++) { const a = i * W + j, b = a + W; idx.push(a, a + 1, b, b, a + 1, b + 1); } // printed side up
    g.setIndex(idx);
    return g;
  }, []);
  const pts = profile(L, tear);
  const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  const N = 140, W = 9, Ltot = CH / CPX * PW;
  for (let i = 0; i <= N; i++) {
    const p = pts[i], s = (i / N) * L;
    // the paper's normal in the y-z plane, for the curl across its width
    const q = pts[Math.min(N, i + 1)], o = pts[Math.max(0, i - 1)];
    const dz = q.z - o.z, dy = q.y - o.y, len = Math.hypot(dz, dy) || 1;
    const ny = dz / len, nz = -dy / len;
    for (let j = 0; j < W; j++) {
      // the camera looks along +z from behind the printer, so its right is world -x
      const u = j / (W - 1), x = (0.5 - u) * PW;
      const lift = 0.025 * Math.pow((u - 0.5) * 2, 2); // thermal paper wants to roll back up
      pos.setXYZ(i * W + j, x, p.y + ny * lift, p.z + nz * lift);
      uv.setXY(i * W + j, u, 1 - (L - s) / Ltot);
    }
  }
  pos.needsUpdate = true; uv.needsUpdate = true;
  geo.computeVertexNormals();
  const mat = useMemo(() => new THREE.MeshStandardMaterial({map: tex, roughness: 0.75, metalness: 0, side: THREE.FrontSide}), [tex]);
  const back = useMemo(() => new THREE.MeshStandardMaterial({color: '#efede6', roughness: 0.8, metalness: 0, side: THREE.BackSide}), []);
  return (
    <>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      <mesh geometry={geo} material={back} />
    </>
  );
};

// A receipt printer: charcoal body, a lid seam, the slot at the top front, a green light.
const Printer: React.FC<{t: number}> = ({t}) => {
  const busy = R.some((r) => t >= r[0] && t < r[0] + 0.18);
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({color: '#2a2b2e', roughness: 0.55, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.5}), []);
  const led = useMemo(() => new THREE.MeshBasicMaterial({color: '#39d98a'}), []);
  led.color.set(busy && Math.floor(t * 20) % 2 ? '#a8ffd2' : '#39d98a');
  return (
    <group>
      <RBox size={[1.3, 0.8, 1.5]} r={0.12} mat={body} position={[0, 0.4, -0.12]} />
      <RBox size={[1.24, 0.08, 0.95]} r={0.04} mat={body} position={[0, 0.82, -0.35]} />
      <mesh material={M.dark} position={[0, 0.805, 0.52]}><boxGeometry args={[0.98, 0.04, 0.06]} /></mesh>
      <mesh material={M.steel} position={[0, 0.83, 0.6]} rotation={[0.5, 0, 0]}><boxGeometry args={[1.0, 0.015, 0.05]} /></mesh>
      <mesh material={led} position={[0.5, 0.62, 0.635]}><sphereGeometry args={[0.022, 16, 16]} /></mesh>
    </group>
  );
};

// ---- The laptop's screen, far off ----------------------------------------------------------------
const mark = (c: CanvasRenderingContext2D, x: number, y: number, size: number, hex: string, line: string) => {
  c.save(); c.translate(x, y); c.scale(size / 512, size / 512);
  c.fillStyle = hex; c.fill(new Path2D(HEX_PATH));
  c.strokeStyle = line; c.lineWidth = 36; c.lineCap = 'round'; c.lineJoin = 'round';
  c.stroke(new Path2D('M146 216 L256 126 L366 216 M186 244 V366 M326 244 V366 M186 304 H326'));
  c.restore();
};
const screen = (t: number) => (c: CanvasRenderingContext2D) => {
  const W = 1600, H = 1000;
  if (t < AT.now + 0.35) {
    // her spreadsheet, as it was
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.fillStyle = '#1f6e43'; c.fillRect(0, 0, W, 64);
    c.strokeStyle = '#dcdcdc'; c.lineWidth = 2;
    for (let y = 110; y < H; y += 44) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let x = 60; x < W; x += 180) { c.beginPath(); c.moveTo(x, 64); c.lineTo(x, H); c.stroke(); }
    return;
  }
  if (t < AT.ledger) {
    const k = ease(seg(t, AT.now + 0.35, AT.now + 0.9));
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#17603f'; c.beginPath(); c.arc(W / 2, H / 2, k * 1000, 0, Math.PI * 2); c.fill();
    if (k > 0.5) { mark(c, 470, 400, 200, '#ffffff', '#17603f'); text(c, 'Hivelet', 700, 548, `800 170px ${BRAND}`, '#fff', {ls: -6}); }
    return;
  }
  if (t < AT.close - 0.2) {
    // the app, out of focus: a white page, a green sidebar mark, rows
    c.fillStyle = '#f4f3ef'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 300, H);
    mark(c, 40, 44, 56, '#1f9a62', '#ffffff');
    c.fillStyle = '#ffffff'; roundRect(c, 370, 220, 1180, 700, 24); c.fill();
    for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(410, 290 + i * 66, 700, 14); c.fillStyle = i % 3 ? 'rgba(0,0,0,0.12)' : '#1f9a62'; c.fillRect(1300, 290 + i * 66, 200, 14); }
    c.fillStyle = '#17603f'; c.fillRect(370, 120, 420, 40);
    return;
  }
  // the end card, which the lens finds after the tear
  c.fillStyle = '#f4f3ef'; c.fillRect(0, 0, W, H);
  mark(c, 420, 250, 170, '#1f9a62', '#ffffff');
  text(c, 'Hivelet', 620, 382, `800 160px ${BRAND}`, '#141414', {ls: -6});
  text(c, 'Keep the receipt.', W / 2, 520, `italic 400 64px ${SERIF}`, '#141414', {align: 'center'});
  c.fillStyle = '#ffffff'; roundRect(c, 540, 590, 520, 84, 42); c.fill();
  c.fillStyle = '#1f9a62'; c.beginPath(); c.arc(586, 632, 12, 0, Math.PI * 2); c.fill();
  text(c, 'hivelet.vercel.app', 616, 642, `500 30px ${MONO}`, '#141414');
  text(c, 'Group 4 · Bicol University · IT 124 Capstone Project 2', W / 2, 790, `500 22px ${MONO}`, 'rgba(20,20,20,0.55)', {align: 'center'});
  text(c, 'Lloyd · Sean · Eljohn · Vince · Kiel', W / 2, 828, `600 22px ${MONO}`, 'rgba(20,20,20,0.75)', {align: 'center'});
};
const glowAt = (t: number): [string, number] => (t >= AT.now + 0.35 && t < AT.ledger ? ['#2f7a55', 0.9] : ['#f3f2ee', 1]);

// ---- The camera: behind the printer, looking down the paper toward the laptop -------------------
// [t, x, y, z, look x, y, z, focus target z, aperture]
// [t, camera x, y, z, look x, y, z, focus point x, y, z, aperture]
// Reading: above and behind the printer, on the slot, where each new line comes out.
const RD = (t: number, x = 0): number[] => [t, x, 2.75, -1.3, 0.0, 0.42, 1.5, 0.0, 0.8, 0.85, 0.028];
// Wide: low, the printer in front, the paper running off to her laptop, focused on the laptop.
const WIDE = (t: number, x: number): number[] => [t, x, 1.45, -1.9, 0.0, 0.55, 4.0, 0.0, 1.1, 6.6, 0.022];
const K: number[][] = [
  WIDE(0, 0.55), WIDE(2.9, 0.35),
  RD(3.8, -0.12), RD(10.6, 0.1), RD(16.5, -0.08), RD(22.6, 0.12),
  WIDE(23.4, -0.8), WIDE(25.0, -0.6),
  RD(25.6, 0.1), RD(36.5, -0.1), RD(45.0, 0.08), RD(TEAR + 0.2, 0.0),
  [TEAR + 1.5, 0.0, 1.25, -0.6, 0.0, 0.95, 5.6, 0.0, 1.1, 6.6, 0.02], [H_END, 0.0, 1.18, -0.2, 0.0, 0.98, 5.6, 0.0, 1.1, 6.6, 0.02],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = inOut(seg(t, a[0], b[0]));
  const v = a.map((x, j) => lerp(x, b[j], k));
  const h = (f: number, p: number) => Math.sin(t * f + p) * 0.5 + Math.sin(t * f * 2.3 + p * 1.7) * 0.25;
  return {pos: new THREE.Vector3(v[1] + h(0.5, 1) * 0.015, v[2] + h(0.7, 2) * 0.01, v[3] + h(0.4, 3) * 0.012), look: new THREE.Vector3(v[4], v[5], v[6]), fp: new THREE.Vector3(v[7], v[8], v[9]), aperture: v[10]};
};

const World: React.FC<{t: number}> = ({t}) => {
  const stage = useStage();
  const {camera, scene, gl} = useThree();
  useMemo(() => {
    const s = new THREE.Scene(); s.background = new THREE.Color('#050506');
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({color: new THREE.Color('#fff6e8').multiplyScalar(1.4), side: THREE.DoubleSide}));
    p.position.set(-3, 6, -2); p.lookAt(0, 0, 0); s.add(p);
    scene.environment = new THREE.PMREMGenerator(gl).fromScene(s, 0.03).texture;
    scene.environmentIntensity = 0.5;
    laptopEnv(0.1);
  }, [gl, scene]);
  const lamp = useMemo(() => {
    const l = new THREE.SpotLight('#ffe2bf', 14, 9, 0.55, 0.8, 1.6);
    l.position.set(-2.2, 3.4, 0.4); l.target.position.set(0, 0, 1.2);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004;
    return l;
  }, []);
  const {pos, look, fp, aperture} = camAt(t);
  camera.position.copy(pos); camera.lookAt(look);
  const focus = pos.distanceTo(fp);
  const off = 1 - ease(seg(t, H_END - 0.9, H_END - 0.3));
  const [hex, lv0] = glowAt(t);
  const glow = new THREE.Color(hex), lv = lv0 * off;
  return (
    <>
      <LensRenderer stage={stage} lens={{focus, aperture}} drawBack={screen(t)} />
      <group position={[0, 0, 6.0]} rotation={[0, Math.PI, 0]}>
        <Laptop screen={stage.rt.texture} dim={off} />
        <ScreenLight color={glow} level={lv * 1.6} />
        <Halo color={glow} level={lv} />
      </group>
      <Desk glow={glow} level={0} refl={0.3} />
      <Printer t={t} />
      <Paper t={t} />
      {/* a desk lamp off to the left: a warm pool on the printer and the paper */}
      <primitive object={lamp} />
      <primitive object={lamp.target} />
      <hemisphereLight args={['#9fb0c8', '#000000', 0.05]} />
    </>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));

export const ReceiptFilm: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ids = Object.keys(AT) as Id[];
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <ThreeCanvas width={HW} height={HH} shadows gl={{preserveDrawingBuffer: true, antialias: false, toneMapping: THREE.NeutralToneMapping}} camera={{fov: 38, near: 0.05, far: 100, position: [0, 2, -1]}}>
        <World t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('paper/tex/grain.png')})`, backgroundSize: '360px', backgroundPosition: `${(f * 137) % 360}px ${(f * 251) % 360}px`, mixBlendMode: 'screen', opacity: 0.05}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 65% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
      {ids.map((id) => (
        <Sequence key={id} from={Math.round(AT[id] * FPS)} durationInFrames={Math.ceil((LEN[id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`receipt/vo/${id}.wav`)} />
        </Sequence>
      ))}
      {files.has('receipt/score.wav') ? <Audio src={staticFile('receipt/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
