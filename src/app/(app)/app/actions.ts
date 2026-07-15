"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { PrismaMenuRepository } from "@/infrastructure/menu/PrismaMenuRepository";
import { prisma } from "@/infrastructure/db/prisma";
import { CreateItem } from "@/application/use-cases/CreateItem";
import { UpdateItem } from "@/application/use-cases/UpdateItem";
import { DeleteItem } from "@/application/use-cases/DeleteItem";
import { ReorderItems } from "@/application/use-cases/ReorderItems";
import { CreateCategory } from "@/application/use-cases/CreateCategory";
import { RenameCategory } from "@/application/use-cases/RenameCategory";
import { DeleteCategory } from "@/application/use-cases/DeleteCategory";
import { ReorderCategories } from "@/application/use-cases/ReorderCategories";
import { PublishMenu } from "@/application/use-cases/PublishMenu";
import { UpdateMenuTemplate } from "@/application/use-cases/UpdateMenuTemplate";
import { UpdateMenuLocales } from "@/application/use-cases/UpdateMenuLocales";
import { AutoTranslateMenu } from "@/application/use-cases/AutoTranslateMenu";
import { PrismaTranslationRepository } from "@/infrastructure/menu/PrismaTranslationRepository";
import { DeepLTranslationService } from "@/infrastructure/translation/DeepLTranslationService";
import { createRateLimiter } from "@/infrastructure/rate-limit/createRateLimiter";
import { SUPPORTED_MENU_LOCALES, type MenuLocale } from "@/domain/menu/MenuLocale";
import { MENU_TEMPLATE_VALUES } from "@/domain/menu/MenuTypes";
import { DomainError, isDomainError } from "@/domain/errors/DomainError";
import { MAX_CATEGORY_NAME_LENGTH } from "@/domain/menu/CategoryPolicy";
import { PrismaRestaurantRepository } from "@/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaSnapshotRepository } from "@/infrastructure/snapshot/PrismaSnapshotRepository";
import { SystemClock } from "@/infrastructure/clock/SystemClock";
import { ALLERGEN_VALUES, MAX_PRICE_CENTS } from "@/domain/menu/ItemPolicy";
import { ALLOWED_LOGO_MIME_TYPES } from "@/domain/restaurant/BrandingPolicy";
import { MAX_DISPLAY_NAME_LENGTH } from "@/domain/restaurant/RestaurantPolicy";
import { CreateRestaurantLogoUploadUrl } from "@/application/use-cases/CreateRestaurantLogoUploadUrl";
import { SetRestaurantLogo } from "@/application/use-cases/SetRestaurantLogo";
import { DeleteRestaurantLogo } from "@/application/use-cases/DeleteRestaurantLogo";
import { CreateDailyDish } from "@/application/use-cases/CreateDailyDish";
import { UpdateDailyDish } from "@/application/use-cases/UpdateDailyDish";
import { DeleteDailyDish } from "@/application/use-cases/DeleteDailyDish";
import { ReorderDailyDishes } from "@/application/use-cases/ReorderDailyDishes";
import { CreateFormula } from "@/application/use-cases/CreateFormula";
import { UpdateFormula } from "@/application/use-cases/UpdateFormula";
import { DeleteFormula } from "@/application/use-cases/DeleteFormula";
import { ReorderFormulas } from "@/application/use-cases/ReorderFormulas";
import { RenameRestaurant } from "@/application/use-cases/RenameRestaurant";
import { UpdateBrandColors } from "@/application/use-cases/UpdateBrandColors";
import { UpdateQrStyle } from "@/application/use-cases/UpdateQrStyle";
import { SetItemAvailability } from "@/application/use-cases/SetItemAvailability";
import { SupabaseStorageService } from "@/infrastructure/storage/SupabaseStorageService";
import * as Sentry from "@sentry/nextjs";
import { withActionContext, type ActionError, type ActionState } from "@/lib/action-result";
import { parsePriceEurToCents } from "@/lib/price";

// ─── State ──────────────────────────────────────────────────────────────────
//
// Phase F : tous les ActionStates partagent maintenant le même shape, basé sur
// `ActionState<TExtra>` du module `@/lib/action-result`. L'`error` est un
// `{ code, metadata? } | null` au lieu d'une string opaque.

