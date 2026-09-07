import { SettingsIcon } from "@/components/icons";
import { SectionPage } from "@/components/section-page";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <SectionPage eyebrow="Account controls" title="Settings" description="Manage defaults and connected providers without exposing credentials to the browser.">
      <section className="panel placeholder-panel"><span aria-hidden="true" className="empty-icon"><SettingsIcon /></span><h2>Preferences Are API-Ready</h2><p>Default league, provider preferences, and account controls will be wired here after the authenticated session flow.</p></section>
    </SectionPage>
  );
}
