# WaiverOps — current project state

Snapshot: **September 10, 2026**.

> **No longer the starting point.** Read
> [PROJECT_PILLARS_AND_NEXT.md](PROJECT_PILLARS_AND_NEXT.md) first — it is the front
> door for all three repos and carries current status and the re-based roadmap.
> This document remains authoritative for the implemented user experience and
> recommendation semantics described below. Its release baseline and engine versions
> are from 2026-09-10 and have since moved; corrections are marked inline.

## Reading order and scope

1. This overview: product, architecture, implementation status.
2. [WEBSITE_REBUILD_SPEC.md](WEBSITE_REBUILD_SPEC.md): screens, interactions, contracts, and a copy-ready LLM brief.
3. [OPERATIONS_AND_HANDOFF.md](OPERATIONS_AND_HANDOFF.md): development, configuration, releases, troubleshooting.

These documents describe the existing product, not authorization to change infrastructure. Code and migrations are authoritative for exact behavior. Older milestone plans contain historical decisions; investigate conflicts rather than following them blindly.

This handoff deliberately excludes credentials, private league exports, transcripts, and database contents. It can guide recreation of the experience and architecture. **Exact computational parity requires the Python engine and its tests; prose alone cannot guarantee it.**

## Product purpose

WaiverOps helps a fantasy-football manager decide whether an available player is worth adding to their particular roster. It explains the **net effect of an add/drop move**, not simply which free agent has the highest projection. Standing pat is a valid recommendation.

Inputs include league scoring and lineup rules, rosters, available players, short-horizon projections, and structured intelligence. League activity and estimated rival roster fit provide context. The owner is Joshua Trygg, using the WaiverOps name; public contact is jtrygg@gmail.com. This document does not represent the project as an incorporated company.

## Repositories and deployment

| Component | GitHub repository | Local sibling folder | Owns |
| --- | --- | --- | --- |
| Website | `jtDuke/waiver-ops-web` | `waiver-ops-web` | Next.js UI, server-side API adapter, Auth0 journey |
| API | `jtDuke/waiver-ops` | `waiver_priority` | FastAPI, authorization, providers, recommendation engine |
| Producer | `jtDuke/waiver-intelligence` | `waiver_intelligence` | Content ingestion, evidence, signals, publication |

The historical folder `waiver_priority` is the API repository, not a fourth product.

```text
Browser -> waiverops.com / Next.js / Vercel <-> Auth0
                     |
                     | server-side API requests with application session
                     v
       waiver-ops-api.onrender.com / FastAPI / Render
                     |                         |
                     v                         v
                Neon Postgres              Sleeper adapters
                     ^
                     | immutable v2 signal publication
           Waiver Intelligence Python process
                     |
           service-owned SQLite operational store
```

Cloudflare manages DNS. Auth0 handles identity-provider login; FastAPI owns internal user mapping and authorization. The verified API URL is the Render address above; do not assume `api.waiverops.com` is configured.

### Last verified release baseline

| Component | Code baseline | Recorded verification |
| --- | --- | --- |
| Web | `cb44ae405662abd4ea36f0c5b3356fa4aeb90094` | Production Vercel deployment successful; main CI green; public domain HTTP 200 |
| API | `f5842c05997ba3c155c5a8bd3fef29a8b6d7827a` | Main CI green; readiness 200; release `2026.09.10-roster-pulse-1`; public cache `postgres` |
| Intelligence | `e6f1629` | Source baseline inspected; continuous worker operation not verified |

**Behind HEAD as of 2026-09-12.** The API is now `240997b` and the web `8676595`. Five API commits (single-pass snapshot serialization, two-wave concurrent provider fetch, fit-matrix pruning, team-defense scoring, the bench harness) and two web commits (the unsupported-scoring-rule notice, the spike record) are not represented in this table and were pushed but not yet merged when it was written.

These are dated observations from the preceding release, not ongoing uptime guarantees. That release passed **136 API tests (four optional database tests skipped) and nine browser tests**, plus web typecheck, lint, production build, and client-boundary validation. This documentation task does not claim another test run or deployment.

