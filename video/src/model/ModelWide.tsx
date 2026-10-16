// Version L: the model, full frame and landscape, with no laptop. The white card model of her
// building (version I's) stands on a dark desk; 32 of its 33 windows light. Before Hivelet, grey
// threads reach out of the rooms and break off. Then Hivelet arrives as an object, the enamel
// mark standing on the desk, and every room is joined to it by a thread of light. What runs along
// the threads is named in small editorial labels: rent through GCash waiting for her to verify
// it, a repair from request to done, a stranger's question with no account. The proof cuts to
// full-colour pages, as the reference cuts to its colour screens, and the film ends on a card.
// Version I's voice and timing. 1920x1080, 60 fps.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Desk, useStage} from '../objects/world';
import {M, Mark3D, Usb} from '../objects/props';
import {clamp01, ease, inOut} from '../objects/draw';
import {Caption, FONT} from '../screen/kit';
import {LensRenderer} from '../desk/post';
import {HEX_PATH} from '../ui/Kit';
import {Building, glowTex, LEAK, ThreadShader, unitAnchor, VACANT} from './ModelFilm';
import AT from './vo-at.json';
import LEN from './vo.json';
import SCRIPT from './script.json';

export const LW = 1920, LH = 1080, FPS = 60;
export const L_END = 50.5;
export const L_TOTAL = Math.round(L_END * FPS);
type Id = keyof typeof AT;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// The colour pages for the proof, and the end card.
const PAGES: [number, number, 'records' | 'secure' | 'quality' | 'card'][] = [
  [AT.records - 0.15, AT.proof - 0.15, 'records'], [AT.proof - 0.15, AT.proof + 1.75, 'secure'], [AT.proof + 1.75, AT.close - 0.3, 'quality'], [AT.close + 2.2, L_END, 'card'],
];
const pageAt = (t: number) => PAGES.find(([a, b]) => t >= a && t < b);

// ---- Hivelet on the desk: the enamel mark, standing, joined to every room ------------------------
const HUB = new THREE.Vector3(0.6, 0.0, 0.55);
const HUB_IN = new THREE.Vector3(0.6, 0.62, 0.62); // where the threads arrive, the mark's face
const curveFor = (i: number) => {
  const {p, n} = unitAnchor(i);
  return new THREE.CubicBezierCurve3(p.clone().add(n.clone().multiplyScalar(0.03)), p.clone().add(n.clone().multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.5, 0)), HUB_IN.clone().add(new THREE.Vector3(-0.9, 0.7, 0.3)), HUB_IN);
};
const CURVES = Array.from({length: 33}, (_, i) => curveFor(i));
const HUB_AT = AT.connect - 0.05;

const Hub: React.FC<{t: number}> = ({t}) => {
  const glow = useMemo(() => new THREE.SpriteMaterial({map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}), []);
  if (t < HUB_AT) return null;
  const k = ease(seg(t, HUB_AT, HUB_AT + 0.5));
  const h = (1 - k) * 2.2;
  glow.color.set('#2fe08a').multiplyScalar(0.22 * ease(seg(t, HUB_AT + 0.6, HUB_AT + 1.4)));
  return (
    <group position={[HUB.x, HUB.y + h, HUB.z]} rotation={[0, -0.35, 0]}>
      {/* a small brushed stand, and the mark on it, upright, facing the model */}
      <mesh material={M.brushed} position={[0, 0.03, 0]} castShadow receiveShadow><cylinderGeometry args={[0.32, 0.36, 0.06, 48]} /></mesh>
      <Mark3D position={[0, 0.62, 0]} scale={0.27} />
      <sprite material={glow} position={[0, 0.62, -0.05]} scale={[0.95, 0.95, 1]} />
    </group>
  );
};

