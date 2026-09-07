import Link from "next/link";
import { connection } from "next/server";

import { ArrowIcon, IntelligenceIcon, PulseIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";
import { getPlayerIntelligenceSnapshot } from "@/lib/api/server";

export const metadata = { title: "Player intelligence" };

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PlayerIntelligencePage({
  params,
  searchParams,
}: PageProps<"/players/[playerId]">) {
  await connection();
  const { playerId } = await params;
  const query = await searchParams;
  const playerName = queryValue(query.name).trim() || "Player Intelligence";
  const snapshot = await getPlayerIntelligenceSnapshot(playerId);

  if (snapshot.status !== "ready") {
    return (
      <SectionPage eyebrow="Decision evidence" title={playerName} description="Current evidence and its modeled effect on the player outlook.">
        <section className="panel placeholder-panel">
          <span aria-hidden="true" className="empty-icon"><PulseIcon /></span>
          <h2>{snapshot.status === "empty" ? "No Meaningful Evidence Yet" : "Intelligence Is Unavailable"}</h2>
          <p>{snapshot.reason}</p>
          <Link className="text-link" href="/leagues">Back to leagues <ArrowIcon /></Link>
        </section>
      </SectionPage>
    );
  }

  const { signal } = snapshot.data;
  const components = signal.components ?? [];

  return (
    <SectionPage
      eyebrow="Decision evidence"
      title={playerName}
      description="A time-weighted summary across all meaningful reporting, with the strongest evidence first."
    >
      <section className="intelligence-summary panel">
        <span aria-hidden="true" className="insight-icon"><IntelligenceIcon /></span>
        <div>
          <p className="eyebrow">Current outlook</p>
          <h2>{signal.summary}</h2>
          <p>{signal.evidence_count} evidence item{signal.evidence_count === 1 ? "" : "s"} across {signal.source_count} source{signal.source_count === 1 ? "" : "s"}.</p>
        </div>
        {signal.latest_evidence_at ? <time dateTime={signal.latest_evidence_at}>Latest update<br />{formatDate(signal.latest_evidence_at)}</time> : null}
      </section>

      <div className="board-heading evidence-heading">
        <div><p className="eyebrow">Ranked evidence</p><h2>What Is Driving the Outlook</h2></div>
        <p>Recency trends evidence of similar relevance.</p>
      </div>

      <section aria-label="Ranked player evidence" className="evidence-list">
        {components.map((item, index) => (
          <article className="evidence-card panel" key={`${item.source_name}:${item.published_at}:${index}`}>
            <span className="evidence-rank">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <div className="evidence-meta">
                <strong>{item.source_name}</strong>
                <time dateTime={item.published_at}>{formatDate(item.published_at)}</time>
              </div>
              <p>{item.summary}</p>
              <div className="evidence-footer">
                <span>{item.related_player_id ? "Includes teammate context" : "Direct player context"}</span>
                <span>{Math.round(item.confidence * 100)}% confidence</span>
                {item.source_url ? <a href={item.source_url} rel="noreferrer" target="_blank">Open source <ArrowIcon /></a> : null}
              </div>
            </div>
          </article>
        ))}
      </section>

      {components.length === 0 ? (
        <section className="panel placeholder-panel compact-empty">
          <span aria-hidden="true" className="empty-icon"><IntelligenceIcon /></span>
          <h2>The Summary Has No Source Detail</h2>
          <p>The aggregated outlook is available, but its individual evidence items were not included in this snapshot.</p>
        </section>
      ) : null}

      <Link className="text-link board-back-link" href="/leagues">Back to leagues <ArrowIcon /></Link>
    </SectionPage>
  );
}
