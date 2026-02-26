# dashboard — Module Agent Constitution (Tier-3)

> **Scope:** `packages/dashboard/` only
> **Tier:** 3 (module-scoped). Extends `../../AGENTS.md` (Tier-2).
> **Role:** `[DEV:dashboard]` — invoke `@role_server_dev`

---

## Module Identity

| Field | Value |
|---|---|
| Module | dashboard |
| Path | `packages/dashboard/` |
| Tag | `[DEV:dashboard]` |
| Role instance | `@role_server_dev` |
| Stack | React 18 · Vite · TypeScript · Tailwind |
| Served at | `localhost:7474/dashboard` (via vigil-server static) |
| Build output | `packages/server/public/` |

---

## This Module Owns

```
packages/dashboard/src/
├── App.tsx                # Root component
├── views/
│   ├── BugList.tsx        # Sprint selector + bug table
│   └── FeatureList.tsx    # Feature tracking view
└── components/            # Shared UI components

packages/dashboard/dist/   # Build output → copied to packages/server/public/
```

---

## data-testid Contract (QA owns — DEV must implement)

All interactive elements require `data-testid`. Current required set:

| Component | Required testid |
|---|---|
| Dashboard root | `dashboard-root` |
| Bug list table | `bug-list-table` |
| Feature list table | `feature-list-table` |
| Sprint selector | `sprint-selector` |
| Bug row | `bug-row-{BUG-ID}` |
| Severity badge | `severity-badge-{BUG-ID}` |
| Server health indicator | `server-health-status` |

---

## Key Constraints

- Data via REST only: `fetch('http://localhost:7474/api/*')` — no direct filesystem access
- No auth in Sprint 06 — localhost only
- Build must output to `packages/server/public/` for vigil-server to serve
- All interactive elements must have `data-testid` before QA can write specs
- No external API calls — all data from vigil-server

---

## What You MAY Do Without Asking

- Implement inside `packages/dashboard/src/`
- Create/extend components and views
- Add REST calls to `localhost:7474/api/*`
- Update `packages/dashboard/package.json` for UI dependencies (Tailwind, icons, etc.)
- Create tests under `tests/unit/dashboard/`
- Update sprint artifacts: `docs/sprints/**`

## What Requires Escalation → `[CTO]`

- Adding calls to any endpoint other than `:7474/api/*`
- Changing the build output path from `packages/server/public/`
- Adding a state management library (Zustand, Redux, etc.) — FLAG first

---

## Reading Order

1. `../../AGENTS.md` (Tier-2)
2. `../../CLAUDE.md`
3. `../../docs/01_ARCHITECTURE.md`
4. `../../docs/sprints/sprint_06/sprint_06_index.md` → Track C
5. `../../docs/sprints/sprint_06/todo/sprint_06_kickoff_dev.md`

---

*Last updated: 2026-02-26 | Owner: [DEV:dashboard] + [CTO]*
