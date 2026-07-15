import * as Sentry from "@sentry/nextjs";
import { unstable_rethrow } from "next/navigation";
import {
  isDomainError,
  type DomainErrorCode,
  type DomainErrorMetadata,
} from "@/domain/errors/DomainError";

/**
 * Payload d'erreur sérialisable renvoyé aux Client Components via `useActionState`.
 * Doit rester un POJO : React aplatit les instances de classe lors du round-trip serveur→client.
 */
export type ActionError = {
  code: DomainErrorCode | "generic" | "validation" | "unauthenticated";
  metadata?: DomainErrorMetadata;
};

/**
 * État renvoyé par toutes les server actions consommées par `useActionState`.
 *
 * - `error: null` ⇒ succès. `TExtra` porte les champs spécifiques (success, slug, …).
 * - `error: ActionError` ⇒ échec. Le code identifie la cause (paywall, quota, …).
 * - `fieldErrors` ⇒ erreurs de validation par champ (Zod parse failures).
 *   C'est orthogonal à `error.code === "validation"` : les deux peuvent coexister.
 */
export type ActionState<TExtra = Record<string, never>> = {
  error: ActionError | null;
  fieldErrors?: Record<string, string>;
} & TExtra;

/**
 * Contexte d'exécution d'une action, utilisé pour enrichir Sentry quand une erreur
 * inconnue est levée. Aucune valeur saisie par l'utilisateur n'est attachée par défaut —
 * passer `input` explicitement.
 */
export type ActionContext = {
  /** Nom court de l'action, utilisé comme tag Sentry. Ex: `"publishMenu"`. */
  actionName: string;
  /** Si présent, sert de `user.id` dans Sentry pour corréler par restaurant. */
  restaurantId?: string;
  /** Données d'input attachées comme `extra` Sentry. Garder léger, pas de FormData brute. */
  input?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Higher-order helper pour les server actions.
 *
 * Comportement :
 *  - Le callback `run` est exécuté dans un try/catch.
 *  - `redirect()`, `notFound()`, `forbidden()`, `unauthorized()` (toutes throw une
 *    erreur avec `digest: "NEXT_*"`) sont re-thrown via `unstable_rethrow` pour
 *    que Next puisse les traiter normalement.
 *  - Une `DomainError` est convertie en `{ error: { code, metadata } }`. Pas
 *    capturée dans Sentry — c'est un flux utilisateur attendu, pas un bug.
 *  - Toute autre erreur ⇒ `Sentry.captureException` enrichi (tags, user, extra),
 *    + retourne `{ error: { code: "generic" } }`.
 *
 * Utilisation typique :
 *
 * ```ts
 * export async function createCategoryAction(_prev, formData): Promise<ActionState<{ success?: boolean }>> {
 *   const parsed = Schema.safeParse(...);
 *   if (!parsed.success) return { error: { code: "validation" }, fieldErrors: ... };
 *
 *   return withActionContext({ actionName: "createCategory" }, async () => {
 *     const restaurantId = await getAuthenticatedRestaurantId();
 *     // ... use case ...
 *     return { error: null, success: true };
 *   });
 * }
 * ```
 */
export async function withActionContext<TExtra extends object = Record<string, never>>(
  ctx: ActionContext,
  run: () => Promise<ActionState<TExtra>>,
): Promise<ActionState<TExtra>> {
  try {
    return await run();
  } catch (e) {
    // 1. Navigation errors (redirect/notFound/forbidden/unauthorized) MUST propagate.
    //    `unstable_rethrow` re-throw uniquement si c'est bien une navigation error,
    //    sinon il ne fait rien et on continue.
    unstable_rethrow(e);

    // 2. DomainError ⇒ contrat utilisateur attendu, pas un bug. Pas de Sentry.
    if (isDomainError(e)) {
      return {
        error: { code: e.code, metadata: e.metadata },
      } as ActionState<TExtra>;
    }

    // 3. Erreur inconnue ⇒ Sentry enrichi + generic.
    Sentry.captureException(e, {
      tags: { action: ctx.actionName },
      user: ctx.restaurantId ? { id: ctx.restaurantId } : undefined,
      extra: ctx.input ?? undefined,
    });
    return { error: { code: "generic" } } as ActionState<TExtra>;
  }
}
