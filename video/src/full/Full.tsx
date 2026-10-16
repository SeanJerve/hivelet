// Version J: the reference's screens, full frame. No laptop, no room, no phone in a hand: the
// video is the page. Real objects (modelled in three.js, lit by a soft studio light, casting
// shadows onto the page) sit on clean editorial pages; heavy grotesk words, the serif italic for
// "No.", a small section label top left and the voice typed in mono along the bottom with a
// block cursor are HTML over them. The objects and their timing are version F's
// (src/objects/Objects.tsx); only the frame changed. 1920x1080, 60 fps.
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {studio} from '../objects/world';
import {Catcher, PageLight} from '../objects/props';
import {
  ACCENT, AskScene, BG, BookScene, BuiltScene, CashScene, ChatScene, CloseScene, DARK, GREEN_DEEP, IDS, KeyScene, LedgerScene, LINE, lineAt, PayScene,
  QualityScene, RackScene, RecordsScene, RepairScene, sceneAt, type Scene, SecureScene, seg, TalkScene, UsbScene,
} from '../objects/Objects';
import {CORAL, ease, GREEN, INK, PAPER, WHITE} from '../objects/draw';
import {Caption, FONT, Label} from '../screen/kit';
import AT from '../objects/vo-at.json';
import LEN from '../objects/vo.json';

export const JW = 1920, JH = 1080, FPS = 60;
export const J_END = 57.5;
export const J_TOTAL = Math.round(J_END * FPS);
const FADE = 56.1;

// ---- The page camera: looking straight down at the page, closer for small things ----------------
const camFor = (s: Scene, _t: number) => {
  const z: Partial<Record<Scene, number>> = {key: 21, rack: 25.5, usb: 20, cash: 21.5, book: 22.5, chat: 20, talk: 24.5, built: 20, ledger: 26, pay: 22, repair: 19.5, ask: 19.5, close: 20.5, quality: 22.5, secure: 23.5};
  const base = z[s] ?? 21;
  const pos = new THREE.Vector3(0, 0, base);
  const look = new THREE.Vector3(0, 0, 0);
  if (s === 'records') { pos.set(1.8, -17, 24); look.set(1.5, -0.7, 3.0); }
  if (s === 'secure') { pos.set(0, -4.5, base); }
  return {pos, look};
};
const pushIn = (t: number) => {
  // scenes start: a slow 3% push across each one
  const starts = [0, 3.45, 9.75, 12.25, 13.85, 15.95, 18.05, 20.7, 22.4, 24.8, 28.8, 32.3, 35.4, 40.3, 44.4, 47.0, 50.8, J_END];
  let i = 0; while (i < starts.length - 2 && t >= starts[i + 1]) i++;
  return 1 - 0.035 * seg(t, starts[i], starts[i + 1]);
};
const projector = (s: Scene, t: number) => {
  const cam = new THREE.PerspectiveCamera(22, JW / JH, 0.1, 100);
  const {pos, look} = camFor(s, t);
  cam.position.copy(pos).multiplyScalar(pushIn(t)); cam.lookAt(look); cam.updateMatrixWorld();
  return (x: number, y: number, z: number): [number, number] => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * JW, (1 - v.y) / 2 * JH]; };
};

const Page: React.FC<{t: number; s: Scene}> = ({t, s}) => {
  const {camera, scene, gl} = useThree();
  useMemo(() => {
    scene.environment = new THREE.PMREMGenerator(gl).fromScene(studio(), 0.02).texture;
    gl.toneMapping = THREE.NoToneMapping;
  }, [gl, scene]);
  const {pos, look} = camFor(s, t);
  const cam = camera as THREE.PerspectiveCamera;
  if (cam.fov !== 22) { cam.fov = 22; cam.updateProjectionMatrix(); }
  camera.position.copy(pos).multiplyScalar(pushIn(t)); camera.lookAt(look);
  return (
    <>
      <PageLight intensity={s === 'no' ? 0.4 : 2.2} />
      <Catcher opacity={BG[s] === PAPER ? 0.28 : 0.36} />
      {s === 'key' ? <KeyScene t={t} /> : null}
      {s === 'rack' ? <RackScene t={t} /> : null}
      {s === 'usb' ? <UsbScene t={t} /> : null}
      {s === 'cash' ? <CashScene t={t} /> : null}
      {/* the open cover lies to the left: the spread is centred, not the book */}
      {s === 'book' ? <group position={[2.9, 0, 0]}><BookScene t={t} /></group> : null}
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
    </>
  );
};

