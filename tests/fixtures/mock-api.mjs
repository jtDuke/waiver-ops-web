import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 4010);
const generatedAt = "2026-09-07T20:00:00Z";
let preferences = {
  default_provider: null,
  default_league_id: null,
  values: { hidden_dashboard_leagues: [] },
};
let refreshCount = 0;
let sleeperConnected = true;
let recommendationStartedAt = 0;

const leagues = [
  {
    provider: "sleeper",
    league_id: "league-1",
    display_name: "Sunday Strategy",
    season: "2026",
    owner_external_user_id: "sleeper-user-1",
    last_synced_at: generatedAt,
  },
];

const signal = {
  evidence_count: 2,
  source_count: 2,
  summary: "A larger route share and teammate injury improve the near-term opportunity.",
  latest_evidence_at: generatedAt,
  hard_status: null,
  components: [
    {
      source_name: "League report",
      source_url: "https://example.test/evidence/player-1",
      published_at: generatedAt,
      evidence_type: "role_change",
      summary: "The player worked with the first-team offense throughout the week.",
      relevance: "high",
      direction: 0.8,
      effective_weight: 0.7,
      confidence: 0.9,
      related_player_id: "teammate-1",
    },
  ],
};

function recommendation(overrides) {
  return {
    player_id: "player-1",
    name: "Jordan Example",
    position: "WR",
    team: "SEA",
    age: 24,
    status: "Active",
    lineup_gain: 1.4,
    next_week_gain: 2.1,
    gross_lineup_gain: 1.8,
    gross_next_week_gain: 2.5,
    net_lineup_gain: 1.4,
    net_next_week_gain: 2.1,
    net_weekly_gains: { 1: 2.1, 2: 1.2, 3: 0.8 },
    drop_cost: 0.4,
    drop_confidence: "high",
    recommended_drop: {
      player_id: "drop-1",
      name: "Bench Example",
      position: "WR",
      team: "SEA",
      horizon_projection: 4.2,
      net_lineup_gain: 1.4,
    },
    alternative_drops: [],
    horizon_projection: 31.2,
    next_projection: 11.4,
    fit_tier: "Good fit",
    fit_reason: "Projects into your FLEX mix and improves the three-week lineup outlook.",
    competition: "Medium",
    signal_applied: true,
    signal_modifier: 0.08,
    signal_confidence: 0.9,
    player_signal: signal,
    category_label: "Lineup upgrade",
    primary_category: "lineup_upgrade",
    data_complete: true,
    completeness_notes: [],
    rivals_actionable_count: 1,
    top_rivals: [
      {
        team_name: "Fourth and Long",
        lineup_gain: 1.1,
        next_week_gain: 1.6,
        reason: "Improves its FLEX outlook by 1.1 points per week.",
      },
    ],
    ...overrides,
  };
}

