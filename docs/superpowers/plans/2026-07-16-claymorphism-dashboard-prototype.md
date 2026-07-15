# Claymorphism Dashboard Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a new `--clay-*` claymorphism design-token system alongside the existing
`--proto-*` one, flip the app's default theme to light (claymorphism's native mode), and rebuild
the Dashboard page as the flagship prototype — reviewed locally before any other page is touched.

**Architecture:** Pure CSS-custom-property + utility-class addition, following the exact pattern
`--proto-*` already established in `frontend/src/index.css` (dark values on bare `:root`, light
values under `.theme-light`). No new build tooling, no Tailwind `@theme` migration, no component
library changes — Dashboard.jsx swaps its inline styles/`proto-*` classes for the new `clay-*`
ones.

**Tech Stack:** React 19, Vite 6, plain CSS custom properties (no Tailwind utility classes used
in this plan — the codebase's existing convention for this styling layer is hand-written CSS
classes, not Tailwind), Lucide icons, react-router-dom `Link`.

## Global Constraints

- No automated test framework exists in `frontend/` (checked: no vitest/jest, no `*.test.*`
  files, `package.json` has no test script). Verification for every task in this plan is manual:
  run `npm run dev` in `frontend/` and check the browser. This is not a shortcut — it matches
  what the design spec itself calls for ("Testing / verification: Visual review only").
- `--clay-primary` (`#8B7CF6` light / `#A594F9` dark) is **never** used as a background under
  white text — it fails WCAG AA (~3.3:1). Only `--clay-primary-deep` (`#6D5BD0` light / `#8B7CF6`
  dark) is used as a solid button background with white text (~5.16:1, passes AA).
