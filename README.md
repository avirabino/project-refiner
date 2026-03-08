# SynaptixLabs Workspace

> Workspace-level repository for SynaptixLabs projects.
> Each project in this folder has its own git repository.

## What this repo tracks

This is the **workspace operating system** — it contains shared conventions, agent configurations, and the project registry. It does NOT contain project code (each project is an independent git repo).

## Project Registry

| Project | Status | Purpose |
|---|---|---|
| [Papyrus](./Papyrus) | 🟢 Active | AI-powered academic publishing platform |
| [project-refiner](./project-refiner) | 🟡 Paused | Chrome extension for acceptance test recording |
| [happyseniors](./happyseniors) | 🟢 Active | Client workspace — HappySeniors platform |
| [nightingale](./nightingale) | 🟢 Active | SynaptixLabs Agents platform |
| [_platform/synaptix-sdk](./_platform/synaptix-sdk) | 🔧 Platform | Shared infrastructure packages |
| [_platform/synaptix-scaffold](./_platform/synaptix-scaffold) | 📐 Template | Project creation scaffold |
| [_platform/youtube-api](./_platform/youtube-api) | 🔧 Tool | Shared YouTube utility |
| [website](./website) | 🟡 Active | SynaptixLabs marketing site |

## About SynaptixLabs

SynaptixLabs is a product-led AI startup building agentic AI systems, platforms, and tools.

- **Website:** https://synaptixlabs.ai
- **Products:** Papyrus, Nightingale Agents

## Internal Documentation

See [CODEX.md](./CODEX.md) for internal workspace handbook (dev team + AI agents).


## GCP Migration (Active)

SynaptixLabs has $25K in Google Cloud credits (GFS Ecosystem Partner, valid through Feb 2028).
All projects are migrating to Google Cloud services (Gemini, Cloud Run, Vertex AI).

**Migration plan:** See [`agents/project_management/docs/19_GCP_MIGRATION_PLAN.md`](./agents/project_management/docs/19_GCP_MIGRATION_PLAN.md)

| Project | Primary GCP Services | Phase |
|---------|---------------------|-------|
| AGENTS (Nightingale) | Gemini 3.1 Pro, Flash, Cloud Run, Vertex Embeddings | Active (Sprint 10a) |
| Papyrus | Cloud Run, Gemini Flash Image, Translation | Q2 2026 |
| HappySeniors | Speech-to-Text, Text-to-Speech, Maps | Q2-Q3 2026 |
| Showroom | Text-to-Speech, Veo | Q2-Q3 2026 |


## Synaptix Credits Economy (SXC) (Active)

Unified billing unit across all SynaptixLabs products. KeyVault manages API keys,
vendor credentials, BYOK, and usage tracking from a shared Neon PostgreSQL schema.

**Spec:** See [`agents/project_management/docs/20_TOKEN_KEY_INFRASTRUCTURE.md`](./agents/project_management/docs/20_TOKEN_KEY_INFRASTRUCTURE.md)

| Layer | What | Status |
|-------|------|--------|
| Synaptix Credits (SXC) | Universal billing unit ($0.001 × 1.3x markup) | ✅ Implemented in AGENTS |
| KeyVault | Shared DB for keys, users, apps, vendor credentials | 📋 Sprint 10a |
| BYOK | Users bring own vendor API keys (no SXC charge) | 📋 Sprint 11 |
| Website portal | Dashboard, key mgmt, billing UI at synaptixlabs.ai | 📋 Sprint 12 |
| Railway → Cloud Run | All backends migrate to GCP (covered by credits) | 📋 Sprint 12 |


## Platform Consolidation (Active — March 2026)

**All SynaptixLabs products are becoming AGENTS platform customers.**
No product calls LLM providers directly — every LLM interaction routes through Nightingale AGENTS.

**Full plan:** See [`agents/project_management/docs/21_PLATFORM_CONSOLIDATION.md`](./agents/project_management/docs/21_PLATFORM_CONSOLIDATION.md)

| Phase | What | Timeline |
|-------|------|----------|
| 0 | Consolidate all Google API keys to SynaptixLabs GCP ($25K credits) | NOW |
| 1 | KeyVault core in AGENTS (key mgmt, auto-provisioning) | Sprint 10a (Mar) |
| 2 | First customer: HappySeniors migrates to AGENTS API | Sprint 11 (Apr) |
| 3 | Vigil + Showroom migrate | Sprint 11-12 (Apr-May) |
| 4 | Website token portal (dashboard, BYOK, billing UI) | Sprint 12 (May) |
| 5 | Railway/Vercel → Cloud Run (all services) | Sprint 12 (May) |
