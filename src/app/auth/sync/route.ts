import { NextRequest, NextResponse } from "next/server";

import { exchangeApiSession } from "@/lib/api/server";
import { getAuth0Client } from "@/lib/auth/auth0";
import { auth0Enabled, safeReturnTo } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  if (!auth0Enabled()) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const session = await getAuth0Client().getSession(request);
  const idToken = session?.tokenSet.idToken;
  if (!session || !idToken) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  try {
    const apiCookie = await exchangeApiSession(idToken);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.headers.append("set-cookie", apiCookie);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth/session-error", request.url));
  }
}
