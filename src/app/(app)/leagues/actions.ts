"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { refreshLeague, saveDefaultLeague } from "@/lib/api/server";
import { requireAuth0Session } from "@/lib/auth/session";

export type LeagueActionState = {
  status: "idle" | "success" | "warning" | "error";
  message: string;
};

const providerSchema = z.enum(["sleeper", "yahoo"]);
const defaultLeagueSchema = z
  .string()
  .max(320)
  .transform((value) => value.trim());

export async function saveDefaultLeagueAction(
  _previousState: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const value = defaultLeagueSchema.safeParse(formData.get("defaultLeague"));
  if (!value.success) {
    return { status: "error", message: "Choose a valid default league." };
  }

  const [providerValue, ...leagueParts] = value.data.split("::");
  const leagueId = leagueParts.join("::");
  const provider = providerSchema.safeParse(providerValue);
  if (value.data && (!provider.success || !leagueId)) {
    return { status: "error", message: "Choose a valid default league." };
  }

  try {
    await requireAuth0Session();
    await saveDefaultLeague(
      value.data && provider.success ? provider.data : null,
      value.data ? leagueId : null,
    );
    revalidatePath("/");
    revalidatePath("/leagues");
    return {
      status: "success",
      message: value.data
        ? "Your default league was saved."
        : "The default league was cleared.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "The default league could not be saved.",
    };
  }
}

export async function refreshLeagueAction(
  providerValue: string,
  leagueId: string,
  _previousState: LeagueActionState,
  _formData: FormData,
): Promise<LeagueActionState> {
  void _previousState;
  void _formData;
  const provider = providerSchema.safeParse(providerValue);
  if (!provider.success || !leagueId.trim()) {
    return { status: "error", message: "This league address is invalid." };
  }

  try {
    await requireAuth0Session();
    const result = await refreshLeague(provider.data, leagueId);
    revalidatePath("/");
    revalidatePath("/leagues");
    revalidatePath(`/leagues/${provider.data}/${leagueId}`);
    if (result.status === "degraded") {
      return {
        status: "warning",
        message:
          result.warnings[0] ??
          "Refresh completed, but at least one source could not be updated.",
      };
    }
    if (result.status === "cached") {
      return {
        status: "success",
        message: "Your latest league data is already current.",
      };
    }
    return { status: "success", message: "League data refreshed." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "League data could not be refreshed.",
    };
  }
}
