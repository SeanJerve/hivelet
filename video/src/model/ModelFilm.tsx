// Version I, "the model": a white card architectural model of her building on the dark desk
// beside the laptop, after the photograph (two wings at an angle, four storeys of cantilevered
// slabs with blue railings, a penthouse under a green awning). Its 33 windows are the units.
// Thirty-two light up; one stays dark. Before Hivelet, grey threads reach out from the rooms
// and break off; then Hivelet joins every room to the laptop with a thread of light, and the
// story is told by what runs along them: rent coming in, a repair going out and coming back
// done, a stranger's question finding the empty room. Shot as a miniature, with a shallow lens.
// 1920x1080, 60 fps.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Desk, Halo, Laptop, laptopEnv, ScreenLight, useStage} from '../objects/world';
import {clamp01, ease, inOut} from '../objects/draw';
import {Caption} from '../screen/kit';
import {LensRenderer} from '../desk/post';
import {drawScreen, screenGlow} from '../desk/screen';
import AT from './vo-at.json';
import LEN from './vo.json';
import SCRIPT from './script.json';

export const IW = 1920, IH = 1080, FPS = 60;
export const I_END = 49.5;
export const I_TOTAL = Math.round(I_END * FPS);
const OFF = I_END - 1.1;
type Id = keyof typeof AT;

const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// What the laptop shows, in version G's screens: her sheet, Hivelet, the payments to verify,
// the repair board, the inquiry page, the proof, the end card.
const S = {open: AT.connect - 0.1, ledger: AT.gcash - 0.3, invoice: AT.gcash - 0.3, gcash: AT.gcash - 0.3, repairs: AT.repair - 0.3, ask: AT.ask - 0.3, records: AT.records - 0.2, secure: AT.proof - 0.15, quality: AT.proof + 1.75, close: AT.close - 0.3};
const PRESS = AT.gcash + 1.9;

// ---- The building ---------------------------------------------------------------------------------
const FLOOR = 0.24, FLOORS = 4, WINS = 4, LEN_W = 1.25, DEPTH = 0.5;
const MODEL = {pos: new THREE.Vector3(-2.6, 0, 1.0), rotY: 0.55};
const WING_B_TURN = 2.05; // the second wing meets the first at an angle, as in the photograph
const VACANT = 6; // second floor, front wing: in view
const card = new THREE.MeshStandardMaterial({color: '#f1efe9', roughness: 0.88, metalness: 0});
const cardEdge = new THREE.MeshStandardMaterial({color: '#e2dfd6', roughness: 0.9, metalness: 0});
const rail = new THREE.MeshStandardMaterial({color: '#4f86c6', roughness: 0.5, metalness: 0.2});
const awning = new THREE.MeshStandardMaterial({color: '#3f8f5e', roughness: 0.7});
const coral = new THREE.MeshStandardMaterial({color: '#d9705f', roughness: 0.7});
const PENT_Z = -0.05 + 0.2 + 0.002; // the penthouse's front face

// A window's place: wing 0 or 1, floor, column. Its world position and outward normal.
const unitPlace = (i: number) => (i === 32 ? {wing: 1, floor: FLOORS, col: 1.5} : {wing: Math.floor(i / 16), floor: Math.floor((i % 16) / WINS), col: i % WINS});
const wingMatrix = (wing: number) => {
  const m = new THREE.Matrix4().compose(MODEL.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, MODEL.rotY, 0)), new THREE.Vector3(1, 1, 1));
  if (wing === 1) m.multiply(new THREE.Matrix4().makeRotationY(WING_B_TURN));
  return m;
};
const winLocal = (floor: number, col: number) => new THREE.Vector3(0.2 + col * ((LEN_W - 0.3) / (WINS - 1)), floor * FLOOR + 0.12, DEPTH / 2 + 0.002);
export const unitAnchor = (i: number) => {
  const {wing, floor, col} = unitPlace(i);
  const m = wingMatrix(wing);
  const p = (i === 32 ? new THREE.Vector3(0.45, FLOORS * FLOOR + 0.11, PENT_Z) : winLocal(floor, col)).applyMatrix4(m);
  const n = new THREE.Vector3(0, 0, 1).transformDirection(m);
  return {p, n};
};

const glowTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

