const hosted =
  process.env.VERCEL === "1" ||
  ["preview", "production"].includes(process.env.VERCEL_ENV ?? "");

if (!hosted) {
  console.log("Hosted configuration check skipped outside Vercel.");
  process.exit(0);
}

const required = [
  "WAIVER_API_BASE_URL",
  "WAIVER_WEB_AUTH_MODE",
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
];
const failures = [];
const missing = required.filter((name) => !(process.env[name] ?? "").trim());
if (missing.length > 0) {
  failures.push(`missing variables: ${missing.join(", ")}`);
}

if ((process.env.WAIVER_WEB_AUTH_MODE ?? "").trim().toLowerCase() !== "auth0") {
  failures.push("WAIVER_WEB_AUTH_MODE must be auth0");
}

for (const name of ["WAIVER_API_BASE_URL", "APP_BASE_URL"]) {
  const value = (process.env[name] ?? "").trim();
  if (value) {
    try {
      const parsed = new URL(value);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        (parsed.pathname !== "/" && parsed.pathname !== "")
      ) {
        failures.push(`${name} must be an exact HTTPS origin`);
      }
    } catch {
      failures.push(`${name} must be a valid HTTPS origin`);
    }
  }
}

const auth0Domain = (process.env.AUTH0_DOMAIN ?? "").trim();
if (
  auth0Domain &&
  (auth0Domain.includes("://") || auth0Domain.includes("/") || auth0Domain.includes("@"))
) {
  failures.push("AUTH0_DOMAIN must be a hostname without a scheme or path");
}
if (Buffer.byteLength(process.env.AUTH0_SECRET ?? "", "utf8") < 32) {
  failures.push("AUTH0_SECRET must contain at least 32 bytes");
}

const exposed = Object.keys(process.env).filter(
  (name) =>
    name.startsWith("NEXT_PUBLIC_") &&
    /(AUTH0|DATABASE|SECRET|TOKEN|WAIVER_API)/i.test(name),
);
if (exposed.length > 0) {
  failures.push(`browser-exposed sensitive variables: ${exposed.join(", ")}`);
}

if (failures.length > 0) {
  console.error(`Hosted configuration is unsafe:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Hosted Vercel configuration is structurally valid.");
