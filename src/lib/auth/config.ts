import "server-only";

const AUTH0_VARIABLES = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
] as const;

export type WebAuthMode = "development" | "auth0";

export function webAuthMode(): WebAuthMode {
  const configured = process.env.WAIVER_WEB_AUTH_MODE?.trim().toLowerCase();
  if (!configured || configured === "development") {
    return "development";
  }
  if (configured !== "auth0") {
    throw new Error("WAIVER_WEB_AUTH_MODE must be development or auth0.");
  }

  const missing = AUTH0_VARIABLES.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Auth0 is enabled but ${missing.join(", ")} is missing.`);
  }
  return "auth0";
}

export function auth0Enabled(): boolean {
  return webAuthMode() === "auth0";
}

export function safeReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/dashboard";
  }
  const base = "https://waiverops.invalid";
  const parsed = new URL(value, base);
  return parsed.origin === base ? `${parsed.pathname}${parsed.search}` : "/dashboard";
}
