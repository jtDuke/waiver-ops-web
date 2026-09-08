import type { Metadata } from "next";

import { LegalPage } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WaiverOps collects, uses, stores, and shares information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains what information WaiverOps receives, why we use it, and the choices available to you."
    >
      <section><h2>Who operates WaiverOps</h2><p>WaiverOps is currently operated by its individual owner. Questions or privacy requests can be sent to <a href="mailto:jtrygg@gmail.com">jtrygg@gmail.com</a>.</p></section>
      <section><h2>Information we collect</h2><p>We collect information needed to provide the service:</p><ul><li><strong>Account information.</strong> When you sign in through Auth0 or Google, we may receive your account identifier, name, email address, email-verification status, and profile image.</li><li><strong>Fantasy-provider information.</strong> When you connect a supported provider such as Yahoo or Sleeper, we process the leagues, teams, rosters, players, settings, and related identifiers needed to provide league-specific recommendations.</li><li><strong>Preferences and product activity.</strong> We store choices such as your default league and operational information needed to secure, diagnose, and improve the service.</li><li><strong>Technical information.</strong> Hosting and authentication providers may process IP addresses, browser information, request timestamps, and security logs.</li></ul></section>
      <section><h2>Google user data</h2><p>WaiverOps uses Google Sign-In only to authenticate your account. We request basic identity information: your name, email address, email-verification status, profile image, and a stable account identifier. We do not request access to Gmail, Google Drive, Google Calendar, contacts, or other Google service content.</p><p>We use this information to create and secure your WaiverOps account, display your identity inside the product, and associate your saved preferences and provider connections with the correct account. We do not sell Google user data or use it for advertising.</p></section>
      <section><h2>How we use information</h2><ul><li>Authenticate users and maintain secure sessions.</li><li>Connect supported fantasy providers at your direction.</li><li>Generate league-aware player analysis and waiver recommendations.</li><li>Save user preferences and connection status.</li><li>Detect abuse, troubleshoot failures, and protect the service.</li><li>Comply with legal obligations and enforce our terms.</li></ul></section>
      <section><h2>How information is shared</h2><p>We do not sell personal information. Information may be processed by service providers that help operate WaiverOps, including Auth0 for authentication, Vercel for the website, Render for the application API, Neon for database hosting, and fantasy providers you choose to connect. These providers process information under their own terms and privacy commitments.</p><p>We may also disclose information when required by law, to protect users or the service, or as part of a future business transfer with appropriate notice and safeguards.</p></section>
      <section><h2>Provider credentials and security</h2><p>Provider access tokens and application credentials are kept on the server and are not intentionally exposed to browser JavaScript. We use access controls, encryption, restricted database roles, and secure session cookies designed to limit unauthorized access. No system can guarantee absolute security.</p></section>
      <section><h2>Retention</h2><p>We retain account, preference, connection, and operational data for as long as needed to provide and secure the service. Retention may continue where reasonably necessary for backups, fraud prevention, dispute resolution, or legal compliance. Provider tokens may be removed or invalidated when you disconnect a provider or request account deletion.</p></section>
      <section><h2>Your choices</h2><p>You can choose not to connect a fantasy provider, revoke provider access through the provider, or stop using WaiverOps. To request access, correction, disconnection, or deletion of your WaiverOps account data, email <a href="mailto:jtrygg@gmail.com">jtrygg@gmail.com</a>. We may need to verify your identity before completing a request.</p></section>
      <section><h2>Children’s privacy</h2><p>WaiverOps is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p></section>
      <section><h2>Changes to this policy</h2><p>We may update this policy as the product or legal requirements change. The effective date above will be updated when changes are published. Material changes will be communicated through the service or another reasonable channel.</p></section>
      <section><h2>Contact</h2><p>Email privacy questions or requests to <a href="mailto:jtrygg@gmail.com">jtrygg@gmail.com</a>.</p></section>
    </LegalPage>
  );
}
