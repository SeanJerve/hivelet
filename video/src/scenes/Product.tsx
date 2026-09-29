// Scenes 5 to 11: each feature on its real screen, next to the problem it answers.
// Regions and camera targets are in the captured page's own CSS pixels; the
// source of every frame is listed in SCENES.md.
import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, clamp, easeOut} from '../theme';
import {Scene, SCREEN_LEFT, SCREEN_TOP, SCREEN_WIDTH, TextColumn} from '../components/Layout';
import {Browser, Phone} from '../components/Screen';
import {Words} from '../components/Words';

const SITE = 'hivelet.vercel.app';
const shot = (name: string, at: number, path: string) => ({src: `shots/${name}.png`, at, url: `${SITE}${path}`});
const Frame: React.FC<Omit<React.ComponentProps<typeof Browser>, 'left' | 'top' | 'width'>> = (props) => (
  <Browser left={SCREEN_LEFT} top={SCREEN_TOP} width={SCREEN_WIDTH} enterAt={4} {...props} />
);

// 5. Rooms and rates.
export const Rooms: React.FC = () => (
  <Scene>
    <TextColumn
      kicker={[{text: 'Rooms and rates', at: 6}]}
      captions={[
        {text: 'All 33 units, in one place.', at: 10, out: 88},
        {text: 'Who lives there, and what each rents for.', at: 98},
      ]}
    />
    <Frame
      shots={[shot('admin-directory', 0, '/admin/directory')]}
      keys={[{at: 0, x: 720, y: 450, zoom: 1}, {at: 44, x: 700, y: 500, zoom: 1.42, dur: 44}]}
      lifts={[{x: 344, y: 367, w: 241, h: 198, at: 104, out: 178, r: 18}]}
    />
  </Scene>
);

// 6. Monthly Income: her layout, her receipt numbers, and the second-payment check.
export const Income: React.FC = () => (
  <Scene>
    <TextColumn
      kicker={[{text: 'Monthly Income', at: 6}]}
      captions={[
        {text: 'Laid out like her own workbook.', at: 10, out: 110},
        {text: 'Her paper receipt number stays on the record.', at: 122, out: 230},
        {text: 'It flags a second payment for the same unit and month.', at: 246},
      ]}
      size={56}
    />
    <Frame
      shots={[
        shot('admin-income-ledger', 0, '/admin/income'),
        shot('admin-income-record-filled', 116, '/admin/income'),
        shot('admin-income-record-warning', 238, '/admin/income'),
      ]}
      keys={[
        {at: 0, x: 720, y: 450, zoom: 1},
        {at: 16, x: 820, y: 420, zoom: 1.28, dur: 70},
        {at: 112, x: 760, y: 440, zoom: 1.12, dur: 30},
        {at: 150, x: 880, y: 430, zoom: 1.62, dur: 40},
        {at: 234, x: 720, y: 420, zoom: 1.3, dur: 32},
      ]}
      lifts={[
        {x: 722, y: 390, w: 362, h: 74, at: 176, out: 226, r: 14},
        {x: 516, y: 254, w: 408, h: 174, at: 266, out: 356, r: 18},
      ]}
      cursor={{
        path: [{at: 124, x: 1010, y: 720}, {at: 136, x: 905, y: 440}, {at: 200, x: 990, y: 786}],
        clicks: [160, 228],
      }}
    />
  </Scene>
);

// 7. Overview and Monthly Expenses.
export const Overview: React.FC = () => (
  <Scene>
    <TextColumn
      kicker={[{text: 'Overview', at: 6, out: 90}, {text: 'Monthly Expenses', at: 100}]}
      captions={[
        {text: 'Money in and money out, for any year.', at: 10, out: 90},
        {text: 'What was spent, and where it went.', at: 102},
      ]}
    />
    <Frame
      shots={[shot('admin-overview', 0, '/admin/overview'), shot('admin-expenses', 94, '/admin/expenses')]}
      keys={[
        {at: 0, x: 720, y: 450, zoom: 1},
        {at: 50, x: 668, y: 650, zoom: 1.38, dur: 44},
        {at: 92, x: 720, y: 450, zoom: 1, dur: 24},
        {at: 118, x: 1031, y: 330, zoom: 1.34, dur: 44},
      ]}
      lifts={[{x: 912, y: 110, w: 118, h: 46, at: 14, out: 50, r: 23}]}
    />
  </Scene>
);

