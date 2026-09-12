# Operations

## Local commands

Requires Node 24 and npm. Run `npm ci`, then:

```sh
npm test
npm run update
npm run build
npm run dev
```

`npm run update` checks registered public sources and preserves evidence, health and discovery leads. It does **not** certify arbitrary pages as polls. Unknown formats remain discovery/review work. The daily Codex task performs source verification and reviewed ingestion; the standalone GitHub workflow presently handles discovery, submitted candidates, recalculation and build, not autonomous interpretation of every PDF format.

`npm run rebuild -- --as-of 2026-09-12` deterministically reconstructs daily history from January 1 through that date (capped at election day). This is a retrospective, publication-eligible history. Display data and full contribution weights are in public/data/dashboard.json. The canonical accepted records and revisions are in data/state.json. Never hand-edit the generated dashboard file or overwrite a previous accepted revision.

## Evidence and extraction

```sh
node pipeline/cli.mjs capture leger https://leger360.com/KNOWN-REPORT-URL
node pipeline/research.mjs inspect data/evidence/HASH.pdf
node pipeline/render-evidence.mjs data/evidence/HASH.pdf 7
node pipeline/cli.mjs ingest path/to/extracted-poll.json
npm run review
```

Archive URLs only on approved registry hosts. The fetcher respects robots, validates redirects, bounds bytes/time and spaces requests. Unknown domains are review leads. Do not work around a source's access restrictions. Capture missing metadata as null, or a precisely worded unknown note; do not guess based on an aggregator's row date, latest firm metadata, PDF filename or historical comparison column.

Parsers in pipeline/parsers.mjs select explicit Léger total-decided or Pallas decided-and-leaning tables; they return candidates and fail when headers or rows change. They never decide that a PDF was publicly available on its cover date. Source publication dates require dated primary release evidence. All-respondent bases, hypothetical leaders and regional columns are separate measurements. Original PDF bytes and extracted text remain available for visual checks.

The initial bootstrap is reproducible with `node pipeline/bootstrap.mjs` after the archived PDFs' text has been generated. It reconstructs only the explicitly inspected first-session records, checks evidence hashes and passes them through the same ingestion engine. Synthetic fixtures under tests/fixtures must never be imported into production.

## Acceptance and corrections

```sh
node pipeline/cli.mjs ingest data/inbox/release.json --accept --reviewer "Reviewer name" --reason "Verified pages and date; explain ambiguity resolution"
node pipeline/cli.mjs review REVIEW_ID --action distinct --reviewer "Reviewer name" --reason "Verified as a separate polling event"
node pipeline/cli.mjs review REVIEW_ID --action revision --event EVENT_ID --reviewer "Reviewer name" --reason "Corrected publisher table; original retained"
node pipeline/cli.mjs review REVIEW_ID --action reject --reviewer "Reviewer name" --reason "Not a provincial voting-intention poll"
npm run rebuild
npm run build
```

Exact duplicates add provenance without adding another event. Conflicting and overlapping candidates are held even with --accept. A revision must target an existing event explicitly. Invalid candidates cannot be approved: submit a corrected extraction and reject the invalid submission with a reason. Source-byte change notices need comparison with the current accepted table; page navigation or advertisements changing is not a numerical correction. Do not erase unresolved notices to make health look green.

## Daily automation

A local Codex heartbeat named **Québec 2026 daily polling update** is active for 08:15 America/Toronto. It runs in this task's project and is instructed to check sources, verify new releases, ingest safely, rebuild, and continue the historical backlog. It stays quiet unless meaningful data changes, failures or required user action occur. It depends on the local host/app being available. It pauses after October 5; every network CLI also freezes from October 6 Toronto time. No election-night ingestion is implemented.

The GitHub Actions workflow is committed as configuration only until a GitHub remote is chosen and this project is pushed to its default branch. It runs at 10:23 UTC daily, includes October 5, and exits without updating polling files after election day. GitHub may delay schedules. Configure Actions read/write repository permission for the bot data commit. No cloud credentials or paid API is needed. A workflow can build a static artifact without publishing; hosting is not activated in this milestone.

Do not operate both local and GitHub writers against divergent copies of canonical data. When migrating to GitHub, make the hosted checkout authoritative and pause the local writer, or make it fetch/rebase and publish reviewed PRs instead of writing an independent copy. Branch protection may require a PR-based publishing step.

## Failure recovery

Each source error is isolated. Existing verified events survive HTTP errors, malformed pages, parser failures and partial discovery runs. Data files are replaced atomically; an exclusive data/.update.lock prevents concurrent local commands. If a process crashes, verify the recorded PID is no longer running before removing the stale lock. Evidence files are immutable and content addressed. Re-running does not create duplicate polls. Retrieval timestamps and run logs legitimately change; unchanged historical calculation values do not.

Inspect Source health in the UI and data/state.json. Failed checks retain the preceding successful-check timestamp. A successful fetch is not a successful new data acceptance. Recovery from an accepted error uses an explicit revision, not deleting history. Retain canonical state and evidence together when backing up or migrating. Raw source documents retain their publishers' rights; public deployment should expose source links and extracted factual data, not bulk republish full reports without checking permissions.

## Remaining production work

Finish historical reconciliation, expand tested extraction templates, quantify source coverage, add conditional HTTP requests and durable crawl-delay scheduling, refine evidence-level freshness for mixed primary/secondary sources, select a hosted repository and deploy the static build. The UI intentionally labels coverage partial. Review source restrictions before enabling unresolved publishers. A clean build alone does not establish polling completeness.
