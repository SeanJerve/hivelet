// Version K: the receipt, full frame and landscape. A thermal printer on a dark lacquered desk
// prints the boarding house's story row by row as the voice reaches it (version H's receipt,
// its rows and its timing). Nothing else is in the picture: behind the printer the dark holds a
// soft, far-off glow that takes the story's colour (green when Hivelet arrives, blue for the
// records, coral for security, green again for quality). The receipt is torn off and the film
// ends on a full-frame card. 1920x1080, 60 fps.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Desk} from '../objects/world';
import {clamp01, ease, inOut} from '../objects/draw';
import {FONT} from '../screen/kit';
import {LensRenderer} from '../desk/post';
import {useStage} from '../objects/world';
import {Paper, Printer, TEAR} from './ReceiptFilm';
import {HEX_PATH} from '../ui/Kit';
import AT from './vo-at.json';
import LEN from './vo.json';

export const KW = 1920, KH = 1080, FPS = 60;
export const K_END = 54.5;
export const K_TOTAL = Math.round(K_END * FPS);
type Id = keyof typeof AT;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const CARD = TEAR + 1.6; // the end card

// The far glow: [from, colour, strength]
const GLOW: [number, string, number][] = [
  [0, '#cfd6e0', 0.35], [AT.now + 0.35, '#2fd07f', 1.0], [AT.ledger + 1.0, '#9fe3be', 0.45], [AT.proof + 0.5, '#4f74ff', 0.9],
  [AT.proof + 3.0, '#ff7a5c', 0.95], [AT.proof + 4.9, '#2fd07f', 0.85], [AT.total, '#e9ecef', 0.5],
];
const glowAt = (t: number): [THREE.Color, number] => {
  let i = 0; while (i < GLOW.length - 1 && t >= GLOW[i + 1][0]) i++;
  const [a, ca, la] = GLOW[i];
  const prev = GLOW[Math.max(0, i - 1)];
  const k = ease(seg(t, a, a + 0.5));
  return [new THREE.Color(prev[1]).lerp(new THREE.Color(ca), k), lerp(prev[2], la, k)];
};

// [t, camera x, y, z, look x, y, z, focus x, y, z, aperture]
const RD = (t: number, x = 0): number[] => [t, x, 1.72, -0.5, 0.0, 0.62, 1.15, 0.0, 0.8, 0.82, 0.024];
const WIDE = (t: number, x: number): number[] => [t, x, 1.2, -1.95, -0.12 * Math.sign(x), 0.42, 2.3, 0.0, 0.75, 0.75, 0.026];
const K: number[][] = [
  WIDE(0, 1.3), WIDE(3.0, 1.0),
  RD(3.8, -0.1), RD(10.6, 0.1), RD(16.5, -0.08), RD(22.9, 0.1),
  WIDE(23.6, -1.2), WIDE(25.1, -1.0),
  RD(25.7, 0.1), RD(36.5, -0.1), RD(45.0, 0.08), RD(TEAR, 0.0),
  [TEAR + 0.9, 0.0, 2.6, -0.6, 0.0, 0.0, 1.7, 0.0, 0.1, 1.5, 0.02], [K_END, 0.0, 2.7, -0.6, 0.0, 0.0, 1.7, 0.0, 0.1, 1.5, 0.02],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = inOut(seg(t, a[0], b[0]));
  const v = a.map((x, j) => lerp(x, b[j], k));
  const h = (f: number, p: number) => Math.sin(t * f + p) * 0.5 + Math.sin(t * f * 2.3 + p * 1.7) * 0.25;
  return {pos: new THREE.Vector3(v[1] + h(0.5, 1) * 0.012, v[2] + h(0.7, 2) * 0.008, v[3] + h(0.4, 3) * 0.01), look: new THREE.Vector3(v[4], v[5], v[6]), fp: new THREE.Vector3(v[7], v[8], v[9]), aperture: v[10]};
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
  }, [gl, scene]);
  const lamp = useMemo(() => {
    const l = new THREE.SpotLight('#ffe2bf', 14, 9, 0.55, 0.8, 1.6);
    l.position.set(-2.2, 3.4, 0.4); l.target.position.set(0, 0, 1.2);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004;
    return l;
  }, []);
  const [gc, gl0] = glowAt(t);
  // the far glow: a soft haze of light well behind the printer, round and edgeless, so it reads
  // as light in the room and never as a screen
  const panel = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(0.7, 'rgba(255,255,255,0.1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false});
  }, []);
  panel.color.copy(gc).multiplyScalar(gl0 * 0.9);
  const rim = useMemo(() => new THREE.PointLight('#ffffff', 0, 14, 1.6), []);
  rim.color.copy(gc); rim.intensity = 6 * gl0; rim.position.set(0, 2.2, 7);
  const {pos, look, fp, aperture} = camAt(t);
  camera.position.copy(pos); camera.lookAt(look);
  return (
    <>
      <LensRenderer stage={stage} lens={{focus: pos.distanceTo(fp), aperture}} drawBack={(c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 4, 4); }} />
      <sprite material={panel} position={[0.4, 1.4, 10]} scale={[13, 9, 1]} />
      <primitive object={rim} />
      <Desk glow={gc} level={0} refl={0.32} />
      <Printer t={t} />
      <Paper t={t} />
      <primitive object={lamp} />
      <primitive object={lamp.target} />
      <hemisphereLight args={['#9fb0c8', '#000000', 0.05]} />
    </>
  );
};

