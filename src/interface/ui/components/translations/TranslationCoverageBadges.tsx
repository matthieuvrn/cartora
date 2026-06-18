import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MENU_LOCALE_LABELS } from "@/domain/menu/MenuLocale";
import type { LocaleCoverage } from "@/domain/menu/translationStatus";

type Props = {
  coverage: LocaleCoverage[];
};

/**
 * Pastilles compactes « EN 82 % · ES 0 % » affichées au dashboard, liées vers
 * /app/traductions. Le pourcentage = champs frais / total (sources non vides).
 * Un champ obsolète compte comme NON couvert (le restaurateur doit le relire).
 */
export async function TranslationCoverageBadges({ coverage }: Props) {
  if (coverage.length === 0) return null;
  const t = await getTranslations("Translations");

  return (
    <Link
      href="/app/traductions"
      className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <Languages className="size-4" aria-hidden />
      <span>{t("coverageLabel")}</span>
      {coverage.map((c) => {
        const pct = c.total === 0 ? 100 : Math.round((c.fresh / c.total) * 100);
        const variant = pct === 100 ? "success" : pct === 0 ? "outline" : "warning";
        return (
          <Badge key={c.locale} variant={variant}>
            {MENU_LOCALE_LABELS[c.locale]} {pct}%
          </Badge>
        );
      })}
    </Link>
  );
}
