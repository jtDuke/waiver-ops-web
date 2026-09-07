import { IntelligenceIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";

export const metadata = { title: "Intelligence" };

export default function IntelligencePage() {
  return (
    <SectionPage eyebrow="Cross-source signals" title="Player Intelligence" description="See which developments matter, why they matter, and how confidence changes over time.">
      <section className="panel placeholder-panel"><span aria-hidden="true" className="empty-icon"><IntelligenceIcon /></span><h2>Intelligence Views Are Staged</h2><p>The FastAPI player-intelligence endpoint is ready. Search, trending players, and evidence timelines arrive in the next UI slice.</p></section>
    </SectionPage>
  );
}
