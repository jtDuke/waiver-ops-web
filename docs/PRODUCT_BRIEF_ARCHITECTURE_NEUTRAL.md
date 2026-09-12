# WaiverOps — architecture-neutral product brief

Prepared September 11, 2026. Audience: an independent product/engineering team or LLM evaluating a performance-first rebuild.

## Purpose and authority

Design the most appropriate implementation of this product **without inheriting its current architecture**. This brief is self-contained. It does not require a particular language, framework, database, cloud provider, identity vendor, number of repositories, service count, rendering strategy, or deployment model.

The existing product is evidence about user needs, not proof that its implementation is optimal. A modular application, multiple services, precomputed views, on-demand computation, or a hybrid may all be reasonable proposals. None is the default winner. Even rewriting or reusing the existing calculation engine is a decision to justify, not a predetermined rule in this brief.

This document specifies outcomes and constraints, not authorization to deploy, incur charges, obtain private data, scrape unlicensed sources, delete stores, or replace the live product. The companion [PERFORMANCE_AND_ARCHITECTURE_EVALUATION.md](PERFORMANCE_AND_ARCHITECTURE_EVALUATION.md) defines how to evaluate proposals.

### Requirement labels

- **Required outcome:** the product must deliver it regardless of technology.
- **Owner preference:** preserve unless a demonstrably better experience is proposed and approved.
- **Hypothesis:** an initial assumption to test, not a proven fact or contractual target.
- **Future scope:** design for a plausible extension, but do not build it merely because it is listed.

## Product and users

WaiverOps helps a fantasy-football manager answer: **“Should I change my roster, who would I add or drop, and why is that move worth making in my league?”**

The product serves managers who want useful, explainable decisions rather than an overwhelming list of players or tiny numerical improvements. It must be practical for one owner to operate, understand, debug, and afford. Low operational burden is a first-class requirement, not an afterthought.

The initial useful release supports one fantasy provider and multiple leagues per manager. Sleeper is the established initial integration requirement. Another provider, Yahoo, is a future integration gated by access approval; no architecture may assume that approval exists. These are domain integrations, not mandated infrastructure vendors.

## Required outcomes

### 1. Connect a manager to their leagues

- Provide secure sign-in and private account preferences.
- Connect the manager's fantasy-provider account using a legitimate supported flow.
- Discover accessible leagues, allow selection of a preferred/default league, and show understandable connection failures.
- Respect access revocation and changed league membership. Browser navigation or knowledge of a league ID is not authorization.

### 2. Recommend complete, useful roster decisions

- Account for each league's scoring, roster ownership, lineup slots, roster capacity, relevant availability rules, and available players.
- Compare a complete proposed roster change with the current roster. Adding a player is not a free improvement if dropping someone creates a larger loss.
- Explain next-period impact and a clearly labeled multi-period outlook. Distinguish totals, averages, weighted averages, and uncertainty.
- Support an open roster slot without inventing a drop.
- Recognize that no transaction can be the best answer. Do not fill a recommendation quota with trivial gains.
- Distinguish a weak roster position from an actionable improvement that is actually available.
- Protect scarce, injured, reserved, developmental, and strategically valuable roster assets from simplistic low-projection cut logic. Rules must be explicit and tested for supported league formats.
- Do not recommend cutting an offensive bench asset just to capture a negligible kicker/defense streaming edge.
- Separate strong/useful actions from marginal watchlist ideas. Proposed thresholds must be calibrated and explainable, not arbitrary constants presented as truth.

There is **no mandated ranking algorithm**. Legal lineup optimization, heuristics, predictive models, or combinations may be evaluated. A fast approximation must document where it differs and prove acceptable decision quality. A numerical score alone is not an explanation.

### 3. Explain the evidence behind a decision

- Aggregate related information about a player across podcasts, written articles, and other authorized sources.
- Treat format as provenance, not as a reason to value a source more or less. Meaning, reliability, independence, confidence, timing, and relevance matter.
- Preserve source identity/link, publication time, ingestion time, supporting material when permitted, and identity-resolution confidence.
- Resolve duplicate reports and conflicting evidence conservatively. A repeated syndicated report is not independent corroboration.
- Link player-related and teammate-related evidence without inventing causal claims.
- Produce concise player summaries from the relevant evidence. Generated prose must not become unsupported new evidence.
- Any recommendation adjustment must be traceable to structured inputs and an explainable policy, not an unbounded interpretation of summary text.
- If optional intelligence is missing, invalid, or too old, show a neutral baseline recommendation when core data remains usable. Do not fabricate freshness or silently trust stale hard-status claims.

Core league/roster/projection failure is different from optional news failure: if the core inputs cannot support a safe recommendation, show an explicit degraded or unavailable state.

### 4. Provide league context without clutter

- Let the manager inspect their current roster without dominating the page.
- Highlight only a small number of possible cuts tied to useful proposed pickups. Two to four is an owner preference, not a quota. Identify current/provider slots versus modeled starters.
- Show platform-wide trending available players and league-specific completed transactions as different concepts.
- Identify which league teams made transactions, what changed, and when.
- Explain potential rival fits while making clear these are estimates, not knowledge of actual claim intent.
- Prefer useful offensive-position context over lists dominated by kickers/defenses. A combined two-to-three K/DEF preview limit is an owner preference.
- Make sections and extra detail expandable. A player-search feature, if proposed, must clearly state what it searches; do not disguise filtering a short recommendation list as a complete player search.

### 5. Make waiting understandable

- Common navigation and previously analyzed leagues should feel fast.
- Show immediate acknowledgment of user actions; prevent duplicate submissions.
- If work takes time, maintain a stable progress/status surface, not flashing placeholder containers.
- Show real stages where available. Never imply a made-up percentage is measured progress.
- Bound waiting, retries, and queued work. Users can leave or retry without creating runaway duplicate work.
- Distinguish no useful moves, missing data, service busy, provider unavailable, expired session, and forbidden access.

