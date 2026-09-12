// What JSON.parse and the Zod contract cost on a real recommendation response,
// and what the same work costs once the arrays the board never reads are gone.
//
//   node bench/zod_parse.mjs <payload.json> [...]

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { recommendationResponseSchema } from "../src/lib/api/contracts.ts";

const ITERATIONS = 200;
const UNREAD_VIEW_KEYS = [
  "recommendations",
  "direct_recommendations",
  "league_watch",
  "strategic_adds",
  "roster_assessment",
  "category_counts",
  "watchlist",
];
const UNREAD_TOP_KEYS = ["scoring_audit", "trending_adds", "source_manifest"];

function time(label, fn) {
  fn(); // warm the JIT before the timed run
  const started = process.hrtime.bigint();
  for (let i = 0; i < ITERATIONS; i += 1) fn();
  const ms = Number(process.hrtime.bigint() - started) / 1e6 / ITERATIONS;
  return { label, ms };
}

function trim(value) {
  const copy = structuredClone(value);
  for (const key of UNREAD_TOP_KEYS) delete copy[key];
  if (copy.recommendation_view) {
    for (const key of UNREAD_VIEW_KEYS) delete copy.recommendation_view[key];
  }
  return copy;
}

const rows = [];
for (const path of process.argv.slice(2)) {
  const text = readFileSync(path, "utf8");
  const parsed = JSON.parse(text);
  const trimmedText = JSON.stringify(trim(parsed));

  const jsonFull = time("JSON.parse full", () => JSON.parse(text));
  const jsonTrim = time("JSON.parse trimmed", () => JSON.parse(trimmedText));
  const zodFull = time("safeParse full", () => recommendationResponseSchema.safeParse(parsed));
  const trimmedValue = JSON.parse(trimmedText);
  const zodTrim = time("safeParse trimmed", () => recommendationResponseSchema.safeParse(trimmedValue));

  const ok = recommendationResponseSchema.safeParse(parsed).success;
  const trimOk = recommendationResponseSchema.safeParse(trimmedValue).success;
  rows.push({
    file: basename(path),
    bytes: Buffer.byteLength(text),
    trimmedBytes: Buffer.byteLength(trimmedText),
    validates: ok,
    trimmedValidates: trimOk,
    jsonFull: jsonFull.ms,
    jsonTrim: jsonTrim.ms,
    zodFull: zodFull.ms,
    zodTrim: zodTrim.ms,
  });
}

const pad = (value, width) => String(value).padStart(width);
console.log(
  `${"payload".padEnd(26)}${pad("bytes", 9)}${pad("trimmed", 9)}${pad("JSON", 8)}${pad("JSON'", 8)}${pad("zod", 8)}${pad("zod'", 8)}${pad("valid", 7)}`,
);
for (const row of rows) {
  console.log(
    row.file.padEnd(26) +
      pad(row.bytes.toLocaleString(), 9) +
      pad(row.trimmedBytes.toLocaleString(), 9) +
      pad(row.jsonFull.toFixed(2), 8) +
      pad(row.jsonTrim.toFixed(2), 8) +
      pad(row.zodFull.toFixed(2), 8) +
      pad(row.zodTrim.toFixed(2), 8) +
      pad(`${row.validates}/${row.trimmedValidates}`, 7),
  );
}
console.log(`\nms per operation, mean of ${ITERATIONS} iterations. ' = arrays the board never reads removed.`);
