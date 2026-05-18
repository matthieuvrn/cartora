"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
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
import { UpdateMenuTemplate } from "@/application/use-cases/UpdateMenuTemplate";
import { MENU_TEMPLATE_VALUES } from "@/domain/menu/MenuTypes";
import { DomainError, isDomainError } from "@/domain/errors/DomainError";
import { MAX_CATEGORY_NAME_LENGTH } from "@/domain/menu/CategoryPolicy";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { ALLERGEN_VALUES, MAX_PRICE_CENTS } from "@/domain/menu/ItemPolicy";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_ALT_TEXT_LENGTH } from "@/domain/menu/ItemPhotoPolicy";
import { ALLOWED_LOGO_MIME_TYPES } from "@/domain/restaurant/BrandingPolicy";
import { MAX_DISPLAY_NAME_LENGTH } from "@/domain/restaurant/RestaurantPolicy";
import { CreateRestaurantLogoUploadUrl } from "@/application/use-cases/CreateRestaurantLogoUploadUrl";
import { SetRestaurantLogo } from "@/application/use-cases/SetRestaurantLogo";
import { DeleteRestaurantLogo } from "@/application/use-cases/DeleteRestaurantLogo";
import { CreateDailyEntry } from "@/application/use-cases/CreateDailyEntry";
import { UpdateDailyEntry } from "@/application/use-cases/UpdateDailyEntry";
import { DeleteDailyEntry } from "@/application/use-cases/DeleteDailyEntry";
import { ReorderDailyEntries } from "@/application/use-cases/ReorderDailyEntries";
import { CreateDailyEntryImageUploadUrl } from "@/application/use-cases/CreateDailyEntryImageUploadUrl";
import { SetDailyEntryImage } from "@/application/use-cases/SetDailyEntryImage";
import { DeleteDailyEntryImage } from "@/application/use-cases/DeleteDailyEntryImage";
import { RenameRestaurant } from "@/application/use-cases/RenameRestaurant";
import { UpdateBrandColors } from "@/application/use-cases/UpdateBrandColors";
import { GenerateQrCode } from "@/application/use-cases/GenerateQrCode";
import { NodeQrCodeGenerator } from "@/infrastructure/qr/NodeQrCodeGenerator";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import { PrismaQrAssetRepository } from "@/infrastructure/qr/PrismaQrAssetRepository";
import * as Sentry from "@sentry/nextjs";
import { withActionContext, type ActionError, type ActionState } from "@/lib/action-result";

// ─── State ──────────────────────────────────────────────────────────────────
//
// Phase F : tous les ActionStates partagent maintenant le même shape, basé sur
// `ActionState<TExtra>` du module `@/lib/action-result`. L'`error` est un
// `{ code, metadata? } | null` au lieu d'une string opaque.

export type ItemActionState = ActionState<{ success?: boolean; createdItemId?: string }>;

export type PublishActionState = ActionState<{ slug?: string }>;

export type RenameActionState = ActionState<{ success?: boolean }>;

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

const SetTemplateSchema = z.object({
  template: z.enum(MENU_TEMPLATE_VALUES),
});

const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable();

const UpdateBrandColorsSchema = z.object({
  primary: HexColorSchema,
  accent: HexColorSchema,
  background: HexColorSchema,
  forceLowContrast: z.boolean().default(false),
});

// Menu du jour (S3.1) — `validUntil` est ISO 8601 UTC. Vide ⇒ default = fin de
// journée Europe/Paris calculé par DailyMenuPolicy.defaultExpirationISO côté use case.
const ValidUntilSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime" })
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const CreateDailyEntrySchema = z.object({
  priceEur: z.coerce
    .number()
    .min(0)
    .max(MAX_PRICE_CENTS / 100),
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
  validUntilISO: ValidUntilSchema,
  translations: z.object({
    fr: TranslationSchema,
    en: TranslationSchema,
  }),
});

const UpdateDailyEntrySchema = z.object({
  entryId: z.uuid(),
  priceEur: z.coerce
    .number()
    .min(0)
    .max(MAX_PRICE_CENTS / 100),
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
  validUntilISO: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime" }),
  translations: z.object({
    fr: TranslationSchema,
    en: TranslationSchema,
  }),
});

