"use client";

import { useActionState } from "react";

import {
  saveDefaultLeagueAction,
} from "@/app/(app)/leagues/actions";
import type { LeagueActionState } from "@/app/(app)/leagues/actions";
import type { League, PreferencesResponse } from "@/lib/api/contracts";

const initialLeagueActionState: LeagueActionState = {
  status: "idle",
  message: "",
};

export function DefaultLeagueForm({
  leagues,
  preferences,
}: {
  leagues: League[];
  preferences: PreferencesResponse;
}) {
  const [state, formAction, pending] = useActionState(
    saveDefaultLeagueAction,
    initialLeagueActionState,
  );
  const selected =
    preferences.default_provider && preferences.default_league_id
      ? `${preferences.default_provider}::${preferences.default_league_id}`
      : "";

  return (
    <form action={formAction} className="default-league-form panel">
      <div>
        <label htmlFor="default-league">Default league</label>
        <p>Show your most important league first on the dashboard.</p>
      </div>
      <select defaultValue={selected} id="default-league" name="defaultLeague">
        <option value="">No default league</option>
        {leagues.map((league) => (
          <option
            key={`${league.provider}:${league.league_id}`}
            value={`${league.provider}::${league.league_id}`}
          >
            {league.display_name ?? `${league.provider} league`} · {league.provider}
          </option>
        ))}
      </select>
      <button className="button secondary-button" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save default"}
      </button>
      <p aria-live="polite" className={`form-message ${state.status}`}>
        {state.message}
      </p>
    </form>
  );
}
