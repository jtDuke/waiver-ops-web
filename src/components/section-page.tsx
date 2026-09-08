import Link from "next/link";

import { ArrowIcon } from "@/components/icons";

export function SectionPage({ eyebrow, title, description, actionHref, actionLabel, action, children }: { eyebrow: string; title: string; description: string; actionHref?: string; actionLabel?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page-wrap">
      <header className="page-header compact-page-header">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div>
        {action ?? (actionHref && actionLabel ? <Link className="button primary-button" href={actionHref}>{actionLabel}<ArrowIcon /></Link> : null)}
      </header>
      {children}
    </div>
  );
}