const DeleteDailyEntrySchema = z.object({
  entryId: z.uuid(),
});

const ReorderDailyEntriesSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

const CreateDailyEntryImageUploadUrlSchema = z.object({
  entryId: z.uuid(),
  mime: z.enum(ALLOWED_IMAGE_MIME_TYPES),
});

const SetDailyEntryImageSchema = z.object({
  entryId: z.uuid(),
  imagePath: z.string().min(1).max(500),
  altTextFr: z.string().max(MAX_ALT_TEXT_LENGTH).optional(),
  altTextEn: z.string().max(MAX_ALT_TEXT_LENGTH).optional(),
});

const DeleteDailyEntryImageSchema = z.object({
  entryId: z.uuid(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedRestaurantId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Session expirée pendant que l'utilisateur remplissait un formulaire :
    // `redirect()` est repropagé tel quel par `withActionContext` (digest NEXT_REDIRECT).
    // Pas de bruit Sentry pour ce cas attendu.
    redirect("/login");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!restaurant) {
    // Edge case improbable (compte sans restaurant) : on relance le flow d'init
    // depuis le dashboard plutôt que de planter en exception silencieuse.
    redirect("/app");
  }

  return restaurant.id;
}

function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

/**
 * Construit la map `fieldErrors` consommée par les composants à partir d'une
 * `ZodSafeParseResult` en échec. Clé = chemin pointé du champ (ex: `translations.fr.name`).
 */
function zodFieldErrors(issues: readonly z.ZodIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    fieldErrors[issue.path.join(".")] = issue.message;
  }
  return fieldErrors;
}

const VALIDATION_ERROR: ActionError = { code: "validation" };

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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "createItem", restaurantId, input: { categoryId: parsed.data.categoryId } },
    async () => {
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
    },
  );
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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "updateItem", restaurantId, input: { itemId: parsed.data.itemId } },
    async () => {
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
    },
  );
}

export async function deleteItemAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = DeleteItemSchema.safeParse({
    itemId: formData.get("itemId"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "deleteItem", restaurantId, input: { itemId: parsed.data.itemId } },
    async () => {
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
    },
  );
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
      return { error: VALIDATION_ERROR };
    }
  }

  const parsed = ReorderItemsSchema.safeParse({
    categoryId: formData.get("categoryId"),
    itemIds,
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "reorderItems", restaurantId, input: { categoryId: parsed.data.categoryId } },
    async () => {
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
    },
  );
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
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "createItemImageUploadUrl" },
      extra: { itemId: parsed.data.itemId, mime: parsed.data.mime },
    });
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
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "setItemImage" },
      extra: { itemId: parsed.data.itemId },
    });
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
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "deleteItemImage" },
      extra: { itemId: parsed.data.itemId },
    });
    return { ok: false, error: "generic" };
  }
}

// ─── Logo restaurant (S2.3) ─────────────────────────────────────────────────

const CreateLogoUploadUrlSchema = z.object({
  mime: z.enum(ALLOWED_LOGO_MIME_TYPES),
});

const SetLogoSchema = z.object({
  logoPath: z.string().min(1).max(500),
});

export async function createRestaurantLogoUploadUrlAction(input: {
  mime: string;
}): Promise<ImageUploadUrlResult> {
  const parsed = CreateLogoUploadUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const storage = new SupabaseStorageService("restaurant-logos");
    const useCase = new CreateRestaurantLogoUploadUrl(storage);

    const result = await useCase.execute({
      restaurantId,
      mime: parsed.data.mime,
    });

    return { ok: true, ...result };
  } catch (e) {
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "createRestaurantLogoUploadUrl" },
      extra: { mime: parsed.data.mime },
    });
    return { ok: false, error: "generic" };
  }
}

export async function setRestaurantLogoAction(input: {
  logoPath: string;
}): Promise<ImageMutationResult> {
  const parsed = SetLogoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const menuRepo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("restaurant-logos");
    const useCase = new SetRestaurantLogo(restaurantRepo, menuRepo, storage);

    await useCase.execute({
      restaurantId,
      logoPath: parsed.data.logoPath,
    });

    revalidatePath("/app");
    revalidatePath("/app/settings/branding");
    return { ok: true };
  } catch (e) {
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, { tags: { action: "setRestaurantLogo" } });
    return { ok: false, error: "generic" };
  }
}

