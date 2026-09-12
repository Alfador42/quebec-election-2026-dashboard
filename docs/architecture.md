# Québec 2026 polling foundation — ADR 001

Decision date: 2026-09-12. Status: accepted for the first local implementation.

## Calendar and environment

Élections Québec's [27 August announcement](https://www.electionsquebec.qc.ca/communiques/elections-provinciales-de-2026-un-scrutin-aura-lieu-le-5-octobre/) confirms a campaign beginning 2026-08-27 and polling day 2026-10-05. All business dates use America/Toronto; timestamps use UTC. October 5 is included. Automatic network updates stop when the Toronto calendar date exceeds October 5; offline historical builds remain possible.

The workspace starts as an empty Git repository, without a remote. Node 24.14.1, npm 11.11.0, Git and ripgrep are installed. Python is not on PATH. Choose Node ESM for the data pipeline, runtime validation, Node's offline test runner, React/TypeScript with Vite for a static dashboard. This avoids a second language runtime, server database, accounts, paid APIs and deployment coupling. The first session is a local data-platform foundation; hosting is a later milestone.

## Boundaries and canonical storage

Discovery -> immutable retrieved evidence -> extracted submissions -> validated poll revisions -> deterministic aggregate artifacts -> static React UI.

JSON files under data are canonical and portable. data/evidence stores content-addressed source bytes and retrieval metadata; data/submissions stores original extracted claims; data/state.json stores events, revisions, provenance links and review items. Updates are written atomically, under an exclusive process lock. Rebuilds read canonical state, never scrape from the browser. Generated series contain the dataset hash and full methodology parameters. Git provides another audit layer, not the only revision mechanism.

## Poll schema

Each event has a deterministic ID, canonical pollster ID, original pollster name, sponsor (nullable), jurisdiction, firstDiscoveredAt, lastVerifiedAt, activeRevisionId and sources. Revisions retain publication date, fieldStart, fieldEnd, calculated midpoint (fractional days allowed), sampleSize, mode, population, basis (all / decided / decided-leaning / unknown), marginOfError {value, confidence, applicability, note}, undecided, notes, extraction {method, version, locator}, question wording and scenario (actual / hypothetical / unknown). Unknown is null, never zero.

Each result block has questionType, geography {level, label, definition}, dimensions, baseN, basis and reportedValues. Normalized values map aliases to centrally registered party IDs without changing percentages. Geography definitions remain pollster-specific. Provincial averages require an actual provincial voting-intention block with no demographic dimensions. Referendum questions, federal questions, regional subsamples and hypothetical leadership scenarios are categorically excluded.

Original numeric strings and normalized values coexist. No residual Other, no rescaling rounded totals to 100, no guessing missing dates or bases. Regional/demographic blocks can be retained without entering the MVP average. New party names create review items until explicitly registered.

## Sources and evidence

config/sources.json records ID, publisher, role, URLs, approved hosts, adapter, enabled state and operational notes. A fetch records URL, final URL, timestamp, HTTP status, SHA-256, MIME type and byte length. Every claim links to evidence hash and source location (page/table/paragraph). HTML is parsed as inert text; PDF JavaScript is never executed. Conservative robots handling, per-host spacing, timeouts, response size limits, redirect validation and HTTPS host allowlists bound retrieval. Unknown external links go to source-candidate review, not unrestricted fetching.

Discovery adapters enumerate configured feeds/pages and relevant links. A new URL is a lead, not a verified poll. Unknown structures go to review. Secondary lists provide historical inventory and new-firm leads; their values never automatically override a primary release. Source errors update health but do not delete accepted data. A successful fetch is distinct from a successfully verified poll update.

## Identity, duplicates and corrections

Pollster aliases are normalized first. Identity seed: pollster + jurisdiction + field start/end + sample size. Exact identity with equal substantive claims adds provenance only. Sponsor disagreement, different values, basis, mode, population or question produces a conflict review item. Same pollster with overlapping fields, nearby publication dates or the same URL but changed identity becomes a possible duplicate/revision, never an automatic second accepted event. Sponsor/publication/value fingerprints supply supporting evidence rather than fragile primary IDs.

