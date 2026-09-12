# WaiverOps architecture spike

A reproducible end-to-end prototype and benchmark harness, built to test the
riskiest assumptions behind a rebuild **before** committing to one — the
deliverable called for in `PERFORMANCE_AND_ARCHITECTURE_EVALUATION.md` §4 and §8.3.

It is a **measurement instrument, not a proposed stack.** It is written in
dependency-free Node ESM specifically so that no framework is on trial: what it
measures are the physical constants of the problem (payload sizes, decode costs,
per-league compute, memory shape, decision quality), which carry over to whatever
runtime is eventually chosen.

## What it does

One vertical slice, for real: session authorization → provider data loading →
league-aware recommendation → server-rendered board, with every stage timed.

Three designs behind one interface, run against an identical workload:

| Design | Shape |
|---|---|
| **A** | On-demand baseline. Provider payloads parsed and retained; every request re-derives value. Nothing shared between leagues. |
| **B** | Columnar catalog + shared league-independent value tables; thin private per-league step. Raw payloads released after folding. |
| **C** | Fully materialized board per (league, roster), served from storage. |

## Data

- **Real** Sleeper player catalog, projections and observed stats (public, non-personal).
- **Synthetic** leagues drafted near-greedily by provider rank, so the waiver pool
  resembles a real one. No real manager's private league data is touched.
- Fixtures are cached under `data/` on first run; the full catalog is fetched once,
  in line with the provider's own guidance.

## Running

```bash
node bench/01_vertical.js    # §4.A  vertical slice, per design, isolated processes
node bench/02_cache.js       # §4.B  the seven cache/reuse cases + tenant isolation
node bench/03_load.js        # §4.C  load, burst, saturation across both workload rows
node bench/04_soak.js --minutes=120   # §4.D  memory and resource stability
node bench/05_failure.js     # §4.E  failure injection and recovery
node bench/06_quality.js     # §5    decision-quality gate + held-out backtest
node bench/07_ingest.js      #       whole-parse vs streaming ingest (peak memory)
node bench/08_cost.js        # §6    resource/cost model from measured results
```

Run with `--expose-gc` where memory is being measured. Results land in `results/`.

## Measurement notes

- **Each design is benchmarked in its own process.** Running them in one process
  contaminates resident memory with whatever the previous design left reachable.
- **Storage latency is forced to 0 in latency runs.** Windows timer granularity
  (~15.6 ms) is coarser than an entire request, so a simulated network wait would
  dominate and hide the app cost. Storage and provider round trips are measured
  separately and added back analytically.
- **Peak RSS is sampled, not inferred from settled state.** The transient parse
  peak is what sets the memory tier you must provision.
- **Failure injection stalls inside the abort window**, so the deadline under test
  is the real one rather than a pre-empted throw.

## Layout

```
src/
  providers/sleeper.js   provider adapter: deadlines, bounded retry, breaker, fault injection
  core/catalog.js        identity catalog, columnar + naive representations, eligibility policy
  core/ingest.js         streaming top-level JSON scanner (avoids the whole-document parse peak)
  core/league.js         synthetic league fixtures across supported formats
  core/value.js          league-INDEPENDENT shared player value (the sharing bet)
  core/recommend.js      league-DEPENDENT complete-move recommendation + safety rules
  cache.js               bounded LRU, single-flight, version guard, tenant scoping, admission control
  auth.js                session verification + league membership authorization
  render/board.js        server-rendered board and explicit terminal states
  designs.js             designs A / B / C behind one interface
bench/                   the experiments above
```

## Known limits

- The soak reported in the results is shorter than the two hours §4.D asks for.
- Sleeper serves *current* projections for past weeks, so the backtest is not
  guaranteed point-in-time. Every arm consumes the identical snapshot, so the
  comparison between arms is fair even where absolute figures may be optimistic.
- Leagues are synthetic. Ownership is modelled, not observed.
- Yahoo is not exercised at all: it is gated on access approval, and no design
  here assumes that approval exists.
