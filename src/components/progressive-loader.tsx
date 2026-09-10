"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const STAGES = [
  "Checking saved analysis",
  "Loading league and rosters",
  "Loading projections and intelligence",
  "Evaluating add/drop pairs",
  "Preparing the priority board",
];

export function ProgressiveLoader({ league = false }: { league?: boolean }) {
  const params = useParams<{ provider?: string; leagueId?: string }>();
  const [visible, setVisible] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState(STAGES[0]);
  const [hasProgress, setHasProgress] = useState(false);

  useEffect(() => {
    const reveal = window.setTimeout(() => setVisible(true), 150);
    const longWait = window.setTimeout(() => setTakingLonger(true), 8_000);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(longWait);
    };
  }, []);

  useEffect(() => {
    if (!league || !params.provider || !params.leagueId) return;
    let stopped = false;
    let pollTimer: number | undefined;
    const controller = new AbortController();
    const pollDeadline = Date.now() + 60_000;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/recommendation-progress/${encodeURIComponent(params.provider ?? "")}/${encodeURIComponent(params.leagueId ?? "")}`,
          { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]) },
        );
        if (response.ok) {
          const progress = await response.json() as {
            step?: unknown;
            message?: unknown;
            complete?: unknown;
            failed?: unknown;
          };
          if (stopped) return;
          if (typeof progress.step === "number" && Number.isFinite(progress.step)) {
            setStep(Math.max(0, Math.min(STAGES.length, progress.step)));
            setHasProgress(true);
          }
          if (typeof progress.message === "string" && progress.message.trim()) {
            setMessage(progress.message);
          }
          if (progress.complete === true || progress.failed === true) return;
        }
      } catch {
        if (stopped) return;
      }
      if (!stopped && Date.now() < pollDeadline) pollTimer = window.setTimeout(poll, 1_000);
    };

    pollTimer = window.setTimeout(poll, 300);
    return () => {
      stopped = true;
      controller.abort();
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
    };
  }, [league, params.leagueId, params.provider]);

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`page-wrap progressive-loading ${visible ? "visible" : ""}`}
    >
      <p className="eyebrow">{league ? "League analysis" : "Waiver Ops"}</p>
      <h1>{league ? "Building Your Priority Board" : "Loading Your Workspace"}</h1>
      <p className="loading-status">
        {takingLonger
          ? `${message}. This is taking longer than usual. We’re waiting for a response; you can return to your leagues at any time.`
          : message}
      </p>
      <div aria-label="Analysis in progress" aria-valuemax={STAGES.length} aria-valuemin={0} aria-valuenow={hasProgress ? step : undefined} className="stage-progress" role="progressbar">
        {STAGES.map((stage, index) => (
          <span
            aria-hidden="true"
            className={index < step ? "complete" : index === step ? "active" : ""}
            key={stage}
          />
        ))}
      </div>
      {league ? (
        <ol className="loading-stages">
          {STAGES.map((stage, index) => (
            <li className={index < step ? "complete" : index === step ? "active" : ""} key={stage}>{stage}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
