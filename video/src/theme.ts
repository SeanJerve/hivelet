// Hivelet's own look: the "workspace system" tokens in frontend/src/index.css.
// The workspace sets everything in Plus Jakarta Sans; the public site's large
// headings and the film's own titles use Sora, as the site does.
import {loadFont as loadSora} from '@remotion/google-fonts/Sora';
import {loadFont as loadJakarta} from '@remotion/google-fonts/PlusJakartaSans';

export const sora = loadSora('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']}).fontFamily;
export const jakarta = loadJakarta('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']}).fontFamily;

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
  onBrand: '#ffffff',
  onBrandSoft: '#d3e8db',
  night: '#0f1b15',
  nightRaised: '#1b2a22',
  onNight: '#eef5f0',
  onNightSoft: '#a9baaf',
  hatch: '#7a8c81',
  verify: '#8a5300',
  verifySoft: '#fcefd6',
  overdue: '#b3261e',
  overdueSoft: '#fde6e3',
  // Lighter steps of the app's own brand, verify and overdue hues, used only
  // for accent words on the dark background, where the app's values would not
  // read. The app has no dark theme to take them from.
  glow: '#5fc28e',
  amber: '#f2b252',
  coral: '#f07a6f',
  deep: '#08110c',
  moss: '#123324',
};

export const W = 1920;
export const H = 1080;
