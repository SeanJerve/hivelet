// Concurrency probe. READS ONLY. Phase A: live public surface. Phase B: admin reads via local backend.
// Chapter 4, Table 11B (29 Sep 2026). See README.md in this folder.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : null; };

async function phase(label, users, seconds, pick, headers = {}) {
  const stats = new Map();
  const end = Date.now() + seconds * 1000;
  let errors = 0, total = 0;
  const errorSamples = [];
  await Promise.all(Array.from({ length: users }, async (_, u) => {
    let i = u;
    while (Date.now() < end) {
      const url = pick(i++);
      const t = performance.now();
      let status = 0;
      try {
        const r = await fetch(url, { headers });
        await r.arrayBuffer();
        status = r.status;
      } catch (e) { status = 0; }
      const ms = performance.now() - t;
      total++;
      const key = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
      if (!stats.has(key)) stats.set(key, []);
      stats.get(key).push(ms);
      if (status < 200 || status >= 400) { errors++; if (errorSamples.length < 5) errorSamples.push(`${status} ${key}`); }
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 500)); // think time: a person, not a flood
    }
  }));
  console.log(`\n== ${label}: ${users} concurrent users, ${seconds}s, ${total} requests, ${errors} errors (${((errors / total) * 100).toFixed(2)}%)`);
  if (errorSamples.length) console.log('   error samples:', errorSamples.join(', '));
  console.log('   endpoint'.padEnd(44), 'n'.padStart(5), 'p50'.padStart(7), 'p95'.padStart(7), 'max'.padStart(7), '(ms)');
  for (const [k, a] of stats) console.log('   ' + k.padEnd(41), String(a.length).padStart(5), String(Math.round(pct(a, 50))).padStart(7), String(Math.round(pct(a, 95))).padStart(7), String(Math.round(Math.max(...a))).padStart(7));
  return { label, users, seconds, total, errors };
}

// Phase A - live public
const LIVE = 'https://hivelet.vercel.app';
const pub = ['/', '/api/public/rooms', '/api/public/rates', '/api/health', '/public', '/inquire'];
const a = await phase('A. LIVE public surface (hivelet.vercel.app)', 12, 60, (i) => LIVE + pub[i % pub.length]);

// Phase B - admin reads through the local backend (same live database)
const API = 'http://localhost:5000/api';
const creds = readFileSync(`${REPO}/credentials/creds.txt`, 'utf8');
const email = creds.match(/Email:\s*(\S+)/)?.[1];
const password = creds.match(/Password:\s*(\S+)/)?.[1];
const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: email, password }) });
const token = (await login.json())?.data?.token;
if (!token) { console.log('admin sign-in failed; phase B skipped'); process.exit(0); }
const adm = ['/admin/tenants', '/admin/rooms', '/admin/income-records?year=2026', '/admin/expense-entries?year=2026', '/admin/payments', '/admin/tickets', '/admin/inquiries', '/admin/notifications', '/admin/bills', '/auth/me'];
const b = await phase('B. Admin screens via local backend -> live DB', 6, 45, (i) => API + adm[i % adm.length], { Authorization: `Bearer ${token}` });

console.log('\nJSON', JSON.stringify({ a, b, at: new Date().toISOString() }));
