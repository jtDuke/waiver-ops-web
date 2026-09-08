import Link from "next/link";

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link aria-label="Waiver Ops home" className="brand public-brand" href="/">
          <span aria-hidden="true" className="brand-mark">W</span>
          <span className="brand-copy"><strong>Waiver Ops</strong><small>Decision intelligence</small></span>
        </Link>
        <nav aria-label="Public navigation" className="public-nav">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link className="button primary-button" href="/dashboard">Open dashboard</Link>
        </nav>
      </header>
      {children}
      <footer className="public-footer">
        <div>
          <Link aria-label="Waiver Ops home" className="brand public-brand" href="/">
            <span aria-hidden="true" className="brand-mark">W</span>
            <span className="brand-copy"><strong>Waiver Ops</strong><small>Make the next move with context.</small></span>
          </Link>
          <p>Independent fantasy-football decision support for sharper waiver choices.</p>
        </div>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href="mailto:jtrygg@gmail.com">Contact</a>
        </nav>
        <small>© 2026 WaiverOps. Not affiliated with the NFL or any fantasy platform.</small>
      </footer>
    </div>
  );
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <PublicSiteShell>
      <main className="legal-page" id="main-content">
        <header>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-intro">{intro}</p>
          <p className="legal-date">Effective September 8, 2026</p>
        </header>
        <article className="legal-copy">{children}</article>
      </main>
    </PublicSiteShell>
  );
}
