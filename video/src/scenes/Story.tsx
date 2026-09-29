// Scenes 1 to 4: the place, how it ran before, what that cost, and the answer.
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Banknote, FileSpreadsheet, MessageCircle, NotebookPen} from 'lucide-react';
import {C, clamp, easeInOut, easeOut, jakarta, sora} from '../theme';
import {Scene} from '../components/Layout';
import {Captions, Kicker, Words} from '../components/Words';

const rise = (frame: number, at: number, len = 24) => interpolate(frame - at, [0, len], [0, 1], {...clamp, easing: easeOut});

// 1. The real building, from the site's own photograph.
export const Place: React.FC = () => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, 210], [1.14, 1.02], {...clamp, easing: easeInOut});
  const stats = [['33', 'units'], ['5', 'clusters'], ['1', 'owner']];
  return (
    <Scene bg={C.night}>
      <Img src={staticFile('fe-galang-building.webp')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,27,21,0.12) 0%, rgba(15,27,21,0.30) 38%, rgba(15,27,21,0.78) 68%, rgba(15,27,21,0.96) 100%)'}} />
      <div style={{position: 'absolute', left: 120, right: 120, bottom: 116}}>
        <Kicker items={[{text: 'Legazpi City', at: 8, out: 92}]} color={C.onNightSoft} />
        <div style={{display: 'grid'}}>
          <div style={{gridArea: '1 / 1', alignSelf: 'end'}}>
            <Words text="Fe Galang Da Silva Boarding House" at={12} out={90} size={104} color="#ffffff" />
          </div>
          <div style={{gridArea: '1 / 1', alignSelf: 'end', display: 'flex', gap: 110}}>
            {stats.map(([n, label], i) => {
              const p = rise(f, 100 + i * 9, 26);
              return (
                <div key={label} style={{opacity: p, transform: `translateY(${(1 - p) * 36}px)`}}>
                  <div style={{fontFamily: sora, fontWeight: 600, fontSize: 168, lineHeight: 0.9, letterSpacing: '-0.05em', color: '#ffffff'}}>{n}</div>
                  <div style={{fontFamily: jakarta, fontWeight: 500, fontSize: 30, color: C.onNightSoft, marginTop: 14}}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Scene>
  );
};

// 2. Four places her records lived, and the links between them that never held.
export const Before: React.FC = () => {
  const f = useCurrentFrame();
  const cards = [
    {Icon: FileSpreadsheet, title: 'Spreadsheet', note: 'on a USB drive'},
    {Icon: NotebookPen, title: 'Receipt book', note: 'written by hand'},
    {Icon: Banknote, title: 'Cash', note: 'collected at the door'},
    {Icon: MessageCircle, title: 'Repair requests', note: 'sent over Messenger'},
  ];
  const cardW = 336;
  const gap = 76;
  const left = (1920 - (cardW * 4 + gap * 3)) / 2;
  const draw = interpolate(f, [150, 170], [0, 1], {...clamp, easing: easeOut});
  const snap = interpolate(f, [184, 204], [0, 1], {...clamp, easing: easeOut});
  const fade = interpolate(f, [222, 246], [1, 0], clamp);
  return (
    <Scene bg={C.night}>
      <div style={{position: 'absolute', left: 120, right: 120, top: 210}}>
        <Captions
          align="center"
          size={74}
          color={C.onNight}
          items={[
            {text: 'Her records lived in four places.', at: 14, out: 140},
            {text: 'None of them talked to each other.', at: 150},
          ]}
        />
      </div>
      {cards.map(({Icon, title, note}, i) => {
        const p = rise(f, 34 + i * 9, 28);
        const dim = interpolate(f, [184, 210], [1, 0.62], clamp);
        return (
          <div
            key={title}
            style={{
              position: 'absolute', left: left + i * (cardW + gap), top: 460, width: cardW, height: 300, borderRadius: 30,
              background: C.nightRaised, padding: 40, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              opacity: p * dim, transform: `translateY(${(1 - p) * 50}px)`,
            }}
          >
            <Icon size={58} color={C.brandBright} strokeWidth={1.6} />
            <div>
              <div style={{fontFamily: sora, fontWeight: 600, fontSize: 34, color: C.onNight, letterSpacing: '-0.02em'}}>{title}</div>
              <div style={{fontFamily: jakarta, fontSize: 23, color: C.onNightSoft, marginTop: 8}}>{note}</div>
            </div>
          </div>
        );
      })}
      {[0, 1, 2].map((i) => {
        const x = left + (i + 1) * cardW + i * gap;
        const color = snap > 0.2 ? C.overdue : C.onNightSoft;
        const half = gap / 2;
        const scale = draw * (1 - 0.72 * snap);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: 609, width: gap, height: 2, opacity: fade}}>
            <div style={{position: 'absolute', left: 0, width: half, height: 2, background: color, transformOrigin: 'left', transform: `scaleX(${scale})`}} />
            <div style={{position: 'absolute', right: 0, width: half, height: 2, background: color, transformOrigin: 'right', transform: `scaleX(${scale})`}} />
          </div>
        );
      })}
    </Scene>
  );
};

