import { z } from "zod";

export const providerSchema = z.enum(["sleeper", "yahoo"]);

export const identitySchema = z.object({
  user_id: z.string(),
  email: z.string().nullable(),
  display_name: z.string(),
  picture_url: z.string().nullable(),
});

export const providerConnectionSchema = z.object({
  provider: providerSchema,
  connected: z.boolean(),
  external_account_id: z.string().nullable(),
  display_name: z.string().nullable(),
});

export const connectionListResponseSchema = z.object({
  connections: z.array(providerConnectionSchema),
});

export const meResponseSchema = z.object({
  identity: identitySchema,
  connections: z.array(providerConnectionSchema),
  league_count: z.number().int().nonnegative(),
});

export const leagueSchema = z.object({
  provider: providerSchema,
  league_id: z.string(),
  display_name: z.string().nullable(),
  season: z.string(),
  owner_external_user_id: z.string().nullable(),
  last_synced_at: z.iso.datetime(),
});

export const leagueListResponseSchema = z.object({
  leagues: z.array(leagueSchema),
});

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "not_ready"]),
});

export const preferencesResponseSchema = z.object({
  default_provider: providerSchema.nullable(),
  default_league_id: z.string().nullable(),
  values: z.record(z.string(), z.unknown()),
});

export const refreshResponseSchema = z.object({
  provider: providerSchema,
  league_id: z.string(),
  status: z.enum(["refreshed", "cached", "degraded"]),
  warnings: z.array(z.string()),
});

const playerSignalSchema = z
  .object({
    evidence_count: z.number().int().nonnegative(),
    source_count: z.number().int().nonnegative(),
    summary: z.string().nullable(),
    latest_evidence_at: z.iso.datetime({ offset: true }).nullable().optional(),
    hard_status: z.string().nullable().optional(),
    components: z
      .array(
        z.object({
          source_name: z.string(),
          source_url: z.url().nullable(),
          published_at: z.iso.datetime({ offset: true }),
          evidence_type: z.string(),
          summary: z.string(),
          relevance: z.string(),
          direction: z.number().min(-1).max(1),
          effective_weight: z.number(),
          confidence: z.number().min(0).max(1),
          related_player_id: z.string().nullable(),
        }),
      )
      .optional(),
  })
  .passthrough();

export const playerIntelligenceResponseSchema = z.object({
  player_id: z.string(),
  available: z.boolean(),
  generated_at: z.iso.datetime().nullable(),
  fingerprint: z.string(),
  warning: z.string().nullable(),
  signal: playerSignalSchema.nullable(),
});

export const sessionResponseSchema = z.object({
  authenticated: z.literal(true),
  expires_at: z.iso.datetime(),
});

export const yahooStartResponseSchema = z.object({
  authorization_url: z.url(),
});

export const yahooCallbackResponseSchema = z.object({
  connected: z.boolean(),
  league_count: z.number().int().nonnegative(),
});

const rivalFitSchema = z
  .object({
    team_name: z.string(),
    lineup_gain: z.number(),
    next_week_gain: z.number(),
    reason: z.string(),
  })
  .passthrough();

export const recommendationItemSchema = z
  .object({
    player_id: z.string(),
    name: z.string(),
    position: z.string(),
    team: z.string().nullable(),
    age: z.number().int().nullable(),
    status: z.string().nullable(),
    lineup_gain: z.number(),
    next_week_gain: z.number(),
    horizon_projection: z.number(),
    next_projection: z.number(),
    fit_tier: z.string(),
    fit_reason: z.string(),
    competition: z.string(),
    signal_applied: z.boolean(),
    signal_modifier: z.number(),
    signal_confidence: z.number(),
    player_signal: playerSignalSchema.nullable(),
    category_label: z.string(),
    primary_category: z.string(),
    data_complete: z.boolean(),
    completeness_notes: z.array(z.string()),
    rivals_actionable_count: z.number().int().nonnegative().default(0),
    top_rivals: z.array(rivalFitSchema).default([]),
    gross_lineup_gain: z.number().nullable().optional(),
    gross_next_week_gain: z.number().nullable().optional(),
    net_lineup_gain: z.number().nullable().optional(),
    net_next_week_gain: z.number().nullable().optional(),
    net_weekly_gains: z.record(z.string(), z.number()).default({}),
    drop_cost: z.number().nullable().optional(),
    drop_confidence: z.enum(["not_required", "high", "medium", "review"]).optional(),
    recommended_drop: z
      .object({
        player_id: z.string(),
        name: z.string(),
        position: z.string(),
        team: z.string().nullable().optional(),
        horizon_projection: z.number().nullable().optional(),
        net_lineup_gain: z.number().nullable().optional(),
      })
      .nullable()
      .optional(),
    alternative_drops: z.array(z.record(z.string(), z.unknown())).default([]),
  })
  .passthrough();

