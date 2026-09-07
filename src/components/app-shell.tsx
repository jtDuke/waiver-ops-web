import Link from "next/link";

import { PlusIcon, SettingsIcon } from "@/components/icons";
import { Navigation } from "@/components/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link aria-label="Waiver Ops dashboard" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">W</span>
          <span className="brand-copy"><strong>Waiver Ops</strong><small>Decision intelligence</small></span>
        </Link>
        <Navigation />
        <div className="sidebar-action">
          <p>Ready for another league?</p>
          <Link className="button secondary-button" href="/connections"><PlusIcon />Add Connection</Link>
        </div>
        <div className="profile-chip">
          <span aria-hidden="true" className="avatar"><SettingsIcon /></span>
          <span><strong>Your Account</strong><small>2026 season</small></span>
        </div>
      </aside>
      <div className="content-column">
        <header className="mobile-header">
          <Link aria-label="Waiver Ops dashboard" className="brand" href="/">
            <span aria-hidden="true" className="brand-mark">W</span>
            <span className="brand-copy"><strong>Waiver Ops</strong></span>
          </Link>
          <Link className="compact-action" href="/connections">Add League</Link>
        </header>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
