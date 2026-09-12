# WaiverOps spike — results and architecture decision record

Measured 11 September 2026. Companion to `PRODUCT_BRIEF_ARCHITECTURE_NEUTRAL.md`
and `PERFORMANCE_AND_ARCHITECTURE_EVALUATION.md`. Harness and source in this folder.

**Bottom line.** The measurements justify one specific structural change — separating
league-independent work from private per-league work — and they do **not** justify a
rebuild. At the workload in §2, compute is ~0.005% of one core. Nothing in the data
supports replacing a working system to make it faster, because speed is not the
binding constraint. Correctness, memory footprint and failure behaviour are.

---

## 1. What was built

One vertical slice, end to end: signed session → league membership authorization →
provider data loading → league-aware complete-move recommendation → server-rendered
board. Then three designs behind that one interface, run against an identical workload.

| Design | Shape |
|---|---|
| **A** | On-demand baseline. Provider payloads parsed and retained; every request re-derives value. No sharing between leagues. |
| **B** | Columnar catalog + shared league-independent value tables; thin private per-league step. Raw payloads released after folding. |
| **C** | Fully materialized board per (league, roster), served from storage. |

Data: **real** Sleeper catalog (12,227 identities, 14.65 MB), real projections and
observed stats for the completed 2025 season. Leagues are **synthetic**, drafted
near-greedily by provider rank so the waiver pool resembles a real one. No real
manager's private league data was touched. Yahoo is not exercised at all — it is
gated on access approval and no design here assumes that approval exists.

### Measurement hygiene

- Each design benchmarked in **its own process**; sharing one process contaminates
  resident memory with whatever the previous design left reachable.
- Storage latency forced to **0** in latency runs: Windows timer granularity
  (~15.6 ms) is coarser than an entire request and would hide the app cost. Storage
  and provider round trips are measured separately and added back analytically.
- Peak RSS is **sampled**, not inferred from settled state.
- Failure injection **stalls inside the abort window**, so the deadline under test is
  the real one rather than a pre-empted throw.

---

## 2. Latency

App-side cost, storage and provider I/O excluded and accounted separately.

| Phase (Design B) | initial row, 10 concurrent | stress row, 50 concurrent |
|---|---|---|
| Warm reopen p50 / p95 | 0.39 / 0.44 ms | 2.22 / 71.3 ms |
| Cold unique league p50 / p95 | 22.7 / 30.5 ms | 115.5 / 163.7 ms |
| Forced recompute p50 / p95 | 1.73 / 3.23 ms | — |
| Success rate | 100% | 100% |

Design A is 2.5–3× slower throughout (cold unique p95 75.0 ms initial, 439.6 ms stress).

**Stage attribution for one recompute:**

```
Design A:  auth 0.19  build_value 9.56  eligibility 1.02  recommend 5.44  render 1.16
Design B:  auth 0.18                    eligibility 0.81  recommend 4.49  render 1.16
```

`build_value` is the entire difference. It is league-independent, so B pays it **once
per refresh** (21 ms for all three scoring variants) instead of once per request.

### Against the §3 budgets

| Budget | Target | Measured | Verdict |
|---|---|---|---|
| Local interaction feedback | < 100 ms | 0 ms — native `<details>`, 0 KB client JS, no refetch | met by construction |
| Warm league open | p95 ≤ 1 s | 0.44 ms app-side; ~300 ms of network/DB still leaves 3× headroom | met |
| Recompute, core data available | p95 ≤ 3 s | 3.23 ms app-side | met, ~900× margin |
| Cold / provider-dependent | terminal state ≤ 10 s | catalog fetch 0.33 s; stall bounded at 2.08 s over 3 attempts | met |
| Admitted workload | ≥ 99% usable | 100% at both §2 concurrency rows | met |

The only case that misses 99% is deliberate over-driving: at 4× the declared admission
limit, 78% of requests receive an explicit **BUSY** response rather than being silently
dropped or served stale. That is the designed behaviour, and it is reported separately
from admitted-request latency as §4.C requires.

---

## 3. Memory

| | Design A | Design B | Design C (stress) |
|---|---|---|---|
| heapUsed after GC | 41.9 MB | **8.4 MB** | 528 MB |
| RSS under load (stress) | 314.4 MB | 260.5 MB | 733 MB |

The columnar catalog holds **299 KB of fixed-width columns + 155 KB of names** for all
12,227 identities. Names live in one backing string and are sliced lazily, so the ~12k
name strings are never all materialized — only the handful actually rendered.

**The important finding: peak RSS is dominated by the transient parse, not retained
state.** The provider ships the catalog as one 14.65 MB JSON object; `JSON.parse` builds
a 12k-object graph before a single field is read.