export type ItemActionState = ActionState<{ success?: boolean; createdItemId?: string }>;

export type PublishActionState = ActionState<{ slug?: string }>;

export type RenameActionState = ActionState<{ success?: boolean }>;

// ─── Schemas Zod v4 ─────────────────────────────────────────────────────────

const AllergensSchema = z.array(z.enum(ALLERGEN_VALUES)).max(ALLERGEN_VALUES.length).default([]);

// Prix saisi librement (« 12,50 », « 12.50 », « 12 € ») → CENTIMES entiers.
// La normalisation vit dans `parsePriceEurToCents` (src/lib/price, testé).
// Le champ FormData reste `priceEur` ; sa valeur PARSÉE est en centimes.
const PriceEurSchema = z.string().transform((value, ctx) => {
  const cents = parsePriceEurToCents(value);
  if (cents === null || cents > MAX_PRICE_CENTS) {
    ctx.addIssue({ code: "custom", message: "Prix invalide (ex : 12,50)" });
    return z.NEVER;
  }
  return cents;
});

// S4 (saisie monolingue) : un seul nom/description — la langue de saisie vient du
// restaurant (`source_locale`), les traductions cibles vivent dans /app/traductions.
const CreateItemSchema = z.object({
  categoryId: z.uuid(),
  priceEur: PriceEurSchema,
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
  name: z.string(),
  description: z.string(),
});

