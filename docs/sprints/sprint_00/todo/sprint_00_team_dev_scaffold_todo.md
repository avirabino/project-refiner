# sprint_00 — Team DEV Todo: Scaffold + Unit Tests

**Owner:** `[DEV:scaffold]`
**Module path:** All `src/` modules (initial scaffold)

## Sprint goals (DEV)

- Stand up the complete Chrome Extension build pipeline
- Create hello-world entry points for all 3 execution contexts (background, content, popup)
- Deliver a buildable, loadable extension with React popup + content script injection
- Wire shared types and message protocol stubs
- Set up Vitest config and write first unit tests for `src/shared/`

## Tasks

### Phase 1: Project Config

| ID | Task | Acceptance criteria | Files | Status |
|---|---|---|---|---|
| D001 | Create `package.json` | All deps installed. Scripts: `dev`, `build`, `test`, `test:watch`, `test:e2e`, `test:all`, `test:coverage`, `lint`, `type-check` | `package.json` | ☑ Done |
| D002 | Create `tsconfig.json` | Strict mode, path aliases for `@shared/`, `@core/`, etc. JSX: react-jsx | `tsconfig.json` | ☑ Done |
| D003 | Create `vite.config.ts` with CRXJS | CRXJS plugin, React plugin, resolve aliases, build → `dist/` | `vite.config.ts` | ☑ Done |
| D004 | Create `manifest.json` | MV3, permissions: activeTab, storage, tabs, alarms, downloads. Host permissions: localhost, synaptixlabs | `manifest.json` | ☑ Done |
| D005 | Create Tailwind + PostCSS config | Tailwind v3, content paths for `src/**/*.{ts,tsx}` | `tailwind.config.ts`, `postcss.config.js` | ☑ Done |
| D006 | Create ESLint + Prettier | TypeScript parser, React plugin, Prettier integration | `.eslintrc.cjs`, `.prettierrc` | ☑ Done |

### Phase 2: Source Entry Points

| ID | Task | Acceptance criteria | Files | Status |
|---|---|---|---|---|
| D007 | Create `src/shared/types.ts` | Session, Bug, Feature, Action, MessageType enums — stubs with JSDoc | `src/shared/types.ts` | ☑ Done |
| D008 | Create `src/shared/constants.ts` | SESSION_ID_FORMAT, SELECTOR_PRIORITIES, LIMITS, DEFAULT_VALUES | `src/shared/constants.ts` | ☑ Done |
| D009 | Create `src/shared/messages.ts` | Message types for popup↔bg↔content. Type-safe sendMessage helpers | `src/shared/messages.ts` | ☑ Done |
| D010 | Create `src/shared/utils.ts` | generateSessionId(), formatTimestamp(), generateBugId() | `src/shared/utils.ts` | ☑ Done |
| D010b | Create `src/shared/index.ts` | Barrel export: re-export all types, constants, messages, utils. Required by shared AGENTS.md | `src/shared/index.ts` | ☑ Done |
| D011 | Create `src/background/service-worker.ts` | Listens for messages, logs to console, responds with ack. Keep-alive placeholder | `src/background/service-worker.ts` | ☑ Done |
| D012 | Create `src/content/content-script.ts` | Injects into page, logs "Refine content script loaded" + current URL | `src/content/content-script.ts` | ☑ Done |
| D013 | Create `src/popup/popup.html` | HTML shell, React mount point, Tailwind import | `src/popup/popup.html` | ☑ Done |
| D014 | Create `src/popup/index.tsx` + `App.tsx` | React 18 createRoot, renders "SynaptixLabs Refine" title + version + "No sessions yet" | `src/popup/index.tsx`, `src/popup/App.tsx` | ☑ Done |

### Phase 3: Unit Test Infrastructure + First Tests (DEV owns unit tests)

| ID | Task | Acceptance criteria | Files | Status |
|---|---|---|---|---|
| D015 | Create `vitest.config.ts` | Resolve aliases match tsconfig. Environment: jsdom. Coverage provider: v8. Include `tests/unit/**`, `tests/integration/**` | `vitest.config.ts` | ☑ Done |
| D016 | Unit tests: `shared/constants.ts` | Verify SESSION_ID_FORMAT regex, SELECTOR_PRIORITIES order, all constants exported | `tests/unit/shared/constants.test.ts` | ☑ Done |
| D017 | Unit tests: `shared/utils.ts` | Test generateSessionId() format, formatTimestamp() output, generateBugId() uniqueness | `tests/unit/shared/utils.test.ts` | ☑ Done |

### Phase 4: Verification

| ID | Task | Acceptance criteria | Files | Status |
|---|---|---|---|---|
| D018 | Verify full build + load | `npm run build` → load in Chrome → popup works → content script injects → service worker runs | All | ☑ Done |
| D018-BUG | **[QA FLAG → FIXED]** Icon files were 0-byte | Added valid 1×1 PNG placeholders to `public/icons/`. Build now copies 0.07kB files. Chrome shows default icon (cosmetic — Sprint 01 to add branded icons). | `public/icons/*.png` | ☑ Fixed |
| D019 | Verify all unit tests pass | `npx vitest run` → green. Coverage ≥ 80% for `src/shared/` | All | ☑ Done |

## Dependency install list

```bash
# Core
npm install react react-dom rrweb dexie lucide-react

# Dev
npm install -D typescript vite @crxjs/vite-plugin@beta @vitejs/plugin-react \
  @types/react @types/react-dom @types/chrome \
  tailwindcss postcss autoprefixer \
  vitest @vitest/coverage-v8 fake-indexeddb \
  @playwright/test \
  eslint prettier eslint-config-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

> **Note:** `@crxjs/vite-plugin@beta` needed for Vite 5+ compatibility. If issues arise, pin Vite to 5.x.
> `fake-indexeddb` is for unit-testing Dexie storage in later sprints.

## npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Unit test directory structure

```
tests/unit/
├── shared/
│   ├── constants.test.ts   ← Sprint 00
│   └── utils.test.ts       ← Sprint 00
├── core/                    ← Sprint 01+
├── background/              ← Sprint 01+
├── content/                 ← Sprint 01+
└── popup/                   ← Sprint 01+
```

## Definition of Done (DEV)

- `npm run build` succeeds without errors
- Extension loads in Chrome without console errors
- Popup shows Refine branding
- Content script logs to console on page load
- Service worker responds to test message
- `npx vitest run` — all unit tests pass
- `npx tsc --noEmit` clean
- `npx eslint src/` clean
- Coverage ≥ 80% for `src/shared/`

## Risks / blockers

- CRXJS + Vite 6 compatibility — fallback to Vite 5.4.x if needed
- rrweb v2 + bundler compatibility — may need specific import config
- Shadow DOM React mounting — verify works in content script context

