import { defineConfig, devices } from "@playwright/test";

const webPort = 3100;
const apiPort = 4010;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `node tests/fixtures/mock-api.mjs ${apiPort}`,
      url: `http://127.0.0.1:${apiPort}/health/ready`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npm run start -- --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      env: {
        ...process.env,
        WAIVER_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
        WAIVER_WEB_AUTH_MODE: "development",
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