- Dark mode shadows are NOT a recolored copy of the light dual-shadow — light uses soft-outer +
  inset-highlight; dark uses glow + hairline (see Task 1's dark token block).
- Every focusable clay element needs a visible `:focus-visible` ring using `--clay-focus-ring` —
  claymorphism's soft edges swallow the browser's default outline.
- Flipping the default theme in Task 3 is a **global** change (confirmed: `ThemeProvider` mounts
  once in `main.jsx:10` wrapping the whole app, and `.theme-light` overrides already exist for
  Landing/Login/Register). New users will see those pages' existing light variant too — this is
  expected, not a bug, per the scope note agreed before this plan was written.

---

### Task 1: Add `--clay-*` design tokens to `index.css`

**Files:**
- Modify: `frontend/src/index.css:1` (font `@import` line)
- Modify: `frontend/src/index.css` (append new token section at end of file, after line 7337)

**Interfaces:**
- Produces: CSS custom properties `--clay-bg`, `--clay-surface`, `--clay-primary`,
  `--clay-primary-deep`, `--clay-accent`, `--clay-success`, `--clay-success-tint`,
  `--clay-danger`, `--clay-danger-tint`, `--clay-text`, `--clay-text-sub`, `--clay-radius-card`,
  `--clay-radius-ctrl`, `--clay-radius-pill`, `--clay-shadow`, `--clay-shadow-press`,
  `--clay-focus-ring`, `--clay-font-head`, `--clay-font-body`. Dark values live on bare `:root`;
  light values live under `.theme-light` (existing app convention — see Global Constraints).
  Task 2 and Task 4 consume these by name.

- [ ] **Step 1: Add Nunito to the Google Fonts import**

Edit line 1 of `frontend/src/index.css`. Current line:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400;1,600&family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
```

Replace with (adds `&family=Nunito:wght@400;700;800;900` before `&display=swap`):

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400;1,600&family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=Nunito:wght@400;700;800;900&display=swap');
```

- [ ] **Step 2: Append the clay token block at the end of `index.css`**

Append this whole block to the very end of the file (after the last line, currently
`.summary-markdown li { margin-bottom: 4px; }`):

```css

/* ============================================================
   CLAYMORPHISM DESIGN TOKENS
   Added: 2026-07-16
   Namespace: --clay-* — parallel to --proto-*, does not replace it.
   Dark values on bare :root, light values under .theme-light —
   matches this file's existing convention (see --proto-* above).
============================================================ */

:root {
  /* Clay palette — dark (bare root) */
  --clay-bg: #211E29;
  --clay-surface: #2B2735;
  --clay-primary: #A594F9;       /* accents, active states, links — NOT a white-text bg */
  --clay-primary-deep: #8B7CF6;  /* button bg w/ white text (AA pass), hover states */
  --clay-accent: #FFB4A2;
  --clay-success: #8FD9B6;
  --clay-success-tint: #24463A;
  --clay-danger: #EF7C6E;
  --clay-danger-tint: #4A2A28;
  --clay-text: #EDEAF2;
  --clay-text-sub: #A6A1B0;

  /* Shape */
  --clay-radius-card: 24px;
  --clay-radius-ctrl: 16px;
  --clay-radius-pill: 999px;

  /* Depth — dark: glow + hairline, not a recolored light shadow */
  --clay-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
  --clay-shadow-press: inset 0 2px 6px rgba(0,0,0,0.4);
  --clay-focus-ring: 0 0 0 3px rgba(165,148,249,0.55);

  /* Type — Noto Sans SC / Noto Sans Tamil are fallback *names* only, no @import.
     Harmless no-op for users without those fonts OS-installed; cheap to keep since
     this is a token (one line to edit later either way), but NOT worth the added
     page weight of actually loading those font files for scripts nothing in this
     app renders today (only ms/en exist — see i18n/translations.js). */
  --clay-font-head: 'Nunito', 'Noto Sans SC', 'Noto Sans Tamil', sans-serif;
  --clay-font-body: 'DM Sans', 'Noto Sans SC', 'Noto Sans Tamil', sans-serif;
}

.theme-light {
  /* Clay palette — light (claymorphism's native mode) */
  --clay-bg: #F5F2FB;
  --clay-surface: #FFFFFF;
  --clay-primary: #8B7CF6;
  --clay-primary-deep: #6D5BD0;
  --clay-accent: #FFB4A2;
  --clay-success: #8FD9B6;
  --clay-success-tint: #E6F6EE;
  --clay-danger: #EF7C6E;
  --clay-danger-tint: #FDECEA;
  --clay-text: #332F3A;
  --clay-text-sub: #635F69;

  /* Depth — light: soft outer shadow + inset highlight */
  --clay-shadow: 6px 6px 16px rgba(139,124,246,0.15), inset -2px -2px 6px rgba(255,255,255,0.6);
  --clay-shadow-press: 3px 3px 8px rgba(139,124,246,0.18) inset;
  --clay-focus-ring: 0 0 0 3px rgba(139,124,246,0.45);
}
```

- [ ] **Step 3: Verify the build has no CSS errors**

Run: `cd frontend && npm run build`
Expected: build completes successfully (exit code 0), no PostCSS/Tailwind parse errors mentioning
`index.css`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "Add clay design tokens (dark root + light override) alongside proto-*"
```

---

### Task 2: Add core clay utility classes

**Files:**
- Modify: `frontend/src/index.css` (append after Task 1's token block)

**Interfaces:**
- Consumes: all `--clay-*` tokens from Task 1.
- Produces: CSS classes `.clay-card`, `.clay-btn`, `.clay-btn-primary`, `.clay-input`,
  `.clay-badge`. Task 4 (Dashboard rebuild) consumes these by name.

- [ ] **Step 1: Append the utility classes**

Append this block to `frontend/src/index.css`, right after the `.theme-light { ... }` block added
in Task 1:

```css

/* ============================================================
   CLAY UTILITY CLASSES
============================================================ */

.clay-card {
  background: var(--clay-surface);
  border-radius: var(--clay-radius-card);
  padding: 1.5rem;
  box-shadow: var(--clay-shadow);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  color: var(--clay-text);
}

.clay-card:hover {
  transform: translateY(-2px);
}

a.clay-card,
.clay-card[role="button"] {
  cursor: pointer;
  text-decoration: none;
}

.clay-card:focus-visible {
  outline: none;
  box-shadow: var(--clay-shadow), var(--clay-focus-ring);
}

.clay-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  border-radius: var(--clay-radius-ctrl);
  border: none;
  font-family: var(--clay-font-body);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
  text-decoration: none;
}

