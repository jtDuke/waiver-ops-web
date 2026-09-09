import { NextRequest, NextResponse } from "next/server";

import { auth0Enabled } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const destination = new URL(auth0Enabled() ? "/auth/logout" : "/", request.url);
  if (auth0Enabled()) {
    destination.searchParams.set("returnTo", new URL("/", request.url).toString());
  }
  const response = NextResponse.redirect(destination);
  response.cookies.delete("waiver_session");
  return response;
}
