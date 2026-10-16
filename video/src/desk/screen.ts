// Version G's laptop screen, drawn on a 1600x1000 canvas each frame: her spreadsheet first,
// then Hivelet, one part at a time, as each object on the desk goes into it.
import {BLUE, BRAND, clamp01, CORAL, ease, GROT, MONO, roundRect, SERIF, text} from '../objects/draw';
import {HEX_PATH} from '../ui/Kit';

export const SW = 1600, SH = 1000;
const G = '#17603f', GL = '#1f9a62', INK = '#141414', SOFT = 'rgba(20,20,20,0.55)', PAPER = '#f4f3ef', LINE = 'rgba(20,20,20,0.1)';
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const fmt = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 2});

const mark = (c: CanvasRenderingContext2D, x: number, y: number, size: number, hex = GL) => {
  c.save(); c.translate(x, y); c.scale(size / 512, size / 512);
  c.fillStyle = hex; c.fill(new Path2D(HEX_PATH));
  c.strokeStyle = '#fff'; c.lineWidth = 36; c.lineCap = 'round'; c.lineJoin = 'round';
  c.stroke(new Path2D('M146 216 L256 126 L366 216 M186 244 V366 M326 244 V366 M186 304 H326'));
  c.restore();
};

// Hivelet's frame: a slim sidebar and a page title, as the app lays out its screens.
const app = (c: CanvasRenderingContext2D, active: string, title: string, sub: string) => {
  c.fillStyle = PAPER; c.fillRect(0, 0, SW, SH);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 300, SH);
  c.fillStyle = LINE; c.fillRect(300, 0, 2, SH);
  mark(c, 40, 44, 56); text(c, 'Hivelet', 110, 86, `700 34px ${BRAND}`, G);
  ['Overview', 'Income', 'Expenses', 'Payments', 'Repairs', 'Inquiries'].forEach((s, i) => {
    const y = 190 + i * 66, on = s === active;
    if (on) { c.fillStyle = '#e3efe8'; roundRect(c, 24, y - 40, 252, 56, 16); c.fill(); }
    text(c, s, 52, y, `${on ? 700 : 500} 26px ${GROT}`, on ? G : SOFT);
  });
  text(c, title, 370, 120, `700 52px ${GROT}`, INK, {ls: -1.5});
  text(c, sub, 372, 168, `500 24px ${MONO}`, SOFT);
};

