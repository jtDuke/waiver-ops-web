import Link from "next/link";
import { LeaguePulse, RosterContext } from "@/components/league-context";
import { connection } from "next/server";

import { ArrowIcon, IntelligenceIcon, LeagueIcon, PulseIcon } from "@/components/icons";
import { RefreshLeagueForm } from "@/components/refresh-league-form";
import { RecommendationRetry } from "@/components/recommendation-retry";
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
      : snapshot.busy ? "The analysis service is busy. Your roster has not been changed."
      : "We couldn’t load your analysis this time. Your roster has not been changed.";

    return (
      <SectionPage
        action={snapshot.status === "not-ready" ? <RefreshLeagueForm leagueId={leagueId} provider={provider} /> : undefined}
        eyebrow={`${provider} · ${leagueId}`}
        title={title}
        description={description}
      >
        <section className="panel placeholder-panel">
          <span aria-hidden="true" className="empty-icon">{snapshot.status === "not-ready" ? <LeagueIcon /> : <PulseIcon />}</span>
          <h2>{snapshot.status === "not-ready" ? "Recommendations Aren’t Ready Yet" : snapshot.busy ? "Analysis Is Temporarily Busy" : "Recommendation Data Is Unavailable"}</h2>
          <p>{snapshot.status === "unavailable" && snapshot.busy ? "Another analysis is using the available capacity. Try again shortly." : snapshot.reason}</p>
          {snapshot.status === "unavailable" && snapshot.retryAfterMs !== undefined
            ? <RecommendationRetry delayMs={snapshot.retryAfterMs} /> : null}
          <Link className="text-link" href="/leagues">Back to Leagues <ArrowIcon /></Link>
        </section>
      </SectionPage>
    );
  }

  const { data } = snapshot;
  const view = data.recommendation_view;
  const recommendations = view.primary_recommendations ?? view.direct_recommendations;
  const watchlist = view.watchlist_recommendations;
  const selectedPosition = queryValue(query.position);
  const selectedCategory = queryValue(query.category);
  const newsOnly = queryValue(query.news) === "1";
  const positions = [...new Set(recommendations.map((item) => item.position))].sort();
  const categories = [...new Set(recommendations.map((item) => item.category_label))].sort();
  const matchesFilters = (item: Recommendation) => {
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
      <RosterContext view={view} recommendations={recommendations} />
      <LeaguePulse pulse={data.league_pulse} />

      <details className="primary-board" open>
      <summary className="board-toggle"><h2>Best Moves for This Roster</h2><span>{filteredRecommendations.length} useful moves · Collapse / expand</span></summary>
      <form className="recommendation-filters panel" method="get">
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

      </details>

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

      <Link className="text-link board-back-link" href="/leagues">Back to all leagues <ArrowIcon /></Link>
    </SectionPage>
  );
}