const Threads: React.FC<{t: number}> = ({t}) => {
  const geos = useMemo(() => CURVES.map((c) => new THREE.TubeGeometry(c, 80, 0.0045, 6, false)), []);
  const mats = useMemo(() => CURVES.map(() => new THREE.ShaderMaterial({...ThreadShader, uniforms: THREE.UniformsUtils.clone(ThreadShader.uniforms), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})), []);
  const broken = t < AT.connect + 0.4;
  return (
    <>
      {geos.map((g, i) => {
        if (i === VACANT && t < AT.ask + 2.3) return null;
        const u = mats[i].uniforms;
        if (broken) {
          const k = ease(seg(t, AT.pieces + 0.1 + (i % 11) * 0.06, AT.pieces + 0.9 + (i % 11) * 0.06)) * (1 - ease(seg(t, AT.connect - 0.6, AT.connect)));
          if (k <= 0) return null;
          u.uReach.value = 0.45 * k; u.uBroken.value = 1; u.uColor.value.set('#8a8a8a'); u.uLevel.value = 1.1; u.uFlow.value = 0;
        } else {
          u.uReach.value = ease(seg(t, AT.connect + 0.5 + (i % 11) * 0.05, AT.connect + 1.7 + (i % 11) * 0.05));
          u.uBroken.value = 0; u.uColor.value.set(i === VACANT ? '#7fb2ff' : '#38e08c'); u.uLevel.value = 1; u.uFlow.value = t * 0.8;
        }
        return <mesh key={i} geometry={g} material={mats[i]} frustumCulled={false} />;
      })}
    </>
  );
};

const PULSES: [number, number, number, string, boolean?][] = [
  ...[3, 12, 18, 27, 6, 30].filter((u) => u !== VACANT).map((u, k) => [u, AT.gcash + 0.2 + k * 0.25, AT.gcash + 1.4 + k * 0.25, '#4dff9d'] as [number, number, number, string]),
  [LEAK, AT.repair + 0.6, AT.repair + 1.8, '#ff9b3d'],
  [LEAK, AT.repair + 2.0, AT.repair + 2.9, '#4dff9d', true],
  [VACANT, AT.ask + 1.2, AT.ask + 2.3, '#7fb2ff', true],
];
const Pulses: React.FC<{t: number}> = ({t}) => {
  const mats = useMemo(() => PULSES.map(([, , , c]) => new THREE.SpriteMaterial({map: glowTex, color: new THREE.Color(c).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})), []);
  const ask = PULSES[PULSES.length - 1];
  const inbound = new THREE.QuadraticBezierCurve3(new THREE.Vector3(5.5, 1.6, -2.5), new THREE.Vector3(2.5, 2.2, -1.0), HUB_IN);
  return (
    <>
      {PULSES.map(([u, a, b, , rev], k) => {
        if (t < a || t > b) return null;
        const q = inOut(seg(t, a, b));
        return <sprite key={k} material={mats[k]} position={CURVES[u].getPoint(rev ? 1 - q : q)} scale={[0.085, 0.085, 1]} />;
      })}
      {t > ask[1] - 1.0 && t < ask[1] ? <sprite material={mats[mats.length - 1]} position={inbound.getPoint(inOut(seg(t, ask[1] - 1.0, ask[1])))} scale={[0.1, 0.1, 1]} /> : null}
    </>
  );
};

