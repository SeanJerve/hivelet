// A laptop on a glossy black desk in a dark room, built in CSS 3D: the base with its
// keyboard and trackpad, the lid tipped back, the screen showing the pitch. The desk
// reflects it: the same laptop drawn again, mirrored through the desk plane (a true
// reflection, not a flipped picture), faded and softened. The screen is the only light: its
// colour falls on the keyboard, pools on the desk, spills on the wall behind.
import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {W, H} from './timeline';

export const BW = 1500, BD = 1000, BT = 18;          // base: width, depth, thickness
export const LH = 960, LT = 10, TILT = 14;           // lid: height, thickness, tipped back (degrees)
export const SCR = {x: 30, y: 26, w: 1440, h: 900};  // the screen inside the lid (16:10)
const P = 2600;                                      // perspective distance

export type Camera = {x: number; y: number; z: number; tilt: number; yaw: number; roll: number};
export type Glow = {color: [number, number, number]; level: number};

const camTransform = (c: Camera, mirror = false) =>
  `translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotateZ(${c.roll}deg) rotateX(${-c.tilt}deg) rotateY(${c.yaw}deg)${mirror ? ' scale3d(1, -1, 1)' : ''}`;

// Where a point of the laptop's own space lands on screen (for the 2D light effects).
export const project = (c: Camera, p: [number, number, number]): [number, number, number] => {
  let [x, y, z] = p;
  const ry = (c.yaw * Math.PI) / 180, rx = (-c.tilt * Math.PI) / 180, rz = (c.roll * Math.PI) / 180;
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  x += c.x; y += c.y; z += c.z;
  const k = P / (P - z);
  return [W / 2 + x * k, H / 2 + y * k, k];
};

const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

// The keyboard: a function row and five rows of keys, a wide space bar, arrow keys.
const ROWS: number[][] = [
  Array(14).fill(1),
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.1],
  [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.85],
  [2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.35],
  [1, 1, 1, 1.25, 5.2, 1.25, 1, 1, 1, 1],
];
const Keyboard: React.FC<{glow: Glow}> = ({glow}) => {
  const unit = 80, gap = 9, x0 = 118;
  let y = 64;
  return (
    <>
      <div style={{position: 'absolute', left: x0 - 14, top: 50, width: BW - 2 * (x0 - 14), height: 488, borderRadius: 14, background: '#17181b', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.7)'}} />
      {ROWS.map((row, r) => {
        const h = r === 0 ? 40 : 72;
        const total = row.reduce((a, b) => a + b, 0);
        const scale = (BW - 2 * x0 - gap * (row.length - 1)) / (total * unit);
        let x = x0;
        const els = row.map((u, i) => {
          const w = u * unit * scale;
          const el = (
            <div key={i} style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 8,
              background: `linear-gradient(180deg, ${rgba(glow.color, 0.10 * glow.level)} 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg, #232428 0%, #18191c 100%)`,
              boxShadow: `inset 0 1.5px 0 ${rgba(glow.color, 0.18 * glow.level + 0.04)}, 0 2px 2px rgba(0,0,0,0.6)`}} />
          );
          x += w + gap;
          return el;
        });
        y += h + gap;
        return <React.Fragment key={r}>{els}</React.Fragment>;
      })}
    </>
  );
};

