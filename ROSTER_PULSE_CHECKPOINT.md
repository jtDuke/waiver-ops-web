# Roster and League Pulse milestone

Implemented September 10, 2026.

- Replace metric callouts with a compact expandable current roster, grouped by provider slot.
- Highlight at most four distinct rostered drop candidates, only from complete primary moves with high/medium drop confidence. Never pad the list; IR/taxi players are excluded. Labels explain the corresponding pickup and are not standalone drop advice.
- Move League Pulse above recommendations, expanded by default. Show ten trends with up to thirty accessible through disclosure.
- Show transaction teams, all added/dropped player names, and explicitly UTC timestamps when supplied.
- Prioritize offensive rival opportunities; cap the combined K/DEF entries at two. Existing gain values remain unchanged.
- Make Best Moves collapsible and remove its misleading player search. Position/category/news filters remain.

## Performance and compatibility

Native HTML disclosures and server components add no client state, effects, polling, dependencies, or provider requests. Existing progressive loading and busy recovery are unchanged. The API projects roster identities from its already-authorized league snapshot; no catalog is sent to the browser. Roster and team-name fields default gracefully for old cached responses. The engine cache namespace advances to prevent old presentation payload reuse; scoring and drop policy do not change.

## Verification

TypeScript, ESLint, production build, and browser launch/regression flow. Browser coverage includes mobile overflow, keyboard disclosure, drop labels, expanded trend list, rival K/DEF cap, and the absence of the old search field. API tests cover selected-roster isolation, provider slots, ownership filtering, transaction labels, and bounded trend/rival lists.

Production visual acceptance still benefits from reviewing a real populated league after deployment. Synthetic browser fixtures are not proof of every live league layout.