const Count: React.FC<{to: number; at: number; suffix?: string; color: string; size?: number}> = ({to, at, suffix = '', color, size = 176}) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f - at, [0, 42], [0, to], {...clamp, easing: easeOut}));
  return (
    <div style={{fontFamily: sora, fontWeight: 600, fontSize: size, lineHeight: 0.9, letterSpacing: '-0.05em', color, fontVariantNumeric: 'tabular-nums'}}>
      {v.toLocaleString('en-US')}{suffix}
    </div>
  );
};

// 3. What moving her records in showed.
export const Cost: React.FC = () => {
  const f = useCurrentFrame();
  const cols = [
    {at: 14, to: 937, suffix: '', label: 'income records in her workbook', color: C.onNight},
    {at: 66, to: 43, suffix: '%', label: 'had no anniversary date or deposit on file', color: C.verifySoft},
    {at: 118, to: 5, suffix: '', label: 'receipt numbers were each used for two payments', color: C.verifySoft},
  ];
  return (
    <Scene bg={C.night}>
      <div style={{position: 'absolute', left: 120, right: 120, top: 250}}>
        <Kicker items={[{text: 'When her records were moved in', at: 4}]} color={C.brandBright} />
      </div>
      <div style={{position: 'absolute', left: 120, top: 400, display: 'flex', gap: 90}}>
        {cols.map((c, i) => {
          const p = rise(f, c.at, 26);
          const bar = interpolate(f - c.at - 10, [0, 40], [0, 0.43], {...clamp, easing: easeOut});
          return (
            <div key={i} style={{width: 500, opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
              <Count to={c.to} at={c.at} suffix={c.suffix} color={c.color} />
              {i === 1 ? (
                <div style={{width: 420, height: 10, borderRadius: 5, background: C.nightRaised, marginTop: 34, overflow: 'hidden'}}>
                  <div style={{width: `${bar * 100}%`, height: '100%', background: C.verifySoft, borderRadius: 5}} />
                </div>
              ) : <div style={{height: 10, marginTop: 34}} />}
              <div style={{fontFamily: jakarta, fontSize: 30, lineHeight: 1.35, color: C.onNightSoft, marginTop: 26, maxWidth: 440}}>{c.label}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// 4. The answer: the canvas opens from the centre and the product arrives.
export const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const r = interpolate(f, [0, 28], [0, 1250], {...clamp, easing: easeInOut});
  const icon = rise(f, 12, 26);
  return (
    <AbsoluteFill style={{background: C.night}}>
      <AbsoluteFill style={{background: C.canvas, clipPath: `circle(${r}px at 50% 50%)`}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 370, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36}}>
          <Img src={staticFile('icon-512.png')} style={{width: 132, height: 132, opacity: icon, transform: `scale(${0.9 + 0.1 * icon})`}} />
          <Words text="Hivelet" at={18} size={132} tracking="-0.045em" />
        </div>
        <div style={{position: 'absolute', left: 200, right: 200, top: 580}}>
          <Words text="One place for rooms, tenants, money and repairs." at={42} size={44} weight={500} color={C.inkSoft} align="center" tracking="-0.015em" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
