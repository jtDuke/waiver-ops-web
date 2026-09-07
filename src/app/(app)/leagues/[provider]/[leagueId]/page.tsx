import Link from "next/link";

import { ArrowIcon, LeagueIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";

export const metadata = { title: "League recommendations" };

export default async function LeagueDetailPage({ params }: PageProps<"/leagues/[provider]/[leagueId]">) {
  const { provider, leagueId } = await params;

  return (
    <SectionPage eyebrow={`${provider} · ${leagueId}`} title="League Recommendations" description="This route is reserved for the fully explained waiver board and roster impact view.">
      <section className="panel placeholder-panel"><span aria-hidden="true" className="empty-icon"><LeagueIcon /></span><h2>Recommendation View Is Next</h2><p>The stable API route is ready. The next slice will render player priorities, lineup impact, evidence, and confidence here.</p><Link className="text-link" href="/leagues">Back to Leagues <ArrowIcon /></Link></section>
    </SectionPage>
  );
}
