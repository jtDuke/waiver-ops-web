"use client";

import { useActionState } from "react";

import {
  connectSleeperAction,
} from "@/app/(app)/connections/actions";
import type { ConnectionActionState } from "@/app/(app)/connections/actions";

const initialConnectionState: ConnectionActionState = {
  status: "idle",
  message: "",
};

export function SleeperConnectionForm({
  connectedName,
}: {
  connectedName?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    connectSleeperAction,
    initialConnectionState,
  );

  return (
    <form action={formAction} className="connection-form">
      <label htmlFor="sleeper-username">Sleeper username</label>
      <div className="inline-form-row">
        <input
          autoComplete="username"
          defaultValue={connectedName ?? ""}
          id="sleeper-username"
          maxLength={64}
          name="username"
          placeholder="Your Sleeper username"
          required
        />
        <input aria-label="Season" defaultValue="2026" min="2020" max="2100" name="season" type="number" />
        <button className="button primary-button" disabled={pending} type="submit">
          {pending ? "Connecting…" : connectedName ? "Update" : "Connect"}
        </button>
      </div>
      <p aria-live="polite" className={`form-message ${state.status}`}>
        {state.message}
      </p>
    </form>
  );
}
