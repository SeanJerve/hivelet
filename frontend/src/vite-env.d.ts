/**
 * @file vite-env.d.ts
 * @description Global TypeScript ambient declarations for Vite and Vue Single File Components (SFCs).
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @rationale Enables TypeScript module resolution for .vue file imports across Vue Router and components.
 * @keyInnovations Defines explicit module shims for Vue SFCs allowing strict type-checking in Vite build pipeline.
 */
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
