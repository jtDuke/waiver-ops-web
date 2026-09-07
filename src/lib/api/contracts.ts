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

export type MeResponse = z.infer<typeof meResponseSchema>;
export type League = z.infer<typeof leagueSchema>;

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