Corrections create immutable revisions with a reason, reviewer and superseded revision ID. A conflict preserves the last accepted revision until reviewed and displays a warning. Review decisions are explicit CLI operations. Changed release bytes always reopen review unless the extracted substantive claim is unchanged. Source preference is primary pollster report, then commissioner release, then secondary evidence; switching canonical source does not erase other sources.

## Average v1.0.0

This is the Québec 2026 Dashboard Polling Average, not a poll or a forecast. On day D, include accepted actual provincial decided/decided-leaning polls published by D and completed by D, whose field midpoint is at most 28 days old. Require all five principal parties; missing Other remains missing. All-respondent bases are retained but excluded; no decided-voter conversion is inferred.

For poll i, raw weight r_i = sqrt(min(n_i, 2000)) * 2^(-age_i/14), where age is D minus fieldwork midpoint in days. Sample weighting is deliberately sublinear; the cap prevents large panels from dominating. Fourteen-day half-life and 28-day cutoff are transparent starting choices, not fitted performance claims.

For each pollster f, budget B_f = max(r_i) among its eligible polls. Final unnormalized weight w_i = r_i / sum_f(r) * B_f. Thus publishing more polls cannot multiply a firm's total influence. Normalize weights across firms. For each party use only polls reporting that party and renormalize their weights; expose party coverage and exact contributions. Missing parties are never zero. Do not force aggregate totals to 100. Require at least two distinct firms for a displayed average; show observations when there is insufficient evidence.

Store every included event/revision ID, age, raw weight, firm budget, final weight and per-party contribution. Daily history from January 1 is retrospectively reconstructed using publication eligibility and the selected dataset revision: it is NOT a claim about what our system knew then. Each artifact identifies this semantics and dataset hash. Earlier generated artifacts can be reproduced from prior dataset revisions. Future revisions must not leak into an as-known-at-the-time product; that separate product is deferred.

## Quality rules

Reject/hold impossible dates, future releases, absent sample sizes, unknown party aliases, nonfinite/out-of-range percentages, ambiguous geography/basis, conflicting claims and incomplete principal-party results. Totals within 3 percentage points of 100 are allowed with a rounding/incomplete-category warning; larger gaps require review. Missing Other is recorded as missing even when the sum is 99. A reviewed incomplete category set is not made complete by invented residuals. A parser never approves an uncertain poll merely because its arithmetic passes.

## Automation and operations

Provide a portable `npm run update` command and a daily GitHub Actions workflow (10:23 UTC, off the hour), with manual dispatch, concurrency control, offline tests before updates, logs/artifact retention and commits limited to data and generated output. Scheduled workflows require pushing to a configured GitHub default branch and enabling Actions; no remote exists yet. A local Codex daily automation can run this same command in the interim while this machine/app is available; it must report meaningful failures and pause after October 5. Neither scheduler guarantees exact execution time or always-on service. Preserve last good data on partial failures and expose staleness.

## Repository shape

config/ — election, parties, pollsters, sources, methodology
pipeline/ — schema, normalization, identity, evidence fetching, discovery, ingestion, aggregation, CLI
data/ — evidence, submissions, canonical state, health and run logs
public/data/ — deterministic read-only dashboard artifact
web/ — React UI; raw polls and derived series clearly separated
tests/fixtures/ — synthetic and bounded source fixtures; no live network in tests
docs/ — source audit, method, operations and milestone checklist
.github/workflows/ — daily refresh and CI

## Milestones

1. Foundation (this session): document architecture; implement registries, evidence retrieval, conservative discovery/review, immutable revisions, normalization/deduplication, tested average, daily artifacts, local dashboard and scheduler configuration. Start primary-source historical backfill; expose coverage gaps rather than inventing a complete series.
2. Coverage: reconcile every historical lead from January onward, add stable tested pollster-specific extractors, review corrected releases and missing methods, and measure discovery recall against independent lists. Until completed, label historical coverage partial and avoid claims of a comprehensive current average.
3. Operations: configure GitHub remote/deployment, activate hosted daily updates, demonstrate failure recovery and unattended operation, add alerts for missed schedules.
4. Regional/demographic inspection and timeline milestones. Seat models, forecasts, user accounts and election-night ingestion remain out of scope.
