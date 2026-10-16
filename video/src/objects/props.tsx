// Version F's objects, modelled in code: each one is extruded or turned from a 2D outline and
// given a physical material, so it sits on the screen's page the way the reference's brass
// magnifier and cardboard box do: lit, with weight and a soft shadow. Printed faces (an invoice,
// a phone's screen, a dial) are canvases drawn with the same fonts as the captions.
import React, {useMemo} from 'react';
import type {ThreeElements} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mkCanvas} from './draw';

type G = ThreeElements['group'];

export const M = {
  brass: new THREE.MeshPhysicalMaterial({color: '#c99a3f', metalness: 1, roughness: 0.26, clearcoat: 0.3, clearcoatRoughness: 0.2}),
  steel: new THREE.MeshPhysicalMaterial({color: '#d9dadc', metalness: 1, roughness: 0.18}),
  chrome: new THREE.MeshPhysicalMaterial({color: '#f2f3f5', metalness: 1, roughness: 0.07}),
  brushed: new THREE.MeshPhysicalMaterial({color: '#c9cbce', metalness: 1, roughness: 0.32}),
  blackPlastic: new THREE.MeshPhysicalMaterial({color: '#151517', metalness: 0, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35}),
  glass: new THREE.MeshPhysicalMaterial({color: '#0b0b0c', metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04}),
  dark: new THREE.MeshStandardMaterial({color: '#0d0d0e', metalness: 0.2, roughness: 0.6}),
  paper: new THREE.MeshStandardMaterial({color: '#f6f4ee', metalness: 0, roughness: 0.92}),
  paperEdge: new THREE.MeshStandardMaterial({color: '#e7e3d8', metalness: 0, roughness: 0.95}),
  card: new THREE.MeshStandardMaterial({color: '#7b2733', metalness: 0, roughness: 0.7}),
  green: new THREE.MeshPhysicalMaterial({color: '#1f9a62', metalness: 0, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1}),
  white: new THREE.MeshPhysicalMaterial({color: '#fbfbf8', metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1}),
  wood: new THREE.MeshStandardMaterial({color: '#6e4a2c', metalness: 0, roughness: 0.62}),
};

const bevel = (depth: number, b: number, seg = 3, curve = 32): THREE.ExtrudeGeometryOptions => ({depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: seg, curveSegments: curve});

// A canvas texture: drawn once, or again whenever `key` changes.
export const useCanvas = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, key: unknown = 0) => {
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(mkCanvas(w, h));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, [w, h]);
  useMemo(() => {
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    c.clearRect(0, 0, w, h); draw(c); tex.needsUpdate = true;
  }, [tex, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return tex;
};

// ---- The page: shadow catcher and studio light ------------------------------------------------
export const Catcher: React.FC<{opacity?: number}> = ({opacity = 0.32}) => (
  <mesh receiveShadow position={[0, 0, 0]}>
    <planeGeometry args={[60, 40]} />
    <shadowMaterial opacity={opacity} />
  </mesh>
);

export const PageLight: React.FC<{intensity?: number; x?: number; y?: number}> = ({intensity = 2.2, x = -5, y = 7}) => {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#ffffff', intensity);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.camera.left = -12; l.shadow.camera.right = 12; l.shadow.camera.top = 9; l.shadow.camera.bottom = -9;
    l.shadow.camera.near = 1; l.shadow.camera.far = 50;
    l.shadow.radius = 7; l.shadow.bias = -0.0004;
    return l;
  }, []);
  light.intensity = intensity;
  light.position.set(x, y, 14);
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
      <ambientLight intensity={0.3} />
    </>
  );
};

// A rounded box, the workhorse for devices.
export const RBox: React.FC<ThreeElements['mesh'] & {size: [number, number, number]; r?: number; mat: THREE.Material}> = ({size, r = 0.08, mat, ...rest}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 4, r), [size[0], size[1], size[2], r]);
  return <mesh geometry={geo} material={mat} castShadow receiveShadow {...rest} />;
};

// A printed face: a plane with a canvas texture, lying on top of an object.
export const Face: React.FC<ThreeElements['mesh'] & {w: number; h: number; tex: THREE.Texture; rough?: number; transparent?: boolean; metal?: number; color?: string}> =
  ({w, h, tex, rough = 0.85, transparent = false, metal = 0, color = '#ffffff', ...rest}) => {
    const mat = useMemo(() => new THREE.MeshStandardMaterial({map: tex, roughness: rough, metalness: metal, transparent, color}), [tex, rough, transparent, metal, color]);
    return (
      <mesh material={mat} receiveShadow {...rest}>
        <planeGeometry args={[w, h]} />
      </mesh>
    );
  };

