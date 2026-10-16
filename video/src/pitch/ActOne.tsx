// Act one, 0 to 20.5 s: the problem, and the turn. A point of light becomes 33 units;
// the units collapse into one landlady; her single row of cells becomes a spreadsheet
// that collapses into one USB drive; three records arrive and fail to connect; then the
// thread runs through all three, pulls them in, and draws the Hivelet mark on the drop.
import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {MessageCircle, MessagesSquare, Footprints, ReceiptText, Wrench, Inbox} from 'lucide-react';
import {jakarta, sora} from '../theme';
import {HEX_PATH, Mark} from '../ui/Kit';
import {Aurora, Camera, expo, GREEN, Glass, inQuint, Label, lerp, MBlur, P, quint, Rise, Slam, speed, spline, spr, sweep, t01, Thread, WARM, W, H, Pt} from './kit';
import {f as F, vo0, vo1} from './timeline';

// ---- 0 to 4.2 s: thirty-three units, one landlady --------------------------------------
const COLS = 11, ROWS = 3, CELL = 46, GAP = 16;
const GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_X = (W - GRID_W) / 2, GRID_Y = 742;
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const U = vo0('units'), L = vo0('landlady');
  const dot = t01(f, 4, 40) * (1 - t01(f, U - 2, U + 6));
  const pulse = 1 + Math.sin(f / 5) * 0.12;
  // The 33 cells: out of the point of light into the grid, then into one cell.
  const one = {x: W / 2 - CELL / 2, y: GRID_Y + CELL + GAP / 2};
  const merge = t01(f, L + 4, L + 34, quint);
  const stretch = t01(f, F(3.55), F(4.2), quint);
  return (
    <AbsoluteFill>
      <Camera hits={[U, L]} drift={0.6}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 16 * pulse, height: 16 * pulse, borderRadius: '50%', background: '#fff', opacity: dot,
            boxShadow: `0 0 40px 12px ${P.glow}, 0 0 120px 40px rgba(95,242,168,0.35)`}} />
        </AbsoluteFill>
        {/* "33" then "1": the old figure leaves upward, the new one lands. */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center'}}>
          {f < L + 20 ? <Slam text="33" at={U} out={L - 4} size={380} gradient={GREEN} /> : null}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center', opacity: 1 - stretch}}>
          {f >= L ? <Slam text="1" at={L + 2} size={380} gradient={sweep(f, L + 10, P.white, '#fff', P.glow)} /> : null}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 612, display: 'flex', justifyContent: 'center', opacity: 1 - stretch}}>
          {f < L + 6 ? <Rise text="units" at={U + 8} out={L - 6} size={64} weight={600} ls="-0.02em" color={P.soft} /> : null}
          {f >= L ? <div style={{position: 'absolute'}}><Rise text="landlady" at={L + 8} size={64} weight={600} ls="-0.02em" color={P.soft} /></div> : null}
        </div>
        {Array.from({length: COLS * ROWS}, (_, i) => {
          const c = i % COLS, r = Math.floor(i / COLS);
          const slot = {x: GRID_X + c * (CELL + GAP), y: GRID_Y + r * (CELL + GAP)};
          const dist = Math.hypot(c - 5, r - 1);
          const out = spr(f, U + 4 + dist * 2.2, {damping: 14, stiffness: 110});
          const x0 = W / 2 - CELL / 2, y0 = H / 2 - CELL / 2;
          let x = lerp(x0, slot.x, out), y = lerp(y0, slot.y, out);
          x = lerp(x, one.x, merge); y = lerp(y, one.y, merge);
          const v = speed(f, L + 4, L + 34, quint);
          const isOne = i === 16;
          const w = isOne ? lerp(CELL, W + 200, stretch) : CELL;
          const left = isOne ? lerp(x, -100, stretch) : x;
          const h = isOne ? lerp(CELL, 4, stretch) : CELL;
          return (
            <MBlur key={i} x={Math.abs(slot.x - one.x) * v * 0.03} y={Math.abs(slot.y - one.y) * v * 0.03}
              style={{position: 'absolute', left, top: y + (CELL - h) / 2, opacity: Math.min(1, out * 2) * (isOne ? 1 : 1 - t01(f, L + 28, L + 36))}}>
              <div style={{width: w, height: h, borderRadius: isOne ? lerp(12, 2, stretch) : 12, boxSizing: 'border-box',
                border: `2px solid ${isOne && merge > 0.9 ? '#eafff3' : P.glow}`, background: isOne && merge > 0.9 ? P.glow : 'rgba(95,242,168,0.10)',
                boxShadow: `0 0 ${isOne ? 40 : 18}px rgba(95,242,168,${isOne ? 0.7 : 0.35})`}} />
            </MBlur>
          );
        })}
      </Camera>
    </AbsoluteFill>
  );
};

