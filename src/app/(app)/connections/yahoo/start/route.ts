import { NextRequest, NextResponse } from "next/server";

import { getYahooAuthorizationUrl } from "@/lib/api/server";
import { requireAuth0Session } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    await requireAuth0Session();
    const authorizationUrl = await getYahooAuthorizationUrl();
    return NextResponse.redirect(authorizationUrl);
  } catch {
    const url = new URL("/connections", request.url);
    url.searchParams.set("error", "yahoo_start");
    return NextResponse.redirect(url);
  }
}
