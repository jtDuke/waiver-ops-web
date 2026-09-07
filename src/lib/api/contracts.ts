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
    recommendations: z.array(recommendationItemSchema),
    direct_recommendations: z.array(recommendationItemSchema),
    strategic_adds: z.array(recommendationItemSchema),
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
});

export type MeResponse = z.infer<typeof meResponseSchema>;
export type League = z.infer<typeof leagueSchema>;
export type Recommendation = z.infer<typeof recommendationItemSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type ProviderConnection = z.infer<typeof providerConnectionSchema>;
export type PlayerIntelligenceResponse = z.infer<typeof playerIntelligenceResponseSchema>;

export type DashboardSnapshot =
  | {
      status: "ready";
      me: MeResponse;
      leagues: League[];
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
