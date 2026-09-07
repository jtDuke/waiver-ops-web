"use client";

import { useEffect } from "react";
import Link from "next/link";

import { PulseIcon } from "@/components/icons";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-wrap">
      <section className="panel placeholder-panel error-boundary">
        <span aria-hidden="true" className="empty-icon"><PulseIcon /></span>
        <p className="eyebrow">Temporary interruption</p>
        <h1>This View Couldn’t Be Loaded</h1>
        <p>Your data was not changed. Retry the request, or return to the dashboard if the service is still recovering.</p>
        <div className="auth-state-actions">
          <button className="button primary-button" onClick={reset} type="button">Try Again</button>
          <Link className="button secondary-button" href="/">Dashboard</Link>
        </div>
      </section>
    </div>
  );
}