// Each window: dark glass, or lit warm; the empty room glows blue when it is asked about.
const Window: React.FC<{i: number; lit: number; color: THREE.Color; bloom: number}> = ({i, lit, color, bloom}) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#1a1c20', roughness: 0.2, metalness: 0.3, emissive: '#ffcf8a', emissiveIntensity: 0}), []);
  const glow = useMemo(() => new THREE.SpriteMaterial({map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false}), []);
  mat.emissive.copy(color); mat.emissiveIntensity = 2.2 * lit;
  glow.color.copy(color).multiplyScalar(0.5 * lit * bloom);
  const {floor, col} = unitPlace(i);
  const p = i === 32 ? new THREE.Vector3(0.45, FLOORS * FLOOR + 0.11, PENT_Z) : winLocal(floor, col);
  return (
    <group position={p}>
      <mesh material={mat}><planeGeometry args={[i === 32 ? 0.3 : 0.17, 0.11]} /></mesh>
      {lit > 0.01 ? <sprite material={glow} scale={[0.42, 0.32, 1]} position={[0, 0, 0.02]} /> : null}
    </group>
  );
};

const Wing: React.FC<{wing: number; t: number; lights: (i: number) => [number, THREE.Color]}> = ({wing, t, lights}) => {
  const H = FLOORS * FLOOR;
  return (
    <group>
      <mesh material={card} position={[LEN_W / 2, H / 2, 0]} castShadow receiveShadow><boxGeometry args={[LEN_W, H, DEPTH]} /></mesh>
      {Array.from({length: FLOORS}, (_, f) => (
        <group key={f} position={[LEN_W / 2, (f + 1) * FLOOR - 0.012, 0.07]}>
          <mesh material={cardEdge} castShadow receiveShadow><boxGeometry args={[LEN_W + 0.12, 0.022, DEPTH + 0.14]} /></mesh>
          {f < FLOORS - 1 || wing === 0 ? <mesh material={rail} position={[0, 0.045, (DEPTH + 0.14) / 2 - 0.004]}><boxGeometry args={[LEN_W + 0.12, 0.006, 0.006]} /></mesh> : null}
          {Array.from({length: 13}, (_, k) => <mesh key={k} material={rail} position={[-LEN_W / 2 - 0.05 + k * (LEN_W + 0.1) / 12, 0.024, (DEPTH + 0.14) / 2 - 0.004]}><boxGeometry args={[0.004, 0.048, 0.004]} /></mesh>)}
        </group>
      ))}
      {Array.from({length: 16}, (_, k) => { const i = wing * 16 + k; const [lit, col] = lights(i); return <Window key={i} i={i} lit={lit} color={col} bloom={1} />; })}
      {wing === 1 ? (
        <group>
          <mesh material={card} position={[0.45, H + 0.1, -0.05]} castShadow receiveShadow><boxGeometry args={[0.7, 0.2, 0.4]} /></mesh>
          <mesh material={awning} position={[0.45, H + 0.215, 0.1]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[0.78, 0.012, 0.32]} /></mesh>
          {(() => { const [lit, col] = lights(32); return <Window i={32} lit={lit} color={col} bloom={1} />; })()}
        </group>
      ) : null}
      {wing === 0 ? <mesh material={coral} position={[0.3, 0.2, DEPTH / 2 + 0.08]} rotation={[0.5, 0, 0]}><boxGeometry args={[0.4, 0.01, 0.16]} /></mesh> : null}
    </group>
  );
};

const WARM = new THREE.Color('#ffc983'), AMBER = new THREE.Color('#ff9b3d'), ASK = new THREE.Color('#7fb2ff');
const ORDER = Array.from({length: 33}, (_, i) => i).filter((i) => i !== VACANT).sort((a, b) => Math.sin(a * 12.9) - Math.sin(b * 12.9));
const LIGHT_AT = Object.fromEntries(ORDER.map((i, k) => [i, AT.rooms + 1.4 + k * 0.045]));
const LEAK = 9; // the room that reports a leak (third floor, front wing)