export async function deleteRestaurantLogoAction(): Promise<ImageMutationResult> {
  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const menuRepo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("restaurant-logos");
    const useCase = new DeleteRestaurantLogo(restaurantRepo, menuRepo, storage);

    await useCase.execute({ restaurantId });

    revalidatePath("/app");
    revalidatePath("/app/settings/branding");
    return { ok: true };
  } catch (e) {
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, { tags: { action: "deleteRestaurantLogo" } });
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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "createCategory", restaurantId, input: { name: parsed.data.name } },
    async () => {
      const repo = new PrismaMenuRepository(prisma);
      const menuId = await repo.getMenuIdByRestaurantId(restaurantId);
      if (!menuId) {
        // Edge case improbable : restaurant sans menu (devrait être créé par
        // EnsureRestaurantExists au login). Throw un DomainError typé.
        throw new (await import("@/domain/errors/DomainError")).DomainError("menu_not_found", {
          entityId: restaurantId,
        });
      }

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
    },
  );
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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    {
      actionName: "renameCategory",
      restaurantId,
      input: { categoryId: parsed.data.categoryId },
    },
    async () => {
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
    },
  );
}

export async function deleteCategoryAction(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const parsed = DeleteCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    {
      actionName: "deleteCategory",
      restaurantId,
      input: { categoryId: parsed.data.categoryId },
    },
    async () => {
      const repo = new PrismaMenuRepository(prisma);
      const useCase = new DeleteCategory(repo);

      await useCase.execute({
        restaurantId,
        categoryId: parsed.data.categoryId,
      });

      await repo.markMenuAsDraft(restaurantId);
      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
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
      return { error: VALIDATION_ERROR };
    }
  }

  const parsed = ReorderCategoriesSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "reorderCategories", restaurantId }, async () => {
    const repo = new PrismaMenuRepository(prisma);
    const menuId = await repo.getMenuIdByRestaurantId(restaurantId);
    if (!menuId) {
      throw new DomainError("menu_not_found", { entityId: restaurantId });
    }

    const useCase = new ReorderCategories(repo);
    await useCase.execute({
      restaurantId,
      menuId,
      orderedIds: parsed.data.orderedIds,
    });

    await repo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    return { error: null, success: true };
  });
}

export async function publishMenuAction(_prev: PublishActionState): Promise<PublishActionState> {
  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "publishMenu", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const snapshotRepo = new PrismaSnapshotRepository(prisma);
    const clock = new SystemClock();
    const useCase = new PublishMenu(menuRepo, restaurantRepo, snapshotRepo, clock);

    // 1. Publication — peut throw DomainError("plan_inactive" | "no_items" | …)
    //    qui sera converti en `state.error.code` par `withActionContext`.
    const { slug } = await useCase.execute({ restaurantId });

    // 2. Génération QR — non bloquante. Échec ⇒ warning ambre côté UI, le menu reste
    //    publié. L'utilisateur peut relancer via `regenerateQrAction`.
    let warning: PublishActionState["warning"] = null;
    try {
      const qrGenerator = new NodeQrCodeGenerator();
      const storageService = new SupabaseStorageService("qr-codes");
      const qrAssetRepo = new PrismaQrAssetRepository(prisma);
      const generateQr = new GenerateQrCode(qrGenerator, storageService, qrAssetRepo);
      const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${slug}?utm_source=qr`;
      await generateQr.execute({ restaurantId, slug, menuUrl });
    } catch (qrError) {
      // Warning niveau Sentry : on veut le voir mais ce n'est pas une exception bloquante.
      Sentry.captureException(qrError, {
        tags: { action: "publishMenu", phase: "qr" },
        user: { id: restaurantId },
        level: "warning",
        extra: { slug },
      });
      warning = { code: "qr_failed" };
    }

    revalidateTag(`public-menu-${slug}`, "default");
    revalidatePath("/app");
    return { error: null, slug, warning };
  });
}

/**
 * Régénère un QR code pour le menu déjà publié de l'utilisateur courant.
 * Utilisé quand `publishMenuAction` a renvoyé `warning: { code: "qr_failed" }`.
 */
export async function regenerateQrAction(
  _prev: ActionState<{ success?: boolean }>,
): Promise<ActionState<{ success?: boolean }>> {
  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "regenerateQr", restaurantId }, async () => {
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
    if (!restaurant) {
      // L'utilisateur est authentifié mais n'a pas de restaurant : édge case improbable
      // (cf. EnsureRestaurantExists au login), mais on reste défensif.
      throw new DomainError("restaurant_not_found", { entityId: restaurantId });
    }
    const qrGenerator = new NodeQrCodeGenerator();
    const storageService = new SupabaseStorageService("qr-codes");
    const qrAssetRepo = new PrismaQrAssetRepository(prisma);
    const generateQr = new GenerateQrCode(qrGenerator, storageService, qrAssetRepo);
    const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/m/${restaurant.slug}?utm_source=qr`;
    await generateQr.execute({ restaurantId, slug: restaurant.slug, menuUrl });
    revalidatePath("/app");
    return { error: null, success: true };
  });
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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "renameRestaurant", restaurantId }, async () => {
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
  });
}

