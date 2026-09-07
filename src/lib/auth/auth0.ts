import "server-only";

import { Auth0Client } from "@auth0/nextjs-auth0/server";

let client: Auth0Client | null = null;

export function getAuth0Client(): Auth0Client {
  client ??= new Auth0Client({
    enableAccessTokenEndpoint: false,
    signInReturnToPath: "/auth/sync",
  });
  return client;
}
