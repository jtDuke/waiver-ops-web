import "server-only";

import { cookies } from "next/headers";
import type { ZodType } from "zod";

import {
  healthResponseSchema,
  leagueListResponseSchema,
  meResponseSchema,
  providerSchema,
  recommendationResponseSchema,
  type DashboardSnapshot,
  type RecommendationSnapshot,
} from "@/lib/api/contracts";

const LOCAL_API_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 4_000;

class ApiRequestError extends Error {}

function apiBaseUrl(): string | null {
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
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new ApiRequestError(`The application API returned ${response.status}.`);
  }

  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new ApiRequestError("The application API returned an unexpected response.");
  }

  return result.data;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) {
    return {
      status: "unavailable",
      reason: "The application API has not been configured for this environment.",
    };
  }

  try {
    const cookieHeader = (await cookies()).toString();
    const [health, me, leagueList] = await Promise.all([
      requestApi(baseUrl, "/health/ready", "", healthResponseSchema),
      requestApi(baseUrl, "/api/v1/me", cookieHeader, meResponseSchema),
      requestApi(
        baseUrl,
        "/api/v1/leagues",
        cookieHeader,
        leagueListResponseSchema,
      ),
    ]);

    if (health.status !== "ok") {
      throw new ApiRequestError("The application API is not ready.");
    }

    return { status: "ready", me, leagues: leagueList.leagues };
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

  const baseUrl = apiBaseUrl();
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
