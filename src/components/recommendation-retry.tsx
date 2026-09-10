"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RecommendationRetry({ delayMs }: { delayMs: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [coolingDown, setCoolingDown] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setCoolingDown(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, pending]);

  return (
    <div className="recommendation-retry">
      <p role="status">{pending ? "Checking for your analysis…"
        : coolingDown ? "Giving the service a moment before trying again."
        : "You can try again here. Your league selection is preserved."}</p>
      <button className="button primary-button" disabled={pending || coolingDown}
        onClick={() => {
          setCoolingDown(true);
          startTransition(() => router.refresh());
        }} type="button">
        {pending ? "Checking…" : "Try again"}
      </button>
    </div>
  );
}
