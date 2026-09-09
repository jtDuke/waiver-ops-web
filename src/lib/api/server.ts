import "server-only";

import { cookies } from "next/headers";
import type { ZodType } from "zod";

import {
  connectionListResponseSchema,
  healthResponseSchema,
  leagueListResponseSchema,
  meResponseSchema,
  playerIntelligenceResponseSchema,
  preferencesResponseSchema,
  providerSchema,
  recommendationResponseSchema,
  recommendationProgressResponseSchema,
  refreshResponseSchema,
  sessionResponseSchema,
  yahooCallbackResponseSchema,
  yahooStartResponseSchema,
  type ConnectionSnapshot,
  type DashboardSnapshot,
  type PlayerIntelligenceSnapshot,
  type ProviderConnection,
  type PreferencesResponse,
  type RecommendationSnapshot,
  type RecommendationProgress,
  type RefreshResponse,
} from "@/lib/api/contracts";

const LOCAL_API_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 4_000;
const PROVIDER_MUTATION_TIMEOUT_MS = 20_000;
const RECOMMENDATION_REQUEST_TIMEOUT_MS = 45_000;
const TRANSIENT_RETRY_DELAY_MS = 350;
const TRANSIENT_RETRY_STATUSES = new Set([502, 503, 504]);

export class ApiRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export function getApiBaseUrl(): string | null {
  const configured = process.env.WAIVER_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return process.env.NODE_ENV === "development" ? LOCAL_API_URL : null;
}

async function requestApi<T>(
  baseUrl: string,
  path: string,
  cookieHeader: string,
  schema: ZodType<T>,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    timeoutMs?: number;
    retryTransient?: boolean;
  } = {},
): Promise<T> {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  let response: Response;
  for (let attempt = 0; ; attempt += 1) {
    response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
    });
    const shouldRetry =
      options.retryTransient === true &&
      attempt === 0 &&
      TRANSIENT_RETRY_STATUSES.has(response.status);
    if (!shouldRetry) break;
    await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as unknown;
    const detail =
      typeof body === "object" && body !== null && "detail" in body &&
      typeof body.detail === "string"
        ? body.detail.trim()
        : "";
    throw new ApiRequestError(
      response.status === 401
        ? "Your application session has expired."
        : detail || `The application API returned ${response.status}.`,
      response.status,
    );
  }

  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new ApiRequestError("The application API returned an unexpected response.");
  }

  return result.data;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      status: "unavailable",
      reason: "The application API has not been configured for this environment.",
    };
  }

  try {
    const cookieHeader = (await cookies()).toString();
    const preferencesRequest = requestApi(
      baseUrl,
      "/api/v1/preferences",
      cookieHeader,
      preferencesResponseSchema,
    ).catch(
      (): PreferencesResponse => ({
        default_provider: null,
        default_league_id: null,
        values: {},
      }),
    );
    const [health, me, leagueList, preferences] = await Promise.all([
      requestApi(baseUrl, "/health/ready", "", healthResponseSchema),
      requestApi(baseUrl, "/api/v1/me", cookieHeader, meResponseSchema),
      requestApi(
        baseUrl,
        "/api/v1/leagues",
        cookieHeader,
        leagueListResponseSchema,
      ),
      preferencesRequest,
    ]);

    if (health.status !== "ok") {
      throw new ApiRequestError("The application API is not ready.");
    }

    return { status: "ready", me, leagues: leagueList.leagues, preferences };
  } catch (error) {
    const reason =
      error instanceof ApiRequestError
        ? error.message
        : "The application API is currently unreachable.";
    return { status: "unavailable", reason };
  }
}

export async function getRecommendationSnapshot(
  providerValue: string,
  leagueId: string,
): Promise<RecommendationSnapshot> {
  const provider = providerSchema.safeParse(providerValue);
  if (!provider.success || !leagueId.trim()) {
    return { status: "unavailable", reason: "This league address is invalid." };
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      status: "unavailable",
      reason: "The application API has not been configured for this environment.",
    };
  }

  try {
    const cookieHeader = (await cookies()).toString();
    const data = await requestApi(
      baseUrl,
      `/api/v1/leagues/${provider.data}/${encodeURIComponent(leagueId)}/recommendations`,
      cookieHeader,
      recommendationResponseSchema,
      {
        timeoutMs: RECOMMENDATION_REQUEST_TIMEOUT_MS,
        retryTransient: true,
      },
    );

    if (!data.recommendation_available || !data.recommendation_view) {
      return {
        status: "not-ready",
        data,
        reason: data.recommendation_reason ?? "Recommendations are not available yet.",
      };
    }

    return {
      status: "ready",
      data: {
        ...data,
        recommendation_view: data.recommendation_view,
      },
    };
  } catch (error) {
    const reason =
      error instanceof ApiRequestError
        ? error.message
        : "The application API is currently unreachable.";
    return { status: "unavailable", reason };
  }
}

