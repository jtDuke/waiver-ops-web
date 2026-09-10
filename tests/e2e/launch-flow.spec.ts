import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("connects Sleeper, waits for league discovery, and opens the loaded leagues", async ({ page, request }) => {
  await request.post("http://127.0.0.1:4010/__test__/sleeper/disconnect");
  await page.goto("/connections");

  await expect(page.getByText("Not connected", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Sleeper username").fill("TestManager");
  await page.getByRole("button", { name: "Connect" }).click();

  await expect(page).toHaveURL(/\/leagues\?connected=sleeper$/);
  await expect(page.getByText("Sleeper connected. 1 league loaded.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Sunday Strategy/ })).toBeVisible();
});

test("advertises only complete launch destinations", async ({ page }) => {
  await page.goto("/dashboard");

  const navigation = page.getByRole("navigation", { name: "Primary" });
  await expect(navigation.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Leagues" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Intelligence" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open a Recommendation Board" })).toHaveAttribute("href", "/leagues");
});

test("publishes a public home page and legal disclosures", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Know why before you claim." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open dashboard" }).first()).toHaveAttribute(
    "href",
    "/dashboard",
  );
  await expect(page.getByRole("link", { name: "Privacy" }).first()).toHaveAttribute(
    "href",
    "/privacy",
  );

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Google user data" })).toBeVisible();
  await expect(page.getByText("jtrygg@gmail.com").first()).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
});

test("redirects retired placeholder routes to useful live surfaces", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/connections$/);

  await page.goto("/intelligence");
  await expect(page).toHaveURL(/\/leagues$/);
});

test("saves a default league and completes the waiver decision flow", async ({ page }) => {
  await page.goto("/leagues");

  await page.getByLabel("Default league").selectOption("sleeper::league-1");
  await page.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByText("Your default league was saved.")).toBeVisible();
  await expect(page.getByText("Default", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /Sunday Strategy/ }).click();
  await expect(page.getByRole("heading", { name: "Building Your Priority Board" })).toBeVisible();
  await expect(page.getByText("Checking saved analysis", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best Moves for This Roster" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Jordan Example" })).toBeVisible();
  await expect(page.getByText("Meaningful news", { exact: true })).toBeVisible();
  await expect(page.locator(".recommendation-card").first().getByText(/Review dropping Bench Example/)).toBeVisible();

  await page.locator(".secondary-board > summary").click();
  await expect(page.getByRole("heading", { name: "Casey Baseline" })).toBeVisible();

  await page.locator(".league-pulse > summary").click();
  await expect(page.getByText("Trending Player", { exact: true })).toBeVisible();
  await expect(page.getByText("Rival Target", { exact: true })).toBeVisible();

  await page.locator(".recommendation-card .move-details > summary").first().click();
  await expect(page.getByText(/Modeled fit for 1 rival team/)).toBeVisible();
  await expect(page.getByText("Fourth and Long")).toBeVisible();
  await expect(page.getByText(/not claim intent/)).toBeVisible();

  await page.getByRole("button", { name: "Refresh league" }).click();
  await expect(page.getByText(/League data refreshed|already current/)).toBeVisible();

  await page.getByRole("checkbox", { name: "Meaningful news only" }).check();
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(page).toHaveURL(/news=1/);
  await expect(page.getByRole("heading", { name: "Jordan Example" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Casey Baseline" })).toHaveCount(0);

  await page.locator(".recommendation-card .move-details > summary").first().click();
  await page.getByRole("link", { name: "Read ranked evidence" }).click();
  await expect(page.getByRole("heading", { name: /Jordan Example/ })).toBeVisible();
  await expect(page.getByText("The player worked with the first-team offense throughout the week.")).toBeVisible();
});

test("fails closed when a user guesses another league URL", async ({ page }) => {
  await page.goto("/leagues/sleeper/forbidden");

  await expect(page.getByRole("heading", { name: "Recommendation Data Is Unavailable" })).toBeVisible();
  await expect(page.getByText("League is not owned by this user.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("offers bounded busy recovery without changing league or filters", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/leagues/sleeper/busy-retry?news=1");
  await expect(page.getByRole("heading", { name: "Analysis Is Temporarily Busy" })).toBeVisible();
  const retry = page.getByRole("button", { name: "Try again" });
  await expect(retry).toBeDisabled();
  await expect(retry).toBeEnabled({ timeout: 5_000 });
  await retry.click();
  await expect(page.getByRole("button", { name: "Checking…" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Best Moves for This Roster" })).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/busy-retry\?news=1$/);
});

test("recovers from one transient recommendation gateway failure", async ({ page }) => {
  await page.goto("/leagues/sleeper/transient-retry");

  await expect(page.getByRole("heading", { name: "Best Moves for This Roster" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Jordan Example" })).toBeVisible();
  await expect(page.getByText("The application API returned 502.")).toHaveCount(0);
});