// ---- The camera -----------------------------------------------------------------------------------
// [t, camera x, y, z, look x, y, z, aperture]; the lens focuses where it looks.
const K: number[][] = [
  [0, -1.35, 0.62, 3.05, -2.55, 0.5, 1.0, 0.03], [AT.rooms - 0.2, -1.2, 0.72, 3.2, -2.5, 0.48, 0.95, 0.03],
  [AT.rooms + 2.6, -0.8, 1.15, 4.0, -2.3, 0.48, 0.85, 0.022],
  [AT.sheet + 0.2, -1.05, 0.5, 2.95, -1.55, 0.04, 2.05, 0.02], [AT.pieces - 0.2, -1.15, 0.5, 2.9, -1.6, 0.04, 2.05, 0.02],
  [AT.pieces + 0.6, -0.9, 1.35, 3.45, -2.1, 0.62, 0.5, 0.024], [AT.connect - 0.3, -0.7, 1.4, 3.7, -1.9, 0.62, 0.5, 0.022],
  [AT.connect + 1.6, 0.6, 1.9, 5.0, -1.0, 0.5, 0.5, 0.014], [AT.gcash + 0.2, 0.5, 1.8, 4.8, -1.0, 0.5, 0.5, 0.014],
  [AT.gcash + 1.0, 1.5, 1.05, 3.1, -0.2, 0.6, 0.6, 0.018], [AT.repair - 0.3, 1.4, 1.0, 3.0, -0.3, 0.6, 0.6, 0.018],
  [AT.repair + 0.3, -1.6, 0.95, 2.9, -2.45, 0.6, 0.75, 0.026], [AT.ask - 0.4, -1.7, 1.0, 2.85, -2.45, 0.62, 0.75, 0.026],
  [AT.ask + 0.2, 1.9, 1.9, 4.6, -1.0, 0.7, 0.4, 0.012], [AT.ask + 1.3, 1.7, 1.8, 4.4, -1.1, 0.7, 0.4, 0.012],
  [AT.ask + 2.2, -2.0, 1.2, 3.2, -2.6, 0.62, 0.8, 0.024], [AT.records, -1.9, 1.15, 3.1, -2.6, 0.6, 0.8, 0.024],
  [AT.close - 0.3, 0.4, 1.7, 5.2, -1.0, 0.6, 0.5, 0.012], [AT.close + 2.3, 0.7, 2.1, 5.9, -1.0, 0.55, 0.5, 0.01], [L_END, 0.7, 2.1, 5.9, -1.0, 0.55, 0.5, 0.01],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], k = inOut(seg(t, a[0], b[0]));
  const v = a.map((x, j) => lerp(x, b[j], k));
  const h = (f: number, p: number) => Math.sin(t * f + p) * 0.5 + Math.sin(t * f * 2.3 + p * 1.7) * 0.25;
  return {pos: new THREE.Vector3(v[1] + h(0.5, 1) * 0.012, v[2] + h(0.7, 2) * 0.008, v[3] + h(0.4, 3) * 0.012), look: new THREE.Vector3(v[4], v[5], v[6]), aperture: v[7]};
};

const World: React.FC<{t: number}> = ({t}) => {
  const stage = useStage();
  const {camera, scene, gl} = useThree();
  useMemo(() => {
    const s = new THREE.Scene(); s.background = new THREE.Color('#050506');
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({color: new THREE.Color('#fff6e8').multiplyScalar(1.3), side: THREE.DoubleSide}));
    p.position.set(-3, 6, 2); p.lookAt(0, 0, 0); s.add(p);
    scene.environment = new THREE.PMREMGenerator(gl).fromScene(s, 0.03).texture;
    scene.environmentIntensity = 0.45;
  }, [gl, scene]);
  const lamp = useMemo(() => {
    const l = new THREE.SpotLight('#ffdcb4', 11, 12, 0.6, 0.85, 1.6);
    l.position.set(-4.0, 3.8, 3.2); l.target.position.set(-1.6, 0.3, 0.9);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004;
    return l;
  }, []);
  // a cool fill from the far side, so the model is never only a silhouette
  const fill = useMemo(() => new THREE.DirectionalLight('#b8c6dc', 0.35), []);
  fill.position.set(3, 2.5, -3);
  const {pos, look, aperture} = camAt(t);
  camera.position.copy(pos); camera.lookAt(look);
  return (
    <>
      <LensRenderer stage={stage} lens={{focus: pos.distanceTo(look), aperture}} drawBack={(c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 4, 4); }} />
      <Desk glow={new THREE.Color('#000')} level={0} refl={0.3} />
      <Building t={t} />
      {/* her books, on the only copy */}
      {t < AT.connect + 1.5 ? <group position={[-1.55, 0.02, 2.05]} rotation={[-Math.PI / 2, 0, 0.6]} scale={0.14}><Usb /></group> : null}
      <Threads t={t} />
      <Pulses t={t} />
      <Hub t={t} />
      <primitive object={lamp} />
      <primitive object={lamp.target} />
      <primitive object={fill} />
      <hemisphereLight args={['#9fb0c8', '#000000', 0.06]} />
      {/* a faint fill from where the camera is, so the things in front are never only silhouettes */}
      <directionalLight position={pos.clone().add(new THREE.Vector3(0, 0.6, 0))} intensity={0.3} color="#dfe6ee" />
    </>
  );
};