const UpdateItemSchema = z.object({
  itemId: z.uuid(),
  priceEur: PriceEurSchema,
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
  isAvailable: z.boolean(),
  name: z.string(),
  description: z.string(),
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

// Codes bruts (max 10 chars) — la normalisation/validation métier vit dans
// MenuLocalePolicy via le use case, pas ici.
const UpdateMenuLocalesSchema = z.object({
  locales: z.array(z.string().max(10)).max(SUPPORTED_MENU_LOCALES.length * 2),
});

const AutoTranslateMenuSchema = z.object({
  targetLocale: z.string().max(10),
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

// Personnalisation du QR (page Partage). Couleurs requises (un QR a toujours 2 tons) ;
// les styles restent des `string` — l'énumération curée + les invariants de
// scannabilité (contraste, code non inversé) sont validés par `QrStylePolicy`.
const HexRequiredSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const UpdateQrStyleSchema = z.object({
  darkColor: HexRequiredSchema,
  lightColor: HexRequiredSchema,
  dotsStyle: z.string().min(1).max(20),
  cornersStyle: z.string().min(1).max(20),
});

// Menu du jour (S3.1) — `validUntil` est ISO 8601 UTC. Vide ⇒ default = fin de
// journée Europe/Paris calculé par DailyDishPolicy.defaultExpirationISO côté use case.
const ValidUntilSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime" })
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const CreateDailyDishSchema = z.object({
  priceEur: PriceEurSchema,
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
  validUntilISO: ValidUntilSchema,
  name: z.string(),
  description: z.string(),
});

const UpdateDailyDishSchema = z.object({
  dishId: z.uuid(),
  priceEur: PriceEurSchema,
  badge: z.enum(["NONE", "NEW", "POPULAR"]),
  allergens: AllergensSchema,
  validUntilISO: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime" }),
  name: z.string(),
  description: z.string(),
});

const DeleteDailyDishSchema = z.object({
  dishId: z.uuid(),
});

const ReorderDailyDishesSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

// Formules (S3.2) — pas de badge ni d'allergens (cf. `FormulaData`). `validUntilISO`
// obligatoire dès la création (différence vs daily où il est optionnel) : on impose
// la date au formulaire pour qu'un restaurateur ne crée pas par erreur une formule
// expirée le jour même.
const CreateFormulaSchema = z.object({
  priceEur: PriceEurSchema,
  validUntilISO: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime" }),
  name: z.string(),
  description: z.string(),
});

const UpdateFormulaSchema = z.object({
  formulaId: z.uuid(),
  priceEur: PriceEurSchema,
  validUntilISO: z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO datetime" }),
  name: z.string(),
  description: z.string(),
});

const DeleteFormulaSchema = z.object({
  formulaId: z.uuid(),
});

const ReorderFormulasSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedRestaurantId(): Promise<string> {
  const { restaurantId } = await getAuthenticatedRestaurantContext();
  return restaurantId;
}

/**
 * Variante avec la langue de saisie (S4) — utilisée par les actions de contenu
 * (items, plats du jour, formules, alt-texts) qui écrivent dans la langue source.
 */
async function getAuthenticatedRestaurantContext(): Promise<{
  restaurantId: string;
  sourceLocale: MenuLocale;
}> {
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
    select: { id: true, sourceLocale: true },
  });
  if (!restaurant) {
    // Edge case improbable (compte sans restaurant) : on relance le flow d'init
    // depuis le dashboard plutôt que de planter en exception silencieuse.
    redirect("/app");
  }

  // Contraint par CHECK SQL (076) — le cast reflète l'invariant DB.
  return { restaurantId: restaurant.id, sourceLocale: restaurant.sourceLocale as MenuLocale };
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
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { restaurantId, sourceLocale } = await getAuthenticatedRestaurantContext();
  return withActionContext(
    { actionName: "createItem", restaurantId, input: { categoryId: parsed.data.categoryId } },
    async () => {
      const repo = new PrismaMenuRepository(prisma);
      const useCase = new CreateItem(repo);

      const { itemId } = await useCase.execute({
        categoryId: parsed.data.categoryId,
        restaurantId,
        priceCents: parsed.data.priceEur,
        badge: parsed.data.badge,
        allergens: parsed.data.allergens,
        sourceLocale,
        name: parsed.data.name,
        description: parsed.data.description,
      });

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
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { restaurantId, sourceLocale } = await getAuthenticatedRestaurantContext();
  return withActionContext(
    { actionName: "updateItem", restaurantId, input: { itemId: parsed.data.itemId } },
    async () => {
      const repo = new PrismaMenuRepository(prisma);
      const useCase = new UpdateItem(repo);

      await useCase.execute({
        itemId: parsed.data.itemId,
        restaurantId,
        priceCents: parsed.data.priceEur,
        badge: parsed.data.badge,
        allergens: parsed.data.allergens,
        isAvailable: parsed.data.isAvailable,
        sourceLocale,
        name: parsed.data.name,
        description: parsed.data.description,
      });

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
      const useCase = new DeleteItem(repo);

      await useCase.execute({
        itemId: parsed.data.itemId,
        restaurantId,
      });

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

      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

const SetItemAvailabilitySchema = z.object({
  itemId: z.uuid(),
  isAvailable: z.boolean(),
});

/**
 * Bascule de disponibilité en un tap depuis la carte (« 86 » un plat).
 * Action à input objet (pas de formulaire) appelée dans une transition
 * optimiste côté client. `markMenuAsDraft` vit dans le use case.
 */
export async function setItemAvailabilityAction(input: {
  itemId: string;
  isAvailable: boolean;
}): Promise<ActionState<{ success?: boolean }>> {
  const parsed = SetItemAvailabilitySchema.safeParse(input);
  if (!parsed.success) return { error: VALIDATION_ERROR };

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    {
      actionName: "setItemAvailability",
      restaurantId,
      input: { itemId: parsed.data.itemId, isAvailable: parsed.data.isAvailable },
    },
    async () => {
      const repo = new PrismaMenuRepository(prisma);
      const useCase = new SetItemAvailability(repo);

      await useCase.execute({
        itemId: parsed.data.itemId,
        restaurantId,
        isAvailable: parsed.data.isAvailable,
      });

      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

// Types partagés par les uploads signés restants (logo restaurant).
export type ImageUploadUrlResult =
  | { ok: true; uploadUrl: string; token: string; path: string }
  | { ok: false; error: string };

export type ImageMutationResult = { ok: true } | { ok: false; error: string };

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
    revalidatePath("/app/apparence");
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
    revalidatePath("/app/apparence");
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

    // Publication — peut throw DomainError("plan_inactive" | "no_items" | …)
    // qui sera converti en `state.error.code` par `withActionContext`.
    const { slug } = await useCase.execute({ restaurantId });

    // Revalide tout le sous-arbre (app) en mode "layout" : la barre de publication globale
    // (résolue dans le layout) + chaque section (/app, /app/traductions, /app/partage…)
    // reflètent l'état PUBLISHED sans rechargement. Pas de revalidateTag : la page publique
    // /m/[slug] lit frais depuis la DB à chaque requête, aucun cache par tag ne la consomme.
    // Le QR est désormais rendu/téléchargé côté navigateur (page Partage), aucune génération serveur.
    revalidatePath("/app", "layout");
    return { error: null, slug };
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

    // Le nom du restaurant s'affiche sur le menu public → repasse en DRAFT. Exception au
    // pattern « le use case porte markMenuAsDraft » : RenameRestaurant n'opère que sur
    // l'agrégat Restaurant (RestaurantRepository) — on ne lui injecte pas un MenuRepository
    // juste pour cet effet de bord, la ré-draft reste ici.
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
    revalidatePath("/app");
    revalidatePath("/app/apparence");
    return { error: null, success: true };
  });
}

export async function updateMenuLocalesAction(
  _prev: RenameActionState,
  formData: FormData,
): Promise<RenameActionState> {
  const parsed = UpdateMenuLocalesSchema.safeParse({
    locales: formData.getAll("locales"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "updateMenuLocales", restaurantId }, async () => {
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const menuRepo = new PrismaMenuRepository(prisma);

    await new UpdateMenuLocales(restaurantRepo).execute({
      restaurantId,
      locales: parsed.data.locales,
    });

    // Les langues activées sont embarquées dans le snapshot à la publication
    // (availableLocales) → repasser en DRAFT jusqu'à republication explicite. Exception
    // au pattern use-case (comme RenameRestaurant) : UpdateMenuLocales n'opère que sur
    // l'agrégat Restaurant — la ré-draft reste côté action.
    await menuRepo.markMenuAsDraft(restaurantId);
    revalidatePath("/app");
    revalidatePath("/app/traductions");
    return { error: null, success: true };
  });
}

export type AutoTranslateActionState = ActionState<{
  translatedCount?: number;
  skippedCount?: number;
}>;

export async function autoTranslateMenuAction(
  _prev: AutoTranslateActionState,
  formData: FormData,
): Promise<AutoTranslateActionState> {
  const parsed = AutoTranslateMenuSchema.safeParse({
    targetLocale: formData.get("targetLocale"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    {
      actionName: "autoTranslateMenu",
      restaurantId,
      input: { targetLocale: parsed.data.targetLocale },
    },
    async () => {
      // Rate-limit par restaurant (quota DeepL partagé) — pattern /api/track.
      const limiter = createRateLimiter({
        prefix: "ratelimit:translate",
        limit: 10,
        windowSeconds: 600,
      });
      const { success } = await limiter.check(restaurantId);
      if (!success) throw new DomainError("translation_rate_limited");

      // Instanciation paresseuse du service DeepL : la clé absente lève une erreur
      // métier propre (pas de crash build CI où DEEPL_API_KEY est absent).
      const apiKey = process.env.DEEPL_API_KEY;
      if (!apiKey) throw new DomainError("translation_unavailable");

      const menuRepo = new PrismaMenuRepository(prisma);
      const restaurantRepo = new PrismaRestaurantRepository(prisma);
      const translationRepo = new PrismaTranslationRepository(prisma);
      const service = new DeepLTranslationService(apiKey);

      const result = await new AutoTranslateMenu(
        menuRepo,
        restaurantRepo,
        translationRepo,
        service,
      ).execute({ restaurantId, targetLocale: parsed.data.targetLocale });

      revalidatePath("/app");
      revalidatePath("/app/traductions");
      return { error: null, ...result };
    },
  );
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
    revalidatePath("/app/apparence");
    return { error: null, success: true };
  });
}

/**
 * Persiste la personnalisation du QR (couleurs + formes) sur la page Partage.
 * Découplé du template et des couleurs de marque, ouvert à tous les forfaits.
 * NE re-draft PAS le menu (le QrStyle n'entre pas dans le snapshot public) — d'où
 * l'absence de `MenuRepository` et le `revalidatePath` limité à la page Partage.
 */
export async function updateQrStyleAction(
  _prev: RenameActionState,
  formData: FormData,
): Promise<RenameActionState> {
  const parsed = UpdateQrStyleSchema.safeParse({
    darkColor: formData.get("darkColor") ?? "",
    lightColor: formData.get("lightColor") ?? "",
    dotsStyle: formData.get("dotsStyle") ?? "",
    cornersStyle: formData.get("cornersStyle") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "updateQrStyle", restaurantId }, async () => {
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    await new UpdateQrStyle(restaurantRepo).execute({ restaurantId, ...parsed.data });
    revalidatePath("/app/partage");
    return { error: null, success: true };
  });
}

// ─── Menu du jour (S3.1) ─────────────────────────────────────────────────────

export type DailyDishActionState = ActionState<{ success?: boolean; dishId?: string }>;

export async function createDailyDishAction(
  _prev: DailyDishActionState,
  formData: FormData,
): Promise<DailyDishActionState> {
  const parsed = CreateDailyDishSchema.safeParse({
    priceEur: formData.get("priceEur"),
    badge: formData.get("badge") ?? "NONE",
    allergens: formData.getAll("allergens"),
    validUntilISO: formData.get("validUntilISO") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { restaurantId, sourceLocale } = await getAuthenticatedRestaurantContext();
  return withActionContext({ actionName: "createDailyDish", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const clock = new SystemClock();
    const useCase = new CreateDailyDish(menuRepo, restaurantRepo, clock);

    const { dishId } = await useCase.execute({
      restaurantId,
      priceCents: parsed.data.priceEur,
      badge: parsed.data.badge,
      allergens: parsed.data.allergens,
      validUntilISO: parsed.data.validUntilISO,
      sourceLocale,
      name: parsed.data.name,
      description: parsed.data.description,
    });

    revalidatePath("/app");
    return { error: null, success: true, dishId };
  });
}

export async function updateDailyDishAction(
  _prev: DailyDishActionState,
  formData: FormData,
): Promise<DailyDishActionState> {
  const parsed = UpdateDailyDishSchema.safeParse({
    dishId: formData.get("dishId"),
    priceEur: formData.get("priceEur"),
    badge: formData.get("badge") ?? "NONE",
    allergens: formData.getAll("allergens"),
    validUntilISO: formData.get("validUntilISO") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { restaurantId, sourceLocale } = await getAuthenticatedRestaurantContext();
  return withActionContext(
    { actionName: "updateDailyDish", restaurantId, input: { dishId: parsed.data.dishId } },
    async () => {
      const menuRepo = new PrismaMenuRepository(prisma);
      const restaurantRepo = new PrismaRestaurantRepository(prisma);
      const clock = new SystemClock();
      const useCase = new UpdateDailyDish(menuRepo, restaurantRepo, clock);

      await useCase.execute({
        dishId: parsed.data.dishId,
        restaurantId,
        priceCents: parsed.data.priceEur,
        badge: parsed.data.badge,
        allergens: parsed.data.allergens,
        validUntilISO: parsed.data.validUntilISO,
        sourceLocale,
        name: parsed.data.name,
        description: parsed.data.description,
      });

      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

export async function deleteDailyDishAction(
  _prev: DailyDishActionState,
  formData: FormData,
): Promise<DailyDishActionState> {
  const parsed = DeleteDailyDishSchema.safeParse({
    dishId: formData.get("dishId"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "deleteDailyDish", restaurantId, input: { dishId: parsed.data.dishId } },
    async () => {
      const menuRepo = new PrismaMenuRepository(prisma);
      const useCase = new DeleteDailyDish(menuRepo);

      await useCase.execute({ dishId: parsed.data.dishId, restaurantId });
      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

export async function reorderDailyDishesAction(
  _prev: DailyDishActionState,
  formData: FormData,
): Promise<DailyDishActionState> {
  const raw = formData.get("orderedIds");
  let orderedIds: unknown = [];
  if (typeof raw === "string") {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      return { error: VALIDATION_ERROR };
    }
  }

  const parsed = ReorderDailyDishesSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "reorderDailyDishes", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const useCase = new ReorderDailyDishes(menuRepo);

    await useCase.execute({ restaurantId, orderedIds: parsed.data.orderedIds });

    revalidatePath("/app");
    return { error: null, success: true };
  });
}

// ─── Formules (S3.2) ─────────────────────────────────────────────────────────

export type FormulaActionState = ActionState<{ success?: boolean; formulaId?: string }>;

export async function createFormulaAction(
  _prev: FormulaActionState,
  formData: FormData,
): Promise<FormulaActionState> {
  const parsed = CreateFormulaSchema.safeParse({
    priceEur: formData.get("priceEur"),
    validUntilISO: formData.get("validUntilISO") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { restaurantId, sourceLocale } = await getAuthenticatedRestaurantContext();
  return withActionContext({ actionName: "createFormula", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const clock = new SystemClock();
    const useCase = new CreateFormula(menuRepo, restaurantRepo, clock);

    const { formulaId } = await useCase.execute({
      restaurantId,
      priceCents: parsed.data.priceEur,
      validUntilISO: parsed.data.validUntilISO,
      sourceLocale,
      name: parsed.data.name,
      description: parsed.data.description,
    });

    revalidatePath("/app");
    return { error: null, success: true, formulaId };
  });
}

export async function updateFormulaAction(
  _prev: FormulaActionState,
  formData: FormData,
): Promise<FormulaActionState> {
  const parsed = UpdateFormulaSchema.safeParse({
    formulaId: formData.get("formulaId"),
    priceEur: formData.get("priceEur"),
    validUntilISO: formData.get("validUntilISO") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR, fieldErrors: zodFieldErrors(parsed.error.issues) };
  }

  const { restaurantId, sourceLocale } = await getAuthenticatedRestaurantContext();
  return withActionContext(
    { actionName: "updateFormula", restaurantId, input: { formulaId: parsed.data.formulaId } },
    async () => {
      const menuRepo = new PrismaMenuRepository(prisma);
      const restaurantRepo = new PrismaRestaurantRepository(prisma);
      const clock = new SystemClock();
      const useCase = new UpdateFormula(menuRepo, restaurantRepo, clock);

      await useCase.execute({
        formulaId: parsed.data.formulaId,
        restaurantId,
        priceCents: parsed.data.priceEur,
        validUntilISO: parsed.data.validUntilISO,
        sourceLocale,
        name: parsed.data.name,
        description: parsed.data.description,
      });

      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

export async function deleteFormulaAction(
  _prev: FormulaActionState,
  formData: FormData,
): Promise<FormulaActionState> {
  const parsed = DeleteFormulaSchema.safeParse({
    formulaId: formData.get("formulaId"),
  });

  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext(
    { actionName: "deleteFormula", restaurantId, input: { formulaId: parsed.data.formulaId } },
    async () => {
      const menuRepo = new PrismaMenuRepository(prisma);
      const useCase = new DeleteFormula(menuRepo);

      await useCase.execute({ formulaId: parsed.data.formulaId, restaurantId });
      revalidatePath("/app");
      return { error: null, success: true };
    },
  );
}

export async function reorderFormulasAction(
  _prev: FormulaActionState,
  formData: FormData,
): Promise<FormulaActionState> {
  const raw = formData.get("orderedIds");
  let orderedIds: unknown = [];
  if (typeof raw === "string") {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      return { error: VALIDATION_ERROR };
    }
  }

  const parsed = ReorderFormulasSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return { error: VALIDATION_ERROR };
  }

  const restaurantId = await getAuthenticatedRestaurantId();
  return withActionContext({ actionName: "reorderFormulas", restaurantId }, async () => {
    const menuRepo = new PrismaMenuRepository(prisma);
    const useCase = new ReorderFormulas(menuRepo);

    await useCase.execute({ restaurantId, orderedIds: parsed.data.orderedIds });

    revalidatePath("/app");
    return { error: null, success: true };
  });
}