## Implemented user experience

- Public home, privacy, and terms pages; Auth0 sign-in; authenticated product shell.
- Connect Sleeper by username, discover leagues, save a default league, open a league board.
- League board order: compact expandable roster; expanded League Pulse; collapsible Best Moves; collapsed Small Edges; back-to-leagues link.
- Roster highlights at most four distinct possible cuts, only from complete primary add/drop recommendations with high/medium drop confidence. IR/taxi entries are excluded. Never pad the list to four.
- League Pulse previews ten available-player trends and expands to thirty; shows transaction teams, adds/drops, and supplied timestamps; prioritizes non-K/DEF rival opportunities with at most two K/DEF entries combined.
- Best Moves renders at most twelve matching recommendations; position/category/meaningful-news filters remain. There is no player-name search in that section.
- Cards explain the pickup, possible cut, net next-week points, weighted three-week points per week, news, and modeled rival fit.
- Player evidence pages are linked from meaningful-news analysis. They are not a global player explorer.
- Honest progressive loading and bounded busy recovery replace flashing skeleton containers.
- *(Added 2026-09-12.)* When a league scores rules Sleeper's projections do not carry, the board states the scoring coverage percentage and names those rules in plain language, so a manager knows which values are incomplete.

## Recommendation semantics

Source of truth: `recommendation_engine.py`. Current versions: `recommendation-v10-team-defense-scoring`, `scoring-v3-team-defense`, `legal-lineup-v1`. *(Corrected 2026-09-12: scoring team defenses from their own Sleeper stat keys changed both the engine and scoring versions.)*

1. Normalize scoring, slots, ownership, reserve/taxi membership, and provider-designated starters.
2. Compile supported scoring rules; retain warnings for unsupported/missing inputs.
3. Build up to three regular-season projection weeks with base weights **50/30/20**. Preserve the engine's missing-week handling; missing data is not automatically zero.
4. Apply validated structured intelligence adjustments before lineup optimization, defensively capped at **±15%**. Summary prose never changes a score.
5. Optimize legal lineups, including supported FLEX/SUPER_FLEX and other slots; evaluate available-player fit across rosters.
6. Model complete add/drop pairs and net lineup effects. Open slots permit adds without a cut.
7. Separate useful moves from small edges, retaining explanations and completeness/safety gates.

Current constants: primary weighted gain **1.0 pt/week**, primary individual-week gain **2.0 pts**, watchlist weighted gain **0.5 pt/week**, watchlist individual-week gain **1.0 pt**. These constants are not the entire eligibility policy: use the full engine and tests. A weighted average is **not a three-week total**.

Streaming K/DEF additions may replace only the same primary position, not an offensive bench player. Selected injury statuses protect possible cuts. Equal-impact cut choices prefer lower projected bench cost and then stable ID ordering. This is short-horizon projection logic, not a validated dynasty-value model.

Roster weakness and actionable waiver opportunity are different concepts. Rival interest means modeled roster fit, not knowledge of actual waiver claims. Sleeper add counts are context, not the ranking formula.

## Persistence and ownership

| Data | Current home | Boundary |
| --- | --- | --- |
| Users, identities, connections, leagues, preferences, OAuth state | Neon in production; SQLite supported locally | API tenant authorization, Postgres RLS defense in depth |
| Final recommendation snapshots | Tenant-isolated Postgres cache plus bounded process cache | API |
| Public catalog/projection snapshots and refresh leases | Postgres with `WAIVER_PUBLIC_SOURCE_CACHE=postgres` (production verified) | Allowlisted public resources only |
| Other local provider snapshots | Local SQLite cache paths still exist | Rebuildable adapter cache, not production product-user persistence |
| Published player signals | `intelligence.player_signal_snapshots` in Neon; JSON locally | Producer inserts; API reads |
| Episodes, transcripts, extraction revisions, evidence, usage, worker leases | Intelligence-owned SQLite | Producer only |

The intelligence operational database has **not** moved to hosted Postgres. Do not indiscriminately delete SQLite files: the producer's store can contain unique evidence and paid processing history.

