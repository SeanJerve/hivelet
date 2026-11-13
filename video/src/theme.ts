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

// The redesign's glass style (November 2026), from frontend/src/glass.css (light theme): tiles are a
// translucent white over a soft green wash, edged with a bright rim; what floats (dialogs, menus)
// is frostier and casts a long soft shadow; buttons are tinted glass. Read from the running app
// on 13 Nov 2026. The film's old-way scenes (Act 1) keep the solid C tokens above.
export const GL = {
  tile: 'rgba(255,255,255,0.68)',
  line: 'rgba(23,96,63,0.12)',
  well: 'rgba(23,96,63,0.05)',
  hover: 'rgba(23,96,63,0.08)',
  brandSoft: 'rgba(23,96,63,0.11)',
  verifySoft: 'rgba(252,228,180,0.62)',
  seriesSoft: '#a9cdb8',
  inkFaint: '#525e57',
  statusWait: '#7a5616',
  statusAlert: '#9a3a28',
  // On a floating panel the soft inks are a step darker, so they still read over what shows through.
  inkSoftFloat: '#37433c',
  inkFaintFloat: '#434f48',
  float: 'rgba(255,255,255,0.62)',
  menu: 'rgba(255,255,255,0.7)',
  pane: 'rgba(255,255,255,0.4)',
  field: 'rgba(255,255,255,0.4)',
  fieldEdge: 'rgba(255,255,255,0.75)',
  fieldFloat: 'rgba(255,255,255,0.55)',
  fieldFloatEdge: 'rgba(255,255,255,0.85)',
  fieldShadow: 'inset 0 1px 2px rgba(16,60,40,0.1), 0 0 0 1px rgba(23,96,63,0.09)',
  night: 'rgba(13,27,20,0.88)',
  brand: 'rgba(12,70,46,0.8)',
  brandBtn: 'rgba(14,72,46,0.78)',
  scrim: 'rgba(20,60,40,0.14)',
  rim: 'linear-gradient(135deg, #ffffff, rgba(255,255,255,0.5) 26%, rgba(23,96,63,0.16) 50%, rgba(255,255,255,0.45) 74%, #ffffff)',
  rimDark: 'linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1) 34%, rgba(255,255,255,0.06) 62%, rgba(255,255,255,0.32))',
  rimBtn: 'linear-gradient(135deg, rgba(255,255,255,0.32), rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.06) 56%, rgba(255,255,255,0.2))',
  sheen: 'inset 0 1px 1px rgba(255,255,255,0.8)',
  drop: '0 1px 3px rgba(16,40,30,0.06)',
  dropFloat: '0 28px 60px -24px rgba(16,60,40,0.36)',
  floatSheen: 'linear-gradient(172deg, rgba(255,255,255,0.32), rgba(255,255,255,0.05) 38%, rgba(255,255,255,0.13))',
  floatFilter: 'blur(28px) contrast(0.6) brightness(1.3) saturate(190%)',
  // The page itself: --wash-base under five soft green lights (body::before), at the film's 1920 px.
  wash: [
    'radial-gradient(998px 845px at 6% 8%, rgba(150,226,182,0.36), transparent 70%)',
    'radial-gradient(845px 730px at 92% 4%, rgba(196,238,170,0.36), transparent 70%)',
    'radial-gradient(960px 806px at 96% 62%, rgba(160,230,205,0.33), transparent 70%)',
    'radial-gradient(883px 768px at 34% 100%, rgba(212,244,196,0.39), transparent 70%)',
    'radial-gradient(653px 576px at 44% 44%, rgba(140,220,170,0.26), transparent 72%)',
    '#f8fbf9',
  ].join(', '),
};