const Building: React.FC<{t: number}> = ({t}) => {
  const lights = (i: number): [number, THREE.Color] => {
    if (i === VACANT) {
      const ask = ease(seg(t, AT.ask + 2.3, AT.ask + 2.9)) * (1 - ease(seg(t, AT.records + 0.5, AT.records + 1.2)));
      return [ask * 0.6, ASK];
    }
    const on = ease(seg(t, LIGHT_AT[i], LIGHT_AT[i] + 0.25));
    if (i === LEAK && t > AT.repair + 0.3 && t < AT.repair + 2.9) return [on * (0.55 + 0.45 * Math.abs(Math.sin(t * 9))), AMBER];
    return [on, WARM];
  };
  return (
    <group position={MODEL.pos} rotation={[0, MODEL.rotY, 0]}>
      <Wing wing={0} t={t} lights={lights} />
      <group rotation={[0, WING_B_TURN, 0]}><Wing wing={1} t={t} lights={lights} /></group>
      {/* the base board the model is built on */}
      <mesh material={cardEdge} position={[0.1, 0.012, -0.3]} receiveShadow castShadow><boxGeometry args={[2.6, 0.024, 2.0]} /></mesh>
    </group>
  );
};

// ---- The threads -------------------------------------------------------------------------------------
// From each lit room up and across to the laptop's side, as cables to a port.
const PORT = (i: number) => new THREE.Vector3(-1.58, 0.07, -0.55 + (i / 32) * 1.1);
const curveFor = (i: number) => {
  const {p, n} = unitAnchor(i);
  const end = PORT(i);
  return new THREE.CubicBezierCurve3(p.clone().add(n.clone().multiplyScalar(0.03)), p.clone().add(n.clone().multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.55, 0)), end.clone().add(new THREE.Vector3(-0.7, 0.9, 0)), end);
};
const CURVES = Array.from({length: 33}, (_, i) => curveFor(i));

