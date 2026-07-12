import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MENU_LOCALE_LABELS } from "@/domain/menu/MenuLocale";
import type { LocaleCoverage } from "@/domain/menu/translationStatus";

type Props = {
  coverage: LocaleCoverage[];
};

/**
 * Résumé « toutes langues d'un coup d'œil » en tête de /app/traductions : par langue activée, une
 * barre de progression (champs à jour / total) et le reste à relire. Vocabulaire aligné sur l'écran
 * de revue (« à relire », « à jour ») — remplace l'ancien pourcentage de couverture de l'éditeur.
 */
export async function TranslationCoverageSummary({ coverage }: Props) {
  if (coverage.length === 0) return null;
  const t = await getTranslations("Translations");

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("coverageTitle")}</h2>
      <ul className="space-y-3">
        {coverage.map((c) => {
          const remaining = c.stale + c.missing;
          const pct = c.total === 0 ? 100 : Math.round((c.fresh / c.total) * 100);
          return (
            <li key={c.locale} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm font-medium">
                {MENU_LOCALE_LABELS[c.locale]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[var(--ease-out-expo)]"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
              <span className="flex w-36 shrink-0 items-center justify-end">
                {remaining === 0 ? (
                  <Badge variant="success">
                    <Check aria-hidden />
                    {t("status.fresh")}
                  </Badge>
                ) : (
                  <span className="text-caption whitespace-nowrap text-muted-foreground tabular-nums">
                    {t("remaining", { count: remaining })}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
