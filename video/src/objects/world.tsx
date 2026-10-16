// Version F's world, in WebGL: a laptop on a glossy black desk in a dark room, lit only by its
// screen, after the reference Sean sent. The screen is its own small 3D scene (real objects on
// a paper backdrop, shot from above with soft shadows, as the reference's screens put a brass
// magnifier or a cardboard box on a clean page), rendered into a texture each frame, with a
// 2D canvas over it for the typed caption. The desk is a true planar reflection, blurred with
// distance the way a lacquered surface blurs it.
import React, {useEffect, useMemo} from 'react';
import {createPortal, useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RectAreaLightUniformsLib} from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

// ---- Laptop dimensions (a 14-inch machine, in decimetres) ------------------------------------
export const L = {w: 3.12, d: 2.21, t: 0.15, lidT: 0.055, lidH: 2.06, scrW: 2.9, scrH: 1.8125, back: 0.33};
// The lid's rotation about the hinge: `open` 0 is shut on the keys, 1 the working angle (tipped
// back from vertical by L.back radians).
export const lidAngle = (open: number) => Math.PI / 2 + (-L.back - Math.PI / 2) * open;
const HINGE = new THREE.Vector3(0, L.t + 0.03, -L.d / 2 + 0.02);
// The screen is 16:10; its texture is 1600x1000.
export const SW = 1600, SH = 1000;

