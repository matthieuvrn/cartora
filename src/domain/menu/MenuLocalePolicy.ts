import type { ValidationFailure } from "@/domain/errors/DomainError";
import { isMenuLocale, type MenuLocale } from "./MenuLocale";

/**
 * Règles métier des langues cibles activées par un restaurant (S4 — multilingue).
 * Le quota par tier vient de `PlanPolicy.maxExtraMenuLocalesFor` ; cette policy
 * valide la FORME de la liste (codes connus, pas de doublon, pas la langue source)
 * et le respect du quota — les use cases convertissent en `DomainError`.
 */
export class MenuLocalePolicy {
  /** Valide un code de locale isolé (codes ISO 639-1 minuscules supportés). */
  static validateLocaleCode(code: string): ValidationFailure | null {
    if (!isMenuLocale(code)) return { field: "locale", code: "invalid_locale" };
    return null;
  }

  /**
   * Normalise une liste de langues cibles demandée par l'UI : trim + minuscules,
   * dédoublonnage (ordre préservé), retrait de la langue source (elle est toujours
   * disponible, jamais une « cible »). Ne filtre PAS les codes inconnus — c'est le
   * rôle de `validateEnabledLocales`, pour que l'erreur soit signalée et non avalée.
   */
  static normalizeEnabledLocales(sourceLocale: MenuLocale, requested: readonly string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of requested) {
      const code = raw.trim().toLowerCase();
      if (code === "" || code === sourceLocale || seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
    return out;
  }

  /**
   * Valide une liste NORMALISÉE (cf. `normalizeEnabledLocales`) contre le quota du
   * tier. Renvoie `null` si OK — la liste peut alors être affirmée `MenuLocale[]`.
   */
  static validateEnabledLocales(params: {
    sourceLocale: MenuLocale;
    normalized: readonly string[];
    maxExtra: number;
  }): ValidationFailure | null {
    for (const code of params.normalized) {
      const failure = MenuLocalePolicy.validateLocaleCode(code);
      if (failure) return failure;
    }
    if (params.normalized.length > params.maxExtra) {
      return { field: "locales", code: "locale_quota_exceeded" };
    }
    return null;
  }
}
