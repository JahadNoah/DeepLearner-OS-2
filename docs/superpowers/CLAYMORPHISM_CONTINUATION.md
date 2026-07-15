# Claymorphism Redesign — Continuation Notes

**Read this first if you're picking this work back up** (e.g. after a machine reset — this
file is committed to the repo specifically so it survives that).

## Where things stand

Phase 1 is **done, reviewed, and pushed**. It rebuilt only the Dashboard page as a flagship
prototype for a new claymorphism design system. Nothing else in the app has been touched yet.

- **Branch:** `feature/claymorphism-dashboard`
- **Remote:** `deeplearner-os-2` → `https://github.com/JahadNoah/DeepLearner-OS-2.git`
  (this is the repo that matches the live Vercel deployment, `deep-learner-os-2-ktwc.vercel.app`
  — there's also an `origin` remote pointing at an older, stale `DeepLearner-OS` repo; ignore it
  for this work)
- **No PR opened yet.** The branch is pushed but nobody's asked for a PR — check with the user
  before opening one.
- **Spec:** `docs/superpowers/specs/2026-07-16-claymorphism-redesign-design.md`
- **Plan:** `docs/superpowers/plans/2026-07-16-claymorphism-dashboard-prototype.md`
- **Progress ledger from the build:** `.superpowers/sdd/progress.md` (this is git-ignored
  scratch, so it did NOT survive — the summary below replaces it)

## What was actually built (6 commits)

1. `--clay-*` design tokens added to `frontend/src/index.css`, parallel to the existing
   `--proto-*` system (which is untouched). Dark values live on bare `:root`, light values
   live under `.theme-light` — this matches the file's existing convention exactly, don't
   invert it.
2. Core utility classes: `.clay-card`, `.clay-btn` / `.clay-btn-primary` / `.clay-btn-ghost`,
   `.clay-input`, `.clay-badge`.
3. `frontend/src/context/ThemeContext.jsx` — default theme fallback flipped from `"dark"` to
   `"light"` (claymorphism looks best in light mode; that's a deliberate decision, not a bug).
   **Known side effect:** since `ThemeProvider` wraps the whole app, Landing/Login/Register also
   default to light now for new users — that's their pre-existing, already-built light variant,
   not a new design change, and was an accepted tradeoff.
4. `frontend/src/pages/Dashboard.jsx` rebuilt end-to-end with the new tokens/classes. Also
   fixed a pre-existing accessibility gap in passing: feature tiles and recent-session rows
   were non-focusable `<div onClick>` — now real `<Link>` elements with the same navigation
   targets.
5. **Fix round 1** (from Task 4's own review): dark-mode `--clay-primary-deep` only reached
   ~3.33:1 contrast against white text (fails WCAG AA). Root cause: the dark palette lifted
   every color one step lighter without checking that `-deep`'s specific job (safe dark
   background for white text) still held up. Fixed by pinning `--clay-primary-deep` to the
   same `#6D5BD0` in both themes (~5.18:1).
6. **Fix round 2** (from the final whole-branch review): four more contrast/focus bugs, all
   independently verified by hand before fixing:
   - Accent chips (feature-tile icons, `⌘K` badge) were near-invisible in dark mode (~1.4:1) —
     added `--clay-on-accent` (`#332F3A`, fixed in both themes) as their foreground.
   - "Start now →" / "See all →" links and the "Quizzes Done" stat number reused
     `--clay-primary-deep` as *text* color, which fails badly on dark surfaces (~2.8:1) —
     added a new `--clay-link` token (`#A594F9` dark / `#6D5BD0` light) specifically for
     text-on-surface use. `--clay-primary-deep` stays reserved for solid button backgrounds
     only — don't reuse it for text color again.
   - The "History" ghost button's translucent overlay dropped white-text contrast to ~3.87:1 —
     fixed by dropping the overlay for that specific usage (transparent bg directly on the
     solid card color instead).
   - The search input's focus ring was wired to `:focus-visible` on a non-focusable wrapper
     `<div>` — never actually matched. Fixed via `:focus-within` instead.

**Lesson worth remembering for Phase 2:** every contrast bug found so far came from reusing a
token for a job it wasn't designed for (a "button background" token used as text color, a
"fixed light" background paired with a "theme-flipping" foreground). When extending `--clay-*`
tokens to new pages, check *what surface* each color/text pairing actually sits on in *each*
theme — don't assume a token that passed AA in one usage automatically passes in another.

## What's NOT done yet (Phase 2, not started, no plan written)

Rolling the same `--clay-*` system out to: `InputPage.jsx`, `AudioInput.jsx`, `Transcript.jsx`,
`Summary.jsx`, `Quiz.jsx`, `History.jsx`, and the shared chrome (`Sidebar.jsx`, `TopHeader.jsx`,
`BackgroundLayer.jsx`). This is intentionally **not planned yet** — it was deferred until the
human reviews the Dashboard prototype running locally and decides whether the direction is
right before more pages get touched.

**Before starting Phase 2:** the user needs to actually run `npm run dev`, look at the
Dashboard in a browser (light and dark mode, tab through with keyboard), and confirm they're
happy with it. Don't skip straight to Phase 2 planning without that checkpoint — it's the
whole reason Dashboard was built alone first.

## Environment gotchas hit during Phase 1 (may or may not still apply)

- Node.js on this machine was broken at one point (`dyld` error, missing
  `libsimdjson.27.dylib` after a Homebrew upgrade left Node linked against a version no longer
  on disk). Fixed via `brew reinstall node`. If this exact error shows up again, that's the fix.
- Git operations (`status`, `commit`, `fetch`) in this repo were unusually slow (30–90+ seconds)
  — likely due to a large `graphify-out/cache/` directory with thousands of small files. Don't
  assume a slow git command is hung; give it time before investigating further.
- No automated test framework exists in `frontend/` (no vitest/jest, no test files). Every
  verification in this work was `npm run build` succeeding + manual browser checks — that's
  expected, not a gap to fill in unless the user asks for test infrastructure specifically.
