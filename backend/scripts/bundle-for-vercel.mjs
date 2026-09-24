#!/usr/bin/env node
/**
 * Replaces tsc's dist/server.js with the API and every package it imports, in ONE file.
 *
 * WHY. Measured with `vercel build` (CLI 59.23.2, the version Vercel's builder
 * runs) on 2026-09-24: the Express builder ships dist/ FLATTENED to the function
 * root - server.js is backend/dist/server.js, package.json is dist/package.json -
 * but maps node_modules under backend/node_modules/. From /var/task/server.js,
 * Node never looks there, so every request failed with "Cannot find package
 * 'express' imported from /var/task/server.js". A server.js with no bare imports
 * cannot hit that, wherever the host puts node_modules.
 *
 * The other dist/ files tsc emits stay: the check scripts import dist/services/.
 * `npm run dev` runs src/ and is unaffected; `npm start` runs this bundle, which
 * is the same app. Its env loading finds the repository-root .env
 * (dist/../../.env), which is the file this project uses.
 *
 * ESM (dist/package.json says "type": "module"; see mark-dist-esm.mjs).
 * The banner gives CommonJS packages inside the bundle a working `require` for
 * Node's built-ins (esbuild otherwise throws "Dynamic require of 'fs' is not
 * supported" from ESM output).
 */
import { build } from 'esbuild';

await build({
  entryPoints: [new URL('../src/server.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  outfile: new URL('../dist/server.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
  banner: {
    js: "import { createRequire as __hiveletCreateRequire } from 'node:module'; const require = __hiveletCreateRequire(import.meta.url);",
  },
});

console.log('bundled dist/server.js (self-contained)');
