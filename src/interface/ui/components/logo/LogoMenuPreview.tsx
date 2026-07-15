import { TemplateLogo } from "@/interface/ui/components/menu-template/TemplateLogo";
import { LogoMonogram } from "./LogoMonogram";

type Props = {
  /** URL du logo affichable (déjà cache-bustée le cas échéant), ou null. */
  logoUrl: string | null;
  restaurantName: string;
  /** Passe `unoptimized` à l'image après un upload (URL cache-bustée). */
  unoptimized?: boolean;
};

/**
 * Reproduit fidèlement l'en-tête du menu public (logo carré 40px + nom) pour que
 * le restaurateur voie le **vrai** rendu, pas une boîte abstraite. Sans logo, on
 * montre le monogramme (repli app-only) — le menu public, lui, n'affiche rien.
 */
export function LogoMenuPreview({ logoUrl, restaurantName, unoptimized }: Props) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-3 rounded-md border bg-background px-4 py-3">
        {logoUrl ? (
          <TemplateLogo
            src={logoUrl}
            alt={restaurantName}
            className="size-10 shrink-0"
            sizes="40px"
            unoptimized={unoptimized}
          />
        ) : (
          <LogoMonogram name={restaurantName} className="size-10 shrink-0 text-sm" />
        )}
        <span className="truncate text-xl font-bold tracking-tight">{restaurantName}</span>
      </div>
    </div>
  );
}