.clay-btn:active {
  transform: scale(0.97);
}

.clay-btn:focus-visible {
  outline: none;
  box-shadow: var(--clay-focus-ring);
}

.clay-btn-primary {
  background: var(--clay-primary-deep);
  color: #FFFFFF;
  box-shadow: var(--clay-shadow);
}

.clay-btn-primary:hover {
  box-shadow: 0 4px 16px rgba(139,124,246,0.35);
}

.clay-btn-ghost {
  background: rgba(255,255,255,0.15);
  color: inherit;
}

.clay-input {
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: var(--clay-radius-ctrl);
  border: none;
  background: var(--clay-surface);
  color: var(--clay-text);
  font-family: var(--clay-font-body);
  font-size: 0.9rem;
  box-shadow: var(--clay-shadow-press);
  transition: box-shadow 0.15s ease;
}

.clay-input:focus-visible {
  outline: none;
  box-shadow: var(--clay-shadow-press), var(--clay-focus-ring);
}

.clay-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--clay-radius-pill);
  background: var(--clay-accent);
  color: var(--clay-text);
  font-size: 0.75rem;
  font-weight: 600;
}
```

- [ ] **Step 2: Verify the build has no CSS errors**

Run: `cd frontend && npm run build`
Expected: build completes successfully (exit code 0).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "Add clay-card, clay-btn, clay-input, clay-badge utility classes"
```

---

### Task 3: Flip the default theme to light

**Files:**
- Modify: `frontend/src/context/ThemeContext.jsx:7`

**Interfaces:**
- Consumes: nothing from Tasks 1/2.
- Produces: new users (no `deeplearner-theme` in `localStorage`) now default to `"light"`
  instead of `"dark"`. Task 4's Dashboard rebuild assumes this is done — it displays correctly
  in both modes, but is designed to be seen in light by default.

- [ ] **Step 1: Change the fallback**

In `frontend/src/context/ThemeContext.jsx`, line 7:

```javascript
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("deeplearner-theme") || "dark";
    });
```

Change to:

```javascript
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("deeplearner-theme") || "light";
    });
```

- [ ] **Step 2: Manually verify in the browser**

Run: `cd frontend && npm run dev`

In the browser: open dev tools → Application/Storage tab → clear `localStorage` for the dev
origin (or use a fresh incognito window) → load the app.

Expected:
- Landing page loads in its existing light variant (this is the known, agreed side effect —
  not a regression).
- Log in → Dashboard loads in light mode without needing to click the theme toggle.
- Click the theme toggle (moon/sun icon) → app switches to dark mode and back, exactly as
  before this change (toggle behavior itself is untouched).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/ThemeContext.jsx
git commit -m "Default new users to light theme (claymorphism's native mode)"
```

---

### Task 4: Rebuild Dashboard using clay tokens/classes

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx` (full rewrite of the JSX return block, lines
  110–333; component logic above it — the `useState`/`useEffect` data-fetching hooks — is
  unchanged)

**Interfaces:**
- Consumes: `.clay-card`, `.clay-btn`, `.clay-btn-primary`, `.clay-btn-ghost`, `.clay-input`,
  `.clay-badge` (Task 2) and `--clay-*` tokens (Task 1).
- Produces: nothing consumed by a later task in this plan — this is the terminal deliverable
  reviewed by the user before Phase 2 (rolling clay out to the rest of the app) is planned.

Note: `Dashboard.jsx` is rendered inside `AppLayout` (`App.jsx:33-51`), which also renders
`<Sidebar>` and `<BackgroundLayer>` — those stay on the existing `--proto-*` dark-capable styling
in this task (out of scope until Phase 2). Expect the prototype review to show a still-`proto-*`
sidebar next to the new clay-styled Dashboard content — that's the intended incremental state,
not a bug.

