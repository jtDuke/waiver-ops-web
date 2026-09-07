import { LeagueIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";

export const metadata = { title: "Connections" };

export default function ConnectionsPage() {
  return (
    <SectionPage eyebrow="Data providers" title="Connect a League" description="Sleeper and Yahoo access stays behind the Python service; provider credentials never reach this frontend.">
      <div className="connection-grid">
        <article className="panel connection-card"><span aria-hidden="true" className="provider-mark sleeper">S</span><div><h2>Sleeper</h2><p>Connect with a username. No password or OAuth token required.</p></div><button className="button primary-button" disabled type="button">Coming in the Next Slice</button></article>
        <article className="panel connection-card"><span aria-hidden="true" className="provider-mark yahoo">Y</span><div><h2>Yahoo</h2><p>Use the secure authorization flow already exposed by FastAPI.</p></div><button className="button secondary-button" disabled type="button">Coming in the Next Slice</button></article>
      </div>
      <p className="security-note"><LeagueIcon /> Provider tokens remain encrypted and server-side.</p>
    </SectionPage>
  );
}