// 8. The tenant's side, on a phone.
export const Tenant: React.FC = () => (
  <Scene>
    <TextColumn
      kicker={[{text: 'For tenants', at: 6}]}
      captions={[
        {text: 'Tenants see what they owe.', at: 10, out: 112},
        {text: 'Pay by GCash if they want. She confirms it.', at: 122, out: 218},
        {text: 'Report a repair from their phone.', at: 232},
      ]}
      size={62}
    />
    <Phone
      left={1110}
      top={70}
      height={916}
      enterAt={4}
      shots={[
        {src: 'shots/tenant-overview.png', at: 0},
        {src: 'shots/tenant-tickets-empty.png', at: 222},
        {src: 'shots/tenant-tickets-filled.png', at: 268},
      ]}
      // The phone shows its whole screen, as a phone does; the lifts do the pointing.
      keys={[{at: 0, x: 195, y: 422, zoom: 1}]}
      lifts={[
        {x: 16, y: 194, w: 358, h: 298, at: 44, out: 104, r: 28},
        {x: 36, y: 428, w: 160, h: 44, at: 140, out: 212, r: 22},
      ]}
      taps={[{at: 168, x: 115, y: 450}]}
    />
  </Scene>
);

// 9. What arrives on the owner's side.
export const Repairs: React.FC = () => (
  <Scene>
    <TextColumn
      kicker={[{text: 'Repairs', at: 6}]}
      captions={[{text: 'Requests land in one list, not a chat thread.', at: 10}]}
    />
    <Frame
      shots={[shot('admin-tickets', 0, '/admin/tickets'), shot('admin-bell', 86, '/admin/tickets')]}
      keys={[
        {at: 0, x: 720, y: 450, zoom: 1},
        {at: 10, x: 560, y: 450, zoom: 1.34, dur: 40},
        {at: 80, x: 1100, y: 330, zoom: 1.3, dur: 40},
      ]}
      lifts={[
        {x: 344, y: 337, w: 293, h: 194, at: 26, out: 74, r: 18},
        {x: 888, y: 58, w: 420, h: 507, at: 116, out: 190, r: 22},
      ]}
      cursor={{path: [{at: 52, x: 760, y: 420}, {at: 62, x: 1286, y: 32}], clicks: [84]}}
    />
  </Scene>
);

// 10. Guests, from the public site to her Inquiries.
export const Guests: React.FC = () => (
  <Scene>
    <TextColumn
      kicker={[{text: 'For guests', at: 6, out: 112}, {text: 'Inquiries', at: 122}]}
      captions={[
        {text: 'Guests browse rooms and send an inquiry.', at: 10, out: 112},
        {text: 'She sees it, with the unit they asked about.', at: 124},
      ]}
    />
    <Frame
      shots={[
        shot('public-two-bedroom', 0, '/category/two-bedroom'),
        shot('public-inquire-filled', 58, '/inquire'),
        shot('admin-inquiries', 118, '/admin/inquiries'),
      ]}
      keys={[
        {at: 0, x: 720, y: 450, zoom: 1},
        {at: 8, x: 620, y: 520, zoom: 1.2, dur: 44},
        {at: 56, x: 360, y: 400, zoom: 1.32, dur: 34},
        {at: 116, x: 720, y: 360, zoom: 1.16, dur: 34},
      ]}
      lifts={[{x: 320, y: 311, w: 341, h: 140, at: 142, out: 190, r: 0}]}
    />
  </Scene>
);

// 11. The activity trail, then the app on a phone's home screen.
export const Activity: React.FC = () => {
  const f = useCurrentFrame();
  // The page is fully gone before the icon starts, so the two never overlap.
  const out = interpolate(f, [84, 96], [1, 0], clamp);
  const icon = interpolate(f - 98, [0, 26], [0, 1], {...clamp, easing: easeOut});
  return (
    <Scene>
      <div style={{opacity: out}}>
        <TextColumn
          kicker={[{text: 'Activity', at: 6}]}
          captions={[{text: 'Every change is logged, and none can be edited.', at: 10}]}
        />
        <Frame
          shots={[shot('admin-activity', 0, '/admin/audit-logs')]}
          keys={[{at: 0, x: 720, y: 450, zoom: 1}, {at: 16, x: 1000, y: 330, zoom: 1.3, dur: 40}]}
          lifts={[{x: 1123, y: 228, w: 251, h: 201, at: 40, out: 96, r: 22}]}
        />
      </div>
      {f >= 96 ? (
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <Img
            src={staticFile('icon-512.png')}
            style={{width: 208, height: 208, opacity: icon, transform: `translateY(${(1 - icon) * 30}px) scale(${0.92 + 0.08 * icon})`,
              filter: `drop-shadow(0 ${26 * icon}px ${44 * icon}px rgba(15,27,21,0.22))`}}
          />
          <div style={{marginTop: 56}}>
            <Words text="Installs on a phone like an app." at={110} size={62} align="center" />
          </div>
        </div>
      ) : null}
    </Scene>
  );
};