// ---- A house key, brass, its bow pierced for a ring -----------------------------------------
const keyShape = () => {
  const s = new THREE.Shape();
  const cx = -1.55, R = 0.85, a0 = Math.asin(0.16 / R);
  s.moveTo(cx + R * Math.cos(a0), 0.16);
  s.lineTo(2.4, 0.16); s.lineTo(2.5, 0.06); s.lineTo(2.5, -0.58);
  [[2.32, -0.58], [2.32, -0.42], [2.14, -0.42], [2.07, -0.56], [1.88, -0.56], [1.83, -0.38], [1.66, -0.38], [1.6, -0.5], [1.42, -0.5], [1.42, -0.16]].forEach(([x, y]) => s.lineTo(x, y));
  s.lineTo(cx + R * Math.cos(a0), -0.16);
  s.absarc(cx, 0, R, -a0, a0, true);
  const hole = new THREE.Path();
  hole.absarc(cx - 0.22, 0, 0.3, 0, Math.PI * 2, false);
  s.holes.push(hole);
  return s;
};
const KEY = (() => { const g = new THREE.ExtrudeGeometry(keyShape(), bevel(0.09, 0.035)); g.translate(0, 0, -0.045); return g; })();
const GROOVE = new THREE.BoxGeometry(2.6, 0.05, 0.03);
const RING = new THREE.TorusGeometry(0.52, 0.04, 16, 64);
export const Key: React.FC<G & {mat?: THREE.Material; ring?: boolean}> = ({mat = M.brass, ring = true, ...rest}) => (
  <group {...rest}>
    <mesh geometry={KEY} material={mat} castShadow receiveShadow />
    <mesh geometry={GROOVE} material={mat} position={[0.9, 0.0, 0.08]} castShadow />
    {ring ? <mesh geometry={RING} material={M.steel} position={[-2.2, 0, 0]} rotation={[0, 0.5, 0]} castShadow /> : null}
  </group>
);

// A brass cup hook, seen from above: a small turned base and the hook's curl.
const HOOK_BASE = new THREE.CylinderGeometry(0.16, 0.2, 0.08, 24);
const HOOK = new THREE.TorusGeometry(0.17, 0.045, 12, 32, Math.PI * 1.4);
export const Hook: React.FC<G> = (props) => (
  <group {...props}>
    <mesh geometry={HOOK_BASE} material={M.brass} rotation={[Math.PI / 2, 0, 0]} castShadow />
    <mesh geometry={HOOK} material={M.brass} position={[0, -0.1, 0.18]} rotation={[0, Math.PI / 2, -0.4]} castShadow />
  </group>
);

// ---- A USB flash drive ------------------------------------------------------------------------
export const Usb: React.FC<G> = (props) => {
  const sticker = useCanvas(512, 160, (c) => {
    c.fillStyle = '#f3efe2'; c.fillRect(0, 0, 512, 160);
    c.fillStyle = '#2a2a2a'; c.font = '700 58px Caveat'; c.textAlign = 'center';
    c.fillText('income · expenses', 256, 98);
  });
  return (
    <group {...props}>
      <RBox size={[3.0, 1.05, 0.42]} r={0.16} mat={M.blackPlastic} />
      <RBox size={[1.0, 0.68, 0.22]} r={0.03} mat={M.steel} position={[1.95, 0, -0.02]} />
      <mesh material={M.dark} position={[2.05, 0.15, 0.1]}><boxGeometry args={[0.24, 0.14, 0.02]} /></mesh>
      <mesh material={M.dark} position={[2.05, -0.15, 0.1]}><boxGeometry args={[0.24, 0.14, 0.02]} /></mesh>
      <mesh material={M.steel} position={[-1.75, 0, 0]} rotation={[0, 0, 0]} castShadow><torusGeometry args={[0.32, 0.05, 12, 40]} /></mesh>
      <Face w={1.9} h={0.6} tex={sticker} position={[0, 0, 0.215]} />
    </group>
  );
};

