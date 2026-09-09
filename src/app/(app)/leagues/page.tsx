import Link from "next/link";
import { connection } from "next/server";

import { LeagueIcon } from "@/components/icons";
import { DefaultLeagueForm } from "@/components/default-league-form";
import { SectionPage } from "@/components/section-page";
import type { League } from "@/lib/api/contracts";
import { getDashboardSnapshot } from "@/lib/api/server";

export const metadata = { title: "Leagues" };

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function LeagueCard({ league, isDefault }: { league: League; isDefault: boolean }) {
  return (
    <Link
      className="league-card panel"
      href={`/leagues/${league.provider}/${league.league_id}`}
      prefetch={false}
    >
      <div className="league-card-topline">
        <span aria-hidden="true" className={`provider-mark ${league.provider}`}>
          {league.provider === "sleeper" ? "S" : "Y"}
        </span>
        <span className="league-card-labels">
          {isDefault ? <span className="default-label">Default</span> : null}
          <span className="provider-label">{league.provider}</span>
        </span>
      </div>
      <div>
        <h2>{league.display_name ?? `${league.provider} league`}</h2>
        <p>{league.season} season</p>
      </div>
      <span className="league-card-sync">Synced {formatSyncTime(league.last_synced_at)}</span>
      <span className="league-card-action">Open recommendation board <span aria-hidden="true">→</span></span>
    </Link>
  );
}

export default async function LeaguesPage({
  searchParams,
}: PageProps<"/leagues">) {
  await connection();
  const query = await searchParams;
  const snapshot = await getDashboardSnapshot();
  const sleeperLeagueCount =
    snapshot.status === "ready"
      ? snapshot.leagues.filter((league) => league.provider === "sleeper").length
      : 0;

  return (
    <SectionPage eyebrow="League workspace" title="Your Leagues" description="Review each roster in its own scoring and availability context." actionHref="/connections" actionLabel="Add Connection">
      {query.connected === "sleeper" && sleeperLeagueCount > 0 ? (
        <div className="notice success-notice" role="status">
          Sleeper connected. {sleeperLeagueCount} {sleeperLeagueCount === 1 ? "league" : "leagues"} loaded.
        </div>
      ) : null}
      {snapshot.status === "ready" && snapshot.leagues.length > 0 ? (
        <>
          <DefaultLeagueForm leagues={snapshot.leagues} preferences={snapshot.preferences} />
          <section aria-label="Connected leagues" className="league-card-grid">
            {snapshot.leagues.map((league) => (
              <LeagueCard
                isDefault={league.provider === snapshot.preferences.default_provider && league.league_id === snapshot.preferences.default_league_id}
                key={`${league.provider}:${league.league_id}`}
                league={league}
              />
            ))}
          </section>
        </>
      ) : (
        <section className="panel placeholder-panel">
          <span aria-hidden="true" className="empty-icon"><LeagueIcon /></span>
          <h2>{snapshot.status === "ready" ? "No Leagues Connected Yet" : "League Data Is Unavailable"}</h2>
          <p>{snapshot.status === "ready" ? "Connect Sleeper or Yahoo to build your first league-specific recommendation board." : snapshot.reason}</p>
          <Link className="button primary-button empty-action" href={snapshot.status === "ready" ? "/connections" : "/"}>
            {snapshot.status === "ready" ? "Add a connection" : "Return to dashboard"}
          </Link>
        </section>
      )}
    </SectionPage>
  );
}
