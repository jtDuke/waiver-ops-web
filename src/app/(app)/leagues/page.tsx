import { LeagueIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";

export const metadata = { title: "Leagues" };

export default function LeaguesPage() {
  return (
    <SectionPage eyebrow="League workspace" title="Your Leagues" description="Review each roster in its own scoring and availability context." actionHref="/connections" actionLabel="Add Connection">
      <section className="panel placeholder-panel"><span aria-hidden="true" className="empty-icon"><LeagueIcon /></span><h2>League Browser Is Next</h2><p>The application shell and API contract are in place. League cards and recommendation drill-downs are the next frontend slice.</p></section>
    </SectionPage>
  );
}
