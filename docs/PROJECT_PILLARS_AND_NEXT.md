# WaiverOps — pillars, and what to build next

**This is the front door.** Read it first. It states what the product is, the
decisions that hold it up, what is actually true as of today, and what should be
built next. Every other document in the three repos is depth on one topic; the
routing table at the end says which one owns which subject, and which ones are
historical and must not be trusted.

Written 2026-09-12 against `waiver_priority` `240997b`, `waiver-ops-web` `8676595`,
`waiver_intelligence` `e6f1629`.

---

## The product in one paragraph

A fantasy football manager connects their Sleeper (or, when approved, Yahoo)
account and opens a league board. WaiverOps tells them which available player to
add, **and which player to drop for them**, ranked by how much the complete move
improves their actual starting lineup over the next three weeks. Not by who is
trending, and not by the added player's raw projection — by whether the move
changes what they can legally start. Everything else in the system exists to make
that judgment correct, explainable, and fast enough to be worth opening.

---

## The pillars

These are the decisions the product rests on. Change one and you are building a
different system.

### 1. Three repositories, split by what changes together

`waiver_priority` owns the recommendation engine and the HTTP API (Python, Docker
on Render). `waiver-ops-web` owns the browser experience (Next.js 16 App Router on
Vercel). `waiver_intelligence` owns evidence gathered from podcasts and articles
(Python CLI, publishes to Postgres).

The boundary that matters is not "frontend/backend" — it is that the engine's
value model, the web presentation, and the paid evidence pipeline change on
completely different clocks and carry different risks. The intelligence pipeline
can be switched off entirely and the product still works.

The web/API line, stated exactly, because "no business logic in the web app" is too
loose to apply: **the web decides what to show and how to say it; it never computes
what a move is worth.** Filtering, ordering for display, wording, and disclosure are
web. Scoring, projection, lineup optimization, and any number printed on a card are
API. By that rule the scoring-coverage notice is presentation of an API-supplied
audit, and changing how many recommendations the board surfaces is also
presentation — even though it changes what a user does.

### 2. Every provider is normalized onto one schema before the engine sees it

`waiver_priority/yahoo_data.py::normalize_yahoo_players` maps Yahoo players onto Sleeper IDs and
re-emits `{league, rosters, users, catalog, account_user_id}` in Sleeper's shape.
The engine has exactly one input schema and no provider branches.

The asymmetry is deliberate and worth knowing: the player catalog, NFL state,
trending adds and projections come from Sleeper for **both** providers. Only
league, rosters and owners come from Yahoo. Sleeper transactions have no Yahoo
equivalent, so `league_pulse.activity_status` degrades to `"unavailable"` rather
than guessing.

### 3. Content-addressed snapshots, with a league-independent projection scope

`waiver_priority/snapshot_store.py` stores every provider payload under a SHA-256 of its canonical
JSON, namespaced by the canonicalization and payload schema versions (both
currently `1`). Identical content is stored once; a refresh that changes nothing
costs nothing.

The load-bearing detail is the **scope key**. Projections are scoped
`nfl:{season}:regular:{week}:{positions}:compact-v1` — no league in it — so every
league in the system shares one projection snapshot per week. The player catalog
is scoped `nfl:compact-v1` and reduced to ten fields. That is what makes a second
league cheap, and it is why `waiver_priority/postgres_source_store.py` carries a check constraint
(`public_source_allowlist`) restricting the shared public cache to exactly these
two league-independent resources. A league-scoped payload can never enter the
shared store, by database constraint rather than by convention.

### 4. Six storage layers, each with one job

| Layer | Owner | Purpose |
|---|---|---|
| Content-addressed snapshots | `waiver_priority/snapshot_store.py` (SQLite) | Provider payloads, deduplicated, 180-day retention |
| Shared public source cache | `waiver_priority/postgres_source_store.py` | The catalog and projections, shared across instances, with fenced refresh leases |
| Tenant database | `waiver_priority/tenant_store.py` (Neon) | Users, identities, connections, leagues, preferences |
| Durable recommendation cache | `league_recommendation_snapshots` | Fresh 5 min / stale 30 min; the degraded fallback when a computation fails |
| In-process byte cache | `waiver_priority/runtime_cache.py` | 60 s TTL, 16 MiB total, 2 MiB per entry — stores **UTF-8 bytes**, not Python trees |
| Intelligence local store | `waiver_intelligence/db/schema.py` | Episodes, transcripts, mentions, evidence; publishes one snapshot table to Neon |

