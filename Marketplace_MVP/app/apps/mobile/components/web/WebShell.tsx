/**
 * WebShell (web/WebShell.tsx) — named standalone export used by screens and
 * layouts that want to compose the shell independently from the root wrapper.
 *
 * The root `components/WebShell.tsx` is the version wrapping the entire app
 * router tree. This file re-exports it so that import paths like
 * `components/web/WebShell` resolve correctly.
 *
 * Breakpoint behaviour:
 *  - Desktop (≥1024px): full 240px sidebar + topbar + scrollable main area
 *  - Tablet (768–1023px): 64px icon-only sidebar + topbar (with hamburger for
 *    a full-width drawer) + main area
 *  - Mobile-web (<768px) + native: passthrough — renders children directly so
 *    existing native Tabs and bottom-bar layouts are unaffected
 */
export { WebShell } from '../WebShell';