const ThreadShader = {
  uniforms: {uColor: {value: new THREE.Color('#38e08c')}, uReach: {value: 0}, uFlow: {value: 0}, uBroken: {value: 0}, uLevel: {value: 1}},
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform vec3 uColor; uniform float uReach, uFlow, uBroken, uLevel; varying vec2 vUv;
    void main() {
      float s = vUv.x;
      if (s > uReach) discard;
      // broken: dashes that fade out before they get anywhere
      float dash = mix(1.0, step(0.45, fract(s * 22.0)), uBroken);
      float fade = mix(1.0, 1.0 - smoothstep(0.15, 0.45, s), uBroken);
      // light running toward the laptop
      float run = 0.35 + 0.65 * pow(0.5 + 0.5 * sin((s * 18.0 - uFlow) * 6.2831), 6.0);
      float tip = smoothstep(uReach - 0.04, uReach, s) * (1.0 - uBroken);
      gl_FragColor = vec4(uColor * (run + tip * 2.0) * uLevel, dash * fade);
    }`,
};
const Threads: React.FC<{t: number}> = ({t}) => {
  const geos = useMemo(() => CURVES.map((c) => new THREE.TubeGeometry(c, 80, 0.0045, 6, false)), []);
  const mats = useMemo(() => CURVES.map(() => new THREE.ShaderMaterial({...ThreadShader, uniforms: THREE.UniformsUtils.clone(ThreadShader.uniforms), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})), []);
  // grey and broken while the old way is told; green and whole once Hivelet connects them
  const broken = t < AT.connect + 0.4;
  const grey = new THREE.Color('#8a8a8a');
  const proofCol = t >= S.records && t < S.secure ? new THREE.Color('#5b7cff') : t >= S.secure && t < S.quality ? new THREE.Color('#ff7a5c') : null;
  return (
    <>
      {geos.map((g, i) => {
        if (i === VACANT && t < AT.ask + 2.3) return null;
        const u = mats[i].uniforms;
        if (broken) {
          const k = ease(seg(t, AT.pieces + 0.1 + (i % 11) * 0.06, AT.pieces + 0.9 + (i % 11) * 0.06)) * (1 - ease(seg(t, AT.connect - 0.6, AT.connect)));
          if (k <= 0) return null;
          u.uReach.value = 0.45 * k; u.uBroken.value = 1; u.uColor.value.copy(grey); u.uLevel.value = 1.1; u.uFlow.value = 0;
        } else {
          u.uReach.value = ease(seg(t, AT.connect + 0.4 + (i % 11) * 0.05, AT.connect + 1.6 + (i % 11) * 0.05));
          u.uBroken.value = 0; u.uColor.value.set(i === VACANT ? '#7fb2ff' : '#38e08c'); if (proofCol) u.uColor.value.copy(proofCol);
          u.uLevel.value = t >= S.records && t < S.records + 3 ? 1.6 : 1; u.uFlow.value = t * (t >= S.records && t < S.records + 3 ? 3 : 0.8);
        }
        return <mesh key={i} geometry={g} material={mats[i]} frustumCulled={false} />;
      })}
    </>
  );
};

// What runs along them: [curve, leaves, arrives, colour, reverse?]
const PULSES: [number, number, number, string, boolean?][] = [
  ...[3, 12, 18, 27, 6, 30].map((u, k) => [u, AT.gcash + 0.2 + k * 0.25, AT.gcash + 1.4 + k * 0.25, '#4dff9d'] as [number, number, number, string]),
  [LEAK, AT.repair + 0.6, AT.repair + 1.8, '#ff9b3d'],
  [LEAK, AT.repair + 2.0, AT.repair + 2.9, '#4dff9d', true],
  [VACANT, AT.ask + 1.2, AT.ask + 2.3, '#7fb2ff', true],
];
const Pulses: React.FC<{t: number}> = ({t}) => {
  const mats = useMemo(() => PULSES.map(([, , , c]) => new THREE.SpriteMaterial({map: glowTex, color: new THREE.Color(c).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})), []);
  // the stranger's question comes in from the dark at the desk's far edge to the laptop first
  const ask = PULSES[PULSES.length - 1];
  const inbound = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-7.5, 1.4, 2.5), new THREE.Vector3(-3.5, 2.2, -1.2), PORT(VACANT));
  return (
    <>
      {PULSES.map(([u, a, b, , rev], k) => {
        if (t < a || t > b) return null;
        const q = inOut(seg(t, a, b));
        const p = CURVES[u].getPoint(rev ? 1 - q : q);
        return <sprite key={k} material={mats[k]} position={p} scale={[0.085, 0.085, 1]} />;
      })}
      {t > ask[1] - 1.0 && t < ask[1] ? <sprite material={mats[mats.length - 1]} position={inbound.getPoint(inOut(seg(t, ask[1] - 1.0, ask[1])))} scale={[0.085, 0.085, 1]} /> : null}
    </>
  );
};

// ---- The camera -----------------------------------------------------------------------------------
// [t, camera x, y, z, look x, y, z, aperture]; the lens focuses where it looks.
const K: number[][] = [
  [0, -1.35, 0.62, 3.05, -2.55, 0.5, 1.0, 0.03], [AT.rooms - 0.2, -1.2, 0.72, 3.2, -2.5, 0.48, 0.95, 0.03],
  [AT.rooms + 2.6, -0.95, 1.15, 3.95, -2.35, 0.48, 0.85, 0.024],
  [AT.sheet + 0.2, 0.7, 1.55, 4.9, -0.9, 0.62, 0.0, 0.016], [AT.pieces - 0.2, 0.5, 1.5, 4.7, -0.95, 0.6, 0.0, 0.016],
  [AT.pieces + 0.6, -0.9, 1.35, 3.45, -2.1, 0.62, 0.5, 0.024], [AT.connect - 0.3, -0.85, 1.4, 3.5, -2.0, 0.62, 0.45, 0.024],
  [AT.connect + 1.6, 0.4, 2.55, 5.3, -1.1, 0.45, 0.2, 0.012], [AT.gcash + 0.2, 0.2, 2.2, 4.9, -1.15, 0.5, 0.2, 0.012],
  [AT.gcash + 1.0, -0.4, 1.25, 3.4, -1.45, 0.55, 0.25, 0.018], [AT.repair - 0.3, -0.5, 1.2, 3.3, -1.5, 0.55, 0.25, 0.018],
  [AT.repair + 0.3, -1.6, 0.95, 2.9, -2.45, 0.6, 0.75, 0.026], [AT.ask - 0.4, -1.7, 1.0, 2.85, -2.45, 0.62, 0.75, 0.026],
  [AT.ask + 0.2, 0.9, 2.1, 4.7, -2.9, 0.75, 0.6, 0.012], [AT.ask + 1.3, 0.7, 2.0, 4.5, -2.8, 0.7, 0.6, 0.012],
  [AT.ask + 2.2, -2.0, 1.2, 3.2, -2.6, 0.62, 0.8, 0.024], [AT.records - 0.2, -1.9, 1.15, 3.1, -2.6, 0.6, 0.8, 0.024],
  [AT.records + 0.6, 1.0, 1.85, 5.4, -0.9, 0.6, 0.0, 0.012], [AT.proof - 0.2, 0.8, 1.7, 5.2, -0.9, 0.62, 0.0, 0.012],
  [AT.proof + 0.4, -0.2, 1.25, 4.5, -1.0, 0.7, -0.2, 0.014], [AT.close - 0.4, -0.1, 1.3, 4.4, -1.0, 0.72, -0.2, 0.014],
  [AT.close + 1.4, 0.3, 1.5, 4.6, -0.9, 0.78, -0.3, 0.012], [I_END, 0.6, 1.9, 5.6, -0.9, 0.72, -0.3, 0.01],
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
    const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({color: new THREE.Color('#fff6e8').multiplyScalar(1.2), side: THREE.DoubleSide}));
    p.position.set(-3, 6, 2); p.lookAt(0, 0, 0); s.add(p);
    scene.environment = new THREE.PMREMGenerator(gl).fromScene(s, 0.03).texture;
    scene.environmentIntensity = 0.4;
    laptopEnv(0.1);
  }, [gl, scene]);
  const lamp = useMemo(() => {
    const l = new THREE.SpotLight('#ffdcb4', 9, 10, 0.5, 0.85, 1.6);
    l.position.set(-4.2, 3.6, 2.6); l.target.position.set(-2.5, 0.3, 0.9);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004;
    return l;
  }, []);
  const {pos, look, aperture} = camAt(t);
  camera.position.copy(pos); camera.lookAt(look);
  const off = 1 - ease(seg(t, OFF, OFF + 0.6));
  const [hex, lv0] = screenGlow(t, S);
  const glow = new THREE.Color(hex), lv = lv0 * off;
  return (
    <>
      <LensRenderer stage={stage} lens={{focus: pos.distanceTo(look), aperture}} drawBack={(c) => drawScreen(c, t, S, {}, PRESS, 'Every room, connected.')} />
      <Laptop screen={stage.rt.texture} dim={off} />
      <ScreenLight color={glow} level={lv * 1.2} />
      <Halo color={glow} level={lv} />
      <Desk glow={glow} level={lv} refl={0.3} />
      <Building t={t} />
      <Threads t={t} />
      <Pulses t={t} />
      <primitive object={lamp} />
      <primitive object={lamp.target} />
      <hemisphereLight args={['#9fb0c8', '#000000', 0.05]} />
    </>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));
type Line = {id: string; text: string};
const ACCENT: Record<string, string[]> = {
  rooms: ['Thirty-two'], sheet: ['USB'], pieces: ['cash', 'paper', 'chat'], connect: ['Hivelet', 'connects'], gcash: ['GCash'], repair: ['done'],
  ask: ['no', 'account'], records: ['thirty-seven'], proof: ['A-plus', 'four', 'point', 'five', 'three'], close: ['Hivelet'],
};

export const ModelFilm: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = SCRIPT.lines as Line[];
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <ThreeCanvas width={IW} height={IH} shadows gl={{preserveDrawingBuffer: true, antialias: false, toneMapping: THREE.NeutralToneMapping}} camera={{fov: 30, near: 0.05, far: 100, position: [0, 1, 6]}}>
        <World t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('paper/tex/grain.png')})`, backgroundSize: '360px', backgroundPosition: `${(f * 137) % 360}px ${(f * 251) % 360}px`, mixBlendMode: 'screen', opacity: 0.05}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)'}} />
      {lines.map((l, i) => {
        const at = Math.round(AT[l.id as Id] * FPS), next = i + 1 < lines.length ? Math.round(AT[lines[i + 1].id as Id] * FPS) - 4 : Math.round((OFF - 0.4) * FPS);
        return <Caption key={l.id} text={l.text} at={at} dur={Math.max(0.4, LEN[l.id as Id] - 0.15)} out={next} dark accent={ACCENT[l.id] ?? []} x={96} y={954} size={34} width={1700} />;
      })}
      {lines.map((l) => (
        <Sequence key={l.id} from={Math.round(AT[l.id as Id] * FPS)} durationInFrames={Math.ceil((LEN[l.id as Id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`model/vo/${l.id}.wav`)} />
        </Sequence>
      ))}
      {files.has('model/score.wav') ? <Audio src={staticFile('model/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
