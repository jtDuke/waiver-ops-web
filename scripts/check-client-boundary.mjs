import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const staticDirectory = join(process.cwd(), ".next", "static");
const forbidden = [
  "AUTH0_CLIENT_SECRET",
  "DATABASE_URL_UNPOOLED",
  "WAIVER_DATABASE_URL",
  "WAIVER_TOKEN_ENCRYPTION_KEY",
  "YAHOO_CLIENT_SECRET",
  "waiver_intelligence_writer",
  "ci-auth0-secret-must-stay-server-side",
];

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : [path];
    }),
  );
  return nested.flat();
}

const files = await filesBelow(staticDirectory);
for (const path of files) {
  const content = await readFile(path, "utf8");
  const match = forbidden.find((value) => content.includes(value));
  if (match) {
    throw new Error(`Client asset ${path} contains forbidden server value ${match}.`);
  }
}

console.log(`Client boundary verified across ${files.length} static assets.`);