// ---- Coins: a turned profile, milled rim ------------------------------------------------------
const COIN = (() => {
  const p = [[0, 0.07], [0.78, 0.07], [0.84, 0.1], [0.92, 0.1], [0.97, 0.07], [0.98, 0], [0.97, -0.07], [0.92, -0.1], [0.84, -0.1], [0.78, -0.07], [0, -0.07]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(p, 64);
  g.rotateX(Math.PI / 2);
  return g;
})();
export const Coin: React.FC<G & {mat?: THREE.Material; r?: number}> = ({mat = M.steel, r = 1, ...rest}) => (
  <group {...rest}><mesh geometry={COIN} material={mat} scale={[r, r, r]} castShadow receiveShadow /></group>
);

// ---- The paper invoice book -------------------------------------------------------------------
export const InvoiceBook: React.FC<G & {open: number}> = ({open, ...rest}) => {
  const page = useCanvas(1040, 760, (c) => {
    c.fillStyle = '#f7f4ea'; c.fillRect(0, 0, 1040, 760);
    c.fillStyle = '#23345f'; c.font = '600 44px "Inter Tight"'; c.fillText('INVOICE', 64, 96);
    c.font = '500 40px "JetBrains Mono"'; c.fillStyle = '#b3262e'; c.textAlign = 'right'; c.fillText('No. 1182', 976, 96); c.textAlign = 'left';
    c.strokeStyle = 'rgba(35,52,95,0.45)'; c.lineWidth = 2;
    const rows = ['Date', 'Received from', 'Unit', 'For', 'Amount  ₱'];
    rows.forEach((r, i) => {
      const y = 200 + i * 104;
      c.fillStyle = '#23345f'; c.font = '500 30px "Inter Tight"'; c.fillText(r, 64, y);
      c.beginPath(); c.moveTo(300, y + 6); c.lineTo(976, y + 6); c.stroke();
    });
    c.fillStyle = '#2b3f8c'; c.font = '700 54px Caveat';
    c.fillText('rent', 330, 200 + 3 * 104 - 4);
    c.fillText('4,500.00', 330, 200 + 4 * 104 - 4);
  });
  const angle = -Math.PI * open;
  return (
    <group {...rest}>
      <RBox size={[5.4, 3.95, 0.5]} r={0.04} mat={M.paperEdge} position={[0, 0, 0.25]} />
      <Face w={5.3} h={3.86} tex={page} position={[0, 0, 0.505]} rough={0.9} />
      <mesh material={M.card} position={[-2.66, 0, 0.25]} castShadow><boxGeometry args={[0.12, 4.0, 0.56]} /></mesh>
      {/* the cover hinges on the spine, x = -2.7 */}
      <group position={[-2.7, 0, 0.53]} rotation={[0, angle, 0]}>
        <RBox size={[5.45, 4.0, 0.05]} r={0.02} mat={M.card} position={[2.725, 0, 0.025]} />
      </group>
    </group>
  );
};

// ---- A phone, face up, its screen a canvas ----------------------------------------------------
export const Phone: React.FC<G & {screen: THREE.Texture}> = ({screen, ...rest}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: screen, toneMapped: false, transparent: true}), [screen]);
  return (
    <group {...rest}>
      <RBox size={[2.5, 5.1, 0.3]} r={0.14} mat={M.glass} />
      <mesh material={M.brushed} position={[0, 0, 0]}><boxGeometry args={[2.46, 5.06, 0.22]} /></mesh>
      <mesh material={mat} position={[0, 0, 0.152]}><planeGeometry args={[2.32, 4.92]} /></mesh>
    </group>
  );
};

// ---- The Hivelet mark, enamel: a green rounded hexagon, the roof and H raised in white -----------
const HEX = (() => {
  const s = new THREE.Shape();
  const P = (x: number, y: number) => [(x - 256) / 128, (256 - y) / 128] as const;
  const mv = (x: number, y: number) => s.moveTo(...P(x, y));
  const ln = (x: number, y: number) => s.lineTo(...P(x, y));
  const q = (cx: number, cy: number, x: number, y: number) => { const [a, b] = P(cx, cy); const [c, d] = P(x, y); s.quadraticCurveTo(a, b, c, d); };
  mv(217.89, 34); q(256, 12, 294.11, 34); ln(429.21, 112); q(467.31, 134, 467.31, 178); ln(467.31, 334); q(467.31, 378, 429.21, 400);
  ln(294.11, 478); q(256, 500, 217.89, 478); ln(82.79, 400); q(44.69, 378, 44.69, 334); ln(44.69, 178); q(44.69, 134, 82.79, 112); ln(217.89, 34);
  const g = new THREE.ExtrudeGeometry(s, bevel(0.34, 0.07, 4, 24));
  return g;
})();
const stroke = (x0: number, y0: number, x1: number, y1: number) => {
  const a = [(x0 - 256) / 128, (256 - y0) / 128], b = [(x1 - 256) / 128, (256 - y1) / 128];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), r = 18 / 128;
  const s = new THREE.Shape();
  s.moveTo(0, -r); s.lineTo(len, -r); s.absarc(len, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, r); s.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, bevel(0.06, 0.03, 3, 16));
  g.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]));
  g.translate(a[0], a[1], 0);
  return g;
};
const STROKES = [stroke(146, 216, 256, 126), stroke(256, 126, 366, 216), stroke(186, 244, 186, 366), stroke(326, 244, 326, 366), stroke(186, 304, 326, 304)];
export const Mark3D: React.FC<G & {hex?: THREE.Material}> = ({hex = M.green, ...rest}) => (
  <group {...rest}>
    <mesh geometry={HEX} material={hex} castShadow receiveShadow />
    {STROKES.map((g, i) => <mesh key={i} geometry={g} material={M.white} position={[0, 0, 0.41]} castShadow />)}
  </group>
);