// ---- Under the objects: the page itself, and its large type --------------------------------------
const mono = (size: number, color: string, weight = 500): React.CSSProperties => ({fontFamily: FONT.mono, fontSize: size, fontWeight: weight, color, letterSpacing: '0.01em'});
const Back: React.FC<{t: number; s: Scene; toPx: (x: number, y: number, z: number) => [number, number]}> = ({t, s, toPx}) => {
  if (s === 'talk') {
    const pts = [toPx(-4.3, 2.4, 0.3), toPx(4.4, 2.6, 0.2), toPx(-4.0, -1.6, 0.3), toPx(4.3, -1.3, 0.2)];
    const pairs = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3], [1, 2]];
    return (
      <svg width={JW} height={JH} style={{position: 'absolute', inset: 0}}>
        {pairs.map(([a, b], i) => {
          const p = ease(seg(t, 18.5 + i * 0.08, 18.9 + i * 0.08));
          const [x0, y0] = pts[a], [x1, y1] = pts[b];
          return <line key={i} x1={x0} y1={y0} x2={x0 + (x1 - x0) * p} y2={y0 + (y1 - y0) * p} stroke="rgba(20,20,20,0.35)" strokeWidth={3} strokeDasharray="12 14" />;
        })}
        {pairs.map(([a, b], i) => {
          const k = ease(seg(t, 19.45 + i * 0.07, 19.65 + i * 0.07));
          if (k <= 0) return null;
          const mx = (pts[a][0] + pts[b][0]) / 2, my = (pts[a][1] + pts[b][1]) / 2, r = 20 * k;
          return (
            <g key={`x${i}`}>
              <circle cx={mx} cy={my} r={34 * k} fill={BG.talk} />
              <path d={`M ${mx - r} ${my - r} L ${mx + r} ${my + r} M ${mx + r} ${my - r} L ${mx - r} ${my + r}`} stroke={CORAL} strokeWidth={7} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    );
  }
  if (s === 'no') {
    const p = ease(seg(t, 20.8, 21.2));
    return <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 420, color: WHITE, opacity: p, filter: `blur(${(1 - p) * 16}px)`, letterSpacing: '-0.02em'}}>No.</div>;
  }
  if (s === 'built') {
    const k = ease(seg(t, 23.2, 23.85));
    const [cx, cy] = toPx(-3.2, 0.55, 0.3);
    return (
      <>
        <div style={{position: 'absolute', inset: 0, background: GREEN_DEEP, clipPath: `circle(${k * 2300}px at ${cx}px ${cy}px)`}} />
        {t > 23.45 ? <div style={{position: 'absolute', left: toPx(-0.6, 0, 0)[0], top: cy - 110, fontFamily: FONT.brand, fontWeight: 800, fontSize: 210, letterSpacing: '-0.035em', color: WHITE, opacity: ease(seg(t, 23.45, 23.8))}}>Hivelet</div> : null}
      </>
    );
  }
  if (s === 'repair') {
    return (
      <>
        {['Requested', 'In progress', 'Done'].map((h, i) => {
          const x = toPx(-5.2 + i * 5.2, 0, 0)[0];
          return (
            <React.Fragment key={h}>
              <div style={{position: 'absolute', left: x - 140, top: 200, width: 280, textAlign: 'center', ...mono(30, i === 2 && t > 34.55 ? GREEN : 'rgba(20,20,20,0.5)', 600), letterSpacing: '0.12em'}}>{h.toUpperCase()}</div>
              {i > 0 ? <div style={{position: 'absolute', left: toPx(-2.6 + (i - 1) * 5.2, 0, 0)[0], top: 180, width: 2, height: 700, background: 'rgba(20,20,20,0.12)'}} /> : null}
            </React.Fragment>
          );
        })}
      </>
    );
  }
  if (s === 'records') {
    const n = Math.round(937 * ease(seg(t, 40.45, 42.1)));
    return (
      <div style={{position: 'absolute', left: 140, top: 330}}>
        <div style={{fontFamily: FONT.grot, fontWeight: 800, fontSize: 340, lineHeight: 0.9, letterSpacing: '-0.05em', color: WHITE, fontVariantNumeric: 'tabular-nums'}}>{n}</div>
        <div style={{...mono(34, 'rgba(255,255,255,0.8)'), marginTop: 26}}>of her real records, moved in</div>
      </div>
    );
  }
  if (s === 'secure' && t > 46.3) {
    return <div style={{position: 'absolute', left: 0, right: 0, top: 860, textAlign: 'center', ...mono(28, 'rgba(255,255,255,0.88)'), opacity: ease(seg(t, 46.3, 46.7))}}>Qualys SSL Labs · Mozilla Observatory · securityheaders.com</div>;
  }
  if (s === 'quality' && t > 48.3) {
    const a = ease(seg(t, 48.3, 48.8));
    return (
      <div style={{position: 'absolute', left: 1100, top: 330, opacity: a}}>
        <div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 340, lineHeight: 0.9, color: INK}}>4.53</div>
        <div style={{...mono(32, 'rgba(20,20,20,0.6)'), marginTop: 22}}>out of 5 · Very High Quality</div>
      </div>
    );
  }
  if (s === 'close' && t > 51.0) {
    return <div style={{position: 'absolute', left: 760, top: 330, fontFamily: FONT.brand, fontWeight: 800, fontSize: 230, letterSpacing: '-0.035em', color: INK, opacity: ease(seg(t, 51.0, 51.4))}}>Hivelet</div>;
  }
  return null;
};

