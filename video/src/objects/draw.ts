// Version F's 2D layer: what is drawn flat on the screen's page, under and over the objects.
// The reference's screen language: a mono caption typed with the voice and a block cursor,
// a small section label, heavy grotesk words, the serif italic for the hard moment, thin
// leader lines to label an object.
import {continueRender, delayRender, staticFile} from 'remotion';
import '../screen/kit'; // Inter Tight, JetBrains Mono, Instrument Serif

const MORE: [string, string, string][] = [['Sora', 'sora-latin', '100 900'], ['Caveat', 'caveat-latin-700', '700']];
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const handle = delayRender('Loading version F\'s extra typefaces');
  Promise.all(MORE.map(([family, file, weight]) =>
    new FontFace(family, `url(${staticFile(`fonts/${file}.woff2`)}) format('woff2')`, {weight}).load().then((face) => { document.fonts.add(face); })))
    .then(() => continueRender(handle))
    .catch((err) => { console.error(err); continueRender(handle); });
}

export const INK = '#141414', PAPER = '#ebeae5', CHAR = '#1d1d1d', GREEN = '#1f9a62', BLUE = '#2346d8', CORAL = '#e5674f', WHITE = '#fafaf7';
export const MONO = '"JetBrains Mono"', GROT = '"Inter Tight"', SERIF = '"Instrument Serif"', BRAND = 'Sora', HAND = 'Caveat';

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const inOut = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

// The caption: `text` typed across `dur` seconds from `at`, words in `accent` set in the accent
// colour and bold, then a block cursor that blinks once the line is done.
export const caption = (c: CanvasRenderingContext2D, t: number, text: string, at: number, dur: number,
  o: {dark?: boolean; accent?: string[]; color?: string; x?: number; y?: number; size?: number} = {}) => {
  if (t < at - 0.1) return;
  const {dark = false, accent = [], color = GREEN, x = 92, y = 912, size = 38} = o;
  const n = Math.round(clamp01((t - at) / dur) * text.length);
  c.save();
  c.textBaseline = 'alphabetic';
  let cx = x;
  const words = text.slice(0, n).split(/(\s+)/);
  for (const w of words) {
    const hot = accent.includes(w.replace(/[.,?]/g, ''));
    c.font = `${hot ? 700 : 500} ${size}px ${MONO}`;
    c.fillStyle = hot ? color : dark ? 'rgba(236,235,230,0.92)' : INK;
    c.fillText(w, cx, y);
    cx += c.measureText(w).width;
  }
  const typing = n > 0 && n < text.length;
  if (typing || Math.floor(t * 2.5) % 2 === 0) { c.fillStyle = color; c.fillRect(cx + 4, y - size * 0.8, size * 0.56, size * 1.0); }
  c.restore();
};

export const label = (c: CanvasRenderingContext2D, n: string, text: string, dark = false) => {
  c.save();
  c.font = `500 22px ${MONO}`;
  c.fillStyle = dark ? 'rgba(236,235,230,0.5)' : 'rgba(20,20,20,0.45)';
  c.fillText(`${n}  /  ${text}`, 92, 92);
  c.restore();
};

export const fill = (c: CanvasRenderingContext2D, color: string) => { c.fillStyle = color; c.fillRect(0, 0, c.canvas.width, c.canvas.height); };

// Text with letter-spacing (canvas has it natively in Chrome).
export const text = (c: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string,
  o: {align?: CanvasTextAlign; ls?: number; alpha?: number} = {}) => {
  c.save();
  c.font = font; c.fillStyle = color; c.textAlign = o.align ?? 'left'; c.globalAlpha = o.alpha ?? 1;
  (c as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = `${o.ls ?? 0}px`;
  c.fillText(s, x, y);
  c.restore();
};

// A thin leader line from a point to a mono note, drawn on over `p` (0..1).
export const leader = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, note: string, p: number, dark = false) => {
  if (p <= 0) return;
  c.save();
  const col = dark ? 'rgba(236,235,230,0.85)' : 'rgba(20,20,20,0.8)';
  c.strokeStyle = col; c.lineWidth = 2;
  const q = ease(p * 1.4);
  c.beginPath(); c.arc(x0, y0, 5, 0, Math.PI * 2); c.fillStyle = col; c.fill();
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q); c.stroke();
  const k = clamp01((p - 0.5) * 2);
  c.font = `500 26px ${MONO}`; c.fillStyle = col;
  c.fillText(note.slice(0, Math.round(k * note.length)), x1 + 12, y1 + 9);
  c.restore();
};

export const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath(); c.roundRect(x, y, w, h, r);
};

// A canvas for an object's printed face, drawn once (or each frame when it changes).
export const mkCanvas = (w: number, h: number) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
