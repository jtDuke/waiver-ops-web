# WaiverOps website — rebuild specification

Prepared September 11, 2026 against the September 10 release. Read [CURRENT_STATE.md](CURRENT_STATE.md) first. This is a specification of the existing product, not an instruction to deploy or redesign it.

## Reproduction scope

**Preferred:** restore the three repositories at the baseline commits in CURRENT_STATE. Keep the tested Python recommendation engine and API contracts. Rebuilding the frontend does not require rewriting the engine or producer.

**Documents only:** recreate the experience against a deterministic synthetic API first. Label it a prototype until real authentication, authorization, providers, and recommendations are implemented and verified. Prose cannot guarantee exact engine parity.

For the most reproducible handoff, supply these documents plus `package-lock.json`, `src/lib/api/contracts.ts`, `tests/fixtures/mock-api.mjs`, API OpenAPI output, Python engine/tests, migrations, and screenshots. Never include environment files, credentials, cookies, real league records, or database dumps.

## Stack and boundaries

- Existing frontend: Next.js 16.3.4 App Router, TypeScript, React 19.2.8, Zod, Auth0 Next.js SDK. These are dated baseline versions, not a reason to ignore security updates.
- Custom CSS in `src/app/globals.css`; not a Tailwind or component-library implementation.
- Server Components render pages and access the API. Client Components handle forms, navigation feedback, retry controls, and progress.
- Browser requests stay within the web application's session boundary; Next.js calls FastAPI server-side. Never expose database credentials, provider tokens, or application-session material to browser JavaScript.
- FastAPI owns business logic and tenant authorization. Do not create a second recommendation engine in Next.js.
- Read AGENTS.md and the installed Next.js documentation before changing code; do not assume older Next.js APIs apply.

## Visual system

Quiet, analytical fantasy-football software: warm-gray canvas, dark green navigation, restrained emerald accents, rounded white cards. Avoid a gambling aesthetic, gratuitous animation, and crowded metric dashboards.

| Token | Value |
| --- | --- |
| Canvas / surface | `#f4f5f2` / `#ffffff` |
| Muted surface / dark shell | `#f0f2ee` / `#121a17` |
| Main / muted text | `#15201c` / `#65706b` |
| Border | `#dde1dc` |
| Accent / dark accent / soft accent | `#15b87a` / `#0d875a` / `#dff7ec` |
| Warning / soft warning | `#b66a08` / `#fff1d9` |
| Main radii | 8 / 14 / 20 px |
| Main shadow | `0 18px 50px rgba(24,37,31,.07)` |

Geist Sans and Geist Mono are loaded through `next/font`; body fallback is Arial/sans-serif. Use large league titles, quieter subtitles, small uppercase section labels, clear player names, and monospaced point deltas. Drop highlights are static pale amber with a dark amber edge **and explicit text**, never color alone.

Desktop: 248 px dark sidebar, sticky full-height navigation, flexible main column. Mobile: compact header and bottom navigation with content clearance. Existing breakpoints are 980 px and 720 px. Source CSS governs exact spacing; screenshots do not replace responsive behavior.

Maintain skip-to-main navigation, visible keyboard focus, semantic headings, labeled inputs, comfortable 44 px touch targets, reduced motion, and no horizontal overflow. Pulse typography is currently small and remains a polish opportunity.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public product home; headline “Know why before you claim.”; sign-in/open-dashboard journey |
| `/privacy`, `/terms` | Public disclosures; accurate owner/contact information, no invented legal assurances |
| `/dashboard` | Authenticated overview and useful league/connection links |
| `/connections` | Sleeper username connection form and discovery feedback |
| `/leagues` | Loaded leagues, default-league selector/save action, board links |
| `/leagues/[provider]/[leagueId]` | Main league board |
| `/players/[playerId]?name=...` | Ranked player evidence; ID is authoritative, name is only a display hint |
| `/auth/sync`, `/auth/session-error`, `/logout` | Server-side identity exchange, bounded recovery, logout |
| `/connections/yahoo/start`, `/connections/yahoo/callback` | Existing provider boundary, not an approved live Yahoo feature |
| `/api/recommendation-progress/[provider]/[leagueId]` | Authenticated progress adapter; reads progress, never starts analysis |
| `/settings`, `/intelligence` | Retired placeholders redirect to `/connections` and `/leagues` |

