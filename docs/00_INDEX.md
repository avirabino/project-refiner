# SynaptixLabs Vigil — Docs Index

This is the **source of truth** for how Vigil is specified, built, tested, and shipped.

---

## Reading Order

1. `00_INDEX.md` (this file — orientation)
2. `0k_PRD.md` — what we're building + why
3. `01_ARCHITECTURE.md` — how it fits together (Sprint 06 platform architecture)
4. `03_MODULES.md` — what each module owns (check before building anything)
5. `04_TESTING.md` — testing policy + gates
6. `05_DEPLOYMENT.md` — how we ship
7. `0l_DECISIONS.md` — why we made key calls

---

## Quick Links

| Doc | What it's for | Owner |
|---|---|---|
| [PRD](0k_PRD.md) | Product requirements + acceptance criteria | `[CPO]` |
| [Architecture](01_ARCHITECTURE.md) | System design — extension + server + dashboard + AGENTS | `[CTO]` |
| [Setup](02_SETUP.md) | Dev setup + build pipeline | `[CTO]` |
| [Modules](03_MODULES.md) | Module registry + ownership | `[CTO]` |
| [Testing](04_TESTING.md) | Testing policy + gates | `[CTO]` |
| [Deployment](05_DEPLOYMENT.md) | Extension + server distribution | `[CTO]` |
| [Decisions](0l_DECISIONS.md) | Architecture decision log | `[CTO]` / `[CPO]` |

---

## Current Sprint

**Sprint 06 — Active 🟢**
- Index: `sprints/sprint_06/sprint_06_index.md`
- Dev kickoff: `sprints/sprint_06/todo/sprint_06_kickoff_dev.md`
- QA kickoff: `sprints/sprint_06/todo/sprint_06_kickoff_qa.md`
- Decisions: `sprints/sprint_06/sprint_06_decisions_log.md`

**Sprint 07 — Planned 📐**
- Index: `sprints/sprint_07/sprint_07_index.md`
- Decisions: `sprints/sprint_07/sprint_07_decisions_log.md`

---

## Directory Map

```
docs/
├── 00_INDEX.md              # This file
├── 0k_PRD.md                # Product requirements (CPO owns)
├── 0l_DECISIONS.md          # Decision log (CTO/FOUNDER own)
├── 01_ARCHITECTURE.md       # System architecture (Sprint 06 — CTO owns)
├── 02_SETUP.md              # Dev setup + commands
├── 03_MODULES.md            # Module registry
├── 04_TESTING.md            # Testing strategy
├── 05_DEPLOYMENT.md         # Distribution + deploy
├── knowledge/
│   └── 00_DISCUSSION_SUMMARY.md  # Background context
├── sprints/
│   ├── README.md
│   ├── backlog/             # Deferred items
│   ├── sprint_00/ … sprint_05/   # ARCHIVED
│   ├── sprint_06/           # ACTIVE
│   │   ├── sprint_06_index.md
│   │   ├── sprint_06_decisions_log.md
│   │   ├── todo/
│   │   │   ├── sprint_06_kickoff_dev.md
│   │   │   └── sprint_06_kickoff_qa.md
│   │   ├── reports/
│   │   └── reviews/
│   └── sprint_07/           # PLANNED
│       ├── sprint_07_index.md
│       └── sprint_07_decisions_log.md
├── templates/               # Sprint artifact templates
└── ui/                      # UI reference assets
```

---

## Agent Notes

- **Always read `01_ARCHITECTURE.md` before writing any code** — it defines the Sprint 06 architecture (extension + vigil-server + AGENTS)
- **Always read `03_MODULES.md` before building** — reuse before building new
- **Bug/Feature files** live in `sprints/sprint_XX/BUGS/` and `sprints/sprint_XX/FEATURES/` — not in docs/ root
- **Decision log** is in two places: `docs/0l_DECISIONS.md` (high-level) + `sprints/sprint_XX/sprint_XX_decisions_log.md` (sprint-specific)

---

*Last updated: 2026-02-26 | Owner: [CTO] + [FOUNDER]*