- [ ] **Step 1: Replace the JSX return block**

In `frontend/src/pages/Dashboard.jsx`, replace everything from line 110
(`return (`) through the closing line 333 (`}`, the component's final closing brace) with:

```jsx
  return (
    <div className="proto-content" style={{ display: "flex", gap: "24px" }}>
      {/* ═══ Main Column ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Search Bar */}
        <div
          className="clay-input"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <Search size={16} style={{ color: "var(--clay-text-sub)" }} />
          <input
            ref={searchRef}
            type="text"
            placeholder={lang === "ms" ? "Cari nota..." : "Search notes..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "var(--clay-text)",
              fontFamily: "var(--clay-font-body)",
            }}
          />
          <span className="clay-badge">⌘K</span>
        </div>

        {/* Welcome Card */}
        <div
          className="clay-card"
          style={{ background: "var(--clay-primary-deep)", color: "#FFFFFF" }}
        >
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", opacity: 0.8, marginBottom: "8px" }}>
            ✦ DEEPLEARNER OS
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--clay-font-head)", marginBottom: "8px", color: "#FFFFFF" }}>
            {t(lang, "dashboard.welcome", { name })}
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "20px", maxWidth: "400px", lineHeight: 1.6 }}>
            {t(lang, "dashboard.subtitle")}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/input" className="clay-btn" style={{ background: "#FFFFFF", color: "var(--clay-primary-deep)" }}>
              <Plus size={16} /> {lang === "ms" ? "Sesi Baharu" : "New Session"}
            </Link>
            <Link to="/history" className="clay-btn clay-btn-ghost" style={{ color: "#FFFFFF" }}>
              <History size={16} /> {lang === "ms" ? "Sejarah" : "History"}
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)", margin: "0 0 4px" }}>
            {t(lang, "dashboard.featuresHeading")}
          </h2>
          <div style={{ fontSize: "12px", color: "var(--clay-text-sub)", marginBottom: "16px" }}>
            {t(lang, "dashboard.featuresSubtitle")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            {features.map((f) => (
              <Link
                key={f.title}
                to={f.path}
                className="clay-card"
                style={{ padding: "16px", textAlign: "center", color: "var(--clay-text)" }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--clay-accent)",
                  color: "var(--clay-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--clay-text)", marginBottom: "4px" }}>{f.title}</div>
                <div style={{ fontSize: "10px", color: "var(--clay-text-sub)" }}>{f.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>
            <Clock size={14} style={{ color: "var(--clay-text-sub)" }} />
            {lang === "ms" ? "Sesi Terkini" : "Recent Sessions"}
          </h2>

          {histLoading ? (
            <div className="clay-card" style={{ padding: "24px", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto" }} />
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="clay-card" style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📭</div>
              <div style={{ fontSize: "13px", color: "var(--clay-text-sub)", marginBottom: "12px" }}>
                {lang === "ms" ? "Belum ada sesi disimpan." : "No saved sessions yet."}
              </div>
              <Link to="/input" style={{ fontSize: "12px", color: "var(--clay-primary-deep)", fontWeight: 600 }}>
                {lang === "ms" ? "Mulakan sekarang →" : "Start now →"}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/summary/${note.idRingkasan}`}
                  className="clay-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    color: "var(--clay-text)",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--clay-text)" }}>
                      {note.tajuk || (lang === "ms" ? "Nota Tanpa Tajuk" : "Untitled Note")}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--clay-text-sub)" }}>
                      {formatDate(note.tarikhSimpan, lang)}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--clay-text-sub)" }} />
                </Link>
              ))}
              <Link to="/history" style={{ fontSize: "12px", color: "var(--clay-primary-deep)", textAlign: "right", marginTop: "4px", fontWeight: 600 }}>
                {lang === "ms" ? "Lihat semua →" : "See all →"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right Stats Sidebar ═══ */}
      <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Nota Disimpan Card */}
        <div className="clay-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "NOTA DISIMPAN" : "SAVED NOTES"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>
            {statsLoading ? "..." : totalNotes}
          </div>
        </div>

        {/* Kuiz Selesai Card */}
        <div className="clay-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "KUIZ SELESAI" : "QUIZZES DONE"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, fontFamily: "var(--clay-font-head)", color: "var(--clay-primary-deep)" }}>
            {statsLoading ? "..." : totalQuizzes}
          </div>
        </div>

        {/* Sesi Hari Ini Card */}
        <div className="clay-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "SESI HARI INI" : "TODAY'S SESSIONS"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>
            {todayCount}
          </div>
        </div>

        {/* Continue Last Session Card */}
        {lastSession && (
          <div className="clay-card">
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "8px", fontWeight: 500 }}>
              {lang === "ms" ? "TERUSKAN SESI" : "CONTINUE SESSION"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--clay-text)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lastSession.tajuk || (lang === "ms" ? "Nota Tanpa Tajuk" : "Untitled Note")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--clay-text-sub)", marginBottom: "12px" }}>
              {formatDate(lastSession.tarikhSimpan, lang)}
            </div>
            <Link
              to={`/summary/${lastSession.idRingkasan}`}
              className="clay-btn clay-btn-primary"
              style={{ width: "100%", fontSize: "12px" }}
            >
              {lang === "ms" ? "Teruskan →" : "Continue →"}
            </Link>
          </div>
        )}

        {/* Tip Belajar Card */}
        <div className="clay-card">
          <div style={{ fontSize: "20px", marginBottom: "8px" }}>💡</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--clay-text)", marginBottom: "8px", fontFamily: "var(--clay-font-head)" }}>
            {lang === "ms" ? "Tip Belajar" : "Study Tip"}
          </div>
          <p style={{ fontSize: "12px", color: "var(--clay-text-sub)", lineHeight: 1.6 }}>
            {lang === "ms"
              ? <>Gunakan <strong style={{ color: "var(--clay-text)" }}>"Ringkasan Automatik"</strong> selepas merakam kuliah untuk mendapatkan poin utama dengan pantas.</>
              : <>Use <strong style={{ color: "var(--clay-text)" }}>"Auto Summary"</strong> after recording a lecture to instantly extract key points.</>
            }
          </p>
        </div>
      </div>
    </div>
  );
}
```

This also fixes a pre-existing accessibility gap while touching this markup: the features grid
and recent-notes list were `<div onClick>` (not keyboard-focusable, no semantic role); they're
now `<Link>` elements, which are natively focusable and already navigate to `f.path` /
`/summary/:id` exactly as the old `onClick`/wrapping `<Link>` did — same behavior, properly
accessible for free.

- [ ] **Step 2: Manually verify in the browser**

Run: `cd frontend && npm run dev`, log in, navigate to `/app` (Dashboard).

Check, in light mode (default after Task 3):
- Welcome card, feature tiles, recent-sessions list, and the three stat cards all render with
  the clay look (rounded corners, soft dual shadow, no hard borders).
- Search bar accepts input and `⌘K`/`Ctrl+K` focuses it (existing behavior, unchanged logic).
- Tab through the page with keyboard only — feature tiles and recent-session links show the
  visible focus ring (`--clay-focus-ring`) and are reachable in visual order.
- If you have saved notes: recent sessions list populates and links to `/summary/:id` work.
- If you have none: empty state ("No saved sessions yet") renders and its link works.
- Text contrast is readable — nothing gray-on-gray.

Then toggle to dark mode (theme toggle in the sidebar) and repeat the same checks — dark should
use the glow+hairline shadow (visibly different from light's soft-outer/inset-highlight), not a
flat recolor.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "Rebuild Dashboard with clay design tokens/classes"
```

---

## Handoff

Once Task 4 is verified and committed, **stop** — do not continue to InputPage, AudioInput,
Transcript, Summary, Quiz, History, or the shared Navbar/Sidebar/TopHeader. Per the design spec,
those are a separate rollout phase that starts only after the Dashboard prototype is reviewed and
approved by the user running it locally. Report back with what to check locally; the next phase
gets its own plan once feedback on this one is in.