const recommendationViewSchema = z
  .object({
    target_roster_id: z.string(),
    target_strength: z
      .object({
        team_name: z.string(),
        owner_names: z.array(z.string()),
        league_rank: z.number().int(),
        league_size: z.number().int().positive(),
      })
      .passthrough(),
    strongest_need: z.string(),
    roster_players: z.array(z.object({
      player_id: z.string(), name: z.string(), position: z.string(),
      team: z.string().nullable(), slot: z.enum(["Starter", "Bench", "IR", "Taxi"]),
    })).default([]),
    recommendations: z.array(recommendationItemSchema),
    direct_recommendations: z.array(recommendationItemSchema),
    primary_recommendations: z.array(recommendationItemSchema).optional(),
    watchlist_recommendations: z.array(recommendationItemSchema).default([]),
    strategic_adds: z.array(recommendationItemSchema),
    roster_assessment: z
      .object({
        weakest_position: z.string().nullable(),
        weakness_score: z.number().nullable(),
        weakness_explanation: z.string(),
        best_waiver_opportunity: z
          .object({
            player_id: z.string(),
            name: z.string(),
            position: z.string(),
            net_lineup_gain: z.number().nullable(),
            tier: z.string(),
          })
          .nullable(),
      })
      .optional(),
  })
  .passthrough();

const intelligenceStatusSchema = z.object({
  enabled: z.boolean(),
  fingerprint: z.string().nullable(),
  generated_at: z.string().nullable(),
  warning: z.string().nullable(),
});

export const recommendationResponseSchema = z.object({
  provider: providerSchema,
  league_id: z.string(),
  week: z.number().int().positive(),
  league: z
    .object({
      name: z.string(),
      season: z.string(),
    })
    .passthrough(),
  recommendation_available: z.boolean(),
  recommendation_reason: z.string().nullable(),
  recommendation_view: recommendationViewSchema.nullable(),
  source_warnings: z.array(z.record(z.string(), z.unknown())),
  intelligence: intelligenceStatusSchema,
  league_pulse: z
    .object({
      lookback_hours: z.number().int().positive(),
      market_status: z.enum(["ready", "unavailable"]).default("unavailable"),
      activity_status: z.enum(["ready", "unavailable"]).default("unavailable"),
      market_trends: z.array(
        z.object({
          player_id: z.string(),
          name: z.string(),
          position: z.string(),
          team: z.string().nullable(),
          adds: z.number().int().nonnegative(),
        }),
      ),
      league_activity: z.array(
        z.object({
          transaction_id: z.string(),
          team_names: z.array(z.string()).default([]),
          type: z.string(),
          created: z.unknown().nullable().optional(),
          adds: z.array(z.record(z.string(), z.unknown())),
          drops: z.array(z.record(z.string(), z.unknown())),
        }),
      ),
      rival_opportunities: z.array(
        z.object({
          player_id: z.string(),
          name: z.string(),
          position: z.string(),
          team: z.string().nullable(),
          best_rival_gain: z.number(),
          rival_teams_helped: z.number().int().nonnegative(),
          top_teams: z.array(z.string()),
        }),
      ),
    })
    .default({
      lookback_hours: 24,
      market_status: "unavailable",
      activity_status: "unavailable",
      market_trends: [],
      league_activity: [],
      rival_opportunities: [],
    }),
  meta: z
    .object({
      engine_version: z.string(),
      generated_at: z.iso.datetime({ offset: true }),
      cache_status: z.enum(["hit", "miss", "stale"]),
      cache_age_seconds: z.number().nonnegative(),
      cache_layer: z.enum(["memory", "postgres", "computed"]),
      source_fingerprint: z.string(),
      timings_ms: z.record(z.string(), z.number()),
    })
    .nullable()
    .optional(),
});

export const recommendationProgressResponseSchema = z.object({
  step: z.number().int().min(0).max(5),
  total_steps: z.number().int().positive(),
  message: z.string(),
  complete: z.boolean(),
  failed: z.boolean(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
export type League = z.infer<typeof leagueSchema>;
export type Recommendation = z.infer<typeof recommendationItemSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type ProviderConnection = z.infer<typeof providerConnectionSchema>;
export type PlayerIntelligenceResponse = z.infer<typeof playerIntelligenceResponseSchema>;
export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type RecommendationProgress = z.infer<typeof recommendationProgressResponseSchema>;

export type DashboardSnapshot =
  | {
      status: "ready";
      me: MeResponse;
      leagues: League[];
      preferences: PreferencesResponse;
    }
  | {
      status: "unavailable";
      reason: string;
    };

export type RecommendationSnapshot =
  | {
      status: "ready";
      data: RecommendationResponse & {
        recommendation_view: NonNullable<RecommendationResponse["recommendation_view"]>;
      };
    }
  | {
      status: "not-ready";
      data: RecommendationResponse;
      reason: string;
    }
  | {
      status: "unavailable";
      reason: string;
      retryAfterMs?: number;
      busy?: boolean;
    };

export type ConnectionSnapshot =
  | {
      status: "ready";
      connections: ProviderConnection[];
    }
  | {
      status: "unavailable";
      reason: string;
    };

export type PlayerIntelligenceSnapshot =
  | {
      status: "ready";
      data: PlayerIntelligenceResponse & {
        signal: NonNullable<PlayerIntelligenceResponse["signal"]>;
      };
    }
  | {
      status: "empty";
      reason: string;
    }
  | {
      status: "unavailable";
      reason: string;
    };
