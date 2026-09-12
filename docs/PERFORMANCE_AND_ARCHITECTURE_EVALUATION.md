# WaiverOps — performance-first architecture evaluation

Prepared September 11, 2026. Use with [PRODUCT_BRIEF_ARCHITECTURE_NEUTRAL.md](PRODUCT_BRIEF_ARCHITECTURE_NEUTRAL.md). No technology or hosting topology is selected here.

## Decision objective

Choose an implementation that delivers useful, correct recommendations quickly at a justified total cost and is manageable by one operator. Performance means user-perceived responsiveness, cold-path behavior, predictable resource use, recoverability, and fresh/correct results—not simply requests per second or a large cache hit ratio.

**All workload numbers and targets below are proposed evaluation hypotheses.** They are not measured production demand, proven capacity, approved spending, or contractual service commitments. Amend them with the owner and preserve the assumptions beside benchmark results.

## 1. Frame the decision before choosing tools

Identify where time and memory go: external fetches, identity/catalog decoding, normalization, projection scoring, lineup computation, roster comparisons, evidence processing, persistence, serialization, transfer, and rendering.

For each expensive operation ask:

- How often do its inputs change versus how often is its output requested?
- Can the work be avoided, shared, incrementally updated, scheduled, or done once on demand?
- What is its smallest correct data representation and dependency set?
- Is it needed for the first useful screen, or can it arrive later without misleading the user?
- What happens when ten callers request the same work, or ten different pieces of work?
- What survives a restart and what is safe to recompute?

Compare at least two credible designs. Include a low-operational-complexity baseline and an alternative that addresses a demonstrated bottleneck. Consider one versus multiple deployments, reuse versus rewriting, rendering location, computation timing, storage, cache sharing, and workload isolation as decisions—not slogans.

## 2. Representative workload matrix

| Dimension | Initial scenario | Stress/edge scenario |
| --- | --- | --- |
| Managers and leagues | 100 managers, three leagues each | 1,000 managers, five leagues each; size storage/preparation work, not all concurrent |
| Concurrent interactive users | 10 | 50 around a waiver deadline |
| Teams per league | 10–12 | 16–32 |
| Players per roster | 15–25 | 40–60 with reserve/developmental slots |
| Eligible evaluation candidates | 400–800 | 1,500–3,000 for deeper/IDP cases |
| Provider identity catalog | 15,000 entries with mostly irrelevant metadata | 50,000 to expose accidental full-catalog work |
| Projection horizon | Three periods | Missing periods, rule changes, irregular data |
| Usage distribution | Reopen unchanged leagues; filter/expand views | Cold unique leagues, repeated refresh, simultaneous same-key requests |
| Evidence | Shared recent evidence with duplicates/conflicts | Backfill and burst ingestion while interactive traffic continues |

These ranges are synthetic test fixtures, not claims about provider limits or actual league availability. Use real representative payload shapes under permission where possible. Include superflex, deep benches, injuries, reserves, missing projections, and unsupported scoring. Preserve anonymization and source usage rights.

Test both shared league/source data across users and distinct user-specific recommendations. Account count alone says little about concurrent computational demand.

## 3. Proposed user-visible and resource budgets

Measure percentiles over a declared sample count, with failures/timeouts included rather than discarded. State hardware limits, regions, browser/device, network conditions, dataset, background load, cache state, and deployment count.

| Measurement | Proposed starting target | Definition |
| --- | --- | --- |
| Local interaction feedback | Within 100 ms | Expand/collapse/filter acknowledgment; no data refetch required just to disclose existing content |
| Warm league open | p95 ≤ 1 second | Click to useful roster/recommendation content with valid reusable inputs; includes network and render |
| Recompute with core source data already available | p95 ≤ 3 seconds | User action to coherent new decision; not only algorithm CPU time |
| Fully cold/provider-dependent open | Useful status within 200 ms; terminal usable/degraded/busy state within 10 seconds | A proposed waiting budget, not a promise that external providers finish within it; separate time-to-result from time-to-error |
| Normal admitted workload | ≥ 99% successful usable responses with healthy dependencies | Report busy rejection and wrong/stale responses separately; fast errors do not satisfy successful latency |
| Steady memory | ≤ 70% of selected memory allocation | All applicable processes and relevant sidecars counted; document shared infrastructure separately |
| Peak memory | ≤ 85% at planned concurrency | Leave headroom for fetch/serialization spikes; no hidden swap or enlarged test limit |
| Retained memory after warm-up | No sustained growth under repeated comparable work | Report start/end/slope and bounded cache population; not merely one garbage-collection snapshot |

These targets may conflict with cost or correctness. If they are infeasible, provide measurements and a tradeoff rather than silently weakening them. Set browser payload and script budgets after measuring a minimal vertical slice; include transfer/decompression/parse costs in the decision.

Monthly spending ceilings and uptime/recovery objectives require owner input. Present estimates under several cost scenarios, but do not treat an estimate as spending permission. Initial small-scale responsiveness must not depend on buying excessive idle capacity.

## 4. Required experiments

### A. One end-to-end vertical slice

Use a single authorized or synthetic league to go from input loading through a coherent recommendation to a rendered usable view. Include ordinary account authorization and serialization. Benchmarking an isolated function or static page is insufficient.

### B. Cache and work-reuse behavior

Exercise:

1. Unchanged repeated requests.
2. The same expensive request arriving concurrently.
3. Distinct leagues arriving concurrently.
4. A roster change with unchanged projections.
5. Updated projections/evidence with unchanged roster.
6. Old data arriving after newer data.
7. Expiration, eviction, corrupted entries, unavailable cache, and restart.