API migration head: `20260910_0005`, following tenant data, recommendation cache, public source cache, refresh leases, and compact projection lease scopes. Intelligence has a separate Alembic history with version table `waiver_intelligence_alembic_version`. Never merge those histories.

## Intelligence contract

Producer code supports enabled podcast feeds within a default **14-day discovery window**, audio transcription, structured extraction, conservative player resolution, and source-neutral article/podcast evidence. Ambiguous identities remain unresolved rather than guessed.

Envelope: `schema="waiver-intelligence/player-signals"`, `schema_version=2`, UTC `generated_at`, `player_count`, `players`. Player records include canonical/Sleeper IDs, evidence fingerprint/counts, confirmed hard status when supported, week/three-week/ROS horizons, summary provenance, and ranked components. Meaning, trust, confidence, recency, and corroboration influence evidence; source format is provenance, not a separate scoring product.

`signals refresh` performs local generation, not implicit Postgres mutation. `signals publish` validates and inserts a complete snapshot atomically, deduplicating by canonical SHA-256, without paid API calls. Publication does not collect new evidence or make old data fresh.

The API validates schema, fields, URLs, modifiers, and freshness through a common file/Postgres loader. Missing, unsupported, invalid, unreachable, or **older-than-six-hours** intelligence fails neutral, preserving baseline projections. Postgres signal reads are cached for five minutes.

## Performance decisions to preserve

- One API worker and one admitted cold calculation per process; bounded duplicate waiting; warm cache hits bypass calculation admission.
- Process recommendation cache: default 60-second TTL, 128 entries, 16 MiB total, 2 MiB per entry. Serialized immutable entries avoid shared object mutation.
- Shared public cache: allowlisted resources, payload limit 8 MiB, timestamp-safe publication, bounded refresh leases. Never put tenant/private payloads here.
- Compact catalog identity data rather than imposing an arbitrary top-500 cutoff. Roughly 12,000 provider identities do not imply 12,000 recommendation candidates; saved league candidate sets measured approximately 491–759.
- Compact projections preserve all IDs and scoring stats while removing unused metadata; versioned keys prevent representation confusion.
- No paid ingestion/transcription/extraction inside request handlers.
- Native roster/Pulse disclosures introduce no client state, effects, polling, dependencies, or provider fetches.

Earlier synthetic Linux testing measured roughly 136 MiB peak and 0.65 MiB retained drift across repeated analyses under a 512 MiB container limit. This is a regression exercise, **not live p95 latency, proof of zero leaks, or a concurrency guarantee**. See API `scripts/check_memory_envelope.py`.

## Explicitly unfinished

- Yahoo-specific development and live acceptance remain paused pending API approval. Existing adapter/OAuth code is not proof of approval or launch readiness.
- Persistent hosted intelligence scheduling, worker backup/restore, and operational-store migration remain subsequent work. Do not claim continuous publication is running.
- More recommendation calibration, richer rankings/recent-statistics inputs, and explicit teammate relationship modeling remain future work.
- Broader production load/soak testing and real populated-league visual review remain valuable. League Pulse typography still needs polish.
- No global player explorer, automatic waiver execution, or TypeScript rewrite of the Python engine.
- Streamlit is retired. The historical `streamlit-final` tag is archival, not the normal rollback path.

## Source map

Web: `src/app/`, `src/components/league-context.tsx`, `src/lib/api/contracts.ts`, `src/lib/api/server.ts`, `src/lib/auth/`, `src/app/globals.css`, `tests/fixtures/mock-api.mjs`, `tests/e2e/launch-flow.spec.ts`.

API: `waiver_api/{main,models,service,auth,runtime}.py`, `recommendation_engine.py`, `tenant_store.py`, `sleeper_data.py`, `source_store.py`, `postgres_source_store.py`, `snapshot_store.py`, `player_signals.py`, `migrations/`, `tests/` and root engine tests.

Producer: `src/waiver_intelligence/{podcasts,transcription,extraction,intelligence,signals,jobs,db}/`, `cli.py`, `config.py`, `docs/player_signals_v2.md`, `docs/postgres_publication.md`, `pyproject.toml`.