export async function setTemplateAction(
  _prev: RenameActionState,
  formData: FormData,
): Promise<RenameActionState> {
  const parsed = SetTemplateSchema.safeParse({
    template: formData.get("template"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "setTemplate", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    await new UpdateMenuTemplate(menuRepo, restaurantRepo).execute({
      restaurantId,
      template: parsed.data.template,
    });
    await menuRepo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    revalidatePath("/app/settings/template");
    return { error: null, success: true };
  });
}

export async function updateBrandColorsAction(
  _prev: RenameActionState,
  formData: FormData,
): Promise<RenameActionState> {
  const parsed = UpdateBrandColorsSchema.safeParse({
    primary: formData.get("primary") ?? "",
    accent: formData.get("accent") ?? "",
    background: formData.get("background") ?? "",
    forceLowContrast: formData.get("forceLowContrast") === "true",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "updateBrandColors", restaurantId }, async () => {
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const menuRepo = new PrismaMenuRepository(prisma);

    const restaurant = await restaurantRepo.getRestaurantById(restaurantId);
    if (!restaurant) {
      throw new DomainError("restaurant_not_found", { entityId: restaurantId });
    }

    await new UpdateBrandColors(restaurantRepo, menuRepo).execute({
      restaurantId,
      primary: parsed.data.primary,
      accent: parsed.data.accent,
      background: parsed.data.background,
      forceLowContrast: parsed.data.forceLowContrast,
    });

    revalidatePath("/app");
    revalidatePath("/app/settings/branding");
    revalidateTag(`public-menu-${restaurant.slug}`, "default");
    return { error: null, success: true };
  });
}

// ─── Menu du jour (S3.1) ─────────────────────────────────────────────────────

export type DailyEntryActionState = ActionState<{ success?: boolean; entryId?: string }>;

export async function createDailyEntryAction(
  _prev: DailyEntryActionState,
  formData: FormData,
): Promise<DailyEntryActionState> {
  const parsed = CreateDailyEntrySchema.safeParse({
    priceEur: formData.get("priceEur"),
    badge: formData.get("badge") ?? "NONE",
    allergens: formData.getAll("allergens"),
    validUntilISO: formData.get("validUntilISO") ?? "",
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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "createDailyEntry", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const clock = new SystemClock();
    const useCase = new CreateDailyEntry(menuRepo, restaurantRepo, clock);

    const { entryId } = await useCase.execute({
      restaurantId,
      priceCents: eurToCents(parsed.data.priceEur),
      badge: parsed.data.badge,
      allergens: parsed.data.allergens,
      validUntilISO: parsed.data.validUntilISO,
      translations: parsed.data.translations,
    });

    revalidatePath("/app");
    return { error: null, success: true, entryId };
  });
}

export async function updateDailyEntryAction(
  _prev: DailyEntryActionState,
  formData: FormData,
): Promise<DailyEntryActionState> {
  const parsed = UpdateDailyEntrySchema.safeParse({
    entryId: formData.get("entryId"),
    priceEur: formData.get("priceEur"),
    badge: formData.get("badge") ?? "NONE",
    allergens: formData.getAll("allergens"),
    validUntilISO: formData.get("validUntilISO") ?? "",
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
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "updateDailyEntry", restaurantId, input: { entryId: parsed.data.entryId } },
    async () => {
      const menuRepo = new PrismaMenuRepository(prisma);
      const restaurantRepo = new PrismaRestaurantRepository(prisma);
      const clock = new SystemClock();
      const useCase = new UpdateDailyEntry(menuRepo, restaurantRepo, clock);

      await useCase.execute({
        entryId: parsed.data.entryId,
        restaurantId,
        priceCents: eurToCents(parsed.data.priceEur),
        badge: parsed.data.badge,
        allergens: parsed.data.allergens,
        validUntilISO: parsed.data.validUntilISO,
        translations: parsed.data.translations,
      });

      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

export async function deleteDailyEntryAction(
  _prev: DailyEntryActionState,
  formData: FormData,
): Promise<DailyEntryActionState> {
  const parsed = DeleteDailyEntrySchema.safeParse({
    entryId: formData.get("entryId"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "deleteDailyEntry", restaurantId, input: { entryId: parsed.data.entryId } },
    async () => {
      const menuRepo = new PrismaMenuRepository(prisma);
      const storage = new SupabaseStorageService("item-images");
      const useCase = new DeleteDailyEntry(menuRepo, storage);

      await useCase.execute({ entryId: parsed.data.entryId, restaurantId });
      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

export async function reorderDailyEntriesAction(
  _prev: DailyEntryActionState,
  formData: FormData,
): Promise<DailyEntryActionState> {
  const raw = formData.get("orderedIds");
  let orderedIds: unknown = [];
  if (typeof raw === "string") {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      return { error: VALIDATION_ERROR };
    }
  }

  const parsed = ReorderDailyEntriesSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "reorderDailyEntries", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const useCase = new ReorderDailyEntries(menuRepo);

    await useCase.execute({ restaurantId, orderedIds: parsed.data.orderedIds });

    revalidatePath("/app");
    return { error: null, success: true };
  });
}

export async function createDailyEntryImageUploadUrlAction(input: {
  entryId: string;
  mime: string;
}): Promise<ImageUploadUrlResult> {
  const parsed = CreateDailyEntryImageUploadUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("item-images");
    const useCase = new CreateDailyEntryImageUploadUrl(repo, storage);

    const result = await useCase.execute({
      restaurantId,
      entryId: parsed.data.entryId,
      mime: parsed.data.mime,
    });

    return { ok: true, ...result };
  } catch (e) {
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "createDailyEntryImageUploadUrl" },
      extra: { entryId: parsed.data.entryId, mime: parsed.data.mime },
    });
    return { ok: false, error: "generic" };
  }
}

export async function setDailyEntryImageAction(input: {
  entryId: string;
  imagePath: string;
  altTextFr?: string;
  altTextEn?: string;
}): Promise<ImageMutationResult> {
  const parsed = SetDailyEntryImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("item-images");
    const useCase = new SetDailyEntryImage(repo, storage);

    await useCase.execute({
      restaurantId,
      entryId: parsed.data.entryId,
      imagePath: parsed.data.imagePath,
      altTextFr: parsed.data.altTextFr,
      altTextEn: parsed.data.altTextEn,
    });

    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "setDailyEntryImage" },
      extra: { entryId: parsed.data.entryId },
    });
    return { ok: false, error: "generic" };
  }
}

export async function deleteDailyEntryImageAction(input: {
  entryId: string;
}): Promise<ImageMutationResult> {
  const parsed = DeleteDailyEntryImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const restaurantId = await getAuthenticatedRestaurantId();
    const repo = new PrismaMenuRepository(prisma);
    const storage = new SupabaseStorageService("item-images");
    const useCase = new DeleteDailyEntryImage(repo, storage);

    await useCase.execute({ restaurantId, entryId: parsed.data.entryId });

    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    if (isDomainError(e)) {
      return { ok: false, error: e.code };
    }
    Sentry.captureException(e, {
      tags: { action: "deleteDailyEntryImage" },
      extra: { entryId: parsed.data.entryId },
    });
    return { ok: false, error: "generic" };
  }
}