The byte-cache decision is easy to undo by accident: entries are serialized bytes,
so a cache hit costs a decode but holds no live object graph. That is a memory
decision, not a speed decision, and it is part of why the 512 MiB instance holds.

### 5. The engine ranks complete moves, decided by a real lineup optimizer

`waiver_priority/recommendation_engine.py`, in order: `build_league_snapshot` → `compile_scoring`
→ `build_projection_bundle` → `build_team_strengths` → `build_fit_matrix` →
`recommendations_for_roster`.

Two things in there are the product:

**`optimize_lineup` solves an assignment problem.** `_hungarian` runs the
Hungarian/Jonker-Volgenant algorithm over slots × players, with dummy columns so
slots may legally go empty. The cost lexicography is encoded in magnitudes —
a fill bonus of 1e12 above a point scale of 1e6, with 1e18 for illegal pairings —
meaning *fill a legal slot* always beats *score more points*. Roster legality is
not a filter applied afterwards; it is the objective.

**`_paired_roster_move` evaluates the add and the drop together.** The value of a
move is the change in optimized starting lineup points, so a high-scoring add that
never cracks the lineup is correctly worth nothing.

Be precise about how strong that evidence is. Over 432 real decisions the engine
beats every naive alternative except one - "add the best projected free agent, drop
your worst" - which it **ties on the mean (3.84 against 3.81) and beats by 56% on
the median (2.77 against 1.77)**. The lineup-aware model is more *reliably* useful;
the naive baseline's average is carried by occasional lottery wins. It is not a
rout, and anyone repeating it as one has not read `TRACK_B_NOTES.md`.

Horizon is three weeks, weighted `(0.50, 0.30, 0.20)`, renormalized over whichever
weeks actually loaded.

### 6. Intelligence is a bounded modifier that fails neutral

Evidence never picks a player. It adjusts a projection by at most ±15%
(`MAX_PLAYER_SIGNAL_MODIFIER = 0.15`, enforced again at parse time in
`waiver_priority/player_signals.py`), plus a hard zero-out for `HARD_UNAVAILABLE_STATUSES`.

A snapshot older than six hours degrades to empty with a warning rather than
feeding stale news into rankings. Every failure path in this subsystem produces
*no adjustment*, never a guess. Per-league opt-out exists. The snapshot
fingerprint is part of the cache key, so a new publication invalidates every board.

