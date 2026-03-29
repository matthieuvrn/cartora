"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { prisma } from "@/infrastructure/db/prisma";
import { CreateItem } from "@/application/use-cases/CreateItem";
import { UpdateItem } from "@/application/use-cases/UpdateItem";
import { DeleteItem } from "@/application/use-cases/DeleteItem";
import { ReorderItems } from "@/application/use-cases/ReorderItems";
import { PublishMenu } from "@/application/use-cases/PublishMenu";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { MAX_PRICE_CENTS } from "@/domain/menu/ItemPolicy";
import { MAX_DISPLAY_NAME_LENGTH } from "@/domain/restaurant/RestaurantPolicy";
import { RenameRestaurant } from "@/application/use-cases/RenameRestaurant";
import { GenerateQrCode } from "@/application/use-cases/GenerateQrCode";
import { NodeQrCodeGenerator } from "@/infrastructure/qr/NodeQrCodeGenerator";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { PrismaQrAssetRepository } from "@/infrastructure/qr/PrismaQrAssetRepository";

// ─── State ──────────────────────────────────────────────────────────────────

export type ItemActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export type PublishActionState = {
  error: string | null;
};

export type RenameActionState = {
  error: string | null;
  success?: boolean;
};

// ─── Schemas Zod v4 ─────────────────────────────────────────────────────────

const TranslationSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const CreateItemSchema = z.object({
  categoryId: z.uuid(),
  priceEur: z.coerce
    .number()
    .min(0)
    .max(MAX_PRICE_CENTS / 100),
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  translations: z.object({
    fr: TranslationSchema,
    en: TranslationSchema,
  }),
});

const UpdateItemSchema = z.object({
  itemId: z.uuid(),
  priceEur: z.coerce
    .number()
    .min(0)
    .max(MAX_PRICE_CENTS / 100),
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  isAvailable: z.boolean(),
  translations: z.object({
    fr: TranslationSchema,
    en: TranslationSchema,
  }),
});

const DeleteItemSchema = z.object({
  itemId: z.uuid(),
});

const ReorderItemsSchema = z.object({
  categoryId: z.uuid(),
  itemIds: z.array(z.uuid()).min(1),
});

const RenameRestaurantSchema = z.object({
  displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedRestaurantId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurant) throw new Error("No restaurant found");

  return restaurant.id;
}

function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createItemAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = CreateItemSchema.safeParse({
    categoryId: formData.get("categoryId"),
    priceEur: formData.get("priceEur"),
    badge: formData.get("badge"),
    translations: {
      fr: {
        name: formData.get("nameFr") ?? "",
        description: formData.get("descriptionFr") ?? "",
      },
      en: {
        name: formData.get("nameEn") ?? "",
        description: formData.get("descriptionEn") ?? "",
      },
    },
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] = issue.message;
    }
    return { error: "validation", fieldErrors };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const useCase = new CreateItem(repo);

    await useCase.execute({
      categoryId: parsed.data.categoryId,
      restaurantId,
      priceCents: eurToCents(parsed.data.priceEur),
      badge: parsed.data.badge,
      translations: parsed.data.translations,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    console.error("[createItem]", e);
    return { error: e instanceof Error ? e.message : "generic" };
  }
}

export async function updateItemAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = UpdateItemSchema.safeParse({
    itemId: formData.get("itemId"),
    priceEur: formData.get("priceEur"),
    badge: formData.get("badge"),
    isAvailable: formData.get("isAvailable") === "true",
    translations: {
      fr: {
        name: formData.get("nameFr") ?? "",
        description: formData.get("descriptionFr") ?? "",
      },
      en: {
        name: formData.get("nameEn") ?? "",
        description: formData.get("descriptionEn") ?? "",
      },
    },
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] = issue.message;
    }
    return { error: "validation", fieldErrors };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const useCase = new UpdateItem(repo);

    await useCase.execute({
      itemId: parsed.data.itemId,
      restaurantId,
      priceCents: eurToCents(parsed.data.priceEur),
      badge: parsed.data.badge,
      isAvailable: parsed.data.isAvailable,
      translations: parsed.data.translations,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    console.error("[updateItem]", e);
    return { error: e instanceof Error ? e.message : "generic" };
  }
}

export async function deleteItemAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = DeleteItemSchema.safeParse({
    itemId: formData.get("itemId"),
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const useCase = new DeleteItem(repo);

    await useCase.execute({
      itemId: parsed.data.itemId,
      restaurantId,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    console.error("[deleteItem]", e);
    return { error: e instanceof Error ? e.message : "generic" };
  }
}

export async function reorderItemsAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const raw = formData.get("itemIds");
  let itemIds: unknown = [];
  if (typeof raw === "string") {
    try {
      itemIds = JSON.parse(raw);
    } catch {
      return { error: "validation" };
    }
  }

  const parsed = ReorderItemsSchema.safeParse({
    categoryId: formData.get("categoryId"),
    itemIds,
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const useCase = new ReorderItems(repo);

    await useCase.execute({
      categoryId: parsed.data.categoryId,
      restaurantId,
      itemIds: parsed.data.itemIds,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    console.error("[reorderItems]", e);
    return { error: e instanceof Error ? e.message : "generic" };
  }
}

export async function publishMenuAction(_prev: PublishActionState): Promise<PublishActionState> {
  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const menuRepo = new PrismaMenuRepository(prisma);
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const snapshotRepo = new PrismaSnapshotRepository(prisma);
    const clock = new SystemClock();
    const useCase = new PublishMenu(menuRepo, restaurantRepo, snapshotRepo, clock);

    const { slug } = await useCase.execute({ restaurantId });

    // QR code generation — non-blocking for publish success
    try {
      const qrGenerator = new NodeQrCodeGenerator();
      const storageService = new SupabaseStorageService();
      const qrAssetRepo = new PrismaQrAssetRepository(prisma);
      const generateQr = new GenerateQrCode(qrGenerator, storageService, qrAssetRepo);
      const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}`;
      await generateQr.execute({ restaurantId, slug, menuUrl });
    } catch (qrError) {
      console.error("[publishMenu] QR generation failed:", qrError);
    }

    revalidateTag(`public-menu-${slug}`, "default");
    revalidatePath("/app");
    return { error: null };
  } catch (e) {
    console.error("[publishMenu]", e);
    return { error: e instanceof Error ? e.message : "generic" };
  }
}

export async function renameRestaurantAction(
  _prev: RenameActionState,
  formData: FormData,
): Promise<RenameActionState> {
  const parsed = RenameRestaurantSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const useCase = new RenameRestaurant(restaurantRepo);

    await useCase.execute({
      restaurantId,
      displayName: parsed.data.displayName,
    });

    const menuRepo = new PrismaMenuRepository(prisma);
    await menuRepo.markMenuAsDraft(restaurantId);

    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    console.error("[renameRestaurant]", e);
    return { error: e instanceof Error ? e.message : "generic" };
  }
}
