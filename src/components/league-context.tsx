import type { Recommendation, RecommendationResponse } from "@/lib/api/contracts";

type View = NonNullable<RecommendationResponse["recommendation_view"]>;

export function RosterContext({ view, recommendations }: { view: View; recommendations: Recommendation[] }) {
  const candidates = new Map<string, string[]>();
  for (const move of recommendations) {
    const drop = move.recommended_drop;
    if (!drop || !["high", "medium"].includes(move.drop_confidence ?? "") || !move.data_complete) continue;
    if (!view.roster_players.some(player => player.player_id === drop.player_id && !["IR", "Taxi"].includes(player.slot))) continue;
    if (!candidates.has(drop.player_id) && candidates.size >= 4) continue;
    candidates.set(drop.player_id, [...(candidates.get(drop.player_id) ?? []), move.name]);
  }
  return <details className="panel roster-context">
    <summary><strong>Your roster · {view.target_strength.team_name}</strong><span>{view.roster_players.length} players · View roster</span></summary>
    <p>Current roster slots, not projected starters. Highlighted players are possible cuts only as part of a useful add/drop move—not standalone drop advice.</p>
    {view.roster_players.length === 0 ? <p>Roster context is not available in this saved analysis. Refresh the league to try again.</p> :
      <div className="roster-grid">{["Starter", "Bench", "IR", "Taxi"].map(slot => {
        const players = view.roster_players.filter(player => player.slot === slot);
        return players.length ? <section key={slot}><h3>{slot}</h3><ul>{players.map(player => {
          const adds = candidates.get(player.player_id);
          return <li key={player.player_id} className={adds ? "drop-candidate" : ""}>
            <strong>{player.name}</strong><span>{player.position} · {player.team ?? "FA"}</span>
            {adds ? <><span className="drop-label">Possible cut with a pickup</span><small>To add {adds.slice(0, 3).join(" or ")}</small></> : null}
          </li>;
        })}</ul></section> : null;
      })}</div>}
  </details>;
}

function activityTime(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</time>;
}

export function LeaguePulse({ pulse }: { pulse: RecommendationResponse["league_pulse"] }) {
  const trends = pulse.market_trends.slice(0, 30);
  const rivals = [
    ...pulse.rival_opportunities.filter(item => !["K", "DEF"].includes(item.position)).slice(0, 8),
    ...pulse.rival_opportunities.filter(item => ["K", "DEF"].includes(item.position)).slice(0, 2),
  ];
  const trendList = (items: typeof trends) => <ul>{items.map(item => <li key={item.player_id}><strong>{item.name}</strong><span>{item.position} · {item.adds.toLocaleString()} adds</span></li>)}</ul>;
  return <details className="panel league-pulse" open>
    <summary>League Pulse <span>Market and league activity · Collapse / expand</span></summary>
    <div className="league-pulse-grid">
      <section><h3>Sleeper-wide trends</h3><p>Available players added across Sleeper in the last {pulse.lookback_hours} hours.</p>
        {trends.length ? trendList(trends.slice(0, 10)) : <p>{pulse.market_status === "ready" ? "No available player is trending in this window." : "Sleeper trends are temporarily unavailable."}</p>}
        {trends.length > 10 ? <details className="pulse-more"><summary>Show {trends.length - 10} more trends</summary>{trendList(trends.slice(10))}</details> : null}
      </section>
      <section><h3>Your league moves</h3><p>Completed waivers and free-agent transactions.</p>
        {pulse.league_activity.length ? <ul>{pulse.league_activity.slice(0, 15).map(item => <li key={item.transaction_id}>
          <strong>{item.team_names.join(" · ") || "Team unavailable"}</strong>
          <span>{item.adds.length ? `Added ${item.adds.map(player => String(player.name ?? "Unknown player")).join(", ")}` : "No player added"}</span>
          {item.drops.length ? <span>Dropped {item.drops.map(player => String(player.name ?? "Unknown player")).join(", ")}</span> : null}
          {activityTime(item.created)}
        </li>)}</ul> : <p>{pulse.activity_status === "ready" ? "No completed moves were found for this week." : "League transactions are temporarily unavailable."}</p>}
      </section>
      <section><h3>Rival opportunities</h3><p>Offensive positions first; at most two K/DEF options. Modeled fit, not claim intent.</p>
        {rivals.length ? <ul>{rivals.map(item => <li key={item.player_id}><strong>{item.name}</strong><span>{item.position} · +{item.best_rival_gain.toFixed(1)} pts/wk · {item.rival_teams_helped} teams</span><span>{item.top_teams.join(" · ")}</span></li>)}</ul> : <p>No high-impact rival opportunity clears the alert threshold.</p>}
      </section>
    </div>
  </details>;
}