// One laptop, in its own space: x across, y down (the desk is y = 0), z toward the viewer.
const Laptop: React.FC<{screen: React.ReactNode; glow: Glow; mirror?: boolean}> = ({screen, glow, mirror}) => (
  <div style={{position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d'}}>
    {/* base: top, front, left side */}
    <div style={{position: 'absolute', left: -BW / 2, top: 0, width: BW, height: BD, transformOrigin: '0 0', transform: `translate3d(0, ${-BT}px, ${-BD / 2}px) rotateX(90deg)`,
      borderRadius: 26, background: 'linear-gradient(180deg, #2c2d31 0%, #26272a 100%)', overflow: 'hidden'}}>
      <Keyboard glow={glow} />
      <div style={{position: 'absolute', left: BW / 2 - 300, top: 590, width: 600, height: 350, borderRadius: 18, background: '#2a2b2f', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.05), inset 0 2px 4px rgba(0,0,0,0.35)'}} />
      {/* the screen's light falling on the base, strongest by the hinge */}
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(glow.color, 0.30 * glow.level)} 0%, ${rgba(glow.color, 0.10 * glow.level)} 45%, rgba(0,0,0,0) 85%)`}} />
    </div>
    <div style={{position: 'absolute', left: -BW / 2, top: -BT, width: BW, height: BT, transform: `translateZ(${BD / 2}px)`, borderRadius: '0 0 10px 10px',
      background: 'linear-gradient(180deg, #3a3b40 0%, #1d1e21 100%)'}} />
    <div style={{position: 'absolute', left: -BW / 2, top: -BT, width: BD, height: BT, transformOrigin: '0 0', transform: `translateZ(${-BD / 2}px) rotateY(-90deg)`, background: '#202124'}} />
    {/* the lid, tipped back about the hinge */}
    <div style={{position: 'absolute', left: -BW / 2, top: -BT - LH, width: BW, height: LH, transformOrigin: '50% 100%', transform: `translateZ(${-BD / 2 + 8}px) rotateX(${TILT}deg)`, transformStyle: 'preserve-3d'}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 24, background: '#0b0b0c', boxShadow: 'inset 0 0 0 2px #1c1d20'}}>
        <div style={{position: 'absolute', left: SCR.x, top: SCR.y, width: SCR.w, height: SCR.h, overflow: 'hidden', borderRadius: 6, background: '#000'}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1600, height: 1000, transform: `scale(${SCR.w / 1600})`, transformOrigin: '0 0'}}>{screen}</div>
          {/* glass: a faint diagonal sheen and the panel's falloff at its edges */}
          {mirror ? null : <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 32%, rgba(255,255,255,0) 50%)'}} />}
          <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 60px rgba(0,0,0,0.25)'}} />
        </div>
        <div style={{position: 'absolute', left: BW / 2 - 4, top: 10, width: 8, height: 8, borderRadius: 4, background: '#1d1e22'}} />
      </div>
      <div style={{position: 'absolute', inset: 0, borderRadius: 24, transform: `translateZ(${-LT}px)`, background: '#2b2c30'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: LT, height: LH, transformOrigin: '0 0', transform: 'rotateY(90deg)', background: '#1a1b1e'}} />
    </div>
  </div>
);

export const Room: React.FC<{cam: Camera; glow: Glow; screen: React.ReactNode; mirrorScreen: React.ReactNode}> = ({cam, glow, screen, mirrorScreen}) => {
  const f = useCurrentFrame();
  const [fx, fy] = project(cam, [0, 0, BD / 2]);                      // front edge on the desk
  const [sx, sy] = project(cam, [0, -BT - LH * 0.52, -BD / 2 - 110]);  // the middle of the screen
  const [px, py] = project(cam, [0, 0, BD / 2 + 520]);               // where the light pools
  const L = glow.level;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 30%, #121214 0%, #08080a 70%)', overflow: 'hidden'}}>
      {/* the room: a dark wall, the desk running to it, lit by the screen */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 55% at ${(sx / W) * 100}% ${(sy / H) * 100 - 6}%, ${rgba(glow.color, 0.22 * L)} 0%, ${rgba(glow.color, 0.08 * L)} 45%, rgba(0,0,0,0) 80%)`}} />
      <AbsoluteFill style={{top: fy - 40, background: 'linear-gradient(180deg, #0d0d0f 0%, #050506 100%)'}} />
      {/* the reflection, in the desk */}
      <AbsoluteFill style={{opacity: 0.5, filter: 'blur(1.6px)', WebkitMaskImage: `linear-gradient(180deg, transparent ${(fy / H) * 100 - 1}%, #000 ${(fy / H) * 100 + 1}%, rgba(0,0,0,0.25) ${(fy / H) * 100 + 30}%, transparent ${(fy / H) * 100 + 55}%)`,
        maskImage: `linear-gradient(180deg, transparent ${(fy / H) * 100 - 1}%, #000 ${(fy / H) * 100 + 1}%, rgba(0,0,0,0.25) ${(fy / H) * 100 + 30}%, transparent ${(fy / H) * 100 + 55}%)`}}>
        <div style={{position: 'absolute', inset: 0, perspective: P}}>
          <div style={{position: 'absolute', left: W / 2, top: H / 2, transformStyle: 'preserve-3d', transform: camTransform(cam, true)}}>
            <Laptop screen={mirrorScreen} glow={glow} mirror />
          </div>
        </div>
      </AbsoluteFill>
      {/* the desk's gloss and the pool of screen light on it */}
      <AbsoluteFill style={{top: fy - 10, background: `radial-gradient(ellipse 48% 30% at ${(px / W) * 100}% ${((py - fy + 10) / (H - fy + 10)) * 100}%, ${rgba(glow.color, 0.10 * L)} 0%, rgba(0,0,0,0) 70%)`, mixBlendMode: 'screen'}} />
      {/* the laptop */}
      <div style={{position: 'absolute', inset: 0, perspective: P}}>
        <div style={{position: 'absolute', left: W / 2, top: H / 2, transformStyle: 'preserve-3d', transform: camTransform(cam)}}>
          <Laptop screen={screen} glow={glow} />
        </div>
      </div>
      {/* the screen's light in the air around it */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 38% 42% at ${(sx / W) * 100}% ${(sy / H) * 100}%, ${rgba(glow.color, 0.07 * L)} 0%, rgba(0,0,0,0) 70%)`, mixBlendMode: 'screen', pointerEvents: 'none'}} />
      {/* lens: the corners fall away; film grain */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 80% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('paper/tex/grain.png')})`, backgroundSize: '320px', backgroundPosition: `${(f * 137) % 320}px ${(f * 251) % 320}px`, mixBlendMode: 'multiply', opacity: 0.4}} />
    </AbsoluteFill>
  );
};
