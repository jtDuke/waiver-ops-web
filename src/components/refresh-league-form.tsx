"use client";

import { useActionState } from "react";

import {
  refreshLeagueAction,
} from "@/app/(app)/leagues/actions";
import type { LeagueActionState } from "@/app/(app)/leagues/actions";

const initialLeagueActionState: LeagueActionState = {
  status: "idle",
  message: "",
};

export function RefreshLeagueForm({
  provider,
  leagueId,
}: {
  provider: string;
  leagueId: string;
}) {
  const action = refreshLeagueAction.bind(null, provider, leagueId);
  const [state, formAction, pending] = useActionState(
    action,
    initialLeagueActionState,
  );

  return (
    <form action={formAction} className="refresh-league-form">
      <button className="button primary-button" disabled={pending} type="submit">
        {pending ? "Refreshing…" : "Refresh league"}
      </button>
      <p aria-live="polite" className={`form-message ${state.status}`}>
        {state.message}
      </p>
    </form>
  );
}