// ---- 4.2 to 9 s: every peso, one spreadsheet, one USB drive ------------------------------
const SHEET_COLS = ['Unit', 'Name', 'Rent for', 'Paid', 'Inv.', 'Rent', 'Water', 'Total'];
const SHEET_W = [90, 250, 200, 150, 120, 170, 140, 170];
const NAMES = ['Andrea V.', 'Paolo D.', 'Kristine S.', 'Mark L.', 'Bea M.', 'Joshua R.', 'Ella C.', 'Carlo B.', 'Nicole O.', 'Renzo A.', 'Trisha D.', 'Miguel S.'];
const UNITS = ['1a', '1b', '1c', '1d', '1e', '1f', '1g', '1h', '2a', '2b', '2c', '2d'];
const RENTS = [4500, 4500, 4800, 4800, 4500, 4500, 4800, 4500, 6000, 4800, 4500, 4800];
export const Drive: React.FC = () => {
  const f = useCurrentFrame();
  const S = F(4.2), D = vo0('drive');
  const intro = t01(f, S, S + 30, quint);
  const collapse = t01(f, F(6.85), F(7.45), quint);
  const usb = t01(f, F(7.2), F(8.0), quint);
  const fall = t01(f, F(8.45), F(9.0), inQuint);
  const scroll = (f - S) * 9;
  const rowH = 66;
  // The drive, centred in the right half, drawn by the thread as an outline.
  const DX = 1290, DY = 470, DW = 420, DH = 170;
  const outline: Pt[] = [
    {x: DX + 40, y: DY}, {x: DX + DW - 40, y: DY}, {x: DX + DW, y: DY + 40}, {x: DX + DW, y: DY + DH - 40}, {x: DX + DW - 40, y: DY + DH},
    {x: DX + 40, y: DY + DH}, {x: DX, y: DY + DH - 40}, {x: DX, y: DY + 40}, {x: DX + 40, y: DY},
  ];
  const plug: Pt[] = [{x: DX, y: DY + 55}, {x: DX - 90, y: DY + 55}, {x: DX - 90, y: DY + DH - 55}, {x: DX, y: DY + DH - 55}];
  return (
    <AbsoluteFill>
      <Aurora tone="warm" intensity={0.8} />
      {/* The sheet: an endless river of her rows in steep perspective. */}
      <AbsoluteFill style={{perspective: 1400, perspectiveOrigin: '50% 30%', opacity: intro * (1 - collapse)}}>
        <MBlur y={9 * 0.5}>
          <div style={{position: 'absolute', left: 300, top: -40, width: 1500, transformOrigin: '50% 0', transform: `rotateX(50deg) rotateZ(-9deg) scaleY(${1 - collapse})`,
            fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 32, color: 'rgba(244,251,247,0.78)'}}>
            <div style={{display: 'flex', height: rowH, alignItems: 'center', color: P.amber, fontWeight: 700, borderBottom: '2px solid rgba(255,181,71,0.5)'}}>
              {SHEET_COLS.map((c, i) => <div key={c} style={{width: SHEET_W[i], paddingLeft: 14}}>{c}</div>)}
            </div>
            <div style={{height: 1300, overflow: 'hidden', position: 'relative'}}>
              <div style={{transform: `translateY(${-(scroll % (rowH * 12))}px)`}}>
                {Array.from({length: 36}, (_, r) => {
                  const k = r % 12;
                  const hot = random(`hot${Math.floor((scroll / rowH + r) / 12)}${k}`) > 0.82;
                  const vals = [UNITS[k], NAMES[k], `Sep ${k + 3}`, `Sep ${k + 2}`, `${5070 + r}`, RENTS[k].toLocaleString('en-US') + '.00', (200 * (1 + (k % 2))).toFixed(2), (RENTS[k] + 200 * (1 + (k % 2))).toLocaleString('en-US') + '.00'];
                  return (
                    <div key={r} style={{display: 'flex', height: rowH, alignItems: 'center', borderBottom: '1px solid rgba(244,251,247,0.09)', background: hot ? 'rgba(255,181,71,0.10)' : 'transparent'}}>
                      {vals.map((v, i) => <div key={i} style={{width: SHEET_W[i], paddingLeft: 14, color: hot && i >= 5 ? P.amber : undefined}}>{v}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </MBlur>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(3,7,5,0.92) 0%, rgba(3,7,5,0.55) 46%, rgba(3,7,5,0) 70%)'}} />
      {/* The words. */}
      <div style={{position: 'absolute', left: 140, top: 300}}>
        <Rise text={'Every peso,'} at={D + 6} out={F(8.4)} size={128} />
        <Rise text={'one sheet,'} at={D + 50} out={F(8.4)} size={128} color={P.soft} style={{marginTop: 14}} />
        <Rise text={'one USB drive.'} at={F(7.15)} out={F(8.4)} size={128} accent={['USB', 'drive.']} accentGradient={WARM} style={{marginTop: 14}} />
      </div>
      {/* The thread draws the drive; then it fills, its light blinks, and it falls. */}
      <AbsoluteFill style={{transformOrigin: `${DX + DW / 2}px ${DY + DH / 2}px`, transform: `translateY(${fall * 900}px) rotate(${fall * 28}deg)`, opacity: 1 - t01(f, F(8.7), F(9.0))}}>
        <MBlur y={speed(f, F(8.45), F(9.0), inQuint) * 60}>
          <div style={{position: 'absolute', left: DX - 90, top: DY, width: DW + 90, height: DH, opacity: t01(f, F(7.7), F(8.0))}}>
            <div style={{position: 'absolute', left: 0, top: 55, width: 90, height: DH - 110, background: 'linear-gradient(180deg, #8e9a93, #5d6962)', borderRadius: '8px 0 0 8px'}} />
            <div style={{position: 'absolute', left: 90, top: 0, width: DW, height: DH, borderRadius: 40, background: 'linear-gradient(160deg, #1d2a23 0%, #0d1611 100%)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 46px', boxSizing: 'border-box'}}>
              <div>
                <div style={{fontFamily: jakarta, fontWeight: 700, fontSize: 18, letterSpacing: '0.3em', color: P.faint}}>REMOVABLE</div>
                <div style={{fontFamily: jakarta, fontWeight: 600, fontSize: 26, color: P.soft, marginTop: 8}}>Her workbook.xlsx</div>
              </div>
              <div style={{width: 18, height: 18, borderRadius: 9, background: Math.sin(f / 4) > 0 ? P.amber : 'rgba(255,181,71,0.25)', boxShadow: `0 0 18px ${P.amber}`}} />
            </div>
          </div>
          <Thread pts={outline} to={usb} width={3} color={P.amber} />
          <Thread pts={plug} to={t01(f, F(7.6), F(7.9))} width={3} color={P.amber} />
          <div style={{position: 'absolute', left: DX + 90, top: DY + DH + 34, opacity: t01(f, F(7.9), F(8.2))}}>
            <Label color={P.amber}>The only copy</Label>
          </div>
        </MBlur>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- 9 to 15.25 s: three records that never meet -----------------------------------------
const PANEL_W = 540, PANEL_H = 700, PANEL_GAP = 50, PANEL_Y = 200;
export const PANEL_X = [0, 1, 2].map((i) => (W - (3 * PANEL_W + 2 * PANEL_GAP)) / 2 + i * (PANEL_W + PANEL_GAP));
const Panel: React.FC<{i: number; at: number; title: string; sub: string; icon: React.ReactNode; children: React.ReactNode}> = ({i, at, title, sub, icon, children}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, {damping: 18, stiffness: 120});
  const v = Math.max(0, 1 - p);
  return (
    <MBlur y={v * 16} style={{position: 'absolute', left: PANEL_X[i], top: PANEL_Y, transform: `translateY(${(1 - p) * 220}px) scale(${lerp(0.92, 1, p)})`, opacity: Math.min(1, p * 1.8)}}>
      <Glass w={PANEL_W} h={PANEL_H} style={{border: '1px solid rgba(255,181,71,0.22)'}}>
        <div style={{position: 'absolute', left: 40, top: 40, display: 'flex', alignItems: 'center', gap: 14, color: P.amber}}>{icon}<Label color={P.amber} size={20}>{`0${i + 1}`}</Label></div>
        <div style={{position: 'absolute', left: 40, right: 40, top: 110, height: 330}}>{children}</div>
        <div style={{position: 'absolute', left: 40, bottom: 44}}>
          <Rise text={title} at={at + 6} size={86} />
          <Rise text={sub} at={at + 16} size={36} weight={500} ls="-0.01em" font={jakarta} color={P.soft} style={{marginTop: 14}} />
        </div>
      </Glass>
    </MBlur>
  );
};
const Receipt: React.FC<{no: string; unit: string; amt: string; rot: number; x: number; y: number; circle?: number}> = ({no, unit, amt, rot, x, y, circle = 0}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 300, height: 190, borderRadius: 10, background: '#f3eee2', transform: `rotate(${rot}deg)`,
    boxShadow: '0 20px 40px rgba(0,0,0,0.45)', padding: '18px 22px', boxSizing: 'border-box', fontFamily: 'Georgia, serif', color: '#5b4a3a'}}>
    <div style={{fontSize: 13, letterSpacing: '0.2em', color: '#a0907c'}}>OFFICIAL RECEIPT</div>
    <div style={{position: 'relative', display: 'inline-block', fontSize: 34, color: '#b0362c', marginTop: 8}}>
      {no}
      <svg width={170} height={70} style={{position: 'absolute', left: -22, top: -14, overflow: 'visible'}}>
        <ellipse cx={85} cy={35} rx={80} ry={30} fill="none" stroke={P.coral} strokeWidth={4} pathLength={100} strokeDasharray="100" strokeDashoffset={100 * (1 - circle)} transform="rotate(-6 85 35)" />
      </svg>
    </div>
    <div style={{fontSize: 18, marginTop: 6}}>Unit {unit}</div>
    <div style={{position: 'absolute', right: 22, bottom: 18, fontSize: 24}}>{amt}</div>
  </div>
);
const Bubble: React.FC<{text: string; mine?: boolean; style?: React.CSSProperties}> = ({text, mine, style}) => (
  <div style={{maxWidth: 360, padding: '14px 18px', borderRadius: mine ? '20px 20px 6px 20px' : '20px 20px 20px 6px', fontFamily: jakarta, fontSize: 21, lineHeight: 1.35,
    background: mine ? 'rgba(95,242,168,0.16)' : 'rgba(255,255,255,0.10)', color: P.white, marginLeft: mine ? 'auto' : 0, ...style}}>{text}</div>
);
export const Problem: React.FC<{fade?: number}> = () => {
  const f = useCurrentFrame();
  const A = vo0('invoices'), B = vo0('repairs'), Cq = vo0('inquiries');
  // Chat: messages keep arriving and push the repair request up and out of sight.
  const chat = ['Good evening po!', 'Is the room still available?', 'Ok po, thank you', 'Can I pay on Monday?', 'Who has the key for the gate?', 'Noted po'];
  const pushed = Math.max(0, (f - B - 30) / 9);
  const dissolve = t01(f, Cq + 62, Cq + 104);
  return (
    <AbsoluteFill>
      <Panel i={0} at={A} title="Invoices" sub="in a paper book." icon={<ReceiptText size={26} />}>
        <Receipt no="No. 1182" unit="2a" amt="₱6,000" rot={-7} x={10} y={30} circle={t01(f, A + 40, A + 64)} />
        <Receipt no="No. 1182" unit="3b" amt="₱4,800" rot={5} x={140} y={120} circle={t01(f, A + 56, A + 80)} />
      </Panel>
      <Panel i={1} at={B} title="Repairs" sub="lost in a chat." icon={<Wrench size={26} />}>
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 30%)', maskImage: 'linear-gradient(180deg, transparent 0%, #000 30%)'}}>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 12, transform: `translateY(${-Math.min(chat.length, pushed) * 0}px)`}}>
            <Bubble text="Ma'am, the faucet in 2C is leaking." style={{opacity: lerp(1, 0.25, t01(f, B + 50, B + 90)), border: `1px solid rgba(255,181,71,${0.6 * (1 - t01(f, B + 50, B + 90))})`}} />
            {chat.map((c, i) => {
              const p = spr(f, B + 30 + i * 9, {damping: 16, stiffness: 160});
              return f >= B + 30 + i * 9 ? <div key={c} style={{opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 30}px)`}}><Bubble text={c} mine={i % 3 === 1} /></div> : null;
            })}
          </div>
        </div>
      </Panel>
      <Panel i={2} at={Cq} title="Inquiries" sub="that leave no trace." icon={<Inbox size={26} />}>
        {[{icon: <FB />, src: 'Facebook', msg: 'Is this still available?', y: 0}, {icon: <MessageCircle size={22} />, src: 'Text', msg: 'Hi po, how much is a studio?', y: 120}, {icon: <Footprints size={22} />, src: 'Walk-in', msg: 'Any vacant room po?', y: 240}].map((m, i) => {
          const p = spr(f, Cq + 8 + i * 8, {damping: 16, stiffness: 150});
          const d = Math.max(0, Math.min(1, dissolve * 1.6 - i * 0.25));
          return (
            <div key={m.src} style={{position: 'absolute', left: 0, right: 0, top: m.y, opacity: Math.min(1, p * 2) * (1 - d), filter: d > 0 ? `blur(${d * 10}px)` : undefined,
              transform: `translateX(${(1 - p) * 60 + d * 80}px) scale(${1 + d * 0.15})`}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: jakarta, fontSize: 16, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.faint, marginBottom: 8}}>{m.icon}{m.src}</div>
              <Bubble text={m.msg} />
              {/* the message breaking up into specks */}
              {d > 0 ? Array.from({length: 18}, (_, k) => (
                <div key={k} style={{position: 'absolute', left: 30 + random(`px${i}${k}`) * 300, top: 40 + random(`py${i}${k}`) * 50, width: 5, height: 5, borderRadius: 3, background: P.white,
                  transform: `translate(${(random(`dx${i}${k}`) - 0.3) * 260 * d}px, ${(random(`dy${i}${k}`) - 0.5) * 160 * d}px)`, opacity: (1 - d) * 0.9}} />
              )) : null}
            </div>
          );
        })}
      </Panel>
    </AbsoluteFill>
  );
};

// A plain round badge with an f, for a post from social media.
const FB: React.FC = () => (
  <span style={{width: 22, height: 22, borderRadius: 11, background: 'rgba(244,251,247,0.34)', color: P.ink, fontFamily: sora, fontWeight: 800, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>f</span>
);

// ---- 15.25 to 20.5 s: nothing connected, then the thread ------------------------------------
// Each record's place as the three drift apart: centre of a card, on screen.
const DRIFT = [{x: 470, y: 330, r: -8}, {x: 1460, y: 300, r: 7}, {x: 960, y: 820, r: -3}];
export const Nothing: React.FC = () => {
  const f = useCurrentFrame();
  const N = vo0('nothing'), B = vo0('built');
  const S = F(15.25);
  const apart = t01(f, S, S + 50, quint);
  const pull = t01(f, B + 34, B + 58, inQuint);
  const icons = [<ReceiptText key="a" size={60} />, <MessagesSquare key="b" size={60} />, <Inbox key="c" size={60} />];
  // Where each card sits: from its panel in the row to its drifted place, then into the centre.
  const pos = (i: number) => {
    const from = {x: PANEL_X[i] + PANEL_W / 2, y: PANEL_Y + PANEL_H / 2};
    const x = lerp(lerp(from.x, DRIFT[i].x, apart), W / 2, pull), y = lerp(lerp(from.y, DRIFT[i].y, apart), H / 2, pull);
    return {x, y};
  };
  const scale = lerp(lerp(1, 0.42, apart), 0.05, pull);
  // The broken links between them, flickering.
  const flick = (k: number) => (random(`fl${Math.floor(f / 3)}${k}`) > 0.35 ? 1 : 0.2);
  // The thread: in from the left, through each card in turn, and on to the centre.
  const route: Pt[] = spline([{x: -120, y: 600}, {x: 200, y: 520}, DRIFT[0], {x: 800, y: 160}, DRIFT[1], {x: 1680, y: 620}, DRIFT[2], {x: 760, y: 700}, {x: W / 2, y: H / 2}]);
  const thread = t01(f, B + 2, B + 40, quint);
  return (
    <AbsoluteFill>
      {f < B + 40 ? [[0, 1], [1, 2], [2, 0]].map(([a, b], k) => {
        const pa = pos(a), pb = pos(b);
        const show = t01(f, S + 30, S + 50) * (1 - t01(f, B, B + 12));
        return (
          <svg key={k} width={W} height={H} style={{position: 'absolute', inset: 0, opacity: show * flick(k)}}>
            <line x1={pa.x} y1={pa.y} x2={lerp(pa.x, pb.x, 0.42)} y2={lerp(pa.y, pb.y, 0.42)} stroke={P.coral} strokeWidth={3} strokeDasharray="10 14" />
            <line x1={lerp(pa.x, pb.x, 0.58)} y1={lerp(pa.y, pb.y, 0.58)} x2={pb.x} y2={pb.y} stroke={P.coral} strokeWidth={3} strokeDasharray="10 14" />
          </svg>
        );
      }) : null}
      {[0, 1, 2].map((i) => {
        const p = pos(i);
        const v = speed(f, B + 34, B + 58, inQuint);
        return (
          <MBlur key={i} x={Math.abs(p.x - W / 2) * v * 0.06} y={Math.abs(p.y - H / 2) * v * 0.06}
            style={{position: 'absolute', left: p.x - PANEL_W / 2, top: p.y - PANEL_H / 2, transform: `scale(${scale}) rotate(${DRIFT[i].r * apart}deg)`, opacity: 1 - t01(f, B + 52, B + 60)}}>
            <Glass w={PANEL_W} h={PANEL_H} style={{border: '1px solid rgba(255,181,71,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{color: P.amber, transform: 'scale(3)'}}>{icons[i]}</div>
            </Glass>
          </MBlur>
        );
      })}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Glitch at={N} out={B - 4}>
          <Rise text="Nothing connected." at={N} out={B - 6} size={150} align="center" accent={['connected.']} accentGradient={WARM} />
        </Glitch>
      </AbsoluteFill>
      <Thread pts={route} from={Math.max(0, thread - 0.35)} to={thread} width={5} />
    </AbsoluteFill>
  );
};

// A short RGB split and jitter on arrival, then still.
const Glitch: React.FC<{at: number; out: number; children: React.ReactNode}> = ({at, out, children}) => {
  const f = useCurrentFrame();
  const live = (f >= at + 6 && f < at + 26) || (f >= out - 10 && f < out);
  const j = live ? (random(`g${f}`) - 0.5) * 18 : 0;
  return (
    <div style={{position: 'relative'}}>
      {live ? <div style={{position: 'absolute', inset: 0, transform: `translateX(${j - 6}px)`, mixBlendMode: 'screen', filter: 'drop-shadow(0 0 0 #ff2e4d)', opacity: 0.6, color: '#ff2e4d'}}>{children}</div> : null}
      {live ? <div style={{position: 'absolute', inset: 0, transform: `translateX(${-j + 6}px)`, mixBlendMode: 'screen', opacity: 0.6}}>{children}</div> : null}
      <div style={{transform: `translateX(${j * 0.3}px)`}}>{children}</div>
    </div>
  );
};

// The mark: the thread traces the hexagon, the roof and the H draw in, and on the drop
// the cell fills and the wordmark arrives. Then the camera flies through it.
const HEX_V: Pt[] = [{x: 256, y: 12}, {x: 467.31, y: 134}, {x: 467.31, y: 378}, {x: 256, y: 500}, {x: 44.69, y: 378}, {x: 44.69, y: 134}, {x: 256, y: 12}];
export const markPts = (cx: number, cy: number, size: number): Pt[] => HEX_V.map((p) => ({x: cx + (p.x - 256) * (size / 512), y: cy + (p.y - 256) * (size / 512)}));
export const Turn: React.FC = () => {
  const f = useCurrentFrame();
  const B = vo0('built');
  const D = F(20.0);
  const trace = t01(f, B + 44, D - 6, quint);
  const draw = t01(f, D - 18, D + 6, quint);
  const fill = t01(f, D - 2, D + 10);
  const flash = t01(f, B + 56, B + 62) * (1 - t01(f, B + 62, B + 84));
  const through = t01(f, D + 18, D + 30, inQuint);
  const SZ = 300, CX = W / 2, CY = H / 2 - 40;
  const word = t01(f, D, D + 18, expo);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, rgba(255,255,255,${0.9 * flash}) 0%, rgba(95,242,168,${0.5 * flash}) 22%, transparent 55%)`}} />
      <AbsoluteFill style={{transformOrigin: `${CX}px ${CY}px`, transform: `scale(${1 + through * 9})`, opacity: 1 - t01(f, D + 22, D + 30)}}>
        <MBlur x={through * 8} y={through * 8}>
          <Thread pts={markPts(CX - word * 250, CY, SZ)} to={trace} width={5} />
          <div style={{position: 'absolute', left: CX - SZ / 2 - word * 250, top: CY - SZ / 2, opacity: Math.max(fill, draw > 0 ? 1 : 0)}}>
            <Mark size={SZ} draw={draw} fill={fill} hex={P.emerald} />
          </div>
          <div style={{position: 'absolute', left: CX - word * 250 + SZ / 2 + 40, top: CY - 100, width: 700, overflow: 'hidden', opacity: word}}>
            <div style={{fontFamily: sora, fontWeight: 800, fontSize: 200, letterSpacing: '-0.06em', lineHeight: 1, transform: `translateX(${(1 - word) * -200}px)`,
              backgroundImage: sweep(f, D + 4, P.white, '#fff', P.lime), WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>Hivelet</div>
          </div>
        </MBlur>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export {HEX_PATH};
