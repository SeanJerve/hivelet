#!/usr/bin/env node
/**
 * Gives the DEMO deployment (hivelet-demo on Vercel) its two secrets, then redeploys it.
 *
 *   SUPABASE_SECRET_KEY  pasted by you, from the hivelet-demo Supabase project:
 *                        Project Settings > API Keys > Secret keys. Never the live one.
 *   JWT_SECRET           generated here, 48 random bytes. Nobody needs to know it.
 *
 * The key is read without echoing and handed straight to `vercel env add` on stdin,
 * so it is never printed, written to a file, or put on a command line.
 *
 * Deploys from ~/hivelet-demo-deploy (see README.md beside this file).
 * Run from the repository root:  node scripts/demo/set-demo-secrets.mjs
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Outside the repository on purpose: a copy of the code inside it is walked by
// check:canon and the other checks, which then fail on the copy.
const deployDir = path.join(os.homedir(), 'hivelet-demo-deploy');
const DEMO_PROJECT = 'hivelet-demo';
const DEMO_SUPABASE_REF = 'xthblwzyvporxicgrcgz';

// Refuse to run anywhere but the folder linked to the demo project: the live
// project's secrets must never be overwritten by this.
const link = path.join(deployDir, '.vercel', 'project.json');
if (!fs.existsSync(link) || JSON.parse(fs.readFileSync(link, 'utf8')).projectName !== DEMO_PROJECT) {
  console.error(`${deployDir} is not linked to the ${DEMO_PROJECT} Vercel project. Stopping.`);
  process.exit(1);
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    stdin.on('data', function onData(ch) {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value.trim());
        }
        if (c === '\u0003') process.exit(130);
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else value += c;
      }
    });
  });
}

function vercel(args, input) {
  const r = spawnSync('vercel', args, { cwd: deployDir, input, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error((r.stderr || r.stdout || '').trim().split('\n').slice(-3).join('\n'));
    process.exit(r.status ?? 1);
  }
  return r.stdout;
}

console.log(`Demo Supabase project: https://supabase.com/dashboard/project/${DEMO_SUPABASE_REF}/settings/api-keys`);
const key = await readHidden('Paste the demo project\'s secret key (sb_secret_...), then Enter: ');
if (!key.startsWith('sb_secret_')) {
  console.error('That does not look like a secret key (it should start with sb_secret_). Nothing was changed.');
  process.exit(1);
}

for (const [name, value] of [
  ['SUPABASE_SECRET_KEY', key],
  ['JWT_SECRET', randomBytes(48).toString('base64url')]
]) {
  // `rm` first so re-running replaces rather than fails on "already exists".
  spawnSync('vercel', ['env', 'rm', name, 'production', '--yes'], { cwd: deployDir, encoding: 'utf8', shell: process.platform === 'win32' });
  vercel(['env', 'add', name, 'production'], value);
  console.log(`set ${name}`);
}

console.log('Redeploying the demo (about a minute)...');
vercel(['deploy', '--prod', '--yes']);
console.log('Done: https://hivelet-demo.vercel.app');
