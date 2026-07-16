# Claymorphism Phase 2 — App-Wide Rollout Plan

> **For agentic workers:** implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
> Each task ends with a build + browser verify and its own commit. **Review checkpoints**
> are marked ⏸ — stop there for the human to look before continuing.

**Goal:** Roll the `--clay-*` claymorphism system (built and reviewed on the Dashboard in
Phase 1) out to the rest of the authenticated app — the shared chrome and the six inner
pages — so the whole logged-in experience is one cohesive clay design.

## Decisions locked before this plan (from the Phase 1 review)

1. **Accent: amber → purple, everywhere in scope.** The current amber/orange accent
   (`var(--amber)`, `#B85C00`/`#D97706`, `rgba(184,92,0,…)`) is **removed** from every
   Phase 2 file and replaced with clay purple. Single-accent look.
   - The `--amber*` tokens stay *defined* in `index.css` because Landing/Login/Register
     (out of scope — pre-existing light variants) still use them. We stop *using* amber in
     the converted files; we do **not** delete or repoint the token globally (that would
     restyle the out-of-scope auth/landing pages).
2. **Order: shared chrome first**, then the pages. Chrome is on every screen, so converting
   it first makes every page instantly more cohesive and kills the orange-pill clash early.
3. **Scope per file: re-skin + content cleanup.** While converting, also remove placeholder
   filler (fake pravatar avatars, "14 rakan penyelidik…", "AI INSIGHT PULSE", etc.) and route
   hardcoded Malay-only strings through the `t()` i18n system. Not a separate pass.

## Architecture

Same as Phase 1: pure CSS-custom-property + utility-class work in `frontend/src/index.css`,
consumed by the page/component JSX. No new build tooling. Pages move off `--proto-*` tokens
and `.proto-*` classes onto the `--clay-*` equivalents. The `--proto-*` system stays defined
(still used by out-of-scope Landing/Login/Register) but is no longer referenced by any
converted file.

## Tech stack

React 19, Vite 6, Tailwind v4 (`@import "tailwindcss"` — used as utility classes on some
pages, notably AudioInput), plain CSS custom properties, Lucide icons, Framer Motion,
react-router-dom, `@paper-design/shaders-react` (MeshGradient in BackgroundLayer).

---

## Global constraints (carry every one of these)

- **No test framework** in `frontend/` — verification is `npm run build` (must pass, exit 0)
  + manual browser check in **both** light and dark mode, keyboard tab-through. Same as Phase 1.
- **Contrast discipline (the Phase 1 lesson):** every clay contrast bug so far came from
  reusing a token for a job it wasn't designed for. Before shipping any color/text pairing,
  check what surface it sits on **in both themes**:
  - `--clay-primary` (`#8B7CF6` light / `#A594F9` dark) is **never** a white-text background
    (fails AA ~3.3:1). White-text buttons use `--clay-primary-deep` (`#6D5BD0`, ~5.18:1).
  - Text/icon accents *on a surface* use `--clay-link` (`#6D5BD0` light / `#A594F9` dark) —
    **not** `--clay-primary-deep` as a text color (fails on dark surfaces).
  - Icon/text on the peach `--clay-accent` uses `--clay-on-accent` (`#332F3A`).
  - Muted text on `--clay-primary-deep` uses `--clay-on-primary-muted` (`#F3F1FB`, ~4.63:1) —
    never white-at-opacity (drops below AA).
- **Focus rings:** every focusable clay element needs a visible `:focus-visible`/`:focus-within`
  ring via `--clay-focus-ring` — clay's soft edges swallow the browser default.
- **Dark shadows are not recolored light shadows** — light = soft-outer + inset-highlight,
  dark = glow + hairline (already encoded in `--clay-shadow`).

---

## Token & class mapping (apply consistently in every file)

**`--proto-*` → `--clay-*`**

