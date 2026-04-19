"use server";

import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaUserDataRepository } from "@/infrastructure/user-data/PrismaUserDataRepository";
import { ExportUserData } from "@/application/use-cases/ExportUserData";
import type { UserDataExport } from "@/application/ports/UserDataRepository";
import * as Sentry from "@sentry/nextjs";

async function getAuthenticatedUser(): Promise<{ restaurantId: string; email: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurant) throw new Error("No restaurant found");

  return { restaurantId: restaurant.id, email: user.email };
}

export async function exportUserDataAction(): Promise<{
  data: UserDataExport | null;
  error: string | null;
}> {
  try {
    const { restaurantId, email } = await getAuthenticatedUser();
    const repo = new PrismaUserDataRepository(prisma);
    const useCase = new ExportUserData(repo);
    const data = await useCase.execute({ restaurantId, email });
    return { data, error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "exportUserData" } });
    return { data: null, error: "export_failed" };
  }
}