// ---- A sheet of paper, very slightly curled ---------------------------------------------------
export const Sheet: React.FC<G & {w: number; h: number; tex: THREE.Texture; curl?: number}> = ({w, h, tex, curl = 0.08, ...rest}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 24, 32);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, curl * (x * x * 0.6 + Math.max(0, y) ** 3 * 0.8)); }
    g.computeVertexNormals();
    return g;
  }, [w, h, curl]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({map: tex, roughness: 0.9, side: THREE.DoubleSide}), [tex]);
  return <group {...rest}><mesh geometry={geo} material={mat} castShadow receiveShadow /></group>;
};

// ---- An open-ended spanner, chrome ---------------------------------------------------------------
const WRENCH = (() => {
  const head = (cx: number, R: number, notch: number, dir: 1 | -1) => {
    const s = new THREE.Shape();
    const a = Math.asin(notch / R);
    if (dir === 1) {
      s.moveTo(cx + R * Math.cos(a), notch);
      s.absarc(cx, 0, R, a, Math.PI * 2 - a, false);
      s.lineTo(cx + 0.02, -notch); s.lineTo(cx + 0.02, notch); s.lineTo(cx + R * Math.cos(a), notch);
    } else {
      s.moveTo(cx - R * Math.cos(a), -notch);
      s.absarc(cx, 0, R, Math.PI + a, Math.PI * 3 - a, false);
      s.lineTo(cx - 0.02, notch); s.lineTo(cx - 0.02, -notch); s.lineTo(cx - R * Math.cos(a), -notch);
    }
    return s;
  };
  const handle = new THREE.Shape();
  handle.moveTo(-2.2, -0.22); handle.lineTo(2.2, -0.26); handle.lineTo(2.2, 0.26); handle.lineTo(-2.2, 0.22); handle.lineTo(-2.2, -0.22);
  return [new THREE.ExtrudeGeometry(head(2.6, 0.72, 0.3, 1), bevel(0.14, 0.04)), new THREE.ExtrudeGeometry(head(-2.45, 0.6, 0.24, -1), bevel(0.14, 0.04)), new THREE.ExtrudeGeometry(handle, bevel(0.12, 0.04))];
})();
export const Wrench: React.FC<G> = (props) => (
  <group {...props}>{WRENCH.map((g, i) => <mesh key={i} geometry={g} material={M.chrome} castShadow receiveShadow />)}</group>
);

// ---- A paper dart --------------------------------------------------------------------------------
const PLANE = (() => {
  const N = [1.9, 0, 0.32], T = [-1.5, 0, 0.32], K = [-1.5, 0, -0.05], L = [-1.6, 1.15, 0.5], R = [-1.6, -1.15, 0.5];
  const tri = [N, T, L, N, R, T, N, K, T, N, T, K].flat();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
  g.computeVertexNormals();
  return g;
})();
const PLANE_MAT = new THREE.MeshStandardMaterial({color: '#fbfaf6', roughness: 0.85, side: THREE.DoubleSide, flatShading: true});
export const PaperPlane: React.FC<G> = (props) => <group {...props}><mesh geometry={PLANE} material={PLANE_MAT} castShadow /></group>;