// ---- The desk: a lacquered black plane with a blurred planar reflection --------------------
const FloorShader = {
  name: 'GlossDesk',
  uniforms: {
    color: {value: null}, tDiffuse: {value: null}, textureMatrix: {value: null},
    uGlow: {value: new THREE.Color('#ffffff')}, uLevel: {value: 1}, uRefl: {value: 0.5},
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <common>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 uGlow;
    uniform float uLevel;
    uniform float uRefl;
    varying vec4 vUv;
    varying vec3 vWorld;
    #include <common>
    void main() {
      vec2 uv = vUv.xy / vUv.w;
      // blur grows with distance from the laptop's footprint, as a lacquered desk blurs
      float away = max(0.0, length(vec2(vWorld.x * 0.55, vWorld.z - 0.2)) - 0.9);
      float lod = clamp(0.9 + away * 0.9, 0.0, 6.0);
      vec3 r = textureLod(tDiffuse, uv, lod).rgb;
      r += textureLod(tDiffuse, uv + vec2(0.0015, 0.0), lod + 0.5).rgb;
      r += textureLod(tDiffuse, uv - vec2(0.0015, 0.0), lod + 0.5).rgb;
      r /= 3.0;
      float fade = 1.0 - smoothstep(1.5, 9.0, length(vWorld.xz - vec2(0.0, 1.0)));
      // the pool of screen light on the desk in front of the laptop
      vec2 p = vec2(vWorld.x / 3.4, (vWorld.z - 1.6) / 2.6);
      float pool = exp(-dot(p, p) * 1.6) * 0.055;
      vec3 base = vec3(0.006, 0.006, 0.007);
      vec3 col = base + r * uRefl * fade + uGlow * uLevel * pool;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export const Desk: React.FC<{glow: THREE.Color; level: number; refl?: number}> = ({glow, level, refl = 0.26}) => {
  const {size} = useThree();
  const mirror = useMemo(() => {
    const m = new Reflector(new THREE.PlaneGeometry(60, 60), {
      textureWidth: Math.round(size.width * 0.5), textureHeight: Math.round(size.height * 0.5), clipBias: 0.002, shader: FloorShader as never, multisample: 0,
    });
    const t = m.getRenderTarget().texture;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    m.rotation.x = -Math.PI / 2;
    return m;
  }, [size.width, size.height]);
  const mat = mirror.material as THREE.ShaderMaterial;
  mat.uniforms.uGlow.value.copy(glow);
  mat.uniforms.uLevel.value = level;
  mat.uniforms.uRefl.value = refl;
  useEffect(() => () => { mirror.getRenderTarget().dispose(); mirror.geometry.dispose(); }, [mirror]);
  return <primitive object={mirror} />;
};

// ---- The laptop -------------------------------------------------------------------------------
const alu = new THREE.MeshStandardMaterial({color: '#1d1e21', metalness: 0.55, roughness: 0.58});
const aluDark = new THREE.MeshStandardMaterial({color: '#141517', metalness: 0.6, roughness: 0.5});
const keyMat = new THREE.MeshStandardMaterial({color: '#0c0c0d', metalness: 0.1, roughness: 0.55});
const wellMat = new THREE.MeshStandardMaterial({color: '#060607', metalness: 0.2, roughness: 0.8});
const padMat = new THREE.MeshStandardMaterial({color: '#151619', metalness: 0.3, roughness: 0.7});
const bezelMat = new THREE.MeshPhysicalMaterial({color: '#050505', metalness: 0.0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08});

const KEYS = (() => {
  const rows: [number, number[]][] = [];
  const u = 0.188;
  rows.push([0.55, Array(14).fill(1).map(() => u * 0.96)]); // function row, shorter keys handled by depth
  rows.push([0.0, [...Array(13).fill(u), u * 1.5]]);
  rows.push([0.0, [u * 1.5, ...Array(13).fill(u)]]);
  rows.push([0.0, [u * 1.8, ...Array(11).fill(u), u * 1.8]]);
  rows.push([0.0, [u * 2.3, ...Array(10).fill(u), u * 2.3]]);
  rows.push([0.0, [u, u, u, u * 1.25, u * 5.4, u * 1.25, u, u * 2.0]]);
  return rows.map(([, ws]) => ws);
})();

export const Laptop: React.FC<{screen: THREE.Texture; open?: number; dim?: number}> = ({screen, open = 1, dim = 1}) => {
  const geo = useMemo(() => {
    const base = new RoundedBoxGeometry(L.w, L.t, L.d, 4, 0.06);
    const lidG = new RoundedBoxGeometry(L.w, L.lidH, L.lidT, 4, 0.03);
    const key = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
    const pad = new RoundedBoxGeometry(1.25, 0.01, 0.78, 3, 0.004);
    const well = new THREE.PlaneGeometry(2.86, 1.2);
    const screenG = new THREE.PlaneGeometry(L.scrW, L.scrH);
    // the bezel is a frame round the panel, not a plane behind it: two coplanar-ish planes
    // z-fight under the reflection's oblique projection
    const frame = new THREE.Shape();
    const bw = (L.w - 0.05) / 2, bh = (L.lidH - 0.05) / 2;
    frame.moveTo(-bw, -bh); frame.lineTo(bw, -bh); frame.lineTo(bw, bh); frame.lineTo(-bw, bh); frame.lineTo(-bw, -bh);
    const hole = new THREE.Path();
    hole.moveTo(-L.scrW / 2, -L.scrH / 2 + 0.06); hole.lineTo(-L.scrW / 2, L.scrH / 2 + 0.06); hole.lineTo(L.scrW / 2, L.scrH / 2 + 0.06); hole.lineTo(L.scrW / 2, -L.scrH / 2 + 0.06); hole.lineTo(-L.scrW / 2, -L.scrH / 2 + 0.06);
    frame.holes.push(hole);
    const bezel = new THREE.ShapeGeometry(frame);
    return {base, lidG, key, pad, well, screenG, bezel};
  }, []);
  const keys = useMemo(() => {
    const out: {x: number; z: number; w: number; d: number}[] = [];
    const gap = 0.022, rowD = 0.188, top = -0.92;
    KEYS.forEach((ws, r) => {
      const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      let x = -total / 2;
      const d = r === 0 ? rowD * 0.55 : rowD;
      const z = top + (r === 0 ? d / 2 : rowD * 0.55 + gap + (r - 1) * (rowD + gap) + rowD / 2);
      ws.forEach((w) => { out.push({x: x + w / 2, z, w, d}); x += w + gap; });
    });
    return out;
  }, []);
  const inst = useMemo(() => {
    const m = new THREE.InstancedMesh(geo.key, keyMat, keys.length);
    const o = new THREE.Object3D();
    keys.forEach((k, i) => { o.position.set(k.x, L.t / 2 + 0.008, k.z); o.scale.set(k.w, 0.03, k.d); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [geo, keys]);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({map: screen, toneMapped: false}), [screen]);
  screenMat.color.setScalar(dim);
  return (
    <group>
      <mesh geometry={geo.base} material={alu} position={[0, L.t / 2, 0]} />
      <mesh geometry={geo.well} material={wellMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, L.t + 0.001, -0.41]} />
      <primitive object={inst} position={[0, L.t / 2 + 0.001, 0]} />
      <mesh geometry={geo.pad} material={padMat} position={[0, L.t + 0.002, 0.56]} />
      <group position={HINGE} rotation={[lidAngle(open), 0, 0]}>
        <group position={[0, L.lidH / 2, -L.lidT / 2]}>
          <mesh geometry={geo.lidG} material={aluDark} />
          <mesh geometry={geo.bezel} material={bezelMat} position={[0, 0, L.lidT / 2 + 0.006]} />
          <mesh geometry={geo.screenG} material={screenMat} position={[0, 0.06, L.lidT / 2 + 0.004]} />
        </group>
      </group>
    </group>
  );
};

// How much the laptop's own surfaces reflect an environment, when a scene has one (version G
// lights its desk objects with one; the laptop should stay lit by its screen).
export const laptopEnv = (k: number) => { for (const m of [alu, aluDark, keyMat, wellMat, padMat, bezelMat]) m.envMapIntensity = k; };

// Where the screen sits in world space (centre and normal), for its light.
export const screenFrame = (open = 1) => {
  const a = lidAngle(open);
  const up = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  const normal = new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
  const centre = HINGE.clone().add(up.clone().multiplyScalar(L.lidH / 2 + 0.06)).add(normal.clone().multiplyScalar(0.03));
  return {centre, normal, up};
};

// The screen's light on the keys and the room: a rectangle light the size of the panel.
export const ScreenLight: React.FC<{color: THREE.Color; level: number; open?: number}> = ({color, level, open = 1}) => {
  const light = useMemo(() => new THREE.RectAreaLight('#ffffff', 1, L.scrW, L.scrH), []);
  const {centre, normal} = screenFrame(open);
  light.position.copy(centre);
  light.lookAt(centre.clone().add(normal));
  light.color.copy(color);
  light.intensity = 3.6 * level;
  return <primitive object={light} />;
};

// The screen's bloom: what a camera sees round a bright panel in a dark room. A soft plane over
// the screen, a little larger than it, added on top.
const haloTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 512; c.height = 340;
  const g = c.getContext('2d')!;
  const img = g.createImageData(512, 340);
  for (let y = 0; y < 340; y++) for (let x = 0; x < 512; x++) {
    // distance outside the panel (the plane is 1.18 times the panel): nothing over the panel
    // itself, a falloff from its edge outward
    const hw = 256 / 1.18, hh = 170 / 1.18;
    const dx = Math.max(0, Math.abs(x - 256) - hw) / 40, dy = Math.max(0, Math.abs(y - 170) - hh) / 26;
    const inside = Math.abs(x - 256) <= hw && Math.abs(y - 170) <= hh;
    const v = inside ? 0 : Math.exp(-(dx * dx + dy * dy) * 3.2) * 0.9;
    const i = (y * 512 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(v * 255);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
export const Halo: React.FC<{color: THREE.Color; level: number; open?: number}> = ({color, level, open = 1}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}), []);
  mat.color.copy(color).multiplyScalar(0.07 * level);
  const {centre, normal, up} = screenFrame(open);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, normal), up, normal));
  return (
    <mesh material={mat} position={centre.clone().add(normal.clone().multiplyScalar(0.03))} quaternion={q}>
      <planeGeometry args={[L.scrW * 1.18, L.scrH * 1.18]} />
    </mesh>
  );
};

