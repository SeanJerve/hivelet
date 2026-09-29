// Hivelet's own look, taken from the "workspace system" tokens in
// frontend/src/index.css and checked against the rendered screens.
import {Easing} from 'remotion';
import {loadFont as loadSora} from '@remotion/google-fonts/Sora';
import {loadFont as loadJakarta} from '@remotion/google-fonts/PlusJakartaSans';

export const sora = loadSora('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']}).fontFamily;
export const jakarta = loadJakarta('normal', {weights: ['400', '500', '600'], subsets: ['latin']}).fontFamily;

export const C = {
  canvas: '#edf1ee',
  tile: '#ffffff',
  ink: '#101713',
  inkSoft: '#45524a',
  inkFaint: '#5d6962',
  line: '#e2e8e3',
  brand: '#17603f',
  brandStrong: '#0e4a30',
  brandSoft: '#e2f0e7',
  brandBright: '#3f9a6b',
  night: '#0f1b15',
  nightRaised: '#1b2a22',
  onNight: '#eef5f0',
  onNightSoft: '#a9baaf',
  verify: '#8a5300',
  verifySoft: '#fcefd6',
  overdue: '#b3261e',
};

// One curve for everything that arrives, one for everything the camera moves.
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
