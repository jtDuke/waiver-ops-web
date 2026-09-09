import { getRecommendationProgress } from "@/lib/api/server";
import { requireAuth0Session } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/recommendation-progress/[provider]/[leagueId]">,
) {
  try {
    await requireAuth0Session();
    const { provider, leagueId } = await context.params;
    const progress = await getRecommendationProgress(provider, leagueId);
    return Response.json(progress, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { detail: "Recommendation progress is unavailable." },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
}
