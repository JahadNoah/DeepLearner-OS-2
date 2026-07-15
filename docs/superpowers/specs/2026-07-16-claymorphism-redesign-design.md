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

Contrast-checked (WCAG relative luminance): `--clay-primary` (#8B7CF6) only reaches ~3.3:1
against white text — fails AA for normal text, so it's restricted to accents/active
states/links and never used as a background under white text. `--clay-primary-deep` (#6D5BD0)
reaches ~5.16:1 and is the actual button background wherever white text sits on top.

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `--clay-bg` | `#F5F2FB` | `#211E29` | Page background |
| `--clay-surface` | `#FFFFFF` | `#2B2735` | Card backgrounds |
| `--clay-primary` | `#8B7CF6` | `#A594F9` | Accents, active states, links — **not** a white-text bg |
| `--clay-primary-deep` | `#6D5BD0` | `#8B7CF6` | Button bg w/ white text (AA pass), hover states |
| `--clay-accent` | `#FFB4A2` | `#FFB4A2` | Secondary CTAs, streaks/highlights |
| `--clay-success` | `#8FD9B6` | `#8FD9B6` | Success/correct-answer accent |
| `--clay-success-tint` | `#E6F6EE` | `#24463A` | Correct-answer background (dark text/icon on top) |
| `--clay-danger` | `#EF7C6E` | `#EF7C6E` | Danger/wrong-answer accent |
| `--clay-danger-tint` | `#FDECEA` | `#4A2A28` | Wrong-answer background (dark text/icon on top) |
| `--clay-text` | `#332F3A` | `#EDEAF2` | Primary text |
| `--clay-text-sub` | `#635F69` | `#A6A1B0` | Secondary text |

Quiz correct/wrong states pair color with a Lucide check/X icon — never color alone (the
current `.quiz-option.correct`/`.wrong` classes in `index.css` are color-only today; this is a
real accessibility gap being fixed, not just a new-feature nicety).

**Theming mechanism — matches the codebase's existing convention exactly, not inverted:**
`ThemeContext.jsx` only ever toggles a `theme-light` class (never `theme-dark`); bare `:root` is
already the dark styling for every other token set in `index.css` (`--proto-*`, the legacy
`--primary` etc.). So `--clay-*` follows the same shape: dark values live on bare `:root`, light
values live under `.theme-light`. To make light the default for new users (this design's
decision), the only change needed is the fallback in `ThemeContext.jsx:7`
(`localStorage.getItem(...) || "dark"` → `|| "light"`) — a one-line change, not a restructure.

Typography: **Nunito** (headings, weight 800/900) replaces Sora; **DM Sans** (body) stays as-is
(already loaded via the existing Google Fonts `@import`). Fallback font *names* for Noto Sans SC
/ Noto Sans Tamil are included in the `--clay-font-head`/`--clay-font-body` stacks — free to keep
since consumers only ever reference the token, never the literal list, so there's no retrofit
cost either way. Not adding an actual `@import` for those font files, though: the app only
supports `ms`/`en` today (checked `i18n/translations.js`, `LanguageContext.jsx`), and loading
unused CJK/Tamil font files would be real, avoidable page weight for scripts nothing renders yet.
Add the `@import` when Chinese/Tamil UI strings actually exist.

Shape & shadow:
- Radius: 24px cards, 16px buttons/inputs, full pill for tags/badges.
- Light mode: no hard borders — depth via dual shadow, soft outer (`6px 6px 16px
  rgba(139,124,246,0.15)`) + subtle inset highlight (`inset -2px -2px 6px rgba(255,255,255,0.6)`).
- Dark mode: the light recipe goes flat on a dark surface, so dark uses glow + hairline instead
  of a recolored version of the same shadow — `0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0
  rgba(255,255,255,0.06)`.
- Press feedback: scale to 0.97, spring/cubic-bezier easing, 150–200ms, matching existing
  animation conventions in `index.css`.
- Focus: a visible `--clay-focus-ring` (`0 0 0 3px` of the primary color at reduced opacity) on
  every interactive element — claymorphism's soft edges swallow default browser focus outlines,
  so this needs to be explicit rather than assumed.

Icons: unchanged — Lucide, as already used throughout.

## Approach

**Extend the existing token pattern, don't replace it.** `--proto-*` (introduced in recent
commits) already establishes CSS-custom-properties + `.theme-light` override pattern for this
codebase. This design adds a parallel `--clay-*` namespace and new utility classes following
the same structure, rather than introducing Tailwind `@theme` config or `cva`-based components
— keeping the diff scoped to styling, not architecture.

## Rollout plan

1. Add `--clay-*` tokens (dark on bare `:root`, light under `.theme-light`, per the theming
   mechanism above) + core utility classes to `index.css`.
2. Flip the default-theme fallback in `ThemeContext.jsx:7` from `"dark"` to `"light"`.
3. Rebuild Dashboard using the new tokens/classes — show running locally (not pushed to git, to
   avoid triggering an unwanted Vercel deploy on WIP) for review.
4. Once approved, roll the same classes across the remaining pages and shared chrome, one at a
   time.

## Testing / verification

Visual review only (no new business logic). For each page as it's converted: confirm in the
local dev server that both light and dark variants render with readable contrast (4.5:1 body
text minimum), interactive states (hover/press/disabled/focus) are visually distinct, and no
existing functionality (uploads, quiz flow, history list, language toggle) regresses.

History specifically: test with a long list (20+ items). Dual box-shadows on many cards can
jank on scroll on lower-end devices — if it does, fall back to a lighter single-shadow variant
for list-context cards rather than the full dual-shadow recipe.
