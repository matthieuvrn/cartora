"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { prisma } from "@/infrastructure/db/prisma";
import { CreateItem } from "@/application/use-cases/CreateItem";
import { UpdateItem } from "@/application/use-cases/UpdateItem";
import { DeleteItem } from "@/application/use-cases/DeleteItem";
import { CreateItemImageUploadUrl } from "@/application/use-cases/CreateItemImageUploadUrl";
import { SetItemImage } from "@/application/use-cases/SetItemImage";
import { DeleteItemImage } from "@/application/use-cases/DeleteItemImage";
import { ReorderItems } from "@/application/use-cases/ReorderItems";
import { CreateCategory } from "@/application/use-cases/CreateCategory";
import { RenameCategory } from "@/application/use-cases/RenameCategory";
import { DeleteCategory } from "@/application/use-cases/DeleteCategory";
import { ReorderCategories } from "@/application/use-cases/ReorderCategories";
import { PublishMenu } from "@/application/use-cases/PublishMenu";
import { isDuplicateCategoryNameError } from "@/application/ports/MenuRepository";
import { MAX_CATEGORY_NAME_LENGTH } from "@/domain/menu/CategoryPolicy";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { ALLERGEN_VALUES, MAX_PRICE_CENTS } from "@/domain/menu/ItemPolicy";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_ALT_TEXT_LENGTH } from "@/domain/menu/ItemPhotoPolicy";
import { MAX_DISPLAY_NAME_LENGTH } from "@/domain/restaurant/RestaurantPolicy";
import { RenameRestaurant } from "@/application/use-cases/RenameRestaurant";
import { GenerateQrCode } from "@/application/use-cases/GenerateQrCode";
import { NodeQrCodeGenerator } from "@/infrastructure/qr/NodeQrCodeGenerator";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { PrismaQrAssetRepository } from "@/infrastructure/qr/PrismaQrAssetRepository";
import * as Sentry from "@sentry/nextjs";

// ─── State ──────────────────────────────────────────────────────────────────

export type ItemActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  createdItemId?: string;
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

const AllergensSchema = z.array(z.enum(ALLERGEN_VALUES)).max(ALLERGEN_VALUES.length).default([]);

const CreateItemSchema = z.object({
  categoryId: z.uuid(),
  priceEur: z.coerce
    .number()
    .min(0)
    .max(MAX_PRICE_CENTS / 100),
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
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
  allergens: AllergensSchema,
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

const CategoryNameSchema = z.string().min(1).max(MAX_CATEGORY_NAME_LENGTH);

const CreateCategorySchema = z.object({
  name: CategoryNameSchema,
});

const RenameCategorySchema = z.object({
  categoryId: z.uuid(),
  name: CategoryNameSchema,
});

const DeleteCategorySchema = z.object({
  categoryId: z.uuid(),
});

const ReorderCategoriesSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
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
    allergens: formData.getAll("allergens"),
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

    const { itemId } = await useCase.execute({
      categoryId: parsed.data.categoryId,
      restaurantId,
      priceCents: eurToCents(parsed.data.priceEur),
      badge: parsed.data.badge,
      allergens: parsed.data.allergens,
      translations: parsed.data.translations,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true, createdItemId: itemId };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "createItem" } });
    return { error: "generic" };
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
    allergens: formData.getAll("allergens"),
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
      allergens: parsed.data.allergens,
      isAvailable: parsed.data.isAvailable,
      translations: parsed.data.translations,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "updateItem" } });
    return { error: "generic" };
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
    const itemImageStorage = new SupabaseStorageService("item-images");
    const useCase = new DeleteItem(repo, itemImageStorage);

    await useCase.execute({
      itemId: parsed.data.itemId,
      restaurantId,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "deleteItem" } });
    return { error: "generic" };
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
    Sentry.captureException(e, { tags: { action: "reorderItems" } });
    return { error: "generic" };
  }
}

// ─── Photos d'items ─────────────────────────────────────────────────────────

const CreateImageUploadUrlSchema = z.object({
  itemId: z.uuid(),
  mime: z.enum(ALLOWED_IMAGE_MIME_TYPES),
});

const SetItemImageSchema = z.object({
  itemId: z.uuid(),
  imagePath: z.string().min(1).max(500),
  altTextFr: z.string().max(MAX_ALT_TEXT_LENGTH).optional(),
  altTextEn: z.string().max(MAX_ALT_TEXT_LENGTH).optional(),
});

const DeleteItemImageSchema = z.object({
  itemId: z.uuid(),
});

export type ImageUploadUrlResult =
  | { ok: true; uploadUrl: string; token: string; path: string }
  | { ok: false; error: string };