Primary navigation exposes Dashboard and Leagues. Connections are reachable through account/add-connection actions. Do not advertise a global player explorer or unfinished settings/intelligence dashboard.

## Core flows

### Connect and select

Enter a Sleeper username, submit with duplicate-submission prevention, discover leagues server-side, and navigate to the league list with a success/count message. Preserve useful errors. Default league selection persists through the API, not only browser storage.

### League board, top to bottom

1. Provider/season/week eyebrow, league title, manager-team subtitle, Refresh league action.
2. **Your roster:** compact native disclosure, collapsed initially. Summary includes team and player count. Expanded groups: Starter, Bench, IR, Taxi. These are provider-designated slots, not projected optimal starters. Show name, position, NFL team or FA.
3. **League Pulse:** native disclosure, expanded initially, above recommendations. Three columns on desktop, stacked on mobile.
4. **Best Moves for This Roster:** expanded disclosure, useful-move count, filters, cards or empty state.
5. **Small Edges:** collapsed when marginal moves exist; at most ten matching cards.
6. Back to all leagues.

Do not restore the removed top callouts for roster weakness, league rank, best waiver position, or intelligence status.

### Drop highlighting

- Derive from primary recommendations, not watchlist entries or arbitrary low-projection roster members.
- Require `data_complete=true`, `recommended_drop`, and `drop_confidence` equal to `high` or `medium`.
- The drop ID must be on the current roster and not IR/Taxi.
- Keep at most four unique IDs in recommendation order; never pad the list.
- Multiple pickups can reference one cut. Label “Possible cut with a pickup,” followed by up to three corresponding pickup names.
- Explain that this is not standalone drop advice. If no safe pair qualifies, show no highlight.

### League Pulse

**Sleeper-wide trends:** available players added across Sleeper in the specified lookback window, normally 24 hours. Name, position, add count; ten initially, expand up to thirty. Distinguish empty results from unavailable source.

**Your league moves:** completed waivers/free-agent transactions, newest first. Show team names, all added/dropped names, and supplied timestamp. Current format explicitly uses UTC. Missing timestamps remain absent; do not guess owners.

**Rival opportunities:** unchanged API gains, non-K/DEF positions first, up to eight such rows and two K/DEF combined. Include position, modeled pts/week, team count, and supplied top team names. State that this is modeled fit, not claim intent.

### Recommendation cards

At most twelve matching primary cards. Each has rank, category, competition, meaningful-news badge when applicable, player name/position/team/age, usefulness tier, pickup/cut or open-slot text, and net-move explanation.

Show **net next-week points** and **net weighted three-week average in pts/week**, not a three-week total. Prefer `net_next_week_gain` and `net_lineup_gain`; use older compatible gain fields only when net fields are absent.

Collapsed “Why this move” reveals meaningful summary and evidence link, or an honest projection-driven explanation, plus supplied rival context. Do not invent news to fill an empty section.

Filters are URL-backed GET state: position, recommendation category, meaningful-news checkbox, Apply Filters, Clear. There is no player-name search. Obsolete `q` parameters must not silently hide cards. Distinguish “no matches” from “no useful moves”; the latter recommends standing pat.

## Loading and failures

One stable progress surface, revealed after 150 ms to avoid fast-cache flashing. Five stages:

1. Checking saved analysis.
2. Loading league and rosters.
3. Loading projections and intelligence.
4. Evaluating add/drop pairs.
5. Preparing the priority board.

Progress polling begins after 300 ms, then about one second after each completed request without overlap. Per-fetch abort: five seconds. Polling deadline: 60 seconds. Cancel on unmount and stop on complete/failed. After eight seconds explain the wait honestly. Numerical progress must come from real backend progress, not simulated percentages.

Recommendation requests share a 45-second total budget beneath a 60-second route limit. Retry 502/503/504 once only when bounded Retry-After and remaining budget permit; release response bodies before waiting. Manual retry has cooldown/pending protection and preserves league/filter context. No infinite retries.

An unavailable board gets an explanatory panel, back link, and retry when appropriate. Say that the roster has not changed. Differentiate unavailable, busy, not-ready, and unauthorized states. Never reveal whether another user's league exists.

## API contract

