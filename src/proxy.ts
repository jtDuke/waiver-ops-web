import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuth0Client } from "@/lib/auth/auth0";
import { auth0Enabled } from "@/lib/auth/config";

const PUBLIC_PATHS = new Set(["/privacy"]);

export async function proxy(request: NextRequest) {
  if (!auth0Enabled()) {
    return NextResponse.next();
  }

  const auth0 = getAuth0Client();
  const authResponse = await auth0.middleware(request);
  const path = request.nextUrl.pathname;
  if (path.startsWith("/auth/") || PUBLIC_PATHS.has(path)) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (!session) {
    const destination = `${path}${request.nextUrl.search}`;
    const syncPath = `/auth/sync?returnTo=${encodeURIComponent(destination)}`;
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", syncPath);
    return NextResponse.redirect(loginUrl);
  }

  if (!request.cookies.has("waiver_session") && path !== "/auth/sync") {
    const syncUrl = new URL("/auth/sync", request.url);
    syncUrl.searchParams.set("returnTo", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(syncUrl);
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|sitemap.xml|robots.txt).*)"],
};
