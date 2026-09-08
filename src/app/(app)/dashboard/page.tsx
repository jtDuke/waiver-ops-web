import Link from "next/link";
import { connection } from "next/server";

import { ArrowIcon, IntelligenceIcon, LeagueIcon, PulseIcon } from "@/components/icons";
import type { DashboardSnapshot, League } from "@/lib/api/contracts";
import { getDashboardSnapshot } from "@/lib/api/server";

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function LeagueList({
  leagues,
  defaultProvider,
  defaultLeagueId,
}: {
  leagues: League[];
  defaultProvider: string | null;
  defaultLeagueId: string | null;
}) {
  if (leagues.length === 0) {
    return (
      <div className="empty-state">
        <span aria-hidden="true" className="empty-icon"><LeagueIcon /></span>
        <div><h3>No Leagues Connected Yet</h3><p>Add Sleeper or Yahoo to begin generating league-specific recommendations.</p></div>
        <Link className="button primary-button" href="/connections">Add Your First League</Link>
      </div>
    );
  }

  const orderedLeagues = [...leagues].sort((left, right) => {
    const leftIsDefault = left.provider === defaultProvider && left.league_id === defaultLeagueId;
    const rightIsDefault = right.provider === defaultProvider && right.league_id === defaultLeagueId;
    return Number(rightIsDefault) - Number(leftIsDefault);
  });

  return (
    <div className="league-list">
      {orderedLeagues.map((league) => (
        <Link className="league-row" href={`/leagues/${league.provider}/${league.league_id}`} key={`${league.provider}:${league.league_id}`}>
          <span aria-hidden="true" className={`provider-mark ${league.provider}`}>{league.provider === "sleeper" ? "S" : "Y"}</span>
          <span className="league-copy"><strong>{league.display_name ?? `${league.provider} league`}</strong><small>{league.season} · Synced {formatSyncTime(league.last_synced_at)}</small></span>
          <span className="league-row-labels">
            {league.provider === defaultProvider && league.league_id === defaultLeagueId ? <span className="default-label">Default</span> : null}
            <span className="provider-label">{league.provider}</span>
          </span>
          <ArrowIcon />
        </Link>
      ))}
    </div>
  );
}

function ApiSetup({ reason }: { reason: string }) {
  const sessionExpired = reason.toLowerCase().includes("session");
  return (
    <div className="empty-state api-setup">
      <span aria-hidden="true" className="empty-icon"><PulseIcon /></span>
      <div>
        <h3>{sessionExpired ? "Restore Your Session" : "Connect the Application Service"}</h3>
        <p>{reason}</p>
        {sessionExpired ? (
          <Link className="button primary-button session-repair" href="/auth/sync">Restore Secure Session</Link>
        ) : (
          <ol className="setup-steps">
            <li><span>1</span> Start the FastAPI service on port 8000.</li>
            <li><span>2</span> Set <code>WAIVER_API_BASE_URL</code> if it runs elsewhere.</li>
            <li><span>3</span> Refresh this page to load your leagues.</li>
          </ol>
        )}
      </div>
    </div>
  );
}

function DashboardMetrics({ snapshot }: { snapshot: DashboardSnapshot }) {
  const ready = snapshot.status === "ready";
  const connected = ready ? snapshot.me.connections.filter((connection) => connection.connected).length : 0;

  return (
    <section aria-label="Account overview" className="metric-grid">
      <article className="metric-card"><span>Connected leagues</span><strong>{ready ? snapshot.leagues.length : "—"}</strong><small>{ready ? "Available to analyze" : "Waiting for API"}</small></article>
      <article className="metric-card"><span>Provider connections</span><strong>{ready ? connected : "—"}</strong><small>Sleeper and Yahoo supported</small></article>
      <article className="metric-card accent-card"><span>Recommendation engine</span><strong>{ready ? "Ready" : "Offline"}</strong><small>League context + player intelligence</small></article>
    </section>
  );
}

export default async function DashboardPage() {
  await connection();
  const snapshot = await getDashboardSnapshot();
  const displayName = snapshot.status === "ready" ? snapshot.me.identity.display_name : null;

  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">2026 season command center</p>
          <h1>{displayName ? `Welcome Back, ${displayName}.` : "Make the Next Waiver Move With Context."}</h1>
          <p className="lede">One decision surface for roster needs, projections, recent performance, and the news that actually changes player value.</p>
        </div>
        <span className={`status-pill ${snapshot.status}`}><span aria-hidden="true" className="status-dot" />{snapshot.status === "ready" ? "Live data connected" : "API setup needed"}</span>
      </header>

      <DashboardMetrics snapshot={snapshot} />

      <div className="dashboard-grid">
        <section className="panel league-panel">
          <div className="section-heading">
            <div><p className="eyebrow">League workspace</p><h2>Choose Where to Improve</h2></div>
            <Link className="text-link" href="/leagues">View All <ArrowIcon /></Link>
          </div>
          {snapshot.status === "ready" ? <LeagueList leagues={snapshot.leagues} defaultProvider={snapshot.preferences.default_provider} defaultLeagueId={snapshot.preferences.default_league_id} /> : <ApiSetup reason={snapshot.reason} />}
        </section>

        <aside className="panel intelligence-panel">
          <div className="insight-icon"><IntelligenceIcon /></div>
          <p className="eyebrow">Decision model</p>
          <h2>More Than a Player List</h2>
          <p>Every recommendation will explain why a move fits this league and what changed recently.</p>
          <ul className="model-list">
            <li><span>01</span><div><strong>League context</strong><small>Roster construction, scoring, and available players</small></div></li>
            <li><span>02</span><div><strong>Player outlook</strong><small>Rankings, projections, and recent performance</small></div></li>
            <li><span>03</span><div><strong>Intelligence layer</strong><small>Meaningful news across players and teammates</small></div></li>
          </ul>
          <Link className="button secondary-button full-width" href="/leagues">Open a Recommendation Board</Link>
        </aside>
      </div>
    </div>
  );
}
