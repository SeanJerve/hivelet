// Hivelet's own look: the "workspace system" tokens in frontend/src/index.css.
// The workspace sets everything in Plus Jakarta Sans; the public site's large
// headings and the film's own titles use Sora, as the site does.
import {continueRender, delayRender, staticFile} from 'remotion';

// The two typefaces ship with the film (public/fonts/, SIL Open Font License, from Google Fonts on
// 16 Oct 2026), so it renders the same with no connection and on a machine whose browser cannot
// reach Google Fonts. Each is one variable file per subset; latin-ext carries the peso sign.
const FACES: [string, string, string][] = [
  ['Sora', 'sora', '400 800'],
  ['Plus Jakarta Sans', 'jakarta', '400 700'],
];
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const handle = delayRender('Loading the film\'s typefaces');
  Promise.all(FACES.flatMap(([family, file, weight]) => [['latin', LATIN], ['latin-ext', LATIN_EXT]].map(([sub, range]) =>
    new FontFace(family, `url(${staticFile(`fonts/${file}-${sub}.woff2`)}) format('woff2')`, {weight, unicodeRange: range})
      .load().then((face) => { document.fonts.add(face); }))))
    .then(() => continueRender(handle))
    .catch((err) => { console.error(err); continueRender(handle); });
}

export const sora = 'Sora';
export const jakarta = 'Plus Jakarta Sans';

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