Verify keys/dependencies include all inputs that affect a result and its authorization. Show hit rates, avoided provider calls, freshness, invalidation latency, and memory/storage cost. Maximal caching is **not** the objective; correct bounded reuse is.

Consider whether user-independent work can be reused independently of private roster decisions. Explain why invalidation will not invalidate everything unnecessarily or miss critical changes. Cached tenant data must never be keyed only by a conveniently shared league ID if that permits unauthorized access.

### C. Load, burst, and saturation

Run the initial and stress scenarios, including unique cold work—not just repeated hot keys. Test deadline bursts and providers returning slowly. Declare queue/concurrency limits and what users see when capacity is exhausted. Measure rejected/busy requests as well as admitted-request latency.

Do not satisfy latency goals by silently dropping requests, reducing recommendation correctness, or serving old results without labeling them. Report CPU, memory, dependency requests, connections, and cost alongside latency.

### D. Memory and resource stability

After warm-up, run at least a two-hour representative soak plus a repeated-computation loop. Capture resident memory over time, cache bytes/entry counts, open connections/descriptors, active tasks/timers, and request lifetimes. Include canceled navigation and abandoned requests.

Memory growth from a filling bounded cache is different from a leak. Once stable workload and bounded caches reach equilibrium, sustained retained growth needs an explanation. Inspect raw payload lifetime, duplicate object graphs, background task retention, and cleanup. Do not claim “leak-free” from one short test.

### E. Failure and recovery

Inject provider timeout/rate limit, missing/invalid/stale optional intelligence, core-data failure, database or cache outage, interrupted processing, and duplicate job delivery. Confirm bounded retries, honest UI, tenant isolation, spend controls, and a documented recovery path.

Demonstrate backup and restore for unique data. A durable disk claim is not a restore test. If external paid APIs cannot guarantee exactly-once billing, identify that limitation and the mitigations rather than promising impossible semantics.

## 5. Decision quality is a release gate

Before optimizing, assemble a reviewed scenario corpus with expected decision properties:

- No materially useful move -> stand pat.
- Legal add with open slot -> no fabricated cut.
- Attractive add with expensive cut -> reject or clearly explain net cost.
- Small streaming gain -> do not sacrifice a valuable offensive asset.
- Unavailable/reserved player -> follow explicit supported-format safety rules.
- Weak position but no eligible useful free agent -> no forced recommendation.
- Updated roster -> old suggested cut cannot persist as if still rostered.
- Unknown/missing data -> uncertain/degraded, not fabricated zero or false availability.
- Duplicate/conflicting/stale evidence -> conservative, traceable handling.
- Rival fit -> estimate, never assertion of actual claim intent.

Record numerical tolerance and ranking changes where an old engine exists. Improvements may intentionally differ from legacy behavior, but need a documented rationale. Do not use agreement with a known bad legacy output as the only quality criterion. Keep a held-out scenario set so tuning does not merely memorize examples.

## 6. Cost and operational comparison

For each design report:

- Fixed monthly infrastructure plus usage-sensitive storage, compute, transfer, logs, identity, and backup costs.
- Paid data/media/model processing separately, with realistic request/retry assumptions.
- Cost per active manager/league refresh under the same workload.
- Operator time: deployment, dependency upgrades, secrets, incidents, restores, and local debugging.
- Capacity boundaries and the next scale-up step; distinguish measured limits from estimates.
- Data export/recovery, vendor dependencies, and difficulty moving later.

Verify contemporary prices/limits from primary vendor sources when making an actual architecture recommendation. This document intentionally contains no price-based vendor recommendation.

## 7. Evidence-based selection

Reject designs that cannot meet decision integrity, tenant isolation, bounded costs, or durable unique-data requirements. Then compare the remaining alternatives under the **same** workload and test conditions.

Suggested decision priorities, subject to owner review:

1. Correct useful decisions and safe failure behavior.
2. Responsiveness and predictable resource use at actual initial demand.
3. Simplicity and affordability for one operator.
4. Maintainability, observability, and recovery.
5. Credible growth path without speculative complexity.

Prefer the simplest sufficient design supported by evidence. More services, a newer language, or a bigger cache are not inherently faster. Neither is a rewrite inherently worse: justify reuse and replacement at the component level using measurements, domain risk, and total migration cost.

## 8. Required deliverables before a full rebuild

1. Assumptions/unknowns register, with owner-confirmed versus provisional values.
2. Two or more alternatives, logical responsibility/data-flow diagrams, failure boundaries, and tradeoffs.
3. Reproducible end-to-end prototype and benchmark harness with representative fixtures.
4. Latency/resource/cost results, decision-quality comparisons, and unresolved risks.
5. Selected architecture decision record: why it wins, what would falsify the decision, and which evidence is missing.
6. Incremental delivery plan, migration/import/export strategy, compatibility needs, rollback, and restore procedure.
7. Security/privacy review and limits for automated/paid processing.

Do not perform a big-bang replacement merely to make the implementation cleaner. Decide whether side-by-side comparison or incremental replacement reduces risk. The live application remains untouched until an authorized cutover has passed acceptance.

## Avoid architecture anchoring during handoff

For an independent first proposal, give the design team only this document and PRODUCT_BRIEF_ARCHITECTURE_NEUTRAL.md. Ask them to record assumptions and candidate architectures before reading implementation-specific documentation.

Then provide the current-state/source documentation to uncover domain edge cases, actual measurements, and migration constraints. Independence is not a reason to discard useful evidence; it is a reason to separate evidence from inherited design choices.
