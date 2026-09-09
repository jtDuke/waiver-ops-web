import { NextRequest, NextResponse } from "next/server";

import { ApiRequestError, exchangeApiSession } from "@/lib/api/server";
import { getAuth0Client } from "@/lib/auth/auth0";
import { auth0Enabled, safeReturnTo } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const reauthenticated = request.nextUrl.searchParams.get("reauthenticated") === "1";
  if (!auth0Enabled()) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const session = await getAuth0Client().getSession(request);
  const idToken = session?.tokenSet.idToken;
  if (!session || !idToken) {
    return NextResponse.redirect(loginUrl(request, returnTo, false));
  }

  try {
    const apiCookie = await exchangeApiSession(idToken);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.headers.append("set-cookie", apiCookie);
    return response;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      error.status === 401 &&
      !reauthenticated
    ) {
      return NextResponse.redirect(loginUrl(request, returnTo, true));
    }
    return NextResponse.redirect(new URL("/auth/session-error", request.url));
  }
}

function loginUrl(
  request: NextRequest,
  returnTo: string,
  reauthenticated: boolean,
): URL {
  const syncReturn = new URL("/auth/sync", request.url);
  syncReturn.searchParams.set("returnTo", returnTo);
  if (reauthenticated) syncReturn.searchParams.set("reauthenticated", "1");

  const login = new URL("/auth/login", request.url);
  login.searchParams.set("returnTo", `${syncReturn.pathname}${syncReturn.search}`);
  return login;
}