| Catalog ingest | peak RSS | settled RSS | heapUsed | time |
|---|---|---|---|---|
| Whole-document parse | 104.8 MB | 77.6 MB | 19.5 MB | 84 ms |
| **Streaming fold** | **71.0 MB** | **62.1 MB** | **9.1 MB** | 148 ms |

Verified to produce a byte-identical catalog. Cost: 64 ms more CPU, once per refresh.
Benefit: 32% lower peak. The same treatment applies to the projection payloads, which
are the larger share (3 × 5.6 MB).

### Soak — 22 minutes, 447,550 requests, 74,592 forced recomputes, 0 errors

| | |
|---|---|
| RSS, second half | **300.3 – 301.6 MB** (a 1.3 MB band) |
| heapUsed, second half | 23.9 – 115.9 MB — GC sawtooth, no drift |
| Board cache | pinned at its 200-entry / 2.3 MB cap throughout |
| Active handles | 0 → 0 |

No leak. RSS stepped up early as V8 grew its arena, then held flat. The +0.041 MB/min
regression slope is noise inside a 1.3 MB band.

**This soak is 22 minutes, not the two hours §4.D requires, and it ran alongside other
benchmarks — so its latency and event-loop-lag figures are contaminated by CPU
contention and should not be compared to §2. The memory figures are unaffected.**

### A cache result worth acting on

The soak cycled 600 leagues through a 200-entry LRU: **447,350 evictions and zero
hits.** An LRU sized below the active working set pays the full eviction cost and
returns nothing. Cache capacity must be provisioned against concurrent *active*
leagues, not total leagues — otherwise it is pure overhead.

---

## 4. Cost

Derived from measured resource quantities. Unit prices deliberately omitted: §6 requires
verifying contemporary prices from primary vendor sources before any real decision.

At the **stress row** (1,000 managers × 5 leagues, 3,571 boards/day):

| Design | CPU to serve | CPU to keep fresh | Storage | Peak RSS |
|---|---|---|---|---|
| A | 11.7 s/day | — | — | 314 MB |
| **B** | **4.5 s/day** | — | — | 261 MB |
| C | 0.3 s/day | **1,777 s/day** | 457 MB | 733 MB |

Design B serves the entire stress workload using **0.0052% of one core**, with 0.225 GB
egress and 6.3 GB ingress per month.

**So the bill is not compute or transfer. It is the minimum billable footprint of
whatever always-on runtime is chosen — and that is set by peak memory.** This is the
single most decision-relevant cost fact in the spike, and it is why the streaming-ingest
result matters more than any latency number here.

Design C is falsified on cost: keeping materialized boards fresh at 12 refreshes/day
costs ~30 CPU-minutes/day — roughly **400× Design B's total compute** — plus 457 MB of
storage that a single roster change invalidates.

---

## 5. Decision quality

### Scenario corpus — 13/13 (10 tuning, 3 held-out formats)

Every mandatory property in §5 asserted: stand pat when nothing helps; no fabricated cut
when a slot is open; net cost named for every cut; no offensive asset traded for a
streaming K/DEF edge; injured/reserved assets protected; no forced pick when a weak
position has no remedy; roster change invalidates a stale cut; missing projections shown
as uncertain rather than scored as zero; evidence age always traceable; rival fit hedged
as an estimate. Held-out superflex / deep / IDP leagues pass 6/6 structural invariants.

### Held-out backtest — 2025, 24 league-weeks

**Primary metric: realised starting-lineup gain from a complete move.**

| Arm | mean lineup gain | helped % | hurt % |
|---|---|---|---|
| **engine** | **16.44** | **97.8** | 2.2 |
| recent form | 6.48 | 45.8 | 0 |
| projection only | 4.60 | 45.8 | 0 |
| popularity | 4.32 | 43.1 | 0 |
| random | 1.37 | 25.0 | 0 |

**The engine is 2.5× the best baseline on the metric that matches the product's claim —
and it loses on the obvious metric.** Ranked by the added player's raw points, the engine
scores 26.3 against projection-only's 43.0. Those higher-scoring adds have a **median
lineup gain of zero**: they never crack the starting lineup. A points leaderboard
systematically recommends players you will not start. Worth stating plainly on the
product surface.

**Limits.** Sleeper serves *current* projections for past weeks, so the backtest is not
guaranteed point-in-time; every arm consumes the identical snapshot, so the comparison
is fair even where absolute figures may flatter. Leagues are synthetic. 24 league-weeks
ranks arms; it does not certify a points-per-week claim.

### Two real defects the spike caught

