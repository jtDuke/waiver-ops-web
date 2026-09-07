import "server-only";

import { cache } from "react";

import { getAuth0Client } from "@/lib/auth/auth0";
import { auth0Enabled } from "@/lib/auth/config";

export type ShellIdentity = {
  name: string;
  email: string | null;
  picture: string | null;
};

export const getShellIdentity = cache(async (): Promise<ShellIdentity | null> => {
  if (!auth0Enabled()) {
    return null;
  }

  const session = await getAuth0Client().getSession();
  if (!session) {
    return null;
  }

  return {
    name: session.user.name ?? session.user.nickname ?? "Waiver manager",
    email: session.user.email ?? null,
    picture: session.user.picture ?? null,
  };
});

export async function requireAuth0Session() {
  if (!auth0Enabled()) {
    return null;
  }
  const session = await getAuth0Client().getSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}