export async function getRecommendationProgress(
  providerValue: string,
  leagueId: string,
): Promise<RecommendationProgress> {
  const provider = providerSchema.safeParse(providerValue);
  const baseUrl = getApiBaseUrl();
  if (!provider.success || !leagueId.trim() || !baseUrl) {
    throw new ApiRequestError("This league address is invalid.");
  }
  return requestApi(
    baseUrl,
    `/api/v1/leagues/${provider.data}/${encodeURIComponent(leagueId)}/recommendation-progress`,
    (await cookies()).toString(),
    recommendationProgressResponseSchema,
  );
}

export async function exchangeApiSession(idToken: string): Promise<string> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("The application API has not been configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ApiRequestError(
      `The application session exchange returned ${response.status}.`,
      response.status,
    );
  }
  const parsed = sessionResponseSchema.safeParse(await response.json());
  const sessionCookie = response.headers.get("set-cookie");
  if (!parsed.success || !sessionCookie) {
    throw new ApiRequestError("The application session exchange was incomplete.");
  }
  return sessionCookie;
}

export async function getConnectionsSnapshot(): Promise<ConnectionSnapshot> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      status: "unavailable",
      reason: "The application API has not been configured for this environment.",
    };
  }
  try {
    const cookieHeader = (await cookies()).toString();
    const data = await requestApi(
      baseUrl,
      "/api/v1/connections",
      cookieHeader,
      connectionListResponseSchema,
    );
    return { status: "ready", connections: data.connections };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "Connections are unavailable.",
    };
  }
}

export async function connectSleeper(
  username: string,
  season: number,
): Promise<ProviderConnection> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("The application API has not been configured.");
  }
  return requestApi(
    baseUrl,
    "/api/v1/connections/sleeper",
    (await cookies()).toString(),
    connectionListResponseSchema.shape.connections.element,
    {
      method: "POST",
      body: { username, season },
      timeoutMs: PROVIDER_MUTATION_TIMEOUT_MS,
    },
  );
}

export async function getYahooAuthorizationUrl(): Promise<string> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("The application API has not been configured.");
  }
  const data = await requestApi(
    baseUrl,
    "/api/v1/oauth/yahoo/start",
    (await cookies()).toString(),
    yahooStartResponseSchema,
  );
  return data.authorization_url;
}

export async function completeYahooAuthorization(
  code: string,
  state: string,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("The application API has not been configured.");
  }
  const query = new URLSearchParams({ code, state });
  await requestApi(
    baseUrl,
    `/api/v1/oauth/yahoo/callback?${query}`,
    (await cookies()).toString(),
    yahooCallbackResponseSchema,
  );
}

export async function getPlayerIntelligenceSnapshot(
  playerId: string,
): Promise<PlayerIntelligenceSnapshot> {
  if (!playerId.trim()) {
    return { status: "unavailable", reason: "This player address is invalid." };
  }
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { status: "unavailable", reason: "The application API is not configured." };
  }
  try {
    const data = await requestApi(
      baseUrl,
      `/api/v1/players/${encodeURIComponent(playerId)}/intelligence`,
      (await cookies()).toString(),
      playerIntelligenceResponseSchema,
    );
    if (!data.available || !data.signal) {
      return {
        status: "empty",
        reason: data.warning ?? "No meaningful evidence is available for this player.",
      };
    }
    return { status: "ready", data: { ...data, signal: data.signal } };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "Player intelligence is unavailable.",
    };
  }
}

export async function saveDefaultLeague(
  providerValue: string | null,
  leagueId: string | null,
): Promise<PreferencesResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("The application API has not been configured.");
  }
  const provider = providerValue === null ? null : providerSchema.safeParse(providerValue);
  if (providerValue !== null && (!provider || !provider.success || !leagueId?.trim())) {
    throw new ApiRequestError("The selected default league is invalid.");
  }
  const cookieHeader = (await cookies()).toString();
  const current = await requestApi(
    baseUrl,
    "/api/v1/preferences",
    cookieHeader,
    preferencesResponseSchema,
  );
  return requestApi(
    baseUrl,
    "/api/v1/preferences",
    cookieHeader,
    preferencesResponseSchema,
    {
      method: "PATCH",
      body: {
        default_provider: providerValue === null ? null : provider?.data,
        default_league_id: providerValue === null ? null : leagueId,
        values: current.values,
      },
    },
  );
}

export async function refreshLeague(
  providerValue: string,
  leagueId: string,
): Promise<RefreshResponse> {
  const provider = providerSchema.safeParse(providerValue);
  if (!provider.success || !leagueId.trim()) {
    throw new ApiRequestError("This league address is invalid.");
  }
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError("The application API has not been configured.");
  }
  return requestApi(
    baseUrl,
    `/api/v1/leagues/${provider.data}/${encodeURIComponent(leagueId)}/refresh`,
    (await cookies()).toString(),
    refreshResponseSchema,
    { method: "POST" },
  );
}
