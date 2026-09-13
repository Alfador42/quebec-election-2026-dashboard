# Québec 2026 polling intelligence

A local-first, auditable polling foundation: **discovery → evidence → normalization/review → average → dashboard**.

This is a foundation preview with **partial historical coverage**, not a complete live election product. It contains verified primary-source observations, immutable source captures, explicit candidate review, a transparent versioned average and a React dashboard. No synthetic polling numbers are used in the dashboard. January–September source reconciliation is in progress.

```sh
npm ci
npm test
npm run rebuild
npm run dev
```

Open the local Vite URL shown in the terminal. `npm run build` produces dist; `npm run update` performs bounded source discovery and recalculation. Node 24+ required. The dashboard reads public/data/dashboard.json, which is generated from canonical data/state.json and configuration. The model preserves individual weights and revision IDs.

Read [architecture](docs/architecture.md), [source audit](docs/source-audit.md), and [operations](docs/operations.md) before changing data or enabling another scheduler. Daily local Codex updates are scheduled; GitHub Actions configuration is ready but has no remote repository to run on yet. New report formats and ambiguous releases are reviewed before acceptance. Automated network updates stop after October 5, 2026, Toronto time.

The model is descriptive, neutral, and not a seat projection or election forecast. Raw publisher documents are retained locally for audit, with original rights intact; link to sources when sharing the dashboard.

## Desktop application

See [Windows desktop instructions](docs/desktop.md). Open desktop-app/Quebec-2026-Dashboard.exe for the native application window.