// A white flash where an object arrives through the glass.
const flash = (c: CanvasRenderingContext2D, t: number, at: number) => {
  const k = seg(t, at, at + 0.45);
  if (k <= 0 || k >= 1) return;
  const g = c.createRadialGradient(SW / 2, SH / 2, 0, SW / 2, SH / 2, 200 + k * 900);
  g.addColorStop(0, `rgba(255,255,255,${0.85 * (1 - k)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, SW, SH);
};

const sheet = (c: CanvasRenderingContext2D, t: number) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, SW, SH);
  c.fillStyle = '#1f6e43'; c.fillRect(0, 0, SW, 64);
  text(c, 'Monthly Income Report.xlsx', 28, 43, `600 26px ${GROT}`, '#fff');
  c.fillStyle = '#f2f2f2'; c.fillRect(0, 64, SW, 46); c.fillRect(0, 110, 60, SH);
  const cols = [60, 200, 420, 600, 780, 960, 1140, 1320, SW];
  'ABCDEFGH'.split('').forEach((l, i) => text(c, l, (cols[i] + cols[i + 1]) / 2, 96, `500 22px ${GROT}`, '#777', {align: 'center'}));
  c.strokeStyle = '#dcdcdc'; c.lineWidth = 1;
  for (let r = 0; r < 20; r++) { const y = 110 + r * 44; c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke(); text(c, String(r + 1), 30, y + 30, `500 20px ${GROT}`, '#888', {align: 'center'}); }
  cols.forEach((x) => { c.beginPath(); c.moveTo(x, 64); c.lineTo(x, SH); c.stroke(); });
  const head = ['Unit', 'Name', 'Rent for', 'Paid', 'Rent', 'Water', 'Notes', 'Total'];
  head.forEach((h, i) => text(c, h, cols[i] + 12, 140, `700 22px ${MONO}`, '#222'));
  for (let r = 1; r < 19; r++) {
    const y = 140 + r * 44;
    const v = 3800 + ((r * 397) % 9) * 100;
    text(c, `${(r % 11) + 1}${'ABC'[r % 3]}`, cols[0] + 12, y, `500 22px ${MONO}`, '#333');
    text(c, '· · · · ·', cols[1] + 12, y, `500 22px ${MONO}`, '#bbb');
    text(c, `Oct ${String((r % 28) + 1).padStart(2, '0')}`, cols[2] + 12, y, `500 22px ${MONO}`, '#333');
    text(c, `Oct ${String((r % 28) + 2).padStart(2, '0')}`, cols[3] + 12, y, `500 22px ${MONO}`, '#333');
    text(c, fmt(v), cols[5] - 12, y, `500 22px ${MONO}`, '#333', {align: 'right'});
    text(c, fmt(200), cols[6] - 12, y, `500 22px ${MONO}`, '#333', {align: 'right'});
    text(c, fmt(v + 200), cols[8] - 12, y, `500 22px ${MONO}`, '#333', {align: 'right'});
  }
  // the selected cell wanders as she types it in by hand
  const k = Math.floor(t * 1.3) % 14;
  c.strokeStyle = '#1f6e43'; c.lineWidth = 3; c.strokeRect(cols[4], 110 + (3 + k) * 44, cols[5] - cols[4], 44);
};

const splash = (c: CanvasRenderingContext2D, t: number, at: number) => {
  const k = ease(seg(t, at, at + 0.5));
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, SW, SH);
  c.fillStyle = G; c.beginPath(); c.arc(SW / 2, SH / 2, k * 1000, 0, Math.PI * 2); c.fill();
  if (t > at + 0.25) {
    const a = ease(seg(t, at + 0.25, at + 0.7));
    c.globalAlpha = a; mark(c, 470, 400, 200, '#ffffff'); c.globalAlpha = 1;
    c.save(); c.globalAlpha = a; c.translate(470, 400); c.scale(200 / 512, 200 / 512);
    c.strokeStyle = G; c.lineWidth = 36; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(new Path2D('M146 216 L256 126 L366 216 M186 244 V366 M326 244 V366 M186 304 H326')); c.restore();
    text(c, 'Hivelet', 700, 548, `800 170px ${BRAND}`, '#fff', {ls: -6, alpha: a});
  }
};

const ledger = (c: CanvasRenderingContext2D, t: number, at: number) => {
  app(c, 'Income', 'Monthly Income', 'October 2026 · her layout, kept');
  // the two ledgers, as tabs
  ['Income', 'Expenses'].forEach((s, i) => {
    const x = 372 + i * 190, on = i === 0;
    c.fillStyle = on ? G : '#ffffff'; roundRect(c, x, 200, 170, 54, 27); c.fill();
    text(c, s, x + 85, 236, `600 24px ${GROT}`, on ? '#fff' : SOFT, {align: 'center'});
  });
  c.fillStyle = '#ffffff'; roundRect(c, 370, 284, 1180, 640, 24); c.fill();
  const cols = [410, 600, 820, 1080, 1510];
  ['Date', 'Paid via', 'Invoice', 'Rent', 'Received'].forEach((h, i) => text(c, h, i >= 3 ? cols[i + 1 > 4 ? 4 : i] : cols[i], 340, `600 22px ${MONO}`, SOFT, {align: i >= 3 ? 'right' : 'left'}));
  const rows: [string, string, string, number][] = [['Oct 01', 'Cash', '1176', 4500], ['Oct 01', 'GCash', '—', 4700], ['Oct 02', 'Cash', '1177', 3800], ['Oct 02', 'GCash', '—', 4500], ['Oct 03', 'Cash', '1178', 4200], ['Oct 04', 'GCash', '—', 4700], ['Oct 05', 'Cash', '1179', 3800]];
  rows.forEach(([d, via, inv, amt], i) => {
    const a = at + 0.4 + i * 0.32;
    if (t < a) return;
    const p = ease(seg(t, a, a + 0.25)), y = 400 + i * 62;
    c.globalAlpha = p;
    text(c, d, 410, y, `500 26px ${MONO}`, INK); text(c, via, 600, y, `500 26px ${MONO}`, via === 'GCash' ? '#1f6fd6' : '#555'); text(c, inv, 820, y, `500 26px ${MONO}`, '#555');
    text(c, fmt(amt), 1240, y, `500 26px ${MONO}`, INK, {align: 'right'}); text(c, fmt(amt), 1510, y, `500 26px ${MONO}`, INK, {align: 'right'});
    c.fillStyle = LINE; c.fillRect(400, y + 22, 1120, 1);
    c.globalAlpha = 1;
  });
  // the total adds itself up
  const total = rows.reduce((s, r) => s + r[3], 0), k = ease(seg(t, at + 2.9, at + 3.9));
  if (t > at + 2.8) {
    c.fillStyle = `rgba(31,154,98,${0.12 * ease(seg(t, at + 2.8, at + 3.1))})`; c.fillRect(380, 845, 1160, 66);
    text(c, 'Total', 410, 890, `700 28px ${MONO}`, INK); text(c, fmt(Math.round(total * k / 100) * 100), 1510, 890, `700 30px ${MONO}`, G, {align: 'right'});
  }
};

const invoice = (c: CanvasRenderingContext2D, t: number, at: number) => {
  app(c, 'Income', 'Record a payment', 'cash, received on site');
  c.fillStyle = '#ffffff'; roundRect(c, 370, 220, 900, 700, 24); c.fill();
  const field = (label: string, value: string, y: number, hot = false) => {
    text(c, label, 410, y, `600 22px ${MONO}`, SOFT);
    c.strokeStyle = hot ? GL : 'rgba(20,20,20,0.18)'; c.lineWidth = hot ? 3 : 2; roundRect(c, 410, y + 16, 820, 70, 14); c.stroke();
    text(c, value, 436, y + 62, `500 30px ${GROT}`, INK);
  };
  field('Rent for', 'October 2026', 290);
  field('Amount', '₱4,500.00', 420);
  const typed = '1182'.slice(0, Math.round(clamp01((t - at - 0.9) / 0.5) * 4));
  field('Invoice no. (from her book)', typed + (t < at + 1.5 && Math.floor(t * 4) % 2 ? '|' : ''), 550, true);
  if (t > at + 1.6) {
    const p = ease(seg(t, at + 1.6, at + 1.9));
    c.globalAlpha = p;
    c.fillStyle = '#e3efe8'; roundRect(c, 410, 690, 820, 84, 16); c.fill();
    c.fillStyle = GL; c.beginPath(); c.arc(456, 732, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(447, 732); c.lineTo(454, 740); c.lineTo(467, 724); c.stroke();
    text(c, 'Not used for this unit and month', 490, 742, `600 26px ${GROT}`, G);
    c.globalAlpha = 1;
  }
};

const verify = (c: CanvasRenderingContext2D, t: number, at: number, press: number) => {
  app(c, 'Payments', 'Payments to verify', 'paid online, waiting for her');
  const done = t >= press + 0.2;
  [['GCash', '₱4,500.00', 'October rent'], ['GCash', '₱4,700.00', 'October rent']].forEach(([via, amt, what], i) => {
    const y = 230 + i * 190, first = i === 0;
    c.fillStyle = '#ffffff'; roundRect(c, 370, y, 1180, 160, 24); c.fill();
    text(c, amt, 410, y + 74, `700 44px ${GROT}`, INK);
    text(c, `${what} · ${via}`, 410, y + 122, `500 24px ${MONO}`, SOFT);
    const ok = first && done;
    c.fillStyle = ok ? '#e3efe8' : '#fbefd6'; roundRect(c, 900, y + 50, ok ? 190 : 300, 56, 28); c.fill();
    text(c, ok ? 'Verified' : 'Pending Verification', ok ? 995 : 1050, y + 87, `600 24px ${GROT}`, ok ? G : '#8a5a00', {align: 'center'});
    if (!ok) {
      c.fillStyle = G; roundRect(c, 1260, y + 46, 250, 64, 32); c.fill();
      text(c, 'Verify', 1385, y + 88, `700 26px ${GROT}`, '#fff', {align: 'center'});
      if (first) { const k = seg(t, press, press + 0.3); if (k > 0 && k < 1) { c.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; c.beginPath(); c.arc(1385, y + 78, 20 + k * 120, 0, Math.PI * 2); c.fill(); } }
    }
  });
  void at;
};

const board = (c: CanvasRenderingContext2D, t: number, at: number) => {
  app(c, 'Repairs', 'Repairs', 'from request to done');
  const cols = ['Requested', 'In progress', 'Done'];
  cols.forEach((s, i) => {
    const x = 370 + i * 400;
    c.fillStyle = '#ebeae5'; roundRect(c, x, 220, 380, 700, 24); c.fill();
    text(c, s.toUpperCase(), x + 28, 272, `600 22px ${MONO}`, i === 2 && t > at + 1.4 ? GL : SOFT, {ls: 2});
  });
  const x = 370 + 400 * (ease(seg(t, at + 0.3, at + 0.7)) + ease(seg(t, at + 0.9, at + 1.3))) + 16;
  const done = t > at + 1.4;
  c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,0.12)'; c.shadowBlur = 18; c.shadowOffsetY = 6; roundRect(c, x, 300, 348, 210, 18); c.fill(); c.shadowColor = 'transparent';
  text(c, 'Kitchen faucet', x + 26, 366, `700 32px ${GROT}`, INK); text(c, 'keeps dripping', x + 26, 406, `700 32px ${GROT}`, INK);
  c.fillStyle = done ? GL : '#efe9dc'; roundRect(c, x + 26, 438, done ? 130 : 180, 48, 24); c.fill();
  text(c, done ? 'Done ✓' : 'Requested', x + 46, 470, `600 22px ${GROT}`, done ? '#fff' : '#6b5a2e');
};

const ask = (c: CanvasRenderingContext2D, t: number, at: number) => {
  c.fillStyle = PAPER; c.fillRect(0, 0, SW, SH);
  mark(c, 80, 56, 56); text(c, 'Hivelet', 150, 98, `700 34px ${BRAND}`, G);
  text(c, 'A vacant room', 90, 230, `700 72px ${GROT}`, INK, {ls: -2});
  text(c, 'Fe Galang Da Silva Boarding House · Legazpi City', 94, 286, `500 24px ${MONO}`, SOFT);
  c.fillStyle = '#ffffff'; roundRect(c, 90, 340, 680, 560, 24); c.fill();
  c.strokeStyle = 'rgba(20,20,20,0.5)'; c.lineWidth = 4; c.strokeRect(150, 400, 560, 380); c.beginPath(); c.moveTo(430, 400); c.lineTo(430, 600); c.moveTo(150, 600); c.lineTo(560, 600); c.stroke();
  text(c, 'floor plan', 430, 850, `500 22px ${MONO}`, SOFT, {align: 'center'});
  c.fillStyle = '#ffffff'; roundRect(c, 830, 340, 680, 560, 24); c.fill();
  text(c, 'Ask about this room', 870, 410, `700 34px ${GROT}`, INK);
  const fields: [string, string][] = [['Your name', 'Ana'], ['Contact', '09•• ••• ••••'], ['Message', 'Is it still available?']];
  fields.forEach(([l, v], i) => {
    const y = 470 + i * 120, n = Math.round(clamp01((t - at - 0.4 - i * 0.45) / 0.4) * v.length);
    text(c, l, 870, y, `600 20px ${MONO}`, SOFT);
    c.strokeStyle = 'rgba(20,20,20,0.18)'; c.lineWidth = 2; roundRect(c, 870, y + 14, 600, 62, 12); c.stroke();
    text(c, v.slice(0, n), 892, y + 56, `500 26px ${GROT}`, INK);
  });
  c.fillStyle = G; roundRect(c, 870, 820, 220, 60, 30); c.fill(); text(c, 'Send', 980, 860, `700 26px ${GROT}`, '#fff', {align: 'center'});
  // the sign-up a visitor does not have to do
  if (t > at + 2.2) {
    const k = ease(seg(t, at + 2.2, at + 2.6));
    text(c, 'Sign up', 1130, 860, `600 26px ${GROT}`, SOFT);
    c.strokeStyle = CORAL; c.lineWidth = 5; c.beginPath(); c.moveTo(1122, 852); c.lineTo(1122 + 110 * k, 852); c.stroke();
    if (t > at + 2.6) text(c, 'not needed.', 1260, 860, `italic 400 40px ${SERIF}`, CORAL, {alpha: ease(seg(t, at + 2.6, at + 2.9))});
  }
};

const proof = (c: CanvasRenderingContext2D, t: number, kind: 'records' | 'secure' | 'quality', at: number) => {
  const bg = kind === 'records' ? BLUE : kind === 'secure' ? CORAL : G;
  c.fillStyle = bg; c.fillRect(0, 0, SW, SH);
  if (kind === 'records') {
    const n = Math.round(937 * ease(seg(t, at + 0.1, at + 1.5)));
    for (let i = 0; i < 937; i++) { if (i >= n) break; const x = 110 + (i % 47) * 15, y = 230 + Math.floor(i / 47) * 28; c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(x, y, 7, 7); }
    text(c, String(n), 1500, 560, `800 280px ${GROT}`, '#fff', {align: 'right', ls: -12});
    text(c, 'of her real records, moved in', 1500, 640, `500 28px ${MONO}`, 'rgba(255,255,255,0.8)', {align: 'right'});
  } else if (kind === 'secure') {
    text(c, 'A+', SW / 2, 610, `800 400px ${GROT}`, '#fff', {align: 'center', ls: -10, alpha: ease(seg(t, at + 0.6, at + 0.9))});
    text(c, 'Qualys SSL Labs · Mozilla Observatory · securityheaders.com', SW / 2, 730, `500 26px ${MONO}`, 'rgba(255,255,255,0.85)', {align: 'center', alpha: ease(seg(t, at + 0.8, at + 1.2))});
  } else {
    const k = ease(seg(t, at + 0.6, at + 1.6));
    text(c, (4.53 * k).toFixed(2), SW / 2, 560, `italic 400 330px ${SERIF}`, '#fff', {align: 'center'});
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(450, 640, 700, 8); c.fillStyle = '#fff'; c.fillRect(450, 640, 700 * (4.53 / 5) * k, 8);
    text(c, 'out of 5 · Very High Quality · ISO/IEC 25010', SW / 2, 720, `500 26px ${MONO}`, 'rgba(255,255,255,0.85)', {align: 'center'});
  }
};

const close = (c: CanvasRenderingContext2D, t: number, at: number) => {
  c.fillStyle = PAPER; c.fillRect(0, 0, SW, SH);
  const a = ease(seg(t, at, at + 0.5));
  c.globalAlpha = a; mark(c, 420, 250, 170); c.globalAlpha = 1;
  text(c, 'Hivelet', 620, 382, `800 160px ${BRAND}`, INK, {ls: -6, alpha: a});
  if (t > at + 1.0) text(c, 'Same desk. Less on it.', SW / 2, 520, `italic 400 64px ${SERIF}`, INK, {align: 'center', alpha: ease(seg(t, at + 1.0, at + 1.4))});
  if (t > at + 2.4) {
    const url = 'hivelet.vercel.app', n = Math.round(clamp01((t - at - 2.7) / 0.9) * url.length);
    c.save(); c.globalAlpha = ease(seg(t, at + 2.4, at + 2.7));
    c.fillStyle = '#ffffff'; c.shadowColor = 'rgba(0,0,0,0.12)'; c.shadowBlur = 24; c.shadowOffsetY = 6; roundRect(c, 540, 590, 520, 84, 42); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = GL; c.beginPath(); c.arc(586, 632, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = INK; c.font = `500 30px ${MONO}`; c.fillText(url.slice(0, n), 616, 642);
    if (n < url.length || Math.floor(t * 2.5) % 2 === 0) { c.fillStyle = GL; c.fillRect(620 + c.measureText(url.slice(0, n)).width, 618, 16, 32); }
    c.restore();
  }
  if (t > at + 3.8) {
    const k = ease(seg(t, at + 3.8, at + 4.2));
    text(c, 'Group 4 · Bicol University · IT 124 Capstone Project 2', SW / 2, 790, `500 22px ${MONO}`, SOFT, {align: 'center', alpha: k});
    text(c, 'Lloyd · Sean · Eljohn · Vince · Kiel', SW / 2, 828, `600 22px ${MONO}`, 'rgba(20,20,20,0.75)', {align: 'center', alpha: k});
  }
};

// What the screen shows at time t. `S` holds the scene starts; `IN` when each object arrives.
export const drawScreen = (c: CanvasRenderingContext2D, t: number, S: Record<string, number>, IN: Record<string, number>, press: number) => {
  if (t < S.open) sheet(c, t);
  else if (t < S.ledger) splash(c, t, S.open);
  else if (t < S.invoice) ledger(c, t, S.ledger);
  else if (t < S.gcash) invoice(c, t, S.invoice);
  else if (t < S.repairs) verify(c, t, S.gcash, press);
  else if (t < S.ask) board(c, t, S.repairs);
  else if (t < S.records) ask(c, t, S.ask);
  else if (t < S.secure) proof(c, t, 'records', S.records);
  else if (t < S.quality) proof(c, t, 'secure', S.secure);
  else if (t < S.close) proof(c, t, 'quality', S.quality);
  else close(c, t, S.close);
  Object.values(IN).forEach((at) => flash(c, t, at));
};

// The screen's colour, for the light it throws on the desk.
export const screenGlow = (t: number, S: Record<string, number>): [string, number] => {
  if (t >= S.open && t < S.ledger) return [t > S.open + 0.3 ? '#2f7a55' : '#ffffff', 0.9];
  if (t >= S.records && t < S.secure) return ['#3a5ce0', 0.85];
  if (t >= S.secure && t < S.quality) return ['#ea7a63', 0.95];
  if (t >= S.quality && t < S.close) return ['#2f7a55', 0.85];
  return ['#f3f2ee', 1];
};
