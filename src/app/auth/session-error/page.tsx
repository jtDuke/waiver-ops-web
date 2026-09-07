import Link from "next/link";

import { PulseIcon } from "@/components/icons";

export default function SessionErrorPage() {
  return (
    <main className="auth-state-page">
      <section className="panel auth-state-card">
        <span aria-hidden="true" className="empty-icon"><PulseIcon /></span>
        <p className="eyebrow">Session setup</p>
        <h1>We Couldn’t Open Your Waiver Desk</h1>
        <p>Your sign-in succeeded, but the application service could not create a secure session. This is usually a temporary API or configuration issue.</p>
        <div className="auth-state-actions">
          <Link className="button primary-button" href="/auth/sync">Try Again</Link>
          <a className="button secondary-button" href="/auth/logout?returnTo=/">Sign Out</a>
        </div>
      </section>
    </main>
  );
}