1. **Drop tie-break by roster order.** A bench player who does not crack the lineup
   contributes zero either way, so cutting a useful reserve and cutting an empty roster
   spot scored *identically*; the tie broke by array order. The board proposed cutting a
   starting-calibre RB when three worthless roster spots were available. Fixed by
   breaking ties on the standalone value of the player being cut. Measured effect:
   helped 95.6% → 97.8%, hurt 4.4% → 2.2%.
2. **Mutually exclusive moves presented as a plan.** Nine "strong" moves all required
   cutting the same player; acting on one invalidates the rest. Fixed by grouping on the
   cut, capping distinct cuts at the owner-preferred 2–4, and labelling the rest as
   alternatives. Side effect: board payload halved, 12 KB → 6 KB.

Neither is a performance bug. Both would have shipped.

---

## 6. Security and tenant isolation

| Probe | Result |
|---|---|
| Valid session, someone else's league id | 403 FORBIDDEN |
| No session | 401 |
| Forged signature | 401 (timing-safe compare) |
| After access revocation | 403 |
| Direct cache read by the wrong principal | denied |
| Cross-tenant attempt during an upstream failure | still 403 |

Private boards are keyed by principal **and** re-checked on read, so a league id alone
can never address another manager's board. Failure never widens access.

Failure suite: 13/13 — bounded retries, circuit breaker, degradation to a neutral
baseline when optional intelligence is missing, explicit uncertainty when core
projections are absent, honest 503s on store outage, no stuck in-flight work on
abandonment, idempotent duplicate job delivery (3 deliveries → 1 execution, 1 billable
unit), a hard spend cap, and a **demonstrated backup/restore** of unique data.

---

## 7. Architecture decision

**Selected: Design B.** Single runtime; columnar identity catalog; shared
league-independent value tables; thin private per-league step; server-rendered board;
bounded caches with single-flight and admission control; streaming ingest.

**Why it wins.** The sharing boundary is the whole bet, and it measured true: the
expensive work (projection decode, opportunity, form, availability) depends only on the
player and the period, so it costs 21 ms once per refresh and is reused by every league
and user, carrying no private data. What remains private is ~1.3 CPU-ms per board. That
turns a per-user cost into a per-refresh cost, and it is why B holds 8.4 MB of heap where
A holds 41.9 MB.

**What this does NOT justify.** A rebuild. At this workload the system is four orders of
magnitude away from being compute-bound. Rewriting working code to make it faster would
be optimising the one thing that is already free. The changes the evidence supports are
component-level: the sharing boundary, streaming ingest, admission control and
single-flight, cache sizing against the active working set, and the two decision-layer
fixes. Each is independently shippable behind the existing surface.

**What would falsify this decision:**

- Per-league work stops being thin — heavy per-league evidence processing or per-user
  model inference would move the cost back to per-request and change the answer.
- Supported scoring variants grow well beyond three, making "fold every variant" stop
  being a constant.
- Real concurrency arrives far above the §2 stress row, or leagues get much larger than
  16 teams × 60 players.
- A real league's waiver pool turns out much thinner than the modelled one, compressing
  the gap between the engine and a simple projection sort.
- The 2-hour soak, or a longer one, shows the RSS band drifting rather than holding.

**Evidence still missing:** the full §4.D soak; any point-in-time projection source for
an honest absolute backtest; real league fixtures under permission; Yahoo behaviour;
and current vendor prices.

---

## 8. Assumptions register

| Assumption | Status |
|---|---|
| Sleeper first, Yahoo gated on approval | from the brief |
| 100 managers × 3 leagues → 1,000 × 5; 10 → 50 concurrent | **provisional** (§2 hypothesis) |
| 5 board views per league per week | **provisional** — needs owner input |
| Catalog refresh 1×/day, projections 12×/day | **provisional** |
| Three scoring variants cover supported formats | **provisional** |
| Three-period horizon | from the brief (§ hypothesis) |
| Thresholds calibrated from the league's own starter distribution | spike choice, tunable |

Owner questions from the brief that remain open and gate the real decision: initial
supported formats (dynasty/IDP/deep), actual expected concurrency, monthly spend ceiling,
acceptable freshness during a provider outage, and which existing data must migrate.

---

## 9. Suggested delivery order

1. Cache sizing against active working set, and admission control with an explicit busy
   state. Smallest change, removes the worst failure mode.
2. The two decision-layer fixes (drop tie-break, mutual exclusivity). Correctness, and
   they halve the payload.
3. The sharing boundary: extract league-independent value into a shared, versioned
   snapshot. The one structural change.
4. Streaming ingest. Only worth doing once memory is the binding constraint on the
   hosting tier.

Run side by side against the live engine and compare on the scenario corpus before any
cutover. The live application stays untouched until an authorized cutover passes
acceptance.
