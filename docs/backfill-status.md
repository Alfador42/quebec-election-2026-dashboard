# Historical backfill status

Snapshot: 24 September 2026. **Partial**, not a census of all 2026 Québec polls.

Eighteen polling events have been verified through primary reports/releases: nine Léger waves (January, March, May, June, August 9, August 31, September 6, September 13 and September 21 fieldwork end dates), Innovative (January 16–February 1 fieldwork), Liaison (April 26–27) and Pallas (January 9–10, February 21–22, August 29, September 5, September 12 and September 19), plus Nanos (September 12–14). Each went through the same normalization and ingestion functions used for later submissions. Original documents, extraction locations, publication evidence and methodological notes are retained.

The archived Le Québec Vote inventory yielded 26 candidate waves. data/backfill-inventory.json preserves per-wave source references, while the discovery queue retains broader leads. A reference match is a reconciliation aid, not automatic proof that two polling events are identical.

Unfinished coverage includes earlier Pallas waves, Synopsis, Mainstreet, further March/April Léger waves and the August 23 wave. No July waves were verified; a gap does not assert that no polls exist. Qc125 and other inventories may expose additional records beyond these 26. Do not present the current subset as comprehensive.

Observed discrepancies worth preserving:

- Several secondary dates behave like midpoints, not final field dates. Léger's August report states August 28–31, whereas a tracker labels the wave August 30. Store the primary dates.
- Innovative's primary methodology says 651 actual respondents, weighted to 600, fielded January 16–February 1. The primary article is dated February 20. Secondary date/sample differences must not create another event. The decided table also reports PVQ separately from Other.
- January Pallas headline and body disagree. Resolved September 19 using the linked original PDF page 13: precise decided/leaning values accepted, including Other 3.2. The original conflicting headline is preserved; filename year 2025 is contradicted by the explicit 2026 report cover and release.
- Pallas September precise decided/leaning totals differ from rounded press summaries. Keep table precision and the explicitly reported Other category.
- Liaison's PDF attachment path is disallowed by robots; its accessible original HTML explicitly reports the provincial figures and fieldwork. Age eligibility is not specified there and is flagged in the record.
- Léger's PDF issue date is not necessarily the publication date. Linked primary articles establish publication dates; filenames and cover dates are not substitutes.

The historical chart contains gaps because an average requires two firms within the 28-day window. Single-firm observations remain visible. These gaps are preferable to extrapolated or invented history.
