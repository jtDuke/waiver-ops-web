import { connection } from "next/server";
import Link from "next/link";

import { LeagueIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";
import { SleeperConnectionForm } from "@/components/sleeper-connection-form";
import { getConnectionsSnapshot } from "@/lib/api/server";

export const metadata = { title: "Connections" };

const connectionErrors: Record<string, string> = {
  yahoo_start: "Yahoo authorization could not be started. Check the API configuration and try again.",
  yahoo_callback: "Yahoo authorization did not complete. No connection changes were saved.",
};

export default async function ConnectionsPage({
  searchParams,
}: PageProps<"/connections">) {
  await connection();
  const query = await searchParams;
  const snapshot = await getConnectionsSnapshot();
  const connections = snapshot.status === "ready" ? snapshot.connections : [];
  const sleeper = connections.find((item) => item.provider === "sleeper");
  const yahoo = connections.find((item) => item.provider === "yahoo");
  const error = typeof query.error === "string" ? connectionErrors[query.error] : null;
  const yahooConnected = query.connected === "yahoo" || yahoo?.connected;

  return (
    <SectionPage
      eyebrow="Account onboarding"
      title="Connect Your Leagues"
      description="Start with one provider. Waiver Ops imports the leagues you already play in and keeps all provider credentials behind the Python service."
    >
      {error ? <div className="notice error-notice" role="alert">{error}</div> : null}
      {query.connected === "yahoo" ? <div className="notice success-notice" role="status">Yahoo is connected and its leagues are ready to review.</div> : null}
      {snapshot.status === "unavailable" ? <div className="notice error-notice" role="alert">{snapshot.reason}</div> : null}

      <div className="connection-grid">
        <article className="panel connection-card">
          <div className="connection-card-heading">
            <span aria-hidden="true" className="provider-mark sleeper">S</span>
            <div>
              <div className="connection-title-row">
                <h2>Sleeper</h2>
                <span className={`connection-status ${sleeper?.connected ? "connected" : ""}`}>
                  {sleeper?.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p>Enter your public username. Sleeper does not require a password or OAuth token.</p>
            </div>
          </div>
          <SleeperConnectionForm connectedName={sleeper?.display_name} />
        </article>

        <article className="panel connection-card">
          <div className="connection-card-heading">
            <span aria-hidden="true" className="provider-mark yahoo">Y</span>
            <div>
              <div className="connection-title-row">
                <h2>Yahoo</h2>
                <span className={`connection-status ${yahooConnected ? "connected" : ""}`}>
                  {yahooConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p>Authorize Waiver Ops with Yahoo. Tokens remain encrypted and are never sent to this browser.</p>
            </div>
          </div>
          <a className="button secondary-button" href="/connections/yahoo/start">
            {yahooConnected ? "Reconnect Yahoo" : "Connect Yahoo"}
          </a>
        </article>
      </div>

      <div className="onboarding-next panel">
        <span aria-hidden="true" className="empty-icon"><LeagueIcon /></span>
        <div>
          <p className="eyebrow">What happens next</p>
          <h2>Your league desk builds automatically.</h2>
          <p>After a connection succeeds, open Leagues to see roster-specific recommendations and the intelligence behind them.</p>
        </div>
        <Link className="button primary-button" href="/leagues">Open Leagues</Link>
      </div>
      <p className="security-note"><LeagueIcon /> Provider tokens remain encrypted and server-side.</p>
    </SectionPage>
  );
}
