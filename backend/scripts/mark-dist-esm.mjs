#!/usr/bin/env node
/**
 * Writes `dist/package.json` saying the compiled output is ES modules.
 *
 * `tsc` emits ESM (`"module": "NodeNext"` under this package's `"type": "module"`),
 * but a `.js` file is only ESM if the NEAREST package.json says so. Here that is
 * `backend/package.json` - which is not beside `dist/` once a host packages the
 * build on its own. The first Vercel deployment (2026-09-24) failed every API
 * request with "Failed to load the ES module: /var/task/server.js. Make sure to
 * set "type": "module" in the nearest package.json". This makes `dist/` say it.
 */
import { writeFileSync } from 'node:fs';

writeFileSync(new URL('../dist/package.json', import.meta.url), `${JSON.stringify({ type: 'module' })}\n`);
