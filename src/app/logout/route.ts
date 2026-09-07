import { NextRequest, NextResponse } from "next/server";

import { auth0Enabled } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const destination = auth0Enabled() ? "/auth/logout?returnTo=/" : "/";
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.delete("waiver_session");
  return response;
}