Base `/api/v1`. Exact definitions: API `waiver_api/models.py`, web `src/lib/api/contracts.ts`, and `/api/openapi.json`. Dynamic nested recommendation data needs the Zod schema and fixtures as well as OpenAPI.

| Method | Path | Purpose |
| --- | --- | --- |
| POST / DELETE | `/auth/session` | Verified identity exchange / application logout |
| GET | `/me`, `/connections`, `/leagues` | User and owned context |
| POST | `/connections/sleeper` | Connect and discover |
| GET / PATCH | `/preferences` | Read/save preferences |
| GET | `/leagues/{provider}/{league_id}/recommendations` | Recommendation response |
| POST | `/leagues/{provider}/{league_id}/refresh` | Explicit refresh/invalidation |
| GET | `/leagues/{provider}/{league_id}/recommendation-progress` | Current progress only |
| GET | `/players/{player_id}/intelligence` | Player evidence |

Recommendation envelope: provider, league ID, week, league object, availability/reason, nullable recommendation view, league pulse, source warnings, intelligence status, optional cache/timing metadata.

View: target roster ID/team strength, recommendation/direct/primary/watchlist/strategic lists, and `roster_players[]` containing `{player_id, name, position, team, slot}`. Prefer primary list, direct list as compatibility fallback. Old responses can omit roster/Pulse details: default safely without fabricating records.

Cards include identity/category/tier/reason/competition strings; nullable team/age/status; numeric projection/gain/signal values; completeness/signal flags; nullable player signal; completeness notes; optional net gains/drop; rival counts/list. Use the actual Zod schema rather than replacing it with permissive parsing based on this summary.

Pulse carries lookback, separate source statuses, trend rows, transactions (`team_names`, `created`, adds/drops), and rival rows (gain/top teams). Intelligence includes enabled, fingerprint, generated time, warning. Metadata includes engine version, generation time, cache status/layer/age, source fingerprint, timings.

## Security requirements

Auth0 Regular Web Application -> server-side ID-token exchange -> FastAPI validates issuer/audience/JWKS -> internal user and signed HTTP-only application session. Hosted cookies are secure. Tenant authorization is checked in API operations, not just navigation.

Keep `WAIVER_API_BASE_URL` server-only. No secrets in `NEXT_PUBLIC_*`. Exact approved CORS origins only. Runtime DB role differs from migration owner. Intelligence failure is neutral; authentication failure is closed. Mock/development identity is never production authentication.

## Acceptance criteria

- Public pages and authenticated flows work on desktop and 390 px mobile.
- Sleeper connect/discover/default-league flow passes fixtures, then authorized live acceptance.
- Roster highlights are qualifying, unique, capped, actually rostered, and not IR/taxi.
- Pulse is higher/open, expands trends, identifies transaction teams, caps K/DEF.
- Best Moves collapses by keyboard/pointer; filters work; old player search is absent.
- Units, evidence, and rival descriptions are truthful.
- Empty/malformed/stale/busy/unauthorized states never fabricate data.
- Opening disclosures causes no new catalog fetch, provider call, or calculation.
- No horizontal overflow, lost focus, flashing loading loop, or lingering polling.
- Typecheck, lint, build, client-boundary checks, and browser tests pass.
- Backend changes preserve engine tests and tenant isolation. Tests mock paid APIs.

## Copy-ready LLM brief

> Recreate WaiverOps using this specification and CURRENT_STATE.md. Preserve the three-repository architecture: Next.js frontend, Python/FastAPI recommendation API, and separate intelligence producer. Distinguish implemented features from future work. Start with supplied source/lockfiles, read AGENTS.md and installed Next.js docs, and preserve the tested Python engine. Do not revive Streamlit.
>
> Implement the specified league-board order, compact roster/drop context, expanded Pulse, collapsible Best Moves, responsive layout, keyboard accessibility, honest progress, bounded requests, exact point units, tenant authorization, server-only secrets, and fail-neutral intelligence.
>
> Inventory source/configuration templates without exposing secrets. Use deterministic fixtures before live providers. If source is missing, label the result a prototype and do not claim engine parity. Ask for missing authority only when necessary. This document does not authorize hosting upgrades, database deletion, paid ingestion, or deployment. Report verified results, gaps, and changed files.
