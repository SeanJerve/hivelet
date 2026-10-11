#!/usr/bin/env node
// Turns this machine's Claude Code session logs for Hivelet into a dated prompt log, for the
// AI-use disclosure (CHED CMO No. 21, s. 2026; docs/FINAL MANUSCRIPT/AI_USE_DISCLOSURE.md).
//
//   node scripts/ai-use/export-prompt-log.mjs [--out=ai-use-log] [--projects=<dir>]
//
// Reads ~/.claude/projects/<folder containing "hivelet">/*.jsonl. Keeps only what a person typed
// (origin.kind "human"), never tool output or the model's replies, and writes:
//   <out>/PROMPT_LOG_<machine>.md   every prompt, by date, with obvious secrets and contact
//                                   details masked
//   <out>/SUMMARY_<machine>.md      sessions, prompts and models per day
// The output folder is gitignored: the repository is public and prompts can quote tenants'
// details. Read the log before giving it to anyone; the masking is a net, not a guarantee.
// Each machine has its own logs, so run this on every machine that ran Claude Code.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const projects = arg('projects', path.join(os.homedir(), '.claude', 'projects'));
const out = path.resolve(arg('out', 'ai-use-log'));
const machine = os.hostname().replace(/[^\w-]/g, '');

export function mask(t) {
  return t
    .replace(/^(\s*[A-Z][A-Z0-9_]*(?:KEY|SECRET|PASS|TOKEN)[A-Z0-9_]*\s*=\s*)\S+/gm, '$1[removed]')
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, '[token removed]')
    .replace(/\b(sk|pk|rk|AQE|sb_secret|sb_publishable)[\w-]{16,}/g, '[key removed]')
    .replace(/\b[A-Fa-f0-9]{40,}\b/g, '[key removed]')
    .replace(/((?:password|passwd|pwd|secret|api[_ -]?key|hmac)\s*[:=]\s*)\S+/gi, '$1[removed]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email removed]')
    .replace(/(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, '[phone removed]');
}

function promptText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  if (content.some((c) => c.type === 'tool_result')) return '';
  return content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
}

function shorten(t) {
  // Long pasted blocks are recorded by size and opening, not reproduced in full.
  return t.replace(/<pasted_content[^>]*>([\s\S]*?)<\/pasted_content[^>]*>/g, (_, body) =>
    `[pasted text, ${body.length} characters, beginning: "${body.trim().slice(0, 160).replace(/\s+/g, ' ')}..."]`);
}

const dirs = fs.existsSync(projects)
  ? [...new Map(fs.readdirSync(projects).filter((d) => /hivelet/i.test(d))
      .map((d) => [d.toLowerCase(), path.join(projects, d)])).values()]
  : [];
if (dirs.length === 0) { console.error(`No Hivelet session logs under ${projects}`); process.exit(1); }

const seen = new Set();
const prompts = []; const models = new Map(); const sessions = new Set();
for (const dir of dirs) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      if (!line.startsWith('{')) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      const day = (r.timestamp || '').slice(0, 10);
      if (r.type === 'assistant' && r.message?.model && r.message.model !== '<synthetic>' && day) {
        const k = `${day}|${r.message.model}`; models.set(k, (models.get(k) || 0) + 1);
      }
      if (r.type !== 'user' || r.origin?.kind !== 'human' || r.isMeta || r.isCompactSummary) continue;
      const text = promptText(r.message?.content).trim();
      if (!text || /^<(command-|local-command|system-reminder)/.test(text)) continue;
      const key = `${r.timestamp}|${text}`;
      if (seen.has(key)) continue; // a resumed session repeats the earlier prompts in its own log
      seen.add(key);
      sessions.add(r.sessionId);
      prompts.push({ ts: r.timestamp, session: (r.sessionId || '').slice(0, 8), via: r.entrypoint || '', text: mask(shorten(text)) });
    }
  }
}
prompts.sort((a, b) => a.ts.localeCompare(b.ts));
fs.mkdirSync(out, { recursive: true });

const days = [...new Set(prompts.map((p) => p.ts.slice(0, 10)))];
let log = `# Prompt log, Hivelet, machine ${machine}\n\nGenerated ${new Date().toISOString().slice(0, 10)} by scripts/ai-use/export-prompt-log.mjs from ${dirs.length} log folder(s).\n${prompts.length} prompts in ${sessions.size} sessions, ${days[0] || '-'} to ${days.at(-1) || '-'}.\nOnly what a person typed is listed. Secrets, emails and phone numbers are masked; read it before sharing.\n`;
for (const d of days) {
  log += `\n## ${d}\n`;
  for (const p of prompts.filter((x) => x.ts.startsWith(d))) {
    log += `\n**${p.ts.slice(11, 16)} UTC** (session ${p.session}${p.via ? `, ${p.via}` : ''})\n\n${p.text.split('\n').map((l) => `> ${l}`).join('\n')}\n`;
  }
}
fs.writeFileSync(path.join(out, `PROMPT_LOG_${machine}.md`), log);

let sum = `# Claude Code use on machine ${machine}\n\n| Date | Prompts | Model replies by model |\n| :--- | --: | :--- |\n`;
for (const d of days) {
  const m = [...models].filter(([k]) => k.startsWith(d)).map(([k, n]) => `${k.split('|')[1]} ${n}`).join(', ');
  sum += `| ${d} | ${prompts.filter((p) => p.ts.startsWith(d)).length} | ${m} |\n`;
}
const totals = {}; for (const [k, n] of models) { const m = k.split('|')[1]; totals[m] = (totals[m] || 0) + n; }
sum += `\n**Totals:** ${prompts.length} prompts, ${sessions.size} sessions. Models: ${Object.entries(totals).map(([m, n]) => `${m} (${n} replies)`).join(', ')}.\n`;
fs.writeFileSync(path.join(out, `SUMMARY_${machine}.md`), sum);
console.log(`${prompts.length} prompts, ${sessions.size} sessions, ${days[0]} to ${days.at(-1)} -> ${path.relative(process.cwd(), out)}/`);
console.log(Object.entries(totals).map(([m, n]) => `  ${m}: ${n} replies`).join('\n'));
