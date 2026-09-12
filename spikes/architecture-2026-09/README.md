# Architecture spike, September 2026

A throwaway Node prototype built before anyone had read this codebase, to find
out which constraints in a fantasy waiver board are physical (payload sizes,
decode cost, per-league compute, memory shape, decision quality) and which are
implementation choices. It answered that, and its conclusion — separate the
league-independent work from the private per-league work, and do not rebuild —
is the reason the assessment that followed went looking at
`build_fit_matrix` rather than at the stack.

## What is kept here, and what is not

Kept: [RESULTS.md](RESULTS.md), the measurements and the decision record, and
[HARNESS.md](HARNESS.md), the description of what was built to produce them.

Not kept: the prototype's own source, its benchmark harness and 85 MB of cached
Sleeper payloads. It was a parallel, dependency-free reimplementation of what
`waiver_priority` already does properly. Left in the tree it would read like a
second implementation somebody might maintain or trust, and its numbers came
from that implementation, not from this one.

## Where the real numbers are

Everything measured against the actual code lives with the code it measures:

- `waiver_priority/bench/TRACK_A_NOTES.md` — cold board attribution, provider
  stage, engine phases, snapshot store cost, poll contention
- `waiver_priority/bench/TRACK_B_NOTES.md` — the 432-decision 2025 backtest,
  rank quality, and scoring fidelity against Sleeper's own points
- `waiver_intelligence/bench/TRACK_C_NOTES.md` — evidence coverage, pipeline
  state, and the dollar cost of a real ingestion cadence

Prefer those. The figures in `RESULTS.md` describe the prototype, not this
system, and the two are not interchangeable.
