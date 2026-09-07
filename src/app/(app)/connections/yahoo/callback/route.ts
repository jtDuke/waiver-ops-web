import { NextRequest, NextResponse } from "next/server";

import { completeYahooAuthorization } from "@/lib/api/server";
import { requireAuth0Session } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  const state = request.nextUrl.searchParams.get("state")?.trim();
  const destination = new URL("/connections", request.url);
  if (!code || !state) {
    destination.searchParams.set("error", "yahoo_callback");
    return NextResponse.redirect(destination);
  }

  try {
    await requireAuth0Session();
    await completeYahooAuthorization(code, state);
    destination.searchParams.set("connected", "yahoo");
  } catch {
    destination.searchParams.set("error", "yahoo_callback");
  }
  return NextResponse.redirect(destination);
}
