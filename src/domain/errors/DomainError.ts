/**
 * Erreur métier typée. Utilisée par le domaine et la couche application pour signaler
 * un échec attendu (quota atteint, ressource introuvable, paywall, validation, …).
 *
 * Convention :
 *  - le `code` est l'unique contrat consommé par les couches au-dessus (action, UI, route handler).
 *  - le `message` interne reste machine-readable (`DomainError(code)`) — il n'est pas destiné
 *    à l'affichage utilisateur. Toute traduction passe par i18n via les fichiers `messages/*.json`.
 *  - les `metadata` portent les paramètres d'affichage (limite atteinte, tier courant, id d'entité).
 *
 * Pure domaine : aucun import framework / Sentry / next-intl autorisé.
 */

export type DomainErrorCode =
  // Publication
  | "plan_inactive"
  | "no_items"

  // Quotas (transportent `metadata.limit`, `metadata.current`, `metadata.tier`)
  | "max_categories"
  | "max_photos"

  // Collisions
  | "duplicate_name"

  // Not-found family — un par entité pour permettre des fingerprints Sentry distincts
  // et un mapping UI granulaire (ex: notFound() depuis un Server Component pour menu_not_found).
  | "restaurant_not_found"
  | "menu_not_found"
  | "item_not_found"
  | "category_not_found"

  // Autorisation
  | "unauthorized"
  | "ownership_mismatch"

  // Validation générique (fallback quand aucune Policy n'a produit un code dédié)
  | "validation_failed"

  // Codes de validation produits par les Policies (Phase D)
  | "name_required"
  | "name_too_long"
  | "name_control_chars"
  | "description_too_long"
  | "price_not_integer"
  | "price_too_low"
  | "price_too_high"
  | "invalid_badge"
  | "too_many_allergens"
  | "invalid_allergen"
  | "display_name_required"
  | "display_name_too_long"

  // Images / fichiers
  | "unsupported_mime"
  | "invalid_image_path"

  // Billing
  | "billing_missing"
  | "use_portal_to_change_plan"
  | "template_not_allowed"
  | "branding_not_allowed"

  // Branding
  | "invalid_brand_color"
  | "low_brand_contrast"

  // Règles structurelles
  | "must_keep_one_category"
  | "empty_list"
  | "list_mismatch";

/** Type des résultats `null | { field, code }` produits par les Policies. */
export type ValidationFailure = {
  field: string;
  code: DomainErrorCode;
};

export type DomainErrorMetadata = {
  /** Quotas — limite courante du plan. */
  limit?: number;
  /** Quotas — décompte courant. */
  current?: number;
  /** Quotas — tier qui motive la limite. */
  tier?: "FREE" | "STARTER" | "PRO";
  /** Reorder — taille attendue. */
  expected?: number;
  /** Reorder — taille reçue. */
  received?: number;
  /** Identifiant de l'entité concernée (pas de string saisi par l'utilisateur). */
  entityId?: string;
  /** Champ de formulaire concerné par une `validation_failed`. */
  field?: string;
  /** Valeur invalide pour un badge / allergène — utilisée pour le debug Sentry uniquement. */
  invalidValue?: string;
  /** Template visé pour `template_not_allowed`. */
  template?: "CLASSIC" | "ELEGANT" | "MODERN";
};

export class DomainError extends Error {
  readonly name = "DomainError";
  readonly code: DomainErrorCode;
  readonly metadata: DomainErrorMetadata;

  constructor(code: DomainErrorCode, metadata: DomainErrorMetadata = {}) {
    // Le message interne reste machine-readable. L'UI ne lit jamais `e.message`.
    super(`DomainError(${code})`);
    this.code = code;
    this.metadata = metadata;
    // Préserve la chaîne de prototype après transpilation — sinon `instanceof DomainError`
    // peut échouer dans certains bundles (notamment edge runtime côté Next).
    Object.setPrototypeOf(this, DomainError.prototype);
  }

  /**
   * Sérialisation POJO. Utilisée pour traverser la frontière `useActionState`
   * (les instances de classe sont aplaties par React lors du round-trip serveur→client).
   */
  toJSON(): {
    name: "DomainError";
    code: DomainErrorCode;
    metadata: DomainErrorMetadata;
  } {
    return { name: "DomainError", code: this.code, metadata: this.metadata };
  }
}

/**
 * Garde de type. Combine `instanceof` (chemin rapide) et un check structurel,
 * parce que Next 16/Turbopack peut charger le module sous deux identités distinctes
 * entre runtime edge et node — `instanceof` seul devient alors faux négatif.
 */
export function isDomainError(e: unknown): e is DomainError {
  if (e instanceof DomainError) return true;
  if (e === null || typeof e !== "object") return false;
  const candidate = e as { name?: unknown; code?: unknown };
  return candidate.name === "DomainError" && typeof candidate.code === "string";
}