// ---- The screen: its own scene, rendered to a texture ------------------------------------------
// A photographer's studio to reflect in metal: dark, with two softboxes and a strip light, so
// brass and chrome show highlights and dark edges rather than a flat room.
export const studio = () => {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#0d0d0e');
  const box = (w: number, h: number, pos: [number, number, number], i: number, color = '#ffffff') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(i), side: THREE.DoubleSide}));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  box(9, 6, [-8, 9, 10], 3.0);           // the key softbox, top left
  box(2, 12, [10, 2, 6], 1.8);           // a strip on the right
  box(14, 4, [0, -10, 8], 0.5, '#ffe9cc'); // a warm bounce from below
  box(16, 10, [-3, 3, 18], 1.1);         // the big diffuser over the camera: flat metal faces read bright
  box(5, 16, [7, -2, 16], 0.25);         // a dimmer panel, so the faces have a gradient
  box(30, 30, [0, 0, -12], 0.12);        // the paper under it all
  return s;
};

export type Stage = {rt: THREE.WebGLRenderTarget; scene: THREE.Scene; cam: THREE.PerspectiveCamera; back: HTMLCanvasElement; front: HTMLCanvasElement; backTex: THREE.CanvasTexture; frontTex: THREE.CanvasTexture};

export const useStage = (): Stage => {
  const {gl} = useThree();
  return useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(SW, SH, {samples: 4, colorSpace: THREE.SRGBColorSpace});
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(gl);
    scene.environment = pmrem.fromScene(studio(), 0.02).texture;
    const cam = new THREE.PerspectiveCamera(22, SW / SH, 0.1, 100);
    cam.position.set(0, 0, 26);
    cam.lookAt(0, 0, 0);
    const mk = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; return c; };
    const back = mk(), front = mk();
    const backTex = new THREE.CanvasTexture(back); backTex.colorSpace = THREE.SRGBColorSpace;
    const frontTex = new THREE.CanvasTexture(front); frontTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = backTex;
    return {rt, scene, cam, back, front, backTex, frontTex};
  }, [gl]);
};

