# Post-Login Claymorphism Redesign — Design

**Date:** 2026-07-16
**Goal:** Make everything after login/signup (Dashboard, InputPage, AudioInput, Transcript,
Summary, Quiz, History, plus shared chrome — Navbar/Sidebar/TopHeader) feel more polished and
beautiful, by moving from the current dark "proto-" glass theme to a soft claymorphism style
with a new pastel palette. Landing/Login/Register pages are out of scope — only the
authenticated app experience changes.

## Scope

In scope:
- New `--clay-*` design token set (colors, radius, shadow, typography) in `frontend/src/index.css`.
- New utility classes: `.clay-card`, `.clay-btn`, `.clay-input`, `.clay-badge` (and any small
  variants needed as pages are rebuilt), following the same CSS-custom-property + class pattern
  already established by `--proto-*`.
- Dashboard rebuilt first as the flagship prototype, reviewed locally before continuing.
- Once approved, the same tokens/classes rolled out to InputPage, AudioInput, Transcript,
  Summary, Quiz, History, Navbar, Sidebar, TopHeader.
- Flipping the default theme to light mode (claymorphism's native mode), with an adapted
  (not identical) dark variant for users who toggle it.

Out of scope:
- Landing page, Login, Register — untouched by this pass.
- Any backend/API changes.
- Migrating to Tailwind `@theme` tokens or `cva`-based components — bigger, unrelated
  architectural change; the existing CSS-custom-property pattern is reused instead.
- Restructuring page layouts/information architecture — this is a visual/styling pass, not a
  UX flow redesign, unless a specific page's current layout actively fights the new style.

## Style reference (from ui-ux-pro-max skill lookup)

Claymorphism keywords: soft 3D, chunky-but-refined, no hard borders, double shadow (soft
outer + subtle inset highlight), rounded 16–24px. Best fit for "SaaS platforms / educational
apps" per the skill's product-type reasoning. Confirmed: **full support in light mode, only
partial in dark mode** — hence the light-mode-primary decision above.

## Design tokens

| Token | Value | Use |
|---|---|---|
| `--clay-bg` | `#F5F2FB` | Page background (light) |
| `--clay-primary` | `#8B7CF6` | Primary buttons, active states, links |
| `--clay-primary-deep` | `#6D5BD0` | Text-on-primary, hover states |
| `--clay-accent` | `#FFB4A2` | Secondary CTAs, streaks/highlights |
| `--clay-success` | `#8FD9B6` | Success states, quiz correct answers |
| `--clay-surface` | `#FFFFFF` | Card backgrounds |
| `--clay-text` | `#332F3A` | Primary text |
| `--clay-text-sub` | `#635F69` | Secondary text |

Dark variant: same hue relationships, deepened onto `#211E29` base rather than true black —
adapted, not the primary showcase.

Typography: **Nunito** (headings, weight 800/900) replaces Sora; **DM Sans** (body) stays as-is
(already loaded via the existing Google Fonts `@import`).

Shape & shadow: 24px card radius, 16px button/input radius, full pill for tags/badges. No hard
borders — depth via dual shadow: soft outer (`6px 6px 16px rgba(139,124,246,0.15)`) + subtle
inset highlight (`inset -2px -2px 6px rgba(255,255,255,0.6)`). Press feedback: scale to 0.97,
spring/cubic-bezier easing, 150–200ms, matching existing animation conventions in `index.css`.

Icons: unchanged — Lucide, as already used throughout.

## Approach

**Extend the existing token pattern, don't replace it.** `--proto-*` (introduced in recent
commits) already establishes CSS-custom-properties + `.theme-light` override pattern for this
codebase. This design adds a parallel `--clay-*` namespace and new utility classes following
the same structure, rather than introducing Tailwind `@theme` config or `cva`-based components
— keeping the diff scoped to styling, not architecture.

## Rollout plan

1. Add `--clay-*` tokens + core utility classes to `index.css`.
2. Rebuild Dashboard using them — show running locally (not pushed to git, to avoid triggering
   an unwanted Vercel deploy on WIP) for review.
3. Once approved, roll the same classes across the remaining pages and shared chrome, one at a
   time.

## Testing / verification

Visual review only (no new business logic). For each page as it's converted: confirm in the
local dev server that both light and dark variants render with readable contrast (4.5:1 body
text minimum), interactive states (hover/press/disabled) are visually distinct, and no existing
functionality (uploads, quiz flow, history list, language toggle) regresses.
