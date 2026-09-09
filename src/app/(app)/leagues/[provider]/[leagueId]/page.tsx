import Link from "next/link";
import { connection } from "next/server";

import { ArrowIcon, IntelligenceIcon, LeagueIcon, PulseIcon } from "@/components/icons";
import { RefreshLeagueForm } from "@/components/refresh-league-form";
import { SectionPage } from "@/components/section-page";
import type { Recommendation } from "@/lib/api/contracts";
import { getRecommendationSnapshot } from "@/lib/api/server";

export const metadata = { title: "League recommendations" };
export const maxDuration = 60;

function signedPoints(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function RecommendationCard({ recommendation, rank }: { recommendation: Recommendation; rank: number }) {
  const newsSummary = recommendation.player_signal?.summary;
  const rivals = recommendation.top_rivals;
  const netNextWeek = recommendation.net_next_week_gain ?? recommendation.next_week_gain;
  const netHorizon = recommendation.net_lineup_gain ?? recommendation.lineup_gain;
  const drop = recommendation.recommended_drop;

  return (
    <article className="recommendation-card panel">
      <div className="recommendation-rank" aria-label={`Recommendation ${rank}`}>{String(rank).padStart(2, "0")}</div>
      <div className="recommendation-main">
        <div className="recommendation-flags">
          <span className="category-chip">{recommendation.category_label}</span>
          <span className={`competition-chip ${recommendation.competition.toLowerCase()}`}>{recommendation.competition} competition</span>
          {newsSummary ? <span className="news-chip"><IntelligenceIcon /> Meaningful news</span> : null}
        </div>
        <div className="player-heading">
          <div>
            <h2>{recommendation.name}</h2>
            <p>{recommendation.position} · {recommendation.team ?? "FA"}{recommendation.age ? ` · Age ${recommendation.age}` : ""}</p>
          </div>
          <span className="fit-tier">{recommendation.fit_tier}</span>
        </div>
        <p className="transaction-line"><strong>Add {recommendation.name}</strong>{drop ? <> · Review dropping <strong>{drop.name}</strong></> : <> · Open roster slot</>}</p>
        <p className="fit-reason">{recommendation.fit_reason}</p>
        <details className="move-details">
          <summary>Why this move <span>View analysis</span></summary>
          {newsSummary ? (
            <div className="news-summary">
              <IntelligenceIcon />
              <div>
                <strong>Why the news matters</strong>
                <p>{newsSummary}</p>
                <Link className="evidence-link" href={`/players/${encodeURIComponent(recommendation.player_id)}?name=${encodeURIComponent(recommendation.name)}`}>
                  Read ranked evidence <ArrowIcon />
                </Link>
              </div>
            </div>
          ) : <p className="rival-disclaimer">This ranking is driven by projected lineup impact and roster cost; no meaningful current news changed it.</p>}
          {rivals.length > 0 ? (
            <div className="rival-details-body">
              <strong>League competition</strong>
              <p className="rival-disclaimer">Modeled fit for {recommendation.rivals_actionable_count} rival {recommendation.rivals_actionable_count === 1 ? "team" : "teams"}; this is roster fit, not claim intent.</p>
              <ul>
                {rivals.map((rival) => (
                  <li key={`${rival.team_name}:${rival.reason}`}>
                    <div><strong>{rival.team_name}</strong><span>{signedPoints(rival.lineup_gain)} pts/wk</span></div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </details>
      </div>
      <dl className="impact-metrics">
        <div><dt>Net next-week</dt><dd>{signedPoints(netNextWeek)}<span> pts</span></dd></div>
        <div><dt>Net 3-week avg.</dt><dd>{signedPoints(netHorizon)}<span> pts/wk</span></dd></div>
      </dl>
    </article>
  );
}

export default async function LeagueDetailPage({ params, searchParams }: PageProps<"/leagues/[provider]/[leagueId]">) {
  await connection();
  const { provider, leagueId } = await params;
  const query = await searchParams;
  const snapshot = await getRecommendationSnapshot(provider, leagueId);

  if (snapshot.status !== "ready") {
    const title = snapshot.status === "not-ready" ? snapshot.data.league.name : "League Recommendations";
    const description = snapshot.status === "not-ready"
      ? `${snapshot.data.league.season} · Week ${snapshot.data.week}`
      : "The recommendation service did not return a usable league view.";

    return (
      <SectionPage
        action={snapshot.status === "not-ready" ? <RefreshLeagueForm leagueId={leagueId} provider={provider} /> : undefined}
        eyebrow={`${provider} · ${leagueId}`}
        title={title}
        description={description}
      >
        <section className="panel placeholder-panel">
          <span aria-hidden="true" className="empty-icon">{snapshot.status === "not-ready" ? <LeagueIcon /> : <PulseIcon />}</span>
          <h2>{snapshot.status === "not-ready" ? "Recommendations Aren’t Ready Yet" : "Recommendation Data Is Unavailable"}</h2>
          <p>{snapshot.reason}</p>
          <Link className="text-link" href="/leagues">Back to Leagues <ArrowIcon /></Link>
        </section>
      </SectionPage>
    );
  }

  const { data } = snapshot;
  const view = data.recommendation_view;
  const recommendations = view.primary_recommendations ?? view.direct_recommendations;
  const watchlist = view.watchlist_recommendations;
  const search = queryValue(query.q).trim().toLowerCase();
  const selectedPosition = queryValue(query.position);
  const selectedCategory = queryValue(query.category);
  const newsOnly = queryValue(query.news) === "1";
  const positions = [...new Set(recommendations.map((item) => item.position))].sort();
  const categories = [...new Set(recommendations.map((item) => item.category_label))].sort();
  const matchesFilters = (item: Recommendation) => {
    if (search && !`${item.name} ${item.team ?? ""}`.toLowerCase().includes(search)) return false;
    if (selectedPosition && item.position !== selectedPosition) return false;
    if (selectedCategory && item.category_label !== selectedCategory) return false;
    if (newsOnly && !item.player_signal?.summary) return false;
    return true;
  };
  const filteredRecommendations = recommendations.filter(matchesFilters);
  const filteredWatchlist = watchlist.filter(matchesFilters);
  const shownRecommendations = filteredRecommendations.slice(0, 12);
  const teamName = view.target_strength.team_name;

  return (
    <SectionPage action={<RefreshLeagueForm leagueId={leagueId} provider={provider} />} eyebrow={`${data.provider} · ${data.league.season} · Week ${data.week}`} title={data.league.name} description={`Recommendations for ${teamName}, calibrated to this league’s scoring, rosters, and available players.`}>
      <section aria-label="Recommendation context" className="recommendation-overview panel">
        <div><span>Team</span><strong>{teamName}</strong></div>
        <div title={view.roster_assessment?.weakness_explanation}><span>Roster weakness</span><strong>{view.roster_assessment?.weakest_position ?? view.strongest_need ?? "None"}</strong></div>
        <div><span>Best waiver opportunity</span><strong>{view.roster_assessment?.best_waiver_opportunity?.position ?? "Stand pat"}</strong></div>
        <div><span>League position</span><strong>{view.target_strength.league_rank} of {view.target_strength.league_size}</strong></div>
        <div><span>Player intelligence</span><strong className={data.intelligence.enabled ? "positive-text" : "muted-text"}>{data.intelligence.enabled ? "Applied" : "Neutral"}</strong></div>
        {view.roster_assessment ? <p className="assessment-context">{view.roster_assessment.weakness_explanation} A roster weakness only becomes a recommendation when an available add/drop pair clears the impact threshold.</p> : null}
      </section>

      <div className="board-heading">
        <div><p className="eyebrow">Priority board</p><h2>Best Moves for This Roster</h2></div>
        <p>{filteredRecommendations.length} of {recommendations.length} useful {recommendations.length === 1 ? "move" : "moves"}</p>
      </div>

      <form className="recommendation-filters panel" method="get">
        <label className="search-field">
          <span>Find a player</span>
          <input defaultValue={queryValue(query.q)} name="q" placeholder="Name or team" type="search" />
        </label>
        <label>
          <span>Position</span>
          <select defaultValue={selectedPosition} name="position">
            <option value="">All positions</option>
            {positions.map((position) => <option key={position} value={position}>{position}</option>)}
          </select>
        </label>
        <label>
          <span>Recommendation</span>
          <select defaultValue={selectedCategory} name="category">
            <option value="">All recommendations</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="checkbox-field">
          <input defaultChecked={newsOnly} name="news" type="checkbox" value="1" />
          <span>Meaningful news only</span>
        </label>
        <div className="filter-actions">
          <button className="button primary-button" type="submit">Apply Filters</button>
          <Link className="button secondary-button" href={`/leagues/${provider}/${leagueId}`}>Clear</Link>
        </div>
      </form>

      {shownRecommendations.length > 0 ? (
        <section aria-label="Recommended waiver additions" className="recommendation-list">
          {shownRecommendations.map((recommendation, index) => (
            <RecommendationCard key={recommendation.player_id} rank={index + 1} recommendation={recommendation} />
          ))}
        </section>
      ) : (
        <section className="panel placeholder-panel compact-empty">
          <span aria-hidden="true" className="empty-icon"><LeagueIcon /></span>
          <h2>{recommendations.length > 0 ? "No Recommendations Match Those Filters" : "No Direct Moves Clear the Bar"}</h2>
          <p>{recommendations.length > 0 ? "Clear one or more filters to return to the full priority board." : "The model did not find a complete add/drop move that clears the usefulness threshold. Standing pat is the recommendation."}</p>
        </section>
      )}

      {filteredWatchlist.length > 0 ? (
        <details className="panel secondary-board">
          <summary>Small Edges <span>{filteredWatchlist.length} marginal {filteredWatchlist.length === 1 ? "move" : "moves"}</span></summary>
          <p>These moves project as improvements, but not large enough for the priority board.</p>
          <section aria-label="Small edge recommendations" className="recommendation-list">
            {filteredWatchlist.slice(0, 10).map((recommendation, index) => (
              <RecommendationCard key={recommendation.player_id} rank={index + 1} recommendation={recommendation} />
            ))}
          </section>
        </details>
      ) : null}

      <details className="panel league-pulse">
        <summary>League Pulse <span>Sleeper market and league activity</span></summary>
        <div className="league-pulse-grid">
          <section>
            <h3>Sleeper-wide trends</h3>
            <p>Available players added across Sleeper in the last {data.league_pulse.lookback_hours} hours.</p>
            {data.league_pulse.market_trends.length > 0 ? <ul>{data.league_pulse.market_trends.slice(0, 6).map((item) => <li key={item.player_id}><strong>{item.name}</strong><span>{item.position} · {item.adds.toLocaleString()} adds</span></li>)}</ul> : <p className="pulse-empty">{data.league_pulse.market_status === "ready" ? "No available player is trending in this window." : "Sleeper trends are temporarily unavailable."}</p>}
          </section>
          <section>
            <h3>Your league moves</h3>
            <p>Completed waivers and free-agent transactions.</p>
            {data.league_pulse.league_activity.length > 0 ? <ul>{data.league_pulse.league_activity.slice(0, 6).map((item) => {
              const added = item.adds[0]?.name;
              const dropped = item.drops[0]?.name;
              return <li key={item.transaction_id}><strong>{typeof added === "string" ? added : "Roster move"}</strong><span>{typeof dropped === "string" ? `Dropped ${dropped}` : item.type.replace("_", " ")}</span></li>;
            })}</ul> : <p className="pulse-empty">{data.league_pulse.activity_status === "ready" ? "No completed moves were found for this week." : "League transactions are temporarily unavailable."}</p>}
          </section>
          <section>
            <h3>Rival opportunities</h3>
            <p>High-impact fits another roster could act on.</p>
            {data.league_pulse.rival_opportunities.length > 0 ? <ul>{data.league_pulse.rival_opportunities.slice(0, 6).map((item) => <li key={item.player_id}><strong>{item.name}</strong><span>{signedPoints(item.best_rival_gain)} pts/wk · {item.rival_teams_helped} teams</span></li>)}</ul> : <p className="pulse-empty">No high-impact rival opportunity clears the alert threshold.</p>}
          </section>
        </div>
      </details>

      <Link className="text-link board-back-link" href="/leagues">Back to all leagues <ArrowIcon /></Link>
    </SectionPage>
  );
}