| proto | clay | notes |
|---|---|---|
| `--proto-bg` | `--clay-bg` | |
| `--proto-surface` | `--clay-surface` | |
| `--proto-surface2` | `--clay-surface-2` | **new token (Task 0)** — recessed fill / input wells |
| `--proto-text` | `--clay-text` | |
| `--proto-text-2` | `--clay-text-sub` | |
| `--proto-text-3` | `--clay-text-3` | **new token (Task 0)** — faintest labels; must pass AA on `--clay-surface` |
| `--proto-border` | *(usually drop)* | clay is shadow-based; where a divider is structurally needed use a faint hairline rgba |
| `--proto-radius` | `--clay-radius-card` / `-ctrl` | |
| `--proto-shadow` / `-lg` | `--clay-shadow` | |
| `--proto-font` / `-font-body` | `--clay-font-head` / `--clay-font-body` | |
| `.proto-card` | `.clay-card` | |
| `.proto-content` | keep (layout only, no color) or plain `<div>` | verify it carries no proto color |

**amber → purple**

| current | replace with |
|---|---|
| `var(--amber)` as solid CTA bg (white text) | `var(--clay-primary-deep)` |
| `var(--amber)` as text/icon accent on a surface | `var(--clay-link)` |
| `var(--amber-glow)` / `rgba(184,92,0,x)` glows & shadows | `var(--clay-primary-glow)` (**new token, Task 0**) or `--clay-shadow` |
| `#fff` text on amber | `#fff` on `--clay-primary-deep` (5.18:1, fine) |
| peach `--clay-accent` (`#FFB4A2`) | **keep** — it's already clay, not amber; use for soft icon chips (as Dashboard does) |

---

### Task 0: Foundation — new tokens, dead-code removal

**Files:** `frontend/src/index.css`; delete `frontend/src/components/TopHeader.jsx`;
`frontend/src/pages/Dashboard.jsx` (remove one dead const).

