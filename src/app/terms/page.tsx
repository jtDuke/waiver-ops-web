import type { Metadata } from "next";

import { LegalPage } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing access to and use of WaiverOps.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms govern your access to and use of WaiverOps. By using the service, you agree to them."
    >
      <section><h2>About the service</h2><p>WaiverOps is fantasy-football decision-support software currently operated by its individual owner. It combines connected-league information, player data, projections, rankings, and recent evidence to produce informational recommendations.</p></section>
      <section><h2>Eligibility and accounts</h2><p>You must be legally able to agree to these terms and provide accurate information when creating an account. You are responsible for activity through your account and for protecting the security of the accounts you use to sign in or connect.</p></section>
      <section><h2>Fantasy-provider connections</h2><p>You may authorize WaiverOps to access supported third-party fantasy services. You represent that you are entitled to connect those accounts. Your use of Yahoo, Sleeper, Google, and other third-party services remains governed by their respective terms. You may revoke access through the applicable provider.</p></section>
      <section><h2>Permitted use</h2><p>You may use WaiverOps for personal fantasy-football analysis. You may not misuse the service, attempt unauthorized access, interfere with its operation, scrape it at unreasonable volume, circumvent security controls, reverse engineer protected portions, or use it to violate another service’s rules or applicable law.</p></section>
      <section><h2>Recommendations and no guarantees</h2><p>Fantasy sports involve uncertainty. Rankings, projections, summaries, and recommendations may be incomplete, delayed, inaccurate, or affected by assumptions the service does not model. WaiverOps does not guarantee player performance, waiver success, league outcomes, winnings, availability, or uninterrupted service. You remain responsible for every roster decision.</p></section>
      <section><h2>Paid services</h2><p>If paid features are introduced, applicable prices and material billing terms will be presented before purchase. Additional terms may apply to those features.</p></section>
      <section><h2>Ownership</h2><p>WaiverOps and its original software, design, and content are owned by the operator or applicable licensors. These terms do not transfer ownership to you. Team names, league data, player information, trademarks, and third-party content remain the property of their respective owners.</p></section>
      <section><h2>Suspension and termination</h2><p>Access may be limited or terminated if you violate these terms, create security or legal risk, or materially disrupt the service. You may stop using WaiverOps at any time and may request account deletion by contacting us.</p></section>
      <section><h2>Service availability and disclaimers</h2><p>To the extent permitted by law, WaiverOps is provided “as is” and “as available,” without warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, or continuous availability.</p></section>
      <section><h2>Limitation of liability</h2><p>To the extent permitted by law, the operator of WaiverOps will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, lost opportunities, or fantasy-league outcomes arising from use of the service.</p></section>
      <section><h2>Changes</h2><p>We may update the service or these terms. The effective date above will change when revised terms are published. Continued use after an update constitutes acceptance where permitted by law.</p></section>
      <section><h2>Contact</h2><p>Questions about these terms can be sent to <a href="mailto:jtrygg@gmail.com">jtrygg@gmail.com</a>.</p></section>
    </LegalPage>
  );
}