// ---- The labels, the colour pages and the card --------------------------------------------------
const mono = (size: number, color: string, w = 500): React.CSSProperties => ({fontFamily: FONT.mono, fontSize: size, fontWeight: w, color, letterSpacing: '0.01em', whiteSpace: 'nowrap'});
const Tag: React.FC<{t: number; at: number; until: number; x: number; y: number; lines: [string, string?][]}> = ({t, at, until, x, y, lines}) => {
  const a = ease(seg(t, at, at + 0.3)) * (1 - ease(seg(t, until - 0.3, until)));
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: a, transform: `translateY(${(1 - a) * 10}px)`}}>
      {lines.map(([s, col], i) => <div key={i} style={{...mono(i === 0 ? 30 : 26, col ?? 'rgba(236,235,230,0.9)', i === 0 ? 600 : 500), marginTop: i ? 8 : 0}}>{s}</div>)}
    </div>
  );
};
const Labels: React.FC<{t: number}> = ({t}) => {
  const verified = t > AT.gcash + 1.9;
  return (
    <>
      <Tag t={t} at={AT.sheet + 2.6} until={AT.pieces - 0.3} x={1180} y={300} lines={[['income · expenses'], ['one USB drive, the only copy', 'rgba(236,235,230,0.6)']]} />
      <Tag t={t} at={AT.gcash + 0.4} until={AT.repair - 0.2} x={1240} y={180} lines={[['₱4,500.00 · GCash'], [verified ? 'Verified by her' : 'Pending verification', verified ? '#4dff9d' : '#ffcf7a']]} />
      <Tag t={t} at={AT.repair + 0.5} until={AT.ask - 0.2} x={1180} y={200} lines={[['Kitchen faucet keeps dripping'], [t > AT.repair + 2.9 ? 'Done' : 'Requested', t > AT.repair + 2.9 ? '#4dff9d' : '#ffb26b']]} />
      <Tag t={t} at={AT.ask + 0.6} until={AT.records - 0.2} x={1220} y={170} lines={[['“Is the room still available?”'], ['a visitor · no account needed', '#9cc4ff']]} />
    </>
  );
};
const Page: React.FC<{t: number}> = ({t}) => {
  const p = pageAt(t);
  if (!p) return null;
  const [a, , kind] = p;
  const big = (color: string, serif = false): React.CSSProperties => ({fontFamily: serif ? FONT.serif : FONT.grot, fontStyle: serif ? 'italic' : 'normal', fontWeight: serif ? 400 : 800, fontSize: 380, lineHeight: 0.9, letterSpacing: serif ? '-0.02em' : '-0.05em', color});
  if (kind === 'records') {
    const n = Math.round(937 * ease(seg(t, a + 0.1, a + 1.5)));
    return (
      <AbsoluteFill style={{background: '#2346d8', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 150}}>
        <div style={{...big('#fff'), fontVariantNumeric: 'tabular-nums'}}>{n}</div>
        <div style={{...mono(36, 'rgba(255,255,255,0.82)'), marginTop: 30}}>of her real records, moved in</div>
      </AbsoluteFill>
    );
  }
  if (kind === 'secure') {
    const k = ease(seg(t, a + 0.7, a + 1.0));
    return (
      <AbsoluteFill style={{background: '#e5674f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{...big('#fff'), opacity: k, transform: `scale(${0.9 + 0.1 * k})`}}>A+</div>
        <div style={{...mono(30, 'rgba(255,255,255,0.88)'), marginTop: 36}}>Qualys SSL Labs · Mozilla Observatory · securityheaders.com</div>
      </AbsoluteFill>
    );
  }
  if (kind === 'quality') {
    const k = ease(seg(t, a + 0.4, a + 1.4));
    return (
      <AbsoluteFill style={{background: '#17603f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={big('#fff', true)}>{(4.53 * k).toFixed(2)}</div>
        <div style={{width: 760, height: 8, background: 'rgba(255,255,255,0.25)', marginTop: 34}}><div style={{width: `${(4.53 / 5) * 100 * k}%`, height: 8, background: '#fff'}} /></div>
        <div style={{...mono(30, 'rgba(255,255,255,0.88)'), marginTop: 30}}>out of 5 · Very High Quality · ISO/IEC 25010</div>
      </AbsoluteFill>
    );
  }
  const c = ease(seg(t, a, a + 0.6));
  const url = 'hivelet.vercel.app', n = Math.round(clamp01((t - a - 1.2) / 0.9) * url.length);
  return (
    <AbsoluteFill style={{background: '#ebeae5', opacity: c, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
        <svg width={170} height={170} viewBox="0 0 512 512"><path d={HEX_PATH} fill="#1f9a62" /><path d="M146 216 L256 126 L366 216 M186 244 V366 M326 244 V366 M186 304 H326" fill="none" stroke="#fff" strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{fontFamily: FONT.brand, fontWeight: 800, fontSize: 190, letterSpacing: '-0.035em', color: '#141414'}}>Hivelet</div>
      </div>
      <div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 74, color: '#141414', marginTop: 18, opacity: ease(seg(t, a + 0.5, a + 0.9))}}>Every room, connected.</div>
      <div style={{marginTop: 48, display: 'inline-flex', alignItems: 'center', gap: 18, padding: '22px 36px', borderRadius: 60, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', opacity: ease(seg(t, a + 0.9, a + 1.2)), ...mono(34, '#141414')}}>
        <span style={{width: 18, height: 18, borderRadius: 9, background: '#1f9a62'}} />{url.slice(0, n)}
        <span style={{display: 'inline-block', width: 18, height: 36, background: '#1f9a62', opacity: n < url.length || Math.floor(t * 2.5) % 2 === 0 ? 1 : 0, marginLeft: -12}} />
      </div>
      <div style={{marginTop: 44, textAlign: 'center', opacity: ease(seg(t, a + 2.2, a + 2.6))}}>
        <div style={mono(26, 'rgba(20,20,20,0.55)')}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
        <div style={{...mono(26, 'rgba(20,20,20,0.78)', 600), marginTop: 10}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
      </div>
    </AbsoluteFill>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));
type Line = {id: string; text: string};
const ACCENT: Record<string, string[]> = {
  rooms: ['Thirty-two'], sheet: ['USB'], pieces: ['cash', 'paper', 'chat'], connect: ['Hivelet', 'connects'], gcash: ['GCash'], repair: ['done'],
  ask: ['no', 'account'], records: ['thirty-seven'], proof: ['A-plus', 'four', 'point', 'five', 'three'], close: ['Hivelet'],
};

export const ModelWide: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = SCRIPT.lines as Line[];
  const page = pageAt(t);
  const onPage = page && page[2] !== 'card';
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <ThreeCanvas width={LW} height={LH} shadows gl={{preserveDrawingBuffer: true, antialias: false, toneMapping: THREE.NeutralToneMapping}} camera={{fov: 30, near: 0.05, far: 100, position: [0, 1, 6]}}>
        <World t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)'}} />
      <Labels t={t} />
      <Page t={t} />
      {lines.map((l, i) => {
        const at = Math.round(AT[l.id as Id] * FPS), next = i + 1 < lines.length ? Math.round(AT[lines[i + 1].id as Id] * FPS) - 4 : Math.round((AT.close + 2.2) * FPS);
        return <Caption key={l.id} text={l.text} at={at} dur={Math.max(0.4, LEN[l.id as Id] - 0.15)} out={next} dark accent={ACCENT[l.id] ?? []} x={110} y={968} size={36} width={1700} color={onPage ? '#ffffff' : '#1f9a62'} />;
      })}
      <AbsoluteFill style={{background: '#000', opacity: ease(seg(t, L_END - 0.8, L_END - 0.1))}} />
      {lines.map((l) => (
        <Sequence key={l.id} from={Math.round(AT[l.id as Id] * FPS)} durationInFrames={Math.ceil((LEN[l.id as Id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`model/vo/${l.id}.wav`)} />
        </Sequence>
      ))}
      {files.has('model/score.wav') ? <Audio src={staticFile('model/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
