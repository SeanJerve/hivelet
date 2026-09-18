/**
 * @file lib/demoAccounts.dev.ts
 * @description The demonstration sign-in list. DEVELOPMENT ONLY - see below.
 *
 * NOTHING PERSONAL IS WRITTEN IN THIS FILE, AND NOTHING MAY BE
 * ------------------------------------------------------------
 * This module used to carry the list as a literal array: the full name, email
 * address and room number of 33 real residents, in a tracked file, in a public
 * repository.
 *
 * Keeping it out of `dist` was never the whole problem. The bundler question -
 * whether `if (import.meta.env.DEV)` around a dynamic import is eliminated -
 * only ever decided whether a visitor to the site could read the list. Anyone
 * who opened the repository could read it either way, and it had been readable
 * there for weeks. BR-024 Tenant Privacy is the rule, and the repository is the
 * larger breach of it.
 *
 * The list now lives in the gitignored `credentials/demo-accounts.json`, sent
 * separately like `creds.txt`. `vite.config.ts` hands it to the dev server as
 * `__DEMO_ACCOUNTS__` and hands a build `null`.
 *
 * So there are now two independent reasons a built app carries no resident
 * data, and only one of them is the bundler:
 *   1. the define is `null` for any `command !== 'serve'`, and
 *   2. there is nothing in the tracked source for the bundler to include.
 *
 * The second is the one that does not depend on tree-shaking working the way a
 * comment claims it does.
 *
 * NO PASSWORD IS WRITTEN HERE EITHER
 * ----------------------------------
 * The literals that used to sit here were rotated on 2026-09-13 and are burned.
 * The current passwords live only in `credentials/creds.txt`. A rotation needs
 * no edit here - restart the dev server.
 *
 * ON A MACHINE WITHOUT EITHER FILE the list is empty and the panel does not
 * render, which is correct: those machines were never sent the credentials.
 *
 * Do not import this module anywhere but inside `if (import.meta.env.DEV)`.
 */

declare const __DEMO_PASSWORDS__: { admin: string; tenant: string } | null;
declare const __DEMO_ACCOUNTS__: Omit<DemoAccount, 'password'>[] | null;

export interface DemoAccount {
  roleLabel: string;
  roleType: 'admin' | 'tenant' | 'inactive';
  name: string;
  email: string;
  /** `null` when `credentials/creds.txt` is absent or unreadable on this machine. */
  password: string | null;
  room?: string;
  badgeClass: string;
}

const listed: Omit<DemoAccount, 'password'>[] = __DEMO_ACCOUNTS__ ?? [];

export const demoAccounts: DemoAccount[] = listed.map((account) => ({
  ...account,
  password: __DEMO_PASSWORDS__
    ? account.roleType === 'admin'
      ? __DEMO_PASSWORDS__.admin
      : __DEMO_PASSWORDS__.tenant
    : null,
}));
