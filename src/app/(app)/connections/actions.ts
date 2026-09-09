"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { connectSleeper } from "@/lib/api/server";
import { requireAuth0Session } from "@/lib/auth/session";

const sleeperConnectionSchema = z.object({
  username: z.string().trim().min(1, "Enter your Sleeper username.").max(64),
  season: z.coerce.number().int().min(2020).max(2100),
});

export type ConnectionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function connectSleeperAction(
  _previousState: ConnectionActionState,
  formData: FormData,
): Promise<ConnectionActionState> {
  const values = sleeperConnectionSchema.safeParse({
    username: formData.get("username"),
    season: formData.get("season"),
  });
  if (!values.success) {
    return { status: "error", message: values.error.issues[0]?.message ?? "Check the connection details." };
  }

  try {
    await requireAuth0Session();
    await connectSleeper(values.data.username, values.data.season);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Sleeper could not be connected.",
    };
  }

  revalidatePath("/");
  revalidatePath("/leagues");
  revalidatePath("/connections");
  redirect("/leagues?connected=sleeper");
}
