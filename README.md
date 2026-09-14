# Québec 2026 polling intelligence

## Download the Windows app

[Download Windows x64 preview](https://github.com/Alfador42/quebec-election-2026-dashboard/releases/download/v0.1.0-preview.1/Quebec-2026-Dashboard-Windows-x64.zip) · [All releases](https://github.com/Alfador42/quebec-election-2026-dashboard/releases)

1. Download and extract the ZIP completely.
2. Open `Quebec-2026-Dashboard/desktop-app/Quebec-2026-Dashboard.exe`.
3. Keep the included `data`, `config`, and `public` folders together with the app.

No Node installation or external browser is required to run the Windows app. Use the **Background** selector for Light, Dark or Warm paper. The app includes a raised donut chart, historical trends, source details and calculation weights.

**Preview release:** the bundled dataset is dated September 13, 2026, with 11 verified polls and partial coverage. This download is an offline snapshot; it does not automatically fetch future GitHub datasets or run the maintainer’s local collection automation. The interface picks up changes when its local dataset is updated.

## Project

A local-first, auditable polling foundation: **discovery → evidence → normalization/review → average → dashboard**.

This is a foundation preview with **partial historical coverage**, not a complete live election product. It contains verified primary-source observations, immutable source captures, explicit candidate review, a transparent versioned average and a React dashboard. No synthetic polling numbers are used in the dashboard. January–September source reconciliation is in progress.

```sh
npm ci
npm test
npm run rebuild
npm run dev
```

Open the local Vite URL shown in the terminal. `npm run build` produces dist; `npm run update` performs bounded source discovery and recalculation. Node 24+ required. The dashboard reads public/data/dashboard.json, which is generated from canonical data/state.json and configuration. The model preserves individual weights and revision IDs.

Read [architecture](docs/architecture.md), [source audit](docs/source-audit.md), and [operations](docs/operations.md) before changing data or enabling another scheduler. The maintainer’s local daily updater is currently authoritative. The hosted polling workflow is gated behind the repository variable `ENABLE_HOSTED_UPDATES=true`; keep it disabled until data-writer synchronization is configured. Offline CI runs on pushes and pull requests. New report formats and ambiguous releases are reviewed before acceptance. Automated network updates stop after October 5, 2026, Toronto time.

The model is descriptive, neutral, and not a seat projection or election forecast. Raw publisher documents are retained locally for audit, with original rights intact; link to sources when sharing the dashboard.

## Desktop application

See [Windows desktop instructions](docs/desktop.md). Open desktop-app/Quebec-2026-Dashboard.exe for the native application window.


## Source rights

Polling reports and other third-party evidence retain their original publishers’ rights. Their inclusion for provenance does not grant a license to reuse their text, graphics, or branding. This project is independent of the pollsters and political parties.
