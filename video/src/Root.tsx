import React from 'react';
import {Composition} from 'remotion';
import {TOTAL, Video} from './Video';
import {H, W} from './theme';
import {OUT_FPS, STEP} from './anim';
import {Pitch, PITCH_FRAMES} from './pitch/Pitch';
import {FPS as PITCH_FPS} from './pitch/kit';
import {PaperPitch, PAPER_FRAMES} from './paper/PaperPitch';
import {ScreenPitch, SCREEN_FRAMES} from './screen/ScreenPitch';
import {Vertical, VW, VH, V_TOTAL} from './vertical/Vertical';
import {Duo, DUO_TOTAL} from './duo/Duo';
import {TenantPitch, TW, TH, T_TOTAL} from './tenant/TenantPitch';
import {One, ONE_TOTAL} from './one/One';
import {Objects, FW, FH, F_TOTAL} from './objects/Objects';
import {DeskFilm, GW, GH, G_TOTAL} from './desk/DeskFilm';
import {ReceiptFilm, HW, HH, H_TOTAL} from './receipt/ReceiptFilm';
import {ModelFilm, IW, IH, I_TOTAL} from './model/ModelFilm';
import {Full, JW, JH, J_TOTAL} from './full/Full';
import {ReceiptWide, KW, KH, K_TOTAL} from './receipt/ReceiptWide';
import {ModelWide, LW, LH, L_TOTAL} from './model/ModelWide';

export const Root: React.FC = () => (
  <>
    <Composition id="Hivelet" component={Video} durationInFrames={TOTAL * STEP} fps={OUT_FPS} width={W} height={H} />
    <Composition id="Pitch" component={Pitch} durationInFrames={PITCH_FRAMES} fps={PITCH_FPS} width={W} height={H} />
    <Composition id="PaperPitch" component={PaperPitch} durationInFrames={PAPER_FRAMES} fps={60} width={W} height={H} />
    <Composition id="ScreenPitch" component={ScreenPitch} durationInFrames={SCREEN_FRAMES} fps={60} width={W} height={H} />
    <Composition id="Vertical" component={Vertical} durationInFrames={V_TOTAL} fps={60} width={VW} height={VH} />
    <Composition id="Duo" component={Duo} durationInFrames={DUO_TOTAL} fps={60} width={W} height={H} />
    <Composition id="TenantPitch" component={TenantPitch} durationInFrames={T_TOTAL} fps={60} width={TW} height={TH} />
    <Composition id="One" component={One} durationInFrames={ONE_TOTAL} fps={60} width={W} height={H} />
    <Composition id="Objects" component={Objects} durationInFrames={F_TOTAL} fps={60} width={FW} height={FH} />
    <Composition id="Desk" component={DeskFilm} durationInFrames={G_TOTAL} fps={60} width={GW} height={GH} />
    <Composition id="Receipt" component={ReceiptFilm} durationInFrames={H_TOTAL} fps={60} width={HW} height={HH} />
    <Composition id="Model" component={ModelFilm} durationInFrames={I_TOTAL} fps={60} width={IW} height={IH} />
    <Composition id="Full" component={Full} durationInFrames={J_TOTAL} fps={60} width={JW} height={JH} />
    <Composition id="ReceiptWide" component={ReceiptWide} durationInFrames={K_TOTAL} fps={60} width={KW} height={KH} />
    <Composition id="ModelWide" component={ModelWide} durationInFrames={L_TOTAL} fps={60} width={LW} height={LH} />
  </>
);