// The end card, full frame.
const Card: React.FC<{t: number}> = ({t}) => {
  const a = ease(seg(t, CARD, CARD + 0.6));
  if (a <= 0) return null;
  const url = 'hivelet.vercel.app', n = Math.round(clamp01((t - CARD - 1.3) / 0.9) * url.length);
  const mono = (size: number, color: string, w = 500): React.CSSProperties => ({fontFamily: FONT.mono, fontSize: size, fontWeight: w, color});
  return (
    <AbsoluteFill style={{background: '#ebeae5', opacity: a, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 34, transform: `translateY(${(1 - a) * 20}px)`}}>
        <svg width={170} height={170} viewBox="0 0 512 512"><path d={HEX_PATH} fill="#1f9a62" /><path d="M146 216 L256 126 L366 216 M186 244 V366 M326 244 V366 M186 304 H326" fill="none" stroke="#fff" strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 190, letterSpacing: '-0.035em', color: '#141414'}}>Hivelet</div>
      </div>
      <div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 74, color: '#141414', marginTop: 18, opacity: ease(seg(t, CARD + 0.6, CARD + 1.0))}}>Keep the receipt.</div>
      <div style={{marginTop: 48, display: 'inline-flex', alignItems: 'center', gap: 18, padding: '22px 36px', borderRadius: 60, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', opacity: ease(seg(t, CARD + 1.0, CARD + 1.3)), ...mono(34, '#141414')}}>
        <span style={{width: 18, height: 18, borderRadius: 9, background: '#1f9a62'}} />{url.slice(0, n)}
        <span style={{display: 'inline-block', width: 18, height: 36, background: '#1f9a62', opacity: n < url.length || Math.floor(t * 2.5) % 2 === 0 ? 1 : 0, marginLeft: -12}} />
      </div>
      <div style={{marginTop: 44, textAlign: 'center', opacity: ease(seg(t, CARD + 2.4, CARD + 2.8))}}>
        <div style={mono(26, 'rgba(20,20,20,0.55)')}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
        <div style={{...mono(26, 'rgba(20,20,20,0.78)', 600), marginTop: 10}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
      </div>
    </AbsoluteFill>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));

export const ReceiptWide: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ids = Object.keys(AT) as Id[];
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <ThreeCanvas width={KW} height={KH} shadows gl={{preserveDrawingBuffer: true, antialias: false, toneMapping: THREE.NeutralToneMapping}} camera={{fov: 30, near: 0.05, far: 100, position: [0, 2, -1]}}>
        <World t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)'}} />
      <Card t={t} />
      <AbsoluteFill style={{background: '#000', opacity: ease(seg(t, K_END - 0.8, K_END - 0.1))}} />
      {ids.map((id) => (
        <Sequence key={id} from={Math.round(AT[id] * FPS)} durationInFrames={Math.ceil((LEN[id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`receipt/vo/${id}.wav`)} />
        </Sequence>
      ))}
      {files.has('receipt/score.wav') ? <Audio src={staticFile('receipt/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
