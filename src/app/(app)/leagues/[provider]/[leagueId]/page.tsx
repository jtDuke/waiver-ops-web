import Link from "next/link";
import { connection } from "next/server";

import { ArrowIcon, IntelligenceIcon, LeagueIcon, PulseIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";
import type { Recommendation } from "@/lib/api/contracts";
import { getRecommendationSnapshot } from "@/lib/api/server";

export const metadata = { title: "League recommendations" };

function signedPoints(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function RecommendationCard({ recommendation, rank }: { recommendation: Recommendation; rank: number }) {
  const newsSummary = recommendation.player_signal?.summary;

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
        <p className="fit-reason">{recommendation.fit_reason}</p>
        {newsSummary ? (
          <div className="news-summary">
            <IntelligenceIcon />
            <div><strong>Why the news matters</strong><p>{newsSummary}</p></div>
          </div>
        ) : null}
      </div>
      <dl className="impact-metrics">
        <div><dt>Next-week impact</dt><dd>{signedPoints(recommendation.next_week_gain)}<span> pts</span></dd></div>
        <div><dt>3-week average</dt><dd>{signedPoints(recommendation.lineup_gain)}<span> pts/wk</span></dd></div>
      </dl>
    </article>
  );
}

export default async function LeagueDetailPage({ params }: PageProps<"/leagues/[provider]/[leagueId]">) {
  await connection();
  const { provider, leagueId } = await params;
  const snapshot = await getRecommendationSnapshot(provider, leagueId);

  if (snapshot.status !== "ready") {
    const title = snapshot.status === "not-ready" ? snapshot.data.league.name : "League Recommendations";
    const description = snapshot.status === "not-ready"
      ? `${snapshot.data.league.season} · Week ${snapshot.data.week}`
      : "The recommendation service did not return a usable league view.";

    return (
      <SectionPage eyebrow={`${provider} · ${leagueId}`} title={title} description={description}>
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
  const recommendations = view.direct_recommendations.length > 0
    ? view.direct_recommendations
    : view.recommendations;
  const shownRecommendations = recommendations.slice(0, 12);
  const teamName = view.target_strength.team_name;

  return (
    <SectionPage eyebrow={`${data.provider} · ${data.league.season} · Week ${data.week}`} title={data.league.name} description={`Recommendations for ${teamName}, calibrated to this league’s scoring, rosters, and available players.`}>
      <section aria-label="Recommendation context" className="recommendation-overview panel">
        <div><span>Team</span><strong>{teamName}</strong></div>
        <div><span>Strongest need</span><strong>{view.strongest_need}</strong></div>
        <div><span>League position</span><strong>{view.target_strength.league_rank} of {view.target_strength.league_size}</strong></div>
        <div><span>Player intelligence</span><strong className={data.intelligence.enabled ? "positive-text" : "muted-text"}>{data.intelligence.enabled ? "Applied" : "Neutral"}</strong></div>
      </section>

      <div className="board-heading">
        <div><p className="eyebrow">Priority board</p><h2>Best Moves for This Roster</h2></div>
        <p>{shownRecommendations.length} actionable {shownRecommendations.length === 1 ? "option" : "options"}</p>
      </div>

      {shownRecommendations.length > 0 ? (
        <section aria-label="Recommended waiver additions" className="recommendation-list">
          {shownRecommendations.map((recommendation, index) => (
            <RecommendationCard key={recommendation.player_id} rank={index + 1} recommendation={recommendation} />
          ))}
        </section>
      ) : (
        <section className="panel placeholder-panel compact-empty">
          <span aria-hidden="true" className="empty-icon"><LeagueIcon /></span>
          <h2>No Direct Moves Clear the Bar</h2>
          <p>The model did not find an available player who materially improves this roster right now.</p>
        </section>
      )}

      <Link className="text-link board-back-link" href="/leagues">Back to all leagues <ArrowIcon /></Link>
    </SectionPage>
  );
}