// ---- Over the objects: labels, leader lines, the address, the caption -----------------------------
const NAMES: Record<Scene, [string, string]> = {
  key: ['01', 'a key'], rack: ['02', 'thirty-three rooms'], usb: ['03', 'her books'], cash: ['04', 'rent'], book: ['05', 'invoices'], chat: ['06', 'repairs'],
  talk: ['07', 'four places'], no: ['', ''], built: ['08', 'hivelet'], ledger: ['09', 'ledger'], pay: ['10', 'pay'], repair: ['11', 'repairs'], ask: ['12', 'inquiries'],
  records: ['13', 'records'], secure: ['14', 'security'], quality: ['15', 'quality'], close: ['16', 'hivelet'],
};
const Leader: React.FC<{from: [number, number]; dx: number; dy: number; note: string; p: number; dark?: boolean}> = ({from, dx, dy, note, p, dark}) => {
  if (p <= 0) return null;
  const col = dark ? 'rgba(236,235,230,0.88)' : 'rgba(20,20,20,0.82)';
  const q = ease(Math.min(1, p * 1.4)), k = Math.max(0, (p - 0.5) * 2);
  const [x0, y0] = from, x1 = x0 + dx * q, y1 = y0 + dy * q;
  return (
    <>
      <svg width={JW} height={JH} style={{position: 'absolute', inset: 0}}>
        <circle cx={x0} cy={y0} r={6} fill={col} />
        <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={col} strokeWidth={2.5} />
      </svg>
      <div style={{position: 'absolute', left: x0 + dx + 16, top: y0 + dy - 20, whiteSpace: 'nowrap', ...mono(32, col)}}>{note.slice(0, Math.round(k * note.length))}</div>
    </>
  );
};
const Front: React.FC<{t: number; s: Scene; toPx: (x: number, y: number, z: number) => [number, number]}> = ({t, s, toPx}) => {
  const dark = DARK.has(s) || (s === 'built' && t > 23.4) || s === 'records' || s === 'secure';
  const id = lineAt(t);
  return (
    <>
      {NAMES[s][0] ? <Label n={NAMES[s][0]} text={NAMES[s][1]} dark={dark} /> : null}
      {s === 'rack' ? <Leader from={toPx(0.2, -0.2, 0.8)} dx={260} dy={130} note="1 vacant" p={seg(t, 8.95, 9.6)} /> : null}
      {s === 'usb' ? <Leader from={toPx(1.1, 1.25, 0.7)} dx={230} dy={-160} note="the only copy." p={seg(t, 11.35, 12.1)} dark /> : null}
      {s === 'ask' ? <Leader from={toPx(0.9, 0.5, 0.5)} dx={250} dy={180} note="no account needed." p={seg(t, 38.65, 39.6)} dark /> : null}
      {s === 'close' && t > 52.9 ? (() => {
        const url = 'hivelet.vercel.app', n = Math.round(Math.max(0, Math.min(1, (t - 53.2) / 0.9)) * url.length), a = ease(seg(t, 52.9, 53.2));
        const on = n < url.length || Math.floor(t * 2.5) % 2 === 0;
        return (
          <div style={{position: 'absolute', left: 770, top: 640, opacity: a}}>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 18, padding: '22px 36px', borderRadius: 60, background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.12)', ...mono(34, INK)}}>
              <span style={{width: 18, height: 18, borderRadius: 9, background: GREEN}} />
              <span>{url.slice(0, n)}</span>
              <span style={{display: 'inline-block', width: 18, height: 36, background: GREEN, opacity: on ? 1 : 0, marginLeft: -12}} />
            </div>
            {t > 54.4 ? (
              <div style={{marginTop: 46, opacity: ease(seg(t, 54.4, 54.8))}}>
                <div style={mono(26, 'rgba(20,20,20,0.55)')}>Group 4 · Bicol University · IT 124 Capstone Project 2</div>
                <div style={{...mono(26, 'rgba(20,20,20,0.78)', 600), marginTop: 10}}>Lloyd · Sean · Eljohn · Vince · Kiel</div>
              </div>
            ) : null}
          </div>
        );
      })() : null}
      {id && id !== 'no' && !(s === 'close' && t > 54.2) ? (
        <Caption text={LINE[id]} at={Math.round(AT[id] * FPS)} dur={Math.max(0.4, LEN[id] - 0.15)} dark={dark} accent={ACCENT[id] ?? []} x={110} y={968} size={36} width={1700}
          color={s === 'secure' || s === 'records' || (s === 'built' && t > 23.4) ? WHITE : GREEN} />
      ) : null}
    </>
  );
};

const files = new Set(getStaticFiles().map((x) => x.name));

export const Full: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const s = sceneAt(t);
  const toPx = projector(s, t);
  const bg = s === 'built' ? PAPER : BG[s];
  return (
    <AbsoluteFill style={{background: bg}}>
      <Back t={t} s={s} toPx={toPx} />
      <ThreeCanvas width={JW} height={JH} shadows gl={{preserveDrawingBuffer: true, antialias: true, alpha: true}} camera={{fov: 22, near: 0.1, far: 100, position: [0, 0, 21]}} style={{position: 'absolute', inset: 0}}>
        <Page t={t} s={s} />
      </ThreeCanvas>
      <Front t={t} s={s} toPx={toPx} />
      <AbsoluteFill style={{background: '#000', opacity: ease(seg(t, FADE, FADE + 0.9)), pointerEvents: 'none'}} />
      {IDS.map((id) => (
        <Sequence key={id} from={Math.round(AT[id] * FPS)} durationInFrames={Math.ceil((LEN[id] + 0.2) * FPS)} layout="none">
          <Audio src={staticFile(`objects/vo/${id}.wav`)} />
        </Sequence>
      ))}
      {files.has('objects/score.wav') ? <Audio src={staticFile('objects/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