- [ ] **Add three tokens** to both `:root` (dark) and `.theme-light` (light) in the clay block,
  next to the existing clay tokens (~line 7355 / 7395). Values are starting points — **compute
  AA before committing** where they carry real text:
  - `--clay-surface-2` — recessed fill. Dark `#34303F`, light `#EFEBF8`.
  - `--clay-text-3` — faintest label tone. **Must be ≥4.5:1 on `--clay-surface`** in each theme
    (compute; e.g. dark ~`#8F8A99`, light ~`#7A7684` — verify, don't trust these).
  - `--clay-primary-glow` — purple glow replacing `--amber-glow`. Dark `rgba(165,148,249,0.18)`,
    light `rgba(109,91,208,0.18)`.
- [ ] **Delete `components/TopHeader.jsx`** — it is dead code (defined, imported/rendered
  nowhere; `AppLayout` uses `Sidebar` + `BackgroundLayer` only). Optionally also remove the
  `.cl-topbar` / `.cl-nav-*` / `.cl-profile*` / `.cl-drop*` / `.cl-mobile*` CSS blocks in
  `index.css` if nothing else references them (grep first).
- [ ] **Remove the dead `ACCENT = "#B85C00"` const** in `Dashboard.jsx` (~line 101) and the
  now-unused `color: f.color` it feeds — the tiles render `--clay-accent`/`--clay-on-accent`,
  so `ACCENT` is a leftover amber value never painted.
- [ ] **Verify:** `npm run build` passes. Grep confirms no remaining `TopHeader` import.
- [ ] **Commit:** `Add clay-surface-2/text-3/primary-glow tokens; remove dead TopHeader + Dashboard ACCENT`

---

### Task 1: Sidebar → clay

**Files:** `frontend/src/components/ui/Sidebar.jsx`; the `.proto-sidebar*` / `.proto-nav-item`
/ `.proto-sidebar-cta` rules in `index.css`.

**Approach:** Sidebar is class-driven. Convert its CSS classes (or add `.clay-sidebar*`
equivalents and switch the JSX). The **orange pill** is `.proto-sidebar-cta` and the **orange
active nav** is `.proto-nav-item.active` — both become clay purple (`--clay-primary-deep` bg,
white text for the CTA; `--clay-primary`/`--clay-link` accent for the active item). Inline
`var(--proto-surface2)` / `var(--proto-border)` in the profile dropdown → clay tokens.

- [ ] Convert `.proto-sidebar`, `-logo`, `-user`, `.proto-nav-section`, `.proto-nav-item`
  (+ `.active`), `.proto-sidebar-cta` to clay tokens/shadows; kill amber.
- [ ] Dropdown inline styles → clay tokens; logout stays `--clay-danger`.
- [ ] Give the CTA + nav items a `:focus-visible` clay ring.
- [ ] **Verify** (build + browser, both themes, keyboard): pill and active item are purple,
  no orange anywhere in the sidebar, dropdown readable in both themes.
- [ ] **Commit:** `Convert Sidebar to clay tokens (purple CTA + active state, no amber)`

---

### Task 2: BackgroundLayer → clay tones

**Files:** `frontend/src/components/ui/BackgroundLayer.jsx`.

**Approach:** the MeshGradient currently uses pure white (`#ffffff…`) light / pure black
(`#000000…`) dark. Shift to clay: light mesh around the clay bg cream/purple
(`#F5F2FB`, `#EFEBF8`, `#F5F2FB`, subtle `#E8E2F6`), dark mesh around the clay dark bg
(`#211E29`, `#1B1822`, `#2B2735`, `#181520`). Keep it subtle — it sits behind clay cards.

- [ ] Replace `meshColors` / `meshBg` light+dark arrays with clay-derived tones.
- [ ] **Verify:** background reads as soft clay cream (light) / clay charcoal (dark), cards
  still pop against it, no pure-white/pure-black banding.
- [ ] **Commit:** `Shift BackgroundLayer mesh to clay bg tones`

⏸ **Review checkpoint A** — with chrome done, log in and click through every page once. The
pages are still `proto`/amber inside, but the frame (sidebar, background) should now be fully
clay. Confirm the direction before converting page interiors.

---

### Tasks 3–8: Pages (re-skin + content cleanup, one commit each)

Same recipe per page: apply the mapping table (proto→clay, amber→purple), swap `.proto-card`
→ `.clay-card`, add focus rings, then the **cleanup** for that page. Verify build + browser
(both themes, keyboard) and commit. Order runs the core learning flow first, then History.

- [ ] **Task 3 — InputPage.jsx** (heaviest: 22 amber refs, dense inline proto styles).
  Cleanup: remove the fake pravatar avatars + "14 rakan penyelidik…" filler and the
  "AI INSIGHT PULSE" decorative card; route the hardcoded Malay strings ("Pusat Sumber
  Penyelidikan", "Letakkan fail di sini", "Simpan Draf", "Seterusnya →", the info blurb, the
  two bottom sub-cards, the loading overlay) through `t()` (add keys to both `ms` + `en` in
  `i18n/translations.js`). Commit: `Convert InputPage to clay + drop placeholder filler, i18n strings`
- [ ] **Task 4 — AudioInput.jsx** (Tailwind `className`-based, 5 amber). Cleanup: any
  hardcoded strings → `t()`. Note: this page styles via Tailwind utilities, so amber→purple
  may be Tailwind color classes rather than `var(--amber)` — grep the file for the exact form.
  Commit: `Convert AudioInput to clay (no amber)`
- [ ] **Task 5 — Transcript.jsx** (proto, 1 amber). Commit: `Convert Transcript to clay`
- [ ] **Task 6 — Summary.jsx** (proto, 3 amber). Commit: `Convert Summary to clay`
- [ ] **Task 7 — Quiz.jsx** (proto, 6 amber). Cleanup: check for correct/incorrect answer
  colors — keep `--clay-success`/`--clay-danger`, don't purple those. Commit: `Convert Quiz to clay`
- [ ] **Task 8 — History.jsx** (proto, 1 amber). Commit: `Convert History to clay`

⏸ **Review checkpoint B** — full walkthrough of the whole authenticated app in both themes.

---

## Final sweep (after Task 8)

- [ ] Grep the converted files for stragglers: `--amber`, `184, ?92, ?0`, `B85C00`, `D97706`,
  `--proto-`, `.proto-card` — should be zero hits across chrome + the six pages.
- [ ] Confirm `--amber*` / `--proto-*` tokens are still defined (Landing/Login/Register depend
  on them) and those three out-of-scope pages still render unchanged.
- [ ] Update `docs/superpowers/CLAYMORPHISM_CONTINUATION.md` to mark Phase 2 done.

## Out of scope (do not touch)

Landing.jsx, Login.jsx, Register.jsx, and the `SignInFlow`/`Navbar`/`TubelightNavbar`/other
`components/ui/*` used only by those — pre-existing light variants on the `--amber`/`--proto`
systems, intentionally left as-is.
