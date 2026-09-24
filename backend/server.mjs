/**
 * The entry Vercel runs for the express API. Nothing else uses this file.
 *
 * Vercel's Express builder takes the first of {app,index,server}.* at the
 * service root, then src/{app,index,server}.*, whose source mentions express -
 * so this file is chosen over src/server.ts. It re-exports a single bundled
 * file with every package inlined (scripts/bundle-for-vercel.mjs), because the
 * builder shipped src/server.ts without node_modules and every request failed
 * with "Cannot find package 'express'" (2026-09-24).
 *
 * Local development is unchanged: `npm run dev` runs src/server.ts directly.
 */
export { default } from './dist/vercel/server.bundle.mjs';