export async function createItemImageUploadUrlAction(input: {
  itemId: string;
  mime: string;
}): Promise<ImageUploadUrlResult> {
  const parsed = CreateImageUploadUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("item-images");
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const useCase = new CreateItemImageUploadUrl(repo, storage, restaurantRepo);

    const result = await useCase.execute({
      restaurantId,
      itemId: parsed.data.itemId,
      mime: parsed.data.mime,
    });

    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("max_photos_")) {
      return { ok: false, error: "max_photos" };
    }
    Sentry.captureException(e, { tags: { action: "createItemImageUploadUrl" } });
    return { ok: false, error: "generic" };
  }
}

export type ImageMutationResult = { ok: true } | { ok: false; error: string };

export async function setItemImageAction(input: {
  itemId: string;
  imagePath: string;
  altTextFr?: string;
  altTextEn?: string;
}): Promise<ImageMutationResult> {
  const parsed = SetItemImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("item-images");
    const useCase = new SetItemImage(repo, storage);

    await useCase.execute({
      restaurantId,
      itemId: parsed.data.itemId,
      imagePath: parsed.data.imagePath,
      altTextFr: parsed.data.altTextFr,
      altTextEn: parsed.data.altTextEn,
    });

    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "setItemImage" } });
    return { ok: false, error: "generic" };
  }
}

export async function deleteItemImageAction(input: {
  itemId: string;
}): Promise<ImageMutationResult> {
  const parsed = DeleteItemImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("item-images");
    const useCase = new DeleteItemImage(repo, storage);

    await useCase.execute({
      restaurantId,
      itemId: parsed.data.itemId,
    });

    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "deleteItemImage" } });
    return { ok: false, error: "generic" };
  }
}

// ─── Catégories ─────────────────────────────────────────────────────────────

export async function createCategoryAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = CreateCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const menuId = await repo.getMenuIdByRestaurantId(restaurantId);
    if (!menuId) return { error: "generic" };

    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const useCase = new CreateCategory(repo, restaurantRepo);
    await useCase.execute({
      restaurantId,
      menuId,
      name: parsed.data.name,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    if (isDuplicateCategoryNameError(e)) {
      return { error: "duplicate_name" };
    }
    if (e instanceof Error && e.message.startsWith("max_categories_")) {
      // Le code "max_categories" déclenche l'affichage du CTA upgrade côté UI
      // (la limite exacte dépend du tier — l'UI la calcule via PlanPolicy).
      return { error: "max_categories" };
    }
    Sentry.captureException(e, { tags: { action: "createCategory" } });
    return { error: "generic" };
  }
}

export async function renameCategoryAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = RenameCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const useCase = new RenameCategory(repo);

    await useCase.execute({
      restaurantId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    if (isDuplicateCategoryNameError(e)) {
      return { error: "duplicate_name" };
    }
    Sentry.captureException(e, { tags: { action: "renameCategory" } });
    return { error: "generic" };
  }
}

export async function deleteCategoryAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = DeleteCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const useCase = new DeleteCategory(repo);

    await useCase.execute({
      restaurantId,
      categoryId: parsed.data.categoryId,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "deleteCategory" } });
    return { error: "generic" };
  }
}

export async function reorderCategoriesAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const raw = formData.get("orderedIds");
  let orderedIds: unknown = [];
  if (typeof raw === "string") {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      return { error: "validation" };
    }
  }

  const parsed = ReorderCategoriesSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return { error: "validation" };
  }

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const menuId = await repo.getMenuIdByRestaurantId(restaurantId);
    if (!menuId) return { error: "generic" };

    const useCase = new ReorderCategories(repo);
    await useCase.execute({
      restaurantId,
      menuId,
      orderedIds: parsed.data.orderedIds,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "reorderCategories" } });
    return { error: "generic" };
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
      const storageService = new SupabaseStorageService("qr-codes");
      const qrAssetRepo = new PrismaQrAssetRepository(prisma);
      const generateQr = new GenerateQrCode(qrGenerator, storageService, qrAssetRepo);
      const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}?utm_source=qr`;
      await generateQr.execute({ restaurantId, slug, menuUrl });
    } catch (qrError) {
      Sentry.captureException(qrError, { tags: { action: "publishMenu.qr" } });
    }

    revalidateTag(`public-menu-${slug}`, "default");
    revalidatePath("/app");
    return { error: null };
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "publishMenu" } });
    return { error: "generic" };
  }
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export async function dismissActivationChecklistAction(): Promise<void> {
  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    await restaurantRepo.markActivationDismissed(restaurantId);
    revalidatePath("/app");
  } catch (e) {
    Sentry.captureException(e, { tags: { action: "dismissActivationChecklist" } });
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
    Sentry.captureException(e, { tags: { action: "renameRestaurant" } });
    return { error: "generic" };
  }
}
