#!/usr/bin/env node
/**
 * Bundles the API and every package it imports into ONE file, dist/vercel/server.bundle.mjs.
 *
 * WHY. Vercel's Express builder compiled src/server.ts and shipped it without
 * node_modules: every request on the 2026-09-24 deployment failed with
 * "Cannot find package 'express' imported from /var/task/server.js", although
 * express is a dependency and the build log shows it installed. A file with no
 * bare imports cannot hit that, however the host packages it. `backend/server.mjs`
 * is the entry Vercel picks (its builder checks the service root before src/),
 * and all it does is re-export this bundle.
 *
 * `npm run dev` and `npm start` do not use this; they run src/ and dist/ as before.
 *
 * `.mjs` so Node reads it as an ES module whatever package.json sits near it.
 * The banner gives CommonJS packages inside the bundle a working `require` for
 * Node's built-ins (esbuild otherwise throws "Dynamic require of 'fs' is not
 * supported" from ESM output).
 */
import { build } from 'esbuild';

await build({
  entryPoints: [new URL('../src/server.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  outfile: new URL('../dist/vercel/server.bundle.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
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

console.log('bundled dist/vercel/server.bundle.mjs');