**Is it on in production today? Effectively no.** The code path is live and wired,
but the published snapshot covers 32 players against candidate pools of 383-759, so
the overwhelming majority of ranked candidates carry no evidence and receive no
adjustment. Treat current boards as essentially unmodified projections. (Coverage is
quoted as a range because it is measured per league against that league's own pool.)

### 7. Identity is exchanged once, then isolation is enforced five ways

Auth0 Universal Login → the web holds an encrypted session → `/auth/sync` exchanges
the Auth0 ID token at the API → the API verifies it against JWKS and re-signs a
**minimal identity envelope** as the `waiver_session` HMAC cookie. Provider tokens
never enter that cookie.

Isolation is defense in depth, and all five layers matter: every repository method
takes a `user_id`; Postgres row-level security is `FORCE`d with policies keyed on
`current_setting('waiver.current_user_id')`; hosted boot refuses any database URL
that is not the pooled least-privilege `waiver_app` role; cache keys begin with
`user_id`; Yahoo tokens are Fernet-encrypted at rest. `_owned_league()` in
`waiver_priority/waiver_api/service.py` is the single authorization choke point, and an e2e test asserts that
a user guessing another league's URL fails closed.

### 8. One worker, and every guardrail assumes it

`WEB_CONCURRENCY=1`. On top of that single process sits a one-permit semaphore for
calculations (a second cold board gets 503 + `Retry-After: 2`, never a queue), a
four-slot duplicate waiting room with a 2 s wait, per-key single-flight locks with
refcounted cleanup, and cross-instance Postgres refresh leases capped at 120 s by
check constraint.

If you ever raise the worker count, every one of those becomes per-process and the
memory envelope stops holding. This is the assumption most likely to be broken by
someone trying to make the site faster.

---

## Invariants a rebuild must preserve

These are automated, and they encode judgments that took real work to reach.

- **`scripts/check_memory_envelope.py`** — runs offline in a `--memory=512m` container
  over 12 analyze-and-release cycles and asserts `peak < 400` MiB, `drift < 32` MiB,
  and `400 <= candidates <= 800`. The candidate bound is the interesting one: it
  fails if the engine ever starts scanning the historical player catalog instead of
  the projected, unowned, position-eligible pool.
- **`scripts/check_api_boundary.py`** — asserts the retired Streamlit app cannot creep
  back, forbids `COPY .` in the Dockerfile, and asserts the Dockerfile copies *every*
  runtime module. It catches a new module added without a matching `COPY` line, which
  would otherwise fail only in production.
- **`scripts/check-client-boundary.mjs`** — greps the built browser bundle for server
  secrets, including a CI canary value so the check itself is falsifiable.
- **`scripts/check-hosted-config.mjs`** — runs as `prebuild`; refuses to build a hosted
  deployment without the seven required variables and exact HTTPS origins.
- **The version constants gate the caches.** `ENGINE_VERSION`, `SCORING_VERSION` and the
  signal fingerprint are part of every cache key, so a value-model change invalidates
  every cached board automatically. Bump them when output changes; do not bump them
  for refactors that produce identical output.

Full gate list: 138 pytest + 4 skipped (`waiver_priority`), 67 unittest
(`waiver_intelligence`), 9 Playwright flows, lint, typecheck, and the two boundary
checks.

---

## Where the project actually stands

Shipped and running: Sleeper connect, the league board with paired add/drop
recommendations, roster context, League Pulse, progressive loading, Auth0, the
shared Postgres source cache, and the compact catalog.

**Pushed today, not yet merged** — five commits on `waiver_priority`
`perf/cold-board-and-defense-scoring`, two on `waiver-ops-web`
`feat/scoring-coverage-note`:

- Single-pass snapshot serialization — catalog `put` 215 → 123 ms
- Two concurrent provider waves — provider stage 1,674 → 1,547 ms
- Fit-matrix pruning — 306 → 194 ms, with all 432 roster views byte-identical
- Team-defense scoring from Sleeper's own stat keys — DEF exactness 55–58% → 100%,
  overall scoring fidelity 91.4% → 94.1%
- A board-level notice naming the scoring rules the projections cannot see

Cold board overall: **2,492 → 2,238 ms** (10%), measured interleaved against a HEAD
worktree. The figures nest rather than sum: the snapshot-write saving sits *inside*
the provider stage, and it is the two stage improvements (provider −127 ms, engine
−123 ms) that add up to the 254 ms total.

Vocabulary, because these numbers are meaningless without it. **Cold** means no
cached recommendation and no cached provider payloads — the full path including HTTP
to Sleeper. **Warm sources** means the provider payloads are in the snapshot store
but the recommendation is not cached, so the provider stage still runs, as store
reads and JSON decodes rather than network calls; that recompute is ~1,588 ms.
**Warm hit** means the recommendation itself is cached: ~5 ms.

Paused: Yahoo, pending API approval. Effectively dormant: the intelligence
pipeline — evidence exists for 4.2–8.4% of ranked candidates and no unattended run
has ever been recorded.

---

## The re-based roadmap

The documented milestones in `waiver_intelligence/PRODUCTION_NEXT_STEPS.md` have
drifted from the code **in both directions** — some work is marked pending that
shipped, and some is marked done that was never observed.

| Milestone | Documented | Measured reality |
|---|---|---|
| 12A establish the bottleneck | in progress | **Done.** The cold board is attributed end to end. Windows-local, not production. |
| 12B optimize the slow path | "This is not deployed." | **Done and pushed today.** Not yet merged or observed. |
| 12C durable job queue | conditional | Write-behind measured at a **~110 ms ceiling** — the queue is not justified. The *warming* half is a separate, justified question. |
| **M12 exit criterion** | production observation | **Not met. Nothing else in the plan meets it.** |
| M13 validate usefulness | unstarted | **Half done.** A 432-decision backtest exists. The versioned scenario set does not. |
| M14 scheduled intelligence | unstarted, gated on spend | Still gated, now **decision-ready**: the bill, the automation gap and the uncapped call are all quantified. |
| M15 richer assessments | gated behind M13 fixtures | Gate stands — those fixtures are M13's missing scenario set. |
| M16 roster context UI | "planned, not implemented" | **Shipped 2026-09-10** (`waiver-ops-web` `cb44ae4`). The document is wrong. |

Four measured findings have no milestone at all: the per-request tenant write, the
60-second board TTL, the unread response arrays, and the ranking-presentation gap.

### What to build next, in order

**1 — Close M12 for real: production observation.**
The API already emits `Server-Timing` and `X-Waiver-Cache` on every response and
populates `meta.timings_ms`. Nothing aggregates them. Until something does, every
number in this project is a Windows laptop number, and M12 can never be declared
done regardless of how much faster the code gets. This is the smallest piece of
genuinely blocking work in the tree.

Two unnamed findings belong to this milestone as well. **Build the observation
first**, then land these against it — shipping further unmeasured optimizations
under a milestone whose whole complaint is "nothing is measured in production" would
repeat the exact mistake:

- **The per-request tenant write.** `resolve_user` → `upsert_user` runs a joined
  SELECT plus two unconditional UPDATEs and commits on *every* authenticated call,
  including each ~1 Hz progress poll during a cold board. On Neon that is a network
  write transaction sharing the pooled connection with the computation, in a
  single-worker process. Update only when a claim actually changed.
- **The board cache cliff — smaller than first reported.** The in-process byte cache
  has a 60-second TTL, and the original assessment concluded that returning after
  ninety seconds costs a full recompute. **That holds only on SQLite, which is local
  development.** In production the repository is Postgres, so a miss on the
  60-second cache falls through to `league_recommendation_snapshots`, which is
  *fresh* for five minutes and is served as a hit, re-warming the byte cache on the
  way past. The real recompute cliff in production is at **five minutes**, not sixty
  seconds, and the cost between one and five minutes is a Neon round trip rather
  than 1,588 ms.

  This correction is itself the argument for the milestone above it: the original
  figure was measured on a Windows laptop against SQLite and did not survive contact
  with the production configuration. Still worth doing — widen the durable window,
  and revisit the 16 MiB cap rather than assuming it — but as tuning, not a headline.

**2 — Finish M13: the scenario set.**
The backtest answered *does it help* — the engine beats every naive alternative
except "add the best projected free agent", which it ties on the mean and beats by
56% on the median. It does not answer *does it fail safely*. M13 asks for a
versioned scenario set: strong roster with no useful upgrade, missing starter, bye
coverage, K/DEF streaming, superflex, protected cuts, empty board. That set is the
gate for M15 and for any ranking-policy change.

**3 — Then the ranking-presentation gap.**
The roadmap never named this and it is the largest measured "clever" opportunity:
rank 1 of `primary_recommendations` is worth **5.53** realised points, while the
**best move in the engine's own top five is worth 9.18**. The ranking already knows
more than the board says. That is presentation, not modelling — and it is a product
decision about what to show, so it needs an owner call before code. Build it on
M13's scenario set, which is precisely what M13's exit criterion requires before
changing default ranking policy.

**4 — M14 is a decision, not a sprint.**
Scheduling the intelligence pipeline needs three things settled first: a budget
(measured at **$155–255 per season** depending on cap), the missing automation link
between `mentions extract` and `events build` (nothing schedules them, so a
scheduled pipeline today would transcribe forever and produce no evidence), and a
cap on the one paid call that currently has none. Note also that the documented
120-minute cap admits 61% of what these five feeds publish.

**5 — M15 stays gated.**
The unread response arrays — 62% of the payload, but only ~5 KB gzipped and half a
millisecond — are opportunistic. Do them the next time the contract is open anyway.

### Decisions waiting on you

Two of the open questions in `PRODUCT_BRIEF_ARCHITECTURE_NEUTRAL.md` block sizing
and should be answered rather than assumed: **expected concurrency** (managers,
leagues each, peak simultaneous activity — the single-worker model is sized on a
guess) and **maximum monthly infrastructure spend**, separate from paid model spend.

---

## Glossary

Terms used throughout this project that are not general knowledge.

| Term | Meaning |
|---|---|
| **Board** | One manager's league page: their roster context, League Pulse, and ranked recommendations. The unit of work the whole system is optimized around. |
| **Candidate** | An available player the engine will actually consider — projected, unowned, position-eligible, on a team, not inactive. Pools run 383–759 per league. |
| **Fit matrix** | Every candidate scored against every team in the league, not just yours. It exists so the engine can tell a move that helps you from one that merely denies a rival. |
| **Primary vs watchlist** | `primary_recommendations` are moves worth acting on now; `watchlist_recommendations` clear a lower bar. `strategic_adds` are denial plays. The board reads the first two. |
| **Realised gain** | The backtest metric: how much a move actually improved the optimized starting lineup, scored against what really happened that week. Not a projection. |
| **Drop safety** | The rules protecting a manager from a damaging cut — same-position-only for K/DEF, injury-flag protection, tie-break ordering. |
| **Scoring fidelity** | Share of realised player scores the engine reproduces within 0.1 of Sleeper's own number. Currently 94.1%. |
| **Signals / evidence / mentions** | One chain, three stages: a **mention** is a player named in a transcript; **evidence** is a resolved, scored claim about that player; a **signal snapshot** is the published bundle the API consumes. |
| **Single-flight** | One computation per cache key at a time; concurrent askers wait for it rather than each starting their own. |
| **Refresh lease** | A short Postgres lock letting one API instance refetch a shared payload while others wait, so four instances do not each download the catalog. |
| **Fenced** | A lease holding a token, so a slow holder that wakes up late cannot overwrite a newer publication. |

## Running it

This document does not duplicate setup. Each repo has a `CLAUDE.md` at its root with
that repo's purpose, its exact verify commands, and the traps specific to it — read
the one for the repo you are working in. `docs/OPERATIONS_AND_HANDOFF.md` covers
local setup across all three, configuration ownership by host, and diagnostics;
`PRODUCTION_DEPLOYMENT.md` covers accounts and secrets.

Two things the front door will say anyway, because they cost people hours:
Playwright tests run against the **built** output, so `npm run build` before
`npm run test:e2e` or you will test stale code. And point `WAIVER_DATABASE_URL` at a
local SQLite file for local work — the default configuration talks to production Neon.

## Where to read more

**Authoritative, by topic:**

| Topic | Document |
|---|---|
| Product requirements, stack-neutral | `waiver-ops-web/docs/PRODUCT_BRIEF_ARCHITECTURE_NEUTRAL.md` |
| Rebuilding the website surface | `waiver-ops-web/docs/WEBSITE_REBUILD_SPEC.md` |
| Current implemented state | `waiver-ops-web/docs/CURRENT_STATE.md` |
| Setup, release, diagnostics, rollback | `waiver-ops-web/docs/OPERATIONS_AND_HANDOFF.md` |
| Hosting accounts and secrets | `waiver-ops-web/PRODUCTION_DEPLOYMENT.md` |
| HTTP contract | `waiver_priority/API.md` |
| Tenant isolation model | `waiver_priority/MULTI_TENANCY.md` |
| Engine, local dev, providers | `waiver_priority/README.md` |
| Drop-safety policy | `waiver_priority/RECOMMENDATION_QUALITY_CHECKPOINT.md` |
| Milestone definitions M12–M16 | `waiver_intelligence/PRODUCTION_NEXT_STEPS.md` (statuses superseded by the table above) |
| Intelligence CLI | `waiver_intelligence/README.md` |
| Producer/consumer signal contract | `waiver_intelligence/docs/player_signals_v2.md` |

**Measured evidence** — every performance and quality number in this document:
`waiver_priority/bench/TRACK_A_NOTES.md` (latency),
`waiver_priority/bench/TRACK_B_NOTES.md` (decision quality),
`waiver_intelligence/bench/TRACK_C_NOTES.md` (evidence coverage and cost),
`waiver-ops-web/spikes/architecture-2026-09/RESULTS.md` (the architecture spike).

**Historical — do not build from these:**

- `waiver_priority/DESIGN.md` — specifies the retired Streamlit UI (dark teal,
  Barlow, News popover). None of it exists. The live design system is
  `waiver-ops-web/src/app/globals.css` and the token table in `WEBSITE_REBUILD_SPEC.md`.
- `waiver_priority/PRODUCT.md` — predates the current engine; states the add is
  chosen before the drop, which is the opposite of how it works now.
- `waiver_intelligence/docs/intelligence_export_v1.md` — superseded by
  `player_signals_v2.md`.
- `waiver_priority/PERFORMANCE_ARCHITECTURE_REVIEW.md` — an accreting log of dated
  checkpoints, not a current description. Later sections resolve earlier ones.
