# Source audit — 12 September 2026

Primary-source reports are canonical; discovery pages are not datasets to copy. This is an initial audit, not proof of exhaustive coverage.

| Publisher | Verified entry point / evidence | Retrieval opportunity and hazards |
|---|---|---|
| Élections Québec | [Election announcement](https://www.electionsquebec.qc.ca/communiques/elections-provinciales-de-2026-un-scrutin-aura-lieu-le-5-octobre/) | Authoritative dates; no polling data. |
| Léger | [September release](https://leger360.com/fr/dernieres-nouvelles-le-vote-se-stabilise-mais-une-forte-volonte-de-changement-demeure/), [January PDF](https://leger360.com/wp-content/uploads/2026/01/Rapport-Intentions-de-vote-29-janvier-2026.pdf) | HTML has methodology and report links; PDFs on leger360.com and documents.leger360.com contain full tables. Multiple denominators, hypothetical leaders, historical comparison columns and federal questions make generic number extraction unsafe. Panel-comparison margins are not actual sampling margins. Attribute Sondage Léger/Québecor or the exact report credit. |
| Pallas Data | [September release](https://pallas-data.ca/fr/2026/09/07/pallas-quebec-poll-pq-29-caq-24-plq-20-pcq-15-qs-11/), [January release](https://pallas-data.ca/2026/01/21/sondage-pallas-quebec-pq-34-plq-27-pcq-15-caq-11-qs-8/) | WordPress pages and linked PDFs. January headline differs from body; French September denominator translation is ambiguous. Use original tables, not title regexes. Publication dateline and page date may differ. |
| Liaison Strategies | [May release](https://press.liaisonstrategies.ca/quebec-le-pq-et-les-liberaux-sont-coude-a-coude-la-caq-gagne-du-terrain/) | Ghost HTML plus report attachments; federal and provincial measures coexist. External storage.ghost.io attachments need explicit host approval. |
| Innovative Research | [January report](https://innovativeresearch.ca/wp-content/uploads/2026/02/CTM2601-Legault-RELEASE.pdf), [research index](https://innovativeresearch.ca/insights-news/public-affairs-research/) | PDF includes all-respondent vote-plus-lean including undecided and a separate decided base. Secondary sources disagree on date/sample; do not normalize by assumption. |
| Mainstreet | [Polling index](https://www.mainstreetresearch.ca/polling) | Published report index; secondary May 15 lead needs original-source reconciliation. Some content may require subscription; no bypass. |
| Synopsis Recherche | [Secondary inventory](https://lequebecvote.ca/sondages) | Four 2026 waves identified as leads. A dependable canonical report endpoint was not verified in initial search; retain unresolved source status. |
| Ipsos | [January separation study](https://www.ipsos.com/en-ca/support-independence-alberta-reaches-levels-similar-quebec) | Primary HTML and tables; sovereignty is a separate question, not provincial voting intention. Monitor rather than assume an eligible wave. |
| Angus Reid | [Research homepage](https://angusreid.org/) | HTML and PDF tables; federal, approval and separatism releases are not automatically eligible provincial polls. |
| Qc125 | [Québec home](https://qc125.com/), [poll page](https://qc125.com/20260905-pal.htm) | Useful dated poll links and report cross-checks. Do not ingest projections, letter grades or model estimates. `/sondages.htm` is labelled regional polling, so never assume its columns are provincial. |
| Le Québec Vote | [Poll inventory](https://lequebecvote.ca/sondages) | Historical lead inventory, per-poll provenance links and unseen firm detection. Has separate sovereignty series; firm-level mode metadata can reflect the latest poll, not the historical wave. |
| Poliwave | [Pollsters](https://www.poliwave.com/ca/qc/polls/pollsters?lang=en) | Secondary discovery and original-release links; dates/sample sizes disagree with another tracker for Innovative. No automatic canonical import. |

No search result snippet is sufficient evidence for acceptance. Capture source bytes with hashes, then verify relevant source table/page and metadata. Discovery should retain new publisher domains for review; it must not assume this registry is exhaustive. Paywalls, consent pages, bot challenges, robots changes, translated content, image-only charts, changed PDF URLs, corrected reports and rolling samples all require observable failure/review states.

## Nanos added 19 September 2026

Primary publisher https://nanos.co/ and its /category/qc-election/ archive are now registered. The September 16 Noovo/Crave release links original PDF tables. Use provincial first-choice decided ballot with the explicit leaning follow-up, not preferred-premier or federal Quebec subsamples. Store full sample and decided base separately. The report cover says released September 15 but the primary website is dated September 16; this distinction is retained, with September 16 used conservatively until an earlier public release is verified. Both nanos.co and www.nanos.co are approved publisher hosts; retrieval continues to respect robots and rate limits.

## Mainstreet public report retrieval — 21 September 2026

September 15 primary release found and archived. Its explicitly linked public PDF is on cdn.prod.website-files.com, now registered as a publisher attachment host. The CDN robots-policy request returned HTTP 403; collection stopped without bypassing the restriction or accessing the separately labelled subscriber report. Poll remains unaccepted pending original-table and methodology verification. See data/audits/2026-09-21-research-leads.json.

## Follow-up source research — 24 September 2026

Le Journal de Montréal was registered as a commissioning-media primary source after following the original Léger March release link. The March 28 article establishes an earlier publication lead than the March 30 pollster page, but archival retrieval returned HTTP 403; the historical extraction remains pending. Segma Recherche was detected through secondary discovery and an original-format PDF mirror on qc125.com. Its provincial Other value is a less-than bound, not a numeric estimate; primary publication and representation checks remain open. See the morning research audit and update log.
