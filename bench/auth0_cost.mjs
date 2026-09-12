// What the Auth0 session cookie costs per read.
//
// src/proxy.ts calls auth0.middleware(request) before it checks PUBLIC_PATHS, so
// the session cookie is decrypted on every matched request -- the marketing home
// page and every ~1 Hz progress poll included. This measures one decrypt with the
// SDK's own encrypt/decrypt, using a secret generated here for the benchmark.
//
//   node bench/auth0_cost.mjs

import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "../node_modules/@auth0/nextjs-auth0/dist/server/cookies.js";

const SECRET = randomBytes(32).toString("hex");
const ITERATIONS = 500;

const now = Math.floor(Date.now() / 1000);
const session = {
  user: {
    sub: "auth0|000000000000000000000000",
    name: "Waiver manager",
    email: "manager@example.com",
    email_verified: true,
    nickname: "manager",
    picture: "https://example.com/avatar.png",
    updated_at: new Date().toISOString(),
    sid: randomBytes(16).toString("hex"),
  },
  tokenSet: {
    idToken: `${"e".repeat(700)}`,
    accessToken: `${"a".repeat(700)}`,
    refreshToken: `${"r".repeat(200)}`,
    scope: "openid profile email offline_access",
    expiresAt: now + 86_400,
  },
  internal: { sid: randomBytes(16).toString("hex"), createdAt: now },
};

const cookie = await encrypt(session, SECRET, now + 86_400);
console.log(`cookie bytes: ${Buffer.byteLength(cookie).toLocaleString()}`);

// warm
for (let i = 0; i < 50; i += 1) await decrypt(cookie, SECRET);

const started = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i += 1) await decrypt(cookie, SECRET);
const perDecrypt = Number(process.hrtime.bigint() - started) / 1e6 / ITERATIONS;

const startedEncrypt = process.hrtime.bigint();
for (let i = 0; i < ITERATIONS; i += 1) await encrypt(session, SECRET, now + 86_400);
const perEncrypt = Number(process.hrtime.bigint() - startedEncrypt) / 1e6 / ITERATIONS;

console.log(`decrypt: ${perDecrypt.toFixed(3)} ms   encrypt: ${perEncrypt.toFixed(3)} ms`);
console.log("");
console.log("Per request the proxy does decrypt in middleware() and again in getSession();");
console.log("a rendered page adds getShellIdentity() (React-cached), a progress poll adds");
console.log("requireAuth0Session() -- three decrypts either way.");
console.log(`three decrypts: ${(perDecrypt * 3).toFixed(2)} ms`);
console.log(`45 progress polls x 3 decrypts: ${(perDecrypt * 3 * 45).toFixed(0)} ms of proxy CPU`);