// ---- A padlock: brass body, chrome shackle ----------------------------------------------------
const SHACKLE = (() => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.72, -0.9, 0), new THREE.Vector3(-0.72, 0.6, 0)));
  const arc = new THREE.EllipseCurve(0, 0.6, 0.72, 0.72, Math.PI, 0, true);
  const pts = arc.getPoints(32).map((p) => new THREE.Vector3(p.x, p.y, 0));
  path.add(new THREE.CatmullRomCurve3(pts));
  path.add(new THREE.LineCurve3(new THREE.Vector3(0.72, 0.6, 0), new THREE.Vector3(0.72, -0.9, 0)));
  return new THREE.TubeGeometry(path, 120, 0.17, 20, false);
})();
export const Padlock: React.FC<G & {shut: number; face: THREE.Texture}> = ({shut, face, ...rest}) => (
  <group {...rest}>
    <group position={[0, 1.15 + (1 - shut) * 0.75, 0.45]}><mesh geometry={SHACKLE} material={M.chrome} castShadow /></group>
    <RBox size={[2.7, 2.35, 0.9]} r={0.26} mat={M.brass} position={[0, 0, 0.45]} />
    <Face w={2.1} h={1.7} tex={face} position={[0, -0.05, 0.905]} transparent metal={0.6} rough={0.35} />
  </group>
);

// ---- A gauge: chrome bezel, printed dial, needle, glass -----------------------------------------
const NEEDLE = new THREE.MeshStandardMaterial({color: '#e5674f', roughness: 0.4});
const GLASS = new THREE.MeshPhysicalMaterial({color: '#ffffff', metalness: 0, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1});
export const Gauge: React.FC<G & {value: number; dial: THREE.Texture}> = ({value, dial, ...rest}) => {
  // the needle sweeps 240 degrees, 0 at lower left to 5 at lower right
  const a = THREE.MathUtils.degToRad(210 - (value / 5) * 240);
  return (
    <group {...rest}>
      <mesh material={M.chrome} position={[0, 0, 0.2]} castShadow><torusGeometry args={[2.62, 0.2, 24, 96]} /></mesh>
      <mesh material={M.brushed} position={[0, 0, 0.05]} castShadow receiveShadow><cylinderGeometry args={[2.7, 2.75, 0.1, 96]} /></mesh>
      <Face w={5.1} h={5.1} tex={dial} position={[0, 0, 0.12]} transparent rough={0.6} />
      <group position={[0, 0, 0.22]} rotation={[0, 0, a]}>
        <mesh material={NEEDLE} position={[0.95, 0, 0]} castShadow><boxGeometry args={[2.3, 0.08, 0.04]} /></mesh>
      </group>
      <mesh material={M.brass} position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.2, 0.22, 0.1, 32]} /></mesh>
      <mesh material={GLASS} position={[0, 0, 0.36]}><circleGeometry args={[2.6, 96]} /></mesh>
    </group>
  );
};

// ---- A stack of paper, `n` sheets high ----------------------------------------------------------
// Sixteen slabs, each a few dozen sheets, their edges striped like paper and each a little out of
// line with the next. (937 separate sheets drawn one over another cost minutes a frame in
// software WebGL; the slabs look the same and cost nothing.)
const EDGE = (() => {
  if (typeof document === 'undefined') return null;
  const c = mkCanvas(64, 512), g = c.getContext('2d')!;
  for (let y = 0; y < 512; y += 4) { g.fillStyle = (y / 4) % 2 ? '#f3f1ea' : '#d9d5ca'; g.fillRect(0, y, 64, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
const EDGE_MAT = new THREE.MeshStandardMaterial({map: EDGE, roughness: 0.95});
const SLAB_MATS = [EDGE_MAT, EDGE_MAT, EDGE_MAT, EDGE_MAT, M.paper, M.paper];
const SHEET = 0.0062, SLABS = 16;
export const Stack: React.FC<G & {n: number; max: number; drop: number}> = ({n, max, drop, ...rest}) => {
  const per = Math.ceil(max / SLABS);
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(3.6, 4.8, per * SHEET);
    // stripes per sheet on the sides: the side faces' v runs over the slab's height
    const uv = g.attributes.uv;
    for (let i = 0; i < 16 * 4; i++) uv.setY(i, uv.getY(i) * per / 128 * 8);
    return g;
  }, [per]);
  const slabs = [];
  for (let i = 0; i < SLABS; i++) {
    const here = Math.min(per, Math.max(0, n - i * per));
    if (here <= 0) break;
    const z0 = i * per * SHEET, h = here * SHEET, top = n - (i + 1) * per <= 0;
    slabs.push(
      <mesh key={i} geometry={geo} material={SLAB_MATS} castShadow receiveShadow
        position={[(rnd1(i) - 0.5) * 0.1, (rnd1(i + 40) - 0.5) * 0.1, z0 + h / 2 + (top ? drop : 0)]} rotation={[0, 0, (rnd1(i + 80) - 0.5) * 0.035]} scale={[1, 1, h / (per * SHEET)]} />,
    );
  }
  return <group {...rest}>{slabs}</group>;
};
const rnd1 = (i: number) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