// The overlay pass: the front canvas drawn over the 3D, in screen space.
const overlay = (() => {
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.MeshBasicMaterial({transparent: true, toneMapped: false, depthTest: false, depthWrite: false});
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return {scene, cam, mat};
})();

// Renders the screen scene into its texture, then the room, each frame. `children` are put into
// the screen's scene (page units: the visible page is PAGE.w x PAGE.h, about 16.2 x 10.1, at z = 0).
export const Renderer: React.FC<{stage: Stage; children?: React.ReactNode; drawBack: (c: CanvasRenderingContext2D) => void; drawFront: (c: CanvasRenderingContext2D) => void}> =
  ({stage, children, drawBack, drawFront}) => {
    useFrame(({gl, scene, camera}) => {
      const b = stage.back.getContext('2d')!; b.clearRect(0, 0, SW, SH); drawBack(b); stage.backTex.needsUpdate = true;
      const f = stage.front.getContext('2d')!; f.clearRect(0, 0, SW, SH); drawFront(f); stage.frontTex.needsUpdate = true;
      gl.setRenderTarget(stage.rt);
      gl.clear();
      gl.render(stage.scene, stage.cam);
      overlay.mat.map = stage.frontTex;
      const ac = gl.autoClear; gl.autoClear = false;
      gl.render(overlay.scene, overlay.cam);
      gl.autoClear = ac;
      gl.setRenderTarget(null);
      gl.render(scene, camera);
    }, 1);
    return <>{createPortal(children, stage.scene)}</>;
  };

// The visible page at z = 0 under the screen camera, in scene units.
export const PAGE = {w: 2 * 26 * Math.tan(THREE.MathUtils.degToRad(11)) * (SW / SH), h: 2 * 26 * Math.tan(THREE.MathUtils.degToRad(11))};
// Canvas pixels to page units (origin centre, y up).
export const px = (x: number, y: number): [number, number] => [(x / SW - 0.5) * PAGE.w, (0.5 - y / SH) * PAGE.h];