## Logical information model — not a physical schema

| Concept | Essential meaning |
| --- | --- |
| Manager identity and preferences | Stable private identity, provider connections, chosen leagues/settings |
| League snapshot | Rules, season/period, teams, ownership, rosters, source version and time |
| Player identity | Stable identifiers and cross-provider mappings; ambiguous identities remain unresolved |
| Player eligibility | Relevant position/status and league-specific eligibility; not only popularity/rank |
| Projection or observed statistic | Value, units, time period, source, completeness, version |
| Source item and evidence | Provenance, publication/ingestion timestamps, structured claim, confidence, affected identities |
| Intelligence assessment | Derived evidence-backed summary/signals, policy version, freshness, provenance |
| Recommendation | Proposed change, baseline comparison, impact, uncertainty, rationale, relevant input versions |
| Market trend / transaction | Platform-wide aggregate versus identified league event; not inferred intent |
| Processing / usage record | Work identity, attempt/outcome, billable usage, retry history when needed |

One physical store, several stores, relational tables, documents, files, or another design may implement these concepts. Select according to measured workload, consistency, security, recovery, and operational needs. Do not equate a logical boundary with a requirement for a separately hosted service.

## Freshness and correctness

Define freshness per input type and user decision. A refresh of a cache wrapper is not new source information. Keep source timestamps distinct from fetch, processing, and presentation times.

**Hypotheses to evaluate:** a short recent-content discovery window (around two weeks), minute-scale refresh for volatile league/market data, and hour-scale expiry for optional intelligence. The current product's specific freshness limits and scoring thresholds are not mandatory in this brief.

Required behavior: callers see a coherent result based on identifiable inputs, not a partly updated recommendation. Changes in roster, rules, projections, or material evidence must eventually invalidate affected results within an explicitly justified policy. Define how a roster change immediately before a claim could make a saved recommendation unsafe.

Retain the ability to reproduce a decision sufficiently for debugging and quality evaluation without retaining all raw personal/media data forever. Set retention policies deliberately.

## Relevant players and efficient data use

Most offensive fantasy attention centers on hundreds of players. **Do not turn that observation into an unconditional 500-player database limit.** Deep leagues, developmental rosters, injured players, defenses, and individual defensive player formats can exceed that scope.

Separate the cost of identity lookup from the cost of active evaluation. Propose a relevance policy based on supported league rules, rostered identities, eligibility, current projections, and credible evidence. Avoid processing historical metadata that cannot affect a decision. Unknown/missing records should cause conservative behavior, not accidental player deletion or false free-agent status.

Determine whether work can be shared across leagues and users without leaking private data. Popularity is not a substitute for eligibility or correctness.

## Security, cost, and operability

- Private account/league data must be isolated between users, including caches, background results, logs, and error messages.
- Keep provider credentials and infrastructure secrets out of browser code, public artifacts, analytics, and handoff documents.
- Use least privilege, secure sessions, authenticated/authorized refreshes, bounded request processing, and data deletion/revocation policies.
- Durable user data and paid processing history must survive expected restarts. Rebuildable caches and unique records need different recovery treatment.
- Repeated delivery, process crashes, and retries must not silently duplicate expensive work or apply a mutation twice. External billing guarantees must be described honestly.
- Expensive media/model work must not make interactive requests wait on ingestion or prevent a manager opening a league. The isolation mechanism is open for design.
- Owner-approved spend caps, usage visibility, retry limits, and stop controls are required before unattended paid work.
- A single operator must be able to trace a failed request, identify stale inputs, roll back a release, and restore important data using documented procedures.

## Future scope and exclusions

Potential later inputs: custom/industry rankings, recent fantasy finishes and general statistics, explicit teammate dependencies, longer-horizon roster value, and richer historical calibration. Do not describe these as already delivered or add them all to the initial critical path.

Automatic claim execution, autonomous trades, unsupported provider integration, and paid data acquisition are outside initial scope. A separate mobile application, exact reproduction of the old design, and preservation of old repository/service boundaries are not required.

## Open questions for the owner

Before committing to an architecture or migration, establish:

1. Initial supported league formats, including dynasty, deep benches, and IDP.
2. Expected managers, leagues per manager, refresh frequency, and peak concurrent activity—not only registered accounts.
3. Maximum monthly infrastructure spend, separate paid-data/model spend, and acceptable operating time.
4. Acceptable freshness and waiting time during a provider outage or synchronized waiver rush.
5. Which existing user data, evidence, and behavior must migrate versus be rebuilt.

Until answered, use the companion evaluation document's explicitly provisional scenarios. Do not make these unknowns invisible assumptions.

## Instructions for an independent design team or LLM

> Design a performance-first implementation of WaiverOps from this product brief and PERFORMANCE_AND_ARCHITECTURE_EVALUATION.md. Do not assume any existing stack, language, database, host, repo count, or service decomposition is preferred. Preserve user outcomes, decision integrity, security, affordability, and single-operator practicality.
>
> Separate requirements from hypotheses. Propose credible alternatives, model representative workloads, identify the dominant costs, and test the riskiest assumptions with a small end-to-end experiment before a full rebuild. Explain tradeoffs, measured results, remaining uncertainty, and why the selected design is the simplest sufficient option. Do not use framework popularity or a hello-world benchmark as evidence of product performance.
>
> First produce a decision brief and validation plan, not a wholesale implementation. Obtain authorization before deployment, paid processing, or destructive migration. If existing source is later supplied, use it to understand domain edge cases and migration needs; do not silently inherit its architecture or claim exact parity without tests.
