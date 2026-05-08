# Node Modules Patches (Node 22 + Vite 6 + ESM/CJS)

These patches fix ESM/CJS interop bugs when running Vite 6.x on Node 22.
They live in `node_modules/` and **will be wiped by `npm install`** — reapply after every install.

> **Environment**: Node 22 (Homebrew), Vite ^6.4.1, @vitejs/plugin-react-swc, @tailwindcss/postcss

---

## Patch 1: postcss — `Parser is not a constructor`

**File:** `node_modules/postcss/lib/parse.js`

**Problem:** Vite's HMR re-evaluates PostCSS through Node's CJS→ESM bridge, corrupting the CJS module cache. `require('./parser')` returns an ESM namespace object `{ default: [class Parser] }` instead of the class itself.

**Fix:** Replace the original line 5:
```js
// BEFORE (original):
let Parser = require('./parser')

// AFTER (patched):
let _Parser = require('./parser')
let Parser = typeof _Parser === 'function' ? _Parser : _Parser.default
```

---

## Patch 2: enhanced-resolve — frozen lazy getter crash

**File:** `node_modules/enhanced-resolve/esm-index.mjs` (CREATE this file)

**Problem:** enhanced-resolve uses lazy getters on a frozen CJS exports object. Node 22's ESM namespace proxy triggers these getters in a way that crashes.

**Fix:** Create `node_modules/enhanced-resolve/esm-index.mjs` with:
```js
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const enhanced = _require('./lib/index.js');

const _sync = enhanced.sync;
const _create = enhanced.create;
const _ResolverFactory = enhanced.ResolverFactory;
const _CachedInputFileSystem = enhanced.CachedInputFileSystem;
const _CloneBasenamePlugin = enhanced.CloneBasenamePlugin;
const _LogInfoPlugin = enhanced.LogInfoPlugin;
const _TsconfigPathsPlugin = enhanced.TsconfigPathsPlugin;
const _forEachBail = enhanced.forEachBail;

export default enhanced;
export {
  _sync as sync,
  _create as create,
  _ResolverFactory as ResolverFactory,
  _CachedInputFileSystem as CachedInputFileSystem,
  _CloneBasenamePlugin as CloneBasenamePlugin,
  _LogInfoPlugin as LogInfoPlugin,
  _TsconfigPathsPlugin as TsconfigPathsPlugin,
  _forEachBail as forEachBail,
};
```

**Also edit** `node_modules/enhanced-resolve/package.json` — add an `exports` field:
```json
"exports": {
  ".": {
    "import": "./esm-index.mjs",
    "require": "./lib/index.js",
    "default": "./lib/index.js"
  }
},
```

---

## Quick reapply script

```bash
cd frontend

# Patch 1: postcss/lib/parse.js
sed -i '' "s/^let Parser = require('.\/parser')/let _Parser = require('.\/parser')\nlet Parser = typeof _Parser === 'function' ? _Parser : _Parser.default/" node_modules/postcss/lib/parse.js

# Patch 2: enhanced-resolve — just check if esm-index.mjs exists
if [ ! -f node_modules/enhanced-resolve/esm-index.mjs ]; then
  echo "WARNING: enhanced-resolve/esm-index.mjs is missing — copy from PATCHES.md"
fi
```

---

## Why not use patch-package?

These are dev-only workarounds for a Node 22 + Vite 6 edge case. Once Node or these packages ship fixes upstream, the patches should be removed entirely.