const recommendations = [
  recommendation({}),
  recommendation({
    player_id: "player-2",
    name: "Casey Baseline",
    position: "RB",
    team: "DEN",
    player_signal: null,
    signal_applied: false,
    signal_modifier: 0,
    signal_confidence: 0,
    rivals_actionable_count: 0,
    top_rivals: [],
    fit_tier: "Small edge",
    lineup_gain: 0.6,
    next_week_gain: 0.8,
    net_lineup_gain: 0.6,
    net_next_week_gain: 0.8,
    net_weekly_gains: { 1: 0.8, 2: 0.6, 3: 0.4 },
  }),
];

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const { pathname } = url;

  if (pathname === "/health/live" || pathname === "/health/ready") {
    return json(response, 200, { status: "ok" });
  }
  if (pathname === "/__test__/sleeper/disconnect" && request.method === "POST") {
    sleeperConnected = false;
    return json(response, 200, { reset: true });
  }
  if (pathname === "/api/v1/me") {
    return json(response, 200, {
      identity: {
        user_id: "user-1",
        email: "manager@example.test",
        display_name: "Test Manager",
        picture_url: null,
      },
      connections: [
        {
          provider: "sleeper",
          connected: sleeperConnected,
          external_account_id: sleeperConnected ? "sleeper-user-1" : null,
          display_name: sleeperConnected ? "TestManager" : null,
        },
        {
          provider: "yahoo",
          connected: false,
          external_account_id: null,
          display_name: null,
        },
      ],
      league_count: sleeperConnected ? leagues.length : 0,
    });
  }
  if (pathname === "/api/v1/connections" && request.method === "GET") {
    return json(response, 200, {
      connections: [
        {
          provider: "sleeper",
          connected: sleeperConnected,
          external_account_id: sleeperConnected ? "sleeper-user-1" : null,
          display_name: sleeperConnected ? "TestManager" : null,
        },
        {
          provider: "yahoo",
          connected: false,
          external_account_id: null,
          display_name: null,
        },
      ],
    });
  }
  if (pathname === "/api/v1/connections/sleeper" && request.method === "POST") {
    const body = await readJson(request);
    await new Promise((resolve) => setTimeout(resolve, 4_500));
    sleeperConnected = true;
    return json(response, 200, {
      provider: "sleeper",
      connected: true,
      external_account_id: "sleeper-user-1",
      display_name: body.username,
    });
  }
  if (pathname === "/api/v1/leagues") {
    return json(response, 200, { leagues: sleeperConnected ? leagues : [] });
  }
  if (pathname === "/api/v1/preferences" && request.method === "GET") {
    return json(response, 200, preferences);
  }
  if (pathname === "/api/v1/preferences" && request.method === "PATCH") {
    preferences = await readJson(request);
    return json(response, 200, preferences);
  }
  if (pathname === "/api/v1/leagues/sleeper/forbidden/recommendations") {
    return json(response, 403, { detail: "League is not owned by this user." });
  }
  if (pathname === "/api/v1/leagues/sleeper/league-1/recommendation-progress") {
    const stages = [
      "Checking saved analysis",
      "Loading league and rosters",
      "Loading projections and intelligence",
      "Evaluating add/drop pairs",
      "Preparing the priority board",
    ];
    const elapsed = recommendationStartedAt ? Date.now() - recommendationStartedAt : 0;
    const step = Math.min(4, Math.floor(elapsed / 900));
    return json(response, 200, {
      step,
      total_steps: 5,
      message: stages[step],
      complete: false,
      failed: false,
    });
  }
  if (pathname === "/api/v1/leagues/sleeper/league-1/recommendations") {
    recommendationStartedAt = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 4_500));
    return json(response, 200, {
      provider: "sleeper",
      league_id: "league-1",
      week: 1,
      league: { name: "Sunday Strategy", season: "2026" },
      recommendation_available: true,
      recommendation_reason: null,
      recommendation_view: {
        target_roster_id: "1",
        target_strength: {
          team_name: "Waiver Scientists",
          owner_names: ["Test Manager"],
          league_rank: 7,
          league_size: 12,
        },
        strongest_need: "WR",
        roster_assessment: {
          weakest_position: "WR",
          weakness_score: 0.7,
          weakness_explanation: "WR grades furthest below this league's roster-count and projected-quality medians.",
          best_waiver_opportunity: {
            player_id: "player-1",
            name: "Jordan Example",
            position: "WR",
            net_lineup_gain: 1.4,
            tier: "Useful move",
          },
        },
        recommendations,
        direct_recommendations: [recommendations[0]],
        primary_recommendations: [recommendations[0]],
        watchlist_recommendations: [recommendations[1]],
        strategic_adds: [],
      },
      league_pulse: {
        lookback_hours: 24,
        market_status: "ready",
        activity_status: "ready",
        market_trends: [{ player_id: "trend-1", name: "Trending Player", position: "RB", team: "GB", adds: 1834 }],
        league_activity: [],
        rival_opportunities: [{ player_id: "rival-1", name: "Rival Target", position: "TE", team: "BAL", best_rival_gain: 2.4, rival_teams_helped: 2, top_teams: ["Fourth and Long"] }],
      },
      source_warnings: [],
      intelligence: {
        enabled: true,
        fingerprint: "fixture-v2",
        generated_at: generatedAt,
        warning: null,
      },
    });
  }
  if (pathname === "/api/v1/leagues/sleeper/league-1/refresh" && request.method === "POST") {
    refreshCount += 1;
    return json(response, 200, {
      provider: "sleeper",
      league_id: "league-1",
      status: refreshCount === 1 ? "refreshed" : "cached",
      warnings: [],
    });
  }
  if (pathname === "/api/v1/players/player-1/intelligence") {
    return json(response, 200, {
      player_id: "player-1",
      available: true,
      generated_at: generatedAt,
      fingerprint: "fixture-v2",
      warning: null,
      signal,
    });
  }

  return json(response, 404, { detail: `No fixture for ${request.method} ${pathname}` });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Waiver Ops mock API listening on ${port}`);
});

function stop() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
